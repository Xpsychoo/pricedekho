import { ImageResponse } from "next/og";
import { formatVariantLabel, slugSchema } from "@pricedekho/shared";
import { getProductCached } from "@/lib/catalog";

export const alt = "Product price comparison on PriceDekho";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Per-product social preview card. Shows no prices, so it can never go stale. */
export default async function ProductOpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = slugSchema.safeParse((await params).slug);
  const product = slug.success ? await getProductCached(slug.data).catch(() => null) : null;
  const name = product?.name ?? "Compare product prices";
  const variant = product ? formatVariantLabel(product.variantAttributes) : "";
  const stores = product ? new Set(product.offers.map((o) => o.store.id)).size : 0;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "linear-gradient(135deg, #ffffff 0%, #eef2ff 70%, #e0e7ff 100%)", padding: 72, flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#0f172a" }}>
            Price<span style={{ color: "#4f46e5" }}>Dekho</span>
          </div>
          {product?.isDemo && (
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: "#5b21b6", background: "#ede9fe", border: "2px solid #c4b5fd", borderRadius: 10, padding: "6px 16px" }}>
              DEMO DATA
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {product?.brand && <div style={{ fontSize: 30, color: "#64748b" }}>{product.brand}</div>}
          <div style={{ fontSize: name.length > 50 ? 56 : 68, fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>{name}</div>
          {variant && <div style={{ fontSize: 30, color: "#475569" }}>{variant}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: "#3730a3" }}>
          <div style={{ display: "flex", background: "#4f46e5", color: "#ffffff", borderRadius: 12, padding: "10px 24px", fontWeight: 700 }}>Compare prices</div>
          {stores > 0 && <div style={{ display: "flex" }}>{`across ${stores} ${stores === 1 ? "store" : "stores"}`}</div>}
        </div>
      </div>
    ),
    size,
  );
}
