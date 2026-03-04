import { NextRequest, NextResponse } from "next/server";
import { getListing, searchListings, isConnected } from "@/lib/etsy-client";
import { generateListingRecommendations } from "@/lib/ai-suggestions";
import { DEMO_MODE, getMockRecommendations } from "@/lib/mock-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listingId = parseInt(id, 10);
  if (isNaN(listingId)) {
    return NextResponse.json(
      { error: "Invalid listing ID" },
      { status: 400 }
    );
  }

  if (DEMO_MODE) {
    return NextResponse.json({ recommendations: getMockRecommendations(listingId) });
  }

  const connected = await isConnected();
  if (!connected) {
    return NextResponse.json(
      { error: "Not connected to Etsy" },
      { status: 401 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const listing = await getListing(listingId);

    // Extract primary keywords from title for competitor search
    const titleWords = listing.title
      .split(/[\s,|/\-–—]+/)
      .filter((w) => w.length > 3)
      .slice(0, 3)
      .join(" ");

    const { results } = await searchListings(titleWords, 15);

    const competitors = results
      .filter((r) => r.listing_id !== listingId)
      .map((r) => ({
        listing_id: r.listing_id,
        title: r.title,
        tags: r.tags || [],
        taxonomy_id: r.taxonomy_id,
        views: r.views,
        url: r.url,
        price: r.price.amount / r.price.divisor,
      }));

    const recommendations = await generateListingRecommendations(
      listing,
      competitors
    );

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error(`Failed to generate recommendations for ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}
