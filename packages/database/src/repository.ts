import type {
  Category,
  Offer,
  PriceObservation,
  ProductDetail,
  ProductSummary,
  SearchFacets,
  SearchQuery,
  SearchResult,
} from "@pricedekho/shared";
import { getCategoryDefinition } from "@pricedekho/shared";

export type RepositoryMode = "demo-memory" | "supabase";

/** Read-only catalog access used by pages and public API routes. */
export interface CatalogRepository {
  readonly mode: RepositoryMode;
  listCategories(): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | null>;
  searchProducts(query: SearchQuery): Promise<SearchResult>;
  listFeaturedProducts(limit: number): Promise<ProductSummary[]>;
  getProductBySlug(slug: string): Promise<ProductDetail | null>;
  getPriceHistory(productId: string, options: { since: string | null; limit: number }): Promise<PriceObservation[]>;
  listProductSlugs(limit: number): Promise<Array<{ slug: string; updatedAt: string }>>;
}

export class RepositoryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RepositoryError";
  }
}

/**
 * Drops offers whose variant differs from the product's variant. A product
 * page must never present a 256GB listing as a price for the 128GB model.
 */
export function onlyMatchingVariant<T extends Pick<Offer, "variantKey">>(offers: T[], productVariantKey: string): T[] {
  return offers.filter((o) => o.variantKey === productVariantKey);
}

/** Restricts attribute facets to the filters meaningful for the category. */
export function shapeFacets(
  rows: Array<{ facet: string; value: string; count: number }>,
  categorySlug: string | undefined,
): SearchFacets {
  // Attribute filters only make sense within a category (storage for phones, size for shoes).
  const allowed = new Set<string>(categorySlug ? (getCategoryDefinition(categorySlug)?.filters ?? []) : []);
  const facets: SearchFacets = { brands: [], attributes: {} };
  for (const row of rows) {
    if (row.facet === "brand") facets.brands.push({ value: row.value, count: row.count });
    else if (allowed.has(row.facet)) (facets.attributes[row.facet] ??= []).push({ value: row.value, count: row.count });
  }
  facets.brands.sort((a, b) => a.value.localeCompare(b.value));
  for (const values of Object.values(facets.attributes)) values.sort((a, b) => a.value.localeCompare(b.value, "en", { numeric: true }));
  return facets;
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
