"use client";

export function PrintButton({ token }: { token: string }) {
  return (
    <a
      href={`/api/reports/${token}/pdf`}
      className="rounded-full border border-border bg-surface-raised px-4 py-2 text-xs font-medium text-foreground transition hover:border-accent hover:text-accent"
    >
      Download PDF
    </a>
  );
}
