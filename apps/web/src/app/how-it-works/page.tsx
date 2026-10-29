import type { Metadata } from "next";
import { PriceStatusLabel } from "@/components/PriceStatusLabel";
import { InfoPage } from "@/components/InfoPage";
import { getFreshnessConfig } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "How it works",
  description: "How PriceDekho compares prices, where the data comes from and how fresh it is.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  const hours = Math.round(getFreshnessConfig().liveMaxAgeMs / 3_600_000);
  return (
    <InfoPage title="How PriceDekho works">
      <h2>Exact variants only</h2>
      <p>
        Each product page covers one specific variant — for example a phone with a particular storage size and colour, or a shoe in a particular
        size. We never compare a 128GB phone with a 256GB one, or a size M shirt with a size L, as if they were the same product. Listings are
        linked to a product only when identifiers (such as GTIN/EAN) or the brand, model and variant attributes match exactly; ambiguous listings
        are kept separate.
      </p>
      <h2 id="data-sources">Where prices come from</h2>
      <p>
        Prices may only come from authorised sources such as affiliate programmes, partner feeds or licensed product-data services. We do not
        scrape retailer websites. Until an authorised source is connected, the site shows clearly labelled demonstration data from fictional
        stores.
      </p>
      <h2 id="freshness">Freshness labels</h2>
      <p>Prices are refreshed periodically by a scheduled job, not in real time. Every offer shows one of these labels:</p>
      <ul className="list-none! pl-0!">
        <li className="flex flex-wrap items-center gap-2"><PriceStatusLabel status="live" /> verified within the last {hours} hours.</li>
        <li className="flex flex-wrap items-center gap-2"><PriceStatusLabel status="stale" /> not verified within {hours} hours; the price may have changed.</li>
        <li className="flex flex-wrap items-center gap-2"><PriceStatusLabel status="unavailable" /> reported out of stock at the last check.</li>
        <li className="flex flex-wrap items-center gap-2">
          <PriceStatusLabel status="source_error" /> the latest refresh failed; we show the last verified price with its original timestamp.
        </li>
        <li className="flex flex-wrap items-center gap-2"><PriceStatusLabel status="demo" /> fictional sample data, never a real price.</li>
      </ul>
      <h2>Price history</h2>
      <p>Price history only shows prices we actually recorded. Gaps are left as gaps; we never estimate or fill in missing values.</p>
    </InfoPage>
  );
}
