import { slugSchema } from "@pricedekho/shared";
import { getCatalog, getFreshnessConfig } from "@/lib/catalog";
import { fail, internalError, ok, PUBLIC_CACHE_HEADERS, validationError } from "@/lib/api";
import { presentProduct } from "@/lib/present";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** GET /api/products/[slug] — product details with offers sorted by price. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const limit = await rateLimit(request, "product", 120);
  if (!limit.allowed) return fail(429, "rate_limited", "Too many requests. Please slow down.", { headers: rateLimitHeaders(limit) });

  const slug = slugSchema.safeParse((await params).slug);
  if (!slug.success) return validationError(slug.error);

  try {
    const catalog = getCatalog();
    const product = await catalog.getProductBySlug(slug.data);
    if (!product) return fail(404, "not_found", "Product not found");
    const config = getFreshnessConfig();
    return ok(presentProduct(product, new Date(), config), {
      meta: { dataMode: catalog.mode },
      headers: { ...PUBLIC_CACHE_HEADERS, ...rateLimitHeaders(limit) },
    });
  } catch (error) {
    return internalError("product", error);
  }
}
