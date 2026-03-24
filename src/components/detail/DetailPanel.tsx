"use client";

import { useState, useEffect } from "react";
import type {
  Listing, SEOScore, AIRecommendations,
  BenchmarkResult, AttributesResult, AttributeGap,
  ChecklistState, ChecklistField, Keywords, DetailTab,
} from "@/types";
import { formatPrice } from "@/lib/utils";
import { DetailsTab } from "./tabs/DetailsTab";
import { ImagesTab } from "./tabs/ImagesTab";
import { SEOTab } from "./tabs/SEOTab";
import { RecsTab } from "./tabs/RecsTab";
import { BenchmarksTab } from "./tabs/BenchmarksTab";

interface DetailPanelProps {
  listing: Listing;
  seoScore: SEOScore | null;
}

const TABS: { key: DetailTab; label: string }[] = [
  { key: "details", label: "Details" },
  { key: "images", label: "Images" },
  { key: "seo", label: "SEO Score" },
  { key: "recommendations", label: "AI Recs" },
  { key: "benchmarks", label: "Benchmarks" },
];

export function DetailPanel({ listing, seoScore }: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const [recommendations, setRecommendations] = useState<AIRecommendations | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState("");
  const [recsGeneratedAt, setRecsGeneratedAt] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<Keywords>({ primary: "", secondary: ["", ""] });
  const [keywordsSaved, setKeywordsSaved] = useState(false);
  const [keywordsLoaded, setKeywordsLoaded] = useState(false);
  const [unitsSold, setUnitsSold] = useState<number | "not_connected" | null>(null);
  const [altTextStatus, setAltTextStatus] = useState<Record<number, "pushing" | "done" | "error">>({});
  const [altTextErrors, setAltTextErrors] = useState<Record<number, string>>({});
  const [fieldStatus, setFieldStatus] = useState<Record<string, "pushing" | "done" | "error">>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [benchmarks, setBenchmarks] = useState<BenchmarkResult | null>(null);
  const [benchmarksLoading, setBenchmarksLoading] = useState(false);
  const [benchmarksError, setBenchmarksError] = useState("");
  const [attributes, setAttributes] = useState<AttributesResult | null>(null);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [attributesError, setAttributesError] = useState("");
  const [attrStatus, setAttrStatus] = useState<Record<number, "applying" | "done" | "error">>({});
  const [attrErrors, setAttrErrors] = useState<Record<number, string>>({});
  const [checklist, setChecklist] = useState<ChecklistState | null>(null);

  useEffect(() => {
    setActiveTab("details");
    setRecommendations(null);
    setRecsLoading(false);
    setRecsError("");
    setRecsGeneratedAt(null);
    setKeywords({ primary: "", secondary: ["", ""] });
    setKeywordsSaved(false);
    setKeywordsLoaded(false);
    setUnitsSold(null);
    setAltTextStatus({});
    setAltTextErrors({});
    setFieldStatus({});
    setFieldErrors({});
    setBenchmarks(null);
    setBenchmarksLoading(false);
    setBenchmarksError("");
    setAttributes(null);
    setAttributesLoading(false);
    setAttributesError("");
    setAttrStatus({});
    setAttrErrors({});
    setChecklist(null);
    fetch(`/api/listing-keywords/${listing.listing_id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setKeywords(data); })
      .catch(() => {})
      .finally(() => setKeywordsLoaded(true));
    fetch(`/api/etsy/transactions/${listing.listing_id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error === "not_connected") setUnitsSold("not_connected");
        else if (typeof data.units_sold === "number") setUnitsSold(data.units_sold);
      })
      .catch(() => {});
    fetch(`/api/checklist/${listing.listing_id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setChecklist(data); })
      .catch(() => {});
    fetch(`/api/etsy/listings/${listing.listing_id}/benchmarks`)
      .then((r) => r.json())
      .then((data) => { if (data && !data.error) setBenchmarks(data); })
      .catch(() => {});
  }, [listing.listing_id]);

  function saveKeywords(updated: Keywords) {
    fetch(`/api/listing-keywords/${listing.listing_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    })
      .then(() => {
        setKeywordsSaved(true);
        setTimeout(() => setKeywordsSaved(false), 2000);
      })
      .catch(() => {});
  }

  function markChecklist(field: ChecklistField, done: boolean) {
    const pushed_at = done ? new Date().toISOString() : undefined;
    setChecklist((prev) => {
      const base = prev ?? ({} as ChecklistState);
      return { ...base, [field]: { done, ...(pushed_at ? { pushed_at } : {}) } };
    });
    fetch(`/api/checklist/${listing.listing_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, done }),
    }).catch(() => {});
  }

  async function fetchRecommendations(forceRegenerate = false) {
    if (!forceRegenerate) {
      try {
        const cacheRes = await fetch(`/api/etsy/recommendations/cache/${listing.listing_id}`);
        const cacheData = await cacheRes.json();
        if (cacheData.recommendations) {
          setRecommendations(cacheData.recommendations);
          setRecsGeneratedAt(cacheData.generatedAt);
          return;
        }
      } catch {
        // Cache miss — fall through to Claude
      }
    }
    setRecsLoading(true);
    setRecsError("");
    try {
      const res = await fetch(`/api/etsy/recommendations/${listing.listing_id}`);
      if (!res.ok) {
        const data = await res.json();
        if (data.error === "no_keywords") { setRecsError("no_keywords"); return; }
        if (data.error === "benchmark_required") { setRecsError("Run benchmarks first (Benchmarks tab) before generating recommendations."); return; }
        throw new Error(data.error || "Failed to fetch");
      }
      const data = await res.json();
      setRecommendations(data.recommendations);
      await fetch(`/api/etsy/recommendations/cache/${listing.listing_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendations: data.recommendations }),
      });
      setRecsGeneratedAt(new Date().toISOString());
    } catch (err) {
      setRecsError(err instanceof Error ? err.message : "Failed to generate recommendations");
    } finally {
      setRecsLoading(false);
    }
  }

  async function pushAltText(imageId: number, altText: string, oldAltText: string, imageIndex: number) {
    setAltTextStatus((prev) => ({ ...prev, [imageId]: "pushing" }));
    setAltTextErrors((prev) => { const next = { ...prev }; delete next[imageId]; return next; });
    try {
      const res = await fetch(`/api/etsy/listings/${listing.listing_id}/images/${imageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt_text: altText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error === "not_connected"
          ? "Not connected to Etsy — re-authorize at /api/etsy/connect"
          : (data.error || `Server error (${res.status})`);
        throw new Error(msg);
      }
      setAltTextStatus((prev) => ({ ...prev, [imageId]: "done" }));
      markChecklist("alt_text", true);
      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listing.listing_id,
          listing_title: listing.title,
          field: "alt_text",
          image_index: imageIndex,
          image_id: imageId,
          old_value: oldAltText,
          new_value: altText,
        }),
      }).catch(() => {});
    } catch (err) {
      setAltTextStatus((prev) => ({ ...prev, [imageId]: "error" }));
      setAltTextErrors((prev) => ({ ...prev, [imageId]: err instanceof Error ? err.message : "Unknown error" }));
    }
  }

  async function pushField(field: "title" | "tags" | "description", newValue: string | string[], oldValue: string | string[]) {
    setFieldStatus((prev) => ({ ...prev, [field]: "pushing" }));
    setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    try {
      const res = await fetch(`/api/etsy/listings/${listing.listing_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value: newValue }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }
      setFieldStatus((prev) => ({ ...prev, [field]: "done" }));
      markChecklist(field, true);
      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listing.listing_id,
          listing_title: listing.title,
          field,
          old_value: Array.isArray(oldValue) ? oldValue.join(", ") : oldValue,
          new_value: Array.isArray(newValue) ? newValue.join(", ") : newValue,
        }),
      }).catch(() => {});
    } catch (err) {
      setFieldStatus((prev) => ({ ...prev, [field]: "error" }));
      setFieldErrors((prev) => ({ ...prev, [field]: err instanceof Error ? err.message : "Unknown error" }));
    }
  }

  async function fetchBenchmarks(forceRefresh = false) {
    setBenchmarksLoading(true);
    setBenchmarksError("");
    try {
      const url = `/api/etsy/listings/${listing.listing_id}/benchmarks${forceRefresh ? "?refresh=1" : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setBenchmarksError(data.error === "no_keywords" ? "no_keywords" : (data.error || "Failed to load benchmarks"));
        return;
      }
      setBenchmarks(data);
    } catch {
      setBenchmarksError("Failed to load benchmarks");
    } finally {
      setBenchmarksLoading(false);
    }
  }

  async function fetchAttributes() {
    setAttributesLoading(true);
    setAttributesError("");
    const params = new URLSearchParams({
      taxonomy_id: String(listing.taxonomy_id),
      title: listing.title,
      tags: listing.tags.join(" "),
      materials: listing.materials.join(" "),
    });
    try {
      const res = await fetch(`/api/etsy/listings/${listing.listing_id}/attributes?${params}`);
      const data = await res.json();
      if (!res.ok) { setAttributesError(data.error || "Failed to load attributes"); return; }
      setAttributes(data);
    } catch {
      setAttributesError("Failed to load attributes");
    } finally {
      setAttributesLoading(false);
    }
  }

  async function applyAttribute(gap: AttributeGap, valueId: number, valueName: string) {
    setAttrStatus((prev) => ({ ...prev, [gap.property_id]: "applying" }));
    setAttrErrors((prev) => { const next = { ...prev }; delete next[gap.property_id]; return next; });
    try {
      const res = await fetch(
        `/api/etsy/listings/${listing.listing_id}/attributes/${gap.property_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value_ids: [valueId], values: [valueName], property_name: gap.name }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Apply failed");
      setAttrStatus((prev) => ({ ...prev, [gap.property_id]: "done" }));
      markChecklist("attributes", true);
      await fetchAttributes();
    } catch (err) {
      setAttrStatus((prev) => ({ ...prev, [gap.property_id]: "error" }));
      setAttrErrors((prev) => ({ ...prev, [gap.property_id]: err instanceof Error ? err.message : "Unknown error" }));
    }
  }

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
            <h2 className="font-semibold text-white text-sm leading-snug mb-1">{listing.title}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400">
              <span className="text-white font-medium">{formatPrice(listing.price)}</span>
              <span>{listing.views} views (lifetime)</span>
              <span>Qty: {listing.quantity}</span>
              {unitsSold === "not_connected" ? (
                <a href="/api/etsy/connect" className="text-orange-400 hover:text-orange-300 text-xs">Connect Etsy for sales data →</a>
              ) : unitsSold !== null ? (
                <span>{unitsSold} sold</span>
              ) : null}
            </div>
            <a href={listing.url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-orange-400 hover:text-orange-300 mt-1 inline-block">
              View on Etsy →
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-gray-700 bg-gray-900">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={async () => {
              setActiveTab(tab.key);
              if (tab.key === "recommendations" && !recommendations && !recsLoading) {
                if (!benchmarks) {
                  await fetchBenchmarks();
                }
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
          <DetailsTab
            listing={listing}
            unitsSold={unitsSold}
            keywords={keywords}
            keywordsSaved={keywordsSaved}
            onKeywordsChange={setKeywords}
            onSaveKeywords={saveKeywords}
          />
        )}
        {activeTab === "images" && <ImagesTab listing={listing} />}
        {activeTab === "seo" && <SEOTab seoScore={seoScore} />}
        {activeTab === "recommendations" && (
          <RecsTab
            listing={listing}
            recommendations={recommendations}
            recsLoading={recsLoading}
            recsError={recsError}
            recsGeneratedAt={recsGeneratedAt}
            benchmarks={benchmarks}
            benchmarksLoading={benchmarksLoading}
            altTextStatus={altTextStatus}
            altTextErrors={altTextErrors}
            fieldStatus={fieldStatus}
            fieldErrors={fieldErrors}
            attributes={attributes}
            attributesLoading={attributesLoading}
            attributesError={attributesError}
            attrStatus={attrStatus}
            attrErrors={attrErrors}
            checklist={checklist}
            onFetchRecommendations={fetchRecommendations}
            onPushAltText={pushAltText}
            onPushField={pushField}
            onFetchAttributes={fetchAttributes}
            onApplyAttribute={applyAttribute}
            onMarkChecklist={markChecklist}
          />
        )}
        {activeTab === "benchmarks" && (
          <BenchmarksTab
            keywords={keywords}
            keywordsLoaded={keywordsLoaded}
            benchmarks={benchmarks}
            benchmarksLoading={benchmarksLoading}
            benchmarksError={benchmarksError}
            onFetchBenchmarks={fetchBenchmarks}
          />
        )}
      </div>
    </div>
  );
}
