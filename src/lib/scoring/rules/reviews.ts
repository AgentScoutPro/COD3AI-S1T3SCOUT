import type { ScoringRule } from "../types";
import { buildFinding, unknownFinding } from "../helpers";

const CATEGORY = "reviews_reputation" as const;
const RECENT_HINTS = ["day", "days", "week", "weeks", "month", "a month"];

export const reviewsRules: ScoringRule[] = [
  {
    id: "reviews.sample_available",
    category: CATEGORY,
    evaluate: (ctx) => {
      if (!ctx.placesConfigured) {
        return unknownFinding("reviews.sample_available", CATEGORY, 3, "Google Places is not configured — review sample is unavailable.");
      }
      const count = ctx.place?.reviews.length ?? 0;
      const pass = count > 0;
      return buildFinding({
        ruleId: "reviews.sample_available",
        category: CATEGORY,
        pointsAvailable: 3,
        pointsEarnedRatio: pass ? 1 : 0,
        status: pass ? "pass" : "fail",
        severity: pass ? "informational" : "high",
        explanation: pass
          ? `${count} review(s) available via the public API sample (Google caps public review samples at 5 — this is not the full review history).`
          : "No reviews are visible via the public Places API sample.",
        recommendation: pass ? undefined : "Encourage recent customers to leave a Google review.",
        evidence: { sampleSize: count, cappedByApi: true },
        estimatedImpact: "high",
        estimatedEffort: "medium",
      });
    },
  },
  {
    id: "reviews.recency",
    category: CATEGORY,
    evaluate: (ctx) => {
      if (!ctx.place || ctx.place.reviews.length === 0) {
        return unknownFinding("reviews.recency", CATEGORY, 3, "No review sample available to assess recency.");
      }
      const recentCount = ctx.place.reviews.filter((r) =>
        RECENT_HINTS.some((hint) => r.relativeTime.toLowerCase().includes(hint))
      ).length;
      const ratio = recentCount / ctx.place.reviews.length;
      return buildFinding({
        ruleId: "reviews.recency",
        category: CATEGORY,
        pointsAvailable: 3,
        pointsEarnedRatio: ratio,
        status: ratio >= 0.5 ? "pass" : ratio > 0 ? "warning" : "fail",
        severity: ratio >= 0.5 ? "informational" : "medium",
        explanation: `${recentCount}/${ctx.place.reviews.length} reviews in the public sample were left within the last few weeks/months.`,
        recommendation: ratio >= 0.5 ? undefined : "Build a consistent process for requesting reviews after every completed job.",
        confidence: 0.5,
        estimatedImpact: "medium",
        estimatedEffort: "medium",
      });
    },
  },
  {
    id: "reviews.rating_consistency",
    category: CATEGORY,
    evaluate: (ctx) => {
      if (!ctx.place || ctx.place.reviews.length < 2) {
        return unknownFinding("reviews.rating_consistency", CATEGORY, 2, "Not enough reviews in the sample to assess rating consistency.");
      }
      const ratings = ctx.place.reviews.map((r) => r.rating);
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const lowRatingShare = ratings.filter((r) => r <= 2).length / ratings.length;
      const ratio = Math.max(0, 1 - lowRatingShare * 1.5);
      return buildFinding({
        ruleId: "reviews.rating_consistency",
        category: CATEGORY,
        pointsAvailable: 2,
        pointsEarnedRatio: ratio,
        status: lowRatingShare === 0 ? "pass" : lowRatingShare <= 0.2 ? "warning" : "fail",
        severity: lowRatingShare === 0 ? "informational" : "medium",
        explanation: `The visible review sample averages ${avg.toFixed(1)}/5 with ${Math.round(lowRatingShare * 100)}% at 2 stars or below.`,
        recommendation: lowRatingShare === 0 ? undefined : "Review recent low-rated feedback for a recurring service issue and respond publicly.",
        confidence: 0.5,
        estimatedImpact: "medium",
        estimatedEffort: "medium",
      });
    },
  },
  {
    id: "reviews.owner_response_evidence",
    category: CATEGORY,
    evaluate: () =>
      unknownFinding(
        "reviews.owner_response_evidence",
        CATEGORY,
        2,
        "Owner responses to reviews are not exposed by the current Places API field mask — this signal is out of scope for the public MVP."
      ),
  },
  {
    id: "reviews.on_site_social_proof",
    category: CATEGORY,
    evaluate: (ctx) => {
      const text = ctx.pages
        .map((p) => `${p.title ?? ""} ${(p.signals?.bodyTextSample as string) ?? ""}`)
        .join(" ")
        .toLowerCase();
      const hasReviewSchema = ctx.pages.some((p) => p.schemaTypes.some((t) => /Review|AggregateRating/i.test(t)));
      const hasTestimonialCopy = /(testimonial|review|5-star|five star|what our customers say)/i.test(text);
      const pass = hasReviewSchema || hasTestimonialCopy;
      return buildFinding({
        ruleId: "reviews.on_site_social_proof",
        category: CATEGORY,
        pointsAvailable: 2,
        pointsEarnedRatio: hasReviewSchema ? 1 : hasTestimonialCopy ? 0.6 : 0,
        status: pass ? "pass" : "warning",
        severity: pass ? "informational" : "low",
        explanation: pass
          ? "The website surfaces reviews or testimonials on-page."
          : "No testimonials, reviews, or review schema were found on the crawled pages.",
        recommendation: pass ? undefined : "Add a testimonials section and AggregateRating/Review schema to the site.",
        confidence: 0.6,
        estimatedImpact: "medium",
        estimatedEffort: "low",
      });
    },
  },
];
