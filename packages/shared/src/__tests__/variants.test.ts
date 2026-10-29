import { describe, expect, it } from "vitest";
import { buildVariantKey, compareVariants, formatAttributeValue, normalizeVariantAttributes } from "../utils/variants";

describe("normalizeVariantAttributes", () => {
  it("normalises keys, units, case and whitespace", () => {
    expect(normalizeVariantAttributes({ Storage: "128 GB", Colour: "  Midnight  Blue " })).toEqual({
      storage: "128gb",
      color: "midnight blue",
    });
  });

  it("drops null and empty values", () => {
    expect(normalizeVariantAttributes({ size: null, color: "", ram: "8GB" })).toEqual({ ram: "8gb" });
  });
});

describe("buildVariantKey", () => {
  it("is deterministic regardless of key order and formatting", () => {
    expect(buildVariantKey({ storage: "128GB", color: "Midnight" })).toBe("color=midnight|storage=128gb");
    expect(buildVariantKey({ Colour: "midnight", storage: "128 gb" })).toBe("color=midnight|storage=128gb");
  });

  it("differs for different storage sizes", () => {
    expect(buildVariantKey({ storage: "128GB" })).not.toBe(buildVariantKey({ storage: "256GB" }));
  });
});

describe("compareVariants", () => {
  it("accepts equal variants", () => {
    expect(compareVariants({ storage: "128GB", color: "Midnight" }, { storage: "128 gb", colour: "midnight" }, ["storage", "color"])).toEqual({
      compatible: true,
    });
  });

  it("rejects a storage conflict", () => {
    expect(compareVariants({ storage: "128GB" }, { storage: "256GB" })).toEqual({ compatible: false, reason: "conflict", attribute: "storage" });
  });

  it("rejects clothing in different sizes", () => {
    expect(compareVariants({ size: "M", color: "Navy" }, { size: "L", color: "Navy" }, ["size", "color"]).compatible).toBe(false);
  });

  it("treats a missing identity attribute as incompatible", () => {
    expect(compareVariants({ color: "Midnight" }, { storage: "128GB", color: "Midnight" }, ["storage"])).toEqual({
      compatible: false,
      reason: "missing",
      attribute: "storage",
    });
  });
});

describe("formatAttributeValue", () => {
  it("formats units and words for display", () => {
    expect(formatAttributeValue("128gb")).toBe("128 GB");
    expect(formatAttributeValue("300ml")).toBe("300 ml");
    expect(formatAttributeValue("phantom black")).toBe("Phantom Black");
  });
});
