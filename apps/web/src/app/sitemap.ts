import type { MetadataRoute } from "next";
import { CATEGORY_DEFINITIONS } from "@pricedekho/shared";
import { getCatalog } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const staticPages = ["", "/categories", "/how-it-works", "/about", "/affiliate-disclosure"].map((p) => ({ url: `${base}${p}` }));
  const categories = CATEGORY_DEFINITIONS.map((c) => ({ url: `${base}/categories/${c.slug}` }));
  const catalog = getCatalog();
  // Demo products are noindex, so they are not listed.
  const products =
    catalog.mode === "demo-memory"
      ? []
      : await catalog
          .listProductSlugs(5000)
          .then((rows) => rows.map((r) => ({ url: `${base}/product/${r.slug}`, lastModified: r.updatedAt })))
          .catch(() => []);
  return [...staticPages, ...categories, ...products];
}
