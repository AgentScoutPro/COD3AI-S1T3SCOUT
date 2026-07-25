import type { IndustryTemplate } from "./types";

export const poolService: IndustryTemplate = {
  slug: "pool-service",
  label: "Pool Service",
  expectedServices: [
    "Pool Cleaning",
    "Pool Repair",
    "Pool Equipment Repair",
    "Pool Pump Installation",
    "Pool Heater Installation",
    "Pool Remodeling",
    "Green Pool Cleanup",
    "Pool Inspection",
  ],
  emergencyServiceExpected: false,
  trustSignals: ["Licensed & Insured", "CPO Certified", "BBB Accredited", "Manufacturer Warranty"],
  financingRelevant: true,
  maintenancePlanRelevant: true,
  conversionActions: ["Get a Free Quote", "Schedule Service", "Call Now", "Book Online"],
  keywordSignals: {
    service: ["pool cleaning", "pool repair", "pool equipment", "pool pump", "pool heater", "pool remodel", "green pool", "pool service"],
    emergency: ["green pool", "urgent repair", "same day"],
    financing: ["financing", "payment plan"],
    maintenancePlan: ["weekly service", "maintenance plan", "membership", "recurring cleaning"],
    trust: ["licensed", "insured", "cpo certified", "bbb", "warranty"],
  },
};
