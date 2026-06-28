import { list, download } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "published-report.json" });
    if (!blobs.length) return NextResponse.json(null, { status: 404 });

    const resp = await download(blobs[0].url);
    const payload = await resp.json();
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}
