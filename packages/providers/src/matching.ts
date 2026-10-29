import { compareVariants, getCategoryDefinition, normalizeSearchQuery } from "@pricedekho/shared";
import type { NormalizedOffer } from "./types";

export interface MatchCandidate {
  productId: string;
  categorySlug: string;
  brand: string | null;
  model: string | null;
  gtin: string | null;
  variantAttributes: Record<string, string>;
}

export type MatchResult =
  | { status: "matched"; productId: string; method: "gtin" | "brand_model_variant" }
  | { status: "ambiguous"; productIds: string[]; reason: string }
  | { status: "no_match"; reason: string };

const norm = (v: string | null) => (v ? normalizeSearchQuery(v) : "");

/**
 * Conservative product matching. A listing is linked to a catalog product only by:
 *  1. an exact GTIN match whose variant attributes don't conflict, or
 *  2. exact normalised brand + model, plus every identity attribute required
 *     by the category present and equal on both sides, with exactly one candidate.
 * Titles are never used to match. Anything uncertain stays unmatched so it
 * can be reviewed by a human.
 */
export function matchOfferToProduct(offer: NormalizedOffer, candidates: readonly MatchCandidate[]): MatchResult {
  if (offer.gtin) {
    const byGtin = candidates.filter((c) => c.gtin === offer.gtin);
    if (byGtin.length === 1) {
      const c = byGtin[0]!;
      const cmp = compareVariants(offer.variantAttributes, c.variantAttributes);
      if (cmp.compatible) return { status: "matched", productId: c.productId, method: "gtin" };
      return { status: "no_match", reason: `GTIN matched but variant attribute "${cmp.attribute}" conflicts` };
    }
    if (byGtin.length > 1) return { status: "ambiguous", productIds: byGtin.map((c) => c.productId), reason: "Duplicate GTIN in catalog" };
  }

  const brand = norm(offer.brand);
  const model = norm(offer.model);
  if (!brand || !model) return { status: "no_match", reason: "Listing lacks brand or model; title-only matching is not allowed" };

  const compatible = candidates.filter((c) => {
    if (norm(c.brand) !== brand || norm(c.model) !== model) return false;
    const identity = getCategoryDefinition(c.categorySlug)?.identityAttributes ?? [];
    return compareVariants(offer.variantAttributes, c.variantAttributes, identity).compatible;
  });

  if (compatible.length === 1) return { status: "matched", productId: compatible[0]!.productId, method: "brand_model_variant" };
  if (compatible.length > 1) {
    return { status: "ambiguous", productIds: compatible.map((c) => c.productId), reason: "Multiple variants are compatible" };
  }
  return { status: "no_match", reason: "No product with the same brand, model and variant" };
}

/**
 * Verifies that a refreshed listing still describes the variant the offer
 * row was created for (e.g. a retailer did not swap 128GB for 256GB on the
 * same URL).
 */
export function refreshedListingMatches(
  offer: NormalizedOffer,
  expected: { variantKey: string; gtin: string | null; storeSlug: string; providerId: string },
): boolean {
  if (offer.storeSlug !== expected.storeSlug || offer.providerId !== expected.providerId) return false;
  if (expected.gtin && offer.gtin && expected.gtin !== offer.gtin) return false;
  // Providers that cannot report variant attributes return an empty key; only
  // accept that when the stored key is also empty.
  return offer.variantKey === expected.variantKey;
}
