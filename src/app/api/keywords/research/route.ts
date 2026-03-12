import { NextRequest, NextResponse } from "next/server";
import { performKeywordResearch } from "@/lib/keyword-research";
import { DEMO_MODE, MOCK_KEYWORD_RESULT } from "@/lib/mock-data";

export async function POST(request: NextRequest) {
  const { keyword } = await request.json();

  if (!keyword || typeof keyword !== "string") {
    return NextResponse.json(
      { error: "Keyword is required" },
      { status: 400 }
    );
  }

  if (DEMO_MODE) {
    return NextResponse.json({ ...MOCK_KEYWORD_RESULT, seedKeyword: keyword });
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
