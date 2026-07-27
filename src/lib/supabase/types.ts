// Hand-written types mirroring supabase/migrations/0001_init.sql.
// Regenerate/reconcile with `supabase gen types typescript` once a live
// project exists; kept hand-written for now so the MVP isn't blocked on
// Supabase CLI access.
//
// These are declared with `type`, not `interface`: TypeScript only grants
// "implicit index signatures" (needed to satisfy postgrest-js's
// `Record<string, unknown>` Row constraint) to type-alias object shapes,
// not to interfaces. Using `interface` here silently makes every
// supabase-js query resolve to `never`.

export type AuditType = "public" | "connected";
export type AuditStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type ProviderMode = "mock" | "live";
export type SourceType = "website" | "places" | "pagespeed" | "ai_report" | "crm";
export type SourceStatus = "ok" | "partial" | "error";
export type FindingStatus = "pass" | "warning" | "fail" | "unknown";

/** Persisted per-audit. Determines what a provider is allowed to return and
 * whether the report can be published without human approval. See
 * src/lib/audit/provider-integrity.ts. */
export type AuditMode = "demo" | "internal_test" | "public_live" | "connected_client";

/** Report-publishing workflow, independent of the pipeline `status`/`current_stage`. */
export type ReviewStatus = "not_required" | "needs_review" | "approved" | "rejected" | "published";

/** What a data point is allowed to display as, computed by the
 * provider-integrity layer — never inferred ad hoc at render time. */
export type DisplayStatus = "live" | "connected" | "unavailable" | "not_evaluated" | "demo_synthetic";

export type EntityVerificationStatus = "verified" | "unverified" | "not_applicable";
export type IndustryOverrideStatus = "none" | "approved";
export type Severity = "critical" | "high" | "medium" | "low" | "informational";
export type ImpactEffort = "high" | "medium" | "low";
export type EventStatus = "started" | "completed" | "failed";
export type IntegrationProvider =
  | "google_business_profile"
  | "search_console"
  | "ghl"
  | "rank_tracking"
  | "citation";
export type IntegrationStatus = "disconnected" | "connected" | "error";

export const AUDIT_STAGES = [
  "queued",
  "resolving_business",
  "discovering_website",
  "crawling_pages",
  "analyzing_website",
  "validating_industry",
  "retrieving_places",
  "retrieving_pagespeed",
  "benchmarking_competitors",
  "calculating_score",
  "generating_action_plan",
  "generating_report",
  "completed",
] as const;

export type AuditStage = (typeof AUDIT_STAGES)[number];

export type Organization = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

export type Business = {
  id: string;
  organization_id: string | null;
  name: string;
  website_url: string;
  normalized_domain: string;
  industry: string;
  phone: string | null;
  email: string | null;
  city: string;
  state: string;
  place_id: string | null;
  /** Optional Google Maps / Business Profile share link captured at
   * intake — resolved by the live Places provider into a precise
   * name+lat/lng lookup instead of guessing from name+city.
   * See src/lib/providers/places/maps-link.ts. */
  google_maps_url: string | null;
  /** Confirmed primary SEO target market — distinct from `city`/`state`
   * (intake city), which is not automatically the target market. Null until
   * explicitly confirmed by the client or verified by live data. */
  primary_target_market: string | null;
  service_areas: string[];
  target_market_confirmed: boolean;
  created_at: string;
  updated_at: string;
};

export type Audit = {
  id: string;
  business_id: string;
  audit_type: AuditType;
  status: AuditStatus;
  current_stage: AuditStage | string;
  scoring_version: string;
  overall_score: number | null;
  confidence_score: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  audit_mode: AuditMode;
  review_status: ReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditSource = {
  id: string;
  audit_id: string;
  source_type: SourceType;
  provider_mode: ProviderMode;
  status: SourceStatus;
  display_status: DisplayStatus;
  raw_metadata: Record<string, unknown>;
  fetched_at: string;
};

export type CrawledPage = {
  id: string;
  audit_id: string;
  url: string;
  normalized_url: string;
  page_type: string;
  http_status: number | null;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  canonical_url: string | null;
  word_count: number | null;
  has_schema: boolean;
  schema_types: string[];
  internal_links: number;
  broken_links: number;
  broken_images: number;
  signals: Record<string, unknown>;
  crawled_at: string;
};

export type Finding = {
  id: string;
  audit_id: string;
  rule_id: string;
  category: string;
  status: FindingStatus;
  severity: Severity;
  points_available: number;
  points_earned: number;
  evidence: Record<string, unknown>;
  source_urls: string[];
  explanation: string;
  recommendation: string | null;
  estimated_impact: ImpactEffort | null;
  estimated_effort: ImpactEffort | null;
  confidence: number;
  industry_template: string | null;
  scoreable: boolean;
  created_at: string;
};

export type CategoryScore = {
  id: string;
  audit_id: string;
  category: string;
  weight: number;
  earned_points: number;
  available_points: number;
  category_percentage: number;
  weighted_score: number;
  confidence: number;
};

export type Competitor = {
  id: string;
  audit_id: string;
  name: string;
  place_id: string | null;
  website_url: string | null;
  benchmark_position: number;
  rating: number | null;
  review_count: number | null;
  has_website: boolean;
  pagespeed_mobile_score: number | null;
  service_page_coverage: number | null;
  location_page_coverage: number | null;
  trust_signal_count: number;
  raw_metadata: Record<string, unknown>;
  created_at: string;
};

export type Report = {
  id: string;
  audit_id: string;
  executive_summary: string;
  top_opportunities: unknown[];
  action_plan: Record<string, unknown>;
  report_json: Record<string, unknown>;
  public_token: string;
  generated_at: string;
};

export type AuditEvent = {
  id: string;
  audit_id: string;
  stage: AuditStage | string;
  status: EventStatus;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Integration = {
  id: string;
  organization_id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  encrypted_credentials: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type IndustryMatchScore = { slug: string; label: string; score: number; matchedKeywords: string[] };

export type IndustryClassification = {
  id: string;
  audit_id: string;
  selected_industry: string;
  detected_industry: string | null;
  selected_confidence: number;
  detected_confidence: number;
  supporting_evidence: string[];
  contradicting_evidence: string[];
  scores: IndustryMatchScore[];
  mismatch: boolean;
  mismatch_reason: string | null;
  override_status: IndustryOverrideStatus;
  override_reviewer: string | null;
  override_reason: string | null;
  override_at: string | null;
  created_at: string;
};

export type EntityVerification = {
  id: string;
  audit_id: string;
  status: EntityVerificationStatus;
  confidence: number;
  matched_signals: string[];
  conflicting_signals: string[];
  place_id: string | null;
  created_at: string;
};

export type IntegrityWarning = {
  id: string;
  audit_id: string;
  source_type: string;
  warning: string;
  created_at: string;
};

// supabase-js's generic client requires each table to satisfy postgrest-js's
// `GenericTable` (Row/Insert/Update/Relationships) and each schema to
// satisfy `GenericSchema` (Tables/Views/Functions) — omitting any of these
// makes every query resolve to `never` instead of erroring, which is much
// harder to debug. This helper keeps the table declarations below terse
// while still satisfying that shape.
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      organizations: Table<Organization>;
      businesses: Table<Business>;
      audits: Table<Audit>;
      audit_sources: Table<AuditSource>;
      crawled_pages: Table<CrawledPage>;
      findings: Table<Finding>;
      category_scores: Table<CategoryScore>;
      competitors: Table<Competitor>;
      reports: Table<Report>;
      audit_events: Table<AuditEvent>;
      integrations: Table<Integration>;
      industry_classifications: Table<IndustryClassification>;
      entity_verifications: Table<EntityVerification>;
      integrity_warnings: Table<IntegrityWarning>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
