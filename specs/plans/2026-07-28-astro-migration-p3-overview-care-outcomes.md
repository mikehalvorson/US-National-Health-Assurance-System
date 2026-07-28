# NHA Astro Migration — P3 (slice 11a): Overview care-cost cards + outcomes tiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the two pure-static Overview personal-impact sections — "What you'd pay for care" (10 point-of-care cost cards) and "Beyond dollars: what the model does not price" (outcome-stat tiles) — as build-time HTML with zero client JS.

**Architecture:** A new `src/lib/care.ts` holds the verbatim `CARE_SCENARIOS` data (ported from `docs/js/care.js`) plus a `moneyRange` formatter. `src/pages/index.astro` renders the care cards from `CARE_SCENARIOS` and the outcome tiles from the already-ported `OUTCOME_STATS` (in `src/lib/params.ts`), both at build time, inserted after the benchmark card and before the chapter-nav footer. All required CSS (`.care-*`, `.tiles`, `.conf`) already exists in `src/styles/global.css`.

**Tech Stack:** Astro 5 (build-time template), TypeScript strict, Vitest 3.2.7. Consumes `CARE_SCENARIOS`/`moneyRange` from `src/lib/care.ts` and `OUTCOME_STATS` from `src/lib/params.ts`. No client JS, no model, no charts.

## Global Constraints

- Platform: Windows. Bash tool or PowerShell. node 22.23.1 / pnpm 11.17.0 on PATH (Volta). Working dir: `C:\Users\micha\OneDrive\Desktop\Healthcare Framework\ChatGPT Work Outputs\Claude Outputs`.
- TypeScript `strict`; avoid gratuitous `any`.
- **Fidelity:** `CARE_SCENARIOS` copied verbatim (every number, note, source, confidence) from `docs/js/care.js:20-111`. The card markup reproduces `NHA.renderCareCards` (`docs/js/care.js:167-199`) structure exactly. The outcomes tiles reproduce `renderOutcomeTiles` (`docs/js/app.js:493-509`). The section prose is verbatim from `docs/index.html:707-730`. Do not re-derive any value.
- `moneyRange(lo, hi)` ports `docs/js/care.js:162-165` exactly: `lo === hi` renders `$N`; else `$lo – $hi`. The separator is space + EN DASH (U+2013) + space, and integers use `toLocaleString('en-US')`. The en dash is allowed; it is NOT U+2014.
- No em dashes (—, U+2014) in reader-visible output. Grep after the markup task; must be 0.
- Zero client JS added. Both sections render fully at build time. Do NOT touch `src/scripts/overview-client.ts`.
- Do NOT modify anything under `docs/` or the `src/lib/*` engine modules (params/model/scenarios/tax*). You MAY create `src/lib/care.ts`, and edit `src/pages/index.astro`, `tests/*`.
- Base path `/US-National-Health-Assurance-System/`.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Placement (locked):** insert the "What you'd pay for care" card then the "Beyond dollars" card AFTER the `benchmark-section` card and BEFORE the chapter-nav footer card (the one beginning `<span class="overview-kicker">Continue the story</span>`). Later slices insert the household calculator (11b) and Methodology card (11c) between the outcomes card and the chapter-nav footer.
- **Scope:** care-cost cards + outcomes tiles ONLY. DEFERRED: household calculator + `#flow-takeaway` (slice 11b); Methodology card + `#param-table` + `#gaps-list` + self-test badge (slice 11c).

## File structure

```
src/
  lib/
    care.ts            NEW: CareScenario type, CARE_SCENARIOS (verbatim), moneyRange()
  pages/
    index.astro        + care-cards section + outcome-tiles section
                         (after benchmark-section, before chapter-nav footer)
tests/lib/
  care.test.ts         NEW: moneyRange + CARE_SCENARIOS shape
tests/pages/
  overview.test.ts     + care/outcomes build-time assertions
```

---

### Task 1: `src/lib/care.ts` — CARE_SCENARIOS + moneyRange

**Files:**
- Create: `src/lib/care.ts`
- Test: `tests/lib/care.test.ts` (new)

**Interfaces:**
- Produces: `interface CareAmount { lo: number; hi: number; note: string }`; `interface CareNha { amount: number; fromYear: number; note: string }`; `interface CareScenario { id: string; title: string; todayInsured: CareAmount; todayUninsured: CareAmount; nha: CareNha; source: string; confidence: string }`; `const CARE_SCENARIOS: CareScenario[]`; `function moneyRange(lo: number, hi: number): string`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/care.test.ts`:
```ts
import { expect, test } from 'vitest';
import { CARE_SCENARIOS, moneyRange } from '../../src/lib/care';

test('moneyRange: equal lo/hi collapses to one figure', () => {
  expect(moneyRange(0, 0)).toBe('$0');
  expect(moneyRange(6850, 6850)).toBe('$6,850');
});

test('moneyRange: distinct lo/hi renders an en-dash range with no em dash', () => {
  const r = moneyRange(150, 1500);
  expect(r).toBe('$150 \u2013 $1,500');
  expect(r.includes('\u2014')).toBe(false);
});

test('CARE_SCENARIOS: ten scenarios, first is the premium card', () => {
  expect(CARE_SCENARIOS).toHaveLength(10);
  expect(CARE_SCENARIOS[0].id).toBe('premium');
  expect(CARE_SCENARIOS[0].nha.amount).toBe(0);
  expect(CARE_SCENARIOS.every((s) => typeof s.confidence === 'string')).toBe(true);
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/lib/care.test.ts`
Expected: FAIL — `src/lib/care.ts` does not exist.

- [ ] **Step 3: Create `src/lib/care.ts`**

Create the file with the type definitions, the `moneyRange` helper (verbatim logic from `docs/js/care.js:162-165`), and `CARE_SCENARIOS` copied verbatim from `docs/js/care.js:20-111`:
```ts
/* Point-of-care cost comparison data, ported verbatim from docs/js/care.js
   (CARE_SCENARIOS 20-111, moneyRange 162-165). "Today" figures are national
   averages/typical ranges; NHA is $0 at the point of care with the phase-in
   year noted. Fidelity-critical: do not re-derive any value. */

export interface CareAmount { lo: number; hi: number; note: string }
export interface CareNha { amount: number; fromYear: number; note: string }
export interface CareScenario {
  id: string;
  title: string;
  todayInsured: CareAmount;
  todayUninsured: CareAmount;
  nha: CareNha;
  source: string;
  confidence: string;
}

export function moneyRange(lo: number, hi: number): string {
  const m = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
  return lo === hi ? m(lo) : m(lo) + ' \u2013 ' + m(hi);
}

export const CARE_SCENARIOS: CareScenario[] = [
  // ... paste all ten objects verbatim from docs/js/care.js:20-111,
  //     converting the JS object literals to this typed array (keys are
  //     already valid identifiers; keep every lo/hi/note/fromYear/source/
  //     confidence value exactly as written).
];
```
Paste the ten scenario objects (`premium`, `er`, `childbirth`, `insulin`, `mri`, `ambulance`, `labs`, `therapy`, `hearing`, `nursing`) exactly as in `docs/js/care.js:20-111`. Keep the en dashes inside notes (e.g. `2023–24`, `$2–6/vial`, `5–6×`) as U+2013.

- [ ] **Step 4: Run to verify PASS + type-check**

Run: `pnpm exec vitest run tests/lib/care.test.ts` (PASS, 3/3).
Run: `pnpm exec tsc --noEmit` (exit 0).
Run: `grep -c $'\u2014' src/lib/care.ts` (must print `0`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/care.ts tests/lib/care.test.ts
git commit -m "Add care.ts: verbatim CARE_SCENARIOS + moneyRange (point-of-care costs)"
```

---

### Task 2: care-cost cards + outcomes tiles build-time in `index.astro`

**Files:**
- Modify: `src/pages/index.astro`
- Test: `tests/pages/overview.test.ts` (extend)

**Interfaces:**
- Consumes: `CARE_SCENARIOS`, `moneyRange` from `../lib/care`; `OUTCOME_STATS` from `../lib/params`.
- Produces: the `#care-card-section` card (with `#care-cards` grid) and the outcomes card (with `#outcome-tiles`), rendered at build time, placed after the benchmark card and before the chapter-nav footer.

- [ ] **Step 1: Extend the failing test**

Add to `tests/pages/overview.test.ts`:
```ts
test('overview includes build-time care cards and outcome tiles', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('id="care-cards"');
  expect(html).toContain('What you\'d pay for care');
  expect(html).toContain('id="outcome-tiles"');
  expect(html).toContain('Beyond dollars: what the model does not price');
  // a care value rendered at build time (premium card: worker share $6,850)
  expect(html).toContain('$6,850');
  // an outcome stat rendered at build time
  expect(html).toContain('20,000–68,000');
  // care cards render one .care-card per scenario
  expect((html.match(/class="care-card"/g) ?? []).length).toBe(10);
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/pages/overview.test.ts`
Expected: FAIL — care/outcomes absent.

- [ ] **Step 3: Import the data in the frontmatter**

In `src/pages/index.astro` frontmatter, add:
```astro
import { CARE_SCENARIOS, moneyRange } from '../lib/care';
import { PROBLEM_STATS, OUTCOME_STATS } from '../lib/params';
```
(NOTE: `PROBLEM_STATS` is already imported from `../lib/params` for the Act-2 tiles; extend that existing import to also pull `OUTCOME_STATS` rather than adding a duplicate import line.)

- [ ] **Step 4: Insert the two cards**

In `src/pages/index.astro`, immediately before the chapter-nav footer card (the `<section class="card">` that begins with `<span class="overview-kicker">Continue the story</span>`) and after the `benchmark-section` card's closing `</section>`, insert:
```astro
    <section class="card" id="care-card-section">
      <h2>What you'd pay for care</h2>
      <p class="desc">Here is what that design means for real care episodes:
        today's typical cost with employer insurance, without insurance, and
        under NHA, with the year each benefit arrives, assuming enactment in
        2027.</p>
      <div class="care-grid" id="care-cards">
        {CARE_SCENARIOS.map((s) => (
          <div class="care-card">
            <div class="care-title">{s.title}</div>
            <div class="care-rows">
              <div class="care-row">
                <div class="care-row-label">Today, typical insured</div>
                <div class="care-row-val">{moneyRange(s.todayInsured.lo, s.todayInsured.hi)}</div>
              </div>
              <div class="care-row-note">{s.todayInsured.note}</div>
              <div class="care-row">
                <div class="care-row-label">Today, uninsured</div>
                <div class="care-row-val">{moneyRange(s.todayUninsured.lo, s.todayUninsured.hi)}</div>
              </div>
              <div class="care-row-note">{s.todayUninsured.note}</div>
            </div>
            <div class="care-nha">
              <div class="care-nha-line">
                <div class="care-nha-label">Under NHA</div>
                <div class="care-nha-val">$0</div>
                <div class="care-year-chip" title="Assuming enactment in 2027; see the phase roadmap.">from ~{s.nha.fromYear}</div>
              </div>
              <div class="care-nha-note">{s.nha.note}</div>
            </div>
            <div class="care-src">Source: {s.source} <span class={"conf " + s.confidence}>{s.confidence}</span></div>
          </div>
        ))}
      </div>
    </section>

    <section class="card">
      <h2>Beyond dollars: what the model does not price</h2>
      <p class="desc">Some effects of universal coverage are well documented
        but deliberately kept out of the cost arithmetic, because turning
        lives and solvency into dollars invites false precision. They belong
        in the picture anyway. Each figure notes the NHA mechanism that
        addresses it.</p>
      <div class="tiles" id="outcome-tiles">
        {OUTCOME_STATS.map((s) => (
          <div class="tile">
            <div class="value">{s.value}</div>
            <div class="label">{s.label}</div>
            <div class="range">{s.note} <span class={"conf " + s.confidence}>{s.confidence}</span></div>
          </div>
        ))}
      </div>
      <p class="note">The utilization-increase parameter in the model is the
        cost side of these same effects: people who stop skipping care start
        using it. The model prices that; it does not claim credit for the
        health improvements that follow.</p>
    </section>
```

- [ ] **Step 5: Verify PASS + no em dash + build**

Run: `pnpm exec vitest run tests/pages/overview.test.ts` (PASS).
Run: `grep -c $'\u2014' src/pages/index.astro` (must print `0`).
Run: `pnpm check && pnpm build` (0 errors, 12 pages).

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro tests/pages/overview.test.ts
git commit -m "Add Overview care-cost cards + outcome tiles (build-time, zero JS)"
```

---

### Task 3: Browser verification

**Files:** none (verification only). Use the handoff browser workflow: `pnpm preview --port <N>` in background, then `mcp__Claude_Browser__preview_start {url}` + `javascript_tool` DOM inspection.

- [ ] **Step 1: Serve + inspect**

Confirm, on the Overview page after the benchmark card: a `#care-card-section` with `#care-cards` containing exactly 10 `.care-card`s, each showing a `.care-title`, two `Today` rows with `.care-row-val` money ranges, a `.care-nha` block with `$0` and a `.care-year-chip`, and a `.care-src` with a `.conf` badge. Confirm the "Beyond dollars" card's `#outcome-tiles` has 4 `.tile`s (e.g. one showing `20,000–68,000`) each ending with a `.conf` badge. Confirm the chapter-nav footer still follows. `read_console_messages` — zero errors.

- [ ] **Step 2: Static-render check**

Confirm `dist/index.html` contains `id="care-cards"`, `What you'd pay for care`, `id="outcome-tiles"`, `20,000–68,000`, and `$6,850` directly (build-time, zero client JS). Grep `dist/index.html` for U+2014 (must be absent).

- [ ] **Step 3: View Transitions**

Navigate to `/health` and back to Overview; confirm the care cards and outcome tiles are intact (static, no duplication) with no console error.

---

## Follow-on slices (out of scope here)

- **P3 slice 11b:** the household calculator (port `HOUSEHOLD_PROFILES` + `HOUSEHOLDS_M` + `renderHouseholdCalc` from `docs/js/care.js:113-273` into `src/lib/care.ts` + client wiring; the tax-share line reads `mc.modePath.detail[years.length-2].newRevenue * DEF` per `modelNumbersForHousehold`, `docs/js/app.js:133-135`), plus `#flow-takeaway` (a client text builder from the mature-year detail, `docs/js/app.js:482-489`) added to the existing "How the money re-routes" card. Insert the household card between the outcomes card and the chapter-nav footer.
- **P3 slice 11c:** the Methodology card (`docs/index.html:991-1040`): static prose + build-time `#gaps-list` (low-confidence `PARAM_DEFS` labels) + `#param-table` (full `PARAM_DEFS` table) + `#selftest` badge (reconciling `selfTest()` and the tax `SELFTESTS`/`TAX_SELFTESTS` shapes). Finishes the Overview page.
- **P3 slice 12+:** the remaining tabs, each replacing its `[chapter].astro` stub.

## Self-review notes

- **Spec coverage:** implements the two static personal-impact Overview sections (care cards + outcomes tiles). Household calc, `#flow-takeaway`, and Methodology are explicitly deferred to 11b/11c.
- **No placeholders:** `moneyRange` and the card/tile markup are fully specified; `CARE_SCENARIOS` cites an exact verbatim source range (the executor pastes the ten objects, which are literal data, not logic).
- **Type/name consistency:** `CareScenario`/`CARE_SCENARIOS`/`moneyRange` are new in `care.ts` and consumed only by `index.astro`; `OUTCOME_STATS` matches the existing `src/lib/params.ts` export (shape `{value,label,note,confidence}`); class names (`care-grid`, `care-card`, `care-title`, `care-rows`, `care-row`, `care-row-label`, `care-row-val`, `care-row-note`, `care-nha`, `care-nha-line`, `care-nha-label`, `care-nha-val`, `care-year-chip`, `care-nha-note`, `care-src`, `tiles`, `tile`, `conf`) all exist in `src/styles/global.css`.
- **No em dash / no NaN risk:** static data + prose only; `moneyRange` uses U+2013; em-dash greps in both tasks; the pre-existing `!html.includes('—')` overview test guards the rendered output.
- **Order rationale:** care + outcomes land after the model/benchmark section (personal-impact coda) and before the chapter-nav footer; 11b (household) and 11c (methodology) insert into the same gap, so no reordering is required later.
