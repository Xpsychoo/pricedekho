# PriceDekho

PriceDekho is a product price comparison platform for the Indian market. You search for a product, open the page for one exact variant (for example *iPhone 13, 128GB, Midnight*), and see offers from each store side by side. Every price shows where it came from and when it was last verified.

> **Status: first milestone, demo data only.** No authorised retailer data source is connected. All stores, prices and offers are **fictional sample data**, labelled **DEMO** throughout the UI. Nothing on the site is a live price. See [Integrating a price provider](docs/PROVIDERS.md).

## Contents

- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Quick start (no credentials needed)](#quick-start-no-credentials-needed)
- [Scripts](#scripts)
- [Setting up Supabase](#setting-up-supabase)
- [Environment variables](#environment-variables)
- [Deploying to Vercel](#deploying-to-vercel)
- [Scheduled price refreshes](#scheduled-price-refreshes)
- [Removing demo data before launch](#removing-demo-data-before-launch)
- [How data honesty is enforced](#how-data-honesty-is-enforced)
- [Security](#security)
- [Testing](#testing)
- [Known limitations and remaining work](#known-limitations-and-remaining-work)

## Tech stack

| Area | Choice |
| --- | --- |
| Monorepo | pnpm workspaces + Turborepo |
| App | Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict) |
| Styling | Tailwind CSS 4, shadcn/ui-style primitives (`apps/web/src/components/ui`), Lucide icons |
| Data | Supabase PostgreSQL with Row Level Security, accessed through `@supabase/supabase-js` |
| Validation | Zod 4 |
| Tests | Vitest 5, React Testing Library |

Version notes:

- **TypeScript is pinned to 6.0.x.** TypeScript 7 is available, but `typescript-eslint` (used by `eslint-config-next`) supports only `<6.1`.
- **ESLint is pinned to 9.x.** ESLint 10 is available, but `eslint-plugin-react`, `-import` and `-jsx-a11y` don't support it yet.
- **shadcn/ui-style components are hand-written.** The pages only need a button, a badge and a card, so these follow shadcn conventions (`cn()` and variant maps) without adding Radix as a dependency.
- **React Hook Form isn't used.** This release has no forms that need it: the search and filter forms are plain GET forms, which keeps state in the URL and works without JavaScript.

## Repository layout

```
pricedekho/
├─ apps/web/                     Next.js app (UI, API routes)
│  ├─ src/app/                   Pages, route handlers, sitemap/robots, error boundaries
│  │  ├─ api/search/             GET  /api/search
│  │  ├─ api/products/[slug]/    GET  /api/products/:slug  and  /history
│  │  └─ api/cron/refresh-prices POST/GET /api/cron/refresh-prices
│  ├─ src/components/            Navbar, SearchBar, ProductCard, PriceComparisonTable, …
│  ├─ src/lib/                   env validation, catalog selection, rate limiting, cron auth
│  └─ vercel.json                Vercel Cron schedule
├─ packages/shared/              Types, Zod schemas, money/INR, variants, freshness, demo catalog
├─ packages/providers/           Provider interface, registry, demo provider, matching, refresh job
├─ packages/database/            Supabase clients, repositories (Supabase + in-memory demo), seed generator
├─ supabase/migrations/          Schema, indexes, RLS policies, SQL functions
├─ supabase/seed.sql             Generated DEMO seed data
└─ docs/PROVIDERS.md             How to add an authorised data source
```

Internal packages export TypeScript source directly. Next.js compiles them through `transpilePackages`, so they have no separate build step.

## Quick start (no credentials needed)

Requirements: Node.js 22.12 or later and pnpm 10 (`npm i -g pnpm@10`).

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

With no environment variables set, the app uses an **in-memory demo repository** built from `packages/shared/src/demo/catalog.ts`. A site-wide banner says that demo mode is on. The same catalog generates `supabase/seed.sql`, so demo mode and a seeded database show the same data.

## Scripts

Run these from the repository root:

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts the Next.js dev server |
| `pnpm build` | Builds the production app |
| `pnpm lint` | Runs ESLint in every package |
| `pnpm typecheck` | Runs `tsc --noEmit` in every package (the web app runs `next typegen` first) |
| `pnpm test` | Runs the Vitest suites in every package |
| `pnpm check` | Runs lint, typecheck and test |
| `pnpm seed:generate` | Regenerates `supabase/seed.sql` from the demo catalog |

## Setting up Supabase

1. Create a project at [supabase.com](https://supabase.com). Free-tier projects pause after a period of inactivity.
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli). In the repo root, run `supabase init` if `supabase/config.toml` doesn't exist yet. It keeps the existing `migrations/` folder and `seed.sql`.
3. Link the project and apply the migrations:

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push                 # applies supabase/migrations/*
   ```

4. Optionally, load the demo seed data:

   ```bash
   supabase db push --include-seed  # or paste supabase/seed.sql into the SQL editor
   ```

   For local development with Docker, `supabase start` followed by `supabase db reset` applies the migrations and `seed.sql` to a local database.

5. Copy **Project URL**, the **publishable key** and the **secret key** from *Project Settings → API Keys* into your environment (see the next section).

The migration creates the tables `categories`, `products`, `stores`, `offers` and `price_history`. It also creates indexes for full-text and trigram search, category, brand/model, GTIN, variant attributes, the refresh queue and history lookups, plus the RLS policies and SQL functions `search_products`, `search_facets`, `apply_offer_refresh`, `record_offer_refresh_failure` and `latest_price_observations`.

## Environment variables

Copy `.env.example` to `apps/web/.env.local` and fill in what you need. Each variable is documented in that file. Environment variables are validated with Zod in `apps/web/src/lib/env.ts`. Configuration mistakes fail with an actionable message, for example when only one of the two public Supabase variables is set, `CRON_SECRET` is shorter than 32 characters, or `PRICEDEKHO_REQUIRE_DATABASE=true` is set without a database.

| Variable | Needed for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Reading the catalog from Supabase. Without them the app uses demo mode. |
| `SUPABASE_SECRET_KEY` | The cron refresh only (server-only, bypasses RLS) |
| `CRON_SECRET` | Authorising `/api/cron/refresh-prices` |
| `PRICEDEKHO_REQUIRE_DATABASE=true` | Production: refuse to fall back to demo data |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Shared rate limiting across serverless instances |
| `IMAGE_REMOTE_HOSTS` | Hosts whose product images you are permitted to display |
| `PRICE_FRESHNESS_HOURS`, `PRICE_OBSERVATION_INTERVAL_HOURS`, `REFRESH_BATCH_SIZE` | Tuning freshness labels, history recording and refresh batches |

No provider credentials are required to run the demo.

## Deploying to Vercel

1. Push the repository to GitHub, GitLab or Bitbucket.
2. In Vercel, choose **Add New → Project** and import the repo.
3. Set **Root Directory** to `apps/web`. Vercel detects Next.js and the pnpm workspace and installs from the monorepo root. Keep the default build command (`next build`).
4. Add the environment variables under *Settings → Environment Variables*. At minimum, set the two public Supabase variables. Also set `SUPABASE_SECRET_KEY` and `CRON_SECRET` if you want scheduled refreshes, and `PRICEDEKHO_REQUIRE_DATABASE=true` for production.
5. Deploy, then check the deployment URL. Importing the project or setting variables doesn't deploy anything until a deployment has run and succeeded.

**Free (Hobby) plan limitations:**

- The Hobby plan is for **personal, non-commercial use**. A site that earns affiliate commissions is commercial, so it needs a Pro plan.
- Cron jobs can run **at most once per day**, and the run can happen at any time within the scheduled hour.
- Function duration is limited. The cron route sets `maxDuration = 60` and stops starting new work after about 45 seconds. Unfinished items are reported as `deferred` and picked up on the next run.
- Without Upstash, the in-memory rate limiter is per instance and therefore best-effort only.

## Scheduled price refreshes

The endpoint processes **one bounded batch** per call. It doesn't schedule itself.

- `apps/web/vercel.json` schedules `GET /api/cron/refresh-prices` daily at 21:30 UTC (03:00 IST). Vercel Cron sends GET requests with `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is set. The route accepts both GET and POST.
- On Pro plans you can schedule it more often by editing the cron expression. You can also use any external scheduler (GitHub Actions, cron-job.org and so on) to send:

  ```bash
  curl -X POST https://<your-domain>/api/cron/refresh-prices \
       -H "Authorization: Bearer $CRON_SECRET"
  ```

- The response is a JSON summary with `considered`, `updated`, `historyRecorded`, `skipped`, `failed`, `deferred` and `providersWithoutRefresh`.
- The demo provider doesn't support refresh, so with demo data the job correctly reports `providersWithoutRefresh: ["demo"]` and updates nothing.

The UI tells visitors that prices are refreshed periodically, not in real time.

## Removing demo data before launch

All demo rows are marked. Run this in the Supabase SQL editor:

```sql
begin;
delete from public.offers   where source = 'demo';   -- also cascades to their price_history
delete from public.products where is_demo;
delete from public.stores   where is_demo;
commit;
```

Then:

1. Set `PRICEDEKHO_REQUIRE_DATABASE=true` and `PRICEDEKHO_ENABLE_DEMO_PROVIDER=false`.
2. Optionally, replace the homepage "Popular searches" list (`DEMO_TRENDING_SEARCHES`, labelled DEMO) with real data or remove it in `apps/web/src/app/page.tsx`.
3. Complete the draft Contact, Privacy and Terms pages. They are visibly marked as drafts and need legal review.

The seeded categories are real category definitions and can stay.

## How data honesty is enforced

| Rule | Where |
| --- | --- |
| Demo offers always render as **DEMO**, whatever their timestamp | `computePriceStatus()` in `packages/shared/src/utils/freshness.ts` |
| **LIVE** requires a non-demo source, a successful last refresh, and verification within `PRICE_FRESHNESS_HOURS` | same |
| The "lowest verified price" uses only LIVE in-stock offers. Demo data gets a separately labelled "Lowest DEMO price". | `pickLowestOffer()` |
| Failed refreshes keep the last valid price **and its original timestamp**, labelled *Source error* | `record_offer_refresh_failure()` SQL, `runPriceRefresh()` |
| `last_checked_at` comes from the provider's `fetchedAt` and is never set when cached data is read | `apply_offer_refresh()`, `refresh.ts` |
| No synthetic price history. Demo mode has none, and the chart needs at least two real observations | `MemoryCatalogRepository.getPriceHistory`, `PriceHistoryChart` |
| Different variants are never compared as the same product | `onlyMatchingVariant()`, `compareVariants()`, `matchOfferToProduct()` |
| Demo product pages are `noindex`, excluded from the sitemap, and their JSON-LD has no offers | `product/[slug]/page.tsx`, `sitemap.ts` |

## Security

What's implemented:

- **RLS on every table.** Public roles get `SELECT` only on published or active rows. No insert, update or delete policies exist.
- **Column-level grants on `offers`.** Refresh error messages and failure counters aren't readable by public roles.
- **Privileged SQL functions** can be executed only by `service_role`. Every function pins `search_path`, and none use `SECURITY DEFINER`.
- **The secret key is used only in `@pricedekho/database/admin`**, which imports `server-only`, so a client-bundle import fails the build. Public reads use the publishable key.
- **All query parameters are validated with Zod**, with length limits, slug patterns, enumerated sorts, `page ≤ 50`, `pageSize ≤ 48` and `history limit ≤ 1000`. Errors return a consistent envelope with no stack traces.
- **Rate limiting** on public API routes: Upstash Redis when configured, otherwise an in-memory fallback.
- **The cron endpoint** compares SHA-256 digests of the bearer token and secret with `timingSafeEqual`. It is closed when `CRON_SECRET` is missing or weak.
- **Providers never fetch user-supplied URLs.** Offer URLs must be `https`, and store links use `rel="noopener noreferrer nofollow sponsored"`.
- **Security headers:** CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `X-Robots-Tag: noindex` on API routes.

Remaining security work:

- The CSP allows `'unsafe-inline'` scripts. A nonce-based CSP would need every page to render dynamically.
- The RLS policies are verified by static tests on the SQL, not yet against a running Postgres. Add an integration test (for example with `supabase start` in CI) that tries anonymous writes and reads of hidden columns.
- The in-memory rate limiter is per instance. Configure Upstash for real protection, and consider Vercel Firewall rules.
- There's no admin UI or authentication yet. Catalog management currently means SQL or the Supabase dashboard.

## Testing

```bash
pnpm test         # all packages
pnpm check        # lint + typecheck + test
```

| Package | What the tests cover |
| --- | --- |
| `shared` | INR formatting (lakh grouping) and paise conversion; search normalisation; variant keys and compatibility; stale-price detection; offer sorting and lowest-offer selection; query validation |
| `providers` | Provider failure and timeout isolation; rejecting invalid or foreign offers; conservative matching (GTIN, brand + model + variant, no title-only, ambiguity); history insertion rules; refresh pipeline (failures preserve prices, retry safety, batch bounds, time budget, unsupported providers) |
| `database` | In-memory repository search, filters, sorting and pagination; demo labelling; seed file up to date; access-control assumptions in the migration SQL |
| `web` | API routes (validation, envelopes, 404s, rate limiting, no internal fields); cron authorisation and configuration; env validation; presenter rules; components (status labels, demo links, history chart without fake data) |

End-to-end tests with Playwright aren't included yet.

## Known limitations and remaining work

- **No live prices.** Connecting an authorised provider is the main next step (see [docs/PROVIDERS.md](docs/PROVIDERS.md)). It needs agreements and credentials that this project doesn't have.
- **No discovery of new listings and no human review queue for ambiguous matches.** The matching logic exists; the workflow around it doesn't.
- **Delivery information isn't modelled yet.** It needs a provider that supplies it.
- **No user accounts, price alerts or admin UI.**
- **No Playwright end-to-end tests.**
- **No product images.** Images are shown only from hosts listed in `IMAGE_REMOTE_HOSTS`, and the demo catalog has none, so it uses neutral placeholders.
- **Contact, Privacy and Terms are visibly marked drafts** and need legal review before launch.
