"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { INDUSTRY_TEMPLATES } from "@/lib/industry-templates";

const industries = Object.values(INDUSTRY_TEMPLATES);

/** The admin review gate's action panel — approve/reject a completed
 * needs_review audit, or override an industry-mismatch block. There is no
 * admin auth system in this codebase yet, so `reviewer` is a free-text
 * identifier the operator types in, not a verified account. This is a
 * documented, intentional scoping decision (see the completion report),
 * not an oversight — the alternative (silently skipping the review step
 * entirely) is worse. */
export function ReviewActions({
  auditId,
  status,
  blockedReason,
  reviewStatus,
}: {
  auditId: string;
  status: string;
  blockedReason: string | null;
  reviewStatus: string;
}) {
  const router = useRouter();
  const [reviewer, setReviewer] = useState("");
  const [notes, setNotes] = useState("");
  const [correctedIndustry, setCorrectedIndustry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(path: string, body: Record<string, unknown>) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/audits/${auditId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ? JSON.stringify(body.error) : "Request failed.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "failed" && blockedReason === "industry_mismatch") {
    return (
      <div className="rounded-[14px] border border-critical/30 bg-critical/10 p-6">
        <p className="text-sm font-semibold text-critical">Blocked: industry mismatch</p>
        <p className="mt-1 text-xs text-muted">
          Either correct the selected industry (re-runs detection automatically, no override needed) or record an
          explicit override to proceed with the original selection anyway.
        </p>
        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            placeholder="Reviewer name"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
          />
          <select
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            value={correctedIndustry}
            onChange={(e) => setCorrectedIndustry(e.target.value)}
          >
            <option value="">— No correction (override instead) —</option>
            {industries.map((i) => (
              <option key={i.slug} value={i.slug}>
                Correct to: {i.label}
              </option>
            ))}
          </select>
          <textarea
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            placeholder="Reason (required if overriding without a correction)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
          {error && <p className="text-xs text-critical">{error}</p>}
          <Button
            type="button"
            disabled={submitting || !reviewer || (!correctedIndustry && !notes)}
            onClick={() =>
              post("override-industry", {
                reviewer,
                reason: notes || "Industry correction applied.",
                ...(correctedIndustry ? { correctedIndustry } : {}),
              })
            }
          >
            {correctedIndustry ? "Apply correction & re-queue" : "Record override & re-queue"}
          </Button>
        </div>
      </div>
    );
  }

  if (status === "completed" && reviewStatus === "needs_review") {
    return (
      <div className="rounded-[14px] border border-border bg-surface p-6">
        <p className="text-sm font-semibold text-foreground">Pending approval</p>
        <p className="mt-1 text-xs text-muted">
          This is a public_live audit — it cannot be publicly viewed, PDF-exported, or sent to the CRM until approved.
        </p>
        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            placeholder="Reviewer name"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
          />
          <textarea
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            placeholder="Notes (optional for approve, required for reject)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
          {error && <p className="text-xs text-critical">{error}</p>}
          <div className="flex gap-3">
            <Button type="button" disabled={submitting || !reviewer} onClick={() => post("approve", { reviewer, notes: notes || undefined })}>
              Approve & Publish
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={submitting || !reviewer || !notes}
              onClick={() => post("reject", { reviewer, notes })}
            >
              Reject
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <p className="text-xs text-muted">
      Review status: <span className="font-medium text-foreground">{reviewStatus.replace("_", " ")}</span>
    </p>
  );
}
