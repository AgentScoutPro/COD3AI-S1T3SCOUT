import { env, hasOpenAiCredentials } from "@/lib/env";
import type { AiReportProvider } from "../types";
import { MockAiReportProvider } from "./mock";
import { LiveAiReportProvider } from "./live";
import { generateTemplateReport } from "./template";

export function getAiReportProvider(): AiReportProvider {
  return env.providerMode === "live" && hasOpenAiCredentials()
    ? new LiveAiReportProvider()
    : new MockAiReportProvider();
}

export { generateTemplateReport };
