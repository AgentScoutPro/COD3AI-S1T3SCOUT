import type { ScoringRule } from "../types";
import { buildFinding, unknownFinding } from "../helpers";
import { coveredServices } from "@/lib/crawler/classify";

const CATEGORY = "competitive_visibility" as const;

function average(values: number[]): number | null {
  const filtered = values.filter((v): v is number => v !== null && !Number.isNaN(v));
  if (filtered.length === 0) return null;
  return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}

export const competitiveRules: ScoringRule[] = [
  {
    id: "competitive.benchmark_available",
    category: CATEGORY,
    evaluate: (ctx) => {
      if (!ctx.competitorsConfigured) {
        return unknownFinding(
          "competitive.benchmark_available",
          CATEGORY,
          1.5,
          "Competitor search was not available for this audit (unconfigured or rejected by the provider-integrity check) — competitive visibility is not evaluated rather than scored as absent."
        );
      }
      const pass = ctx.competitors.length >= 3;
      return buildFinding({
        ruleId: "competitive.benchmark_available",
        category: CATEGORY,
        pointsAvailable: 1.5,
        pointsEarnedRatio: pass ? 1 : ctx.competitors.length > 0 ? 0.5 : 0,
        status: pass ? "pass" : ctx.competitors.length > 0 ? "warning" : "fail",
        severity: pass ? "informational" : "low",
        explanation: `Identified ${ctx.competitors.length} local competitive benchmark businesses.`,
        recommendation: pass ? undefined : "Re-run once more competitor data is available for the service category and city.",
        estimatedImpact: "low",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "competitive.rating_percentile",
    category: CATEGORY,
    evaluate: (ctx) => {
      if (!ctx.place || ctx.place.rating === null || ctx.competitors.length === 0) {
        return unknownFinding("competitive.rating_percentile", CATEGORY, 3, "Insufficient rating data to compare against the competitive benchmark.");
      }
      const competitorAvg = average(ctx.competitors.map((c) => c.rating ?? NaN));
      if (competitorAvg === null) {
        return unknownFinding("competitive.rating_percentile", CATEGORY, 3, "Competitors returned no rating data to benchmark against.");
      }
      const diff = ctx.place.rating - competitorAvg;
      const ratio = Math.min(1, Math.max(0, 0.5 + diff / 2));
      return buildFinding({
        ruleId: "competitive.rating_percentile",
        category: CATEGORY,
        pointsAvailable: 3,
        pointsEarnedRatio: ratio,
        status: diff >= 0 ? "pass" : diff >= -0.3 ? "warning" : "fail",
        severity: diff >= 0 ? "informational" : "medium",
        explanation: `Business rating (${ctx.place.rating.toFixed(1)}) vs. competitive benchmark average (${competitorAvg.toFixed(1)}).`,
        recommendation: diff >= 0 ? undefined : "Prioritize review generation — the competitive benchmark rating average is higher.",
        evidence: { businessRating: ctx.place.rating, benchmarkAverage: competitorAvg },
        estimatedImpact: "high",
        estimatedEffort: "medium",
      });
    },
  },
  {
    id: "competitive.review_count_percentile",
    category: CATEGORY,
    evaluate: (ctx) => {
      if (!ctx.place || ctx.place.userRatingCount === null || ctx.competitors.length === 0) {
        return unknownFinding("competitive.review_count_percentile", CATEGORY, 3, "Insufficient review-count data to compare against the competitive benchmark.");
      }
      const competitorAvg = average(ctx.competitors.map((c) => c.userRatingCount ?? NaN));
      if (competitorAvg === null || competitorAvg === 0) {
        return unknownFinding("competitive.review_count_percentile", CATEGORY, 3, "Competitors returned no review-count data to benchmark against.");
      }
      const ratio = Math.min(1, ctx.place.userRatingCount / competitorAvg);
      return buildFinding({
        ruleId: "competitive.review_count_percentile",
        category: CATEGORY,
        pointsAvailable: 3,
        pointsEarnedRatio: ratio,
        status: ratio >= 1 ? "pass" : ratio >= 0.6 ? "warning" : "fail",
        severity: ratio >= 1 ? "informational" : "medium",
        explanation: `Business has ${ctx.place.userRatingCount} reviews vs. a competitive benchmark average of ${Math.round(competitorAvg)}.`,
        recommendation: ratio >= 1 ? undefined : "Close the review-volume gap with a consistent review request process.",
        evidence: { businessReviewCount: ctx.place.userRatingCount, benchmarkAverage: competitorAvg },
        estimatedImpact: "high",
        estimatedEffort: "medium",
      });
    },
  },
  {
    id: "competitive.service_coverage_percentile",
    category: CATEGORY,
    evaluate: (ctx) => {
      const competitorDomains = Object.keys(ctx.competitorPages);
      if (competitorDomains.length === 0) {
        return unknownFinding(
          "competitive.service_coverage_percentile",
          CATEGORY,
          2.5,
          "No competitor website crawl data available to compare service-page coverage."
        );
      }
      const businessCoverage = coveredServices(ctx.pages, ctx.template).length / Math.max(1, ctx.template.expectedServices.length);
      const competitorCoverages = competitorDomains.map(
        (domain) => coveredServices(ctx.competitorPages[domain], ctx.template).length / Math.max(1, ctx.template.expectedServices.length)
      );
      const competitorAvg = average(competitorCoverages) ?? 0;
      const ratio = competitorAvg === 0 ? 1 : Math.min(1, businessCoverage / competitorAvg);
      return buildFinding({
        ruleId: "competitive.service_coverage_percentile",
        category: CATEGORY,
        pointsAvailable: 2.5,
        pointsEarnedRatio: ratio,
        status: ratio >= 1 ? "pass" : ratio >= 0.6 ? "warning" : "fail",
        severity: ratio >= 1 ? "informational" : "medium",
        explanation: `Service-page coverage is ${Math.round(businessCoverage * 100)}% vs. a competitive benchmark average of ${Math.round(
          competitorAvg * 100
        )}%.`,
        recommendation: ratio >= 1 ? undefined : "Build out dedicated service pages to match or exceed the competitive benchmark's coverage.",
        confidence: 0.6,
        estimatedImpact: "medium",
        estimatedEffort: "medium",
      });
    },
  },
];
