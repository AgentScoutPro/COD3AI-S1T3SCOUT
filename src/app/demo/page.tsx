import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { normalizeDomain } from "@/lib/crawler/normalize";
import { createAudit } from "@/lib/audit/create";
import { runAudit } from "@/lib/audit/orchestrator";
import { auditIntakeSchema } from "@/lib/validation/audit";
import { HVAC_PHOENIX_SEED } from "@/lib/mock-data/hvac-phoenix-seed";

export const dynamic = "force-dynamic";

// "View Sample Scorecard" (brand kit secondary CTA) — finds (or creates,
// on first visit) the seeded demo HVAC audit and sends the visitor
// straight to its public report. No hardcoded token: the demo business is
// looked up by domain so this keeps working across fresh seeds/environments.
export default async function DemoRedirectPage() {
  const supabase = getSupabaseAdmin();
  const normalizedDomain = normalizeDomain(HVAC_PHOENIX_SEED.websiteUrl);

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("normalized_domain", normalizedDomain)
    .limit(1)
    .maybeSingle();

  if (business) {
    const { data: audit } = await supabase
      .from("audits")
      .select("id, status")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (audit?.status === "completed") {
      const { data: report } = await supabase
        .from("reports")
        .select("public_token")
        .eq("audit_id", audit.id)
        .maybeSingle();
      if (report) redirect(`/reports/${report.public_token}`);
    }
  }

  const input = auditIntakeSchema.parse(HVAC_PHOENIX_SEED);
  const { auditId } = await createAudit(input);
  await runAudit(auditId);

  const { data: report } = await supabase.from("reports").select("public_token").eq("audit_id", auditId).single();
  if (!report) throw new Error("Demo audit did not produce a report.");
  redirect(`/reports/${report.public_token}`);
}
