// Category config for the "Top breakouts" browser. Each category maps to a
// Telugu-biased YouTube channel-search query; the /api/top-outliers route
// discovers top channels for it, computes their outliers, and aggregates the
// biggest breakout videos.

export interface Category {
  key: string;
  label: string;
  emoji: string;
  query: string;
}

export const categories: Category[] = [
  { key: "tech", label: "Tech", emoji: "💻", query: "telugu tech" },
  { key: "cooking", label: "Cooking", emoji: "🍳", query: "telugu cooking recipes" },
  { key: "entertainment", label: "Entertainment", emoji: "🎬", query: "telugu comedy entertainment" },
  { key: "foodvlogs", label: "Food vlogs", emoji: "🍜", query: "telugu food vlog" },
  { key: "education", label: "Education", emoji: "📚", query: "telugu education lessons" },
  { key: "fashion", label: "Fashion", emoji: "👗", query: "telugu fashion beauty" },
];
