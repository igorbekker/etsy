import Anthropic from "@anthropic-ai/sdk";
import type { EtsyListing } from "./etsy-client";
import type { ImageClassification, BenchmarkResult } from "@/types";

const client = new Anthropic();

export interface AIRecommendations {
  title: { current: string; recommended: string; reasoning: string };
  tags: { current: string[]; recommended: string[]; reasoning: string };
  description: { current: string; recommended: string; reasoning: string };
  altTexts: { imageIndex: number; current: string; recommended: string }[];
  category: { current: number | null; recommended: string; reasoning: string };
  overallStrategy: string;
}

export async function generateListingRecommendations(
  listing: EtsyListing,
  benchmarks: BenchmarkResult
): Promise<AIRecommendations> {
  const { metrics } = benchmarks;
  const yourTags = new Set((listing.tags ?? []).map(t => t.toLowerCase().trim()));
  const missingPrimary = metrics.tags.primary_targets.filter(t => !yourTags.has(t.tag));
  const missingDemand = metrics.favorites_correlation.missing_from_your_listing;

  const imageContext = (listing.images || [])
    .map((img, i) => `Image ${i + 1}: alt_text="${img.alt_text || "(empty)"}"`)
    .join("\n");

  const prompt = `You are an Etsy SEO expert. Optimize the specific listing below for better search ranking and conversion.

## PRODUCT IDENTITY — THIS IS THE PRODUCT YOU ARE OPTIMIZING
Title: "${listing.title}"
Description (first 300 chars): "${listing.description?.slice(0, 300)}${(listing.description?.length ?? 0) > 300 ? "..." : ""}"
Materials: ${listing.materials?.join(", ") || "none"}

⚠️ CRITICAL RULE: Every recommendation — title, tags, description, alt text — must describe THIS specific product. Use competitor intelligence only to find better keywords for THIS product. Never recommend a keyword that doesn't accurately describe this listing.

## Full Listing Data
- Tags (${listing.tags?.length || 0}/13): ${listing.tags?.join(", ") || "none"}
- Category ID: ${listing.taxonomy_id || "not set"}
- Views: ${listing.views}

## Images
${imageContext}

## Intelligence (${benchmarks.competitor_count} competitors · keywords: ${benchmarks.keywords_used.join(", ")})

### Title Gaps
${metrics.title.title_too_long ? `⚠ Title is ${metrics.title.title_length} chars — over 140 char limit\n` : ""}Primary keyword front-loaded: ${metrics.title.primary_keyword_front_loaded ? "Yes ✓" : "No ✗ — must fix"}
Consensus phrases missing from your title (in ≥20% of top-ranked competitor titles):
${metrics.title.missing_from_your_title.join(", ") || "none — title looks good"}

### Tag Gaps
Primary targets (≥30% of competitors, missing from your tags):
${missingPrimary.map(t => `"${t.tag}" (${Math.round(t.pct * 100)}%)`).join(", ") || "none"}
Demand-correlated tags (top 10 highest-favorited competitors, ≥50% use these, missing from yours):
${missingDemand.map(t => `"${t.tag}" (${Math.round(t.pct * 100)}%)`).join(", ") || "none"}
Wasted tag slots (duplicate attributes — no additional SEO benefit, replace these):
${metrics.tags.wasted_tag_slots.join(", ") || "none"}

### Description Gaps
Word count: ${metrics.description.word_count}${metrics.description.word_count < 100 ? " (too short — under 100 words)" : ""}
Issues: ${metrics.description.flags.join("; ") || "none"}
Top competitor keywords missing from your description: ${metrics.description.missing_keywords.join(", ") || "none"}

### Image Gaps
${metrics.images.classification ? `Missing photo types: ${metrics.images.classification.missing_types.map(t => t.replace(/_/g, " ")).join(", ") || "none"}` : "Image analysis not available"}

### Price & Demand
Your price: $${metrics.price.your_price.toFixed(2)} (${metrics.price.position}) | Competitor median: $${metrics.price.median.toFixed(2)} | P75: $${metrics.price.p75.toFixed(2)}
Your net margin: $${metrics.price.margin_scenarios.current_price_net.toFixed(2)}${metrics.price.flag ? ` — ${metrics.price.flag}` : ""}
Your favorites: ${metrics.demand.your_favorers} vs competitor avg ${metrics.demand.comp_avg} (${metrics.demand.your_pct_of_avg}% of avg)

## Instructions
Respond in valid JSON only (no markdown, no code fences):
{
  "title": {"current": "current title", "recommended": "optimized title (max 140 chars, front-load primary keyword, accurately describes this product)", "reasoning": "why"},
  "tags": {"current": ["current tags"], "recommended": ["13 tags — prioritize missing primary targets and demand-correlated tags above, replace wasted slots, all must apply to THIS product"], "reasoning": "why"},
  "description": {"current": "first 200 chars", "recommended": "optimized opening 2-3 paragraphs weaving in missing keywords naturally, accurate to this product", "reasoning": "why"},
  "altTexts": [{"imageIndex": 0, "current": "current", "recommended": "keyword-rich alt text describing what is shown"}],
  "category": {"current": ${listing.taxonomy_id || null}, "recommended": "analysis of whether category is optimal", "reasoning": "why"},
  "overallStrategy": "1-2 sentence summary of the key optimization moves for this specific product"
}

Rules: Title max 140 chars. Tags max 13. Alt text only for empty/short images. Every tag must apply to THIS specific product.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = message.content.find(b => b.type === "text");
  if (!textContent || textContent.type !== "text") throw new Error("No text response from Claude");

  try {
    const raw = textContent.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(raw);
  } catch {
    console.error("Claude raw response (truncated?):", textContent.text.slice(-300));
    throw new Error("Claude returned invalid JSON for listing recommendations");
  }
}

export async function classifyListingImages(
  images: { url: string; alt_text: string }[]
): Promise<ImageClassification> {
  const contentBlocks: Anthropic.MessageParam["content"] = [
    ...images.map(img => ({
      type: "image" as const,
      source: { type: "url" as const, url: img.url },
    })),
    {
      type: "text" as const,
      text: `You are analyzing ${images.length} product photos for an Etsy listing. For each image (in the order shown), identify which of these 7 types it is: hero_shot, detail_texture, scale_reference, lifestyle, variants, packaging, dimensions_diagram, or other. Note any obvious quality issues (blurry, dark, cluttered background) — use null if none. Respond in valid JSON only (no markdown, no code fences):
{"images":[{"index":0,"type":"hero_shot","quality_notes":null}],"missing_types":["packaging","dimensions_diagram"],"coverage_score":5}`,
    },
  ];

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: contentBlocks }],
  });

  const textContent = message.content.find(b => b.type === "text");
  if (!textContent || textContent.type !== "text") throw new Error("No text response from Claude");

  try {
    const raw = textContent.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(raw);
  } catch {
    throw new Error("Claude returned invalid JSON for image classification");
  }
}

export async function generateKeywordSuggestions(
  seedKeyword: string,
  existingTags: string[],
  competitorTags: { tag: string; count: number }[],
  competitorTitleWords: { word: string; count: number }[]
): Promise<{ keywords: string[]; reasoning: string }> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `You are an Etsy SEO expert. Suggest additional keywords for the seed term "${seedKeyword}".

## Current Tags on My Listing
${existingTags.join(", ") || "none"}

## Most Used Tags by Competitors
${competitorTags
  .slice(0, 20)
  .map((t) => `"${t.tag}" (${t.count}x)`)
  .join(", ")}

## Common Words in Competitor Titles
${competitorTitleWords
  .slice(0, 20)
  .map((w) => `"${w.word}" (${w.count}x)`)
  .join(", ")}

Respond in valid JSON only (no markdown, no code fences):
{
  "keywords": ["15-20 suggested keywords/phrases, mix of broad and long-tail, multi-word preferred"],
  "reasoning": "Brief explanation of the keyword strategy"
}

Focus on keywords that:
1. Competitors use frequently but are missing from my tags
2. Long-tail variations of the seed keyword
3. Related buyer-intent phrases
4. Seasonal or trending variations if applicable`,
      },
    ],
  });

  const textContent = message.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  try {
    const raw = textContent.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(raw);
  } catch {
    throw new Error("Claude returned invalid JSON for keyword suggestions");
  }
}
