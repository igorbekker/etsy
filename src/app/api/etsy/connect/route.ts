import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/etsy-client";

export async function GET() {
  const url = getAuthUrl();
  return NextResponse.redirect(url);
}
