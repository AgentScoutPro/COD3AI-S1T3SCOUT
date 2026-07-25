import type { IndustryTemplate } from "./types";

export const pestControl: IndustryTemplate = {
  slug: "pest-control",
  label: "Pest Control",
  expectedServices: [
    "General Pest Control",
    "Termite Treatment",
    "Rodent Control",
    "Mosquito Control",
    "Bed Bug Treatment",
    "Ant Control",
    "Wildlife Removal",
    "Commercial Pest Control",
  ],
  emergencyServiceExpected: true,
  trustSignals: ["State Licensed Applicator", "QualityPro Certified", "Bonded & Insured", "BBB Accredited"],
  financingRelevant: false,
  maintenancePlanRelevant: true,
  conversionActions: ["Schedule Inspection", "Get a Free Quote", "Call Now", "Book Online"],
  keywordSignals: {
    service: ["pest control", "termite", "rodent control", "mosquito control", "bed bug", "ant control", "wildlife removal", "exterminator"],
    emergency: ["emergency", "same day", "urgent infestation"],
    financing: [],
    maintenancePlan: ["quarterly service", "maintenance plan", "membership", "recurring treatment"],
    trust: ["licensed", "qualitypro", "bonded", "insured", "bbb"],
  },
};
