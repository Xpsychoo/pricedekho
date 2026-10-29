import type { MetadataRoute } from "next";
import { CATEGORY_DEFINITIONS } from "@pricedekho/shared";
import { getCatalog } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/env";

export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const page = (path: string, changeFrequency: Entry["changeFrequency"], priority: number): Entry => ({ url: `${base}${path}`, changeFrequency, priority });
  const staticPages = [
    page("", "daily", 1),
    page("/categories", "weekly", 0.8),
    page("/how-it-works", "monthly", 0.5),
    page("/about", "monthly", 0.4),
    page("/contact", "yearly", 0.3),
    page("/affiliate-disclosure", "yearly", 0.3),
    page("/privacy", "yearly", 0.2),
    page("/terms", "yearly", 0.2),
  ];
  const categories = CATEGORY_DEFINITIONS.map((c) => page(`/categories/${c.slug}`, "daily", 0.7));
  const catalog = getCatalog();
  // Demo products are noindex, so they are not listed.
  const products =
    catalog.mode === "demo-memory"
      ? []
      : await catalog
          .listProductSlugs(5000)
          .then((rows) =>
            rows.map((r): Entry => ({ url: `${base}/product/${r.slug}`, lastModified: r.updatedAt, changeFrequency: "daily", priority: 0.6 })),
          )
          .catch(() => []);
  return [...staticPages, ...categories, ...products];
}
