import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep the API and the private stats page out of the index.
      disallow: ["/api/", "/stats"],
    },
    sitemap: "https://thebreakout.in/sitemap.xml",
    host: "https://thebreakout.in",
  };
}
