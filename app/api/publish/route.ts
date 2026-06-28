import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = { publishedAt: new Date().toISOString(), report: body };

    const { url } = await put("published-report.json", JSON.stringify(payload), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    return NextResponse.json({ success: true, url });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
