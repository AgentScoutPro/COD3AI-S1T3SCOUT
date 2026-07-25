import type { CrmProvider } from "../types";
import { GhlCrmProvider } from "./ghl";

export function getCrmProvider(): CrmProvider {
  // GHL is fault-tolerant by design (see ghl.ts) — no mock/live split needed.
  return new GhlCrmProvider();
}
