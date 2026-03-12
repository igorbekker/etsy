import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getListing } from "@/lib/etsy-client";
import { analyzeCompetitors } from "@/lib/keyword-research";

const KEYWORDS_FILE = path.join(process.cwd(), "data", "listing-keywords.json");
const BENCHMARKS_FILE = path.join(process.cwd(), "data", "listing-benchmarks.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface StoredKeywords {
  primary: string;
  secondary: [string, string];
}

function loadKeywords(listingId: number): StoredKeywords {
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

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const low = Math.floor(idx);
  const high = Math.ceil(idx);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (idx - low);
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

  // Check keywords — required, no fallback for benchmarks
  const saved = loadKeywords(listingId);
  const keywords = [saved.primary, ...saved.secondary].map((k) => k.trim()).filter(Boolean);
  if (keywords.length === 0) return NextResponse.json({ error: "no_keywords" }, { status: 400 });

  // Check cache
  if (!forceRefresh) {
    const cached = loadCache(listingId);
    if (cached && cached.computed_at) {
      const age = Date.now() - new Date(cached.computed_at).getTime();
      const keywordsMatch = JSON.stringify(cached.keywords_used) === JSON.stringify(keywords);
      if (age < CACHE_TTL_MS && keywordsMatch) {
        return NextResponse.json({ ...cached, from_cache: true });
      }
    }
  }

  try {
    // Fetch listing (for your own price + tags + favorites + photos)
    const listing = await getListing(listingId);
    const yourPrice = listing.price.amount / listing.price.divisor;
    const yourFavorers = listing.num_favorers ?? 0;
    const yourPhotoCount = listing.images?.length ?? 0;
    const yourTags = new Set((listing.tags ?? []).map((t) => t.toLowerCase().trim()));

    // Pull competitors for each keyword — 100 results each, sort_on=score
    const competitorSets = await Promise.all(
      keywords.map((kw) =>
        analyzeCompetitors(kw, 100, { sortOn: "score", sortOrder: "desc", includes: "images" })
      )
    );

    // Deduplicate by listing_id across all keyword sets, exclude own listing
    const seen = new Set<number>();
    const allCompetitors = competitorSets
      .flat()
      .filter((c) => {
        if (c.listing_id === listingId || seen.has(c.listing_id)) return false;
        seen.add(c.listing_id);
        return true;
      })
      .sort((a, b) => (b.num_favorers ?? 0) - (a.num_favorers ?? 0))
      .slice(0, 30);

    // --- METRIC 1: Price ---
    const prices = allCompetitors.map((c) => c.price).filter((p) => p > 0).sort((a, b) => a - b);
    const priceMin = prices[0] ?? 0;
    const priceP25 = percentile(prices, 25);
    const priceMedian = percentile(prices, 50);
    const priceP75 = percentile(prices, 75);
    const priceMax = prices[prices.length - 1] ?? 0;
    let pricePosition: "bottom-25" | "mid-range" | "top-25" = "mid-range";
    if (yourPrice < priceP25) pricePosition = "bottom-25";
    else if (yourPrice > priceP75) pricePosition = "top-25";
    let priceFlag: string | null = null;
    const compAvgFavorers = allCompetitors.length > 0
      ? allCompetitors.reduce((s, c) => s + (c.num_favorers ?? 0), 0) / allCompetitors.length
      : 0;
    if (pricePosition === "top-25" && yourFavorers < compAvgFavorers * 0.5) {
      priceFlag = "High price with low demand — may be overpriced for this market";
    } else if (pricePosition === "bottom-25" && yourFavorers > compAvgFavorers) {
      priceFlag = "Low price with strong demand — room to raise price";
    }

    // --- METRIC 2: Demand Gap ---
    const yourPctOfAvg = compAvgFavorers > 0 ? (yourFavorers / compAvgFavorers) * 100 : 0;
    let demandFlag: "red" | "yellow" | "green" = "green";
    if (yourPctOfAvg < 30) demandFlag = "red";
    else if (yourPctOfAvg < 70) demandFlag = "yellow";

    // --- METRIC 3: Tag Coverage ---
    const tagCounts = new Map<string, number>();
    for (const c of allCompetitors) {
      for (const tag of c.tags) {
        const t = tag.toLowerCase().trim();
        tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
      }
    }
    const consensusTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));
    const missingTags = consensusTags.filter(({ tag }) => !yourTags.has(tag));
    const coverageCount = consensusTags.length - missingTags.length;
    let tagFlag: "red" | "yellow" | "green" = "green";
    if (coverageCount < 10) tagFlag = "red";
    else if (coverageCount < 15) tagFlag = "yellow";

    // --- METRIC 4: Photo Count ---
    const compAvgPhotos = allCompetitors.length > 0
      ? allCompetitors.reduce((s, c) => s + (c.image_count ?? 0), 0) / allCompetitors.length
      : 0;
    let photoFlag: "red" | "yellow" | "green" = "green";
    if (yourPhotoCount < 5) photoFlag = "red";
    else if (yourPhotoCount < compAvgPhotos) photoFlag = "yellow";

    const result = {
      keywords_used: keywords,
      competitor_count: allCompetitors.length,
      computed_at: new Date().toISOString(),
      metrics: {
        price: {
          your_price: yourPrice,
          min: priceMin,
          p25: priceP25,
          median: priceMedian,
          p75: priceP75,
          max: priceMax,
          position: pricePosition,
          flag: priceFlag,
        },
        demand: {
          your_favorers: yourFavorers,
          comp_avg: Math.round(compAvgFavorers * 10) / 10,
          your_pct_of_avg: Math.round(yourPctOfAvg),
          flag: demandFlag,
        },
        tags: {
          consensus_tags: consensusTags,
          your_coverage: coverageCount,
          total_consensus: consensusTags.length,
          missing_tags: missingTags,
          flag: tagFlag,
        },
        photos: {
          your_count: yourPhotoCount,
          comp_avg: Math.round(compAvgPhotos * 10) / 10,
          flag: photoFlag,
        },
      },
    };

    saveCache(listingId, result);
    return NextResponse.json({ ...result, from_cache: false });

  } catch (error) {
    console.error(`Benchmarks failed for ${id}:`, error);
    return NextResponse.json({ error: "Failed to compute benchmarks" }, { status: 500 });
  }
}
