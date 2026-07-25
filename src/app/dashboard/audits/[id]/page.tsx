import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { ReportJson } from "@/lib/report-json";
import { ReportHeader } from "@/components/report/report-header";
import { CategoryBreakdown } from "@/components/report/category-breakdown";
import { TopOpportunities } from "@/components/report/top-opportunities";
import { CompetitiveBenchmark } from "@/components/report/competitive-benchmark";
import { FindingsList } from "@/components/report/findings-list";
import { ActionPlan } from "@/components/report/action-plan";

export default async function DashboardAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: audit } = await supabase.from("audits").select("*").eq("id", id).single();
  if (!audit) notFound();

  const { data: report } = await supabase.from("reports").select("*").eq("audit_id", id).single();

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto max-w-4xl space-y-10">
        <Link href="/dashboard" className="text-xs text-muted hover:text-foreground">
          ← Back to dashboard
        </Link>

        {!report ? (
          <div className="rounded-[14px] border border-border bg-surface p-8 text-sm text-muted">
            This audit is <span className="font-medium text-foreground">{audit.status}</span>
            {audit.status === "running" && ` (currently on: ${audit.current_stage})`}
            {audit.status === "failed" && audit.error_message && ` — ${audit.error_message}`}. No report is available
            yet.
          </div>
        ) : (
          <ReportView reportJson={report.report_json as unknown as ReportJson} publicToken={report.public_token} />
        )}
      </div>
    </main>
  );
}

function ReportView({ reportJson, publicToken }: { reportJson: ReportJson; publicToken: string }) {
  return (
    <div className="space-y-10">
      <ReportHeader data={reportJson} />
      <p className="text-xs text-muted">
        Public link:{" "}
        <Link href={`/reports/${publicToken}`} className="text-accent hover:underline">
          /reports/{publicToken}
        </Link>
      </p>
      <CategoryBreakdown categories={reportJson.scoring.categories} />
      <TopOpportunities opportunities={reportJson.report.topOpportunities} />
      <CompetitiveBenchmark competitors={reportJson.competitors} />
      <FindingsList findings={reportJson.scoring.findings} />
      <ActionPlan
        thirtyDayPlan={reportJson.report.thirtyDayPlan}
        sixtyDayPlan={reportJson.report.sixtyDayPlan}
        ninetyDayPlan={reportJson.report.ninetyDayPlan}
      />
    </div>
  );
}
