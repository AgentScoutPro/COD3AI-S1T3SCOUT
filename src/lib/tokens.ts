import { randomBytes } from "crypto";

/** Cryptographically random, URL-safe public report token — not a
 * sequential ID, not guessable, and never used for authorization beyond
 * "knows this token can view this one report." */
export function generateReportToken(): string {
  return randomBytes(24).toString("base64url");
}
