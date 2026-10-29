import { z } from "zod";

export const OFFER_AVAILABILITY = ["in_stock", "limited", "out_of_stock", "preorder", "unknown"] as const;
export const offerAvailabilitySchema = z.enum(OFFER_AVAILABILITY);
export type OfferAvailability = z.infer<typeof offerAvailabilitySchema>;

/**
 * Where an offer came from. Only non-demo sources can ever be shown as LIVE,
 * and only when they were verified recently.
 */
export const OFFER_SOURCES = ["demo", "affiliate_api", "partner_feed", "licensed_data", "manual"] as const;
export const offerSourceSchema = z.enum(OFFER_SOURCES);
export type OfferSource = z.infer<typeof offerSourceSchema>;

export const REFRESH_STATUSES = ["never", "ok", "error"] as const;
export const refreshStatusSchema = z.enum(REFRESH_STATUSES);
export type RefreshStatus = z.infer<typeof refreshStatusSchema>;

export const SEARCH_SORTS = ["relevance", "price_asc", "price_desc", "name"] as const;
export const searchSortSchema = z.enum(SEARCH_SORTS);
export type SearchSort = z.infer<typeof searchSortSchema>;

export const HISTORY_RANGES = ["7d", "30d", "90d", "1y", "all"] as const;
export const historyRangeSchema = z.enum(HISTORY_RANGES);
export type HistoryRange = z.infer<typeof historyRangeSchema>;
