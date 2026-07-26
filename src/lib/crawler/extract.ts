import * as cheerio from "cheerio";
import type { CrawledPageResult } from "@/lib/providers/types";
import { normalizeUrl } from "./normalize";

const SKIP_PATH_PATTERNS = [
  /\/(cart|checkout|account|login|signin|signup|register)(\/|$)/i,
  /\/wp-(admin|login)/i,
  /\?.*\b(add-to-cart|action=)/i,
];

export function shouldSkipUrl(url: string): boolean {
  return SKIP_PATH_PATTERNS.some((re) => re.test(url));
}

const ANALYTICS_PATTERNS = [
  /googletagmanager\.com/i,
  /google-analytics\.com/i,
  /gtag\(/i,
  /analytics\.js/i,
  /segment\.com\/analytics/i,
];

export interface ExtractOptions {
  normalizedDomain: string;
}

export function extractPageSignals(
  url: string,
  httpStatus: number,
  html: string,
  opts: ExtractOptions
): CrawledPageResult {
  const $ = cheerio.load(html);
  const normalizedUrl = normalizeUrl(url);
  const isHttps = url.startsWith("https://");

  const title = $("title").first().text().trim() || null;
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() || null;
  const h1 = $("h1").first().text().trim() || null;
  const canonicalUrl = $('link[rel="canonical"]').attr("href") || null;
  const hasViewportMeta = $('meta[name="viewport"]').length > 0;

  // Cheerio's .text() concatenates ALL descendant text nodes, including the
  // literal CSS/JS source inside <style>/<script> tags anywhere in <body>
  // (common with block-based themes/page builders that inline per-block
  // styles) — confirmed against a real production site during this fix,
  // where it silently consumed the entire text sample with CSS before any
  // real content, and inflated wordCount with CSS tokens counted as "words".
  // Cloning + stripping here (not on the shared `$`) so the later
  // `script[type="application/ld+json"]` lookup below is unaffected.
  const bodyClone = $("body").clone();
  bodyClone.find("script, style, noscript").remove();
  const bodyText = bodyClone.text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(" ").length : 0;

  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        const type = node?.["@type"];
        if (typeof type === "string") schemaTypes.push(type);
        else if (Array.isArray(type)) schemaTypes.push(...type.filter((t) => typeof t === "string"));
      }
    } catch {
      // malformed JSON-LD — ignore this block
    }
  });

  let internalLinks = 0;
  let externalLinks = 0;
  const anchors = $("a[href]");
  anchors.each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    try {
      const resolved = new URL(href, url);
      if (resolved.hostname.replace(/^www\./, "") === opts.normalizedDomain) internalLinks += 1;
      else externalLinks += 1;
    } catch {
      // ignore unparsable hrefs
    }
  });
  void externalLinks;

  const brokenImages = $("img[src='']").length + $("img:not([src])").length;

  const htmlLower = html.toLowerCase();
  const hasClickToCall = $('a[href^="tel:"]').length > 0;
  const hasBookingForm =
    $("form").length > 0 &&
    /(book|schedule|estimate|quote|appointment|request)/i.test(bodyText + " " + htmlLower);
  const hasAnalytics = ANALYTICS_PATTERNS.some((re) => re.test(html));

  return {
    url,
    normalizedUrl,
    httpStatus,
    title,
    metaDescription,
    h1,
    canonicalUrl,
    wordCount,
    hasSchema: schemaTypes.length > 0,
    schemaTypes: [...new Set(schemaTypes)],
    internalLinks,
    brokenLinks: 0, // populated post-crawl once link status is known
    brokenImages,
    hasHttps: isHttps,
    hasViewportMeta,
    hasClickToCall,
    hasBookingForm,
    hasAnalytics,
    // 500 chars was too short in practice: on a typical modern site the
    // first 500 characters of body text are nav links and hero taglines,
    // not the actual service-specific content — this was silently starving
    // both NAP phone-matching (gbp.phone_matches_site) and industry
    // detection (src/lib/industry-templates/detect.ts) of the real content
    // they need, on ordinary production sites (confirmed against Kiwi
    // Coatings' real site during this fix). Still bounded, not the full page.
    signals: { wordCount, bodyTextSample: bodyText.slice(0, 3000) },
  };
}

export function extractLinks(html: string, baseUrl: string, normalizedDomain: string): string[] {
  const $ = cheerio.load(html);
  const links = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      return;
    }
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return;
      if (resolved.hostname.replace(/^www\./, "") !== normalizedDomain) return;
      if (shouldSkipUrl(resolved.toString())) return;
      links.add(normalizeUrl(resolved.toString()));
    } catch {
      // ignore unparsable hrefs
    }
  });
  return [...links];
}
