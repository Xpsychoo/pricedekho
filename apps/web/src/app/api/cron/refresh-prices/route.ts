import { createAdminSupabaseClient, SupabaseRefreshStore } from "@pricedekho/database/admin";
import { createDefaultRegistry, runPriceRefresh } from "@pricedekho/providers";
import { fail, internalError, ok } from "@/lib/api";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/cron/refresh-prices (GET is accepted too because Vercel Cron
 * issues GET requests). Requires "Authorization: Bearer $CRON_SECRET".
 *
 * This endpoint performs one bounded batch of refresh work. It does not
 * schedule itself; scheduling is done by Vercel Cron (see vercel.json) or
 * any external scheduler. Safe to retry: writes are idempotent and failures
 * never overwrite the last valid price.
 */
async function handle(request: Request) {
  let env;
  try {
    env = getServerEnv();
  } catch (error) {
    return internalError("cron env", error);
  }

  if (!isAuthorizedCronRequest(request, env.CRON_SECRET)) {
    return fail(401, "unauthorized", "Unauthorized");
  }

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    return fail(503, "not_configured", "Price refresh requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  }

  try {
    const store = new SupabaseRefreshStore(createAdminSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY));
    const registry = createDefaultRegistry({ enableDemo: env.PRICEDEKHO_ENABLE_DEMO_PROVIDER === "true" });
    const summary = await runPriceRefresh({
      registry,
      store,
      batchSize: env.REFRESH_BATCH_SIZE,
      observationIntervalMs: env.PRICE_OBSERVATION_INTERVAL_HOURS * 3_600_000,
      timeBudgetMs: 45_000,
    });
    return ok(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return internalError("cron refresh", error);
  }
}

export const POST = handle;
export const GET = handle;
