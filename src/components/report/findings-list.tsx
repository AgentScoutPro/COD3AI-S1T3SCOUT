"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS } from "@/lib/scoring/labels";
import type { RuleFinding } from "@/lib/scoring/types";

const STATUS_TONE: Record<string, "pass" | "critical" | "medium" | "neutral"> = {
  pass: "pass",
  fail: "critical",
  warning: "medium",
  unknown: "neutral",
};

const SEVERITY_TONE: Record<string, "critical" | "high" | "medium" | "low" | "informational"> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
  informational: "informational",
};

export function FindingsList({ findings }: { findings: RuleFinding[] }) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(findings.map((f) => f.category))], [findings]);

  const filtered = findings.filter(
    (f) =>
      (categoryFilter === "all" || f.category === categoryFilter) &&
      (severityFilter === "all" || f.severity === severityFilter) &&
      (statusFilter === "all" || f.status === statusFilter)
  );

  return (
    <Card className="print-break">
      <CardHeader title="All Findings" subtitle={`${filtered.length} of ${findings.length} findings shown.`} />
      <CardBody>
        <div className="no-print mb-6 flex flex-wrap gap-3">
          <Select label="Category" value={categoryFilter} onChange={setCategoryFilter}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c] ?? c}
              </option>
            ))}
          </Select>
          <Select label="Severity" value={severityFilter} onChange={setSeverityFilter}>
            <option value="all">All severities</option>
            {["critical", "high", "medium", "low", "informational"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select label="Status" value={statusFilter} onChange={setStatusFilter}>
            <option value="all">All statuses</option>
            {["pass", "warning", "fail", "unknown"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        <div className="divide-y divide-border">
          {filtered.map((f) => {
            const isOpen = expanded === f.ruleId;
            return (
              <div key={f.ruleId} className="py-4">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : f.ruleId)}
                  className="flex w-full items-start justify-between gap-4 text-left"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={STATUS_TONE[f.status]}>{f.status}</Badge>
                      <Badge tone={SEVERITY_TONE[f.severity]}>{f.severity}</Badge>
                      <span className="text-xs text-muted">{CATEGORY_LABELS[f.category] ?? f.category}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground">{f.explanation}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">{isOpen ? "Hide evidence" : "Show evidence"}</span>
                </button>

                {isOpen && (
                  <div className="mt-3 rounded-lg border border-border bg-surface-raised p-4 text-sm">
                    {f.recommendation && (
                      <p className="text-foreground">
                        <span className="font-medium">Recommendation:</span> {f.recommendation}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted">
                      Points: {f.pointsEarned}/{f.pointsAvailable} · Confidence: {Math.round(f.confidence * 100)}%
                    </p>
                    {f.sourceUrls.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted uppercase">Source URLs</p>
                        <ul className="mt-1 space-y-1">
                          {f.sourceUrls.map((url) => (
                            <li key={url}>
                              <a href={url} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                                {url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Object.keys(f.evidence).length > 0 && (
                      <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-xs text-muted">
                        {JSON.stringify(f.evidence, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="text-xs text-muted">
      <span className="mb-1 block">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent"
      >
        {children}
      </select>
    </label>
  );
}
