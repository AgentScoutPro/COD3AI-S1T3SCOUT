# Platform Audit — Root Cause Analysis

**Incident:** A prospect-facing SEO audit for Kiwi Coatings (a concrete/epoxy coatings business)
was classified as a garage-door business, displayed garage-door services, garage-door competitors,
and Google Business Profile data that could not be confirmed as genuine.

This document traces the mechanism, not just the symptom, and treats it as a platform-wide
data-integrity failure rather than a Kiwi-specific bug.

## 1. Why an incorrect selected industry was accepted without validating it against website content

`src/lib/validation/audit.ts` validates `industry` with nothing stronger than
`z.enum(INDUSTRY_SLUGS)` — it only checks that the submitted slug is a *registered* template, not
that it matches the business. `src/components/audit/intake-form.tsx` renders it as a plain
`<select>` with no confirmation step. `src/lib/audit/create.ts` writes that value straight onto
`businesses.industry` with no downstream check.

From there, `business.industry` is treated as ground truth everywhere:

- `buildRuleContext()` (`src/lib/audit/context.ts:30`) resolves `template = getIndustryTemplate(business.industry)`
  and every scoring rule (`src/lib/scoring/rules/*`) evaluates against that template's
  `expectedServices` / `keywordSignals`.
- `classifyPage()` and `coveredServices()` (`src/lib/crawler/classify.ts`) classify every crawled
  page using that same template's keyword lists.
- **The competitor search itself is keyed off it**: `orchestrator.ts:111` calls
  `placesProvider.searchCompetitors({ serviceCategory: business.industry, city, state, ... })`.
  If the selected industry is wrong, the Places API is asked for businesses in the *wrong
  category* — this is why Kiwi Coatings (an epoxy/concrete coatings company) was benchmarked
  against real garage-door companies rather than coatings companies. This does not require mock
  data to happen; it happens even with a fully live Places integration, because the input
  category itself was never validated.

**Root cause:** there is no step, anywhere in the pipeline, that compares the operator-selected
industry against the actual crawled website content before that selection drives classification,
scoring, and competitor discovery. A single dropdown mis-click (plausible here — Kiwi's core
service is literally "garage floor coatings," an easy click on the visually adjacent "Garage
Door" option) silently propagates through the entire audit with no cross-check.

## 2. How the wrong industry affected classification, scoring, recommendations, and competitors

- **Classification:** every crawled page was matched against garage-door keywords
  (`garage door repair`, `spring replacement`, `opener repair`, ...). None of Kiwi's real page
  content matches those, so pages were classified as generic `other`/`service` noise instead of
  their real service pages.
- **Scoring:** `svcloc.service_page_coverage` measured coverage of garage-door services Kiwi never
  offered, effectively scoring the absence of "Spring Replacement" and "Opener Installation" pages
  as gaps. `svcloc.emergency_page` treated 24/7 emergency messaging as expected
  (`garageDoor.emergencyServiceExpected = true`), which is not a normal expectation for a coatings
  business.
- **Recommendations:** the template-based AI-report fallback (`src/lib/providers/ai-report/template.ts`)
  builds its narrative directly from `findings[].explanation`/`recommendation`, so garage-door-flavored
  findings produced garage-door-flavored recommendations verbatim.
- **Competitors:** as above — `searchCompetitors({ serviceCategory: "garage-door", ... })` returned
  real garage-door businesses in the area, which is precisely the "unrelated competitors" symptom
  reported.

## 3. Why live audits can fall back to mock providers

Provider selection is controlled by exactly one global process-wide setting,
`AUDIT_PROVIDER_MODE` (`src/lib/env.ts`), read once per provider factory
(`getGooglePlacesProvider()`, `getPageSpeedProvider()`, `getAiReportProvider()`,
`getWebsiteProvider()`). Each factory additionally falls back to its mock implementation
per-provider when that provider's specific API key is absent — **independently of whether the
other providers have credentials**. Checking this project's own `.env.local` during this
investigation:

```
AUDIT_PROVIDER_MODE=live
GOOGLE_MAPS_API_KEY=        (empty)
GOOGLE_PAGESPEED_API_KEY=   (empty)
OPENAI_API_KEY=             (empty)
```

This is the exact failure mode the spec asks about: the environment is nominally "live," but with
zero provider credentials configured, **every provider silently serves synthetic data** — the
Places mock generates a plausible rating, address, phone, hours, and review sample
(`src/lib/providers/places/mock.ts`); the AI report falls back to the deterministic template.
Nothing in this path raises an error or blocks the audit; `status: "ok"` is returned exactly as it
would be for real data. There was no audit-level control forcing "live" credentials to actually be
present before a public report could be generated — mode was a suggestion, not a guarantee.

## 4. Whether synthetic ratings, reviews, addresses, or competitors can appear in public reports

**Yes, and indistinguishably.** `provider_mode` is recorded in the internal `audit_sources` table
(`orchestrator.ts` inserts one row per stage), but that table is never joined into `report_json`
(`src/lib/report-json.ts`) or rendered anywhere on `/reports/[token]` or in the PDF route. The
public report's `competitors` array and `place`-derived GBP findings are the raw mock/live
`PlaceRecord` objects with no `mode`/`provenance` tag carried along. A mock rating of "4.7 (212
reviews)" renders with exactly the same visual weight and certainty as a real one.

## 5. Whether any other provider can silently fall back to mock data

Yes — this is systemic, not Places-specific. `getWebsiteProvider()`, `getPageSpeedProvider()`, and
`getAiReportProvider()` all follow the identical `providerMode === "live" && hasXCredentials()`
pattern with a silent mock fallback and no caller-visible signal beyond the `mode` field on the
`ProviderResult`, which (per §4) is discarded before reaching the report.

Separately, `buildRuleContext()`'s caller in `orchestrator.ts:160-162` computes
`placesConfigured: hasPlacesCredentials() || crawl.mode === "mock"` and
`pageSpeedConfigured: hasPageSpeedCredentials() || crawl.mode === "mock"` — both are gated by the
**website crawl's** mode, not their own provider's mode/status. This conflates two unrelated
providers' availability signals and is itself a latent correctness bug independent of the Kiwi
incident.

## 6. Why unavailable data could still receive scores or appear "verified"

The scoring engine's `unknown`-exclusion mechanism (`src/lib/scoring/engine.ts`,
documented in `SCORING_MODEL.md`) is correctly implemented for *entirely absent* data — a rule
that can't run at all returns `status: "unknown"` and is excluded from its category's denominator.
That part of the design is sound and this investigation did not find a case where it double-counts
or zero-scores a genuinely-`unknown` rule.

The actual gap is upstream of scoring: **mock data is never `unknown` to the scoring engine — it
looks exactly like a successful live result** (`status: "ok"`, fully populated `PlaceRecord`).
`placesConfigured` is computed from credential/mode presence, not from whether the specific
returned record was verified as belonging to the audited business. There is currently no concept
of "the provider ran successfully but we shouldn't trust/score this particular result" — a live
Places text-search match is accepted as-is (`live.ts:97-99`, `findBusiness` takes `results[0]` with
no entity verification against name/domain/phone/place category) with no confidence check, so an
incorrect live match would be scored with full confidence too, not just a mock one.

## Summary of the two compounding platform-wide failures

1. **No cross-validation between the operator-selected industry and the site's actual content**,
   and that unvalidated selection is used to drive classification, scoring, *and the competitor
   discovery query itself* — this alone reproduces the "wrong services / wrong competitors"
   symptom even with 100% live providers.
2. **No enforced, per-audit guarantee that "live" data is actually live**, and no provenance
   carried into the public report — a global env var plus per-provider credential checks silently
   substitute synthetic data with no visible label, and even a successful live Places match is
   never verified against the audited business's own identity signals.

Sections 2–9 of this change address these two failures generically (audit modes, a shared
provider-integrity layer, platform-wide industry detection, entity verification, evidence-bound
findings, and an approval gate) so they cannot recur for any current or future client, industry,
or provider — not just Kiwi Coatings.
