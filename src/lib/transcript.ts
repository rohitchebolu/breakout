// Best-effort YouTube transcript fetch — NO api key, NO dependency.
//
// Scrapes the watch page for its caption track, then pulls the JSON3 caption
// feed. Important caveat: YouTube blocks caption scraping from many datacenter
// IPs (so this often returns null on serverless hosts like Vercel), and plenty
// of videos have no captions at all. Callers MUST treat null as the normal case
// and fall back to title/description metadata.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const MAX_TRANSCRIPT_CHARS = 6000;

async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: { "user-agent": UA, "accept-language": "en-US,en;q=0.9" },
      cache: "no-store",
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface CaptionTrack {
  baseUrl: string;
  languageCode?: string;
  kind?: string; // "asr" == auto-generated
}

/**
 * Returns the video's transcript text (trimmed + length-capped) or null when
 * captions are unavailable / blocked. Prefers Telugu, then English, then the
 * first available track — the text is only fed to the analyzer, never shown.
 */
export async function fetchTranscript(videoId: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;

  const watch = await fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}&hl=en`, 5000);
  if (!watch?.ok) return null;

  const html = await watch.text().catch(() => "");
  const match = html.match(/"captionTracks":(\[.*?\])/);
  if (!match) return null;

  let tracks: CaptionTrack[];
  try {
    tracks = JSON.parse(match[1]);
  } catch {
    return null;
  }
  if (!Array.isArray(tracks) || tracks.length === 0) return null;

  const track =
    tracks.find((t) => t.languageCode?.startsWith("te")) ??
    tracks.find((t) => t.languageCode?.startsWith("en")) ??
    tracks[0];
  if (!track?.baseUrl) return null;

  // JSON.parse already decoded the URL's & escapes to real '&'.
  const caps = await fetchWithTimeout(`${track.baseUrl}&fmt=json3`, 5000);
  if (!caps?.ok) return null;

  let data: { events?: Array<{ segs?: Array<{ utf8?: string }> }> };
  try {
    data = await caps.json();
  } catch {
    return null;
  }

  const text = (data.events ?? [])
    .flatMap((e) => e.segs ?? [])
    .map((s) => s.utf8 ?? "")
    .join("")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return null;
  return text.length > MAX_TRANSCRIPT_CHARS ? `${text.slice(0, MAX_TRANSCRIPT_CHARS)}…` : text;
}
