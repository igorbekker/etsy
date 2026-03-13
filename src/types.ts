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

export interface BenchmarkMetrics {
  price: {
    your_price: number; min: number; p25: number; median: number; p75: number; max: number;
    position: "bottom-25" | "mid-range" | "top-25"; flag: string | null;
  };
  demand: { your_favorers: number; comp_avg: number; your_pct_of_avg: number; flag: "red" | "yellow" | "green" };
  tags: {
    consensus_tags: { tag: string; count: number }[];
    your_coverage: number; total_consensus: number;
    missing_tags: { tag: string; count: number }[];
    flag: "red" | "yellow" | "green";
  };
  photos: { your_count: number; comp_avg: number; flag: "red" | "yellow" | "green" };
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
