import { NextRequest, NextResponse } from "next/server";
import { updateListingProperty } from "@/lib/etsy-client";
import { appendLogEntry } from "@/app/api/logs/route";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; propertyId: string }> }
) {
  const { id, propertyId } = await params;
  const listingId = parseInt(id, 10);
  const propId = parseInt(propertyId, 10);
  if (isNaN(listingId) || isNaN(propId)) {
    return NextResponse.json({ error: "Invalid listing or property ID" }, { status: 400 });
  }

  let body: { value_ids: number[]; values: string[]; property_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.value_ids) || !Array.isArray(body.values)) {
    return NextResponse.json({ error: "value_ids and values arrays required" }, { status: 400 });
  }

  try {
    await updateListingProperty(listingId, propId, body.value_ids, body.values);

    // Log to change log
    try {
      appendLogEntry({
        listing_id: listingId,
        field: `attribute:${body.property_name ?? propId}`,
        old_value: "",
        new_value: body.values.join(", "),
      });
    } catch { /* log failure is non-fatal */ }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg.includes("Resource not found") || msg.includes("not_connected") || msg.includes("Not connected")) {
      return NextResponse.json(
        { error: "Permission denied — re-authorize at /api/etsy/connect to grant listings_w scope" },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
