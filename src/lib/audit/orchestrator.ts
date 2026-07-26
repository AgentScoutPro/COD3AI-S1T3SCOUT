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
import { env } from "@/lib/env";
import { getIndustryTemplate } from "@/lib/industry-templates";
import { detectIndustry } from "@/lib/industry-templates/detect";
import { verifyEntity } from "./entity-verification";
import { checkProviderIntegrity, type IntegrityCheckResult } from "./provider-integrity";
import { validateAiOutput } from "./validate-ai-output";
import { requiresApproval } from "./approval-gate";
import type { AuditStage, DisplayStatus, SourceType } from "@/lib/supabase/types";
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

  const auditMode = audit.audit_mode;

  await supabase.from("audits").update({ status: "running", started_at: new Date().toISOString() }).eq("id", auditId);

  /** Records an integrity-layer rejection so it's visible on the admin
   * review screen, then inserts the audit_sources row with the resolved
   * display status (never the raw provider status — that would let a
   * rejected mock result look identical to an approved live one). */
  async function recordSource(sourceType: SourceType, providerMode: "mock" | "live", rawStatus: "ok" | "partial" | "error", integrity: IntegrityCheckResult<unknown>, rawMetadata: Record<string, unknown>) {
    if (integrity.warning) {
      await supabase.from("integrity_warnings").insert({ audit_id: auditId, source_type: sourceType, warning: integrity.warning });
    }
    await supabase.from("audit_sources").insert({
      audit_id: auditId,
      source_type: sourceType,
      provider_mode: providerMode,
      status: rawStatus,
      display_status: integrity.displayStatus,
      raw_metadata: rawMetadata,
    });
  }

  try {
    await stage(auditId, "resolving_business", async () => {
      // Business row already created at intake — this stage exists so the
      // processing UI has a first real, persisted step to show immediately.
      return { businessName: business.name };
    });

    const websiteProvider = getWebsiteProvider();
    let crawl!: Awaited<ReturnType<typeof websiteProvider.crawl>>;
    let crawlIntegrity!: IntegrityCheckResult<unknown>;
    await stage(auditId, "discovering_website", async () => {
      crawl = await websiteProvider.crawl(business.website_url, { maxPages: env.maxPages });
      crawlIntegrity = checkProviderIntegrity({
        auditMode,
        sourceType: "website",
        providerMode: crawl.mode,
        status: crawl.status,
        data: crawl.data,
      });
      await recordSource("website", crawl.mode, crawl.status, crawlIntegrity, {
        sitemapsFound: crawl.data.sitemapsFound,
        robotsTxtFound: crawl.data.robotsTxtFound,
      });

      // Unlike Places/PageSpeed, the website crawl isn't optional context —
      // it's the audit's entire substrate. An integrity rejection here means
      // the audit cannot proceed at all, not just that one category goes
      // "unknown".
      if (!crawlIntegrity.allowed) {
        const message =
          crawlIntegrity.warning ??
          `Website crawl unavailable for this ${auditMode} audit (status: ${crawl.status}) — cannot proceed without real site content.`;
        await supabase.from("audits").update({ status: "failed", blocked_reason: "provider_integrity_website_unavailable", error_message: message }).eq("id", auditId);
        throw new Error(message);
      }

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

    // --- Platform-wide industry detection — see src/lib/industry-templates/detect.ts.
    // Runs for every audit mode and every registered template with no
    // per-industry conditionals; blocks scoring/report generation on a
    // material selected-vs-detected disagreement unless an admin has
    // already recorded an explicit override for this audit
    // (POST /api/audits/[id]/override-industry).
    await stage(auditId, "validating_industry", async () => {
      const detection = detectIndustry(crawl.data.pages, business.industry);

      const { data: existing } = await supabase
        .from("industry_classifications")
        .select("override_status, override_reviewer, override_reason, override_at")
        .eq("audit_id", auditId)
        .maybeSingle();
      const overridden = existing?.override_status === "approved";

      await supabase.from("industry_classifications").upsert(
        {
          audit_id: auditId,
          selected_industry: business.industry,
          detected_industry: detection.detectedIndustry,
          selected_confidence: detection.selectedConfidence,
          detected_confidence: detection.detectedConfidence,
          supporting_evidence: detection.supportingEvidence,
          contradicting_evidence: detection.contradictingEvidence,
          scores: detection.scores,
          mismatch: detection.mismatch,
          mismatch_reason: detection.mismatchReason,
          ...(overridden
            ? {
                override_status: existing.override_status,
                override_reviewer: existing.override_reviewer,
                override_reason: existing.override_reason,
                override_at: existing.override_at,
              }
            : {}),
        },
        { onConflict: "audit_id" }
      );

      if (detection.mismatch && !overridden) {
        const message = `Selected industry "${business.industry}" does not match detected industry "${detection.detectedIndustry ?? "none"}" (reason: ${detection.mismatchReason}). Scoring and report generation blocked — an admin must confirm the correct industry or record an explicit override.`;
        await supabase.from("audits").update({ status: "failed", blocked_reason: "industry_mismatch", error_message: message }).eq("id", auditId);
        throw new Error(message);
      }

      return { mismatch: detection.mismatch, detectedIndustry: detection.detectedIndustry, overridden };
    });

    const placesProvider = getGooglePlacesProvider();
    let place: PlaceRecord | null = null;
    let placesConfigured = false;
    await stage(auditId, "retrieving_places", async () => {
      const result = await placesProvider.findBusiness({
        name: business.name,
        city: business.city,
        state: business.state,
        websiteUrl: business.website_url,
      });
      const integrity = checkProviderIntegrity({ auditMode, sourceType: "places", providerMode: result.mode, status: result.status, data: result.data });
      placesConfigured = integrity.allowed;
      place = integrity.data;

      let verification: ReturnType<typeof verifyEntity> = { status: "not_applicable", confidence: 0, matchedSignals: [], conflictingSignals: [] };
      if (place) {
        verification = verifyEntity({
          business: { name: business.name, normalizedDomain: business.normalized_domain, phone: business.phone, city: business.city, state: business.state },
          place,
        });
        if (verification.status !== "verified") {
          // Uncertain, not "confirmed absent" — route through the same
          // "unknown" gate as an unconfigured provider so GBP/reviews/
          // competitor rules don't score an unverified match.
          place = null;
          placesConfigured = false;
        }
      }

      await supabase.from("entity_verifications").upsert(
        {
          audit_id: auditId,
          status: verification.status,
          confidence: verification.confidence,
          matched_signals: verification.matchedSignals,
          conflicting_signals: verification.conflictingSignals,
          place_id: integrity.data?.placeId ?? null,
        },
        { onConflict: "audit_id" }
      );

      await recordSource("places", result.mode, result.status, { ...integrity, displayStatus: place ? integrity.displayStatus : ("unavailable" as DisplayStatus) }, {
        found: Boolean(integrity.data),
        entityVerificationStatus: verification.status,
        errorMessage: result.errorMessage ?? null,
      });

      if (place) {
        await supabase.from("businesses").update({ place_id: (place as PlaceRecord).placeId }).eq("id", business.id);
      }
      return { found: Boolean(place), entityStatus: verification.status };
    });

    let pageSpeedResults: PageSpeedMetrics[] = [];
    let pageSpeedConfigured = false;
    await stage(auditId, "retrieving_pagespeed", async () => {
      const pageSpeedProvider = getPageSpeedProvider();
      const priorityUrls = pickPriorityUrls(crawl.data.pages, business.website_url);
      const results = await Promise.all(priorityUrls.map((url) => pageSpeedProvider.analyze(url)));

      const allowedResults: PageSpeedMetrics[][] = [];
      let anyAllowed = false;
      let lastIntegrity: IntegrityCheckResult<unknown> | null = null;
      for (const r of results) {
        const integrity = checkProviderIntegrity({ auditMode, sourceType: "pagespeed", providerMode: r.mode, status: r.status, data: r.data });
        lastIntegrity = integrity;
        if (integrity.allowed && integrity.data) {
          allowedResults.push(integrity.data as PageSpeedMetrics[]);
          anyAllowed = true;
        } else if (integrity.warning) {
          await supabase.from("integrity_warnings").insert({ audit_id: auditId, source_type: "pagespeed", warning: integrity.warning });
        }
      }
      pageSpeedResults = allowedResults.flat();
      pageSpeedConfigured = anyAllowed;

      await supabase.from("audit_sources").insert({
        audit_id: auditId,
        source_type: "pagespeed",
        provider_mode: results[0]?.mode ?? "mock",
        status: results.some((r) => r.status === "ok") ? "ok" : results.some((r) => r.status === "partial") ? "partial" : "error",
        display_status: anyAllowed ? (lastIntegrity?.displayStatus ?? "unavailable") : "unavailable",
        raw_metadata: { urlsAnalyzed: priorityUrls },
      });

      return { urlsAnalyzed: priorityUrls.length, configured: pageSpeedConfigured };
    });

    let competitors: PlaceRecord[] = [];
    let competitorsConfigured = false;
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
      const integrity = checkProviderIntegrity({ auditMode, sourceType: "places", providerMode: result.mode, status: result.status, data: result.data });
      competitorsConfigured = integrity.allowed;
      competitors = (integrity.data ?? []).slice(0, 5);

      await Promise.all(
        competitors
          .filter((c) => c.websiteUri)
          .map(async (c) => {
            const websiteResult = await websiteProvider.crawl(c.websiteUri!, { maxPages: env.competitorMaxPages });
            // Competitor site crawls follow the same integrity rule as the
            // primary crawl — a mock competitor site is never usable in a
            // public_live/connected_client audit.
            const compIntegrity = checkProviderIntegrity({ auditMode, sourceType: "website", providerMode: websiteResult.mode, status: websiteResult.status, data: websiteResult.data });
            if (compIntegrity.allowed && compIntegrity.data) {
              competitorPages[normalizeDomain(c.websiteUri!)] = (compIntegrity.data as typeof websiteResult.data).pages;
            }
          })
      );

      if (competitors.length > 0) {
        await supabase.from("competitors").insert(
          competitors.map((c, i) => toCompetitorRow(auditId, c, i + 1, competitorPages[normalizeDomain(c.websiteUri ?? "")] ?? [], business.industry))
        );
      }

      await recordSource("places", result.mode, result.status, integrity, { competitorsFound: competitors.length });

      return { competitorsFound: competitors.length, configured: competitorsConfigured };
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
        placesConfigured,
        pageSpeed: pageSpeedResults,
        pageSpeedConfigured,
        competitors,
        competitorPages,
        competitorsConfigured,
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
          industry_template: f.industryTemplate ?? business.industry,
          scoreable: f.scoreable ?? f.status !== "unknown",
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
    if (!competitorsConfigured || competitors.length === 0) dataLimitations.push("No competitive benchmark data was available for this service category and city.");
    if (crawl.data.crawlCapped) dataLimitations.push(`The crawl was capped at ${env.maxPages} pages; some site sections may not be reflected.`);
    if (!pageSpeedConfigured) dataLimitations.push("PageSpeed Insights is unavailable — performance findings are unavailable.");

    let reportOutput!: ReturnType<typeof generateTemplateReport>;
    let aiViolations: string[] = [];
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
      const rawOutput = result.status === "ok" && parsed.success ? parsed.data : generateTemplateReport(aiInput);

      // The AI report's "mock" path is a deterministic template built
      // entirely from this audit's own structured findings — it never
      // fabricates business facts (ratings, addresses, competitors), unlike
      // a mock Places/PageSpeed result, so it is exempt from the mock-
      // rejection rule. It's still always validated against structured
      // findings below and labeled honestly (not "live") whenever it wasn't
      // an actual LLM call.
      const isLiveLlm = result.mode === "live" && result.status === "ok";
      const validation = validateAiOutput(rawOutput, scoring.findings);
      reportOutput = validation.sanitized;
      aiViolations = validation.violations;

      for (const violation of aiViolations) {
        await supabase.from("integrity_warnings").insert({ audit_id: auditId, source_type: "ai_report", warning: violation });
      }

      await supabase.from("audit_sources").insert({
        audit_id: auditId,
        source_type: "ai_report",
        provider_mode: result.mode,
        status: result.status === "ok" ? "ok" : "partial",
        display_status: isLiveLlm ? "live" : "demo_synthetic",
        raw_metadata: { fellBackToTemplate: result.status !== "ok", errorMessage: result.errorMessage ?? null, validationViolations: aiViolations.length },
      });

      return { usedFallback: result.status !== "ok", violationsDropped: aiViolations.length };
    });

    const classification = scoreClassification(scoring.overallScore);
    let publicToken = "";
    const reviewStatus = requiresApproval(auditMode) ? "needs_review" : "not_required";
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
        auditMode,
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
      .update({
        status: "completed",
        current_stage: "completed",
        completed_at: new Date().toISOString(),
        review_status: reviewStatus,
      })
      .eq("id", auditId);
    await logEvent(auditId, "completed", "completed", "Audit completed successfully.");

    // Optional, fault-tolerant CRM handoff — never affects audit outcome.
    // Gated on review: public_live/connected_client audits must be approved
    // before a lead is handed to the CRM (§7 — "CRM handoff requires approval").
    if (!env.disableCrmHandoff && reviewStatus === "not_required") {
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
    // Don't clobber a status the try block already set deliberately (e.g.
    // the industry-mismatch / provider-integrity blocks above already wrote
    // 'failed' with a specific blocked_reason) — only set it here if it's
    // still unset from this catch's perspective.
    const { data: current } = await supabase.from("audits").select("status").eq("id", auditId).single();
    if (current?.status !== "failed") {
      await supabase.from("audits").update({ status: "failed", error_message: message }).eq("id", auditId);
    }
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
      display_status: result.status === "ok" ? "live" : "unavailable",
      raw_metadata: { delivered: result.data.delivered, errorMessage: result.errorMessage ?? null },
    });
  } catch {
    // GHL delivery must never affect audit success — swallow by design.
  }
}
