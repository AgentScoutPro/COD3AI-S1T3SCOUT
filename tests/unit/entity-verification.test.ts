import { describe, expect, it } from "vitest";
import { verifyEntity } from "@/lib/audit/entity-verification";
import type { PlaceRecord } from "@/lib/providers/types";

function makePlace(overrides: Partial<PlaceRecord> = {}): PlaceRecord {
  return {
    placeId: "place-1",
    name: "Desert Comfort Heating & Air",
    formattedAddress: "123 Main St, Phoenix, AZ 85001",
    phone: "(480) 555-1234",
    websiteUri: "https://desertcomfortair.com",
    businessStatus: "OPERATIONAL",
    primaryType: "hvac_contractor",
    secondaryTypes: [],
    rating: 4.7,
    userRatingCount: 120,
    openingHours: [],
    reviews: [],
    googleMapsUri: null,
    ...overrides,
  };
}

const business = {
  name: "Desert Comfort Heating & Air",
  normalizedDomain: "desertcomfortair.com",
  phone: "(480) 555-1234",
  city: "Phoenix",
  state: "AZ",
};

describe("verifyEntity", () => {
  it("is not_applicable when there is no Places match to verify", () => {
    const result = verifyEntity({ business, place: null });
    expect(result.status).toBe("not_applicable");
  });

  it("verifies a match with matching name, domain, phone, and city/state", () => {
    const result = verifyEntity({ business, place: makePlace() });
    expect(result.status).toBe("verified");
    expect(result.matchedSignals).toContain("website_domain");
    expect(result.confidence).toBeGreaterThanOrEqual(60);
  });

  // Required test #15: unverified Google entities are not scored — this
  // covers the verification side; the scoring-engine test file covers the
  // "not scored" side (placesConfigured routes through the unknown gate).
  it("does not verify a domain conflict even when the name and city otherwise match", () => {
    const result = verifyEntity({
      business,
      place: makePlace({ websiteUri: "https://a-totally-different-garage-door-company.com" }),
    });
    expect(result.status).toBe("unverified");
    expect(result.conflictingSignals).toContain("website_domain");
  });

  it("does not verify on name alone, even a strong one", () => {
    const result = verifyEntity({
      business: { ...business, phone: null },
      place: makePlace({ websiteUri: null, phone: null, formattedAddress: "" }),
    });
    expect(result.status).toBe("unverified");
  });

  it("does not verify when city/state don't match the returned address", () => {
    const result = verifyEntity({
      business: { ...business, phone: null },
      place: makePlace({ websiteUri: null, phone: null, formattedAddress: "500 Ocean Ave, Miami, FL 33101" }),
    });
    expect(result.status).toBe("unverified");
    expect(result.conflictingSignals).toContain("city_state");
  });

  it("verifies a maps-link match at high confidence even without a second corroborating signal", () => {
    const result = verifyEntity({
      business: { ...business, phone: null },
      place: makePlace({ websiteUri: null, phone: null, formattedAddress: "" }),
      matchedViaMapsLink: true,
    });
    expect(result.status).toBe("verified");
    expect(result.confidence).toBeGreaterThanOrEqual(95);
    expect(result.matchedSignals).toContain("maps_link");
  });

  it("still refuses to verify a maps-link match if the returned place's own domain conflicts", () => {
    const result = verifyEntity({
      business,
      place: makePlace({ websiteUri: "https://a-totally-different-company.com" }),
      matchedViaMapsLink: true,
    });
    expect(result.status).toBe("unverified");
  });

  it("excludes an unevaluable signal from confidence rather than penalizing it", () => {
    // No phone on either side — phone should be excluded from the
    // denominator, not silently counted as a conflict.
    const result = verifyEntity({
      business: { ...business, phone: null },
      place: makePlace({ phone: null }),
    });
    expect(result.matchedSignals).not.toContain("phone");
    expect(result.conflictingSignals).not.toContain("phone");
  });
});
