import type { ProductSummary } from "@pricedekho/shared";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ products, label = "Products" }: { products: ProductSummary[]; label?: string }) {
  return (
    <ul aria-label={label} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}
