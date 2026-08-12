# NHA Astro Migration - P2: Healthcare Model Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the healthcare model core (`params`, `scenarios`, `model`) from the vanilla `window.NHA` globals in `docs/js/*.js` to typed ES modules under `src/lib/`, with the engine's nine self-test invariants converted into a real Vitest suite that runs on every commit.

**Architecture:** Each `docs/js/<name>.js` file that assigns onto the `window.NHA` global becomes a `src/lib/<name>.ts` module with explicit named exports; internal `NHA.x` references become ES `import`s. Behavior and numbers are preserved exactly (this is a translation, not a redesign). The old `NHA.selfTest()` return contract (`{ name, ok, note }[]`) is preserved as an exported function AND its nine checks are additionally expressed as discrete Vitest tests so failures are legible.

**Tech Stack:** TypeScript (strict), Vitest 3.2.7, Astro 5 (already installed). Pure computation only - no DOM, no Astro components in this plan.

## Global Constraints

- Platform: Windows. Bash tool or PowerShell. node 22.23.1 / pnpm 11.17.0 on PATH (via Volta). Working dir: `C:\Users\micha\OneDrive\Desktop\Healthcare Framework\ChatGPT Work Outputs\Claude Outputs`.
- TypeScript `strict` mode. No `any` except where a faithful port genuinely requires it (prefer precise interfaces).
- **Preserve behavior and numbers exactly.** The source of truth for every value and formula is the corresponding `docs/js/<name>.js` file. Do not "improve", re-derive, or re-tune any number or formula.
- **Do NOT modify anything under `docs/`.** It is the read-only live site and the parity source of truth.
- Dollars are internal real-2023; `DEFLATOR_2023_TO_2024 = 1.026`. This plan does no display conversion (that is UI, later).
- No em dashes ( - ) in any reader-visible string that is ported (code comments may keep them).
- Modules are pure: no `window`, no `document`, no top-level side effects beyond building constant tables. A ported module must import cleanly in a Node (Vitest) environment.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Scope: healthcare core only. Tax model (`taxparams`/`taxmodel`), `care.js`, and chart modules are explicitly OUT of scope (separate P2b / P3 plans).

## File structure

```
src/lib/
  model-types.ts   shared interfaces (ParamDef, Triangular, DetailRow, PathResult, ...)
  params.ts        constants + PARAM_DEFS + PARAMS_BY_ID + BASE2023 + RAMPS + BENCHMARKS
                   + MONEYFLOW + PROBLEM_STATS + PARAM_CORR + CORR_WEIGHT + AGE_STRUCTURE
                   + OUTCOME_STATS + DEFLATOR_2023_TO_2024   (from docs/js/params.js)
  scenarios.ts     SCENARIOS + SCENARIOS_BY_ID + effectiveParams()   (from docs/js/scenarios.js)
  model.ts         sampleParams + runPath + matureAtScale + runMonteCarlo + selfTest
                   (from docs/js/model.js)
tests/lib/
  params.test.ts   params-level invariants (calibration sum, ramp shapes, age shares)
  scenarios.test.ts effectiveParams behavior
  model.test.ts    engine invariants + aggregate selfTest() all-pass
```

Source line counts for reference: `params.js` 524, `scenarios.js` 230, `model.js` 470.

## Porting rules (apply in every port task)

1. Read the whole source file first. Translate top to bottom, preserving order, values, and formulas verbatim.
2. Replace the `var NHA = window.NHA || {}; window.NHA = NHA;` prologue with ES `import`s for anything the file consumes from other modules, and `export` for everything it defines that another module or a test needs.
3. `NHA.FOO = ...` becomes `export const FOO = ...` (or `export function FOO`). Internal references to `NHA.FOO` defined in the same file become bare `FOO`; references to `NHA.FOO` defined in another module become an `import { FOO } from './that-module'`.
4. Add types from `src/lib/model-types.ts`. Where the source builds a lookup table imperatively (e.g. `PARAMS_BY_ID`), keep that logic but type the result.
5. Keep `"use strict"` semantics implicitly (ES modules are always strict). Convert `var` to `const`/`let`.
6. Do not change numeric literals, rounding, iteration bounds, or comparison thresholds.

---

### Task 1: Shared types + `params.ts`

**Files:**
- Create: `src/lib/model-types.ts`
- Create: `src/lib/params.ts`  (port of `docs/js/params.js`)
- Test: `tests/lib/params.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces (used by scenarios.ts, model.ts, and tests):
- `interface Triangular { low: number; mode: number; high: number }`
- `interface ParamDef extends Triangular { id: string; /* plus every metadata field present on entries of docs/js/params.js NHA.PARAM_DEFS: label, unit, source, confidence ('high'|'medium'|'low'), adjustable?, group?, and any others - keep them all */ }`
- `const START_YEAR = 2027`, `END_YEAR = 2042`, `PRE_YEARS = 4`
- `const DEFLATOR_2023_TO_2024 = 1.026`
- `const PARAM_DEFS: ParamDef[]`, `const PARAMS_BY_ID: Record<string, ParamDef>`
- `const BASE2023` (object with all fields from the source, including any derived field such as `investmentResidual` that `docs/js/params.js` adds after the literal)
- `const RAMPS` (includes `transitionShape: number[]`, `itCapitalShape: number[]`)
- `const BENCHMARKS`, `const MONEYFLOW`, `const PROBLEM_STATS`, `const CORR_WEIGHT = 0.35`, `const PARAM_CORR`, `const AGE_STRUCTURE` (`{ bands: { share2024: number; share2041: number; ... }[] }`), `const OUTCOME_STATS`, `const FRAMEWORK_CLAIM`

- [ ] **Step 1: Create `src/lib/model-types.ts`**

Define the interfaces the engine needs. Start with:
```ts
export interface Triangular {
  low: number;
  mode: number;
  high: number;
}

export interface ParamDef extends Triangular {
  id: string;
  label?: string;
  unit?: string;
  source?: string;
  confidence?: 'high' | 'medium' | 'low';
  adjustable?: boolean;
  // Add any additional fields present on entries of docs/js/params.js
  // NHA.PARAM_DEFS. Read that array and cover every field - do not drop metadata.
}
```
(You will extend this file with `DetailRow`/`PathResult` in Task 3; leave room.)

- [ ] **Step 2: Write the failing params tests**

`tests/lib/params.test.ts` (these mirror self-test checks #1, #2, and #9 from `docs/js/model.js:selfTest`):
```ts
import { expect, test } from 'vitest';
import { BASE2023, RAMPS, AGE_STRUCTURE } from '../../src/lib/params';

test('2023 categories sum to the CMS NHE total (calibration invariant)', () => {
  const B = BASE2023 as Record<string, number>;
  const listed =
    B.hospital + B.physician + B.otherProf + B.dental + B.otherPersonal +
    B.homeHealth + B.nursing + B.rxRetail + B.dme + B.nondurables +
    B.netInsCost + B.govtAdmin + B.publicHealth + B.investmentResidual;
  expect(Math.abs(listed - B.nheTotal)).toBeLessThan(0.11);
});

test('transition outlay shape sums to 100%', () => {
  const s = RAMPS.transitionShape.reduce((a, b) => a + b, 0);
  expect(Math.abs(s - 1)).toBeLessThan(1e-9);
});

test('IT capital shape sums to 100%', () => {
  const s = RAMPS.itCapitalShape.reduce((a, b) => a + b, 0);
  expect(Math.abs(s - 1)).toBeLessThan(1e-9);
});

test('age-structure shares sum to 1 in 2024 and 2041', () => {
  let s24 = 0, s41 = 0;
  for (const b of AGE_STRUCTURE.bands) { s24 += b.share2024; s41 += b.share2041; }
  expect(Math.abs(s24 - 1)).toBeLessThan(0.005);
  expect(Math.abs(s41 - 1)).toBeLessThan(0.005);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm exec vitest run tests/lib/params.test.ts`
Expected: FAIL - cannot resolve `../../src/lib/params` (module not created yet).

- [ ] **Step 4: Port `docs/js/params.js` to `src/lib/params.ts`**

Follow the porting rules. Read `docs/js/params.js` in full; translate every constant top-to-bottom, preserving all values. Drop the `window.NHA` prologue; `export const` each `NHA.X`. Rebuild `PARAMS_BY_ID` with the same loop, typed as `Record<string, ParamDef>`. Import `ParamDef`, `Triangular` from `./model-types`. Preserve any derived `BASE2023` field the source computes after the literal (e.g. `investmentResidual`).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run tests/lib/params.test.ts`
Expected: PASS (4/4). If the calibration sum fails, the ported `BASE2023` is missing a field the source defines - re-check against `docs/js/params.js`.

- [ ] **Step 6: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/model-types.ts src/lib/params.ts tests/lib/params.test.ts
git commit -m "Port params.js to typed src/lib/params.ts with calibration invariants"
```

---

### Task 2: `scenarios.ts`

**Files:**
- Create: `src/lib/scenarios.ts`  (port of `docs/js/scenarios.js`)
- Test: `tests/lib/scenarios.test.ts`

**Interfaces:**
- Consumes: `PARAM_DEFS` from `./params`.
- Produces:
- `const SCENARIOS` (array of scenario objects, each with at least `id: string` and `overrides: Record<string, [number,number,number] | { mult: number }>`)
- `const SCENARIOS_BY_ID: Record<string, typeof SCENARIOS[number]>`
- `function effectiveParams(scenarioId: string, sliderModes: Record<string, number> | null): Record<string, Triangular>`
- returns, for every `ParamDef`, its `{ low, mode, high }` after applying the scenario override and any slider-mode shift, exactly as `docs/js/scenarios.js` does.

- [ ] **Step 1: Write the failing scenarios tests**

`tests/lib/scenarios.test.ts`:
```ts
import { expect, test } from 'vitest';
import { effectiveParams, SCENARIOS_BY_ID } from '../../src/lib/scenarios';
import { PARAM_DEFS } from '../../src/lib/params';

test('SCN-BASE effective params return an entry per ParamDef with low<=mode<=high', () => {
  const eff = effectiveParams('SCN-BASE', null);
  expect(Object.keys(eff).length).toBe(PARAM_DEFS.length);
  for (const p of PARAM_DEFS) {
    const e = eff[p.id];
    expect(e).toBeDefined();
    expect(e.low).toBeLessThanOrEqual(e.mode);
    expect(e.mode).toBeLessThanOrEqual(e.high);
  }
});

test('unknown scenario id falls back to SCN-BASE', () => {
  expect(SCENARIOS_BY_ID['SCN-BASE']).toBeDefined();
  const unknown = effectiveParams('SCN-DOES-NOT-EXIST', null);
  const base = effectiveParams('SCN-BASE', null);
  expect(unknown).toEqual(base);
});

test('a slider mode overrides the mode for that parameter', () => {
  const targetId = PARAM_DEFS[0].id;
  const eff = effectiveParams('SCN-BASE', { [targetId]: 3 });
  expect(eff[targetId].mode).toBe(3);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run tests/lib/scenarios.test.ts`
Expected: FAIL - cannot resolve `../../src/lib/scenarios`.

- [ ] **Step 3: Port `docs/js/scenarios.js` to `src/lib/scenarios.ts`**

Read the full source. Translate `NHA.SCENARIOS`, the `SCENARIOS_BY_ID` build, and `NHA.effectiveParams` verbatim. `import { PARAM_DEFS } from './params'` and `import type { Triangular } from './model-types'`. `effectiveParams` must reproduce the source's override + slider logic exactly (array override replaces the triple; `{mult}` scales; slider shifts mode and rescales spread).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run tests/lib/scenarios.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/scenarios.ts tests/lib/scenarios.test.ts
git commit -m "Port scenarios.js to src/lib/scenarios.ts with effectiveParams tests"
```

---

### Task 3: `model.ts` core - `sampleParams` + `runPath`

**Files:**
- Modify: `src/lib/model-types.ts` (add `DetailRow`, `PathResult`, `SampledParams`)
- Create: `src/lib/model.ts` (first half: `sampleParams`, `runPath`)
- Test: `tests/lib/model.test.ts` (create; run-based invariants)

**Interfaces:**
- Consumes: `BASE2023`, `RAMPS`, `PARAM_CORR`, `CORR_WEIGHT`, `START_YEAR`, `PARAMS_BY_ID`, etc. from `./params`; `effectiveParams` from `./scenarios`.
- Produces:
- `function sampleParams(effective: Record<string, Triangular>, rand: (() => number) | null, z?: number): SampledParams`
- `rand === null` returns mode values; a `rand` function draws; `z` is the shared systemic factor. Reproduce `docs/js/model.js` `NHA.sampleParams` exactly.
- `function runPath(p: SampledParams, structural: object): PathResult`
- `PathResult` has at least `detail: DetailRow[]` and `baseline: number[]`.
- `DetailRow` includes the fields the invariants read: `nheNha`, `nheBase`, `cHosp`, `cClin`, `cOtherPhc`, `offProvAdmin`, `offExtraction`, `offCareModel`, `offLowValue`, `newRevenue`, `wageGain`, `taxFeedback` (plus every other field the source row carries - port them all).
- `SampledParams` is the object shape `sampleParams` returns (it has mutable fields the self-tests set directly: `utilIncrease`, `drugPriceCut`, `providerPaymentFactor`, `wagePassThrough`, and the many others zeroed in self-test #3 - type it to include every field the source assigns).

- [ ] **Step 1: Extend `src/lib/model-types.ts`**

Add interfaces derived from `docs/js/model.js`. `DetailRow` must include (at minimum) the fields listed in the Interfaces block above; read `runPath` in the source and add every field it writes to a detail row. Add `PathResult { detail: DetailRow[]; baseline: number[]; /* + any other arrays/fields runPath returns */ }`. Add `SampledParams` covering every field `sampleParams` sets.

- [ ] **Step 2: Write the failing engine tests (run-based invariants)**

`tests/lib/model.test.ts` (mirrors self-test checks #3, #4, #5, #7, #8):
```ts
import { expect, test } from 'vitest';
import { sampleParams, runPath } from '../../src/lib/model';
import { effectiveParams } from '../../src/lib/scenarios';
import { START_YEAR } from '../../src/lib/params';

const effective = effectiveParams('SCN-BASE', null);

test('neutral policy reproduces the baseline within 0.5% (no free lunch)', () => {
  const n = sampleParams(effective, null);
  n.utilIncrease = 0; n.drugPriceCut = 0; n.providerPaymentFactor = 1;
  n.providerAdminSavings = 0; n.careModelSavings = 0; n.lowValueCapture = 0;
  n.extractionSavings = 0; n.ltcExpansion = 0; n.bhExpansion = 0;
  n.dvhExpansion = 0; n.emsPhExpansion = 0; n.unitsCost = 0; n.rdPublic = 0;
  n.workforceEdu = 0; n.itOperating = 0; n.itCapital = 0; n.transitionTotal = 0;
  n.legacyAdminFloor = 1; n.publicAdminRate = 0; n.governanceRate = 0;
  const path = runPath(n, {});
  const last = path.detail[path.detail.length - 1];
  const relDiff = Math.abs(last.nheNha - last.nheBase) / last.nheBase;
  expect(relDiff).toBeLessThan(0.005);
});

test('baseline trajectory is monotonically increasing', () => {
  const path = runPath(sampleParams(effective, null), {});
  for (let i = 1; i < path.baseline.length; i++) {
    expect(path.baseline[i]).toBeGreaterThan(path.baseline[i - 1]);
  }
});

test('offsets are always smaller than their source categories', () => {
  const path = runPath(sampleParams(effective, null), {});
  for (const d of path.detail) {
    expect(d.offProvAdmin + d.offExtraction).toBeLessThan(d.cHosp + d.cClin);
    expect(d.offCareModel).toBeLessThan(d.cHosp);
    expect(d.offLowValue).toBeLessThan(d.cHosp + d.cClin + d.cOtherPhc);
  }
});

test('correlated draws: z=+1 raises costs and cuts savings vs z=-1', () => {
  const fixed = () => 0.5;
  const hi = sampleParams(effective, fixed, 1);
  const lo = sampleParams(effective, fixed, -1);
  expect(hi.utilIncrease).toBeGreaterThan(lo.utilIncrease);
  expect(hi.drugPriceCut).toBeLessThan(lo.drugPriceCut);
});

test('wage pass-through feedback is 28% of wage gain and lowers new revenue', () => {
  const p0 = sampleParams(effective, null); p0.wagePassThrough = 0;
  const p9 = sampleParams(effective, null); p9.wagePassThrough = 95;
  const idx = 2041 - START_YEAR;
  const d0 = runPath(p0, {}).detail[idx];
  const d9 = runPath(p9, {}).detail[idx];
  expect(d0.newRevenue).toBeGreaterThan(d9.newRevenue);
  expect(Math.abs(d9.taxFeedback - 0.28 * d9.wageGain)).toBeLessThan(0.01);
  expect(d0.wageGain).toBe(0);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm exec vitest run tests/lib/model.test.ts`
Expected: FAIL - cannot resolve `../../src/lib/model`.

- [ ] **Step 4: Port `sampleParams` and `runPath` into `src/lib/model.ts`**

Read `docs/js/model.js` in full. Port `NHA.sampleParams` and `NHA.runPath` (and any private helpers they call) into `src/lib/model.ts`, preserving all formulas, ramp application, offset derivations, and financing block exactly. `import` the constants from `./params` and `effectiveParams` from `./scenarios` as needed. Do not port `matureAtScale`/`runMonteCarlo`/`selfTest` yet (Task 4). Type against `model-types`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run tests/lib/model.test.ts`
Expected: PASS (5/5). If the neutral-policy test fails, a savings/offset term was not fully neutralized - compare the ported `runPath` line-by-line against the source.

- [ ] **Step 6: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/model-types.ts src/lib/model.ts tests/lib/model.test.ts
git commit -m "Port model.js sampleParams + runPath with engine invariants"
```

---

### Task 4: `model.ts` completion - `matureAtScale`, `runMonteCarlo`, `selfTest`

**Files:**
- Modify: `src/lib/model.ts` (add `matureAtScale`, `runMonteCarlo`, `selfTest`)
- Modify: `tests/lib/model.test.ts` (add mature-at-scale, MC ordering, and aggregate self-test)

**Interfaces:**
- Consumes: `sampleParams`, `runPath` from Task 3; constants from `./params`; `effectiveParams` from `./scenarios`.
- Produces:
- `function matureAtScale(p: SampledParams, structural: object, yearsFrom2023: number): { nheNha: number; /* + other fields the source returns */ }`
- `function runMonteCarlo(scenarioId: string, sliderModes: Record<string, number> | null, nRuns: number, seed: number): { yearBands: { p10: number; p50: number; p90: number }[]; /* + other fields */ }`
- `function selfTest(): { name: string; ok: boolean; note: string }[]` - the exact nine-check contract from `docs/js/model.js`, preserved so a build-time badge can consume it later.

- [ ] **Step 1: Write the failing tests (mature-at-scale, MC ordering, aggregate)**

Append to `tests/lib/model.test.ts` (mirrors self-test checks #5b, #6, and the aggregate):
```ts
import { matureAtScale, runMonteCarlo, selfTest } from '../../src/lib/model';

test('mature-at-scale matches the 2041 path value', () => {
  const p = sampleParams(effective, null);
  const d2041 = runPath(p, {}).detail[2041 - START_YEAR];
  const mas = matureAtScale(p, {}, 18);
  const err = Math.abs(mas.nheNha - d2041.nheNha) / d2041.nheNha;
  expect(err).toBeLessThan(0.001);
});

test('Monte Carlo percentile bands are ordered (p10 <= p50 <= p90)', () => {
  const mc = runMonteCarlo('SCN-BASE', null, 60, 7);
  for (const b of mc.yearBands) {
    expect(b.p10).toBeLessThanOrEqual(b.p50 + 1e-9);
    expect(b.p50).toBeLessThanOrEqual(b.p90 + 1e-9);
  }
});

test('selfTest() reports all nine invariants passing', () => {
  const results = selfTest();
  expect(results.length).toBeGreaterThanOrEqual(9);
  const failing = results.filter((r) => !r.ok).map((r) => r.name);
  expect(failing).toEqual([]);
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `pnpm exec vitest run tests/lib/model.test.ts`
Expected: FAIL - `matureAtScale`, `runMonteCarlo`, `selfTest` not exported yet.

- [ ] **Step 3: Port `matureAtScale`, `runMonteCarlo`, and `selfTest`**

Port these three functions from `docs/js/model.js` into `src/lib/model.ts`, preserving the seeded RNG, percentile computation, and every self-test check verbatim (the nine checks read `BASE2023`, `RAMPS`, `effectiveParams`, `sampleParams`, `runPath`, `matureAtScale`, `runMonteCarlo`, `AGE_STRUCTURE`). `selfTest` returns the same `{ name, ok, note }[]` array.

- [ ] **Step 4: Run the whole model suite to verify it passes**

Run: `pnpm exec vitest run tests/lib/model.test.ts`
Expected: PASS (8/8), including `selfTest()` reporting zero failing invariants.

- [ ] **Step 5: Run the full suite + type-check + build**

Run: `pnpm test && pnpm check && pnpm build`
Expected: all Vitest tests pass (shell tests from P1 + the new lib tests), `astro check` 0 errors, `tsc --noEmit` exit 0, build exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/model.ts tests/lib/model.test.ts
git commit -m "Complete model.ts port: matureAtScale, runMonteCarlo, selfTest suite"
```

---

## Follow-on plans (out of scope here)

- **P2b - Tax model:** port `docs/js/taxparams.js` + `taxmodel.js` to `src/lib/tax*.ts`; convert the seven `NHA.SELFTESTS` tax invariants into Vitest.
- **P3 - Tabs:** port each view to `.astro` pages + island components (this is where `care.js`, `charts.js`, `taxcharts.js`, and the other render modules land), each DOM-diffed against the live original.
- **P4 - Content collections:** move the sourced catalogs into Zod-validated Astro content collections.
- **P5 - Cutover:** flip the deploy workflow to `on: push`, switch Pages source to GitHub Actions, retire the old `docs/` files.

## Self-review notes

- Spec coverage: implements the design spec's P2 "port the model engine ... converting NHA.selfTest() ... into Vitest suites" for the healthcare core. Tax model, care, and charts are explicitly deferred (documented above and in the scope constraint).
- No unresolved placeholders: the only "read the source and cover every field" instructions are inherent to a faithful port (the source file IS the authoritative spec for its data shape); each is paired with a concrete test that fails if a field is dropped.
- Type/name consistency: `Triangular`, `ParamDef`, `SampledParams`, `DetailRow`, `PathResult` are defined in `model-types.ts` and consumed by params/scenarios/model with the same names; `effectiveParams`, `sampleParams`, `runPath`, `matureAtScale`, `runMonteCarlo`, `selfTest` keep their source signatures across tasks and tests.
- Invariant coverage: params.test (#1, #2, #9) + model.test (#3, #4, #5, #5b, #6, #7, #8) + aggregate `selfTest()` all-pass = the full nine-check catalog.
