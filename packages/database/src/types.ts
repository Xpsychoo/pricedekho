/**
 * Explicit row types for the PriceDekho schema (see supabase/migrations).
 * Query results are validated against these Zod schemas at the repository
 * boundary instead of trusting untyped JSON from PostgREST.
 */
import { offerAvailabilitySchema, offerSourceSchema, refreshStatusSchema } from "@pricedekho/shared";
import { z } from "zod";

/** PostgREST returns bigint as a JSON number; accept numeric strings too. */
const bigintSchema = z.union([z.number(), z.string().regex(/^\d+$/)]).transform(Number);
const stringRecord = z.record(z.string(), z.unknown()).transform((r) =>
  Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v)])),
);

export const categoryRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});
export type CategoryRow = z.infer<typeof categoryRowSchema>;

export const storeRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  website_url: z.string(),
  logo_url: z.string().nullable(),
  is_demo: z.boolean(),
});
export type StoreRow = z.infer<typeof storeRowSchema>;

export const offerRowSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  provider_id: z.string(),
  external_product_id: z.string().nullable(),
  variant_key: z.string(),
  product_url: z.string(),
  seller_name: z.string().nullable(),
  price_paise: bigintSchema,
  original_price_paise: bigintSchema.nullable(),
  availability: offerAvailabilitySchema,
  currency: z.literal("INR"),
  source: offerSourceSchema,
  last_checked_at: z.string().nullable(),
  refresh_status: refreshStatusSchema,
  store: storeRowSchema,
});
export type OfferRow = z.infer<typeof offerRowSchema>;

export const productDetailRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  gtin: z.string().nullable(),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  specifications: stringRecord,
  variant_attributes: stringRecord,
  variant_key: z.string(),
  is_demo: z.boolean(),
  updated_at: z.string(),
  category: categoryRowSchema,
  offers: z.array(offerRowSchema),
});
export type ProductDetailRow = z.infer<typeof productDetailRowSchema>;

/** Row returned by the search_products() SQL function. */
export const searchRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  image_url: z.string().nullable(),
  variant_attributes: stringRecord,
  is_demo: z.boolean(),
  category_slug: z.string(),
  category_name: z.string(),
  lowest_price_paise: bigintSchema.nullable(),
  offer_count: z.number(),
  has_demo_offers: z.boolean(),
  total_count: bigintSchema,
});
export type SearchRow = z.infer<typeof searchRowSchema>;

export const facetRowSchema = z.object({
  facet: z.string(),
  value: z.string(),
  product_count: bigintSchema,
});

export const historyRowSchema = z.object({
  offer_id: z.string(),
  price_paise: bigintSchema,
  availability: offerAvailabilitySchema,
  observed_at: z.string(),
});
