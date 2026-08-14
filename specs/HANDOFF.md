# Handoff - NHA dashboard Astro + TypeScript migration

Updated 2026-08-01. Tab-porting phase COMPLETE. For a fresh conversation to do the final review + cutover.

> **Superseded in part, 2026-08-14 (R261, R266 §S1).** The cutover in step 4 below
> has happened: `.github/workflows/deploy.yml` builds `src/` on every push to
> `main`, Pages is served by GitHub Actions, and `docs/` is retired. Two chapters
> the migration added afterwards - **Long-Term Care** and **Risk** - are missing
> from every count in the original text, so the figures below were corrected from
> twelve to fourteen. `src/lib/tabs.ts` is the authority and a build-time check
> now compares any stated chapter count against it. The rest of this document is
> the migration record and is left as written.

## TL;DR - where things stand

- Branch **`astro-typescript-migration`**, HEAD **`217ebfb`**. Branch is KEPT (never merged, never pushed). Live `docs/` site untouched. Everything is pushed to GitHub once at the very end, after the whole UI is confirmed identical.
- **ALL 14 CHAPTERS ARE REAL ASTRO PAGES.** Overview is `index.astro`; the other 13 are standalone pages: `health, tax, legislation, units, ltc, medications, data, workforce, gov, hardening, risk, rollout, quality`. `src/lib/tabs.ts` lists all fourteen; the `ported` flag it used to carry was the migration checkbox and was deleted once the migration finished (R266).
- Committed suite: **102 Vitest tests (37 files) green, `pnpm check` 0 errors (1 pre-existing hint: dead `growth()` in taxmodel), `pnpm build` 14 pages.**
- Every tab was browser-verified in `dist/` (charts render 0-NaN, all interactions work, View-Transition round-trips are single-instance with state reset, 0 console errors on every tab).

## What was finished in this session (slices 20-22)

- **Slice 20 - Tax** (`5aac23b`, `74251b9`, `8370052`): `src/pages/tax.astro`, `src/lib/tax-charts.ts` (6 renderers), `src/scripts/tax-client.ts`. `barPath`'s `dir` param widened to `string` (behavior-preserving). Health financing path computed once from `runOverviewMc('SCN-BASE', null) × DEFLATOR`.
- **Slice 21 - Physical Care / units** (`f7999e0`, `6b395e5`, `b4292f8`): `src/pages/units.astro`, `src/scripts/units-client.ts` (ports unitsmap.js + hospitalregions.js + unitsapp.js: Albers composite US projection, county dot map, need-based 4-type allocation, 13-region admin map, acronym decoration). **Data decision:** the three data files were copied **byte-identical (md5-verified)** to `public/data/{counties.json, us-states.json, hospital-regions.json}` and are fetched at runtime via `import.meta.env.BASE_URL + 'data/*.json'` (base-path aware) - not reproduced into TS modules. This keeps 340KB out of context + the JS bundle and guarantees GeoJSON fidelity.
- **Slice 22 - Healthcare / health** (`217ebfb`, `f43243b`): the one slice that needed a user decision. Asked via AskUserQuestion; user chose **"Keep Overview, give /health a subset."** So the verified Overview is untouched and `src/pages/health.astro` is a coherent household-facing subset: chapter-intro + "What you'd pay for care" (care-cards, **static** from `CARE_SCENARIOS`/`moneyRange`) + "Beyond dollars" (outcome-tiles, **static** from `OUTCOME_STATS`) + "Your household's annual healthcare bill" (`#household-calc`, rendered by `src/scripts/health-client.ts` using the exact same SCN-BASE household logic as the Overview).

## Remaining work (all gated on the user confirming the whole UI matches, then a single push)

1. **Final UI review with the user.** The user pushes everything to GitHub at once only after confirming the whole UI looks/behaves like `docs/`. Two accepted, deliberate divergences to mention:
- Astro **Overview** = the docs narrative + the docs Healthcare cost model (absorbed in an earlier session); legislation/constitution content moved to the **Legislation** tab. So Astro Overview ≠ docs Overview one-to-one.
- Astro **Healthcare** tab = a household-facing subset (care cards + outcome tiles + household calculator), not the full docs Healthcare view (that model lives on Overview). Chosen by the user this session.
- `global.css` intentionally diverges from `docs/style.css` (nav `button` → `button, a`).
2. **P4 - content collections (Zod catalogs).** Optional refactor; not required for parity. Skip unless the user wants it.
3. ~~**P4 cleanup candidate:** `src/pages/[chapter].astro` (the dynamic stub route).~~ **Done (R266).** It emitted nothing once every chapter had a real page, and its `!t.ported` filter was the reason a chapter with no page could ship as a "being migrated" stub. Deleted; the build still emits 14 pages.
4. ~~**P5 - cutover.**~~ **Done.** `.github/workflows/deploy.yml` runs on push to `main`, Pages is served by GitHub Actions, and `docs/` is retired.

## Sources of truth (read first)

1. **Progress ledger:** `.superpowers/sdd/progress.md` (gitignored) - every slice, task, commit sha, and browser-verify result, slices 12-22. Trust it + `git log` over recollection.
2. **Memory:** `C:\Users\micha\.claude\projects\C--Users-micha-OneDrive-Desktop-Healthcare-Framework-ChatGPT-Work-Outputs-Claude-Outputs\memory\` - `astro-migration.md`, `nha-dashboard-hard-rules.md`, `MEMORY.md`.

## The established per-tab porting pattern (proven across all 11 non-index tabs)

1. **Data → `src/lib/<slug>.ts`** (verbatim; Bash-transform trick for big JS blobs) OR, for units, **static assets in `public/data/`** fetched with the base path.
2. **Renderer → `src/scripts/<slug>-client.ts`**: `document.getElementById` fresh + null-guards; reuse `src/lib/chart-util.ts`; init on `astro:page-load`, **idempotent** via a stable container's `dataset.wired`; reset module state in init for View-Transition safety; acronym walkers skip existing `<abbr>`.
3. **Page → `src/pages/<slug>.astro`**: `BaseLayout` + **verbatim prose** (strip the `<div id="view-<slug>" hidden>` wrapper) + `<script>import '../scripts/<slug>-client.ts';</script>`.
4. **Add the entry to `TABS`** in `src/lib/tabs.ts`. (During the migration this step was "flip `Tab.ported = true`"; the flag is gone.)
5. **Tests** (`tests/pages/<slug>.test.ts` + any `tests/lib/*`), then `grep -c $'\u2014'` new reader files (0), `pnpm test && pnpm check && pnpm build`, commit per-task, **browser-verify**.

## Hard rules / gotchas (do not violate)

- **Fidelity:** every value/formula ported verbatim from `docs/js/*.js`. Never re-derive a number. Re-porting the docs `NHA.SELFTESTS` as Vitest is the fidelity check.
- **No em dash U+2014** anywhere reader-visible in **build-time HTML** (tests assert the rendered HTML does not include U+2014). En dash `–`, minus `−`, `×`, `÷`, `→` allowed. The Overview family-burden `"the the"` typo is a known verbatim exception. The quality client's runtime-only `" - maturity"` suffix was a second exception until 2026-08-12, when it was converted to a hyphen.
- **Strict TS**, no gratuitous `any`; narrow casts only (`as EventListener`, `as unknown as T` for big JSON, `as Poly[]` for GeoJSON coords).
- Client must re-init on `astro:page-load`, idempotent-guarded; multi-page has no persistent `window.NHA` globals, so query DOM fresh + import data from libs (or fetch static assets).
- Build must stay **14 pages**, one per `src/lib/tabs.ts` entry. `routeDrift` fails the build on a page with no entry or an entry with no page.
- Git shows `LF will be replaced by CRLF` warnings on every add - harmless (Windows autocrlf).

## Browser verification

- `pnpm build` then `pnpm preview --port 8518` (serves `dist/` at `http://localhost:8518/US-National-Health-Assurance-System/`) in a background shell, then the in-app browser (`mcp__Claude_Browser__*`, top-level) + `javascript_tool` DOM inspection + `read_console_messages`. Screenshots hang - DOM inspection is the convention. SPA-nav round-trip = click a nav `<a>` (triggers `astro:page-load`) to Overview and back, then assert no duplication + state reset + active nav.
- Live docs parity server (if needed): `mcp__Claude_Browser__preview_start {name:"nha-dashboard"}` serves `docs/` at `http://localhost:8517/` ROOT.

## Commands

```bash
pnpm test        # vitest (37 files / 102 tests green at HEAD)
pnpm check       # astro check + tsc --noEmit (0 errors; 1 pre-existing dead-growth hint)
pnpm build       # static build -> dist/ (14 pages)
pnpm preview --port 8518   # serve dist under the base path
```
