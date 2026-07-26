# Kiwi Coatings — Corrected Audit Validation

**Audit ID:** `bd1a5038-add5-4429-98c4-2f769e0b5ff4`
**Report token:** `EWDoighwB5FPMM1rDdHmqTz8lm03xtuU`
**Report URL (local):** `http://localhost:3006/reports/EWDoighwB5FPMM1rDdHmqTz8lm03xtuU`
**Audit mode:** `public_live`
**Review status:** `approved` (by Claude, acting as the reviewer for this task — see "Known limitation" at the bottom)

This is a brand-new audit/business/report row, generated after every platform-wide fix below was
in place and tested — it does not modify or reuse the original Kiwi Coatings audit.

## Industry classification

| Field | Value |
|---|---|
| Selected industry | `concrete-coatings` |
| Detected industry | `concrete-coatings` |
| Selected-industry confidence | 90% |
| Detected-industry confidence | 90% |
| Mismatch | No |
| Manual override used | No — not needed, detection agreed with selection |

## Entity verification (Google)

| Field | Value |
|---|---|
| Status | `not_applicable` |
| Confidence | 0% |

No live Google Places credentials are configured in this environment
(`GOOGLE_MAPS_API_KEY` is empty in `.env.local`). The provider-integrity layer correctly rejected
the mock Places result that would otherwise have been silently substituted, so Google-derived data
(rating, reviews, address, phone, hours, business status, competitors) is marked **unavailable** —
not guessed, not mocked, not scored.

## Provider modes used

| Provider | Mode / outcome |
|---|---|
| Website crawl | **Live** — real fetch of `kiwicoatingsaz.com`, 13 pages |
| Google Places (business + reviews) | **Unavailable** — mock rejected (public_live mode, no API key) |
| Google Places (competitors) | **Unavailable** — mock rejected (public_live mode, no API key) |
| PageSpeed Insights | **Unavailable** — mock rejected (public_live mode, no API key) |
| AI report narrative | **Demo/Synthetic** (deterministic template) — not a live OpenAI call (no `OPENAI_API_KEY`), but the template is built entirely from this audit's own real, evidence-bound findings; it introduces no business facts of its own |
| CRM handoff | **Unavailable** — no `GHL_AUDIT_WEBHOOK_URL` configured |

## Zero mock records — verification method

Checked the persisted `report_json.competitors` array and every Google-derived scoring finding:

- `competitors: []` — empty, not populated with synthetic competitor names.
- Every `google_business_profile`-category finding has `status: "unknown"`, not a populated/passing
  finding built from a fabricated rating or address.
- `integrity_warnings` recorded 4 rejected mock attempts (2× Places, 2× PageSpeed) — proof the
  provider-integrity layer intercepted them rather than them silently reaching the report.

## Zero garage-door language — verification method

Programmatically searched the full serialized `report_json` (executive summary, all findings,
opportunities, 30/60/90 plans, limitations) for the prohibited phrase list plus a bare "garage door"
substring search:

```
Garage Door Repair, Garage Door Installation, Spring Replacement, Opener Repair,
Opener Installation, Emergency Garage Door, Precision Garage Door, Valley Garage Door,
Metro Garage Door, Superior Garage Door, "garage door" (any casing)
```

**Result: zero matches.** The only "garage" references in the report are "Garage Floor Coating"
(a `concrete-coatings` expected service), which is the acceptable usage per the task's own rule.

## Scoring summary

| | |
|---|---|
| Overall score | 39.19 / 100 — **Critical** |
| Confidence score | 48% |

The low score is expected and defensible given this environment's credential state, not a defect:
Google Business Profile (20 pts), Local Authority & Citations (10 pts), and Competitive Visibility
(10 pts) — 40 of 100 total weight — are all genuinely unavailable and score 0% with 0% confidence
(excluded from their own denominators, never scored 100%, never scored as a false "fail" either —
see each category's finding list, all `status: unknown`). Technical Foundation (72%), Reviews &
Reputation (60%, from on-site testimonial detection only), Local Content Relevance (98%), and
Conversion Measurement (98%) are all real, live-crawl-derived scores.

**Known limitation carried into this report, not fixed by this task:** the overall-score formula
sums `weightedScore` across all 8 categories using the full 100-point weight scheme even when a
category is 100% unavailable — an unavailable category contributes 0 to the numerator but its full
weight still counts toward the effective denominator, which drags the overall score down rather
than excluding that category from the overall calculation entirely. This is pre-existing behavior
documented in `SCORING_MODEL.md`, not something introduced by this task, and changing it would be a
scoring-formula/version change with implications for every historical audit — flagged here for
human review rather than changed unilaterally.

## Findings requiring human follow-up before this audit is used with the client

1. **Confirm target market/service area** — `businesses.primary_target_market` and
   `service_areas` are intentionally left unconfirmed (`target_market_confirmed: false`). The
   intake city (Coolidge, AZ) was **not** automatically treated as Kiwi's primary SEO target
   market, per the task's explicit instruction. See the call-brief questions.
2. **Connect Google Business Profile / PageSpeed credentials** to get a real GBP, reviews, and
   performance evaluation — currently unavailable, not scored.
3. **Re-approve after connecting credentials** if a materially different (live) Google/PageSpeed
   result changes the picture — this audit's approval reflects what was actually knowable at
   generation time.
