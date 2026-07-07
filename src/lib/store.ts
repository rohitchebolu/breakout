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
  if (hasRedis) {
    try {
      return (await redis(["GET", key])) as string | null;
    } catch {
      // Redis unreachable — fall back to the per-instance cache below.
    }
  }
  return memGet(key);
}

export async function cacheSet(key: string, value: string, ttlSec: number): Promise<void> {
  if (hasRedis) {
    try {
      await redis(["SET", key, value, "EX", ttlSec]);
      return;
    } catch {
      // Redis unreachable — write to the per-instance cache instead.
    }
  }
  memSet(key, value, ttlSec);
}

export interface RateResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

/** Per-instance token bucket — used directly (no Redis) and as the fallback. */
function memRate(key: string, limit: number, windowSec: number): RateResult {
  const now = Date.now();
  const e = mem.get(key);
  if (!e || now > e.expiresAt) {
    mem.set(key, { value: "1", expiresAt: now + windowSec * 1000 });
    return { allowed: true, remaining: limit - 1, limit };
  }
  const count = Number(e.value) + 1;
  e.value = String(count);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), limit };
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateResult> {
  if (hasRedis) {
    try {
      const count = Number(await redis(["INCR", key]));
      if (count === 1) await redis(["EXPIRE", key, windowSec]);
      return { allowed: count <= limit, remaining: Math.max(0, limit - count), limit };
    } catch {
      // Redis unreachable — fall back to the per-instance limiter below so an
      // outage bounds cost per instance instead of failing fully open.
    }
  }
  return memRate(key, limit, windowSec);
}

/**
 * Best-effort client IP for rate-limiting. Prefers Vercel's single-value
 * x-real-ip over x-forwarded-for (whose first entry a client can pre-seed).
 * IP-based limits are inherently best-effort — a determined actor can rotate.
 */
export function clientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "local";
}

const LLM_DAILY_BUDGET = Number(process.env.LLM_DAILY_BUDGET) || 800;

/**
 * Global (all-IP) daily ceiling on LLM calls — a hard backstop so no amount of
 * distributed traffic can fully drain the provider's free quota or run away.
 * Returns true when a call fits in today's budget. Set LLM_DAILY_BUDGET to tune.
 * (Truly global while Redis is up; per-instance during a Redis outage.)
 */
export async function consumeLlmBudget(): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const res = await rateLimit(`budget:llm:${day}`, LLM_DAILY_BUDGET, 60 * 60 * 26);
  return res.allowed;
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

// --- analytics counters --------------------------------------------------------

async function redisPipeline(commands: (string | number)[][]): Promise<void> {
  const res = await fetch(`${REDIS_URL as string}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis pipeline ${res.status}`);
}

function memIncr(key: string): void {
  const e = mem.get(key);
  if (e && Date.now() <= e.expiresAt) e.value = String(Number(e.value) + 1);
  else mem.set(key, { value: "1", expiresAt: Number.MAX_SAFE_INTEGER });
}

/** Increment a batch of analytics counters. Never throws — analytics is best-effort. */
export async function bumpCounters(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    if (hasRedis) await redisPipeline(keys.map((k) => ["INCR", k]));
    else keys.forEach(memIncr);
  } catch {
    // analytics must never break a request
  }
}

/** Read a batch of counters; 0 for any missing key. */
export async function readCounters(keys: string[]): Promise<number[]> {
  if (keys.length === 0) return [];
  try {
    if (hasRedis) {
      const res = (await redis(["MGET", ...keys])) as (string | null)[] | null;
      return (res ?? []).map((v) => Number(v) || 0);
    }
    return keys.map((k) => Number(memGet(k)) || 0);
  } catch {
    return keys.map(() => 0);
  }
}
