import { ChevronRight, FlaskConical, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ATTRIBUTE_LABELS,
  formatAttributeValue,
  formatINR,
  formatVariantLabel,
  slugSchema,
  type PriceObservation,
} from "@pricedekho/shared";
import { PriceComparisonTable } from "@/components/PriceComparisonTable";
import { JsonLd } from "@/components/JsonLd";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";
import { ProductImage } from "@/components/ProductImage";
import { ShareButtons } from "@/components/ShareButtons";
import { EmptyState, ErrorState } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { getCatalog, getFreshnessConfig, getProductCached } from "@/lib/catalog";
import { presentProduct, type PresentedProduct } from "@/lib/present";
import { absoluteUrl, breadcrumbJsonLd, OPEN_GRAPH_BASE } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const revalidate = 300;

/** No pages are prebuilt; each product is rendered on first request and cached (ISR). */
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

async function load(rawSlug: string) {
  const slug = slugSchema.safeParse(rawSlug);
  return slug.success ? getProductCached(slug.data) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await load((await params).slug).catch(() => null);
  if (!product) return { title: "Product not found" };
  const variant = formatVariantLabel(product.variantAttributes);
  const description = `Compare prices for ${product.name}${variant ? ` (${variant})` : ""} across online stores in India.`;
  const url = `/product/${product.slug}`;
  return {
    title: `${product.name} — compare prices`,
    description,
    keywords: [product.name, `${product.name} price`, `${product.name} price in India`, product.brand, product.category.name].filter(
      (k): k is string => Boolean(k),
    ),
    alternates: { canonical: url },
    // Demo products must not be indexed as if they were real listings.
    robots: product.isDemo ? { index: false, follow: false } : undefined,
    openGraph: { ...OPEN_GRAPH_BASE, title: `${product.name} — compare prices`, description, url },
    twitter: { card: "summary_large_image", title: `${product.name} — compare prices`, description },
  };
}

function LowestPriceSummary({ presented }: { presented: PresentedProduct }) {
  const { lowest, dataQuality, offers } = presented;
  if (offers.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        No store offers are listed for this product yet.
      </div>
    );
  }
  if (lowest?.kind === "verified") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-900">Lowest verified price</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{formatINR(lowest.pricePaise)}</p>
        <p className="mt-1 text-xs text-emerald-900">
          From an authorised source, checked within the last {dataQuality.freshnessHours} hours. Confirm the final price on the store.
        </p>
      </div>
    );
  }
  if (lowest?.kind === "demo") {
    return (
      <div className="rounded-xl border border-violet-300 bg-violet-50 p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-violet-950">
          <FlaskConical className="h-4 w-4" aria-hidden /> Lowest DEMO price
        </p>
        <p className="mt-1 text-3xl font-bold text-violet-950">{formatINR(lowest.pricePaise)}</p>
        <p className="mt-1 text-xs text-violet-950">Sample data from fictional stores. This is not a real price and cannot be purchased.</p>
      </div>
    );
  }
  return (
    <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>
        <strong>No verified live offers right now.</strong> The prices below were not confirmed within the last {dataQuality.freshnessHours} hours
        or the item is out of stock, so we don&apos;t highlight a lowest price. Check each store for the current price.
      </p>
    </div>
  );
}

function productJsonLd(presented: PresentedProduct, url: string) {
  const live = presented.offers.filter((o) => o.status === "live");
  const { product } = presented;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    ...(product.model ? { model: product.model } : {}),
    ...(product.gtin ? { gtin: product.gtin } : {}),
    ...(product.description ? { description: product.description } : {}),
    url,
    ...(product.imageUrl ? { image: absoluteUrl(product.imageUrl) } : {}),
    // Offers are only described for verified live data — never for demo or stale prices.
    ...(live.length > 0
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "INR",
            lowPrice: (Math.min(...live.map((o) => o.pricePaise)) / 100).toFixed(2),
            highPrice: (Math.max(...live.map((o) => o.pricePaise)) / 100).toFixed(2),
            offerCount: live.length,
          },
        }
      : {}),
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  let product;
  try {
    product = await load(slug);
  } catch {
    return <ErrorState title="Couldn’t load this product" description="Please try again in a moment." />;
  }
  if (!product) notFound();

  const now = new Date();
  const presented = presentProduct(product, now, getFreshnessConfig());
  let history: PriceObservation[] = [];
  let historyFailed = false;
  try {
    history = await getCatalog().getPriceHistory(product.id, { since: new Date(now.getTime() - 90 * 86_400_000).toISOString(), limit: 500 });
  } catch {
    historyFailed = true;
  }

  const specs = Object.entries(product.specifications);
  const variantEntries = Object.entries(product.variantAttributes);

  return (
    <article>
      <JsonLd
        data={[
          productJsonLd(presented, absoluteUrl(`/product/${product.slug}`)),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: product.category.name, path: `/categories/${product.category.slug}` },
            { name: product.name, path: `/product/${product.slug}` },
          ]),
        ]}
      />
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link href="/" className="hover:text-brand-700">Home</Link></li>
          <li aria-hidden><ChevronRight className="h-3.5 w-3.5" /></li>
          <li><Link href={`/categories/${product.category.slug}`} className="hover:text-brand-700">{product.category.name}</Link></li>
          <li aria-hidden><ChevronRight className="h-3.5 w-3.5" /></li>
          <li aria-current="page" className="line-clamp-1 text-slate-700">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr] lg:gap-10">
        <ProductImage src={product.imageUrl} alt={product.name} categorySlug={product.category.slug} priority sizes="(min-width: 768px) 320px, 240px" className="mx-auto w-full max-w-60 border border-slate-200 bg-white md:max-w-none" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.brand && <span className="text-sm font-medium text-slate-500">{product.brand}</span>}
            {product.isDemo && <Badge tone="demo">DEMO PRODUCT DATA</Badge>}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{product.name}</h1>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
            {product.model && (
              <div className="flex gap-1"><dt className="text-slate-500">Model:</dt><dd className="font-medium text-slate-800">{product.model}</dd></div>
            )}
            {variantEntries.map(([k, v]) => (
              <div key={k} className="flex gap-1">
                <dt className="text-slate-500">{ATTRIBUTE_LABELS[k as keyof typeof ATTRIBUTE_LABELS] ?? k}:</dt>
                <dd className="font-medium text-slate-800">{formatAttributeValue(v)}</dd>
              </div>
            ))}
          </dl>
          {product.siblingVariants.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500">Other variants (priced separately)</p>
              <ul className="mt-1.5 flex flex-wrap gap-2">
                <li>
                  <span aria-current="true" className="inline-flex rounded-lg border-2 border-brand-600 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-800">
                    {formatVariantLabel(product.variantAttributes) || "This variant"}
                  </span>
                </li>
                {product.siblingVariants.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/product/${s.slug}`} className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 hover:border-brand-300">
                      {formatVariantLabel(s.variantAttributes) || s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-5">
            <LowestPriceSummary presented={presented} />
          </div>
          {product.description && <p className="mt-4 text-sm leading-relaxed text-slate-700">{product.description}</p>}
          <ShareButtons className="mt-5" url={absoluteUrl(`/product/${product.slug}`)} title={`${product.name} — compare prices on PriceDekho`} />
        </div>
      </div>

      <section aria-labelledby="offers-heading" className="mt-10">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 id="offers-heading" className="text-xl font-semibold text-slate-900">Compare prices</h2>
          <p className="text-xs text-slate-500">
            Sorted lowest first. Prices are refreshed periodically, not in real time.{" "}
            <Link href="/how-it-works#freshness" className="underline underline-offset-2">How we check prices</Link>
          </p>
        </div>
        {presented.offers.length > 0 ? (
          <PriceComparisonTable offers={presented.offers} lowestOfferId={presented.lowest?.offerId ?? null} now={now} />
        ) : (
          <EmptyState title="No store offers yet" description="We haven't found a verified listing for this exact variant at any supported store." />
        )}
      </section>

      <section aria-labelledby="history-heading" className="mt-10">
        <h2 id="history-heading" className="mb-3 text-xl font-semibold text-slate-900">Price history</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {historyFailed ? (
            <ErrorState title="Price history is temporarily unavailable" />
          ) : (
            <PriceHistoryChart observations={history} />
          )}
        </div>
      </section>

      {specs.length > 0 && (
        <section aria-labelledby="specs-heading" className="mt-10">
          <h2 id="specs-heading" className="mb-3 text-xl font-semibold text-slate-900">Specifications</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {specs.map(([k, v], i) => (
                  <tr key={k} className={cn(i % 2 === 1 && "bg-slate-50/60")}>
                    <th scope="row" className="w-1/3 px-4 py-2.5 text-left font-medium text-slate-600">{k}</th>
                    <td className="px-4 py-2.5 text-slate-900">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </article>
  );
}
