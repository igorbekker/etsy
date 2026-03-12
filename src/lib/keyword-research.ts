import { searchListings } from "./etsy-client";

export interface KeywordSuggestion {
  keyword: string;
  source: "autocomplete" | "competitor" | "ai";
  frequency?: number;
  competitorCount?: number;
}

export interface CompetitorAnalysis {
  listing_id: number;
  title: string;
  tags: string[];
  taxonomy_id: number;
  views: number;
  num_favorers?: number;
  image_count?: number;
  url: string;
  price: number;
}

export interface KeywordResearchResult {
  seedKeyword: string;
  autocompleteSuggestions: string[];
  competitors: CompetitorAnalysis[];
  tagFrequency: { tag: string; count: number }[];
  titleKeywords: { word: string; count: number }[];
}

// --- Etsy Autocomplete ---

export async function getAutocompleteSuggestions(
  query: string
): Promise<string[]> {
  try {
    const response = await fetch(
      `https://www.etsy.com/search/suggest?q=${encodeURIComponent(query)}&type=all`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    // Etsy returns suggestions in various formats
    if (Array.isArray(data)) {
      return data.map((item: string | { query: string }) =>
        typeof item === "string" ? item : item.query
      );
    }
    if (data.results) {
      return data.results.map(
        (item: string | { query: string }) =>
          typeof item === "string" ? item : item.query
      );
    }
    return [];
  } catch {
    return [];
  }
}

// --- Competitor Analysis ---

export interface CompetitorInsights {
  competitorCount: number;
  topMissingTags: { tag: string; count: number }[];
  topTitlePhrases: { phrase: string; count: number }[];
  priceRange: { min: number; max: number; avg: number };
}

export function compileCompetitorInsights(
  listingTags: string[],
  competitors: CompetitorAnalysis[],
  tagFrequency: { tag: string; count: number }[]
): CompetitorInsights {
  const myTags = new Set(listingTags.map((t) => t.toLowerCase().trim()));

  const topMissingTags = tagFrequency
    .filter(({ tag }) => !myTags.has(tag))
    .slice(0, 10);

  // Bigram frequency from competitor titles
  const bigramCounts = new Map<string, number>();
  for (const c of competitors) {
    const words = c.title
      .toLowerCase()
      .split(/[\s,|/\-–—]+/)
      .filter((w) => w.length > 2);
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      bigramCounts.set(bigram, (bigramCounts.get(bigram) ?? 0) + 1);
    }
  }
  const topTitlePhrases = [...bigramCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([phrase, count]) => ({ phrase, count }));

  const prices = competitors.map((c) => c.price).filter((p) => p > 0);
  const priceRange =
    prices.length > 0
      ? {
          min: Math.min(...prices),
          max: Math.max(...prices),
          avg: prices.reduce((a, b) => a + b, 0) / prices.length,
        }
      : { min: 0, max: 0, avg: 0 };

  return { competitorCount: competitors.length, topMissingTags, topTitlePhrases, priceRange };
}

export async function analyzeCompetitors(
  keyword: string,
  limit = 30,
  options: { sortOn?: string; sortOrder?: string; includes?: string } = {}
): Promise<CompetitorAnalysis[]> {
  const { results } = await searchListings(keyword, limit, options);

  return results.map((listing) => ({
    listing_id: listing.listing_id,
    title: listing.title,
    tags: listing.tags || [],
    taxonomy_id: listing.taxonomy_id,
    views: listing.views,
    num_favorers: listing.num_favorers ?? 0,
    image_count: listing.images?.length ?? 0,
    url: listing.url,
    price: listing.price.amount / listing.price.divisor,
  }));
}

// --- Tag Frequency Analysis ---

function analyzeTagFrequency(
  competitors: CompetitorAnalysis[]
): { tag: string; count: number }[] {
  const tagCounts = new Map<string, number>();

  for (const competitor of competitors) {
    for (const tag of competitor.tags) {
      const normalized = tag.toLowerCase().trim();
      tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
    }
  }

  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

// --- Title Keyword Analysis ---

function analyzeTitleKeywords(
  competitors: CompetitorAnalysis[]
): { word: string; count: number }[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "is", "it", "as", "be", "this", "that", "from",
    "are", "was", "were", "been", "has", "have", "had", "do", "does",
    "did", "will", "would", "could", "should", "may", "might", "can",
    "not", "no", "so", "if", "than", "too", "very", "just", "about",
    "-", "|", "/", "&", ",", ".", "!", "?",
  ]);

  const wordCounts = new Map<string, number>();

  for (const competitor of competitors) {
    const words = competitor.title
      .toLowerCase()
      .split(/[\s,|/\-–—]+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  }

  return Array.from(wordCounts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);
}

// --- Full Research ---

export async function performKeywordResearch(
  seedKeyword: string
): Promise<KeywordResearchResult> {
  // Run autocomplete and competitor analysis in parallel
  const [autocompleteSuggestions, competitors] = await Promise.all([
    getAutocompleteSuggestions(seedKeyword),
    analyzeCompetitors(seedKeyword),
  ]);

  const tagFrequency = analyzeTagFrequency(competitors);
  const titleKeywords = analyzeTitleKeywords(competitors);

  return {
    seedKeyword,
    autocompleteSuggestions,
    competitors,
    tagFrequency,
    titleKeywords,
  };
}
