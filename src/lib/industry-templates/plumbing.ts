import type { IndustryTemplate } from "./types";

export const plumbing: IndustryTemplate = {
  slug: "plumbing",
  label: "Plumbing",
  expectedServices: [
    "Drain Cleaning",
    "Water Heater Repair",
    "Water Heater Installation",
    "Leak Detection",
    "Pipe Repair",
    "Sewer Line Repair",
    "Fixture Installation",
    "Repiping",
  ],
  emergencyServiceExpected: true,
  trustSignals: ["Licensed Master Plumber", "Bonded & Insured", "BBB Accredited", "Manufacturer Warranty"],
  financingRelevant: true,
  maintenancePlanRelevant: false,
  conversionActions: ["Schedule Service", "Request Free Estimate", "Call Now", "Book Online"],
  keywordSignals: {
    service: ["drain cleaning", "water heater", "leak detection", "pipe repair", "sewer line", "repipe", "plumbing"],
    emergency: ["emergency", "24/7", "same day", "same-day", "24 hour", "burst pipe"],
    financing: ["financing", "payment plan", "0% apr", "special offer"],
    maintenancePlan: ["maintenance plan", "membership", "service agreement"],
    trust: ["licensed", "master plumber", "bonded", "insured", "bbb", "warranty"],
  },
};
