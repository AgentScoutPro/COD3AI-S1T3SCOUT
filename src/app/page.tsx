import Link from "next/link";
import { INDUSTRY_TEMPLATES } from "@/lib/industry-templates";

const industries = Object.values(INDUSTRY_TEMPLATES);

export default function LandingPage() {
  return (
    <main className="flex-1">
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
            Local Authority Intelligence for Home Services
          </p>
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Know exactly why they are outranking you.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-secondary">
            S1T3SCOUT scans your website, Google Business Profile, reviews, service areas, and local competitors —
            then shows what&apos;s holding you back and what to fix first. Built specifically for HVAC, plumbing,
            roofing, electrical, and other home-service trades, not a generic SEO checker.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/audit"
              className="inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-accent/90"
            >
              Run a Scout Scan
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              View Sample Scorecard
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">No credit card. No account required.</p>
          <p className="mt-10 text-sm font-medium tracking-wide text-muted">Find the gaps. Own the map.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">Built for home-service trades</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {industries.map((industry) => (
            <div key={industry.slug} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
              {industry.label}
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 py-16 sm:grid-cols-3">
          <Feature
            title="Scored across 8 categories"
            body="Google Business Profile, technical foundation, service & location architecture, content, reviews, citations, competitive visibility, and conversion measurement."
          />
          <Feature
            title="Competitive Benchmark, not guesswork"
            body="See how your service and location pages, ratings, and review volume compare to 3-5 real local competitors — clearly labeled, never presented as an exact ranking."
          />
          <Feature
            title="Evidence for every finding"
            body="Every score is backed by a source URL or data point you can inspect — no vague summaries, no hidden failures."
          />
        </div>
      </section>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
