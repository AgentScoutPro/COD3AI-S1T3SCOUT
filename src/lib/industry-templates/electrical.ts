import type { IndustryTemplate } from "./types";

export const electrical: IndustryTemplate = {
  slug: "electrical",
  label: "Electrical",
  expectedServices: [
    "Electrical Repair",
    "Panel Upgrade",
    "Wiring & Rewiring",
    "Lighting Installation",
    "EV Charger Installation",
    "Generator Installation",
    "Electrical Inspection",
    "Ceiling Fan Installation",
  ],
  emergencyServiceExpected: true,
  trustSignals: ["Licensed Electrician", "Bonded & Insured", "BBB Accredited", "Master Electrician on Staff"],
  financingRelevant: true,
  maintenancePlanRelevant: false,
  conversionActions: ["Schedule Service", "Request Free Estimate", "Call Now", "Book Online"],
  keywordSignals: {
    service: ["electrical repair", "panel upgrade", "rewiring", "lighting installation", "ev charger", "generator", "electrical inspection", "electrician"],
    emergency: ["emergency", "24/7", "same day", "power outage", "24 hour"],
    financing: ["financing", "payment plan", "0% apr"],
    maintenancePlan: ["maintenance plan", "inspection program"],
    trust: ["licensed", "master electrician", "bonded", "insured", "bbb"],
  },
};
