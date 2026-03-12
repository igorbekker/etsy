import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getListing } from "@/lib/etsy-client";
import { generateListingRecommendations } from "@/lib/ai-suggestions";
import { performKeywordResearch, compileCompetitorInsights } from "@/lib/keyword-research";
import { DEMO_MODE, getMockRecommendations } from "@/lib/mock-data";

const KEYWORDS_FILE = path.join(process.cwd(), "data", "listing-keywords.json");

interface ListingKeywords {
  primary: string;
  secondary: [string, string];
}

function loadKeywords(listingId: number): ListingKeywords {
  try {
    const store = JSON.parse(fs.readFileSync(KEYWORDS_FILE, "utf-8"));
    return store[String(listingId)] ?? { primary: "", secondary: ["", ""] };
  } catch {
    return { primary: "", secondary: ["", ""] };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listingId = parseInt(id, 10);
  if (isNaN(listingId)) {
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
  }

  if (DEMO_MODE) {
    return NextResponse.json({ recommendations: getMockRecommendations(listingId) });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    const listing = await getListing(listingId);
    const savedKeywords = loadKeywords(listingId);

    // Build keyword seeds — use saved target keywords if set, fall back to title words
    const primaryKeyword = savedKeywords.primary.trim();
    const secondaryKeywords = savedKeywords.secondary.map((s) => s.trim()).filter(Boolean);
    const hasSavedKeywords = Boolean(primaryKeyword);

    let keywordData: Parameters<typeof generateListingRecommendations>[2] = undefined;

    if (hasSavedKeywords) {
      // Run keyword research in parallel for all target keywords
      const seeds = [primaryKeyword, ...secondaryKeywords];
      const results = await Promise.all(seeds.map((kw) => performKeywordResearch(kw)));

      // Merge results across all seed keywords
      const allSuggestions = [...new Set(results.flatMap((r) => r.autocompleteSuggestions))];

      const tagCounts = new Map<string, number>();
      for (const r of results) {
        for (const { tag, count } of r.tagFrequency) {
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + count);
        }
      }
      const mergedTagFrequency = [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => ({ tag, count }));

      const wordCounts = new Map<string, number>();
      for (const r of results) {
        for (const { word, count } of r.titleKeywords) {
          wordCounts.set(word, (wordCounts.get(word) ?? 0) + count);
        }
      }
      const mergedTitleKeywords = [...wordCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([word, count]) => ({ word, count }));

      const seenIds = new Set<number>();
      const mergedCompetitors = results
        .flatMap((r) => r.competitors)
        .filter((c) => {
          if (seenIds.has(c.listing_id)) return false;
          seenIds.add(c.listing_id);
          return c.listing_id !== listingId;
        });

      keywordData = {
        targetKeywords: { primary: primaryKeyword, secondary: secondaryKeywords },
        autocompleteSuggestions: allSuggestions,
        tagFrequency: mergedTagFrequency,
        titleKeywords: mergedTitleKeywords,
      };

      const recommendations = await generateListingRecommendations(
        listing,
        mergedCompetitors,
        keywordData
      );
      const competitorInsights = compileCompetitorInsights(
        listing.tags ?? [],
        mergedCompetitors,
        mergedTagFrequency
      );
      return NextResponse.json({ recommendations, competitorInsights });
    }

    // Fallback: no saved keywords — use title words for competitor search
    const titleWords = listing.title
      .split(/[\s,|/\-–—]+/)
      .filter((w) => w.length > 3)
      .slice(0, 3)
      .join(" ");

    const fallbackResearch = await performKeywordResearch(titleWords);
    const competitors = fallbackResearch.competitors.filter((c) => c.listing_id !== listingId);

    const recommendations = await generateListingRecommendations(listing, competitors);
    const competitorInsights = compileCompetitorInsights(
      listing.tags ?? [],
      competitors,
      fallbackResearch.tagFrequency
    );
    return NextResponse.json({ recommendations, competitorInsights });

  } catch (error) {
    console.error(`Failed to generate recommendations for ${id}:`, error);
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}
