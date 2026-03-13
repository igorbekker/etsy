import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CHECKLIST_FILE = path.join(process.cwd(), "data", "listing-checklist.json");

type ChecklistField = "title" | "tags" | "description" | "alt_text" | "attributes" | "photos" | "price";

interface ChecklistItem {
  done: boolean;
  pushed_at?: string;
}

type ListingChecklist = Record<ChecklistField, ChecklistItem>;
type ChecklistStore = Record<string, ListingChecklist>;

const FIELDS: ChecklistField[] = ["title", "tags", "description", "alt_text", "attributes", "photos", "price"];

function emptyChecklist(): ListingChecklist {
  return Object.fromEntries(FIELDS.map((f) => [f, { done: false }])) as ListingChecklist;
}

function readStore(): ChecklistStore {
  try {
    return JSON.parse(fs.readFileSync(CHECKLIST_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeStore(store: ChecklistStore): void {
  fs.mkdirSync(path.dirname(CHECKLIST_FILE), { recursive: true });
  fs.writeFileSync(CHECKLIST_FILE, JSON.stringify(store, null, 2));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = readStore();
  return NextResponse.json(store[id] ?? emptyChecklist());
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as { field: ChecklistField; done: boolean };
  if (!FIELDS.includes(body.field)) {
    return NextResponse.json({ error: "Invalid field" }, { status: 400 });
  }
  const store = readStore();
  const current = store[id] ?? emptyChecklist();
  current[body.field] = {
    done: body.done,
    ...(body.done ? { pushed_at: new Date().toISOString() } : {}),
  };
  store[id] = current;
  writeStore(store);
  return NextResponse.json({ ok: true });
}
