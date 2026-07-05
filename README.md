# Breakout — made for Telugu creators

A focused micro-SaaS that recreates the signature feature of [1of10](https://1of10.com/app): **finding YouTube outliers** — the videos that dramatically beat a channel's normal view count.

Instead of staring at raw view counts (which just reward big channels), Breakout normalizes for channel size and surfaces the *breakouts*: the 1 video in 10 that popped. That's the fastest way to reverse-engineer which ideas, titles, and thumbnails actually work in a niche.

<br>

## What it does

- **Channel mode** — paste a channel URL, `@handle`, or name and see every recent upload ranked by how far it beat the channel's baseline.
- **Topic mode** — search any topic across YouTube and find the outliers relative to each creator's own average.
- **Outlier score** — every video gets a multiplier badge (e.g. `7.3x`) color-coded by tier.
- **Filter & sort** — filter to `2x+ / 3x+ / 5x+ / 10x+` and sort by outlier score, views, or recency.
- **Shareable results** — the search is encoded in the URL.
- **Demo mode** — runs fully without an API key using built-in sample data.
- **Telugu-first & bilingual** — full తెలుగు UI with an **EN ⇄ తె** toggle (defaults to Telugu), **lakh/crore** view counts (12.4 లక్షలు), Telugu creator/topic examples, and Telugu-region (`regionCode=IN`, `relevanceLanguage=te`) topic search.

<br>

## How the outlier score works

```
outlier score = video views ÷ channel baseline
```

- **Baseline** is the **median** views of the channel's recent uploads. Median (not mean) is used so one past viral hit doesn't inflate the bar.
- A `10x` from a 10K-average channel is treated as just as significant as a `10x` from a 1M-average channel.

**Channel mode uses three accuracy upgrades** (see `src/lib/outliers.ts`):

1. **Age adjustment** — each video's views are projected to their estimated *mature* total via a saturating maturity curve (`maturityFraction`), so a 2-week-old breakout isn't penalized for being new and can be spotted early. Floored so brand-new videos aren't over-projected.
2. **Log-space robust stats** — the baseline is the **geometric** median and the spread is the **MAD** (median absolute deviation) of `ln(views)`, because view counts are log-normal. This also yields a **modified z-score** (`> 3.5` = a true statistical outlier), exposed as `modifiedZ`.
3. **Shorts vs long-form split** — Shorts (≤ 60s) and long-form videos get **separate baselines**, so a viral Short can't masquerade as a huge long-form outlier.

| Tier | Multiplier | Meaning |
| --- | --- | --- |
| Normal | < 2x | Typical performance |
| Above avg | 2–3x | Slightly outperformed |
| Outlier | 3–5x | Genuinely broke out |
| Strong | 5–10x | Big hit |
| Breakout 🔥 | 10x+ | Viral relative to the channel |

Most creators focus on **3x+** — below that tends to be noise.

<br>

## Voice & tone — the Telugu (code-mixed) register

Most apps localize into one of two camps: **English UI** (consistency) or **fully-translated regional UI** (accessibility). Breakout's Telugu audience — young, online Telugu creators — actually communicates in **Tenglish** (code-mixed Telugu-English, e.g. *"squad ready aa?"*, *"match start ayindi"*). So the `te` locale is deliberately code-mixed, with a **register split by surface**:

| Surface | Register | Example |
| --- | --- | --- |
| Personality — hero, buttons, empty/error states, hints, explainer | **Casual Tenglish** | `Viral అయిన వీడియోలు కనుక్కో`, `అయ్యో, results రాలేదు 😕` |
| Functional — stats, filters, sort, counts, data labels | **Clean** | `బేస్‌లైన్ వ్యూస్`, `టాప్ మల్టిప్లయర్` |
| WhatsApp share caption | **Romanized Tenglish** | `🔥 Ee video 47x outlier ra! Ela viral ayindo chudu 👇` |

Rules for staying consistent (in `src/lib/i18n.ts`):

- **Domain nouns stay English** (in Telugu script or Latin): views/`వ్యూస్`, outlier/`అవుట్‌లయర్`, baseline, channel/`ఛానెల్`, topic, score, format.
- **Verbs & emotion in casual Telugu** — informal imperatives (`చెయ్`, `చూపించు`, `వెతుకు`, `కనుక్కో`), not formal ones (`చేయండి`).
- **Emoji only on hype/empty/error surfaces**, sparingly. Never on data labels.
- The **English (`en`) locale stays professional** — it's the clean contrast, not code-mixed.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It works immediately in **demo mode**.

### Enable live data

1. Copy the env template:
   ```bash
   cp .env.example .env.local
   ```
2. Get a **YouTube Data API v3** key from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (enable "YouTube Data API v3", then create an API key).
3. Paste it into `.env.local`:
   ```
   YOUTUBE_API_KEY=your_key_here
   ```
4. Restart `npm run dev`. The header badge flips from **Demo data** to **Live**.

<br>

## Deploy to Vercel

```bash
vercel
```

Then add `YOUTUBE_API_KEY` in your Vercel project's Environment Variables (or `vercel env add YOUTUBE_API_KEY`).

<br>

## Project structure

```
src/
  app/
    page.tsx              # UI: search, filters, results, states
    layout.tsx            # Metadata + fonts
    globals.css           # Dark theme
    api/outliers/route.ts # Live + demo outlier API
  components/
    SearchBar.tsx         # Mode toggle, input, examples
    StatsSummary.tsx      # Channel/topic summary + stat tiles
    ResultsGrid.tsx       # Card grid + loading skeleton
    VideoCard.tsx         # Thumbnail, title, outlier badge
    OutlierBadge.tsx      # Color-coded multiplier pill
  lib/
    youtube.ts            # YouTube Data API v3 client (server only)
    outliers.ts           # median, baseline, tier classification
    demo.ts               # Built-in sample dataset
    format.ts             # Number/date formatting
    tiers.ts              # Tier colors + labels
    types.ts              # Shared types
```

<br>

## Caching & rate limiting

The YouTube Data API free tier is **10,000 units/day per key, shared across all visitors** — and topic search costs 100 units each (~100 topic searches/day total). To make the app viable on a public domain, `/api/outliers` has two guards (`src/lib/store.ts`):

- **Caching** — live results are cached by `(mode, query)` for 6h, so repeat searches cost **0 units**. Where the same channels/topics get searched repeatedly, this is a 10–50× multiplier on effective capacity.
- **Per-IP rate limit** — each IP gets 30 uncached (quota-spending) searches per 24h; cache hits don't count. Stops one visitor draining the shared pool.

Both use **Upstash Redis** when `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are set (needed in production so state is shared across serverless instances), and fall back to an **in-memory store** for local dev. YouTube's own quota-exceeded error is still handled gracefully as a final backstop.

## Notes & limits

- **Quota**: the YouTube Data API has a default daily quota of 10,000 units. Channel mode is cheap; topic search (`search.list`) costs 100 units per query, so heavy use can exhaust the free quota. Quota errors fall back to a clear message.
- **Topic baseline**: topic mode compares each video to its channel's *lifetime* average (one cheap `channels.list` call) rather than a recent median — a reasonable approximation that keeps quota low. The age-adjustment, log/MAD, and Shorts-split upgrades apply to **channel mode**, which has the full upload list to work from.
- **Shorts can dominate topic mode**: because the lifetime average blends Shorts and long-form, a single Short (which structurally out-views a channel's long-form average) can score very high. Filter by format, or use channel mode for format-accurate scoring. A proper fix is a per-channel *recent-median* baseline in topic mode (costs more quota).

<br>

## Possible next features

- Save videos to a swipe file / collection
- Thumbnail & title breakdown for a selected outlier
- Track a channel over time and alert on new breakouts
- Niche/keyword explorer with multi-channel aggregation

<br>

Built with Next.js 16, React 19, and Tailwind CSS v4.
