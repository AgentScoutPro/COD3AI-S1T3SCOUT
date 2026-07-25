import type { IndustryTemplate } from "./types";

export const landscaping: IndustryTemplate = {
  slug: "landscaping",
  label: "Landscaping",
  expectedServices: [
    "Lawn Care",
    "Landscape Design",
    "Irrigation Installation",
    "Tree Trimming",
    "Hardscaping",
    "Sod Installation",
    "Mulching",
    "Seasonal Cleanup",
  ],
  emergencyServiceExpected: false,
  trustSignals: ["Licensed & Insured", "Certified Landscape Professional", "BBB Accredited", "Locally Owned"],
  financingRelevant: false,
  maintenancePlanRelevant: true,
  conversionActions: ["Get a Free Quote", "Request Estimate", "Call Now", "Book Online"],
  keywordSignals: {
    service: ["lawn care", "landscape design", "irrigation", "tree trimming", "hardscaping", "sod installation", "mulching", "landscaping"],
    emergency: ["storm cleanup", "emergency tree removal"],
    financing: ["financing", "payment plan"],
    maintenancePlan: ["maintenance plan", "recurring service", "seasonal program", "membership"],
    trust: ["licensed", "insured", "certified", "bbb", "locally owned"],
  },
};
