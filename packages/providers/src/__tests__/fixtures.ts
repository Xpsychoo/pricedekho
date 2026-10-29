import type { NormalizedOffer, PriceProvider } from "../types";

export function rawOffer(overrides: Partial<NormalizedOffer> = {}): NormalizedOffer {
  return {
    providerId: "test",
    storeSlug: "test-store",
    externalProductId: "EXT-1",
    title: "Apple iPhone 13 (128GB, Midnight)",
    brand: "Apple",
    model: "iPhone 13",
    gtin: null,
    variantAttributes: { storage: "128gb", color: "midnight" },
    variantKey: "color=midnight|storage=128gb",
    pricePaise: 5_000_000,
    originalPricePaise: null,
    currency: "INR",
    availability: "in_stock",
    sellerName: null,
    productUrl: "https://test-store.example/p/1",
    imageUrl: null,
    sourceType: "affiliate_api",
    fetchedAt: "2026-10-29T12:00:00.000Z",
    ...overrides,
  };
}

export function fakeProvider(id: string, impl: Partial<PriceProvider> = {}): PriceProvider {
  return {
    id,
    displayName: id,
    sourceType: "affiliate_api",
    capabilities: { search: true, refresh: Boolean(impl.refreshListing) },
    search: async () => [],
    ...impl,
  };
}
