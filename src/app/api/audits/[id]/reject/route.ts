import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { auditIdParamSchema } from "@/lib/validation/audit";

const rejectBodySchema = z.object({
  reviewer: z.string().trim().min(1).max(120),
  notes: z.string().trim().min(1).max(2000),
});

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsedId = auditIdParamSchema.safeParse(id);
  if (!parsedId.success) return NextResponse.json({ error: "Invalid audit id." }, { status: 400 });

  const body = await request.json().catch(() => null);
  const parsed = rejectBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 422 });

  const supabase = getSupabaseAdmin();
  const { data: audit, error } = await supabase.from("audits").select("id, status").eq("id", parsedId.data).single();
  if (error || !audit) return NextResponse.json({ error: "Audit not found." }, { status: 404 });

  await supabase
    .from("audits")
    .update({
      review_status: "rejected",
      reviewed_by: parsed.data.reviewer,
      reviewed_at: new Date().toISOString(),
      review_notes: parsed.data.notes,
    })
    .eq("id", parsedId.data);

  return NextResponse.json({ status: "rejected" });
}
