import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Affiliate disclosure", alternates: { canonical: "/affiliate-disclosure" } };

export default function AffiliateDisclosurePage() {
  return (
    <InfoPage title="Affiliate disclosure">
      <p>
        Some links to stores may be affiliate links. If you buy through one, PriceDekho may earn a commission at no extra cost to you. Affiliate
        links are marked as sponsored in the page markup.
      </p>
      <p>
        Commissions never affect the order of offers: store offers are always sorted by price, with out-of-stock listings shown last. No affiliate
        programme is active in this release.
      </p>
    </InfoPage>
  );
}
