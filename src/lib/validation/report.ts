import { z } from "zod";

export const priorityEnum = z.enum(["high", "medium", "low"]);
export const effortEnum = z.enum(["high", "medium", "low"]);
export const impactEnum = z.enum(["high", "medium", "low"]);

export const cod3aiServiceEnum = z.enum([
  "website",
  "local_seo",
  "google_business_profile",
  "review_automation",
  "crm",
  "ai_receptionist",
  "missed_call_recovery",
  "reporting",
  "other",
]);

export const actionItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  effort: effortEnum,
  relatedFindingIds: z.array(z.string()).default([]),
});

export const opportunitySchema = z.object({
  priority: priorityEnum,
  title: z.string().min(1),
  problem: z.string().min(1),
  whyItMatters: z.string().min(1),
  recommendedAction: z.string().min(1),
  expectedImpact: impactEnum,
  effort: effortEnum,
  evidenceFindingIds: z.array(z.string()).default([]),
});

export const cod3aiOpportunitySchema = z.object({
  service: cod3aiServiceEnum,
  rationale: z.string().min(1),
});

export const aiReportOutputSchema = z.object({
  executiveSummary: z.string().min(1),
  scoreExplanation: z.string().min(1),
  strongestAreas: z.array(z.string()).default([]),
  topOpportunities: z.array(opportunitySchema).min(1).max(5),
  thirtyDayPlan: z.array(actionItemSchema).default([]),
  sixtyDayPlan: z.array(actionItemSchema).default([]),
  ninetyDayPlan: z.array(actionItemSchema).default([]),
  internalActions: z.array(z.string()).default([]),
  cod3aiOpportunities: z.array(cod3aiOpportunitySchema).default([]),
  limitations: z.array(z.string()).default([]),
});

export type AiReportOutput = z.infer<typeof aiReportOutputSchema>;
export type Opportunity = z.infer<typeof opportunitySchema>;
export type ActionItem = z.infer<typeof actionItemSchema>;
