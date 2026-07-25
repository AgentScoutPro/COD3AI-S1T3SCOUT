import { describe, expect, it } from "vitest";
import { generateReportToken } from "@/lib/tokens";

describe("generateReportToken", () => {
  it("generates a URL-safe, sufficiently long, non-sequential token", () => {
    const tokens = Array.from({ length: 20 }, () => generateReportToken());
    for (const token of tokens) {
      expect(token.length).toBeGreaterThanOrEqual(24);
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    }
    expect(new Set(tokens).size).toBe(tokens.length);
  });
});
