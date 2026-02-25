import { NextResponse } from "next/server";
import { getAllShopListings, isConnected } from "@/lib/etsy-client";
import { scoreListing } from "@/lib/scoring";

export async function GET() {
  const connected = await isConnected();
  if (!connected) {
    return NextResponse.json(
      { error: "Not connected to Etsy" },
      { status: 401 }
    );
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
