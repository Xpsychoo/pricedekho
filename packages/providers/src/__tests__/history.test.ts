import { describe, expect, it } from "vitest";
import { shouldRecordObservation, type Observation } from "../history";

const DAY = 86_400_000;
const base: Observation = { pricePaise: 100_000, availability: "in_stock", observedAt: "2026-10-28T00:00:00.000Z" };
const at = (ms: number, o: Partial<Observation> = {}): Observation => ({
  ...base,
  observedAt: new Date(new Date(base.observedAt).getTime() + ms).toISOString(),
  ...o,
});

describe("shouldRecordObservation", () => {
  it("records the first observation", () => {
    expect(shouldRecordObservation(null, base)).toBe(true);
  });

  it("skips an unchanged price within the interval", () => {
    expect(shouldRecordObservation(base, at(DAY / 2), DAY)).toBe(false);
  });

  it("records an unchanged price once the interval has passed", () => {
    expect(shouldRecordObservation(base, at(DAY), DAY)).toBe(true);
  });

  it("records a price change immediately", () => {
    expect(shouldRecordObservation(base, at(60_000, { pricePaise: 99_000 }), DAY)).toBe(true);
  });

  it("records an availability change immediately", () => {
    expect(shouldRecordObservation(base, at(60_000, { availability: "out_of_stock" }), DAY)).toBe(true);
  });

  it("never records an observation at or before the previous one (retry safety)", () => {
    expect(shouldRecordObservation(base, { ...base, pricePaise: 1 })).toBe(false);
    expect(shouldRecordObservation(base, at(-DAY, { pricePaise: 1 }))).toBe(false);
  });
});
