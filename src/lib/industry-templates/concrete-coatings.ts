import type { IndustryTemplate } from "./types";

// Reviewed per artifacts/platform-audit-root-cause.md's companion fix plan
// (§9): the original list assumed every coatings company also does concrete
// leveling/resurfacing/decorative concrete/crack repair — those are
// adjacent but distinct trades many coatings businesses (e.g. Kiwi
// Coatings) don't offer, so they were dropped rather than expected. This
// template also does not expect emergency service or a maintenance plan —
// neither is a normal expectation for this trade — and treats financing as
// a low-severity opportunity (see svcloc.financing_page's severity), not a
// major gap.
export const concreteCoatings: IndustryTemplate = {
  slug: "concrete-coatings",
  label: "Concrete & Epoxy Coatings",
  expectedServices: [
    "Garage Floor Coating",
    "Epoxy Flooring",
    "Polyaspartic Coating",
    "Metallic Epoxy",
    "Commercial Floor Coating",
    "Patio Coating",
    "Pool Deck Coating",
    "Quartz Systems",
    "Hybrid Systems",
    "Flake Systems",
  ],
  emergencyServiceExpected: false,
  trustSignals: [
    "Licensed General Contractor",
    "Licensed & Bonded",
    "Insured",
    "Manufacturer-Certified Installer",
    "BBB Accredited",
  ],
  financingRelevant: true,
  maintenancePlanRelevant: false,
  conversionActions: ["Get a Free Quote", "Schedule a Consultation", "Call Now", "Request Estimate"],
  keywordSignals: {
    service: [
      "epoxy",
      "polyaspartic",
      "garage floor",
      "concrete coating",
      "floor coating",
      "metallic epoxy",
      "commercial floor coating",
      "patio coating",
      "pool deck coating",
      "pool deck",
      "quartz system",
      "quartz flooring",
      "quartz",
      "hybrid system",
      "hybrid flooring",
      "hybrid coating",
      "hybrid blend",
      "flake system",
      "flake floor",
      "flake blend",
      "polyurea",
      "polyaspartic coating",
    ],
    emergency: [],
    financing: ["financing", "payment plan", "0% apr", "special offer"],
    maintenancePlan: [],
    trust: ["licensed", "bonded", "insured", "certified", "bbb", "general contractor"],
  },
};
