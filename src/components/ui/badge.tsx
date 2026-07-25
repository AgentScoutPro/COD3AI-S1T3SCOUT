import type { ReactNode } from "react";

// Mapped onto the brand kit's four official status colors only
// (critical/warning/success/opportunity) — high and medium share
// "warning" by design, distinguished by their label text.
const TONE_CLASSES: Record<string, string> = {
  critical: "bg-critical/15 text-critical border-critical/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-opportunity/15 text-opportunity border-opportunity/30",
  informational: "bg-border text-muted border-border",
  pass: "bg-success/15 text-success border-success/30",
  neutral: "bg-surface-raised text-muted border-border",
  accent: "bg-accent-soft text-accent border-accent/30",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONE_CLASSES; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
