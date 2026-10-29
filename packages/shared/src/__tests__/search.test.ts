import { describe, expect, it } from "vitest";
import { normalizeSearchQuery, scoreSearchMatch, slugify, tokenize } from "../utils/search";

describe("normalizeSearchQuery", () => {
  it("lowercases, trims and collapses whitespace", () => {
    expect(normalizeSearchQuery("  Apple   iPhone 13  ")).toBe("apple iphone 13");
  });

  it("strips punctuation and markup characters", () => {
    expect(normalizeSearchQuery("<script>iphone</script>; DROP")).toBe("script iphone script drop");
    expect(normalizeSearchQuery("100%_off'")).toBe("100 off");
  });

  it("applies NFKC normalisation (full-width characters)", () => {
    expect(normalizeSearchQuery("ｉＰｈｏｎｅ")).toBe("iphone");
  });

  it("enforces a maximum length", () => {
    expect(normalizeSearchQuery("a".repeat(500))).toHaveLength(100);
  });

  it("handles empty input", () => {
    expect(normalizeSearchQuery(undefined)).toBe("");
    expect(normalizeSearchQuery("   ")).toBe("");
  });
});

describe("tokenize", () => {
  it("joins numbers with storage units", () => {
    expect(tokenize("iPhone 13 128 GB")).toEqual(["iphone", "13", "128gb"]);
  });
});

describe("scoreSearchMatch", () => {
  const doc = { primary: ["Apple iPhone 13 (128GB, Midnight)", "Apple", "iPhone 13"] };

  it("requires every token to match", () => {
    expect(scoreSearchMatch("iphone 13", doc)).toBeGreaterThan(0);
    expect(scoreSearchMatch("iphone 14", doc)).toBe(0);
  });

  it("supports prefix matches", () => {
    expect(scoreSearchMatch("iph", doc)).toBeGreaterThan(0);
  });

  it("matches an empty query", () => {
    expect(scoreSearchMatch("", doc)).toBe(1);
  });
});

describe("slugify", () => {
  it("produces URL-safe slugs", () => {
    expect(slugify("Allen Solly Men's Polo (M, Navy)")).toBe("allen-solly-men-s-polo-m-navy");
  });
});
