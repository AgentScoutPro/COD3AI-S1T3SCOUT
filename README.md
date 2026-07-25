# Cod3AI S1T3SCOUT — Local Authority Engine

A home-service local SEO audit, scorecard, competitor benchmark, and action-plan tool built specifically for HVAC,
plumbing, roofing, electrical, junk removal, landscaping, pest control, moving, garage door, and pool service
businesses.

This is the **public prospect-audit MVP**. Google Business Profile OAuth, Search Console OAuth, and the Local
Service Authority Hub are intentionally out of scope — see [`CONNECTED_AUDIT_ROADMAP.md`](./CONNECTED_AUDIT_ROADMAP.md).

## Stack

- Next.js 16 (App Router), TypeScript (strict), Tailwind CSS v4
- Supabase (PostgreSQL, Auth, Row-Level Security)
- Zod for all input/output validation
- Server-side fetch + Cheerio for the crawler (not Playwright — see [`CRAWLER_POLICY.md`](./CRAWLER_POLICY.md))
- Provider-adapter architecture for every external data source (mock + live implementations)
- Vitest for unit tests, Playwright for one E2E happy-path test

## Setup

```bash
npm install
cp .env.example .env.local
```

### Supabase setup

1. Create a Supabase project (or run `supabase start` locally with the Supabase CLI).
2. Apply the migration in `supabase/migrations/0001_init.sql`:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
   (Or paste the file into the Supabase SQL editor.)
3. Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

Supabase is required even in mock mode — mock mode controls the *external providers* (Places, PageSpeed, OpenAI,
GHL), not the database. Every audit is still persisted.

### Mock mode (zero paid API keys)

With `AUDIT_PROVIDER_MODE=mock` (the `.env.example` default), the entire pipeline — website crawl, Google Business
Profile, PageSpeed, competitor benchmark, and the AI report — runs on deterministic synthetic data. No
`GOOGLE_MAPS_API_KEY`, `GOOGLE_PAGESPEED_API_KEY`, or `OPENAI_API_KEY` is required.

Run the one-command seed to produce a full, demo-ready HVAC audit for a fictional Phoenix-area business:

```bash
npm run seed
```

This prints a `/reports/<token>` URL you can open once the dev server is running.

### Live mode

Set `AUDIT_PROVIDER_MODE=live` and provide whichever of `GOOGLE_MAPS_API_KEY`, `GOOGLE_PAGESPEED_API_KEY`, and
`OPENAI_API_KEY` you have. Each provider falls back to its mock implementation individually if its specific key is
missing, so partial credential sets work fine — see [`PROVIDER_INTEGRATIONS.md`](./PROVIDER_INTEGRATIONS.md).

The website crawler itself needs no API key in either mode; "live" mode just means it makes real HTTP requests
instead of generating synthetic pages.

## Local run

```bash
npm run dev
```

- `/` — landing page
- `/audit` — prospect intake form
- `/dashboard` — audit list (not yet gated by org auth — see "Known limitations" below)
- `/admin` — internal audit management (all audits, including failed/in-progress)
- `/reports/[token]` — "Download PDF" opens `/api/reports/[token]/pdf`, which launches headless Chromium
  (Playwright) to render the *actual live report page* and stream back a PDF — not a separate template,
  so it's always in sync with what's on screen. Requires `npx playwright install chromium` locally.
  Uses `playwright-core` + `@sparticuz/chromium` (Vercel/Lambda-compatible) when `VERCEL` or
  `AWS_LAMBDA_FUNCTION_VERSION` is set, and the local Playwright browser cache otherwise — see
  `launchBrowser()` in the route.

## Testing

```bash
npm run test        # Vitest unit tests (crawler, scoring, providers, tokens)
npm run test:e2e     # Playwright E2E (requires Supabase configured + `npx playwright install` once)
```

## Deployment (Vercel)

1. Push this repo to GitHub and import it into Vercel.
2. Set all env vars from `.env.example` in the Vercel project settings.
3. Apply the Supabase migration against your production project before the first deploy.
4. The `/api/audits/[id]/run` route runs the full pipeline (crawl + Places + PageSpeed + AI) inside the request's
   `after()` callback and is configured with `maxDuration = 300`. Vercel's Hobby plan caps function duration lower
   than this — use a Pro plan (or move audit execution to a background queue) for production traffic.
5. `/api/reports/[token]/pdf` auto-detects Vercel/Lambda (via `VERCEL`/`AWS_LAMBDA_FUNCTION_VERSION`) and uses
   `@sparticuz/chromium`'s prebuilt binary in that case, so PDF export works on Vercel serverless without
   extra configuration. It's given `maxDuration = 60` for the headless-render round trip.

## Security & compliance notes

- Never scrapes Google Search or Maps HTML, or any review platform directly — see `CRAWLER_POLICY.md`.
- The crawler respects `robots.txt`, uses an identifiable user agent, stays on the audited domain, and rate-limits
  itself (see `AUDIT_CRAWL_CONCURRENCY`, `AUDIT_REQUEST_TIMEOUT_MS`).
- Competitor comparisons are always labeled "Competitive Benchmark," never "Local Ranking."
- Public Places review samples are capped at 5 by the API and are labeled as a limited sample everywhere they
  appear.
- Public report URLs use a 24-byte cryptographically random token (`lib/tokens.ts`), are marked `noindex,nofollow`,
  and are never sequential IDs.
- No server secrets are exposed via `NEXT_PUBLIC_` variables.
- RLS policies restrict organization-scoped tables to `organization_members`; all app writes go through the
  service-role client, so authorization is enforced at the application layer for those paths (see "Known
  limitations").

## Known limitations / assumptions made in this pass

- **No authentication UI.** `/dashboard` and `/admin` are functional but not yet gated by Supabase Auth sign-in —
  they use the service-role client directly. RLS policies are in place for future client-side auth reads. Wiring
  actual login is straightforward but was out of scope to keep this pass focused on the audit pipeline itself.
- **Competitor PageSpeed is not run.** The spec allows PageSpeed comparison "if enabled"; this pass benchmarks
  competitors on rating, review count, website presence, and service/location page coverage only, to bound API
  usage. Add it to `runAudit`'s `benchmarking_competitors` stage if needed.
- **The E2E test requires live Supabase.** It exercises the real persisted pipeline end-to-end rather than mocking
  the database, matching how audits actually run.
- Businesses are created without an `organization_id` (public/anonymous intake) — the schema supports attaching
  them to an organization once auth exists.
