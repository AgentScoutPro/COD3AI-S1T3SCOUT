import type { ScoringRule } from "../types";
import { buildFinding } from "../helpers";
import { classifyPage, coveredServices } from "@/lib/crawler/classify";

const CATEGORY = "service_location_architecture" as const;

export const serviceLocationRules: ScoringRule[] = [
  {
    id: "svcloc.service_page_coverage",
    category: CATEGORY,
    evaluate: (ctx) => {
      const covered = coveredServices(ctx.pages, ctx.template);
      const ratio = ctx.template.expectedServices.length > 0 ? covered.length / ctx.template.expectedServices.length : 0;
      return buildFinding({
        ruleId: "svcloc.service_page_coverage",
        category: CATEGORY,
        pointsAvailable: 4,
        pointsEarnedRatio: ratio,
        status: ratio >= 0.8 ? "pass" : ratio > 0 ? "warning" : "fail",
        severity: ratio >= 0.8 ? "informational" : "high",
        explanation: `${covered.length}/${ctx.template.expectedServices.length} expected ${ctx.template.label} services have a dedicated page.`,
        recommendation:
          ratio >= 0.8
            ? undefined
            : `Create dedicated pages for: ${ctx.template.expectedServices.filter((s) => !covered.includes(s)).slice(0, 5).join(", ")}.`,
        evidence: { covered, missing: ctx.template.expectedServices.filter((s) => !covered.includes(s)) },
        estimatedImpact: "high",
        estimatedEffort: "medium",
      });
    },
  },
  {
    id: "svcloc.location_page_presence",
    category: CATEGORY,
    evaluate: (ctx) => {
      const locationPages = ctx.pages.filter(
        (p, i) => classifyPage(p, i === 0 && p === ctx.homepage, ctx.template) === "location"
      );
      const pass = locationPages.length > 0;
      return buildFinding({
        ruleId: "svcloc.location_page_presence",
        category: CATEGORY,
        pointsAvailable: 2,
        pointsEarnedRatio: pass ? 1 : 0,
        status: pass ? "pass" : "warning",
        severity: pass ? "informational" : "medium",
        explanation: pass
          ? `Found ${locationPages.length} page(s) referencing service-area/location content.`
          : "No dedicated location or service-area pages were found.",
        recommendation: pass ? undefined : "Add a page describing the specific cities/areas served.",
        sourceUrls: locationPages.map((p) => p.url),
        estimatedImpact: "medium",
        estimatedEffort: "medium",
      });
    },
  },
  {
    id: "svcloc.internal_linking",
    category: CATEGORY,
    evaluate: (ctx) => {
      if (ctx.pages.length === 0) {
        return buildFinding({
          ruleId: "svcloc.internal_linking",
          category: CATEGORY,
          pointsAvailable: 2,
          pointsEarnedRatio: 0,
          status: "fail",
          severity: "medium",
          explanation: "No pages were crawled to evaluate internal linking.",
        });
      }
      const avgLinks = ctx.pages.reduce((sum, p) => sum + p.internalLinks, 0) / ctx.pages.length;
      const ratio = Math.min(1, avgLinks / 8);
      return buildFinding({
        ruleId: "svcloc.internal_linking",
        category: CATEGORY,
        pointsAvailable: 2,
        pointsEarnedRatio: ratio,
        status: avgLinks >= 8 ? "pass" : avgLinks >= 3 ? "warning" : "fail",
        severity: avgLinks >= 8 ? "informational" : "medium",
        explanation: `Pages average ${avgLinks.toFixed(1)} internal links, which affects how well service/location pages are discovered.`,
        recommendation: avgLinks >= 8 ? undefined : "Add navigation and in-content links between service and location pages.",
        estimatedImpact: "medium",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "svcloc.emergency_page",
    category: CATEGORY,
    evaluate: (ctx) => {
      if (!ctx.template.emergencyServiceExpected) {
        return buildFinding({
          ruleId: "svcloc.emergency_page",
          category: CATEGORY,
          pointsAvailable: 0,
          pointsEarnedRatio: 0,
          status: "pass",
          severity: "informational",
          explanation: `Emergency-service pages are not a typical expectation for ${ctx.template.label}.`,
        });
      }
      const hasEmergency = ctx.pages.some((p) =>
        ctx.template.keywordSignals.emergency.some((k) =>
          `${p.url} ${p.title ?? ""} ${p.h1 ?? ""}`.toLowerCase().includes(k)
        )
      );
      return buildFinding({
        ruleId: "svcloc.emergency_page",
        category: CATEGORY,
        pointsAvailable: 2,
        pointsEarnedRatio: hasEmergency ? 1 : 0,
        status: hasEmergency ? "pass" : "warning",
        severity: hasEmergency ? "informational" : "medium",
        explanation: hasEmergency
          ? "Emergency/24-7 service messaging is present on the site."
          : `${ctx.template.label} customers commonly expect emergency service, but no page communicates it.`,
        recommendation: hasEmergency ? undefined : "Add a page or homepage section describing emergency service availability.",
        estimatedImpact: "medium",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "svcloc.financing_page",
    category: CATEGORY,
    evaluate: (ctx) => {
      if (!ctx.template.financingRelevant) {
        return buildFinding({
          ruleId: "svcloc.financing_page",
          category: CATEGORY,
          pointsAvailable: 0,
          pointsEarnedRatio: 0,
          status: "pass",
          severity: "informational",
          explanation: `Financing pages are not a typical expectation for ${ctx.template.label}.`,
        });
      }
      const hasFinancing = ctx.pages.some((p) =>
        ctx.template.keywordSignals.financing.some((k) =>
          `${p.url} ${p.title ?? ""} ${p.h1 ?? ""}`.toLowerCase().includes(k)
        )
      );
      return buildFinding({
        ruleId: "svcloc.financing_page",
        category: CATEGORY,
        pointsAvailable: 1.5,
        pointsEarnedRatio: hasFinancing ? 1 : 0,
        status: hasFinancing ? "pass" : "warning",
        severity: hasFinancing ? "informational" : "low",
        explanation: hasFinancing ? "Financing options are communicated on the site." : "No financing information was found.",
        recommendation: hasFinancing ? undefined : "Add a financing page or section describing payment options.",
        estimatedImpact: "medium",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "svcloc.maintenance_plan_page",
    category: CATEGORY,
    evaluate: (ctx) => {
      if (!ctx.template.maintenancePlanRelevant) {
        return buildFinding({
          ruleId: "svcloc.maintenance_plan_page",
          category: CATEGORY,
          pointsAvailable: 0,
          pointsEarnedRatio: 0,
          status: "pass",
          severity: "informational",
          explanation: `Maintenance-plan pages are not a typical expectation for ${ctx.template.label}.`,
        });
      }
      const hasPlan = ctx.pages.some((p) =>
        ctx.template.keywordSignals.maintenancePlan.some((k) =>
          `${p.url} ${p.title ?? ""} ${p.h1 ?? ""}`.toLowerCase().includes(k)
        )
      );
      return buildFinding({
        ruleId: "svcloc.maintenance_plan_page",
        category: CATEGORY,
        pointsAvailable: 1.5,
        pointsEarnedRatio: hasPlan ? 1 : 0,
        status: hasPlan ? "pass" : "warning",
        severity: hasPlan ? "informational" : "low",
        explanation: hasPlan ? "A maintenance plan or membership program is communicated on the site." : "No maintenance plan or membership program was found.",
        recommendation: hasPlan ? undefined : "Add a maintenance-plan or membership page to drive recurring revenue.",
        estimatedImpact: "medium",
        estimatedEffort: "medium",
      });
    },
  },
  {
    id: "svcloc.doorway_page_risk",
    category: CATEGORY,
    evaluate: (ctx) => {
      const locationPages = ctx.pages.filter(
        (p, i) => classifyPage(p, i === 0 && p === ctx.homepage, ctx.template) === "location"
      );
      if (locationPages.length < 2) {
        return buildFinding({
          ruleId: "svcloc.doorway_page_risk",
          category: CATEGORY,
          pointsAvailable: 1.5,
          pointsEarnedRatio: 1,
          status: "pass",
          severity: "informational",
          explanation: "Not enough location pages exist yet to assess doorway/duplicate-content risk.",
        });
      }
      const wordCounts = locationPages.map((p) => p.wordCount);
      const avg = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
      const variance = wordCounts.reduce((sum, w) => sum + (w - avg) ** 2, 0) / wordCounts.length;
      const lowVariance = Math.sqrt(variance) < avg * 0.15;
      const risky = lowVariance && avg < 250;
      return buildFinding({
        ruleId: "svcloc.doorway_page_risk",
        category: CATEGORY,
        pointsAvailable: 1.5,
        pointsEarnedRatio: risky ? 0 : 1,
        status: risky ? "warning" : "pass",
        severity: risky ? "high" : "informational",
        explanation: risky
          ? `${locationPages.length} location pages have very similar, thin word counts (avg ${Math.round(avg)}), a doorway/duplicate-content risk pattern.`
          : `${locationPages.length} location pages show sufficient content variation.`,
        recommendation: risky ? "Rewrite each location page with unique, substantive local content instead of a templated swap." : undefined,
        confidence: 0.6,
        estimatedImpact: "high",
        estimatedEffort: "high",
      });
    },
  },
];
