import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/lib/scoring/labels";
import type { CategoryScoreResult } from "@/lib/scoring/types";

export function CategoryBreakdown({ categories }: { categories: CategoryScoreResult[] }) {
  const sorted = [...categories].sort((a, b) => b.weight - a.weight);

  return (
    <Card className="print-break">
      <CardHeader title="Category Breakdown" subtitle="Weighted by impact on overall local search authority." />
      <CardBody className="space-y-5">
        {sorted.map((c) => (
          <div key={c.category}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{CATEGORY_LABELS[c.category]}</span>
              <span className="text-muted">
                {Math.round(c.categoryPercentage)}%{" "}
                <span className="text-xs">({c.weightedScore.toFixed(1)} / {c.weight} pts)</span>
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(100, Math.max(0, c.categoryPercentage))}%` }}
              />
            </div>
            {c.confidence < 80 && (
              <p className="mt-1 text-xs text-muted">
                {Math.round(c.confidence)}% confidence — some data in this category was unavailable.
              </p>
            )}
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
