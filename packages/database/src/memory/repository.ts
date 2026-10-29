import {
  DEMO_CATEGORIES,
  DEMO_CREATED_AT,
  DEMO_PRODUCTS,
  DEMO_PROVIDER_ID,
  DEMO_STORES,
  type DemoProduct,
} from "@pricedekho/shared/demo";
import {
  scoreSearchMatch,
  type Category,
  type Offer,
  type PriceObservation,
  type ProductDetail,
  type ProductSummary,
  type SearchQuery,
  type SearchResult,
  type Store,
} from "@pricedekho/shared";
import { onlyMatchingVariant, shapeFacets, totalPages, type CatalogRepository } from "../repository";

/**
 * In-memory repository over the bundled DEMO catalog. Used when Supabase is
 * not configured so the app runs locally without credentials. Every offer
 * has source "demo" and was never verified, so it can never render as LIVE.
 * There is no price history in demo mode.
 */
export class MemoryCatalogRepository implements CatalogRepository {
  readonly mode = "demo-memory" as const;

  private readonly categories: Category[] = DEMO_CATEGORIES.map((c) => ({ ...c }));
  private readonly stores = new Map<string, Store>(
    DEMO_STORES.map((s) => [s.id, { id: s.id, slug: s.slug, name: s.name, websiteUrl: s.websiteUrl, logoUrl: null, isDemo: true }]),
  );

  private category(id: string): Category {
    return this.categories.find((c) => c.id === id)!;
  }

  private offersFor(p: DemoProduct): Offer[] {
    return p.offers.map((o) => ({
      id: o.id,
      productId: p.id,
      store: this.stores.get(o.storeId)!,
      providerId: DEMO_PROVIDER_ID,
      externalProductId: o.externalProductId,
      variantKey: p.variantKey,
      productUrl: o.productUrl,
      sellerName: o.sellerName,
      pricePaise: o.pricePaise,
      originalPricePaise: o.originalPricePaise,
      availability: o.availability,
      currency: "INR",
      source: "demo",
      lastCheckedAt: null,
      refreshStatus: "never",
    }));
  }

  private summarize(p: DemoProduct): ProductSummary {
    const category = this.category(p.categoryId);
    const purchasable = p.offers.filter((o) => o.availability !== "out_of_stock").map((o) => o.pricePaise);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      model: p.model,
      imageUrl: p.imageUrl,
      variantAttributes: p.variantAttributes,
      isDemo: true,
      category: { slug: category.slug, name: category.name },
      lowestPricePaise: purchasable.length ? Math.min(...purchasable) : null,
      offerCount: p.offers.length,
      hasDemoOffers: p.offers.length > 0,
    };
  }

  async listCategories() {
    return this.categories;
  }

  async getCategoryBySlug(slug: string) {
    return this.categories.find((c) => c.slug === slug) ?? null;
  }

  async searchProducts(query: SearchQuery): Promise<SearchResult> {
    const q = query.q ?? "";
    const scoped = DEMO_PRODUCTS.map((p) => ({ p, score: scoreSearchMatch(q, { primary: [p.name, p.brand, p.model], secondary: [p.description] }) }))
      .filter(({ p, score }) => score > 0 && (!query.category || this.category(p.categoryId).slug === query.category));

    const facetRows = new Map<string, { facet: string; value: string; count: number }>();
    const bump = (facet: string, value: string) => {
      const key = `${facet}\u0000${value}`;
      const row = facetRows.get(key) ?? { facet, value, count: 0 };
      row.count += 1;
      facetRows.set(key, row);
    };
    for (const { p } of scoped) {
      bump("brand", p.brand);
      for (const [k, v] of Object.entries(p.variantAttributes)) bump(k, v);
    }

    const filtered = scoped.filter(
      ({ p }) =>
        (!query.brand || p.brand.toLowerCase() === query.brand.toLowerCase()) &&
        Object.entries(query.attributes).every(([k, v]) => p.variantAttributes[k] === v),
    );

    const items = filtered.map(({ p, score }) => ({ summary: this.summarize(p), score }));
    const byPrice = (dir: 1 | -1) => (a: (typeof items)[number], b: (typeof items)[number]) => {
      const pa = a.summary.lowestPricePaise;
      const pb = b.summary.lowestPricePaise;
      if (pa === null) return pb === null ? 0 : 1;
      if (pb === null) return -1;
      return (pa - pb) * dir;
    };
    items.sort((a, b) => {
      switch (query.sort) {
        case "price_asc":
          return byPrice(1)(a, b) || a.summary.name.localeCompare(b.summary.name);
        case "price_desc":
          return byPrice(-1)(a, b) || a.summary.name.localeCompare(b.summary.name);
        case "name":
          return a.summary.name.localeCompare(b.summary.name);
        default:
          return b.score - a.score || a.summary.name.localeCompare(b.summary.name);
      }
    });

    const start = (query.page - 1) * query.pageSize;
    return {
      items: items.slice(start, start + query.pageSize).map((i) => i.summary),
      total: items.length,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: totalPages(items.length, query.pageSize),
      facets: shapeFacets([...facetRows.values()], query.category),
    };
  }

  async listFeaturedProducts(limit: number) {
    return DEMO_PRODUCTS.slice(0, limit).map((p) => this.summarize(p));
  }

  async getProductBySlug(slug: string): Promise<ProductDetail | null> {
    const p = DEMO_PRODUCTS.find((x) => x.slug === slug);
    if (!p) return null;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      model: p.model,
      gtin: null,
      description: p.description,
      imageUrl: p.imageUrl,
      specifications: p.specifications,
      variantAttributes: p.variantAttributes,
      variantKey: p.variantKey,
      isDemo: true,
      category: this.category(p.categoryId),
      offers: onlyMatchingVariant(this.offersFor(p), p.variantKey),
      siblingVariants: DEMO_PRODUCTS.filter((s) => s.id !== p.id && s.brand === p.brand && s.model === p.model).map((s) => ({
        slug: s.slug,
        name: s.name,
        variantAttributes: s.variantAttributes,
      })),
      updatedAt: DEMO_CREATED_AT,
    };
  }

  /** Demo mode has no price history; synthetic history is never generated. */
  async getPriceHistory(_productId: string, _options: { since: string | null; limit: number }): Promise<PriceObservation[]> {
    return [];
  }

  async listProductSlugs(limit: number) {
    return DEMO_PRODUCTS.slice(0, limit).map((p) => ({ slug: p.slug, updatedAt: DEMO_CREATED_AT }));
  }
}
