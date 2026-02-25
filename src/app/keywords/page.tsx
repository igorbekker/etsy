"use client";

import { useState } from "react";
import Link from "next/link";

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

export default function KeywordResearchPage() {
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
    <div className="min-h-screen">
      <header className="border-b border-gray-800 px-6 py-4">
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          &larr; Back to dashboard
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Keyword Research</h1>

        {/* Search Form */}
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
            {/* Autocomplete Suggestions */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Autocomplete Suggestions
              </h2>
              {result.autocompleteSuggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {result.autocompleteSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setKeyword(s);
                      }}
                      className="px-3 py-1.5 bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg hover:border-orange-500 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  No autocomplete suggestions found.
                </p>
              )}
            </section>

            {/* Top Tags from Competitors */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Most Used Tags by Competitors ({result.competitors.length}{" "}
                listings analyzed)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {result.tagFrequency.slice(0, 30).map(({ tag, count }, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 bg-gray-900 rounded-lg"
                  >
                    <span className="text-sm text-gray-300 truncate">
                      {tag}
                    </span>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                      {count}x
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Title Keywords */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Common Words in Competitor Titles
              </h2>
              <div className="flex flex-wrap gap-2">
                {result.titleKeywords.slice(0, 30).map(({ word, count }, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-gray-900 text-sm rounded-lg"
                    style={{
                      opacity: Math.max(0.4, Math.min(1, count / 10)),
                    }}
                  >
                    {word}{" "}
                    <span className="text-gray-500 text-xs">({count})</span>
                  </span>
                ))}
              </div>
            </section>

            {/* AI-Powered Suggestions */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">
                  AI-Powered Suggestions
                </h2>
                <button
                  onClick={handleAiSuggest}
                  disabled={aiLoading}
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors"
                >
                  {aiLoading
                    ? "Generating..."
                    : aiSuggestions
                      ? "Regenerate"
                      : "Generate AI Suggestions"}
                </button>
              </div>
              {aiSuggestions ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400 bg-gray-900 p-3 rounded-lg">
                    {aiSuggestions.reasoning}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {aiSuggestions.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-orange-900/20 border border-orange-800/30 text-orange-300 text-sm rounded-lg"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              ) : !aiLoading ? (
                <p className="text-gray-500 text-sm">
                  Click &quot;Generate AI Suggestions&quot; to get keyword ideas
                  powered by Claude, based on the competitor data above.
                </p>
              ) : (
                <p className="text-gray-500 text-sm">
                  Analyzing competitor data and generating suggestions...
                </p>
              )}
            </section>

            {/* Top Competitors */}
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Top Competitor Listings
              </h2>
              <div className="space-y-3">
                {result.competitors.slice(0, 10).map((comp) => (
                  <div
                    key={comp.listing_id}
                    className="p-4 bg-gray-900 border border-gray-800 rounded-lg"
                  >
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
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {comp.tags.length > 8 && (
                        <span className="text-xs text-gray-600">
                          +{comp.tags.length - 8}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
