import { NextResponse } from "next/server";
import { getAllShopListings } from "@/lib/etsy-client";
import { scoreListing } from "@/lib/scoring";
import { DEMO_MODE, MOCK_LISTINGS } from "@/lib/mock-data";

export async function GET() {
  if (DEMO_MODE) {
    const scores: Record<number, number> = {};
    for (const listing of MOCK_LISTINGS) {
      scores[listing.listing_id] = scoreListing(listing).overall;
    }
    return NextResponse.json({ scores });
  }

  try {
    const listings = await getAllShopListings();
    const scores: Record<number, number> = {};

    for (const listing of listings) {
      const score = scoreListing(listing);
      scores[listing.listing_id] = score.overall;
    }

    return NextResponse.json({ scores });
  } catch (error) {
    console.error("Failed to score listings:", error);
    return NextResponse.json(
      { error: "Failed to score listings" },
      { status: 500 }
    );
  }
}
