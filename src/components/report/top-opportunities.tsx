import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Opportunity } from "@/lib/validation/report";

const PRIORITY_TONE = { high: "critical", medium: "medium", low: "low" } as const;

export function TopOpportunities({ opportunities }: { opportunities: Opportunity[] }) {
  return (
    <Card className="print-break">
      <CardHeader title="Top Opportunities" subtitle="Prioritized by expected impact on local search authority." />
      <CardBody className="space-y-6">
        {opportunities.slice(0, 5).map((opp, i) => (
          <div key={i} className={i > 0 ? "border-t border-border pt-6" : ""}>
            <div className="flex items-center gap-2">
              <Badge tone={PRIORITY_TONE[opp.priority]}>{opp.priority} priority</Badge>
              <span className="text-xs text-muted">
                Impact: {opp.expectedImpact} · Effort: {opp.effort}
              </span>
            </div>
            <h4 className="mt-2 text-base font-semibold text-foreground">{opp.title}</h4>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{opp.problem}</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              <span className="font-medium">Recommended:</span> {opp.recommendedAction}
            </p>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
