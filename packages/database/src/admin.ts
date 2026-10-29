import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DueListing, RefreshStore } from "@pricedekho/providers";
import { offerAvailabilitySchema } from "@pricedekho/shared";
import { z } from "zod";
import { RepositoryError } from "./repository";

/**
 * PRIVILEGED. Uses the Supabase secret key, which bypasses Row Level
 * Security. Only import from server-side code that has already authorised
 * the caller (e.g. the cron route after verifying CRON_SECRET). The
 * "server-only" import makes any client-bundle import fail the build.
 */
export function createAdminSupabaseClient(url: string, secretKey: string): SupabaseClient {
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

const dueRowSchema = z.object({
  id: z.string(),
  provider_id: z.string(),
  external_product_id: z.string().nullable(),
  product_url: z.string(),
  variant_key: z.string(),
  store: z.object({ slug: z.string() }),
  product: z.object({ gtin: z.string().nullable() }),
});

const latestRowSchema = z.object({
  offer_id: z.string(),
  price_paise: z.union([z.number(), z.string()]).transform(Number),
  availability: offerAvailabilitySchema,
  observed_at: z.string(),
});

export class SupabaseRefreshStore implements RefreshStore {
  constructor(private readonly db: SupabaseClient) {}

  async listDueListings(input: { providerIds: string[]; limit: number; attemptedBefore: string }): Promise<DueListing[]> {
    const { data, error } = await this.db
      .from("offers")
      .select("id, provider_id, external_product_id, product_url, variant_key, store:stores!inner(slug), product:products!inner(gtin)")
      .eq("active", true)
      .eq("store.active", true)
      .in("provider_id", input.providerIds)
      .or(`last_refresh_attempt_at.is.null,last_refresh_attempt_at.lt."${input.attemptedBefore}"`)
      .order("last_refresh_attempt_at", { ascending: true, nullsFirst: true })
      .limit(input.limit);
    if (error) throw new RepositoryError("listDueListings failed", { cause: error });
    const rows = z.array(dueRowSchema).parse(data);
    if (rows.length === 0) return [];

    const latest = await this.db.rpc("latest_price_observations", { p_offer_ids: rows.map((r) => r.id) });
    if (latest.error) throw new RepositoryError("latest_price_observations failed", { cause: latest.error });
    const lastByOffer = new Map(z.array(latestRowSchema).parse(latest.data).map((r) => [r.offer_id, r]));

    return rows.map((r) => {
      const last = lastByOffer.get(r.id);
      return {
        offerId: r.id,
        providerId: r.provider_id,
        storeSlug: r.store.slug,
        externalProductId: r.external_product_id,
        productUrl: r.product_url,
        variantKey: r.variant_key,
        productGtin: r.product.gtin,
        lastObservation: last ? { pricePaise: last.price_paise, availability: last.availability, observedAt: last.observed_at } : null,
      };
    });
  }

  async applyRefresh(input: Parameters<RefreshStore["applyRefresh"]>[0]): Promise<void> {
    const { error } = await this.db.rpc("apply_offer_refresh", {
      p_offer_id: input.offerId,
      p_price_paise: input.offer.pricePaise,
      p_original_price_paise: input.offer.originalPricePaise,
      p_availability: input.offer.availability,
      p_seller_name: input.offer.sellerName,
      p_checked_at: input.checkedAt,
      p_record_history: input.recordHistory,
    });
    if (error) throw new RepositoryError("apply_offer_refresh failed", { cause: error });
  }

  async recordFailure(input: Parameters<RefreshStore["recordFailure"]>[0]): Promise<void> {
    const { error } = await this.db.rpc("record_offer_refresh_failure", {
      p_offer_id: input.offerId,
      p_attempted_at: input.attemptedAt,
      p_message: input.message,
    });
    if (error) throw new RepositoryError("record_offer_refresh_failure failed", { cause: error });
  }
}
