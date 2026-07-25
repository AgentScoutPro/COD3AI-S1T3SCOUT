import type { IndustryTemplate } from "./types";

export const moving: IndustryTemplate = {
  slug: "moving",
  label: "Moving",
  expectedServices: [
    "Local Moving",
    "Long Distance Moving",
    "Residential Moving",
    "Commercial Moving",
    "Packing Services",
    "Storage Solutions",
    "Piano Moving",
    "Last-Minute Moves",
  ],
  emergencyServiceExpected: false,
  trustSignals: ["Licensed & Insured", "USDOT Registered", "BBB Accredited", "AMSA ProMover"],
  financingRelevant: false,
  maintenancePlanRelevant: false,
  conversionActions: ["Get a Free Quote", "Book Your Move", "Call Now", "Request Estimate"],
  keywordSignals: {
    service: ["local moving", "long distance moving", "residential moving", "commercial moving", "packing services", "storage", "piano moving", "movers"],
    emergency: ["last minute", "last-minute", "same day", "urgent move"],
    financing: [],
    maintenancePlan: [],
    trust: ["licensed", "insured", "usdot", "bbb", "promover"],
  },
};
