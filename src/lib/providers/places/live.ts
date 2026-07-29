import type { GooglePlacesProvider, PlaceRecord, ProviderResult } from "../types";
import { env } from "@/lib/env";
import { normalizeDomain } from "@/lib/crawler/normalize";
import { resolveMapsLink } from "./maps-link";

/** Tight radius around a maps-link-resolved pin — small enough that a
 * match within it is effectively a location confirmation, not a guess. */
const MAPS_LINK_BIAS_RADIUS_METERS = 200;

const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

// Narrow field mask — request only what the scoring engine and report use.
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.businessStatus",
  "places.primaryType",
  "places.types",
  "places.rating",
  "places.userRatingCount",
  "places.regularOpeningHours",
  "places.reviews",
  "places.googleMapsUri",
].join(",");

interface RawPlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  businessStatus?: string;
  primaryType?: string;
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  reviews?: Array<{ authorAttribution?: { displayName?: string }; rating?: number; relativePublishTimeDescription?: string; text?: { text?: string } }>;
  googleMapsUri?: string;
}

function toPlaceRecord(raw: RawPlace): PlaceRecord {
  return {
    placeId: raw.id,
    name: raw.displayName?.text ?? "",
    formattedAddress: raw.formattedAddress ?? "",
    phone: raw.internationalPhoneNumber ?? null,
    websiteUri: raw.websiteUri ?? null,
    businessStatus: raw.businessStatus ?? "UNKNOWN",
    primaryType: raw.primaryType ?? null,
    secondaryTypes: raw.types ?? [],
    rating: raw.rating ?? null,
    userRatingCount: raw.userRatingCount ?? null,
    openingHours: raw.regularOpeningHours?.weekdayDescriptions ?? [],
    // Public Places reviews are capped at 5 by the API — never a full history.
    reviews: (raw.reviews ?? []).slice(0, 5).map((r) => ({
      authorName: r.authorAttribution?.displayName ?? "Anonymous",
      rating: r.rating ?? 0,
      relativeTime: r.relativePublishTimeDescription ?? "",
      text: r.text?.text ?? "",
    })),
    googleMapsUri: raw.googleMapsUri ?? null,
  };
}

interface LocationBias {
  lat: number;
  lng: number;
  radiusMeters: number;
}

/** How a candidate was selected — carried through to the scoring layer
 * (see RuleContext.placeMatchMethod) so "confidently matched by website"
 * reads differently from "weakly matched by name only" instead of
 * collapsing into one generic "found" message. */
export type PlaceMatchMethod = "website" | "name";
/** Which search this candidate came from — the strict query is
 * name+city+state; the fallback drops the city, which is what actually
 * finds real businesses the strict query misses (confirmed case: JM
 * Electrical, Queen Creek, AZ — zero results on the strict query, found
 * on the broader one, with an active Yelp/Thumbtack/Facebook presence). */
export type PlaceQueryPath = "strict" | "fallback";

interface CandidateMatch {
  place: RawPlace;
  matchMethod: PlaceMatchMethod;
  score: number;
}

/** Confidence floor for a name-only match — below this, a candidate isn't
 * trustworthy enough to treat as "found" at all (still just a starting
 * point; src/lib/audit/entity-verification.ts is the actual trust gate
 * before any Google data gets scored or displayed). */
const NAME_MATCH_FLOOR = 0.4;

function normalizeForMatching(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Case-insensitive substring/token-overlap score — no fuzzy-matching
 * library needed for this. Returns 0-1. */
function scoreNameSimilarity(inputName: string, candidateName: string): number {
  const a = normalizeForMatching(inputName);
  const b = normalizeForMatching(candidateName);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;

  const aTokens = new Set(a.split(" ").filter(Boolean));
  const bTokens = new Set(b.split(" ").filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of aTokens) if (bTokens.has(token)) overlap++;
  return overlap / Math.max(aTokens.size, bTokens.size);
}

/** Picks the best candidate from a batch of search results, or null if
 * nothing clears the confidence floor. A website-domain match is decisive
 * on its own regardless of name similarity — much stronger evidence than
 * text similarity, since two unrelated businesses essentially never share
 * a domain. */
function pickBestCandidate(
  candidates: RawPlace[],
  input: { name: string; websiteUrl: string }
): CandidateMatch | null {
  const inputDomain = normalizeDomain(input.websiteUrl);

  for (const candidate of candidates) {
    if (candidate.websiteUri && normalizeDomain(candidate.websiteUri) === inputDomain) {
      return { place: candidate, matchMethod: "website", score: 1 };
    }
  }

  let best: CandidateMatch | null = null;
  for (const candidate of candidates) {
    const score = scoreNameSimilarity(input.name, candidate.displayName?.text ?? "");
    if (!best || score > best.score) {
      best = { place: candidate, matchMethod: "name", score };
    }
  }

  return best && best.score >= NAME_MATCH_FLOOR ? best : null;
}

async function searchText(query: string, limit: number, locationBias?: LocationBias): Promise<RawPlace[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.requestTimeoutMs);
  try {
    const res = await fetch(PLACES_SEARCH_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.googleMapsApiKey ?? "",
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: Math.min(limit, 20),
        ...(locationBias
          ? {
              locationBias: {
                circle: {
                  center: { latitude: locationBias.lat, longitude: locationBias.lng },
                  radius: locationBias.radiusMeters,
                },
              },
            }
          : {}),
      }),
    });
    if (!res.ok) throw new Error(`Places API error: ${res.status}`);
    const json = (await res.json()) as { places?: RawPlace[] };
    return json.places ?? [];
  } finally {
    clearTimeout(timeout);
  }
}

export class LiveGooglePlacesProvider implements GooglePlacesProvider {
  async findBusiness(input: {
    name: string;
    city: string;
    state: string;
    websiteUrl: string;
    mapsLink?: string | null;
  }): Promise<ProviderResult<PlaceRecord | null>> {
    if (!env.googleMapsApiKey) {
      return { mode: "live", status: "error", data: null, errorMessage: "GOOGLE_MAPS_API_KEY not configured." };
    }

    // A supplied Maps link, when it resolves, gives a precise pin to
    // search around instead of guessing from the user-typed city — try it
    // first, but never let a resolution/search failure here block the
    // ordinary name+city fallback below.
    if (input.mapsLink) {
      try {
        const resolved = await resolveMapsLink(input.mapsLink);
        if (resolved) {
          const results = await searchText(resolved.name ?? input.name, 1, {
            lat: resolved.lat,
            lng: resolved.lng,
            radiusMeters: MAPS_LINK_BIAS_RADIUS_METERS,
          });
          if (results.length > 0) {
            return {
              mode: "live",
              status: "ok",
              data: toPlaceRecord(results[0]),
              rawMetadata: { matchedViaMapsLink: true, matchMethod: "maps_link", queryPath: "maps_link" },
            };
          }
        }
      } catch {
        // Fall through to the name+city search below.
      }
    }

    // A single result taken blindly was too fragile — a real, established
    // business can legitimately return zero results on a strict
    // name+city+state text query (confirmed: JM Electrical, Queen Creek,
    // AZ) even though the same API key finds it fine once the query
    // broadens. Request several candidates and score them instead of
    // trusting whatever comes back first.
    try {
      const strictResults = await searchText(`${input.name}, ${input.city}, ${input.state}`, 5);
      const strictMatch = pickBestCandidate(strictResults, input);
      if (strictMatch) {
        return {
          mode: "live",
          status: "ok",
          data: toPlaceRecord(strictMatch.place),
          rawMetadata: { queryPath: "strict" satisfies PlaceQueryPath, matchMethod: strictMatch.matchMethod, matchScore: strictMatch.score },
        };
      }

      const fallbackResults = await searchText(`${input.name}, ${input.state}`, 5);
      const fallbackMatch = pickBestCandidate(fallbackResults, input);
      if (fallbackMatch) {
        return {
          mode: "live",
          status: "ok",
          data: toPlaceRecord(fallbackMatch.place),
          rawMetadata: { queryPath: "fallback" satisfies PlaceQueryPath, matchMethod: fallbackMatch.matchMethod, matchScore: fallbackMatch.score },
        };
      }

      return { mode: "live", status: "partial", data: null, rawMetadata: { queryPath: "fallback" satisfies PlaceQueryPath, matchMethod: "none" } };
    } catch (error) {
      return { mode: "live", status: "error", data: null, errorMessage: (error as Error).message };
    }
  }

  async searchCompetitors(input: {
    serviceCategory: string;
    city: string;
    state: string;
    excludePlaceId?: string;
    excludeNormalizedDomain?: string;
    limit: number;
  }): Promise<ProviderResult<PlaceRecord[]>> {
    if (!env.googleMapsApiKey) {
      return { mode: "live", status: "error", data: [], errorMessage: "GOOGLE_MAPS_API_KEY not configured." };
    }
    try {
      const raw = await searchText(`${input.serviceCategory} in ${input.city}, ${input.state}`, input.limit + 3);
      const filtered = raw
        .map(toPlaceRecord)
        .filter((p) => p.placeId !== input.excludePlaceId)
        .filter((p) => {
          if (!input.excludeNormalizedDomain || !p.websiteUri) return true;
          return normalizeDomain(p.websiteUri) !== input.excludeNormalizedDomain;
        })
        .slice(0, input.limit);
      return { mode: "live", status: "ok", data: filtered };
    } catch (error) {
      return { mode: "live", status: "error", data: [], errorMessage: (error as Error).message };
    }
  }
}
