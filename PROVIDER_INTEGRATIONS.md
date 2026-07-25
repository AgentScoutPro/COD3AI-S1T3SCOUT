# Provider Integrations

Every external data source is accessed through an adapter interface in `src/lib/providers/types.ts`.
A `getXProvider()` factory in each provider's `index.ts` picks the live or mock implementation based
on `AUDIT_PROVIDER_MODE` and whether that specific provider's API key is present — so a partial
credential set (e.g. only `OPENAI_API_KEY`) still runs mock Places/PageSpeed alongside a live AI
report.

## Website (`src/lib/providers/website/`)

- **Mock** (`mock.ts`): generates a plausible same-domain page set (home, about, contact, a subset of
  the industry's expected services, sometimes an emergency/financing page), seeded deterministically
  from the domain so repeated audits of the same business are stable.
- **Live** (`live.ts`): wraps the real crawler (`src/lib/crawler/crawl.ts`) — see `CRAWLER_POLICY.md`.
- No API key required in either mode; gated by `AUDIT_PROVIDER_MODE` only, for consistent demos.

## Google Places (`src/lib/providers/places/`)

- **Mock**: generates a synthetic listing + up to 5 synthetic reviews for `findBusiness`, and
  5 synthetic competitors (with plausible names, ratings, and websites) for `searchCompetitors`.
- **Live**: calls the Places API (New) `places:searchText` endpoint with a narrow field mask
  (`id, displayName, formattedAddress, internationalPhoneNumber, websiteUri, businessStatus,
  primaryType, types, rating, userRatingCount, regularOpeningHours, reviews, googleMapsUri`).
  Requires `GOOGLE_MAPS_API_KEY`. Reviews are truncated to 5 client-side even though the API already
  caps them, as a defense-in-depth reminder that this is never a full review history.
- Competitor exclusion: the audited business is filtered out of competitor results by Place ID (when
  known) and by normalized domain (`src/lib/crawler/normalize.ts` → `normalizeDomain`).

## PageSpeed Insights (`src/lib/providers/pagespeed/`)

- **Mock**: generates mobile + desktop scores/metrics seeded from the URL.
- **Live**: calls `pagespeedonline/v5/runPagespeed` for `performance`, `accessibility`,
  `best-practices`, and `seo` categories, for both `mobile` and `desktop` strategy. Requires
  `GOOGLE_PAGESPEED_API_KEY`. Distinguishes "no field data" (`hasFieldData: false` — Chrome UX Report
  has no real-user data for this URL) from an outright API failure (`status: "error"`).
- The orchestrator analyzes the homepage plus up to 2 additional priority URLs (currently: the first
  non-homepage crawled page) — see `pickPriorityUrls()` in `src/lib/audit/orchestrator.ts`.

## AI Report (`src/lib/providers/ai-report/`)

- **Mock / fallback** (`template.ts`, used directly by `mock.ts`): a deterministic, template-based
  report built entirely from the scoring output and findings — no LLM call. Used both as the mock
  provider and as the automatic fallback when the live provider fails or returns invalid output, so an
  audit never dead-ends without a report.
- **Live** (`live.ts`): calls the OpenAI **Responses API** with Structured Outputs
  (`text.format: { type: "json_schema", strict: true }`), using a JSON Schema generated directly from
  the Zod schema (`z.toJSONSchema(aiReportOutputSchema)`), so the model's output is validated against
  the exact same schema the rest of the app uses. Requires `OPENAI_API_KEY`; model is configurable via
  `OPENAI_REPORT_MODEL`. The system prompt explicitly instructs the model not to invent statistics,
  rankings, competitors, or services, not to override deterministic scores, and to call competitor
  comparisons a "Competitive Benchmark," never a ranking.

## CRM / GoHighLevel (`src/lib/providers/crm/ghl.ts`)

- Single implementation (no mock/live split) — a plain outbound webhook POST to
  `GHL_AUDIT_WEBHOOK_URL` with business info, overall score, top 3 opportunities, and the report URL.
- A missing or misconfigured webhook returns `status: "partial"`/`"error"` but is caught and logged by
  the orchestrator (`sendToCrm()` in `orchestrator.ts`) — **it never fails or blocks the audit**.
- `POST /api/integrations/ghl/webhook-test` lets an operator verify the webhook independently of
  running a full audit.

## Phase 3+ placeholders (`src/lib/providers/placeholders/index.ts`)

`GoogleBusinessProfileProvider`, `SearchConsoleProvider`, `RankTrackingProvider`, and
`CitationProvider` exist as empty interfaces with an `isConfigured(): false` placeholder
implementation. They are not called anywhere in the audit pipeline. See
`CONNECTED_AUDIT_ROADMAP.md` for what each requires to become real.
