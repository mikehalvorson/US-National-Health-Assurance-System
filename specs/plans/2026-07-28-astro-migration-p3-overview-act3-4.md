# NHA Astro Migration - P3 (slice 10): Overview Act 3-4 + operating-system diagrams + chapter-nav Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the middle of the Overview narrative - Act 3 "The fixable part", Act 4 "The proposal", the four static operating-system diagrams (system map, care pathway, money shift, rollout arc), and the chapter-navigation grid - as build-time static HTML with zero client JS, matching `docs/index.html` verbatim.

**Architecture:** All seven cards are pure static markup already styled by existing `src/styles/global.css` rules. The only transformation from the docs source is that every `<button type="button" data-dashboard-view="X">` (a SPA tab-switch control in the single-page docs) becomes a base-aware `<a href={base + 'X'}>` link, because the Astro build is multi-page. The view name `X` equals the target `Tab.path` slug 1:1 (see `src/lib/tabs.ts`), so no mapping table is needed. `global.css` gains `a` alongside `button` in the three relevant `.overview-*` selector groups so the links render pixel-identically to the buttons they replace.

**Tech Stack:** Astro 5 (build-time template), TypeScript strict, Vitest 3.2.7. Consumes nothing new from `src/lib` (no data, no chart modules). Uses `import.meta.env.BASE_URL` for link hrefs (same pattern as `src/components/TabNav.astro`).

## Global Constraints

- Platform: Windows. Bash tool or PowerShell. node 22.23.1 / pnpm 11.17.0 on PATH (Volta). Working dir: `C:\Users\micha\OneDrive\Desktop\Healthcare Framework\ChatGPT Work Outputs\Claude Outputs`.
- TypeScript `strict`; avoid gratuitous `any`.
- **Fidelity:** card markup + prose ported verbatim from `docs/index.html:86-424`. The ONLY permitted change is `<button type="button" data-dashboard-view="X">LABEL</button>` becoming `<a href={base + 'X'}>LABEL</a>` (drop `type="button"`, drop `data-dashboard-view`, add base-aware `href`). Do not reword prose, do not re-derive any number.
- Base path `/US-National-Health-Assurance-System/`; `const base = import.meta.env.BASE_URL` (ends with `/`), so `base + 'health'` = `/US-National-Health-Assurance-System/health`.
- No em dashes ( - , U+2014) in reader-visible output. En dash `–` (U+2013, used in ranges like `38–79%`, `2027–2038`, `Years 1–2`) and `&rarr;`/`&darr;` entities are allowed and present in this source; they are NOT U+2014. Grep for U+2014 after each markup task; must be 0.
- Zero client JS added. All seven cards render fully at build time. Do NOT touch `src/scripts/overview-client.ts`.
- Do NOT modify anything under `docs/` or the `src/lib/*` engine modules. You MAY edit `src/pages/index.astro`, `src/styles/global.css`, `tests/pages/overview.test.ts`.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Placement (locked):** the six narrative/diagram cards (Act 3, Act 4, system map, care pathway, money shift, rollout arc) go AFTER the Act-2 "What's wrong, by the numbers" card and BEFORE `#hero-card`, matching the docs narrative order (story preamble, then the numbers). The chapter-nav card goes LAST in `<main>`, after the `benchmark-section` card, as the page footer. Slice 11's care/household/outcomes/methodology cards will later insert between the benchmark section and the chapter-nav card.
- **Scope:** Act 3, Act 4, the four diagrams, and chapter-nav ONLY. DEFERRED to slice 11: care-cost cards + household calculator (`care.js`), outcomes (`OUTCOME_STATS`), Methodology card, `#flow-takeaway`.

## File structure

```
src/
  pages/
    index.astro        + Act3 + Act4 + system-map + care-pathway + money-shift
                         + rollout-arc cards (after Act-2, before #hero-card);
                         + chapter-nav card (last in <main>);
                         + const base = import.meta.env.BASE_URL in frontmatter
  styles/
    global.css         add `a` alongside `button` in .overview-system-map,
                       .overview-inline-links, .overview-chapter-grid groups
tests/pages/
  overview.test.ts     + Act3/Act4/diagram/chapter-nav assertions
```

---

### Task 1: Act 3 + Act 4 prose cards

Pure static prose. No `data-dashboard-view` buttons in these two cards (Act 4's only link is an external GitHub `<a>` already). This task also introduces `const base` in the frontmatter (used by Tasks 2-3).

**Files:**
- Modify: `src/pages/index.astro`
- Test: `tests/pages/overview.test.ts` (extend)

**Interfaces:**
- Consumes: `import.meta.env.BASE_URL`.
- Produces: the "The fixable part" and "The proposal: National Health Assurance" cards, inserted immediately after the Act-2 card (`<h2>What's wrong, by the numbers</h2>` section) and before `<section class="card" id="hero-card">`.

- [ ] **Step 1: Write the failing test**

Add to `tests/pages/overview.test.ts`:
```ts
test('overview includes Act-3/Act-4 proposal prose', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('The fixable part');
  expect(html).toContain('The proposal: National Health Assurance');
  expect(html).toContain('lever-list');
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/pages/overview.test.ts`
Expected: FAIL - Act-3/Act-4 absent.

- [ ] **Step 3: Add `const base` to the frontmatter**

In `src/pages/index.astro` frontmatter (after the existing imports/consts), add:
```astro
const base = import.meta.env.BASE_URL; // ends with '/'
```

- [ ] **Step 4: Insert the Act-3 and Act-4 cards**

In `src/pages/index.astro`, immediately after the closing `</section>` of the Act-2 "What's wrong, by the numbers" card and before `<section class="card" id="hero-card">`, paste the two cards verbatim from `docs/index.html:86-159` (the `<!-- ACT 3 -->` section through the end of the `<!-- ACT 4 -->` section). These are plain HTML - no `data-dashboard-view`, no Astro expressions - so copy them exactly, including the `<abbr class="overview-acronym" ...>` tags, the `<ul class="lever-list">` items, and Act 4's external `<a href="https://github.com/...">dashboard</a>` link. Do not alter the en dashes (`38–79%`) or the prose.

- [ ] **Step 5: Verify PASS + no em dash + build**

Run: `pnpm exec vitest run tests/pages/overview.test.ts` (PASS).
Run: `grep -c $'\u2014' src/pages/index.astro` (must print `0`).
Run: `pnpm check && pnpm build` (0 errors, 12 pages).

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro tests/pages/overview.test.ts
git commit -m "Add Overview Act-3/Act-4 proposal prose cards"
```

---

### Task 2: The four operating-system diagram cards + link styling

The system map, care pathway, money shift, and rollout arc. Every `data-dashboard-view` button in these four cards becomes a base-aware `<a>`; `global.css` gains `a` selectors so they look identical.

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css`
- Test: `tests/pages/overview.test.ts` (extend)

**Interfaces:**
- Consumes: `base` (from Task 1 frontmatter).
- Produces: the four cards inserted after the Act-4 card and before `#hero-card`, with all SPA buttons converted to `<a href={base + slug}>`.

- [ ] **Step 1: Write the failing test**

Add to `tests/pages/overview.test.ts`:
```ts
test('overview includes the four operating-system diagrams with base-aware links', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('overview-system-map');
  expect(html).toContain('overview-care-path');
  expect(html).toContain('overview-money-shift');
  expect(html).toContain('overview-rollout-arc');
  // SPA buttons converted to real links
  expect(html).not.toContain('data-dashboard-view');
  expect(html).toContain('/US-National-Health-Assurance-System/health');
  expect(html).toContain('/US-National-Health-Assurance-System/rollout');
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/pages/overview.test.ts`
Expected: FAIL - diagrams absent (and, until Task 3 too, `data-dashboard-view` assertion is moot here).

- [ ] **Step 3: Insert the four cards, converting each SPA button to a link**

In `src/pages/index.astro`, after the Act-4 card and before `#hero-card`, paste the four cards from `docs/index.html:161-371` verbatim - the `.overview-map-card` section (161-241), the care-pathway section (243-285), the money-shift section (287-320), and the rollout-arc section (322-371) - applying this ONE transformation to every occurrence:

Replace each
```html
<button type="button" data-dashboard-view="X">LABEL</button>
```
with
```astro
<a href={base + 'X'}>LABEL</a>
```

The eleven map buttons and their target slugs `X`:
| docs line | LABEL | slug X |
|-----------|-------|--------|
| 175 | Enabling law | legislation |
| 186 | Physical Care | units |
| 193 | Healthcare | health |
| 200 | Rollout | rollout |
| 211 | Financing | tax |
| 217 | Data | data |
| 223 | Medication strategy | medications |
| 229 | Workforce | workforce |
| 235 | 430 controlled parameters | quality |
| 236 | Distributed governance | gov |
| 237 | Executive hardening | hardening |

The care-pathway inline links (docs 280-284): `See benefits and cost` → `health`, `See the local network` → `units`, `See how information follows the patient` → `data`.
The money-shift inline links (docs 316-319): `Test total system cost` → `health`, `Test who pays and who saves` → `tax`.
The rollout-arc inline links (docs 367-370): `Open the complete phased rollout` → `rollout`, `Inspect phase targets` → `quality`.

Leave all other markup (the `<article>`, `<span>`, `<strong>`, `<p>`, `<i aria-hidden="true">&rarr;</i>`, `.overview-gate-line`, etc.) exactly as in the source.

- [ ] **Step 4: Add `a` link styling to `global.css`**

In `src/styles/global.css`, extend the existing `.overview-*` button selectors so the converted links inherit identical styling. Make these edits:

Change the selector list at lines 667-669 from:
```css
.overview-system-map button,
.overview-inline-links button,
.overview-chapter-grid button {
  font: inherit; color: var(--accent); cursor: pointer;
}
```
to also cover `a`:
```css
.overview-system-map button, .overview-system-map a,
.overview-inline-links button, .overview-inline-links a,
.overview-chapter-grid button, .overview-chapter-grid a {
  font: inherit; color: var(--accent); cursor: pointer;
}
```

Change lines 672-677 from:
```css
.overview-system-map button,
.overview-inline-links button {
```
to:
```css
.overview-system-map button, .overview-system-map a,
.overview-inline-links button, .overview-inline-links a {
```

Change the hover rule (678-679) from:
```css
.overview-system-map button:hover,
.overview-inline-links button:hover { color: var(--text-primary); }
```
to:
```css
.overview-system-map button:hover, .overview-system-map a:hover,
.overview-inline-links button:hover, .overview-inline-links a:hover { color: var(--text-primary); }
```

Change the focus-visible block (680-684) from:
```css
.overview-system-map button:focus-visible,
.overview-inline-links button:focus-visible,
.overview-chapter-grid button:focus-visible {
  outline: 2px solid var(--accent); outline-offset: 3px;
}
```
to:
```css
.overview-system-map button:focus-visible, .overview-system-map a:focus-visible,
.overview-inline-links button:focus-visible, .overview-inline-links a:focus-visible,
.overview-chapter-grid button:focus-visible, .overview-chapter-grid a:focus-visible {
  outline: 2px solid var(--accent); outline-offset: 3px;
}
```
(The `.overview-chapter-grid a` layout rule is added in Task 3; adding it to these shared groups now is harmless since the chapter-nav card is not present until Task 3.)

- [ ] **Step 5: Verify PASS + no em dash + build**

Run: `pnpm exec vitest run tests/pages/overview.test.ts` (the diagrams test PASSes; the `not.toContain('data-dashboard-view')` now holds because Act 3-4 had none and these four are converted - the chapter-nav card is added in Task 3 and must also use links).
Run: `grep -c $'\u2014' src/pages/index.astro` (must print `0`).
Run: `pnpm check && pnpm build` (0 errors, 12 pages).

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro src/styles/global.css tests/pages/overview.test.ts
git commit -m "Add Overview operating-system diagrams (map, pathway, money-shift, rollout) with base-aware links"
```

---

### Task 3: Chapter-navigation grid card (page footer)

The `<h2>Each chapter answers a different implementation question</h2>` card, placed LAST in `<main>`.

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css`
- Test: `tests/pages/overview.test.ts` (extend)

**Interfaces:**
- Consumes: `base` (from Task 1 frontmatter).
- Produces: the chapter-nav card as the final `<section>` inside `<main>` (after the `benchmark-section` card), with 11 base-aware chapter links.

- [ ] **Step 1: Write the failing test**

Add to `tests/pages/overview.test.ts`:
```ts
test('overview ends with the chapter-nav grid of 11 base-aware links', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('overview-chapter-grid');
  expect(html).toContain('Each chapter answers a different implementation question');
  const grid = html.slice(html.indexOf('overview-chapter-grid'));
  const links = (grid.match(/<a /g) ?? []).length;
  expect(links).toBeGreaterThanOrEqual(11);
  expect(html).toContain('/US-National-Health-Assurance-System/quality');
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/pages/overview.test.ts`
Expected: FAIL - chapter-nav absent.

- [ ] **Step 3: Insert the chapter-nav card as the last card in `<main>`**

In `src/pages/index.astro`, immediately before the closing `</main>`, paste the chapter-nav card from `docs/index.html:373-424` verbatim, converting each of its 11 `<button type="button" data-dashboard-view="X">...</button>` blocks to `<a href={base + 'X'}>...</a>` (keep the inner `<span>`, `<strong>`, `<small>` children unchanged). The slugs in order: health, tax, legislation, units, medications, data, workforce, gov, hardening, rollout, quality.

- [ ] **Step 4: Add chapter-grid `a` layout styling to `global.css`**

The chapter-grid buttons are card-like (not underlined). Add `a` to the layout + hover rules so links match, and reset the default link underline/color. In `src/styles/global.css`:

Change lines 864-868 from:
```css
.overview-chapter-grid button {
  min-width: 0; padding: 11px 0 5px; border: 0;
  border-top: 3px solid var(--series-1); background: transparent;
  text-align: left;
}
```
to:
```css
.overview-chapter-grid button, .overview-chapter-grid a {
  min-width: 0; padding: 11px 0 5px; border: 0;
  border-top: 3px solid var(--series-1); background: transparent;
  text-align: left; text-decoration: none;
}
```

Change lines 869-871 from:
```css
.overview-chapter-grid button:nth-child(3n + 2) { border-top-color: var(--series-2); }
.overview-chapter-grid button:nth-child(3n) { border-top-color: var(--series-5); }
.overview-chapter-grid button:hover strong { color: var(--accent); }
```
to:
```css
.overview-chapter-grid button:nth-child(3n + 2),
.overview-chapter-grid a:nth-child(3n + 2) { border-top-color: var(--series-2); }
.overview-chapter-grid button:nth-child(3n),
.overview-chapter-grid a:nth-child(3n) { border-top-color: var(--series-5); }
.overview-chapter-grid button:hover strong,
.overview-chapter-grid a:hover strong { color: var(--accent); }
```

(The `.overview-chapter-grid a { color: var(--accent) }` from the Task 2 shared group is overridden for the inner text by the child `<strong>`/`<small>`/`<span>` colors, exactly as it is for the `<button>` version; the `text-decoration: none` added here prevents the default link underline.)

- [ ] **Step 5: Full suite + no em dash + build**

Run: `pnpm test` (all green, 65+ tests).
Run: `grep -c $'\u2014' src/pages/index.astro` (must print `0`).
Run: `pnpm check && pnpm build` (0 errors, 12 pages).

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro src/styles/global.css tests/pages/overview.test.ts
git commit -m "Add Overview chapter-nav grid (11 base-aware chapter links) as page footer"
```

---

### Task 4: Browser verification

**Files:** none (verification only). Follow the handoff browser workflow: `pnpm preview --port <N>` in background, then `mcp__Claude_Browser__preview_start {url}` + `javascript_tool` DOM inspection (screenshots avoided).

- [ ] **Step 1: Serve + inspect structure and order**

Confirm, on the Overview page, the card order: hero-preamble Act-1 (system today), Act-2 (what's wrong), Act-3 (fixable part), Act-4 (proposal), `.overview-system-map`, `.overview-care-path`, `.overview-money-shift`, `.overview-rollout-arc`, THEN `#hero-card` (the model section), the charts/tables/benchmarks, and finally `.overview-chapter-grid` as the last card. Confirm the four diagram cards + chapter-nav contain `<a>` links (not `<button data-dashboard-view>`), and that `document.querySelectorAll('.overview-chapter-grid a').length === 11`.

- [ ] **Step 2: Links are base-aware and resolve**

In the browser, read several link hrefs (e.g. the map's "Healthcare" link, the chapter-grid's "Quality" link) and confirm they equal `/US-National-Health-Assurance-System/health` and `/US-National-Health-Assurance-System/quality`. Click one (e.g. "Healthcare") and confirm navigation lands on that tab's page (a stub is fine) with no console error. `read_console_messages` - zero errors on the Overview.

- [ ] **Step 3: Static-render + parity check**

Confirm `dist/index.html` contains "The fixable part", "The proposal: National Health Assurance", "one operating system", and "Each chapter answers" directly (build-time, zero client JS). Grep `dist/index.html` for `data-dashboard-view` (must be absent) and U+2014 (must be absent). Optionally compare the four diagrams + chapter grid against the live docs (`mcp__Claude_Browser__preview_start {name:"nha-dashboard"}` at `http://localhost:8517/`) for visual parity.

- [ ] **Step 4: View Transitions**

Navigate to `/health` and back to Overview; confirm the diagrams and chapter grid are intact (static, no duplication) and the model section's single SVG instances still hold, with no console error.

---

## Follow-on slices (out of scope here)

- **P3 slice 11:** care-cost cards + household calculator (port `care.js` `CARE_SCENARIOS` + `HOUSEHOLD_PROFILES`), outcomes (`OUTCOME_STATS`), Methodology card, `#flow-takeaway`. Insert BETWEEN the benchmark-section card and the chapter-nav footer card. This finishes the Overview page.
- **P3 slice 12+:** the 11 remaining tabs, each replacing its `[chapter].astro` stub (set `Tab.ported = true`), DOM-diffed vs live.
- **P4/P5:** content collections; cutover.

## Self-review notes

- **Spec coverage:** implements the Overview narrative Acts 3-4 + the four operating-system diagrams + chapter-nav (docs `#view-overview` lines 86-424, the segment between the already-ported Acts 1-2 and the already-ported model section). Care/household/outcomes/methodology remain deferred to slice 11.
- **No govdata needed:** contrary to the earlier roadmap guess, all four diagrams are static HTML in the source (no JS renderers, no data binding); the only dynamic aspect was SPA navigation, handled by converting buttons to real base-aware links.
- **No placeholders:** every card cites an exact verbatim source range; the single transformation (button → anchor) is enumerated with a slug table; every CSS edit gives exact before/after text.
- **Type/name consistency:** `base = import.meta.env.BASE_URL` matches `TabNav.astro`; slugs match `Tab.path` in `src/lib/tabs.ts`; class names (`overview-system-map`, `overview-care-path`, `overview-money-shift`, `overview-rollout-arc`, `overview-chapter-grid`, `overview-inline-links`) match `docs/index.html` + existing `global.css`.
- **No em dash / no NaN risk:** static prose only; en dashes in the source are U+2013 (allowed). Em-dash grep in every markup task; the pre-existing `!html.includes(' - ')` overview test guards the rendered output.
- **Order rationale:** narrative preamble (Acts 1-4 + diagrams) precedes the model numbers; chapter-nav is the page footer. Slice 11 inserts before the footer, so no future reordering of the chapter-nav card is required.
