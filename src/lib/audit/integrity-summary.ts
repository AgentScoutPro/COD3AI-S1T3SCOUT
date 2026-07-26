// Shared "Data Integrity" section data — used by both the public report
// page and the admin review screen so the two surfaces can never disagree
// about what was actually live, mock, or unavailable for a given audit.
// See §8 of artifacts/platform-audit-root-cause.md's companion fix plan.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Audit, Business } from "@/lib/supabase/types";

export interface IntegritySummary {
  auditMode: Audit["audit_mode"];
  reviewStatus: Audit["review_status"];
  selectedIndustry: string;
  detectedIndustry: string | null;
  selectedIndustryConfidence: number;
  detectedIndustryConfidence: number;
  industryMismatch: boolean;
  industryOverridden: boolean;
  entityVerificationStatus: string;
  entityConfidence: number;
  providersLive: string[];
  providersConnected: string[];
  providersUnavailable: string[];
  providersDemoSynthetic: string[];
  integrityWarnings: string[];
}

export async function buildIntegritySummary(
  supabase: SupabaseClient<Database>,
  auditId: string,
  audit: Pick<Audit, "audit_mode" | "review_status">,
  business: Pick<Business, "industry">
): Promise<IntegritySummary> {
  const [{ data: classification }, { data: entity }, { data: sources }, { data: warnings }] = await Promise.all([
    supabase.from("industry_classifications").select("*").eq("audit_id", auditId).maybeSingle(),
    supabase.from("entity_verifications").select("*").eq("audit_id", auditId).maybeSingle(),
    supabase.from("audit_sources").select("source_type, display_status").eq("audit_id", auditId),
    supabase.from("integrity_warnings").select("warning").eq("audit_id", auditId),
  ]);

  const bySources = (status: string) =>
    Array.from(new Set((sources ?? []).filter((s) => s.display_status === status).map((s) => s.source_type)));

  return {
    auditMode: audit.audit_mode,
    reviewStatus: audit.review_status,
    selectedIndustry: classification?.selected_industry ?? business.industry,
    detectedIndustry: classification?.detected_industry ?? null,
    selectedIndustryConfidence: classification?.selected_confidence ?? 0,
    detectedIndustryConfidence: classification?.detected_confidence ?? 0,
    industryMismatch: classification?.mismatch ?? false,
    industryOverridden: classification?.override_status === "approved",
    entityVerificationStatus: entity?.status ?? "not_applicable",
    entityConfidence: entity?.confidence ?? 0,
    providersLive: bySources("live"),
    providersConnected: bySources("connected"),
    providersUnavailable: bySources("unavailable"),
    providersDemoSynthetic: bySources("demo_synthetic"),
    integrityWarnings: (warnings ?? []).map((w) => w.warning),
  };
}
