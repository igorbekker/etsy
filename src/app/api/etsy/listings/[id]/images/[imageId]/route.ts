import { NextRequest, NextResponse } from "next/server";
import { updateListingImageAltText } from "@/lib/etsy-client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { id, imageId } = await params;
  const listingId = parseInt(id, 10);
  const imageIdNum = parseInt(imageId, 10);

  if (isNaN(listingId) || isNaN(imageIdNum)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await request.json() as { alt_text: string };
  if (typeof body.alt_text !== "string") {
    return NextResponse.json({ error: "alt_text required" }, { status: 400 });
  }

  try {
    await updateListingImageAltText(listingId, imageIdNum, body.alt_text);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("not_connected")) {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
