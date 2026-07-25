import { env } from "@/lib/env";
import type { WebsiteProvider } from "../types";
import { MockWebsiteProvider } from "./mock";
import { LiveWebsiteProvider } from "./live";

export function getWebsiteProvider(): WebsiteProvider {
  // The crawler itself needs no API key, but we still gate it behind the
  // global provider mode switch for consistent, demoable mock audits.
  return env.providerMode === "live" ? new LiveWebsiteProvider() : new MockWebsiteProvider();
}
