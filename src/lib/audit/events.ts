import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { AuditStage, EventStatus } from "@/lib/supabase/types";

export async function logEvent(
  auditId: string,
  stage: AuditStage | string,
  status: EventStatus,
  message?: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("audit_events").insert({
    audit_id: auditId,
    stage,
    status,
    message: message ?? null,
    metadata,
  });
}

export async function setStage(auditId: string, stage: AuditStage | string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("audits").update({ current_stage: stage }).eq("id", auditId);
}
