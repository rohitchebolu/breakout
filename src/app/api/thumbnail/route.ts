import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Proxies a YouTube thumbnail so it can be downloaded (cross-origin <a download>
// is blocked by browsers; a same-origin route with Content-Disposition isn't).
// Costs no API quota — it just fetches a public image.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    return new NextResponse("Invalid video id", { status: 400 });
  }

  // Prefer max-res; fall back to the always-present hqdefault.
  const candidates = [
    `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, {
        headers: {
          "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
          "Content-Disposition": `attachment; filename="${id}.jpg"`,
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch {
      // try next candidate
    }
  }

  return new NextResponse("Thumbnail not found", { status: 404 });
}
