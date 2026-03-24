import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { computeBenchmarks } from "@/lib/benchmark-engine";

const KEYWORDS_FILE = path.join(process.cwd(), "data", "listing-keywords.json");
const BENCHMARKS_FILE = path.join(process.cwd(), "data", "listing-benchmarks.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function loadKeywords(listingId: number): { primary: string; secondary: [string, string] } {
  try {
    const store = JSON.parse(fs.readFileSync(KEYWORDS_FILE, "utf-8"));
    return store[String(listingId)] ?? { primary: "", secondary: ["", ""] };
  } catch {
    return { primary: "", secondary: ["", ""] };
  }
}

function loadCache(listingId: number) {
  try {
    const store = JSON.parse(fs.readFileSync(BENCHMARKS_FILE, "utf-8"));
    return store[String(listingId)] ?? null;
  } catch {
    return null;
  }
}

function saveCache(listingId: number, data: unknown) {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  let store: Record<string, unknown> = {};
  try { store = JSON.parse(fs.readFileSync(BENCHMARKS_FILE, "utf-8")); } catch { /* empty store */ }
  store[String(listingId)] = data;
  fs.writeFileSync(BENCHMARKS_FILE, JSON.stringify(store, null, 2));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listingId = parseInt(id, 10);
  if (isNaN(listingId)) return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "1";

  const saved = loadKeywords(listingId);
  const keywords = [saved.primary, ...saved.secondary].map(k => k.trim()).filter(Boolean);
  if (keywords.length === 0) return NextResponse.json({ error: "no_keywords" }, { status: 400 });

  if (!forceRefresh) {
    const cached = loadCache(listingId);
    if (cached?.computed_at) {
      const age = Date.now() - new Date(cached.computed_at).getTime();
      const keywordsMatch = JSON.stringify(cached.keywords_used) === JSON.stringify(keywords);
      // Also check for Phase 3 schema: must have metrics.images (old cache had metrics.photos)
      const hasCurrentSchema = cached.metrics?.images !== undefined;
      if (age < CACHE_TTL_MS && keywordsMatch && hasCurrentSchema) {
        return NextResponse.json({ ...cached, from_cache: true });
      }
    }
  }

  try {
    const result = await computeBenchmarks(listingId, keywords);
    saveCache(listingId, result);
    return NextResponse.json({ ...result, from_cache: false });
  } catch (error) {
    console.error(`Benchmarks failed for ${id}:`, error);
    return NextResponse.json({ error: "Failed to compute benchmarks" }, { status: 500 });
  }
}
