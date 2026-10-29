import Link from "next/link";
import { CATEGORY_DEFINITIONS } from "@pricedekho/shared";
import { getSocialProfiles } from "@/lib/seo";
import { FOOTER_LINKS, SITE } from "@/lib/site";

function profileLabel(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

export function Footer() {
  const profiles = getSocialProfiles();
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-slate-900">
            Price<span className="text-brand-600">Dekho</span>
          </p>
          <p className="mt-2 max-w-xs text-sm text-slate-600">{SITE.tagline}.</p>
          {profiles.length > 0 && (
            <ul aria-label="Follow PriceDekho" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {profiles.map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer me" className="text-slate-600 hover:text-brand-700">
                    {profileLabel(url)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <nav aria-label="Footer categories">
          <p className="text-sm font-semibold text-slate-900">Categories</p>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">
            {CATEGORY_DEFINITIONS.map((c) => (
              <li key={c.slug}>
                <Link href={`/categories/${c.slug}`} className="text-slate-600 hover:text-brand-700">
                  {c.shortName}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Company">
          <p className="text-sm font-semibold text-slate-900">PriceDekho</p>
          <ul className="mt-2 space-y-1 text-sm">
            {FOOTER_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-slate-600 hover:text-brand-700">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-slate-100">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-slate-500 sm:px-6">
          PriceDekho may earn a commission from some store links. This never changes the order in which prices are shown.{" "}
          <Link href="/affiliate-disclosure" className="underline underline-offset-2">
            Affiliate disclosure
          </Link>
          . Prices are refreshed periodically, not in real time — always confirm the final price on the store&apos;s website.
        </p>
      </div>
    </footer>
  );
}
