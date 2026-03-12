"use client";

import { useEffect, useState } from "react";

// --- Types ---

interface Listing {
  listing_id: number;
  title: string;
  description: string;
  tags: string[];
  price: { amount: number; divisor: number; currency_code: string };
  quantity: number;
  views: number;
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

interface ScoreDetail {
  score: number;
  maxScore: number;
  issues: string[];
  suggestions: string[];
}

interface SEOScore {
  overall: number;
  title: ScoreDetail;
  tags: ScoreDetail;
  description: ScoreDetail;
  images: ScoreDetail;
  metadata: ScoreDetail;
}

interface AIRecommendations {
  title: { current: string; recommended: string; reasoning: string };
  tags: { current: string[]; recommended: string[]; reasoning: string };
  description: { current: string; recommended: string; reasoning: string };
  altTexts: { imageIndex: number; current: string; recommended: string }[];
  category: { current: number | null; recommended: string; reasoning: string };
  overallStrategy: string;
}

interface KeywordResult {
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

interface AISuggestions {
  keywords: string[];
  reasoning: string;
}

type SortMode = "priority" | "views" | "title";
type DetailTab = "details" | "images" | "seo" | "recommendations";
type TopTab = "listings" | "keywords" | "logs" | "glossary";

// --- Helpers ---

function formatPrice(price: Listing["price"]) {
  return `$${(price.amount / price.divisor).toFixed(2)}`;
}

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString();
}

function scoreColor(score: number) {
  if (score >= 70) return "text-green-400";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
}

function scoreBadge(score: number) {
  if (score >= 70) return "text-green-400 bg-green-400/10 border-green-500/30";
  if (score >= 40) return "text-yellow-400 bg-yellow-400/10 border-yellow-500/30";
  return "text-red-400 bg-red-400/10 border-red-500/30";
}

function scoreBar(ratio: number) {
  if (ratio >= 0.7) return "bg-green-500";
  if (ratio >= 0.4) return "bg-yellow-500";
  return "bg-red-500";
}

// --- Detail Panel ---

function DetailPanel({ listing, seoScore }: { listing: Listing; seoScore: SEOScore | null }) {
  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const [recommendations, setRecommendations] = useState<AIRecommendations | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState("");

  useEffect(() => {
    setActiveTab("details");
    setRecommendations(null);
    setRecsError("");
  }, [listing.listing_id]);

  async function fetchRecommendations() {
    setRecsLoading(true);
    setRecsError("");
    try {
      const res = await fetch(`/api/etsy/recommendations/${listing.listing_id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch");
      }
      const data = await res.json();
      setRecommendations(data.recommendations);
    } catch (err) {
      setRecsError(err instanceof Error ? err.message : "Failed to generate recommendations");
    } finally {
      setRecsLoading(false);
    }
  }

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "images", label: "Images" },
    { key: "seo", label: "SEO Score" },
    { key: "recommendations", label: "AI Recs" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Listing Header */}
      <div className="flex-shrink-0 p-5 border-b border-gray-700 bg-gray-900">
        <div className="flex gap-4">
          {listing.images?.[0] && (
            <img
              src={listing.images[0].url_570xN}
              alt={listing.images[0].alt_text || listing.title}
              className="w-20 h-20 object-cover rounded-lg flex-shrink-0 border border-gray-700"
            />
          )}
          <div className="min-w-0">
            <h2 className="font-semibold text-white text-sm leading-snug mb-1">
              {listing.title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400">
              <span className="text-white font-medium">{formatPrice(listing.price)}</span>
              <span>{listing.views} views</span>
              <span>Qty: {listing.quantity}</span>
            </div>
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-orange-400 hover:text-orange-300 mt-1 inline-block"
            >
              View on Etsy →
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-gray-700 bg-gray-900">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key === "recommendations" && !recommendations && !recsLoading) {
                fetchRecommendations();
              }
            }}
            className={`px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "text-white border-b-2 border-orange-500 bg-gray-800"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gray-950">

        {activeTab === "details" && (
          <>
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed bg-gray-800 border border-gray-700 p-3 rounded-lg">
                {listing.description}
              </p>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Tags ({listing.tags?.length || 0}/13)
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {listing.tags?.map((tag, i) => (
                  <span key={i} className="px-2.5 py-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg">
                    {tag}
                  </span>
                ))}
                {(!listing.tags || listing.tags.length < 13) && (
                  <span className="px-2.5 py-1 border border-dashed border-gray-600 text-gray-500 text-xs rounded-lg">
                    {13 - (listing.tags?.length || 0)} unused
                  </span>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Properties</h3>
              <div className="grid grid-cols-2 gap-3 bg-gray-800 border border-gray-700 p-4 rounded-lg">
                {([
                  ["Who Made", listing.who_made?.replace(/_/g, " ")],
                  ["When Made", listing.when_made?.replace(/_/g, " ")],
                  ["Processing", `${listing.processing_min}–${listing.processing_max} days`],
                  ["Materials", listing.materials?.join(", ") || "—"],
                  ["Styles", listing.styles?.join(", ") || "—"],
                  ["Personalizable", listing.is_personalizable ? "Yes" : "No"],
                  ["Created", formatDate(listing.created_timestamp)],
                  ["Category ID", String(listing.taxonomy_id)],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm text-gray-200 capitalize mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab === "images" && (
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Images ({listing.images?.length || 0}/10)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {listing.images?.sort((a, b) => a.rank - b.rank).map((img) => (
                <div key={img.listing_image_id}>
                  <img
                    src={img.url_570xN}
                    alt={img.alt_text || "Listing image"}
                    className="w-full rounded-lg border border-gray-700"
                  />
                  <div className="mt-1 text-xs">
                    <span className="text-gray-500">Alt: </span>
                    <span className={img.alt_text ? "text-gray-300" : "text-red-400"}>
                      {img.alt_text || "Missing!"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "seo" && (
          <>
            {seoScore ? (
              <>
                <div className="flex items-center gap-4 p-4 bg-gray-800 border border-gray-700 rounded-xl">
                  <div className={`text-4xl font-bold ${scoreColor(seoScore.overall)}`}>
                    {seoScore.overall}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Overall SEO Score</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {seoScore.overall >= 70 ? "Good — minor improvements possible"
                        : seoScore.overall >= 40 ? "Needs work — several opportunities"
                        : "Poor — significant improvements needed"}
                    </p>
                  </div>
                </div>

                {([
                  ["Title", seoScore.title],
                  ["Tags", seoScore.tags],
                  ["Description", seoScore.description],
                  ["Images", seoScore.images],
                  ["Metadata", seoScore.metadata],
                ] as [string, ScoreDetail][]).map(([label, detail]) => {
                  const ratio = detail.score / detail.maxScore;
                  return (
                    <div key={label} className="p-4 bg-gray-800 border border-gray-700 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{label}</span>
                        <span className={`text-xs font-mono ${scoreColor(ratio * 100)}`}>
                          {detail.score}/{detail.maxScore}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${scoreBar(ratio)}`} style={{ width: `${ratio * 100}%` }} />
                      </div>
                      {detail.issues.map((issue, i) => (
                        <p key={i} className="text-xs text-red-400 flex gap-1.5"><span>✕</span>{issue}</p>
                      ))}
                      {detail.suggestions.map((s, i) => (
                        <p key={i} className="text-xs text-yellow-400 flex gap-1.5"><span>○</span>{s}</p>
                      ))}
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500 text-sm">Loading SEO analysis...</div>
            )}
          </>
        )}

        {activeTab === "recommendations" && (
          <>
            {recsLoading && (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">Analyzing listing and competitors...</p>
                <p className="text-gray-600 text-xs mt-1">This may take 10–15 seconds</p>
              </div>
            )}
            {recsError && (
              <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
                <p className="text-red-400 text-sm">{recsError}</p>
                <button onClick={fetchRecommendations} className="mt-2 text-xs text-orange-400 hover:text-orange-300">Retry</button>
              </div>
            )}
            {recommendations && (
              <>
                <div className="p-4 bg-orange-900/20 border border-orange-800/30 rounded-xl">
                  <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1">Overall Strategy</p>
                  <p className="text-sm text-gray-300">{recommendations.overallStrategy}</p>
                </div>

                {([
                  { label: "Title", reasoning: recommendations.title.reasoning, left: recommendations.title.current, right: recommendations.title.recommended },
                  { label: "Description", reasoning: recommendations.description.reasoning, left: recommendations.description.current, right: recommendations.description.recommended },
                ]).map(({ label, reasoning, left, right }) => (
                  <section key={label} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-700">
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{reasoning}</p>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-700">
                      <div className="p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Current</p>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">{left}</p>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-green-500 uppercase tracking-wider mb-2">Recommended</p>
                        <p className="text-sm text-white whitespace-pre-wrap max-h-48 overflow-y-auto">{right}</p>
                      </div>
                    </div>
                  </section>
                ))}

                <section className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-700">
                    <p className="text-sm font-medium text-white">Tags</p>
                    <p className="text-xs text-gray-500 mt-0.5">{recommendations.tags.reasoning}</p>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-700">
                    <div className="p-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Current ({recommendations.tags.current.length}/13)</p>
                      <div className="flex flex-wrap gap-1">
                        {recommendations.tags.current.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-green-500 uppercase tracking-wider mb-2">Recommended ({recommendations.tags.recommended.length}/13)</p>
                      <div className="flex flex-wrap gap-1">
                        {recommendations.tags.recommended.map((tag, i) => {
                          const isNew = !recommendations.tags.current.includes(tag);
                          return (
                            <span key={i} className={`px-2 py-0.5 text-xs rounded ${isNew ? "bg-green-900/40 text-green-400 border border-green-800/50" : "bg-gray-700 text-gray-300"}`}>
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>

                {recommendations.altTexts.length > 0 && (
                  <section className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-700">
                      <p className="text-sm font-medium text-white">Image Alt Text</p>
                    </div>
                    <div className="divide-y divide-gray-700">
                      {recommendations.altTexts.map((alt, i) => (
                        <div key={i} className="grid grid-cols-2 divide-x divide-gray-700">
                          <div className="p-3">
                            <p className="text-xs text-gray-500 mb-1">Image {alt.imageIndex + 1} — Current</p>
                            <p className="text-sm text-gray-300">{alt.current || "(empty)"}</p>
                          </div>
                          <div className="p-3">
                            <p className="text-xs text-green-500 mb-1">Recommended</p>
                            <p className="text-sm text-white">{alt.recommended}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <div className="flex justify-center pt-2">
                  <button
                    onClick={fetchRecommendations}
                    disabled={recsLoading}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-sm text-gray-300 rounded-lg transition-colors"
                  >
                    Regenerate
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- Keywords Panel ---

function KeywordsPanel() {
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<KeywordResult | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/keywords/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      if (!res.ok) throw new Error("Research failed");
      const data = await res.json();
      setResult(data);
      setAiSuggestions(null);
    } catch {
      setError("Keyword research failed. Make sure Etsy is connected.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAiSuggest() {
    if (!result) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/keywords/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seedKeyword: result.seedKeyword,
          existingTags: [],
          competitorTags: result.tagFrequency,
          competitorTitleWords: result.titleKeywords,
        }),
      });
      if (!res.ok) throw new Error("AI suggestion failed");
      const data = await res.json();
      setAiSuggestions(data);
    } catch {
      setError("AI suggestions failed. Make sure ANTHROPIC_API_KEY is set.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
      <h2 className="text-xl font-bold text-white mb-6">Keyword Research</h2>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Enter a seed keyword (e.g., 'handmade candle')"
          className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
        />
        <button
          type="submit"
          disabled={loading || !keyword.trim()}
          className="px-6 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
        >
          {loading ? "Researching..." : "Research"}
        </button>
      </form>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-8">
          <section>
            <h3 className="text-base font-semibold mb-3 text-white">Autocomplete Suggestions</h3>
            {result.autocompleteSuggestions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.autocompleteSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setKeyword(s)}
                    className="px-3 py-1.5 bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg hover:border-orange-500 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No autocomplete suggestions found.</p>
            )}
          </section>

          <section>
            <h3 className="text-base font-semibold mb-3 text-white">
              Most Used Tags by Competitors ({result.competitors.length} listings analyzed)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {result.tagFrequency.slice(0, 30).map(({ tag, count }, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-900 rounded-lg">
                  <span className="text-sm text-gray-300 truncate">{tag}</span>
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{count}x</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-base font-semibold mb-3 text-white">Common Words in Competitor Titles</h3>
            <div className="flex flex-wrap gap-2">
              {result.titleKeywords.slice(0, 30).map(({ word, count }, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-gray-900 text-sm rounded-lg"
                  style={{ opacity: Math.max(0.4, Math.min(1, count / 10)) }}
                >
                  {word} <span className="text-gray-500 text-xs">({count})</span>
                </span>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-white">AI-Powered Suggestions</h3>
              <button
                onClick={handleAiSuggest}
                disabled={aiLoading}
                className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors"
              >
                {aiLoading ? "Generating..." : aiSuggestions ? "Regenerate" : "Generate AI Suggestions"}
              </button>
            </div>
            {aiSuggestions ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-400 bg-gray-900 p-3 rounded-lg">{aiSuggestions.reasoning}</p>
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.keywords.map((kw, i) => (
                    <span key={i} className="px-3 py-1 bg-orange-900/20 border border-orange-800/30 text-orange-300 text-sm rounded-lg">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ) : !aiLoading ? (
              <p className="text-gray-500 text-sm">
                Click &quot;Generate AI Suggestions&quot; to get keyword ideas powered by Claude, based on the competitor data above.
              </p>
            ) : (
              <p className="text-gray-500 text-sm">Analyzing competitor data and generating suggestions...</p>
            )}
          </section>

          <section>
            <h3 className="text-base font-semibold mb-3 text-white">Top Competitor Listings</h3>
            <div className="space-y-3">
              {result.competitors.slice(0, 10).map((comp) => (
                <div key={comp.listing_id} className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <a
                        href={comp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-white hover:text-orange-400 transition-colors line-clamp-2"
                      >
                        {comp.title}
                      </a>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>${comp.price.toFixed(2)}</span>
                        <span>{comp.views} views</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {comp.tags.slice(0, 8).map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded">{tag}</span>
                    ))}
                    {comp.tags.length > 8 && (
                      <span className="text-xs text-gray-600">+{comp.tags.length - 8}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// --- Logs Panel ---

function LogsPanel() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-400 text-xl">📋</span>
        </div>
        <h2 className="text-white font-semibold mb-2">Change Logs</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          Coming in Phase 2. When recommendations are applied, each change will be logged here with the old and new value, allowing you to track what was changed and revert if needed.
        </p>
      </div>
    </div>
  );
}

// --- Glossary Panel ---

const GLOSSARY_SECTIONS = [
  {
    title: "Overall SEO Score (0–100)",
    description: "A weighted sum of five sub-scores. Each sub-score is evaluated independently and scaled to its maximum point value. The total possible is 100 points.",
    table: {
      headers: ["Category", "Max Points", "What It Measures"],
      rows: [
        ["Title", "25", "Length, structure, keyword placement, readability"],
        ["Tags", "25", "Tag count, multi-word usage, diversity, uniqueness"],
        ["Description", "20", "Length, paragraph structure, keyword overlap, practical info"],
        ["Images", "15", "Image count, alt text presence, alt text quality"],
        ["Metadata", "15", "Category, materials, styles, processing, personalization, section"],
      ],
    },
    bands: [
      { color: "text-green-400", label: "70–100", desc: "Good — well-optimized, minor improvements possible" },
      { color: "text-yellow-400", label: "40–69", desc: "Needs work — several meaningful opportunities" },
      { color: "text-red-400", label: "0–39", desc: "Poor — significant improvements needed" },
    ],
  },
  {
    title: "Title Score (max 25 pts)",
    description: "Evaluates the listing title for length, structure, keyword density, and readability.",
    rules: [
      { points: "+10", condition: "Length is 80–140 characters (ideal range)" },
      { points: "+5", condition: "Length is 60–79 or 141–160 characters (acceptable range)" },
      { points: "−5", condition: "Length is under 40 characters (too short)" },
      { points: "+5", condition: "Word count is 8–20 words" },
      { points: "−3", condition: "Word count is under 5 words" },
      { points: "+3", condition: "3 or fewer commas (no keyword stuffing)" },
      { points: "+4", condition: "First word is not a filler (A, An, The, My)" },
      { points: "+3", condition: "Uses a separator character (|, –, ,, &)" },
    ],
  },
  {
    title: "Tags Score (max 25 pts)",
    description: "Evaluates the listing tags for completeness, diversity, and specificity.",
    rules: [
      { points: "+10", condition: "All 13 tag slots are used" },
      { points: "+7", condition: "10–12 tags used" },
      { points: "+4", condition: "6–9 tags used" },
      { points: "+8", condition: "More than 50% of tags are multi-word phrases" },
      { points: "+4", condition: "No duplicate tags" },
      { points: "+3", condition: "Average tag length is 4 or more characters" },
    ],
  },
  {
    title: "Description Score (max 20 pts)",
    description: "Evaluates the listing description for length, structure, keyword coverage, and shopper-relevant information.",
    rules: [
      { points: "+8", condition: "Description is 500 or more characters" },
      { points: "+4", condition: "Description is 200–499 characters" },
      { points: "+4", condition: "Description has 3 or more paragraph breaks (line breaks)" },
      { points: "+5", condition: "At least one keyword from the title appears in the description" },
      { points: "+3", condition: "Description mentions practical info: shipping, materials, sizing, or care instructions" },
    ],
  },
  {
    title: "Images Score (max 15 pts)",
    description: "Evaluates image quantity and alt text quality. Alt text improves Etsy SEO and accessibility.",
    rules: [
      { points: "+6", condition: "8–10 images uploaded (ideal)" },
      { points: "+4", condition: "5–7 images uploaded" },
      { points: "+2", condition: "1–4 images uploaded" },
      { points: "+5", condition: "All images have alt text" },
      { points: "+2", condition: "Some images have alt text" },
      { points: "+4", condition: "Average alt text length is 20 or more characters" },
      { points: "+2", condition: "Some alt text is present but below 20 characters average" },
    ],
  },
  {
    title: "Metadata Score (max 15 pts)",
    description: "Evaluates whether all optional but important listing fields are filled in. Etsy uses these for search categorization.",
    rules: [
      { points: "+3", condition: "Category (taxonomy_id) is set" },
      { points: "+3", condition: "At least one material is listed" },
      { points: "+3", condition: "At least one style is listed" },
      { points: "+3", condition: "Processing time (min and max days) is set" },
      { points: "+2", condition: "Personalization is enabled (is_personalizable = true)" },
      { points: "+1", condition: "Listing is assigned to a shop section" },
    ],
  },
  {
    title: "AI Recommendations — How They Work",
    description: "When you open the AI Recs tab on a listing, the app sends the full listing data (title, description, tags, images, SEO score, and competitor data from Etsy search) to Claude. Claude returns specific rewrites for the title, description, tags, and image alt texts — plus a short reasoning for each change and an overall optimization strategy.",
    notes: [
      "Recommendations are generated fresh each time (not cached).",
      "Title, description, and tags cannot be updated via the Etsy API v3 — these are manual copy-paste changes.",
      "Image alt text can be updated via the Etsy API in a future Phase 2 feature.",
      "Regenerating produces a new independent response — variation between runs is expected.",
    ],
  },
];

function GlossaryPanel() {
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
      <h2 className="text-xl font-bold text-white mb-2">Glossary & Scoring Rules</h2>
      <p className="text-sm text-gray-500 mb-8">
        All business rules used to calculate scores and generate recommendations. Updated to match the live scoring engine.
      </p>

      <div className="space-y-8">
        {GLOSSARY_SECTIONS.map((section) => (
          <div key={section.title} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-white">{section.title}</h3>
              <p className="text-xs text-gray-400 mt-1">{section.description}</p>
            </div>

            <div className="p-5 space-y-4">
              {"table" in section && section.table && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-800">
                      {section.table.headers.map((h) => (
                        <th key={h} className="text-left text-gray-500 uppercase tracking-wider pb-2 pr-4 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {section.table.rows.map(([cat, pts, desc]) => (
                      <tr key={cat}>
                        <td className="py-2 pr-4 text-white font-medium">{cat}</td>
                        <td className="py-2 pr-4 text-orange-400 font-mono">{pts}</td>
                        <td className="py-2 text-gray-400">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {"bands" in section && section.bands && (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Score Bands</p>
                  {section.bands.map((band) => (
                    <div key={band.label} className="flex items-center gap-3 text-xs">
                      <span className={`font-mono font-bold w-14 flex-shrink-0 ${band.color}`}>{band.label}</span>
                      <span className="text-gray-400">{band.desc}</span>
                    </div>
                  ))}
                </div>
              )}

              {"rules" in section && section.rules && (
                <div className="space-y-1.5">
                  {section.rules.map((rule, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs">
                      <span className={`font-mono font-bold w-8 flex-shrink-0 ${rule.points.startsWith("+") ? "text-green-400" : "text-red-400"}`}>
                        {rule.points}
                      </span>
                      <span className="text-gray-300">{rule.condition}</span>
                    </div>
                  ))}
                </div>
              )}

              {"notes" in section && section.notes && (
                <ul className="space-y-1.5">
                  {section.notes.map((note, i) => (
                    <li key={i} className="text-xs text-gray-400 flex gap-2">
                      <span className="text-gray-600 flex-shrink-0">—</span>
                      {note}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main Dashboard ---

export default function Dashboard() {
  const [topTab, setTopTab] = useState<TopTab>("listings");
  const [listings, setListings] = useState<Listing[]>([]);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [seoScores, setSeoScores] = useState<Record<number, SEOScore>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("priority");

  useEffect(() => {
    fetchListings();
  }, []);

  async function fetchListings() {
    try {
      const res = await fetch("/api/etsy/listings");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setListings(data.listings);
      fetchScores();
    } catch {
      setError("Failed to fetch listings");
    } finally {
      setLoading(false);
    }
  }

  async function fetchScores() {
    setScoresLoading(true);
    try {
      const res = await fetch("/api/etsy/scores");
      if (res.ok) {
        const data = await res.json();
        setScores(data.scores);
      }
    } catch {
      // Scores are optional
    } finally {
      setScoresLoading(false);
    }
  }

  async function selectListing(listing: Listing) {
    setSelectedId(listing.listing_id);
    if (!seoScores[listing.listing_id]) {
      try {
        const res = await fetch(`/api/etsy/score/${listing.listing_id}`);
        if (res.ok) {
          const data = await res.json();
          setSeoScores((prev) => ({ ...prev, [listing.listing_id]: data.score }));
        }
      } catch {
        // Not critical
      }
    }
  }

  function getSortedListings() {
    const sorted = [...listings];
    switch (sortMode) {
      case "priority":
        return sorted.sort((a, b) => (scores[a.listing_id] ?? 100) - (scores[b.listing_id] ?? 100));
      case "views":
        return sorted.sort((a, b) => b.views - a.views);
      case "title":
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return sorted;
    }
  }

  const selectedListing = listings.find((l) => l.listing_id === selectedId) ?? null;

  const topTabs: { key: TopTab; label: string }[] = [
    { key: "listings", label: "Listings" },
    { key: "keywords", label: "Keywords" },
    { key: "logs", label: "Logs" },
    { key: "glossary", label: "Glossary" },
  ];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <p className="text-gray-400 text-sm">Loading listings...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-6 px-5 py-0 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-3 py-3 pr-4 border-r border-gray-700">
          <h1 className="font-bold text-white text-sm">Etsy Optimizer</h1>
          <span className="text-xs text-gray-500">MyHomeByMax</span>
        </div>
        {/* Top-level tabs */}
        <nav className="flex h-full">
          {topTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTopTab(tab.key)}
              className={`px-4 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                topTab === tab.key
                  ? "text-white border-orange-500"
                  : "text-gray-400 border-transparent hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Body */}
      {topTab === "listings" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel — widened to 480px (50% wider than original 320px) */}
          <div className="w-[480px] flex-shrink-0 flex flex-col border-r border-gray-700 bg-gray-900">
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-700">
              <span className="text-xs text-gray-400 font-medium">{listings.length} listings</span>
              <div className="flex gap-1">
                {(["priority", "views", "title"] as SortMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSortMode(mode)}
                    className={`px-2 py-0.5 text-xs rounded transition-colors capitalize ${
                      sortMode === mode ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {error && <p className="p-4 text-red-400 text-sm">{error}</p>}
              {getSortedListings().map((listing) => {
                const score = scores[listing.listing_id];
                const isSelected = listing.listing_id === selectedId;
                return (
                  <button
                    key={listing.listing_id}
                    onClick={() => selectListing(listing)}
                    className={`w-full text-left flex gap-3 p-3 border-b border-gray-800 transition-colors ${
                      isSelected ? "bg-gray-800 border-l-2 border-l-orange-500" : "hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex-shrink-0 flex items-start pt-0.5">
                      {score !== undefined ? (
                        <div className={`w-9 h-9 rounded border text-xs font-bold flex items-center justify-center ${scoreBadge(score)}`}>
                          {score}
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded border border-gray-700 bg-gray-800 flex items-center justify-center">
                          <span className="text-gray-600 text-xs">{scoresLoading ? "…" : "—"}</span>
                        </div>
                      )}
                    </div>
                    {listing.images?.[0] && (
                      <img src={listing.images[0].url_170x135} alt="" className="w-12 h-12 object-cover rounded flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-100 leading-snug line-clamp-2">{listing.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatPrice(listing.price)} · {listing.views} views</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex-1 overflow-hidden bg-gray-950">
            {selectedListing ? (
              <DetailPanel listing={selectedListing} seoScore={seoScores[selectedListing.listing_id] ?? null} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-600 text-sm">Select a listing to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {topTab === "keywords" && (
        <div className="flex flex-1 overflow-hidden bg-gray-950">
          <KeywordsPanel />
        </div>
      )}

      {topTab === "logs" && (
        <div className="flex flex-1 overflow-hidden bg-gray-950">
          <LogsPanel />
        </div>
      )}

      {topTab === "glossary" && (
        <div className="flex flex-1 overflow-hidden bg-gray-950">
          <GlossaryPanel />
        </div>
      )}
    </div>
  );
}
