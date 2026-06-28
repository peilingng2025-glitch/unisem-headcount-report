import { list } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(null, { status: 503 });
  }

  try {
    const { blobs } = await list({ prefix: "published-report.json" });
    if (!blobs.length) return NextResponse.json(null, { status: 404 });

    const resp = await fetch(blobs[0].url, { cache: "no-store" });
    if (!resp.ok) return NextResponse.json(null, { status: 404 });

    const payload = await resp.json();
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}
