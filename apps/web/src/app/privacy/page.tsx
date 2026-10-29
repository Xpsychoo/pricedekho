import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy policy" draft>
      <p>This first release has no user accounts and does not ask visitors for personal information.</p>
      <h2>What the service processes today</h2>
      <ul>
        <li>Standard request data (such as IP address and user agent) processed by our hosting provider and used transiently for rate limiting.</li>
        <li>Search terms you submit, used to return results. They are not linked to an account.</li>
      </ul>
      <p>A complete policy, compliant with the Digital Personal Data Protection Act, 2023 and other applicable law, must be published before launch.</p>
    </InfoPage>
  );
}
