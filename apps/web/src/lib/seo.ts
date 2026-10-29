import { SITE } from "./site";
import { getSiteUrl } from "./env";

/**
 * Open Graph fields every page shares. Next.js replaces (not merges) a parent's
 * openGraph object, so pages that set their own spread this in.
 */
export const OPEN_GRAPH_BASE = { type: "website", siteName: SITE.name, locale: "en_IN" } as const;

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, `${getSiteUrl()}/`).toString();
}

/** X/Twitter handle such as "@pricedekho", or undefined when not configured. */
export function getTwitterHandle(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_TWITTER_HANDLE?.trim();
  if (!raw) return undefined;
  return raw.startsWith("@") ? raw : `@${raw}`;
}

/** Official social profile URLs (https only), used for schema.org sameAs and the footer. */
export function getSocialProfiles(): string[] {
  return (process.env.NEXT_PUBLIC_SOCIAL_PROFILES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => {
      try {
        return new URL(s).protocol === "https:";
      } catch {
        return false;
      }
    });
}

export function organizationJsonLd() {
  const sameAs = getSocialProfiles();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: SITE.name,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icons/icon-512.png"),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: SITE.name,
    url: absoluteUrl("/"),
    description: SITE.description,
    inLanguage: "en-IN",
    publisher: { "@id": absoluteUrl("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
