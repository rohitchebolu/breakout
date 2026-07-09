import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/store";
import { isSentiment, MESSAGE_MAX, saveFeedback, type Sentiment } from "@/lib/feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Feedback is cheap to store, but an open write endpoint is a spam target — cap
// submissions per IP per day. Generous enough that a real user never hits it.
const RATE_LIMIT = 12;
const RATE_WINDOW_SECONDS = 60 * 60 * 24;
const PATH_MAX = 120;

export async function POST(req: NextRequest) {
  let body: {
    sentiment?: unknown;
    message?: unknown;
    lang?: unknown;
    path?: unknown;
    website?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: a hidden field real users never fill. Accept silently so a bot
  // can't tell it was filtered, but drop the submission.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const sentiment: Sentiment | null = isSentiment(body.sentiment) ? body.sentiment : null;
  const message =
    typeof body.message === "string" ? body.message.trim().slice(0, MESSAGE_MAX) : "";

  // Require at least a rating or a note — nothing to record otherwise.
  if (!sentiment && !message) {
    return NextResponse.json({ error: "Pick a rating or write a note." }, { status: 400 });
  }

  const lang = body.lang === "te" ? "te" : "en";
  const path = typeof body.path === "string" ? body.path.slice(0, PATH_MAX) : "";

  const rl = await rateLimit(`feedback:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Thanks — that's a lot of feedback today! Please try again tomorrow." },
      { status: 429 },
    );
  }

  await saveFeedback({ sentiment, message, lang, path, at: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
