import Link from "next/link";
import { formatINR, formatVariantLabel, type ProductSummary } from "@pricedekho/shared";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "./ProductImage";

export function ProductCard({ product }: { product: ProductSummary }) {
  const variant = formatVariantLabel(product.variantAttributes);
  return (
    <article className="group relative flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <ProductImage src={product.imageUrl} alt={product.name} categorySlug={product.category.slug} />
      <div className="mt-3 flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{product.category.name}</Badge>
          {product.hasDemoOffers && <Badge tone="demo">DEMO</Badge>}
        </div>
        {product.brand && <p className="text-xs font-medium text-slate-500">{product.brand}</p>}
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
          <Link href={`/product/${product.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        {variant && <p className="text-xs text-slate-500">{variant}</p>}
        <div className="mt-auto pt-2">
          {product.lowestPricePaise !== null ? (
            <p className="text-sm text-slate-600">
              {product.hasDemoOffers ? "Demo price from " : "From "}
              <span className="text-base font-bold text-slate-900">{formatINR(product.lowestPricePaise)}</span>
            </p>
          ) : (
            <p className="text-sm text-slate-500">No offers available</p>
          )}
          <p className="text-xs text-slate-500">
            {product.offerCount} {product.offerCount === 1 ? "store" : "stores"}
          </p>
        </div>
      </div>
    </article>
  );
}
