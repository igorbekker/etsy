import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getTaxonomyProperties, getListingProperties } from "@/lib/etsy-client";

const TAXONOMY_CACHE_FILE = path.join(process.cwd(), "data", "taxonomy-properties.json");
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function loadTaxonomyCache(taxonomyId: number) {
  try {
    const store = JSON.parse(fs.readFileSync(TAXONOMY_CACHE_FILE, "utf-8"));
    const entry = store[String(taxonomyId)];
    if (!entry) return null;
    const age = Date.now() - new Date(entry.cached_at).getTime();
    if (age > CACHE_TTL_MS) return null;
    return entry.properties;
  } catch {
    return null;
  }
}

function saveTaxonomyCache(taxonomyId: number, properties: unknown) {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  let store: Record<string, unknown> = {};
  try { store = JSON.parse(fs.readFileSync(TAXONOMY_CACHE_FILE, "utf-8")); } catch { /* empty */ }
  store[String(taxonomyId)] = { properties, cached_at: new Date().toISOString() };
  fs.writeFileSync(TAXONOMY_CACHE_FILE, JSON.stringify(store, null, 2));
}

// Simple rule-based value suggestion: match property name + listing signals
function suggestValues(
  propertyName: string,
  possibleValues: { value_id: number; name: string }[],
  signals: string[]
): { value_id: number; name: string }[] {
  const lower = signals.join(" ").toLowerCase();
  return possibleValues.filter(({ name }) => lower.includes(name.toLowerCase())).slice(0, 3);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listingId = parseInt(id, 10);
  if (isNaN(listingId)) return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });

  try {
    // Get taxonomy_id from the listing (passed as query param to avoid a second API call)
    const url = new URL(_request.url);
    const taxonomyId = parseInt(url.searchParams.get("taxonomy_id") ?? "", 10);
    if (isNaN(taxonomyId)) return NextResponse.json({ error: "taxonomy_id required" }, { status: 400 });

    // Taxonomy properties — cache-first, 30d TTL
    let taxonomyProps = loadTaxonomyCache(taxonomyId);
    if (!taxonomyProps) {
      taxonomyProps = await getTaxonomyProperties(taxonomyId);
      saveTaxonomyCache(taxonomyId, taxonomyProps);
    }

    // Listing properties — always fresh
    const listingProps = await getListingProperties(listingId);
    const filledIds = new Set(listingProps.map((p) => p.property_id));

    // Signals for suggestion matching (passed as query params)
    const title = url.searchParams.get("title") ?? "";
    const tags = url.searchParams.get("tags") ?? "";
    const materials = url.searchParams.get("materials") ?? "";
    const signals = [title, tags, materials].filter(Boolean);

    // Build gap list
    const gaps = taxonomyProps
      .filter((p: { property_id: number }) => !filledIds.has(p.property_id))
      .map((p: { property_id: number; display_name: string; name: string; possible_values: { value_id: number; name: string }[] }) => ({
        property_id: p.property_id,
        name: p.display_name || p.name,
        available_values: p.possible_values.map((v: { value_id: number; name: string }) => ({ value_id: v.value_id, name: v.name })),
        suggested_values: suggestValues(p.name, p.possible_values, signals),
      }));

    const filled = listingProps.length;
    const total = taxonomyProps.length;
    const fillRate = total > 0 ? Math.round((filled / total) * 100) : 0;

    return NextResponse.json({
      fill_rate: fillRate,
      filled,
      total,
      current_properties: listingProps.map((p) => ({
        property_id: p.property_id,
        name: p.property_name,
        values: p.values,
      })),
      gaps,
    });
  } catch (error) {
    console.error(`Attributes fetch failed for ${id}:`, error);
    const msg = error instanceof Error ? error.message : "Failed to fetch attributes";
    if (msg.includes("not_connected") || msg.includes("Not connected")) {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
