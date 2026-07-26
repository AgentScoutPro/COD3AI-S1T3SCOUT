// Validates the AI narrative layer's output against the structured audit
// data it was given, before it's saved or displayed. The system prompt
// (src/lib/providers/ai-report/live.ts) already instructs the model not to
// invent services, locations, ratings, competitors, or claims — this module
// is the mechanical enforcement of that instruction: every opportunity and
// action-plan item must cite at least one real finding ID from this audit's
// own scoring run, and every "strongest area" must be a real category
// label. Anything that doesn't is dropped, not trusted.
//
// This does not attempt full semantic fact-checking of free-text prose
// (out of scope for a deterministic validator) — see the completion report
// for that documented limitation.

import type { AiReportOutput, ActionItem, Opportunity } from "@/lib/validation/report";
import type { RuleFinding } from "@/lib/scoring/types";
import { CATEGORY_LABELS } from "@/lib/scoring/labels";

export interface AiOutputValidationResult {
  sanitized: AiReportOutput;
  violations: string[];
}

const FALLBACK_OPPORTUNITY: Opportunity = {
  priority: "low",
  title: "No AI-generated recommendations passed evidence validation",
  problem:
    "The AI narrative layer proposed opportunities that could not be traced back to a structured finding from this audit.",
  whyItMatters: "Recommendations must be grounded in verified findings, not narrative inference.",
  recommendedAction: "Review the Findings section below for the full evidence-backed list.",
  expectedImpact: "low",
  effort: "low",
  evidenceFindingIds: [],
};

export function validateAiOutput(output: AiReportOutput, findings: RuleFinding[]): AiOutputValidationResult {
  const validRuleIds = new Set(findings.map((f) => f.ruleId));
  const validLabels = new Set(Object.values(CATEGORY_LABELS));
  const violations: string[] = [];

  const isEvidenceBound = (ids: string[]) => ids.length > 0 && ids.every((id) => validRuleIds.has(id));

  const topOpportunities = output.topOpportunities.filter((o) => {
    const ok = isEvidenceBound(o.evidenceFindingIds);
    if (!ok) violations.push(`Dropped unsupported opportunity "${o.title}" — evidenceFindingIds did not map to a real finding from this audit.`);
    return ok;
  });

  function filterActionItems(items: ActionItem[], label: string): ActionItem[] {
    return items.filter((item) => {
      const ok = isEvidenceBound(item.relatedFindingIds);
      if (!ok) violations.push(`Dropped unsupported ${label} item "${item.title}" — relatedFindingIds did not map to a real finding from this audit.`);
      return ok;
    });
  }

  const strongestAreas = output.strongestAreas.filter((area) => {
    const ok = validLabels.has(area);
    if (!ok) violations.push(`Dropped unrecognized strongest-area label "${area}" — not one of this audit's scoring categories.`);
    return ok;
  });

  return {
    sanitized: {
      ...output,
      strongestAreas,
      topOpportunities: topOpportunities.length > 0 ? topOpportunities : [FALLBACK_OPPORTUNITY],
      thirtyDayPlan: filterActionItems(output.thirtyDayPlan, "30-day plan"),
      sixtyDayPlan: filterActionItems(output.sixtyDayPlan, "60-day plan"),
      ninetyDayPlan: filterActionItems(output.ninetyDayPlan, "90-day plan"),
    },
    violations,
  };
}
