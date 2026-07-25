import { env, hasPlacesCredentials } from "@/lib/env";
import type { GooglePlacesProvider } from "../types";
import { MockGooglePlacesProvider } from "./mock";
import { LiveGooglePlacesProvider } from "./live";

export function getGooglePlacesProvider(): GooglePlacesProvider {
  return env.providerMode === "live" && hasPlacesCredentials()
    ? new LiveGooglePlacesProvider()
    : new MockGooglePlacesProvider();
}
