import { NextRequest, NextResponse } from "next/server";
import { generateKeywordSuggestions } from "@/lib/ai-suggestions";
import { isConnected } from "@/lib/etsy-client";

export async function POST(request: NextRequest) {
  const connected = await isConnected();
  if (!connected) {
    return NextResponse.json(
      { error: "Not connected to Etsy" },
      { status: 401 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const { seedKeyword, existingTags, competitorTags, competitorTitleWords } =
    await request.json();

  if (!seedKeyword) {
    return NextResponse.json(
      { error: "seedKeyword is required" },
      { status: 400 }
    );
  }

  try {
    const result = await generateKeywordSuggestions(
      seedKeyword,
      existingTags || [],
      competitorTags || [],
      competitorTitleWords || []
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI keyword suggestion failed:", error);
    return NextResponse.json(
      { error: "AI suggestion failed" },
      { status: 500 }
    );
  }
}
