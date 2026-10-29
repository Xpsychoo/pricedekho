import { HISTORY_RANGE_DAYS, historyQuerySchema, slugSchema } from "@pricedekho/shared";
import { getCatalog } from "@/lib/catalog";
import { fail, internalError, ok, PUBLIC_CACHE_HEADERS, validationError } from "@/lib/api";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/products/[slug]/history?range=90d&limit=500
 * Returns only recorded observations. Gaps are left as gaps — nothing is
 * interpolated or synthesised.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const limit = await rateLimit(request, "history", 60);
  if (!limit.allowed) return fail(429, "rate_limited", "Too many requests. Please slow down.", { headers: rateLimitHeaders(limit) });

  const slug = slugSchema.safeParse((await params).slug);
  if (!slug.success) return validationError(slug.error);
  const url = new URL(request.url);
  const query = historyQuerySchema.safeParse({
    range: url.searchParams.get("range") || undefined,
    limit: url.searchParams.get("limit") || undefined,
  });
  if (!query.success) return validationError(query.error);

  try {
    const catalog = getCatalog();
    const product = await catalog.getProductBySlug(slug.data);
    if (!product) return fail(404, "not_found", "Product not found");
    const days = HISTORY_RANGE_DAYS[query.data.range];
    const since = days === null ? null : new Date(Date.now() - days * 86_400_000).toISOString();
    const observations = await catalog.getPriceHistory(product.id, { since, limit: query.data.limit });
    return ok(
      { productSlug: product.slug, range: query.data.range, observations },
      { meta: { dataMode: catalog.mode, count: observations.length }, headers: { ...PUBLIC_CACHE_HEADERS, ...rateLimitHeaders(limit) } },
    );
  } catch (error) {
    return internalError("history", error);
  }
}
