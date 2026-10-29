import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "About", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <InfoPage title="About PriceDekho">
      <p>
        PriceDekho is a price comparison service for shoppers in India. We show offers for the exact same product variant from multiple online
        stores side by side, so you can compare like with like.
      </p>
      <p>
        We label every price with its source and the time it was last verified. We do not present sample data, stale data or estimates as live
        prices, and we never fill gaps in price history with made-up values.
      </p>
    </InfoPage>
  );
}
