# NHA Astro Migration — P2b: Tax Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the tax model (`taxparams.js`, `taxmodel.js`) from the vanilla `window.NHA.TAX` globals to typed ES modules under `src/lib/`, with its seven `NHA.SELFTESTS` invariants converted into a real Vitest suite.

**Architecture:** `taxparams.js` (pure parameter data on `NHA.TAX.*`) becomes `src/lib/taxparams.ts` with named exports; `taxmodel.js` (an IIFE of pure functions over `NHA.TAX.*`, aliased `T`) becomes `src/lib/taxmodel.ts` importing from `taxparams.ts`. The tax model is independent of the healthcare model (verified: no `runPath`/`BASE2023`/`sampleParams` references) so this plan touches nothing from P2. Behavior and numbers are preserved exactly.

**Tech Stack:** TypeScript (strict), Vitest 3.2.7, Astro 5 (installed). Pure computation only — no DOM.

## Global Constraints

- Platform: Windows. Bash tool or PowerShell. node 22.23.1 / pnpm 11.17.0 on PATH (Volta). Working dir: `C:\Users\micha\OneDrive\Desktop\Healthcare Framework\ChatGPT Work Outputs\Claude Outputs`.
- TypeScript `strict`. Avoid `any` (prefer precise interfaces); a scoped `Record<string, number>` cast is acceptable where the source indexes group objects by a dynamic column name.
- **Preserve behavior and numbers exactly.** Source of truth: `docs/js/taxparams.js` (413 lines) and `docs/js/taxmodel.js` (262 lines). Do not re-derive, re-tune, or "improve" any value or formula.
- **Do NOT modify anything under `docs/`.** Read-only source and parity truth.
- Modules are pure: no `window`, no `document`, no top-level side effects beyond building constant tables. Must import cleanly under Node (Vitest).
- No em dashes (—) in reader-visible ported strings (code comments may keep them). If a ported data string (e.g. an instrument `label`/`note`, scenario `desc`, president name) contains an em dash, PRESERVE IT verbatim for fidelity and note it for the P3 content pass — do NOT edit ported content in this plan.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Scope: tax model only. Tax CHARTS (`taxcharts.js`) and the tax view UI (`taxapp.js`) are OUT of scope (P3).

## File structure

```
src/lib/
  tax-types.ts     interfaces: TaxGroup, TaxInstrument, TaxProgram, TaxScenario,
                   InstrumentSetting, TaxSettings, DistributionRow, ComputeResult
  taxparams.ts     GROUPS, ECON, INSTRUMENTS, PROGRAMS, TOP_RATE_HISTORY,
                   PRESIDENTS, WEALTH_DIST, SCENARIOS   (from docs/js/taxparams.js)
  taxmodel.ts      defaultSettings, instrumentRevenue, compute, distribution,
                   solveScenario, TAX_SELFTESTS   (from docs/js/taxmodel.js)
tests/lib/
  taxparams.test.ts  data invariants (incidence sums, group shares, growth class)
  taxmodel.test.ts   engine invariants (reconciliation, linearity, scenarios, ramp) + aggregate
```

Reuse the P2 porting rules (see `specs/plans/2026-07-24-astro-migration-p2-model-engine.md` "Porting rules"): read the whole source, translate top-to-bottom preserving values, drop the `window.NHA` prologue, `export const`/`export function` each public name, convert `var`→`const`/`let`, replace the `T = NHA.TAX` alias with imports from `./taxparams`.

Public tax API (from `docs/js/taxmodel.js`), signatures to preserve exactly:
- `defaultSettings(): TaxSettings`
- `instrumentRevenue(ins: TaxInstrument, st: InstrumentSetting, year: number): number`
- `compute(settings: TaxSettings, programs: TaxProgram[]): ComputeResult` where `ComputeResult` has at least `{ years: number[]; totalRev: number[]; need: number[] }` plus every other field the source returns
- `distribution(settings: TaxSettings, year: number, healthReliefB: number, wageGainB?: number): DistributionRow[]` where each `DistributionRow` has at least `{ taxB: number }` plus every other field the source row carries
- `solveScenario(scn: TaxScenario, programs: TaxProgram[]): TaxSettings`

---

### Task 1: Types + `taxparams.ts`

**Files:**
- Create: `src/lib/tax-types.ts`
- Create: `src/lib/taxparams.ts`  (port of `docs/js/taxparams.js`)
- Test: `tests/lib/taxparams.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces:
  - `TaxGroup` — read `NHA.TAX.GROUPS` entries; must include `id: string` and the share columns `wageShare, capShare, consumpShare, healthRelief` (numbers) plus every other field present (label, incomeShare, households, etc.).
  - `TaxInstrument` — read `NHA.TAX.INSTRUMENTS`; must include `id: string`, `incidence: Record<string, number>` (keyed by group id), `growth?: string`, `rev1x: number`, `scaleMax?: number`, plus every other field.
  - `TaxProgram`, `TaxScenario` (has optional `balancer`), and the exported constants.
  - `const GROUPS: TaxGroup[]`, `ECON` (includes `growthRates: Record<string, number>`, `realGrowth: number`, `baseYear: number`), `INSTRUMENTS: TaxInstrument[]`, `PROGRAMS: TaxProgram[]`, `TOP_RATE_HISTORY`, `PRESIDENTS`, `WEALTH_DIST`, `SCENARIOS: TaxScenario[]`.

- [ ] **Step 1: Write the failing params tests**

`tests/lib/taxparams.test.ts` (mirrors tax self-tests #1, #2, #6):
```ts
import { expect, test } from 'vitest';
import { INSTRUMENTS, GROUPS, ECON } from '../../src/lib/taxparams';

test("every instrument's incidence shares sum to 1", () => {
  for (const ins of INSTRUMENTS) {
    let s = 0;
    for (const g of GROUPS) s += ins.incidence[g.id] || 0;
    expect(Math.abs(s - 1)).toBeLessThan(0.005);
  }
});

test('group shares (wage/cap/consumption/relief) each sum to 1', () => {
  const cols = ['wageShare', 'capShare', 'consumpShare', 'healthRelief'] as const;
  for (const c of cols) {
    let s = 0;
    for (const g of GROUPS) s += (g as unknown as Record<string, number>)[c];
    expect(Math.abs(s - 1)).toBeLessThan(0.01);
  }
});

test('every instrument has a valid growth class', () => {
  for (const ins of INSTRUMENTS) {
    expect(ECON.growthRates[ins.growth || 'gdp']).not.toBeUndefined();
    expect(ECON.growthRates[ins.growth || 'gdp']).not.toBeNull();
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run tests/lib/taxparams.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/taxparams`.

- [ ] **Step 3: Port `docs/js/taxparams.js` to `src/lib/taxparams.ts`**

Read the full source. Drop the `window.NHA`/`NHA.TAX = {}` prologue. `export const` each `NHA.TAX.X` (GROUPS, ECON, INSTRUMENTS, PROGRAMS, TOP_RATE_HISTORY, PRESIDENTS, WEALTH_DIST, SCENARIOS). If `INSTRUMENTS` is built inside an IIFE/helper in the source (it is defined at an indented position), preserve that construction exactly, exporting the final array. Import the interfaces from `./tax-types`. Preserve every numeric literal, incidence value, and string verbatim.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run tests/lib/taxparams.test.ts`
Expected: PASS (3/3). If incidence sums fail, an instrument's incidence map lost a group key — recheck against the source.

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tax-types.ts src/lib/taxparams.ts tests/lib/taxparams.test.ts
git commit -m "Port taxparams.js to typed src/lib/taxparams.ts with data invariants"
```

---

### Task 2: `taxmodel.ts`

**Files:**
- Modify: `src/lib/tax-types.ts` (add `InstrumentSetting`, `TaxSettings`, `DistributionRow`, `ComputeResult` if not already added)
- Create: `src/lib/taxmodel.ts`  (port of `docs/js/taxmodel.js`)
- Test: `tests/lib/taxmodel.test.ts`

**Interfaces:**
- Consumes: `GROUPS`, `ECON`, `INSTRUMENTS`, `PROGRAMS`, `SCENARIOS` from `./taxparams`; interfaces from `./tax-types`.
- Produces (exact signatures from the Public tax API above):
  - `defaultSettings`, `instrumentRevenue`, `compute`, `distribution`, `solveScenario`
  - `TAX_SELFTESTS: { name: string; run: () => boolean }[]` — the same seven checks the source registers on `NHA.SELFTESTS`, exported as an array so a future build-time badge can aggregate them alongside the healthcare `selfTest()`.

- [ ] **Step 1: Add the remaining interfaces to `src/lib/tax-types.ts`**

Read `docs/js/taxmodel.js` `defaultSettings`/`compute`/`distribution` and derive:
- `InstrumentSetting { value: number; enabled: boolean; phaseStart?: number; phaseYears?: number; /* + any field defaultSettings sets */ }`
- `TaxSettings { instruments: Record<string, InstrumentSetting>; /* + any other field */ }`
- `DistributionRow { taxB: number; /* + every field a distribution row carries */ }`
- `ComputeResult { years: number[]; totalRev: number[]; need: number[]; /* + every other field compute returns */ }`

- [ ] **Step 2: Write the failing engine tests**

`tests/lib/taxmodel.test.ts` (mirrors tax self-tests #3, #4, #5, #7, plus an aggregate over all seven):
```ts
import { expect, test } from 'vitest';
import {
  compute, distribution, solveScenario, defaultSettings,
  instrumentRevenue, TAX_SELFTESTS,
} from '../../src/lib/taxmodel';
import { PROGRAMS, INSTRUMENTS, SCENARIOS, ECON } from '../../src/lib/taxparams';

test('distribution burden reconciles with total revenue within 0.5%', () => {
  const s = defaultSettings();
  const year = 2040;
  const rows = distribution(s, year, 0);
  const sumTax = rows.reduce((a, r) => a + r.taxB, 0);
  const c = compute(s, PROGRAMS);
  const total = c.totalRev[c.years.indexOf(year)];
  expect(Math.abs(sumTax - total) / total).toBeLessThan(0.005);
});

test('revenue is linear in a scale instrument setting', () => {
  const s1 = defaultSettings();
  const s2 = defaultSettings();
  s2.instruments.payroll.value = 2 * s1.instruments.payroll.value;
  const ins = INSTRUMENTS.filter((i) => i.id === 'payroll')[0];
  const a = instrumentRevenue(ins, s1.instruments.payroll, 2040);
  const b = instrumentRevenue(ins, s2.instruments.payroll, 2040);
  expect(Math.abs(b - 2 * a)).toBeLessThan(1e-9);
});

test('every goal scenario meets the funding goal', () => {
  const goals = SCENARIOS.filter((sc) => sc.balancer);
  expect(goals.length).toBeGreaterThan(0);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  for (const sc of goals) {
    const s = solveScenario(sc, PROGRAMS);
    const c = compute(s, PROGRAMS);
    const i41 = c.years.indexOf(2041);
    expect(c.totalRev[i41]).toBeGreaterThanOrEqual(c.need[i41]);
    expect(sum(c.totalRev)).toBeGreaterThanOrEqual(sum(c.need));
  }
});

test('phase-in ramps from 0 to full', () => {
  const ins = INSTRUMENTS.filter((i) => i.id === 'surtax')[0];
  const st = { value: 1, enabled: true, phaseStart: 2029, phaseYears: 4 };
  const before = instrumentRevenue(ins, st, 2028);
  const mid = instrumentRevenue(ins, st, 2030);
  const full = instrumentRevenue(ins, st, 2035) /
    Math.pow(1 + ECON.realGrowth, 2035 - ECON.baseYear);
  expect(before).toBe(0);
  expect(mid).toBeGreaterThan(0);
  expect(mid).toBeLessThan(full * 0.75);
  expect(Math.abs(full - ins.rev1x)).toBeLessThan(1);
});

test('all seven tax self-test invariants pass', () => {
  expect(TAX_SELFTESTS.length).toBe(7);
  const failing = TAX_SELFTESTS.filter((t) => !t.run()).map((t) => t.name);
  expect(failing).toEqual([]);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm exec vitest run tests/lib/taxmodel.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/taxmodel`.

- [ ] **Step 4: Port `docs/js/taxmodel.js` to `src/lib/taxmodel.ts`**

Read the full source. Port the IIFE body: private helpers `growth`, `classGrowth`, `ramp`, and public `defaultSettings`, `instrumentRevenue`, `compute`, `distribution`, `solveScenario`, preserving every formula, ramp schedule, phase-in math, and the auto-balancing solver exactly. Replace `var T = NHA.TAX` with `import { GROUPS, ECON, INSTRUMENTS, PROGRAMS, SCENARIOS } from './taxparams'` and refer to them directly. Convert the seven `NHA.SELFTESTS.push({name, run})` registrations into an exported `TAX_SELFTESTS` array literal with the same `name` strings and `run` bodies (they reference the exported functions/constants now, not `T.*`). Type against `./tax-types`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run tests/lib/taxmodel.test.ts`
Expected: PASS (5/5), including the aggregate reporting zero failing invariants. If the reconciliation test fails, a `distribution` or `compute` term diverged — compare against the source.

- [ ] **Step 6: Run the full suite + type-check + build**

Run: `pnpm test && pnpm check && pnpm build`
Expected: all Vitest tests pass (P1 shell + P2 model + these tax tests), `astro check` 0 errors, `tsc --noEmit` exit 0, build exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/tax-types.ts src/lib/taxmodel.ts tests/lib/taxmodel.test.ts
git commit -m "Port taxmodel.js to src/lib/taxmodel.ts with seven tax invariants"
```

---

## Follow-on plans (out of scope here)

- **P3 — Tabs:** port each view to `.astro` + islands (this is where `care.js`, `charts.js`, `taxcharts.js`, `taxapp.js`, and the other render modules land), each DOM-diffed against the live original, plus the em-dash/content pass over ported `desc`/`label` strings.
- **P4 — Content collections:** move sourced catalogs into Zod-validated Astro content collections.
- **P5 — Cutover:** flip the deploy workflow to `on: push`, switch Pages source to GitHub Actions, retire the old `docs/` files.

## Self-review notes

- Spec coverage: implements the design spec's tax-model port ("port taxparams.js + taxmodel.js ... convert the seven NHA.SELFTESTS tax invariants into Vitest"). Tax charts + view UI deferred to P3 (documented, and in the scope constraint).
- No unresolved placeholders: "read the source and cover every field" is inherent to a faithful port (the source file IS the data-shape spec); each is paired with a test that fails if a field is dropped.
- Type/name consistency: `TaxGroup`, `TaxInstrument`, `TaxProgram`, `TaxScenario`, `InstrumentSetting`, `TaxSettings`, `DistributionRow`, `ComputeResult` are defined in `tax-types.ts` and consumed by taxparams/taxmodel/tests with the same names; `defaultSettings`, `instrumentRevenue`, `compute`, `distribution`, `solveScenario` keep their source signatures across tasks and tests.
- Invariant coverage: taxparams.test (#1 incidence, #2 group shares, #6 growth class) + taxmodel.test (#3 reconcile, #4 linearity, #5 scenarios, #7 ramp) + aggregate `TAX_SELFTESTS` all-pass = all seven checks.
