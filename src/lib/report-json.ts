import type { ScoringResult } from "@/lib/scoring/types";
import type { AiReportOutput } from "@/lib/validation/report";
import type { PlaceRecord } from "@/lib/providers/types";
import type { AuditMode } from "@/lib/supabase/types";

export interface ReportJson {
  business: {
    name: string;
    websiteUrl: string;
    industry: string;
    city: string;
    state: string;
  };
  auditMode: AuditMode;
  scoring: ScoringResult;
  classification: { band: string; label: string };
  competitors: PlaceRecord[];
  report: AiReportOutput;
  generatedAt: string;
}
