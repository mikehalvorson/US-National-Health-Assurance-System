# NHA Astro Migration - P3 (slice 11b): Overview household calculator + flow-takeaway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Overview's interactive "Your household's annual healthcare bill" calculator (a profile picker whose tax-share line is computed live from the model) and the `#flow-takeaway` sentence on the "How the money re-routes" card.

**Architecture:** `src/lib/care.ts` gains the verbatim `HOUSEHOLD_PROFILES` data + `HOUSEHOLDS_M` constant (pure). A new client DOM module `src/lib/household.ts` ports `renderHouseholdCalc` (a `<select>` + two columns + caveat footnote) and returns a re-render function. `src/lib/money-flow.ts` gains a pure `flowTakeawayText(mc, DEF)` builder. `src/pages/index.astro` adds the household-calc card (after the outcomes card) and the empty `#flow-takeaway` div (on the existing money-reroute card). `src/scripts/overview-client.ts` fills the flow-takeaway text and wires the household calculator into the shared-mc `render()` hub so its tax line updates on every scenario/slider change.

**Tech Stack:** Astro 5, TypeScript strict, Vitest 3.2.7. Consumes `HOUSEHOLD_PROFILES`/`HOUSEHOLDS_M`/`moneyRange` from `src/lib/care.ts`, `money` from `src/lib/format.ts`, and the mature-year detail from the shared `MonteCarloResult`.

## Global Constraints

- Platform: Windows. Bash tool or PowerShell. node 22.23.1 / pnpm 11.17.0 (Volta). Working dir: `C:\Users\micha\OneDrive\Desktop\Healthcare Framework\ChatGPT Work Outputs\Claude Outputs`.
- TypeScript `strict`; avoid gratuitous `any`.
- **Fidelity:** `HOUSEHOLD_PROFILES` + `HOUSEHOLDS_M` verbatim from `docs/js/care.js:120-151`. `renderHouseholdCalc` ports `docs/js/care.js:204-272` exactly (same labels, same KPP-C8 formula `0.05 * newRevenueB * 1e9 / (HOUSEHOLDS_M * 1e6)`, same caveat text). `flowTakeawayText` ports `docs/js/app.js:482-489` exactly. The household model number is `mc.modePath.detail[mc.years.length - 2].newRevenue * DEF` (plain DEF) per `modelNumbersForHousehold` (`docs/js/app.js:133-135`). The flow-takeaway uses the money-flow scaling `k = (mc.steady.matureToday.p50 / d.nheNha) * DEF` with `d = mc.modePath.detail[mc.years.indexOf(2041)]` (same `d`/`k`/`newRev` as `nhaFlowSpec`). Do NOT re-derive any value.
- No em dashes ( - , U+2014) in reader-visible output. Note the source uses the curly apostrophes `’` inside `$0` notes and `“ ”` in the flow-takeaway; reproduce those exactly (they are not U+2014). En dash `–` (U+2013) allowed. Grep for U+2014 after each task; must be 0.
- The household card markup + prose verbatim from `docs/index.html:732-740`; the `#flow-takeaway` element from `docs/index.html:809` (`<div class="takeaway" id="flow-takeaway"></div>`). All `hh-*` and `.takeaway` CSS already exists in `src/styles/global.css`.
- Client must stay idempotent across View Transitions (guarded by `#controls dataset.wired`, as today); the household re-render closure is created fresh inside `initOverview`.
- Do NOT modify `docs/` or the engine modules (params/model/scenarios/tax*). You MAY edit `src/lib/care.ts`, `src/lib/money-flow.ts`, `src/scripts/overview-client.ts`, `src/pages/index.astro`, and create `src/lib/household.ts`, plus tests.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Placement (locked):** the household-calc card goes AFTER the outcomes card ("Beyond dollars…") and BEFORE the chapter-nav footer (`<span class="overview-kicker">Continue the story</span>`). Slice 11c later inserts the Methodology card between the household card and the chapter-nav footer. The `#flow-takeaway` div goes at the END of the existing "How the money re-routes" card (the section whose `<h2>` is `How the money re-routes`, immediately before the "Who pays" card).
- **Scope:** household calculator + `#flow-takeaway` ONLY. DEFERRED: Methodology card + `#param-table` + `#gaps-list` + self-test badge (slice 11c).

## File structure

```
src/
  lib/
    care.ts          + HouseholdProfile type, HOUSEHOLD_PROFILES (verbatim), HOUSEHOLDS_M
    household.ts     NEW client DOM module: renderHouseholdCalc(container, getModelNumbers) => rerender
    money-flow.ts    + flowTakeawayText(mc, DEF): string  (pure)
  pages/
    index.astro      + household-calc card (after outcomes) + #flow-takeaway div (money-reroute card)
  scripts/
    overview-client.ts  render() fills #flow-takeaway + inits/re-renders the household calc
tests/lib/
  care.test.ts       + HOUSEHOLD_PROFILES shape
  money-flow.test.ts  NEW (or extend): flowTakeawayText assertions
tests/pages/
  overview.test.ts   + household-calc / flow-takeaway container assertions
```

---

### Task 1: `care.ts` - HOUSEHOLD_PROFILES + HOUSEHOLDS_M

**Files:**
- Modify: `src/lib/care.ts`
- Test: `tests/lib/care.test.ts` (extend)

**Interfaces:**
- Produces: `interface HouseholdProfile { id: string; label: string; premium: CareAmount; oop: CareAmount; confidence: string }`; `const HOUSEHOLDS_M: number` (132.2); `const HOUSEHOLD_PROFILES: HouseholdProfile[]` (4 entries). Reuses `CareAmount` (`{lo,hi,note}`) already in `care.ts`.

- [ ] **Step 1: Extend the failing test**

Add to `tests/lib/care.test.ts`:
```ts
import { HOUSEHOLD_PROFILES, HOUSEHOLDS_M } from '../../src/lib/care';

test('HOUSEHOLD_PROFILES: four profiles, employer-family first', () => {
  expect(HOUSEHOLD_PROFILES).toHaveLength(4);
  expect(HOUSEHOLD_PROFILES[0].id).toBe('emp-family');
  expect(HOUSEHOLD_PROFILES[0].premium.lo).toBe(6850);
  expect(HOUSEHOLDS_M).toBeCloseTo(132.2, 5);
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/lib/care.test.ts`
Expected: FAIL - exports missing.

- [ ] **Step 3: Add the exports to `src/lib/care.ts`**

Append after `CARE_SCENARIOS`:
```ts
export interface HouseholdProfile {
  id: string;
  label: string;
  premium: CareAmount;
  oop: CareAmount;
  confidence: string;
}

/* docs/js/care.js:120 - Census 2024, millions of U.S. households */
export const HOUSEHOLDS_M = 132.2;

/* docs/js/care.js:122-151 (verbatim) */
export const HOUSEHOLD_PROFILES: HouseholdProfile[] = [
  {
    id: 'emp-family',
    label: 'Family with employer coverage',
    premium: { lo: 6850, hi: 6850, note: 'worker share of family premium (KFF 2025)' },
    oop: { lo: 2500, hi: 5500, note: 'deductibles, copays, coinsurance; household average is about $3,825 (derived from CMS)' },
    confidence: 'medium'
  },
  {
    id: 'emp-single',
    label: 'Single person with employer coverage',
    premium: { lo: 1492, hi: 1492, note: 'worker share (~16%) of a $9,325 single premium (KFF 2025)' },
    oop: { lo: 800, hi: 2500, note: 'per-person average ≈ $1,514 (derived from CMS)' },
    confidence: 'medium'
  },
  {
    id: 'marketplace',
    label: 'Family buying marketplace coverage',
    premium: { lo: 6000, hi: 18000, note: 'varies enormously with age, state, and subsidy eligibility; enhanced subsidies expired in 2026' },
    oop: { lo: 3000, hi: 9000, note: 'marketplace deductibles are typically much higher than employer plans' },
    confidence: 'low'
  },
  {
    id: 'uninsured',
    label: 'Uninsured adult',
    premium: { lo: 0, hi: 0, note: 'no premium, no protection' },
    oop: { lo: 500, hi: 5000, note: 'averages hide the real risk: one hospitalization can mean five-figure debt' },
    confidence: 'low'
  }
];
```

- [ ] **Step 4: Verify PASS + type-check + no em dash**

Run: `pnpm exec vitest run tests/lib/care.test.ts` (PASS).
Run: `pnpm exec tsc --noEmit` (exit 0).
Run: `grep -c $'\u2014' src/lib/care.ts` (must print `0`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/care.ts tests/lib/care.test.ts
git commit -m "Add HOUSEHOLD_PROFILES + HOUSEHOLDS_M to care.ts (verbatim)"
```

---

### Task 2: `flowTakeawayText` builder in `money-flow.ts`

**Files:**
- Modify: `src/lib/money-flow.ts`
- Test: `tests/lib/money-flow.test.ts` (create, or extend if it exists)

**Interfaces:**
- Consumes: `MonteCarloResult`, `money` (already imported in `money-flow.ts`).
- Produces: `function flowTakeawayText(mc: MonteCarloResult, DEF: number): string` reproducing `docs/js/app.js:482-489`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/money-flow.test.ts` (or add to an existing money-flow test file):
```ts
import { expect, test } from 'vitest';
import { flowTakeawayText } from '../../src/lib/money-flow';
import { runMonteCarlo } from '../../src/lib/model';
import { DEFLATOR_2023_TO_2024 as DEF } from '../../src/lib/params';

test('flowTakeawayText: mentions new revenue and household relief, no NaN/em dash', () => {
  const mc = runMonteCarlo('SCN-BASE', null, 600, 42);
  const s = flowTakeawayText(mc, DEF);
  expect(s).toContain('Same care');
  expect(s).toContain('/yr');
  expect(s.includes('NaN')).toBe(false);
  expect(s.includes('\u2014')).toBe(false);
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/lib/money-flow.test.ts`
Expected: FAIL - `flowTakeawayText` not exported.

- [ ] **Step 3: Add `flowTakeawayText` to `src/lib/money-flow.ts`**

Append (reusing the same `d`/`k`/`newRev` derivation as `nhaFlowSpec`, and `d.householdRelief`):
```ts
/* app.js:482-489 - the "How the money re-routes" takeaway sentence. */
export function flowTakeawayText(mc: MonteCarloResult, DEF: number): string {
  const i41 = mc.years.indexOf(2041);
  const d = mc.modePath.detail[i41];
  const k = (mc.steady.matureToday.p50 / d.nheNha) * DEF;
  const newRev = d.newRevenue * k;
  return (
    'Same care, roughly the same total spending, different routes. Today a family pays ' +
    'premiums to an insurer and bills at the point of care; under NHA those payments stop, ' +
    'and the money reaches the same doctors and hospitals through public financing instead. ' +
    'The ' + money(newRev) + '/yr of “new revenue” (at 2024 scale) is new to the ' +
    'federal budget, not new cost to society. Most of it replaces the ' +
    money(d.householdRelief * k) + '/yr households currently spend on premiums and ' +
    'out-of-pocket care, which drops to roughly zero.'
  );
}
```

- [ ] **Step 4: Verify PASS + type-check + no em dash**

Run: `pnpm exec vitest run tests/lib/money-flow.test.ts` (PASS).
Run: `pnpm exec tsc --noEmit` (exit 0).
Run: `grep -c $'\u2014' src/lib/money-flow.ts` (must print `0`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/money-flow.ts tests/lib/money-flow.test.ts
git commit -m "Add flowTakeawayText builder (money re-routes takeaway sentence)"
```

---

### Task 3: `household.ts` - client DOM calculator module

DOM builder (browser-verified in Task 6, like the other `src/lib` chart/DOM modules; not unit-tested since the test env has no `document`).

**Files:**
- Create: `src/lib/household.ts`

**Interfaces:**
- Consumes: `HOUSEHOLD_PROFILES`, `HOUSEHOLDS_M`, `moneyRange` from `./care`; `money` from `./format`.
- Produces: `interface HouseholdModelNumbers { newRevenueB: number }`; `function renderHouseholdCalc(container: HTMLElement, getModelNumbers: () => HouseholdModelNumbers): () => void` - builds the picker + columns once, returns a `render` function the caller invokes whenever the model recomputes.

- [ ] **Step 1: Create `src/lib/household.ts`**

Port `docs/js/care.js:204-272` exactly, returning the internal `render` instead of assigning `NHA._rerenderHousehold`:
```ts
/* Household annual calculator: client DOM port of docs/js/care.js
   renderHouseholdCalc (204-272). The tax-share line reads live model numbers
   via getModelNumbers(), supplied by the Overview client so it tracks the
   shared Monte Carlo run. KPP-C8: ordinary households bear <=5% of new financing. */
import { HOUSEHOLD_PROFILES, HOUSEHOLDS_M, moneyRange } from './care';
import { money } from './format';

export interface HouseholdModelNumbers { newRevenueB: number }

export function renderHouseholdCalc(
  container: HTMLElement,
  getModelNumbers: () => HouseholdModelNumbers
): () => void {
  container.innerHTML = '';

  function div(cls: string, parent: HTMLElement | null, text?: string): HTMLDivElement {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    if (parent) parent.appendChild(d);
    return d;
  }

  const picker = div('hh-picker', container);
  const lab = document.createElement('label');
  lab.textContent = 'Your situation: ';
  lab.setAttribute('for', 'hh-select');
  const sel = document.createElement('select');
  sel.id = 'hh-select';
  HOUSEHOLD_PROFILES.forEach(function (p) {
    const o = document.createElement('option');
    o.value = p.id; o.textContent = p.label;
    sel.appendChild(o);
  });
  picker.appendChild(lab); picker.appendChild(sel);

  const grid = div('hh-grid', container);
  const todayCol = div('hh-col', grid);
  const nhaCol = div('hh-col hh-col-nha', grid);
  const foot = div('hh-foot note', container);

  function render(): void {
    const p = HOUSEHOLD_PROFILES.filter(function (x) { return x.id === sel.value; })[0] ||
              HOUSEHOLD_PROFILES[0];
    const m = getModelNumbers();
    /* KPP-C8: 5% of incremental financing, $B -> $/household */
    const kppShare = (0.05 * m.newRevenueB * 1e9) / (HOUSEHOLDS_M * 1e6);

    todayCol.innerHTML = ''; nhaCol.innerHTML = '';

    div('hh-col-head', todayCol, 'Today (per year)');
    const tPrem = div('hh-line', todayCol);
    div('hh-line-label', tPrem, 'Premiums');
    div('hh-line-val', tPrem, moneyRange(p.premium.lo, p.premium.hi));
    div('hh-line-note', todayCol, p.premium.note);
    const tOop = div('hh-line', todayCol);
    div('hh-line-label', tOop, 'Out-of-pocket care costs');
    div('hh-line-val', tOop, moneyRange(p.oop.lo, p.oop.hi));
    div('hh-line-note', todayCol, p.oop.note);
    const tTot = div('hh-line hh-total', todayCol);
    div('hh-line-label', tTot, 'Typical total');
    div('hh-line-val', tTot, moneyRange(p.premium.lo + p.oop.lo, p.premium.hi + p.oop.hi));

    div('hh-col-head', nhaCol, 'Under NHA at maturity (per year)');
    const nPrem = div('hh-line', nhaCol);
    div('hh-line-label', nPrem, 'Premiums');
    div('hh-line-val', nPrem, '$0');
    const nOop = div('hh-line', nhaCol);
    div('hh-line-label', nOop, 'Point-of-care costs for covered care');
    div('hh-line-val', nOop, '$0');
    div('hh-line-note', nhaCol, 'covered medically necessary care is free at the point of use (KPP-A3 allows ≤0.5% billing exceptions); non-covered extras remain private');
    const nTax = div('hh-line', nhaCol);
    div('hh-line-label', nTax, 'Avg. household share of new taxes if financed per the plan’s cap');
    div('hh-line-val', nTax, '≤ $' + Math.round(kppShare).toLocaleString('en-US'));
    div('hh-line-note', nhaCol,
      'the plan caps ordinary households at 5% of new financing: 5% of the model’s ' +
      money(m.newRevenueB) + '/yr new-revenue requirement ÷ ' + HOUSEHOLDS_M + 'M households. ' +
      'The rest falls on wealth, high-income, employer, and health-sector taxes, if those levers deliver.');

    foot.textContent =
      'Honest caveats: employer payroll contributions are widely expected to show up partly in wages over time (not modeled); ' +
      'the uninsured today spend little on average because they skip care, so the comparison understates what coverage is worth to them; ' +
      'and the tax line depends entirely on Congress honoring the plan’s household-protection cap.';
  }

  sel.addEventListener('change', render);
  render();
  return render;
}
```

- [ ] **Step 2: Type-check + no em dash**

Run: `pnpm exec tsc --noEmit` (exit 0).
Run: `grep -c $'\u2014' src/lib/household.ts` (must print `0`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/household.ts
git commit -m "Add household.ts client calculator (DOM port of renderHouseholdCalc)"
```

---

### Task 4: Markup - household-calc card + #flow-takeaway div

**Files:**
- Modify: `src/pages/index.astro`
- Test: `tests/pages/overview.test.ts` (extend)

**Interfaces:**
- Produces: the household card (with empty `#household-calc`) after the outcomes card; the empty `#flow-takeaway` div on the money-reroute card. Both are client-filled (empty at build time).

- [ ] **Step 1: Extend the failing test**

Add to `tests/pages/overview.test.ts`:
```ts
test('overview includes the household-calc and flow-takeaway containers', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('id="household-calc"');
  expect(html).toContain("Your household's annual healthcare bill");
  expect(html).toContain('id="flow-takeaway"');
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/pages/overview.test.ts`
Expected: FAIL - containers absent.

- [ ] **Step 3: Insert the household-calc card**

In `src/pages/index.astro`, immediately before the chapter-nav footer card (`<section class="card">` beginning `<span class="overview-kicker">Continue the story</span>`) and after the outcomes card's closing `</section>`, insert (verbatim from `docs/index.html:732-740`):
```astro
    <section class="card">
      <h2>Your household's annual healthcare bill</h2>
      <p class="desc">Premiums plus out-of-pocket costs today, versus the
        mature system, where the question for a household becomes the tax
        design. The tax line below is computed live from this model's financing
        results and the plan's household-protection cap.</p>
      <div id="household-calc"></div>
    </section>
```

- [ ] **Step 4: Insert the #flow-takeaway div on the money-reroute card**

In the existing "How the money re-routes" card, add the takeaway div at the end of the card. Locate the money-reroute section's closing (its `</div>` closing `.flow-grid` then `</section>`, immediately followed by the "Who pays" card) and insert the div before that `</section>`:
```astro
      <div class="takeaway" id="flow-takeaway"></div>
```
so the section ends:
```astro
      <div class="flow-grid">
        ...
      </div>
      <div class="takeaway" id="flow-takeaway"></div>
    </section>
```

- [ ] **Step 5: Verify PASS + no em dash + build**

Run: `pnpm exec vitest run tests/pages/overview.test.ts` (PASS).
Run: `grep -c $'\u2014' src/pages/index.astro` (must print `0`).
Run: `pnpm check && pnpm build` (0 errors, 12 pages).

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro tests/pages/overview.test.ts
git commit -m "Add Overview household-calc card + flow-takeaway container"
```

---

### Task 5: Client wiring in `overview-client.ts`

**Files:**
- Modify: `src/scripts/overview-client.ts`

**Interfaces:**
- Consumes: `renderHouseholdCalc`, `HouseholdModelNumbers` from `../lib/household`; `flowTakeawayText` from `../lib/money-flow`.
- Produces: on every `render()`, `#flow-takeaway` text is set and the household calc is initialised once then re-rendered with fresh model numbers.

- [ ] **Step 1: Add imports**

In `src/scripts/overview-client.ts`, add:
```ts
import { flowTakeawayText } from '../lib/money-flow';
import { renderHouseholdCalc } from '../lib/household';
import type { HouseholdModelNumbers } from '../lib/household';
```
(Extend the existing `money-flow` import rather than duplicating it: it currently imports `todayFlowSpec, nhaFlowSpec, nhaFlowTitle` - add `flowTakeawayText` to that list.)

- [ ] **Step 2: Declare the household state inside `initOverview`**

Just before the `render` function definition (after `const $ = ...`), add:
```ts
  let householdRerender: (() => void) | null = null;
  let householdNumbers: HouseholdModelNumbers = { newRevenueB: 0 };
```

- [ ] **Step 3: Fill flow-takeaway + wire the household calc at the end of `render()`**

At the end of the `render()` body (after the `fillTable('financing-table', ...)` line), add:
```ts
    const takeaway = $('flow-takeaway');
    if (takeaway) takeaway.textContent = flowTakeawayText(mc, DEF);

    const hh = $('household-calc');
    if (hh) {
      householdNumbers = { newRevenueB: mc.modePath.detail[mc.years.length - 2].newRevenue * DEF };
      if (!householdRerender) {
        householdRerender = renderHouseholdCalc(hh, () => householdNumbers);
      } else {
        householdRerender();
      }
    }
```
(The `getModelNumbers` closure reads the outer `householdNumbers`, which is reassigned before each re-render, so the tax line always reflects the latest run - mirroring how `docs/js/app.js` closes over its live `mc`.)

- [ ] **Step 4: Full suite + check + build**

Run: `pnpm test && pnpm check && pnpm build`
Expected: all green (72+ tests), 0 type errors, 12 pages.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/overview-client.ts
git commit -m "Wire the household calculator + flow-takeaway into the Overview client"
```

---

### Task 6: Browser verification

**Files:** none. Handoff browser workflow: `pnpm preview --port <N>` background, `mcp__Claude_Browser__preview_start {url}` + `javascript_tool`.

- [ ] **Step 1: Serve + inspect the household calc**

Confirm the household card (after the outcomes card) renders `#household-calc` with an `#hh-select` (4 options), a `.hh-grid` with two `.hh-col`s, a "Typical total" line, an NHA `≤ $N` tax line (no `NaN`), and a `.hh-foot` caveat. Change `#hh-select` to "Uninsured adult" and confirm the Today column updates (premium `$0`). `read_console_messages` - zero errors.

- [ ] **Step 2: Tax line tracks the model**

Read the `#hh-select` NHA tax line value, then change the scenario picker (`#scenario-select`) to an optimistic and a pessimistic scenario; confirm the `≤ $N` value changes (it is driven by `newRevenue`), and the `#flow-takeaway` sentence's dollar figures change too. Confirm no `NaN` anywhere.

- [ ] **Step 3: flow-takeaway present**

Confirm the "How the money re-routes" card ends with a filled `#flow-takeaway` (contains "Same care" and two `/yr` dollar figures).

- [ ] **Step 4: View Transitions**

Navigate to `/health` and back; confirm the household calc re-initialises (single `#hh-select`, no duplicate), the tax line and flow-takeaway are filled, and there is no console error.

---

## Follow-on slice (out of scope here)

- **P3 slice 11c:** the Methodology card (`docs/index.html:991-1040`): static prose + build-time `#gaps-list` (low-confidence `PARAM_DEFS` labels) + `#param-table` (full `PARAM_DEFS`) + `#selftest` badge (reconciling `selfTest()` and the tax `SELFTESTS`/`TAX_SELFTESTS` shapes). Insert between the household card and the chapter-nav footer. Finishes the Overview page.

## Self-review notes

- **Spec coverage:** implements the interactive household calculator + `#flow-takeaway`. Methodology deferred to 11c.
- **No placeholders:** `HOUSEHOLD_PROFILES`, `renderHouseholdCalc`, and `flowTakeawayText` are given in full; the client wiring shows exact insertion points and closure semantics.
- **Type/name consistency:** `HouseholdProfile`/`HOUSEHOLD_PROFILES`/`HOUSEHOLDS_M` reuse `CareAmount` from `care.ts`; `HouseholdModelNumbers.newRevenueB` matches the `getModelNumbers` contract; `flowTakeawayText(mc, DEF)` mirrors the `nhaFlowSpec(mc, DEF)` signature and reuses its `d`/`k`; ids `#household-calc`/`#hh-select`/`#flow-takeaway` and classes `hh-*`/`takeaway` match `docs` + existing `global.css`.
- **Fidelity/NaN:** household number uses `detail[years.length-2].newRevenue * DEF` (plain DEF, per `modelNumbersForHousehold`); flow-takeaway uses the money-flow `k` scaling (per `renderMoneyFlow`); both reuse already-verified model fields, so no new NaN surface. Em-dash greps in every task; the pre-existing `!html.includes(' - ')` overview test guards the page.
- **View-Transition safety:** `householdRerender`/`householdNumbers` live inside `initOverview`, recreated on each `astro:page-load`; the `#controls dataset.wired` guard prevents double-wiring within one page instance.
