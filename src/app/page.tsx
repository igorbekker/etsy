"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  images: { url_170x135: string; alt_text: string }[];
}

type SortMode = "priority" | "views" | "title";

export default function Dashboard() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const router = useRouter();

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    try {
      const res = await fetch("/api/etsy/status");
      const data = await res.json();
      setConnected(data.connected);

      if (data.connected) {
        await fetchListings();
      }
    } catch {
      setError("Failed to check Etsy connection");
    } finally {
      setLoading(false);
    }
  }

  async function fetchListings() {
    try {
      const res = await fetch("/api/etsy/listings");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setListings(data.listings);
      fetchScores();
    } catch {
      setError("Failed to fetch listings");
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
      // Scores are optional — don't block the dashboard
    } finally {
      setScoresLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function formatPrice(price: Listing["price"]) {
    return `$${(price.amount / price.divisor).toFixed(2)}`;
  }

  function scoreColor(score: number) {
    if (score >= 70) return "text-green-400 bg-green-400/10 border-green-400/30";
    if (score >= 40) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
    return "text-red-400 bg-red-400/10 border-red-400/30";
  }

  function getSortedListings() {
    const sorted = [...listings];
    switch (sortMode) {
      case "priority":
        // Lowest SEO score first (needs most work)
        return sorted.sort(
          (a, b) => (scores[a.listing_id] ?? 100) - (scores[b.listing_id] ?? 100)
        );
      case "views":
        return sorted.sort((a, b) => b.views - a.views);
      case "title":
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Etsy Listing Optimizer</h1>
          <p className="text-sm text-gray-400">MyHomeByMax</p>
        </div>
        <div className="flex items-center gap-4">
          {connected ? (
            <span className="text-sm text-green-400 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              Etsy Connected
            </span>
          ) : (
            <a
              href="/api/etsy/connect"
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg transition-colors"
            >
              Connect Etsy
            </a>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {!connected && (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-2">Connect Your Etsy Shop</h2>
            <p className="text-gray-400 mb-6">
              Connect your Etsy account to start analyzing your listings.
            </p>
            <a
              href="/api/etsy/connect"
              className="inline-block px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors"
            >
              Connect to Etsy
            </a>
          </div>
        )}

        {connected && listings.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">
                  Active Listings ({listings.length})
                </h2>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-gray-500">Sort:</span>
                  {(
                    [
                      ["priority", "Priority"],
                      ["views", "Views"],
                      ["title", "Title"],
                    ] as [SortMode, string][]
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() => setSortMode(mode)}
                      className={`px-2 py-0.5 rounded text-xs transition-colors ${
                        sortMode === mode
                          ? "bg-orange-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Link
                href="/keywords"
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm rounded-lg transition-colors"
              >
                Keyword Research
              </Link>
            </div>

            <div className="grid gap-4">
              {getSortedListings().map((listing) => {
                const score = scores[listing.listing_id];
                return (
                  <Link
                    key={listing.listing_id}
                    href={`/listings/${listing.listing_id}`}
                    className="flex gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-600 transition-colors"
                  >
                    {/* SEO Score Badge */}
                    <div className="flex items-center justify-center flex-shrink-0">
                      {score !== undefined ? (
                        <div
                          className={`w-12 h-12 rounded-lg border flex items-center justify-center font-bold text-sm ${scoreColor(score)}`}
                        >
                          {score}
                        </div>
                      ) : scoresLoading ? (
                        <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center">
                          <span className="text-gray-600 text-xs">...</span>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center">
                          <span className="text-gray-600 text-xs">--</span>
                        </div>
                      )}
                    </div>

                    {/* Thumbnail */}
                    {listing.images?.[0] && (
                      <img
                        src={listing.images[0].url_170x135}
                        alt={listing.images[0].alt_text || listing.title}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">
                        {listing.title}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                        <span>{formatPrice(listing.price)}</span>
                        <span>{listing.views} views</span>
                        <span>Qty: {listing.quantity}</span>
                        <span className="capitalize">{listing.state}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {listing.tags?.slice(0, 5).map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-gray-800 text-gray-300 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {listing.tags?.length > 5 && (
                          <span className="text-xs text-gray-500">
                            +{listing.tags.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center text-gray-600">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {connected && listings.length === 0 && !loading && (
          <div className="text-center py-20 text-gray-400">
            No active listings found in your shop.
          </div>
        )}
      </main>
    </div>
  );
}
