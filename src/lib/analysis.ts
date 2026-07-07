// LLM breakdown of a breakout video + category trends.
//
// Multiple free providers, first configured wins (Groq → NVIDIA → Gateway →
// Gemini). All but Gemini speak the OpenAI Chat Completions format, so they
// share one code path; each model is overridable via its *_MODEL env var:
//   • GROQ_API_KEY        — Groq (console.groq.com, free, ~1s, no card) — best fit
//   • NVIDIA_API_KEY      — NVIDIA NIM (free, no card; big models often overloaded)
//   • AI_GATEWAY_API_KEY  — Vercel AI Gateway (needs a card on file)
//   • GEMINI_API_KEY      — Google Gemini (free, but only ~20 requests/day)
// Raw fetch, no SDK (same approach as store.ts). Cached hard in the routes.

import type { Lang } from "./i18n";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

/** The structured breakdown shown in the video modal. */
export interface VideoAnalysis {
  /** What grabs attention up front (title + first seconds). */
  hook: string;
  /** Why this beat the channel's usual views. */
  whyItWorked: string;
  /** What the title does well + one improvement. */
  titleCritique: string;
  /** Likely thumbnail read + a tip. */
  thumbnailCritique: string;
  /** 3–5 content beats. */
  outline: string[];
  /** 2–4 copyable lessons. */
  takeaways: string[];
}

export interface AnalysisInput {
  title: string;
  description?: string;
  channelTitle: string;
  views: number;
  baseline: number;
  outlierScore: number;
  format?: "short" | "long";
  publishedAt: string;
  transcript?: string | null;
}

/** True when at least one analysis provider is configured. */
export function analysisConfigured(): boolean {
  return resolveProvider() !== null;
}

// --- prompt -----------------------------------------------------------------

function languageRule(lang: Lang): string {
  return lang === "te"
    ? 'Write every value in Tenglish (code-mixed Telugu) using the TELUGU SCRIPT — do NOT romanize Telugu into Latin letters. Telugu words, grammar and verbs go in Telugu script (అఆఇ…); keep ONLY genuine domain/English words (title, thumbnail, hook, views, retention, algorithm, audience, intro, CTA) in the Latin alphabet, the way Telugu YouTubers actually type. Warm, casual, direct. Example register: "ఈ video hook చాలా strong గా ఉంది, first 3 seconds లోనే audience ని pull చేసింది."'
    : "Write every value in clear, simple English aimed at a YouTube creator. No jargon, no fluff.";
}

function systemPrompt(lang: Lang): string {
  return [
    "You are a YouTube growth analyst helping a Telugu creator learn from a video that outperformed its own channel.",
    "Return ONLY a JSON object (no prose, no markdown fences) with exactly these keys:",
    '"hook" (string), "whyItWorked" (string), "titleCritique" (string), "thumbnailCritique" (string), "outline" (array of 3-5 short strings), "takeaways" (array of 2-4 short strings).',
    "Each string must be tight and specific to THIS video — one or two sentences, no generic advice.",
    languageRule(lang),
  ].join(" ");
}

function userPrompt(v: AnalysisInput): string {
  const fmt = v.format === "short" ? "YouTube Short (under 60s)" : "long-form video";
  const lines = [
    `Channel: ${v.channelTitle}`,
    `Title: ${v.title}`,
    `Views: ${Math.round(v.views).toLocaleString("en-IN")} — about ${v.outlierScore.toFixed(1)}x the channel's usual ~${Math.round(v.baseline).toLocaleString("en-IN")} views, so it's a genuine outlier.`,
    `Format: ${fmt}`,
    `Published: ${v.publishedAt}`,
  ];
  if (v.description?.trim()) {
    lines.push(`Description:\n${v.description.trim().slice(0, 1500)}`);
  }
  lines.push(
    v.transcript
      ? `Transcript (may be auto-generated, possibly Telugu):\n${v.transcript}`
      : "Transcript: not available — infer the content from the title and description.",
  );
  lines.push(
    "",
    "Analyze why it broke out and what a creator can copy. For thumbnailCritique, infer the likely thumbnail from the title/topic. Base the outline on the transcript if present, otherwise the title and description.",
  );
  return lines.join("\n");
}

// --- parsing ----------------------------------------------------------------

function extractJson(raw: string): Record<string, unknown> {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) text = text.slice(start, end + 1);
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("Could not parse the model response.");
  }
}

const asStr = (val: unknown): string => (typeof val === "string" ? val.trim() : "");
const asArr = (val: unknown): string[] =>
  Array.isArray(val) ? val.map(asStr).filter(Boolean).slice(0, 6) : [];

function coerce(raw: string): VideoAnalysis {
  const obj = extractJson(raw);
  return {
    hook: asStr(obj.hook),
    whyItWorked: asStr(obj.whyItWorked),
    titleCritique: asStr(obj.titleCritique),
    thumbnailCritique: asStr(obj.thumbnailCritique),
    outline: asArr(obj.outline),
    takeaways: asArr(obj.takeaways),
  };
}

// --- providers --------------------------------------------------------------

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface OpenAICompatConfig {
  label: string;
  baseUrl: string; // ".../v1"
  key: string;
  model: string;
}

/**
 * The active provider — first configured wins (Groq → NVIDIA → Vercel Gateway →
 * Gemini). Each model is overridable via its *_MODEL env var.
 */
function resolveProvider(): OpenAICompatConfig | "gemini" | null {
  const groq = process.env.GROQ_API_KEY;
  if (groq) {
    return {
      label: "Groq",
      baseUrl: "https://api.groq.com/openai/v1",
      key: groq,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    };
  }
  const nvidia = process.env.NVIDIA_API_KEY;
  if (nvidia) {
    return {
      label: "NVIDIA NIM",
      baseUrl: "https://integrate.api.nvidia.com/v1",
      key: nvidia,
      model: process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct",
    };
  }
  const gateway = process.env.AI_GATEWAY_API_KEY;
  if (gateway) {
    return {
      label: "Vercel AI Gateway",
      baseUrl: "https://ai-gateway.vercel.sh/v1",
      key: gateway,
      model: process.env.ANALYSIS_MODEL || "anthropic/claude-haiku-4.5",
    };
  }
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

/** OpenAI-compatible Chat Completions call, with retry on 429/503. */
async function callOpenAICompatible(
  cfg: OpenAICompatConfig,
  system: string,
  user: string,
): Promise<string> {
  const payload = JSON.stringify({
    model: cfg.model,
    temperature: 0.4,
    max_tokens: 1024,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  let lastErr = "unknown error";
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(1500 * 2 ** (attempt - 1)); // 1.5s, 3s, 6s
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.key}` },
      cache: "no-store",
      body: payload,
    });

    if (res.ok) {
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content ?? "";
      if (!content) throw new Error(`Empty response from ${cfg.label}.`);
      return content;
    }

    lastErr = `${cfg.label} ${res.status} ${(await res.text().catch(() => "")).slice(0, 150)}`;
    if (res.status !== 429 && res.status !== 503) break; // non-transient — stop
  }
  throw new Error(`Analysis failed. ${lastErr}`);
}

async function callGemini(system: string, user: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY as string;
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const url = `${GEMINI_BASE}/${model}:generateContent`;
  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      // Disable "thinking" so the whole token budget goes to the answer.
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  let lastErr = "unknown error";
  // Retry on 429 (rate limit) / 503 (overloaded) with exponential backoff — the
  // free Gemini tier has low RPM and the daily cron issues several calls.
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(1500 * 2 ** (attempt - 1)); // 1.5s, 3s, 6s
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      cache: "no-store",
      body: payload,
    });

    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
      if (!text) throw new Error("Empty analysis response.");
      return text;
    }

    lastErr = `${res.status} ${(await res.text().catch(() => "")).slice(0, 150)}`;
    if (res.status !== 429 && res.status !== 503) break; // non-transient — stop
  }
  throw new Error(`Analysis failed. ${lastErr}`);
}

async function callProvider(system: string, user: string): Promise<string> {
  const provider = resolveProvider();
  if (!provider) throw new Error("No analysis provider configured.");
  if (provider === "gemini") return callGemini(system, user);
  return callOpenAICompatible(provider, system, user);
}

export async function analyzeVideo(input: AnalysisInput, lang: Lang): Promise<VideoAnalysis> {
  return coerce(await callProvider(systemPrompt(lang), userPrompt(input)));
}

// --- category trend ---------------------------------------------------------

/** The trending topic in a category, derived from its current breakouts. */
export interface CategoryTrend {
  /** Punchy 2–5 word headline. */
  topic: string;
  /** One sentence on what's trending and why. */
  summary: string;
}

/**
 * The single biggest trend across a category's breakouts, in BOTH languages
 * from ONE model call (keeps the daily cron well under free-tier rate limits).
 */
export async function findCategoryTrend(
  categoryLabel: string,
  titles: string[],
): Promise<{ en: CategoryTrend; te: CategoryTrend }> {
  const system = [
    `You spot content trends on Telugu YouTube. Below are the current breakout (viral) video titles in the "${categoryLabel}" category.`,
    "Identify the SINGLE biggest trending topic/theme across them right now.",
    'Return ONLY a JSON object shaped exactly like {"en":{"topic":"","summary":""},"te":{"topic":"","summary":""}}.',
    "topic = a punchy 2-5 word headline; summary = one sentence on what is trending and why.",
    'The "en" values are in clear, simple English.',
    'The "te" values are in Tenglish using the TELUGU SCRIPT — do NOT romanize Telugu into Latin. Telugu words and grammar in Telugu script; keep ONLY English/domain words (sale, deals, gadget, title, views, trending) in the Latin alphabet. Example: "ఈ category లో smartphone deals గురించి చాలా buzz ఉంది."',
  ].join(" ");
  const user = `Breakout titles:\n${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
  const obj = extractJson(await callProvider(system, user));
  const pick = (v: unknown): CategoryTrend => {
    const o = (v ?? {}) as Record<string, unknown>;
    return { topic: asStr(o.topic), summary: asStr(o.summary) };
  };
  return { en: pick(obj.en), te: pick(obj.te) };
}
