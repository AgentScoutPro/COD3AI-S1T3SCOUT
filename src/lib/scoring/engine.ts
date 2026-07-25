import {
  CATEGORY_ORDER,
  CATEGORY_WEIGHTS,
  SCORING_VERSION,
  type CategoryScoreResult,
  type RuleContext,
  type RuleFinding,
  type ScoringResult,
} from "./types";
import { technicalRules } from "./rules/technical";
import { gbpRules } from "./rules/gbp";
import { serviceLocationRules } from "./rules/service-location";
import { contentRules } from "./rules/content";
import { reviewsRules } from "./rules/reviews";
import { citationsRules } from "./rules/citations";
import { competitiveRules } from "./rules/competitive";
import { conversionRules } from "./rules/conversion";

const ALL_RULES = [
  ...technicalRules,
  ...gbpRules,
  ...serviceLocationRules,
  ...contentRules,
  ...reviewsRules,
  ...citationsRules,
  ...competitiveRules,
  ...conversionRules,
];

export function runScoringEngine(ctx: RuleContext): ScoringResult {
  const findings: RuleFinding[] = ALL_RULES.map((rule) => rule.evaluate(ctx));

  const categories: CategoryScoreResult[] = CATEGORY_ORDER.map((category) => {
    const categoryFindings = findings.filter((f) => f.category === category);
    const applicable = categoryFindings.filter((f) => f.status !== "unknown");

    const availablePoints = round2(applicable.reduce((sum, f) => sum + f.pointsAvailable, 0));
    const earnedPoints = round2(applicable.reduce((sum, f) => sum + f.pointsEarned, 0));
    const categoryPercentage = availablePoints > 0 ? round2((earnedPoints / availablePoints) * 100) : 0;
    const weight = CATEGORY_WEIGHTS[category];
    const weightedScore = round2((categoryPercentage / 100) * weight);

    const totalRules = categoryFindings.length;
    const confidence =
      totalRules > 0 ? round2((applicable.length / totalRules) * 100) : 100;

    return {
      category,
      weight,
      earnedPoints,
      availablePoints,
      categoryPercentage,
      weightedScore,
      confidence,
    };
  });

  const overallScore = round2(categories.reduce((sum, c) => sum + c.weightedScore, 0));

  // Overall confidence is the points-weighted average of category
  // confidence, so categories worth more of the score matter more here too.
  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0);
  const confidenceScore =
    totalWeight > 0
      ? round2(categories.reduce((sum, c) => sum + c.confidence * c.weight, 0) / totalWeight)
      : 0;

  return {
    scoringVersion: SCORING_VERSION,
    overallScore,
    confidenceScore,
    categories,
    findings,
  };
}

export function scoreClassification(overallScore: number): {
  band: string;
  label: string;
} {
  if (overallScore < 40) return { band: "critical", label: "Critical" };
  if (overallScore < 60) return { band: "weak", label: "Weak" };
  if (overallScore < 75) return { band: "competitive_inconsistent", label: "Competitive but Inconsistent" };
  if (overallScore < 90) return { band: "strong", label: "Strong" };
  return { band: "authority_ready", label: "Authority-Ready" };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
