import { ArrowRight, BadgeCheck, Clock, Search, TrendingUp } from "lucide-react";
import Link from "next/link";
import { CATEGORY_DEFINITIONS } from "@pricedekho/shared";
import { DEMO_TRENDING_SEARCHES } from "@pricedekho/shared/demo";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ProductGrid } from "@/components/ProductGrid";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState, ErrorState } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { getCatalog } from "@/lib/catalog";

export const revalidate = 300;

const STEPS = [
  { Icon: Search, title: "Search for the exact product", text: "Find the model and variant you want — storage, size and colour matter." },
  { Icon: BadgeCheck, title: "Compare like with like", text: "We only compare listings for the same variant, from each store side by side." },
  { Icon: Clock, title: "Check freshness, then buy", text: "Every price shows its source and when it was last checked. Confirm on the store." },
];

async function FeaturedProducts() {
  const products = await getCatalog()
    .listFeaturedProducts(8)
    .catch(() => null);
  if (products === null) return <ErrorState title="Couldn’t load products" description="Please refresh the page or try again later." />;
  if (products.length === 0) return <EmptyState title="No products yet" description="Products will appear here once the catalog is populated." />;
  return <ProductGrid products={products} label="Featured products" />;
}

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="rounded-2xl border border-slate-200 bg-linear-to-b from-white to-brand-50/60 px-5 py-10 text-center sm:px-10 sm:py-14">
        <h1 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Compare prices across Indian online stores
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          Search once and see the same product, in the same variant, from multiple stores — with clear labels showing where each price came
          from and how recently it was checked.
        </p>
        <div className="mx-auto mt-6 max-w-2xl">
          <SearchBar size="lg" />
        </div>
        <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 text-slate-500">
            <TrendingUp className="h-4 w-4" aria-hidden /> Popular searches
          </span>
          {/* These terms are a fixed demo list, not measured search trends. */}
          <Badge tone="demo" title="Example searches — not real search trend data">DEMO</Badge>
          {DEMO_TRENDING_SEARCHES.map((term) => (
            <Link
              key={term}
              href={`/search?q=${encodeURIComponent(term)}`}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 hover:border-brand-300 hover:text-brand-700"
            >
              {term}
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="categories-heading">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="categories-heading" className="text-xl font-semibold text-slate-900">Popular categories</h2>
          <Link href="/categories" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            All categories <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORY_DEFINITIONS.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/categories/${c.slug}`}
                className="flex h-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-300"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <CategoryIcon slug={c.slug} className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-slate-900">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="featured-heading">
        <h2 id="featured-heading" className="mb-4 text-xl font-semibold text-slate-900">Featured products</h2>
        <FeaturedProducts />
      </section>

      <section aria-labelledby="how-heading" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 id="how-heading" className="text-xl font-semibold text-slate-900">How price comparison works</h2>
        <ol className="mt-5 grid gap-6 sm:grid-cols-3">
          {STEPS.map(({ Icon, title, text }, i) => (
            <li key={title} className="flex gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                <Icon className="h-4 w-4" aria-hidden />
                <span className="sr-only">Step {i + 1}</span>
              </span>
              <div>
                <h3 className="font-medium text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href="/how-it-works" className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
          Learn about our data sources <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
