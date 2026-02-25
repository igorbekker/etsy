import type { EtsyListing } from "./etsy-client";

export interface SEOScore {
  overall: number;
  title: ScoreDetail;
  tags: ScoreDetail;
  description: ScoreDetail;
  images: ScoreDetail;
  metadata: ScoreDetail;
}

export interface ScoreDetail {
  score: number;
  maxScore: number;
  issues: string[];
  suggestions: string[];
}

export function scoreListing(listing: EtsyListing): SEOScore {
  const title = scoreTitle(listing);
  const tags = scoreTags(listing);
  const description = scoreDescription(listing);
  const images = scoreImages(listing);
  const metadata = scoreMetadata(listing);

  const totalScore =
    title.score + tags.score + description.score + images.score + metadata.score;
  const maxTotal =
    title.maxScore +
    tags.maxScore +
    description.maxScore +
    images.maxScore +
    metadata.maxScore;

  return {
    overall: Math.round((totalScore / maxTotal) * 100),
    title,
    tags,
    description,
    images,
    metadata,
  };
}

function scoreTitle(listing: EtsyListing): ScoreDetail {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  const maxScore = 25;

  const title = listing.title || "";

  // Length check (Etsy max is 140 chars, ideal 80-120)
  if (title.length >= 80 && title.length <= 140) {
    score += 8;
  } else if (title.length >= 40 && title.length < 80) {
    score += 5;
    suggestions.push(
      `Title is ${title.length} chars. Aim for 80-140 to maximize keyword coverage.`
    );
  } else if (title.length < 40) {
    score += 2;
    issues.push(
      `Title is only ${title.length} chars. Too short — you're missing keyword opportunities.`
    );
  }

  // Word count (aim for 8-15 meaningful words)
  const words = title.split(/[\s,|/\-–—]+/).filter((w) => w.length > 0);
  if (words.length >= 8 && words.length <= 20) {
    score += 5;
  } else if (words.length < 8) {
    score += 2;
    suggestions.push("Add more descriptive keywords to your title.");
  }

  // Check for keyword stuffing indicators
  const commaCount = (title.match(/,/g) || []).length;
  if (commaCount > 5) {
    issues.push(
      "Excessive commas suggest keyword stuffing. Use natural phrasing."
    );
  } else {
    score += 4;
  }

  // Starts with primary keyword (not filler)
  const firstWord = words[0]?.toLowerCase() || "";
  const fillerWords = new Set(["the", "a", "an", "my", "our", "this", "new"]);
  if (!fillerWords.has(firstWord) && firstWord.length > 0) {
    score += 4;
  } else {
    suggestions.push(
      "Start your title with the primary keyword, not filler words."
    );
  }

  // Has separator characters (good for readability)
  if (title.includes("|") || title.includes("-") || title.includes(",")) {
    score += 4;
  } else {
    suggestions.push(
      "Use separators (| or -) to organize keywords in your title."
    );
  }

  return { score, maxScore, issues, suggestions };
}

function scoreTags(listing: EtsyListing): ScoreDetail {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  const maxScore = 25;

  const tags = listing.tags || [];

  // Tag count (max 13)
  if (tags.length === 13) {
    score += 10;
  } else if (tags.length >= 10) {
    score += 7;
    suggestions.push(`Using ${tags.length}/13 tags. Fill all 13 slots.`);
  } else {
    score += Math.round((tags.length / 13) * 5);
    issues.push(
      `Only ${tags.length}/13 tags used. You're missing ${13 - tags.length} keyword opportunities.`
    );
  }

  // Check for multi-word tags (better than single words)
  const multiWordTags = tags.filter((t) => t.includes(" ")).length;
  if (multiWordTags >= tags.length * 0.6) {
    score += 5;
  } else {
    suggestions.push(
      "Use more multi-word phrases as tags (e.g., 'handmade candle' not 'candle')."
    );
    score += 2;
  }

  // Check for duplicate/redundant tags
  const normalizedTags = tags.map((t) => t.toLowerCase().trim());
  const uniqueTags = new Set(normalizedTags);
  if (uniqueTags.size === normalizedTags.length) {
    score += 5;
  } else {
    issues.push(
      `${normalizedTags.length - uniqueTags.size} duplicate tag(s) found. Each tag should be unique.`
    );
  }

  // Tag length variety (mix of short and long-tail)
  const avgLength =
    tags.reduce((sum, t) => sum + t.length, 0) / (tags.length || 1);
  if (avgLength >= 10 && avgLength <= 20) {
    score += 5;
  } else if (avgLength < 10) {
    suggestions.push(
      "Tags are too short. Use longer, more specific phrases for better targeting."
    );
    score += 2;
  } else {
    score += 3;
  }

  return { score, maxScore, issues, suggestions };
}

function scoreDescription(listing: EtsyListing): ScoreDetail {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  const maxScore = 20;

  const desc = listing.description || "";

  // Length check
  if (desc.length >= 500) {
    score += 6;
  } else if (desc.length >= 200) {
    score += 3;
    suggestions.push(
      `Description is ${desc.length} chars. Aim for 500+ for better SEO.`
    );
  } else {
    issues.push(
      `Description is only ${desc.length} chars. Too short for effective SEO.`
    );
    score += 1;
  }

  // Has paragraphs/structure
  const lineBreaks = (desc.match(/\n/g) || []).length;
  if (lineBreaks >= 3) {
    score += 4;
  } else {
    suggestions.push(
      "Break your description into paragraphs for better readability."
    );
    score += 1;
  }

  // Contains relevant keywords from title
  const titleWords = (listing.title || "")
    .toLowerCase()
    .split(/[\s,|/\-–—]+/)
    .filter((w) => w.length > 3);
  const descLower = desc.toLowerCase();
  const matchingWords = titleWords.filter((w) => descLower.includes(w));
  const keywordOverlap =
    titleWords.length > 0 ? matchingWords.length / titleWords.length : 0;

  if (keywordOverlap >= 0.5) {
    score += 5;
  } else {
    suggestions.push(
      "Include more title keywords naturally in your description."
    );
    score += 2;
  }

  // Has call to action or shipping/care info
  const hasUsefulInfo =
    descLower.includes("shipping") ||
    descLower.includes("care") ||
    descLower.includes("size") ||
    descLower.includes("measure") ||
    descLower.includes("material") ||
    descLower.includes("handmade");
  if (hasUsefulInfo) {
    score += 5;
  } else {
    suggestions.push(
      "Add practical details: sizing, materials, care instructions, shipping info."
    );
  }

  return { score, maxScore, issues, suggestions };
}

function scoreImages(listing: EtsyListing): ScoreDetail {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  const maxScore = 15;

  const images = listing.images || [];

  // Image count (max 10)
  if (images.length >= 8) {
    score += 6;
  } else if (images.length >= 5) {
    score += 4;
    suggestions.push(
      `${images.length}/10 images. Add more to showcase your product from all angles.`
    );
  } else {
    issues.push(
      `Only ${images.length}/10 images. More images = more buyer confidence.`
    );
    score += 2;
  }

  // Alt text check
  const withAltText = images.filter((img) => img.alt_text && img.alt_text.trim().length > 0).length;
  if (withAltText === images.length && images.length > 0) {
    score += 5;
  } else if (withAltText > 0) {
    score += 2;
    issues.push(
      `${images.length - withAltText}/${images.length} images missing alt text. Alt text helps SEO.`
    );
  } else if (images.length > 0) {
    issues.push("No images have alt text. This is a missed SEO opportunity.");
  }

  // Alt text quality (should be descriptive, not just product name)
  const goodAltText = images.filter(
    (img) => img.alt_text && img.alt_text.length >= 20
  ).length;
  if (goodAltText >= images.length * 0.5 && images.length > 0) {
    score += 4;
  } else {
    suggestions.push(
      "Write descriptive alt text (20+ chars) with keywords for each image."
    );
    score += 1;
  }

  return { score, maxScore, issues, suggestions };
}

function scoreMetadata(listing: EtsyListing): ScoreDetail {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  const maxScore = 15;

  // Category/taxonomy set
  if (listing.taxonomy_id) {
    score += 2;
  } else {
    issues.push(
      "No category set. Choose a specific category to help Etsy match your listing to the right searches."
    );
  }

  // Materials filled
  if (listing.materials && listing.materials.length > 0) {
    score += 3;
  } else {
    suggestions.push("Add materials to help buyers find your product.");
  }

  // Styles filled
  if (listing.styles && listing.styles.length > 0) {
    score += 2;
  } else {
    suggestions.push("Add style tags to your listing.");
  }

  // Processing time set
  if (listing.processing_min && listing.processing_max) {
    score += 3;
  } else {
    suggestions.push("Set processing time to build buyer trust.");
  }

  // Personalization enabled (if applicable)
  if (listing.is_personalizable) {
    score += 2;
  }

  // Has a shop section
  if (listing.shop_section_id) {
    score += 3;
  } else {
    suggestions.push(
      "Assign this listing to a shop section for better organization."
    );
  }

  // Category specificity note (taxonomy_id exists but we can't programmatically
  // determine "best" category without comparing to competitors — the AI
  // recommendations tab handles that deeper analysis)
  if (listing.taxonomy_id) {
    suggestions.push(
      "Check the AI Recommendations tab to verify your category matches top competitors."
    );
  }

  return { score, maxScore, issues, suggestions };
}
