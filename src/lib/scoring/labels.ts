import type { ScoringCategory } from "./types";

// Keyed by ScoringCategory but typed as Record<string, string> so lookups
// from persisted rows (where category comes back as a plain string) don't
// need casts.
export const CATEGORY_LABELS: Record<string, string> = {
  google_business_profile: "Google Business Profile",
  technical_foundation: "Technical Foundation",
  service_location_architecture: "Service & Location Pages",
  local_content_relevance: "Local Content Relevance",
  reviews_reputation: "Reviews & Reputation",
  local_authority_citations: "Local Authority & Citations",
  competitive_visibility: "Competitive Visibility",
  conversion_measurement: "Conversion Measurement",
} satisfies Record<ScoringCategory, string>;
