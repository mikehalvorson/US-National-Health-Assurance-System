# NHA Astro Migration — P3 (slice 2): Overview interactivity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Overview page interactive: a scenario picker + parameter sliders that recompute the model client-side (via `src/lib/model`) and re-render the hero, tiles, and family-burden note, plus fill the note at build time.

**Architecture:** Extract the hero/tiles/note display math from `docs/js/app.js` (`renderHero`/`renderTiles`) into a pure, tested `src/lib/overview.ts` (`computeOverview`). `index.astro` calls it at build time for the initial static render and adds the controls markup. A vanilla client `<script>` (no framework island) ports `buildControls`, wires events, and on change calls `computeOverview` + updates the DOM. The script re-initialises on `astro:page-load` so it survives View Transitions.

**Tech Stack:** Astro 5 (client `<script>` module + `astro:transitions` lifecycle), TypeScript strict, Vitest 3.2.7. Consumes P2 `src/lib/model`/`params`/`scenarios` and P3 `src/lib/format`.

## Global Constraints

- Platform: Windows. Bash tool or PowerShell. node 22.23.1 / pnpm 11.17.0 on PATH (Volta). Working dir: `C:\Users\micha\OneDrive\Desktop\Healthcare Framework\ChatGPT Work Outputs\Claude Outputs`.
- TypeScript `strict`; avoid gratuitous `any`.
- Base path `/US-National-Health-Assurance-System/`; assets via `import.meta.env.BASE_URL`.
- **Fidelity:** all math and formatting come verbatim from `docs/js/app.js` (`buildControls` lines 17-90, `recompute`/`renderHero`/`renderTiles` lines 106-211). Model = P2 `src/lib/model`. Constants: scenario default `"SCN-BASE"`, `N_RUNS = 600`, `SEED = 42`, `DEF = DEFLATOR_2023_TO_2024`. Slider debounce = 160ms. Fixed seed means default output equals slice-1 and the live site.
- **Parity:** reproduce the live controls DOM (`#controls`, `#scenario-select`, `.control` wrappers, `#scenario-desc`, `#reset-btn`, `#runs-note`) and classes exactly. Do not redesign.
- **No em dashes (—, U+2014)** in reader-visible output. EN dash `–` (U+2013) and MINUS `−` (U+2212) allowed. The family-burden note prose is copied VERBATIM from `docs/js/app.js` (it contains a doubled-word typo "the the" at app.js:176-177 — preserve it for fidelity; flag for the P3 content pass, do NOT fix here).
- Client script must re-run on `astro:page-load` (View Transitions), not only `DOMContentLoaded`.
- Do NOT modify anything under `docs/` or the `src/lib/*` engine modules (params/model/scenarios/tax*). You MAY add `src/lib/overview.ts` and a client script.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Scope: Overview interactivity (scenario picker + sliders + hero/tiles/note recompute) ONLY. DEFERRED to slice 3: all charts (money-flow, path chart, benchmarks, bridge, financing) and the other tabs.

## File structure

```
src/
  lib/
    overview.ts        computeOverview(scenario, sliders) -> OverviewView (pure; ports renderHero+renderTiles+note)
  pages/
    index.astro        build-time initial render via computeOverview + controls markup + client <script>
  scripts/
    overview-client.ts loaded via <script> in index.astro: buildControls + event wiring + recompute + astro:page-load
tests/lib/
  overview.test.ts
```

Reference — adjustable params: `docs/js/params.js` has 12 `adjustable: true` PARAM_DEFS, each with `sliderMin`, `sliderMax`, `unit`, `confidence`, `source`, `label`. Control ids in `docs/index.html`: `#controls` (829), `#scenario-desc` (829), `#reset-btn` (831), `#runs-note` (832).

---

### Task 1: Pure `src/lib/overview.ts`

**Files:**
- Create: `src/lib/overview.ts`
- Test: `tests/lib/overview.test.ts`

**Interfaces:**
- Consumes: `runMonteCarlo` from `./model`; `DEFLATOR_2023_TO_2024` from `./params`; `money`, `moneyShort`, `pct`, `perCap` from `./format`.
- Produces:
  - `interface OverviewTile { label: string; value: string; range: string }`
  - `interface OverviewView { heroValue: string; heroRange: string; nha2041: string; base2041: string; hero2041Range: string; tiles: OverviewTile[]; familyNote: string }`
  - `function computeOverview(scenario: string, sliders: Record<string, number> | null): OverviewView`
    - `mc = runMonteCarlo(scenario, sliders, 600, 42)`, `DEF = DEFLATOR_2023_TO_2024`.
    - Reproduce `renderHero` (app.js:142-181) and `renderTiles` (app.js:183-210) EXACTLY: heroValue `money(mc.steady.matureToday.p50*DEF)+"/yr"`; heroRange `money(p10*DEF)+" – "+money(p90*DEF)+" (10th–90th pct)"`; the 2041 pair + `hero2041Range` (the p10–p90 band `+ " · " + sign + moneyShort(|delta|) + " (" + sign + pct%) vs status quo"`); the 4 tiles; and `familyNote` — the full prose string from app.js:168-180 with its interpolated values (famNow=0.27*5300, fam2041=0.27*baseMature, hhNow=132.2, hh2041=141, kppPerHH=0.05*d41.newRevenue*DEF*1e9/(hh2041*1e6)). Copy the prose text verbatim including the "the the" typo.

- [ ] **Step 1: Write the failing test**

`tests/lib/overview.test.ts`:
```ts
import { expect, test } from 'vitest';
import { computeOverview } from '../../src/lib/overview';

test('SCN-BASE default matches the known headline figures', () => {
  const v = computeOverview('SCN-BASE', null);
  expect(v.heroValue).toBe('$5.34T/yr');
  expect(v.nha2041).toBe('$9.39T/yr');
  expect(v.base2041).toBe('$9.11T/yr');
  expect(v.tiles).toHaveLength(4);
  expect(v.tiles[0].value).toBe('23.5%');       // GDP share
  expect(v.tiles[3].value).toBe('$3.38T/yr');   // new revenue
});

test('family note is non-empty prose without an em dash', () => {
  const v = computeOverview('SCN-BASE', null);
  expect(v.familyNote.length).toBeGreaterThan(100);
  expect(v.familyNote.includes('—')).toBe(false); // U+2014
});

test('a stress scenario changes the hero value', () => {
  const base = computeOverview('SCN-BASE', null);
  const opt = computeOverview('SCN-OPT', null);
  expect(opt.heroValue).not.toBe(base.heroValue);
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/lib/overview.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/overview`.

- [ ] **Step 3: Implement `src/lib/overview.ts`**

Port `renderHero` + `renderTiles` math into `computeOverview`, returning the `OverviewView`. Import model/params/format. The `familyNote` reproduces app.js:168-180 verbatim (the doubled "the the" stays). No DOM, no `window` — pure string computation. If a `mc.steady.*` field is missing from the ported `runMonteCarlo`, STOP and report BLOCKED.

- [ ] **Step 4: Run to verify PASS**

Run: `pnpm exec vitest run tests/lib/overview.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Type-check + commit**

Run: `pnpm exec tsc --noEmit` (exit 0).
```bash
git add src/lib/overview.ts tests/lib/overview.test.ts
git commit -m "Extract Overview render math to pure src/lib/overview.ts"
```

---

### Task 2: Build-time render via `computeOverview` + controls markup

**Files:**
- Modify: `src/pages/index.astro`
- Test: `tests/pages/overview.test.ts` (extend)

**Interfaces:**
- Consumes: `computeOverview` from `../lib/overview`.
- Produces: initial static HTML (hero/tiles/note filled from `computeOverview('SCN-BASE', null)`) plus the controls container markup (`#controls`, `#scenario-desc`, `#reset-btn`, `#runs-note`) reproduced from `docs/index.html:826-833`.

- [ ] **Step 1: Extend the failing test**

Add to `tests/pages/overview.test.ts`:
```ts
import { computeOverview } from '../../src/lib/overview';

test('overview fills the family-burden note and controls markup at build time', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  const v = computeOverview('SCN-BASE', null);
  expect(html).toContain(v.heroValue);
  expect(html).toContain(v.tiles[0].value);
  expect(html).toContain('id="controls"');
  expect(html).toContain('id="scenario-select"'); // build-time-rendered picker (or populated by script; assert the container)
  expect(html).toContain('id="reset-btn"');
  // family note filled, not the empty slice-1 element
  expect(html).toMatch(/id="family-burden-note"[^>]*>\s*\S/);
});
```
(If the scenario `<select>` is built entirely by the client script, assert `id="controls"` container presence instead of `#scenario-select`; keep whichever the implementation chooses and note it.)

- [ ] **Step 2: Run to verify the new assertion FAILS**

Run: `pnpm exec vitest run tests/pages/overview.test.ts`
Expected: FAIL — family note empty / controls markup absent.

- [ ] **Step 3: Update `src/pages/index.astro`**

In frontmatter, replace the slice-1 inline hero/tile expressions with `const v = computeOverview('SCN-BASE', null)` and render `v.*` into the same hero/tile elements; fill `#family-burden-note` with `v.familyNote`. Reproduce the controls block markup from `docs/index.html:826-833` (`<div class="controls" id="controls"></div>`, `<p class="scenario-desc" id="scenario-desc"></p>`, the `#reset-btn` button, `#runs-note` span). The `#controls` container stays empty in static HTML (the client script fills it), matching the live site. Add the client script tag at the end (Task 3 creates the module):
```astro
<script>
  import '../scripts/overview-client.ts';
</script>
```

- [ ] **Step 4: Run to verify PASS + build**

Run: `pnpm exec vitest run tests/pages/overview.test.ts` (PASS), then `pnpm check && pnpm build` (0 errors; `dist/index.html` contains the note text).

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro tests/pages/overview.test.ts
git commit -m "Render Overview via computeOverview and add controls markup at build time"
```

---

### Task 3: Client interactivity script

**Files:**
- Create: `src/scripts/overview-client.ts`
- Modify: `src/pages/index.astro` (script tag already added in Task 2)

**Interfaces:**
- Consumes: `computeOverview` from `../lib/overview`; `SCENARIOS`, `SCENARIOS_BY_ID`, `effectiveParams` from `../lib/scenarios`; `PARAM_DEFS` from `../lib/params`.
- Produces: the client behaviour. No exports required (side-effecting module); wrap init in a function called on both initial load and `astro:page-load`.

- [ ] **Step 1: Implement `src/scripts/overview-client.ts`**

Port `buildControls` (app.js:17-90) and the recompute/render wiring (app.js:92-113, hero/tiles/note portions only — NOT the chart/table/financing calls, which are slice 3). Structure:
```ts
import { computeOverview } from '../lib/overview';
import { SCENARIOS, SCENARIOS_BY_ID, effectiveParams } from '../lib/scenarios';
import { PARAM_DEFS } from '../lib/params';

interface State { scenario: string; sliders: Record<string, number> }

function initOverview(): void {
  const controls = document.getElementById('controls');
  if (!controls) return;            // not on the overview page
  if (controls.dataset.wired === '1') return; // idempotent guard
  controls.dataset.wired = '1';

  const state: State = { scenario: 'SCN-BASE', sliders: {} };
  let pending: number | undefined;

  const $ = (id: string) => document.getElementById(id);
  function fmtSimple(v: number, unit: string): string {
    if (unit === '×') return v.toFixed(2) + '×';
    if (unit.charAt(0) === '%') return v.toFixed(1) + '%';
    if (unit.indexOf('$B') === 0) return '$' + Math.round(v) + 'B';
    return v.toFixed(1) + ' ' + unit;
  }

  function render(): void {
    const v = computeOverview(state.scenario, Object.keys(state.sliders).length ? state.sliders : null);
    const set = (id: string, txt: string) => { const el = $(id); if (el) el.textContent = txt; };
    set('hero-value', v.heroValue);
    set('hero-range', v.heroRange);
    set('hero-2041-nha', v.nha2041);
    set('hero-2041-base', v.base2041);
    set('hero-2041-range', v.hero2041Range);
    set('family-burden-note', v.familyNote);
    const tilesHost = $('tiles');
    if (tilesHost) {
      tilesHost.innerHTML = '';
      for (const t of v.tiles) {
        const tile = document.createElement('div'); tile.className = 'tile';
        const l = document.createElement('div'); l.className = 'label'; l.textContent = t.label;
        const val = document.createElement('div'); val.className = 'value'; val.textContent = t.value;
        const r = document.createElement('div'); r.className = 'range'; r.textContent = t.range;
        tile.append(l, val, r); tilesHost.appendChild(tile);
      }
    }
  }

  function scheduleRender(): void {
    if (pending) clearTimeout(pending);
    pending = window.setTimeout(render, 160);
  }

  function buildControls(): void {
    controls!.innerHTML = '';
    const scnWrap = document.createElement('div'); scnWrap.className = 'control';
    const scnLabel = document.createElement('label'); scnLabel.textContent = 'Stress scenario';
    const sel = document.createElement('select'); sel.id = 'scenario-select';
    for (const s of SCENARIOS) {
      const o = document.createElement('option');
      o.value = s.id; o.textContent = s.id.replace('SCN-', '') + ': ' + s.name;
      sel.appendChild(o);
    }
    sel.value = state.scenario;
    sel.addEventListener('change', () => {
      state.scenario = sel.value; state.sliders = {};
      buildControls(); render();
    });
    scnWrap.append(scnLabel, sel); controls!.appendChild(scnWrap);

    const eff = effectiveParams(state.scenario, null);
    for (const p of PARAM_DEFS.filter((d) => d.adjustable)) {
      const wrap = document.createElement('div'); wrap.className = 'control';
      const label = document.createElement('label');
      const valSpan = document.createElement('span'); valSpan.className = 'val';
      const conf = document.createElement('span'); conf.className = 'conf ' + p.confidence;
      conf.textContent = p.confidence ?? ''; conf.title = p.source ?? '';
      label.appendChild(document.createTextNode((p.label ?? p.id) + ' '));
      label.appendChild(conf); label.appendChild(document.createElement('br')); label.appendChild(valSpan);
      const input = document.createElement('input'); input.type = 'range';
      input.min = String(p.sliderMin); input.max = String(p.sliderMax);
      input.step = String(((p.sliderMax as number) - (p.sliderMin as number)) / 200);
      const seeded = state.sliders[p.id] != null ? state.sliders[p.id] : eff[p.id].mode;
      input.value = String(seeded);
      valSpan.textContent = fmtSimple(seeded, p.unit ?? '');
      input.addEventListener('input', () => {
        state.sliders[p.id] = +input.value;
        valSpan.textContent = fmtSimple(+input.value, p.unit ?? '');
        scheduleRender();
      });
      wrap.append(label, input); controls!.appendChild(wrap);
    }
    const scn = SCENARIOS_BY_ID[state.scenario];
    const desc = $('scenario-desc'); if (desc) desc.textContent = scn ? scn.id + ': ' + scn.desc : '';
  }

  const resetBtn = $('reset-btn');
  resetBtn?.addEventListener('click', () => { state.sliders = {}; buildControls(); render(); });

  buildControls();
  render();
}

document.addEventListener('astro:page-load', initOverview);
```
Notes: `PARAM_DEFS` must expose `adjustable`, `sliderMin`, `sliderMax`, `unit`, `confidence`, `source`, `label` (they do — from P2 `ParamDef`). Cast `sliderMin/Max` to `number` if typed optional. `astro:page-load` fires on initial load AND after each View Transition, so no separate `DOMContentLoaded` is needed. The `data-wired` guard makes re-init idempotent.

- [ ] **Step 2: Type-check + build**

Run: `pnpm check` (0 errors — the script is type-checked by `astro check`), then `pnpm build` (exit 0).

- [ ] **Step 3: Commit**

```bash
git add src/scripts/overview-client.ts src/pages/index.astro
git commit -m "Add Overview client interactivity: scenario picker, sliders, recompute"
```

---

### Task 4: Browser verification

**Files:** none (verification only).

- [ ] **Step 1: Serve + load**

`pnpm preview`; open `http://localhost:4321/US-National-Health-Assurance-System/` in the browser pane. Read `#hero-value` and confirm it equals `$5.34T/yr` (default). Confirm `#controls` now contains a `<select id="scenario-select">` and 12 `input[type=range]` sliders, and `#family-burden-note` has prose. Check `read_console_messages` for errors.

- [ ] **Step 2: Interact — scenario**

Set the scenario `<select>` to `SCN-OPT` (via `form_input` or `computer`). Confirm `#hero-value` changes to a different value and `#scenario-desc` updates. Set it back to `SCN-BASE`; confirm `#hero-value` returns to `$5.34T/yr`.

- [ ] **Step 3: Interact — slider + reset**

Move one slider (dispatch an `input` event or drag); after ~200ms confirm the hero/tiles updated. Click `#reset-btn`; confirm values return to the `SCN-BASE` default.

- [ ] **Step 4: View Transitions re-init**

Navigate to `/health` then back to overview (browser nav or nav links). Confirm the controls are present and interactive again (the `astro:page-load` handler re-ran) with no duplicate wiring and no console error.

---

## Follow-on slices (out of scope here)

- **P3 slice 3:** charts — port `charts.js` primitives (`NHA._chartUtil`, `renderFlowDiagram`, path chart, benchmarks) as the money-flow / path / benchmark visuals on the Overview, then the health tab.
- **P3 slice 4+:** remaining tabs (tax + `taxcharts.js`/`taxapp.js`, then prose tabs), each replacing its stub, DOM-diffed vs live, with the em-dash/content pass over ported `desc`/`label`/prose (incl. the "the the" typo in the family note).
- **P4/P5:** content collections; cutover.

## Self-review notes

- Spec coverage: implements design spec §2 (islands/interactivity) for the Overview. Charts still deferred (slice 3). Re-hydration on `astro:page-load` addresses the slice-1 final-review reminder.
- No unresolved placeholders: the client script is given in full; the one "reproduce controls markup from docs/index.html:826-833" instruction is a parity port paired with a rendering test and browser verification.
- Type/name consistency: `computeOverview`/`OverviewView`/`OverviewTile` defined in Task 1 and consumed by Tasks 2-3 and tests; `SCENARIOS`/`SCENARIOS_BY_ID`/`effectiveParams`/`PARAM_DEFS` come from P2 `src/lib` with existing signatures; element ids (`hero-value`, `hero-2041-range`, `tiles`, `controls`, `scenario-select`, `scenario-desc`, `reset-btn`, `family-burden-note`) match slice-1 markup and `docs/index.html`.
- Known preserved defect: family-note "the the" typo kept for fidelity, flagged for the content pass.
