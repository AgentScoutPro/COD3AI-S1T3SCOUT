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
    })
    .select("id")
    .single();

  if (auditError || !audit) {
    throw new Error(`Failed to create audit: ${auditError?.message ?? "unknown error"}`);
  }

  return { auditId: audit.id, businessId: business.id };
}
