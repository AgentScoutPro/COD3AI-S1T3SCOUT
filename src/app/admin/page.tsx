import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

// See dashboard/page.tsx — same reasoning: force dynamic rendering since
// this reads live data via the Supabase admin client, not `fetch`.
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "pass" | "critical" | "medium" | "neutral"> = {
  completed: "pass",
  failed: "critical",
  running: "medium",
  queued: "neutral",
  cancelled: "neutral",
};

export default async function AdminPage() {
  const supabase = getSupabaseAdmin();
  const { data: audits } = await supabase
    .from("audits")
    .select("id, status, current_stage, overall_score, confidence_score, error_message, scoring_version, created_at, business_id")
    .order("created_at", { ascending: false })
    .limit(100);

  const businessIds = [...new Set((audits ?? []).map((a) => a.business_id))];
  const { data: businesses } = businessIds.length
    ? await supabase.from("businesses").select("id, name, website_url, industry").in("id", businessIds)
    : { data: [] };
  const businessById = new Map((businesses ?? []).map((b) => [b.id, b]));

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">Internal</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Cod3AI Audit Management</h1>
        <p className="mt-2 text-sm text-muted">
          All audits across all businesses, including failed and in-progress runs. Not exposed to prospects.
        </p>

        <div className="mt-8 overflow-x-auto rounded-[14px] border border-border bg-surface">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Website</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Confidence</th>
                <th className="px-4 py-3 font-medium">Scoring Ver.</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(audits ?? []).map((audit) => {
                const business = businessById.get(audit.business_id);
                return (
                  <tr key={audit.id} className="border-b border-border/60 last:border-0 hover:bg-surface-raised">
                    <td className="px-4 py-3 font-medium text-foreground">{business?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{business?.website_url ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[audit.status] ?? "neutral"}>{audit.status}</Badge>
                      {audit.status === "failed" && audit.error_message && (
                        <p className="mt-1 max-w-[220px] truncate text-xs text-critical" title={audit.error_message}>
                          {audit.error_message}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{audit.current_stage}</td>
                    <td className="px-4 py-3 text-muted">{audit.overall_score ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{audit.confidence_score ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{audit.scoring_version}</td>
                    <td className="px-4 py-3 text-muted">{new Date(audit.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/audits/${audit.id}`} className="text-xs text-accent hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {(audits ?? []).length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted">
                    No audits yet.
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
