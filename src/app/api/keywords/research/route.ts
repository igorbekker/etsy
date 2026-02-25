import { NextRequest, NextResponse } from "next/server";
import { performKeywordResearch } from "@/lib/keyword-research";
import { isConnected } from "@/lib/etsy-client";

export async function POST(request: NextRequest) {
  const connected = await isConnected();
  if (!connected) {
    return NextResponse.json(
      { error: "Not connected to Etsy" },
      { status: 401 }
    );
  }

  const { keyword } = await request.json();
  if (!keyword || typeof keyword !== "string") {
    return NextResponse.json(
      { error: "Keyword is required" },
      { status: 400 }
    );
  }

  try {
    const result = await performKeywordResearch(keyword.trim());
    return NextResponse.json(result);
  } catch (error) {
    console.error("Keyword research failed:", error);
    return NextResponse.json(
      { error: "Keyword research failed" },
      { status: 500 }
    );
  }
}
