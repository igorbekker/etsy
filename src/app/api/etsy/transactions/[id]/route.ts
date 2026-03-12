import { NextRequest, NextResponse } from "next/server";
import { getListingUnitsSold } from "@/lib/etsy-client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listingId = parseInt(id, 10);
  if (isNaN(listingId)) {
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
  }

  try {
    const units_sold = await getListingUnitsSold(listingId);
    return NextResponse.json({ units_sold });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "not_connected") {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
