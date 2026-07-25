import type { RuleContext } from "@/lib/scoring/types";
import type { CrawledPageResult, PlaceRecord, PageSpeedMetrics, WebsiteCrawlOutput } from "@/lib/providers/types";
import { getIndustryTemplate } from "@/lib/industry-templates";
import { normalizeUrl } from "@/lib/crawler/normalize";

export interface BuildContextInput {
  business: { name: string; normalizedDomain: string; industry: string; city: string; state: string; websiteUrl: string };
  crawl: WebsiteCrawlOutput;
  place: PlaceRecord | null;
  placesConfigured: boolean;
  pageSpeed: PageSpeedMetrics[];
  pageSpeedConfigured: boolean;
  competitors: PlaceRecord[];
  competitorPages: Record<string, CrawledPageResult[]>;
}

export function buildRuleContext(input: BuildContextInput): RuleContext {
  const homepageNormalized = normalizeUrl(input.business.websiteUrl);
  const homepage =
    input.crawl.pages.find((p) => p.normalizedUrl === homepageNormalized) ?? input.crawl.pages[0] ?? null;

  return {
    business: {
      name: input.business.name,
      normalizedDomain: input.business.normalizedDomain,
      industry: input.business.industry,
      city: input.business.city,
      state: input.business.state,
    },
    template: getIndustryTemplate(input.business.industry),
    pages: input.crawl.pages,
    homepage,
    crawlMeta: {
      robotsAllowed: input.crawl.robotsAllowed,
      robotsTxtFound: input.crawl.robotsTxtFound,
      sitemapsFound: input.crawl.sitemapsFound,
      crawlCapped: input.crawl.crawlCapped,
    },
    place: input.place,
    placesConfigured: input.placesConfigured,
    pageSpeed: input.pageSpeed,
    pageSpeedConfigured: input.pageSpeedConfigured,
    competitors: input.competitors,
    competitorPages: input.competitorPages,
  };
}
