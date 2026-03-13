"use client";

import type { Keywords, BenchmarkResult } from "@/types";

interface BenchmarksTabProps {
  keywords: Keywords;
  benchmarks: BenchmarkResult | null;
  benchmarksLoading: boolean;
  benchmarksError: string;
  onFetchBenchmarks: (forceRefresh?: boolean) => void;
}

export function BenchmarksTab({
  keywords,
  benchmarks,
  benchmarksLoading,
  benchmarksError,
  onFetchBenchmarks,
}: BenchmarksTabProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Competitor Benchmarks</p>
          {benchmarks && (
            <p className="text-xs text-gray-500 mt-0.5">
              {benchmarks.competitor_count} competitors · keywords: {benchmarks.keywords_used.join(", ")} ·{" "}
              {benchmarks.from_cache
                ? `cached ${new Date(benchmarks.computed_at).toLocaleString()}`
                : `updated just now`}
            </p>
          )}
        </div>
        <button
          onClick={() => onFetchBenchmarks(!!benchmarks)}
          disabled={benchmarksLoading}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            benchmarksLoading ? "bg-gray-700 text-gray-400 cursor-not-allowed" : "bg-orange-700 hover:bg-orange-600 text-white"
          }`}
        >
          {benchmarksLoading ? "Loading..." : benchmarks ? "Refresh" : "Run Benchmark"}
        </button>
      </div>

      {/* Keyword change warning */}
      {benchmarks && JSON.stringify(benchmarks.keywords_used) !== JSON.stringify(
        [keywords.primary, ...keywords.secondary].map((k) => k.trim()).filter(Boolean)
      ) && (
        <div className="bg-yellow-900/30 border border-yellow-800/50 rounded-lg p-3">
          <p className="text-xs text-yellow-400">Keywords have changed since last benchmark — results may be stale. Hit Refresh to update.</p>
        </div>
      )}

      {/* No keywords prompt */}
      {benchmarksError === "no_keywords" && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-400 mb-1">No target keywords set for this listing.</p>
          <p className="text-xs text-gray-500">Add keywords in the Details tab, then run the benchmark.</p>
        </div>
      )}

      {/* Generic error */}
      {benchmarksError && benchmarksError !== "no_keywords" && (
        <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3">
          <p className="text-xs text-red-400">{benchmarksError}</p>
        </div>
      )}

      {/* Empty state */}
      {!benchmarks && !benchmarksLoading && !benchmarksError && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-400 mb-1">No benchmark data yet.</p>
          <p className="text-xs text-gray-500">Click Run Benchmark to compare this listing against top competitors for your target keywords.</p>
        </div>
      )}

      {/* Results */}
      {benchmarks && (
        <>
          {/* Price Position */}
          {(() => {
            const { your_price, min, p25, median, p75, max, position, flag } = benchmarks.metrics.price;
            const posLabel = position === "bottom-25" ? "Bottom 25%" : position === "top-25" ? "Top 25%" : "Mid-range (25–75%)";
            const posColor = position === "mid-range" ? "text-green-400" : "text-yellow-400";
            return (
              <section className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Price Position</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-bold text-white">${your_price.toFixed(2)}</span>
                  <span className={`text-sm font-medium ${posColor}`}>{posLabel}</span>
                </div>
                <div className="grid grid-cols-5 gap-1 text-center mb-2">
                  {[["Min", min], ["25th", p25], ["Median", median], ["75th", p75], ["Max", max]].map(([label, val]) => (
                    <div key={label as string} className="bg-gray-700/50 rounded p-1.5">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-xs text-gray-300">${(val as number).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                {flag && <p className="text-xs text-yellow-400 mt-1">{flag}</p>}
              </section>
            );
          })()}

          {/* Demand Gap */}
          {(() => {
            const { your_favorers, comp_avg, your_pct_of_avg, flag } = benchmarks.metrics.demand;
            const color = flag === "green" ? "text-green-400" : flag === "yellow" ? "text-yellow-400" : "text-red-400";
            const bg = flag === "green" ? "bg-green-900/30 border-green-800/50" : flag === "yellow" ? "bg-yellow-900/30 border-yellow-800/50" : "bg-red-900/30 border-red-800/50";
            return (
              <section className={`border rounded-xl p-4 ${bg}`}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Demand Gap (Favorites)</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">{your_favorers}</p>
                    <p className="text-xs text-gray-500">Your favorites</p>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${color}`}>{your_pct_of_avg}%</p>
                    <p className="text-xs text-gray-500">of competitor avg</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-300">{comp_avg}</p>
                    <p className="text-xs text-gray-500">Competitor avg</p>
                  </div>
                </div>
                {flag === "red" && <p className="text-xs text-red-400 mt-2">Significant demand gap — this listing needs optimization to build social proof.</p>}
                {flag === "yellow" && <p className="text-xs text-yellow-400 mt-2">Below competitor demand level — room to grow with better keywords and photos.</p>}
              </section>
            );
          })()}

          {/* Tag Coverage */}
          {(() => {
            const { your_coverage, total_consensus, missing_tags, flag } = benchmarks.metrics.tags;
            const color = flag === "green" ? "text-green-400" : flag === "yellow" ? "text-yellow-400" : "text-red-400";
            const bg = flag === "green" ? "bg-green-900/30 border-green-800/50" : flag === "yellow" ? "bg-yellow-900/30 border-yellow-800/50" : "bg-red-900/30 border-red-800/50";
            return (
              <section className={`border rounded-xl p-4 ${bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tag Coverage</p>
                  <p className={`text-sm font-bold ${color}`}>{your_coverage}/{total_consensus} consensus tags</p>
                </div>
                {missing_tags.length > 0 && (
                  <>
                    <p className="text-xs text-gray-500 mb-2">Missing from your tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {missing_tags.slice(0, 15).map(({ tag, count }) => (
                        <span key={tag} className="px-2 py-0.5 bg-orange-900/40 border border-orange-800/50 text-orange-300 text-xs rounded">
                          {tag} <span className="text-orange-500">×{count}</span>
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {flag === "red" && <p className="text-xs text-red-400 mt-2">Low tag coverage — most of the keywords your competitors rank for are absent from your tags.</p>}
              </section>
            );
          })()}

          {/* Photo Count */}
          {(() => {
            const { your_count, comp_avg, flag } = benchmarks.metrics.photos;
            const color = flag === "green" ? "text-green-400" : flag === "yellow" ? "text-yellow-400" : "text-red-400";
            const bg = flag === "green" ? "bg-green-900/30 border-green-800/50" : flag === "yellow" ? "bg-yellow-900/30 border-yellow-800/50" : "bg-red-900/30 border-red-800/50";
            return (
              <section className={`border rounded-xl p-4 ${bg}`}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Photo Count</p>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className={`text-2xl font-bold ${color}`}>{your_count}</p>
                    <p className="text-xs text-gray-500">Your photos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-300">{comp_avg}</p>
                    <p className="text-xs text-gray-500">Competitor avg</p>
                  </div>
                </div>
                {flag === "red" && <p className="text-xs text-red-400 mt-2">Under 5 photos — Etsy recommends at least 5. This affects conversion.</p>}
                {flag === "yellow" && <p className="text-xs text-yellow-400 mt-2">Below competitor average — adding more photos may improve conversion.</p>}
              </section>
            );
          })()}
        </>
      )}
    </div>
  );
}
