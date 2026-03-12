import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const ETSY_API_KEY = process.env.ETSY_API_KEY || "";
const ETSY_SHARED_SECRET = process.env.ETSY_SHARED_SECRET || "";
const ETSY_REDIRECT_URI = process.env.ETSY_REDIRECT_URI || "";
const ETSY_SHOP_ID = process.env.ETSY_SHOP_ID || "";

const TOKEN_FILE = path.join(process.cwd(), "data", "etsy-tokens.json");
const BASE_URL = "https://api.etsy.com/v3";

interface EtsyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
}

interface PKCEChallenge {
  code_verifier: string;
  code_challenge: string;
  state: string;
}

// Store PKCE verifiers in memory (per OAuth flow)
const pendingChallenges = new Map<string, string>();

// --- PKCE Helpers ---

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function generatePKCE(): PKCEChallenge {
  const code_verifier = generateCodeVerifier();
  const code_challenge = generateCodeChallenge(code_verifier);
  const state = crypto.randomBytes(16).toString("hex");
  pendingChallenges.set(state, code_verifier);
  return { code_verifier, code_challenge, state };
}

export function getCodeVerifier(state: string): string | undefined {
  const verifier = pendingChallenges.get(state);
  if (verifier) pendingChallenges.delete(state);
  return verifier;
}

// --- Token Management ---

async function loadTokens(): Promise<EtsyTokens | null> {
  try {
    const data = await fs.readFile(TOKEN_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function saveTokens(tokens: EtsyTokens): Promise<void> {
  await fs.mkdir(path.dirname(TOKEN_FILE), { recursive: true });
  await fs.writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

export async function isConnected(): Promise<boolean> {
  const tokens = await loadTokens();
  return tokens !== null;
}

// --- OAuth Flow ---

export function getAuthUrl(): string {
  const pkce = generatePKCE();
  const scopes = "listings_r listings_w shops_r";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: ETSY_API_KEY,
    redirect_uri: ETSY_REDIRECT_URI,
    scope: scopes,
    state: pkce.state,
    code_challenge: pkce.code_challenge,
    code_challenge_method: "S256",
  });
  return `https://www.etsy.com/oauth/connect?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  state: string
): Promise<EtsyTokens> {
  const code_verifier = getCodeVerifier(state);
  if (!code_verifier) throw new Error("Invalid state parameter");

  const response = await fetch(
    `${BASE_URL}/public/oauth/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: ETSY_API_KEY,
        redirect_uri: ETSY_REDIRECT_URI,
        code,
        code_verifier,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();
  const tokens: EtsyTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: data.token_type,
  };

  await saveTokens(tokens);
  return tokens;
}

async function refreshAccessToken(): Promise<EtsyTokens> {
  const tokens = await loadTokens();
  if (!tokens) throw new Error("No tokens found — connect to Etsy first");

  const response = await fetch(
    `${BASE_URL}/public/oauth/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: ETSY_API_KEY,
        refresh_token: tokens.refresh_token,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();
  const newTokens: EtsyTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: data.token_type,
  };

  await saveTokens(newTokens);
  return newTokens;
}

async function getValidToken(): Promise<string> {
  let tokens = await loadTokens();
  if (!tokens) throw new Error("Not connected to Etsy");

  // Refresh if expiring within 5 minutes
  if (Date.now() > tokens.expires_at - 5 * 60 * 1000) {
    tokens = await refreshAccessToken();
  }

  return tokens.access_token;
}

// --- API Calls ---

async function etsyFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getValidToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "x-api-key": `${ETSY_API_KEY}:${ETSY_SHARED_SECRET}`,
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("retry-after") || "5");
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return etsyFetch(endpoint, options);
  }

  return response;
}

export function getShopId(): string {
  return ETSY_SHOP_ID;
}

// --- Listing Endpoints ---

export interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  tags: string[];
  price: { amount: number; divisor: number; currency_code: string };
  quantity: number;
  taxonomy_id: number;
  materials: string[];
  shipping_profile_id: number;
  processing_min: number;
  processing_max: number;
  who_made: string;
  when_made: string;
  styles: string[];
  is_personalizable: boolean;
  personalization_char_count_max: number;
  personalization_instructions: string;
  views: number;
  state: string;
  url: string;
  shop_section_id: number;
  images: EtsyImage[];
  created_timestamp: number;
  updated_timestamp: number;
}

export interface EtsyImage {
  listing_image_id: number;
  listing_id: number;
  url_75x75: string;
  url_170x135: string;
  url_570xN: string;
  url_fullxfull: string;
  alt_text: string;
  rank: number;
}

export async function getShopListings(
  limit = 100,
  offset = 0
): Promise<{ results: EtsyListing[]; count: number }> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    includes: "images",
  });

  const response = await etsyFetch(
    `/application/shops/${ETSY_SHOP_ID}/listings/active?${params}`
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch listings: ${error}`);
  }

  return response.json();
}

export async function getListing(
  listingId: number
): Promise<EtsyListing> {
  const params = new URLSearchParams({ includes: "images" });
  const response = await etsyFetch(
    `/application/listings/${listingId}?${params}`
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch listing ${listingId}: ${error}`);
  }

  return response.json();
}

export async function getAllShopListings(): Promise<EtsyListing[]> {
  const allListings: EtsyListing[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { results, count } = await getShopListings(limit, offset);
    allListings.push(...results);
    offset += limit;
    if (offset >= count) break;
  }

  return allListings;
}

// --- Search (for competitor analysis) ---

export interface EtsySearchResult {
  listing_id: number;
  title: string;
  description: string;
  tags: string[];
  price: { amount: number; divisor: number; currency_code: string };
  taxonomy_id: number;
  views: number;
  url: string;
}

export async function searchListings(
  keywords: string,
  limit = 25
): Promise<{ results: EtsySearchResult[]; count: number }> {
  const params = new URLSearchParams({
    keywords,
    limit: limit.toString(),
    includes: "images",
  });

  const response = await etsyFetch(
    `/application/listings/active?${params}`
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Search failed: ${error}`);
  }

  return response.json();
}
