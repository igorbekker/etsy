"use client";

import type { Keywords, BenchmarkResult } from "@/types";

interface BenchmarksTabProps {
  keywords: Keywords;
  benchmarks: BenchmarkResult | null;
  benchmarksLoading: boolean;
  benchmarksError: string;
  onFetchBenchmarks: (forceRefresh?: boolean) => void;
}

const FLAG_BG = { red: "bg-red-900/30 border-red-800/50", yellow: "bg-yellow-900/30 border-yellow-800/50", green: "bg-green-900/30 border-green-800/50" };
const FLAG_TEXT = { red: "text-red-400", yellow: "text-yellow-400", green: "text-green-400" };

export function BenchmarksTab({ keywords, benchmarks, benchmarksLoading, benchmarksError, onFetchBenchmarks }: BenchmarksTabProps) {
  const b = benchmarks;
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Competitor Benchmarks</p>
          {b && <p className="text-xs text-gray-500 mt-0.5">{b.competitor_count} competitors · {b.keywords_used.join(", ")} · {b.from_cache ? `cached ${new Date(b.computed_at).toLocaleString()}` : "updated just now"}</p>}
        </div>
        <button onClick={() => onFetchBenchmarks(!!b)} disabled={benchmarksLoading}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${benchmarksLoading ? "bg-gray-700 text-gray-400 cursor-not-allowed" : "bg-orange-700 hover:bg-orange-600 text-white"}`}>
          {benchmarksLoading ? "Loading..." : b ? "Refresh" : "Run Benchmark"}
        </button>
      </div>

      {/* Keyword stale warning */}
      {b && JSON.stringify(b.keywords_used) !== JSON.stringify([keywords.primary, ...keywords.secondary].map(k => k.trim()).filter(Boolean)) && (
        <div className="bg-yellow-900/30 border border-yellow-800/50 rounded-lg p-3">
          <p className="text-xs text-yellow-400">Keywords changed since last benchmark — hit Refresh to update.</p>
        </div>
      )}

      {benchmarksError === "no_keywords" && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-400 mb-1">No target keywords set.</p>
          <p className="text-xs text-gray-500">Add keywords in the Details tab, then run the benchmark.</p>
        </div>
      )}
      {benchmarksError && benchmarksError !== "no_keywords" && (
        <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3">
          <p className="text-xs text-red-400">{benchmarksError}</p>
        </div>
      )}
      {!b && !benchmarksLoading && !benchmarksError && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-400 mb-1">No benchmark data yet.</p>
          <p className="text-xs text-gray-500">Click Run Benchmark to compare against top competitors for your target keywords.</p>
        </div>
      )}

      {b && (
        <>
          {/* ── SECTION: SEARCH RANKING SIGNALS ── */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Search Ranking Signals</p>

          {/* Tag Coverage */}
          {(() => {
            const { your_coverage, total_consensus, missing_tags, primary_targets, secondary_targets, wasted_tag_slots, flag } = b.metrics.tags;
            return (
              <section className={`border rounded-xl p-4 ${FLAG_BG[flag]}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tag Coverage</p>
                  <p className={`text-sm font-bold ${FLAG_TEXT[flag]}`}>{your_coverage}/{total_consensus} consensus tags</p>
                </div>
                {primary_targets.length > 0 && (
                  <div className="mb-2"><p className="text-xs text-gray-500 mb-1">Primary targets (≥30% of competitors) missing from your tags:</p>
                    <div className="flex flex-wrap gap-1">{primary_targets.filter(t => missing_tags.some(m => m.tag === t.tag)).map(({ tag, count }) => (
                      <span key={tag} className="px-2 py-0.5 bg-red-900/50 border border-red-700/50 text-red-300 text-xs rounded">{tag} <span className="text-red-500">×{count}</span></span>
                    ))}</div>
                  </div>
                )}
                {secondary_targets.filter(t => missing_tags.some(m => m.tag === t.tag)).length > 0 && (
                  <div className="mb-2"><p className="text-xs text-gray-500 mb-1">Secondary targets (15–30%):</p>
                    <div className="flex flex-wrap gap-1">{secondary_targets.filter(t => missing_tags.some(m => m.tag === t.tag)).map(({ tag, count }) => (
                      <span key={tag} className="px-2 py-0.5 bg-yellow-900/40 border border-yellow-800/50 text-yellow-300 text-xs rounded">{tag} <span className="text-yellow-500">×{count}</span></span>
                    ))}</div>
                  </div>
                )}
                {wasted_tag_slots.length > 0 && (
                  <p className="text-xs text-orange-400 mt-1">⚠ {wasted_tag_slots.length} tag slot{wasted_tag_slots.length > 1 ? "s" : ""} duplicate attribute values: {wasted_tag_slots.join(", ")}</p>
                )}
                {flag === "red" && <p className="text-xs text-red-400 mt-1">Low tag coverage — most competitor keywords are absent from your tags.</p>}
              </section>
            );
          })()}

          {/* Favorites Correlation */}
          {(() => {
            const { high_demand_group_size, missing_from_your_listing } = b.metrics.favorites_correlation;
            if (missing_from_your_listing.length === 0) return null;
            return (
              <section className="bg-purple-900/20 border border-purple-800/40 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Demand-Correlated Tags</p>
                <p className="text-xs text-gray-500 mb-2">Tags used by ≥50% of the top {high_demand_group_size} highest-favorited competitors — missing from your listing:</p>
                <div className="flex flex-wrap gap-1">
                  {missing_from_your_listing.map(({ tag, count }) => (
                    <span key={tag} className="px-2 py-0.5 bg-purple-900/40 border border-purple-700/50 text-purple-300 text-xs rounded">{tag} <span className="text-purple-500">×{count}</span></span>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Title Analysis */}
          {(() => {
            const { missing_from_your_title, title_length, title_too_long, primary_keyword_front_loaded, consensus_coverage, consensus_phrases } = b.metrics.title;
            return (
              <section className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Title Analysis</p>
                <div className="flex gap-4 text-xs mb-2">
                  <span className={title_too_long ? "text-red-400" : "text-gray-400"}>{title_length}/140 chars {title_too_long ? "⚠ too long" : ""}</span>
                  <span className={primary_keyword_front_loaded ? "text-green-400" : "text-yellow-400"}>{primary_keyword_front_loaded ? "✓" : "✗"} primary keyword front-loaded</span>
                  <span className="text-gray-400">{consensus_coverage}/{consensus_phrases.length} consensus phrases</span>
                </div>
                {missing_from_your_title.length > 0 && (
                  <><p className="text-xs text-gray-500 mb-1">Consensus phrases missing from your title:</p>
                    <div className="flex flex-wrap gap-1">
                      {missing_from_your_title.map(phrase => (
                        <span key={phrase} className="px-2 py-0.5 bg-orange-900/40 border border-orange-800/50 text-orange-300 text-xs rounded">{phrase}</span>
                      ))}
                    </div>
                  </>
                )}
              </section>
            );
          })()}

          {/* ── SECTION: CONVERSION SIGNALS ── */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Conversion Signals</p>

          {/* Price Position */}
          {(() => {
            const { your_price, min, p10, median, p75, p90, max, position, flag, margin_scenarios } = b.metrics.price;
            const posLabel = position === "bottom-10" ? "Bottom 10%" : position === "top-10" ? "Top 10%" : "Mid-range";
            const posColor = position === "mid-range" ? "text-green-400" : "text-yellow-400";
            return (
              <section className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Price Position</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-bold text-white">${your_price.toFixed(2)}</span>
                  <span className={`text-sm font-medium ${posColor}`}>{posLabel}</span>
                </div>
                <div className="grid grid-cols-6 gap-1 text-center mb-3">
                  {([["Min", min], ["P10", p10], ["Median", median], ["P75", p75], ["P90", p90], ["Max", max]] as [string, number][]).map(([label, val]) => (
                    <div key={label} className="bg-gray-700/50 rounded p-1">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-xs text-gray-300">${val.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-2">
                  {([["Your net", margin_scenarios.current_price_net], ["At median", margin_scenarios.median_price_net], ["At P75", margin_scenarios.p75_price_net]] as [string, number][]).map(([label, val]) => (
                    <div key={label} className="bg-gray-700/30 rounded p-1.5">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className={`text-sm font-semibold ${val > 0 ? "text-green-400" : "text-red-400"}`}>${val.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                {flag && <p className="text-xs text-yellow-400 mt-1">{flag}</p>}
              </section>
            );
          })()}

          {/* Demand Gap */}
          {(() => {
            const { your_favorers, comp_avg, your_pct_of_avg, flag } = b.metrics.demand;
            return (
              <section className={`border rounded-xl p-4 ${FLAG_BG[flag]}`}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Demand Gap (Favorites)</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-2xl font-bold text-white">{your_favorers}</p><p className="text-xs text-gray-500">Your favorites</p></div>
                  <div><p className={`text-2xl font-bold ${FLAG_TEXT[flag]}`}>{your_pct_of_avg}%</p><p className="text-xs text-gray-500">of competitor avg</p></div>
                  <div><p className="text-2xl font-bold text-gray-300">{comp_avg}</p><p className="text-xs text-gray-500">Competitor avg</p></div>
                </div>
                {flag === "red" && <p className="text-xs text-red-400 mt-2">Significant demand gap — listing needs optimization to build social proof.</p>}
                {flag === "yellow" && <p className="text-xs text-yellow-400 mt-2">Below competitor demand — room to grow with better keywords and photos.</p>}
              </section>
            );
          })()}

          {/* Image Analysis */}
          {(() => {
            const { your_count, comp_avg, flag, classification } = b.metrics.images;
            return (
              <section className={`border rounded-xl p-4 ${FLAG_BG[flag]}`}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Image Analysis</p>
                <div className="grid grid-cols-2 gap-3 text-center mb-3">
                  <div><p className={`text-2xl font-bold ${FLAG_TEXT[flag]}`}>{your_count}</p><p className="text-xs text-gray-500">Your photos</p></div>
                  <div><p className="text-2xl font-bold text-gray-300">{comp_avg}</p><p className="text-xs text-gray-500">Competitor avg</p></div>
                </div>
                {flag === "red" && <p className="text-xs text-red-400 mb-2">Under 5 photos — Etsy recommends at least 5.</p>}
                {flag === "yellow" && <p className="text-xs text-yellow-400 mb-2">Below competitor average — more photos may improve conversion.</p>}
                {classification && (
                  <><p className="text-xs text-gray-500 mb-1">{classification.coverage_score}/7 photo types covered</p>
                    {classification.missing_types.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {classification.missing_types.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-red-900/40 border border-red-800/50 text-red-300 text-xs rounded">Missing: {t.replace("_", " ")}</span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>
            );
          })()}

          {/* ── SECTION: LISTING QUALITY ── */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Listing Quality</p>

          {/* Description Audit */}
          {(() => {
            const { word_count, score, flags, missing_keywords } = b.metrics.description;
            const wc_color = word_count < 100 ? "text-red-400" : "text-green-400";
            return (
              <section className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description Audit</p>
                  <span className={`text-xs font-semibold ${wc_color}`}>{word_count} words</span>
                </div>
                {flags.length > 0 && (
                  <ul className="space-y-1 mb-2">{flags.map(f => <li key={f} className="text-xs text-red-400">⚠ {f}</li>)}</ul>
                )}
                {flags.length === 0 && <p className="text-xs text-green-400 mb-2">✓ No issues found</p>}
                {missing_keywords.length > 0 && (
                  <><p className="text-xs text-gray-500 mb-1">Top competitor tags missing from your description:</p>
                    <div className="flex flex-wrap gap-1">
                      {missing_keywords.map(kw => <span key={kw} className="px-2 py-0.5 bg-orange-900/40 border border-orange-800/50 text-orange-300 text-xs rounded">{kw}</span>)}
                    </div>
                  </>
                )}
                {score < -2 && <p className="text-xs text-red-400 mt-2">Score: {score} — description needs attention.</p>}
              </section>
            );
          })()}
        </>
      )}
    </div>
  );
}
