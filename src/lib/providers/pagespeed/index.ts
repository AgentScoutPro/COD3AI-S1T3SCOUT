import { env, hasPageSpeedCredentials } from "@/lib/env";
import type { PageSpeedProvider } from "../types";
import { MockPageSpeedProvider } from "./mock";
import { LivePageSpeedProvider } from "./live";

export function getPageSpeedProvider(): PageSpeedProvider {
  return env.providerMode === "live" && hasPageSpeedCredentials()
    ? new LivePageSpeedProvider()
    : new MockPageSpeedProvider();
}
