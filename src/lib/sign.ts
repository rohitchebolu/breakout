// HMAC over a video ID, attached to every result we serve and required by
// /api/analyze. This bounds the analyze surface to videos WE actually surfaced:
// an attacker can't forge a sig for an arbitrary ID without the secret, and the
// public sigs don't expose it (HMAC is one-way). Falls back to a no-op when no
// secret is configured (local/demo) — disabling the check rather than breaking.

import { createHmac, timingSafeEqual } from "crypto";

const SIG_LEN = 24;

function secret(): string {
  return process.env.ANALYZE_SIGNING_SECRET || process.env.CRON_SECRET || "";
}

function hmac(id: string, key: string): string {
  return createHmac("sha256", key).update(id).digest("base64url").slice(0, SIG_LEN);
}

/** Sign a video ID (undefined when no secret is configured). */
export function signVideo(id: string): string | undefined {
  const key = secret();
  return key ? hmac(id, key) : undefined;
}

/** Verify a video's sig. Returns true (check disabled) when no secret is set. */
export function verifyVideoSig(id: string, sig: string | undefined): boolean {
  const key = secret();
  if (!key) return true;
  if (!sig) return false;
  const expected = hmac(id, key);
  if (sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
