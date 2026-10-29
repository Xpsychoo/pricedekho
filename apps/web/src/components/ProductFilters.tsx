"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRef } from "react";
import { ATTRIBUTE_LABELS, formatAttributeValue, type Category, type SearchFacets, type SearchQuery } from "@pricedekho/shared";

const SORT_OPTIONS: Array<{ value: SearchQuery["sort"]; label: string }> = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name", label: "Name" },
];

const selectClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

/**
 * Filter and sort controls. A plain GET form, so filter state lives in the
 * URL and works without JavaScript; with JavaScript it submits on change.
 */
export function ProductFilters({
  action,
  query,
  facets,
  categories,
}: {
  action: string;
  query: SearchQuery;
  facets: SearchFacets;
  /** Show the category selector (search page only). */
  categories?: Category[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const autoSubmit = () => formRef.current?.requestSubmit();
  const attributeEntries = Object.entries(facets.attributes).filter(([, values]) => values.length > 0);

  return (
    <form ref={formRef} action={action} method="get" aria-label="Filter and sort results" className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
      </h2>
      {query.q && <input type="hidden" name="q" value={query.q} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <div>
          <label htmlFor="filter-sort" className="mb-1 block text-xs font-medium text-slate-600">
            Sort by
          </label>
          <select id="filter-sort" name="sort" defaultValue={query.sort} onChange={autoSubmit} className={selectClass}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {categories && (
          <div>
            <label htmlFor="filter-category" className="mb-1 block text-xs font-medium text-slate-600">
              Category
            </label>
            <select id="filter-category" name="category" defaultValue={query.category ?? ""} onChange={autoSubmit} className={selectClass}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="filter-brand" className="mb-1 block text-xs font-medium text-slate-600">
            Brand
          </label>
          <select id="filter-brand" name="brand" defaultValue={query.brand ?? ""} onChange={autoSubmit} className={selectClass}>
            <option value="">All brands</option>
            {facets.brands.map((b) => (
              <option key={b.value} value={b.value}>
                {b.value} ({b.count})
              </option>
            ))}
          </select>
        </div>
        {attributeEntries.map(([key, values]) => (
          <div key={key}>
            <label htmlFor={`filter-${key}`} className="mb-1 block text-xs font-medium text-slate-600">
              {ATTRIBUTE_LABELS[key as keyof typeof ATTRIBUTE_LABELS] ?? key}
            </label>
            <select
              id={`filter-${key}`}
              name={key}
              defaultValue={query.attributes[key as keyof typeof query.attributes] ?? ""}
              onChange={autoSubmit}
              className={selectClass}
            >
              <option value="">Any</option>
              {values.map((v) => (
                <option key={v.value} value={v.value}>
                  {formatAttributeValue(v.value)} ({v.count})
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="h-9 flex-1 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700">
          Apply
        </button>
        <a href={query.q ? `${action}?q=${encodeURIComponent(query.q)}` : action} className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-slate-600 hover:bg-slate-100">
          Reset
        </a>
      </div>
    </form>
  );
}
