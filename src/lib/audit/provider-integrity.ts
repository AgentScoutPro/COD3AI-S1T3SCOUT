// Central provider-integrity layer. Every provider call site (Places,
// PageSpeed, website crawl, AI report, and any future GBP/Search
// Console/rank-tracking/citation provider) must route its ProviderResult
// through this before the data is persisted, scored, or displayed.
//
// See artifacts/platform-audit-root-cause.md §3–6: a global env var plus
// per-provider credential checks previously let synthetic data reach public
// reports indistinguishably from real data. This module is the single place
// that decides, per audit mode, whether a given result may be used at all.

import type { AuditMode, DisplayStatus, ProviderMode, SourceStatus, SourceType } from "@/lib/supabase/types";

export interface IntegrityCheckInput<T> {
  auditMode: AuditMode;
  sourceType: SourceType;
  providerMode: ProviderMode;
  status: SourceStatus;
  data: T;
}

export interface IntegrityCheckResult<T> {
  /** Whether `data` may be persisted, scored, or displayed. */
  allowed: boolean;
  /** `input.data` when allowed, otherwise null — callers must not fall back
   * to the rejected value. */
  data: T | null;
  displayStatus: DisplayStatus;
  /** Non-null exactly when a mode rule rejected a result that would
   * otherwise have been usable — callers should persist this to
   * `integrity_warnings`. */
  warning: string | null;
}

const MOCK_PROHIBITED_MODES: readonly AuditMode[] = ["public_live", "connected_client"];

export function checkProviderIntegrity<T>(input: IntegrityCheckInput<T>): IntegrityCheckResult<T> {
  const { auditMode, sourceType, providerMode, status, data } = input;

  if (MOCK_PROHIBITED_MODES.includes(auditMode)) {
    if (providerMode === "mock") {
      return {
        allowed: false,
        data: null,
        displayStatus: "unavailable",
        warning: `${sourceType}: mock provider result rejected — ${auditMode} audits must never consume, persist, or score synthetic provider data. Likely cause: missing credentials for this provider while AUDIT_PROVIDER_MODE=live.`,
      };
    }
    if (status === "error") {
      return {
        allowed: false,
        data: null,
        displayStatus: "unavailable",
        warning: null, // A live provider genuinely failing is an expected unavailable state, not an integrity violation — no warning needed.
      };
    }
    // "partial" (e.g. PageSpeed with no CrUX field data, a crawl blocked by
    // robots.txt, a Places search that legitimately found no match) is still
    // real, live-sourced data — allowed through, just not "ok".
    return {
      allowed: true,
      data,
      displayStatus: auditMode === "connected_client" ? "connected" : "live",
      warning: null,
    };
  }

  // demo / internal_test: mock and live are both allowed, but a mock/
  // synthetic result must always be labeled distinctly from a verified live
  // one — it is never silently presented as equivalent.
  if (status === "error") {
    return { allowed: false, data: null, displayStatus: "unavailable", warning: null };
  }
  return {
    allowed: true,
    data,
    displayStatus: providerMode === "mock" ? "demo_synthetic" : "live",
    warning: null,
  };
}

/** Excludes a data point from the scoring denominator without treating it as
 * a zero — used by scoring rules when the integrity layer marks a source
 * unavailable. Mirrors `unknownFinding()` in `src/lib/scoring/helpers.ts`,
 * kept here so future non-scoring callers (e.g. report copy) don't need to
 * import the scoring layer just to check this. */
export function isScoreable(displayStatus: DisplayStatus): boolean {
  return displayStatus === "live" || displayStatus === "connected" || displayStatus === "demo_synthetic";
}
