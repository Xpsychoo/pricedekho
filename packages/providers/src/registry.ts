import { normalizeOffer } from "./normalize";
import { ProviderError, type ListingRef, type NormalizedOffer, type PriceProvider } from "./types";

export interface ProviderFailure {
  providerId: string;
  code: ProviderError["code"];
  message: string;
}

export interface AggregatedSearch {
  offers: NormalizedOffer[];
  failures: ProviderFailure[];
  /** Count of results rejected by validation, per provider. */
  rejected: Record<string, number>;
}

export const DEFAULT_PROVIDER_TIMEOUT_MS = 8000;

export async function withTimeout<T>(
  providerId: string,
  timeoutMs: number,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new ProviderError(providerId, `Timed out after ${timeoutMs}ms`, "timeout"));
    }, timeoutMs);
  });
  try {
    return await Promise.race([run(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export function toFailure(providerId: string, error: unknown): ProviderFailure {
  if (error instanceof ProviderError) return { providerId, code: error.code, message: error.message };
  // Do not propagate raw upstream error text (may contain URLs or tokens).
  return { providerId, code: "upstream", message: "Provider request failed" };
}

export class ProviderRegistry {
  private readonly providers = new Map<string, PriceProvider>();

  constructor(private readonly timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS) {}

  register(provider: PriceProvider): this {
    if (this.providers.has(provider.id)) throw new Error(`Provider "${provider.id}" is already registered`);
    this.providers.set(provider.id, provider);
    return this;
  }

  get(id: string): PriceProvider | undefined {
    return this.providers.get(id);
  }

  list(): PriceProvider[] {
    return [...this.providers.values()];
  }

  /**
   * Queries every search-capable provider in parallel. One provider failing
   * or timing out never prevents results from the others.
   */
  async searchAll(query: string): Promise<AggregatedSearch> {
    const searchable = this.list().filter((p) => p.capabilities.search);
    const settled = await Promise.allSettled(
      searchable.map((p) => withTimeout(p.id, this.timeoutMs, (signal) => p.search(query, { signal }))),
    );
    const result: AggregatedSearch = { offers: [], failures: [], rejected: {} };
    settled.forEach((outcome, i) => {
      const provider = searchable[i]!;
      if (outcome.status === "rejected") {
        result.failures.push(toFailure(provider.id, outcome.reason));
        return;
      }
      for (const raw of outcome.value) {
        const normalized = normalizeOffer(raw);
        if (normalized.ok && normalized.offer.providerId === provider.id) result.offers.push(normalized.offer);
        else result.rejected[provider.id] = (result.rejected[provider.id] ?? 0) + 1;
      }
    });
    return result;
  }

  /** Refreshes one listing via its owning provider. Throws ProviderError on failure. */
  async refresh(ref: ListingRef): Promise<NormalizedOffer | null> {
    const provider = this.providers.get(ref.providerId);
    if (!provider) throw new ProviderError(ref.providerId, "Provider is not registered", "not_configured");
    if (!provider.capabilities.refresh || !provider.refreshListing) {
      throw new ProviderError(ref.providerId, "Provider does not support listing refresh", "unsupported");
    }
    const refresh = provider.refreshListing.bind(provider);
    const raw = await withTimeout(provider.id, this.timeoutMs, (signal) => refresh(ref, { signal }));
    if (raw === null) return null;
    const normalized = normalizeOffer(raw);
    if (!normalized.ok) throw new ProviderError(provider.id, `Invalid response: ${normalized.error}`, "invalid_response");
    return normalized.offer;
  }
}
