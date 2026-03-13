"use client";

import type { SEOScore, ScoreDetail } from "@/types";
import { scoreColor, scoreBar } from "@/lib/utils";

interface SEOTabProps {
  seoScore: SEOScore | null;
}

export function SEOTab({ seoScore }: SEOTabProps) {
  if (!seoScore) {
    return <div className="text-center py-12 text-gray-500 text-sm">Loading SEO analysis...</div>;
  }

  return (
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
  );
}
