"use client";

import type {
  Listing, AIRecommendations, BenchmarkResult, AttributesResult, AttributeGap,
  ChecklistState, ChecklistField,
} from "@/types";
import { CopyButton } from "@/components/CopyButton";
import { AttributeRow } from "@/components/AttributeRow";

interface RecsTabProps {
  listing: Listing;
  recommendations: AIRecommendations | null;
  recsLoading: boolean;
  recsError: string;
  recsGeneratedAt: string | null;
  benchmarks: BenchmarkResult | null;
  benchmarksLoading: boolean;
  altTextStatus: Record<number, "pushing" | "done" | "error">;
  altTextErrors: Record<number, string>;
  fieldStatus: Record<string, "pushing" | "done" | "error">;
  fieldErrors: Record<string, string>;
  attributes: AttributesResult | null;
  attributesLoading: boolean;
  attributesError: string;
  attrStatus: Record<number, "applying" | "done" | "error">;
  attrErrors: Record<number, string>;
  checklist: ChecklistState | null;
  onFetchRecommendations: (forceRegenerate?: boolean) => void;
  onPushAltText: (imageId: number, altText: string, oldAltText: string, imageIndex: number) => void;
  onPushField: (field: "title" | "tags" | "description", newValue: string | string[], oldValue: string | string[]) => void;
  onFetchAttributes: () => void;
  onApplyAttribute: (gap: AttributeGap, valueId: number, valueName: string) => void;
  onMarkChecklist: (field: ChecklistField, done: boolean) => void;
}

const CHECKLIST_ITEMS: { field: ChecklistField; label: string; manual: boolean }[] = [
  { field: "tags", label: "Push optimized tags", manual: false },
  { field: "attributes", label: "Apply missing attributes", manual: false },
  { field: "title", label: "Push optimized title", manual: false },
  { field: "description", label: "Push optimized description", manual: false },
  { field: "alt_text", label: "Push image alt texts", manual: false },
  { field: "photos", label: "Add photos to reach competitor avg", manual: true },
  { field: "price", label: "Review price positioning", manual: true },
];

export function RecsTab({
  listing,
  recommendations,
  recsLoading,
  recsError,
  recsGeneratedAt,
  benchmarks,
  benchmarksLoading,
  altTextStatus,
  altTextErrors,
  fieldStatus,
  fieldErrors,
  attributes,
  attributesLoading,
  attributesError,
  attrStatus,
  attrErrors,
  checklist,
  onFetchRecommendations,
  onPushAltText,
  onPushField,
  onFetchAttributes,
  onApplyAttribute,
  onMarkChecklist,
}: RecsTabProps) {
  return (
    <>
      {benchmarksLoading && !recsLoading && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">Running benchmark analysis first...</p>
          <p className="text-gray-600 text-xs mt-1">Pulling competitor data — this takes 20–30 seconds</p>
        </div>
      )}
      {recsLoading && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">Generating recommendations from benchmark data...</p>
          <p className="text-gray-600 text-xs mt-1">This may take 10–15 seconds</p>
        </div>
      )}
      {recsError === "no_keywords" && (
        <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg text-center">
          <p className="text-sm text-white mb-1">Target keywords required</p>
          <p className="text-xs text-gray-400">Set primary and secondary keywords in the Details tab before generating recommendations. Keywords tell Claude which search terms to optimize for — without them, recommendations will be off-topic.</p>
        </div>
      )}
      {recsError && recsError !== "no_keywords" && (
        <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
          <p className="text-red-400 text-sm">{recsError}</p>
          <button onClick={() => onFetchRecommendations()} className="mt-2 text-xs text-orange-400 hover:text-orange-300">Retry</button>
        </div>
      )}
      {recommendations && !recsLoading && (
        <div className="flex justify-end">
          <button
            onClick={() => onFetchRecommendations(true)}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 rounded-lg transition-colors"
          >
            Regenerate
          </button>
        </div>
      )}

      {/* Optimization Checklist */}
      {checklist && (
        <div className="p-4 bg-gray-800 border border-gray-700 rounded-xl space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Optimization Checklist</p>
            <p className="text-xs text-gray-500">
              {Object.values(checklist).filter((i) => i.done).length} / 7 complete
            </p>
          </div>
          {CHECKLIST_ITEMS.map(({ field, label, manual }) => {
            const item = checklist[field];
            return (
              <div key={field} className="flex items-center gap-2.5">
                <button
                  onClick={() => manual ? onMarkChecklist(field, !item.done) : undefined}
                  className={manual ? "cursor-pointer" : "cursor-default"}
                  title={manual ? (item.done ? "Mark incomplete" : "Mark complete") : undefined}
                >
                  {item.done
                    ? <span className="text-green-400 text-base leading-none">✓</span>
                    : <span className="text-gray-600 text-base leading-none">○</span>
                  }
                </button>
                <span className={`text-xs flex-1 ${item.done ? "text-gray-500 line-through" : "text-gray-300"}`}>
                  {label}
                  {manual && <span className="text-gray-600 ml-1">(manual)</span>}
                </span>
                {item.done && item.pushed_at && (
                  <span className="text-xs text-gray-600 flex-shrink-0">
                    {new Date(item.pushed_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {recommendations && (
        <>
          {/* Competitor Insights from Benchmarks */}
          {benchmarks && (
            <div className="p-4 bg-gray-800 border border-gray-700 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Competitor Insights ({benchmarks.competitor_count} analyzed)
                </p>
                <p className="text-xs text-gray-600">from benchmark {new Date(benchmarks.computed_at).toLocaleDateString()}</p>
              </div>
              {benchmarks.metrics.tags.missing_tags.slice(0, 8).length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Top consensus tags missing from your listing</p>
                  <div className="flex flex-wrap gap-1">
                    {benchmarks.metrics.tags.missing_tags.slice(0, 8).map(({ tag, count }) => (
                      <span key={tag} className="px-2 py-0.5 bg-red-900/30 border border-red-800/40 text-red-300 text-xs rounded">
                        {tag} <span className="text-red-500/70">{count}x</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {benchmarks.metrics.title.missing_from_your_title.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Consensus title phrases you&apos;re missing</p>
                  <div className="flex flex-wrap gap-1">
                    {benchmarks.metrics.title.missing_from_your_title.slice(0, 6).map(phrase => (
                      <span key={phrase} className="px-2 py-0.5 bg-blue-900/30 border border-blue-800/40 text-blue-300 text-xs rounded">{phrase}</span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 mb-1">Competitor price range</p>
                <p className="text-sm text-gray-300">
                  ${benchmarks.metrics.price.min.toFixed(2)} – ${benchmarks.metrics.price.max.toFixed(2)}
                  <span className="text-gray-500 text-xs ml-2">(median ${benchmarks.metrics.price.median.toFixed(2)})</span>
                </p>
              </div>
            </div>
          )}

          {/* Overall Strategy */}
          <div className="p-4 bg-orange-900/20 border border-orange-800/30 rounded-xl">
            <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1">Overall Strategy</p>
            <p className="text-sm text-gray-300">{recommendations.overallStrategy}</p>
            {recsGeneratedAt && (
              <p className="text-xs text-gray-600 mt-2">Generated: {new Date(recsGeneratedAt).toLocaleString()}</p>
            )}
          </div>

          {/* Title + Description */}
          {([
            { label: "Title", field: "title" as const, reasoning: recommendations.title.reasoning, left: listing.title, right: recommendations.title.recommended },
            { label: "Description", field: "description" as const, reasoning: recommendations.description.reasoning, left: listing.description, right: recommendations.description.recommended },
          ]).map(({ label, field, reasoning, left, right }) => {
            const status = fieldStatus[field];
            return (
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
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-green-500 uppercase tracking-wider">Recommended</p>
                      <div className="flex items-center gap-1">
                        <CopyButton text={right} />
                        <button
                          disabled={status === "pushing" || status === "done"}
                          onClick={() => onPushField(field, right, left)}
                          className={`px-2 py-0.5 text-xs rounded transition-colors ${
                            status === "done" ? "bg-green-900 text-green-400 cursor-default" :
                            status === "error" ? "bg-red-900/50 text-red-400 hover:bg-red-900" :
                            status === "pushing" ? "bg-gray-700 text-gray-400 cursor-not-allowed" :
                            "bg-orange-700 hover:bg-orange-600 text-white"
                          }`}
                        >
                          {status === "done" ? "Pushed!" : status === "pushing" ? "Pushing..." : status === "error" ? "Retry" : "Push Live"}
                        </button>
                      </div>
                    </div>
                    {status === "error" && fieldErrors[field] && (
                      <p className="text-xs text-red-400 mb-1">{fieldErrors[field]}</p>
                    )}
                    <p className="text-sm text-white whitespace-pre-wrap max-h-48 overflow-y-auto">{right}</p>
                  </div>
                </div>
              </section>
            );
          })}

          {/* Tags */}
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
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-green-500 uppercase tracking-wider">Recommended ({recommendations.tags.recommended.length}/13)</p>
                  <div className="flex items-center gap-1">
                    <CopyButton text={recommendations.tags.recommended.join(", ")} />
                    <button
                      disabled={fieldStatus["tags"] === "pushing" || fieldStatus["tags"] === "done"}
                      onClick={() => onPushField("tags", recommendations.tags.recommended, recommendations.tags.current)}
                      className={`px-2 py-0.5 text-xs rounded transition-colors ${
                        fieldStatus["tags"] === "done" ? "bg-green-900 text-green-400 cursor-default" :
                        fieldStatus["tags"] === "error" ? "bg-red-900/50 text-red-400 hover:bg-red-900" :
                        fieldStatus["tags"] === "pushing" ? "bg-gray-700 text-gray-400 cursor-not-allowed" :
                        "bg-orange-700 hover:bg-orange-600 text-white"
                      }`}
                    >
                      {fieldStatus["tags"] === "done" ? "Pushed!" : fieldStatus["tags"] === "pushing" ? "Pushing..." : fieldStatus["tags"] === "error" ? "Retry" : "Push Live"}
                    </button>
                  </div>
                </div>
                {fieldStatus["tags"] === "error" && fieldErrors["tags"] && (
                  <p className="text-xs text-red-400 mb-1">{fieldErrors["tags"]}</p>
                )}
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

          {/* Alt Text */}
          {recommendations.altTexts.length > 0 && (
            <section className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <p className="text-sm font-medium text-white">Image Alt Text</p>
              </div>
              <div className="divide-y divide-gray-700">
                {recommendations.altTexts.map((alt, i) => {
                  const imageId = listing.images?.[alt.imageIndex]?.listing_image_id;
                  const status = imageId !== undefined ? altTextStatus[imageId] : undefined;
                  return (
                    <div key={i} className="grid grid-cols-2 divide-x divide-gray-700">
                      <div className="p-3">
                        <p className="text-xs text-gray-500 mb-1">Image {alt.imageIndex + 1} — Current</p>
                        <p className="text-sm text-gray-300">{listing.images?.[alt.imageIndex]?.alt_text || alt.current || "(empty)"}</p>
                      </div>
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-green-500">Recommended</p>
                          {imageId !== undefined && (
                            <button
                              onClick={() => onPushAltText(imageId, alt.recommended, listing.images?.[alt.imageIndex]?.alt_text ?? alt.current, alt.imageIndex)}
                              disabled={status === "pushing" || status === "done"}
                              className={`px-2 py-1 text-xs rounded transition-colors flex-shrink-0 ${
                                status === "done" ? "bg-green-700 text-green-200" :
                                status === "error" ? "bg-red-700 text-red-200" :
                                status === "pushing" ? "bg-gray-600 text-gray-400" :
                                "bg-orange-700 hover:bg-orange-600 text-white"
                              }`}
                            >
                              {status === "done" ? "Pushed!" : status === "error" ? "Retry" : status === "pushing" ? "Pushing..." : "Push Live"}
                            </button>
                          )}
                        </div>
                        {imageId !== undefined && status === "error" && altTextErrors[imageId] && (
                          <p className="text-xs text-red-400 mb-1">{altTextErrors[imageId]}</p>
                        )}
                        <p className="text-sm text-white">{alt.recommended}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Attributes */}
          <section className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Attributes</p>
                <p className="text-xs text-gray-500 mt-0.5">Unfilled attributes are invisible to filtered searches on Etsy</p>
              </div>
              {!attributes && !attributesLoading && (
                <button
                  onClick={onFetchAttributes}
                  className="px-3 py-1.5 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded transition-colors"
                >
                  Check Attributes
                </button>
              )}
              {attributes && (
                <button
                  onClick={onFetchAttributes}
                  className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                >
                  Refresh
                </button>
              )}
            </div>

            {attributesLoading && (
              <div className="px-4 py-6 text-center text-sm text-gray-400">Checking attributes…</div>
            )}

            {attributesError && !attributesLoading && (
              <div className="px-4 py-4 text-sm text-red-400">{attributesError}</div>
            )}

            {attributes && !attributesLoading && (
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${
                    attributes.fill_rate >= 80 ? "text-green-400" :
                    attributes.fill_rate >= 60 ? "text-yellow-400" : "text-red-400"
                  }`}>{attributes.fill_rate}%</span>
                  <div>
                    <p className="text-sm text-white">Attribute Fill Rate</p>
                    <p className="text-xs text-gray-500">{attributes.filled} of {attributes.total} attributes filled</p>
                  </div>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                    attributes.fill_rate >= 80 ? "bg-green-900 text-green-300" :
                    attributes.fill_rate >= 60 ? "bg-yellow-900 text-yellow-300" : "bg-red-900 text-red-300"
                  }`}>
                    {attributes.fill_rate >= 80 ? "Good" : attributes.fill_rate >= 60 ? "Needs work" : "Critical"}
                  </span>
                </div>

                {attributes.gaps.length === 0 && (
                  <p className="text-sm text-green-400">All attributes filled — nothing to improve here.</p>
                )}

                {attributes.gaps.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{attributes.gaps.length} unfilled attributes</p>
                    {attributes.gaps.map((gap) => (
                      <AttributeRow
                        key={gap.property_id}
                        gap={gap}
                        status={attrStatus[gap.property_id]}
                        error={attrErrors[gap.property_id]}
                        onApply={onApplyAttribute}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
