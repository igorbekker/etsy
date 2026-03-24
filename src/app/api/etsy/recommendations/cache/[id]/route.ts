import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { AIRecommendations } from "@/lib/ai-suggestions";

const CACHE_FILE = path.join(process.cwd(), "data", "listing-recommendations.json");

interface CacheEntry {
  recommendations: AIRecommendations;
  generatedAt: string;
}

type CacheStore = Record<string, CacheEntry>;

function readStore(): CacheStore {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeStore(store: CacheStore): void {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = readStore();
  return NextResponse.json(store[id] ?? { recommendations: null });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as { recommendations: AIRecommendations };
  const store = readStore();
  store[id] = { recommendations: body.recommendations, generatedAt: new Date().toISOString() };
  writeStore(store);
  return NextResponse.json({ ok: true });
}
