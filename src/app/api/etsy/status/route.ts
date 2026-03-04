import { NextResponse } from "next/server";
import { isConnected } from "@/lib/etsy-client";
import { DEMO_MODE } from "@/lib/mock-data";

export async function GET() {
  if (DEMO_MODE) {
    return NextResponse.json({ connected: true });
  }
  const connected = await isConnected();
  return NextResponse.json({ connected });
}
