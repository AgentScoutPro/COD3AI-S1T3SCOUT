import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { auditIdParamSchema } from "@/lib/validation/audit";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsedId = auditIdParamSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid audit id." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: report, error } = await supabase.from("reports").select("*").eq("audit_id", parsedId.data).single();
  if (error || !report) {
    return NextResponse.json({ error: "Report not found — audit may still be running." }, { status: 404 });
  }

  return NextResponse.json({ report });
}
