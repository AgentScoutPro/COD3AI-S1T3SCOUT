import { describe, expect, it } from "vitest";
import { runScoringEngine } from "@/lib/scoring/engine";
import { hvac } from "@/lib/industry-templates/hvac";
import type { RuleContext } from "@/lib/scoring/types";
import type { CrawledPageResult } from "@/lib/providers/types";

function makePage(overrides: Partial<CrawledPageResult> = {}): CrawledPageResult {
  return {
    url: "https://example.com/",
    normalizedUrl: "https://example.com/",
    httpStatus: 200,
    title: "Home",
    metaDescription: "Desc",
    h1: "Home",
    canonicalUrl: "https://example.com/",
    wordCount: 500,
    hasSchema: true,
    schemaTypes: ["LocalBusiness"],
    internalLinks: 10,
    brokenLinks: 0,
    brokenImages: 0,
    hasHttps: true,
    hasViewportMeta: true,
    hasClickToCall: true,
    hasBookingForm: true,
    hasAnalytics: true,
    signals: { bodyTextSample: "Phoenix AZ AC repair heating repair furnace" },
    ...overrides,
  };
}

function makeContext(overrides: Partial<RuleContext> = {}): RuleContext {
  const homepage = makePage();
  return {
    business: { name: "Desert Comfort", normalizedDomain: "example.com", industry: "hvac", city: "Phoenix", state: "AZ" },
    template: hvac,
    pages: [homepage],
    homepage,
    crawlMeta: { robotsAllowed: true, robotsTxtFound: true, sitemapsFound: ["https://example.com/sitemap.xml"], crawlCapped: false },
    place: null,
    placesConfigured: false,
    pageSpeed: [],
    pageSpeedConfigured: false,
    competitors: [],
    competitorPages: {},
    ...overrides,
  };
}

describe("runScoringEngine", () => {
  it("excludes unknown findings from a category's denominator instead of scoring them zero", () => {
    const withPlaces = runScoringEngine(makeContext({ placesConfigured: true, place: null }));
    const withoutPlaces = runScoringEngine(makeContext({ placesConfigured: false, place: null }));

    const gbpWith = withPlaces.categories.find((c) => c.category === "google_business_profile")!;
    const gbpWithout = withoutPlaces.categories.find((c) => c.category === "google_business_profile")!;

    // Same underlying data (no place found either way), but the "not
    // configured" run should have fewer applicable points and a lower
    // confidence score rather than a lower percentage from zeroed rules.
    expect(gbpWithout.confidence).toBeLessThan(gbpWith.confidence);
  });

  it("produces an overall score between 0 and 100", () => {
    const result = runScoringEngine(makeContext());
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  it("weights category contributions according to CATEGORY_WEIGHTS", () => {
    const result = runScoringEngine(makeContext());
    const sumOfWeights = result.categories.reduce((sum, c) => sum + c.weight, 0);
    expect(sumOfWeights).toBe(100);
  });

  it("rewards HTTPS and penalizes its absence", () => {
    const httpsResult = runScoringEngine(makeContext());
    const noHttpsPage = makePage({ hasHttps: false });
    const noHttpsResult = runScoringEngine(makeContext({ pages: [noHttpsPage], homepage: noHttpsPage }));

    const httpsFinding = httpsResult.findings.find((f) => f.ruleId === "tech.https")!;
    const noHttpsFinding = noHttpsResult.findings.find((f) => f.ruleId === "tech.https")!;
    expect(httpsFinding.status).toBe("pass");
    expect(noHttpsFinding.status).toBe("fail");
  });

  it("produces at least 40 findings across all categories", () => {
    const result = runScoringEngine(makeContext());
    expect(result.findings.length).toBeGreaterThanOrEqual(40);
  });
});
