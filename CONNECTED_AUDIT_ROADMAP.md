# Connected Audit Roadmap (Phase 3+)

This MVP ships the **public prospect audit** only. The original build doc's "Required Expansion" —
Google Business Profile OAuth, Search Console OAuth, and the Local Service Authority Hub — was
deliberately deferred so the first build shipped a working, demoable product. This document scopes
what each of those needs.

Placeholder interfaces already exist for all four (`src/lib/providers/placeholders/index.ts`) and the
`integrations` table (with `organization_id`, `provider`, `status`, `encrypted_credentials`) is already
migrated, so none of this requires a schema rewrite — only new provider implementations, OAuth routes,
and UI to replace the placeholder CTAs currently shown on the report ("Connect Google for a deeper,
verified audit").

## 1. Google Business Profile OAuth

**Requires:**
- Google Cloud OAuth client (Business Profile API scope) + consent screen review (GBP scopes require
  Google verification).
- `googleBusinessProfileProvider` implementation: OAuth token exchange/refresh, account + location
  listing, and read access to insights (calls, direction requests, photo views) not available via the
  public Places API.
- New `audit_type: 'connected'` scoring path — the build doc's second scoring model
  (`LOCAL_DOMINANCE_SCORE_WEIGHTS`) is scoped for connected audits and was intentionally dropped from
  this MVP pass; the public `CATEGORY_WEIGHTS` in `src/lib/scoring/types.ts` stays as-is.
- Token storage: `integrations.encrypted_credentials`, encrypted with `INTEGRATION_ENCRYPTION_KEY`
  (already reserved in `.env.example`, unused in this pass).
- UI: an OAuth connect flow gated behind real authentication (see "Authentication" below).

## 2. Search Console OAuth

**Requires:**
- Google OAuth client with the Search Console API scope (can share the OAuth client with GBP if
  scopes are combined).
- `searchConsoleProvider` implementation: verified property lookup, query/page performance data,
  index coverage status.
- Feeds a `technical_foundation` refinement (actual indexation status instead of the current
  robots.txt/crawl-based proxy) and unlocks real keyword-level content recommendations in the AI
  report input.

## 3. Local Service Authority Hub

**Requires:**
- `rankTrackingProvider`: a licensed rank-tracking data source (Google does not offer a public ranking
  API — this needs a third-party vendor, e.g. DataForSEO, SerpApi, or similar, under their terms).
- `citationProvider`: a citation/directory-monitoring vendor (e.g. Whitespark, BrightLocal API,
  Data Axle) to populate `citations.directory_coverage` and `citations.data_aggregator_presence`,
  which are hard-coded to `unknown` in this MVP (see `SCORING_MODEL.md`).
- A recurring job (the reserved `CRON_SECRET` env var + a Vercel Cron / Supabase Edge Function) to
  refresh connected businesses' data on a schedule rather than only on-demand.
- Dashboard UI for trend-over-time views, which requires a second `audits` row per business per
  interval (the schema already supports this — no migration needed).

## 4. Guideline-monitoring registry

Deferred from the original doc's Phase 5. Requires a source of truth for evolving Google/industry
guideline changes (manually curated or a licensed feed) and a way to re-flag existing findings when a
guideline changes without re-running the full audit. Not scoped further here — revisit after Phase 3-4
ship.

## Authentication (prerequisite for all of the above)

None of Phase 3 should ship before real Supabase Auth is wired into `/dashboard` and `/admin` (see
README "Known limitations") — OAuth tokens and connected-audit data are meaningfully more sensitive
than the current anonymous public-audit flow, and RLS alone (already in place) is not a substitute for
gating the UI itself.
