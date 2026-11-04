# Rankace Design System — "Search Field"

The binding visual contract for the Rankace UI. Every colour, size, spacing value, radius, motion
duration and component variant used in `frontend/` must trace back to a token declared here.
If a value is needed and is not declared, add it here first.

Stack constraint: this contract is implemented on the **existing** stack — Next.js 14 App Router,
TypeScript, Tailwind CSS v3, framer-motion, recharts, lucide-react. No framework or styling
migration. GSAP is the one added dependency (scroll choreography only).

---

## 0. Research Log

| Lane | Deliverable |
|------|-------------|
| Awwwards — `search_sites` (live MCP) | 16 real award-winners across three filters: `data-visualization`+`ui-design`, `startups`+`interaction-design`, `award=sotd`+`ui-design`. Judged from inline screenshots, not titles. |
| Awwwards — `get_site_elements` (live MCP) | Cerebrium (SOTD + Dev Award): 6 element videos incl. WebGL force-field globe, Lottie feature animation, dropdown nav. |
| Motion study | Cerebrium globe + intro videos downloaded and tiled at 2 fps (6x4) via ffmpeg, then read frame-by-frame. Extracted: slow constant rotation of a lit volumetric form, a lattice band travelling along a path, square particles fading in/out, headline word-stagger reveal, cards rising in sequence. |
| Layer A reference | `gpt-tasteskill.md` — the user selected the maximalist Awwwards lane (cinematic, scroll-driven, high-craft). Loaded in full. |
| Layer B reference | `redesign-skill.md` audit findings on the existing UI (see Appendix A) drove the de-slopping work. |
| Skipped | `get_site_details` for `daq-consulting` returned a parser-drift error ("parsed no design data"); that reference was judged from its real screenshot instead of degraded data. Imagen concept drafts — no image-generation tool available in this environment; the hero focal object is a real rendered canvas instead of a generated bitmap. |
| Layer B brand | Deliberately **not** applied verbatim. Material and palette are traced from the Awwwards references; all content, tokens and components are Rankace's own. No logos or trademarked assets copied. |

---

## 1. Atmosphere & Identity

Rankace is a **field instrument for search visibility**. It should feel like laboratory equipment
that happens to be beautiful: graphite-black, precisely ruled, lit from a single high angle, with
real numbers set in monospace. Calm under load, never decorative, never "AI purple".

The rejected direction, for the record: the previous UI was navy `#06080F` with indigo/cyan/emerald
gradient text, five `glow-*` shadow presets, a system-font headline, `rounded-2xl` on every surface,
`SpotlightCard` wrapping every single block, an eyebrow label above nearly every section, and a
gradient blob where a hero focal object should be. All of that is gone.

**The signature — the Visibility Field.** The hero focal object is a slowly rotating isometric
lattice sphere with a band of crawl-nodes travelling along its path and opportunity particles
drifting in and out. It is Rankace's own idea: a crawl traversing a web, rendered as a lit
volumetric form. Traced in technique to Cerebrium's force-field globe; not traced in content.

**Two themes, one token layer.** Dark is the baseline and the design reference; a light theme is
shipped because the app is used for long audit sessions in daylight offices. Both themes resolve
every colour through the same `var()` tokens, so there are zero `dark:` utilities and no component
knows which theme is active. The switch is `:root[data-theme]` on `<html>`, resolved before first
paint by an inline script (no flash), with Light / Dark / System as a three-way control. Only colour
inverts — spacing, radius, elevation recipes, type and motion are theme-invariant. Section 8 records
the contrast measurements for both themes.

---

## 2. Color

### Palette

| Role | Token | Value | Usage |
|------|-------|-------|-------|
| Canvas | `--surface-canvas` | `#08090A` | Page background. Graphite, never navy. |
| Surface | `--surface-1` | `#0E1011` | Panels, cards, table headers |
| Surface elevated | `--surface-2` | `#141718` | Popovers, dialogs, hovered rows |
| Surface sunken | `--surface-sunken` | `#050606` | Wells, code blocks, input interiors |
| Border subtle | `--border-subtle` | `rgba(255,255,255,0.06)` | Row separators, grid lines |
| Border default | `--border-default` | `rgba(255,255,255,0.11)` | Panel outlines, input borders |
| Border strong | `--border-strong` | `rgba(255,255,255,0.18)` | Hover/active outlines, focus-adjacent |
| Text primary | `--text-primary` | `#F2F3F3` | Headlines, primary body. Bone, not `#FFFFFF` |
| Text secondary | `--text-secondary` | `#9BA1A6` | Supporting copy, table headers |
| Text tertiary | `--text-tertiary` | `#7C838A` | Metadata, disabled, axis labels |
| **Accent** | `--accent` | `#FF2E6B` | Interactive/active/focus channel **only** |
| Accent hover | `--accent-hover` | `#FF5486` | Hover on accent *text* controls |
| Accent pressed | `--accent-pressed` | `#E01A55` | `:active` on accent *text* controls |
| Accent quiet | `--accent-quiet` | `rgba(255,46,107,0.12)` | Accent-tinted fills, selected rows |
| Accent line | `--accent-line` | `rgba(255,46,107,0.34)` | Accent-tinted borders, rings |
| **Accent fill** | `--accent-fill` | `#B81A4B` | Filled primary controls, under bone text |
| Accent fill hover | `--accent-fill-hover` | `#CE2156` | Hover on filled primary controls |
| Accent fill pressed | `--accent-fill-pressed` | `#A81542` | `:active` on filled primary controls |
| Danger fill | `--danger-fill` | `#B3201F` | Destructive confirm fill, under bone text |
| Danger fill hover | `--danger-fill-hover` | `#C62A26` | Hover on destructive confirm |
| Status success | `--status-success` | `#2FBF71` | SEO health: pass |
| Status warning | `--status-warning` | `#D9A441` | SEO health: caution |
| Status error | `--status-error` | `#E5484D` | SEO health: fail, inline error text |
| Status info | `--status-info` | `#4C9AFF` | Informational |

### Rules

- **One accent.** `--accent` is the only brand hue. It marks what is interactive, selected, or
  focused. It is never used for decoration, never for section headings, never as a background wash
  behind body copy.
- **Filled controls use `--accent-fill`, not `--accent`.** The vivid `#FF2E6B` is an *on-graphite*
  colour: it carries text, indicators, focus rings and the field's node band, where it clears 5.61:1.
  It cannot carry bone text on top of itself (3.22:1 — a fail), so a filled primary control uses the
  deeper `--accent-fill` ramp instead. This is a deliberate two-step ramp, not an inconsistency:
  `--accent` for ink, `--accent-fill` for surfaces.
- **Status colours are a separate channel.** Green/amber/red mean exactly one thing: technical
  health or intent classification. They are never used for buttons, links, or emphasis. Because the
  accent is deliberately outside the green/amber/red range, an accent button can never be mistaken
  for a health state.
- **Colour is never the sole signal.** Every status carries a shape (icon) and a text label. The
  four intent classes each get a distinct glyph as well as a distinct colour.
- **No pure black and no pure white.** `#050606` is the darkest surface; `#F2F3F3` the lightest text.
- **No gradient text.** The previous `bg-clip-text from-indigo via-cyan to-emerald` headline is
  removed. Emphasis comes from weight, size, or a single accent word — never a rainbow.
- **No neon glows.** No `box-shadow` may use an accent or status hue at more than 22% alpha. Depth
  comes from the Section 7 recipe.

### Intent class mapping (fixed)

| Intent class | Token | Glyph |
|---|---|---|
| Informational | `--status-info` = `#4C9AFF` | `BookOpen` |
| Navigational | `--status-success` | `Compass` |
| Commercial Investigation | `--accent` | `Target` |
| Transactional | `--status-warning` | `CreditCard` |

---

## 3. Typography

Two families. No serif, no third family.

- **Display / UI:** `Space Grotesk` (weights 300, 400, 500, 600, 700) — self-hosted via
  `next/font/google` with `display: "swap"` and a preloaded 500 weight.
- **Data / mono:** `JetBrains Mono` (weights 400, 500, 700) with `font-variant-numeric: tabular-nums`
  applied globally to every numeric context.

`Inter`, the system font stack, and any `-apple-system` fallback are **banned**. If a font fails to
load the page must fall back to `sans-serif`, never to a different personality.

### Scale

| Level | Size | Weight | Line height | Tracking | Usage |
|-------|------|--------|--------------|----------|-------|
| Display XL | `clamp(2.75rem, 6.2vw, 5.5rem)` | 500 | 1.02 | `-0.04em` | Landing H1. Max 2 lines. |
| Display L | `clamp(2.25rem, 4.4vw, 3.75rem)` | 500 | 1.06 | `-0.035em` | Section headings, page titles |
| Display M | `clamp(1.75rem, 2.8vw, 2.5rem)` | 500 | 1.12 | `-0.03em` | Subsection headings |
| Title L | `1.5rem` | 600 | 1.2 | `-0.02em` | Panel titles, large stat values |
| Title M | `1.125rem` | 600 | 1.3 | `-0.015em` | Card titles, tab labels |
| Body L | `1.0625rem` | 400 | 1.65 | 0 | Lead paragraphs. Max `62ch` |
| Body | `0.9375rem` | 400 | 1.6 | 0 | Default UI text |
| Body S | `0.8125rem` | 400 | 1.5 | 0 | Table cells, dense UI |
| Label | `0.75rem` | 500 | 1.4 | `0.01em` | Form labels, control text |
| Mono Data | `0.8125rem` | 500 | 1.4 | `0` | All metrics, scores, counts, IDs |
| Mono Micro | `0.6875rem` | 500 | 1.3 | `0.14em` | Uppercase status/metadata labels |

### Rules

- Body text never below `0.8125rem`. Body measure never wider than `62ch`.
- `text-wrap: balance` on all headings; `text-wrap: pretty` on body copy.
- **Eyebrow budget: at most 1 per 3 sections** (the previous landing had 5 on one page). Eyebrows
  are `Mono Micro` only. Hero counts as one. Where a label is not needed, ship none.
- Meta-labels of the form `SECTION 01`, `MODULE 01`, `QUESTION 05`, `STEP 03` are **banned**. If a
  group needs a label, use a real noun ("Crawl", "Intent classes", "Health").
- Every number in a table, score, meter, KPI or timestamp is mono with tabular figures.

---

## 4. Spacing & Layout

Base unit **4px**. All spacing uses a declared step.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `0.25rem` | Icon-to-label |
| `--space-2` | `0.5rem` | Inline groups, chip gaps |
| `--space-3` | `0.75rem` | Input padding, tight stacks |
| `--space-4` | `1rem` | Default control height context, card padding |
| `--space-5` | `1.25rem` | Card padding (default) |
| `--space-6` | `1.5rem` | Panel padding |
| `--space-8` | `2rem` | Between card groups |
| `--space-10` | `2.5rem` | Within a page section |
| `--space-12` | `3rem` | Section breaks (operational pages) |
| `--space-16` | `4rem` | Section breaks (marketing) |
| `--space-24` | `6rem` | Chapter separation on landing |
| `--space-32` | `8rem` | Max separation between landing chapters |

### Grid

- Content max width: `76rem` (1216px) for operational pages, `84rem` (1344px) for the landing.
- Column system: 12-column, `1.5rem` gutter, `1.5rem` margin at mobile.
- Breakpoints: `sm 640px`, `md 768px`, `lg 1024px`, `xl 1280px`, `2xl 1536px`.
- Bento grids use `grid-auto-flow: dense` and mathematically interlock — zero empty cells.
- Marketing section rhythm: asymmetric. Never stack three identical split sections.

### Radius scale (one rule, applied everywhere)

| Token | Value | Applied to |
|-------|-------|-----------|
| `--radius-sm` | `0.375rem` | Inputs, chips, small controls |
| `--radius-md` | `0.75rem` | Buttons, panels, cards |
| `--radius-lg` | `1.25rem` | Large feature panels, dialogs |
| `--radius-pill` | `9999px` | Nav pill, filter pills, status dots only |

Cards are `--radius-md`. Buttons are `--radius-sm`. Pills are reserved for the nav pill, filter
toggles and circular status dots. Mixing pill buttons into a square-card layout is a failure.

### Z-index scale

| Token | Value | Layer |
|-------|-------|-------|
| `--z-base` | 0 | Page content |
| `--z-raised` | 10 | Sticky headers, sticky tab bars |
| `--z-overlay` | 20 | Dropdowns, drawers, popovers |
| `--z-modal` | 30 | Dialogs |
| `--z-toast` | 40 | Toasts |
| `--z-grain` | 50 | Fixed grain/noise overlay, `pointer-events: none` |

No arbitrary `z-[9999]`.

---

## 5. Components

Primitives live in `frontend/components/ui/`. Each is a real file with the states listed.

### Button
- **Structure:** `<button>` / `<a>`; internal `<span>` for the label so the icon can gap correctly.
- **Variants:** `primary` (accent fill, bone text), `secondary` (surface fill, border), `ghost`
  (transparent, accent text), `tertiary` (transparent, secondary text — for inline actions), `danger`
  (error-tinted fill for destructive confirm).
- **Sizes:** `sm` (2rem), `md` (2.5rem), `lg` (3rem).
- **States:** default, hover (`--accent-hover` + `translateY(-1px)`), active (`--accent-pressed` +
  `translateY(0)` and `scale(0.985)`), focus-visible (2px `--accent` ring, 2px offset), disabled
  (`0.4` opacity, `cursor: not-allowed`, no pointer events), loading (spinner + label retained for
  width stability, `aria-busy`).
- **Accessibility:** label always ≥ 4.5:1 against its own fill. Icon-only buttons require
  `aria-label`. Never `bg-white text-white`. Never a wrapped label at desktop — labels are ≤ 3 words.
- **Motion:** 140ms ease-out on colour/transform. No shimmer, no perpetual gradient.

### Field (input / textarea / select)
- Label above, helper text below, error text below helper. `gap-2` between label and control.
- States: default, focus (accent ring, no layout shift), error (error border + message +
  `aria-invalid`), disabled, read-only.
- No placeholder-as-label. Placeholder is `--text-tertiary` and always supplementary.

### Panel
The single elevated surface primitive. Replaces every `SpotlightCard`.
- **Variants:** `flush` (no padding, for tables), `padded` (default `--space-5`), `sunken` (input
  wells), `hero` (marketing feature panel, `--radius-lg`).
- **States:** default, hover (only when interactive — border to `--border-strong`), focus-within.
- **Rule:** elevation communicates hierarchy. If it does not, use spacing or a hairline rule
  instead of a panel.

### StatBlock
- Label (`Mono Micro`), value (mono, tabular, `Title L`), optional delta with an explicit
  up/down glyph, optional `/100` suffix in `--text-tertiary`.
- States: default, loading (skeleton matching final box), demo (`DEMO` micro-label).

### ScoreMeter
- 0–100 horizontal meter. Track `--surface-sunken`, fill = status colour by band
  (≥80 success, 50–79 warning, <50 error), plus the numeric value in mono.
- Always paired with the numeric value and a text label — never colour alone.
- Variants: `bar`, `ring` (circular, for the project cockpit hero score), `inline` (sparkline-style).

### DataTable
- Header row: `Mono Micro`, uppercase, `--text-tertiary`, sticky under the tab bar.
- Row: `--surface-1`, hairline `--border-subtle` separator, hover `--surface-2`.
- Numeric columns right-aligned, mono, tabular. Long values truncate with a title attribute.
- States: loading (skeleton rows matching column count), empty (composed EmptyState), error
  (inline retry), populated. Horizontal scroll contained by the panel, never the page.
- Mobile: collapses to stacked definition rows; the table never forces page-level horizontal scroll.

### Tabs
- Variants: `rail` (project cockpit left rail), `underline` (secondary groups), `pill` (filters).
- Full keyboard support: arrow keys move, `role="tablist"`, `aria-selected`, roving tabindex.
- States: default, hover, selected (accent indicator), focus-visible.

### StatusTag
- Small mono label + glyph + colour. Variants: `success`, `warning`, `error`, `info`, `neutral`,
  `demo`. Square-ish (`--radius-sm`), never a pill-shaped "New/Beta" badge.

### Dialog / Drawer
- Dialog for destructive confirmation and forms; drawer for detail inspection. No modal for simple
  actions — inline editing and progressive disclosure are preferred.
- Focus trap, `aria-modal`, `Esc` to close, focus restored to trigger.

### Skeleton
Matches the final layout's exact box shapes. No circular spinners anywhere.
`--pulse` animation only, disabled under reduced motion.

### EmptyState
Composed, not blank: a short explanation, the primary next action, and a concrete example. Never an
empty region.

### NavPill
Floating marketing nav. `--radius-pill`, hairline border, backdrop blur with a solid
`--surface-canvas` fallback under `prefers-reduced-transparency`. Contains the product mark, ≤ 5
single-line nav items, and one primary action. Desktop height ≤ 72px.

### VisibilityField (signature, `components/visuals/`)
Canvas 2D renderer: rotating isometric lattice sphere, a travelling band of crawl-nodes, drifting
opportunity particles, single light source upper-left. Props: `intensity`, `paused`, `className`.
- `prefers-reduced-motion` or `paused` → renders one static frame and stops the loop.
- Canvas is `aria-hidden`; the hero conveys meaning through its text, not the canvas.
- Respects `devicePixelRatio`; pauses via `IntersectionObserver` when off-screen.

---

## 6. Motion & Interaction

Motion exists to explain state changes. No decorative loops, no animation on non-interactive
elements, no perpetual shimmer.

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 120–160ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Hover, press, focus ring, chip toggle |
| Standard | 220–320ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Panel enter, tab switch, drawer |
| Emphasis | 480–680ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Hero entry, chapter reveals |
| Scroll-driven | tied to scroll | linear | Pinned chapters, horizontal pan, scrubbed reveals |

### Rules

- Animate **only** `transform` and `opacity`. Never `top`, `left`, `width`, `height`, `margin`.
  Progress bars and meters animate `transform: scaleX()`.
- Scroll work uses GSAP `ScrollTrigger`. **No `window.addEventListener("scroll")`.** No scroll
  position in React state.
- `will-change` only on the property actually animating, removed after.
- Every animated route/section honours `prefers-reduced-motion: reduce` by rendering the final
  state immediately, with no pinning and no parallax.

### GSAP paradigms (landing only — three, deliberately)

1. **Hero entry.** Headline words stagger up (`y: 24 → 0`, `opacity: 0 → 1`, 60ms stagger) as the
   Visibility Field completes its first partial rotation. One-off, not scrubbed.
2. **Pinned pipeline chapter.** A four-stage horizontal pan: the section pins at `start: "top top"`,
   an inner track translates on `x` with `scrub: 1`, and each stage's caption cross-fades as its
   panel reaches centre. This is the landing's single pinned moment.
3. **Scrubbed methodology reveal.** Paragraph words sit at `opacity: 0.12` and scrub to `1.0`
   sequentially as the block crosses the viewport.

The dashboard and the project cockpit get **no pinning, no scroll hijacking, no horizontal scroll**.
They get micro and standard transitions only. A seven-tab analytics suite must stay operable.

---

## 7. Depth & Surface

Strategy: **mixed** — tonal shift as the primary separator, hairline borders for structure, and a
four-layer recipe for anything that must read as a lit, dimensional material. No single
`backdrop-filter` standing in for glass.

### Base surfaces (panels, rows)

1. Fill `--surface-1`.
2. `border: 1px solid --border-subtle`.
3. Inner specular: `box-shadow: inset 0 1px 0 rgba(255,255,255,0.04)`.
4. Ambient drop tinted to the graphite hue, never pure black:
   `0 18px 40px -24px rgba(0,0,0,0.9)`.

### Volumetric material (hero field, marketing feature panels — landing only)

1. Base fill `--surface-canvas`.
2. Radial plum key light upper-left: `radial-gradient(120% 90% at 22% 12%, rgba(255,46,107,0.16), transparent 62%)`.
3. Cool rim from lower-right to separate the form from the page: `radial-gradient(90% 70% at 82% 88%, rgba(76,154,255,0.10), transparent 60%)`.
4. Lattice stroke layer at `rgba(242,243,243,0.14)`, node band in `--accent`.
5. Grain overlay (Section 5 `z-grain`), fixed, `pointer-events: none`, `opacity: 0.035`.

### Global

- A single fixed grain overlay may sit above all content. Never attach grain to a scrolling
  container.
- Shadows always tint toward the graphite hue. No `rgba(0,0,0,0.5)` drop shadows on light areas —
  there are no light areas.
- Lighting direction is consistent: key light upper-left, everywhere, on every surface.

---

## 8. Accessibility Constraints & Accepted Debt

### Constraints (WCAG 2.2 AA, non-negotiable)

- Contrast floor `4.5:1` body, `3:1` large text and UI boundaries. Measured ratios for the token
  pairs that carry text (computed against the exact hexes, not assumed):

  | Pair | Ratio | Verdict |
  |------|-------|---------|
  | `--text-primary` on `--surface-1` | 16.1:1 | pass |
  | `--text-secondary` on `--surface-1` | 7.3:1 | pass |
  | `--text-tertiary` on `--surface-sunken` | 5.2:1 | pass |
  | `--accent` on `--surface-canvas` | 5.6:1 | pass (ink only) |
  | `--text-primary` on `--accent-fill` | 5.8:1 | pass (primary button) |
  | `--text-primary` on `--accent-fill-hover` | 4.8:1 | pass |
  | `--text-primary` on `--danger-fill` | 6.0:1 | pass (destructive) |
  | `--text-primary` on `--accent` | 3.2:1 | **fail — never used** |

  Two rules follow from the last row. Bone text is never set on `--accent`; filled controls use
  `--accent-fill`. And `--text-tertiary` was moved from `#6B7176` to `#7C838A` because the original
  value measured 3.9:1 on the sunken surface used for inputs — below the floor for 12px text.
- Visible focus on every interactive element via `:focus-visible`, 2px accent ring, 2px offset.
  Focus is never removed without a replacement.
- Full keyboard reachability: nav, tabs (arrow keys), dialogs (trap + `Esc`), tables (row actions
  reachable), skip link as the first focusable element on every page.
- `prefers-reduced-motion: reduce` disables all GSAP choreography, the field animation, shimmer, and
  skeleton pulse, rendering final states immediately.
- `prefers-reduced-transparency: reduce` swaps glass surfaces for solid `--surface-canvas`.
- Every status and intent class pairs colour with a glyph and a text label.
- Form errors are inline, associated via `aria-describedby`, never `window.alert`. The existing
  `confirm()` for project deletion is replaced by a Dialog.
- Semantic landmarks: `header`, `nav`, `main`, `section`, `footer`; one `h1` per page.
- `lang="en"` and `color-scheme: dark` on `<html>`.

### Accepted debt

| Item | Location | Why accepted | Exit |
|------|----------|--------------|------|
| GSAP adds ~117 KB uncompressed to the landing route | `/` | Measured: two chunks, 65.8 KB + 50.8 KB. Required for the pinned chapter the user selected; route-level code-split keeps it off `/login`, `/dashboard` and `/projects/*` | Drop to CSS `animation-timeline: view()` if the landing bundle budget is breached |
| Hero canvas runs continuously while visible | `/` | The field is the signature moment; it pauses off-screen and under reduced motion. Gradients are cached per-resize and the animation loop starts only after a paint is committed, with a static frame drawn first so there is no flash | Already mitigated |
| Mobile `/` performance 85–92 (median 92) | `/` | Lighthouse's simulated 4× CPU / 1.6 Mbps throttle inflates one ~308 ms pre-paint main-thread task into ~1.2 s of render delay. Unthrottled real Chrome paints the LCP element at 432 ms with FCP also 432 ms. Run-to-run spread is 85–92 | Reduce the pre-hydration task (route-split the hero field), or accept: real-device LCP is already well inside the 2.5 s budget |

---

## Appendix A — Audit findings driving this contract

Source: `frontend/app/page.tsx` (480 lines), `frontend/app/dashboard/page.tsx` (470 lines),
`frontend/app/login/page.tsx`, `frontend/app/projects/[id]/page.tsx` (1078 lines),
`frontend/app/globals.css`, `frontend/tailwind.config.js`.

| Finding | Resolution |
|---|---|
| Navy `#06080F` canvas + indigo/cyan/emerald gradient headline | Graphite canvas, single magenta accent, no gradient text (§2) |
| Five `glow-*` shadow presets keyed to brand hues | One tinted ambient recipe, ≤22% alpha (§7) |
| System font stack, `font-black` headlines | Space Grotesk scale (§3) |
| `rounded-2xl` on every surface | Declared radius scale with one rule (§4) |
| `SpotlightCard` wrapping nearly every block, five different spotlight colours | One `Panel` primitive; elevation only when it means something (§5) |
| Eyebrow/meta-label above nearly every section; `Module 01`–`Module 04` | Eyebrow budget of 1 per 3 sections; meta-labels banned (§3) |
| Particle + animated-grid background on every page | One static grain overlay; the animated field is the landing hero only (§5, §7) |
| Intent sandbox rendered as a fake macOS terminal window with three coloured dots | Real instrument panel: label-above-input, four intent meters, attribution line (§5) |
| `ShimmerButton` as the primary CTA everywhere | Static Button variants; shimmer removed (§5) |
| Demo-mode banner relying on amber wash to stand out | `StatusTag variant="demo"` with explicit `DEMO` label (§5) |
| `confirm()` for project deletion | Dialog primitive with focus trap (§5) |
| No favicon (404 in console) | Branded favicon added in `app/layout.tsx` |
| Landing and dashboard both `min-h-screen` | `min-h-[100dvh]` where a full-height surface is needed (§4) |

## Appendix B — Page architecture

### `/` (landing) — AIDA, maximalist
1. **Nav** — floating `NavPill`, ≤ 5 items, single line at desktop.
2. **Attention** — cinematic hero. `Display XL` headline, max 2 lines, hard-capped by
   `max-w-5xl`; one primary + one secondary CTA; the `VisibilityField` as the full-bleed focal
   object with a graphite radial wash; GSAP word-stagger entry.
3. **Interest** — gapless bento (`grid-flow-dense`, 5 cells for 5 modules, zero empties) mixing
   dense typography, a real score panel and one live intent readout. Each cell gets genuine visual
   variation — no five identical bordered boxes.
4. **Desire** — the pinned horizontal pipeline chapter: crawl → analyse → classify → score, with
   the live intent classifier embedded as the working centrepiece.
5. **Trust** — methodology as a scrubbed word-by-word reveal.
6. **Action** — FAQ as progressive disclosure beside a closing statement (not a centred accordion
   stack), then a full-bleed CTA band and a footer with real navigation plus privacy/terms.

Section separation: `--space-24` to `--space-32`, asymmetric, no repeated split layout.

### `/login` — editorial split
Left: form on graphite, one primary CTA, demo-credential affordance. Right: a live intent
classification readout that proves the product works before sign-in. Cinematic restraint — no
scroll choreography on an auth screen.

### `/dashboard` — operational
`StatBlock` row → demo banner when `?demo=1` → create-project panel (inline form, not a modal) →
project roster with `pill` filter toggles and a `DataTable` on desktop / stacked rows on mobile →
composed `EmptyState` when there are no projects. Inline error and success banners.

### `/projects/[id]` — the cockpit
Left `rail` tabs (7) + sticky top bar with project identity and primary action (trigger crawl,
export PDF) + a `ScoreMeter variant="ring"` hero score with health band. Tab bodies are dense and
operational: technical issue tables, keyword tables with opportunity meters, competitor gap tables,
experiment trackers, report export. recharts for the few genuine time series. No pinning, no
horizontal page scroll, skeleton loading, inline error with retry.
