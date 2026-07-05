// Minimal YouTube Data API v3 client. Server-only: it reads the API key from
// the environment and should never be imported into a client component.

const API = "https://www.googleapis.com/youtube/v3";

export interface RawVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  views: number;
  durationSeconds?: number;
  audioLanguage?: string;
}

export interface RawChannel {
  id: string;
  title: string;
  thumbnail?: string;
  subscribers?: number;
  videoCount?: number;
  totalViews?: number;
  uploadsPlaylistId?: string;
}

export interface TopicResult {
  videos: RawVideo[];
  /** channelId -> baseline (lifetime average views per video). */
  channelBaselines: Map<string, number>;
}

export class YouTubeError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "YouTubeError";
    this.status = status;
  }
}

export function hasApiKey(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new YouTubeError("YOUTUBE_API_KEY is not set.", 500);
  return key;
}

async function yt<T = Record<string, unknown>>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(`${API}/${path}`);
  url.searchParams.set("key", apiKey());
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      const reason = body?.error?.errors?.[0]?.reason;
      if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
        throw new YouTubeError(
          "YouTube API daily quota exceeded — try again tomorrow or use demo mode.",
          429,
        );
      }
      if (body?.error?.message) message = body.error.message;
    } catch (err) {
      if (err instanceof YouTubeError) throw err;
    }
    throw new YouTubeError(`YouTube API error: ${message}`, res.status);
  }
  return res.json() as Promise<T>;
}

function parseDuration(iso?: string): number | undefined {
  if (!iso) return undefined;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return undefined;
  const [, h, min, s] = m;
  return Number(h || 0) * 3600 + Number(min || 0) * 60 + Number(s || 0);
}

interface Thumbs {
  [size: string]: { url?: string } | undefined;
}
function bestThumb(thumbs?: Thumbs): string {
  if (!thumbs) return "";
  return (
    thumbs.medium?.url ||
    thumbs.high?.url ||
    thumbs.standard?.url ||
    thumbs.default?.url ||
    ""
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Resolves a channel from a URL, @handle, /user/ path, channel ID, or plain name.
 */
export async function resolveChannel(input: string): Promise<RawChannel> {
  const raw = input.trim();
  const part = "snippet,statistics,contentDetails";

  const idMatch = raw.match(/(UC[\w-]{22})/);
  const handleMatch = raw.match(/@([A-Za-z0-9._-]+)/);
  const userMatch = raw.match(/\/user\/([A-Za-z0-9._-]+)/);

  let lookup: Record<string, string>;
  if (idMatch) {
    lookup = { id: idMatch[1] };
  } else if (handleMatch) {
    lookup = { forHandle: handleMatch[1] };
  } else if (userMatch) {
    lookup = { forUsername: userMatch[1] };
  } else {
    // Fall back to a channel search by name.
    const search = await yt<{ items?: Array<{ id?: { channelId?: string }; snippet?: { channelId?: string } }> }>(
      "search",
      { part: "snippet", type: "channel", q: raw, maxResults: 1 },
    );
    const found = search.items?.[0]?.id?.channelId ?? search.items?.[0]?.snippet?.channelId;
    if (!found) throw new YouTubeError(`No channel found for "${raw}".`, 404);
    lookup = { id: found };
  }

  const data = await yt<{ items?: RawChannelItem[] }>("channels", { part, ...lookup });
  const item = data.items?.[0];
  if (!item) throw new YouTubeError(`No channel found for "${raw}".`, 404);

  return {
    id: item.id,
    title: item.snippet?.title ?? raw,
    thumbnail: bestThumb(item.snippet?.thumbnails),
    subscribers: numeric(item.statistics?.subscriberCount),
    videoCount: numeric(item.statistics?.videoCount),
    totalViews: numeric(item.statistics?.viewCount),
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads,
  };
}

/** Fetches the channel's most recent uploads with view counts. */
export async function getChannelVideos(channel: RawChannel, max = 50): Promise<RawVideo[]> {
  const playlistId = channel.uploadsPlaylistId;
  if (!playlistId) throw new YouTubeError("This channel has no public uploads.", 404);

  const videoIds: string[] = [];
  let pageToken: string | undefined;
  while (videoIds.length < max) {
    const page = await yt<{ items?: Array<{ contentDetails?: { videoId?: string } }>; nextPageToken?: string }>(
      "playlistItems",
      { part: "contentDetails", playlistId, maxResults: 50, pageToken },
    );
    for (const it of page.items ?? []) {
      if (it.contentDetails?.videoId) videoIds.push(it.contentDetails.videoId);
    }
    pageToken = page.nextPageToken;
    if (!pageToken) break;
  }

  return fetchVideos(videoIds.slice(0, max), channel.title);
}

const TELUGU_SCRIPT = /[ఀ-౿]/;

/** Whether a video is Telugu content — by audio language, script, or keyword. */
function isTeluguContent(v: RawVideo): boolean {
  const lang = (v.audioLanguage ?? "").toLowerCase();
  if (lang.startsWith("te")) return true;
  if (TELUGU_SCRIPT.test(v.title) || TELUGU_SCRIPT.test(v.channelTitle)) return true;
  return /telugu/i.test(v.title) || /telugu/i.test(v.channelTitle);
}

/** Searches for Telugu videos on a topic and computes each channel's baseline. */
export async function searchTopic(query: string, max = 25): Promise<TopicResult> {
  const search = await yt<{ items?: Array<{ id?: { videoId?: string } }> }>("search", {
    part: "snippet",
    type: "video",
    q: query,
    order: "relevance",
    // Over-fetch, since the Telugu post-filter below removes non-Telugu results.
    maxResults: 50,
    // Restrict to Telugu-region content for a regional creator tool.
    regionCode: "IN",
    relevanceLanguage: "te",
  });
  const ids = (search.items ?? [])
    .map((it) => it.id?.videoId)
    .filter((v): v is string => Boolean(v));
  if (ids.length === 0) throw new YouTubeError(`No videos found for "${query}".`, 404);

  // relevanceLanguage only biases the search — hard-filter to Telugu content
  // (audio language / script / keyword) so non-Telugu results never show.
  const found = await fetchVideos(ids);
  const videos = found.filter(isTeluguContent).slice(0, max);
  if (videos.length === 0) {
    throw new YouTubeError(
      `No Telugu videos found for "${query}". Try a Telugu search term.`,
      404,
    );
  }

  const channelIds = [...new Set(videos.map((v) => v.channelId).filter(Boolean))];
  const channelBaselines = new Map<string, number>();
  for (const group of chunk(channelIds, 50)) {
    const data = await yt<{ items?: RawChannelItem[] }>("channels", {
      part: "statistics",
      id: group.join(","),
    });
    for (const it of data.items ?? []) {
      const totalViews = numeric(it.statistics?.viewCount) ?? 0;
      const videoCount = numeric(it.statistics?.videoCount) ?? 0;
      channelBaselines.set(it.id, videoCount > 0 ? totalViews / videoCount : 1);
    }
  }
  return { videos, channelBaselines };
}

async function fetchVideos(ids: string[], fallbackChannelTitle = ""): Promise<RawVideo[]> {
  const videos: RawVideo[] = [];
  for (const group of chunk(ids, 50)) {
    const data = await yt<{ items?: RawVideoItem[] }>("videos", {
      part: "snippet,statistics,contentDetails",
      id: group.join(","),
    });
    for (const it of data.items ?? []) {
      videos.push({
        id: it.id,
        title: it.snippet?.title ?? "",
        thumbnail: bestThumb(it.snippet?.thumbnails),
        channelId: it.snippet?.channelId ?? "",
        channelTitle: it.snippet?.channelTitle ?? fallbackChannelTitle,
        publishedAt: it.snippet?.publishedAt ?? "",
        views: numeric(it.statistics?.viewCount) ?? 0,
        durationSeconds: parseDuration(it.contentDetails?.duration),
        audioLanguage: it.snippet?.defaultAudioLanguage ?? it.snippet?.defaultLanguage,
      });
    }
  }
  return videos;
}

function numeric(v?: string): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

interface RawChannelItem {
  id: string;
  snippet?: { title?: string; thumbnails?: Thumbs };
  statistics?: { subscriberCount?: string; videoCount?: string; viewCount?: string };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
}

interface RawVideoItem {
  id: string;
  snippet?: {
    title?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: Thumbs;
    defaultAudioLanguage?: string;
    defaultLanguage?: string;
  };
  statistics?: { viewCount?: string };
  contentDetails?: { duration?: string };
}
