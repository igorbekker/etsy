"use client";

import { useState, useEffect } from "react";
import type { Listing, SEOScore, SortMode, TopTab } from "@/types";
import { formatPrice, scoreBadge } from "@/lib/utils";
import { DetailPanel } from "@/components/detail/DetailPanel";
import { KeywordsPanel } from "@/components/KeywordsPanel";
import { LogsPanel } from "@/components/LogsPanel";
import { GlossaryPanel } from "@/components/GlossaryPanel";

const TOP_TABS: { key: TopTab; label: string }[] = [
  { key: "listings", label: "Listings" },
  { key: "keywords", label: "Keywords" },
  { key: "logs", label: "Logs" },
  { key: "glossary", label: "Glossary" },
];

export default function Dashboard() {
  const [topTab, setTopTab] = useState<TopTab>("listings");
  const [listings, setListings] = useState<Listing[]>([]);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [seoScores, setSeoScores] = useState<Record<number, SEOScore>>({});
  const [enrichedListings, setEnrichedListings] = useState<Record<number, Listing>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const [prefetchingId, setPrefetchingId] = useState<number | null>(null);
  const [prefetchedIds, setPrefetchedIds] = useState<Set<number>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => { fetchListings(); }, []);

  async function fetchListings() {
    try {
      const res = await fetch("/api/etsy/listings");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setListings(data.listings);
      fetchScores();
      checkAllCaches(data.listings.map((l: Listing) => l.listing_id));
    } catch {
      setError("Failed to fetch listings");
    } finally {
      setLoading(false);
    }
  }

  async function checkAllCaches(listingIds: number[]) {
    for (const id of listingIds) {
      try {
        const res = await fetch(`/api/etsy/recommendations/cache/${id}`);
        const data = await res.json();
        if (data.recommendations) setPrefetchedIds((prev) => new Set([...prev, id]));
      } catch {}
    }
  }

  async function syncAllRecs() {
    if (isSyncing) return;
    const missing = listings.filter((l) => !prefetchedIds.has(l.listing_id));
    if (missing.length === 0) return;
    setIsSyncing(true);
    setSyncProgress({ done: 0, total: missing.length });
    for (const l of missing) {
      setPrefetchingId(l.listing_id);
      try {
        const res = await fetch(`/api/etsy/recommendations/${l.listing_id}`);
        if (res.ok) {
          const data = await res.json();
          await fetch(`/api/etsy/recommendations/cache/${l.listing_id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recommendations: data.recommendations, competitorInsights: data.competitorInsights }),
          });
          setPrefetchedIds((prev) => new Set([...prev, l.listing_id]));
        }
      } catch {}
      setPrefetchingId(null);
      setSyncProgress((prev) => prev ? { ...prev, done: prev.done + 1 } : null);
    }
    setIsSyncing(false);
    setSyncProgress(null);
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
    if (!enrichedListings[listing.listing_id]) {
      fetch(`/api/etsy/listings/${listing.listing_id}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.listing) setEnrichedListings((prev) => ({ ...prev, [listing.listing_id]: data.listing }));
        })
        .catch(() => {});
    }
    if (!seoScores[listing.listing_id]) {
      try {
        const res = await fetch(`/api/etsy/score/${listing.listing_id}`);
        if (res.ok) {
          const data = await res.json();
          setSeoScores((prev) => ({ ...prev, [listing.listing_id]: data.score }));
        }
      } catch {}
    }
  }

  function getSortedListings() {
    const sorted = [...listings];
    switch (sortMode) {
      case "priority": return sorted.sort((a, b) => (scores[a.listing_id] ?? 100) - (scores[b.listing_id] ?? 100));
      case "views": return sorted.sort((a, b) => b.views - a.views);
      case "title": return sorted.sort((a, b) => a.title.localeCompare(b.title));
      default: return sorted;
    }
  }

  const baseListing = listings.find((l) => l.listing_id === selectedId) ?? null;
  const selectedListing = (selectedId && enrichedListings[selectedId]) ? enrichedListings[selectedId] : baseListing;

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
        <nav className="flex h-full">
          {TOP_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setTopTab(tab.key)}
              className={`px-4 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                topTab === tab.key ? "text-white border-orange-500" : "text-gray-400 border-transparent hover:text-gray-200"
              }`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Body */}
      {topTab === "listings" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel */}
          <div className="w-[480px] flex-shrink-0 flex flex-col border-r border-gray-700 bg-gray-900">
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-700">
              <span className="text-xs text-gray-400 font-medium">{listings.length} listings</span>
              <div className="flex items-center gap-2">
                {(() => {
                  const missing = listings.filter((l) => !prefetchedIds.has(l.listing_id)).length;
                  const allReady = missing === 0 && listings.length > 0;
                  return (
                    <button onClick={syncAllRecs} disabled={isSyncing || allReady}
                      className={`px-2 py-0.5 text-xs rounded transition-colors ${
                        allReady ? "bg-green-900 text-green-400 cursor-default" :
                        isSyncing ? "bg-gray-700 text-gray-400 cursor-not-allowed" :
                        "bg-orange-700 hover:bg-orange-600 text-white"
                      }`}>
                      {allReady ? "AI Ready" :
                       isSyncing && syncProgress ? `Syncing ${syncProgress.done}/${syncProgress.total}...` :
                       `Sync AI (${missing})`}
                    </button>
                  );
                })()}
                <div className="flex gap-1">
                  {(["priority", "views", "title"] as SortMode[]).map((mode) => (
                    <button key={mode} onClick={() => setSortMode(mode)}
                      className={`px-2 py-0.5 text-xs rounded transition-colors capitalize ${
                        sortMode === mode ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"
                      }`}>
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {error && <p className="p-4 text-red-400 text-sm">{error}</p>}
              {getSortedListings().map((listing) => {
                const score = scores[listing.listing_id];
                const isSelected = listing.listing_id === selectedId;
                const isCached = prefetchedIds.has(listing.listing_id);
                const isPrefetching = prefetchingId === listing.listing_id;
                return (
                  <button key={listing.listing_id} onClick={() => selectListing(listing)}
                    className={`w-full text-left flex gap-3 p-3 border-b border-gray-800 transition-colors ${
                      isSelected ? "bg-gray-800 border-l-2 border-l-orange-500" : "hover:bg-gray-800/50"
                    }`}>
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
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500">{formatPrice(listing.price)} · {listing.views} views (lifetime)</p>
                        {isCached && (
                          <span className="flex items-center gap-1 text-xs text-green-500 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                            AI ready
                          </span>
                        )}
                        {isPrefetching && (
                          <span className="flex items-center gap-1 text-xs text-orange-400 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block animate-pulse" />
                            Analyzing...
                          </span>
                        )}
                      </div>
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
