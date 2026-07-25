import { describe, expect, it } from "vitest";
import { extractPageSignals, extractLinks } from "@/lib/crawler/extract";
import { classifyPage, coveredServices } from "@/lib/crawler/classify";
import { hvac } from "@/lib/industry-templates/hvac";

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>AC Repair in Phoenix | Desert Comfort</title>
  <meta name="description" content="Fast, licensed AC repair in Phoenix, AZ.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="canonical" href="https://example.com/services/ac-repair">
  <script type="application/ld+json">{"@type": "LocalBusiness", "name": "Desert Comfort"}</script>
</head>
<body>
  <h1>AC Repair</h1>
  <p>We provide fast, licensed AC repair across the Phoenix area with 24/7 emergency service.</p>
  <a href="tel:+16025550142">Call now</a>
  <a href="/contact">Contact</a>
  <a href="https://external.com/">External</a>
  <img src="" />
  <form><button>Request a free estimate</button></form>
</body>
</html>`;

describe("extractPageSignals", () => {
  const page = extractPageSignals("https://example.com/services/ac-repair", 200, SAMPLE_HTML, {
    normalizedDomain: "example.com",
  });

  it("extracts title, meta description, h1, and canonical", () => {
    expect(page.title).toBe("AC Repair in Phoenix | Desert Comfort");
    expect(page.metaDescription).toContain("licensed AC repair");
    expect(page.h1).toBe("AC Repair");
    expect(page.canonicalUrl).toBe("https://example.com/services/ac-repair");
  });

  it("detects schema, viewport, click-to-call, and booking form", () => {
    expect(page.hasSchema).toBe(true);
    expect(page.schemaTypes).toContain("LocalBusiness");
    expect(page.hasViewportMeta).toBe(true);
    expect(page.hasClickToCall).toBe(true);
    expect(page.hasBookingForm).toBe(true);
  });

  it("counts a broken image with an empty src", () => {
    expect(page.brokenImages).toBe(1);
  });
});

describe("extractLinks", () => {
  it("keeps only same-domain, non-skipped links", () => {
    const links = extractLinks(SAMPLE_HTML, "https://example.com/services/ac-repair", "example.com");
    expect(links).toContain("https://example.com/contact");
    expect(links.some((l) => l.includes("external.com"))).toBe(false);
  });
});

describe("classifyPage", () => {
  it("classifies a service page from keyword signals", () => {
    const html = `<title>AC Repair</title><h1>AC Repair</h1><p>Fast, licensed AC repair across Phoenix.</p>`;
    const page = extractPageSignals("https://example.com/services/ac-repair", 200, html, {
      normalizedDomain: "example.com",
    });
    expect(classifyPage(page, false, hvac)).toBe("service");
  });

  it("classifies emergency messaging ahead of generic service keywords", () => {
    const page = extractPageSignals("https://example.com/services/ac-repair", 200, SAMPLE_HTML, {
      normalizedDomain: "example.com",
    });
    expect(classifyPage(page, false, hvac)).toBe("emergency");
  });

  it("classifies the homepage regardless of content", () => {
    const page = extractPageSignals("https://example.com/", 200, "<title>Home</title>", {
      normalizedDomain: "example.com",
    });
    expect(classifyPage(page, true, hvac)).toBe("homepage");
  });
});

describe("coveredServices", () => {
  it("matches expected services against page title/h1/url", () => {
    const pages = [{ url: "https://example.com/services/ac-repair", title: "AC Repair", h1: "AC Repair" }];
    const covered = coveredServices(pages, hvac);
    expect(covered).toContain("AC Repair");
    expect(covered).not.toContain("Furnace Installation");
  });
});
