import type { Offer } from "../types/catalog";
import { computePriceStatus, type FreshnessConfig, type PriceStatus } from "./freshness";

const AVAILABILITY_RANK: Record<Offer["availability"], number> = {
  in_stock: 0,
  limited: 0,
  preorder: 1,
  unknown: 2,
  out_of_stock: 3,
};

/**
 * Sorts offers lowest price first. Purchasable offers come before preorder,
 * unknown and out-of-stock ones so an unavailable listing never appears to be
 * the best deal. Ties break on store name for stable output.
 */
export function sortOffersByPrice<T extends Pick<Offer, "pricePaise" | "availability"> & { store: { name: string } }>(
  offers: readonly T[],
): T[] {
  return [...offers].sort(
    (a, b) =>
      AVAILABILITY_RANK[a.availability] - AVAILABILITY_RANK[b.availability] ||
      a.pricePaise - b.pricePaise ||
      a.store.name.localeCompare(b.store.name),
  );
}

export interface OfferWithStatus<T extends Offer = Offer> {
  offer: T;
  status: PriceStatus;
}

export function withStatuses<T extends Offer>(offers: readonly T[], now: Date, config: FreshnessConfig): OfferWithStatus<T>[] {
  return sortOffersByPrice(offers).map((offer) => ({ offer, status: computePriceStatus(offer, now, config) }));
}

export type LowestOffer<T extends Offer = Offer> = { kind: "verified"; offer: T } | { kind: "demo"; offer: T } | null;

/**
 * The headline "lowest price". Only LIVE in-stock offers qualify as verified.
 * Demo offers can produce a clearly labelled demo lowest price. Stale and
 * errored offers never qualify.
 */
export function pickLowestOffer<T extends Offer>(entries: readonly OfferWithStatus<T>[]): LowestOffer<T> {
  const purchasable = (e: OfferWithStatus<T>) => e.offer.availability !== "out_of_stock";
  const live = entries.filter((e) => e.status === "live" && purchasable(e));
  if (live.length > 0) return { kind: "verified", offer: sortOffersByPrice(live.map((e) => e.offer))[0]! };
  const demo = entries.filter((e) => e.status === "demo" && purchasable(e));
  if (demo.length > 0) return { kind: "demo", offer: sortOffersByPrice(demo.map((e) => e.offer))[0]! };
  return null;
}
