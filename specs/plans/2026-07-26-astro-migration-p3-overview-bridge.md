# NHA Astro Migration — P3 (slice 6): Overview bridge waterfall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the cost-bridge waterfall chart (`charts.js` `renderBridgeChart`) and its step builder (`app.js` `bridgeSteps`), and render the Overview "Why the total lands where it does" card client-side from the shared Monte Carlo run, with the bridge-identity invariant enforced by a Vitest test.

**Architecture:** Export the existing internal `buildRamps` (+ its return type) from `src/lib/model.ts`. Port `renderBridgeChart` to `src/lib/bridge-chart.ts` (reusing `chart-util` + `format`). Add a pure `bridgeSteps(mc)` in `src/lib/bridge.ts` returning the waterfall steps plus the identity error. The Overview client draws it inside the bridge card, feeding the same `mc`.

**Tech Stack:** Astro 5 (client `<script>`), TypeScript strict, Vitest 3.2.7. Consumes `mc`/`MonteCarloResult`/`SampledParams`/`DetailRow` from `src/lib/model-types`, `buildRamps` from `src/lib/model`, `scenarioStructural` from `src/lib/scenarios`, `BASE2023` from `src/lib/params`, P3 `src/lib/format` + `src/lib/chart-util`.

## Global Constraints

- Platform: Windows. Bash tool or PowerShell. node 22.23.1 / pnpm 11.17.0 on PATH (Volta). Working dir: `C:\Users\micha\OneDrive\Desktop\Healthcare Framework\ChatGPT Work Outputs\Claude Outputs`.
- TypeScript `strict`; avoid gratuitous `any` (narrow SVG casts OK).
- **Fidelity:** `renderBridgeChart` geometry from `docs/js/charts.js:244-324` verbatim (W=860, rowH=30, gap=8, M{l:300,r:96,t:8,b:30}, running-total layout, connector lines, value labels, legend). `bridgeSteps` from `docs/js/app.js:235-287` verbatim (the `hosp0/clin0/drug0/oth0/phcBase`, ramp reads `covR/csR/drugR/hospR`, `u`/`pay`, `utilAdd/paySave/drugSave/expansions/adminNet/oneTime`, the 11-13 step array in exact order, and the identity check).
- **NaN guard (project rule):** preserve `Math.max(2, ...)` bar-width floor and `xMax*1.05`; browser-verify no `NaN` in path `d` (Task 6).
- **Palette:** bar colors `var(--total-bar)`/`var(--diverge-add)`/`var(--diverge-sub)`; class names `chart-svg`, `gridline`, `axis-text`, `row-label`, `bar-mark`, `connector`, `value-label`, `chart-legend` preserved so `global.css` styles them.
- **Bridge identity:** the original recorded `NHA._bridgeIdentityError = |baseline + adds - subs - nheNha|` and a self-test asserted it small. There is no self-test footer now, so `bridgeSteps` returns the error and a Vitest test asserts it is `< 0.5` ($B).
- Base path `/US-National-Health-Assurance-System/`; assets via `import.meta.env.BASE_URL`.
- No em dashes (—, U+2014) in reader-visible output. Step labels + card prose use `,`/`(`/`…`; copy verbatim (the ellipsis `…` U+2026 in "EMS, units…" is allowed; it is not an em dash).
- Client render on `astro:page-load` (chart drawn inside the existing `render()`).
- Do NOT modify anything under `docs/` or the model math. You MAY: add `export` to `buildRamps` (and its return-type interface) in `src/lib/model.ts` (no logic change); add `src/lib/bridge-chart.ts`, `src/lib/bridge.ts`; edit `src/scripts/overview-client.ts` + `src/pages/index.astro`. Do NOT touch other `src/lib/*` engine modules.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Scope: bridge chart + card ONLY. DEFERRED to later slices: the bridge TABLE, benchmarks, all other tables, Act-1 solo flow, `#flow-takeaway`, growth-decomp note, and the other tabs.

## File structure

```
src/
  lib/
    model.ts        + export on buildRamps (and its return-type interface); no logic change
    bridge-chart.ts BridgeStep type + renderBridgeChart(container, steps, deflate)
    bridge.ts       bridgeSteps(mc) -> { steps: BridgeStep[]; identityError: number }  (pure)
  scripts/
    overview-client.ts  render() also draws #bridge-chart
  pages/
    index.astro         + the "Why the total lands where it does" card markup
tests/lib/
  bridge.test.ts    step order + identity invariant (pure)
```

---

### Task 1: Export `buildRamps` from `src/lib/model.ts`

**Files:**
- Modify: `src/lib/model.ts` (add `export` to `buildRamps` and to the interface naming its return type)

**Interfaces:**
- Consumes: nothing new.
- Produces: `buildRamps(structural: ScenarioStructural): BuiltRamps` exported; `BuiltRamps` interface exported (the shape with `coverage`, `costShareElim`, `drugs`, `hospitals`, `units` number arrays). If the return-type interface currently lives in `model-types.ts`, export it there instead; if it is inline/local in `model.ts`, give it a named exported interface `BuiltRamps` matching what `buildRamps` returns.

- [ ] **Step 1: Add the exports**

In `src/lib/model.ts`, change `function buildRamps(` to `export function buildRamps(`. Ensure its return type is a named, exported interface (`BuiltRamps`); if it is currently unnamed/local, name and export it (in `model.ts` or `model-types.ts`, wherever the other engine types live) so the exported function's return type is nameable (avoids TS "return type cannot be named"). Change no logic, no constant.

- [ ] **Step 2: Type-check + full suite (no behavior change)**

Run: `pnpm exec tsc --noEmit` (0 errors), then `pnpm test` (all prior tests still pass — this is a visibility-only change).

- [ ] **Step 3: Commit**

```bash
git add src/lib/model.ts src/lib/model-types.ts
git commit -m "Export buildRamps (+ BuiltRamps type) for the bridge builder"
```
(Only add `model-types.ts` if you exported the interface there.)

---

### Task 2: `src/lib/bridge-chart.ts`

**Files:**
- Create: `src/lib/bridge-chart.ts`
- Test: none (SVG DOM verified in-browser, Task 6)

**Interfaces:**
- Consumes: `el`, `niceTicks`, `barPath`, `div`, `tipRow`, `showTip`, `hideTip`, `cssVar`, `legend` from `./chart-util`; `money`, `moneyShort`, `axis` from `./format`.
- Produces:
  - `interface BridgeStep { label: string; value: number; kind: 'total' | 'add' | 'sub' }`
  - `function renderBridgeChart(container: HTMLElement, steps: BridgeStep[], deflate: number): void` (from `docs/js/charts.js:244-324`).

- [ ] **Step 1: Implement `src/lib/bridge-chart.ts`**

Port `NHA.renderBridgeChart` verbatim. Keep the running-total `rows` construction (total sets absolute x0=0..x1=value; add/sub extend from `running`), `xMax = max(x1)*1.05`, the `x()` scale, `niceTicks(0, xMax*deflate, 5)` gridlines + `axis()` labels, the per-row bar (`barPath(...,'right')`, color by kind), the connector line to the next row (from `x0` if sub else `x1`), the value label with `+`/`−` prefix, the `showBarTip`/focus/blur handlers (note the `cssVar(color.slice(4,-1))` resolution for the tip key color), and the 3-item `legend`. Import helpers from `./chart-util`, formatters from `./format`. Type `container: HTMLElement`, `steps: BridgeStep[]`.

- [ ] **Step 2: Type-check + build**

Run: `pnpm check` (0 errors), `pnpm build` (exit 0).

- [ ] **Step 3: Commit**

```bash
git add src/lib/bridge-chart.ts
git commit -m "Port renderBridgeChart to src/lib/bridge-chart.ts"
```

---

### Task 3: `src/lib/bridge.ts` (pure step builder)

**Files:**
- Create: `src/lib/bridge.ts`
- Test: `tests/lib/bridge.test.ts`

**Interfaces:**
- Consumes: `BASE2023` from `./params`; `buildRamps` from `./model`; `scenarioStructural` from `./scenarios`; `MonteCarloResult` from `./model-types`; `BridgeStep` from `./bridge-chart`.
- Produces: `function bridgeSteps(mc: MonteCarloResult): { steps: BridgeStep[]; identityError: number }` — from `docs/js/app.js:235-286` verbatim, using `mc.modeParams` for `p`, `mc.modePath.detail[mc.years.length-2]` for `d`, `scenarioStructural(mc.scenarioId)` + `buildRamps(...)` for ramps, and `mc.years`/`BASE2023` as in the source. Returns the step array and `identityError = |d.nheBase + utilAdd + expansions + oneTime + adminNet - paySave - drugSave - d.offProvAdmin - d.offCareModel - d.offLowValue - d.offExtraction - d.nheNha|`.

- [ ] **Step 1: Write the failing tests**

`tests/lib/bridge.test.ts`:
```ts
import { expect, test } from 'vitest';
import { bridgeSteps } from '../../src/lib/bridge';
import { runOverviewMc } from '../../src/lib/overview';

test('bridge starts at the baseline total and ends at the NHA total', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const { steps } = bridgeSteps(mc);
  const t = mc.years.length - 2;
  const d = mc.modePath.detail[t];
  expect(steps[0].kind).toBe('total');
  expect(steps[0].value).toBeCloseTo(d.nheBase, 6);
  const last = steps[steps.length - 1];
  expect(last.kind).toBe('total');
  expect(last.value).toBeCloseTo(d.nheNha, 6);
  for (const s of steps) expect(['total', 'add', 'sub']).toContain(s.kind);
});

test('bridge identity closes (baseline + adds - subs == NHA total)', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const { identityError } = bridgeSteps(mc);
  expect(identityError).toBeLessThan(0.5);
});

test('a stress scenario still closes the identity', () => {
  const mc = runOverviewMc('SCN-OPT', null);
  expect(bridgeSteps(mc).identityError).toBeLessThan(0.5);
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/lib/bridge.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/bridge`.

- [ ] **Step 3: Implement `src/lib/bridge.ts`**

Port `bridgeSteps` verbatim from `app.js:235-286` (drop the `NHA._bridgeIdentityError` global; return `identityError` instead; use `mc.scenarioId` where the original used `state.scenario`, and `mc.modeParams`/`mc.modePath`/`mc.baseline`/`mc.years` for the run data). Import `BASE2023` from `./params`, `buildRamps` from `./model`, `scenarioStructural` from `./scenarios`, `BridgeStep` from `./bridge-chart`. If `buildRamps` or a needed `SampledParams`/`DetailRow` field is not accessible, STOP and report BLOCKED with the exact name.

- [ ] **Step 4: Run to verify PASS**

Run: `pnpm exec vitest run tests/lib/bridge.test.ts`
Expected: PASS (3/3). If the identity test fails, a step term diverged from the source — compare against `app.js:235-286`.

- [ ] **Step 5: Type-check + commit**

Run: `pnpm exec tsc --noEmit` (exit 0).
```bash
git add src/lib/bridge.ts tests/lib/bridge.test.ts
git commit -m "Add pure bridgeSteps builder with identity invariant test"
```

---

### Task 4: Add the bridge card markup to `index.astro`

**Files:**
- Modify: `src/pages/index.astro`
- Test: `tests/pages/overview.test.ts` (extend)

**Interfaces:**
- Consumes: nothing (static markup).
- Produces: the "Why the total lands where it does" card with an empty `#bridge-chart` container (the client fills it).

- [ ] **Step 1: Extend the failing test**

Add to `tests/pages/overview.test.ts`:
```ts
test('overview includes the bridge card container', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('id="bridge-chart"');
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/pages/overview.test.ts`
Expected: FAIL — bridge container absent.

- [ ] **Step 3: Add the card to `src/pages/index.astro`**

Reproduce the bridge card from `docs/index.html` VERBATIM (the `<section class="card">` with `<h2>Why the total lands where it does</h2>`, the `.desc` paragraph, `<div id="bridge-chart"></div>`). Place it after the financing ("Who pays") card, before `</main>`. DEFER the `<details class="tableview">` table block (`#bridge-table`). Ensure no em dash (U+2014).

- [ ] **Step 4: Run to verify PASS + build**

Run: `pnpm exec vitest run tests/pages/overview.test.ts` (PASS), then `pnpm check && pnpm build`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro tests/pages/overview.test.ts
git commit -m "Add the cost-bridge card markup to the Overview"
```

---

### Task 5: Draw the bridge chart in the Overview client

**Files:**
- Modify: `src/scripts/overview-client.ts`

**Interfaces:**
- Consumes: `renderBridgeChart` from `../lib/bridge-chart`; `bridgeSteps` from `../lib/bridge`; the `mc` already computed in `render()`; `DEF` already imported.
- Produces: the client draws the bridge chart on each render.

- [ ] **Step 1: Update `render()` in `src/scripts/overview-client.ts`**

After the financing render, add:
```ts
import { renderBridgeChart } from '../lib/bridge-chart';
import { bridgeSteps } from '../lib/bridge';
// ...inside render(), after the financing chart:
const bridgeHost = document.getElementById('bridge-chart');
if (bridgeHost) renderBridgeChart(bridgeHost, bridgeSteps(mc).steps, DEF);
```
Leave the rest of the client unchanged.

- [ ] **Step 2: Full suite + check + build**

Run: `pnpm test && pnpm check && pnpm build`
Expected: all green (52+ tests), 0 type errors, 12 pages.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/overview-client.ts
git commit -m "Render the Overview cost-bridge chart from the shared Monte Carlo run"
```

---

### Task 6: Browser verification

**Files:** none (verification only).

- [ ] **Step 1: Serve + inspect**

`pnpm preview`; open the Overview. Confirm `#bridge-chart` contains an `<svg class="chart-svg">` with gridline ticks, one `.bar-mark` per step (first + last are `var(--total-bar)` totals; adds/subs between), `.connector` lines, `.value-label`s, and a 3-item `.chart-legend`. Grep the SVG `d`/attrs for `NaN` (must be none). `read_console_messages` — zero errors.

- [ ] **Step 2: Interactivity**

Change the scenario `<select>` to `SCN-OPT`; confirm the bridge redraws (step widths change) with no console error. Reset returns to SCN-BASE.

- [ ] **Step 3: Bar tooltip**

Dispatch `pointermove` over a `.bar-mark`; confirm the shared tooltip shows the step label, "Total/Adds/Saves", and the money value; hides on `pointerleave`.

- [ ] **Step 4: View Transitions**

Navigate to `/health` and back; confirm the bridge re-renders (single `<svg>`, no duplicate) with no console error.

---

## Follow-on slices (out of scope here)

- **P3 slice 7:** the benchmarks card (`renderBenchmarkChart` + the model-vs-CBO/Urban prose + verdict; uses `mc.nhe2030delta`, `mc.steady.fedIncrease`).
- **P3 slice 8:** the tables (path-table, sponsor-table, financing-table, bridge-table) + growth-decomp note + Act-1 solo flow (`#flow-today-solo`) + `#flow-takeaway`.
- **P3 slice 9+:** remaining tabs (health, tax + `taxcharts.js`/`taxapp.js`, prose tabs), each replacing its stub, DOM-diffed vs live, with the em-dash/content pass (incl. the family-note "the the" typo).
- **P4/P5:** content collections; cutover.

## Self-review notes

- Spec coverage: implements design spec §2 (client-rendered SVG) for the cost-bridge; benchmarks/tables deferred. Reuses the shared single-MC-run (no extra model runs). The bridge-identity self-test migrates from the old footer harness into a Vitest assertion.
- No unresolved placeholders: `renderBridgeChart`/`bridgeSteps` reference exact source line ranges; `bridge.ts` has concrete pure tests incl. the identity invariant; the card markup is a verbatim parity port paired with a rendering test + browser verification.
- Type/name consistency: `BridgeStep` defined in `bridge-chart.ts` and consumed by `bridge.ts` + the client; `buildRamps`/`BuiltRamps` exported in Task 1 and consumed by `bridge.ts`; `MonteCarloResult`/`SampledParams`/`DetailRow` are P2 model types; `scenarioStructural`/`BASE2023` from P2 lib; id `#bridge-chart` matches `docs/index.html`.
- NaN-guard + palette + identity invariant called out and checked (Task 3 test, Task 6 browser). `buildRamps` field access flagged in Task 3.
