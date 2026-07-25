import { Badge } from "@/components/ui/badge";
import { ScoreBand } from "./score-band";
import type { ReportJson } from "@/lib/report-json";

export function ReportHeader({ data }: { data: ReportJson }) {
  const { business, scoring, classification } = data;

  return (
    <div className="flex flex-col gap-8 border-b border-border pb-10 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Badge tone="accent">Public Audit</Badge>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground">{business.name}</h1>
        <p className="mt-2 text-sm text-muted">
          {business.websiteUrl.replace(/^https?:\/\//, "")} · {business.city}, {business.state}
        </p>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-secondary">{data.report.scoreExplanation}</p>
        <p className="mt-4 text-xs text-muted">
          Data confidence: <span className="font-medium text-foreground">{Math.round(scoring.confidenceScore)}%</span> — lower
          confidence means some data sources weren&apos;t available, not that the business scored poorly there.
        </p>
      </div>
      <ScoreBand score={scoring.overallScore} band={classification.band} label={classification.label} />
    </div>
  );
}
