import type { AiReportProvider, AiReportInput, ProviderResult } from "../types";
import type { AiReportOutput } from "@/lib/validation/report";
import { generateTemplateReport } from "./template";

export class MockAiReportProvider implements AiReportProvider {
  async generate(input: AiReportInput): Promise<ProviderResult<AiReportOutput>> {
    return { mode: "mock", status: "ok", data: generateTemplateReport(input), rawMetadata: { mock: true } };
  }
}
