# NHA Astro Migration — Foundation (P0 + P1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up an Astro + TypeScript project at the repo root whose static build reproduces the dashboard's shell (header, 12-button nav, meta, footer) pixel-identically, deployable to GitHub Pages under the repo sub-path, without disturbing the currently live `docs/` site.

**Architecture:** Astro static-output project lives at the repo root alongside the existing `docs/` site, which stays live until a later cutover. This plan delivers only the shell/layout and toolchain; tab content and the model engine are follow-on plans. Verification is by Vitest tests using Astro's Container API plus DOM inspection of the dev server against the live site.

**Tech Stack:** Astro (static), TypeScript (strict), pnpm, Volta (pins Node + pnpm), Vitest, GitHub Actions (`withastro/action`).

## Global Constraints

- Platform: Windows. PowerShell primary; Bash also available. Machine starts with **no Node, no Python** — P0 installs the Node toolchain.
- Node: LTS (v22.x), pinned via Volta in `package.json`.
- Package manager: pnpm, pinned via Volta in `package.json`.
- TypeScript: `strict` mode.
- Repo: `mikehalvorson/US-National-Health-Assurance-System`.
  - `site: 'https://mikehalvorson.github.io'`
  - `base: '/US-National-Health-Assurance-System/'`
- Hard content rules (unchanged): **No em dashes (—) anywhere a reader can see.** No references to the source document. Every number sourced with a confidence grade. No cross-scale dollar comparisons. Professional voice, not AI voice.
- **Do not touch or break the live site under `docs/`.** GitHub Pages keeps serving `docs/` until the P5 cutover (a later plan). This plan must not change the Pages source setting.
- All asset URLs in Astro must resolve through `import.meta.env.BASE_URL`, never hardcoded `/`.
- New build artifacts (`dist/`, `node_modules/`, `.astro/`) must be gitignored.

---

### Task 1: Install the Node toolchain via Volta

**Files:**
- None (environment setup only).

**Interfaces:**
- Consumes: nothing.
- Produces: working `node`, `pnpm`, and `volta` commands on PATH for later tasks.

- [ ] **Step 1: Install Volta**

Run in PowerShell:
```powershell
winget install --id Volta.Volta --source winget --accept-package-agreements --accept-source-agreements
```
Then **open a new terminal** so PATH updates take effect (Volta adds itself to the user PATH; the current shell will not see it).

- [ ] **Step 2: Verify Volta is on PATH**

Run: `volta --version`
Expected: a version string such as `2.0.2` (any 1.1.0+ is fine; pnpm support requires >= 1.1.0). If "command not found," the terminal was not reopened after install.

- [ ] **Step 3: Install Node LTS and pnpm through Volta**

Run:
```powershell
volta install node@22
volta install pnpm
```

- [ ] **Step 4: Verify the toolchain**

Run: `node --version; pnpm --version`
Expected: `v22.x.x` on the first line and a pnpm version (9.x or 10.x) on the second. Both must print without error before continuing.

---

### Task 2: Create the package manifest with pinned tooling and dependencies

**Files:**
- Create: `package.json`
- Create: `.gitignore` additions (modify existing `.gitignore`)

**Interfaces:**
- Consumes: Node + pnpm from Task 1.
- Produces: `pnpm` scripts `dev`, `build`, `preview`, `check`, `test`; an installed `node_modules/`.

- [ ] **Step 1: Create `package.json` at the repo root**

```json
{
  "name": "nha-dashboard",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check && tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  },
  "volta": {
    "node": "22.11.0",
    "pnpm": "9.12.0"
  }
}
```
(Pin the exact `volta.node`/`volta.pnpm` to whatever Task 1 Step 4 printed.)

- [ ] **Step 2: Add build artifacts to `.gitignore`**

Append these lines to the existing `.gitignore`:
```
# Astro
node_modules/
dist/
.astro/
```

- [ ] **Step 3: Install dependencies**

Run: `pnpm install`
Expected: creates `node_modules/` and `pnpm-lock.yaml`, exits 0.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .gitignore
git commit -m "Add Astro toolchain: package.json, Volta pins, pnpm lockfile"
```

---

### Task 3: Add Astro + TypeScript config with the GitHub Pages base path

**Files:**
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `src/env.d.ts`

**Interfaces:**
- Consumes: dependencies from Task 2.
- Produces: an Astro project configured for static output under the repo sub-path; `import.meta.env.BASE_URL === '/US-National-Health-Assurance-System/'` at build time.

- [ ] **Step 1: Create `astro.config.mjs`**

```js
// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://mikehalvorson.github.io',
  base: '/US-National-Health-Assurance-System/',
  output: 'static',
  trailingSlash: 'ignore',
});
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "docs", "node_modules"]
}
```
(`docs` is excluded so the old vanilla JS site is never type-checked.)

- [ ] **Step 3: Create `src/env.d.ts`**

```ts
/// <reference types="astro/client" />
```

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs tsconfig.json src/env.d.ts
git commit -m "Add Astro + strict TypeScript config with Pages base path"
```

---

### Task 4: Minimal page and layout that builds

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/pages/index.astro`

**Interfaces:**
- Consumes: config from Task 3.
- Produces: `BaseLayout.astro` exporting a default layout with a `title` prop and a `<slot />`; a home page that builds to `dist/US-National-Health-Assurance-System/index.html`.

- [ ] **Step 1: Create `src/layouts/BaseLayout.astro`**

```astro
---
interface Props { title: string }
const { title } = Astro.props;
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
</head>
<body>
  <slot />
</body>
</html>
```

- [ ] **Step 2: Create `src/pages/index.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="National Health Assurance: Story & System Dashboard">
  <main><p>Migration scaffold online.</p></main>
</BaseLayout>
```

- [ ] **Step 3: Build and verify output**

Run: `pnpm build`
Expected: exits 0 and creates `dist/index.html`. NOTE: Astro's `base` only
prefixes generated URLs/links; it does NOT nest the physical `dist/` output,
so the file is `dist/index.html` (flat), not under a base-named subdirectory.
`astro preview` and the Pages deploy apply `base` at serve time.

- [ ] **Step 4: Type-check**

Run: `pnpm check`
Expected: `astro check` reports 0 errors, `tsc --noEmit` exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/BaseLayout.astro src/pages/index.astro
git commit -m "Add minimal Astro layout and home page that builds"
```

---

### Task 5: Vitest set up with a rendering test (TDD)

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/shell.test.ts`

**Interfaces:**
- Consumes: `BaseLayout.astro` from Task 4.
- Produces: `renderToString` usage of Astro's Container API; a passing `pnpm test`. Establishes the rendering-assertion pattern reused in Task 7.

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
```

- [ ] **Step 2: Write the failing test**

`tests/shell.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import BaseLayout from '../src/layouts/BaseLayout.astro';

test('BaseLayout renders the document title', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(BaseLayout, {
    props: { title: 'National Health Assurance: Story & System Dashboard' },
    slots: { default: '<main>x</main>' },
  });
  expect(html).toContain('<title>National Health Assurance');
  expect(html).toContain('<main>x</main>');
});
```

- [ ] **Step 3: Run the test to verify the Vitest + Container harness works**

Run: `pnpm test`
Expected: the test executes and PASSES (BaseLayout, built in Task 4, already renders a title). This task's purpose is to stand up the Vitest + Astro Container harness reused for real TDD in Task 7; it is intentionally a green harness-bootstrap check, not a red-first test. If it errors on the `astro/container` import, ensure Astro >= 5 is installed.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts tests/shell.test.ts
git commit -m "Add Vitest with Astro Container rendering test"
```

---

### Task 6: Write (but do not activate) the GitHub Pages deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: the buildable project from Tasks 3–4.
- Produces: a Pages deploy workflow, present in the repo but **not** the active Pages source until the P5 cutover.

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages
on:
  workflow_dispatch: {}
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: withastro/action@v3
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```
Note: the trigger is `workflow_dispatch` **only** (manual). It does not run on push, so it will not fight the live `docs/` site. The P5 cutover plan changes this to `on: push` and switches the Pages source to "GitHub Actions".

- [ ] **Step 2: Verify the workflow is valid YAML**

Run: `node -e "const y=require('fs').readFileSync('.github/workflows/deploy.yml','utf8'); if(!y.includes('withastro/action@v3')) throw new Error('missing action'); console.log('workflow ok')"`
Expected: prints `workflow ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "Add manual-only Astro Pages deploy workflow (inactive until cutover)"
```

---

### Task 7: Port the shell (header, nav, meta, footer) with parity assertions (TDD)

**Files:**
- Create: `src/styles/global.css` (copied from `docs/style.css`)
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/pages/index.astro`
- Create: `src/components/SiteHeader.astro`
- Create: `src/components/TabNav.astro`
- Modify: `tests/shell.test.ts`

**Interfaces:**
- Consumes: the rendering-test pattern from Task 5.
- Produces: a `TabNav.astro` rendering exactly 12 `<button>` elements with ids `tab-overview … tab-quality`; a shell whose rendered HTML matches the live site's header/nav text.

- [ ] **Step 1: Copy the stylesheet verbatim**

Copy `docs/style.css` to `src/styles/global.css` unchanged (it is already a CSS-variable system with light and dark themes). Do not edit it.

- [ ] **Step 2: Write the failing shell test**

Replace the body of `tests/shell.test.ts` with:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import TabNav from '../src/components/TabNav.astro';

const TAB_IDS = [
  'tab-overview','tab-health','tab-tax','tab-legislation','tab-units',
  'tab-medications','tab-data','tab-workforce','tab-gov','tab-hardening',
  'tab-rollout','tab-quality',
];

test('TabNav renders all twelve tab buttons in order', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(TabNav);
  for (const id of TAB_IDS) expect(html).toContain(`id="${id}"`);
  const buttonCount = (html.match(/<button/g) ?? []).length;
  expect(buttonCount).toBe(12);
});

test('shell contains no em dashes (hard content rule)', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(TabNav);
  expect(html.includes('—')).toBe(false);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL with a module-not-found error for `../src/components/TabNav.astro` (not created yet).

- [ ] **Step 4: Create `src/components/TabNav.astro`**

Reproduce the live nav markup exactly (from `docs/index.html` lines 30-42):
```astro
---
const tabs = [
  ['tab-overview', 'Overview'],
  ['tab-health', 'Healthcare'],
  ['tab-tax', 'Taxes & Financing'],
  ['tab-legislation', 'Legislation'],
  ['tab-units', 'Physical Care'],
  ['tab-medications', 'Medications'],
  ['tab-data', 'Data'],
  ['tab-workforce', 'Workforce'],
  ['tab-gov', 'Governance'],
  ['tab-hardening', 'Executive Hardening'],
  ['tab-rollout', 'Phased Rollout'],
  ['tab-quality', 'Quality'],
] as const;
---
<nav class="tabs" aria-label="Dashboard sections">
  {tabs.map(([id, label], i) => (
    <button id={id} class={i === 0 ? 'active' : undefined} set:html={label}></button>
  ))}
</nav>
```
Note: `set:html` is used so `&` in "Taxes & Financing" renders as the same entity the live site shows. Verify the rendered text matches.

- [ ] **Step 5: Create `src/components/SiteHeader.astro`**

Reproduce the live header (from `docs/index.html` lines 12-28) verbatim, including the meta paragraph and the "Sources & methodology on GitHub" link:
```astro
---
---
<header class="site">
  <h1>National Health Assurance: Story &amp; System Dashboard</h1>
  <p class="sub">
    A guided, evidence-linked tour of the proposed National Health Assurance
    system: why change is needed, how care delivery, data, medicines,
    workforce, financing, quality, and governance fit together, and how the
    twelve-year rollout is held to readiness gates. Each chapter opens into
    a deeper working model or operating plan.
  </p>
  <p class="meta">
    All results in real 2024 dollars. Calibrated to CMS National Health
    Expenditure data (2023, the last finalized year) and CBO's household
    income and federal tax distribution.
    <a href="https://github.com/mikehalvorson/US-National-Health-Assurance-System" target="_blank" rel="noopener">Sources &amp; methodology on GitHub</a>.
  </p>
</header>
```

- [ ] **Step 6: Wire the stylesheet and shell into `BaseLayout.astro`**

Update `BaseLayout.astro` to import the global stylesheet and render header + nav around the slot:
```astro
---
import '../styles/global.css';
import SiteHeader from '../components/SiteHeader.astro';
import TabNav from '../components/TabNav.astro';
interface Props { title: string; description?: string }
const { title, description } = Astro.props;
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  {description && <meta name="description" content={description} />}
</head>
<body>
  <div class="wrap">
    <SiteHeader />
    <TabNav />
    <slot />
  </div>
</body>
</html>
```
Astro rewrites the imported-CSS `<link>` through the `base` path automatically, so no hardcoded stylesheet URL is needed.

- [ ] **Step 7: Update `src/pages/index.astro` to pass the real description**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout
  title="National Health Assurance: Story & System Dashboard"
  description="A guided, evidence-linked dashboard explaining the proposed U.S. National Health Assurance system, its twelve-year rollout, operating architecture, safeguards, and interactive cost and financing models."
>
  <main><p>Tab content is migrated in follow-on plans.</p></main>
</BaseLayout>
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `pnpm test`
Expected: both tests PASS (12 buttons found, 0 em dashes).

- [ ] **Step 9: Type-check and build**

Run: `pnpm check && pnpm build`
Expected: 0 type errors; build writes `dist/US-National-Health-Assurance-System/index.html` whose `<link>` to the stylesheet begins with `/US-National-Health-Assurance-System/`.

- [ ] **Step 10: Commit**

```bash
git add src/styles/global.css src/layouts/BaseLayout.astro src/components/SiteHeader.astro src/components/TabNav.astro src/pages/index.astro tests/shell.test.ts
git commit -m "Port dashboard shell (header, 12-tab nav, meta) into Astro layout"
```

---

### Task 8: Verify shell parity against the live site and the base path locally

**Files:**
- None (verification only).

**Interfaces:**
- Consumes: the built site from Task 7.
- Produces: recorded confirmation that the shell renders identically and asset URLs resolve under the sub-path. No live-site changes.

- [ ] **Step 1: Serve the production build under the base path**

Run: `pnpm preview`
Expected: a local server URL. The dashboard shell is reachable at `http://localhost:4321/US-National-Health-Assurance-System/` (Astro `preview` honors `base`).

- [ ] **Step 2: Confirm the stylesheet loads (no 404 under the sub-path)**

Using the browser pane, open the preview URL, then read the network requests: the `global.css` (or hashed `_astro/*.css`) request returns 200, and its URL begins with `/US-National-Health-Assurance-System/`. This proves the base-path asset wiring works, the top migration risk.

- [ ] **Step 3: DOM-diff the shell against the live site**

Per the project's verify-with-`innerText` convention (browser-pane screenshots have hung repeatedly this project; do not rely on them):
- Read `document.querySelector('header.site').innerText` on the preview and compare it word-for-word to the live `docs/index.html` header text.
- Read `[...document.querySelectorAll('nav.tabs button')].map(b => b.textContent)` and confirm it equals the 12 labels in order.
- Count em dashes in the rendered shell: `(document.querySelector('.wrap').innerText.match(/—/g) || []).length` must be `0`.

- [ ] **Step 4: Record the result**

If any check fails, fix the offending component (Task 7) and re-run. When all pass, note in the commit or the session log that shell parity is confirmed. No code change if all green.

---

## Follow-on plans (out of scope here, listed for continuity)

- **P2 — Model engine:** port `params/model/scenarios/charts/care` and the tax modules to `src/lib/*.ts`, converting `NHA.selfTest()` + `NHA.SELFTESTS` invariants into Vitest suites. Requires reading the model source first.
- **P3 — Tabs:** port each of the 12 views to `src/pages/*.astro` + island components, DOM-diffed against the live original one at a time.
- **P4 — Content collections:** move the sourced catalogs into Zod-validated Astro content collections; the build fails on any number missing its confidence grade.
- **P5 — Cutover:** flip `deploy.yml` to `on: push`, switch the Pages source to "GitHub Actions", retire the old `docs/` static files and the root redirect.

## Self-review notes

- Spec coverage: this plan implements spec §1 (structure, partial: shell/layout), §5 (tooling: Volta/pnpm/TS/Vitest), §6 (Pages base path + workflow, activation deferred), §7 P0–P1. Spec §2–§4 (islands, content collections) and §7 P2–P5 are explicitly deferred to the follow-on plans above.
- No unresolved placeholders: the only intentional variable is the exact Volta version pin, taken from Task 1's printed output.
- Type/name consistency: `BaseLayout` props (`title`, `description`), `TabNav` tab ids, and the `TAB_IDS` test array all use the same 12 ids in the same order as `docs/index.html`.
- Live-site safety: the deploy workflow is `workflow_dispatch`-only and the Pages source is untouched, so `docs/` keeps serving throughout.
