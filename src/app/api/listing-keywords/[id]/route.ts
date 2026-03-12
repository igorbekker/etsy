import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const KEYWORDS_FILE = path.join(process.cwd(), "data", "listing-keywords.json");

interface ListingKeywords {
  primary: string;
  secondary: [string, string];
}

type KeywordsStore = Record<string, ListingKeywords>;

const EMPTY: ListingKeywords = { primary: "", secondary: ["", ""] };

function readStore(): KeywordsStore {
  try {
    return JSON.parse(fs.readFileSync(KEYWORDS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeStore(store: KeywordsStore): void {
  fs.mkdirSync(path.dirname(KEYWORDS_FILE), { recursive: true });
  fs.writeFileSync(KEYWORDS_FILE, JSON.stringify(store, null, 2));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = readStore();
  return NextResponse.json(store[id] ?? EMPTY);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as ListingKeywords;
  const store = readStore();
  store[id] = {
    primary: body.primary ?? "",
    secondary: [body.secondary?.[0] ?? "", body.secondary?.[1] ?? ""],
  };
  writeStore(store);
  return NextResponse.json({ ok: true });
}
