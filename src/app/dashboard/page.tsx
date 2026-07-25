import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

// This page reads live audit data via the Supabase admin client (not
// `fetch`), so Next.js has no signal to render it dynamically on its own —
// without this it gets prerendered once at build time and never updates.
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "pass" | "critical" | "medium" | "neutral"> = {
  completed: "pass",
  failed: "critical",
  running: "medium",
  queued: "neutral",
  cancelled: "neutral",
};

export default async function DashboardPage() {
  const supabase = getSupabaseAdmin();
  const { data: audits } = await supabase
    .from("audits")
    .select("id, status, overall_score, current_stage, created_at, business_id")
    .order("created_at", { ascending: false })
    .limit(50);

  const businessIds = [...new Set((audits ?? []).map((a) => a.business_id))];
  const { data: businesses } = businessIds.length
    ? await supabase.from("businesses").select("id, name, industry, city, state").in("id", businessIds)
    : { data: [] };
  const businessById = new Map((businesses ?? []).map((b) => [b.id, b]));

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">Dashboard</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Audits</h1>
        <p className="mt-2 text-sm text-muted">
          This view is not yet gated by organization auth in the MVP pass — see README for the auth roadmap.
        </p>

        <div className="mt-8 overflow-x-auto rounded-[14px] border border-border bg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs tracking-wide text-muted uppercase">
                <th className="px-6 py-3 font-medium">Business</th>
                <th className="px-6 py-3 font-medium">Industry</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Score</th>
                <th className="px-6 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {(audits ?? []).map((audit) => {
                const business = businessById.get(audit.business_id);
                return (
                  <tr key={audit.id} className="border-b border-border/60 last:border-0 hover:bg-surface-raised">
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/audits/${audit.id}`} className="font-medium text-foreground hover:text-accent">
                        {business?.name ?? "Unknown business"}
                      </Link>
                      <p className="text-xs text-muted">
                        {business?.city}, {business?.state}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-muted">{business?.industry ?? "—"}</td>
                    <td className="px-6 py-4">
                      <Badge tone={STATUS_TONE[audit.status] ?? "neutral"}>{audit.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-muted">{audit.overall_score ?? "—"}</td>
                    <td className="px-6 py-4 text-muted">{new Date(audit.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
              {(audits ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted">
                    No audits yet. Run one from the <Link href="/audit" className="text-accent hover:underline">public intake form</Link>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
