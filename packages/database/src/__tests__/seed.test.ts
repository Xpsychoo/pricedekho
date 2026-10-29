import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateSeedSql } from "../seed";

const seedPath = fileURLToPath(new URL("../../../../supabase/seed.sql", import.meta.url));

describe("supabase/seed.sql", () => {
  const committed = readFileSync(seedPath, "utf8").replace(/\r\n/g, "\n");

  it("is up to date with the demo catalog (run `pnpm seed:generate`)", () => {
    expect(committed).toBe(generateSeedSql());
  });

  it("marks all offers as demo, unverified, and contains no price history", () => {
    expect(committed).toContain("DEMO SEED DATA — NOT REAL PRICES");
    expect(committed).not.toMatch(/price_history/i);
    const offerLines = committed.split("\n").filter((l) => l.includes("-4000-d000-"));
    expect(offerLines.length).toBeGreaterThan(0);
    for (const line of offerLines) expect(line).toMatch(/'demo', null\)/);
  });

  it("uses only reserved .example domains for store URLs", () => {
    const urls = committed.match(/https:\/\/[^'\s]+/g) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(new URL(url).hostname.endsWith(".example")).toBe(true);
  });
});
