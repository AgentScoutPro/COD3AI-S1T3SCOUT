import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { auditIdParamSchema } from "@/lib/validation/audit";
import { INDUSTRY_SLUGS } from "@/lib/industry-templates";

// The only way to bypass a platform-wide industry-mismatch block (§4 of
// artifacts/platform-audit-root-cause.md's companion fix plan) — always
// records who approved it, why, and when. Two modes:
//   - `correctedIndustry` set: the operator's original selection was simply
//     wrong; fix `businesses.industry` and let the next run re-detect
//     naturally (no override flag needed — there's no longer a mismatch).
//   - `correctedIndustry` omitted: the detector's disagreement is a false
//     positive for this business; record an explicit override so scoring
//     proceeds against the originally selected industry anyway.
const overrideBodySchema = z.object({
  reviewer: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(1).max(2000),
  correctedIndustry: z.enum(INDUSTRY_SLUGS as [string, ...string[]]).optional(),
});

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsedId = auditIdParamSchema.safeParse(id);
  if (!parsedId.success) return NextResponse.json({ error: "Invalid audit id." }, { status: 400 });

  const body = await request.json().catch(() => null);
  const parsed = overrideBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 422 });

  const supabase = getSupabaseAdmin();
  const { data: audit, error } = await supabase.from("audits").select("id, status, blocked_reason, business_id").eq("id", parsedId.data).single();
  if (error || !audit) return NextResponse.json({ error: "Audit not found." }, { status: 404 });
  if (audit.status !== "failed" || audit.blocked_reason !== "industry_mismatch") {
    return NextResponse.json({ error: "This audit was not blocked by an industry mismatch." }, { status: 409 });
  }

  if (parsed.data.correctedIndustry) {
    await supabase.from("businesses").update({ industry: parsed.data.correctedIndustry }).eq("id", audit.business_id);
  } else {
    await supabase.from("industry_classifications").upsert(
      {
        audit_id: parsedId.data,
        override_status: "approved",
        override_reviewer: parsed.data.reviewer,
        override_reason: parsed.data.reason,
        override_at: new Date().toISOString(),
      },
      { onConflict: "audit_id" }
    );
  }

  await supabase
    .from("audits")
    .update({ status: "queued", current_stage: "queued", blocked_reason: null, error_message: null })
    .eq("id", parsedId.data);

  return NextResponse.json({ status: "queued" });
}
