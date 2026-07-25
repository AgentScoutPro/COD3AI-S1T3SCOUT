import { Card, CardHeader, CardBody } from "@/components/ui/card";
import type { PlaceRecord } from "@/lib/providers/types";

export function CompetitiveBenchmark({ competitors }: { competitors: PlaceRecord[] }) {
  return (
    <Card className="print-break">
      <CardHeader
        title="Competitive Benchmark"
        subtitle="Local businesses in the same category and city, via Google Places. This is a benchmark, not an exact ranking."
      />
      <CardBody>
        {competitors.length === 0 ? (
          <p className="text-sm text-muted">No competitive benchmark data was available for this audit.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs tracking-wide text-muted uppercase">
                  <th className="pb-2 pr-4 font-medium">Business</th>
                  <th className="pb-2 pr-4 font-medium">Rating</th>
                  <th className="pb-2 pr-4 font-medium">Reviews</th>
                  <th className="pb-2 font-medium">Website</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((c) => (
                  <tr key={c.placeId} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pr-4 text-foreground">{c.name}</td>
                    <td className="py-3 pr-4 text-muted">{c.rating ? `${c.rating.toFixed(1)} ★` : "—"}</td>
                    <td className="py-3 pr-4 text-muted">{c.userRatingCount ?? "—"}</td>
                    <td className="py-3 text-muted">{c.websiteUri ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-muted">
          Review counts and ratings reflect a public API snapshot at the time of this audit, not a live or complete
          history.
        </p>
      </CardBody>
    </Card>
  );
}
