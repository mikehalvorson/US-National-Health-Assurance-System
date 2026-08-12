# NHA Astro Migration - P3 (slice 12): Legislation tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Legislation tab (docs `#view-legislation`, lines 428-691) to `src/pages/legislation.astro`, replacing its `[chapter].astro` stub: static prose verbatim, the interactive 14-domain "which laws change" master-detail widget, and the acronym-hover enhancement over the whole view.

**Architecture:** This is the first standalone tab port, establishing the pattern: a real `.astro` page plus `ported: true` on its `Tab` so the dynamic stub route (`src/pages/[chapter].astro`) drops it. Data (`DOMAINS`, `ACRONYMS`) moves to a pure `src/lib/legislation.ts` (Vitest-tested). A client module `src/scripts/legislation-client.ts` renders the master-detail list/detail and wraps acronyms in `<abbr>` on `astro:page-load`. The prose ships as zero-JS build-time HTML.

**Tech Stack:** Astro 5, TypeScript strict, Vitest 3.2.7. Consumes nothing from the model; `legislation-*` CSS already exists in `src/styles/global.css` (152 rules).

## Global Constraints

- Platform: Windows. Bash tool or PowerShell. node 22.23.1 / pnpm 11.17.0 (Volta). Working dir: `C:\Users\micha\OneDrive\Desktop\Healthcare Framework\ChatGPT Work Outputs\Claude Outputs`.
- TypeScript `strict`; avoid gratuitous `any`.
- **Fidelity:** `DOMAINS` (14 entries) + `ACRONYMS` verbatim from `docs/js/legislation.js:10-356`. The master-detail renderer + acronym walker port `docs/js/legislation.js:358-485` exactly (same class names, same `aria-pressed`/`aria-label`, same `Domain NN` numbering, same field labels "What changes"/"What remains protected"/"How the change is performed"/"Activation and sunset"/"Affected laws and legal systems"/"Primary law"). The prose is verbatim from `docs/index.html:429-690`.
- No em dashes ( - , U+2014) in reader-visible output. En dash `–` (U+2013) allowed. Grep after each task; must be 0. (Note the prose + data use hyphens and `§`/`·`; keep them.)
- The two widget containers `#legislation-law-list` and `#legislation-law-detail` render empty at build time; the client fills them. All other legislation content is build-time static.
- Client re-inits on `astro:page-load` (View Transitions), idempotent-guarded.
- Do NOT modify `docs/` or the engine modules. You MAY create `src/lib/legislation.ts`, `src/scripts/legislation-client.ts`, `src/pages/legislation.astro`, edit `src/lib/tabs.ts`, plus tests.
- Base path `/US-National-Health-Assurance-System/`. Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Scope:** the Legislation tab ONLY. Does not touch the Overview or the health-tab question.

## File structure

```
src/
  lib/
    legislation.ts        NEW: Domain type, DOMAINS (14, verbatim), ACRONYMS
    tabs.ts               set legislation Tab.ported = true
  scripts/
    legislation-client.ts NEW: master-detail render + acronym hovers, astro:page-load
  pages/
    legislation.astro     NEW: static prose (verbatim) + empty widget containers + client <script>
tests/lib/
  legislation.test.ts     NEW: DOMAINS shape + ACRONYMS
tests/pages/
  legislation.test.ts     NEW: prose + containers render; stub dropped
```

---

### Task 1: `src/lib/legislation.ts` - DOMAINS + ACRONYMS

**Files:**
- Create: `src/lib/legislation.ts`
- Test: `tests/lib/legislation.test.ts` (new)

**Interfaces:**
- Produces: `interface Domain { title: string; short: string; actions: string[]; laws: string[]; change: string; preserve: string; method: string; phase: string; sources: [string, string][] }`; `const DOMAINS: Domain[]` (14); `const ACRONYMS: Record<string, string>`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/legislation.test.ts`:
```ts
import { expect, test } from 'vitest';
import { DOMAINS, ACRONYMS } from '../../src/lib/legislation';

test('DOMAINS: 14 legal domains, first is Coverage', () => {
  expect(DOMAINS).toHaveLength(14);
  expect(DOMAINS[0].short).toBe('Coverage');
  expect(DOMAINS[0].actions.length).toBeGreaterThan(0);
  expect(DOMAINS[0].sources[0]).toHaveLength(2); // [label, url]
  expect(DOMAINS.every((d) => d.laws.length > 0 && d.change && d.preserve && d.method && d.phase)).toBe(true);
});

test('ACRONYMS: dictionary maps abbreviations to expansions', () => {
  expect(ACRONYMS.ERISA).toContain('Employee Retirement');
  expect(Object.keys(ACRONYMS).length).toBeGreaterThan(30);
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/lib/legislation.test.ts` - FAIL (module missing).

- [ ] **Step 3: Create `src/lib/legislation.ts`**

```ts
/* Legislation crosswalk data, ported verbatim from docs/js/legislation.js
   (DOMAINS 10-306, ACRONYMS 308-356). A major-law-family planning crosswalk,
   not legal advice. Fidelity-critical: do not re-derive. */

export interface Domain {
  title: string;
  short: string;
  actions: string[];
  laws: string[];
  change: string;
  preserve: string;
  method: string;
  phase: string;
  sources: [string, string][];
}

export const DOMAINS: Domain[] = [
  // ... paste the 14 domain objects verbatim from docs/js/legislation.js:11-305,
  //     converting each `sources: [ [label, url], ... ]` array of pairs to
  //     [string, string][] (already in that shape). Keep every string exact.
];

export const ACRONYMS: Record<string, string> = {
  // ... paste verbatim from docs/js/legislation.js:308-356.
};
```
Paste the 14 `DOMAINS` objects (Coverage … Markets and research) and the `ACRONYMS` map exactly as written in `docs/js/legislation.js`.

- [ ] **Step 4: Verify PASS + type-check + no em dash**

Run: `pnpm exec vitest run tests/lib/legislation.test.ts` (PASS).
Run: `pnpm exec tsc --noEmit` (exit 0).
Run: `grep -c $'\u2014' src/lib/legislation.ts` (must print `0`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/legislation.ts tests/lib/legislation.test.ts
git commit -m "Add legislation.ts: verbatim DOMAINS + ACRONYMS crosswalk data"
```

---

### Task 2: `src/scripts/legislation-client.ts` - master-detail + acronym hovers

DOM module; browser-verified in Task 4 (test env has no `document`).

**Files:**
- Create: `src/scripts/legislation-client.ts`

**Interfaces:**
- Consumes: `DOMAINS`, `ACRONYMS` from `../lib/legislation`.
- Produces: an `astro:page-load` handler that renders `#legislation-law-list` + `#legislation-law-detail` and wraps acronyms across `#view-legislation`'s content. Idempotent.

- [ ] **Step 1: Create `src/scripts/legislation-client.ts`**

Port `docs/js/legislation.js:358-485` (element/renderDetail/renderList/addAcronymHovers), driven on `astro:page-load`, guarded idempotent:
```ts
/* Legislation tab client: master-detail domain browser + acronym hovers.
   Port of docs/js/legislation.js:358-485. Runs on astro:page-load; idempotent
   via the list container's dataset.wired guard. */
import { DOMAINS, ACRONYMS } from '../lib/legislation';

function element(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderDetail(list: HTMLElement, host: HTMLElement, index: number): void {
  const domain = DOMAINS[index];
  host.querySelectorAll('button'); // no-op placeholder to keep parity comment
  const buttons = list.querySelectorAll('button');
  buttons.forEach(function (button, buttonIndex) {
    button.setAttribute('aria-pressed', buttonIndex === index ? 'true' : 'false');
  });

  host.textContent = '';
  const head = element('div', 'legislation-law-detail-head');
  head.appendChild(element('span', '', 'Domain ' + String(index + 1).padStart(2, '0')));
  head.appendChild(element('h3', '', domain.title));

  const badges = element('div', 'legislation-action-badges');
  domain.actions.forEach(function (action) {
    badges.appendChild(element('span', 'legislation-action legislation-action-' + action.toLowerCase(), action));
  });

  const lawSection = element('section', 'legislation-law-field legislation-law-field-wide');
  lawSection.appendChild(element('h4', '', 'Affected laws and legal systems'));
  const laws = element('ul', '');
  domain.laws.forEach(function (law) { laws.appendChild(element('li', '', law)); });
  lawSection.appendChild(laws);

  function field(label: string, value: string): HTMLElement {
    const section = element('section', 'legislation-law-field');
    section.appendChild(element('h4', '', label));
    section.appendChild(element('p', '', value));
    return section;
  }

  const grid = element('div', 'legislation-law-fields');
  grid.appendChild(lawSection);
  grid.appendChild(field('What changes', domain.change));
  grid.appendChild(field('What remains protected', domain.preserve));
  grid.appendChild(field('How the change is performed', domain.method));
  grid.appendChild(field('Activation and sunset', domain.phase));

  const sources = element('div', 'legislation-law-sources');
  sources.appendChild(element('span', '', 'Primary law'));
  domain.sources.forEach(function (source) {
    const link = element('a', '', source[0]) as HTMLAnchorElement;
    link.href = source[1];
    link.target = '_blank';
    link.rel = 'noopener';
    sources.appendChild(link);
  });

  host.appendChild(head);
  host.appendChild(badges);
  host.appendChild(grid);
  host.appendChild(sources);
  addAcronymHovers(host);
}

function renderList(list: HTMLElement, host: HTMLElement): void {
  DOMAINS.forEach(function (domain, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'legislation-law-button';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', 'Open legal domain ' + (index + 1) + ': ' + domain.title);
    button.appendChild(element('span', '', String(index + 1).padStart(2, '0')));
    button.appendChild(element('strong', '', domain.short));
    button.addEventListener('click', function () { renderDetail(list, host, index); });
    host.ownerDocument; // parity
    list.appendChild(button);
  });
  renderDetail(list, host, 0);
}

function addAcronymHovers(root: HTMLElement | null): void {
  if (!root) return;
  const keys = Object.keys(ACRONYMS).sort(function (a, b) { return b.length - a.length; });
  const escaped = keys.map(function (key) { return key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
  const pattern = new RegExp('\\b(' + escaped.join('|') + ')\\b', 'g');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent || parent.closest('abbr, script, style')) continue;
    pattern.lastIndex = 0;
    if (pattern.test(node.nodeValue || '')) textNodes.push(node);
  }
  textNodes.forEach(function (node) {
    const text = node.nodeValue || '';
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    pattern.lastIndex = 0;
    text.replace(pattern, function (match: string, acronym: string, offset: number) {
      if (offset > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
      const abbr = document.createElement('abbr');
      abbr.className = 'legislation-acronym';
      abbr.title = ACRONYMS[acronym];
      abbr.setAttribute('aria-label', acronym + ': ' + ACRONYMS[acronym]);
      abbr.textContent = acronym;
      fragment.appendChild(abbr);
      lastIndex = offset + match.length;
      return match;
    });
    if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    node.parentNode!.replaceChild(fragment, node);
  });
}

function initLegislation(): void {
  const list = document.getElementById('legislation-law-list');
  const host = document.getElementById('legislation-law-detail');
  if (!list || !host) return; // not on the legislation page
  if (list.dataset.wired === '1') return;
  list.dataset.wired = '1';
  renderList(list, host);
  addAcronymHovers(document.querySelector('main'));
}

document.addEventListener('astro:page-load', initLegislation);
```
NOTE: the two `// parity` / `host.ownerDocument` lines above are scaffolding hints - remove them; they exist only to flag where the original had incidental statements. The real logic is renderDetail/renderList/addAcronymHovers/initLegislation.

- [ ] **Step 2: Type-check + no em dash**

Run: `pnpm exec tsc --noEmit` (exit 0).
Run: `grep -c $'\u2014' src/scripts/legislation-client.ts` (must print `0`).

- [ ] **Step 3: Commit**

```bash
git add src/scripts/legislation-client.ts
git commit -m "Add legislation-client.ts: master-detail domain browser + acronym hovers"
```

---

### Task 3: `legislation.astro` page + flip `Tab.ported`

**Files:**
- Create: `src/pages/legislation.astro`
- Modify: `src/lib/tabs.ts`
- Test: `tests/pages/legislation.test.ts` (new)

**Interfaces:**
- Produces: the `/legislation` route with the full static prose, the empty widget containers, and the client script; the `[chapter].astro` stub no longer emits `/legislation` because its `Tab.ported` is now `true`.

- [ ] **Step 1: Write the failing test**

Create `tests/pages/legislation.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Legislation from '../../src/pages/legislation.astro';

test('legislation page renders prose + empty widget containers, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Legislation);
  expect(html).toContain('What Congress must enact');
  expect(html).toContain('id="legislation-law-list"');
  expect(html).toContain('id="legislation-law-detail"');
  expect(html.includes(' - ')).toBe(false);
});
```

- [ ] **Step 2: Run to verify FAIL**

Run: `pnpm exec vitest run tests/pages/legislation.test.ts` - FAIL (page missing).

- [ ] **Step 3: Create `src/pages/legislation.astro`**

Wrap in `BaseLayout` and copy the legislation prose verbatim from `docs/index.html:429-690` (everything inside `<div id="view-legislation" hidden> … </div>`, dropping that wrapper div and the `hidden` attribute). Leave `<div id="legislation-law-list" …>` and `<article id="legislation-law-detail" …>` exactly as in the source but empty (the client fills them). Add the client script at the end. Frontmatter:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="National Health Assurance: Legislation">
  <main>
    {/* ... verbatim legislation prose from docs/index.html:429-690, wrapper stripped,
         with #legislation-law-list and #legislation-law-detail left empty ... */}
  </main>
</BaseLayout>

<script>
  import '../scripts/legislation-client.ts';
</script>
```
After pasting, grep the file for U+2014 (must be 0). Confirm the `#legislation-law-list`/`#legislation-law-detail` markup (classes, `aria-label`, etc.) is preserved exactly.

- [ ] **Step 4: Flip `Tab.ported` in `src/lib/tabs.ts`**

Change the legislation entry:
```ts
{ id: 'tab-legislation', label: 'Legislation', path: 'legislation', ported: true },
```

- [ ] **Step 5: Verify PASS + no em dash + build**

Run: `pnpm exec vitest run tests/pages/legislation.test.ts` (PASS).
Run: `grep -c $'\u2014' src/pages/legislation.astro` (must print `0`).
Run: `pnpm test && pnpm check && pnpm build`
Expected: all green, 0 type errors, and the build still emits 12 pages (the `[chapter].astro` stub now emits 10 instead of 11 dynamic pages, and `legislation.astro` adds one - net 12).

- [ ] **Step 6: Commit**

```bash
git add src/pages/legislation.astro src/lib/tabs.ts tests/pages/legislation.test.ts
git commit -m "Port Legislation tab: real page + master-detail widget, drop its stub"
```

---

### Task 4: Browser verification

**Files:** none. Handoff browser workflow; live docs parity server at `http://localhost:8517/` (`preview_start {name:"nha-dashboard"}`), Astro at `pnpm preview`.

- [ ] **Step 1: Serve + inspect the tab**

Open `/legislation`. Confirm: the prose sections render (hero "The legal operating plan", "What Congress must enact", "Which existing laws change", the authority/constitution grids, the closing), the `#legislation-law-list` has 14 `.legislation-law-button`s, clicking the first shows `#legislation-law-detail` with `Domain 01`, the badges, the five field sections, and the "Primary law" source links, and clicking another domain (e.g. the 4th) swaps the detail and sets `aria-pressed="true"` on it. Acronyms in the prose (e.g. `ERISA`, `HIPAA`) are wrapped in `<abbr class="legislation-acronym">` with a title. `read_console_messages` - zero errors.

- [ ] **Step 2: Stub is gone + nav works**

Confirm `/legislation` is the real page (not "This chapter is being migrated"). Confirm the `[chapter].astro` still serves the other un-ported tabs as stubs (e.g. `/units`). Confirm the top nav's Legislation link is `active` on this page.

- [ ] **Step 3: DOM parity vs live**

Against the live docs (`http://localhost:8517/`, click the Legislation tab), spot-check that the domain list order, the first domain's detail fields, and the acronym wrapping match.

- [ ] **Step 4: View Transitions**

Navigate to `/` (Overview) and back to `/legislation`; confirm the master-detail re-initialises (14 buttons, detail on domain 1, no duplication) and acronyms are wrapped, with no console error.

---

## Follow-on (out of scope here)

- **P3 slice 13+:** the remaining tabs - `tax` (needs `taxcharts.js` + `taxapp.js` ports; the tax model libs already exist), `units` (county map + `unitsapp.js`/`unitsmap.js`), `medications` (200 families), `data`, `workforce`, `gov`, `hardening`, `rollout`, `quality` (430-item catalog), and the deferred `health`-tab structure decision. Each replaces its `[chapter].astro` stub via `Tab.ported = true`.
- **P4/P5:** content collections; cutover.

## Self-review notes

- **Spec coverage:** ports the whole Legislation tab - prose, the 14-domain master-detail widget, and acronym hovers - and establishes the `Tab.ported` stub-drop pattern for every following tab.
- **No placeholders:** the client module is given in full; `DOMAINS`/`ACRONYMS` cite an exact verbatim source range (literal data); the prose cites `docs/index.html:429-690` with the one structural edit (strip the `hidden` wrapper, keep the two containers empty).
- **Type/name consistency:** `Domain`/`DOMAINS`/`ACRONYMS` are new in `legislation.ts`; the client consumes them; class names (`legislation-law-list`, `legislation-law-detail`, `legislation-law-button`, `legislation-law-detail-head`, `legislation-action(-*)`, `legislation-law-field(-wide)`, `legislation-law-fields`, `legislation-law-sources`, `legislation-acronym`) and ids match `docs` + the 152 existing `legislation-*` rules in `global.css`; `Tab.ported` matches the `[chapter].astro` `getStaticPaths` filter.
- **No em dash:** data + prose use hyphens/`§`/`·`; em-dash greps in every task.
- **View-Transition safety:** `initLegislation` guards on `#legislation-law-list dataset.wired`; on navigation the DOM is fresh so re-init rebuilds cleanly; `addAcronymHovers` skips existing `<abbr>` so it never double-wraps.
- **Page count:** flipping `Tab.ported` moves `/legislation` from the dynamic stub route to a real page; total stays 12.
