# Crawler Policy

The website crawler (`src/lib/crawler/`) is the only component in this codebase that fetches
arbitrary third-party HTML, so its rules of engagement are documented here explicitly.

## What it does

1. Fetches `/robots.txt` from the audited domain (`robots.ts`) and parses `Disallow`/`Allow`/`Sitemap`
   directives, preferring a group matching our user agent over the wildcard `*` group.
2. Discovers sitemap URLs from `robots.txt` `Sitemap:` lines, falling back to the conventional
   `/sitemap.xml` (`sitemap.ts`). Sitemap indexes are expanded one level deep.
3. Crawls same-domain pages breadth-first, seeded from both the homepage and discovered sitemap URLs,
   up to `AUDIT_MAX_PAGES` (default 40).
4. Extracts technical, content, and conversion signals per page via Cheerio (`extract.ts`) — no
   headless browser, no JS execution.
5. Classifies each page (`classify.ts`) against the industry template's keyword signals: service,
   location, emergency, financing, maintenance-plan, about, contact, blog, or other.

## Compliance rules (non-negotiable)

- **Never scrapes Google Search or Google Maps HTML.** Google data comes exclusively from the Places
  API (`src/lib/providers/places/live.ts`).
- **Never scrapes Yelp, BBB, Facebook, or any other review platform directly.** Reviews come
  exclusively from the Places API's public review sample (capped at 5 by Google, always labeled as a
  sample, never presented as a full history).
- **Respects `robots.txt`.** Any page path disallowed for our user agent (or the wildcard group, if no
  specific group exists) is skipped before it's ever fetched.
- **Identifiable user agent.** `AUDIT_USER_AGENT` (default `Cod3AILocalAuthorityBot/1.0`) is sent on
  every request — robots.txt, sitemap, and page fetches.
- **Same-domain only.** `crawl.ts` filters every discovered link to the normalized business domain
  before queuing it; sitemap URLs on other domains are dropped.
- **Rate-limited and bounded.** `AUDIT_CRAWL_CONCURRENCY` (default 2) caps in-flight page fetches;
  `AUDIT_REQUEST_TIMEOUT_MS` (default 12000) aborts any single request that hangs; `AUDIT_MAX_PAGES`
  bounds total pages per audit; `AUDIT_COMPETITOR_MAX_PAGES` bounds the (much shallower) competitor
  crawls run during the benchmarking stage.
- **No crawl loops.** A `visited` set and a `seenInQueue` set (keyed by normalized URL) mean a page is
  fetched at most once per audit regardless of how many other pages link to it.
- **Deduped normalized URLs.** `normalize.ts` strips fragments, default ports, tracking params
  (`utm_*`, `gclid`, `fbclid`), and trailing slashes before dedup so `/services/` and `/services` don't
  double-count.
- **Avoids forms/account/search/cart pages.** `shouldSkipUrl()` in `extract.ts` filters out
  `/cart`, `/checkout`, `/account`, `/login`, `/signin`, `/signup`, `/register`, WordPress admin
  paths, and add-to-cart query strings before they're ever queued.
- **Records source URLs for all evidence.** Every scoring finding carries `sourceUrls` pointing back
  to the specific crawled page(s) it was derived from, shown in the report's evidence drawer.

## What it does NOT do

- Execute JavaScript or render the page (no Playwright/headless browser in the MVP crawler — see
  `ARCHITECTURE.md` for why, and `PROVIDER_INTEGRATIONS.md` for the planned JS-rendering adapter).
- Follow redirects across domains (same-domain filtering happens on the *resolved* URL).
- Crawl authenticated or paywalled content.
- Retry failed requests — a failed fetch simply doesn't produce a page; it does not retry or block the
  rest of the crawl.
