# Integrating a price provider

PriceDekho gets prices through **providers** in `packages/providers`. This release has only the demo provider. No real retailer integration exists yet, because each one needs credentials and authorisation that the project doesn't have.

## Before you write any code

Confirm each of these in writing:

1. **Authorisation.** You have an affiliate agreement, a partner feed, or a licence for a product-data service that permits price comparison use.
2. **Display terms.** Whether you may show prices, images, ratings and product titles, and how fresh they must be. Some programmes require a maximum cache age or specific disclosure text.
3. **Rate limits and quotas.** These decide your `REFRESH_BATCH_SIZE` and cron frequency.
4. **No scraping by default.** Scraping retailer websites is out of scope. Any scraping proposal needs a separate review of the site's terms, robots.txt, applicable law (including the IT Act, 2000 and contract law), rate limits and data-display requirements before any work starts.

## The contract

Implement `PriceProvider` from `packages/providers/src/types.ts`:

```ts
interface PriceProvider {
  id: string;                      // stable, stored in offers.provider_id
  displayName: string;
  sourceType: "affiliate_api" | "partner_feed" | "licensed_data" | "manual";
  capabilities: { search: boolean; refresh: boolean };
  search(query, { signal }): Promise<NormalizedOffer[]>;
  refreshListing?(ref, { signal }): Promise<NormalizedOffer | null>; // null = listing gone
}
```

Rules for adapters:

- **Only call fixed, configured API hosts.** Never fetch a URL that came from a user or from stored offer data. `ListingRef.productUrl` is for identification only; look listings up by `externalProductId`.
- **Honour the `AbortSignal`.** The registry times providers out (8 s by default).
- **Report only what you received.** Leave `gtin`, `originalPricePaise`, `imageUrl` and similar fields `null` when the source doesn't provide them. Never infer a discount.
- **Prices are integer paise**, so ₹1,499.50 is `149950`. Use `rupeesToPaise()` from `@pricedekho/shared` for decimal strings.
- **Set `fetchedAt` to when the source produced the data.** It becomes `last_checked_at`, so never set it to "now" for cached upstream data.
- **Variant attributes matter.** Map storage, RAM, colour, size and capacity into `variantAttributes`. Refreshes are rejected when the variant key no longer matches the stored offer.
- **Throw `ProviderError`** with `not_configured`, `timeout`, `upstream`, `invalid_response` or `unsupported`. Don't put raw upstream responses or credentials in error messages.

Every result goes through `normalizeOffer()` (Zod validation). Invalid results are rejected, not repaired.

## Steps

1. Copy `packages/providers/src/adapters/affiliate-api.template.ts` to a new file and implement it.
2. Add its credentials to `.env.example` (server-only, with no `NEXT_PUBLIC_` prefix) and validate them in `apps/web/src/lib/env.ts`.
3. Register it in `createDefaultRegistry()` (`packages/providers/src/index.ts`), only when its credentials are present.
4. Insert a `stores` row for each retailer it covers (`is_demo = false`).
5. Create offers for known products. Use `matchOfferToProduct()` and only insert `matched` results. Queue `ambiguous` and `no_match` results for human review; never auto-merge on title.
6. Add tests with recorded or fake responses. Don't call the real API in CI.
7. Deploy. The cron job refreshes due offers in bounded batches and records history using `shouldRecordObservation()`.

## What the refresh job guarantees

- A failed refresh only sets `refresh_status = 'error'` and bookkeeping columns. The last valid price and `last_checked_at` stay untouched, so the UI shows **Source error** with the real timestamp.
- The offer update and its history row are written atomically by `apply_offer_refresh()`.
- History rows are unique per `(offer_id, observed_at)`, so retries cannot duplicate them.
- Providers without `refresh` capability are listed in `providersWithoutRefresh` and skipped, never re-stamped.

## Not implemented yet

- **Discovery of new listings.** The job only refreshes listings that already exist. `registry.searchAll()` and `matchOfferToProduct()` are ready for a discovery job plus a review queue.
- **A human review queue** for ambiguous matches.
