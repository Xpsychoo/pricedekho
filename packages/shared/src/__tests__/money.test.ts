import { describe, expect, it } from "vitest";
import { discountPercent, formatINR, isValidPaise, paiseToRupees, rupeesToPaise } from "../utils/money";

describe("rupeesToPaise", () => {
  it.each([
    ["69900", 6_990_000],
    ["69,900", 6_990_000],
    ["₹69,900.50", 6_990_050],
    ["Rs. 1,499.5", 149_950],
    ["0.07", 7],
    [499.99, 49_999],
    [0.1 + 0.2, 30], // float drift must not leak into paise
  ])("converts %s", (input, expected) => {
    expect(rupeesToPaise(input)).toBe(expected);
  });

  it.each(["", "abc", "12.345", "-5", "1e5", Number.NaN, Number.POSITIVE_INFINITY])("rejects %s", (input) => {
    expect(rupeesToPaise(input)).toBeNull();
  });
});

describe("formatINR", () => {
  it("formats whole rupees without decimals", () => {
    expect(formatINR(6_990_000)).toBe("₹69,900");
  });

  it("uses Indian digit grouping (lakh/crore)", () => {
    expect(formatINR(1_234_567_800)).toBe("₹1,23,45,678");
  });

  it("shows paise when present", () => {
    expect(formatINR(149_950)).toBe("₹1,499.50");
  });

  it("round-trips with paiseToRupees", () => {
    expect(paiseToRupees(6_990_050)).toBe(69_900.5);
  });
});

describe("discountPercent", () => {
  it("floors the percentage", () => {
    expect(discountPercent(5_211_100, 5_911_100)).toBe(11);
  });

  it("returns null without a strictly higher original price", () => {
    expect(discountPercent(1000, null)).toBeNull();
    expect(discountPercent(1000, 1000)).toBeNull();
    expect(discountPercent(1000, 900)).toBeNull();
  });
});

describe("isValidPaise", () => {
  it("accepts positive safe integers only", () => {
    expect(isValidPaise(1)).toBe(true);
    expect(isValidPaise(0)).toBe(false);
    expect(isValidPaise(1.5)).toBe(false);
    expect(isValidPaise(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
  });
});
