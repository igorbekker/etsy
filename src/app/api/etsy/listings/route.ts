import { NextResponse } from "next/server";
import { getAllShopListings, isConnected } from "@/lib/etsy-client";

export async function GET() {
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
