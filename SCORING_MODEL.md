# Scoring Model

Scoring version: `1.0.0` (`src/lib/scoring/types.ts` — `SCORING_VERSION`). Every audit stamps its
scoring version on the `audits` row, so historical reports remain reproducible after future rule
changes.

## Formula

```
categoryPercentage   = earnedApplicablePoints / availableApplicablePoints   (unknown findings excluded)
weightedCategoryScore = (categoryPercentage / 100) * categoryWeight
overallScore          = sum(weightedCategoryScore)                          (0-100, rounded for display only)
```

A rule that can't be evaluated (no Places match, no PageSpeed data, no crawled pages of a given type,
etc.) returns `status: "unknown"` and is **excluded from its category's denominator** — it does not
count as a zero. This lowers that category's `confidence` score instead of silently penalizing a
business for a data source that wasn't configured or available.

`confidence` per category = `applicableFindingCount / totalFindingCount`. Overall `confidenceScore` is
the weight-averaged confidence across all 8 categories.

## Category weights (sum to 100)

| Category | Weight | Source file |
|---|---|---|
| Google Business Profile | 20 | `src/lib/scoring/rules/gbp.ts` |
| Technical Foundation | 15 | `src/lib/scoring/rules/technical.ts` |
| Service & Location Architecture | 15 | `src/lib/scoring/rules/service-location.ts` |
| Local Content Relevance | 10 | `src/lib/scoring/rules/content.ts` |
| Reviews & Reputation | 15 | `src/lib/scoring/rules/reviews.ts` |
| Local Authority & Citations | 10 | `src/lib/scoring/rules/citations.ts` |
| Competitive Visibility | 10 | `src/lib/scoring/rules/competitive.ts` |
| Conversion Measurement | 5 | `src/lib/scoring/rules/conversion.ts` |

## Score classification bands

`src/lib/scoring/engine.ts` → `scoreClassification()`

| Range | Band | Label |
|---|---|---|
| 0–39 | `critical` | Critical |
| 40–59 | `weak` | Weak |
| 60–74 | `competitive_inconsistent` | Competitive but Inconsistent |
| 75–89 | `strong` | Strong |
| 90–100 | `authority_ready` | Authority-Ready |

## Rules by category

Source for every rule: the website crawl (`src/lib/crawler`), the Google Places match
(`ctx.place`, `PlacesProvider`), PageSpeed Insights (`ctx.pageSpeed`), the competitor benchmark
(`ctx.competitors` / `ctx.competitorPages`), and the industry template (`ctx.template`).

### Technical Foundation (`tech.*`)

| Rule ID | What it checks |
|---|---|
| `tech.https` | Homepage served over HTTPS |
| `tech.crawlability` | `robots.txt` allows crawling the homepage |
| `tech.sitemap_presence` | An XML sitemap was discovered |
| `tech.title_coverage` | % of crawled pages with a `<title>` |
| `tech.meta_description_coverage` | % of crawled pages with a meta description |
| `tech.h1_coverage` | % of crawled pages with an H1 |
| `tech.canonical_coverage` | % of crawled pages with a canonical tag |
| `tech.mobile_viewport` | % of crawled pages with a responsive viewport meta tag |
| `tech.broken_links_images` | Count of broken links/images found during the crawl |
| `tech.structured_data` | Homepage has LocalBusiness/Organization JSON-LD |

### Google Business Profile (`gbp.*`)

| Rule ID | What it checks |
|---|---|
| `gbp.profile_found` | A matching GBP listing exists via Places API (unknown if Places isn't configured) |
| `gbp.business_status` | Listing status is `OPERATIONAL` |
| `gbp.rating_threshold` | Average rating vs. a 4.5 target |
| `gbp.review_count_threshold` | Review count vs. a 75-review target |
| `gbp.hours_listed` | Business hours are populated |
| `gbp.website_linked` | GBP links to the business website |
| `gbp.phone_matches_site` | GBP phone number matches the homepage (NAP consistency) |

### Service & Location Architecture (`svcloc.*`)

| Rule ID | What it checks |
|---|---|
| `svcloc.service_page_coverage` | % of the industry template's expected services with a dedicated page |
| `svcloc.location_page_presence` | At least one location/service-area page exists |
| `svcloc.internal_linking` | Average internal links per page |
| `svcloc.emergency_page` | Emergency-service messaging, when the trade expects it |
| `svcloc.financing_page` | Financing information, when the trade expects it |
| `svcloc.maintenance_plan_page` | Maintenance-plan/membership page, when the trade expects it |
| `svcloc.doorway_page_risk` | Flags near-duplicate, thin location pages (doorway-page pattern) |

### Local Content Relevance (`content.*`)

| Rule ID | What it checks |
|---|---|
| `content.word_count_sufficiency` | Homepage word count vs. a 400-word target |
| `content.city_state_mentions` | Homepage mentions the primary city/state |
| `content.service_keyword_relevance` | Homepage mentions core service keywords |
| `content.trust_signal_copy` | Site copy references trade-relevant trust/certification signals |
| `content.meta_description_uniqueness` | Ratio of unique vs. duplicated meta descriptions |

### Reviews & Reputation (`reviews.*`)

| Rule ID | What it checks |
|---|---|
| `reviews.sample_available` | Any reviews visible in the public API sample (capped at 5 by Google) |
| `reviews.recency` | Share of the sample left in the last few weeks/months |
| `reviews.rating_consistency` | Share of low (≤2 star) ratings in the sample |
| `reviews.owner_response_evidence` | **Always unknown** — not exposed by the current Places field mask |
| `reviews.on_site_social_proof` | Testimonials or Review/AggregateRating schema on the site |

### Local Authority & Citations (`citations.*`)

| Rule ID | What it checks |
|---|---|
| `citations.nap_name_consistency` | Business name matches between intake and GBP |
| `citations.directory_coverage` | **Always unknown** — requires the Phase 3+ `citationProvider` |
| `citations.data_aggregator_presence` | **Always unknown** — requires the Phase 3+ `citationProvider` |

### Competitive Visibility (`competitive.*`)

| Rule ID | What it checks |
|---|---|
| `competitive.benchmark_available` | At least 3 competitors were identified |
| `competitive.rating_percentile` | Business rating vs. competitor average |
| `competitive.review_count_percentile` | Business review count vs. competitor average |
| `competitive.service_coverage_percentile` | Service-page coverage vs. competitor average |

### Conversion Measurement (`conversion.*`)

| Rule ID | What it checks |
|---|---|
| `conversion.click_to_call` | % of pages with a `tel:` link |
| `conversion.booking_form` | A booking/estimate/scheduling form exists |
| `conversion.mobile_cta_visibility` | Homepage combines a responsive layout with a call CTA |
| `conversion.analytics_tag_manager` | GA4/GTM or similar analytics code detected |

**Total: 44 rules** across all 8 categories (spec minimum: 40).

## Known scoring limitations (Phase 3 candidates)

- Citation/directory coverage (Yelp, BBB, data aggregators) always resolves `unknown` — no citation
  provider is implemented in this pass. See `CONNECTED_AUDIT_ROADMAP.md`.
- Review owner-response evidence always resolves `unknown` — not returned by the current Places field
  mask.
- Competitor PageSpeed is not measured (see README "Known limitations"), so
  `competitive.service_coverage_percentile` is the only page-level competitive signal beyond
  rating/reviews.
