import { Store } from "lucide-react";
import { formatINR, formatRelativeTime, formatTimestampIST } from "@pricedekho/shared";
import type { PresentedOffer } from "@/lib/present";
import { Badge } from "@/components/ui/badge";
import { AVAILABILITY_LABELS, OfferCard, VisitStoreLink } from "./OfferCard";
import { PriceStatusLabel } from "./PriceStatusLabel";
import { cn } from "@/lib/utils";

/**
 * Store-by-store comparison. Offers arrive sorted lowest price first with
 * purchasable listings ahead of out-of-stock ones. Table on desktop, cards
 * on mobile.
 */
export function PriceComparisonTable({ offers, lowestOfferId, now }: { offers: PresentedOffer[]; lowestOfferId: string | null; now: Date }) {
  return (
    <>
      <ul className="space-y-3 md:hidden" aria-label="Store offers">
        {offers.map((offer) => (
          <li key={offer.id}>
            <OfferCard offer={offer} isLowest={offer.id === lowestOfferId} now={now} />
          </li>
        ))}
      </ul>
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Prices for this product at each store, lowest first</caption>
          <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Store</th>
              <th scope="col" className="px-4 py-3">Price</th>
              <th scope="col" className="px-4 py-3">Availability</th>
              <th scope="col" className="px-4 py-3">Data status</th>
              <th scope="col" className="px-4 py-3">Last checked</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Link</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {offers.map((offer) => {
              const isLowest = offer.id === lowestOfferId;
              const unavailable = offer.availability === "out_of_stock";
              return (
                <tr key={offer.id} className={cn(isLowest && "bg-brand-50/50")}>
                  <th scope="row" className="px-4 py-3 font-normal">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <Store className="h-4 w-4 text-slate-400" aria-hidden />
                      {offer.store.name}
                    </span>
                    {offer.sellerName && <span className="mt-0.5 block text-xs text-slate-500">Seller: {offer.sellerName}</span>}
                  </th>
                  <td className="px-4 py-3">
                    <span className={cn("text-base font-bold", unavailable ? "text-slate-400 line-through" : "text-slate-900")}>
                      {formatINR(offer.pricePaise)}
                    </span>
                    {isLowest && <Badge tone="brand" className="ml-2">Lowest</Badge>}
                    {offer.discountPercent !== null && offer.originalPricePaise !== null && (
                      <span className="block text-xs text-slate-500">
                        <span className="line-through">{formatINR(offer.originalPricePaise)}</span>{" "}
                        <span className="font-medium text-emerald-700">{offer.discountPercent}% off</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{AVAILABILITY_LABELS[offer.availability]}</td>
                  <td className="px-4 py-3">
                    <PriceStatusLabel status={offer.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {offer.lastCheckedAt ? (
                      <time dateTime={offer.lastCheckedAt} title={formatTimestampIST(offer.lastCheckedAt)}>
                        {formatRelativeTime(offer.lastCheckedAt, now)}
                      </time>
                    ) : (
                      "Never verified"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <VisitStoreLink offer={offer} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
