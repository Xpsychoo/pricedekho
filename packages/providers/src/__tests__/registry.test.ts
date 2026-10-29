import { describe, expect, it } from "vitest";
import { DemoProvider } from "../demo/demo-provider";
import { normalizeOffer } from "../normalize";
import { ProviderRegistry } from "../registry";
import { ProviderError } from "../types";
import { fakeProvider, rawOffer } from "./fixtures";

describe("ProviderRegistry.searchAll", () => {
  it("returns results from healthy providers when another throws", async () => {
    const registry = new ProviderRegistry()
      .register(fakeProvider("good", { search: async () => [rawOffer({ providerId: "good" })] }))
      .register(
        fakeProvider("broken", {
          search: async () => {
            throw new Error("socket hang up at https://api.secret.example?key=abc");
          },
        }),
      );
    const result = await registry.searchAll("iphone");
    expect(result.offers).toHaveLength(1);
    expect(result.failures).toEqual([{ providerId: "broken", code: "upstream", message: "Provider request failed" }]);
    // Raw upstream messages (which may contain secrets) are not propagated.
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("times out slow providers without blocking others", async () => {
    const registry = new ProviderRegistry(50)
      .register(fakeProvider("slow", { search: () => new Promise((r) => setTimeout(() => r([]), 1000)) }))
      .register(fakeProvider("fast", { search: async () => [rawOffer({ providerId: "fast" })] }));
    const result = await registry.searchAll("x");
    expect(result.offers).toHaveLength(1);
    expect(result.failures[0]).toMatchObject({ providerId: "slow", code: "timeout" });
  });

  it("rejects invalid offers and offers claiming another provider's id", async () => {
    const registry = new ProviderRegistry().register(
      fakeProvider("p", {
        search: async () => [
          rawOffer({ providerId: "p" }),
          rawOffer({ providerId: "p", pricePaise: -1 }),
          rawOffer({ providerId: "p", productUrl: "javascript:alert(1)" }),
          rawOffer({ providerId: "someone-else" }),
        ],
      }),
    );
    const result = await registry.searchAll("x");
    expect(result.offers).toHaveLength(1);
    expect(result.rejected).toEqual({ p: 3 });
  });

  it("refuses duplicate provider ids", () => {
    const registry = new ProviderRegistry().register(fakeProvider("a"));
    expect(() => registry.register(fakeProvider("a"))).toThrow(/already registered/);
  });
});

describe("ProviderRegistry.refresh", () => {
  const ref = { offerId: "o1", providerId: "p", storeSlug: "test-store", externalProductId: "EXT-1", productUrl: "https://test-store.example/p/1", variantKey: "" };

  it("fails clearly for unknown providers and providers without refresh support", async () => {
    const registry = new ProviderRegistry().register(fakeProvider("p"));
    await expect(registry.refresh({ ...ref, providerId: "missing" })).rejects.toMatchObject({ code: "not_configured" });
    await expect(registry.refresh(ref)).rejects.toMatchObject({ code: "unsupported" });
  });

  it("rejects invalid refreshed data", async () => {
    const registry = new ProviderRegistry().register(fakeProvider("p", { refreshListing: async () => rawOffer({ providerId: "p", pricePaise: 0 }) }));
    await expect(registry.refresh(ref)).rejects.toBeInstanceOf(ProviderError);
  });
});

describe("normalizeOffer", () => {
  it("drops an original price that is not higher than the price", () => {
    const r = normalizeOffer(rawOffer({ originalPricePaise: 4_000_000 }));
    expect(r.ok && r.offer.originalPricePaise).toBeNull();
  });

  it("recomputes the variant key from attributes", () => {
    const r = normalizeOffer(rawOffer({ variantAttributes: { Storage: "128 GB", Colour: "Midnight" }, variantKey: "bogus" }));
    expect(r.ok && r.offer.variantKey).toBe("color=midnight|storage=128gb");
  });

  it("rejects non-INR currencies and non-https URLs", () => {
    expect(normalizeOffer({ ...rawOffer(), currency: "USD" }).ok).toBe(false);
    expect(normalizeOffer(rawOffer({ productUrl: "http://insecure.example" })).ok).toBe(false);
  });
});

describe("DemoProvider", () => {
  it("returns only demo-labelled offers with the fixed catalog timestamp", async () => {
    const offers = await new DemoProvider().search("iphone 13");
    expect(offers.length).toBeGreaterThan(0);
    for (const o of offers) {
      expect(o.sourceType).toBe("demo");
      expect(o.fetchedAt).toBe("2026-10-29T00:00:00.000Z");
      expect(new URL(o.productUrl).hostname.endsWith(".example")).toBe(true);
    }
  });

  it("does not claim refresh support", () => {
    expect(new DemoProvider().capabilities.refresh).toBe(false);
  });
});
