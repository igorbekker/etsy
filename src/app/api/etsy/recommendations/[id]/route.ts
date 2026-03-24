import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getListing } from "@/lib/etsy-client";
import { generateListingRecommendations } from "@/lib/ai-suggestions";
import { computeBenchmarks } from "@/lib/benchmark-engine";
import { DEMO_MODE, getMockRecommendations } from "@/lib/mock-data";

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

function loadBenchmarkCache(listingId: number, keywords: string[]) {
  try {
    const store = JSON.parse(fs.readFileSync(BENCHMARKS_FILE, "utf-8"));
    const cached = store[String(listingId)];
    if (!cached?.computed_at) return null;
    const age = Date.now() - new Date(cached.computed_at).getTime();
    const keywordsMatch = JSON.stringify(cached.keywords_used) === JSON.stringify(keywords);
    const hasCurrentSchema = cached.metrics?.images !== undefined;
    return age < CACHE_TTL_MS && keywordsMatch && hasCurrentSchema ? cached : null;
  } catch {
    return null;
  }
}

function saveBenchmarkCache(listingId: number, data: unknown) {
  let store: Record<string, unknown> = {};
  try { store = JSON.parse(fs.readFileSync(BENCHMARKS_FILE, "utf-8")); } catch { /* empty */ }
  store[String(listingId)] = data;
  fs.mkdirSync(path.dirname(BENCHMARKS_FILE), { recursive: true });
  fs.writeFileSync(BENCHMARKS_FILE, JSON.stringify(store, null, 2));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listingId = parseInt(id, 10);
  if (isNaN(listingId)) return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });

  if (DEMO_MODE) return NextResponse.json({ recommendations: getMockRecommendations(listingId) });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  const saved = loadKeywords(listingId);
  const keywords = [saved.primary, ...saved.secondary].map(k => k.trim()).filter(Boolean);
  if (keywords.length === 0) return NextResponse.json({ error: "no_keywords" }, { status: 400 });

  try {
    // Benchmarks are the single source of truth — load from cache or compute fresh
    let benchmarks = loadBenchmarkCache(listingId, keywords);
    if (!benchmarks) {
      try {
        benchmarks = await computeBenchmarks(listingId, keywords);
        saveBenchmarkCache(listingId, benchmarks);
      } catch {
        return NextResponse.json({ error: "benchmark_required" }, { status: 400 });
      }
    }

    const listing = await getListing(listingId);
    const recommendations = await generateListingRecommendations(listing, benchmarks);
    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error(`Failed to generate recommendations for ${id}:`, error);
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}
