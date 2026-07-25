import type { IndustryTemplate } from "./types";

export const junkRemoval: IndustryTemplate = {
  slug: "junk-removal",
  label: "Junk Removal",
  expectedServices: [
    "Residential Junk Removal",
    "Commercial Junk Removal",
    "Furniture Removal",
    "Appliance Removal",
    "Estate Cleanout",
    "Construction Debris Removal",
    "Yard Waste Removal",
    "Hoarding Cleanup",
  ],
  emergencyServiceExpected: false,
  trustSignals: ["Licensed & Insured", "BBB Accredited", "Eco-Friendly Disposal", "Locally Owned"],
  financingRelevant: false,
  maintenancePlanRelevant: false,
  conversionActions: ["Get a Free Quote", "Book Online", "Call Now", "Same-Day Booking"],
  keywordSignals: {
    service: ["junk removal", "furniture removal", "appliance removal", "estate cleanout", "debris removal", "yard waste", "hoarding cleanup"],
    emergency: ["same day", "same-day", "next day"],
    financing: [],
    maintenancePlan: [],
    trust: ["licensed", "insured", "bbb", "eco-friendly", "locally owned"],
  },
};
