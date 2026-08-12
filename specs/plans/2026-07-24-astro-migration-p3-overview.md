# NHA Astro Migration - P3 (slice 1): Multi-page shell + Overview hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the P3 rendering pattern: convert the shell to multi-page routing with Astro View Transitions, and render the Overview landing page's hero + tiles at build time from the ported `src/lib` engine, verified to produce the same numbers as the live site.

**Architecture:** Each tab becomes its own route (the 12 nav items become `<a>` links; View Transitions keep switching smooth). The Overview page computes its headline figures in Astro frontmatter (runs under Node at build time) by calling `runMonteCarlo` from `src/lib/model`, formats them with a ported `src/lib/format.ts`, and emits static HTML with zero client JS. Un-ported tabs render as stubs via a dynamic route until their own slice lands.

**Tech Stack:** Astro 5 (static, View Transitions via `astro:transitions`), TypeScript strict, Vitest 3.2.7. Consumes the P2 `src/lib/model` + `src/lib/params`.

## Global Constraints

- Platform: Windows. Bash tool or PowerShell. node 22.23.1 / pnpm 11.17.0 on PATH (Volta). Working dir: `C:\Users\micha\OneDrive\Desktop\Healthcare Framework\ChatGPT Work Outputs\Claude Outputs`.
- TypeScript `strict`; avoid gratuitous `any`.
- Base path `/US-National-Health-Assurance-System/`; every route link and asset MUST resolve through `import.meta.env.BASE_URL` (never a hardcoded `/`).
- **Visual/behavior parity:** reproduce the live overview hero + tiles DOM structure and class names (`docs/index.html` `#view-overview`) exactly. Same CSS (`src/styles/global.css`, already ported). Do not redesign.
- **Fidelity:** hero/tiles math and formatting come verbatim from `docs/js/app.js` (`renderHero`/`renderTiles`) and `docs/js/charts.js` (`NHA.fmt`); the model is the already-ported `src/lib/model`. Constants: `N_RUNS = 600`, `SEED = 42`, default scenario `"SCN-BASE"`, no sliders, `DEF = DEFLATOR_2023_TO_2024` (from `src/lib/params`). Because the seed is fixed, build-time output must equal the live site's initial numbers.
- **No em dashes ( - )** in reader-visible output. NOTE: `NHA.fmt.money` uses the MINUS SIGN `−` (U+2212) for negatives, which is allowed (it is not an em dash U+2014). Preserve it.
- Do NOT modify anything under `docs/`, or any `src/lib/*` engine module from P2/P2b (you MAY add `src/lib/format.ts` and `src/lib/tabs.ts`).
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Scope: this slice = multi-page shell + View Transitions + Overview hero & 4 tiles only. DEFERRED to later P3 slices: the family-burden prose note, all charts (money-flow, path, benchmarks), the scenario picker + parameter sliders (interactivity), and the other 11 tabs' real content.

## File structure

```
src/
  lib/
    tabs.ts        the 12 tabs as { id, label, path } (single source of nav + routing)
    format.ts      money, moneyShort, pct, perCap, axis   (port of NHA.fmt)
  layouts/
    BaseLayout.astro   + <ClientRouter /> (View Transitions)
  components/
    TabNav.astro       buttons -> base-aware <a> links with active state
  pages/
    index.astro        Overview: build-time hero + tiles from src/lib/model
    [chapter].astro    stub pages for the 11 not-yet-ported tabs (getStaticPaths)
tests/lib/
  format.test.ts
tests/shell.test.ts    (extend: TabNav renders 12 links w/ correct hrefs + active state)
```

---

### Task 1: Ported formatters - `src/lib/format.ts`

**Files:**
- Create: `src/lib/format.ts`  (port of `NHA.fmt` from `docs/js/charts.js`)
- Test: `tests/lib/format.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `money(b: number): string`, `moneyShort(b: number): string`, `pct(x: number, d?: number): string`, `perCap(x: number): string`, `axis(b: number): string` - reproducing `docs/js/charts.js` `NHA.fmt` exactly (including the `−` U+2212 negative sign and the "n/a" for non-finite in `money`).

- [ ] **Step 1: Write the failing tests**

`tests/lib/format.test.ts`:
```ts
import { expect, test } from 'vitest';
import { money, moneyShort, pct, perCap, axis } from '../../src/lib/format';

test('money: one decimal T above 1000B, whole B below', () => {
  expect(money(5340)).toBe('$5.34T');
  expect(money(300)).toBe('$300B');
  expect(money(-1200)).toBe('−$1.20T'); // U+2212 minus sign
  expect(money(Infinity)).toBe('n/a');
});

test('moneyShort: one-decimal T, whole B', () => {
  expect(moneyShort(3300)).toBe('$3.3T');
  expect(moneyShort(300)).toBe('$300B');
});

test('pct default one decimal, perCap grouped, axis compact', () => {
  expect(pct(17.6)).toBe('17.6%');
  expect(pct(17.6, 0)).toBe('18%');
  expect(perCap(14570)).toBe('$14,570');
  expect(axis(2000)).toBe('$2T');
  expect(axis(300)).toBe('$300B');
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/lib/format.test.ts`
Expected: FAIL - cannot resolve `../../src/lib/format`.

- [ ] **Step 3: Port `NHA.fmt` to `src/lib/format.ts`**

Translate the `NHA.fmt` object (in `docs/js/charts.js`, near line 30) into named exports, preserving the exact logic: `money` (neg `−`, `>=1000`→`(a/1000).toFixed(2)+"T"`, else `Math.round(a)+"B"`, non-finite→`"n/a"`), `moneyShort` (`.toFixed(1)`), `pct` (`toFixed(d==null?1:d)+"%"`), `perCap` (`"$"+Math.round(x).toLocaleString("en-US")`), `axis`.

- [ ] **Step 4: Run to verify PASS**

Run: `pnpm exec vitest run tests/lib/format.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Type-check + commit**

Run: `pnpm exec tsc --noEmit` (expect exit 0).
```bash
git add src/lib/format.ts tests/lib/format.test.ts
git commit -m "Port NHA.fmt formatters to src/lib/format.ts"
```

---

### Task 2: Multi-page nav + View Transitions + stub routing

**Files:**
- Create: `src/lib/tabs.ts`
- Modify: `src/components/TabNav.astro`
- Modify: `src/layouts/BaseLayout.astro`
- Create: `src/pages/[chapter].astro`
- Modify: `src/pages/index.astro` (pass no new content yet; keep placeholder main - Task 3 fills it)
- Modify: `tests/shell.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `TABS: { id: string; label: string; path: string }[]` in `src/lib/tabs.ts` (path is the route SUFFIX relative to base, e.g. `''` for overview/index, `'health'`, `'tax'`, ...). Order and labels identical to the current 12 (`docs/index.html` nav). Used by TabNav and `[chapter].astro`.

- [ ] **Step 1: Create `src/lib/tabs.ts`**

```ts
export interface Tab { id: string; label: string; path: string }

// Order + labels must match docs/index.html nav exactly. path '' = the index (Overview).
export const TABS: Tab[] = [
  { id: 'tab-overview', label: 'Overview', path: '' },
  { id: 'tab-health', label: 'Healthcare', path: 'health' },
  { id: 'tab-tax', label: 'Taxes & Financing', path: 'tax' },
  { id: 'tab-legislation', label: 'Legislation', path: 'legislation' },
  { id: 'tab-units', label: 'Physical Care', path: 'units' },
  { id: 'tab-medications', label: 'Medications', path: 'medications' },
  { id: 'tab-data', label: 'Data', path: 'data' },
  { id: 'tab-workforce', label: 'Workforce', path: 'workforce' },
  { id: 'tab-gov', label: 'Governance', path: 'gov' },
  { id: 'tab-hardening', label: 'Executive Hardening', path: 'hardening' },
  { id: 'tab-rollout', label: 'Phased Rollout', path: 'rollout' },
  { id: 'tab-quality', label: 'Quality', path: 'quality' },
];
```

- [ ] **Step 2: Write the failing shell test**

Replace `tests/shell.test.ts`'s TabNav test with a version asserting anchors + hrefs + active state (keep the em-dash test, now over BaseLayout):
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import TabNav from '../src/components/TabNav.astro';
import BaseLayout from '../src/layouts/BaseLayout.astro';
import { TABS } from '../src/lib/tabs';

const BASE = '/US-National-Health-Assurance-System/';

test('TabNav renders 12 links with base-prefixed hrefs, in order', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(TabNav, { props: { pathname: BASE } });
  const anchorCount = (html.match(/<a /g) ?? []).length;
  expect(anchorCount).toBe(12);
  for (const t of TABS) {
    const href = BASE + t.path;
    expect(html).toContain(`href="${href}"`);
  }
});

test('TabNav marks the current tab active', async () => {
  const container = await AstroContainer.create();
  const htmlHealth = await container.renderToString(TabNav, {
    props: { pathname: BASE + 'health' },
  });
  // the health anchor carries the active class; overview does not
  expect(htmlHealth).toMatch(/href="\/US-National-Health-Assurance-System\/health"[^>]*class="[^"]*active/);
});

test('rendered shell contains no em dashes', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(BaseLayout, {
    props: { title: 'x', pathname: BASE },
    slots: { default: '<main></main>' },
  });
  expect(html.includes(' - ')).toBe(false); // U+2014 em dash
});
```

- [ ] **Step 3: Run to verify FAIL**

Run: `pnpm exec vitest run tests/shell.test.ts`
Expected: FAIL - TabNav does not yet accept `pathname` / render anchors.

- [ ] **Step 4: Rewrite `src/components/TabNav.astro` as base-aware links**

```astro
---
import { TABS } from '../lib/tabs';
interface Props { pathname: string }
const { pathname } = Astro.props;
const base = import.meta.env.BASE_URL; // ends with '/'
const norm = (p: string) => (p.endsWith('/') ? p : p + '/');
---
<nav class="tabs" aria-label="Dashboard sections">
  {TABS.map((t) => {
    const href = base + t.path;
    const active = norm(pathname) === norm(href);
    return (
      <a id={t.id} href={href} class={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>{t.label}</a>
    );
  })}
</nav>
```
Note: the live nav used `<button>`. View Transitions require `<a>` (Astro's `ClientRouter` intercepts anchor clicks, not buttons), so the nav MUST become anchors. `src/styles/global.css` styles the tabs via `button`-specific selectors, so Step 4b extends those selectors to also match `a` - a deliberate, parity-preserving edit. From this slice on, `global.css` intentionally diverges from `docs/style.css` (expected as the DOM evolves).

- [ ] **Step 4b: Extend the tab CSS selectors to also style `<a>` (parity-preserving)**

In `src/styles/global.css`, update the four `nav.tabs button...` rules so anchors are styled identically. Change each selector to include the `a` variant (do NOT change any declaration bodies):
- `nav.tabs button {` → `nav.tabs button, nav.tabs a {`
- `nav.tabs button.active {` → `nav.tabs button.active, nav.tabs a.active {`
- `nav.tabs button:hover:not(.active) {` → `nav.tabs button:hover:not(.active), nav.tabs a:hover:not(.active) {`
- the responsive rule `nav.tabs button {` (in the max-width media block, ~line 2813) → `nav.tabs button, nav.tabs a {`

Also confirm the anchors have no default underline/visited color leaking through: if `nav.tabs a` shows an underline or link color, add `text-decoration: none;` to the shared `nav.tabs button, nav.tabs a` rule (the `button` reset already covers color via `color: var(--text-secondary)` in that rule). Verify in Task 4.

- [ ] **Step 5: Add View Transitions + pass pathname in `BaseLayout.astro`**

In `BaseLayout.astro`: import `{ ClientRouter } from 'astro:transitions'`, add `<ClientRouter />` inside `<head>`. Add `pathname` to `Props` and pass `Astro.url.pathname` to `<TabNav pathname={...} />`. Update `SiteHeader`/`TabNav` usage accordingly:
```astro
---
import '../styles/global.css';
import { ClientRouter } from 'astro:transitions';
import SiteHeader from '../components/SiteHeader.astro';
import TabNav from '../components/TabNav.astro';
import SiteFooter from '../components/SiteFooter.astro';
interface Props { title: string; description?: string }
const { title, description } = Astro.props;
const pathname = Astro.url.pathname;
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  {description && <meta name="description" content={description} />}
  <ClientRouter />
</head>
<body>
  <div class="wrap">
    <SiteHeader />
    <TabNav pathname={pathname} />
    <slot />
    <SiteFooter />
  </div>
</body>
</html>
```

- [ ] **Step 6: Create stub routes `src/pages/[chapter].astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { TABS } from '../lib/tabs';
export function getStaticPaths() {
  // every tab except the index (overview) and any tab that has its own page yet
  return TABS.filter((t) => t.path !== '').map((t) => ({
    params: { chapter: t.path }, props: { label: t.label },
  }));
}
interface Props { label: string }
const { label } = Astro.props;
---
<BaseLayout title={`National Health Assurance: ${label}`}>
  <main><section class="card"><h2>{label}</h2><p>This chapter is being migrated.</p></section></main>
</BaseLayout>
```

- [ ] **Step 7: Run tests + build**

Run: `pnpm exec vitest run tests/shell.test.ts` (expect PASS), then `pnpm check && pnpm build`.
Expected: 0 type errors; build emits `dist/index.html` plus `dist/health/index.html`, `dist/tax/index.html`, ... for the 11 stub tabs. Confirm `dist/health/index.html` exists.

- [ ] **Step 8: Commit**

```bash
git add src/lib/tabs.ts src/components/TabNav.astro src/layouts/BaseLayout.astro src/pages/[chapter].astro src/pages/index.astro src/styles/global.css tests/shell.test.ts
git commit -m "Convert shell to multi-page routing with View Transitions and tab stubs"
```

---

### Task 3: Overview hero + tiles at build time

**Files:**
- Modify: `src/pages/index.astro`
- Test: `tests/pages/overview.test.ts` (create)

**Interfaces:**
- Consumes: `runMonteCarlo` from `src/lib/model`; `DEFLATOR_2023_TO_2024` from `src/lib/params`; `money`, `moneyShort`, `pct`, `perCap` from `src/lib/format`.
- Produces: static HTML for the overview hero + 4 tiles, matching the live `#view-overview` hero/tiles structure.

Reference (from `docs/js/app.js`): compute `mc = runMonteCarlo("SCN-BASE", null, 600, 42)`, `DEF = DEFLATOR_2023_TO_2024`. The values (verbatim from `renderHero`/`renderTiles`):
- hero value = `money(mc.steady.matureToday.p50 * DEF) + "/yr"`
- hero range = `money(p10*DEF) + " – " + money(p90*DEF) + " (10th–90th pct)"` (note: EN dash `–`, allowed)
- 2041 NHA = `money(mc.steady.total.p50 * DEF) + "/yr"`; 2041 base = `money(mc.baseline[mc.years.length-2] * DEF) + "/yr"`
- tiles: (1) GDP share `pct(mc.steady.gdpPct.p50)` range `pct(p10)+" – "+pct(p90)`; (2) per person `perCap(mc.steady.perCapita.p50*DEF)` + range; (3) vs status quo `(delta>=0?"+":"−")+moneyShort(Math.abs(delta))`; (4) new revenue `money(mc.steady.newRevenue.p50*DEF)+"/yr"`. Use the EXACT expressions from `renderTiles`.

- [ ] **Step 1: Write the failing overview test**

`tests/pages/overview.test.ts` - assert the page renders the SAME hero value the engine produces (compute the expected value in the test from the same functions, so the test verifies wiring, not a hardcoded number):
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Overview from '../../src/pages/index.astro';
import { runMonteCarlo } from '../../src/lib/model';
import { DEFLATOR_2023_TO_2024 as DEF } from '../../src/lib/params';
import { money } from '../../src/lib/format';

test('overview renders the build-time hero value from the model', async () => {
  const mc = runMonteCarlo('SCN-BASE', null, 600, 42);
  const expected = money(mc.steady.matureToday.p50 * DEF) + '/yr';
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain(expected);
});

test('overview renders four tiles', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect((html.match(/class="tile"/g) ?? []).length).toBe(4);
});

test('overview shell has no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html.includes(' - ')).toBe(false);
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/pages/overview.test.ts`
Expected: FAIL - index.astro renders no hero value / no tiles yet.

- [ ] **Step 3: Implement the Overview hero + tiles in `src/pages/index.astro`**

Read the live overview hero + tiles markup in `docs/index.html` `#view-overview` (the hero card containing `#hero-value`, `#hero-range`, `#hero-2041-nha`, `#hero-2041-base`, and the `#tiles` container). Reproduce that DOM structure and classes, but fill the values at build time in the frontmatter:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { runMonteCarlo } from '../lib/model';
import { DEFLATOR_2023_TO_2024 as DEF } from '../lib/params';
import { money, moneyShort, pct, perCap } from '../lib/format';

const mc = runMonteCarlo('SCN-BASE', null, 600, 42);
const heroValue = money(mc.steady.matureToday.p50 * DEF) + '/yr';
const heroRange = money(mc.steady.matureToday.p10 * DEF) + ' – ' +
  money(mc.steady.matureToday.p90 * DEF) + ' (10th–90th pct)';
const lastIdx = mc.years.length - 2; // 2041
const baseMature = mc.baseline[lastIdx] * DEF;
const nha2041 = money(mc.steady.total.p50 * DEF) + '/yr';
const base2041 = money(baseMature) + '/yr';
const deltaVsBase = mc.steady.total.p50 * DEF - baseMature;
const tiles = [
  { label: 'Share of GDP at maturity', value: pct(mc.steady.gdpPct.p50),
    range: pct(mc.steady.gdpPct.p10) + ' – ' + pct(mc.steady.gdpPct.p90) },
  { label: 'Per person per year', value: perCap(mc.steady.perCapita.p50 * DEF),
    range: perCap(mc.steady.perCapita.p10 * DEF) + ' – ' + perCap(mc.steady.perCapita.p90 * DEF) },
  { label: 'vs. status quo at maturity',
    value: (deltaVsBase >= 0 ? '+' : '−') + moneyShort(Math.abs(deltaVsBase)),
    range: 'status quo reaches ' + money(baseMature) + ' by 2041' },
  { label: 'New revenue needed (mature)', value: money(mc.steady.newRevenue.p50 * DEF) + '/yr',
    range: moneyShort(mc.steady.newRevenue.p10 * DEF) + ' – ' + moneyShort(mc.steady.newRevenue.p90 * DEF) + ' (10th–90th pct)' },
];
---
<BaseLayout title="National Health Assurance: Story & System Dashboard"
  description="A guided, evidence-linked dashboard explaining the proposed U.S. National Health Assurance system, its twelve-year rollout, operating architecture, safeguards, and interactive cost and financing models.">
  <main>
    <!-- Reproduce the #view-overview hero card structure/classes from docs/index.html,
         placing the computed strings into the same elements: -->
    <section class="card">
      <div class="hero">
        <div id="hero-value" class="hero-value">{heroValue}</div>
        <div id="hero-range" class="hero-range">{heroRange}</div>
        <div id="hero-2041-nha">{nha2041}</div>
        <div id="hero-2041-base">{base2041}</div>
      </div>
      <div class="tiles" id="tiles">
        {tiles.map((it) => (
          <div class="tile">
            <div class="label">{it.label}</div>
            <div class="value">{it.value}</div>
            <div class="range">{it.range}</div>
          </div>
        ))}
      </div>
    </section>
  </main>
</BaseLayout>
```
IMPORTANT: use the ACTUAL hero card markup/classes from `docs/index.html` `#view-overview` (the snippet above is a scaffold - match the real element wrappers, headings, and class names so the ported CSS styles it identically). The computed `const` expressions above are authoritative and must not change. If a `mc.steady.*` field the code reads is missing from the ported `runMonteCarlo` result, STOP and report BLOCKED (it should exist from the P2 verbatim port).

- [ ] **Step 4: Run to verify PASS**

Run: `pnpm exec vitest run tests/pages/overview.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Full suite + check + build**

Run: `pnpm test && pnpm check && pnpm build`
Expected: all green; `dist/index.html` contains the hero value string.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro tests/pages/overview.test.ts
git commit -m "Render Overview hero and tiles at build time from src/lib/model"
```

---

### Task 4: Verify parity against the live site

**Files:** none (verification only).

- [ ] **Step 1: Serve the build and read the overview hero numbers**

Run `pnpm preview` (serves at `http://localhost:4321/US-National-Health-Assurance-System/`). Using the browser pane, read the rendered `#hero-value`, `#hero-2041-nha`, `#hero-2041-base`, and the four `.tile .value` texts (via `javascript_tool` reading `textContent`; do not rely on screenshots per project convention).

- [ ] **Step 2: Compare to the live site**

The live overview (served from `docs/`) computes the same model with the same seed. Confirm the ported page's hero value, 2041 pair, and four tile values are byte-identical to the live site's initial (SCN-BASE, no slider) values. If any differs, the wiring or a `* DEF` step diverged - fix and re-verify. Record the compared values.

- [ ] **Step 3: Confirm View Transitions + routing**

Navigate overview → health → overview in the browser pane; confirm the URL changes to the `/health` route, the health stub renders inside the same shell, the active tab styling follows the route, and no full-page flash/console error occurs (read_console_messages). Confirm `dist/health/index.html` was emitted.

---

## Follow-on slices (out of scope here)

- **P3 slice 2:** Overview interactivity - scenario picker + parameter sliders as an island (`client:load`) that recomputes via `src/lib/model` and re-renders hero/tiles; the family-burden prose note; the `runs-note`.
- **P3 slice 3+:** charts (money-flow, path, benchmarks) as islands porting `charts.js`; then the remaining tabs one at a time (health, tax + `taxcharts.js`/`taxapp.js`, then the prose tabs), each replacing its stub, DOM-diffed against the live original, with the em-dash/content pass over ported `desc`/`label` strings.
- **P3 cleanup:** unify the self-test shapes (`selfTest()` vs `TAX_SELFTESTS`) for a build-time badge.
- **P4/P5:** content collections; cutover.

## Self-review notes

- Spec coverage: implements design spec §1 (per-tab pages), §2 (build-time engine consumption; islands deferred to slice 2), §6 (base-path routing). View Transitions chosen (user decision 2026-07-24) to preserve the single-page feel under multi-page routing.
- No unresolved placeholders: the two "reproduce the real markup from docs/index.html" instructions are inherent to a parity port (the live markup is the spec) and are each paired with a parity verification (Task 4) and a rendering test.
- Type/name consistency: `TABS`/`Tab` defined in `tabs.ts` and consumed by TabNav + `[chapter].astro` + tests; `money/moneyShort/pct/perCap/axis` defined in `format.ts` and consumed by the overview + tests; `runMonteCarlo`/`DEFLATOR_2023_TO_2024` come from the P2 `src/lib` with their existing signatures.
- Resolved risk: `global.css` styles tabs via `nav.tabs button` selectors (confirmed at lines 645/652/655 and responsive ~2813). Since View Transitions require `<a>`, Task 2 Step 4b extends those selectors to `nav.tabs button, nav.tabs a` (declaration bodies unchanged) - a parity-preserving edit. `global.css` intentionally begins to diverge from `docs/style.css` here; that divergence is expected as the DOM migrates and is verified visually in Task 4.
