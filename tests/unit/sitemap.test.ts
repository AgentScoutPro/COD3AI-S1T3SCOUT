import { afterEach, describe, expect, it, vi } from "vitest";
import { discoverSitemapUrls } from "@/lib/crawler/sitemap";

const SITEMAP_INDEX = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap>
</sitemapindex>`;

const SITEMAP_PAGES = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc></url>
  <url><loc>https://example.com/services/ac-repair</loc></url>
</urlset>`;

describe("discoverSitemapUrls", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("expands a sitemap index into leaf page URLs", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("sitemap-pages")) {
        return { ok: true, text: async () => SITEMAP_PAGES } as Response;
      }
      return { ok: true, text: async () => SITEMAP_INDEX } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await discoverSitemapUrls(
      "https://example.com",
      ["https://example.com/sitemap.xml"],
      "TestBot/1.0",
      5000
    );

    expect(result.sitemapsFound).toContain("https://example.com/sitemap.xml");
    expect(result.sitemapsFound).toContain("https://example.com/sitemap-pages.xml");
    expect(result.pageUrls).toEqual(
      expect.arrayContaining(["https://example.com/", "https://example.com/services/ac-repair"])
    );
  });

  it("returns no URLs when the sitemap fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, text: async () => "" }) as Response)
    );

    const result = await discoverSitemapUrls("https://example.com", [], "TestBot/1.0", 5000);
    expect(result.pageUrls).toEqual([]);
  });
});
