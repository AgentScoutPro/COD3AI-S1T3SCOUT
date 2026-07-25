import { describe, expect, it } from "vitest";
import { MockGooglePlacesProvider } from "@/lib/providers/places/mock";
import { normalizeDomain } from "@/lib/crawler/normalize";

describe("competitor dedup", () => {
  it("excludes the audited business's own domain from competitor results", async () => {
    const provider = new MockGooglePlacesProvider();
    const businessDomain = normalizeDomain("desertcomfortair.com");

    const result = await provider.searchCompetitors({
      serviceCategory: "hvac",
      city: "Phoenix",
      state: "AZ",
      excludeNormalizedDomain: businessDomain,
      limit: 5,
    });

    for (const competitor of result.data) {
      if (competitor.websiteUri) {
        expect(normalizeDomain(competitor.websiteUri)).not.toBe(businessDomain);
      }
    }
  });

  it("returns distinct place IDs", async () => {
    const provider = new MockGooglePlacesProvider();
    const result = await provider.searchCompetitors({ serviceCategory: "plumbing", city: "Tucson", state: "AZ", limit: 5 });
    const placeIds = result.data.map((c) => c.placeId);
    expect(new Set(placeIds).size).toBe(placeIds.length);
  });
});
