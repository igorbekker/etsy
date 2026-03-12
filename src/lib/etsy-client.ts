const ETSY_API_KEY = process.env.ETSY_API_KEY || "";
const ETSY_SHARED_SECRET = process.env.ETSY_SHARED_SECRET || "";
const ETSY_SHOP_ID = process.env.ETSY_SHOP_ID || "";

const BASE_URL = "https://openapi.etsy.com/v3";

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
