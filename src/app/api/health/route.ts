import { NextResponse } from "next/server";
import { hasApiKey } from "@/lib/youtube";
import { ping, storeBackend } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Quick status probe: which cache/rate-limit backend is active and reachable.
export async function GET() {
  const store = storeBackend();
  const ok = await ping();
  return NextResponse.json({
    ok,
    store, // "redis" when Upstash is configured & reachable, else "memory"
    youtubeKey: hasApiKey(),
  });
}
