import type { OfferAvailability, OfferSource, RefreshStatus } from "../schemas/enums";

/**
 * Presentation status of an offer.
 * - demo: sample data, never a real price
 * - live: from an authorised source and verified within the freshness window
 * - stale: from an authorised source but not verified recently (or never)
 * - unavailable: verified recently and reported out of stock
 * - source_error: the most recent refresh attempt failed; the shown price is the
 *   last verified value with its original timestamp
 */
export type PriceStatus = "demo" | "live" | "stale" | "unavailable" | "source_error";

export interface FreshnessConfig {
  /** Maximum age of a verification before an offer is considered stale. */
  liveMaxAgeMs: number;
}

export const DEFAULT_FRESHNESS_HOURS = 24;

export function freshnessConfigFromHours(hours: number | string | undefined): FreshnessConfig {
  const parsed = typeof hours === "string" ? Number(hours) : hours;
  const h = parsed !== undefined && Number.isFinite(parsed) && parsed > 0 && parsed <= 24 * 30 ? parsed : DEFAULT_FRESHNESS_HOURS;
  return { liveMaxAgeMs: h * 60 * 60 * 1000 };
}

export interface StatusInput {
  source: OfferSource;
  availability: OfferAvailability;
  lastCheckedAt: string | Date | null;
  refreshStatus: RefreshStatus;
}

export function computePriceStatus(
  offer: StatusInput,
  now: Date = new Date(),
  config: FreshnessConfig = freshnessConfigFromHours(DEFAULT_FRESHNESS_HOURS),
): PriceStatus {
  if (offer.source === "demo") return "demo";
  if (offer.refreshStatus === "error") return "source_error";
  if (!offer.lastCheckedAt) return "stale";
  const checked = new Date(offer.lastCheckedAt).getTime();
  if (!Number.isFinite(checked)) return "stale";
  // A timestamp in the future is not trustworthy as "fresh".
  if (checked > now.getTime() + 5 * 60 * 1000) return "stale";
  if (now.getTime() - checked > config.liveMaxAgeMs) return "stale";
  if (offer.availability === "out_of_stock") return "unavailable";
  return "live";
}

export const PRICE_STATUS_LABELS: Record<PriceStatus, { label: string; description: string }> = {
  demo: {
    label: "DEMO",
    description: "Sample data for demonstration only. Not a real price.",
  },
  live: {
    label: "Live — recently checked",
    description: "Verified from an authorised source within the freshness window.",
  },
  stale: {
    label: "Stale — refresh required",
    description: "Not verified recently. The price may have changed.",
  },
  unavailable: {
    label: "Unavailable",
    description: "The store reported this item as out of stock at the last check.",
  },
  source_error: {
    label: "Source error",
    description: "The latest refresh failed. Showing the last verified price with its original timestamp.",
  },
};

/** Human-readable relative time, e.g. "3 hours ago". */
export function formatRelativeTime(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "Never checked";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "Unknown";
  const diffSec = Math.round((then - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
  return rtf.format(Math.round(diffSec / (86400 * 365)), "year");
}

const absoluteFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

export function formatTimestampIST(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? `${absoluteFormatter.format(d)} IST` : "Unknown";
}
