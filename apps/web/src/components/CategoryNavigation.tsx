import Link from "next/link";
import { CATEGORY_DEFINITIONS } from "@pricedekho/shared";
import { CategoryIcon } from "./CategoryIcon";
import { cn } from "@/lib/utils";

/** Horizontal, scrollable category links driven by shared category metadata. */
export function CategoryNavigation({ activeSlug, className }: { activeSlug?: string; className?: string }) {
  return (
    <nav aria-label="Categories" className={cn("overflow-x-auto", className)}>
      <ul className="flex min-w-max gap-1">
        {CATEGORY_DEFINITIONS.map((c) => {
          const active = c.slug === activeSlug;
          return (
            <li key={c.slug}>
              <Link
                href={`/categories/${c.slug}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <CategoryIcon slug={c.slug} className="h-4 w-4" />
                {c.shortName}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
