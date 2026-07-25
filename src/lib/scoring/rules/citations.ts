import type { ScoringRule } from "../types";
import { buildFinding, unknownFinding } from "../helpers";
import { normalizeBusinessName } from "@/lib/crawler/normalize";

const CATEGORY = "local_authority_citations" as const;

export const citationsRules: ScoringRule[] = [
  {
    id: "citations.nap_name_consistency",
    category: CATEGORY,
    evaluate: (ctx) => {
      if (!ctx.place) {
        return unknownFinding("citations.nap_name_consistency", CATEGORY, 3, "No Google Business Profile match to compare business name against.");
      }
      const siteName = normalizeBusinessName(ctx.business.name);
      const gbpName = normalizeBusinessName(ctx.place.name);
      const pass = siteName === gbpName || siteName.includes(gbpName) || gbpName.includes(siteName);
      return buildFinding({
        ruleId: "citations.nap_name_consistency",
        category: CATEGORY,
        pointsAvailable: 3,
        pointsEarnedRatio: pass ? 1 : 0.3,
        status: pass ? "pass" : "warning",
        severity: pass ? "informational" : "medium",
        explanation: pass
          ? "Business name is consistent between the audit intake and Google Business Profile."
          : `Business name differs between intake ("${ctx.business.name}") and Google Business Profile ("${ctx.place.name}").`,
        recommendation: pass ? undefined : "Standardize the exact business name across the website, GBP, and all directory listings.",
        confidence: 0.7,
        estimatedImpact: "medium",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "citations.directory_coverage",
    category: CATEGORY,
    evaluate: () =>
      unknownFinding(
        "citations.directory_coverage",
        CATEGORY,
        4,
        "Citation directory coverage (Yelp, BBB, industry directories, data aggregators) requires the citationProvider integration, which is Phase 3+ scaffolding not yet implemented. See CONNECTED_AUDIT_ROADMAP.md."
      ),
  },
  {
    id: "citations.data_aggregator_presence",
    category: CATEGORY,
    evaluate: () =>
      unknownFinding(
        "citations.data_aggregator_presence",
        CATEGORY,
        3,
        "Presence in core data aggregators (e.g. Data Axle, Foursquare) requires a connected citation-monitoring integration not built in this MVP pass."
      ),
  },
];
