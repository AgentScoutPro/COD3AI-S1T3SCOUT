import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { ReportJson } from "@/lib/report-json";
import { buildIntegritySummary } from "@/lib/audit/integrity-summary";
import { canPublishReport } from "@/lib/audit/approval-gate";
import { ReportHeader } from "@/components/report/report-header";
import { CategoryBreakdown } from "@/components/report/category-breakdown";
import { TopOpportunities } from "@/components/report/top-opportunities";
import { CompetitiveBenchmark } from "@/components/report/competitive-benchmark";
import { FindingsList } from "@/components/report/findings-list";
import { ActionPlan } from "@/components/report/action-plan";
import { CtaSection } from "@/components/report/cta-section";
import { PrintButton } from "@/components/report/print-button";
import { DataIntegritySection } from "@/components/report/data-integrity";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

async function getReportBundle(token: string) {
  const supabase = getSupabaseAdmin();
  const { data: report } = await supabase.from("reports").select("*").eq("public_token", token).single();
  if (!report) return null;

  const { data: audit } = await supabase.from("audits").select("*").eq("id", report.audit_id).single();
  if (!audit) return null;

  const { data: business } = await supabase.from("businesses").select("*").eq("id", audit.business_id).single();
  if (!business) return null;

  const summary = await buildIntegritySummary(supabase, audit.id, audit, business);
  return { report, audit, summary };
}

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const bundle = await getReportBundle(token);
  if (!bundle) notFound();
  const { audit, summary } = bundle;

  // §7: public_live/connected_client reports must not be publicly viewable
  // until a human has approved them — this is enforced here, not just by
  // hiding a UI element, so knowing the token alone can't bypass it.
  if (!canPublishReport(audit.audit_mode, audit.review_status)) {
    return (
      <main className="flex-1 px-6 py-24">
        <div className="mx-auto max-w-md text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">Pending Review</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">This report isn&apos;t published yet</h1>
          <p className="mt-3 text-sm text-muted">
            This audit is awaiting internal approval before it can be shared publicly. Check back soon, or contact
            whoever sent you this link.
          </p>
        </div>
      </main>
    );
  }

  const data = bundle.report.report_json as unknown as ReportJson;

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto max-w-4xl space-y-10">
        <div className="no-print flex justify-end print:hidden">
          <PrintButton token={token} />
        </div>

        {data.auditMode === "demo" && (
          <div className="rounded-lg border-2 border-critical bg-critical/15 px-4 py-3 text-center text-sm font-semibold tracking-wide text-critical uppercase">
            Demo / Synthetic Data — not a real audit
          </div>
        )}

        <ReportHeader data={data} />

        {data.report.limitations.length > 0 && (
          <p className="rounded-lg border border-border bg-surface px-4 py-3 text-xs text-muted">
            <span className="font-medium text-foreground">Data limitations: </span>
            {data.report.limitations.join(" ")}
          </p>
        )}

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">Executive Summary</h2>
          <p className="mt-3 text-base leading-relaxed text-muted">{data.report.executiveSummary}</p>
        </div>

        <CategoryBreakdown categories={data.scoring.categories} />
        <TopOpportunities opportunities={data.report.topOpportunities} />
        <CompetitiveBenchmark competitors={data.competitors} />
        <FindingsList findings={data.scoring.findings} />
        <ActionPlan
          thirtyDayPlan={data.report.thirtyDayPlan}
          sixtyDayPlan={data.report.sixtyDayPlan}
          ninetyDayPlan={data.report.ninetyDayPlan}
        />
        <DataIntegritySection summary={summary} />
        <CtaSection />
      </div>
    </main>
  );
}
