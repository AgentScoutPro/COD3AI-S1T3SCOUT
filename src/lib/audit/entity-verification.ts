// Multi-signal verification that a Google Places match actually is the
// audited business, before any Google-derived data is trusted. See
// artifacts/platform-audit-root-cause.md §6: `findBusiness()` previously
// accepted the first text-search result with no verification at all, so an
// incorrect (or merely live-but-wrong) match would be scored with full
// confidence, same as a mock one.

import type { PlaceRecord } from "@/lib/providers/types";
import { normalizeBusinessName, normalizeDomain, normalizePhone } from "@/lib/crawler/normalize";
import type { EntityVerificationStatus } from "@/lib/supabase/types";

export interface EntityVerificationInput {
  business: {
    name: string;
    normalizedDomain: string;
    phone: string | null;
    city: string;
    state: string;
  };
  place: PlaceRecord | null;
}

export interface EntityVerificationResult {
  status: EntityVerificationStatus;
  confidence: number; // 0-100
  matchedSignals: string[];
  conflictingSignals: string[];
}

/** Minimum weighted-signal confidence to trust a Google match. */
const VERIFIED_THRESHOLD = 60;
/** A single matched signal (e.g. name alone — many businesses share
 * generic names) is not enough to call a match verified. */
const MIN_MATCHED_SIGNALS = 2;

export function verifyEntity(input: EntityVerificationInput): EntityVerificationResult {
  const { business, place } = input;
  if (!place) {
    return { status: "not_applicable", confidence: 0, matchedSignals: [], conflictingSignals: [] };
  }

  const matched: string[] = [];
  const conflicting: string[] = [];
  let weight = 0;
  let possible = 0;

  // Name — evaluable whenever the Places record has a name at all.
  const placeName = normalizeBusinessName(place.name);
  if (placeName) {
    possible += 25;
    const siteName = normalizeBusinessName(business.name);
    if (siteName && (siteName === placeName || siteName.includes(placeName) || placeName.includes(siteName))) {
      matched.push("business_name");
      weight += 25;
    } else {
      conflicting.push("business_name");
    }
  }

  // Domain — the strongest single signal, but only evaluable when Google
  // returned a website at all (many small businesses have none listed).
  if (place.websiteUri) {
    possible += 35;
    if (normalizeDomain(place.websiteUri) === business.normalizedDomain) {
      matched.push("website_domain");
      weight += 35;
    } else {
      conflicting.push("website_domain");
    }
  }

  // Phone — only evaluable when both sides provided one (intake phone is optional).
  if (business.phone && place.phone) {
    possible += 20;
    if (normalizePhone(business.phone) === normalizePhone(place.phone)) {
      matched.push("phone");
      weight += 20;
    } else {
      conflicting.push("phone");
    }
  }

  // City/state — only evaluable when Google returned a formatted address.
  if (place.formattedAddress) {
    possible += 20;
    const address = place.formattedAddress.toLowerCase();
    const cityMatch = Boolean(business.city) && address.includes(business.city.toLowerCase());
    const stateMatch = Boolean(business.state) && address.includes(business.state.toLowerCase());
    if (cityMatch && stateMatch) {
      matched.push("city_state");
      weight += 20;
    } else {
      conflicting.push("city_state");
    }
  }

  const confidence = possible > 0 ? Math.round((weight / possible) * 10000) / 100 : 0;

  // A domain conflict is disqualifying on its own regardless of the
  // aggregate score — a matching name and city can still be a different
  // franchise location or an unrelated competitor.
  const domainConflict = conflicting.includes("website_domain");
  const status: EntityVerificationStatus =
    !domainConflict && confidence >= VERIFIED_THRESHOLD && matched.length >= MIN_MATCHED_SIGNALS
      ? "verified"
      : "unverified";

  return { status, confidence, matchedSignals: matched, conflictingSignals: conflicting };
}
