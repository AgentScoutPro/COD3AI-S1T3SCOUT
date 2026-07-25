import { describe, expect, it } from "vitest";
import { normalizeDomain, normalizeUrl, normalizeBusinessName, normalizePhone } from "@/lib/crawler/normalize";

describe("normalizeDomain", () => {
  it("strips www and lowercases", () => {
    expect(normalizeDomain("https://WWW.Example.com/path")).toBe("example.com");
    expect(normalizeDomain("example.com")).toBe("example.com");
    expect(normalizeDomain("www.example.com")).toBe("example.com");
  });
});

describe("normalizeUrl", () => {
  it("drops trailing slash, fragment, and tracking params", () => {
    expect(normalizeUrl("https://example.com/services/?utm_source=google#top")).toBe(
      "https://example.com/services"
    );
  });

  it("keeps root path slash", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("sorts remaining query params for stable dedup", () => {
    expect(normalizeUrl("https://example.com/page?b=2&a=1")).toBe(normalizeUrl("https://example.com/page?a=1&b=2"));
  });

  it("resolves relative URLs against a base", () => {
    expect(normalizeUrl("/about", "https://example.com/home")).toBe("https://example.com/about");
  });
});

describe("normalizeBusinessName", () => {
  it("strips punctuation, suffixes, and case", () => {
    expect(normalizeBusinessName("Acme HVAC, LLC.")).toBe("acme hvac");
    expect(normalizeBusinessName("ACME Plumbing Inc")).toBe("acme plumbing");
  });
});

describe("normalizePhone", () => {
  it("strips formatting and leading US country code", () => {
    expect(normalizePhone("+1 (602) 555-0142")).toBe("6025550142");
    expect(normalizePhone("(602) 555-0142")).toBe("6025550142");
  });

  it("returns null for empty input", () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});
