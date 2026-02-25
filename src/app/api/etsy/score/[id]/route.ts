import { NextRequest, NextResponse } from "next/server";
import { getListing, isConnected } from "@/lib/etsy-client";
import { scoreListing } from "@/lib/scoring";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const connected = await isConnected();
  if (!connected) {
    return NextResponse.json(
      { error: "Not connected to Etsy" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const listingId = parseInt(id, 10);
  if (isNaN(listingId)) {
    return NextResponse.json(
      { error: "Invalid listing ID" },
      { status: 400 }
    );
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
