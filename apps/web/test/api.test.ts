// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Routes read env once per module instance, so each test gets fresh modules. */
async function loadRoutes(env: Record<string, string> = {}) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "CRON_SECRET", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) {
    vi.stubEnv(key, "");
  }
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return {
    search: await import("@/app/api/search/route"),
    product: await import("@/app/api/products/[slug]/route"),
    history: await import("@/app/api/products/[slug]/history/route"),
    cron: await import("@/app/api/cron/refresh-prices/route"),
  };
}

let ipCounter = 0;
const req = (path: string, init: RequestInit = {}) =>
  new Request(`http://localhost${path}`, { ...init, headers: { "x-forwarded-for": `10.0.0.${++ipCounter % 250}`, ...init.headers } });
const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe("GET /api/search", () => {
  let routes: Awaited<ReturnType<typeof loadRoutes>>;
  beforeEach(async () => {
    routes = await loadRoutes();
  });

  it("returns a consistent success envelope", async () => {
    const res = await routes.search.GET(req("/api/search?q=iphone&category=mobiles&sort=price_asc"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.meta.dataMode).toBe("demo-memory");
    expect(body.data.items.length).toBe(2);
    expect(body.data).toMatchObject({ page: 1, pageSize: 12 });
  });

  it("works without a query", async () => {
    const res = await routes.search.GET(req("/api/search"));
    expect(res.status).toBe(200);
    expect((await res.json()).data.total).toBeGreaterThan(0);
  });

  it.each(["page=0", "sort=bogus", "pageSize=999", "category=Not%20A%20Slug", `q=${"a".repeat(150)}`])("rejects malformed params (%s)", async (qs) => {
    const res = await routes.search.GET(req(`/api/search?${qs}`));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, error: { code: "invalid_request" } });
    expect(body.error.issues.length).toBeGreaterThan(0);
  });

  it("rate limits a single client", async () => {
    const headers = { "x-forwarded-for": "203.0.113.7" };
    let last: Response | undefined;
    for (let i = 0; i < 61; i++) last = await routes.search.GET(new Request("http://localhost/api/search?q=x", { headers }));
    expect(last!.status).toBe(429);
    expect(last!.headers.get("Retry-After")).toBeTruthy();
    expect((await last!.json()).error.code).toBe("rate_limited");
  });
});

describe("GET /api/products/[slug]", () => {
  it("returns offers sorted by price with demo status and no internal fields", async () => {
    const { product } = await loadRoutes();
    const res = await product.GET(req("/api/products/apple-iphone-13-128gb-midnight"), params("apple-iphone-13-128gb-midnight"));
    expect(res.status).toBe(200);
    const body = await res.json();
    const prices = body.data.offers.map((o: { pricePaise: number }) => o.pricePaise);
    expect(prices).toEqual([...prices].sort((a: number, b: number) => a - b));
    expect(body.data.offers.every((o: { status: string }) => o.status === "demo")).toBe(true);
    expect(body.data.lowest.kind).toBe("demo");
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("providerId");
    expect(serialized).not.toContain("externalProductId");
    expect(serialized).not.toContain("last_refresh_error");
  });

  it("returns 404 for unknown products and 400 for invalid slugs", async () => {
    const { product } = await loadRoutes();
    expect((await product.GET(req("/api/products/nope"), params("nope"))).status).toBe(404);
    expect((await product.GET(req("/api/products/BAD_SLUG"), params("BAD_SLUG"))).status).toBe(400);
  });
});

describe("GET /api/products/[slug]/history", () => {
  it("returns only recorded observations (none in demo mode)", async () => {
    const { history } = await loadRoutes();
    const res = await history.GET(req("/api/products/apple-iphone-13-128gb-midnight/history?range=30d"), params("apple-iphone-13-128gb-midnight"));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ productSlug: "apple-iphone-13-128gb-midnight", range: "30d", observations: [] });
  });

  it("validates range and limit", async () => {
    const { history } = await loadRoutes();
    const slug = "apple-iphone-13-128gb-midnight";
    expect((await history.GET(req(`/api/x?range=forever`), params(slug))).status).toBe(400);
    expect((await history.GET(req(`/api/x?limit=100000`), params(slug))).status).toBe(400);
  });
});

describe("/api/cron/refresh-prices", () => {
  const SECRET = "s".repeat(40);

  it("rejects requests when no secret is configured", async () => {
    const { cron } = await loadRoutes();
    const res = await cron.POST(req("/api/cron/refresh-prices", { method: "POST", headers: { authorization: "Bearer anything" } }));
    expect(res.status).toBe(401);
  });

  it.each([undefined, "Bearer wrong-secret-of-a-different-length", `Bearer ${"s".repeat(39)}t`, SECRET, `Basic ${SECRET}`])(
    "rejects a bad authorization header (%s)",
    async (header) => {
      const { cron } = await loadRoutes({ CRON_SECRET: SECRET });
      const headers: Record<string, string> = header ? { authorization: header } : {};
      const res = await cron.POST(req("/api/cron/refresh-prices", { method: "POST", headers }));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ ok: false, error: { code: "unauthorized", message: "Unauthorized" } });
    },
  );

  it("requires the privileged database configuration after authorising", async () => {
    const { cron } = await loadRoutes({ CRON_SECRET: SECRET });
    const res = await cron.GET(req("/api/cron/refresh-prices", { headers: { authorization: `Bearer ${SECRET}` } }));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("not_configured");
  });
});
