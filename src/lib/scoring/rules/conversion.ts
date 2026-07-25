import type { ScoringRule } from "../types";
import { buildFinding } from "../helpers";

const CATEGORY = "conversion_measurement" as const;

function ratio(pages: { hasClickToCall?: boolean }[], key: "hasClickToCall"): number {
  if (pages.length === 0) return 0;
  return pages.filter((p) => p[key]).length / pages.length;
}

export const conversionRules: ScoringRule[] = [
  {
    id: "conversion.click_to_call",
    category: CATEGORY,
    evaluate: (ctx) => {
      const r = ratio(ctx.pages, "hasClickToCall");
      return buildFinding({
        ruleId: "conversion.click_to_call",
        category: CATEGORY,
        pointsAvailable: 1.5,
        pointsEarnedRatio: r,
        status: r >= 0.7 ? "pass" : r > 0 ? "warning" : "fail",
        severity: r >= 0.7 ? "informational" : "high",
        explanation: `${Math.round(r * 100)}% of crawled pages have a tap-to-call phone link.`,
        recommendation: r >= 0.7 ? undefined : "Add click-to-call (tel:) links to the header and every service page.",
        estimatedImpact: "high",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "conversion.booking_form",
    category: CATEGORY,
    evaluate: (ctx) => {
      const pass = ctx.pages.some((p) => p.hasBookingForm);
      return buildFinding({
        ruleId: "conversion.booking_form",
        category: CATEGORY,
        pointsAvailable: 1.5,
        pointsEarnedRatio: pass ? 1 : 0,
        status: pass ? "pass" : "fail",
        severity: pass ? "informational" : "high",
        explanation: pass
          ? "A booking, estimate, or scheduling form was found on the site."
          : "No booking, estimate, or scheduling form was found on the site.",
        recommendation: pass ? undefined : "Add an online booking/estimate request form to reduce friction for mobile visitors.",
        estimatedImpact: "high",
        estimatedEffort: "medium",
      });
    },
  },
  {
    id: "conversion.mobile_cta_visibility",
    category: CATEGORY,
    evaluate: (ctx) => {
      const homepage = ctx.homepage;
      const pass = Boolean(homepage?.hasClickToCall) && Boolean(homepage?.hasViewportMeta);
      return buildFinding({
        ruleId: "conversion.mobile_cta_visibility",
        category: CATEGORY,
        pointsAvailable: 1,
        pointsEarnedRatio: pass ? 1 : homepage?.hasClickToCall || homepage?.hasViewportMeta ? 0.5 : 0,
        status: pass ? "pass" : "warning",
        severity: pass ? "informational" : "medium",
        explanation: pass
          ? "The homepage combines a mobile-responsive layout with a tap-to-call CTA."
          : "The homepage is missing either a responsive layout or a clear mobile call-to-action.",
        recommendation: pass ? undefined : "Ensure the homepage's primary CTA (call or book) is immediately visible on mobile without scrolling.",
        confidence: 0.6,
        estimatedImpact: "medium",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "conversion.analytics_tag_manager",
    category: CATEGORY,
    evaluate: (ctx) => {
      const pass = ctx.pages.some((p) => p.hasAnalytics);
      return buildFinding({
        ruleId: "conversion.analytics_tag_manager",
        category: CATEGORY,
        pointsAvailable: 1,
        pointsEarnedRatio: pass ? 1 : 0,
        status: pass ? "pass" : "fail",
        severity: pass ? "informational" : "medium",
        explanation: pass
          ? "Analytics or tag-manager code was detected on the site."
          : "No analytics or tag-manager code (GA4, GTM, etc.) was detected.",
        recommendation: pass ? undefined : "Install Google Tag Manager and GA4 so conversions can actually be measured.",
        estimatedImpact: "medium",
        estimatedEffort: "low",
      });
    },
  },
];
