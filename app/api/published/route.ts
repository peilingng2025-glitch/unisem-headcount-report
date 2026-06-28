import { list, get } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "published-report.json" });
    if (!blobs.length) return NextResponse.json(null, { status: 404 });

    const result = await get(blobs[0].url, { access: "private" });
    if (!result) return NextResponse.json(null, { status: 404 });

    const payload = await new Response(result.stream).json();
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
