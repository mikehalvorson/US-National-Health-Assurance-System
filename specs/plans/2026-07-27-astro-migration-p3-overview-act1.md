# NHA Astro Migration - P3 (slice 9): Overview Act-1/Act-2 (system today + problems) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the top of the Overview narrative - Act 1 "The system today" (solo money-flow + sponsor table) and Act 2 "What's wrong, by the numbers" (problem-stats tiles) - prepended above the existing model section, using static build-time rendering plus one client-drawn SVG.

**Architecture:** Add a pure `sponsorTableData()` builder (static, from `MONEYFLOW`) to `src/lib/overview-tables.ts`. In `src/pages/index.astro`, prepend the Act-1 + Act-2 cards, rendering the problem-stats tiles and the sponsor table at build time (zero client JS) from `PROBLEM_STATS` and `sponsorTableData()`. The Act-1 solo money-flow (`#flow-today-solo`) is drawn client-side in `render()` with the existing `todayFlowSpec()`.

**Tech Stack:** Astro 5 (build-time template + client `<script>`), TypeScript strict, Vitest 3.2.7. Consumes `MONEYFLOW`/`PROBLEM_STATS` from `src/lib/params`, `todayFlowSpec` from `src/lib/money-flow`, `renderFlowDiagram` from `src/lib/flow-diagram`, `TableData` from `src/lib/overview-tables`, `money`/`moneyShort` from `src/lib/format`.

## Global Constraints

- Platform: Windows. Bash tool or PowerShell. node 22.23.1 / pnpm 11.17.0 on PATH (Volta). Working dir: `C:\Users\micha\OneDrive\Desktop\Healthcare Framework\ChatGPT Work Outputs\Claude Outputs`.
- TypeScript `strict`; avoid gratuitous `any`.
- **Fidelity:** Act-1/Act-2 card markup + prose from `docs/index.html:47-84` verbatim. The problem tiles from `renderProblemTiles` (app.js:533-543): each `<div class="tile">` with `.value`/`.label`/`.range` = `PROBLEM_STATS[i].value`/`.label`/`.note`. The sponsor table from `renderSponsorTable` (app.js:547-573): head `['Who pays','2023 amount','Share','What it consists of']`, one row per `MONEYFLOW.sources`: `[label, money(value), round(100*value/total)+'%', notesJoined]` where `notesJoined` = for each ribbon with `from === source.id`, `channel.label + ' ' + moneyShort(ribbon.value) + ' (' + ribbon.note + ')'`, joined with `'; '`. NOTE: the sponsor table has NO `class="num"` cells (unlike `renderDataTable`), so render it as a plain build-time table, not via `renderDataTable`.
- **Placement:** Act-1 and Act-2 go at the TOP of `<main>` in `index.astro`, before the current hero card, matching the docs narrative order (system today → problems → … → model section).
- Base path `/US-National-Health-Assurance-System/`; assets via `import.meta.env.BASE_URL`.
- No em dashes ( - , U+2014) in reader-visible output. The Act-1/Act-2 prose uses `&amp;`, `~`, `$`, and `<abbr>`; none are U+2014.
- Client render on `astro:page-load` (the solo flow is drawn inside the existing `render()`).
- Do NOT modify anything under `docs/` or the `src/lib/*` engine modules (params/model/scenarios/tax*). You MAY edit `src/lib/overview-tables.ts` (additive), `src/scripts/overview-client.ts`, `src/pages/index.astro`.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Scope: Act 1 + Act 2 ONLY. DEFERRED: Act 3-4 (the fixable part, the proposal + operating-system/care-pathway/financing/rollout diagrams + chapter nav), the care-cost cards + household calculator (need `care.js`), the outcomes section, and the Methodology card + `#flow-takeaway`.

## File structure

```
src/
  lib/
    overview-tables.ts  + sponsorTableData(): TableData  (static, from MONEYFLOW)
  scripts/
    overview-client.ts  render() also draws #flow-today-solo (todayFlowSpec)
  pages/
    index.astro         + Act-1 + Act-2 cards at the top of <main> (tiles + sponsor table build-time)
tests/lib/
  overview-tables.test.ts  + sponsorTableData test
```

---

### Task 1: `sponsorTableData()` in `src/lib/overview-tables.ts`

**Files:**
- Modify: `src/lib/overview-tables.ts`
- Test: `tests/lib/overview-tables.test.ts` (extend)

**Interfaces:**
- Consumes: `MONEYFLOW` from `./params`; `money`, `moneyShort` from `./format`.
- Produces: `function sponsorTableData(): TableData` - head `['Who pays','2023 amount','Share','What it consists of']`; one row per `MONEYFLOW.sources` per `renderSponsorTable` (app.js:547-573).

- [ ] **Step 1: Write the failing test**

Add to `tests/lib/overview-tables.test.ts`:
```ts
import { sponsorTableData } from '../../src/lib/overview-tables';

test('sponsorTableData: one row per MONEYFLOW source, 4 columns', () => {
  const d = sponsorTableData();
  expect(d.head).toEqual(['Who pays', '2023 amount', 'Share', 'What it consists of']);
  expect(d.rows).toHaveLength(5); // hh, emp, fed, state, oth
  expect(d.rows[0]).toHaveLength(4);
  expect(d.rows[0][2]).toMatch(/%$/); // share column
  expect(d.rows[0][3].length).toBeGreaterThan(0); // notes non-empty
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/lib/overview-tables.test.ts`
Expected: FAIL - `sponsorTableData` not exported.

- [ ] **Step 3: Implement `sponsorTableData`**

Add to `src/lib/overview-tables.ts` (import `MONEYFLOW` from `./params`, `moneyShort` already available or add it):
```ts
import { MONEYFLOW } from './params';

export function sponsorTableData(): TableData {
  return {
    head: ['Who pays', '2023 amount', 'Share', 'What it consists of'],
    rows: MONEYFLOW.sources.map(function (s) {
      const notes = MONEYFLOW.ribbons
        .filter(function (r) { return r.from === s.id; })
        .map(function (r) {
          const ch = MONEYFLOW.channels.filter(function (c) { return c.id === r.to; })[0];
          return ch.label + ' ' + moneyShort(r.value) + ' (' + r.note + ')';
        });
      return [
        s.label,
        money(s.value),
        String(Math.round(100 * s.value / MONEYFLOW.total)) + '%',
        notes.join('; ')
      ];
    })
  };
}
```
(Ensure `moneyShort` is imported from `./format` at the top of the file.)

- [ ] **Step 4: Run to verify PASS**

Run: `pnpm exec vitest run tests/lib/overview-tables.test.ts`
Expected: PASS (4/4 in this file now).

- [ ] **Step 5: Type-check + commit**

Run: `pnpm exec tsc --noEmit` (exit 0).
```bash
git add src/lib/overview-tables.ts tests/lib/overview-tables.test.ts
git commit -m "Add pure sponsorTableData builder (CMS 2023 sponsor map)"
```

---

### Task 2: Prepend Act-1 + Act-2 markup to `index.astro` (build-time tiles + sponsor table)

**Files:**
- Modify: `src/pages/index.astro`
- Test: `tests/pages/overview.test.ts` (extend)

**Interfaces:**
- Consumes: `PROBLEM_STATS` from `../lib/params`; `sponsorTableData` from `../lib/overview-tables`.
- Produces: the Act-1 + Act-2 cards at the top of `<main>`, with build-time-rendered `#problem-tiles` and `#sponsor-table` and an empty `#flow-today-solo`.

- [ ] **Step 1: Extend the failing test**

Add to `tests/pages/overview.test.ts`:
```ts
test('overview includes Act-1/Act-2 with build-time tiles and sponsor table', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('id="flow-today-solo"');
  expect(html).toContain('id="sponsor-table"');
  expect(html).toContain('id="problem-tiles"');
  expect(html).toContain('The system today');
  // problem tiles rendered at build time (at least one tile value present)
  expect(html).toContain('17.6% of GDP');
  // sponsor table rendered at build time (a source label present)
  expect(html).toContain('Households');
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/pages/overview.test.ts`
Expected: FAIL - Act-1/Act-2 absent.

- [ ] **Step 3: Add Act-1 + Act-2 to `src/pages/index.astro`**

In the frontmatter, import `PROBLEM_STATS` from `../lib/params` and `sponsorTableData` from `../lib/overview-tables`, and compute `const sponsor = sponsorTableData();`. At the very top of `<main>` (before the current hero card), add the two cards, reproducing `docs/index.html:47-84` verbatim for the prose/structure and rendering the tiles + sponsor table at build time:
```astro
<section class="card">
  <h2>The system today</h2>
  <p class="desc">American healthcare is not one system. It is four
    payment systems stapled together, with your coverage determined
    mostly by your job, your age, and your income. About 157 million
    people get insurance through an employer, who pays most of the
    premium out of what would otherwise be wages. Medicare covers ~67
    million people over 65 or disabled, funded by payroll taxes, general
    federal revenue, and enrollee premiums. Medicaid &amp;
    <abbr class="overview-acronym" title="Children's Health Insurance Program">CHIP</abbr>
    cover ~72
    million lower-income people, funded jointly by Washington and the
    states. Everyone also pays directly at the point of care:
    deductibles, copays, and uncovered bills totaled $506B in 2023. And
    ~26 million people have no coverage at all. Here is where the $4.87T
    came from and where it went. Hover any ribbon for the details.</p>
  <div class="flow-panel" style="max-width:560px;margin:14px auto 0">
    <div class="flow-title">Actual 2023 spending: $4.87T
      (<abbr class="overview-acronym" title="Centers for Medicare &amp; Medicaid Services">CMS</abbr>)</div>
    <div id="flow-today-solo"></div>
  </div>
  <details class="tableview"><summary>View the distribution as a table</summary>
    <div class="tbl-scroll">
      <table class="data" id="sponsor-table">
        <thead><tr>{sponsor.head.map((h) => <th>{h}</th>)}</tr></thead>
        <tbody>{sponsor.rows.map((r) => <tr>{r.map((c) => <td>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  </details>
</section>

<section class="card">
  <h2>What's wrong, by the numbers</h2>
  <p class="desc">The problem is not that America spends heavily on health; every
    rich country does. It's that America pays far more and gets less
    coverage, less security, and far more overhead. Every figure below
    is sourced (citations in the
    <a href="https://github.com/mikehalvorson/US-National-Health-Assurance-System/tree/main/research"
       target="_blank" rel="noopener">research repository</a>).</p>
  <div class="tiles" id="problem-tiles">
    {PROBLEM_STATS.map((s) => (
      <div class="tile">
        <div class="value">{s.value}</div>
        <div class="label">{s.label}</div>
        <div class="range">{s.note}</div>
      </div>
    ))}
  </div>
</section>
```
NOTE: the sponsor table is pre-rendered at build time here (no `#sponsor-table` client fill needed), matching the static nature of `renderSponsorTable`. After adding, grep the file for U+2014 and confirm zero.

- [ ] **Step 4: Run to verify PASS + build**

Run: `pnpm exec vitest run tests/pages/overview.test.ts` (PASS), then `pnpm check && pnpm build`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro tests/pages/overview.test.ts
git commit -m "Prepend Overview Act-1/Act-2 (system today + problems) with build-time tiles + sponsor table"
```

---

### Task 3: Draw the Act-1 solo money-flow in the client

**Files:**
- Modify: `src/scripts/overview-client.ts`

**Interfaces:**
- Consumes: `renderFlowDiagram` (already imported) + `todayFlowSpec` (already imported) from the money-flow modules.
- Produces: the client draws `#flow-today-solo` on each render (static spec; harmless to redraw).

- [ ] **Step 1: Update `render()` in `src/scripts/overview-client.ts`**

Near the existing `#flow-today` render, add the solo diagram (reusing the already-imported `renderFlowDiagram`/`todayFlowSpec`):
```ts
const flowSolo = $('flow-today-solo');
if (flowSolo) renderFlowDiagram(flowSolo, todayFlowSpec());
```
Leave the rest of the client unchanged.

- [ ] **Step 2: Full suite + check + build**

Run: `pnpm test && pnpm check && pnpm build`
Expected: all green (61+ tests), 0 type errors, 12 pages.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/overview-client.ts
git commit -m "Draw the Act-1 solo money-flow diagram in the Overview client"
```

---

### Task 4: Browser verification

**Files:** none (verification only).

- [ ] **Step 1: Serve + inspect**

`pnpm preview`; open the Overview. Confirm at the top of the page: the "The system today" card with `#flow-today-solo` containing an `<svg class="chart-svg">` (source/channel rects + `.flow-ribbon` paths, no `NaN`), and the `#sponsor-table` (inside `<details>`) with a `<thead>` (4 columns) and 5 `<tbody>` rows pre-rendered (present even before any client JS). Confirm the "What's wrong, by the numbers" card's `#problem-tiles` has multiple `.tile`s (e.g. one showing "17.6% of GDP"). Confirm the model section (hero, charts, tables) still follows below. `read_console_messages` - zero errors.

- [ ] **Step 2: Static-render check**

Confirm the sponsor table and problem tiles are in the built HTML directly (view `dist/index.html` contains "Households" and "17.6% of GDP") - i.e. they render with zero client JS.

- [ ] **Step 3: View Transitions**

Navigate to `/health` and back; confirm the solo money-flow re-renders (single `<svg>`, no duplicate) and the static tiles/sponsor table are intact, with no console error.

---

## Follow-on slices (out of scope here)

- **P3 slice 10:** Act 3-4 narrative - "the fixable part", "the proposal", and the static operating-system / care-pathway / financing / rollout-preview diagrams + chapter-nav (some may need `govdata`); mostly static prose + SVG.
- **P3 slice 11:** the care-cost cards + the household calculator (port `care.js` `CARE_SCENARIOS` + `HOUSEHOLD_PROFILES`), the outcomes section (`OUTCOME_STATS`), the Methodology card, `#flow-takeaway`. This finishes the Overview.
- **P3 slice 12+:** remaining tabs (health, tax + `taxcharts.js`/`taxapp.js`, prose tabs), each replacing its stub, DOM-diffed vs live, with the em-dash/content pass.
- **P4/P5:** content collections; cutover.

## Self-review notes

- Spec coverage: implements design spec §1/§2 for Overview Act-1/Act-2 (narrative preamble); later Acts + care/household deferred. Uses build-time rendering for the static tiles/table (zero client JS) and the shared `todayFlowSpec` for the solo SVG.
- No unresolved placeholders: `sponsorTableData` has a concrete pure test; the markup is a verbatim parity port with a rendering test asserting build-time content; the solo flow reuses an existing spec + renderer.
- Type/name consistency: `sponsorTableData(): TableData` reuses the `TableData` type from slice 8; `PROBLEM_STATS`/`MONEYFLOW` are P2 params; `todayFlowSpec`/`renderFlowDiagram` from slice 4; ids `#flow-today-solo`/`#sponsor-table`/`#problem-tiles` match `docs/index.html`.
- No NaN risk for the build-time table/tiles; the solo SVG uses the same NaN-safe `renderFlowDiagram` as `#flow-today` (already verified in slice 4). Em-dash checked in Task 2.
