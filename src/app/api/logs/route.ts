import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "data", "change-log.json");

export interface LogEntry {
  id: string;
  timestamp: string;
  listing_id: number;
  listing_title: string;
  field: string;
  image_index: number;
  image_id: number;
  old_value: string;
  new_value: string;
  reverted?: boolean;
}

function readLog(): LogEntry[] {
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeLog(entries: LogEntry[]): void {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.writeFileSync(LOG_FILE, JSON.stringify(entries, null, 2));
}

export async function GET() {
  const entries = readLog();
  return NextResponse.json({ entries: entries.reverse() });
}

type AppendBody = Omit<LogEntry, "id" | "timestamp" | "listing_title" | "image_index" | "image_id"> & {
  listing_title?: string;
  image_index?: number;
  image_id?: number;
};

export function appendLogEntry(body: AppendBody): void {
  const entry: LogEntry = {
    id: `${Date.now()}-${body.listing_id}-${body.image_index ?? 0}`,
    timestamp: new Date().toISOString(),
    listing_id: body.listing_id,
    listing_title: body.listing_title ?? "",
    field: body.field,
    image_index: body.image_index ?? 0,
    image_id: body.image_id ?? 0,
    old_value: body.old_value,
    new_value: body.new_value,
  };
  const entries = readLog();
  entries.push(entry);
  writeLog(entries);
}

export async function POST(request: NextRequest) {
  const body = await request.json() as AppendBody;
  appendLogEntry(body);
  return NextResponse.json({ ok: true });
}
