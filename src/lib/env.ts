export type ProviderMode = "mock" | "live";

function providerMode(): ProviderMode {
  return process.env.AUDIT_PROVIDER_MODE === "live" ? "live" : "mock";
}

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  providerMode: providerMode(),
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  googlePageSpeedApiKey: process.env.GOOGLE_PAGESPEED_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiReportModel: process.env.OPENAI_REPORT_MODEL ?? "gpt-4.1-mini",
  ghlWebhookUrl: process.env.GHL_AUDIT_WEBHOOK_URL,
  maxPages: Number(process.env.AUDIT_MAX_PAGES ?? 40),
  competitorMaxPages: Number(process.env.AUDIT_COMPETITOR_MAX_PAGES ?? 8),
  requestTimeoutMs: Number(process.env.AUDIT_REQUEST_TIMEOUT_MS ?? 12000),
  crawlConcurrency: Number(process.env.AUDIT_CRAWL_CONCURRENCY ?? 2),
  userAgent: process.env.AUDIT_USER_AGENT ?? "Cod3AILocalAuthorityBot/1.0",
  reportTokenSecret: process.env.REPORT_TOKEN_SECRET,
  disableCrmHandoff: process.env.DISABLE_CRM_HANDOFF === "true",
};

/** True when real Places credentials are present, independent of global mode. */
export const hasPlacesCredentials = () => Boolean(process.env.GOOGLE_MAPS_API_KEY);
export const hasPageSpeedCredentials = () => Boolean(process.env.GOOGLE_PAGESPEED_API_KEY);
export const hasOpenAiCredentials = () => Boolean(process.env.OPENAI_API_KEY);
