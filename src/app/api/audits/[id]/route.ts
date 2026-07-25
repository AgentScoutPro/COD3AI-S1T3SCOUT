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
  const { data: audit, error } = await supabase.from("audits").select("*").eq("id", parsedId.data).single();
  if (error || !audit) {
    return NextResponse.json({ error: "Audit not found." }, { status: 404 });
  }

  const { data: events } = await supabase
    .from("audit_events")
    .select("*")
    .eq("audit_id", parsedId.data)
    .order("created_at", { ascending: true });

  return NextResponse.json({ audit, events: events ?? [] });
}
