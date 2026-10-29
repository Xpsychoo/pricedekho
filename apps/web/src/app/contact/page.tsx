import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return (
    <InfoPage title="Contact us" draft>
      <p>Contact details (support email and grievance officer information, where applicable) will be published here before public launch.</p>
      <p>To report an incorrect price, please include the product page link and the store name.</p>
    </InfoPage>
  );
}
