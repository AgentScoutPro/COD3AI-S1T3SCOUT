import { describe, expect, it } from "vitest";
import { aiReportOutputSchema } from "@/lib/validation/report";
import { generateTemplateReport } from "@/lib/providers/ai-report/template";
import { runScoringEngine } from "@/lib/scoring/engine";
import { hvac } from "@/lib/industry-templates/hvac";
import type { RuleContext } from "@/lib/scoring/types";
import type { CrawledPageResult } from "@/lib/providers/types";

function makeHomepage(): CrawledPageResult {
  return {
    url: "https://example.com/",
    normalizedUrl: "https://example.com/",
    httpStatus: 200,
    title: "Home",
    metaDescription: null,
    h1: "Home",
    canonicalUrl: null,
    wordCount: 50,
    hasSchema: false,
    schemaTypes: [],
    internalLinks: 2,
    brokenLinks: 1,
    brokenImages: 1,
    hasHttps: false,
    hasViewportMeta: false,
    hasClickToCall: false,
    hasBookingForm: false,
    hasAnalytics: false,
    signals: {},
  };
}

describe("aiReportOutputSchema", () => {
  it("accepts a well-formed report", () => {
    const homepage = makeHomepage();
    const ctx: RuleContext = {
      business: { name: "Desert Comfort", normalizedDomain: "example.com", industry: "hvac", city: "Phoenix", state: "AZ" },
      template: hvac,
      pages: [homepage],
      homepage,
      crawlMeta: { robotsAllowed: false, robotsTxtFound: false, sitemapsFound: [], crawlCapped: false },
      place: null,
      placesConfigured: false,
      placeMatchMethod: null,
      placeMatchQueryPath: null,
      pageSpeed: [],
      pageSpeedConfigured: false,
      competitors: [],
      competitorPages: {},
      competitorsConfigured: false,
    };
    const scoring = runScoringEngine(ctx);

    const report = generateTemplateReport({
      business: { name: "Desert Comfort", websiteUrl: "https://example.com", industry: "hvac", city: "Phoenix", state: "AZ" },
      scoring,
      findings: scoring.findings.map((f) => ({
        rule_id: f.ruleId,
        category: f.category,
        status: f.status,
        severity: f.severity,
        explanation: f.explanation,
        recommendation: f.recommendation ?? null,
        points_earned: f.pointsEarned,
        points_available: f.pointsAvailable,
      })),
      competitors: [],
      dataLimitations: ["No Google Business Profile match was found."],
    });

    const result = aiReportOutputSchema.safeParse(report);
    expect(result.success).toBe(true);
  });

  it("rejects a report missing required fields", () => {
    const result = aiReportOutputSchema.safeParse({ executiveSummary: "Only this field." });
    expect(result.success).toBe(false);
  });

  it("caps topOpportunities at 5", () => {
    const opp = {
      priority: "low" as const,
      title: "t",
      problem: "p",
      whyItMatters: "w",
      recommendedAction: "r",
      expectedImpact: "low" as const,
      effort: "low" as const,
      evidenceFindingIds: [],
    };
    const result = aiReportOutputSchema.safeParse({
      executiveSummary: "s",
      scoreExplanation: "s",
      strongestAreas: [],
      topOpportunities: Array(6).fill(opp),
      thirtyDayPlan: [],
      sixtyDayPlan: [],
      ninetyDayPlan: [],
      internalActions: [],
      cod3aiOpportunities: [],
      limitations: [],
    });
    expect(result.success).toBe(false);
  });
});
