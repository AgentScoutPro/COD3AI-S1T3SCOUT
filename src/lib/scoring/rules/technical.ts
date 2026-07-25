import type { ScoringRule, RuleContext } from "../types";
import { buildFinding } from "../helpers";

const CATEGORY = "technical_foundation" as const;

function ratio(pages: RuleContext["pages"], predicate: (p: RuleContext["pages"][number]) => boolean): number {
  if (pages.length === 0) return 0;
  return pages.filter(predicate).length / pages.length;
}

export const technicalRules: ScoringRule[] = [
  {
    id: "tech.https",
    category: CATEGORY,
    evaluate: (ctx) => {
      const pass = ctx.homepage?.hasHttps ?? false;
      return buildFinding({
        ruleId: "tech.https",
        category: CATEGORY,
        pointsAvailable: 3,
        pointsEarnedRatio: pass ? 1 : 0,
        status: pass ? "pass" : "fail",
        severity: pass ? "informational" : "critical",
        explanation: pass
          ? "The homepage is served over HTTPS."
          : "The homepage is not served over HTTPS, which harms trust and rankings.",
        recommendation: pass ? undefined : "Install an SSL certificate and force HTTPS site-wide.",
        sourceUrls: ctx.homepage ? [ctx.homepage.url] : [],
        estimatedImpact: "high",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "tech.crawlability",
    category: CATEGORY,
    evaluate: (ctx) => {
      const pass = ctx.crawlMeta.robotsAllowed;
      return buildFinding({
        ruleId: "tech.crawlability",
        category: CATEGORY,
        pointsAvailable: 2,
        pointsEarnedRatio: pass ? 1 : 0,
        status: pass ? "pass" : "fail",
        severity: pass ? "informational" : "critical",
        explanation: pass
          ? "robots.txt allows crawling of the homepage."
          : "robots.txt disallows crawling of the homepage, which can block search engine indexing.",
        recommendation: pass ? undefined : "Update robots.txt to allow crawling of public pages.",
        estimatedImpact: "high",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "tech.sitemap_presence",
    category: CATEGORY,
    evaluate: (ctx) => {
      const pass = ctx.crawlMeta.sitemapsFound.length > 0;
      return buildFinding({
        ruleId: "tech.sitemap_presence",
        category: CATEGORY,
        pointsAvailable: 2,
        pointsEarnedRatio: pass ? 1 : 0,
        status: pass ? "pass" : "warning",
        severity: pass ? "informational" : "medium",
        explanation: pass
          ? `Found ${ctx.crawlMeta.sitemapsFound.length} XML sitemap(s).`
          : "No XML sitemap was discovered via robots.txt or /sitemap.xml.",
        recommendation: pass ? undefined : "Generate and submit an XML sitemap.",
        sourceUrls: ctx.crawlMeta.sitemapsFound,
        estimatedImpact: "medium",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "tech.title_coverage",
    category: CATEGORY,
    evaluate: (ctx) => {
      const r = ratio(ctx.pages, (p) => Boolean(p.title));
      return buildFinding({
        ruleId: "tech.title_coverage",
        category: CATEGORY,
        pointsAvailable: 2,
        pointsEarnedRatio: r,
        status: r >= 0.9 ? "pass" : r > 0 ? "warning" : "fail",
        severity: r >= 0.9 ? "informational" : "medium",
        explanation: `${Math.round(r * 100)}% of crawled pages have a <title> tag.`,
        recommendation: r >= 0.9 ? undefined : "Add unique, descriptive title tags to every page.",
        estimatedImpact: "medium",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "tech.meta_description_coverage",
    category: CATEGORY,
    evaluate: (ctx) => {
      const r = ratio(ctx.pages, (p) => Boolean(p.metaDescription));
      return buildFinding({
        ruleId: "tech.meta_description_coverage",
        category: CATEGORY,
        pointsAvailable: 1.5,
        pointsEarnedRatio: r,
        status: r >= 0.9 ? "pass" : r > 0 ? "warning" : "fail",
        severity: r >= 0.9 ? "informational" : "low",
        explanation: `${Math.round(r * 100)}% of crawled pages have a meta description.`,
        recommendation: r >= 0.9 ? undefined : "Write unique meta descriptions summarizing each page's value.",
        estimatedImpact: "low",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "tech.h1_coverage",
    category: CATEGORY,
    evaluate: (ctx) => {
      const r = ratio(ctx.pages, (p) => Boolean(p.h1));
      return buildFinding({
        ruleId: "tech.h1_coverage",
        category: CATEGORY,
        pointsAvailable: 1.5,
        pointsEarnedRatio: r,
        status: r >= 0.9 ? "pass" : r > 0 ? "warning" : "fail",
        severity: r >= 0.9 ? "informational" : "low",
        explanation: `${Math.round(r * 100)}% of crawled pages have exactly one H1.`,
        recommendation: r >= 0.9 ? undefined : "Ensure every page has a single, descriptive H1.",
        estimatedImpact: "low",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "tech.canonical_coverage",
    category: CATEGORY,
    evaluate: (ctx) => {
      const r = ratio(ctx.pages, (p) => Boolean(p.canonicalUrl));
      return buildFinding({
        ruleId: "tech.canonical_coverage",
        category: CATEGORY,
        pointsAvailable: 1.5,
        pointsEarnedRatio: r,
        status: r >= 0.8 ? "pass" : r > 0 ? "warning" : "fail",
        severity: r >= 0.8 ? "informational" : "medium",
        explanation: `${Math.round(r * 100)}% of crawled pages declare a canonical URL.`,
        recommendation: r >= 0.8 ? undefined : "Add self-referencing canonical tags to prevent duplicate content issues.",
        estimatedImpact: "medium",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "tech.mobile_viewport",
    category: CATEGORY,
    evaluate: (ctx) => {
      const r = ratio(ctx.pages, (p) => p.hasViewportMeta);
      return buildFinding({
        ruleId: "tech.mobile_viewport",
        category: CATEGORY,
        pointsAvailable: 1.5,
        pointsEarnedRatio: r,
        status: r >= 0.95 ? "pass" : r > 0 ? "warning" : "fail",
        severity: r >= 0.95 ? "informational" : "high",
        explanation: `${Math.round(r * 100)}% of crawled pages declare a mobile viewport meta tag.`,
        recommendation: r >= 0.95 ? undefined : "Add a responsive viewport meta tag site-wide.",
        estimatedImpact: "high",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "tech.broken_links_images",
    category: CATEGORY,
    evaluate: (ctx) => {
      const totalBroken = ctx.pages.reduce((sum, p) => sum + p.brokenLinks + p.brokenImages, 0);
      const pass = totalBroken === 0;
      const warning = totalBroken > 0 && totalBroken <= 2;
      return buildFinding({
        ruleId: "tech.broken_links_images",
        category: CATEGORY,
        pointsAvailable: 2,
        pointsEarnedRatio: pass ? 1 : warning ? 0.5 : 0,
        status: pass ? "pass" : warning ? "warning" : "fail",
        severity: pass ? "informational" : warning ? "medium" : "high",
        explanation: `Found ${totalBroken} broken link(s)/image(s) across crawled pages.`,
        recommendation: pass ? undefined : "Fix or remove broken links and images found during the crawl.",
        estimatedImpact: "medium",
        estimatedEffort: "low",
      });
    },
  },
  {
    id: "tech.structured_data",
    category: CATEGORY,
    evaluate: (ctx) => {
      const homepageSchema = ctx.homepage?.schemaTypes ?? [];
      const hasLocalBusiness = homepageSchema.some((t) => /LocalBusiness|Organization/i.test(t));
      return buildFinding({
        ruleId: "tech.structured_data",
        category: CATEGORY,
        pointsAvailable: 2.5,
        pointsEarnedRatio: hasLocalBusiness ? 1 : ctx.homepage?.hasSchema ? 0.4 : 0,
        status: hasLocalBusiness ? "pass" : ctx.homepage?.hasSchema ? "warning" : "fail",
        severity: hasLocalBusiness ? "informational" : "high",
        explanation: hasLocalBusiness
          ? "Homepage includes LocalBusiness/Organization structured data."
          : "Homepage is missing LocalBusiness or Organization schema markup.",
        recommendation: hasLocalBusiness
          ? undefined
          : "Add LocalBusiness JSON-LD schema with name, address, phone, and hours.",
        evidence: { schemaTypes: homepageSchema },
        sourceUrls: ctx.homepage ? [ctx.homepage.url] : [],
        estimatedImpact: "high",
        estimatedEffort: "low",
      });
    },
  },
];
