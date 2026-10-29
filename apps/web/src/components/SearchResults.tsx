import Link from "next/link";
import type { Category, SearchQuery, SearchResult } from "@pricedekho/shared";
import { buildHref } from "@/lib/utils";
import { Pagination } from "./Pagination";
import { ProductFilters } from "./ProductFilters";
import { ProductGrid } from "./ProductGrid";
import { EmptyState } from "./States";

/** Serialises a query back to URL params so pagination preserves filters. */
export function queryToParams(query: SearchQuery, overrides: Partial<Record<string, string | number | undefined>> = {}) {
  return {
    q: query.q,
    category: query.category,
    brand: query.brand,
    sort: query.sort === "relevance" ? undefined : query.sort,
    ...query.attributes,
    page: query.page > 1 ? query.page : undefined,
    ...overrides,
  };
}

/** Filters + grid + pagination, shared by the search page and category pages. */
export function SearchResults({
  basePath,
  query,
  result,
  categories,
  omitCategoryParam = false,
}: {
  basePath: string;
  query: SearchQuery;
  result: SearchResult;
  categories?: Category[];
  /** Category pages carry the category in the path, not the query string. */
  omitCategoryParam?: boolean;
}) {
  const hrefFor = (page: number) =>
    buildHref(basePath, queryToParams(query, { page: page > 1 ? page : undefined, ...(omitCategoryParam ? { category: undefined } : {}) }));
  const first = (result.page - 1) * result.pageSize + 1;
  const last = Math.min(result.total, result.page * result.pageSize);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="lg:sticky lg:top-36 lg:self-start">
        <ProductFilters action={basePath} query={query} facets={result.facets} categories={categories} />
      </aside>
      <section aria-label="Results" aria-live="polite">
        {result.total > 0 ? (
          <>
            <p className="mb-3 text-sm text-slate-600">
              Showing {first}–{last} of {result.total} {result.total === 1 ? "product" : "products"}
            </p>
            <ProductGrid products={result.items} label="Search results" />
            <Pagination page={result.page} totalPages={result.totalPages} hrefFor={hrefFor} />
          </>
        ) : result.page > 1 && result.page > result.totalPages ? (
          <EmptyState
            title="This page is past the end of the results"
            action={
              <Link href={hrefFor(1)} className="text-sm font-medium text-brand-700 underline underline-offset-2">
                Go to the first page
              </Link>
            }
          />
        ) : (
          <EmptyState
            title={query.q ? `No products match “${query.q}”` : "No products found"}
            description="Try a shorter search, check the spelling, or remove some filters. Our catalog is still growing."
            action={
              <Link href={basePath} className="text-sm font-medium text-brand-700 underline underline-offset-2">
                Clear all filters
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
