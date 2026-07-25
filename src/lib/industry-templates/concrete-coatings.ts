import type { IndustryTemplate } from "./types";

export const concreteCoatings: IndustryTemplate = {
  slug: "concrete-coatings",
  label: "Concrete & Epoxy Coatings",
  expectedServices: [
    "Garage Floor Coating",
    "Epoxy Flooring",
    "Polyaspartic Coating",
    "Concrete Resurfacing",
    "Decorative Concrete",
    "Concrete Crack Repair",
    "Commercial Floor Coating",
    "Patio & Pool Deck Coating",
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
      "decorative concrete",
      "quartz flooring",
      "concrete resurfacing",
    ],
    emergency: [],
    financing: ["financing", "payment plan", "0% apr", "special offer"],
    maintenancePlan: [],
    trust: ["licensed", "bonded", "insured", "certified", "bbb", "general contractor"],
  },
};
