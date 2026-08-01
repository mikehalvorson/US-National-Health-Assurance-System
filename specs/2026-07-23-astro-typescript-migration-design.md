# Design: Migrate the NHA dashboard to Astro + TypeScript

Date: 2026-07-23
Status: Approved design, pending implementation plan

## Goal

Replace the current vanilla-HTML/JS architecture of the National Health
Assurance (NHA) dashboard with an Astro + TypeScript project, to fix four
maintainability problems the owner identified:

1. Fragile manual `<script>` load order and a single `window.NHA` global.
2. All twelve tabs' markup living in one 82KB `index.html`.
3. Repeated hand-built markup (cards, chapter intros, nav footers, charts)
   with no reusable component layer.
4. Prose and numbers embedded in JS/HTML, so editing copy means editing code.

## Non-goals

- No visual redesign. The dashboard must look the same after migration.
- No changes to the model math, calibration, or headline numbers.
- No new features. This is a structural migration only.
- No change to the hard content rules (no em dashes, no source-document
  references, every number sourced with a confidence grade, no cross-scale
  dollar comparisons). The migration should make these *easier* to enforce,
  never relax them.

## Decision record

- Framework: **Astro** (static output), chosen over Eleventy (not
  TypeScript-native, no island/component model for heavy interactive charts)
  and Vite+vanilla-TS (no component or content-as-validated-data layer).
  Astro is the only option whose content layer can mechanically enforce the
  project's sourcing rules.
- Language: **TypeScript**, `strict` mode.
- Package manager: **pnpm**.
- Toolchain pinning: **Volta**, recording Node LTS + pnpm versions in
  `package.json` so every session/agent gets identical tooling.
- Testing: **Vitest**, replacing the in-page self-test footer.
- Deploy: **GitHub Actions** (`withastro/action`) with Pages source set to
  "GitHub Actions". Fallback documented below.

## Target architecture

```
<repo root>
  package.json          Volta pins (node, pnpm); scripts; deps
  astro.config.mjs      site + base path, static output, integrations
  tsconfig.json         strict TypeScript
  src/
    pages/              one .astro page per tab (overview, health, tax,
                        legislation, units, medications, data, workforce,
                        gov, hardening, rollout, quality)
    layouts/            the shared shell: <head>, theme, <nav class="tabs">
    components/         Card, ChapterIntro, ChapterNav, ConfidenceBadge,
                        chart islands, map island, calculators
    lib/                the model engine as pure TS modules
                        (model.ts, taxmodel.ts, unitsapp logic, etc.)
    content/            schema-validated data collections (see below)
    styles/             style.css ported as-is (CSS variables, light+dark)
  public/
    data/               counties.json, us-states.json (served unchanged)
  specs/                design + planning docs (NOT published)
  tests/                Vitest suites (model invariants = old self-tests)
```

Key change: the `window.NHA` namespace and the load-order-sensitive script
list are replaced by ordinary ES-module `import` statements. The bundler
resolves dependencies, so ordering is no longer a manual concern.

## Content layer (the primary maintainability win)

The data catalogs become Astro **Content Collections** with **Zod schemas**,
validated at build time:

- parameters (sourced healthcare/tax figures)
- tax instruments (16)
- governance entities (82 under 9 bodies)
- quality catalog (430: 41 KPP + 79 TPP + 310 CP, each with a phase rollout)
- medication families (200)
- scenarios (healthcare stress catalog + tax presets)

Every sourced figure is validated against a schema of the shape:

```ts
{ value: number, source: string, url: string, year: number,
  confidence: 'high' | 'medium' | 'low' }
```

The build **fails** if a number is missing its confidence grade or source.
This converts the hard content rule "every number is sourced with a
confidence grade" from a manual review step into a mechanical guarantee.
Prose/copy also moves into content (Markdown/MDX or data files), editable
without touching logic.

## Interactivity (islands)

Charts, calculators, sliders, and the county map become client-side
TypeScript mounted as Astro islands (`client:load` / `client:visible`).
Static prose ships as zero-JS HTML. The hand-rolled SVG chart primitives
(`NHA._chartUtil`) and the validated dataviz palette (CSS variables) move
over unchanged, so charts render identically. Existing NaN/Infinity geometry
guards are preserved.

## Testing

`NHA.selfTest()` (in model.js) and the `NHA.SELFTESTS` array (tax,
governance, quality, medications, workforce invariants) become Vitest test
files under `tests/`. They run on every commit in CI instead of rendering
into a page footer. If a visible "all N self-tests pass" indicator is still
wanted in the UI, it can be computed at build time from the same invariants.

## Visual preservation

- `style.css` is ported essentially unchanged; it is already a clean
  CSS-variable system with light and dark themes.
- Each tab's `.astro` output reproduces the same DOM structure and class
  names as the current markup, so rendered output matches.
- Every migrated tab is diffed against the current live dashboard (DOM
  inspection per the project's verify-with-`innerText` convention; the
  browser pane's screenshots have hung repeatedly and are not relied on)
  before it is considered done.

## GitHub Pages deployment

- `astro.config.mjs` sets `site: 'https://<owner>.github.io'` and
  `base: '/US-National-Health-Assurance-System/'`, static output.
- All asset URLs are built through `import.meta.env.BASE_URL` so they
  resolve correctly under the repository sub-path.
- Deployment uses a GitHub Actions workflow (`withastro/action`) that builds
  the site and publishes it to Pages, with the Pages source set to
  "GitHub Actions". This retires the committed build output under `docs/`
  and the root-`index.html` redirect hack.
- The action emits `.nojekyll` automatically so Astro's `_astro/` asset
  directory is served.
- Fallback (if Actions is undesirable): set `outDir: 'docs'`, build locally,
  and commit the built output. Not recommended; keeps generated files in
  version control.

## Migration strategy (incremental; old site stays live until cutover)

- **P0 Tooling.** Install Volta, then Node LTS + pnpm via Volta; scaffold
  the Astro project; get an empty build deploying to a test path. No change
  to the live site yet.
- **P1 Shell + one tab.** Port the layout shell, `style.css`, and one simple
  tab (overview). Verify visual parity against the live dashboard.
- **P2 Model engine.** Port the healthcare + tax model modules to TS under
  `src/lib/`, with Vitest tests reproducing the old self-tests.
- **P3 Remaining tabs.** Port the other tabs one at a time, each diffed
  against the live original.
- **P4 Content.** Move the data catalogs into schema-validated content
  collections; wire the build-time validation.
- **P5 Cutover.** Switch Pages to the Actions deploy; retire the old static
  `docs/` files and the root redirect.

Each phase is independently verifiable, and the existing site keeps working
until the final cutover.

## Risks and mitigations

- **Base-path asset bugs on Pages.** Mitigate by routing every asset URL
  through `import.meta.env.BASE_URL`; test on the actual Pages sub-path
  before cutover.
- **Chart geometry regressions.** Keep the NaN/Infinity guards; visually
  diff each chart-bearing tab against the original.
- **Scope creep into redesign.** Out of scope by decision; any visual change
  is a defect, not an improvement, for this migration.
- **Environment.** The machine currently has no Node or Python. P0 installs
  the Node toolchain via Volta; nothing else in the migration depends on
  Python.

## Open items for the implementation plan

- Confirm the exact GitHub owner/repo slug for `site`/`base`.
- Decide Markdown/MDX vs typed data modules per collection (some catalogs
  are large JSON-like tables better kept as typed `.ts`/JSON than MDX).
- Decide whether to keep a build-time-computed self-test badge in the UI.
