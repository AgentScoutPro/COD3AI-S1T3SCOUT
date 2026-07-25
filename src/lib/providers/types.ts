// Provider-adapter interfaces. Every external data source is accessed
// through one of these so mock/live implementations are swappable and no
// call site depends on a specific vendor SDK.

import type { ProviderMode } from "@/lib/env";

export interface ProviderResult<T> {
  mode: ProviderMode;
  status: "ok" | "partial" | "error";
  data: T;
  rawMetadata?: Record<string, unknown>;
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Website provider — crawl output
// ---------------------------------------------------------------------------
export interface CrawledPageResult {
  url: string;
  normalizedUrl: string;
  httpStatus: number | null;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  canonicalUrl: string | null;
  wordCount: number;
  hasSchema: boolean;
  schemaTypes: string[];
  internalLinks: number;
  brokenLinks: number;
  brokenImages: number;
  hasHttps: boolean;
  hasViewportMeta: boolean;
  hasClickToCall: boolean;
  hasBookingForm: boolean;
  hasAnalytics: boolean;
  signals: Record<string, unknown>;
}

export interface WebsiteCrawlOutput {
  normalizedDomain: string;
  robotsAllowed: boolean;
  robotsTxtFound: boolean;
  sitemapsFound: string[];
  pages: CrawledPageResult[];
  pagesDiscovered: number;
  pagesCrawled: number;
  crawlCapped: boolean;
}

export interface WebsiteProvider {
  crawl(websiteUrl: string, options: { maxPages: number }): Promise<ProviderResult<WebsiteCrawlOutput>>;
}

// ---------------------------------------------------------------------------
// Google Places provider
// ---------------------------------------------------------------------------
export interface PlacesReview {
  authorName: string;
  rating: number;
  relativeTime: string;
  text: string;
}

export interface PlaceRecord {
  placeId: string;
  name: string;
  formattedAddress: string;
  phone: string | null;
  websiteUri: string | null;
  businessStatus: string;
  primaryType: string | null;
  secondaryTypes: string[];
  rating: number | null;
  userRatingCount: number | null;
  openingHours: string[];
  /** Capped at 5 by the Places API — never treat as a full review history. */
  reviews: PlacesReview[];
  googleMapsUri: string | null;
}

export interface GooglePlacesProvider {
  findBusiness(input: {
    name: string;
    city: string;
    state: string;
    websiteUrl: string;
  }): Promise<ProviderResult<PlaceRecord | null>>;

  searchCompetitors(input: {
    serviceCategory: string;
    city: string;
    state: string;
    excludePlaceId?: string;
    excludeNormalizedDomain?: string;
    limit: number;
  }): Promise<ProviderResult<PlaceRecord[]>>;
}

// ---------------------------------------------------------------------------
// PageSpeed provider
// ---------------------------------------------------------------------------
export interface PageSpeedMetrics {
  url: string;
  strategy: "mobile" | "desktop";
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  lcpMs: number | null;
  inpMs: number | null;
  cls: number | null;
  ttfbMs: number | null;
  hasFieldData: boolean;
}

export interface PageSpeedProvider {
  analyze(url: string): Promise<ProviderResult<PageSpeedMetrics[]>>;
}

// ---------------------------------------------------------------------------
// AI report provider
// ---------------------------------------------------------------------------
import type { AiReportOutput } from "@/lib/validation/report";
import type { ScoringResult } from "@/lib/scoring/types";
import type { Finding } from "@/lib/supabase/types";

export interface AiReportInput {
  business: {
    name: string;
    websiteUrl: string;
    industry: string;
    city: string;
    state: string;
  };
  scoring: ScoringResult;
  findings: Pick<
    Finding,
    "rule_id" | "category" | "status" | "severity" | "explanation" | "recommendation" | "points_earned" | "points_available"
  >[];
  competitors: PlaceRecord[];
  dataLimitations: string[];
}

export interface AiReportProvider {
  generate(input: AiReportInput): Promise<ProviderResult<AiReportOutput>>;
}

// ---------------------------------------------------------------------------
// CRM provider (GoHighLevel)
// ---------------------------------------------------------------------------
export interface CrmLeadPayload {
  businessName: string;
  websiteUrl: string;
  city: string;
  state: string;
  phone: string | null;
  email: string | null;
  overallScore: number | null;
  topOpportunities: string[];
  reportUrl: string;
}

export interface CrmProvider {
  sendLead(payload: CrmLeadPayload): Promise<ProviderResult<{ delivered: boolean }>>;
}

// ---------------------------------------------------------------------------
// Phase 3+ placeholder interfaces — not implemented in this build.
// ---------------------------------------------------------------------------
export interface GoogleBusinessProfileProvider {
  isConfigured(): boolean;
  getConnectedLocation?(organizationId: string): Promise<unknown>;
}

export interface SearchConsoleProvider {
  isConfigured(): boolean;
  getVerifiedProperty?(organizationId: string): Promise<unknown>;
}

export interface RankTrackingProvider {
  isConfigured(): boolean;
  getKeywordPositions?(businessId: string): Promise<unknown>;
}

export interface CitationProvider {
  isConfigured(): boolean;
  getCitationCoverage?(businessId: string): Promise<unknown>;
}
