import { NextResponse } from "next/server";
import { getAllShopListings } from "@/lib/etsy-client";
import { DEMO_MODE, MOCK_LISTINGS } from "@/lib/mock-data";

export async function GET() {
  if (DEMO_MODE) {
    return NextResponse.json({ listings: MOCK_LISTINGS });
  }

  try {
    const listings = await getAllShopListings();
    return NextResponse.json({ listings });
  } catch (error) {
    console.error("Failed to fetch listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings from Etsy" },
      { status: 500 }
    );
  }
}
