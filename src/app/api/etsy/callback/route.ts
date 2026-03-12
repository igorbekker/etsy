import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/etsy-client";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/?error=missing_params", request.url));
  }

  try {
    await exchangeCodeForTokens(code, state);
    return NextResponse.redirect(new URL("/?connected=true", request.url));
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/?error=oauth_failed", request.url));
  }
}
