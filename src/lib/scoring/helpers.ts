import type { RuleFinding, ScoringCategory } from "./types";
import type { Severity, ImpactEffort } from "@/lib/supabase/types";

interface BuildFindingInput {
  ruleId: string;
  category: ScoringCategory;
  pointsAvailable: number;
  pointsEarnedRatio: number; // 0-1, ignored when status is "unknown"
  status: "pass" | "warning" | "fail" | "unknown";
  severity: Severity;
  explanation: string;
  recommendation?: string;
  evidence?: Record<string, unknown>;
  sourceUrls?: string[];
  estimatedImpact?: ImpactEffort;
  estimatedEffort?: ImpactEffort;
  confidence?: number;
}

export function buildFinding(input: BuildFindingInput): RuleFinding {
  return {
    ruleId: input.ruleId,
    category: input.category,
    status: input.status,
    severity: input.severity,
    pointsAvailable: input.pointsAvailable,
    pointsEarned: input.status === "unknown" ? 0 : round2(input.pointsAvailable * input.pointsEarnedRatio),
    evidence: input.evidence ?? {},
    sourceUrls: input.sourceUrls ?? [],
    explanation: input.explanation,
    recommendation: input.recommendation,
    estimatedImpact: input.estimatedImpact,
    estimatedEffort: input.estimatedEffort,
    confidence: input.confidence ?? (input.status === "unknown" ? 0 : 1),
  };
}

export function unknownFinding(
  ruleId: string,
  category: ScoringCategory,
  pointsAvailable: number,
  explanation: string
): RuleFinding {
  return buildFinding({
    ruleId,
    category,
    pointsAvailable,
    pointsEarnedRatio: 0,
    status: "unknown",
    severity: "informational",
    explanation,
    confidence: 0,
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
