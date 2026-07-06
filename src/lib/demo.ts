// Built-in sample data so the app is fully functional without an API key.
// Real public video IDs are used only so thumbnails render; the titles and
// view counts are illustrative Telugu-creator content. The same outlier math
// runs on this data.

import type { RawChannel, RawVideo, TopicResult } from "./youtube";

const DAY_MS = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();
const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

const IDS = [
  "dQw4w9WgXcQ", "9bZkp7q19f0", "kJQP7kiw5Fk", "OPf0YbXqDm0",
  "fJ9rUzIMcZQ", "hT_nvWreIhg", "CevxZvSJLk8", "JGwWNGJdvx8",
  "RgKAFK5djSk", "60ItHLz5WEA", "2Vv-BfVoq4g", "e-ORhEE9VVg",
  "kXYiU_JCYtU", "YQHsXMglC9A", "ktvTqknDobU", "09R8_2nJtjg",
  "lp-EO5I60KA",
];

function prettify(query: string): string {
  const q = query.replace(/https?:\/\/\S+/g, "").replace(/[@/]/g, " ").trim();
  if (!q) return "";
  return q
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function looksLikeUrlOrHandle(query: string): boolean {
  return /https?:|youtube\.com|youtu\.be|^@|UC[\w-]{22}/i.test(query.trim());
}

export function demoChannel(query: string): { channel: RawChannel; videos: RawVideo[] } {
  const name = looksLikeUrlOrHandle(query) ? "డెమో క్రియేటర్" : prettify(query) || "డెమో క్రియేటర్";
  const channelId = "UC0000000demochannel00";

  // [title, views, daysAgo, durationSeconds]
  // Long-form (durationSeconds > 60) and Shorts (<= 60) are scored against
  // separate baselines, so the viral Short below stays an outlier among Shorts
  // instead of masquerading as a ~85x long-form breakout.
  const specs: [string, number, number, number][] = [
    ["వైరల్ ₹100 vs ₹1,00,000 సెటప్ ట్రై చేశా", 612_000, 21, 934],
    ["అందరూ ఈ యాప్‌కి ఎందుకు మారుతున్నారు?", 318_000, 40, 712],
    ["ఈ ఒక్క మార్పు నా అవుట్‌పుట్‌ని రెట్టింపు చేసింది", 186_000, 33, 588],
    ["ప్రొడక్టివిటీ యాప్స్ గురించి నిజం", 47_000, 65, 803],
    ["నా నిజాయితీ 30 రోజుల రివ్యూ", 52_000, 90, 640],
    ["బిగినర్స్ చేసే పొరపాట్లు — నేను ముందే తెలుసుకుంటే బాగుండేది", 41_000, 110, 505],
    ["నా స్టార్టప్ బిల్డ్ చేస్తున్న ఒక సాధారణ రోజు", 38_000, 130, 1120],
    ["నా స్టూడియో + డెస్క్ సెటప్ టూర్ 2025", 61_000, 55, 470],
    ["మీ ప్రశ్నలకు సమాధానాలు", 29_000, 150, 1330],
    ["వీక్లీ అప్‌డేట్ #12", 33_000, 45, 384],
    ["వీకెండ్‌లో నా వెబ్‌సైట్ మళ్ళీ కట్టా", 44_000, 75, 690],
    ["నేను రోజూ వాడే టూల్స్", 58_000, 100, 560],
    ["గంటలు ఆదా చేసే క్విక్ టిప్", 71_000, 25, 240],
    ["నా లాస్ట్ ప్రాజెక్ట్ బిహైండ్ ద సీన్స్", 26_000, 200, 900],
    // Shorts (<= 60s):
    ["60 సెకన్ల ప్రొడక్టివిటీ హ్యాక్ #shorts", 4_200_000, 15, 33],
    ["10 లక్షల సబ్‌స్క్రైబర్లు 🎉 #shorts", 210_000, 30, 41],
    ["ఒక కామెంట్‌కి సమాధానం #shorts", 180_000, 60, 22],
  ];

  const videos: RawVideo[] = specs.map(([title, views, age, dur], i) => ({
    id: IDS[i % IDS.length],
    title,
    thumbnail: thumb(IDS[i % IDS.length]),
    channelId,
    channelTitle: name,
    publishedAt: daysAgo(age),
    views,
    durationSeconds: dur,
    description: `${title}\n\nSample demo description — add a YOUTUBE_API_KEY to see real video descriptions here.\n\n#telugu #youtube #shorts`,
  }));

  const channel: RawChannel = {
    id: channelId,
    title: name,
    thumbnail: thumb(IDS[0]),
    subscribers: 128_000,
    videoCount: specs.length,
    totalViews: videos.reduce((sum, v) => sum + v.views, 0),
  };

  return { channel, videos };
}

export function demoTopic(query: string): TopicResult {
  const topic = prettify(query) || "వైరల్ వీడియో ఐడియాలు";

  const channels = [
    { id: "UCdemoA", title: "పిక్సెల్ పీక్", baseline: 42_000 },
    { id: "UCdemoB", title: "డైలీ బిల్డ్", baseline: 95_000 },
    { id: "UCdemoC", title: "క్రియేటర్ ల్యాబ్", baseline: 15_000 },
    { id: "UCdemoD", title: "నోవా రివ్యూస్", baseline: 220_000 },
    { id: "UCdemoE", title: "ఇండీ సిగ్నల్", baseline: 8_000 },
  ];

  // [title, channelIndex, views, daysAgo]
  const specs: [string, number, number, number][] = [
    [`${topic}: అందరూ మాట్లాడుకుంటున్న వీడియో`, 2, 410_000, 12],
    [`ప్రతి ${topic} టెస్ట్ చేశా — మీరు చేయక్కర్లేదు`, 0, 260_000, 20],
    [`${topic} — నిజాయితీ ఫస్ట్ ఇంప్రెషన్స్`, 1, 140_000, 30],
    [`అందరూ తప్పుగా అర్థం చేసుకున్న ${topic}`, 3, 980_000, 8],
    [`నిజంగా పని చేసే 5 ${topic} ఐడియాలు`, 0, 88_000, 45],
    [`${topic} 2025లో: ఏం మారింది?`, 1, 205_000, 18],
    [`${topic} ఇప్పుడు ఎందుకు వైరల్ అవుతోంది?`, 4, 96_000, 6],
    [`${topic}: బిగినర్ vs ప్రో`, 3, 300_000, 60],
    [`నా ${topic} సెటప్ (ఫుల్ బ్రేక్‌డౌన్)`, 0, 51_000, 70],
    [`${topic} టైర్ లిస్ట్`, 1, 120_000, 25],
    [`మంచి క్వాలిటీ ఉన్న చౌక ${topic}`, 4, 62_000, 10],
    [`${topic}: 30 రోజుల తర్వాత`, 3, 175_000, 90],
  ];

  const videos: RawVideo[] = specs.map(([title, ch, views, age], i) => ({
    id: IDS[i % IDS.length],
    title,
    thumbnail: thumb(IDS[i % IDS.length]),
    channelId: channels[ch].id,
    channelTitle: channels[ch].title,
    publishedAt: daysAgo(age),
    views,
    durationSeconds: 300 + ((i * 173) % 900),
  }));

  const channelBaselines = new Map<string, number>();
  for (const c of channels) channelBaselines.set(c.id, c.baseline);

  return { videos, channelBaselines };
}
