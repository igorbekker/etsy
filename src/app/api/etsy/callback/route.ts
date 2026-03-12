import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/etsy-client";

function getPublicBaseUrl(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const base = getPublicBaseUrl(request);

  if (!code || !state) {
    return NextResponse.redirect(`${base}/?error=missing_params`);
  }

  try {
    await exchangeCodeForTokens(code, state);
    return NextResponse.redirect(`${base}/?connected=true`);
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(`${base}/?error=oauth_failed`);
  }
}
