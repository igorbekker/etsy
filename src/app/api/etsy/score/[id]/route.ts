import { NextRequest, NextResponse } from "next/server";
import { getListing } from "@/lib/etsy-client";
import { scoreListing } from "@/lib/scoring";
import { DEMO_MODE, MOCK_LISTINGS } from "@/lib/mock-data";

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
    const listing = MOCK_LISTINGS.find((l) => l.listing_id === listingId);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    return NextResponse.json({ score: scoreListing(listing) });
  }

  try {
    const listing = await getListing(listingId);
    const score = scoreListing(listing);
    return NextResponse.json({ score });
  } catch (error) {
    console.error(`Failed to score listing ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to score listing" },
      { status: 500 }
    );
  }
}
