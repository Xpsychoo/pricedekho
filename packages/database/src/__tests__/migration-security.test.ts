/**
 * Static checks on the SQL migrations for the access-control assumptions the
 * app relies on. These do not replace testing against a real database (see
 * README → Security), but they catch regressions such as a table without RLS
 * or a write grant to public roles.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = fileURLToPath(new URL("../../../../supabase/migrations/", import.meta.url));
const sql = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(dir + f, "utf8"))
  .join("\n")
  .replace(/--.*$/gm, "") // strip comments so prose can't satisfy or break checks
  .toLowerCase();

const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]!);

describe("migration access control", () => {
  it("defines the expected tables", () => {
    expect(tables.sort()).toEqual(["categories", "offers", "price_history", "products", "stores"]);
  });

  it.each(tables)("enables row level security on %s", (table) => {
    expect(sql).toContain(`alter table public.${table} enable row level security`);
  });

  it("creates no insert, update or delete policies for public roles", () => {
    const policies = [...sql.matchAll(/create policy[\s\S]*?;/g)].map((m) => m[0]);
    expect(policies.length).toBeGreaterThan(0);
    for (const p of policies) {
      expect(p).toMatch(/for select/);
      expect(p).not.toMatch(/for (insert|update|delete|all)/);
    }
  });

  it("never grants write privileges to anon or authenticated", () => {
    const grants = [...sql.matchAll(/^grant ([\s\S]*?) on ([\s\S]*?) to ([\s\S]*?);/gm)];
    expect(grants.length).toBeGreaterThan(0);
    for (const [, privileges, , roles] of grants) {
      if (!/anon|authenticated/.test(roles!)) continue;
      const keywords = privileges!.replace(/\([^)]*\)/g, ""); // drop column lists like (updated_at)
      expect(keywords).not.toMatch(/\b(insert|update|delete|truncate|all)\b/);
    }
  });

  it("keeps refresh error details out of the public column grant on offers", () => {
    const offersGrant = /grant select \(([\s\S]*?)\) on public\.offers to anon, authenticated/.exec(sql);
    expect(offersGrant).not.toBeNull();
    expect(offersGrant![1]).not.toContain("last_refresh_error");
    expect(offersGrant![1]).not.toContain("consecutive_failures");
  });

  it.each(["apply_offer_refresh", "record_offer_refresh_failure", "latest_price_observations"])(
    "restricts privileged function %s to the service role",
    (fn) => {
      expect(sql).toMatch(new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\)\\s+from public, anon, authenticated`));
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\)\\s+to service_role`));
    },
  );

  it("pins search_path on every function", () => {
    const functions = [...sql.matchAll(/create function[\s\S]*?as \$\$/g)].map((m) => m[0]);
    expect(functions.length).toBeGreaterThan(0);
    for (const f of functions) expect(f).toContain("set search_path = ''");
  });

  it("does not use security definer functions", () => {
    expect(sql).not.toContain("security definer");
  });

  it("stores money as bigint paise", () => {
    expect(sql).toContain("price_paise bigint not null");
    expect(sql).not.toMatch(/price\w* (numeric|real|double|float|money)/);
  });

  it("uses a partial unique index so null external ids never collide", () => {
    expect(sql).toMatch(/create unique index offers_store_external_variant_unique[\s\S]*?where external_product_id is not null/);
  });
});
