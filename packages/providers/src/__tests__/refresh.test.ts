import { describe, expect, it } from "vitest";
import { DemoProvider } from "../demo/demo-provider";
import { runPriceRefresh, type DueListing, type RefreshStore } from "../refresh";
import { ProviderRegistry } from "../registry";
import { ProviderError } from "../types";
import { fakeProvider, rawOffer } from "./fixtures";

const KEY = "color=midnight|storage=128gb";

function listing(offerId: string, overrides: Partial<DueListing> = {}): DueListing {
  return {
    offerId,
    providerId: "test",
    storeSlug: "test-store",
    externalProductId: offerId,
    productUrl: `https://test-store.example/${offerId}`,
    variantKey: KEY,
    productGtin: null,
    lastObservation: null,
    ...overrides,
  };
}

class FakeStore implements RefreshStore {
  applied: Array<Parameters<RefreshStore["applyRefresh"]>[0]> = [];
  failures: Array<Parameters<RefreshStore["recordFailure"]>[0]> = [];
  listInput: Parameters<RefreshStore["listDueListings"]>[0] | null = null;
  constructor(private readonly due: DueListing[]) {}
  async listDueListings(input: Parameters<RefreshStore["listDueListings"]>[0]) {
    this.listInput = input;
    return this.due.slice(0, input.limit);
  }
  async applyRefresh(input: Parameters<RefreshStore["applyRefresh"]>[0]) {
    this.applied.push(input);
  }
  async recordFailure(input: Parameters<RefreshStore["recordFailure"]>[0]) {
    this.failures.push(input);
  }
}

const now = () => new Date("2026-10-29T12:00:00.000Z");

describe("runPriceRefresh", () => {
  it("updates offers, records history when justified, and isolates failures", async () => {
    const registry = new ProviderRegistry().register(
      fakeProvider("test", {
        refreshListing: async (ref) => {
          if (ref.offerId === "boom") throw new ProviderError("test", "Upstream 503", "upstream");
          if (ref.offerId === "gone") return null;
          if (ref.offerId === "switched") return rawOffer({ variantAttributes: { storage: "256gb", color: "midnight" } });
          return rawOffer({ pricePaise: 4_900_000 });
        },
      }),
    );
    const store = new FakeStore([
      listing("ok-new"),
      listing("ok-same", { lastObservation: { pricePaise: 4_900_000, availability: "in_stock", observedAt: "2026-10-29T06:00:00.000Z" } }),
      listing("boom"),
      listing("gone"),
      listing("switched"),
    ]);

    const summary = await runPriceRefresh({ registry, store, now });

    expect(summary.considered).toBe(5);
    expect(summary.updated).toBe(2);
    // Only the first observation is recorded; the unchanged price within 24h is not.
    expect(summary.historyRecorded).toBe(1);
    expect(store.applied.map((a) => [a.offerId, a.recordHistory])).toEqual([
      ["ok-new", true],
      ["ok-same", false],
    ]);
    expect(summary.failed.map((f) => [f.offerId, f.code])).toEqual([
      ["boom", "upstream"],
      ["gone", "gone"],
    ]);
    expect(summary.skipped).toEqual([{ offerId: "switched", reason: "Refreshed listing no longer matches the stored variant" }]);
    // Failures are recorded but never call applyRefresh, so the last valid price is preserved.
    expect(store.failures.map((f) => f.offerId).sort()).toEqual(["boom", "gone", "switched"]);
  });

  it("uses the provider's fetch time, not the job time, as last checked", async () => {
    const registry = new ProviderRegistry().register(fakeProvider("test", { refreshListing: async () => rawOffer({ fetchedAt: "2026-10-29T11:59:00.000Z" }) }));
    const store = new FakeStore([listing("a")]);
    await runPriceRefresh({ registry, store, now });
    expect(store.applied[0]!.checkedAt).toBe("2026-10-29T11:59:00.000Z");
  });

  it("skips providers that cannot refresh and reports them", async () => {
    const registry = new ProviderRegistry().register(new DemoProvider());
    const store = new FakeStore([listing("a", { providerId: "demo" })]);
    const summary = await runPriceRefresh({ registry, store, now });
    expect(summary.considered).toBe(0);
    expect(summary.providersWithoutRefresh).toEqual(["demo"]);
    expect(store.listInput).toBeNull();
  });

  it("bounds the batch size and requests only refreshable providers", async () => {
    const registry = new ProviderRegistry()
      .register(fakeProvider("test", { refreshListing: async () => rawOffer() }))
      .register(new DemoProvider());
    const store = new FakeStore(Array.from({ length: 300 }, (_, i) => listing(`o${i}`)));
    const summary = await runPriceRefresh({ registry, store, now, batchSize: 1000 });
    expect(store.listInput).toMatchObject({ providerIds: ["test"], limit: 100 });
    expect(summary.considered).toBe(100);
  });

  it("is safe to retry: a second run with the same data records no duplicate history", async () => {
    const registry = new ProviderRegistry().register(fakeProvider("test", { refreshListing: async () => rawOffer() }));
    const first = new FakeStore([listing("a")]);
    await runPriceRefresh({ registry, store: first, now });
    const recorded = first.applied[0]!;
    const second = new FakeStore([
      listing("a", { lastObservation: { pricePaise: recorded.offer.pricePaise, availability: recorded.offer.availability, observedAt: recorded.checkedAt } }),
    ]);
    const summary = await runPriceRefresh({ registry, store: second, now });
    expect(summary.historyRecorded).toBe(0);
  });

  it("defers remaining work when the time budget is exhausted", async () => {
    let t = 0;
    const clock = () => new Date(Date.UTC(2026, 9, 29) + t);
    const registry = new ProviderRegistry().register(
      fakeProvider("test", {
        refreshListing: async () => {
          t += 1000;
          return rawOffer();
        },
      }),
    );
    const store = new FakeStore([listing("a"), listing("b"), listing("c")]);
    const summary = await runPriceRefresh({ registry, store, now: clock, concurrency: 1, timeBudgetMs: 1500 });
    expect(summary.updated).toBe(2);
    expect(summary.deferred).toBe(1);
  });

  it("reports persistence failures honestly", async () => {
    const registry = new ProviderRegistry().register(fakeProvider("test", { refreshListing: async () => rawOffer() }));
    const store = new FakeStore([listing("a")]);
    store.applyRefresh = async () => {
      throw new Error("db down");
    };
    const summary = await runPriceRefresh({ registry, store, now });
    expect(summary.updated).toBe(0);
    expect(summary.failed).toEqual([{ offerId: "a", providerId: "test", code: "persist", message: "Failed to save refreshed offer" }]);
  });
});
