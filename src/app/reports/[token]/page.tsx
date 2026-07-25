import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { ReportJson } from "@/lib/report-json";
import { ReportHeader } from "@/components/report/report-header";
import { CategoryBreakdown } from "@/components/report/category-breakdown";
import { TopOpportunities } from "@/components/report/top-opportunities";
import { CompetitiveBenchmark } from "@/components/report/competitive-benchmark";
import { FindingsList } from "@/components/report/findings-list";
import { ActionPlan } from "@/components/report/action-plan";
import { CtaSection } from "@/components/report/cta-section";
import { PrintButton } from "@/components/report/print-button";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

async function getReport(token: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("reports").select("*").eq("public_token", token).single();
  return data;
}

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await getReport(token);
  if (!report) notFound();

  const data = report.report_json as unknown as ReportJson;

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto max-w-4xl space-y-10">
        <div className="no-print flex justify-end print:hidden">
          <PrintButton token={token} />
        </div>

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
        <CtaSection />
      </div>
    </main>
  );
}
