# NHA Astro Migration — P3 (slice 4): Overview money-flow diagram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the hand-rolled Sankey-style money-flow diagram (`charts.js` `renderFlowDiagram`) and render the Overview "How the money re-routes" comparison card (today vs NHA) client-side from the shared Monte Carlo run.

**Architecture:** Port `renderFlowDiagram(container, spec)` to `src/lib/flow-diagram.ts` (reusing `chart-util` + `format`). Add pure spec builders in `src/lib/money-flow.ts`: `todayFlowSpec()` (static, from `MONEYFLOW`) and `nhaFlowSpec(mc, DEF)` + `nhaFlowTitle(mc, DEF)` (derived from the mature-year financing). The Overview client renders both diagrams inside the comparison card, feeding the same `mc` it already computes.

**Tech Stack:** Astro 5 (client `<script>`), TypeScript strict, Vitest 3.2.7. Consumes P2 `src/lib/params` (`MONEYFLOW`), the `mc`/`MonteCarloResult` from `src/lib/model-types`, P3 `src/lib/format` + `src/lib/chart-util` + `src/lib/overview` (`runOverviewMc`).

## Global Constraints

- Platform: Windows. Bash tool or PowerShell. node 22.23.1 / pnpm 11.17.0 on PATH (Volta). Working dir: `C:\Users\micha\OneDrive\Desktop\Healthcare Framework\ChatGPT Work Outputs\Claude Outputs`.
- TypeScript `strict`; avoid gratuitous `any` (narrow SVG casts OK).
- **Fidelity:** `renderFlowDiagram` geometry from `docs/js/charts.js:452-531` verbatim (W=430, H=330, LX=148, RX=282, BW=14, GAP=5, layout/ribbon math). The NHA spec derivation from `docs/js/app.js:443-478` verbatim (k scale, fed/state/emp/newRev/hhTax/progTax/pub/residual). The static today spec = `MONEYFLOW.sources/channels/ribbons`.
- **NaN guard (project rule):** a NaN coordinate hangs the SVG renderer; preserve the source's `Math.max(3, ...)` height floor and the per-channel ribbon normalization. Browser-verify no `NaN` in path `d`/rect attrs (Task 5).
- **Palette:** node/ribbon colors come from the spec (`var(--series-*)`) and `var(--total-bar)` exactly as the source uses; class names `chart-svg`, `flow-ribbon`, `row-label`, `row-note`, `tip-head` preserved so `global.css` styles them.
- Base path `/US-National-Health-Assurance-System/`; assets via `import.meta.env.BASE_URL`.
- No em dashes (—, U+2014) in reader-visible output. The card prose (`docs/index.html:792-812`) uses `;`/`·`, not em dashes — copy verbatim.
- Client render must run on `astro:page-load` (chart drawn inside the existing `render()`).
- Do NOT modify anything under `docs/` or the `src/lib/*` engine modules (params/model/scenarios/tax*). You MAY add `src/lib/flow-diagram.ts`, `src/lib/money-flow.ts`, and edit `src/scripts/overview-client.ts` + `src/pages/index.astro`.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Scope: `renderFlowDiagram` + the today-vs-NHA comparison card ONLY. DEFERRED to later slices: the Act-1 solo diagram (`#flow-today-solo`), the `#flow-takeaway` note, the sponsor table, and benchmarks/bridge/financing charts + the other tabs.

## File structure

```
src/
  lib/
    flow-diagram.ts  FlowNode/FlowRibbon/FlowSpec types + renderFlowDiagram(container, spec)
    money-flow.ts    todayFlowSpec(), nhaFlowSpec(mc, DEF), nhaFlowTitle(mc, DEF)  (pure)
  scripts/
    overview-client.ts  render() also draws #flow-today + #flow-nha + sets #flow-nha-title
  pages/
    index.astro         + the "How the money re-routes" comparison card markup
tests/lib/
  money-flow.test.ts    spec-builder shape/values (pure)
```

---

### Task 1: `src/lib/flow-diagram.ts`

**Files:**
- Create: `src/lib/flow-diagram.ts`
- Test: none (SVG DOM verified in-browser, Task 5)

**Interfaces:**
- Consumes: `el`, `div`, `tipRow`, `showTip`, `hideTip` from `./chart-util`; `money`, `moneyShort` from `./format`.
- Produces:
  - `interface FlowNode { id: string; label: string; value: number; color?: string }`
  - `interface FlowRibbon { from: string; to: string; value: number; note?: string }`
  - `interface FlowSpec { sources: FlowNode[]; channels: FlowNode[]; ribbons: FlowRibbon[]; aria?: string }`
  - `function renderFlowDiagram(container: HTMLElement, spec: FlowSpec): void` — clears `container` and draws the Sankey-style SVG (from `docs/js/charts.js:452-531`).

- [ ] **Step 1: Implement `src/lib/flow-diagram.ts`**

Port `NHA.renderFlowDiagram` (charts.js:452-531) verbatim. Keep every constant (W/H/M/LX/RX/BW/GAP), the `layout()` node stacking (`Math.max(3, avail*value/sum)`), the ribbon path `d` construction and per-channel `th` normalization, the `tipIt`/focus/blur/pointer handlers, and the node bars + `row-label`/`row-note` labels (source labels use node color, channel bars use `var(--total-bar)`). Import helpers from `./chart-util`, formatters from `./format`. Replace `NHA.fmt.money`/`moneyShort` with `money`/`moneyShort`. Type `container: HTMLElement`, `spec: FlowSpec`.

- [ ] **Step 2: Type-check + build**

Run: `pnpm check` (0 errors), `pnpm build` (exit 0).

- [ ] **Step 3: Commit**

```bash
git add src/lib/flow-diagram.ts
git commit -m "Port renderFlowDiagram to src/lib/flow-diagram.ts"
```

---

### Task 2: `src/lib/money-flow.ts` (pure spec builders)

**Files:**
- Create: `src/lib/money-flow.ts`
- Test: `tests/lib/money-flow.test.ts`

**Interfaces:**
- Consumes: `MONEYFLOW` from `./params`; `money` from `./format`; `MonteCarloResult` from `./model-types`; `FlowSpec` from `./flow-diagram`.
- Produces:
  - `function todayFlowSpec(): FlowSpec` — `{ sources: MONEYFLOW.sources, channels: MONEYFLOW.channels, ribbons: MONEYFLOW.ribbons, aria: '<the app.js:438 aria string>' }`.
  - `function nhaFlowSpec(mc: MonteCarloResult, DEF: number): FlowSpec` — the NHA panel spec from `docs/js/app.js:443-477` verbatim (compute `i41 = mc.years.indexOf(2041)`, `d = mc.modePath.detail[i41]`, `k = (mc.steady.matureToday.p50 / d.nheNha) * DEF`, `fed/state/emp = d.fedRedirect/stateMoe/empContrib * k`, `newRev = d.newRevenue*k`, `hhTax = 0.05*newRev`, `progTax = 0.95*newRev`, `pub = d.pubCost*k`, `residual = Math.max(0, d.nheNha - d.pubCost)*k`; then the 5 sources / 2 channels / 6 ribbons exactly as the source, with the same colors, labels, and note strings).
  - `function nhaFlowTitle(mc: MonteCarloResult, DEF: number): string` — `'Under NHA: mature system at 2024 scale (' + money(pub + residual) + ')'` (app.js:453-455).

- [ ] **Step 1: Write the failing tests**

`tests/lib/money-flow.test.ts`:
```ts
import { expect, test } from 'vitest';
import { todayFlowSpec, nhaFlowSpec, nhaFlowTitle } from '../../src/lib/money-flow';
import { runOverviewMc } from '../../src/lib/overview';
import { DEFLATOR_2023_TO_2024 as DEF } from '../../src/lib/params';

test('todayFlowSpec has the 5 CMS sources and 5 channels', () => {
  const s = todayFlowSpec();
  expect(s.sources.map((n) => n.id)).toEqual(['hh', 'emp', 'fed', 'state', 'oth']);
  expect(s.channels).toHaveLength(5);
  expect(s.ribbons.length).toBeGreaterThan(0);
});

test('nhaFlowSpec has 5 sources, 2 public/residual channels, 6 ribbons, all finite', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const spec = nhaFlowSpec(mc, DEF);
  expect(spec.sources.map((n) => n.id)).toEqual(['hh', 'emp', 'wealth', 'fed', 'state']);
  expect(spec.channels.map((n) => n.id)).toEqual(['pub', 'res']);
  expect(spec.ribbons).toHaveLength(6);
  for (const n of [...spec.sources, ...spec.channels]) expect(Number.isFinite(n.value)).toBe(true);
  for (const r of spec.ribbons) expect(Number.isFinite(r.value)).toBe(true);
});

test('nhaFlowTitle reports the mature-scale total as money', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  expect(nhaFlowTitle(mc, DEF)).toMatch(/^Under NHA: mature system at 2024 scale \(\$[\d.]+T\)$/);
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/lib/money-flow.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/money-flow`.

- [ ] **Step 3: Implement `src/lib/money-flow.ts`**

Port the three builders. `nhaFlowSpec` reproduces `app.js:443-477` exactly (do not change any coefficient, label, color, or note string). Import `MONEYFLOW` from `./params`, `money` from `./format`, `MonteCarloResult` from `./model-types`, `FlowSpec`/`FlowNode`/`FlowRibbon` from `./flow-diagram`. If `MONEYFLOW.sources` items are typed such that a `color` field is present, they satisfy `FlowNode`; if TS complains about `MONEYFLOW`'s inferred type vs `FlowNode[]`, map them into `FlowNode` objects explicitly rather than casting to `any`.

- [ ] **Step 4: Run to verify PASS**

Run: `pnpm exec vitest run tests/lib/money-flow.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Type-check + commit**

Run: `pnpm exec tsc --noEmit` (exit 0).
```bash
git add src/lib/money-flow.ts tests/lib/money-flow.test.ts
git commit -m "Add pure money-flow spec builders (today + NHA)"
```

---

### Task 3: Add the comparison card markup to `index.astro`

**Files:**
- Modify: `src/pages/index.astro`
- Test: `tests/pages/overview.test.ts` (extend)

**Interfaces:**
- Consumes: nothing (static markup).
- Produces: the "How the money re-routes" card with empty `#flow-today` / `#flow-nha` containers and the `#flow-nha-title` element (the client fills them).

- [ ] **Step 1: Extend the failing test**

Add to `tests/pages/overview.test.ts`:
```ts
test('overview includes the money-flow comparison card containers', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('id="flow-today"');
  expect(html).toContain('id="flow-nha"');
  expect(html).toContain('id="flow-nha-title"');
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/pages/overview.test.ts`
Expected: FAIL — flow containers absent.

- [ ] **Step 3: Add the card to `src/pages/index.astro`**

Reproduce the money-flow card from `docs/index.html:790-812` VERBATIM (the `<section class="card">` with `<h2>How the money re-routes</h2>`, the `.desc` paragraph, the `.flow-grid` with two `.flow-panel`s containing the `.flow-title`s + `#flow-today`/`#flow-nha`, and the `.note` paragraph). Place it after the path-chart card, before `</main>`. Leave `#flow-today`/`#flow-nha` empty and `#flow-nha-title` with its static default text (the client overwrites it). DEFER the `#flow-takeaway` element (omit it this slice) — do not add empty elements you will not fill. Ensure no em dash (U+2014) is introduced (the source prose uses `;`/`·`).

- [ ] **Step 4: Run to verify PASS + build**

Run: `pnpm exec vitest run tests/pages/overview.test.ts` (PASS), then `pnpm check && pnpm build`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro tests/pages/overview.test.ts
git commit -m "Add money-flow comparison card markup to the Overview"
```

---

### Task 4: Draw the diagrams in the Overview client

**Files:**
- Modify: `src/scripts/overview-client.ts`

**Interfaces:**
- Consumes: `renderFlowDiagram` from `../lib/flow-diagram`; `todayFlowSpec`, `nhaFlowSpec`, `nhaFlowTitle` from `../lib/money-flow`; the `mc` already computed in `render()`; `DEF` already imported.
- Produces: the client draws both flow diagrams and sets the NHA title on each render.

- [ ] **Step 1: Update `render()` in `src/scripts/overview-client.ts`**

After the path-chart render, add the money-flow renders using the same `mc`:
```ts
import { renderFlowDiagram } from '../lib/flow-diagram';
import { todayFlowSpec, nhaFlowSpec, nhaFlowTitle } from '../lib/money-flow';
// ...inside render(), after renderPathChart(...):
const flowToday = document.getElementById('flow-today');
if (flowToday) renderFlowDiagram(flowToday, todayFlowSpec());
const flowNha = document.getElementById('flow-nha');
if (flowNha) renderFlowDiagram(flowNha, nhaFlowSpec(mc, DEF));
const flowTitle = document.getElementById('flow-nha-title');
if (flowTitle) flowTitle.textContent = nhaFlowTitle(mc, DEF);
```
`todayFlowSpec()` is static but re-rendering it each time is harmless and keeps the code simple. Leave the rest of the client unchanged.

- [ ] **Step 2: Full suite + check + build**

Run: `pnpm test && pnpm check && pnpm build`
Expected: all green (44+ tests), 0 type errors, 12 pages.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/overview-client.ts
git commit -m "Render the Overview money-flow diagrams from the shared Monte Carlo run"
```

---

### Task 5: Browser verification

**Files:** none (verification only).

- [ ] **Step 1: Serve + inspect both diagrams**

`pnpm preview`; open the Overview. Confirm `#flow-today` and `#flow-nha` each contain an `<svg class="chart-svg">` with: source node `rect`s (5 today / 5 NHA... note NHA has 5 sources, 2 channels), channel `rect`s, `flow-ribbon` `path`s, and `row-label`/`row-note` texts. Grep each SVG's `d`/attrs for `NaN` (must be none). Read `read_console_messages` — zero errors. Confirm `#flow-nha-title` reads "Under NHA: mature system at 2024 scale ($X.XXT)".

- [ ] **Step 2: Interactivity**

Change the scenario `<select>` to `SCN-OPT`; confirm the NHA diagram redraws (ribbon/node geometry changes) and the title total updates, while the today diagram stays fixed. No console error. Reset returns to SCN-BASE.

- [ ] **Step 3: Ribbon tooltip**

Dispatch `pointermove` over a `.flow-ribbon` (or hover); confirm the shared tooltip shows `Source → Channel`, the `/yr` value, and the note; it hides on `pointerleave`.

- [ ] **Step 4: View Transitions**

Navigate to `/health` and back; confirm both diagrams re-render (single `<svg>` each, no duplicates) with no console error.

---

## Follow-on slices (out of scope here)

- **P3 slice 5:** the remaining Overview visuals — Act-1 solo money-flow (`#flow-today-solo`), `#flow-takeaway`, sponsor table, benchmarks, bridge, financing, and the path-table/growth-decomp note.
- **P3 slice 6+:** remaining tabs (health, tax + `taxcharts.js`/`taxapp.js`, prose tabs), each replacing its stub, DOM-diffed vs live, with the em-dash/content pass (incl. the family-note "the the" typo).
- **P4/P5:** content collections; cutover.

## Self-review notes

- Spec coverage: implements design spec §2 (client-rendered SVG) for the money-flow centerpiece; other Overview visuals + tabs deferred. Reuses the shared single-MC-run from slice 3 (no extra model runs).
- No unresolved placeholders: `renderFlowDiagram` + `nhaFlowSpec` reference exact source line ranges; `money-flow.ts` has concrete pure tests; the card markup is a verbatim parity port paired with a rendering test + browser verification.
- Type/name consistency: `FlowSpec`/`FlowNode`/`FlowRibbon` defined in `flow-diagram.ts` and consumed by `money-flow.ts` + the client; `MonteCarloResult` is the P2 model type; `todayFlowSpec`/`nhaFlowSpec`/`nhaFlowTitle`/`renderFlowDiagram` defined in Tasks 1-2 and consumed by Task 4; ids `#flow-today`/`#flow-nha`/`#flow-nha-title` match `docs/index.html`.
- NaN-guard + palette (CSS vars) called out and checked in Task 5.
