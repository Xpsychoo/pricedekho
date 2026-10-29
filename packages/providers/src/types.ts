import type { OfferAvailability, OfferSource } from "@pricedekho/shared";

/**
 * A retailer listing as reported by a provider, after normalisation.
 * Providers must only populate fields they actually received; never guess.
 */
export interface NormalizedOffer {
  providerId: string;
  /** Slug of the store this listing belongs to (must exist in the stores table). */
  storeSlug: string;
  externalProductId: string | null;
  title: string;
  brand: string | null;
  model: string | null;
  gtin: string | null;
  variantAttributes: Record<string, string>;
  variantKey: string;
  pricePaise: number;
  /** Only when the provider reports a verified list/MRP price. */
  originalPricePaise: number | null;
  currency: "INR";
  availability: OfferAvailability;
  sellerName: string | null;
  productUrl: string;
  /** Only when the provider's terms permit displaying the image. */
  imageUrl: string | null;
  sourceType: OfferSource;
  /** When the provider produced this data (ISO). */
  fetchedAt: string;
}

/** Identifies an existing listing that a provider may be able to refresh. */
export interface ListingRef {
  offerId: string;
  providerId: string;
  storeSlug: string;
  externalProductId: string | null;
  productUrl: string;
  variantKey: string;
}

export interface ProviderCapabilities {
  search: boolean;
  /** Can refresh a single known listing by its reference. */
  refresh: boolean;
}

export interface ProviderCallOptions {
  signal?: AbortSignal;
}

export interface PriceProvider {
  readonly id: string;
  readonly displayName: string;
  readonly sourceType: OfferSource;
  readonly capabilities: ProviderCapabilities;
  search(query: string, options?: ProviderCallOptions): Promise<NormalizedOffer[]>;
  /** Returns null when the listing no longer exists at the source. */
  refreshListing?(ref: ListingRef, options?: ProviderCallOptions): Promise<NormalizedOffer | null>;
}

export class ProviderError extends Error {
  constructor(
    readonly providerId: string,
    message: string,
    readonly code: "not_configured" | "timeout" | "upstream" | "invalid_response" | "unsupported" = "upstream",
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
