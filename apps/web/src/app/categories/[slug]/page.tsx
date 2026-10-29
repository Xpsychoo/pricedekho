import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCategoryDefinition, parseSearchQuery, slugSchema } from "@pricedekho/shared";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CategoryNavigation } from "@/components/CategoryNavigation";
import { JsonLd } from "@/components/JsonLd";
import { SearchResults } from "@/components/SearchResults";
import { ErrorState, LoadingSkeleton } from "@/components/States";
import { getCatalog, getCategoryCached } from "@/lib/catalog";
import { breadcrumbJsonLd, OPEN_GRAPH_BASE } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function loadCategory(rawSlug: string) {
  const slug = slugSchema.safeParse(rawSlug);
  if (!slug.success) return null;
  return getCategoryCached(slug.data);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await loadCategory((await params).slug).catch(() => null);
  if (!category) return { title: "Category not found" };
  const title = `${category.name} — compare prices`;
  const description = category.description ?? `Compare ${category.name.toLowerCase()} prices across Indian online stores.`;
  const url = `/categories/${category.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { ...OPEN_GRAPH_BASE, url, title: `${title} | PriceDekho`, description },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  let category;
  try {
    category = await loadCategory(slug);
  } catch {
    return <ErrorState title="Couldn’t load this category" description="Please try again in a moment." />;
  }
  if (!category) notFound();

  const sp = await searchParams;
  const definition = getCategoryDefinition(category.slug);
  return (
    <div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Categories", path: "/categories" },
          { name: category.name, path: `/categories/${category.slug}` },
        ])}
      />
      <CategoryNavigation activeSlug={category.slug} className="-mx-1 mb-6 md:hidden" />
      <header className="mb-6 flex items-start gap-4">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <CategoryIcon slug={category.slug} className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{category.name}</h1>
          <p className="mt-1 text-sm text-slate-600">{category.description ?? definition?.description}</p>
        </div>
      </header>
      {/* The category is resolved before streaming starts so unknown slugs get a real 404. */}
      <Suspense key={JSON.stringify(sp)} fallback={<LoadingSkeleton />}>
        <CategoryResults categorySlug={category.slug} searchParams={sp} />
      </Suspense>
    </div>
  );
}

async function CategoryResults({ categorySlug, searchParams }: { categorySlug: string; searchParams: Record<string, string | string[] | undefined> }) {
  // The category comes from the path; ignore any category in the query string.
  const parsed = parseSearchQuery({ ...searchParams, category: categorySlug });
  if (!parsed.success) {
    return (
      <ErrorState
        title="Some filters were invalid"
        action={<Link href={`/categories/${categorySlug}`} className="text-sm font-medium text-red-900 underline">Clear filters</Link>}
      />
    );
  }
  const result = await getCatalog()
    .searchProducts(parsed.data)
    .catch(() => null);
  if (!result) return <ErrorState title="Couldn’t load products" description="Please try again in a moment." />;
  return <SearchResults basePath={`/categories/${categorySlug}`} query={parsed.data} result={result} omitCategoryParam />;
}
