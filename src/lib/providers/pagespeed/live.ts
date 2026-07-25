import type { PageSpeedProvider, PageSpeedMetrics, ProviderResult } from "../types";
import { env } from "@/lib/env";

const PSI_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

interface PsiResponse {
  lighthouseResult?: {
    categories?: Record<string, { score?: number }>;
    audits?: Record<string, { numericValue?: number }>;
  };
  loadingExperience?: { metrics?: Record<string, unknown> };
}

async function runOnce(url: string, strategy: "mobile" | "desktop"): Promise<PageSpeedMetrics> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.requestTimeoutMs * 2);
  try {
    const params = new URLSearchParams({
      url,
      strategy,
      key: env.googlePageSpeedApiKey ?? "",
    });
    ["performance", "accessibility", "best-practices", "seo"].forEach((c) => params.append("category", c));

    const res = await fetch(`${PSI_URL}?${params.toString()}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`PageSpeed API error: ${res.status}`);
    const json = (await res.json()) as PsiResponse;

    const categories = json.lighthouseResult?.categories ?? {};
    const audits = json.lighthouseResult?.audits ?? {};
    const hasFieldData = Boolean(json.loadingExperience?.metrics);

    return {
      url,
      strategy,
      performanceScore: scoreOf(categories.performance?.score),
      accessibilityScore: scoreOf(categories.accessibility?.score),
      bestPracticesScore: scoreOf(categories["best-practices"]?.score),
      seoScore: scoreOf(categories.seo?.score),
      lcpMs: audits["largest-contentful-paint"]?.numericValue ?? null,
      inpMs: audits["interaction-to-next-paint"]?.numericValue ?? null,
      cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
      ttfbMs: audits["server-response-time"]?.numericValue ?? null,
      hasFieldData,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function scoreOf(raw: number | undefined): number | null {
  return typeof raw === "number" ? Math.round(raw * 100) : null;
}

export class LivePageSpeedProvider implements PageSpeedProvider {
  async analyze(url: string): Promise<ProviderResult<PageSpeedMetrics[]>> {
    if (!env.googlePageSpeedApiKey) {
      return { mode: "live", status: "error", data: [], errorMessage: "GOOGLE_PAGESPEED_API_KEY not configured." };
    }
    try {
      const [mobile, desktop] = await Promise.all([runOnce(url, "mobile"), runOnce(url, "desktop")]);
      const hasInsufficientData = !mobile.hasFieldData && !desktop.hasFieldData;
      return { mode: "live", status: hasInsufficientData ? "partial" : "ok", data: [mobile, desktop] };
    } catch (error) {
      return { mode: "live", status: "error", data: [], errorMessage: (error as Error).message };
    }
  }
}
