import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import type { Lang } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://thebreakout.in";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Breakout — Free YouTube Outlier Finder for Telugu Creators",
    template: "%s · Breakout",
  },
  description:
    "Find the YouTube videos that blew up — the ones that got far more views than usual. Breakout is a free outlier finder for Telugu creators to copy the ideas, titles & thumbnails that go viral.",
  applicationName: "Breakout",
  keywords: [
    "youtube outlier finder",
    "find viral youtube videos",
    "youtube breakout videos",
    "telugu youtube",
    "telugu youtube viral videos",
    "telugu youtube analytics",
    "youtube creator tools",
    "1of10 alternative",
    "viral video ideas",
    "youtube outliers",
  ],
  authors: [{ name: "Breakout" }],
  creator: "Breakout",
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Breakout",
    title: "Breakout — Find the YouTube videos that blew up",
    description:
      "A free YouTube outlier finder for Telugu creators. See which videos got way more views than usual — then copy the ideas, titles & thumbnails that worked.",
    url: SITE_URL,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Breakout — Find the YouTube videos that blew up",
    description:
      "A free YouTube outlier finder for Telugu creators. Copy the ideas, titles & thumbnails that go viral.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Optional: set GOOGLE_SITE_VERIFICATION to verify via a meta tag instead of DNS.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Breakout",
  url: SITE_URL,
  description:
    "A free YouTube outlier finder for Telugu creators — find breakout videos and copy the ideas, titles, and thumbnails that go viral.",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  inLanguage: ["en", "te"],
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the saved language server-side so SSR renders it directly (no flicker).
  // Defaults to English; Telugu only when the cookie explicitly says so.
  const cookieStore = await cookies();
  const initialLang: Lang = cookieStore.get("breakout.lang")?.value === "te" ? "te" : "en";

  return (
    <html
      lang={initialLang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <LanguageProvider initialLang={initialLang}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
