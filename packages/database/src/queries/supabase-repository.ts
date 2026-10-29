import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, Offer, PriceObservation, ProductDetail, ProductSummary, SearchQuery, SearchResult } from "@pricedekho/shared";
import { normalizeSearchQuery } from "@pricedekho/shared";
import { z } from "zod";
import { onlyMatchingVariant, RepositoryError, shapeFacets, totalPages, type CatalogRepository } from "../repository";
import {
  categoryRowSchema,
  facetRowSchema,
  historyRowSchema,
  productDetailRowSchema,
  searchRowSchema,
  type OfferRow,
  type SearchRow,
} from "../types";

// Explicit column lists: offers has column-level grants, so "*" would fail
// for public roles, and listing columns avoids leaking anything new by accident.
const CATEGORY_COLUMNS = "id, slug, name, description";
const STORE_COLUMNS = "id, slug, name, website_url, logo_url, is_demo";
const OFFER_COLUMNS = `id, product_id, provider_id, external_product_id, variant_key, product_url, seller_name, price_paise,
  original_price_paise, availability, currency, source, last_checked_at, refresh_status, store:stores!inner(${STORE_COLUMNS})`;
const PRODUCT_DETAIL_COLUMNS = `id, slug, name, brand, model, gtin, description, image_url, specifications, variant_attributes,
  variant_key, is_demo, updated_at, category:categories!inner(${CATEGORY_COLUMNS}), offers(${OFFER_COLUMNS})`;

function fail(context: string, cause: unknown): never {
  // The message is logged server-side; API responses use a generic message.
  throw new RepositoryError(`Database query failed: ${context}`, { cause });
}

function parse<T>(schema: z.ZodType<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);
  if (!result.success) fail(`${context} returned unexpected data`, result.error);
  return result.data;
}

function toSummary(row: SearchRow): ProductSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    model: row.model,
    imageUrl: row.image_url,
    variantAttributes: row.variant_attributes,
    isDemo: row.is_demo,
    category: { slug: row.category_slug, name: row.category_name },
    lowestPricePaise: row.lowest_price_paise,
    offerCount: row.offer_count,
    hasDemoOffers: row.has_demo_offers,
  };
}

function toOffer(row: OfferRow): Offer {
  return {
    id: row.id,
    productId: row.product_id,
    store: {
      id: row.store.id,
      slug: row.store.slug,
      name: row.store.name,
      websiteUrl: row.store.website_url,
      logoUrl: row.store.logo_url,
      isDemo: row.store.is_demo,
    },
    providerId: row.provider_id,
    externalProductId: row.external_product_id,
    variantKey: row.variant_key,
    productUrl: row.product_url,
    sellerName: row.seller_name,
    pricePaise: row.price_paise,
    originalPricePaise: row.original_price_paise,
    availability: row.availability,
    currency: row.currency,
    source: row.source,
    lastCheckedAt: row.last_checked_at,
    refreshStatus: row.refresh_status,
  };
}

/** Catalog reads through PostgREST with the publishable key (RLS enforced). */
export class SupabaseCatalogRepository implements CatalogRepository {
  readonly mode = "supabase" as const;

  constructor(private readonly db: SupabaseClient) {}

  async listCategories(): Promise<Category[]> {
    const { data, error } = await this.db.from("categories").select(CATEGORY_COLUMNS).order("name");
    if (error) fail("listCategories", error);
    return parse(z.array(categoryRowSchema), data, "listCategories");
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const { data, error } = await this.db.from("categories").select(CATEGORY_COLUMNS).eq("slug", slug).maybeSingle();
    if (error) fail("getCategoryBySlug", error);
    return data ? parse(categoryRowSchema, data, "getCategoryBySlug") : null;
  }

  async searchProducts(query: SearchQuery): Promise<SearchResult> {
    const q = query.q ? normalizeSearchQuery(query.q) || null : null;
    const [results, facets] = await Promise.all([
      this.db.rpc("search_products", {
        p_query: q,
        p_category_slug: query.category ?? null,
        p_brand: query.brand ?? null,
        p_attributes: query.attributes,
        p_sort: query.sort,
        p_limit: query.pageSize,
        p_offset: (query.page - 1) * query.pageSize,
      }),
      this.db.rpc("search_facets", { p_query: q, p_category_slug: query.category ?? null }),
    ]);
    if (results.error) fail("search_products", results.error);
    if (facets.error) fail("search_facets", facets.error);
    const rows = parse(z.array(searchRowSchema), results.data, "search_products");
    const facetRows = parse(z.array(facetRowSchema), facets.data, "search_facets");
    const total = rows[0]?.total_count ?? 0;
    return {
      items: rows.map(toSummary),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: totalPages(total, query.pageSize),
      facets: shapeFacets(
        facetRows.map((r) => ({ facet: r.facet, value: r.value, count: r.product_count })),
        query.category,
      ),
    };
  }

  async listFeaturedProducts(limit: number): Promise<ProductSummary[]> {
    const { data, error } = await this.db.rpc("search_products", { p_sort: "relevance", p_limit: limit, p_offset: 0 });
    if (error) fail("listFeaturedProducts", error);
    return parse(z.array(searchRowSchema), data, "listFeaturedProducts").map(toSummary);
  }

  async getProductBySlug(slug: string): Promise<ProductDetail | null> {
    const { data, error } = await this.db.from("products").select(PRODUCT_DETAIL_COLUMNS).eq("slug", slug).maybeSingle();
    if (error) fail("getProductBySlug", error);
    if (!data) return null;
    const row = parse(productDetailRowSchema, data, "getProductBySlug");

    let siblingVariants: ProductDetail["siblingVariants"] = [];
    if (row.brand && row.model) {
      const siblings = await this.db
        .from("products")
        .select("slug, name, variant_attributes")
        .eq("brand", row.brand)
        .eq("model", row.model)
        .neq("id", row.id)
        .order("name")
        .limit(20);
      if (siblings.error) fail("siblingVariants", siblings.error);
      siblingVariants = parse(
        z.array(z.object({ slug: z.string(), name: z.string(), variant_attributes: z.record(z.string(), z.string()) })),
        siblings.data,
        "siblingVariants",
      ).map((s) => ({ slug: s.slug, name: s.name, variantAttributes: s.variant_attributes }));
    }

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      brand: row.brand,
      model: row.model,
      gtin: row.gtin,
      description: row.description,
      imageUrl: row.image_url,
      specifications: row.specifications,
      variantAttributes: row.variant_attributes,
      variantKey: row.variant_key,
      isDemo: row.is_demo,
      category: row.category,
      offers: onlyMatchingVariant(row.offers.map(toOffer), row.variant_key),
      siblingVariants,
      updatedAt: row.updated_at,
    };
  }

  async getPriceHistory(productId: string, options: { since: string | null; limit: number }): Promise<PriceObservation[]> {
    const offers = await this.db.from("offers").select("id, store:stores!inner(name)").eq("product_id", productId);
    if (offers.error) fail("getPriceHistory offers", offers.error);
    const offerRows = parse(z.array(z.object({ id: z.string(), store: z.object({ name: z.string() }) })), offers.data, "history offers");
    if (offerRows.length === 0) return [];
    const storeNames = new Map(offerRows.map((o) => [o.id, o.store.name]));

    let request = this.db
      .from("price_history")
      .select("offer_id, price_paise, availability, observed_at")
      .in("offer_id", [...storeNames.keys()])
      .order("observed_at", { ascending: false })
      .limit(options.limit);
    if (options.since) request = request.gte("observed_at", options.since);
    const { data, error } = await request;
    if (error) fail("getPriceHistory", error);
    return parse(z.array(historyRowSchema), data, "getPriceHistory")
      .reverse()
      .map((h) => ({
        offerId: h.offer_id,
        storeName: storeNames.get(h.offer_id) ?? "Unknown store",
        pricePaise: h.price_paise,
        availability: h.availability,
        observedAt: h.observed_at,
      }));
  }

  async listProductSlugs(limit: number) {
    const { data, error } = await this.db.from("products").select("slug, updated_at").order("updated_at", { ascending: false }).limit(limit);
    if (error) fail("listProductSlugs", error);
    return parse(z.array(z.object({ slug: z.string(), updated_at: z.string() })), data, "listProductSlugs").map((r) => ({
      slug: r.slug,
      updatedAt: r.updated_at,
    }));
  }
}
