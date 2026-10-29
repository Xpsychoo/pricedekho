import type { VariantAttributes } from "../types/catalog";

/**
 * Normalises a single variant attribute value so that "128 GB", "128GB" and
 * "128gb" compare equal, while "128gb" and "256gb" do not.
 */
export function normalizeVariantValue(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(\d)\s+(gb|tb|mb|ml|l|kg|g|mah|w|inch|in)\b/g, "$1$2");
}

export function normalizeVariantKeyName(key: string): string {
  return key
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .replace(/^colour$/, "color");
}

export function normalizeVariantAttributes(input: Record<string, unknown> | null | undefined): VariantAttributes {
  const out: VariantAttributes = {};
  if (!input) return out;
  for (const [rawKey, rawValue] of Object.entries(input)) {
    if (rawValue === null || rawValue === undefined) continue;
    const key = normalizeVariantKeyName(rawKey);
    const value = normalizeVariantValue(String(rawValue));
    if (key && value) out[key] = value;
  }
  return out;
}

/** Deterministic key such as "color=midnight|storage=128gb". */
export function buildVariantKey(attributes: Record<string, unknown> | null | undefined): string {
  const normalized = normalizeVariantAttributes(attributes);
  return Object.keys(normalized)
    .sort()
    .map((k) => `${k}=${normalized[k]}`)
    .join("|");
}

export type VariantComparison =
  | { compatible: true }
  | { compatible: false; reason: "conflict"; attribute: string }
  | { compatible: false; reason: "missing"; attribute: string };

/**
 * Two variants are compatible only when every shared attribute is equal and
 * every identity attribute required by the category is present on both.
 * Missing information is treated as incompatible: we never assume that a
 * listing without a storage size is the 128GB model.
 */
export function compareVariants(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  identityAttributes: readonly string[] = [],
): VariantComparison {
  const na = normalizeVariantAttributes(a);
  const nb = normalizeVariantAttributes(b);
  for (const attr of identityAttributes) {
    const key = normalizeVariantKeyName(attr);
    if (!(key in na) || !(key in nb)) return { compatible: false, reason: "missing", attribute: key };
  }
  for (const key of Object.keys(na)) {
    if (key in nb && na[key] !== nb[key]) return { compatible: false, reason: "conflict", attribute: key };
  }
  return { compatible: true };
}

const UNIT_LABELS: Record<string, string> = { gb: "GB", tb: "TB", mb: "MB", ml: "ml", l: "L", kg: "kg", g: "g", mah: "mAh", w: "W" };

/** Presentation form of a normalised value: "128gb" → "128 GB", "midnight blue" → "Midnight Blue". */
export function formatAttributeValue(value: string): string {
  const unit = /^(\d+(?:\.\d+)?)(gb|tb|mb|ml|l|kg|g|mah|w)$/.exec(value);
  if (unit) return `${unit[1]} ${UNIT_LABELS[unit[2]!]}`;
  return value.replace(/(^|[\s-])([a-z])/g, (_, sep: string, c: string) => sep + c.toUpperCase());
}

export function formatVariantLabel(attributes: VariantAttributes): string {
  return Object.values(attributes).map(formatAttributeValue).join(" · ");
}
