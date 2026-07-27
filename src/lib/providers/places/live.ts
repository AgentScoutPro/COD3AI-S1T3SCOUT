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
            return { mode: "live", status: "ok", data: toPlaceRecord(results[0]), rawMetadata: { matchedViaMapsLink: true } };
          }
        }
      } catch {
        // Fall through to the name+city search below.
      }
    }

    try {
      const results = await searchText(`${input.name}, ${input.city}, ${input.state}`, 1);
      if (results.length === 0) return { mode: "live", status: "partial", data: null };
      return { mode: "live", status: "ok", data: toPlaceRecord(results[0]) };
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
