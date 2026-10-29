/**
 * Search normalisation shared by the API, the in-memory demo repository and
 * the provider layer. Database search uses its own full-text index but is
 * fed the normalised query.
 */
export function normalizeSearchQuery(input: string | null | undefined, maxLength = 100): string {
  if (!input) return "";
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
}

export function tokenize(input: string): string[] {
  const normalized = normalizeSearchQuery(input, 500);
  if (!normalized) return [];
  // "128 gb" and "128gb" should both match the same product.
  return normalized
    .replace(/(\d)\s+(gb|tb|mah|ml)\b/g, "$1$2")
    .split(" ")
    .filter(Boolean);
}

/**
 * Relevance score in [0, 1] for a set of document fields. Every query token
 * must appear in some field; otherwise the score is 0 (no match).
 */
export function scoreSearchMatch(query: string, fields: { primary: string[]; secondary?: string[] }): number {
  const tokens = tokenize(query);
  if (tokens.length === 0) return 1;
  const primary = tokenize(fields.primary.join(" "));
  const secondary = tokenize((fields.secondary ?? []).join(" "));
  let score = 0;
  for (const token of tokens) {
    if (primary.includes(token)) score += 1;
    else if (primary.some((w) => w.startsWith(token))) score += 0.75;
    else if (secondary.some((w) => w === token || w.startsWith(token))) score += 0.4;
    else return 0;
  }
  return score / tokens.length;
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}
