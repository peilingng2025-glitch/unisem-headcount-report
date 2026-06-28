import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { success: false, error: "BLOB_READ_WRITE_TOKEN is not configured. Set it up in your Vercel project → Storage → Blob." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const payload = { publishedAt: new Date().toISOString(), report: body };

    const { url } = await put("published-report.json", JSON.stringify(payload), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    return NextResponse.json({ success: true, url });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
