import Anthropic from "@anthropic-ai/sdk";
import type { EtsyListing } from "./etsy-client";
import type { CompetitorAnalysis } from "./keyword-research";

const client = new Anthropic();

export interface AIRecommendations {
  title: {
    current: string;
    recommended: string;
    reasoning: string;
  };
  tags: {
    current: string[];
    recommended: string[];
    reasoning: string;
  };
  description: {
    current: string;
    recommended: string;
    reasoning: string;
  };
  altTexts: {
    imageIndex: number;
    current: string;
    recommended: string;
  }[];
  category: {
    current: number | null;
    recommended: string;
    reasoning: string;
  };
  overallStrategy: string;
}

interface KeywordData {
  targetKeywords: { primary: string; secondary: string[] };
  autocompleteSuggestions: string[];
  tagFrequency: { tag: string; count: number }[];
  titleKeywords: { word: string; count: number }[];
}

export async function generateListingRecommendations(
  listing: EtsyListing,
  competitors: CompetitorAnalysis[],
  keywordData?: KeywordData
): Promise<AIRecommendations> {
  const competitorContext = competitors
    .slice(0, 10)
    .map(
      (c, i) =>
        `${i + 1}. Title: "${c.title}"\n   Tags: ${c.tags.join(", ")}\n   Views: ${c.views}, Price: $${c.price.toFixed(2)}${c.taxonomy_id ? `, Category ID: ${c.taxonomy_id}` : ""}`
    )
    .join("\n");

  const imageContext = (listing.images || [])
    .map(
      (img, i) =>
        `Image ${i + 1}: alt_text="${img.alt_text || "(empty)"}"`
    )
    .join("\n");

  const keywordSection = keywordData
    ? `
## Keyword Research (Etsy autocomplete + competitor analysis)
Target keywords: primary="${keywordData.targetKeywords.primary}"${keywordData.targetKeywords.secondary.filter(Boolean).length ? `, secondary=${JSON.stringify(keywordData.targetKeywords.secondary.filter(Boolean))}` : ""}
Etsy autocomplete suggestions: ${keywordData.autocompleteSuggestions.slice(0, 15).join(", ") || "none"}
Top competitor tags by frequency: ${keywordData.tagFrequency.slice(0, 20).map(t => `"${t.tag}" (${t.count}x)`).join(", ") || "none"}
Top words in competitor titles: ${keywordData.titleKeywords.slice(0, 15).map(w => `"${w.word}" (${w.count}x)`).join(", ") || "none"}

Use this keyword data as the foundation for ALL recommendations:
- Front-load the primary keyword in the title
- Prioritize high-frequency competitor tags missing from this listing
- Weave autocomplete suggestions naturally into the description
`
    : "";

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are an Etsy SEO expert. Your job is to optimize the specific listing below for better search ranking and conversion.

## PRODUCT IDENTITY — THIS IS THE PRODUCT YOU ARE OPTIMIZING
Title: "${listing.title}"
Description (first 300 chars): "${listing.description?.slice(0, 300)}${(listing.description?.length ?? 0) > 300 ? "..." : ""}"
Materials: ${listing.materials?.join(", ") || "none"}

⚠️ CRITICAL RULE: Every recommendation you write — title, tags, description, alt text — must describe THIS specific product and nothing else. The competitor data below is used only to find better keywords and phrases for THIS product. If a competitor sells something unrelated, ignore their keywords. Never recommend a keyword, phrase, or description that doesn't accurately describe this listing.

## Full Listing Data
- Tags (${listing.tags?.length || 0}/13): ${listing.tags?.join(", ") || "none"}
- Category ID: ${listing.taxonomy_id || "not set"}
- Views: ${listing.views}

## Images
${imageContext}
${keywordSection}
## Top Competitors for These Keywords (use for keyword ideas only — do not copy their product descriptions)
${competitorContext}

## Instructions
Respond in valid JSON only (no markdown, no code fences) with this structure:
{
  "title": {
    "current": "current title",
    "recommended": "optimized title (max 140 chars, front-load primary keyword, use | or , as separators, must accurately describe this specific product)",
    "reasoning": "why this title is better"
  },
  "tags": {
    "current": ["current", "tags"],
    "recommended": ["13 optimized tags", "multi-word phrases", "mix of broad and specific", "all must be relevant to this specific product"],
    "reasoning": "why these tags are better"
  },
  "description": {
    "current": "first 200 chars of current description",
    "recommended": "optimized first 2-3 paragraphs — weave in primary and secondary keywords naturally, describe the product accurately, include materials, dimensions if known, use cases",
    "reasoning": "why this description is better"
  },
  "altTexts": [
    {"imageIndex": 0, "current": "current alt", "recommended": "keyword-rich descriptive alt text that describes what is shown in the image of this specific product"}
  ],
  "category": {
    "current": 1234,
    "recommended": "Analysis of whether the current category is optimal based on what top competitors use. If most competitors use a different category ID, recommend switching and explain why.",
    "reasoning": "why this category is or isn't the best fit"
  },
  "overallStrategy": "1-2 sentence summary of the optimization strategy for this specific product"
}

Rules:
1. Front-load the primary target keyword in the title
2. Tags: prioritize high-frequency competitor tags that are missing from this listing AND relevant to this product
3. Weave autocomplete suggestions into the description naturally
4. Etsy's 140-char title limit and 13-tag limit are hard limits
5. Alt text: describe what is actually shown in each image, include keywords
6. Only include altTexts for images with empty or very short alt text
7. For category: compare this listing's taxonomy_id against competitors'. Recommend change only if majority use a different one.`,
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
    console.error("Claude raw response (truncated?):", textContent.text.slice(-300));
    throw new Error("Claude returned invalid JSON for listing recommendations");
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
