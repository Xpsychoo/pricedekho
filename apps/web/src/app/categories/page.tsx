import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORY_DEFINITIONS } from "@pricedekho/shared";
import { CategoryIcon } from "@/components/CategoryIcon";

export const metadata: Metadata = {
  title: "All categories",
  description: "Browse product categories and compare prices across Indian online stores.",
  alternates: { canonical: "/categories" },
};

export default function CategoriesPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">All categories</h1>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORY_DEFINITIONS.map((c) => (
          <li key={c.slug}>
            <Link href={`/categories/${c.slug}`} className="flex h-full gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-300">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <CategoryIcon slug={c.slug} className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-semibold text-slate-900">{c.name}</span>
                <span className="mt-1 block text-sm text-slate-600">{c.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
