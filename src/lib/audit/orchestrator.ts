import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logEvent, setStage } from "./events";
import { buildRuleContext } from "./context";
import { getWebsiteProvider } from "@/lib/providers/website";
import { getGooglePlacesProvider } from "@/lib/providers/places";
import { getPageSpeedProvider } from "@/lib/providers/pagespeed";
import { getAiReportProvider, generateTemplateReport } from "@/lib/providers/ai-report";
import { getCrmProvider } from "@/lib/providers/crm";
import { runScoringEngine, scoreClassification } from "@/lib/scoring/engine";
import { classifyPage, coveredServices } from "@/lib/crawler/classify";
import { normalizeDomain } from "@/lib/crawler/normalize";
import { generateReportToken } from "@/lib/tokens";
import { aiReportOutputSchema } from "@/lib/validation/report";
import { env, hasPlacesCredentials, hasPageSpeedCredentials } from "@/lib/env";
import { getIndustryTemplate } from "@/lib/industry-templates";
import type { AuditStage } from "@/lib/supabase/types";
import type { CrawledPageResult, PlaceRecord, PageSpeedMetrics } from "@/lib/providers/types";

export async function runAudit(auditId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: audit, error: auditError } = await supabase.from("audits").select("*").eq("id", auditId).single();
  if (auditError || !audit) throw new Error(`Audit ${auditId} not found`);

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", audit.business_id)
    .single();
  if (businessError || !business) throw new Error(`Business for audit ${auditId} not found`);

  await supabase.from("audits").update({ status: "running", started_at: new Date().toISOString() }).eq("id", auditId);

  try {
    await stage(auditId, "resolving_business", async () => {
      // Business row already created at intake — this stage exists so the
      // processing UI has a first real, persisted step to show immediately.
      return { businessName: business.name };
    });

    const websiteProvider = getWebsiteProvider();
    let crawl!: Awaited<ReturnType<typeof websiteProvider.crawl>>;
    await stage(auditId, "discovering_website", async () => {
      crawl = await websiteProvider.crawl(business.website_url, { maxPages: env.maxPages });
      await supabase.from("audit_sources").insert({
        audit_id: auditId,
        source_type: "website",
        provider_mode: crawl.mode,
        status: crawl.status,
        raw_metadata: { sitemapsFound: crawl.data.sitemapsFound, robotsTxtFound: crawl.data.robotsTxtFound },
      });
      return { sitemapsFound: crawl.data.sitemapsFound.length, robotsAllowed: crawl.data.robotsAllowed };
    });

    await stage(auditId, "crawling_pages", async () => {
      if (crawl.data.pages.length > 0) {
        await supabase.from("crawled_pages").insert(
          crawl.data.pages.map((p) => toCrawledPageRow(auditId, p, business.industry))
        );
      }
      return { pagesCrawled: crawl.data.pagesCrawled, pagesDiscovered: crawl.data.pagesDiscovered };
    });

    await stage(auditId, "analyzing_website", async () => {
      return { pagesAnalyzed: crawl.data.pages.length };
    });

    const placesProvider = getGooglePlacesProvider();
    let place: PlaceRecord | null = null;
    await stage(auditId, "retrieving_places", async () => {
      const result = await placesProvider.findBusiness({
        name: business.name,
        city: business.city,
        state: business.state,
        websiteUrl: business.website_url,
      });
      place = result.data;
      await supabase.from("audit_sources").insert({
        audit_id: auditId,
        source_type: "places",
        provider_mode: result.mode,
        status: result.status,
        raw_metadata: { found: Boolean(place), errorMessage: result.errorMessage ?? null },
      });
      if (place) {
        await supabase.from("businesses").update({ place_id: place.placeId }).eq("id", business.id);
      }
      return { found: Boolean(place) };
    });

    let pageSpeedResults: PageSpeedMetrics[] = [];
    await stage(auditId, "retrieving_pagespeed", async () => {
      const pageSpeedProvider = getPageSpeedProvider();
      const priorityUrls = pickPriorityUrls(crawl.data.pages, business.website_url);
      const results = await Promise.all(priorityUrls.map((url) => pageSpeedProvider.analyze(url)));
      pageSpeedResults = results.flatMap((r) => r.data);
      const overallStatus = results.some((r) => r.status === "ok") ? "ok" : results.some((r) => r.status === "partial") ? "partial" : "error";
      await supabase.from("audit_sources").insert({
        audit_id: auditId,
        source_type: "pagespeed",
        provider_mode: results[0]?.mode ?? "mock",
        status: overallStatus,
        raw_metadata: { urlsAnalyzed: priorityUrls },
      });
      return { urlsAnalyzed: priorityUrls.length };
    });

    let competitors: PlaceRecord[] = [];
    const competitorPages: Record<string, CrawledPageResult[]> = {};
    await stage(auditId, "benchmarking_competitors", async () => {
      const result = await placesProvider.searchCompetitors({
        serviceCategory: business.industry,
        city: business.city,
        state: business.state,
        excludePlaceId: place?.placeId,
        excludeNormalizedDomain: business.normalized_domain,
        limit: 5,
      });
      competitors = result.data.slice(0, 5);

      await Promise.all(
        competitors
          .filter((c) => c.websiteUri)
          .map(async (c) => {
            const websiteResult = await websiteProvider.crawl(c.websiteUri!, { maxPages: env.competitorMaxPages });
            competitorPages[normalizeDomain(c.websiteUri!)] = websiteResult.data.pages;
          })
      );

      if (competitors.length > 0) {
        await supabase.from("competitors").insert(
          competitors.map((c, i) => toCompetitorRow(auditId, c, i + 1, competitorPages[normalizeDomain(c.websiteUri ?? "")] ?? [], business.industry))
        );
      }

      await supabase.from("audit_sources").insert({
        audit_id: auditId,
        source_type: "places",
        provider_mode: result.mode,
        status: result.status,
        raw_metadata: { competitorsFound: competitors.length },
      });

      return { competitorsFound: competitors.length };
    });

    let scoring!: ReturnType<typeof runScoringEngine>;
    await stage(auditId, "calculating_score", async () => {
      const ctx = buildRuleContext({
        business: {
          name: business.name,
          normalizedDomain: business.normalized_domain,
          industry: business.industry,
          city: business.city,
          state: business.state,
          websiteUrl: business.website_url,
        },
        crawl: crawl.data,
        place,
        placesConfigured: hasPlacesCredentials() || crawl.mode === "mock",
        pageSpeed: pageSpeedResults,
        pageSpeedConfigured: hasPageSpeedCredentials() || crawl.mode === "mock",
        competitors,
        competitorPages,
      });

      scoring = runScoringEngine(ctx);

      await supabase.from("findings").insert(
        scoring.findings.map((f) => ({
          audit_id: auditId,
          rule_id: f.ruleId,
          category: f.category,
          status: f.status,
          severity: f.severity,
          points_available: f.pointsAvailable,
          points_earned: f.pointsEarned,
          evidence: f.evidence,
          source_urls: f.sourceUrls,
          explanation: f.explanation,
          recommendation: f.recommendation ?? null,
          estimated_impact: f.estimatedImpact ?? null,
          estimated_effort: f.estimatedEffort ?? null,
          confidence: f.confidence,
        }))
      );

      await supabase.from("category_scores").insert(
        scoring.categories.map((c) => ({
          audit_id: auditId,
          category: c.category,
          weight: c.weight,
          earned_points: c.earnedPoints,
          available_points: c.availablePoints,
          category_percentage: c.categoryPercentage,
          weighted_score: c.weightedScore,
          confidence: c.confidence / 100,
        }))
      );

      await supabase
        .from("audits")
        .update({
          overall_score: scoring.overallScore,
          confidence_score: scoring.confidenceScore,
          scoring_version: scoring.scoringVersion,
        })
        .eq("id", auditId);

      return { overallScore: scoring.overallScore, confidenceScore: scoring.confidenceScore };
    });

    const dataLimitations: string[] = [];
    if (!place) dataLimitations.push("No verified Google Business Profile match — GBP and review signals are marked unknown.");
    if (competitors.length === 0) dataLimitations.push("No competitive benchmark data was available for this service category and city.");
    if (crawl.data.crawlCapped) dataLimitations.push(`The crawl was capped at ${env.maxPages} pages; some site sections may not be reflected.`);
    if (!hasPageSpeedCredentials() && crawl.mode !== "mock") dataLimitations.push("PageSpeed Insights is not configured — performance findings are unavailable.");

    let reportOutput!: ReturnType<typeof generateTemplateReport>;
    await stage(auditId, "generating_action_plan", async () => {
      const aiProvider = getAiReportProvider();
      const aiInput = {
        business: {
          name: business.name,
          websiteUrl: business.website_url,
          industry: business.industry,
          city: business.city,
          state: business.state,
        },
        scoring,
        findings: scoring.findings.map((f) => ({
          rule_id: f.ruleId,
          category: f.category,
          status: f.status,
          severity: f.severity,
          explanation: f.explanation,
          recommendation: f.recommendation ?? null,
          points_earned: f.pointsEarned,
          points_available: f.pointsAvailable,
        })),
        competitors,
        dataLimitations,
      };

      const result = await aiProvider.generate(aiInput);
      const parsed = aiReportOutputSchema.safeParse(result.data);
      reportOutput = result.status === "ok" && parsed.success ? parsed.data : generateTemplateReport(aiInput);

      await supabase.from("audit_sources").insert({
        audit_id: auditId,
        source_type: "ai_report",
        provider_mode: result.mode,
        status: result.status === "ok" ? "ok" : "partial",
        raw_metadata: { fellBackToTemplate: result.status !== "ok", errorMessage: result.errorMessage ?? null },
      });

      return { usedFallback: result.status !== "ok" };
    });

    const classification = scoreClassification(scoring.overallScore);
    let publicToken = "";
    await stage(auditId, "generating_report", async () => {
      publicToken = generateReportToken();
      const reportJson = {
        business: {
          name: business.name,
          websiteUrl: business.website_url,
          industry: business.industry,
          city: business.city,
          state: business.state,
        },
        scoring,
        classification,
        competitors,
        report: reportOutput,
        generatedAt: new Date().toISOString(),
      };

      await supabase.from("reports").insert({
        audit_id: auditId,
        executive_summary: reportOutput.executiveSummary,
        top_opportunities: reportOutput.topOpportunities,
        action_plan: {
          thirtyDayPlan: reportOutput.thirtyDayPlan,
          sixtyDayPlan: reportOutput.sixtyDayPlan,
          ninetyDayPlan: reportOutput.ninetyDayPlan,
        },
        report_json: reportJson,
        public_token: publicToken,
      });

      return { publicToken };
    });

    await supabase
      .from("audits")
      .update({ status: "completed", current_stage: "completed", completed_at: new Date().toISOString() })
      .eq("id", auditId);
    await logEvent(auditId, "completed", "completed", "Audit completed successfully.");

    // Optional, fault-tolerant CRM handoff — never affects audit outcome.
    if (!env.disableCrmHandoff) {
      void sendToCrm({
        businessName: business.name,
        websiteUrl: business.website_url,
        city: business.city,
        state: business.state,
        phone: business.phone,
        email: business.email,
        overallScore: scoring.overallScore,
        topOpportunities: reportOutput.topOpportunities.slice(0, 3).map((o) => o.title),
        reportUrl: `${env.appUrl}/reports/${publicToken}`,
      }, auditId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown audit error";
    await supabase.from("audits").update({ status: "failed", error_message: message }).eq("id", auditId);
    await logEvent(auditId, audit.current_stage, "failed", message);
    throw error;
  }
}

async function stage<T>(auditId: string, name: AuditStage, fn: () => Promise<T>): Promise<T> {
  await setStage(auditId, name);
  await logEvent(auditId, name, "started");
  try {
    const result = await fn();
    await logEvent(auditId, name, "completed", undefined, isPlainObject(result) ? result : {});
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await logEvent(auditId, name, "failed", message);
    throw error;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickPriorityUrls(pages: CrawledPageResult[], websiteUrl: string): string[] {
  const homepage = pages.find((p) => p.url === websiteUrl) ?? pages[0];
  const urls = new Set<string>();
  if (homepage) urls.add(homepage.url);
  const servicePage = pages.find((p) => p !== homepage);
  if (servicePage) urls.add(servicePage.url);
  return [...urls].slice(0, 3);
}

function toCrawledPageRow(auditId: string, page: CrawledPageResult, industry: string) {
  const template = getIndustryTemplate(industry);
  const pageType = classifyPage(page, false, template);
  return {
    audit_id: auditId,
    url: page.url,
    normalized_url: page.normalizedUrl,
    page_type: pageType,
    http_status: page.httpStatus,
    title: page.title,
    meta_description: page.metaDescription,
    h1: page.h1,
    canonical_url: page.canonicalUrl,
    word_count: page.wordCount,
    has_schema: page.hasSchema,
    schema_types: page.schemaTypes,
    internal_links: page.internalLinks,
    broken_links: page.brokenLinks,
    broken_images: page.brokenImages,
    signals: page.signals,
  };
}

function toCompetitorRow(
  auditId: string,
  competitor: PlaceRecord,
  position: number,
  pages: CrawledPageResult[],
  industry: string
) {
  const template = getIndustryTemplate(industry);
  const serviceCoverage = pages.length > 0 ? (coveredServices(pages, template).length / Math.max(1, template.expectedServices.length)) * 100 : null;

  return {
    audit_id: auditId,
    name: competitor.name,
    place_id: competitor.placeId,
    website_url: competitor.websiteUri,
    benchmark_position: position,
    rating: competitor.rating,
    review_count: competitor.userRatingCount,
    has_website: Boolean(competitor.websiteUri),
    pagespeed_mobile_score: null,
    service_page_coverage: serviceCoverage,
    location_page_coverage: null,
    trust_signal_count: 0,
    raw_metadata: { businessStatus: competitor.businessStatus, googleMapsUri: competitor.googleMapsUri },
  };
}

async function sendToCrm(
  payload: Parameters<ReturnType<typeof getCrmProvider>["sendLead"]>[0],
  auditId: string
): Promise<void> {
  try {
    const crmProvider = getCrmProvider();
    const result = await crmProvider.sendLead(payload);
    const supabase = getSupabaseAdmin();
    await supabase.from("audit_sources").insert({
      audit_id: auditId,
      source_type: "crm",
      provider_mode: "live",
      status: result.status,
      raw_metadata: { delivered: result.data.delivered, errorMessage: result.errorMessage ?? null },
    });
  } catch {
    // GHL delivery must never affect audit success — swallow by design.
  }
}
