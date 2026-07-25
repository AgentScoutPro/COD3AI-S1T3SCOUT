import type { AiReportInput } from "../types";
import type { AiReportOutput, Opportunity } from "@/lib/validation/report";
import { CATEGORY_WEIGHTS } from "@/lib/scoring/types";
import { CATEGORY_LABELS } from "@/lib/scoring/labels";

/** Deterministic, template-based report used when AI generation is
 * unavailable or fails, so an audit never dead-ends without a report. */
export function generateTemplateReport(input: AiReportInput): AiReportOutput {
  const { business, scoring, findings, dataLimitations } = input;

  const sortedCategories = [...scoring.categories].sort((a, b) => a.categoryPercentage - b.categoryPercentage);
  const weakest = sortedCategories.slice(0, 3);
  const strongest = [...scoring.categories]
    .sort((a, b) => b.categoryPercentage - a.categoryPercentage)
    .slice(0, 3)
    .map((c) => CATEGORY_LABELS[c.category] ?? c.category);

  const failingFindings = findings
    .filter((f) => f.status === "fail" || f.status === "warning")
    .sort((a, b) => (b.points_available - b.points_earned) - (a.points_available - a.points_earned))
    .slice(0, 5);

  const topOpportunities: Opportunity[] = failingFindings.map((f, i) => ({
    priority: (i < 2 ? "high" : i < 4 ? "medium" : "low") as "high" | "medium" | "low",
    title: f.explanation.split(".")[0].slice(0, 90),
    problem: f.explanation,
    whyItMatters: `This affects the ${CATEGORY_LABELS[f.category] ?? f.category} category, worth ${
      CATEGORY_WEIGHTS[f.category as keyof typeof CATEGORY_WEIGHTS] ?? 0
    } points of the overall score.`,
    recommendedAction: f.recommendation ?? "Review this finding with your web team.",
    expectedImpact: (f.points_available - f.points_earned > 5 ? "high" : "medium") as "high" | "medium" | "low",
    effort: "medium" as const,
    evidenceFindingIds: [f.rule_id],
  }));

  if (topOpportunities.length === 0) {
    topOpportunities.push({
      priority: "low",
      title: "Maintain current local SEO performance",
      problem: "No critical or high-severity gaps were found in this audit.",
      whyItMatters: "Sustained performance still requires ongoing monitoring as competitors improve.",
      recommendedAction: "Continue monitoring rankings, reviews, and technical health monthly.",
      expectedImpact: "low",
      effort: "low",
      evidenceFindingIds: [],
    });
  }

  const planItem = (f: (typeof failingFindings)[number]) => ({
    title: f.explanation.split(".")[0].slice(0, 90),
    description: f.recommendation ?? "Address this finding to improve local visibility.",
    category: CATEGORY_LABELS[f.category] ?? f.category,
    effort: "medium" as const,
    relatedFindingIds: [f.rule_id],
  });

  return {
    executiveSummary:
      `${business.name} scored ${scoring.overallScore}/100 for local search authority in ${business.city}, ${business.state}. ` +
      `The strongest area is ${strongest[0] ?? "technical foundation"}; the biggest opportunity is ${
        CATEGORY_LABELS[weakest[0]?.category] ?? "service page coverage"
      }.`,
    scoreExplanation:
      `The overall score is a weighted average across eight categories (Google Business Profile, technical foundation, ` +
      `service/location architecture, local content, reviews, citations, competitive visibility, and conversion measurement). ` +
      `Categories with unavailable data were excluded from their denominator rather than scored as zero, which lowers the ` +
      `confidence score (currently ${scoring.confidenceScore}%) instead of penalizing the business unfairly.`,
    strongestAreas: strongest,
    topOpportunities,
    thirtyDayPlan: failingFindings.slice(0, 2).map(planItem),
    sixtyDayPlan: failingFindings.slice(2, 4).map(planItem),
    ninetyDayPlan: failingFindings.slice(4, 5).map(planItem),
    internalActions: ["Confirm phone/email captured in intake match Google Business Profile listing before outreach."],
    cod3aiOpportunities: [
      { service: "local_seo", rationale: "Deterministic findings show unaddressed local SEO gaps this audit surfaced." },
      { service: "website", rationale: "Technical and content findings indicate the site itself needs updates." },
    ],
    limitations: dataLimitations,
  };
}
