import type { Metadata } from "next";
import { OPEN_GRAPH_BASE } from "@/lib/seo";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the PriceDekho team with questions, corrections or partnership enquiries.",
  alternates: { canonical: "/contact" },
  openGraph: { ...OPEN_GRAPH_BASE, url: "/contact", title: "Contact | PriceDekho", description: "Contact the PriceDekho team with questions, corrections or partnership enquiries." },
};

export default function ContactPage() {
  return (
    <InfoPage title="Contact us" draft>
      <p>Contact details (support email and grievance officer information, where applicable) will be published here before public launch.</p>
      <p>To report an incorrect price, please include the product page link and the store name.</p>
    </InfoPage>
  );
}
