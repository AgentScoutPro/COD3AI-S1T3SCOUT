import { describe, expect, it } from "vitest";
import { detectIndustry } from "@/lib/industry-templates/detect";
import { INDUSTRY_TEMPLATES, INDUSTRY_SLUGS } from "@/lib/industry-templates";
import type { CrawledPageResult } from "@/lib/providers/types";

function pageWithText(text: string): CrawledPageResult {
  return {
    url: "https://example.com/",
    normalizedUrl: "https://example.com/",
    httpStatus: 200,
    title: text,
    metaDescription: text,
    h1: text,
    canonicalUrl: "https://example.com/",
    wordCount: text.split(" ").length,
    hasSchema: false,
    schemaTypes: [],
    internalLinks: 5,
    brokenLinks: 0,
    brokenImages: 0,
    hasHttps: true,
    hasViewportMeta: true,
    hasClickToCall: true,
    hasBookingForm: false,
    hasAnalytics: false,
    signals: { bodyTextSample: text },
  };
}

/** Builds representative site content for a template purely from its own
 * registered service keywords — no hand-tuned per-industry fixtures. */
function representativePages(slug: string): CrawledPageResult[] {
  const template = INDUSTRY_TEMPLATES[slug];
  const text = [...template.keywordSignals.service, ...template.expectedServices].join(". ");
  return [pageWithText(text)];
}

describe("detectIndustry", () => {
  // Required test #8 + #20: every registered industry can be detected from
  // representative content, and this is parameterized over the live
  // registry — a newly added template automatically gets a test case here
  // with no changes to this file.
  it.each(INDUSTRY_SLUGS)("detects '%s' from its own representative content", (slug) => {
    const result = detectIndustry(representativePages(slug), slug);
    expect(result.detectedIndustry).toBe(slug);
    expect(result.mismatch).toBe(false);
  });

  // Required test #9 / #10: concrete-coatings and garage-door don't cross-classify.
  it("does not classify a concrete-coatings site as garage-door", () => {
    const pages = representativePages("concrete-coatings");
    const result = detectIndustry(pages, "concrete-coatings");
    expect(result.detectedIndustry).toBe("concrete-coatings");
    expect(result.detectedIndustry).not.toBe("garage-door");
  });

  it("does not classify a garage-door site as concrete-coatings", () => {
    const pages = representativePages("garage-door");
    const result = detectIndustry(pages, "garage-door");
    expect(result.detectedIndustry).toBe("garage-door");
    expect(result.detectedIndustry).not.toBe("concrete-coatings");
  });

  it("flags a mismatch when garage-door content is submitted under the concrete-coatings selection (the Kiwi Coatings incident, inverted)", () => {
    const pages = representativePages("garage-door");
    const result = detectIndustry(pages, "concrete-coatings");
    expect(result.mismatch).toBe(true);
    expect(result.detectedIndustry).toBe("garage-door");
  });

  it("flags the actual incident shape: concrete-coatings content submitted under the garage-door selection", () => {
    const pages = representativePages("concrete-coatings");
    const result = detectIndustry(pages, "garage-door");
    expect(result.mismatch).toBe(true);
    expect(["unrelated_industry_stronger", "no_evidence_for_selected"]).toContain(result.mismatchReason);
    expect(result.detectedIndustry).toBe("concrete-coatings");
  });

  // Required test #11: HVAC is not classified as plumbing.
  it("does not classify an HVAC site as plumbing", () => {
    const result = detectIndustry(representativePages("hvac"), "hvac");
    expect(result.detectedIndustry).toBe("hvac");
    expect(result.detectedIndustry).not.toBe("plumbing");
  });

  // Required test #12: moving is not classified as junk removal.
  it("does not classify a moving-company site as junk removal", () => {
    const result = detectIndustry(representativePages("moving"), "moving");
    expect(result.detectedIndustry).toBe("moving");
    expect(result.detectedIndustry).not.toBe("junk-removal");
  });

  // Required test #13: pool service is not classified as concrete coatings.
  it("does not classify a pool-service site as concrete-coatings", () => {
    const result = detectIndustry(representativePages("pool-service"), "pool-service");
    expect(result.detectedIndustry).toBe("pool-service");
    expect(result.detectedIndustry).not.toBe("concrete-coatings");
  });

  // Required test #14: unknown/mixed industries require review.
  it("flags a mismatch when there is no meaningful industry evidence at all", () => {
    const pages = [pageWithText("Welcome to our website. Contact us for more information about our company.")];
    const result = detectIndustry(pages, "hvac");
    expect(result.mismatch).toBe(true);
    expect(result.mismatchReason).toBe("no_evidence");
    expect(result.detectedIndustry).toBeNull();
  });

  it("flags a mismatch for genuinely mixed content with no single dominant trade", () => {
    const pages = [pageWithText("we do a little bit of everything around town, ask us anything")];
    const result = detectIndustry(pages, "roofing");
    expect(result.mismatch).toBe(true);
  });

  it("does not flag a mismatch when the selected industry is the clear best match even with minor cross-template noise", () => {
    const template = INDUSTRY_TEMPLATES["hvac"];
    const text = `${template.keywordSignals.service.join(". ")}. Also licensed and insured like everyone else.`;
    const result = detectIndustry([pageWithText(text)], "hvac");
    expect(result.mismatch).toBe(false);
    expect(result.detectedIndustry).toBe("hvac");
  });
});
