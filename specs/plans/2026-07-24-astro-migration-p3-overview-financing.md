# NHA Astro Migration - P3 (slice 5): Overview financing chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the financing waterfall chart (`charts.js` `renderFinancingChart`) and render the Overview "Who pays" card (financing segments + wealth-tax coverage + note) client-side from the shared Monte Carlo run.

**Architecture:** Port `renderFinancingChart(container, fin, deflate)` to `src/lib/financing-chart.ts` (reusing `chart-util` + `format`). Add pure builders in `src/lib/financing.ts`: `financingSpec(mc, DEF)` (the fed/state/emp/feedback/new-revenue waterfall from `app.js:313-333`) and `financingNote(mc, DEF)`. The Overview client renders it inside the "Who pays" card, feeding the same `mc` it already computes.

**Tech Stack:** Astro 5 (client `<script>`), TypeScript strict, Vitest 3.2.7. Consumes the `mc`/`MonteCarloResult` from `src/lib/model-types`, P3 `src/lib/format` + `src/lib/chart-util` + `src/lib/overview` (`runOverviewMc`).

## Global Constraints

- Platform: Windows. Bash tool or PowerShell. node 22.23.1 / pnpm 11.17.0 on PATH (Volta). Working dir: `C:\Users\micha\OneDrive\Desktop\Healthcare Framework\ChatGPT Work Outputs\Claude Outputs`.
- TypeScript `strict`; avoid gratuitous `any` (narrow SVG casts OK).
- **Fidelity:** `renderFinancingChart` geometry from `docs/js/charts.js:329-385` verbatim (W=860, H=190, M{l:8,r:8,t:24,b:8}, barY/barH, the segment bars, the wealth-vs-gap comparison rows, `legend`). The financing derivation from `docs/js/app.js:313-342` verbatim (the `Math.min` waterfall: fedUse/stateUse/empUse/fbUse/newRev, and the note string).
- **NaN guard (project rule):** preserve `Math.max(0, ...)`/`Math.max(2, ...)` width floors and the `|| 1` divisor guards; browser-verify no `NaN` in path `d` (Task 5).
- **Palette:** segment colors come from the spec (`var(--series-*)`); class names `chart-svg`, `bar-mark`, `inbar-label`, `row-label`, `value-label`, `chart-legend` preserved so `global.css` styles them.
- Base path `/US-National-Health-Assurance-System/`; assets via `import.meta.env.BASE_URL`.
- No em dashes ( - , U+2014) in reader-visible output. The card prose (`docs/index.html` "Who pays" card) and the note string use `;`/`,`; copy verbatim.
- Client render must run on `astro:page-load` (chart drawn inside the existing `render()`).
- Do NOT modify anything under `docs/` or the `src/lib/*` engine modules (params/model/scenarios/tax*). You MAY add `src/lib/financing-chart.ts`, `src/lib/financing.ts`, and edit `src/scripts/overview-client.ts` + `src/pages/index.astro`.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Scope: `renderFinancingChart` + the "Who pays" card (chart + note) ONLY. DEFERRED to later slices: the financing TABLE, the benchmarks card, the bridge chart, the sponsor/path tables, the Act-1 solo flow, and the other tabs.

## File structure

```
src/
  lib/
    financing-chart.ts  FinancingSpec type + renderFinancingChart(container, fin, deflate)
    financing.ts        financingSpec(mc, DEF), financingNote(mc, DEF)  (pure)
  scripts/
    overview-client.ts  render() also draws #financing-chart + sets #financing-note
  pages/
    index.astro         + the "Who pays" card markup
tests/lib/
  financing.test.ts     spec-builder shape/values (pure)
```

---

### Task 1: `src/lib/financing-chart.ts`

**Files:**
- Create: `src/lib/financing-chart.ts`
- Test: none (SVG DOM verified in-browser, Task 5)

**Interfaces:**
- Consumes: `el`, `barPath`, `tipRow`, `showTip`, `hideTip`, `legend` from `./chart-util`; `money`, `moneyShort`, `pct` from `./format`.
- Produces:
- `interface FinancingSegment { label: string; value: number; color: string }`
- `interface FinancingSpec { segments: FinancingSegment[]; gap: { label: string; value: number }; wealth: { label: string; value: number } }`
- `function renderFinancingChart(container: HTMLElement, fin: FinancingSpec, deflate: number): void` (from `docs/js/charts.js:329-385`).

- [ ] **Step 1: Implement `src/lib/financing-chart.ts`**

Port `NHA.renderFinancingChart` verbatim. Keep W/H/M, the header text, the stacked segment bars (last uses `barPath(...,'right')`, others a plain rect path with `Math.max(0, w-2)`), the inline-label fit test (`w > labelText.length*7 + 16`), the per-segment `tipIt`/pointer handlers, the wealth-vs-gap comparison rows (`maxV = Math.max(gap, wealth)*1.15 || 1`, `barPath(...,'right')`), and the `legend(container, segments.map(...))`. Import helpers from `./chart-util`, formatters from `./format`. Replace `NHA.fmt.*` with the imports. Type `container: HTMLElement`, `fin: FinancingSpec`.

- [ ] **Step 2: Type-check + build**

Run: `pnpm check` (0 errors), `pnpm build` (exit 0).

- [ ] **Step 3: Commit**

```bash
git add src/lib/financing-chart.ts
git commit -m "Port renderFinancingChart to src/lib/financing-chart.ts"
```

---

### Task 2: `src/lib/financing.ts` (pure builders)

**Files:**
- Create: `src/lib/financing.ts`
- Test: `tests/lib/financing.test.ts`

**Interfaces:**
- Consumes: `MonteCarloResult` from `./model-types`; `FinancingSpec` from `./financing-chart`; `money`, `moneyShort`, `pct` (only if the note needs them - the note uses plain rounding, so likely none) from `./format`.
- Produces:
- `function financingSpec(mc: MonteCarloResult, DEF: number): FinancingSpec` - from `docs/js/app.js:313-333` verbatim: `t = mc.years.length - 2`, `d = mc.modePath.detail[t]`, `need = d.pubCost`, `fedUse = Math.min(d.fedRedirect, need)`, `stateUse = Math.min(d.stateMoe, Math.max(0, need - fedUse))`, `empUse = Math.min(d.empContrib, Math.max(0, need - fedUse - stateUse))`, `fbUse = Math.min(d.taxFeedback || 0, Math.max(0, need - fedUse - stateUse - empUse))`, `newRev = Math.max(0, need - fedUse - stateUse - empUse - fbUse)`; the 5 segments (labels/colors exactly as source), `gap = { label: 'New revenue needed', value: newRev }`, `wealth = { label: 'Wealth-tax package (after collection losses)', value: d.wealthRevenue }`.
- `function financingNote(mc: MonteCarloResult, DEF: number): string` - from `docs/js/app.js:335-342` verbatim (`covered = d.wealthRevenue / (newRev || 1)`, the "covers X% of the new-revenue requirement" text, the `newRev <= 0` branch, the 5%-cap sentence). Note: DEF is not actually used in the note math (percentages), but keep the signature for symmetry.

- [ ] **Step 1: Write the failing tests**

`tests/lib/financing.test.ts`:
```ts
import { expect, test } from 'vitest';
import { financingSpec, financingNote } from '../../src/lib/financing';
import { runOverviewMc } from '../../src/lib/overview';
import { DEFLATOR_2023_TO_2024 as DEF } from '../../src/lib/params';

test('financingSpec has 5 segments summing to the public cost, all finite', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const fin = financingSpec(mc, DEF);
  expect(fin.segments.map((s) => s.label)).toEqual([
    'Redirected federal spending',
    'State maintenance-of-effort',
    'Employer contribution',
    'Tax on wage pass-through',
    'New revenue needed',
  ]);
  for (const s of fin.segments) expect(Number.isFinite(s.value)).toBe(true);
  expect(Number.isFinite(fin.gap.value)).toBe(true);
  expect(Number.isFinite(fin.wealth.value)).toBe(true);
  // segments reconstruct the public cost (waterfall covers need exactly)
  const t = mc.years.length - 2;
  const need = mc.modePath.detail[t].pubCost;
  const sum = fin.segments.reduce((a, s) => a + s.value, 0);
  expect(Math.abs(sum - need)).toBeLessThan(1e-6);
});

test('financingNote mentions the 5% household cap and is em-dash-free', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const note = financingNote(mc, DEF);
  expect(note).toContain('5% of new financing');
  expect(note.includes(' - ')).toBe(false); // U+2014
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/lib/financing.test.ts`
Expected: FAIL - cannot resolve `../../src/lib/financing`.

- [ ] **Step 3: Implement `src/lib/financing.ts`**

Port the two builders verbatim from `app.js:313-342`. Import `MonteCarloResult` from `./model-types`, `FinancingSpec` from `./financing-chart`. If `d.taxFeedback` or `d.wealthRevenue` is missing from `DetailRow`, STOP and report BLOCKED (they should exist from the P2 port; note the exact missing field).

- [ ] **Step 4: Run to verify PASS**

Run: `pnpm exec vitest run tests/lib/financing.test.ts`
Expected: PASS (2/2).

- [ ] **Step 5: Type-check + commit**

Run: `pnpm exec tsc --noEmit` (exit 0).
```bash
git add src/lib/financing.ts tests/lib/financing.test.ts
git commit -m "Add pure financing waterfall spec + note builders"
```

---

### Task 3: Add the "Who pays" card markup to `index.astro`

**Files:**
- Modify: `src/pages/index.astro`
- Test: `tests/pages/overview.test.ts` (extend)

**Interfaces:**
- Consumes: nothing (static markup).
- Produces: the "Who pays" card with an empty `#financing-chart` container and `#financing-note` element (the client fills them).

- [ ] **Step 1: Extend the failing test**

Add to `tests/pages/overview.test.ts`:
```ts
test('overview includes the financing card containers', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('id="financing-chart"');
  expect(html).toContain('id="financing-note"');
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/pages/overview.test.ts`
Expected: FAIL - financing containers absent.

- [ ] **Step 3: Add the card to `src/pages/index.astro`**

Reproduce the "Who pays" financing card from `docs/index.html` VERBATIM (the `<section class="card">` with `<h2>Who pays</h2>`, the `.desc` paragraph, `<div id="financing-chart"></div>`, `<p class="note" id="financing-note"></p>`). Place it after the money-flow card, before `</main>`. DEFER the `<details class="tableview">` table block (`#financing-table`) - omit it this slice. Ensure no em dash (U+2014).

- [ ] **Step 4: Run to verify PASS + build**

Run: `pnpm exec vitest run tests/pages/overview.test.ts` (PASS), then `pnpm check && pnpm build`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro tests/pages/overview.test.ts
git commit -m "Add the Who-pays financing card markup to the Overview"
```

---

### Task 4: Draw the financing chart in the Overview client

**Files:**
- Modify: `src/scripts/overview-client.ts`

**Interfaces:**
- Consumes: `renderFinancingChart` from `../lib/financing-chart`; `financingSpec`, `financingNote` from `../lib/financing`; the `mc` already computed in `render()`; `DEF` already imported.
- Produces: the client draws the financing chart and sets the note on each render.

- [ ] **Step 1: Update `render()` in `src/scripts/overview-client.ts`**

After the money-flow renders, add:
```ts
import { renderFinancingChart } from '../lib/financing-chart';
import { financingSpec, financingNote } from '../lib/financing';
// ...inside render(), after the flow diagrams:
const finChart = document.getElementById('financing-chart');
if (finChart) renderFinancingChart(finChart, financingSpec(mc, DEF), DEF);
const finNote = document.getElementById('financing-note');
if (finNote) finNote.textContent = financingNote(mc, DEF);
```
Leave the rest of the client unchanged.

- [ ] **Step 2: Full suite + check + build**

Run: `pnpm test && pnpm check && pnpm build`
Expected: all green (47+ tests), 0 type errors, 12 pages.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/overview-client.ts
git commit -m "Render the Overview financing chart from the shared Monte Carlo run"
```

---

### Task 5: Browser verification

**Files:** none (verification only).

- [ ] **Step 1: Serve + inspect**

`pnpm preview`; open the Overview. Confirm `#financing-chart` contains an `<svg class="chart-svg">` with 5 `.bar-mark` segment paths, the wealth-vs-gap comparison bars, and a `.chart-legend`. Grep the SVG `d`/attrs for `NaN` (must be none). Confirm `#financing-note` has prose containing "5% of new financing". `read_console_messages` - zero errors.

- [ ] **Step 2: Interactivity**

Change the scenario `<select>` to `SCN-OPT`; confirm the financing bars/legend redraw and the note updates, no console error. Reset returns to SCN-BASE.

- [ ] **Step 3: Segment tooltip**

Dispatch `pointermove` over a `.bar-mark`; confirm the shared tooltip shows the segment label, its `/yr` money value, and its "share of public cost" percent; hides on `pointerleave`.

- [ ] **Step 4: View Transitions**

Navigate to `/health` and back; confirm the financing chart re-renders (single `<svg>`, no duplicate) with no console error.

---

## Follow-on slices (out of scope here)

- **P3 slice 6:** the benchmarks card (`renderBenchmarkChart` + the model-vs-CBO/Urban prose + verdict) and the bridge waterfall (`renderBridgeChart` + `bridgeSteps`, which needs `mc.modeParams`, `buildRamps`, `scenarioStructural`, and the bridge-identity self-test).
- **P3 slice 7:** the tables (path-table, sponsor-table, financing-table, bridge-table) + growth-decomp note + Act-1 solo flow (`#flow-today-solo`) + `#flow-takeaway`.
- **P3 slice 8+:** remaining tabs (health, tax + `taxcharts.js`/`taxapp.js`, prose tabs), each replacing its stub, DOM-diffed vs live, with the em-dash/content pass (incl. the family-note "the the" typo).
- **P4/P5:** content collections; cutover.

## Self-review notes

- Spec coverage: implements design spec §2 (client-rendered SVG) for the financing card; benchmarks/bridge/tables deferred. Reuses the shared single-MC-run from slice 3 (no extra model runs).
- No unresolved placeholders: `renderFinancingChart` + `financingSpec`/`financingNote` reference exact source line ranges; `financing.ts` has concrete pure tests; the card markup is a verbatim parity port paired with a rendering test + browser verification.
- Type/name consistency: `FinancingSpec`/`FinancingSegment` defined in `financing-chart.ts` and consumed by `financing.ts` + the client; `MonteCarloResult` is the P2 model type; `financingSpec`/`financingNote`/`renderFinancingChart` defined in Tasks 1-2 and consumed by Task 4; ids `#financing-chart`/`#financing-note` match `docs/index.html`.
- NaN-guard + palette (CSS vars) called out and checked in Task 5. `d.taxFeedback`/`d.wealthRevenue` field existence flagged in Task 2.
