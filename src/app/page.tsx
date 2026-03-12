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

type SortMode = "priority" | "views" | "title";
type DetailTab = "details" | "images" | "seo" | "recommendations";

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

// --- Main Dashboard ---

export default function Dashboard() {
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
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-white">Etsy Optimizer</h1>
          <span className="text-xs text-gray-500">MyHomeByMax</span>
        </div>
        <a
          href="/keywords"
          className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors border border-gray-700"
        >
          Keyword Research
        </a>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-80 flex-shrink-0 flex flex-col border-r border-gray-700 bg-gray-900">
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
    </div>
  );
}
