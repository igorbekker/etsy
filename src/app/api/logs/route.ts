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

export async function POST(request: NextRequest) {
  const body = await request.json() as Omit<LogEntry, "id" | "timestamp">;
  const entry: LogEntry = {
    id: `${Date.now()}-${body.listing_id}-${body.image_index}`,
    timestamp: new Date().toISOString(),
    ...body,
  };
  const entries = readLog();
  entries.push(entry);
  writeLog(entries);
  return NextResponse.json({ ok: true, id: entry.id });
}
