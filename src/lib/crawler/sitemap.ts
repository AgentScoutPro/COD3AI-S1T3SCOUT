import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes: false });

async function fetchText(url: string, userAgent: string, timeoutMs: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { headers: { "User-Agent": userAgent }, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Discovers sitemap URLs via robots.txt entries and the conventional
 * /sitemap.xml fallback, then recursively expands sitemap indexes
 * (one level deep) into leaf page URLs. */
export async function discoverSitemapUrls(
  origin: string,
  robotsSitemaps: string[],
  userAgent: string,
  timeoutMs: number
): Promise<{ sitemapsFound: string[]; pageUrls: string[] }> {
  const candidates = robotsSitemaps.length > 0 ? robotsSitemaps : [new URL("/sitemap.xml", origin).toString()];

  const sitemapsFound: string[] = [];
  const pageUrls = new Set<string>();

  for (const sitemapUrl of candidates) {
    const body = await fetchText(sitemapUrl, userAgent, timeoutMs);
    if (!body) continue;
    sitemapsFound.push(sitemapUrl);

    let parsed: Record<string, unknown>;
    try {
      parsed = parser.parse(body);
    } catch {
      continue;
    }

    if (parsed.sitemapindex) {
      const entries = toArray((parsed.sitemapindex as Record<string, unknown>).sitemap);
      for (const entry of entries.slice(0, 20)) {
        const loc = (entry as Record<string, unknown>).loc as string | undefined;
        if (!loc) continue;
        const childBody = await fetchText(loc, userAgent, timeoutMs);
        if (!childBody) continue;
        sitemapsFound.push(loc);
        try {
          const childParsed = parser.parse(childBody) as Record<string, unknown>;
          extractUrls(childParsed, pageUrls);
        } catch {
          // skip malformed child sitemap
        }
      }
    } else if (parsed.urlset) {
      extractUrls(parsed, pageUrls);
    }
  }

  return { sitemapsFound, pageUrls: [...pageUrls] };
}

function extractUrls(parsed: Record<string, unknown>, sink: Set<string>) {
  const urlset = parsed.urlset as Record<string, unknown> | undefined;
  if (!urlset) return;
  for (const entry of toArray(urlset.url)) {
    const loc = (entry as Record<string, unknown>).loc as string | undefined;
    if (loc) sink.add(loc);
  }
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
