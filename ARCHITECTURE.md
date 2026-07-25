# Architecture

## High-level flow

```
/audit (intake form)
  → POST /api/audits            creates `businesses` + `audits` rows (status=queued)
  → POST /api/audits/[id]/run   fires runAudit(auditId) via next/server `after()`, returns 202
  → /audit/[id]/processing      polls GET /api/audits/[id] every 2.5s, reads persisted audit_events
  → runAudit() completes        redirects to /reports/[token]
```

`runAudit` (`src/lib/audit/orchestrator.ts`) walks the fixed stage list from the build spec
(`queued → resolving_business → discovering_website → crawling_pages → analyzing_website →
retrieving_places → retrieving_pagespeed → benchmarking_competitors → calculating_score →
generating_action_plan → generating_report → completed`), writing an `audit_events` row at the
start and completion (or failure) of every stage. The processing UI is a dumb poller over real
rows — there are no client-side fake timers.

## Layering

```
src/app/            Routes (pages + API route handlers) — thin, no business logic
src/components/     Presentational + a few client components (forms, pollers, filters)
src/lib/
  audit/            Orchestration: create.ts, orchestrator.ts, context.ts, events.ts
  crawler/          Pure functions: robots.ts, sitemap.ts, extract.ts, classify.ts, normalize.ts, crawl.ts
  scoring/          Pure functions: rules/*.ts, engine.ts, helpers.ts, types.ts, labels.ts
  providers/        Adapter interfaces + mock/live implementations per external source
  industry-templates/  Config-driven per-trade data (expected services, keywords, trust signals)
  validation/       Zod schemas (intake, AI report output)
  supabase/         DB client + hand-written types mirroring the migration
```

The crawler and scoring engine are intentionally pure — no Supabase, no fetch side effects beyond
what's explicitly passed in — which is what makes them unit-testable without a database or network
(see `tests/unit/`).

## Provider-adapter pattern

Every external data source is accessed through an interface defined in `src/lib/providers/types.ts`:
`WebsiteProvider`, `GooglePlacesProvider`, `PageSpeedProvider`, `AiReportProvider`, `CrmProvider`, plus
Phase 3+ placeholders (`GoogleBusinessProfileProvider`, `SearchConsoleProvider`,
`RankTrackingProvider`, `CitationProvider`). Each has a `mock.ts` and (except CRM, and the
placeholders) a `live.ts`, selected by `getXProvider()` factory functions based on
`AUDIT_PROVIDER_MODE` and whether that provider's specific API key is present. No call site in the
orchestrator or scoring engine imports a vendor SDK directly.

## Scoring engine

See [`SCORING_MODEL.md`](./SCORING_MODEL.md) for the full rule list. Structurally: each `ScoringRule`
evaluates a shared `RuleContext` (crawled pages, Places record, PageSpeed metrics, competitors, the
industry template) and returns a `RuleFinding` with a status of `pass | warning | fail | unknown`.
The engine (`src/lib/scoring/engine.ts`) groups findings by category, **excludes `unknown` findings
from that category's point denominator** rather than scoring them zero, and computes:

```
categoryPercentage = earnedApplicablePoints / availableApplicablePoints
weightedCategoryScore = categoryPercentage * categoryWeight
overallScore = sum(weightedCategoryScore)
```

Category `confidence` is `applicableRuleCount / totalRuleCount` for that category; overall
`confidenceScore` is the weight-averaged category confidence. `scoringVersion` is stamped on every
scoring run (`src/lib/scoring/types.ts`) and persisted on the `audits` row so historical reports stay
reproducible even after rule changes.

## Data model

See `supabase/migrations/0001_init.sql`. `audit_events` is the source of truth for the processing UI.
`reports.report_json` stores the full assembled payload (business identity, `ScoringResult`,
classification band, competitors, AI report output) so the report page is a single read — no join
fan-out required to render `/reports/[token]`.

## Why not Playwright for the crawler

The spec is explicit: server-side fetch + HTML parsing (Cheerio) for the MVP crawler, with a
Playwright/JS-rendering adapter deferred to a future pass for JS-heavy sites. This keeps the crawler
fast, cheap to run per audit, and free of a headless-browser dependency in the request path.
