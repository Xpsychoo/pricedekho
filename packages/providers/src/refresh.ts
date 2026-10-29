import { DEFAULT_OBSERVATION_INTERVAL_MS, shouldRecordObservation, type Observation } from "./history";
import { refreshedListingMatches } from "./matching";
import type { ProviderRegistry } from "./registry";
import { toFailure } from "./registry";
import type { ListingRef, NormalizedOffer } from "./types";

export interface DueListing extends ListingRef {
  productGtin: string | null;
  lastObservation: Observation | null;
}

/** Persistence operations needed by the refresh job (implemented in @pricedekho/database). */
export interface RefreshStore {
  listDueListings(input: { providerIds: string[]; limit: number; attemptedBefore: string }): Promise<DueListing[]>;
  applyRefresh(input: { offerId: string; offer: NormalizedOffer; checkedAt: string; recordHistory: boolean }): Promise<void>;
  /** Records a failure without modifying the last valid price or last_checked_at. */
  recordFailure(input: { offerId: string; attemptedAt: string; message: string }): Promise<void>;
}

export interface RefreshOptions {
  registry: ProviderRegistry;
  store: RefreshStore;
  now?: () => Date;
  batchSize?: number;
  concurrency?: number;
  /** Listings attempted more recently than this are not retried. */
  minRetryIntervalMs?: number;
  observationIntervalMs?: number;
  /** Stop starting new work after this many ms (keeps within function limits). */
  timeBudgetMs?: number;
}

export interface RefreshSummary {
  startedAt: string;
  finishedAt: string;
  considered: number;
  updated: number;
  historyRecorded: number;
  skipped: Array<{ offerId: string; reason: string }>;
  failed: Array<{ offerId: string; providerId: string; code: string; message: string }>;
  deferred: number;
  providersWithoutRefresh: string[];
}

export const REFRESH_LIMITS = { defaultBatchSize: 25, maxBatchSize: 100, defaultConcurrency: 4 } as const;

export async function runPriceRefresh(options: RefreshOptions): Promise<RefreshSummary> {
  const now = options.now ?? (() => new Date());
  const startedAt = now();
  const batchSize = Math.min(Math.max(options.batchSize ?? REFRESH_LIMITS.defaultBatchSize, 1), REFRESH_LIMITS.maxBatchSize);
  const concurrency = Math.min(Math.max(options.concurrency ?? REFRESH_LIMITS.defaultConcurrency, 1), 10);
  const observationIntervalMs = options.observationIntervalMs ?? DEFAULT_OBSERVATION_INTERVAL_MS;
  const minRetryIntervalMs = options.minRetryIntervalMs ?? 60 * 60 * 1000;
  const deadline = startedAt.getTime() + (options.timeBudgetMs ?? 45_000);

  const providers = options.registry.list();
  const refreshable = providers.filter((p) => p.capabilities.refresh && p.refreshListing).map((p) => p.id);
  const summary: RefreshSummary = {
    startedAt: startedAt.toISOString(),
    finishedAt: startedAt.toISOString(),
    considered: 0,
    updated: 0,
    historyRecorded: 0,
    skipped: [],
    failed: [],
    deferred: 0,
    providersWithoutRefresh: providers.filter((p) => !refreshable.includes(p.id)).map((p) => p.id),
  };

  if (refreshable.length === 0) {
    summary.finishedAt = now().toISOString();
    return summary;
  }

  const due = await options.store.listDueListings({
    providerIds: refreshable,
    limit: batchSize,
    attemptedBefore: new Date(startedAt.getTime() - minRetryIntervalMs).toISOString(),
  });
  summary.considered = due.length;

  const processOne = async (listing: DueListing) => {
    if (now().getTime() > deadline) {
      summary.deferred += 1;
      return;
    }
    const attemptedAt = now().toISOString();
    let result: NormalizedOffer | null;
    try {
      result = await options.registry.refresh(listing);
    } catch (error) {
      const failure = toFailure(listing.providerId, error);
      summary.failed.push({ offerId: listing.offerId, ...failure });
      await safeRecordFailure(options.store, listing.offerId, attemptedAt, `${failure.code}: ${failure.message}`, summary);
      return;
    }
    if (result === null) {
      summary.failed.push({ offerId: listing.offerId, providerId: listing.providerId, code: "gone", message: "Listing no longer available at source" });
      await safeRecordFailure(options.store, listing.offerId, attemptedAt, "gone: listing no longer available", summary);
      return;
    }
    if (
      !refreshedListingMatches(result, {
        variantKey: listing.variantKey,
        gtin: listing.productGtin,
        storeSlug: listing.storeSlug,
        providerId: listing.providerId,
      })
    ) {
      summary.skipped.push({ offerId: listing.offerId, reason: "Refreshed listing no longer matches the stored variant" });
      await safeRecordFailure(options.store, listing.offerId, attemptedAt, "variant_mismatch: refreshed listing differs", summary);
      return;
    }
    const checkedAt = result.fetchedAt;
    const recordHistory = shouldRecordObservation(
      listing.lastObservation,
      { pricePaise: result.pricePaise, availability: result.availability, observedAt: checkedAt },
      observationIntervalMs,
    );
    try {
      await options.store.applyRefresh({ offerId: listing.offerId, offer: result, checkedAt, recordHistory });
      summary.updated += 1;
      if (recordHistory) summary.historyRecorded += 1;
    } catch {
      summary.failed.push({ offerId: listing.offerId, providerId: listing.providerId, code: "persist", message: "Failed to save refreshed offer" });
    }
  };

  const queue = [...due];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    for (let item = queue.shift(); item; item = queue.shift()) await processOne(item);
  });
  await Promise.all(workers);

  summary.finishedAt = now().toISOString();
  return summary;
}

async function safeRecordFailure(store: RefreshStore, offerId: string, attemptedAt: string, message: string, summary: RefreshSummary) {
  try {
    await store.recordFailure({ offerId, attemptedAt, message: message.slice(0, 500) });
  } catch {
    summary.failed.push({ offerId, providerId: "store", code: "persist", message: "Failed to record refresh failure" });
  }
}
