// Resolves a user-supplied Google Maps / Business Profile share link into a
// business name + precise lat/lng, so the live Places provider can do a
// tight-radius location-biased search instead of guessing from name+city.
// Deliberately isolated and side-effect-free (besides the one optional
// fetch for short-link redirects) so it's easy to unit test and easy to
// disable if URL parsing ever proves fragile — see
// src/lib/providers/places/live.ts for the one call site.

export interface MapsLinkLocation {
  /** Business name parsed from the /maps/place/<name>/ path segment, when present. */
  name: string | null;
  lat: number;
  lng: number;
}

const SHORT_LINK_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);
const GOOGLE_HOST_PATTERN = /(^|\.)google\.[a-z.]+$/i;
const PLACE_NAME_PATTERN = /\/maps\/place\/([^/@]+)/;
const AT_COORD_PATTERN = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
// The `!3d<lat>!4d<lng>` pair is the actual pinned-place coordinate; `@lat,lng`
// is just the map viewport center, which can drift from the pin. Preferred
// when both are present.
const BANG_COORD_PATTERN = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;

/** Never throws — any failure (bad URL, redirect failure, unrecognized
 * format, no coordinates found) resolves to `null` so callers can fall
 * back to name+city search silently, per spec. */
export async function resolveMapsLink(
  input: string,
  fetchImpl: typeof fetch = fetch
): Promise<MapsLinkLocation | null> {
  let destinationUrl: string;
  try {
    const parsed = new URL(input);
    if (SHORT_LINK_HOSTS.has(parsed.hostname)) {
      const res = await fetchImpl(input, { method: "GET", redirect: "follow" });
      destinationUrl = res.url || input;
    } else {
      destinationUrl = input;
    }
  } catch {
    return null;
  }

  return parseMapsUrl(destinationUrl);
}

/** Pure URL-parsing half of resolveMapsLink, split out for direct testing
 * without mocking fetch. */
export function parseMapsUrl(url: string): MapsLinkLocation | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!GOOGLE_HOST_PATTERN.test(parsed.hostname)) return null;

  const searchable = parsed.pathname + parsed.search + parsed.hash;
  const coordMatch = searchable.match(BANG_COORD_PATTERN) ?? searchable.match(AT_COORD_PATTERN);
  if (!coordMatch) return null;

  const lat = Number(coordMatch[1]);
  const lng = Number(coordMatch[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const nameMatch = parsed.pathname.match(PLACE_NAME_PATTERN);
  const name = nameMatch ? decodeURIComponent(nameMatch[1].replace(/\+/g, " ")).trim() || null : null;

  return { name, lat, lng };
}
