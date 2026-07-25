import { fetchRobotsTxt, isPathAllowed } from "./robots";
import { discoverSitemapUrls } from "./sitemap";
import { extractPageSignals, extractLinks, shouldSkipUrl } from "./extract";
import { normalizeDomain, normalizeUrl } from "./normalize";
import type { CrawledPageResult, WebsiteCrawlOutput } from "@/lib/providers/types";

export interface CrawlOptions {
  maxPages: number;
  concurrency: number;
  timeoutMs: number;
  userAgent: string;
}

async function fetchPage(
  url: string,
  userAgent: string,
  timeoutMs: number
): Promise<{ status: number; html: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return { status: res.status, html: "" };
    const html = await res.text();
    return { status: res.status, html };
  } catch {
    return null;
  }
}

/** Same-domain crawl: robots.txt -> sitemap discovery -> capped BFS crawl
 * with bounded concurrency, per-request timeouts, URL dedup, and a visited
 * set that prevents loops regardless of how a page was discovered. */
export async function crawlWebsite(
  startUrl: string,
  options: CrawlOptions
): Promise<WebsiteCrawlOutput> {
  const normalizedDomain = normalizeDomain(startUrl);
  const origin = new URL(startUrl).origin;

  const robots = await fetchRobotsTxt(origin, options.userAgent, options.timeoutMs);
  const robotsAllowed = isPathAllowed(robots, new URL(startUrl).pathname);

  const { sitemapsFound, pageUrls } = await discoverSitemapUrls(
    origin,
    robots.sitemaps,
    options.userAgent,
    options.timeoutMs
  );

  const visited = new Set<string>();
  const queue: string[] = [normalizeUrl(startUrl)];
  for (const url of pageUrls) {
    try {
      const normalized = normalizeUrl(url);
      if (normalizeDomain(normalized) === normalizedDomain) queue.push(normalized);
    } catch {
      // skip malformed sitemap URL
    }
  }

  const pages: CrawledPageResult[] = [];
  let pagesDiscovered = 0;
  const seenInQueue = new Set(queue);

  while (queue.length > 0 && pages.length < options.maxPages) {
    const batch: string[] = [];
    while (batch.length < options.concurrency && queue.length > 0) {
      const next = queue.shift()!;
      if (visited.has(next)) continue;
      if (shouldSkipUrl(next)) continue;
      if (!isPathAllowed(robots, new URL(next).pathname)) continue;
      batch.push(next);
    }
    if (batch.length === 0) continue;

    const results = await Promise.all(
      batch.map(async (url) => {
        visited.add(url);
        pagesDiscovered += 1;
        const fetched = await fetchPage(url, options.userAgent, options.timeoutMs);
        if (!fetched) return null;
        const page = extractPageSignals(url, fetched.status, fetched.html, { normalizedDomain });
        const links = fetched.html ? extractLinks(fetched.html, url, normalizedDomain) : [];
        return { page, links };
      })
    );

    for (const result of results) {
      if (!result) continue;
      pages.push(result.page);
      if (pages.length >= options.maxPages) break;
      for (const link of result.links) {
        if (!visited.has(link) && !seenInQueue.has(link)) {
          seenInQueue.add(link);
          queue.push(link);
        }
      }
    }
  }

  return {
    normalizedDomain,
    robotsAllowed,
    robotsTxtFound: robots.found,
    sitemapsFound,
    pages,
    pagesDiscovered,
    pagesCrawled: pages.length,
    crawlCapped: pagesDiscovered >= options.maxPages || pages.length >= options.maxPages,
  };
}
