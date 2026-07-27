import type { GooglePlacesProvider, PlaceRecord, ProviderResult } from "../types";
import { seededRandom, chance, pick } from "../seeded-random";
import { normalizeDomain } from "@/lib/crawler/normalize";

const REVIEW_SNIPPETS = [
  "Showed up on time and fixed the issue fast.",
  "Great communication, fair pricing, would use again.",
  "Technician was knowledgeable and courteous.",
  "Took longer than expected but did quality work.",
  "Very responsive and professional from start to finish.",
];

function makeReviews(rng: () => number, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    authorName: pick(rng, ["A. Rodriguez", "J. Smith", "M. Chen", "K. Patel", "T. Nguyen"]),
    rating: 3 + Math.floor(rng() * 3),
    relativeTime: pick(rng, ["a week ago", "2 months ago", "3 weeks ago", "a year ago", "5 days ago"]),
    text: REVIEW_SNIPPETS[i % REVIEW_SNIPPETS.length],
  }));
}

export class MockGooglePlacesProvider implements GooglePlacesProvider {
  async findBusiness(input: {
    name: string;
    city: string;
    state: string;
    websiteUrl: string;
    mapsLink?: string | null;
  }): Promise<ProviderResult<PlaceRecord | null>> {
    const rng = seededRandom(`${input.name}:${input.city}:${input.state}`);
    const rating = Math.round((3.5 + rng() * 1.4) * 10) / 10;
    const record: PlaceRecord = {
      placeId: `mock-place-${hash(input.name + input.city)}`,
      name: input.name,
      formattedAddress: `${1000 + Math.floor(rng() * 8999)} Main St, ${input.city}, ${input.state}`,
      phone: `(${480 + Math.floor(rng() * 100)}) 555-${1000 + Math.floor(rng() * 8999)}`,
      websiteUri: input.websiteUrl,
      businessStatus: "OPERATIONAL",
      primaryType: "home_service",
      secondaryTypes: [],
      rating,
      userRatingCount: 20 + Math.floor(rng() * 400),
      openingHours: ["Mon-Fri 7:00am-7:00pm", "Sat 8:00am-4:00pm", "Sun Closed"],
      reviews: makeReviews(rng, Math.min(5, 2 + Math.floor(rng() * 4))),
      googleMapsUri: `https://maps.google.com/?cid=${hash(input.name)}`,
    };
    return { mode: "mock", status: "ok", data: record, rawMetadata: { mock: true } };
  }

  async searchCompetitors(input: {
    serviceCategory: string;
    city: string;
    state: string;
    excludePlaceId?: string;
    excludeNormalizedDomain?: string;
    limit: number;
  }): Promise<ProviderResult<PlaceRecord[]>> {
    const rng = seededRandom(`${input.serviceCategory}:${input.city}:${input.state}`);
    const namePrefixes = ["Elite", "Pro", "Reliable", "Valley", "Precision", "Trusted", "Superior", "Metro"];
    const nameSuffixes: Record<string, string> = {
      hvac: "Heating & Air",
      plumbing: "Plumbing",
      roofing: "Roofing",
      electrical: "Electric",
      "junk-removal": "Junk Removal",
      landscaping: "Landscaping",
      "pest-control": "Pest Control",
      moving: "Movers",
      "garage-door": "Garage Door",
      "pool-service": "Pool Service",
    };
    const suffix = nameSuffixes[input.serviceCategory] ?? "Home Services";

    const results: PlaceRecord[] = [];
    for (let i = 0; i < input.limit; i++) {
      const name = `${pick(rng, namePrefixes)} ${suffix}`;
      const domain = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;
      if (input.excludeNormalizedDomain && normalizeDomain(domain) === input.excludeNormalizedDomain) continue;

      results.push({
        placeId: `mock-competitor-${hash(name + i)}`,
        name,
        formattedAddress: `${100 + Math.floor(rng() * 9899)} Commerce Dr, ${input.city}, ${input.state}`,
        phone: `(${480 + Math.floor(rng() * 100)}) 555-${1000 + Math.floor(rng() * 8999)}`,
        websiteUri: chance(rng, 0.85) ? `https://${domain}` : null,
        businessStatus: "OPERATIONAL",
        primaryType: input.serviceCategory,
        secondaryTypes: [],
        rating: Math.round((3.2 + rng() * 1.7) * 10) / 10,
        userRatingCount: 5 + Math.floor(rng() * 600),
        openingHours: ["Mon-Fri 7:00am-6:00pm"],
        reviews: makeReviews(rng, Math.min(5, 1 + Math.floor(rng() * 5))),
        googleMapsUri: `https://maps.google.com/?cid=${hash(name)}`,
      });
    }

    return { mode: "mock", status: "ok", data: results, rawMetadata: { mock: true } };
  }
}

function hash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
