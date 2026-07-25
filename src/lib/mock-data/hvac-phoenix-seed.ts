import type { AuditIntakeInput } from "@/lib/validation/audit";

/** Fixed demo business used by `npm run seed`. In AUDIT_PROVIDER_MODE=mock
 * this produces a full, realistic HVAC audit — crawl, Places, PageSpeed,
 * competitors, 40+ findings, category scores, and a completed report —
 * with zero paid API keys. */
export const HVAC_PHOENIX_SEED: AuditIntakeInput = {
  businessName: "Desert Comfort Heating & Air",
  websiteUrl: "https://desertcomfortair.example.com",
  industry: "hvac",
  city: "Phoenix",
  state: "AZ",
  phone: "(602) 555-0142",
  email: "info@desertcomfortair.example.com",
};
