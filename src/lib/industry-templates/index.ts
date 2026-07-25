import type { IndustryTemplate } from "./types";
import { hvac } from "./hvac";
import { plumbing } from "./plumbing";
import { roofing } from "./roofing";
import { electrical } from "./electrical";
import { junkRemoval } from "./junk-removal";
import { landscaping } from "./landscaping";
import { pestControl } from "./pest-control";
import { moving } from "./moving";
import { garageDoor } from "./garage-door";
import { poolService } from "./pool-service";
import { concreteCoatings } from "./concrete-coatings";

export const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {
  hvac,
  plumbing,
  roofing,
  electrical,
  "junk-removal": junkRemoval,
  landscaping,
  "pest-control": pestControl,
  moving,
  "garage-door": garageDoor,
  "pool-service": poolService,
  "concrete-coatings": concreteCoatings,
};

export const INDUSTRY_SLUGS = Object.keys(INDUSTRY_TEMPLATES);

export function getIndustryTemplate(slug: string): IndustryTemplate {
  const template = INDUSTRY_TEMPLATES[slug];
  if (!template) {
    throw new Error(`Unknown industry template: ${slug}`);
  }
  return template;
}

export type { IndustryTemplate } from "./types";
