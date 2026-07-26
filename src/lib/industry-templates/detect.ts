// Platform-wide industry detection. Runs the crawled website against every
// registered template's discriminating keyword signals and compares the
// strongest match to the operator-selected industry — see
// artifacts/platform-audit-root-cause.md §1: the selected industry was
// previously trusted with zero validation and drove classification,
// scoring, and the competitor-search query itself.
//
// New industry templates automatically participate: this iterates
// `INDUSTRY_TEMPLATES`, so nothing here is per-industry-conditional.

import type { CrawledPageResult } from "@/lib/providers/types";
import type { IndustryMatchScore } from "@/lib/supabase/types";
import { INDUSTRY_TEMPLATES } from "./index";

export interface IndustryDetectionResult {
  detectedIndustry: string | null;
  detectedConfidence: number; // 0-100, share of total keyword matches held by the top template
  selectedConfidence: number; // 0-100, share of total keyword matches held by the selected template
  scores: IndustryMatchScore[];
  supportingEvidence: string[]; // keywords matched for the selected industry
  contradictingEvidence: string[]; // keywords matched for the detected industry, when it differs from selected
  mismatch: boolean;
  mismatchReason: "no_evidence" | "no_evidence_for_selected" | "unrelated_industry_stronger" | null;
}

/** Minimum raw keyword-match count before a detected industry is trusted
 * enough to flag a mismatch — guards against a one-off substring collision
 * (e.g. "garage" appearing once) blocking a report on thin evidence. */
const MIN_ABSOLUTE_MATCHES = 3;

/** The detected industry must out-score the selected one by this ratio to
 * count as material disagreement, not just noisy overlap between adjacent
 * trades (e.g. both templates mentioning "commercial" or "licensed"). */
const MISMATCH_RATIO = 1.5;

function buildHaystack(pages: CrawledPageResult[]): string {
  return pages
    .map((p) =>
      [p.title, p.h1, p.metaDescription, p.url, (p.signals?.bodyTextSample as string) ?? ""].filter(Boolean).join(" ")
    )
    .join(" \n ")
    .toLowerCase();
}

function scoreTemplate(haystack: string, slug: string): IndustryMatchScore {
  const template = INDUSTRY_TEMPLATES[slug];
  // Only service keywords + service names are trade-discriminating.
  // Trust/financing/emergency/maintenance keyword lists ("licensed",
  // "financing", "emergency") are largely shared across trades and would
  // add cross-industry noise rather than signal.
  const keywordPool = Array.from(
    new Set([...template.keywordSignals.service, ...template.expectedServices.map((s) => s.toLowerCase())])
  );
  const matchedKeywords = keywordPool.filter((kw) => haystack.includes(kw));
  return { slug, label: template.label, score: matchedKeywords.length, matchedKeywords };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function detectIndustry(pages: CrawledPageResult[], selectedSlug: string): IndustryDetectionResult {
  const haystack = buildHaystack(pages);
  const scores = Object.keys(INDUSTRY_TEMPLATES)
    .map((slug) => scoreTemplate(haystack, slug))
    .sort((a, b) => b.score - a.score);

  const top = scores[0] ?? null;
  const selected = scores.find((s) => s.slug === selectedSlug) ?? {
    slug: selectedSlug,
    label: selectedSlug,
    score: 0,
    matchedKeywords: [],
  };

  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const detectedConfidence = top && totalScore > 0 ? round2((top.score / totalScore) * 100) : 0;
  const selectedConfidence = totalScore > 0 ? round2((selected.score / totalScore) * 100) : 0;

  let mismatch = false;
  let mismatchReason: IndustryDetectionResult["mismatchReason"] = null;

  if ((top?.score ?? 0) === 0) {
    mismatch = true;
    mismatchReason = "no_evidence";
  } else if (top!.slug !== selectedSlug && selected.score === 0) {
    mismatch = true;
    mismatchReason = "no_evidence_for_selected";
  } else if (
    top!.slug !== selectedSlug &&
    top!.score >= MIN_ABSOLUTE_MATCHES &&
    top!.score >= selected.score * MISMATCH_RATIO
  ) {
    mismatch = true;
    mismatchReason = "unrelated_industry_stronger";
  }

  return {
    detectedIndustry: top && top.score > 0 ? top.slug : null,
    detectedConfidence,
    selectedConfidence,
    scores,
    supportingEvidence: selected.matchedKeywords,
    contradictingEvidence: top && top.slug !== selectedSlug ? top.matchedKeywords : [],
    mismatch,
    mismatchReason,
  };
}
