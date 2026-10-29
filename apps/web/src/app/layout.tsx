import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { DemoBanner } from "@/components/DemoBanner";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { getCatalog } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/env";
import { getTwitterHandle, OPEN_GRAPH_BASE } from "@/lib/seo";
import { SITE } from "@/lib/site";
import "../styles/globals.css";

const twitterHandle = getTwitterHandle();

// favicon.ico, icon.png, apple-icon.png, opengraph-image and manifest are
// picked up from this folder by Next.js file conventions.
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "shopping",
  formatDetection: { telephone: false, address: false, email: false },
  referrer: "strict-origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    ...(twitterHandle ? { site: twitterHandle, creator: twitterHandle } : {}),
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
  appleWebApp: { title: SITE.name, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const demo = getCatalog().mode === "demo-memory";
  return (
    <html lang="en-IN">
      <body className="flex min-h-screen flex-col">
        <Navbar />
        {demo && <DemoBanner />}
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
