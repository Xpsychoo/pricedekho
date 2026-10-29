// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MemoryCatalogRepository } from "@pricedekho/database";
import { freshnessConfigFromHours, type ProductDetail } from "@pricedekho/shared";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { ConfigError, parseServerEnv } from "@/lib/env";
import { presentProduct } from "@/lib/present";
import { MemoryRateLimiter } from "@/lib/rate-limit";
import { buildHref } from "@/lib/utils";

describe("parseServerEnv", () => {
  it("allows a demo setup with no credentials", () => {
    const env = parseServerEnv({});
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
    expect(env.PRICE_FRESHNESS_HOURS).toBe(24);
  });

  it("rejects a half-configured Supabase setup with an actionable message", () => {
    expect(() => parseServerEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" })).toThrow(ConfigError);
    expect(() => parseServerEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" })).toThrow(/PUBLISHABLE_KEY/);
  });

  it("enforces a strong CRON_SECRET", () => {
    expect(() => parseServerEnv({ CRON_SECRET: "short" })).toThrow(/at least 32/);
  });

  it("can require a database in production", () => {
    expect(() => parseServerEnv({ PRICEDEKHO_REQUIRE_DATABASE: "true" })).toThrow(/not configured/);
  });

  it("treats empty strings as unset", () => {
    expect(() => parseServerEnv({ NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" })).not.toThrow();
  });
});

describe("isAuthorizedCronRequest", () => {
  const secret = "x".repeat(48);
  const withAuth = (value?: string) => new Request("http://localhost", { headers: value ? { authorization: value } : {} });

  it("accepts the exact bearer secret", () => {
    expect(isAuthorizedCronRequest(withAuth(`Bearer ${secret}`), secret)).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isAuthorizedCronRequest(withAuth(), secret)).toBe(false);
    expect(isAuthorizedCronRequest(withAuth(`Bearer ${secret}x`), secret)).toBe(false);
    expect(isAuthorizedCronRequest(withAuth(`bearer ${secret}`), secret)).toBe(false);
    expect(isAuthorizedCronRequest(withAuth(`Bearer ${secret}`), undefined)).toBe(false);
    // A weak configured secret disables the endpoint entirely.
    expect(isAuthorizedCronRequest(withAuth("Bearer short"), "short")).toBe(false);
  });
});

describe("MemoryRateLimiter", () => {
  it("allows up to the limit per window, then resets", async () => {
    let now = 0;
    const limiter = new MemoryRateLimiter(() => now);
    for (let i = 0; i < 3; i++) expect((await limiter.check("k", 3, 1000)).allowed).toBe(true);
    expect((await limiter.check("k", 3, 1000)).allowed).toBe(false);
    expect((await limiter.check("other", 3, 1000)).allowed).toBe(true);
    now = 1000;
    expect((await limiter.check("k", 3, 1000)).allowed).toBe(true);
  });

  it("bounds memory use", async () => {
    const limiter = new MemoryRateLimiter(() => 0, 10);
    for (let i = 0; i < 50; i++) await limiter.check(`k${i}`, 1, 1000);
    expect((limiter as unknown as { windows: Map<string, unknown> }).windows.size).toBeLessThanOrEqual(10);
  });
});

describe("presentProduct", () => {
  const now = new Date("2026-10-29T12:00:00Z");
  const config = freshnessConfigFromHours(24);

  it("never reports demo data as live or verified", async () => {
    const detail = (await new MemoryCatalogRepository().getProductBySlug("apple-iphone-13-256gb-midnight"))!;
    const presented = presentProduct(detail, now, config);
    expect(presented.dataQuality).toMatchObject({ hasDemo: true, hasLive: false });
    expect(presented.lowest?.kind).toBe("demo");
    // The out-of-stock offer is cheaper but must not be the lowest price, and is listed last.
    expect(presented.offers.at(-1)!.availability).toBe("out_of_stock");
    expect(presented.lowest!.offerId).not.toBe(presented.offers.at(-1)!.id);
  });

  it("marks only fresh authorised offers as verified", async () => {
    const detail = (await new MemoryCatalogRepository().getProductBySlug("apple-iphone-13-128gb-midnight"))!;
    const live: ProductDetail = {
      ...detail,
      offers: detail.offers.map((o, i) => ({
        ...o,
        source: "affiliate_api",
        refreshStatus: "ok",
        lastCheckedAt: i === 0 ? "2026-10-20T00:00:00Z" : "2026-10-29T10:00:00Z",
      })),
    };
    const presented = presentProduct(live, now, config);
    expect(presented.offers.map((o) => o.status).sort()).toEqual(["live", "live", "stale"]);
    expect(presented.lowest?.kind).toBe("verified");
    expect(presented.offers.find((o) => o.id === presented.lowest!.offerId)!.status).toBe("live");
  });
});

describe("buildHref", () => {
  it("drops empty params and encodes values", () => {
    expect(buildHref("/search", { q: "iphone 13", brand: "", page: undefined, sort: "price_asc" })).toBe("/search?q=iphone+13&sort=price_asc");
    expect(buildHref("/search", {})).toBe("/search");
  });
});
