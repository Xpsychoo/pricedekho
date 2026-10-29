import { describe, expect, it } from "vitest";
import { normalizeOffer } from "../normalize";
import { matchOfferToProduct, refreshedListingMatches, type MatchCandidate } from "../matching";
import type { NormalizedOffer } from "../types";
import { rawOffer } from "./fixtures";

const iphone128: MatchCandidate = {
  productId: "iphone-128",
  categorySlug: "mobiles",
  brand: "Apple",
  model: "iPhone 13",
  gtin: "0194252707234",
  variantAttributes: { storage: "128gb", color: "midnight" },
};
const iphone256: MatchCandidate = { ...iphone128, productId: "iphone-256", gtin: null, variantAttributes: { storage: "256gb", color: "midnight" } };
const candidates = [iphone128, iphone256];

const normalized = (o: Partial<NormalizedOffer>) => {
  const r = normalizeOffer(rawOffer(o));
  if (!r.ok) throw new Error(r.error);
  return r.offer;
};

describe("matchOfferToProduct", () => {
  it("matches by GTIN", () => {
    expect(matchOfferToProduct(normalized({ gtin: "0194252707234", brand: null, model: null }), candidates)).toEqual({
      status: "matched",
      productId: "iphone-128",
      method: "gtin",
    });
  });

  it("refuses a GTIN match when variant attributes conflict", () => {
    const r = matchOfferToProduct(normalized({ gtin: "0194252707234", variantAttributes: { storage: "256GB" } }), candidates);
    expect(r.status).toBe("no_match");
  });

  it("matches by brand + model + exact variant", () => {
    const r = matchOfferToProduct(normalized({ variantAttributes: { storage: "256 GB", colour: "Midnight" } }), candidates);
    expect(r).toEqual({ status: "matched", productId: "iphone-256", method: "brand_model_variant" });
  });

  it("never matches on title alone", () => {
    const r = matchOfferToProduct(normalized({ brand: null, model: null, title: "Apple iPhone 13 (128GB, Midnight)" }), candidates);
    expect(r.status).toBe("no_match");
  });

  it("does not match when a required identity attribute is missing", () => {
    // Storage unknown: could be either variant, so it must stay unmatched.
    const r = matchOfferToProduct(normalized({ variantAttributes: { color: "midnight" } }), candidates);
    expect(r.status).toBe("no_match");
  });

  it("reports ambiguity instead of guessing", () => {
    const duplicate = { ...iphone128, productId: "iphone-128-dup", gtin: null };
    const r = matchOfferToProduct(normalized({}), [iphone128, duplicate]);
    expect(r).toMatchObject({ status: "ambiguous", productIds: ["iphone-128", "iphone-128-dup"] });
  });

  it("does not match a different colour", () => {
    expect(matchOfferToProduct(normalized({ variantAttributes: { storage: "128gb", color: "starlight" } }), candidates).status).toBe("no_match");
  });
});

describe("refreshedListingMatches", () => {
  const expected = { variantKey: "color=midnight|storage=128gb", gtin: null, storeSlug: "test-store", providerId: "test" };

  it("accepts an unchanged listing", () => {
    expect(refreshedListingMatches(normalized({}), expected)).toBe(true);
  });

  it("rejects a listing that switched variant", () => {
    expect(refreshedListingMatches(normalized({ variantAttributes: { storage: "256gb", color: "midnight" } }), expected)).toBe(false);
  });

  it("rejects a listing from a different store or provider", () => {
    expect(refreshedListingMatches(normalized({ storeSlug: "other" }), expected)).toBe(false);
    expect(refreshedListingMatches(normalized({ providerId: "other" }), expected)).toBe(false);
  });

  it("rejects a GTIN change", () => {
    expect(refreshedListingMatches(normalized({ gtin: "12345678" }), { ...expected, gtin: "87654321" })).toBe(false);
  });
});
