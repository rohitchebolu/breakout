import { NextRequest, NextResponse } from "next/server";
import { getAnalytics } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Private to the owner: requires the admin token as a Bearer header. Fails CLOSED
// (401) when no token is configured, so stats are never exposed by accident.
function authorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_STATS_TOKEN || process.env.CRON_SECRET || "";
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json(await getAnalytics());
}
