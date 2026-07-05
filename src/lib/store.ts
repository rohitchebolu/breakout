// Lightweight KV for caching + rate limiting. Server-only — import from routes.
//
// Uses Upstash Redis (via its REST API, no SDK dependency) when configured;
// otherwise falls back to an in-memory store. The fallback is fine for local
// dev / a single instance, but does NOT share state across serverless
// instances, so set the Upstash env vars in production.

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasRedis = Boolean(REDIS_URL && REDIS_TOKEN);

async function redis(command: (string | number)[]): Promise<unknown> {
  const res = await fetch(REDIS_URL as string, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  const data = (await res.json()) as { result?: unknown; error?: string };
  if (data.error) throw new Error(data.error);
  return data.result ?? null;
}

// --- in-memory fallback --------------------------------------------------------

interface Entry {
  value: string;
  expiresAt: number;
}
const mem = new Map<string, Entry>();
const MEM_MAX = 500;

function memGet(key: string): string | null {
  const e = mem.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    mem.delete(key);
    return null;
  }
  return e.value;
}

function memSet(key: string, value: string, ttlSec: number): void {
  if (mem.size >= MEM_MAX && !mem.has(key)) {
    const now = Date.now();
    for (const [k, v] of mem) if (v.expiresAt < now) mem.delete(k);
    if (mem.size >= MEM_MAX) {
      const oldest = mem.keys().next().value;
      if (oldest) mem.delete(oldest);
    }
  }
  mem.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

// --- public API ----------------------------------------------------------------

export async function cacheGet(key: string): Promise<string | null> {
  try {
    return hasRedis ? ((await redis(["GET", key])) as string | null) : memGet(key);
  } catch {
    return null; // fail-open: treat store errors as a cache miss
  }
}

export async function cacheSet(key: string, value: string, ttlSec: number): Promise<void> {
  try {
    if (hasRedis) await redis(["SET", key, value, "EX", ttlSec]);
    else memSet(key, value, ttlSec);
  } catch {
    // ignore cache write failures — never break a request over the cache
  }
}

export interface RateResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateResult> {
  try {
    if (hasRedis) {
      const count = Number(await redis(["INCR", key]));
      if (count === 1) await redis(["EXPIRE", key, windowSec]);
      return { allowed: count <= limit, remaining: Math.max(0, limit - count), limit };
    }
    const now = Date.now();
    const e = mem.get(key);
    if (!e || now > e.expiresAt) {
      mem.set(key, { value: "1", expiresAt: now + windowSec * 1000 });
      return { allowed: true, remaining: limit - 1, limit };
    }
    const count = Number(e.value) + 1;
    e.value = String(count);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), limit };
  } catch {
    return { allowed: true, remaining: limit, limit }; // fail-open
  }
}

/** Which backend is active: "redis" when Upstash is configured, else "memory". */
export function storeBackend(): "redis" | "memory" {
  return hasRedis ? "redis" : "memory";
}

/** Health check — verifies Redis is reachable (always true for the memory fallback). */
export async function ping(): Promise<boolean> {
  try {
    if (!hasRedis) return true;
    return (await redis(["PING"])) === "PONG";
  } catch {
    return false;
  }
}
