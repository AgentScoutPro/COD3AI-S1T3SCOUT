import type { IndustryTemplate } from "./types";

export const garageDoor: IndustryTemplate = {
  slug: "garage-door",
  label: "Garage Door",
  expectedServices: [
    "Garage Door Repair",
    "Garage Door Installation",
    "Spring Replacement",
    "Opener Repair",
    "Opener Installation",
    "Panel Replacement",
    "Cable Repair",
    "Commercial Garage Doors",
  ],
  emergencyServiceExpected: true,
  trustSignals: ["Licensed & Insured", "Manufacturer Certified", "BBB Accredited", "Manufacturer Warranty"],
  financingRelevant: true,
  maintenancePlanRelevant: true,
  conversionActions: ["Schedule Service", "Get a Free Estimate", "Call Now", "Book Online"],
  keywordSignals: {
    service: ["garage door repair", "garage door installation", "spring replacement", "opener repair", "panel replacement", "cable repair", "garage door"],
    emergency: ["emergency", "same day", "24/7", "24 hour", "door stuck"],
    financing: ["financing", "payment plan", "0% apr"],
    maintenancePlan: ["maintenance plan", "tune-up", "annual service"],
    trust: ["licensed", "insured", "certified", "bbb", "warranty"],
  },
};
