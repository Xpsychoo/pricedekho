import { z } from "zod";

/**
 * Environment validation. Supabase is optional for local development — the
 * app falls back to the bundled DEMO catalog — but a half-configured
 * Supabase setup is a hard error, and production can require a database via
 * PRICEDEKHO_REQUIRE_DATABASE=true.
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(`Configuration error: ${message}`);
    this.name = "ConfigError";
  }
}

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.preprocess(emptyToUndefined, z.string().min(20).optional()),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().min(20).optional()),
  CRON_SECRET: z.preprocess(emptyToUndefined, z.string().min(32, "CRON_SECRET must be at least 32 characters").optional()),
  PRICEDEKHO_REQUIRE_DATABASE: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).default("false")),
  PRICEDEKHO_ENABLE_DEMO_PROVIDER: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).default("true")),
  PRICE_FRESHNESS_HOURS: z.preprocess(emptyToUndefined, z.coerce.number().positive().max(720).default(24)),
  PRICE_OBSERVATION_INTERVAL_HOURS: z.preprocess(emptyToUndefined, z.coerce.number().positive().max(720).default(24)),
  REFRESH_BATCH_SIZE: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(100).default(25)),
  UPSTASH_REDIS_REST_URL: z.preprocess(emptyToUndefined, z.url().startsWith("https://").optional()),
  UPSTASH_REDIS_REST_TOKEN: z.preprocess(emptyToUndefined, z.string().min(10).optional()),
});

export type ServerEnv = z.infer<typeof serverSchema>;

function format(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}

export function parseServerEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  const result = serverSchema.safeParse(source);
  if (!result.success) throw new ConfigError(`${format(result.error)}. Check your .env.local against .env.example.`);
  const env = result.data;
  const hasUrl = Boolean(env.NEXT_PUBLIC_SUPABASE_URL);
  const hasKey = Boolean(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (hasUrl !== hasKey) {
    throw new ConfigError("Set both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or neither to use demo mode.");
  }
  if (env.PRICEDEKHO_REQUIRE_DATABASE === "true" && !hasUrl) {
    throw new ConfigError("PRICEDEKHO_REQUIRE_DATABASE=true but Supabase is not configured.");
  }
  if (Boolean(env.UPSTASH_REDIS_REST_URL) !== Boolean(env.UPSTASH_REDIS_REST_TOKEN)) {
    throw new ConfigError("Set both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or neither.");
  }
  return env;
}

let cached: ServerEnv | undefined;

/** Validated server environment (memoised). Throws ConfigError with actionable text. */
export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv();
  return cached;
}

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return raw.replace(/\/+$/, "");
}
