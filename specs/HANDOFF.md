# Handoff — NHA dashboard Astro + TypeScript migration

Written 2026-07-27; updated 2026-07-28 (mid slice 12). For a fresh conversation to resume the migration.

## TL;DR — resume point

- Branch **`astro-typescript-migration`**, HEAD **`8ea8fd8`**, ~86 commits ahead of `main`. Branch is KEPT (never merged, never pushed). Live `docs/` site untouched.
- Full suite green: **76 Vitest tests (19 files)**, `pnpm check` 0 errors, `pnpm build` 12 pages. Working tree clean.
- **P3 Overview COMPLETE** — `src/pages/index.astro` fully reproduces docs `#view-overview` + `#view-health` (20-card page: Acts 1-4, four operating-system diagrams, model section hero→benchmarks, care cards, outcomes, household calc, Methodology, chapter-nav footer).
- **NOW: P3 slice 12 = Legislation tab, IN PROGRESS. Resume at Task 2** of `specs/plans/2026-07-28-astro-migration-p3-legislation-tab.md`.
  - **Task 1 DONE** (commit 8ea8fd8): `src/lib/legislation.ts` = `Domain` type + `DOMAINS` (**13** entries, verbatim from `docs/js/legislation.js:11-305` — NOTE the plan wrongly said 14; the source has 13) + `ACRONYMS` (46 entries). Tested.
  - **Task 2 (next):** create `src/scripts/legislation-client.ts` — the master-detail renderer (`renderList`/`renderDetail` over `#legislation-law-list`/`#legislation-law-detail`) + `addAcronymHovers`, init on `astro:page-load`, idempotent via `#legislation-law-list` `dataset.wired`. The plan has the full code, **but delete the three scaffolding-hint junk lines** (`host.querySelectorAll('button'); // no-op…`, `host.ownerDocument; // parity`, and the `// parity` comment) when writing the real file.
  - **Task 3:** create `src/pages/legislation.astro` = `BaseLayout` + the legislation prose **verbatim from `docs/index.html:429-690`** (strip the `<div id="view-legislation" hidden>` wrapper; keep `#legislation-law-list` and `#legislation-law-detail` markup but empty) + `<script>import '../scripts/legislation-client.ts';</script>`. Then set `ported: true` on the legislation entry in `src/lib/tabs.ts` (drops `/legislation` from the `[chapter].astro` stub route). Extend `tests/pages/legislation.test.ts`.
  - **Task 4:** browser-verify (13 domain buttons, click swaps detail `Domain 01`…, acronyms wrapped in `<abbr class="legislation-acronym">`, stub gone, DOM parity vs live docs at `http://localhost:8517/`, View-Transition re-init).
  - Facts: no `data-dashboard-view` buttons in the legislation prose; `legislation-*` CSS already in `global.css` (152 rules); build must stay **12 pages** (flipping `Tab.ported` moves `/legislation` from the dynamic stub to a real page).
- **DEFERRED decision — the `health` tab.** The Astro Overview already contains all of docs `#view-health` (the model + care + household + methodology), so `health` has no distinct docs source. The user chose to port `legislation` first and revisit `health` later. Open options: (a) leave Overview as-is and give `health` some other/subset content, (b) split the model+care+methodology off Overview onto a real `/health` page (leaving Overview as just the narrative), or (c) drop the `health` tab (11 tabs). Do not port `health` without resolving this with the user.
- **After slice 12:** the remaining tabs (`tax` needs `taxcharts.js`+`taxapp.js`; `units` needs the county map `unitsapp.js`/`unitsmap.js`; `medications` 200 families; `data`, `workforce`, `gov`, `hardening`, `rollout`, `quality` 430-item catalog), each replacing its `[chapter].astro` stub. `selfTestSummary()` (`src/lib/selftests.ts`) is reusable for any shared build-time self-test badge.

## What this project is

Migrating an interactive public-policy dashboard (National Health Assurance model) from hand-written vanilla HTML/JS (`docs/`) to **Astro 5 + TypeScript (strict)**, static output, GitHub Pages. Goal: maintainability + component structure while keeping visuals/behavior identical. The model math is ported **verbatim** (fidelity-critical); only structure changes.

## The three sources of truth (read these first)

1. **Memory:** `C:\Users\micha\.claude\projects\C--Users-micha-OneDrive-Desktop-Healthcare-Framework-ChatGPT-Work-Outputs-Claude-Outputs\memory\astro-migration.md` — full phase-by-phase state, decisions, gotchas. Also `MEMORY.md` index + `nha-dashboard-hard-rules.md`.
2. **Progress ledger:** `.superpowers/sdd/progress.md` (gitignored) — every task, commit sha, and review outcome across all slices. Trust this + `git log` over recollection.
3. **This slice's plan:** `specs/plans/2026-07-27-astro-migration-p3-overview-act1.md` — Tasks 2–4 have complete code/markup to paste. `specs/` holds every phase's design spec + plans (non-published).

## Where things stand (done)

- **P0/P1:** toolchain (Volta pins node 22.23.1 + pnpm 11.17.0), Astro static config (base `/US-National-Health-Assurance-System/`), Vitest, View-Transitions multi-page shell, 12-tab nav as base-aware `<a>` links, un-ported tabs are stubs via `src/pages/[chapter].astro` (guarded by `Tab.ported?`).
- **P2:** healthcare model engine ported to `src/lib/{params,scenarios,model,model-types}.ts` + `format.ts`. 9 self-tests are Vitest.
- **P2b:** tax model → `src/lib/{tax-types,taxparams,taxmodel}.ts`. 7 tax invariants Vitest.
- **P3 (the Overview page, `src/pages/index.astro` + `src/scripts/overview-client.ts`):**
  - Slices 1–8: hero, tiles, controls (scenario picker + 12 sliders), and the entire **model section** — all 6 charts (path, money-flow today+NHA, financing, cost-bridge, benchmarks) + 3 data tables (path/bridge/financing) + 2 notes (family-burden, growth-decomp). Chart modules: `src/lib/{path-chart,flow-diagram,money-flow,financing-chart,financing,bridge-chart,bridge,benchmark-chart,benchmarks,chart-util,overview-tables,growth-decomp}.ts`. Browser-verified each slice (0 NaN, redraws on scenario, View-Transition single-instance).
  - **Slice 9 (current): Task 1 done** — `sponsorTableData()` in `overview-tables.ts`.

## Resume: P3 slice 9, Tasks 2–4

Plan file has the exact code. Summary:

- **Task 2:** Prepend the Act-1 ("The system today") + Act-2 ("What's wrong, by the numbers") cards to the TOP of `<main>` in `src/pages/index.astro` (before the current hero card). Render `#problem-tiles` (from `PROBLEM_STATS`) and `#sponsor-table` (from `sponsorTableData()`) at **build time** (zero client JS); leave `#flow-today-solo` empty. Markup is verbatim from `docs/index.html:47-84`. Extend `tests/pages/overview.test.ts`. Then `pnpm check && pnpm build`; grep for U+2014 (must be 0).
- **Task 3:** In `src/scripts/overview-client.ts` `render()`, draw the solo flow: `const flowSolo = $('flow-today-solo'); if (flowSolo) renderFlowDiagram(flowSolo, todayFlowSpec());` (both already imported).
- **Task 4:** Browser-verify (see workflow below): solo SVG renders no-NaN, sponsor table + tiles present in `dist/index.html` (build-time, zero JS), model section still follows, View-Transition single `<svg>`.

Then record in ledger + memory, and offer the user the finish menu (they have chosen "keep branch as-is" every slice).

## How the work runs (workflow)

- Per slice: `superpowers:writing-plans` (a plan in `specs/plans/`), then execute task-by-task, commit each task, browser-verify at the end.
- **IMPORTANT — subagents are blocked:** the `Agent` tool has been **classifier-blocked** this whole session (both implementer and reviewer dispatches fail with "Blocked by classifier"). So everything is done **inline**: direct file edits, Vitest tests, and a controller-run "inline final review" (grep for scope-leak + em dash, confirm shared-mc wiring). If Agent dispatch works again, the subagent-driven flow (`superpowers:subagent-driven-development`) is preferred, but inline is proven and fine.
- Commit trailer on every commit: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Commands

```bash
pnpm test        # vitest
pnpm check       # astro check + tsc --noEmit (must be 0 errors)
pnpm build       # static build -> dist/ (12 pages)
pnpm preview --port <N>   # serve dist under the base path
```

Browser verify uses the in-app browser (`mcp__Claude_Browser__*`, top-level, not the disconnected `claude-in-chrome`): run `pnpm preview` in background, read its port from the task output, then `mcp__Claude_Browser__preview_start {url}` + `javascript_tool` to inspect DOM / `read_console_messages` for errors. Screenshots are avoided (they hang); DOM inspection is the convention.

## Hard rules / gotchas (do not violate)

- **Fidelity:** every value/formula ported verbatim from `docs/js/*.js`. Never re-derive or "improve" a number. `docs/` is read-only.
- **No em dash U+2014** anywhere reader-visible. En dash `–` (U+2013) and minus `−` (U+2212) are allowed (used in ranges/negatives). Family-burden note keeps a source "the the" typo on purpose (flagged for a future content pass). Tests assert `!html.includes('—')`.
- **Strict TS**, no gratuitous `any`. SVG helpers use narrow casts.
- **The Overview client `render()` is one hub:** it calls `runOverviewMc(scenario, sliders)` ONCE and feeds the single `mc` to every chart/table + text builder. Build-time render in `index.astro` uses `computeOverview('SCN-BASE', null)` which must match the client default (empty sliders → `null`), so hydration does not repaint.
- Client must re-init on `astro:page-load` (View Transitions), guarded idempotent via `#controls dataset.wired`.
- `global.css` intentionally diverges from `docs/style.css` (nav `button`→`button, a`); that is expected.
- Live docs preview for parity checks: `mcp__Claude_Browser__preview_start {name:"nha-dashboard"}` serves `docs/` at `http://localhost:8517/` **ROOT** (not `/docs/`).
- Deferred minors carried forward: dedupe the base-path string (astro.config/vitest.config/tests); align nav hrefs to trailing-slash (avoids a 301 hop on Pages); the family-note "the the" content pass.

## Roadmap after slice 9 (~10–14 slices left)

- Slice 10: Overview Act 3–4 (proposal narrative + static operating-system/care-pathway/financing/rollout-preview diagrams + chapter nav; some may need `govdata`).
- Slice 11: care-cost cards + household calculator (port `care.js` `CARE_SCENARIOS`/`HOUSEHOLD_PROFILES`) + outcomes (`OUTCOME_STATS`) + Methodology card + `#flow-takeaway`. Finishes the Overview.
- Slices 12+: the 11 remaining tabs (health, tax [needs `taxcharts.js`+`taxapp.js`], legislation, units [county map], medications, data, workforce, gov, hardening, rollout, quality) — each replaces its `[chapter].astro` stub (set `Tab.ported = true` in `src/lib/tabs.ts` so the dynamic stub route drops it), DOM-diffed vs live. Reconcile the two self-test shapes (`selfTest()` vs `TAX_SELFTESTS`) when building a shared build-time badge.
- P4: content collections (Zod-validated catalogs). P5: cutover (flip `.github/workflows/deploy.yml` to `on: push`, switch Pages source to GitHub Actions, retire old `docs/`).
