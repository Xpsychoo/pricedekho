import { ExternalLink, Store } from "lucide-react";
import { formatINR, formatRelativeTime, formatTimestampIST } from "@pricedekho/shared";
import type { PresentedOffer } from "@/lib/present";
import { Badge } from "@/components/ui/badge";
import { PriceStatusLabel } from "./PriceStatusLabel";
import { cn } from "@/lib/utils";

export const AVAILABILITY_LABELS: Record<PresentedOffer["availability"], string> = {
  in_stock: "In stock",
  limited: "Limited stock",
  out_of_stock: "Out of stock",
  preorder: "Pre-order",
  unknown: "Availability unknown",
};

export function VisitStoreLink({ offer, className }: { offer: PresentedOffer; className?: string }) {
  const isDemo = offer.status === "demo";
  return (
    <a
      href={offer.productUrl}
      target="_blank"
      // sponsored: affiliate links must be marked; noopener/noreferrer for safety.
      rel="noopener noreferrer nofollow sponsored"
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap",
        isDemo ? "border border-violet-300 bg-white text-violet-900 hover:bg-violet-50" : "bg-brand-600 text-white hover:bg-brand-700",
        className,
      )}
    >
      {isDemo ? "Demo link" : "Visit store"}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">
        {" "}
        {offer.store.name} (opens in a new tab{isDemo ? "; fictional demo store" : ""})
      </span>
    </a>
  );
}

/** Mobile representation of one offer. */
export function OfferCard({ offer, isLowest, now }: { offer: PresentedOffer; isLowest: boolean; now: Date }) {
  const unavailable = offer.availability === "out_of_stock";
  return (
    <div className={cn("rounded-xl border bg-white p-4", isLowest ? "border-brand-300 ring-1 ring-brand-200" : "border-slate-200")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold text-slate-900">
            <Store className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <span className="truncate">{offer.store.name}</span>
          </p>
          {offer.sellerName && <p className="mt-0.5 truncate text-xs text-slate-500">Seller: {offer.sellerName}</p>}
        </div>
        <div className="text-right">
          <p className={cn("text-lg font-bold", unavailable ? "text-slate-400 line-through" : "text-slate-900")}>{formatINR(offer.pricePaise)}</p>
          {offer.discountPercent !== null && offer.originalPricePaise !== null && (
            <p className="text-xs text-slate-500">
              <span className="line-through">{formatINR(offer.originalPricePaise)}</span>{" "}
              <span className="font-medium text-emerald-700">{offer.discountPercent}% off</span>
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <PriceStatusLabel status={offer.status} />
        {isLowest && <Badge tone="brand">Lowest</Badge>}
        <Badge tone={unavailable ? "neutral" : "success"}>{AVAILABILITY_LABELS[offer.availability]}</Badge>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500" title={formatTimestampIST(offer.lastCheckedAt)}>
          {offer.lastCheckedAt ? `Checked ${formatRelativeTime(offer.lastCheckedAt, now)}` : "Never verified"}
        </p>
        <VisitStoreLink offer={offer} />
      </div>
    </div>
  );
}
