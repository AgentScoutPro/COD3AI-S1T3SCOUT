import { Card, CardHeader, CardBody } from "@/components/ui/card";
import type { ActionItem } from "@/lib/validation/report";

export function ActionPlan({
  thirtyDayPlan,
  sixtyDayPlan,
  ninetyDayPlan,
}: {
  thirtyDayPlan: ActionItem[];
  sixtyDayPlan: ActionItem[];
  ninetyDayPlan: ActionItem[];
}) {
  return (
    <Card className="print-break">
      <CardHeader title="30 / 60 / 90-Day Plan" subtitle="A sequenced path from today's findings to a stronger score." />
      <CardBody className="grid gap-6 sm:grid-cols-3">
        <PlanColumn title="First 30 Days" items={thirtyDayPlan} />
        <PlanColumn title="Days 31–60" items={sixtyDayPlan} />
        <PlanColumn title="Days 61–90" items={ninetyDayPlan} />
      </CardBody>
    </Card>
  );
}

function PlanColumn({ title, items }: { title: string; items: ActionItem[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold tracking-wide text-muted uppercase">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No items scheduled for this window.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item, i) => (
            <li key={i} className="rounded-lg border border-border bg-surface-raised p-3">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{item.description}</p>
              <p className="mt-1.5 text-xs text-muted">Effort: {item.effort}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
