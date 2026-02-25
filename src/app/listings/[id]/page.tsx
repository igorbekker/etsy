"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface ListingDetail {
  listing_id: number;
  title: string;
  description: string;
  tags: string[];
  price: { amount: number; divisor: number; currency_code: string };
  quantity: number;
  taxonomy_id: number;
  materials: string[];
  shipping_profile_id: number;
  processing_min: number;
  processing_max: number;
  who_made: string;
  when_made: string;
  styles: string[];
  is_personalizable: boolean;
  personalization_char_count_max: number;
  personalization_instructions: string;
  views: number;
  state: string;
  url: string;
  images: {
    listing_image_id: number;
    url_570xN: string;
    url_fullxfull: string;
    alt_text: string;
    rank: number;
  }[];
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

export default function ListingDetailPage() {
  const params = useParams();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [seoScore, setSeoScore] = useState<SEOScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "images" | "seo">(
    "details"
  );

  useEffect(() => {
    fetchListing();
  }, [params.id]);

  async function fetchListing() {
    try {
      const [listingRes, scoreRes] = await Promise.all([
        fetch(`/api/etsy/listings/${params.id}`),
        fetch(`/api/etsy/score/${params.id}`),
      ]);

      if (!listingRes.ok) throw new Error("Failed to fetch");
      const listingData = await listingRes.json();
      setListing(listingData.listing);

      if (scoreRes.ok) {
        const scoreData = await scoreRes.json();
        setSeoScore(scoreData.score);
      }
    } catch {
      setError("Failed to fetch listing details");
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(price: ListingDetail["price"]) {
    return `$${(price.amount / price.divisor).toFixed(2)}`;
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp * 1000).toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading listing...</div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400">{error || "Listing not found"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          &larr; Back to listings
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="flex gap-6 mb-8">
          {listing.images?.[0] && (
            <img
              src={listing.images[0].url_570xN}
              alt={listing.images[0].alt_text || listing.title}
              className="w-32 h-32 object-cover rounded-xl flex-shrink-0"
            />
          )}
          <div>
            <h1 className="text-xl font-bold mb-2">{listing.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="text-lg text-white">
                {formatPrice(listing.price)}
              </span>
              <span>{listing.views} views</span>
              <span>Qty: {listing.quantity}</span>
              <span className="capitalize px-2 py-0.5 bg-gray-800 rounded">
                {listing.state}
              </span>
            </div>
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-orange-400 hover:text-orange-300 mt-2 inline-block"
            >
              View on Etsy &rarr;
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-800">
          {(["details", "images", "seo"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-white border-b-2 border-orange-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab === "seo" ? "SEO Analysis" : tab}
            </button>
          ))}
        </div>

        {/* Details Tab */}
        {activeTab === "details" && (
          <div className="space-y-6">
            {/* Description */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Description
              </h2>
              <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed bg-gray-900 p-4 rounded-lg">
                {listing.description}
              </p>
            </section>

            {/* Tags */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Tags ({listing.tags?.length || 0}/13)
              </h2>
              <div className="flex flex-wrap gap-2">
                {listing.tags?.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg"
                  >
                    {tag}
                  </span>
                ))}
                {(!listing.tags || listing.tags.length < 13) && (
                  <span className="px-3 py-1 border border-dashed border-gray-700 text-gray-500 text-sm rounded-lg">
                    {13 - (listing.tags?.length || 0)} slots unused
                  </span>
                )}
              </div>
            </section>

            {/* Properties */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Properties
              </h2>
              <div className="grid grid-cols-2 gap-3 bg-gray-900 p-4 rounded-lg">
                <div>
                  <span className="text-xs text-gray-500">Category ID</span>
                  <p className="text-sm">{listing.taxonomy_id}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Who Made</span>
                  <p className="text-sm capitalize">
                    {listing.who_made?.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">When Made</span>
                  <p className="text-sm capitalize">
                    {listing.when_made?.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Processing</span>
                  <p className="text-sm">
                    {listing.processing_min}-{listing.processing_max} days
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Materials</span>
                  <p className="text-sm">
                    {listing.materials?.join(", ") || "None"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Styles</span>
                  <p className="text-sm">
                    {listing.styles?.join(", ") || "None"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Personalizable</span>
                  <p className="text-sm">
                    {listing.is_personalizable ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Created</span>
                  <p className="text-sm">
                    {formatDate(listing.created_timestamp)}
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Images Tab */}
        {activeTab === "images" && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Images ({listing.images?.length || 0}/10)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {listing.images
                ?.sort((a, b) => a.rank - b.rank)
                .map((img) => (
                  <div key={img.listing_image_id} className="space-y-2">
                    <img
                      src={img.url_570xN}
                      alt={img.alt_text || "Listing image"}
                      className="w-full rounded-lg"
                    />
                    <div className="text-xs">
                      <span className="text-gray-500">Alt text: </span>
                      <span className={img.alt_text ? "text-gray-300" : "text-red-400"}>
                        {img.alt_text || "Missing!"}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* SEO Tab */}
        {activeTab === "seo" && (
          <div className="space-y-6">
            {seoScore ? (
              <>
                {/* Overall Score */}
                <div className="flex items-center gap-4 p-6 bg-gray-900 rounded-xl">
                  <div
                    className={`text-4xl font-bold ${
                      seoScore.overall >= 70
                        ? "text-green-400"
                        : seoScore.overall >= 40
                          ? "text-yellow-400"
                          : "text-red-400"
                    }`}
                  >
                    {seoScore.overall}
                  </div>
                  <div>
                    <p className="font-medium">SEO Score</p>
                    <p className="text-sm text-gray-400">
                      {seoScore.overall >= 70
                        ? "Good — minor improvements possible"
                        : seoScore.overall >= 40
                          ? "Needs work — several optimization opportunities"
                          : "Poor — significant improvements needed"}
                    </p>
                  </div>
                </div>

                {/* Score Breakdown */}
                {(
                  [
                    ["Title", seoScore.title],
                    ["Tags", seoScore.tags],
                    ["Description", seoScore.description],
                    ["Images", seoScore.images],
                    ["Metadata", seoScore.metadata],
                  ] as [string, ScoreDetail][]
                ).map(([label, detail]) => (
                  <section
                    key={label}
                    className="p-4 bg-gray-900 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{label}</h3>
                      <span
                        className={`text-sm font-mono ${
                          detail.score / detail.maxScore >= 0.7
                            ? "text-green-400"
                            : detail.score / detail.maxScore >= 0.4
                              ? "text-yellow-400"
                              : "text-red-400"
                        }`}
                      >
                        {detail.score}/{detail.maxScore}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          detail.score / detail.maxScore >= 0.7
                            ? "bg-green-500"
                            : detail.score / detail.maxScore >= 0.4
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{
                          width: `${(detail.score / detail.maxScore) * 100}%`,
                        }}
                      />
                    </div>

                    {/* Issues */}
                    {detail.issues.length > 0 && (
                      <div className="space-y-1">
                        {detail.issues.map((issue, i) => (
                          <p
                            key={i}
                            className="text-sm text-red-400 flex items-start gap-2"
                          >
                            <span className="flex-shrink-0 mt-0.5">&#x2717;</span>
                            {issue}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Suggestions */}
                    {detail.suggestions.length > 0 && (
                      <div className="space-y-1">
                        {detail.suggestions.map((suggestion, i) => (
                          <p
                            key={i}
                            className="text-sm text-yellow-400 flex items-start gap-2"
                          >
                            <span className="flex-shrink-0 mt-0.5">&#x25CB;</span>
                            {suggestion}
                          </p>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">Loading SEO analysis...</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
