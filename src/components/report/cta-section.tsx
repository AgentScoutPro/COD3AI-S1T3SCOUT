import { Card, CardBody } from "@/components/ui/card";

export function CtaSection() {
  return (
    <div className="no-print grid gap-4 sm:grid-cols-2">
      <Card>
        <CardBody>
          <h4 className="text-base font-semibold text-foreground">Connect Google for a deeper, verified audit</h4>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Link your Google Business Profile and Search Console to unlock verified rankings, real search queries,
            and ongoing monitoring. Coming soon.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 inline-flex cursor-not-allowed items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted"
          >
            Connect Google (coming soon)
          </button>
        </CardBody>
      </Card>
      <Card className="border-accent/30 bg-accent-soft">
        <CardBody>
          <h4 className="text-base font-semibold text-foreground">Book a Local Visibility Strategy Session</h4>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Walk through these findings with a Cod3AI strategist and leave with a prioritized plan for your team.
          </p>
          <a
            href="mailto:hello@cod3ai.com?subject=Local%20Visibility%20Strategy%20Session"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-accent/90"
          >
            Book a Strategy Session
          </a>
        </CardBody>
      </Card>
    </div>
  );
}
