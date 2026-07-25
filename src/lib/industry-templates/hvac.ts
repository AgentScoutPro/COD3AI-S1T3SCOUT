import type { IndustryTemplate } from "./types";

export const hvac: IndustryTemplate = {
  slug: "hvac",
  label: "HVAC",
  expectedServices: [
    "AC Repair",
    "AC Installation",
    "Heating Repair",
    "Furnace Installation",
    "Heat Pump Service",
    "Ductwork",
    "Indoor Air Quality",
    "Thermostat Installation",
  ],
  emergencyServiceExpected: true,
  trustSignals: ["NATE Certified", "EPA Certified", "Licensed & Insured", "BBB Accredited", "Manufacturer Warranty"],
  financingRelevant: true,
  maintenancePlanRelevant: true,
  conversionActions: ["Schedule Service", "Request Free Estimate", "Call Now", "Book Online"],
  keywordSignals: {
    service: ["ac repair", "air conditioning", "heating repair", "furnace", "heat pump", "ductwork", "hvac"],
    emergency: ["emergency", "24/7", "same day", "same-day", "24 hour"],
    financing: ["financing", "payment plan", "0% apr", "special offer"],
    maintenancePlan: ["maintenance plan", "tune-up", "membership", "service agreement"],
    trust: ["nate certified", "epa certified", "licensed", "insured", "bbb", "warranty"],
  },
};
