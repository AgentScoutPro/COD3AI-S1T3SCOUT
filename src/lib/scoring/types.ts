import type { Severity, ImpactEffort } from "@/lib/supabase/types";
import type { CrawledPageResult, PlaceRecord, PageSpeedMetrics } from "@/lib/providers/types";
import type { IndustryTemplate } from "@/lib/industry-templates/types";

export const SCORING_VERSION = "1.0.0";

export const CATEGORY_WEIGHTS = {
  google_business_profile: 20,
  technical_foundation: 15,
  service_location_architecture: 15,
  local_content_relevance: 10,
  reviews_reputation: 15,
  local_authority_citations: 10,
  competitive_visibility: 10,
  conversion_measurement: 5,
} as const;

export type ScoringCategory = keyof typeof CATEGORY_WEIGHTS;

export const CATEGORY_ORDER = Object.keys(CATEGORY_WEIGHTS) as ScoringCategory[];

/** Context handed to every rule. Any field may be null/empty when a data
 * source wasn't available — rules must resolve to `unknown` rather than
 * failing/zeroing in that case. */
export interface RuleContext {
  business: {
    name: string;
    normalizedDomain: string;
    industry: string;
    city: string;
    state: string;
  };
  template: IndustryTemplate;
  pages: CrawledPageResult[];
  homepage: CrawledPageResult | null;
  crawlMeta: {
    robotsAllowed: boolean;
    robotsTxtFound: boolean;
    sitemapsFound: string[];
    crawlCapped: boolean;
  };
  place: PlaceRecord | null;
  placesConfigured: boolean;
  pageSpeed: PageSpeedMetrics[];
  pageSpeedConfigured: boolean;
  competitors: PlaceRecord[];
  competitorPages: Record<string, CrawledPageResult[]>;
}

export interface RuleFinding {
  ruleId: string;
  category: ScoringCategory;
  status: "pass" | "warning" | "fail" | "unknown";
  severity: Severity;
  pointsAvailable: number;
  pointsEarned: number;
  evidence: Record<string, unknown>;
  sourceUrls: string[];
  explanation: string;
  recommendation?: string;
  estimatedImpact?: ImpactEffort;
  estimatedEffort?: ImpactEffort;
  /** 0-1. Lower confidence for rules relying on partial/unavailable data. */
  confidence: number;
}

export interface ScoringRule {
  id: string;
  category: ScoringCategory;
  evaluate(ctx: RuleContext): RuleFinding;
}

export interface CategoryScoreResult {
  category: ScoringCategory;
  weight: number;
  earnedPoints: number;
  availablePoints: number;
  categoryPercentage: number;
  weightedScore: number;
  confidence: number;
}

export interface ScoringResult {
  scoringVersion: string;
  overallScore: number;
  confidenceScore: number;
  categories: CategoryScoreResult[];
  findings: RuleFinding[];
}
