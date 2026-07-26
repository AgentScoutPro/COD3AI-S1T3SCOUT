// Pure gating rules for the human-approval workflow (§7 of
// artifacts/platform-audit-root-cause.md's companion fix plan). Shared by
// the public report page, the PDF export route, and the orchestrator's
// CRM-handoff decision so the three surfaces can't drift out of sync —
// and so this is unit-testable without a database.

import type { AuditMode, ReviewStatus } from "@/lib/supabase/types";

const APPROVAL_REQUIRED_MODES: readonly AuditMode[] = ["public_live", "connected_client"];
const VISIBLE_REVIEW_STATUSES: readonly ReviewStatus[] = ["not_required", "approved", "published"];

export function requiresApproval(auditMode: AuditMode): boolean {
  return APPROVAL_REQUIRED_MODES.includes(auditMode);
}

/** Governs the public report page, PDF export, and CRM handoff alike —
 * nothing about this audit's output may reach an outside party until it's
 * approved (or its mode never required approval in the first place). */
export function canPublishReport(auditMode: AuditMode, reviewStatus: ReviewStatus): boolean {
  if (!requiresApproval(auditMode)) return true;
  return VISIBLE_REVIEW_STATUSES.includes(reviewStatus);
}

export const canExportPdf = canPublishReport;
export const canHandoffToCrm = canPublishReport;
