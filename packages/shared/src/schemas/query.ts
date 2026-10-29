import { z } from "zod";
import { FILTERABLE_ATTRIBUTES, type FilterableAttribute } from "../constants/categories";
import { historyRangeSchema, searchSortSchema } from "./enums";

export const SEARCH_LIMITS = {
  maxQueryLength: 100,
  maxPage: 50,
  defaultPageSize: 12,
  maxPageSize: 48,
  maxAttributeValueLength: 40,
} as const;

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const attributeValueSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(SEARCH_LIMITS.maxAttributeValueLength)
  .regex(/^[a-z0-9 .\-+/]*$/, "Invalid filter value");

export const searchQuerySchema = z.object({
  q: optionalText(SEARCH_LIMITS.maxQueryLength),
  category: slugSchema.optional(),
  brand: optionalText(60),
  sort: searchSortSchema.default("relevance"),
  page: z.coerce.number().int().min(1).max(SEARCH_LIMITS.maxPage).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(SEARCH_LIMITS.maxPageSize)
    .default(SEARCH_LIMITS.defaultPageSize),
  attributes: z
    .partialRecord(z.enum(FILTERABLE_ATTRIBUTES as [FilterableAttribute, ...FilterableAttribute[]]), attributeValueSchema)
    .default({}),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const historyQuerySchema = z.object({
  range: historyRangeSchema.default("90d"),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
});

export type HistoryQuery = z.infer<typeof historyQuerySchema>;

type RawParams = URLSearchParams | Record<string, string | string[] | undefined>;

function firstValue(params: RawParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Converts URL search params (Next.js page props or a Request URL) into the
 * shape expected by searchQuerySchema. Empty strings are treated as absent.
 * Variant attribute filters are read from known keys only, e.g. ?storage=128gb.
 */
export function toSearchInput(params: RawParams): Record<string, unknown> {
  const pick = (key: string) => {
    const v = firstValue(params, key);
    return v === undefined || v.trim() === "" ? undefined : v;
  };
  const attributes: Record<string, string> = {};
  for (const key of FILTERABLE_ATTRIBUTES) {
    const v = pick(key);
    if (v !== undefined) attributes[key] = v;
  }
  return {
    q: pick("q"),
    category: pick("category"),
    brand: pick("brand"),
    sort: pick("sort"),
    page: pick("page"),
    pageSize: pick("pageSize"),
    attributes,
  };
}

export function parseSearchQuery(params: RawParams) {
  return searchQuerySchema.safeParse(toSearchInput(params));
}

export const HISTORY_RANGE_DAYS: Record<z.infer<typeof historyRangeSchema>, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
  all: null,
};
