"use client";

import type { Listing, Keywords } from "@/types";
import { formatDate } from "@/lib/utils";

interface DetailsTabProps {
  listing: Listing;
  unitsSold: number | "not_connected" | null;
  keywords: Keywords;
  keywordsSaved: boolean;
  onKeywordsChange: (updated: Keywords) => void;
  onSaveKeywords: (updated: Keywords) => void;
}

export function DetailsTab({
  listing,
  unitsSold,
  keywords,
  keywordsSaved,
  onKeywordsChange,
  onSaveKeywords,
}: DetailsTabProps) {
  const views = listing.views ?? 0;
  const favorers = listing.num_favorers ?? 0;
  const sold = typeof unitsSold === "number" ? unitsSold : null;

  function renderPerformance() {
    if (views === 0) {
      return (
        <section className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Performance</h3>
          <p className="text-sm text-gray-500">No views yet — listing too new to diagnose.</p>
        </section>
      );
    }

    const favRatio = (favorers / views) * 100;
    const convProxy = sold !== null ? (sold / views) * 100 : null;

    const favColor = favRatio >= 2 ? "text-green-400" : favRatio >= 1 ? "text-yellow-400" : "text-red-400";
    const favBg = favRatio >= 2 ? "bg-green-900/30 border-green-800/50" : favRatio >= 1 ? "bg-yellow-900/30 border-yellow-800/50" : "bg-red-900/30 border-red-800/50";
    const convColor = convProxy === null ? "text-gray-400" : convProxy >= 1 ? "text-green-400" : convProxy >= 0.5 ? "text-yellow-400" : "text-red-400";
    const convBg = convProxy === null ? "bg-gray-800 border-gray-700" : convProxy >= 1 ? "bg-green-900/30 border-green-800/50" : convProxy >= 0.5 ? "bg-yellow-900/30 border-yellow-800/50" : "bg-red-900/30 border-red-800/50";

    let diagnosis = "";
    let diagColor = "text-gray-400";
    if (views < 100) {
      diagnosis = "Too few views — this is a keyword problem. Focus on title and tags.";
      diagColor = "text-yellow-400";
    } else if (convProxy !== null && convProxy < 1 && favRatio < 2) {
      diagnosis = "Views are there but buyers aren't engaging. Check price and photos.";
      diagColor = "text-red-400";
    } else if (convProxy !== null && convProxy < 1 && favRatio >= 2) {
      diagnosis = "Buyers are saving but not purchasing. Price may be the barrier.";
      diagColor = "text-yellow-400";
    } else if (convProxy !== null && convProxy >= 1 && favRatio >= 2) {
      diagnosis = "Listing is performing well.";
      diagColor = "text-green-400";
    } else if (convProxy === null && favRatio < 2) {
      diagnosis = "Connect Etsy to see conversion rate. Low save rate — check thumbnail and price.";
      diagColor = "text-yellow-400";
    }

    return (
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Performance</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className={`border rounded-lg p-3 ${convBg}`}>
            <p className="text-xs text-gray-500 mb-1">Conversion Rate</p>
            <p className={`text-2xl font-bold ${convColor}`}>
              {convProxy === null
                ? unitsSold === "not_connected" ? "—" : "…"
                : `${convProxy.toFixed(2)}%`}
            </p>
            <p className="text-xs text-gray-600 mt-1">purchases / views · flag &lt;1%</p>
          </div>
          <div className={`border rounded-lg p-3 ${favBg}`}>
            <p className="text-xs text-gray-500 mb-1">Save Rate</p>
            <p className={`text-2xl font-bold ${favColor}`}>{favRatio.toFixed(2)}%</p>
            <p className="text-xs text-gray-600 mt-1">favorites / views · flag &lt;2%</p>
          </div>
        </div>
        {diagnosis && <p className={`text-xs ${diagColor}`}>{diagnosis}</p>}
        {unitsSold === "not_connected" && (
          <p className="text-xs text-gray-600 mt-1">
            <a href="/api/etsy/connect" className="text-orange-400 hover:text-orange-300">Connect Etsy →</a> to see conversion rate
          </p>
        )}
      </section>
    );
  }

  return (
    <>
      {renderPerformance()}

      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
        <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed bg-gray-800 border border-gray-700 p-3 rounded-lg h-80 overflow-y-auto resize-y">
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

      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Target Keywords</h3>
        <p className="text-xs text-gray-500 mb-3">Used to run keyword research before generating AI recommendations. Enter the keywords you are optimizing this listing for.</p>
        <div className="space-y-2">
          {([
            { label: "Primary", key: "primary" as const, placeholder: "e.g. bookend" },
            { label: "Secondary 1", key: 0 as const, placeholder: "e.g. book holder" },
            { label: "Secondary 2", key: 1 as const, placeholder: "e.g. shelf decor" },
          ] as const).map(({ label, key, placeholder }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-20 flex-shrink-0">{label}</span>
              <input
                type="text"
                value={key === "primary" ? keywords.primary : keywords.secondary[key]}
                onChange={(e) => {
                  const updated: Keywords = key === "primary"
                    ? { ...keywords, primary: e.target.value }
                    : { ...keywords, secondary: keywords.secondary.map((s, i) => i === key ? e.target.value : s) as [string, string] };
                  onKeywordsChange(updated);
                }}
                onBlur={() => onSaveKeywords(keywords)}
                placeholder={placeholder}
                className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>
          ))}
        </div>
        {keywordsSaved && <p className="text-xs text-green-500 mt-2">Saved</p>}
      </section>
    </>
  );
}
