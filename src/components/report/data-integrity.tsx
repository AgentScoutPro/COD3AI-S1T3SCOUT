import { Badge } from "@/components/ui/badge";
import type { IntegritySummary } from "@/lib/audit/integrity-summary";

const SOURCE_LABELS: Record<string, string> = {
  website: "Website Crawl",
  places: "Google Business Profile",
  pagespeed: "PageSpeed Insights",
  ai_report: "AI Report Narrative",
  crm: "CRM Handoff",
};

export function DataIntegritySection({ summary }: { summary: IntegritySummary }) {
  return (
    <div className="rounded-[14px] border border-border bg-surface p-6">
      <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">Data Integrity</h2>
      <p className="mt-2 text-xs text-muted">
        Exactly what this report is based on — every category below reflects the actual provenance of the data used,
        not just whether a score was produced.
      </p>

      <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <IntegrityRow label="Audit mode">
          <Badge tone={summary.auditMode === "public_live" || summary.auditMode === "connected_client" ? "accent" : "medium"}>
            {summary.auditMode.replace("_", " ")}
          </Badge>
        </IntegrityRow>
        <IntegrityRow label="Approval status">
          <Badge tone={summary.reviewStatus === "approved" || summary.reviewStatus === "published" || summary.reviewStatus === "not_required" ? "pass" : "medium"}>
            {summary.reviewStatus.replace("_", " ")}
          </Badge>
        </IntegrityRow>
        <IntegrityRow label="Selected category">
          <span className="text-foreground">{summary.selectedIndustry}</span>
          <span className="ml-2 text-muted">({Math.round(summary.selectedIndustryConfidence)}% confidence)</span>
        </IntegrityRow>
        <IntegrityRow label="Detected category">
          <span className="text-foreground">{summary.detectedIndustry ?? "—"}</span>
          <span className="ml-2 text-muted">({Math.round(summary.detectedIndustryConfidence)}% confidence)</span>
        </IntegrityRow>
        <IntegrityRow label="Entity confidence">
          <Badge tone={summary.entityVerificationStatus === "verified" ? "pass" : "medium"}>{summary.entityVerificationStatus.replace("_", " ")}</Badge>
          <span className="ml-2 text-muted">({Math.round(summary.entityConfidence)}%)</span>
        </IntegrityRow>
        <IntegrityRow label="Manual overrides">
          <span className="text-foreground">{summary.industryOverridden ? "Yes — industry classification overridden by an admin" : "None"}</span>
        </IntegrityRow>
      </dl>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SourceList title="Live / Connected" tone="pass" sources={[...summary.providersLive, ...summary.providersConnected]} />
        <SourceList title="Unavailable" tone="medium" sources={summary.providersUnavailable} />
        {summary.providersDemoSynthetic.length > 0 && (
          <SourceList title="Demo / Synthetic" tone="critical" sources={summary.providersDemoSynthetic} />
        )}
      </div>

      {summary.integrityWarnings.length > 0 && (
        <div className="mt-6 rounded-lg border border-critical/30 bg-critical/10 px-4 py-3 text-xs text-critical">
          <p className="font-medium">Integrity warnings raised during this audit:</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            {summary.integrityWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function IntegrityRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

function SourceList({ title, tone, sources }: { title: string; tone: "pass" | "medium" | "critical"; sources: string[] }) {
  if (sources.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {sources.map((s) => (
          <Badge key={s} tone={tone}>
            {SOURCE_LABELS[s] ?? s}
          </Badge>
        ))}
      </div>
    </div>
  );
}
