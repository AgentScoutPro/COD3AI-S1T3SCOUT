import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { auditIdParamSchema } from "@/lib/validation/audit";
import { env } from "@/lib/env";
import { getCrmProvider } from "@/lib/providers/crm";

// Human approval gate (§7 of artifacts/platform-audit-root-cause.md's
// companion fix plan): public_live/connected_client audits are created with
// review_status='needs_review' and the public report page + PDF route both
// refuse to render until this endpoint has been called. There is no admin
// auth system in this codebase yet (see /admin, /dashboard — both already
// unauthenticated in this MVP), so `reviewer` is a free-text identifier
// rather than a verified account — a documented gap, not a silent one.
const approveBodySchema = z.object({
  reviewer: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsedId = auditIdParamSchema.safeParse(id);
  if (!parsedId.success) return NextResponse.json({ error: "Invalid audit id." }, { status: 400 });

  const body = await request.json().catch(() => null);
  const parsed = approveBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 422 });

  const supabase = getSupabaseAdmin();
  const { data: audit, error } = await supabase.from("audits").select("*").eq("id", parsedId.data).single();
  if (error || !audit) return NextResponse.json({ error: "Audit not found." }, { status: 404 });
  if (audit.status !== "completed") {
    return NextResponse.json({ error: `Audit is ${audit.status}, not completed — nothing to approve.` }, { status: 409 });
  }

  await supabase
    .from("audits")
    .update({
      review_status: "approved",
      reviewed_by: parsed.data.reviewer,
      reviewed_at: new Date().toISOString(),
      review_notes: parsed.data.notes ?? null,
    })
    .eq("id", parsedId.data);

  // CRM handoff was withheld at audit-completion time pending approval —
  // fire it now, same fault-tolerant pattern as the orchestrator's own call.
  if (!env.disableCrmHandoff) {
    const { data: business } = await supabase.from("businesses").select("*").eq("id", audit.business_id).single();
    const { data: report } = await supabase.from("reports").select("public_token").eq("audit_id", parsedId.data).single();
    if (business && report) {
      try {
        const crmProvider = getCrmProvider();
        const result = await crmProvider.sendLead({
          businessName: business.name,
          websiteUrl: business.website_url,
          city: business.city,
          state: business.state,
          phone: business.phone,
          email: business.email,
          overallScore: audit.overall_score,
          topOpportunities: [],
          reportUrl: `${env.appUrl}/reports/${report.public_token}`,
        });
        await supabase.from("audit_sources").insert({
          audit_id: parsedId.data,
          source_type: "crm",
          provider_mode: "live",
          status: result.status,
          display_status: result.status === "ok" ? "live" : "unavailable",
          raw_metadata: { delivered: result.data.delivered, errorMessage: result.errorMessage ?? null, triggeredBy: "approval" },
        });
      } catch {
        // Never block an approval on CRM delivery failure.
      }
    }
  }

  return NextResponse.json({ status: "approved" });
}
