import type { IndustryTemplate } from "./types";

export const roofing: IndustryTemplate = {
  slug: "roofing",
  label: "Roofing",
  expectedServices: [
    "Roof Repair",
    "Roof Replacement",
    "Roof Inspection",
    "Storm Damage Repair",
    "Shingle Roofing",
    "Metal Roofing",
    "Flat Roofing",
    "Gutter Installation",
  ],
  emergencyServiceExpected: true,
  trustSignals: [
    "GAF Certified",
    "Owens Corning Preferred",
    "Licensed & Insured",
    "BBB Accredited",
    "Manufacturer Warranty",
  ],
  financingRelevant: true,
  maintenancePlanRelevant: false,
  conversionActions: ["Request Free Inspection", "Get a Quote", "Call Now", "Book Online"],
  keywordSignals: {
    service: ["roof repair", "roof replacement", "roof inspection", "storm damage", "shingle", "metal roof", "flat roof", "gutter", "roofing"],
    emergency: ["emergency", "storm damage", "tarp", "leak repair", "same day"],
    financing: ["financing", "payment plan", "insurance claim", "0% apr"],
    maintenancePlan: ["maintenance plan", "annual inspection"],
    trust: ["gaf certified", "owens corning", "licensed", "insured", "bbb", "warranty"],
  },
};
