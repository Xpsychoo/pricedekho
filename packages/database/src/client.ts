import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Public (publishable-key) Supabase client. All access is subject to Row
 * Level Security, so it can only read published catalog data. Safe to use
 * for public reads on the server; it holds no user session.
 */
export function createPublicSupabaseClient(url: string, publishableKey: string): SupabaseClient {
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-application-name": "pricedekho-web" } },
  });
}
