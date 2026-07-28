# NHA Astro Migration — P3 (slice 11c): Overview Methodology card (finishes the Overview) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Overview "Methodology and limits" card — three static note blocks, the weakest-assumptions warnbox with a build-time `#gaps-list`, the full `#param-table` (every `PARAM_DEFS` row with confidence badge + source link), and the `#selftest` badge that aggregates the model self-tests and the tax invariants — all rendered at build time (zero client JS). This is the last Overview slice.

**Architecture:** A new pure `src/lib/selftests.ts` exposes `selfTestSummary()`, which reconciles the two self-test shapes — `selfTest()` (`{name, ok, note}`) from `model.ts`, the bridge-identity check from `bridgeSteps()`, and `TAX_SELFTESTS` (`{name, run()}`) from `taxmodel.ts` — into one `{rows, passed, total}` result. `src/pages/index.astro` renders the whole Methodology card at build time: the gaps list from `PARAM_DEFS` (low-confidence labels), the parameter table from `PARAM_DEFS`, and the self-test badge/list from `selfTestSummary()`. Inserted between the household card and the chapter-nav footer.

**Tech Stack:** Astro 5 (build-time template), TypeScript strict, Vitest 3.2.7. Consumes `PARAM_DEFS` from `src/lib/params.ts`, `selfTest` from `src/lib/model.ts`, `bridgeSteps` from `src/lib/bridge.ts`, `runOverviewMc` from `src/lib/overview.ts`, `TAX_SELFTESTS` from `src/lib/taxmodel.ts`.

## Global Constraints

- Platform: Windows. Bash tool or PowerShell. node 22.23.1 / pnpm 11.17.0 (Volta). Working dir: `C:\Users\micha\OneDrive\Desktop\Healthcare Framework\ChatGPT Work Outputs\Claude Outputs`.
- TypeScript `strict`; avoid gratuitous `any`.
- **Fidelity:** the card prose is verbatim from `docs/index.html:991-1040`. The parameter table reproduces `renderParamTable` (`docs/js/app.js:570-606`): head `['Parameter','Low','Central','High','Unit','Confidence','Source']` with columns 1-3 (`Low/Central/High`) carrying `class="num"`; each numeric cell is `(+v.toFixed(2)).toLocaleString('en-US')`; the Source cell is `p.source + ' '` then, if `p.url`, an `<a href target="_blank" rel="noopener">[link]</a>`. The gaps list reproduces `docs/js/app.js:604-605`: low-confidence `PARAM_DEFS` labels joined with `' · '`, with a single leading space. The self-test badge reproduces `renderSelfTests` (`docs/js/app.js:608-641`): status text `All N model self-tests pass.` when all pass, else `M of N self-tests FAILING.`, then a `<ul>` of `✓ name` / `✗ name: note`.
- No em dashes (—, U+2014) in reader-visible output. En dash `–` (U+2013) allowed. Grep after each markup task; must be 0. (Note `docs:993` uses `Phase 0–8` and `2040–2042` en dashes; keep them.)
- Build-time only: `#gaps-list`, `#param-table`, and `#selftest` are rendered from data at build time (zero client JS). Do NOT touch `src/scripts/overview-client.ts`. (This differs from the docs, which filled them client-side; build-time is correct here because they are static.)
- Do NOT modify `docs/` or the engine modules (params/model/scenarios/bridge/taxmodel). You MAY create `src/lib/selftests.ts` and edit `src/pages/index.astro`, plus tests.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Placement (locked):** the Methodology card goes AFTER the household-calc card and BEFORE the chapter-nav footer card (`<span class="overview-kicker">Continue the story</span>`). This is the final Overview content slice.
- **Scope:** the Methodology card ONLY. This finishes the Overview page.

## File structure

```
src/
  lib/
    selftests.ts     NEW: SelfTestRow, selfTestSummary() aggregating model + bridge + tax tests
  pages/
    index.astro      + Methodology card (prose + build-time gaps-list + param-table + selftest badge)
tests/lib/
  selftests.test.ts  NEW: all self-tests pass; total count; row shape
tests/pages/
  overview.test.ts   + methodology / param-table / selftest / gaps assertions
```

---

### Task 1: `src/lib/selftests.ts` — build-time self-test aggregator

**Files:**
- Create: `src/lib/selftests.ts`
- Test: `tests/lib/selftests.test.ts` (new)

**Interfaces:**
- Consumes: `selfTest` from `./model`; `bridgeSteps` from `./bridge`; `runOverviewMc` from `./overview`; `TAX_SELFTESTS` from `./taxmodel`.
- Produces: `interface SelfTestRow { name: string; ok: boolean; note: string }`; `function selfTestSummary(): { rows: SelfTestRow[]; passed: number; total: number }`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/selftests.test.ts`:
```ts
import { expect, test } from 'vitest';
import { selfTestSummary } from '../../src/lib/selftests';

test('selfTestSummary: every model + bridge + tax self-test passes', () => {
  const s = selfTestSummary();
  expect(s.total).toBeGreaterThanOrEqual(18); // ~11 model + bridge + 7 tax
  expect(s.passed).toBe(s.total);
  expect(s.rows.every((r) => typeof r.name === 'string' && typeof r.ok === 'boolean')).toBe(true);
  // the bridge-identity row is present
  expect(s.rows.some((r) => r.name.includes('Bridge decomposition'))).toBe(true);
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/lib/selftests.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Create `src/lib/selftests.ts`**

Port the aggregation from `docs/js/app.js:608-623` (model results + bridge identity + tax invariants):
```ts
/* Build-time self-test aggregator: reconciles the model self-tests
   (selfTest, {name,ok,note}), the bridge-decomposition identity check
   (bridgeSteps().identityError), and the tax invariants (TAX_SELFTESTS,
   {name,run}) into one flat list. Port of docs/js/app.js renderSelfTests
   (608-641) minus the DOM. Runs at build time; pure. */
import { selfTest, runOverviewMc } from './overview-or-model-imports';
import { bridgeSteps } from './bridge';
import { TAX_SELFTESTS } from './taxmodel';

export interface SelfTestRow { name: string; ok: boolean; note: string }

export function selfTestSummary(): { rows: SelfTestRow[]; passed: number; total: number } {
  const rows: SelfTestRow[] = selfTest().map(function (r) {
    return { name: r.name, ok: r.ok, note: r.note || '' };
  });

  const mc = runOverviewMc('SCN-BASE', null);
  const identityError = bridgeSteps(mc).identityError;
  rows.push({
    name: 'Bridge decomposition matches engine total exactly',
    ok: identityError < 0.01,
    note: 'err=' + identityError.toExponential(1)
  });

  for (const t of TAX_SELFTESTS) {
    let ok = false;
    let note = '';
    try { ok = !!t.run(); } catch (e) { note = String(e); }
    rows.push({ name: t.name, ok: ok, note: note });
  }

  const passed = rows.filter(function (r) { return r.ok; }).length;
  return { rows: rows, passed: passed, total: rows.length };
}
```
NOTE the import line is a placeholder pending Step 3a: use the real module paths — `selfTest` is exported from `./model`, and `runOverviewMc` from `./overview`. Replace the first import with:
```ts
import { selfTest } from './model';
import { runOverviewMc } from './overview';
```

- [ ] **Step 4: Verify PASS + type-check + no em dash**

Run: `pnpm exec vitest run tests/lib/selftests.test.ts` (PASS).
Run: `pnpm exec tsc --noEmit` (exit 0).
Run: `grep -c $'\u2014' src/lib/selftests.ts` (must print `0`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/selftests.ts tests/lib/selftests.test.ts
git commit -m "Add selftests.ts: build-time aggregator (model + bridge + tax invariants)"
```

---

### Task 2: Methodology card build-time in `index.astro`

**Files:**
- Modify: `src/pages/index.astro`
- Test: `tests/pages/overview.test.ts` (extend)

**Interfaces:**
- Consumes: `PARAM_DEFS` from `../lib/params`; `selfTestSummary` from `../lib/selftests`.
- Produces: the `<h2>Methodology and limits</h2>` card with the three note blocks, the `#gaps-box` warnbox containing `#gaps-list`, the `<details>` with `#param-table`, and the `#selftest` badge, all build-time. Placed after the household card, before the chapter-nav footer.

- [ ] **Step 1: Extend the failing test**

Add to `tests/pages/overview.test.ts`:
```ts
test('overview includes the build-time Methodology card', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('Methodology and limits');
  expect(html).toContain('id="param-table"');
  expect(html).toContain('id="gaps-list"');
  expect(html).toContain('id="selftest"');
  // param table rendered at build time (a known parameter label)
  expect(html).toContain('Real GDP growth');
  // self-test badge rendered at build time, all passing
  expect(html).toContain('model self-tests pass');
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/pages/overview.test.ts`
Expected: FAIL — Methodology card absent.

- [ ] **Step 3: Import data in the frontmatter**

In `src/pages/index.astro` frontmatter, add:
```astro
import { selfTestSummary } from '../lib/selftests';
const gapsList = ' ' + PARAM_DEFS.filter((p) => p.confidence === 'low').map((p) => p.label).join(' · ');
const selftests = selfTestSummary();
```
(Extend the existing `../lib/params` import to also pull `PARAM_DEFS`: it currently imports `PROBLEM_STATS, OUTCOME_STATS`. Add `PARAM_DEFS`.)

- [ ] **Step 4: Insert the Methodology card**

In `src/pages/index.astro`, immediately before the chapter-nav footer card (`<section class="card">` beginning `<span class="overview-kicker">Continue the story</span>`) and after the household card's closing `</section>`, insert the card. The three note blocks and warnbox/summary prose are verbatim from `docs/index.html:991-1040`; the gaps list, param table, and self-test badge are rendered from data:
```astro
    <section class="card">
      <h2>Methodology and limits</h2>
      <div class="note">
        <b>What this is:</b> a national-aggregate annual model. It computes
        the status-quo world and the NHA world category by category from CMS
        2023 calibration data, phases policy in over the Phase 0–8
        roadmap, and samples every uncertain parameter from a sourced
        low/central/high range (triangular distribution). Draws share a
        systemic optimism/pessimism factor (weight 0.35): runs where benefit
        expansions overrun also tend to be runs where savings levers
        underdeliver, which widens the tails compared with independent
        sampling. Employer premium savings pass through to wages (adjustable,
        40–95%, CBO convention) and the resulting income/payroll tax revenue
        feeds back into financing. Steady state is the 2040–2042 average.
      </div>
      <div class="note">
        <b>On the original headline figure:</b> earlier drafts
        asserted a mature cost of $4.75T/yr (2024 dollars) without a derivation.
        That figure is superseded by this model's computed projections; under
        central assumptions the model lands somewhat above it, and reaches it
        only under the optimistic scenario. The full comparison lives in the
        parameter table and scenario presets, not in the headline.
      </div>
      <div class="note">
        <b>What it still is not:</b> specialty-level queues and wait-time
        dynamics are not modeled, nor is provider behavioral response beyond
        the payment factor. Macroeconomic feedback stops at first-order wage
        pass-through with a fixed 28% marginal-rate revenue feedback; there
        are no general-equilibrium or labor-supply effects. The correlation
        structure is a single systemic factor, not a full covariance matrix.
        Geographic detail exists for the care network (see the Physical Care
        tab) but the fiscal model's costs and prices remain national
        averages. Health outcomes are displayed with sources in the section
        above, not converted into dollars. Demographic aging is decomposed
        and shown under the cost-path chart, but the model does not simulate
        cohorts individually.
      </div>
      <div class="warnbox" id="gaps-box">
        <b>Weakest assumptions.</b> These parameters have no direct real-world
        source and materially move the result. They are flagged
        <span class="conf low">low</span> in the controls and listed with their
        derivation anchors in the full parameter table below.
        <span id="gaps-list">{gapsList}</span>
      </div>
      <details class="tableview"><summary>Full parameter table with sources (the entire evidence base)</summary>
        <div class="tbl-scroll">
          <table class="data" id="param-table">
            <thead><tr>
              <th>Parameter</th><th class="num">Low</th><th class="num">Central</th>
              <th class="num">High</th><th>Unit</th><th>Confidence</th><th>Source</th>
            </tr></thead>
            <tbody>
              {PARAM_DEFS.map((p) => (
                <tr>
                  <td>{p.label}</td>
                  <td class="num">{(+p.low.toFixed(2)).toLocaleString('en-US')}</td>
                  <td class="num">{(+p.mode.toFixed(2)).toLocaleString('en-US')}</td>
                  <td class="num">{(+p.high.toFixed(2)).toLocaleString('en-US')}</td>
                  <td>{p.unit}</td>
                  <td><span class={"conf " + p.confidence}>{p.confidence}</span></td>
                  <td>{p.source} {p.url && (<a href={p.url} target="_blank" rel="noopener">[link]</a>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <div class="selftest" id="selftest">
        <div>Model integrity: <span class={selftests.passed === selftests.total ? 'pass' : 'fail'}>{
          selftests.passed === selftests.total
            ? 'All ' + selftests.total + ' model self-tests pass.'
            : (selftests.total - selftests.passed) + ' of ' + selftests.total + ' self-tests FAILING.'
        }</span></div>
        <ul>
          {selftests.rows.map((r) => (
            <li>{r.ok ? '✓ ' + r.name : '✗ ' + r.name + ': ' + r.note}</li>
          ))}
        </ul>
      </div>
    </section>
```

- [ ] **Step 5: Verify PASS + no em dash + build**

Run: `pnpm exec vitest run tests/pages/overview.test.ts` (PASS).
Run: `grep -c $'\u2014' src/pages/index.astro` (must print `0`).
Run: `pnpm check && pnpm build` (0 errors, 12 pages).

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro tests/pages/overview.test.ts
git commit -m "Add Overview Methodology card (build-time param table + gaps + self-test badge)"
```

---

### Task 3: Browser verification (Overview complete)

**Files:** none. Handoff browser workflow.

- [ ] **Step 1: Serve + inspect**

Confirm, after the household card and before the chapter-nav footer, the "Methodology and limits" card with: three `.note` blocks, a `#gaps-box` warnbox whose `#gaps-list` lists the low-confidence parameter labels (dot-separated), a collapsed `<details>` whose `#param-table` has a 7-column head (Low/Central/High are `.num`) and one row per `PARAM_DEFS` entry with a `.conf` badge and (where present) a `[link]`, and a `#selftest` block whose status reads `All N model self-tests pass.` with a `.pass` class and a `<ul>` of `✓` rows (no `✗`). `read_console_messages` — zero errors.

- [ ] **Step 2: Static-render check**

Confirm `dist/index.html` contains `Methodology and limits`, `id="param-table"`, `Real GDP growth`, `model self-tests pass`, and the gaps-list content directly (build-time, zero client JS). Grep `dist/index.html` for U+2014 (must be absent).

- [ ] **Step 3: Full Overview order + View Transitions**

Confirm the full Overview card order: Act 1-4, the four diagrams, the model section (hero → benchmarks), care cards, outcomes, household calc, **Methodology**, chapter-nav footer. Navigate to `/health` and back; confirm the Methodology card (param table + self-test badge) is intact with no console error.

---

## Overview page COMPLETE after this slice

With the Methodology card, `src/pages/index.astro` reproduces the entire docs Overview: narrative preamble (Acts 1-4 + four operating-system diagrams), the interactive model section (hero, controls, path chart, money-flow, financing, bridge, benchmarks, tables), the personal-impact coda (care cards, outcomes, household calculator), the Methodology card, and the chapter-nav footer.

## Follow-on (out of scope here)

- **P3 slice 12+:** the 11 remaining tabs (health, tax + `taxcharts.js`/`taxapp.js`, legislation, units, medications, data, workforce, gov, hardening, rollout, quality), each replacing its `[chapter].astro` stub (set `Tab.ported = true`), DOM-diffed vs live. The `selfTestSummary()` from this slice is reusable for any shared build-time self-test badge those tabs need.
- **P4/P5:** content collections; cutover.

## Self-review notes

- **Spec coverage:** implements the Methodology card in full — prose, gaps list, parameter table, and the reconciled self-test badge. Finishes the Overview.
- **No placeholders:** `selfTestSummary` and the card markup are fully specified; the only note is the corrected import path in Task 1 Step 3 (spelled out explicitly).
- **Type/name consistency:** `SelfTestRow`/`selfTestSummary` are new; they consume `selfTest(): SelfTestResult[]` (`{name,ok,note}`), `bridgeSteps(mc): {steps, identityError}`, and `TAX_SELFTESTS: {name, run()}[]` as they exist today; `PARAM_DEFS` fields used (`label`, `low`, `mode`, `high`, `unit`, `confidence`, `source`, `url`) match `ParamDef`; ids `#param-table`/`#gaps-list`/`#gaps-box`/`#selftest` and classes `note`/`warnbox`/`selftest`/`pass`/`fail`/`conf`/`data`/`num` match `docs` + `global.css`.
- **No em dash / no NaN:** prose uses U+2013; numeric cells use `toFixed(2)` on finite `PARAM_DEFS` numbers; the self-test badge is boolean-driven. Em-dash greps in both tasks; the pre-existing `!html.includes('—')` overview test guards the page.
- **Build-time correctness:** `selfTestSummary()` runs the same pure functions the Vitest suite already exercises, so a green build badge is guaranteed to match the test suite; rendering it at build time (not client) is safe because all inputs are static.
