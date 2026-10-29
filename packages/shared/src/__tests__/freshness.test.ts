import { describe, expect, it } from "vitest";
import { computePriceStatus, freshnessConfigFromHours, type StatusInput } from "../utils/freshness";

const now = new Date("2026-10-29T12:00:00Z");
const config = freshnessConfigFromHours(24);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

const live: StatusInput = { source: "affiliate_api", availability: "in_stock", lastCheckedAt: hoursAgo(1), refreshStatus: "ok" };

describe("computePriceStatus", () => {
  it("is LIVE when an authorised source was checked recently", () => {
    expect(computePriceStatus(live, now, config)).toBe("live");
  });

  it("is STALE once the freshness window has passed", () => {
    expect(computePriceStatus({ ...live, lastCheckedAt: hoursAgo(25) }, now, config)).toBe("stale");
  });

  it("is STALE when never checked", () => {
    expect(computePriceStatus({ ...live, lastCheckedAt: null }, now, config)).toBe("stale");
  });

  it("does not trust timestamps from the future", () => {
    expect(computePriceStatus({ ...live, lastCheckedAt: new Date(now.getTime() + 3_600_000).toISOString() }, now, config)).toBe("stale");
  });

  it("is always DEMO for demo data, even with a recent timestamp", () => {
    expect(computePriceStatus({ ...live, source: "demo" }, now, config)).toBe("demo");
  });

  it("reports SOURCE ERROR when the last refresh failed", () => {
    expect(computePriceStatus({ ...live, refreshStatus: "error" }, now, config)).toBe("source_error");
  });

  it("is UNAVAILABLE when recently checked and out of stock", () => {
    expect(computePriceStatus({ ...live, availability: "out_of_stock" }, now, config)).toBe("unavailable");
  });

  it("respects a configurable threshold", () => {
    expect(computePriceStatus({ ...live, lastCheckedAt: hoursAgo(5) }, now, freshnessConfigFromHours(4))).toBe("stale");
  });
});

describe("freshnessConfigFromHours", () => {
  it("falls back to 24 hours for invalid values", () => {
    expect(freshnessConfigFromHours("abc").liveMaxAgeMs).toBe(24 * 3_600_000);
    expect(freshnessConfigFromHours(-1).liveMaxAgeMs).toBe(24 * 3_600_000);
    expect(freshnessConfigFromHours("6").liveMaxAgeMs).toBe(6 * 3_600_000);
  });
});
