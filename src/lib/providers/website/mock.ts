import type { WebsiteProvider, WebsiteCrawlOutput, CrawledPageResult, ProviderResult } from "../types";
import { normalizeDomain, normalizeUrl } from "@/lib/crawler/normalize";
import { seededRandom, chance, pick } from "../seeded-random";
import { getIndustryTemplate } from "@/lib/industry-templates";

function makePage(
  origin: string,
  path: string,
  title: string,
  rng: () => number,
  overrides: Partial<CrawledPageResult> = {}
): CrawledPageResult {
  const url = new URL(path, origin).toString();
  const hasSchema = chance(rng, 0.6);
  return {
    url,
    normalizedUrl: normalizeUrl(url),
    httpStatus: 200,
    title,
    metaDescription: chance(rng, 0.75) ? `${title} — professional, licensed, and insured local service.` : null,
    h1: chance(rng, 0.85) ? title : null,
    canonicalUrl: url,
    wordCount: 200 + Math.floor(rng() * 900),
    hasSchema,
    schemaTypes: hasSchema ? [pick(rng, ["LocalBusiness", "Organization", "Service", "FAQPage"])] : [],
    internalLinks: 5 + Math.floor(rng() * 20),
    brokenLinks: chance(rng, 0.1) ? 1 : 0,
    brokenImages: chance(rng, 0.15) ? 1 : 0,
    hasHttps: true,
    hasViewportMeta: chance(rng, 0.95),
    hasClickToCall: chance(rng, 0.7),
    hasBookingForm: chance(rng, 0.5),
    hasAnalytics: chance(rng, 0.65),
    signals: { mock: true },
    ...overrides,
  };
}

/** Generates a plausible same-domain crawl for any business/industry
 * without hitting the network, seeded from the domain so results are
 * stable across repeated audits. */
export class MockWebsiteProvider implements WebsiteProvider {
  async crawl(websiteUrl: string, options: { maxPages: number }): Promise<ProviderResult<WebsiteCrawlOutput>> {
    const normalizedDomain = normalizeDomain(websiteUrl);
    const origin = new URL(/^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`).origin;
    const rng = seededRandom(normalizedDomain);

    // Industry is unknown at the provider layer — use a generic template
    // shape via HVAC as a structural stand-in for synthetic page titles.
    const template = getIndustryTemplate("hvac");

    const pages: CrawledPageResult[] = [
      makePage(origin, "/", "Home", rng, { hasSchema: true, schemaTypes: ["LocalBusiness"] }),
      makePage(origin, "/about", "About Us", rng),
      makePage(origin, "/contact", "Contact", rng, { hasClickToCall: true }),
    ];

    const serviceCount = Math.min(template.expectedServices.length, 3 + Math.floor(rng() * 4));
    for (let i = 0; i < serviceCount; i++) {
      const service = template.expectedServices[i];
      pages.push(makePage(origin, `/services/${slugify(service)}`, service, rng));
    }

    if (chance(rng, 0.6)) {
      pages.push(makePage(origin, "/emergency-service", "24/7 Emergency Service", rng, { hasClickToCall: true }));
    }
    if (chance(rng, 0.4)) {
      pages.push(makePage(origin, "/financing", "Financing Options", rng));
    }

    const capped = pages.slice(0, options.maxPages);

    return {
      mode: "mock",
      status: "ok",
      data: {
        normalizedDomain,
        robotsAllowed: true,
        robotsTxtFound: chance(rng, 0.8),
        sitemapsFound: chance(rng, 0.7) ? [new URL("/sitemap.xml", origin).toString()] : [],
        pages: capped,
        pagesDiscovered: pages.length,
        pagesCrawled: capped.length,
        crawlCapped: pages.length > options.maxPages,
      },
      rawMetadata: { mock: true },
    };
  }
}

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
