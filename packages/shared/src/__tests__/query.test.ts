import { describe, expect, it } from "vitest";
import { historyQuerySchema, parseSearchQuery, slugSchema } from "../schemas/query";

describe("parseSearchQuery", () => {
  it("applies defaults", () => {
    const r = parseSearchQuery(new URLSearchParams());
    expect(r.success && r.data).toEqual({ sort: "relevance", page: 1, pageSize: 12, attributes: {} });
  });

  it("parses a full query from URLSearchParams", () => {
    const r = parseSearchQuery(new URLSearchParams("q=iphone&category=mobiles&brand=Apple&storage=128GB&sort=price_asc&page=2"));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toMatchObject({ q: "iphone", category: "mobiles", brand: "Apple", sort: "price_asc", page: 2, attributes: { storage: "128gb" } });
    }
  });

  it("accepts Next.js searchParams records, using the first value of arrays", () => {
    const r = parseSearchQuery({ q: ["phone", "ignored"], page: "3" });
    expect(r.success && r.data.q).toBe("phone");
    expect(r.success && r.data.page).toBe(3);
  });

  it("treats empty strings as absent", () => {
    const r = parseSearchQuery(new URLSearchParams("q=&category=&brand="));
    expect(r.success && r.data.q).toBeUndefined();
    expect(r.success && r.data.category).toBeUndefined();
  });

  it.each([
    ["sort=cheapest", "sort"],
    ["page=0", "page"],
    ["page=51", "page"],
    ["page=abc", "page"],
    ["pageSize=1000", "pageSize"],
    ["category=../../etc", "category"],
    [`q=${"x".repeat(101)}`, "q"],
    ["storage=<script>", "attributes"],
  ])("rejects malformed input: %s", (qs, path) => {
    const r = parseSearchQuery(new URLSearchParams(qs));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]!.path[0]).toBe(path);
  });

  it("ignores unknown attribute keys", () => {
    const r = parseSearchQuery(new URLSearchParams("evil=1&storage=128gb"));
    expect(r.success && r.data.attributes).toEqual({ storage: "128gb" });
  });
});

describe("slugSchema", () => {
  it("accepts kebab-case and rejects everything else", () => {
    expect(slugSchema.safeParse("apple-iphone-13").success).toBe(true);
    expect(slugSchema.safeParse("Apple iPhone").success).toBe(false);
    expect(slugSchema.safeParse("a--b").success).toBe(false);
    expect(slugSchema.safeParse("").success).toBe(false);
  });
});

describe("historyQuerySchema", () => {
  it("defaults and bounds the limit", () => {
    expect(historyQuerySchema.parse({})).toEqual({ range: "90d", limit: 500 });
    expect(historyQuerySchema.safeParse({ limit: "5000" }).success).toBe(false);
    expect(historyQuerySchema.safeParse({ range: "10y" }).success).toBe(false);
  });
});
