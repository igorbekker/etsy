import { NextResponse } from "next/server";
import { getAllShopListings, isConnected } from "@/lib/etsy-client";
import { DEMO_MODE, MOCK_LISTINGS } from "@/lib/mock-data";

export async function GET() {
  if (DEMO_MODE) {
    return NextResponse.json({ listings: MOCK_LISTINGS });
  }

  const connected = await isConnected();
  if (!connected) {
    return NextResponse.json(
      { error: "Not connected to Etsy. Please connect first." },
      { status: 401 }
    );
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
