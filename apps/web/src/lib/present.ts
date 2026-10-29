import {
  discountPercent,
  pickLowestOffer,
  PRICE_STATUS_LABELS,
  withStatuses,
  type FreshnessConfig,
  type Offer,
  type PriceStatus,
  type ProductDetail,
} from "@pricedekho/shared";

export interface PresentedOffer {
  id: string;
  store: { slug: string; name: string; isDemo: boolean };
  sellerName: string | null;
  pricePaise: number;
  originalPricePaise: number | null;
  discountPercent: number | null;
  currency: "INR";
  availability: Offer["availability"];
  productUrl: string;
  source: Offer["source"];
  status: PriceStatus;
  statusLabel: string;
  lastCheckedAt: string | null;
}

export interface PresentedProduct {
  product: Omit<ProductDetail, "offers">;
  offers: PresentedOffer[];
  lowest: { kind: "verified" | "demo"; offerId: string; pricePaise: number } | null;
  dataQuality: { hasDemo: boolean; hasLive: boolean; freshnessHours: number };
}

/**
 * Converts a product into its public shape: offers sorted lowest price first,
 * each with a computed status. Internal fields (provider ids, external ids,
 * refresh errors) are not included.
 */
export function presentProduct(detail: ProductDetail, now: Date, config: FreshnessConfig): PresentedProduct {
  const { offers, ...product } = detail;
  const entries = withStatuses(offers, now, config);
  const lowest = pickLowestOffer(entries);
  return {
    product,
    offers: entries.map(({ offer, status }) => ({
      id: offer.id,
      store: { slug: offer.store.slug, name: offer.store.name, isDemo: offer.store.isDemo },
      sellerName: offer.sellerName,
      pricePaise: offer.pricePaise,
      originalPricePaise: offer.originalPricePaise,
      discountPercent: discountPercent(offer.pricePaise, offer.originalPricePaise),
      currency: offer.currency,
      availability: offer.availability,
      productUrl: offer.productUrl,
      source: offer.source,
      status,
      statusLabel: PRICE_STATUS_LABELS[status].label,
      lastCheckedAt: offer.lastCheckedAt,
    })),
    lowest: lowest ? { kind: lowest.kind, offerId: lowest.offer.id, pricePaise: lowest.offer.pricePaise } : null,
    dataQuality: {
      hasDemo: entries.some((e) => e.status === "demo"),
      hasLive: entries.some((e) => e.status === "live"),
      freshnessHours: Math.round(config.liveMaxAgeMs / 3_600_000),
    },
  };
}
