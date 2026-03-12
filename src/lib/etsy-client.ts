import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const ETSY_API_KEY = process.env.ETSY_API_KEY || "";
const ETSY_SHARED_SECRET = process.env.ETSY_SHARED_SECRET || "";
const ETSY_SHOP_ID = process.env.ETSY_SHOP_ID || "";
const ETSY_REDIRECT_URI = process.env.ETSY_REDIRECT_URI || "";

const BASE_URL = "https://openapi.etsy.com/v3";
const TOKEN_FILE = path.join(process.cwd(), "data", "etsy-tokens.json");

// --- Token Types ---

interface EtsyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// --- PKCE ---

const pendingChallenges = new Map<string, string>();

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function generatePKCE(): { code_challenge: string; state: string } {
  const verifier = generateCodeVerifier();
  const state = crypto.randomBytes(16).toString("hex");
  pendingChallenges.set(state, verifier);
  return { code_challenge: generateCodeChallenge(verifier), state };
}

export function getCodeVerifier(state: string): string | undefined {
  const v = pendingChallenges.get(state);
  if (v) pendingChallenges.delete(state);
  return v;
}

// --- Token Storage ---

async function loadTokens(): Promise<EtsyTokens | null> {
  try {
    return JSON.parse(await fs.readFile(TOKEN_FILE, "utf-8"));
  } catch {
    return null;
  }
}

async function saveTokens(tokens: EtsyTokens): Promise<void> {
  await fs.mkdir(path.dirname(TOKEN_FILE), { recursive: true });
  await fs.writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

export async function isConnected(): Promise<boolean> {
  return (await loadTokens()) !== null;
}

// --- OAuth Flow ---

export function getAuthUrl(): string {
  const { code_challenge, state } = generatePKCE();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: ETSY_API_KEY,
    redirect_uri: ETSY_REDIRECT_URI,
    scope: "transactions_r listings_w",
    state,
    code_challenge,
    code_challenge_method: "S256",
  });
  return `https://www.etsy.com/oauth/connect?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, state: string): Promise<void> {
  const code_verifier = getCodeVerifier(state);
  if (!code_verifier) throw new Error("Invalid state parameter");

  const res = await fetch(`${BASE_URL}/public/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: ETSY_API_KEY,
      redirect_uri: ETSY_REDIRECT_URI,
      code,
      code_verifier,
    }),
  });

  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  const data = await res.json();
  await saveTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  });
}

async function refreshAccessToken(): Promise<EtsyTokens> {
  const tokens = await loadTokens();
  if (!tokens) throw new Error("Not connected to Etsy");

  const res = await fetch(`${BASE_URL}/public/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ETSY_API_KEY,
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const data = await res.json();
  const newTokens: EtsyTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  await saveTokens(newTokens);
  return newTokens;
}

async function getValidToken(): Promise<string> {
  let tokens = await loadTokens();
  if (!tokens) throw new Error("not_connected");
  if (Date.now() > tokens.expires_at - 5 * 60 * 1000) {
    tokens = await refreshAccessToken();
  }
  return tokens.access_token;
}

// --- Authenticated Fetch (OAuth bearer token) ---

async function oauthFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await getValidToken();
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "x-api-key": `${ETSY_API_KEY}:${ETSY_SHARED_SECRET}`,
      ...(options.headers as Record<string, string>),
    },
  });
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("retry-after") || "5");
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return oauthFetch(endpoint, options);
  }
  return res;
}

// --- API Calls ---

async function etsyFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
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

export async function getListing(listingId: number): Promise<EtsyListing> {
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
  });

  const response = await etsyFetch(`/application/listings/active?${params}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Search failed: ${error}`);
  }

  return response.json();
}

// --- Transactions (requires OAuth transactions_r scope) ---

export async function updateListingImageAltText(
  listingId: number,
  imageId: number,
  altText: string
): Promise<void> {
  // Etsy v3 has no PATCH for images. Re-POST with existing listing_image_id + overwrite=true to update alt_text.
  const res = await oauthFetch(`/application/shops/${ETSY_SHOP_ID}/listings/${listingId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ listing_image_id: String(imageId), alt_text: altText }),
  });
  if (!res.ok) throw new Error(`Failed to update alt text: ${await res.text()}`);
}

export async function getListingUnitsSold(listingId: number): Promise<number> {
  let unitsSold = 0;
  let offset = 0;
  const limit = 100;

  while (true) {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    const res = await oauthFetch(
      `/application/shops/${ETSY_SHOP_ID}/listings/${listingId}/transactions?${params}`
    );

    if (!res.ok) throw new Error(`Transactions fetch failed: ${await res.text()}`);

    const data = await res.json();
    const transactions: Array<{ quantity: number }> = data.results ?? [];
    for (const t of transactions) unitsSold += t.quantity;

    offset += limit;
    if (offset >= data.count) break;
  }

  return unitsSold;
}
