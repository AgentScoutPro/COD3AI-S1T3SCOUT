import type { WebsiteProvider, WebsiteCrawlOutput, ProviderResult } from "../types";
import { crawlWebsite } from "@/lib/crawler/crawl";
import { env } from "@/lib/env";

/** Real crawler: server-side fetch + cheerio parsing (see src/lib/crawler).
 * Not Playwright — JS-heavy sites are a future adapter, not the MVP. */
export class LiveWebsiteProvider implements WebsiteProvider {
  async crawl(websiteUrl: string, options: { maxPages: number }): Promise<ProviderResult<WebsiteCrawlOutput>> {
    try {
      const data = await crawlWebsite(websiteUrl, {
        maxPages: options.maxPages,
        concurrency: env.crawlConcurrency,
        timeoutMs: env.requestTimeoutMs,
        userAgent: env.userAgent,
      });

      if (data.pagesCrawled === 0) {
        return { mode: "live", status: "error", data, errorMessage: "No pages could be crawled." };
      }

      return { mode: "live", status: data.robotsAllowed ? "ok" : "partial", data };
    } catch (error) {
      return {
        mode: "live",
        status: "error",
        data: {
          normalizedDomain: "",
          robotsAllowed: false,
          robotsTxtFound: false,
          sitemapsFound: [],
          pages: [],
          pagesDiscovered: 0,
          pagesCrawled: 0,
          crawlCapped: false,
        },
        errorMessage: error instanceof Error ? error.message : "Unknown crawl error",
      };
    }
  }
}
