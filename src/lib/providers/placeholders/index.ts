// Phase 3+ scaffolding. See CONNECTED_AUDIT_ROADMAP.md for what each of
// these requires to move from placeholder to a real "connected audit."
// None of these are called anywhere in the public-audit MVP flow.

import type {
  GoogleBusinessProfileProvider,
  SearchConsoleProvider,
  RankTrackingProvider,
  CitationProvider,
} from "../types";

export class PlaceholderGoogleBusinessProfileProvider implements GoogleBusinessProfileProvider {
  isConfigured(): boolean {
    return false;
  }
}

export class PlaceholderSearchConsoleProvider implements SearchConsoleProvider {
  isConfigured(): boolean {
    return false;
  }
}

export class PlaceholderRankTrackingProvider implements RankTrackingProvider {
  isConfigured(): boolean {
    return false;
  }
}

export class PlaceholderCitationProvider implements CitationProvider {
  isConfigured(): boolean {
    return false;
  }
}

export function getGoogleBusinessProfileProvider(): GoogleBusinessProfileProvider {
  return new PlaceholderGoogleBusinessProfileProvider();
}

export function getSearchConsoleProvider(): SearchConsoleProvider {
  return new PlaceholderSearchConsoleProvider();
}

export function getRankTrackingProvider(): RankTrackingProvider {
  return new PlaceholderRankTrackingProvider();
}

export function getCitationProvider(): CitationProvider {
  return new PlaceholderCitationProvider();
}
