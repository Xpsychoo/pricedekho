/**
 * Money helpers. All arithmetic uses integer paise; rupees are only produced
 * for presentation.
 */

const MAX_SAFE_PAISE = Number.MAX_SAFE_INTEGER;

export function isValidPaise(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= MAX_SAFE_PAISE;
}

/**
 * Converts a rupee amount (number or decimal string such as "69,900.50") to
 * integer paise without floating point drift. Returns null for invalid input.
 */
export function rupeesToPaise(input: number | string): number | null {
  const text = typeof input === "number" ? (Number.isFinite(input) ? input.toFixed(2) : "") : input;
  const cleaned = text.replace(/[,\s₹]/g, "").replace(/^Rs\.?/i, "");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const rupees = Number(match[1]);
  const paise = Number((match[2] ?? "").padEnd(2, "0"));
  const total = rupees * 100 + paise;
  return Number.isSafeInteger(total) ? total : null;
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

const wholeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const fractionalFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats paise as Indian rupees, e.g. 6990000 → "₹69,900". */
export function formatINR(paise: number): string {
  const formatter = paise % 100 === 0 ? wholeFormatter : fractionalFormatter;
  return formatter.format(paiseToRupees(paise));
}

/**
 * Whole-percent discount, only when a strictly higher original price exists.
 * Returns null otherwise so the UI never shows an unverified discount.
 */
export function discountPercent(pricePaise: number, originalPricePaise: number | null): number | null {
  if (originalPricePaise === null || !isValidPaise(originalPricePaise) || !isValidPaise(pricePaise)) return null;
  if (originalPricePaise <= pricePaise) return null;
  return Math.floor(((originalPricePaise - pricePaise) * 100) / originalPricePaise);
}
