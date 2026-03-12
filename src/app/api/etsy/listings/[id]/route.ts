import { NextRequest, NextResponse } from "next/server";
import { getListing, updateListing } from "@/lib/etsy-client";
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
    return NextResponse.json({ listing });
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listingId = parseInt(id, 10);
  if (isNaN(listingId)) return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body || !body.field || body.value === undefined) {
    return NextResponse.json({ error: "Missing field or value" }, { status: 400 });
  }

  const { field, value } = body as { field: string; value: string | string[] };
  if (!["title", "tags", "description"].includes(field)) {
    return NextResponse.json({ error: "Invalid field" }, { status: 400 });
  }

  try {
    await updateListing(listingId, { [field]: value } as { title?: string; tags?: string[]; description?: string });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const isAuth = msg.includes("not_connected") || msg.includes("401");
    return NextResponse.json(
      { error: isAuth ? "Not connected to Etsy — re-authorize at /api/etsy/connect" : msg },
      { status: isAuth ? 401 : 500 }
    );
  }
}
