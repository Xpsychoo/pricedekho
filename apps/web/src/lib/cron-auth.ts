import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Verifies "Authorization: Bearer <secret>" in constant time. Both values
 * are hashed first so the comparison does not leak the secret's length.
 * Returns false when no secret is configured — the endpoint is closed by default.
 */
export function isAuthorizedCronRequest(request: Request, secret: string | undefined): boolean {
  if (!secret || secret.length < 32) return false;
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) return false;
  const provided = createHash("sha256").update(match[1]!).digest();
  const expected = createHash("sha256").update(secret).digest();
  return timingSafeEqual(provided, expected);
}
