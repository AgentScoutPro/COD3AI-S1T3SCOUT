import type { IndustryTemplate } from "@/lib/industry-templates/types";
import type { CrawledPageResult } from "@/lib/providers/types";

export type PageType =
  | "homepage"
  | "service"
  | "location"
  | "emergency"
  | "financing"
  | "maintenance_plan"
  | "about"
  | "contact"
  | "blog"
  | "other";

const LOCATION_HINTS = /\b(serving|service-area|proudly serves|near me|locations?)\b/i;
const ABOUT_HINTS = /\/(about|about-us|our-story|team)(\/|$)/i;
const CONTACT_HINTS = /\/(contact|contact-us)(\/|$)/i;
const BLOG_HINTS = /\/(blog|news|articles?)(\/|$)/i;

export function classifyPage(
  page: Pick<CrawledPageResult, "url" | "title" | "h1" | "signals">,
  isHomepage: boolean,
  template: IndustryTemplate
): PageType {
  if (isHomepage) return "homepage";

  const haystack = `${page.url} ${page.title ?? ""} ${page.h1 ?? ""} ${
    (page.signals?.bodyTextSample as string) ?? ""
  }`.toLowerCase();

  if (template.keywordSignals.emergency.some((k) => haystack.includes(k))) return "emergency";
  if (template.keywordSignals.financing.some((k) => haystack.includes(k))) return "financing";
  if (template.keywordSignals.maintenancePlan.some((k) => haystack.includes(k))) return "maintenance_plan";
  if (ABOUT_HINTS.test(page.url)) return "about";
  if (CONTACT_HINTS.test(page.url)) return "contact";
  if (BLOG_HINTS.test(page.url)) return "blog";
  if (template.keywordSignals.service.some((k) => haystack.includes(k))) return "service";
  if (LOCATION_HINTS.test(haystack)) return "location";

  return "other";
}

/** Returns which of the template's expected services appear to have a
 * dedicated page, matched loosely against title/h1/URL text. */
export function coveredServices(
  pages: Array<{ url: string; title: string | null; h1: string | null }>,
  template: IndustryTemplate
): string[] {
  const covered = new Set<string>();
  for (const service of template.expectedServices) {
    const serviceLc = service.toLowerCase();
    const found = pages.some((p) => {
      const haystack = `${p.url} ${p.title ?? ""} ${p.h1 ?? ""}`.toLowerCase();
      return haystack.includes(serviceLc) || serviceLc.split(" ").every((word) => haystack.includes(word));
    });
    if (found) covered.add(service);
  }
  return [...covered];
}
