import { searchQuerySchema } from "@pricedekho/shared";
import { describe, expect, it } from "vitest";
import { MemoryCatalogRepository } from "../memory/repository";
import { onlyMatchingVariant } from "../repository";

const repo = new MemoryCatalogRepository();
const q = (input: Record<string, unknown>) => searchQuerySchema.parse(input);

describe("MemoryCatalogRepository", () => {
  it("finds the iPhone 13 variants by search", async () => {
    const result = await repo.searchProducts(q({ q: "iphone 13" }));
    expect(result.items.map((i) => i.slug).sort()).toEqual(["apple-iphone-13-128gb-midnight", "apple-iphone-13-256gb-midnight"]);
  });

  it("filters by category and exposes category-appropriate facets", async () => {
    const result = await repo.searchProducts(q({ category: "mobiles" }));
    expect(result.items.every((i) => i.category.slug === "mobiles")).toBe(true);
    expect(Object.keys(result.facets.attributes).sort()).toEqual(["color", "storage"]);
    expect(result.facets.brands.map((b) => b.value)).toEqual(["Apple", "Samsung"]);
  });

  it("filters by variant attribute", async () => {
    const result = await repo.searchProducts(q({ category: "mobiles", attributes: { storage: "256gb" } }));
    expect(result.items.map((i) => i.slug)).toEqual(["apple-iphone-13-256gb-midnight"]);
  });

  it("sorts by price ascending, using only purchasable offers", async () => {
    const result = await repo.searchProducts(q({ sort: "price_asc", pageSize: 48 }));
    const prices = result.items.map((i) => i.lowestPricePaise!);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("paginates", async () => {
    const page1 = await repo.searchProducts(q({ pageSize: 5, page: 1 }));
    const page3 = await repo.searchProducts(q({ pageSize: 5, page: 3 }));
    expect(page1.items).toHaveLength(5);
    expect(page1.totalPages).toBe(3);
    expect(page3.items).toHaveLength(2);
  });

  it("returns an empty result for unmatched searches", async () => {
    const result = await repo.searchProducts(q({ q: "nonexistent gadget" }));
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it("labels every offer as demo and never verified", async () => {
    const product = await repo.getProductBySlug("apple-iphone-13-128gb-midnight");
    expect(product).not.toBeNull();
    expect(product!.offers.length).toBeGreaterThan(0);
    for (const o of product!.offers) {
      expect(o.source).toBe("demo");
      expect(o.lastCheckedAt).toBeNull();
      expect(o.store.isDemo).toBe(true);
    }
  });

  it("lists sibling variants separately instead of merging them", async () => {
    const product = await repo.getProductBySlug("apple-iphone-13-128gb-midnight");
    expect(product!.siblingVariants.map((s) => s.slug)).toEqual(["apple-iphone-13-256gb-midnight"]);
    expect(product!.offers.every((o) => o.variantKey === product!.variantKey)).toBe(true);
  });

  it("has no price history in demo mode", async () => {
    expect(await repo.getPriceHistory("any", { since: null, limit: 10 })).toEqual([]);
  });
});

describe("onlyMatchingVariant", () => {
  it("drops offers for a different variant", () => {
    const offers = [{ variantKey: "storage=128gb" }, { variantKey: "storage=256gb" }];
    expect(onlyMatchingVariant(offers, "storage=128gb")).toEqual([{ variantKey: "storage=128gb" }]);
  });
});
