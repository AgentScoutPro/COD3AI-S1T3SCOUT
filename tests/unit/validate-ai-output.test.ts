import { describe, expect, it } from "vitest";
import { validateAiOutput } from "@/lib/audit/validate-ai-output";
import type { AiReportOutput } from "@/lib/validation/report";
import type { RuleFinding } from "@/lib/scoring/types";

function makeFinding(overrides: Partial<RuleFinding> = {}): RuleFinding {
  return {
    ruleId: "tech.https",
    category: "technical_foundation",
    status: "fail",
    severity: "high",
    pointsAvailable: 2,
    pointsEarned: 0,
    evidence: {},
    sourceUrls: [],
    explanation: "Homepage is not served over HTTPS.",
    confidence: 1,
    ...overrides,
  };
}

function baseOutput(overrides: Partial<AiReportOutput> = {}): AiReportOutput {
  return {
    executiveSummary: "Summary",
    scoreExplanation: "Explanation",
    strongestAreas: [],
    topOpportunities: [],
    thirtyDayPlan: [],
    sixtyDayPlan: [],
    ninetyDayPlan: [],
    internalActions: [],
    cod3aiOpportunities: [],
    limitations: [],
    ...overrides,
  };
}

describe("validateAiOutput", () => {
  // Required test #17: AI output cannot introduce unsupported facts.
  it("drops an opportunity whose evidenceFindingIds don't map to a real finding", () => {
    const findings = [makeFinding()];
    const output = baseOutput({
      topOpportunities: [
        {
          priority: "high",
          title: "Fabricated garage-door spring replacement gap",
          problem: "Invented claim not backed by any real finding.",
          whyItMatters: "N/A",
          recommendedAction: "N/A",
          expectedImpact: "high",
          effort: "medium",
          evidenceFindingIds: ["svcloc.emergency_page_that_does_not_exist"],
        },
      ],
    });
    const { sanitized, violations } = validateAiOutput(output, findings);
    expect(sanitized.topOpportunities.map((o) => o.title)).not.toContain("Fabricated garage-door spring replacement gap");
    expect(violations.length).toBeGreaterThan(0);
  });

  it("keeps an opportunity whose evidenceFindingIds map to a real finding", () => {
    const findings = [makeFinding({ ruleId: "tech.https" })];
    const output = baseOutput({
      topOpportunities: [
        {
          priority: "high",
          title: "Fix HTTPS",
          problem: "Homepage is not on HTTPS.",
          whyItMatters: "Trust and rankings.",
          recommendedAction: "Install an SSL cert.",
          expectedImpact: "high",
          effort: "low",
          evidenceFindingIds: ["tech.https"],
        },
      ],
    });
    const { sanitized, violations } = validateAiOutput(output, findings);
    expect(sanitized.topOpportunities).toHaveLength(1);
    expect(violations).toHaveLength(0);
  });

  it("drops an opportunity with no evidence at all (empty evidenceFindingIds)", () => {
    const output = baseOutput({
      topOpportunities: [
        {
          priority: "low",
          title: "Unsupported claim",
          problem: "No evidence cited.",
          whyItMatters: "N/A",
          recommendedAction: "N/A",
          expectedImpact: "low",
          effort: "low",
          evidenceFindingIds: [],
        },
      ],
    });
    const { sanitized } = validateAiOutput(output, [makeFinding()]);
    expect(sanitized.topOpportunities.some((o) => o.title === "Unsupported claim")).toBe(false);
  });

  it("falls back to a safe placeholder rather than an empty topOpportunities array", () => {
    const output = baseOutput({
      topOpportunities: [
        {
          priority: "low",
          title: "Unsupported",
          problem: "x",
          whyItMatters: "x",
          recommendedAction: "x",
          expectedImpact: "low",
          effort: "low",
          evidenceFindingIds: ["does.not.exist"],
        },
      ],
    });
    const { sanitized } = validateAiOutput(output, [makeFinding()]);
    expect(sanitized.topOpportunities.length).toBeGreaterThan(0);
  });

  it("drops action-plan items with unsupported relatedFindingIds", () => {
    const output = baseOutput({
      thirtyDayPlan: [
        { title: "Fake", description: "x", category: "Technical", effort: "low", relatedFindingIds: ["nope"] },
      ],
    });
    const { sanitized } = validateAiOutput(output, [makeFinding()]);
    expect(sanitized.thirtyDayPlan).toHaveLength(0);
  });

  it("drops a strongestAreas label that isn't a real scoring category", () => {
    const output = baseOutput({ strongestAreas: ["Made Up Category", "Technical Foundation"] });
    const { sanitized } = validateAiOutput(output, [makeFinding()]);
    expect(sanitized.strongestAreas).toEqual(["Technical Foundation"]);
  });
});
