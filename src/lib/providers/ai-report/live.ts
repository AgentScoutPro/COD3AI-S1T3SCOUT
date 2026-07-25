import OpenAI from "openai";
import { z } from "zod";
import type { AiReportProvider, AiReportInput, ProviderResult } from "../types";
import { aiReportOutputSchema, type AiReportOutput } from "@/lib/validation/report";
import { env } from "@/lib/env";

const SYSTEM_PROMPT = `You are a local SEO analyst writing a report for a home-service business owner
with no SEO background. You are given deterministic scoring output, findings, and a competitive
benchmark. Explain and prioritize what is already there — do NOT invent statistics, rankings,
competitors, or services; do NOT override the deterministic scores; do NOT claim guaranteed
ranking outcomes. Competitor comparisons are a "Competitive Benchmark," never a "Local Ranking."
Write in plain, direct language a non-technical business owner can act on.`;

export class LiveAiReportProvider implements AiReportProvider {
  async generate(input: AiReportInput): Promise<ProviderResult<AiReportOutput>> {
    if (!env.openaiApiKey) {
      return {
        mode: "live",
        status: "error",
        data: emptyOutput(),
        errorMessage: "OPENAI_API_KEY not configured.",
      };
    }

    try {
      const client = new OpenAI({ apiKey: env.openaiApiKey });
      const jsonSchema = z.toJSONSchema(aiReportOutputSchema, { target: "draft-7" });

      const response = await client.responses.create({
        model: env.openaiReportModel,
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(input) },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "local_authority_report",
            schema: jsonSchema,
            strict: true,
          },
        },
      });

      const text = response.output_text;
      if (!text) throw new Error("Empty response from OpenAI Responses API.");

      const parsed = aiReportOutputSchema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        throw new Error(`AI report failed schema validation: ${parsed.error.message}`);
      }

      return { mode: "live", status: "ok", data: parsed.data };
    } catch (error) {
      return {
        mode: "live",
        status: "error",
        data: emptyOutput(),
        errorMessage: error instanceof Error ? error.message : "Unknown AI report error",
      };
    }
  }
}

function emptyOutput(): AiReportOutput {
  return {
    executiveSummary: "",
    scoreExplanation: "",
    strongestAreas: [],
    topOpportunities: [
      {
        priority: "low",
        title: "AI report unavailable",
        problem: "The AI report provider failed to generate output.",
        whyItMatters: "A template-based fallback report will be used instead.",
        recommendedAction: "Retry the audit or contact support if this persists.",
        expectedImpact: "low",
        effort: "low",
        evidenceFindingIds: [],
      },
    ],
    thirtyDayPlan: [],
    sixtyDayPlan: [],
    ninetyDayPlan: [],
    internalActions: [],
    cod3aiOpportunities: [],
    limitations: [],
  };
}
