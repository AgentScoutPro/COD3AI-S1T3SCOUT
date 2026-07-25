---
name: COD3AI S1T3SCOUT
description: Local Authority Intelligence for Home Services — "Find the gaps. Own the map."
colors:
  obsidian: "#07090D"
  carbon: "#10141B"
  panel: "#151B24"
  slate: "#222A36"
  signal: "#C8FF3D"
  radar-cyan: "#33D6FF"
  authority-gold: "#D8B45A"
  text-primary: "#F4F7FA"
  text-secondary: "#CBD3DE"
  text-muted: "#7E8998"
  critical: "#FF5C68"
  warning: "#FFB84D"
  success: "#42E59B"
typography:
  display:
    fontFamily: "Space Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 700
    lineHeight: 1.15
    use: "brand headlines and major product statements"
  ui:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.6
    use: "navigation, body, forms, tables"
  data:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontWeight: 600
    use: "scores, rank positions, URLs, scan metadata"
rounded:
  small: "8px"
  medium: "14px"
  large: "22px"
  pill: "999px"
spacing:
  4: "4px"
  8: "8px"
  12: "12px"
  16: "16px"
  24: "24px"
  32: "32px"
  48: "48px"
  64: "64px"
  96: "96px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.obsidian}"
    rounded: "{rounded.small}"
    padding: "12px 24px"
  badge:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  card:
    backgroundColor: "{colors.carbon}"
    rounded: "{rounded.medium}"
    padding: "20px 24px"
  authority-gauge:
    backgroundColor: "{colors.carbon}"
    textColor: "{colors.authority-gold}"
    rounded: "{rounded.large}"
    padding: "24px 32px"
---

# Design System: COD3AI S1T3SCOUT

> This file was regenerated from the official brand kit
> (`COD3AI_S1T3SCOUT_Brand_Kit/brand-tokens.json`, `messaging-and-ui-copy.md`, and the logo set) —
> it supersedes an earlier, self-invented "Strategy Room" system this project shipped with before
> the brand kit was provided. Treat this file, not any prior version, as authoritative.

## Overview

**Creative North Star: "Radar / Command Console"**

A local-intelligence command center for home-service operators — not a generic SaaS dashboard, not
an "AI tool" performing intelligence. The product descriptor is literal: *Local Authority
Intelligence for Home Services*. Backgrounds sit in four close obsidian-to-slate tones; two brand
colors — signal lime for action, authority gold for the score itself — carry almost all of the
color budget, with radar cyan reserved for "opportunity" framing. The logo's own radar/scope motif
(a target crosshair with a scanning arc) is the literal source of the "signal" and "radar_cyan"
names — this isn't abstract branding, it's describing what the product does: it scans, it finds
signal, it reports.

**Key Characteristics:**
- Four-tier obsidian/carbon/panel/slate backgrounds, no gradients
- Two-color brand system: signal lime (action) + authority gold (the score, and only the score)
- A translucent white border (`rgba(255,255,255,0.08)`), not a solid border color
- A real elevation shadow exists in the token set (`0 18px 60px rgba(0,0,0,0.28)`) — reserved for
  the AuthorityGauge and other single-focal-point elements, not applied to every card
- Three-typeface system with a clear division of labor: Space Grotesk (headlines) / Inter (UI) /
  IBM Plex Mono (numbers and data)

## Colors

### Brand
- **Signal** (`#C8FF3D`, lime): The primary interactive color — buttons, links, focus states, active
  processing-stage indicator. Named for a radar/scan signal; this is the "go" color.
- **Authority Gold** (`#D8B45A`): Reserved specifically for the AuthorityGauge (the overall score)
  and the top "Dominant"/"Authority-Ready" tier. Do not use it as a general accent — its scarcity is
  what makes the score read as the report's centerpiece.
- **Radar Cyan** (`#33D6FF`): The "opportunity" status color, and used in the wordmark ("COD3AI").
  Low-severity findings use this — a low-severity item is framed as an opportunity, not a problem.

### Backgrounds (ascending)
- **Obsidian** (`#07090D`): Page background, the darkest tone.
- **Carbon** (`#10141B`): Card and section backgrounds.
- **Panel** (`#151B24`): Interactive surfaces — inputs, hovered rows, nested badges.
- **Slate** (`#222A36`): Reserved for a further tier (e.g. deeply nested UI) — not yet used in this
  build; available when a fourth level of depth is actually needed.

### Text
- **Primary** (`#F4F7FA`): Headings, primary body text.
- **Secondary** (`#CBD3DE`): Prose that should be genuinely readable — descriptions, explanations
  (report `scoreExplanation`, hero supporting copy). Use this instead of Muted for any paragraph
  meant to be read start-to-finish.
- **Muted** (`#7E8998`): Captions, labels, metadata, disabled states — content that's supporting,
  not primary reading material.

### Status (four official tones — do not add a fifth)
- **Critical** (`#FF5C68`)
- **Warning** (`#FFB84D`) — covers both "high" and "medium" severity; the label text
  (HIGH vs. MEDIUM) does the differentiating, not a second orange shade.
- **Success** (`#42E59B`) — pass/informational findings, completed processing stages.
- **Opportunity** = Radar Cyan (`#33D6FF`) — low-severity findings.

### Named Rules
**The Two-Color Rule.** Signal and Authority Gold never both appear as the primary color on the same
element. Signal means "click me / this is active." Authority Gold means "this is the score." Keeping
them exclusive is what makes the AuthorityGauge read as distinct from every button on the page.

## Typography

**Display Font:** Space Grotesk, 600–700 weight — brand headlines and major product statements only
(page H1s, business name on the report). Applied via the `font-display` utility.
**UI Font:** Inter, 400–700 weight — everything else: nav, body, forms, tables, labels. This is the
default (`font-sans`).
**Data Font:** IBM Plex Mono, 500–600 weight — the overall score number, and raw evidence JSON.
Applied via `font-mono`.

### Named Rules
**The Three-Role Rule.** A typeface signals *what kind* of content something is, not just a visual
style: Space Grotesk = "this is a brand statement," Inter = "this is interface," IBM Plex Mono =
"this is a measured number or raw data." Don't reach for Space Grotesk on UI chrome (card titles,
badges) even where it might look nice — that blurs the signal.

## Layout

12-column grid on desktop, content capped at 1440px max width, with report/detail content further
constrained to `max-w-4xl` for readability. Spacing scale: 4/8/12/16/24/32/48/64/96px — section
rhythm uses the top of that scale (`py-16`–`py-24`), component internals use the middle (`px-6 py-5`
cards, `px-4 py-3` rows).

## Elevation & Depth

Mostly flat — tonal layering (Obsidian → Carbon → Panel) and a 1px translucent white border
(`rgba(255,255,255,0.08)`) carry depth for cards, inputs, and rows. The brand kit does define a real
shadow token (`0 18px 60px rgba(0,0,0,0.28)`), reserved for the AuthorityGauge specifically — the
one element per screen meant to visually lift off the page. Applying it more broadly would dilute
that.

### Named Rules
**The One Shadow Rule.** `shadow-elevated` exists for exactly one purpose: the AuthorityGauge. Every
other surface uses tone + border only.

## Shapes

- **Small** (8px): buttons, inputs, list rows — Tailwind's own `rounded-lg` default already equals
  8px, so these use the bare class.
- **Medium** (14px): cards, table containers — `rounded-[14px]` (no Tailwind default step matches).
- **Large** (22px): the AuthorityGauge only — `rounded-[22px]`.
- **Pill** (999px): badges, progress-track fills, stage-indicator dots — `rounded-full` (9999px) is
  close enough to be visually identical.

## Components

### Buttons
- **Shape:** 8px radius (small), no border on primary.
- **Primary:** Signal lime background, obsidian text — the one solid-fill, high-attention action per
  screen (submit audit, primary CTA).
- **Secondary:** Transparent/Carbon background, border-colored 1px outline.
- **Ghost:** No background, muted text — tertiary actions ("Print / Save as PDF").
- **Hover:** Color transitions only (120–220ms, `cubic-bezier(0.22, 1, 0.36, 1)` per the brand kit's
  motion tokens) — no transform/scale.

### Badges
- Panel background, pill radius, uppercase label typography (Inter, 600 weight, wide tracking).
- Severity/status tones map onto the four official status colors only (see Colors → Status above).

### Cards
- Carbon background, 14px radius, 1px translucent border, no shadow.

### AuthorityGauge (signature component)
- The overall score display. Carbon background, 22px radius, 2px border in the classification
  band's color, `shadow-elevated`, IBM Plex Mono score number (tabular figures).

### Processing Stage Row (signature component)
- Reflects real persisted `audit_events` — never simulated. Panel background at rest; a signal-lime
  ring pulses while active; a filled success-green circle with a checkmark once complete. Labels use
  the brand kit's scan-progress language where a real stage matches it (see
  `components/audit/processing-view.tsx`), and stay plain/functional where it doesn't — never
  claiming a capability (e.g. Search Console analysis) that isn't actually built.

## Do's and Don'ts

### Do:
- **Do** keep Signal (lime) and Authority Gold mutually exclusive as primary colors on any one
  element (see The Two-Color Rule).
- **Do** use the four official status colors for severity/state — critical/warning/success/
  opportunity — never introduce a fifth.
- **Do** use Space Grotesk only for brand headlines/major statements, Inter for everything else,
  IBM Plex Mono for scores and data.
- **Do** reserve `shadow-elevated` for the AuthorityGauge alone.

### Don't:
- **Don't** invent new hex values outside this token set — extend from these roles.
- **Don't** apply the AuthorityGauge's shadow or 22px radius to ordinary cards.
- **Don't** claim a data source or capability in copy (stage labels, hero copy) that isn't actually
  implemented — see `CONNECTED_AUDIT_ROADMAP.md` for what's real vs. planned.
- **Don't** use gradients, glow, or glassmorphism anywhere.
