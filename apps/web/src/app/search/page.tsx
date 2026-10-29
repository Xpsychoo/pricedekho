import type { Metadata } from "next";
import Link from "next/link";
import { parseSearchQuery } from "@pricedekho/shared";
import { SearchResults } from "@/components/SearchResults";
import { ErrorState } from "@/components/States";
import { getCatalog, listCategoriesCached } from "@/lib/catalog";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const parsed = parseSearchQuery(await searchParams);
  const q = parsed.success ? parsed.data.q : undefined;
  return {
    title: q ? `Search results for “${q}”` : "Search products",
    description: q ? `Compare prices for ${q} across Indian online stores.` : "Search and compare product prices across Indian online stores.",
    alternates: { canonical: "/search" },
    // Search result pages are thin/duplicative content; keep them out of the index.
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const parsed = parseSearchQuery(await searchParams);
  if (!parsed.success) {
    return (
      <ErrorState
        title="That search couldn’t be understood"
        description="Some search parameters were invalid. Please start a new search."
        action={<Link href="/search" className="text-sm font-medium text-red-900 underline">Start over</Link>}
      />
    );
  }
  const query = parsed.data;

  let result;
  let categories;
  try {
    [result, categories] = await Promise.all([getCatalog().searchProducts(query), listCategoriesCached()]);
  } catch {
    return <ErrorState title="Search is temporarily unavailable" description="Please try again in a moment." />;
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">{query.q ? <>Results for “{query.q}”</> : "All products"}</h1>
      <p className="mb-6 text-sm text-slate-600">Each result is a specific variant. Open a product to compare store prices.</p>
      <SearchResults basePath="/search" query={query} result={result} categories={categories} />
    </div>
  );
}
