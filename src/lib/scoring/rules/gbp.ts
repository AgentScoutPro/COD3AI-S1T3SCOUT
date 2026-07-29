import type { RuleContext, ScoringRule } from "../types";
import { buildFinding, unknownFinding } from "../helpers";
import { normalizePhone } from "@/lib/crawler/normalize";

const CATEGORY = "google_business_profile" as const;

// gbp.profile_found's explanation used to collapse every outcome into one
// generic "found" or "not found" message, regardless of how confidently it
// was matched. A fallback-only or name-only match is real signal but
// meaningfully weaker than a strict-query website match — worth saying so
// rather than presenting both with identical certainty.
function matchFoundExplanation(ctx: RuleContext): string {
  const { placeMatchMethod: method, placeMatchQueryPath: path } = ctx;

  if (method === "maps_link") {
    return "A Google Business Profile was confirmed via the Maps link provided at intake.";
  }
  if (method === "website" && path === "strict") {
    return "A matching Google Business Profile was found via Places API, confirmed by its listed website matching this business's domain.";
  }
  if (method === "website" && path === "fallback") {
    return "A matching Google Business Profile was found via a broader Places API search, confirmed by its listed website matching this business's domain.";
  }
  if (method === "name" && path === "strict") {
    return "A likely Google Business Profile match was found via Places API by business name — no website was listed on the profile to cross-check.";
  }
  if (method === "name" && path === "fallback") {
    return "A likely Google Business Profile match was found only via a broader search (the city was dropped from the query) and matched by name alone — confirm this is the correct listing.";
  }
  return "A matching Google Business Profile was found via Places API.";
}

function matchNotFoundExplanation(): string {
  // Reached only when ctx.placesConfigured is already true (the rule
  // returns early via unknownFinding otherwise) — a genuine no-match means
  // both the strict and broader fallback queries were tried.
  return "No matching Google Business Profile could be found via Places API, even after a broader fallback search.";
}

function matchConfidence(ctx: RuleContext): number {
  if (ctx.placeMatchMethod === "website" || ctx.placeMatchMethod === "maps_link") return 0.9;
  if (ctx.placeMatchMethod === "name" && ctx.placeMatchQueryPath === "strict") return 0.7;
  if (ctx.placeMatchMethod === "name" && ctx.placeMatchQueryPath === "fallback") return 0.5;
  return 0.9;
}

export const gbpRules: ScoringRule[] = [
  {
    id: "gbp.profile_found",
    category: CATEGORY,
    evaluate: (ctx) => {
      if (!ctx.placesConfigured) {
        return unknownFinding(
          "gbp.profile_found",
          CATEGORY,
          5,
          "Google Places lookup is not configured — Google Business Profile presence is unknown."
        );
      }
      const pass = Boolean(ctx.place);
      return buildFinding({
        ruleId: "gbp.profile_found",
        category: CATEGORY,
        pointsAvailable: 5,
        pointsEarnedRatio: pass ? 1 : 0,
        status: pass ? "pass" : "fail",
        severity: pass ? "informational" : "critical",
        explanation: pass ? matchFoundExplanation(ctx) : matchNotFoundExplanation(),
        recommendation: pass ? undefined : "Claim and verify a Google Business Profile for this location.",
        estimatedImpact: "high",
        estimatedEffort: "low",
        confidence: pass ? matchConfidence(ctx) : 0.9,
      });
    },
  },
  {
    id: "gbp.business_status",
    category: CATEGORY,
    evaluate: (ctx) => {
      if (!ctx.place) {
        return unknownFinding("gbp.business_status", CATEGORY, 2, "No Google Business Profile match to evaluate status.");
      }
      const pass = ctx.place.businessStatus === "OPERATIONAL";
      return buildFinding({
        ruleId: "gbp.business_status",
        category: CATEGORY,
        pointsAvailable: 2,
        pointsEarnedRatio: pass ? 1 : 0,
        status: pass ? "pass" : "fail",
        severity: pass ? "informational" : "critical",
        explanation: `Google lists this business status as ${ctx.place.businessStatus}.`,
        recommendation: pass ? undefined : "Verify the listing is marked Operational in Google Business Profile.",
        estimatedImpact: "high",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "gbp.rating_threshold",
    category: CATEGORY,
    evaluate: (ctx) => {
      if (!ctx.place || ctx.place.rating === null) {
        return unknownFinding("gbp.rating_threshold", CATEGORY, 3, "No rating data available from Google Business Profile.");
      }
      const rating = ctx.place.rating;
      const ratio = Math.min(1, rating / 4.5);
      return buildFinding({
        ruleId: "gbp.rating_threshold",
        category: CATEGORY,
        pointsAvailable: 3,
        pointsEarnedRatio: ratio,
        status: rating >= 4.3 ? "pass" : rating >= 3.8 ? "warning" : "fail",
        severity: rating >= 4.3 ? "informational" : rating >= 3.8 ? "medium" : "high",
        explanation: `Average Google rating is ${rating.toFixed(1)}/5.`,
        recommendation: rating >= 4.3 ? undefined : "Run a review-generation campaign to improve average rating.",
        estimatedImpact: "high",
        estimatedEffort: "medium",
      });
    },
  },
  {
    id: "gbp.review_count_threshold",
    category: CATEGORY,
    evaluate: (ctx) => {
      if (!ctx.place || ctx.place.userRatingCount === null) {
        return unknownFinding("gbp.review_count_threshold", CATEGORY, 3, "No review count data available.");
      }
      const count = ctx.place.userRatingCount;
      const ratio = Math.min(1, count / 75);
      return buildFinding({
        ruleId: "gbp.review_count_threshold",
        category: CATEGORY,
        pointsAvailable: 3,
        pointsEarnedRatio: ratio,
        status: count >= 75 ? "pass" : count >= 25 ? "warning" : "fail",
        severity: count >= 75 ? "informational" : count >= 25 ? "medium" : "high",
        explanation: `Google Business Profile has ${count} reviews.`,
        recommendation: count >= 75 ? undefined : "Systematically request reviews from recent customers.",
        estimatedImpact: "high",
        estimatedEffort: "medium",
      });
    },
  },
  {
    id: "gbp.hours_listed",
    category: CATEGORY,
    evaluate: (ctx) => {
      if (!ctx.place) return unknownFinding("gbp.hours_listed", CATEGORY, 2, "No Google Business Profile match to evaluate hours.");
      const pass = ctx.place.openingHours.length > 0;
      return buildFinding({
        ruleId: "gbp.hours_listed",
        category: CATEGORY,
        pointsAvailable: 2,
        pointsEarnedRatio: pass ? 1 : 0,
        status: pass ? "pass" : "warning",
        severity: pass ? "informational" : "medium",
        explanation: pass ? "Business hours are listed on the Google Business Profile." : "No business hours are listed.",
        recommendation: pass ? undefined : "Add complete business hours to the Google Business Profile.",
        estimatedImpact: "medium",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "gbp.website_linked",
    category: CATEGORY,
    evaluate: (ctx) => {
      if (!ctx.place) return unknownFinding("gbp.website_linked", CATEGORY, 3, "No Google Business Profile match to evaluate website link.");
      const pass = Boolean(ctx.place.websiteUri);
      return buildFinding({
        ruleId: "gbp.website_linked",
        category: CATEGORY,
        pointsAvailable: 3,
        pointsEarnedRatio: pass ? 1 : 0,
        status: pass ? "pass" : "fail",
        severity: pass ? "informational" : "high",
        explanation: pass
          ? "Google Business Profile links to the business website."
          : "Google Business Profile has no website link.",
        recommendation: pass ? undefined : "Add the website URL to the Google Business Profile listing.",
        estimatedImpact: "high",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "gbp.phone_matches_site",
    category: CATEGORY,
    evaluate: (ctx) => {
      if (!ctx.place || !ctx.place.phone) {
        return unknownFinding("gbp.phone_matches_site", CATEGORY, 2, "No phone number available from Google Business Profile to compare.");
      }
      const gbpPhone = normalizePhone(ctx.place.phone);
      const siteText = (ctx.homepage?.signals?.bodyTextSample as string) ?? "";
      const phoneOnSite = normalizePhone(siteText.match(/[\d()+.\-\s]{7,}/)?.[0]);
      const pass = Boolean(gbpPhone && phoneOnSite && gbpPhone === phoneOnSite);
      return buildFinding({
        ruleId: "gbp.phone_matches_site",
        category: CATEGORY,
        pointsAvailable: 2,
        pointsEarnedRatio: pass ? 1 : 0.3,
        status: pass ? "pass" : "warning",
        severity: pass ? "informational" : "medium",
        explanation: pass
          ? "The phone number on Google Business Profile matches the website."
          : "Could not confirm the Google Business Profile phone number matches the website homepage text.",
        recommendation: pass ? undefined : "Ensure the phone number on the website matches Google Business Profile exactly (NAP consistency).",
        confidence: 0.6,
        estimatedImpact: "medium",
        estimatedEffort: "low",
      });
    },
  },
];
