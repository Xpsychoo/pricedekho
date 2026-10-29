import { ProviderError, type ListingRef, type NormalizedOffer, type PriceProvider } from "../types";

/**
 * TEMPLATE — NOT A WORKING INTEGRATION.
 *
 * Starting point for an authorised data source (affiliate API, partner feed
 * or licensed product-data service). It is intentionally not registered. To
 * build a real adapter:
 *   1. Obtain written authorisation / API access and read the display terms.
 *   2. Copy this file, set id/displayName/sourceType, and implement search()
 *      and refreshListing() against the documented API only.
 *   3. Call only fixed, configured API hosts — never user-supplied URLs.
 *   4. Map responses to RawOffer fields; leave fields null when not provided.
 *   5. Register it in createDefaultRegistry() behind its credential check.
 * See docs/PROVIDERS.md.
 */
export interface TemplateProviderConfig {
  apiKey: string;
  /** Fixed base URL from configuration, validated as https. */
  baseUrl: string;
}

export class AffiliateApiTemplateProvider implements PriceProvider {
  readonly id = "affiliate-template";
  readonly displayName = "Affiliate API (template)";
  readonly sourceType = "affiliate_api" as const;
  readonly capabilities = { search: false, refresh: false };

  constructor(private readonly config: TemplateProviderConfig | null) {}

  private assertConfigured(): TemplateProviderConfig {
    if (!this.config) throw new ProviderError(this.id, "Provider credentials are not configured", "not_configured");
    return this.config;
  }

  async search(_query: string): Promise<NormalizedOffer[]> {
    this.assertConfigured();
    throw new ProviderError(this.id, "Template adapter has no implementation", "unsupported");
  }

  async refreshListing(_ref: ListingRef): Promise<NormalizedOffer | null> {
    this.assertConfigured();
    throw new ProviderError(this.id, "Template adapter has no implementation", "unsupported");
  }
}
