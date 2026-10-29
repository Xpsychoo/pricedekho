import { DEMO_CREATED_AT, DEMO_PRODUCTS, DEMO_PROVIDER_ID, DEMO_STORES } from "@pricedekho/shared/demo";
import { scoreSearchMatch } from "@pricedekho/shared";
import type { NormalizedOffer, PriceProvider } from "../types";

/**
 * Serves the bundled DEMO catalog. It never contacts a retailer.
 * fetchedAt is the fixed catalog creation time — the data is not refreshed,
 * so it does not pretend to be fresh. Listing refresh is not supported, which
 * means the refresh job reports demo offers as skipped instead of re-stamping
 * them.
 */
export class DemoProvider implements PriceProvider {
  readonly id = DEMO_PROVIDER_ID;
  readonly displayName = "Demo data (sample only)";
  readonly sourceType = "demo" as const;
  readonly capabilities = { search: true, refresh: false };

  async search(query: string): Promise<NormalizedOffer[]> {
    const storeSlug = new Map(DEMO_STORES.map((s) => [s.id, s.slug]));
    return DEMO_PRODUCTS.filter((p) => scoreSearchMatch(query, { primary: [p.name, p.brand, p.model] }) > 0).flatMap((p) =>
      p.offers.map((o) => ({
        providerId: this.id,
        storeSlug: storeSlug.get(o.storeId)!,
        externalProductId: o.externalProductId,
        title: p.name,
        brand: p.brand,
        model: p.model,
        gtin: null,
        variantAttributes: p.variantAttributes,
        variantKey: p.variantKey,
        pricePaise: o.pricePaise,
        originalPricePaise: o.originalPricePaise,
        currency: "INR" as const,
        availability: o.availability,
        sellerName: o.sellerName,
        productUrl: o.productUrl,
        imageUrl: null,
        sourceType: "demo" as const,
        fetchedAt: DEMO_CREATED_AT,
      })),
    );
  }
}
