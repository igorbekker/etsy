import { NextRequest, NextResponse } from "next/server";
import { getListing, isConnected } from "@/lib/etsy-client";

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
    return NextResponse.json({ listing });
  } catch (error) {
    console.error(`Failed to fetch listing ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch listing" },
      { status: 500 }
    );
  }
}
