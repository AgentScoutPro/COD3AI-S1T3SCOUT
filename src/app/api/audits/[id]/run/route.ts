import { NextResponse, after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { auditIdParamSchema } from "@/lib/validation/audit";
import { runAudit } from "@/lib/audit/orchestrator";

// Long-running: crawling + Places + PageSpeed + AI generation can take
// well past a default serverless timeout. Raise per platform limits as
// needed (see README "Deployment" section for Vercel plan constraints).
export const maxDuration = 300;

// Fires the (potentially multi-second) audit pipeline and returns
// immediately with 202 — the client polls GET /api/audits/[id] for
// real, persisted stage progress rather than waiting on this request.
// `after()` keeps the pipeline running past the response on serverless
// platforms that would otherwise freeze/kill the function once it returns.
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsedId = auditIdParamSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid audit id." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: audit, error } = await supabase.from("audits").select("id, status").eq("id", parsedId.data).single();
  if (error || !audit) {
    return NextResponse.json({ error: "Audit not found." }, { status: 404 });
  }
  if (audit.status !== "queued") {
    return NextResponse.json({ error: `Audit is already ${audit.status}.` }, { status: 409 });
  }

  after(() =>
    runAudit(parsedId.data).catch((err) => {
      console.error(`Audit ${parsedId.data} failed:`, err);
    })
  );

  return NextResponse.json({ status: "running" }, { status: 202 });
}
