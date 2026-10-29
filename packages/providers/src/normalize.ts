import { buildVariantKey, normalizeVariantAttributes, offerAvailabilitySchema, offerSourceSchema } from "@pricedekho/shared";
import { z } from "zod";
import type { NormalizedOffer } from "./types";

const paise = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

const httpsUrl = z
  .string()
  .max(2048)
  .refine((v) => {
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be an https URL");

/** Raw provider output before normalisation. Adapters map their payloads to this. */
export const rawOfferSchema = z.object({
  providerId: z.string().min(1).max(64),
  storeSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  externalProductId: z.string().trim().min(1).max(200).nullable().default(null),
  title: z.string().trim().min(1).max(300),
  brand: z.string().trim().max(120).nullable().default(null),
  model: z.string().trim().max(120).nullable().default(null),
  gtin: z
    .string()
    .regex(/^\d{8,14}$/)
    .nullable()
    .default(null),
  variantAttributes: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  pricePaise: paise,
  originalPricePaise: paise.nullable().default(null),
  currency: z.literal("INR"),
  availability: offerAvailabilitySchema.default("unknown"),
  sellerName: z.string().trim().max(200).nullable().default(null),
  productUrl: httpsUrl,
  imageUrl: httpsUrl.nullable().default(null),
  sourceType: offerSourceSchema,
  fetchedAt: z.iso.datetime(),
});

export type RawOffer = z.input<typeof rawOfferSchema>;

export type NormalizeResult = { ok: true; offer: NormalizedOffer } | { ok: false; error: string };

/**
 * Validates and normalises a provider result. Invalid results are rejected
 * rather than repaired, so a malformed upstream payload cannot overwrite a
 * previously valid price.
 */
export function normalizeOffer(raw: unknown): NormalizeResult {
  const parsed = rawOfferSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".") || "offer"}: ${i.message}`).join("; ") };
  }
  const v = parsed.data;
  const variantAttributes = normalizeVariantAttributes(v.variantAttributes);
  // An "original price" at or below the selling price is not a discount.
  const originalPricePaise = v.originalPricePaise !== null && v.originalPricePaise > v.pricePaise ? v.originalPricePaise : null;
  return {
    ok: true,
    offer: {
      ...v,
      originalPricePaise,
      variantAttributes,
      variantKey: buildVariantKey(variantAttributes),
    },
  };
}
