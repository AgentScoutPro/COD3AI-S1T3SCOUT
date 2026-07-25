import { describe, expect, it } from "vitest";
import { parseRobotsTxt, isPathAllowed } from "@/lib/crawler/robots";

const ROBOTS_TXT = `
User-agent: *
Disallow: /admin
Disallow: /cart
Allow: /cart/policy
Sitemap: https://example.com/sitemap.xml

User-agent: Cod3AILocalAuthorityBot/1.0
Disallow: /private
`;

describe("parseRobotsTxt", () => {
  it("prefers a matching specific user-agent group over the wildcard", () => {
    const rules = parseRobotsTxt(ROBOTS_TXT, "Cod3AILocalAuthorityBot/1.0");
    expect(rules.disallow).toEqual(["/private"]);
  });

  it("falls back to the wildcard group when no specific agent matches", () => {
    const rules = parseRobotsTxt(ROBOTS_TXT, "SomeOtherBot/2.0");
    expect(rules.disallow).toContain("/admin");
    expect(rules.disallow).toContain("/cart");
  });

  it("collects sitemap directives regardless of group", () => {
    const rules = parseRobotsTxt(ROBOTS_TXT, "SomeOtherBot/2.0");
    expect(rules.sitemaps).toEqual(["https://example.com/sitemap.xml"]);
  });
});

describe("isPathAllowed", () => {
  it("allows everything when robots.txt was not found", () => {
    expect(isPathAllowed({ found: false, disallow: [], allow: [], sitemaps: [] }, "/anything")).toBe(true);
  });

  it("disallows a path matching a Disallow rule", () => {
    const rules = parseRobotsTxt(ROBOTS_TXT, "SomeOtherBot/2.0");
    expect(isPathAllowed(rules, "/admin/settings")).toBe(false);
  });

  it("lets a more specific Allow override a Disallow", () => {
    const rules = parseRobotsTxt(ROBOTS_TXT, "SomeOtherBot/2.0");
    expect(isPathAllowed(rules, "/cart/policy")).toBe(true);
  });

  it("allows unrelated paths", () => {
    const rules = parseRobotsTxt(ROBOTS_TXT, "SomeOtherBot/2.0");
    expect(isPathAllowed(rules, "/services/ac-repair")).toBe(true);
  });
});
