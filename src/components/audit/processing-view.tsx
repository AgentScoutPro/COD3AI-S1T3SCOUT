"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AUDIT_STAGES, type Audit, type AuditEvent } from "@/lib/supabase/types";

// Brand kit "scan progress language" where it maps to a real stage; kept
// functional/plain where the brand kit doesn't have an exact match rather
// than force a phrase onto a stage that doesn't do that (e.g. "Reading
// Search Console performance" — not implemented, so not claimed here).
const STAGE_LABELS: Record<string, string> = {
  queued: "Queued",
  resolving_business: "Mapping the business footprint",
  discovering_website: "Discovering website & sitemaps",
  crawling_pages: "Crawling service and location architecture",
  analyzing_website: "Analyzing technical & content signals",
  validating_industry: "Validating industry against site content",
  retrieving_places: "Verifying Google Business Profile signals",
  retrieving_pagespeed: "Measuring page speed",
  benchmarking_competitors: "Comparing the local competitor field",
  calculating_score: "Calculating local authority score",
  generating_action_plan: "Building the mission queue",
  generating_report: "Assembling report",
  completed: "Complete",
};

const VISIBLE_STAGES = AUDIT_STAGES.filter((s) => s !== "queued" && s !== "completed");

export function ProcessingView({ auditId }: { auditId: string }) {
  const router = useRouter();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [pollError, setPollError] = useState<string | null>(null);
  const redirected = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/audits/${auditId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load audit status.");
        const data = await res.json();
        if (cancelled) return;
        setAudit(data.audit);
        setEvents(data.events);
        setPollError(null);

        if (data.audit.status === "completed" && !redirected.current) {
          redirected.current = true;
          const reportRes = await fetch(`/api/audits/${auditId}/report`, { cache: "no-store" });
          if (reportRes.ok) {
            const { report } = await reportRes.json();
            router.push(`/reports/${report.public_token}`);
          }
        }
      } catch {
        if (!cancelled) setPollError("Having trouble reaching the audit — retrying…");
      }
    }

    poll();
    const interval = setInterval(poll, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [auditId, router]);

  const completedStages = new Set(events.filter((e) => e.status === "completed").map((e) => e.stage));
  const failedEvent = events.find((e) => e.status === "failed");
  const currentStage = audit?.current_stage ?? "queued";

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">Scout Scan Running</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
        Scouting your local search authority
      </h1>
      <p className="mt-3 text-sm text-muted">
        This usually takes a minute or two. You can leave this page open — it will redirect automatically when your
        report is ready.
      </p>

      {failedEvent && audit?.status === "failed" && (
        <div className="mt-8 rounded-lg border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-critical">
          The audit failed during &quot;{STAGE_LABELS[failedEvent.stage] ?? failedEvent.stage}&quot;
          {failedEvent.message ? `: ${failedEvent.message}` : "."} Please try again or contact support.
        </div>
      )}
      {pollError && <p className="mt-4 text-xs text-muted">{pollError}</p>}

      <ol className="mt-10 space-y-3">
        {VISIBLE_STAGES.map((stage) => {
          const isDone = completedStages.has(stage);
          const isActive = currentStage === stage && !isDone;
          return (
            <li
              key={stage}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                isDone
                  ? "border-success/30 bg-success/10 text-success"
                  : isActive
                    ? "border-accent/40 bg-accent-soft text-foreground"
                    : "border-border bg-surface text-muted"
              }`}
            >
              <StageIcon done={isDone} active={isActive} />
              <span>{STAGE_LABELS[stage]}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StageIcon({ done, active }: { done: boolean; active: boolean }) {
  if (done) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-background text-xs">
        ✓
      </span>
    );
  }
  if (active) {
    return <span className="h-5 w-5 shrink-0 animate-pulse rounded-full border-2 border-accent" />;
  }
  return <span className="h-5 w-5 shrink-0 rounded-full border-2 border-border" />;
}
