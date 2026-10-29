import { describe, expect, it } from "vitest";
import type { Offer } from "../types/catalog";
import { freshnessConfigFromHours } from "../utils/freshness";
import { pickLowestOffer, sortOffersByPrice, withStatuses } from "../utils/offers";

const now = new Date("2026-10-29T12:00:00Z");
const config = freshnessConfigFromHours(24);

function offer(id: string, pricePaise: number, overrides: Partial<Offer> = {}): Offer {
  return {
    id,
    productId: "p1",
    store: { id: `s-${id}`, slug: `store-${id}`, name: `Store ${id}`, websiteUrl: "https://x.example", logoUrl: null, isDemo: false },
    providerId: "test",
    externalProductId: null,
    variantKey: "storage=128gb",
    productUrl: `https://x.example/${id}`,
    sellerName: null,
    pricePaise,
    originalPricePaise: null,
    availability: "in_stock",
    currency: "INR",
    source: "affiliate_api",
    lastCheckedAt: new Date(now.getTime() - 3_600_000).toISOString(),
    refreshStatus: "ok",
    ...overrides,
  };
}

describe("sortOffersByPrice", () => {
  it("sorts lowest first", () => {
    expect(sortOffersByPrice([offer("a", 300), offer("b", 100), offer("c", 200)]).map((o) => o.id)).toEqual(["b", "c", "a"]);
  });

  it("puts out-of-stock offers last even when cheaper", () => {
    const sorted = sortOffersByPrice([offer("a", 300), offer("oos", 50, { availability: "out_of_stock" }), offer("b", 200)]);
    expect(sorted.map((o) => o.id)).toEqual(["b", "a", "oos"]);
  });

  it("does not mutate the input", () => {
    const input = [offer("a", 2), offer("b", 1)];
    sortOffersByPrice(input);
    expect(input.map((o) => o.id)).toEqual(["a", "b"]);
  });
});

describe("pickLowestOffer", () => {
  it("picks the cheapest live, in-stock offer as verified", () => {
    const entries = withStatuses([offer("a", 300), offer("b", 200)], now, config);
    expect(pickLowestOffer(entries)).toMatchObject({ kind: "verified", offer: { id: "b" } });
  });

  it("ignores stale offers even when cheaper", () => {
    const stale = offer("stale", 50, { lastCheckedAt: "2026-10-01T00:00:00Z" });
    const entries = withStatuses([stale, offer("a", 300)], now, config);
    expect(pickLowestOffer(entries)).toMatchObject({ kind: "verified", offer: { id: "a" } });
  });

  it("returns a demo lowest price for demo-only data", () => {
    const entries = withStatuses([offer("d1", 500, { source: "demo" }), offer("d2", 400, { source: "demo" })], now, config);
    expect(pickLowestOffer(entries)).toMatchObject({ kind: "demo", offer: { id: "d2" } });
  });

  it("returns null when nothing qualifies", () => {
    const entries = withStatuses([offer("e", 100, { refreshStatus: "error" }), offer("s", 90, { lastCheckedAt: null })], now, config);
    expect(pickLowestOffer(entries)).toBeNull();
  });
});
