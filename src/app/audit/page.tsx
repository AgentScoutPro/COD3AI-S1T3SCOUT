import { AuditIntakeForm } from "@/components/audit/intake-form";

export default function AuditIntakePage() {
  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto max-w-xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">Run a Scout Scan</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
          Find the gaps in your local authority
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-secondary">
          We&apos;ll crawl your public website, cross-reference your Google Business Profile, and benchmark you
          against local competitors. This does not scrape Google Search or Maps results — everything is sourced
          from your own site and official Google APIs.
        </p>
        <div className="mt-10">
          <AuditIntakeForm />
        </div>
      </div>
    </main>
  );
}
