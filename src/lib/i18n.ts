import type { OutlierTier } from "./types";

export type Lang = "en" | "te";

export interface Dict {
  // header
  tagline: string;
  demoData: string;
  live: string;
  // hero
  heroLead: string;
  heroHighlight: string;
  heroTrail: string;
  heroSubtitle: string;
  // search bar
  modeChannel: string;
  modeTopic: string;
  channelHint: string;
  topicHint: string;
  findOutliers: string;
  analyzing: string;
  tryLabel: string;
  channelExamples: string[];
  topicExamples: string[];
  // filters / sort
  filterAll: string;
  fmtAll: string;
  fmtLong: string;
  fmtShort: string;
  sortLabel: string;
  sortOutlier: string;
  sortViews: string;
  sortRecent: string;
  noMatch: string;
  demoBannerPre: string;
  demoBannerPost: string;
  // stats
  baselineViews: string;
  topMultiplier: string;
  subscribers: string;
  topicLabel: string;
  // video card
  viewsWord: string;
  baselineWord: string;
  vsUsual: string;
  shortBadge: string;
  shareLabel: string;
  // explainer
  step1Title: string;
  step1Body: string;
  step2Title: string;
  step2Body: string;
  step3Title: string;
  step3Body: string;
  outlierScale: string;
  // error
  errorTitle: string;
}

// ---------------------------------------------------------------------------
// The `en` register is the "clean/consistent" camp — professional, no slang.
// The `te` register is intentionally CODE-MIXED (Tenglish): casual, informal
// imperatives + emotion in Telugu, with domain/English nouns written in ENGLISH
// (Latin — views/outlier/baseline/channel/topic/score/format), the way people
// actually type Tenglish — while Telugu grammar & verbs stay in Telugu script.
// Casual English wording only on personality surfaces; data labels stay clean.
// ---------------------------------------------------------------------------

export const translations: Record<Lang, Dict> = {
  en: {
    tagline: "Made for Telugu creators",
    demoData: "Demo data",
    live: "Live",
    heroLead: "Find the videos that ",
    heroHighlight: "blew up",
    heroTrail: "",
    heroSubtitle:
      "See which videos got way more views than usual — then copy the ideas, titles, and thumbnails that worked.",
    modeChannel: "Channel",
    modeTopic: "Topic",
    channelHint: "Paste a channel URL, @handle, or name",
    topicHint: "Search a Telugu topic across YouTube",
    findOutliers: "Find outliers",
    analyzing: "Analyzing",
    tryLabel: "Try:",
    channelExamples: ["Telugu Tech Tuts", "Vismai Food", "Chai Bisket"],
    topicExamples: ["telugu recipes", "movie review", "cricket highlights"],
    filterAll: "All",
    fmtAll: "All",
    fmtLong: "Long-form",
    fmtShort: "Shorts",
    sortLabel: "Sort",
    sortOutlier: "Outlier score",
    sortViews: "Views",
    sortRecent: "Most recent",
    noMatch: "No videos match these filters. Try lowering the multiplier or switching format.",
    demoBannerPre: "Showing sample data. Add a",
    demoBannerPost: "to analyze real channels and topics.",
    baselineViews: "Baseline views",
    topMultiplier: "Top multiplier",
    subscribers: "subscribers",
    topicLabel: "Topic",
    viewsWord: "views",
    baselineWord: "baseline",
    vsUsual: "vs usual",
    shortBadge: "Short",
    shareLabel: "Share on WhatsApp",
    step1Title: "Pick a channel",
    step1Body: "Paste a channel URL, @handle, or name.",
    step2Title: "We measure the baseline",
    step2Body: "The channel's median views — its normal performance.",
    step3Title: "Score every video",
    step3Body: "Outlier score = a video's views ÷ that baseline.",
    outlierScale: "Outlier scale:",
    errorTitle: "Couldn't load results",
  },
  te: {
    // functional / brand
    tagline: "తెలుగు creators కోసం",
    demoData: "Demo data",
    live: "Live",
    // hero — casual, natural
    heroLead: "",
    heroHighlight: "Viral",
    heroTrail: " అయిన videos కనుక్కో",
    heroSubtitle:
      "ఒక channel మామూలు views ను మించి దూసుకుపోయిన videos కనుక్కో — ఏ idea, title, thumbnail పని చేసిందో తెలుసుకో.",
    // search — code-mixed, informal imperatives
    modeChannel: "Channel",
    modeTopic: "Topic",
    channelHint: "Channel URL, @handle, లేదా పేరు paste చెయ్",
    topicHint: "YouTube లో తెలుగు topic వెతుకు",
    findOutliers: "Outliers చూపించు",
    analyzing: "వెతుకుతున్నా...",
    tryLabel: "ఇవి try చెయ్:",
    channelExamples: ["Telugu Tech Tuts", "Vismai Food", "Chai Bisket"],
    topicExamples: ["తెలుగు వంటలు", "cinema review", "cricket highlights"],
    // filters / sort — clean data labels
    filterAll: "అన్నీ",
    fmtAll: "అన్నీ",
    fmtLong: "Long-form",
    fmtShort: "Shorts",
    sortLabel: "క్రమం",
    sortOutlier: "Outlier score",
    sortViews: "Views",
    sortRecent: "సరికొత్తవి",
    // empty / demo — casual
    noMatch: "ఈ filter కి ఏ video దొరకలేదు 😅 multiplier తగ్గించు లేదా format మార్చు.",
    demoBannerPre: "ఇది sample data. అసలైన channels, topics చూడాలంటే",
    demoBannerPost: "add చెయ్.",
    // stats — clean data labels
    baselineViews: "Baseline views",
    topMultiplier: "Top multiplier",
    subscribers: "subscribers",
    topicLabel: "Topic",
    // video card
    viewsWord: "views",
    baselineWord: "baseline",
    vsUsual: "మామూలు కంటే",
    shortBadge: "Short",
    shareLabel: "WhatsApp లో share చెయ్",
    // explainer — warm, casual, but clear
    step1Title: "Channel ఎంచుకో",
    step1Body: "Channel, @handle, పేరు paste చెయ్.",
    step2Title: "Baseline కనుక్కుంటాం",
    step2Body: "Channel మధ్యస్థ views — దాని normal performance.",
    step3Title: "ప్రతి video కి score",
    step3Body: "Outlier score = video views ÷ ఆ baseline.",
    outlierScale: "Outlier scale:",
    // error — casual
    errorTitle: "అయ్యో, results రాలేదు 😕",
  },
};

export const tierLabels: Record<Lang, Record<OutlierTier, string>> = {
  en: {
    normal: "Normal",
    above: "Above avg",
    outlier: "Outlier",
    strong: "Strong",
    mega: "Breakout",
  },
  te: {
    normal: "సాధారణం",
    above: "సగటు కంటే ఎక్కువ",
    outlier: "Outlier",
    strong: "బలమైన",
    mega: "Super Hit",
  },
};

// --- composite / parameterized strings ---------------------------------------

export function outliersLabel(lang: Lang, threshold: number): string {
  return lang === "te" ? `Outliers (${threshold}x+)` : `Outliers (${threshold}x+)`;
}

export function videosCount(lang: Lang, visible: number, total: number): string {
  return lang === "te"
    ? `${total}లో ${visible} videos`
    : `${visible} of ${total} videos`;
}

export function videosAnalyzed(lang: Lang, n: number, recent: boolean): string {
  if (lang === "te") {
    return recent
      ? `${n} సరికొత్త videos analyze చేశాం`
      : `${n} videos analyze చేశాం`;
  }
  return recent ? `${n} recent videos analyzed` : `${n} videos analyzed`;
}

/**
 * WhatsApp share caption. The Telugu variant is intentionally romanized
 * Tenglish — the code-mixed register creators actually type in chats.
 */
export function shareText(lang: Lang, multiplier: string, url: string): string {
  return lang === "te"
    ? `🔥 Ee video ${multiplier} outlier ra! Ela viral ayindo chudu 👇\n${url}`
    : `🔥 This video is a ${multiplier} outlier! Check it out 👇\n${url}`;
}
