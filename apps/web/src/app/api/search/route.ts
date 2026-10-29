import { parseSearchQuery } from "@pricedekho/shared";
import { getCatalog } from "@/lib/catalog";
import { fail, internalError, ok, PUBLIC_CACHE_HEADERS, validationError } from "@/lib/api";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** GET /api/search?q=iphone&category=mobiles&brand=Apple&storage=128gb&sort=price_asc&page=1 */
export async function GET(request: Request) {
  const limit = await rateLimit(request, "search", 60);
  if (!limit.allowed) return fail(429, "rate_limited", "Too many requests. Please slow down.", { headers: rateLimitHeaders(limit) });

  const parsed = parseSearchQuery(new URL(request.url).searchParams);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const catalog = getCatalog();
    const result = await catalog.searchProducts(parsed.data);
    return ok(result, {
      meta: { query: parsed.data, dataMode: catalog.mode },
      headers: { ...PUBLIC_CACHE_HEADERS, ...rateLimitHeaders(limit) },
    });
  } catch (error) {
    return internalError("search", error);
  }
}
