import "server-only";
import { cache } from "react";
import {
  createPublicSupabaseClient,
  MemoryCatalogRepository,
  SupabaseCatalogRepository,
  type CatalogRepository,
} from "@pricedekho/database";
import { freshnessConfigFromHours, type FreshnessConfig } from "@pricedekho/shared";
import { getServerEnv } from "./env";

let repository: CatalogRepository | undefined;

/**
 * Returns the catalog repository. Uses Supabase (publishable key, RLS
 * enforced) when configured; otherwise the bundled DEMO catalog. The
 * privileged secret key is never used for public reads.
 */
export function getCatalog(): CatalogRepository {
  if (repository) return repository;
  const env = getServerEnv();
  repository =
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? new SupabaseCatalogRepository(createPublicSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY))
      : new MemoryCatalogRepository();
  return repository;
}

/** Test hook. */
export function setCatalogForTesting(repo: CatalogRepository | undefined) {
  repository = repo;
}

export function getFreshnessConfig(): FreshnessConfig {
  return freshnessConfigFromHours(getServerEnv().PRICE_FRESHNESS_HOURS);
}

/** Request-scoped memoisation so generateMetadata and the page share one query. */
export const getProductCached = cache((slug: string) => getCatalog().getProductBySlug(slug));
export const getCategoryCached = cache((slug: string) => getCatalog().getCategoryBySlug(slug));
export const listCategoriesCached = cache(() => getCatalog().listCategories());
