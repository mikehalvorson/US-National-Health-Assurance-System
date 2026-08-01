# NHA Astro Migration — P3 (slice 7): Overview benchmarks card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the benchmark interval chart (`charts.js` `renderBenchmarkChart`) and render the Overview "External benchmarks" card (model-vs-observed chart, federal-shift figures, 2030 check, and the plausibility verdict) client-side from the shared Monte Carlo run.

**Architecture:** Port `renderBenchmarkChart(container, rows, opts)` to `src/lib/benchmark-chart.ts` (reusing `chart-util` + `format`). Add pure builders in `src/lib/benchmarks.ts`: `benchmarkChartRows(mc, DEF)` (the model-vs-observed interval rows) and `benchmarkText(mc, DEF)` (the readout/verdict prose from `app.js:367-428`). The Overview client renders the chart and fills the text spans, feeding the same `mc`.

**Tech Stack:** Astro 5 (client `<script>`), TypeScript strict, Vitest 3.2.7. Consumes `mc`/`MonteCarloResult` from `src/lib/model-types`, `BENCHMARKS` from `src/lib/params`, P3 `src/lib/format` + `src/lib/chart-util` + `src/lib/overview` (`runOverviewMc`).

## Global Constraints

- Platform: Windows. Bash tool or PowerShell. node 22.23.1 / pnpm 11.17.0 on PATH (Volta). Working dir: `C:\Users\micha\OneDrive\Desktop\Healthcare Framework\ChatGPT Work Outputs\Claude Outputs`.
- TypeScript `strict`; avoid gratuitous `any` (narrow SVG casts OK).
- **Fidelity:** `renderBenchmarkChart` geometry from `docs/js/charts.js:390-440` verbatim (W=860, rowH=42, M{l:320,r:60,t:10,b:32}, lo/hi padding, the `x()` scale, `niceTicks`, the zero baseline-axis when `lo<0<hi`, the per-row interval bar + optional mid circle + tooltip). The chart rows + all readout/verdict text from `docs/js/app.js:367-428` verbatim (the two interval rows; `nheDiffPct`/`nheRelation`; the fed figures; the 2030 text; the `nhePlausible`/`cboNheOverlap` verdict logic).
- **NaN guard (project rule):** preserve `Math.max(2, ...)` bar-width floor and `(hi-lo)*0.08 || 1` padding; browser-verify no `NaN` in path `d` (Task 5).
- **Palette:** row colors `var(--series-1)`/`var(--baseline-series)`; class names `chart-svg`, `gridline`, `axis-text`, `baseline-axis`, `row-label`, `row-note`, `bench-row`, `marker` preserved so `global.css` styles them.
- Base path `/US-National-Health-Assurance-System/`; assets via `import.meta.env.BASE_URL`.
- No em dashes (—, U+2014) in reader-visible output. The card prose and readout text use en dashes `–` (U+2013), the minus `−` (U+2212), and `&apos;`; copy verbatim — none are U+2014.
- Client render on `astro:page-load` (chart + text set inside the existing `render()`).
- Do NOT modify anything under `docs/` or the `src/lib/*` engine modules (params/model/scenarios/tax*). You MAY add `src/lib/benchmark-chart.ts`, `src/lib/benchmarks.ts`, and edit `src/scripts/overview-client.ts` + `src/pages/index.astro`.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Scope: `renderBenchmarkChart` + the "External benchmarks" card ONLY. DEFERRED to later slices: all tables, Act-1 solo flow, `#flow-takeaway`, growth-decomp note, the Methodology card, and the other tabs.

## File structure

```
src/
  lib/
    benchmark-chart.ts  BenchmarkRow type + renderBenchmarkChart(container, rows, opts?)
    benchmarks.ts       benchmarkChartRows(mc, DEF), benchmarkText(mc, DEF)  (pure)
  scripts/
    overview-client.ts  render() also draws #benchmark-nhe + sets the readout/verdict spans
  pages/
    index.astro         + the "External benchmarks" card markup (docs/index.html:881-989)
tests/lib/
  benchmarks.test.ts    rows + text shape/values (pure)
```

---

### Task 1: `src/lib/benchmark-chart.ts`

**Files:**
- Create: `src/lib/benchmark-chart.ts`
- Test: none (SVG DOM verified in-browser, Task 5)

**Interfaces:**
- Consumes: `el`, `niceTicks`, `barPath`, `div`, `tipRow`, `showTip`, `hideTip` from `./chart-util`; `money`, `moneyShort`, `axis` from `./format`.
- Produces:
  - `interface BenchmarkRow { label: string; lo: number; hi: number; mid?: number; color: string; note?: string }`
  - `interface BenchmarkOpts { aria?: string }`
  - `function renderBenchmarkChart(container: HTMLElement, rows: BenchmarkRow[], opts?: BenchmarkOpts): void` (from `docs/js/charts.js:390-440`).

- [ ] **Step 1: Implement `src/lib/benchmark-chart.ts`**

Port `NHA.renderBenchmarkChart` verbatim. Keep W/rowH/M, the `lo/hi` min/max + `pad = (hi-lo)*0.08 || 1` + `lo = Math.min(0, lo-pad)` clamp, the `x()` scale, `niceTicks(lo, hi, 5)` gridlines + `axis()` labels, the zero `baseline-axis` line when `lo<0 && hi>0`, and per row: the label + optional `row-note`, a `<g class="bench-row" tabindex="0">` containing the interval `barPath(...,'right')` at `fill-opacity 0.35` and (if `r.mid != null`) a `circle.marker`, plus the `tipIt` pointer handlers (tooltip shows central/range/note rows). Import helpers from `./chart-util`, formatters from `./format`. Type `container: HTMLElement`, `rows: BenchmarkRow[]`, `opts?: BenchmarkOpts`.

- [ ] **Step 2: Type-check + build**

Run: `pnpm check` (0 errors), `pnpm build` (exit 0).

- [ ] **Step 3: Commit**

```bash
git add src/lib/benchmark-chart.ts
git commit -m "Port renderBenchmarkChart to src/lib/benchmark-chart.ts"
```

---

### Task 2: `src/lib/benchmarks.ts` (pure builders)

**Files:**
- Create: `src/lib/benchmarks.ts`
- Test: `tests/lib/benchmarks.test.ts`

**Interfaces:**
- Consumes: `BENCHMARKS` from `./params`; `money`, `moneyShort` from `./format`; `MonteCarloResult` from `./model-types`; `BenchmarkRow` from `./benchmark-chart`.
- Produces:
  - `function benchmarkChartRows(mc: MonteCarloResult, DEF: number): BenchmarkRow[]` — the two rows from `app.js:368-373`: the model row (`lo/mid/hi = mc.steady.matureToday.p10/p50/p90 * DEF`, `color 'var(--series-1)'`, `note 'real 2024$; 10th–90th percentile'`, label "Dashboard model: mature system at 2024 scale") and the observed row (`lo:5250, hi:5350, mid:5300, color 'var(--baseline-series)'`, note "CMS preliminary estimate", label "Observed U.S. health spending, 2024").
  - `interface BenchmarkText { nheResult: string; fedModel: string; fedModelRange: string; fedResult: string; delta2030Result: string; verdict: string }`
  - `function benchmarkText(mc: MonteCarloResult, DEF: number): BenchmarkText` — all six strings from `app.js:376-427` verbatim: `nheResult` (384-389), `fedModel` (`money(mc.steady.fedIncrease.p50 * DEF) + '/yr'`), `fedModelRange` (394-396), `fedResult` (398-404, constant text), `delta2030Result` (406-413 using `mc.nhe2030delta`), and `verdict` (415-427 using `nhePlausible = |nheDiffPct| <= 15`, `cboNheOverlap` against `BENCHMARKS.cboNheChange.low/high`, `mc.nhe2030delta`).

- [ ] **Step 1: Write the failing tests**

`tests/lib/benchmarks.test.ts`:
```ts
import { expect, test } from 'vitest';
import { benchmarkChartRows, benchmarkText } from '../../src/lib/benchmarks';
import { runOverviewMc } from '../../src/lib/overview';
import { DEFLATOR_2023_TO_2024 as DEF } from '../../src/lib/params';

test('benchmarkChartRows: model row + observed row, finite', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const rows = benchmarkChartRows(mc, DEF);
  expect(rows).toHaveLength(2);
  expect(rows[1].mid).toBe(5300);
  for (const r of rows) {
    expect(Number.isFinite(r.lo)).toBe(true);
    expect(Number.isFinite(r.hi)).toBe(true);
    expect(r.lo).toBeLessThanOrEqual(r.hi);
  }
});

test('benchmarkText: all six fields present, verdict non-trivial, em-dash-free', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const t = benchmarkText(mc, DEF);
  for (const v of [t.nheResult, t.fedModel, t.fedModelRange, t.fedResult, t.delta2030Result, t.verdict]) {
    expect(v.length).toBeGreaterThan(0);
    expect(v.includes('—')).toBe(false); // U+2014
  }
  expect(t.fedModel).toMatch(/\/yr$/);
  expect(t.verdict).toContain('plausibility'); // last sentence of the verdict
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/lib/benchmarks.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/benchmarks`.

- [ ] **Step 3: Implement `src/lib/benchmarks.ts`**

Port the two builders verbatim from `app.js:367-427`. Import `BENCHMARKS` from `./params`, `money`/`moneyShort` from `./format`, `MonteCarloResult` from `./model-types`, `BenchmarkRow` from `./benchmark-chart`. Reproduce every prose string exactly (the readout paragraphs and verdict). If `mc.steady.fedIncrease` or `mc.nhe2030delta` is missing, STOP and report BLOCKED (they exist from the P2 port).

- [ ] **Step 4: Run to verify PASS**

Run: `pnpm exec vitest run tests/lib/benchmarks.test.ts`
Expected: PASS (2/2).

- [ ] **Step 5: Type-check + commit**

Run: `pnpm exec tsc --noEmit` (exit 0).
```bash
git add src/lib/benchmarks.ts tests/lib/benchmarks.test.ts
git commit -m "Add pure benchmark chart-row + readout/verdict builders"
```

---

### Task 3: Add the "External benchmarks" card markup to `index.astro`

**Files:**
- Modify: `src/pages/index.astro`
- Test: `tests/pages/overview.test.ts` (extend)

**Interfaces:**
- Consumes: nothing (static markup).
- Produces: the benchmarks card with an empty `#benchmark-nhe` container and the readout/figure spans (`#benchmark-nhe-result`, `#benchmark-fed-model`, `#benchmark-fed-model-range`, `#benchmark-fed-result`, `#benchmark-2030-result`, `#benchmark-verdict`) the client fills.

- [ ] **Step 1: Extend the failing test**

Add to `tests/pages/overview.test.ts`:
```ts
test('overview includes the benchmarks card containers', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('id="benchmark-nhe"');
  expect(html).toContain('id="benchmark-verdict"');
  expect(html).toContain('id="benchmark-fed-model"');
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/pages/overview.test.ts`
Expected: FAIL — benchmark containers absent.

- [ ] **Step 3: Add the card to `src/pages/index.astro`**

Reproduce the benchmarks card from `docs/index.html:881-989` VERBATIM — the `<section class="card benchmark-section">` through its closing `</section>`, including the intro `.benchmark-purpose-grid`, the `.benchmark-distinction`, both `.benchmark-panel` articles (Check 1 with the `.benchmark-key` + `#benchmark-nhe` + `#benchmark-nhe-result`; Check 2 with the `.benchmark-figure-grid` + `#benchmark-fed-model`/`#benchmark-fed-model-range` + `#benchmark-fed-result`), the `.benchmark-supporting` (`#benchmark-2030-result`), the `.benchmark-verdict` (`#benchmark-verdict`), and the `.benchmark-source` footer link. Place it after the bridge card, before `</main>`. Keep the `&apos;` entities and the static strong figures (`$1.5T–$3.0T/yr`, `$3.2T–$3.4T/yr`) exactly. After adding, grep the file for U+2014 and confirm zero.

- [ ] **Step 4: Run to verify PASS + build**

Run: `pnpm exec vitest run tests/pages/overview.test.ts` (PASS), then `pnpm check && pnpm build`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro tests/pages/overview.test.ts
git commit -m "Add the external-benchmarks card markup to the Overview"
```

---

### Task 4: Draw the benchmark chart + fill the text in the client

**Files:**
- Modify: `src/scripts/overview-client.ts`

**Interfaces:**
- Consumes: `renderBenchmarkChart` from `../lib/benchmark-chart`; `benchmarkChartRows`, `benchmarkText` from `../lib/benchmarks`; the `mc` already computed in `render()`; `DEF` already imported.
- Produces: the client draws the benchmark chart and sets the six readout/verdict spans on each render.

- [ ] **Step 1: Update `render()` in `src/scripts/overview-client.ts`**

After the bridge render, add:
```ts
import { renderBenchmarkChart } from '../lib/benchmark-chart';
import { benchmarkChartRows, benchmarkText } from '../lib/benchmarks';
// ...inside render(), after the bridge chart:
const benchHost = document.getElementById('benchmark-nhe');
if (benchHost) {
  renderBenchmarkChart(benchHost, benchmarkChartRows(mc, DEF), {
    aria: 'Total system cost comparison, all at 2024 scale',
  });
}
const bt = benchmarkText(mc, DEF);
const setText = (id: string, txt: string) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
setText('benchmark-nhe-result', bt.nheResult);
setText('benchmark-fed-model', bt.fedModel);
setText('benchmark-fed-model-range', bt.fedModelRange);
setText('benchmark-fed-result', bt.fedResult);
setText('benchmark-2030-result', bt.delta2030Result);
setText('benchmark-verdict', bt.verdict);
```
Leave the rest of the client unchanged.

- [ ] **Step 2: Full suite + check + build**

Run: `pnpm test && pnpm check && pnpm build`
Expected: all green (54+ tests), 0 type errors, 12 pages.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/overview-client.ts
git commit -m "Render the Overview benchmarks chart + readout from the shared Monte Carlo run"
```

---

### Task 5: Browser verification

**Files:** none (verification only).

- [ ] **Step 1: Serve + inspect**

`pnpm preview`; open the Overview. Confirm `#benchmark-nhe` contains an `<svg class="chart-svg">` with 2 `.bench-row` groups (each an interval bar; the model row has a `.marker` circle), gridlines, and axis labels. Grep the SVG `d`/attrs for `NaN` (must be none). Confirm `#benchmark-nhe-result`, `#benchmark-fed-model` (ends "/yr"), `#benchmark-2030-result`, and `#benchmark-verdict` all have text. `read_console_messages` — zero errors.

- [ ] **Step 2: Interactivity**

Change the scenario `<select>` to `SCN-OPT`; confirm the benchmark chart's model-row interval and the readout/verdict text update, no console error. Reset returns to SCN-BASE.

- [ ] **Step 3: Row tooltip**

Dispatch `pointermove` over a `.bench-row`; confirm the shared tooltip shows the row label, central value, and range; hides on `pointerleave`.

- [ ] **Step 4: View Transitions**

Navigate to `/health` and back; confirm the benchmark chart re-renders (single `<svg>`, no duplicate) and the text spans are re-filled, with no console error.

---

## Follow-on slices (out of scope here)

- **P3 slice 8:** the tables (path-table, sponsor-table, financing-table, bridge-table) + growth-decomp note + Act-1 solo flow (`#flow-today-solo`) + `#flow-takeaway` + the Methodology card. This finishes the Overview.
- **P3 slice 9+:** remaining tabs (health, tax + `taxcharts.js`/`taxapp.js`, prose tabs), each replacing its stub, DOM-diffed vs live, with the em-dash/content pass (incl. the family-note "the the" typo).
- **P4/P5:** content collections; cutover.

## Self-review notes

- Spec coverage: implements design spec §2 (client-rendered SVG + text) for the benchmarks card; tables/Methodology deferred. Reuses the shared single-MC-run (no extra model runs).
- No unresolved placeholders: `renderBenchmarkChart`/`benchmarkChartRows`/`benchmarkText` reference exact source line ranges; `benchmarks.ts` has concrete pure tests; the card markup is a verbatim parity port paired with a rendering test + browser verification.
- Type/name consistency: `BenchmarkRow`/`BenchmarkOpts` defined in `benchmark-chart.ts` and consumed by `benchmarks.ts` + the client; `BenchmarkText` defined in `benchmarks.ts` and consumed by the client; `MonteCarloResult`/`BENCHMARKS` are P2 types; the six span ids match `docs/index.html`.
- NaN-guard + palette called out and checked in Task 5. `mc.steady.fedIncrease`/`mc.nhe2030delta` field existence flagged in Task 2.
