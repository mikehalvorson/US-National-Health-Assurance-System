# NHA Astro Migration — P3 (slice 8): Overview tables + growth-decomp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the three "View as table" data tables under the already-ported Overview chart cards (path, bridge, financing) and the growth-decomposition note under the path chart, all rebuilt client-side from the shared Monte Carlo run.

**Architecture:** Add a small generic `renderDataTable(tableEl, data)` DOM helper plus three pure table-data builders (`pathTableData`, `bridgeTableData`, `financingTableData`) in `src/lib/overview-tables.ts`, and a pure `growthDecompNote(scenario, sliders)` in `src/lib/growth-decomp.ts`. Wire the `<details>` table markup + the note element into the existing cards and fill them in the client `render()`.

**Tech Stack:** Astro 5 (client `<script>` + HTML `<table>` DOM), TypeScript strict, Vitest 3.2.7. Consumes `mc`/`MonteCarloResult` from `src/lib/model-types`, `AGE_STRUCTURE` from `src/lib/params`, `effectiveParams` from `src/lib/scenarios`, P3 `src/lib/format` + `src/lib/bridge` (`bridgeSteps`).

## Global Constraints

- Platform: Windows. Bash tool or PowerShell. node 22.23.1 / pnpm 11.17.0 on PATH (Volta). Working dir: `C:\Users\micha\OneDrive\Desktop\Healthcare Framework\ChatGPT Work Outputs\Claude Outputs`.
- TypeScript `strict`; avoid gratuitous `any`.
- **Fidelity:** table columns/rows/formatting from `docs/js/app.js` verbatim — `renderPathTable` (213-232), the bridge table loop (292-308), the financing table array (344-363), and `renderGrowthDecomp` (512-529). Same money formatting via `src/lib/format`.
- **Palette/markup:** tables use `<table class="data">` inside `<details class="tableview"><summary>View as table</summary><div class="tbl-scroll">…</div></details>`, exactly as `docs/index.html`. Numeric cells get `class="num"`; header numeric cells too. The note is `<p class="note" id="growth-decomp">`.
- Base path `/US-National-Health-Assurance-System/`; assets via `import.meta.env.BASE_URL`.
- No em dashes (—, U+2014) in reader-visible output. The growth-decomp prose uses `~`, `+`, en-dash ranges, and the `→` arrow in a comment only; the visible string has no U+2014. Age band ids like `"0–18"` use U+2013 (allowed).
- Client render on `astro:page-load` (tables + note rebuilt inside the existing `render()`).
- Do NOT modify anything under `docs/` or the `src/lib/*` engine modules (params/model/scenarios/tax*). You MAY add `src/lib/overview-tables.ts`, `src/lib/growth-decomp.ts`, and edit `src/scripts/overview-client.ts` + `src/pages/index.astro`.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Scope: the path/bridge/financing tables + growth-decomp note ONLY. DEFERRED to later slices: the sponsor-table (lives in the un-ported Act-1 section), the Act-1 solo money-flow, `#flow-takeaway`, the Methodology card, and the other tabs.

## File structure

```
src/
  lib/
    overview-tables.ts  TableData type + renderDataTable(tableEl, data) + pathTableData/bridgeTableData/financingTableData
    growth-decomp.ts    growthDecompNote(scenario, sliders)  (pure)
  scripts/
    overview-client.ts  render() also fills the 3 tables + the growth-decomp note
  pages/
    index.astro         + the <details> table blocks under path/bridge/financing cards + the #growth-decomp note
tests/lib/
  overview-tables.test.ts  table-data builders (pure)
  growth-decomp.test.ts    note builder (pure)
```

---

### Task 1: `src/lib/overview-tables.ts`

**Files:**
- Create: `src/lib/overview-tables.ts`
- Test: `tests/lib/overview-tables.test.ts`

**Interfaces:**
- Consumes: `MonteCarloResult` from `./model-types`; `money`, `moneyShort` from `./format`; `bridgeSteps` from `./bridge`.
- Produces:
  - `interface TableData { head: string[]; rows: string[][] }` — column 0 is text; columns >= 1 are numeric (get `class="num"`).
  - `function renderDataTable(tableEl: HTMLTableElement, data: TableData): void` — clears the table, builds a `<thead>` row (each `<th>`; those at index >= 1 get `class="num"`) and a `<tbody>` with one row per `data.rows` entry (each `<td>`; those at index >= 1 get `class="num"`).
  - `function pathTableData(mc: MonteCarloResult, DEF: number): TableData` — head `['Year','Status quo','NHA p10','NHA median','NHA p90']`; one row per `mc.years[i]`: `[String(yr), money(mc.baseline[i]*DEF), money(mc.yearBands[i].p10*DEF), money(mc.yearBands[i].p50*DEF), money(mc.yearBands[i].p90*DEF)]` (app.js:213-232).
  - `function bridgeTableData(mc: MonteCarloResult, DEF: number): TableData` — head `['Component','Effect (2024$)']`; from `bridgeSteps(mc).steps`, one row per step: `[s.label, (s.kind === 'total' ? '' : (s.value*DEF >= 0 ? '+' : '−')) + money(Math.abs(s.value*DEF))]` (app.js:292-308).
  - `function financingTableData(mc: MonteCarloResult, DEF: number): TableData` — head `['Source (mature year 2041)','Amount (2024$)']`; recompute the same waterfall as `financingSpec` (t/d/need/fedUse/stateUse/empUse/fbUse/newRev) and emit the 7 rows from app.js:353-357: `['Total public cost', need]`, `['Redirected federal spending', fedUse]`, `['State maintenance-of-effort', stateUse]`, `['Employer contribution', empUse]`, `['Income/payroll tax on wages passed through from employer savings', fbUse]`, `['New revenue needed', newRev]`, `['...of which the wealth-tax package could cover', Math.min(newRev, d.wealthRevenue)]`, each amount as `money(value*DEF)`.

- [ ] **Step 1: Write the failing tests**

`tests/lib/overview-tables.test.ts`:
```ts
import { expect, test } from 'vitest';
import { pathTableData, bridgeTableData, financingTableData } from '../../src/lib/overview-tables';
import { bridgeSteps } from '../../src/lib/bridge';
import { runOverviewMc } from '../../src/lib/overview';
import { DEFLATOR_2023_TO_2024 as DEF } from '../../src/lib/params';

test('pathTableData: 5 columns, one row per model year', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const d = pathTableData(mc, DEF);
  expect(d.head).toHaveLength(5);
  expect(d.rows).toHaveLength(mc.years.length);
  expect(d.rows[0]).toHaveLength(5);
  expect(d.rows[0][0]).toBe(String(mc.years[0]));
});

test('bridgeTableData: one row per bridge step, totals unsigned', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const d = bridgeTableData(mc, DEF);
  expect(d.rows).toHaveLength(bridgeSteps(mc).steps.length);
  // first row is the baseline total -> no +/- prefix
  expect(d.rows[0][1].startsWith('+')).toBe(false);
  expect(d.rows[0][1].startsWith('−')).toBe(false);
});

test('financingTableData: 7 rows, amounts formatted', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const d = financingTableData(mc, DEF);
  expect(d.rows).toHaveLength(7);
  expect(d.rows[0][0]).toBe('Total public cost');
  expect(d.rows[0][1]).toMatch(/^\$/);
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/lib/overview-tables.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/overview-tables`.

- [ ] **Step 3: Implement `src/lib/overview-tables.ts`**

Implement `renderDataTable` (uses `tableEl.createTHead().insertRow()`, `document.createElement('th'|'td')`, `.className='num'` for index>=1, `tableEl.createTBody()`), and the three data builders per the Interfaces block (each porting the exact columns/rows/formatting from the app.js line ranges). Import `money`/`moneyShort` from `./format`, `bridgeSteps` from `./bridge`, `MonteCarloResult` from `./model-types`.

- [ ] **Step 4: Run to verify PASS**

Run: `pnpm exec vitest run tests/lib/overview-tables.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Type-check + commit**

Run: `pnpm exec tsc --noEmit` (exit 0).
```bash
git add src/lib/overview-tables.ts tests/lib/overview-tables.test.ts
git commit -m "Add Overview data tables: renderDataTable + path/bridge/financing builders"
```

---

### Task 2: `src/lib/growth-decomp.ts`

**Files:**
- Create: `src/lib/growth-decomp.ts`
- Test: `tests/lib/growth-decomp.test.ts`

**Interfaces:**
- Consumes: `AGE_STRUCTURE` from `./params`; `effectiveParams` from `./scenarios`.
- Produces: `function growthDecompNote(scenario: string, sliders: Record<string, number> | null): string` — from `docs/js/app.js:512-529` verbatim (compute `idx24`/`idx41` from `AGE_STRUCTURE.bands` (`share2024*costw`, `share2041*costw`), `agingPP = 100*(Math.pow(idx41/idx24, 1/17) - 1)`, `totalG = effectiveParams(scenario, sliders).baselineRealGrowth.mode`, then the prose string with `agingPP.toFixed(1)` and `totalG.toFixed(1)`).

- [ ] **Step 1: Write the failing test**

`tests/lib/growth-decomp.test.ts`:
```ts
import { expect, test } from 'vitest';
import { growthDecompNote } from '../../src/lib/growth-decomp';

test('growthDecompNote reports the aging and total growth figures, em-dash-free', () => {
  const note = growthDecompNote('SCN-BASE', null);
  expect(note).toContain('%/yr real growth assumption');
  expect(note).toMatch(/\d\.\d points/);
  expect(note.includes('—')).toBe(false); // U+2014
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/lib/growth-decomp.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/growth-decomp`.

- [ ] **Step 3: Implement `src/lib/growth-decomp.ts`**

Port `renderGrowthDecomp`'s computation + string verbatim into `growthDecompNote`. Import `AGE_STRUCTURE` from `./params`, `effectiveParams` from `./scenarios`. If `AGE_STRUCTURE.bands[i].costw` or `effectiveParams(...).baselineRealGrowth` is missing, STOP and report BLOCKED.

- [ ] **Step 4: Run to verify PASS**

Run: `pnpm exec vitest run tests/lib/growth-decomp.test.ts`
Expected: PASS (1/1).

- [ ] **Step 5: Type-check + commit**

Run: `pnpm exec tsc --noEmit` (exit 0).
```bash
git add src/lib/growth-decomp.ts tests/lib/growth-decomp.test.ts
git commit -m "Add pure growthDecompNote builder"
```

---

### Task 3: Add the table markup + growth-decomp note to `index.astro`

**Files:**
- Modify: `src/pages/index.astro`
- Test: `tests/pages/overview.test.ts` (extend)

**Interfaces:**
- Consumes: nothing (static markup).
- Produces: `<details>` table blocks under the path/bridge/financing cards (empty `#path-table`/`#bridge-table`/`#financing-table`) and the `#growth-decomp` note under the path chart.

- [ ] **Step 1: Extend the failing test**

Add to `tests/pages/overview.test.ts`:
```ts
test('overview includes the data-table containers and growth-decomp note', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('id="path-table"');
  expect(html).toContain('id="bridge-table"');
  expect(html).toContain('id="financing-table"');
  expect(html).toContain('id="growth-decomp"');
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/pages/overview.test.ts`
Expected: FAIL — table/note containers absent.

- [ ] **Step 3: Add the markup to `src/pages/index.astro`**

- Under the path chart (`<div id="path-chart"></div>`), add (verbatim from `docs/index.html:846-849`):
  ```html
  <p class="note" id="growth-decomp"></p>
  <details class="tableview"><summary>View as table</summary>
    <div class="tbl-scroll"><table class="data" id="path-table"></table></div>
  </details>
  ```
- Under the bridge chart (`<div id="bridge-chart"></div>`), add (verbatim from `docs/index.html:860-862`):
  ```html
  <details class="tableview"><summary>View as table</summary>
    <div class="tbl-scroll"><table class="data" id="bridge-table"></table></div>
  </details>
  ```
- Under the financing note (`<p class="note" id="financing-note"></p>`), add (verbatim from `docs/index.html:875-877`):
  ```html
  <details class="tableview"><summary>View as table</summary>
    <div class="tbl-scroll"><table class="data" id="financing-table"></table></div>
  </details>
  ```
Ensure no em dash (U+2014).

- [ ] **Step 4: Run to verify PASS + build**

Run: `pnpm exec vitest run tests/pages/overview.test.ts` (PASS), then `pnpm check && pnpm build`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro tests/pages/overview.test.ts
git commit -m "Add Overview data-table blocks and growth-decomp note markup"
```

---

### Task 4: Fill the tables + note in the client

**Files:**
- Modify: `src/scripts/overview-client.ts`

**Interfaces:**
- Consumes: `renderDataTable`, `pathTableData`, `bridgeTableData`, `financingTableData` from `../lib/overview-tables`; `growthDecompNote` from `../lib/growth-decomp`; the `mc` + `state` already in `render()`; `DEF` already imported.
- Produces: the client fills the three tables and the note on each render.

- [ ] **Step 1: Update `render()` in `src/scripts/overview-client.ts`**

After the benchmark render, add:
```ts
import { renderDataTable, pathTableData, bridgeTableData, financingTableData } from '../lib/overview-tables';
import { growthDecompNote } from '../lib/growth-decomp';
// ...inside render(), after the benchmark spans:
const sliders2 = Object.keys(state.sliders).length ? state.sliders : null;
set('growth-decomp', growthDecompNote(state.scenario, sliders2));
const fillTable = (id: string, data: { head: string[]; rows: string[][] }) => {
  const tbl = document.getElementById(id) as HTMLTableElement | null;
  if (tbl) renderDataTable(tbl, data);
};
fillTable('path-table', pathTableData(mc, DEF));
fillTable('bridge-table', bridgeTableData(mc, DEF));
fillTable('financing-table', financingTableData(mc, DEF));
```
(`state` and `set` are already in scope in `render()`; reuse them. `sliders2` mirrors the null-or-object convention used for the model run.) Leave the rest of the client unchanged.

- [ ] **Step 2: Full suite + check + build**

Run: `pnpm test && pnpm check && pnpm build`
Expected: all green (60+ tests), 0 type errors, 12 pages.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/overview-client.ts
git commit -m "Fill the Overview tables and growth-decomp note in the client"
```

---

### Task 5: Browser verification

**Files:** none (verification only).

- [ ] **Step 1: Serve + inspect**

`pnpm preview`; open the Overview. For each of `#path-table`, `#bridge-table`, `#financing-table`: confirm the `<table class="data">` has a `<thead>` with the expected column count and a `<tbody>` with rows (path: one per year; bridge: one per step; financing: 7). Confirm cells at column >= 1 carry `class="num"`. Confirm `#growth-decomp` has prose containing "%/yr real growth assumption". `read_console_messages` — zero errors.

- [ ] **Step 2: Interactivity**

Change the scenario `<select>` to `SCN-OPT`; confirm the path/bridge/financing table numbers and the growth-decomp note update, no console error. Reset returns to SCN-BASE.

- [ ] **Step 3: Details expand**

Confirm the `<details class="tableview">` blocks are collapsed by default and expand on clicking the "View as table" summary (native `<details>` behavior; just confirm the summary is present and the table is inside).

- [ ] **Step 4: View Transitions**

Navigate to `/health` and back; confirm the tables re-fill (one `<tbody>`, no duplicated rows) and the note is re-set, with no console error.

---

## Follow-on slices (out of scope here)

- **P3 slice 9 (finishes Overview Act-1):** the un-ported top-of-page Act-1 content — the problem-stats tiles, care-cost cards, household calculator, the money-shift, the sponsor-table, and the Act-1 solo money-flow (`#flow-today-solo`) + `#flow-takeaway` + the Methodology card.
- **P3 slice 10+:** remaining tabs (health, tax + `taxcharts.js`/`taxapp.js`, prose tabs), each replacing its stub, DOM-diffed vs live, with the em-dash/content pass (incl. the family-note "the the" typo).
- **P4/P5:** content collections; cutover.

## Self-review notes

- Spec coverage: implements design spec §2 (client-rendered content) for the Overview data tables + growth note; Act-1 content + Methodology deferred. Reuses the shared single-MC-run and the existing `bridgeSteps`.
- No unresolved placeholders: builders reference exact source line ranges; `overview-tables.ts`/`growth-decomp.ts` have concrete pure tests; the markup is a verbatim parity port paired with a rendering test + browser verification.
- Type/name consistency: `TableData` defined in `overview-tables.ts` and consumed by `renderDataTable` + the client; `pathTableData`/`bridgeTableData`/`financingTableData`/`growthDecompNote` defined in Tasks 1-2 and consumed by Task 4; `bridgeSteps` reused from slice 6; `MonteCarloResult`/`AGE_STRUCTURE`/`effectiveParams` are P2 lib. Table ids `#path-table`/`#bridge-table`/`#financing-table`/`#growth-decomp` match `docs/index.html`.
- No SVG here, so no NaN-geometry risk; the em-dash rule is checked in Task 2/3 tests + the markup grep.
