# NHA Astro Migration — P3 (slice 3): Overview path chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the chart pattern by porting the hand-rolled SVG chart primitives (`charts.js` `_chartUtil`) and the Overview percentile-band path chart (`renderPathChart`) into typed modules, rendered client-side into `#path-chart` from the same Monte Carlo result the text uses.

**Architecture:** Port the pure/DOM chart helpers to `src/lib/chart-util.ts` (pure `niceTicks`/`barPath` unit-tested; the DOM/SVG builders verified in-browser). Port `renderPathChart` to `src/lib/path-chart.ts`. Refactor `src/lib/overview.ts` so the Monte Carlo run is done once and shared: `runOverviewMc(scenario, sliders)` returns the raw `mc`, and `computeOverviewFromMc(mc)` produces the display strings; `computeOverview` keeps its signature by delegating. The client runs the model once per change and feeds `mc` to both the text render and the chart.

**Tech Stack:** Astro 5 (client `<script>`), TypeScript strict, Vitest 3.2.7. Consumes P2 `src/lib/model` and P3 `src/lib/format` + `src/lib/overview`. Uses the dataviz palette already in `src/styles/global.css` (CSS vars).

## Global Constraints

- Platform: Windows. Bash tool or PowerShell. node 22.23.1 / pnpm 11.17.0 on PATH (Volta). Working dir: `C:\Users\micha\OneDrive\Desktop\Healthcare Framework\ChatGPT Work Outputs\Claude Outputs`.
- TypeScript `strict`; avoid gratuitous `any` (SVG element typing may need `SVGElement`/`as` casts — keep them narrow).
- **Fidelity:** all chart geometry and helpers come verbatim from `docs/js/charts.js` (`el` 16-21, `niceTicks` 52-60, `tooltip`/`showTip`/`hideTip` 62-79, `tipRow` 81-95, `barPath` 97-114, `cssVar` 116-118, `legend` 120+, `renderPathChart` 138-242). Do not change coordinates, tick math, or thresholds.
- **NaN guard (project rule):** a single NaN/Infinity coordinate hangs the SVG renderer. `renderPathChart` must preserve the source's guards; the client must not call it with an empty/degenerate `mc`.
- **Palette:** use the CSS variables the source reads via `cssVar(...)` (`--series-1..8`, `--grid`, `--text-*`, etc., already defined in `global.css`). No hardcoded colors beyond what the source uses.
- Base path `/US-National-Health-Assurance-System/`; assets via `import.meta.env.BASE_URL`.
- No em dashes (—, U+2014) in reader-visible output.
- Client chart render must run on `astro:page-load` (already the Overview client entry) — the chart is drawn inside the existing `render()`.
- Do NOT modify anything under `docs/` or the `src/lib/*` engine modules (params/model/scenarios/tax*). You MAY modify `src/lib/overview.ts` (additive refactor) and add `src/lib/chart-util.ts`, `src/lib/path-chart.ts`.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Scope: chart-util primitives + the Overview path chart ONLY. DEFERRED to later slices: money-flow (Sankey `renderFlowDiagram`), benchmarks, bridge, financing charts, and the other tabs.

## File structure

```
src/
  lib/
    chart-util.ts   el, niceTicks, tooltip/showTip/hideTip, tipRow, barPath, cssVar, legend (from charts.js)
    path-chart.ts   renderPathChart(container, mc, deflate) (from charts.js:138-242)
    overview.ts     +runOverviewMc(scenario, sliders) +computeOverviewFromMc(mc); computeOverview delegates
  scripts/
    overview-client.ts  compute mc once -> text + renderPathChart(#path-chart)
tests/lib/
  chart-util.test.ts    niceTicks + barPath (pure)
```

`#path-chart` already exists in the Overview markup (`docs/index.html:845`, reproduced in `index.astro`). Confirm it is present in `index.astro`; if slice-1/2 did not include it, add the empty `<div id="path-chart"></div>` in its live position (inside the path/percentile card) as part of Task 4.

---

### Task 1: `src/lib/chart-util.ts` (+ pure tests)

**Files:**
- Create: `src/lib/chart-util.ts`
- Test: `tests/lib/chart-util.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `function el(tag: string, attrs?: Record<string, string | number>, parent?: Element): SVGElement` — creates an SVG-namespaced element, sets attrs, appends to parent. (from charts.js:16-21)
  - `function niceTicks(min: number, max: number, count: number): number[]` (from charts.js:52-60, verbatim)
  - `function barPath(x: number, y: number, w: number, h: number, r: number, dir: 'up' | 'right'): string` (from charts.js:97-114, verbatim)
  - `function tooltip(): HTMLElement`, `function showTip(html: Node, x: number, y: number): void`, `function hideTip(): void` (charts.js:62-78)
  - `function tipRow(parent: HTMLElement, color: string, label: string, value: string, strong?: boolean): HTMLElement` (charts.js:81-95)
  - `function cssVar(name: string): string` (charts.js:116-118)
  - `function legend(container: HTMLElement, items: { color: string; label: string }[]): HTMLElement` (charts.js:120+, read the source for exact shape)
  - a `div(cls: string, parent?: Element): HTMLElement` helper (charts.js:22-28) if the source defines one — port it too (used by tooltip/tipRow/legend).

- [ ] **Step 1: Write the failing pure tests**

`tests/lib/chart-util.test.ts`:
```ts
import { expect, test } from 'vitest';
import { niceTicks, barPath } from '../../src/lib/chart-util';

test('niceTicks(0,100,5) yields evenly spaced nice values', () => {
  expect(niceTicks(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100]);
});

test('niceTicks handles a zero span without dividing by zero', () => {
  expect(niceTicks(5, 5, 5)).toEqual([5]);
});

test('barPath square base (r<=0.5) is a plain rectangle path', () => {
  expect(barPath(0, 0, 10, 10, 0, 'up')).toBe('M0,0 h10 v10 h-10Z');
});

test('barPath up with radius produces rounded top corners', () => {
  const d = barPath(0, 0, 10, 20, 3, 'up');
  expect(d.startsWith('M0,20')).toBe(true);
  expect(d).toContain('Q'); // has curve segments
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/lib/chart-util.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/chart-util`.

- [ ] **Step 3: Implement `src/lib/chart-util.ts`**

Port the helpers from `docs/js/charts.js` verbatim (see line refs in Interfaces). `el` uses `document.createElementNS('http://www.w3.org/2000/svg', tag)`. `niceTicks` and `barPath` are pure — port them exactly (they must satisfy the tests, which encode the source's own output). The DOM helpers (`tooltip`, `showTip`, `tipRow`, `legend`, `div`) reference `document`; that is fine (they run client-side only) — do not add SSR guards, the module is imported only from the client script and pure functions.

- [ ] **Step 4: Run to verify PASS**

Run: `pnpm exec vitest run tests/lib/chart-util.test.ts`
Expected: PASS (4/4). (Vitest env is `node`; `niceTicks`/`barPath` do not touch the DOM, so they run fine. The DOM helpers are not exercised by these tests — they are verified in-browser in Task 5.)

- [ ] **Step 5: Type-check + commit**

Run: `pnpm exec tsc --noEmit` (exit 0).
```bash
git add src/lib/chart-util.ts tests/lib/chart-util.test.ts
git commit -m "Port charts.js primitives to src/lib/chart-util.ts"
```

---

### Task 2: `src/lib/path-chart.ts`

**Files:**
- Create: `src/lib/path-chart.ts`
- Test: none (SVG DOM output verified in-browser, Task 5)

**Interfaces:**
- Consumes: `el`, `niceTicks`, `tooltip`/`showTip`/`hideTip`, `tipRow`, `cssVar`, `legend` from `./chart-util`; `money`/`moneyShort`/`axis` from `./format`; the `mc` shape from `./model` (`MonteCarloResult` — has `baseline: number[]`, `yearBands: {p10,p50,p90}[]`, `years: number[]`).
- Produces: `function renderPathChart(container: HTMLElement, mc: MonteCarloResult, deflate: number): void` — clears `container` and draws the status-quo vs NHA percentile-band SVG (from `docs/js/charts.js:138-242`).

- [ ] **Step 1: Implement `src/lib/path-chart.ts`**

Port `NHA.renderPathChart` (charts.js:138-242) verbatim into `renderPathChart(container, mc, deflate)`. Import the helpers from `./chart-util` and formatters from `./format`. Preserve every coordinate function (`x`, `y`), the `niceTicks(yMin, yMax, 5)` gridlines, the band path (`bandD`), the two lines (`lineD(base)`, `lineD(p50)`), the hover hit-area + `showTip`/`hideTip` wiring, and the NaN guards. Type `container` as `HTMLElement` and the mc fields via the imported `MonteCarloResult` type. Keep the exact `cssVar` names and class names the source uses so `global.css` styles it.

- [ ] **Step 2: Type-check + build**

Run: `pnpm check` (0 errors), `pnpm build` (exit 0).

- [ ] **Step 3: Commit**

```bash
git add src/lib/path-chart.ts
git commit -m "Port renderPathChart to src/lib/path-chart.ts"
```

---

### Task 3: Refactor `src/lib/overview.ts` for a shared Monte Carlo run

**Files:**
- Modify: `src/lib/overview.ts`
- Test: `tests/lib/overview.test.ts` (extend)

**Interfaces:**
- Consumes: `runMonteCarlo` from `./model` (already imported).
- Produces (additive; existing `computeOverview` unchanged in signature and output):
  - `function runOverviewMc(scenario: string, sliders: Record<string, number> | null): MonteCarloResult` — returns `runMonteCarlo(scenario, sliders, 600, 42)`.
  - `function computeOverviewFromMc(mc: MonteCarloResult): OverviewView` — the current body of `computeOverview` (all display-string math) but taking a precomputed `mc` instead of running it.
  - `computeOverview(scenario, sliders)` now = `computeOverviewFromMc(runOverviewMc(scenario, sliders))`.

- [ ] **Step 1: Write the failing test (delegation invariant)**

Add to `tests/lib/overview.test.ts`:
```ts
import { runOverviewMc, computeOverviewFromMc } from '../../src/lib/overview';

test('computeOverview equals computeOverviewFromMc(runOverviewMc(...)) for SCN-BASE', () => {
  const viaHelpers = computeOverviewFromMc(runOverviewMc('SCN-BASE', null));
  const direct = computeOverview('SCN-BASE', null);
  expect(viaHelpers).toEqual(direct);
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/lib/overview.test.ts`
Expected: FAIL — `runOverviewMc`/`computeOverviewFromMc` not exported.

- [ ] **Step 3: Refactor `src/lib/overview.ts`**

Extract the MC run into `runOverviewMc` and the display math into `computeOverviewFromMc(mc)`. Re-point `computeOverview` to compose them. Do not change any expression, constant (600/42), or output — the existing SCN-BASE tests and the new delegation test must all pass. Export the two new functions.

- [ ] **Step 4: Run to verify PASS**

Run: `pnpm exec vitest run tests/lib/overview.test.ts`
Expected: PASS (all prior overview tests + the new delegation test).

- [ ] **Step 5: Type-check + commit**

Run: `pnpm exec tsc --noEmit` (exit 0).
```bash
git add src/lib/overview.ts tests/lib/overview.test.ts
git commit -m "Refactor overview.ts: share one Monte Carlo run via runOverviewMc/computeOverviewFromMc"
```

---

### Task 4: Wire the path chart into the Overview client

**Files:**
- Modify: `src/scripts/overview-client.ts`
- Modify: `src/pages/index.astro` (only if `#path-chart` is absent — add the empty div in its live position)

**Interfaces:**
- Consumes: `runOverviewMc`, `computeOverviewFromMc` from `../lib/overview`; `renderPathChart` from `../lib/path-chart`; `DEFLATOR_2023_TO_2024` from `../lib/params`.
- Produces: the client `render()` now runs the model once and updates both the text and the chart.

- [ ] **Step 1: Confirm `#path-chart` exists in `index.astro`**

Read `src/pages/index.astro`. If there is no `<div id="path-chart">`, add it in the same card/position the live site uses (`docs/index.html:845`, inside the percentile/path card). Do not add chart-building markup — just the empty container the client fills.

- [ ] **Step 2: Update `render()` in `src/scripts/overview-client.ts`**

Change `render()` to run the model once and feed both consumers:
```ts
import { runOverviewMc, computeOverviewFromMc } from '../lib/overview';
import { renderPathChart } from '../lib/path-chart';
import { DEFLATOR_2023_TO_2024 as DEF } from '../lib/params';
// ...
function render(): void {
  const sliders = Object.keys(state.sliders).length ? state.sliders : null;
  const mc = runOverviewMc(state.scenario, sliders);
  const v = computeOverviewFromMc(mc);
  // ...existing set(...) text updates and #tiles rebuild, using v...
  const chartHost = document.getElementById('path-chart');
  if (chartHost) renderPathChart(chartHost, mc, DEF);
}
```
Replace the previous `computeOverview(...)` call inside `render()` with the two-step (mc → view) form so the chart shares the run. Leave the rest of the client (buildControls, events, `astro:page-load`, idempotent guard) unchanged.

- [ ] **Step 3: Type-check + build + full suite**

Run: `pnpm test && pnpm check && pnpm build`
Expected: all green (36+ tests), 0 type errors, 12 pages.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/overview-client.ts src/pages/index.astro
git commit -m "Render the Overview path chart client-side from the shared Monte Carlo run"
```

---

### Task 5: Browser verification

**Files:** none (verification only).

- [ ] **Step 1: Serve + inspect the chart**

`pnpm preview`; open the Overview in the browser pane. Confirm `#path-chart` contains an `<svg>` with: gridline ticks, a filled band `path`, two line `path`s (status quo + NHA median), and a hover hit-area. Read `read_console_messages` — zero errors (a NaN coordinate would throw or produce `NaN` in path `d`; grep the SVG `d` attributes for `NaN`).

- [ ] **Step 2: Interactivity**

Change the scenario `<select>` to `SCN-OPT`; confirm the chart redraws (band/line geometry changes) with no console error. Move a slider; after the 160ms debounce, confirm the chart updates. Click `#reset-btn`; confirm it returns to the SCN-BASE shape.

- [ ] **Step 3: Hover tooltip**

Dispatch a `pointermove` over the chart hit-area (or use `computer` hover); confirm the shared tooltip (`.nha-tooltip`) appears with per-year values and hides on `pointerleave`.

- [ ] **Step 4: View Transitions**

Navigate to `/health` and back; confirm the chart re-renders (the `astro:page-load` `render()` ran) with no duplicate SVG and no console error.

---

## Follow-on slices (out of scope here)

- **P3 slice 4:** money-flow Sankey (`renderFlowDiagram`), benchmarks, bridge, financing charts on the Overview (they reuse `chart-util`).
- **P3 slice 5+:** remaining tabs (health, tax + `taxcharts.js`/`taxapp.js`, prose tabs), each replacing its stub, DOM-diffed vs live, with the em-dash/content pass (incl. the family-note "the the" typo).
- **P4/P5:** content collections; cutover.

## Self-review notes

- Spec coverage: implements design spec §2 (charts as client-rendered SVG) for the Overview path chart; remaining Overview charts + tabs deferred. The single-MC-run refactor avoids double-computing the model per interaction.
- No unresolved placeholders: pure helpers (`niceTicks`/`barPath`) have exact tests encoding the source output; the DOM/SVG ports reference exact source line ranges and are browser-verified (Task 5); the client change shows the full `render()` shape.
- Type/name consistency: `MonteCarloResult` is the P2 model type consumed by `path-chart.ts` and `overview.ts`; `runOverviewMc`/`computeOverviewFromMc`/`renderPathChart` are defined in Tasks 2-3 and consumed by Task 4; `#path-chart`, `.nha-tooltip`, and the `cssVar` names match `docs/index.html` + `global.css`.
- NaN-guard rule and the dataviz palette (CSS vars) are called out as constraints and checked in Task 5.
