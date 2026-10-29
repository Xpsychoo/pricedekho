import { NextResponse } from "next/server";
import type { z } from "zod";

/**
 * Consistent JSON envelope for every API route:
 *   success: { ok: true, data, meta? }
 *   failure: { ok: false, error: { code, message, issues? } }
 * Error responses never include stack traces or upstream error details.
 */
export type ApiErrorCode =
  | "invalid_request"
  | "not_found"
  | "unauthorized"
  | "rate_limited"
  | "not_configured"
  | "internal_error";

export function ok<T>(data: T, init?: { meta?: Record<string, unknown>; headers?: HeadersInit; status?: number }) {
  return NextResponse.json({ ok: true, data, ...(init?.meta ? { meta: init.meta } : {}) }, { status: init?.status ?? 200, headers: init?.headers });
}

export function fail(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra?: { issues?: Array<{ path: string; message: string }>; headers?: HeadersInit },
) {
  return NextResponse.json(
    { ok: false, error: { code, message, ...(extra?.issues ? { issues: extra.issues } : {}) } },
    { status, headers: { "Cache-Control": "no-store", ...extra?.headers } },
  );
}

export function validationError(error: z.ZodError) {
  return fail(400, "invalid_request", "Invalid request parameters", {
    issues: error.issues.slice(0, 10).map((i) => ({ path: i.path.join("."), message: i.message })),
  });
}

/** Logs server-side and returns a generic 500. */
export function internalError(context: string, error: unknown) {
  console.error(`[api] ${context}:`, error instanceof Error ? `${error.name}: ${error.message}` : "unknown error");
  return fail(500, "internal_error", "Something went wrong. Please try again later.");
}

/** Public catalog data contains nothing personalised, so CDN caching is safe. */
export const PUBLIC_CACHE_HEADERS = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };
