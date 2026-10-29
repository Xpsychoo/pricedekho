import "server-only";
import { getServerEnv } from "./env";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

export interface RateLimiter {
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

/**
 * Fixed-window limiter held in process memory. On serverless platforms each
 * instance has its own memory, so this is best-effort only. Configure Upstash
 * Redis for a shared, production-grade limit.
 */
export class MemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly now: () => number = Date.now, private readonly maxKeys = 10_000) {}

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = this.now();
    let entry = this.windows.get(key);
    if (!entry || entry.resetAt <= now) {
      if (this.windows.size >= this.maxKeys) this.evictExpired(now);
      entry = { count: 0, resetAt: now + windowMs };
      this.windows.set(key, entry);
    }
    entry.count += 1;
    return { allowed: entry.count <= limit, limit, remaining: Math.max(0, limit - entry.count), resetMs: entry.resetAt - now };
  }

  private evictExpired(now: number) {
    for (const [k, v] of this.windows) if (v.resetAt <= now) this.windows.delete(k);
    // Still full: drop the oldest entries rather than grow without bound.
    for (const k of this.windows.keys()) {
      if (this.windows.size < this.maxKeys) break;
      this.windows.delete(k);
    }
  }
}

/** Fixed-window limiter on Upstash Redis via its REST pipeline API. */
export class UpstashRateLimiter implements RateLimiter {
  constructor(private readonly url: string, private readonly token: string) {}

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const windowId = Math.floor(Date.now() / windowMs);
    const redisKey = `pd:rl:${key}:${windowId}`;
    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["PEXPIRE", redisKey, String(windowMs)],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) throw new Error(`Upstash responded ${res.status}`);
    const body = (await res.json()) as Array<{ result?: unknown }>;
    const count = Number(body[0]?.result);
    if (!Number.isFinite(count)) throw new Error("Unexpected Upstash response");
    const resetMs = (windowId + 1) * windowMs - Date.now();
    return { allowed: count <= limit, limit, remaining: Math.max(0, limit - count), resetMs };
  }
}

let limiter: RateLimiter | undefined;
const fallback = new MemoryRateLimiter();

export function getRateLimiter(): RateLimiter {
  if (limiter) return limiter;
  const env = getServerEnv();
  limiter =
    env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
      ? new UpstashRateLimiter(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
      : fallback;
  return limiter;
}

/** Client identifier from the platform-set forwarding header. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return ip.slice(0, 64);
}

/**
 * Applies a limit; if the shared store is unreachable, falls back to the
 * in-memory limiter rather than failing open entirely.
 */
export async function rateLimit(request: Request, bucket: string, limit: number, windowMs = 60_000): Promise<RateLimitResult> {
  const key = `${bucket}:${clientKey(request)}`;
  try {
    return await getRateLimiter().check(key, limit, windowMs);
  } catch {
    return fallback.check(key, limit, windowMs);
  }
}

export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
    ...(r.allowed ? {} : { "Retry-After": String(Math.max(1, Math.ceil(r.resetMs / 1000))) }),
  };
}
