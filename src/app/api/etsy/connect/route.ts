import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/etsy-client";

export async function GET() {
  return NextResponse.redirect(getAuthUrl());
}
