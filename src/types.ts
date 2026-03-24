// Shared types used across client components and API routes

export interface Listing {
  listing_id: number;
  title: string;
  description: string;
  tags: string[];
  price: { amount: number; divisor: number; currency_code: string };
  quantity: number;
  views: number;
  num_favorers?: number;
  state: string;
  url: string;
  images: { url_170x135: string; url_570xN: string; url_fullxfull: string; alt_text: string; listing_image_id: number; rank: number }[];
  materials: string[];
  styles: string[];
  who_made: string;
  when_made: string;
  processing_min: number;
  processing_max: number;
  is_personalizable: boolean;
  taxonomy_id: number;
  shipping_profile_id: number;
  created_timestamp: number;
  updated_timestamp: number;
}

export interface ScoreDetail {
  score: number;
  maxScore: number;
  issues: string[];
  suggestions: string[];
}

export interface SEOScore {
  overall: number;
  title: ScoreDetail;
  tags: ScoreDetail;
  description: ScoreDetail;
  images: ScoreDetail;
  metadata: ScoreDetail;
}

export interface AIRecommendations {
  title: { current: string; recommended: string; reasoning: string };
  tags: { current: string[]; recommended: string[]; reasoning: string };
  description: { current: string; recommended: string; reasoning: string };
  altTexts: { imageIndex: number; current: string; recommended: string }[];
  category: { current: number | null; recommended: string; reasoning: string };
  overallStrategy: string;
}

export interface CompetitorInsights {
  competitorCount: number;
  topMissingTags: { tag: string; count: number }[];
  topTitlePhrases: { phrase: string; count: number }[];
  priceRange: { min: number; max: number; avg: number };
}

export interface KeywordResult {
  seedKeyword: string;
  autocompleteSuggestions: string[];
  competitors: {
    listing_id: number;
    title: string;
    tags: string[];
    views: number;
    url: string;
    price: number;
  }[];
  tagFrequency: { tag: string; count: number }[];
  titleKeywords: { word: string; count: number }[];
}

export interface AISuggestions {
  keywords: string[];
  reasoning: string;
}

export interface ImageClassification {
  images: { index: number; type: string; quality_notes: string | null }[];
  missing_types: string[];
  coverage_score: number;
}

export interface BenchmarkMetrics {
  price: {
    your_price: number; min: number; p10: number; p25: number; median: number; p75: number; p90: number; max: number;
    position: "bottom-10" | "mid-range" | "top-10"; flag: string | null;
    margin_scenarios: { current_price_net: number; median_price_net: number; p75_price_net: number };
  };
  demand: { your_favorers: number; comp_avg: number; your_pct_of_avg: number; flag: "red" | "yellow" | "green" };
  tags: {
    consensus_tags: { tag: string; count: number; pct: number }[];
    primary_targets: { tag: string; count: number; pct: number }[];
    secondary_targets: { tag: string; count: number; pct: number }[];
    your_coverage: number; total_consensus: number;
    missing_tags: { tag: string; count: number; pct: number }[];
    wasted_tag_slots: string[];
    attribute_values_set: string[];
    flag: "red" | "yellow" | "green";
  };
  favorites_correlation: {
    high_demand_group_size: number;
    correlated_tags: { tag: string; count: number; pct: number }[];
    missing_from_your_listing: { tag: string; count: number; pct: number }[];
  };
  title: {
    consensus_phrases: { phrase: string; count: number; pct: number }[];
    missing_from_your_title: string[];
    title_length: number; title_too_long: boolean;
    primary_keyword_front_loaded: boolean; consensus_coverage: number;
  };
  description: { word_count: number; score: number; flags: string[]; missing_keywords: string[] };
  images: {
    your_count: number; comp_avg: number; flag: "red" | "yellow" | "green";
    classification: ImageClassification | null;
  };
}

export interface BenchmarkResult {
  keywords_used: string[];
  competitor_count: number;
  computed_at: string;
  from_cache: boolean;
  metrics: BenchmarkMetrics;
}

export interface AttributeGap {
  property_id: number;
  name: string;
  available_values: { value_id: number; name: string }[];
  suggested_values: { value_id: number; name: string }[];
}

export interface AttributesResult {
  fill_rate: number;
  filled: number;
  total: number;
  current_properties: { property_id: number; name: string; values: string[] }[];
  gaps: AttributeGap[];
}

export type ChecklistField = "title" | "tags" | "description" | "alt_text" | "attributes" | "photos" | "price";
export interface ChecklistItem { done: boolean; pushed_at?: string; }
export type ChecklistState = Record<ChecklistField, ChecklistItem>;

export interface Keywords {
  primary: string;
  secondary: [string, string];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  listing_id: number;
  listing_title: string;
  field: string;
  image_index: number;
  image_id: number;
  old_value: string;
  new_value: string;
  reverted?: boolean;
}

export type SortMode = "priority" | "views" | "title";
export type DetailTab = "details" | "images" | "seo" | "recommendations" | "benchmarks";
export type TopTab = "listings" | "keywords" | "logs" | "glossary";
