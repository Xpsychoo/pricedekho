import type { Metadata } from "next";
import { OPEN_GRAPH_BASE } from "@/lib/seo";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms that apply when you use PriceDekho to compare product prices.",
  alternates: { canonical: "/terms" },
  openGraph: { ...OPEN_GRAPH_BASE, url: "/terms", title: "Terms of use | PriceDekho", description: "The terms that apply when you use PriceDekho to compare product prices." },
};

export default function TermsPage() {
  return (
    <InfoPage title="Terms of use" draft>
      <p>
        PriceDekho provides price information for comparison only. Prices, availability and delivery terms are set by each store and can change at
        any time. Always confirm the final price on the store&apos;s website before buying.
      </p>
      <p>Purchases are made directly with the store; PriceDekho is not a party to that transaction.</p>
    </InfoPage>
  );
}
