// The "AuthorityGauge" per the brand kit's component_names — the report's
// signature element. Band keys/thresholds stay the build spec's original
// 5-band system (see SCORING_MODEL.md) — the brand kit's own 4-band
// language (Critical/At Risk/Competitive/Dominant) belongs to a different,
// not-yet-built scoring model (see CONNECTED_AUDIT_ROADMAP.md) and isn't
// applied here. Only the colors are drawn from the official brand palette,
// ascending in quality (critical -> warning -> opportunity -> success ->
// authority_gold) — "authority_ready" landing on "authority" gold is a
// deliberate, literal match.
const BAND_TONE: Record<string, string> = {
  critical: "text-critical border-critical/40",
  weak: "text-warning border-warning/40",
  competitive_inconsistent: "text-opportunity border-opportunity/40",
  strong: "text-success border-success/40",
  authority_ready: "text-authority border-authority/50",
};

export function ScoreBand({
  score,
  band,
  label,
}: {
  score: number;
  band: string;
  label: string;
}) {
  return (
    <div
      className={`inline-flex flex-col items-center rounded-[22px] border-2 px-8 py-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)] ${BAND_TONE[band] ?? "text-foreground border-border"}`}
    >
      <span className="font-mono text-5xl font-semibold tabular-nums">{Math.round(score)}</span>
      <span className="mt-1 text-xs tracking-wide text-muted">/ 100</span>
      <span className="mt-3 text-sm font-medium tracking-wide uppercase">{label}</span>
    </div>
  );
}
