import type { OfferAvailability, OfferSource, RefreshStatus } from "../schemas/enums";

export type VariantAttributes = Record<string, string>;
export type Specifications = Record<string, string>;

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface Store {
  id: string;
  slug: string;
  name: string;
  websiteUrl: string;
  logoUrl: string | null;
  isDemo: boolean;
}

/** Public offer fields. Internal refresh errors are never part of this type. */
export interface Offer {
  id: string;
  productId: string;
  store: Store;
  providerId: string;
  externalProductId: string | null;
  variantKey: string;
  productUrl: string;
  sellerName: string | null;
  pricePaise: number;
  originalPricePaise: number | null;
  availability: OfferAvailability;
  currency: "INR";
  source: OfferSource;
  /** ISO timestamp of the last successful provider verification, if any. */
  lastCheckedAt: string | null;
  refreshStatus: RefreshStatus;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  model: string | null;
  imageUrl: string | null;
  variantAttributes: VariantAttributes;
  isDemo: boolean;
  category: Pick<Category, "slug" | "name">;
  /** Lowest active, not-out-of-stock offer price, or null when none exist. */
  lowestPricePaise: number | null;
  offerCount: number;
  hasDemoOffers: boolean;
}

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  model: string | null;
  gtin: string | null;
  description: string | null;
  imageUrl: string | null;
  specifications: Specifications;
  variantAttributes: VariantAttributes;
  variantKey: string;
  isDemo: boolean;
  category: Category;
  offers: Offer[];
  /** Other variants of the same brand + model. Never merged with this product. */
  siblingVariants: Array<Pick<ProductSummary, "slug" | "name" | "variantAttributes">>;
  updatedAt: string;
}

export interface PriceObservation {
  offerId: string;
  storeName: string;
  pricePaise: number;
  availability: OfferAvailability;
  observedAt: string;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface SearchFacets {
  brands: FacetValue[];
  attributes: Record<string, FacetValue[]>;
}

export interface SearchResult {
  items: ProductSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: SearchFacets;
}
