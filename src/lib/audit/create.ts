import { getSupabaseAdmin } from "@/lib/supabase/server";
import { normalizeDomain } from "@/lib/crawler/normalize";
import { SCORING_VERSION } from "@/lib/scoring/types";
import type { AuditIntakeInput } from "@/lib/validation/audit";

export interface CreateAuditResult {
  auditId: string;
  businessId: string;
}

/** Creates the business + audit rows for a new public-audit intake.
 * Does not run the audit — call runAudit(auditId) separately (the /run
 * API route does this so the intake request returns immediately). */
export async function createAudit(input: AuditIntakeInput): Promise<CreateAuditResult> {
  const supabase = getSupabaseAdmin();
  const normalizedDomain = normalizeDomain(input.websiteUrl);

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({
      organization_id: null,
      name: input.businessName,
      website_url: input.websiteUrl,
      normalized_domain: normalizedDomain,
      industry: input.industry,
      phone: input.phone || null,
      email: input.email || null,
      city: input.city,
      state: input.state,
      google_maps_url: input.mapsLink || null,
    })
    .select("id")
    .single();

  if (businessError || !business) {
    throw new Error(`Failed to create business: ${businessError?.message ?? "unknown error"}`);
  }

  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .insert({
      business_id: business.id,
      audit_type: "public",
      status: "queued",
      current_stage: "queued",
      scoring_version: SCORING_VERSION,
      // Public intake always starts as public_live — mock/synthetic data is
      // never permitted here (see src/lib/audit/provider-integrity.ts) and
      // the resulting report requires human approval before it can be
      // publicly viewed, PDF-exported, or handed to the CRM.
      audit_mode: "public_live",
    })
    .select("id")
    .single();

  if (auditError || !audit) {
    throw new Error(`Failed to create audit: ${auditError?.message ?? "unknown error"}`);
  }

  return { auditId: audit.id, businessId: business.id };
}
