import { getListing, getListingProperties } from "@/lib/etsy-client";
import { analyzeCompetitors } from "@/lib/keyword-research";
import { classifyListingImages } from "@/lib/ai-suggestions";
import type { BenchmarkMetrics, ImageClassification } from "@/types";

const NET_MARGIN_FACTOR = 0.905; // 1 - 0.065 (Etsy fee) - 0.03 (payment processing)
const NET_MARGIN_FIXED = 0.25;   // $0.25 fixed payment processing fee

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "is", "it", "as", "be", "this", "that", "from",
  "are", "was", "were", "been", "has", "have", "had", "do", "does",
  "did", "will", "would", "could", "should", "may", "might", "can",
  "not", "no", "so", "if", "than", "too", "very", "just", "about",
]);

const BOILERPLATE_PREFIXES = [
  "this listing is for",
  "this is a",
  "welcome to",
  "i am selling",
];

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const low = Math.floor(idx);
  const high = Math.ceil(idx);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (idx - low);
}

function netMargin(price: number): number {
  return Math.round((price * NET_MARGIN_FACTOR - NET_MARGIN_FIXED) * 100) / 100;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[\s,|/\-–—]+/).filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function extractPhrases(tokens: string[]): string[] {
  const phrases: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) phrases.push(`${tokens[i]} ${tokens[i + 1]}`);
  for (let i = 0; i < tokens.length - 2; i++) phrases.push(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
  return phrases;
}

function pct(count: number, total: number): number {
  return Math.round((count / Math.max(total, 1)) * 100) / 100;
}

export async function computeBenchmarks(
  listingId: number,
  keywords: string[]
): Promise<{ keywords_used: string[]; competitor_count: number; computed_at: string; metrics: BenchmarkMetrics }> {
  const listing = await getListing(listingId);
  const yourPrice = listing.price.amount / listing.price.divisor;
  const yourFavorers = listing.num_favorers ?? 0;
  const yourTags = new Set((listing.tags ?? []).map(t => t.toLowerCase().trim()));

  const competitorSets = await Promise.all(
    keywords.map(kw => analyzeCompetitors(kw, 100, { sortOn: "score", sortOrder: "desc", includes: "images" }))
  );

  const seen = new Set<number>();
  const deduped = competitorSets.flat().filter(c => {
    if (c.listing_id === listingId || seen.has(c.listing_id)) return false;
    seen.add(c.listing_id);
    return true;
  });

  // Filter by relevance to primary keyword so secondary keywords don't pollute competitor set
  const primaryTokens = tokenize(keywords[0] ?? "");
  const byRelevance = (pool: typeof deduped, mode: "all" | "any") =>
    pool.filter(c => {
      const titleTokens = new Set(tokenize(c.title));
      return mode === "all"
        ? primaryTokens.every(t => titleTokens.has(t))
        : primaryTokens.some(t => titleTokens.has(t));
    });
  let relevant = primaryTokens.length > 0 ? byRelevance(deduped, "all") : deduped;
  if (relevant.length < 10 && primaryTokens.length > 0) relevant = byRelevance(deduped, "any");
  if (relevant.length < 10) relevant = deduped;

  const allCompetitors = relevant
    .sort((a, b) => (b.num_favorers ?? 0) - (a.num_favorers ?? 0))
    .slice(0, 30);

  const total = Math.max(allCompetitors.length, 1);
  const compAvgFavorers = allCompetitors.reduce((s, c) => s + (c.num_favorers ?? 0), 0) / total;

  // --- METRIC 1: Price (3A-Step 1) ---
  const prices = allCompetitors.map(c => c.price).filter(p => p > 0).sort((a, b) => a - b);
  const priceMedian = percentile(prices, 50);
  const priceP75 = percentile(prices, 75);
  const priceP10 = percentile(prices, 10);
  const priceP90 = percentile(prices, 90);
  let pricePosition: "bottom-10" | "mid-range" | "top-10" = "mid-range";
  if (yourPrice < priceP10) pricePosition = "bottom-10";
  else if (yourPrice > priceP90) pricePosition = "top-10";
  let priceFlag: string | null = null;
  if (pricePosition === "top-10" && yourFavorers < compAvgFavorers * 0.5) {
    priceFlag = "High price with low demand — may be overpriced for this market";
  } else if (pricePosition === "bottom-10" && yourFavorers > compAvgFavorers) {
    priceFlag = "Low price with strong demand — room to raise price";
  }

  // --- METRIC 2: Demand Gap ---
  const yourPctOfAvg = compAvgFavorers > 0 ? (yourFavorers / compAvgFavorers) * 100 : 0;
  let demandFlag: "red" | "yellow" | "green" = "green";
  if (yourPctOfAvg < 30) demandFlag = "red";
  else if (yourPctOfAvg < 70) demandFlag = "yellow";

  // --- METRIC 3: Tag Coverage (3A-Step 2) ---
  const tagCounts = new Map<string, number>();
  for (const c of allCompetitors) {
    for (const tag of c.tags) tagCounts.set(tag.toLowerCase().trim(), (tagCounts.get(tag.toLowerCase().trim()) ?? 0) + 1);
  }
  const consensusTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 20)
    .map(([tag, count]) => ({ tag, count, pct: pct(count, total) }));
  const primaryTargets = consensusTags.filter(t => t.pct >= 0.30);
  const secondaryTargets = consensusTags.filter(t => t.pct >= 0.15 && t.pct < 0.30);
  const missingTags = consensusTags.filter(({ tag }) => !yourTags.has(tag));
  const coverageCount = consensusTags.length - missingTags.length;
  const tagFlag: "red" | "yellow" | "green" = coverageCount < 10 ? "red" : coverageCount < 15 ? "yellow" : "green";

  // --- 3A-Step 4: Attribute duplicate detection ---
  let wastedTagSlots: string[] = [];
  let attributeValuesSet: string[] = [];
  try {
    const listingProps = await getListingProperties(listingId);
    attributeValuesSet = listingProps.flatMap((p: { values: string[] }) => p.values.map((v: string) => v.toLowerCase().trim()));
    const attrSet = new Set(attributeValuesSet);
    wastedTagSlots = [...yourTags].filter(tag => attrSet.has(tag));
  } catch { /* non-fatal */ }

  // --- 3A-Step 3: Favorites Correlation ---
  const highDemandGroup = allCompetitors.slice(0, 10);
  const hdTagCounts = new Map<string, number>();
  for (const c of highDemandGroup) {
    for (const tag of c.tags) hdTagCounts.set(tag.toLowerCase().trim(), (hdTagCounts.get(tag.toLowerCase().trim()) ?? 0) + 1);
  }
  const hdSize = Math.max(highDemandGroup.length, 1);
  const correlatedTags = [...hdTagCounts.entries()]
    .filter(([, count]) => count / hdSize >= 0.5).sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count, pct: pct(count, hdSize) }));
  const missingCorrelatedTags = correlatedTags.filter(({ tag }) => !yourTags.has(tag));

  // --- 3A-Step 5: Title consensus analysis ---
  const phraseCounts = new Map<string, number>();
  for (const c of allCompetitors) {
    for (const phrase of extractPhrases(tokenize(c.title))) phraseCounts.set(phrase, (phraseCounts.get(phrase) ?? 0) + 1);
  }
  const consensusPhrases = [...phraseCounts.entries()]
    .filter(([, count]) => count / total >= 0.20).sort((a, b) => b[1] - a[1]).slice(0, 15)
    .map(([phrase, count]) => ({ phrase, count, pct: pct(count, total) }));
  const yourTitlePhrases = new Set(extractPhrases(tokenize(listing.title)));
  const missingFromYourTitle = consensusPhrases.filter(({ phrase }) => !yourTitlePhrases.has(phrase)).map(p => p.phrase);
  const primaryKw = keywords[0] ?? "";
  const primaryKwFrontLoaded = primaryKw.length > 0 &&
    listing.title.toLowerCase().slice(0, 40).includes(primaryKw.toLowerCase().split(" ")[0]);
  const consensusCoverage = consensusPhrases.filter(({ phrase }) => yourTitlePhrases.has(phrase)).length;

  // --- 3A-Step 6: Description audit ---
  const description = listing.description ?? "";
  const wordCount = description.split(/\s+/).filter(Boolean).length;
  const descFlags: string[] = [];
  if (wordCount < 100) descFlags.push("Description too short (under 100 words)");
  const firstSent = (description.split(/[.\n]/)[0] ?? "").toLowerCase();
  const titleTokenSet = new Set(tokenize(listing.title));
  const firstSentTokens = new Set(firstSent.split(/[\s,|/\-–—]+/).filter(w => w.length > 2));
  const titleOverlap = [...titleTokenSet].filter(w => firstSentTokens.has(w)).length;
  if (titleTokenSet.size > 0 && titleOverlap / titleTokenSet.size > 0.8)
    descFlags.push("First sentence copies the title — add unique context instead");
  const descLower = description.toLowerCase();
  if (BOILERPLATE_PREFIXES.some(p => descLower.startsWith(p)))
    descFlags.push("Description starts with boilerplate — open with the product benefit");
  const top5Tags = consensusTags.slice(0, 5).map(t => t.tag);
  const opening = description.split(/[.\n]/).slice(0, 3).join(" ").toLowerCase();
  if (top5Tags.length > 0 && !top5Tags.some(tag => opening.includes(tag)))
    descFlags.push("No top competitor keywords in your opening sentences");
  const missingKeywordsDesc = top5Tags.filter(tag => !descLower.includes(tag));

  // --- 3A-Step 7: Image type classification ---
  const yourPhotoCount = listing.images?.length ?? 0;
  const compAvgPhotos = allCompetitors.reduce((s, c) => s + (c.image_count ?? 0), 0) / total;
  const photoFlag: "red" | "yellow" | "green" = yourPhotoCount < 5 ? "red" : yourPhotoCount < compAvgPhotos ? "yellow" : "green";
  let imageClassification: ImageClassification | null = null;
  if (listing.images && listing.images.length > 0) {
    try {
      imageClassification = await classifyListingImages(listing.images.map(img => ({ url: img.url_570xN, alt_text: img.alt_text || "" })));
    } catch { /* non-fatal */ }
  }

  return {
    keywords_used: keywords,
    competitor_count: allCompetitors.length,
    computed_at: new Date().toISOString(),
    metrics: {
      price: {
        your_price: yourPrice,
        min: prices[0] ?? 0,
        p10: priceP10,
        p25: percentile(prices, 25),
        median: priceMedian,
        p75: priceP75,
        p90: priceP90,
        max: prices[prices.length - 1] ?? 0,
        position: pricePosition,
        flag: priceFlag,
        margin_scenarios: {
          current_price_net: netMargin(yourPrice),
          median_price_net: netMargin(priceMedian),
          p75_price_net: netMargin(priceP75),
        },
      },
      demand: {
        your_favorers: yourFavorers,
        comp_avg: Math.round(compAvgFavorers * 10) / 10,
        your_pct_of_avg: Math.round(yourPctOfAvg),
        flag: demandFlag,
      },
      tags: {
        consensus_tags: consensusTags,
        primary_targets: primaryTargets,
        secondary_targets: secondaryTargets,
        your_coverage: coverageCount,
        total_consensus: consensusTags.length,
        missing_tags: missingTags,
        wasted_tag_slots: wastedTagSlots,
        attribute_values_set: attributeValuesSet,
        flag: tagFlag,
      },
      favorites_correlation: {
        high_demand_group_size: highDemandGroup.length,
        correlated_tags: correlatedTags,
        missing_from_your_listing: missingCorrelatedTags,
      },
      title: {
        consensus_phrases: consensusPhrases,
        missing_from_your_title: missingFromYourTitle,
        title_length: listing.title.length,
        title_too_long: listing.title.length > 140,
        primary_keyword_front_loaded: primaryKwFrontLoaded,
        consensus_coverage: consensusCoverage,
      },
      description: {
        word_count: wordCount,
        score: -descFlags.length,
        flags: descFlags,
        missing_keywords: missingKeywordsDesc,
      },
      images: {
        your_count: yourPhotoCount,
        comp_avg: Math.round(compAvgPhotos * 10) / 10,
        flag: photoFlag,
        classification: imageClassification,
      },
    },
  };
}
