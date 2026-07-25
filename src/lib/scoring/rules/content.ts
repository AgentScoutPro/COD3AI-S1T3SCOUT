import type { ScoringRule } from "../types";
import { buildFinding } from "../helpers";

const CATEGORY = "local_content_relevance" as const;

export const contentRules: ScoringRule[] = [
  {
    id: "content.word_count_sufficiency",
    category: CATEGORY,
    evaluate: (ctx) => {
      const homepage = ctx.homepage;
      const wordCount = homepage?.wordCount ?? 0;
      const ratio = Math.min(1, wordCount / 400);
      return buildFinding({
        ruleId: "content.word_count_sufficiency",
        category: CATEGORY,
        pointsAvailable: 2.5,
        pointsEarnedRatio: ratio,
        status: wordCount >= 400 ? "pass" : wordCount >= 150 ? "warning" : "fail",
        severity: wordCount >= 400 ? "informational" : "medium",
        explanation: `Homepage has approximately ${wordCount} words of content.`,
        recommendation: wordCount >= 400 ? undefined : "Expand homepage content to substantively describe services, service area, and value proposition.",
        sourceUrls: homepage ? [homepage.url] : [],
        estimatedImpact: "medium",
        estimatedEffort: "medium",
      });
    },
  },
  {
    id: "content.city_state_mentions",
    category: CATEGORY,
    evaluate: (ctx) => {
      const text = ((ctx.homepage?.signals?.bodyTextSample as string) ?? "").toLowerCase();
      const mentionsCity = text.includes(ctx.business.city.toLowerCase());
      const mentionsState = text.includes(ctx.business.state.toLowerCase());
      const ratio = (mentionsCity ? 0.7 : 0) + (mentionsState ? 0.3 : 0);
      return buildFinding({
        ruleId: "content.city_state_mentions",
        category: CATEGORY,
        pointsAvailable: 2,
        pointsEarnedRatio: ratio,
        status: ratio >= 0.7 ? "pass" : ratio > 0 ? "warning" : "fail",
        severity: ratio >= 0.7 ? "informational" : "medium",
        explanation: mentionsCity
          ? "Homepage content mentions the primary service city."
          : "Homepage content does not clearly mention the primary service city.",
        recommendation: ratio >= 0.7 ? undefined : `Mention "${ctx.business.city}, ${ctx.business.state}" explicitly in homepage copy.`,
        confidence: 0.7,
        estimatedImpact: "medium",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "content.service_keyword_relevance",
    category: CATEGORY,
    evaluate: (ctx) => {
      const text = ((ctx.homepage?.signals?.bodyTextSample as string) ?? "").toLowerCase();
      const matches = ctx.template.keywordSignals.service.filter((k) => text.includes(k));
      const ratio = Math.min(1, matches.length / 3);
      return buildFinding({
        ruleId: "content.service_keyword_relevance",
        category: CATEGORY,
        pointsAvailable: 2,
        pointsEarnedRatio: ratio,
        status: matches.length >= 3 ? "pass" : matches.length > 0 ? "warning" : "fail",
        severity: matches.length >= 3 ? "informational" : "medium",
        explanation: `Homepage mentions ${matches.length} core ${ctx.template.label} service keyword(s).`,
        recommendation: matches.length >= 3 ? undefined : "Mention core services by name on the homepage, not just generic marketing copy.",
        confidence: 0.6,
        estimatedImpact: "medium",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "content.trust_signal_copy",
    category: CATEGORY,
    evaluate: (ctx) => {
      const text = ctx.pages
        .map((p) => (p.signals?.bodyTextSample as string) ?? "")
        .join(" ")
        .toLowerCase();
      const matches = ctx.template.trustSignals.filter((s) =>
        s
          .toLowerCase()
          .split(" ")
          .some((word) => word.length > 3 && text.includes(word))
      );
      const ratio = Math.min(1, matches.length / 2);
      return buildFinding({
        ruleId: "content.trust_signal_copy",
        category: CATEGORY,
        pointsAvailable: 2,
        pointsEarnedRatio: ratio,
        status: matches.length >= 2 ? "pass" : matches.length > 0 ? "warning" : "fail",
        severity: matches.length >= 2 ? "informational" : "medium",
        explanation: `Site copy references ${matches.length} trust/certification signal(s) typical for ${ctx.template.label}.`,
        recommendation:
          matches.length >= 2 ? undefined : `Highlight credentials such as: ${ctx.template.trustSignals.slice(0, 3).join(", ")}.`,
        confidence: 0.5,
        estimatedImpact: "medium",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "content.meta_description_uniqueness",
    category: CATEGORY,
    evaluate: (ctx) => {
      const descriptions = ctx.pages.map((p) => p.metaDescription).filter((d): d is string => Boolean(d));
      if (descriptions.length < 2) {
        return buildFinding({
          ruleId: "content.meta_description_uniqueness",
          category: CATEGORY,
          pointsAvailable: 1.5,
          pointsEarnedRatio: 1,
          status: "pass",
          severity: "informational",
          explanation: "Not enough pages with meta descriptions to assess duplication.",
        });
      }
      const unique = new Set(descriptions).size;
      const ratio = unique / descriptions.length;
      return buildFinding({
        ruleId: "content.meta_description_uniqueness",
        category: CATEGORY,
        pointsAvailable: 1.5,
        pointsEarnedRatio: ratio,
        status: ratio >= 0.9 ? "pass" : ratio >= 0.6 ? "warning" : "fail",
        severity: ratio >= 0.9 ? "informational" : "medium",
        explanation: `${unique}/${descriptions.length} meta descriptions are unique.`,
        recommendation: ratio >= 0.9 ? undefined : "Write unique meta descriptions per page instead of reusing boilerplate.",
        estimatedImpact: "low",
        estimatedEffort: "low",
      });
    },
  },
];
