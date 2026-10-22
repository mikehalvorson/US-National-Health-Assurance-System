import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import { readFileSync, readdirSync, cpSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  roleImgFocusFaults, orphanAriaLabelFaults, ariaAsStateFaults, renderedAuditCodeFaults
} from '../../src/lib/manifest-check';
import { NODE_TYPE_LABELS } from '../../src/lib/equation-diagram';
import type { DiagNodeType } from '../../src/lib/equation-diagram';
import { TABS } from '../../src/lib/tabs';

const PAGES_DIR = fileURLToPath(new URL('../../src/pages', import.meta.url));
const pageFiles = readdirSync(PAGES_DIR).filter((f) => f.endsWith('.astro')).sort();

/* ---- R268: a skip link, on all fourteen pages --------------------------- */

test('the page count the accessibility rows are scoped against is fourteen', () => {
  /* R261 found every "all pages" claim in the audit scoped against twelve.
     This pins the denominator these tests run over to the route registry. */
  expect(pageFiles.length).toBe(TABS.length);
  expect(pageFiles.length).toBe(14);
});

test('R268: every page renders a skip link before any other focusable element', async () => {
  const container = await AstroContainer.create();
  for (const file of pageFiles) {
    const mod = await import(/* @vite-ignore */ join(PAGES_DIR, file));
    const html = await container.renderToString(mod.default);
    const firstAnchor = html.indexOf('<a ');
    const skipAt = html.indexOf('class="skip-link"');
    expect(skipAt, file + ' has no skip link').toBeGreaterThan(-1);
    /* it is not enough for the link to exist: it has to come first, and
       SiteHeader's sources link used to be the first focusable element. */
    expect(firstAnchor, file + ' has a focusable element before the skip link')
      .toBe(html.indexOf('<a class="skip-link"'));
    const firstFocusable = html.search(/<(a|button|select|input|textarea)\b/);
    expect(firstFocusable, file).toBe(firstAnchor);

    /* The link's target, asked of the rendered page. Review 9 of P20 moved
       <main> into BaseLayout beside the link; this used to read fourteen page
       sources for a hand-copied tag. Exactly one: a page that still declared
       its own would nest a second <main>, which is invalid. And focusable:
       a bare <main> would move the reading position while leaving the tab
       order where it was. */
    const mains = html.match(/<main\b[^>]*>/g) ?? [];
    expect(mains, file + ' main elements').toHaveLength(1);
    expect(mains[0], file).toMatch(/\bid="main"/);
    expect(mains[0], file + ' main cannot take focus').toMatch(/\btabindex="-1"/);
  }
});

/* ---- R166: no focusable element inside a role="img" subtree -------------- */

test('R166: no chart puts a tab stop inside an image-role subtree', () => {
  expect(roleImgFocusFaults()).toEqual([]);
});

function chartSourceFiles(): [string, string][] {
  const LIB = fileURLToPath(new URL('../../src/lib', import.meta.url));
  const SCRIPTS = fileURLToPath(new URL('../../src/scripts', import.meta.url));
  return [
    ...readdirSync(LIB).filter((f) => f.endsWith('.ts')).map((f) => ['src/lib/' + f, join(LIB, f)] as [string, string]),
    ...readdirSync(SCRIPTS).filter((f) => f.endsWith('.ts')).map((f) => ['src/scripts/' + f, join(SCRIPTS, f)] as [string, string])
  ];
}

/** Every identifier in `code` that is given a pointermove handler. */
function hoverTargets(code: string): string[] {
  const out = new Set<string>();
  const re = /(\w+)\.addEventListener\('pointermove'/g;
  let hit: RegExpExecArray | null;
  while ((hit = re.exec(code)) !== null) out.add(hit[1]);
  return [...out];
}

/** The single statement that creates `name`, or '' if it is not created by el(). */
function creationOf(code: string, name: string): string {
  const re = new RegExp('(?:const|let|var)\\s+' + name + '\\s*=\\s*el\\([^;]*;');
  const hit = re.exec(code);
  return hit ? hit[0] : '';
}

test('R166: every focusable chart mark answers focus as well as the pointer', () => {
  /* The second of this row's two declared tests, scoped to the defect rather
     than to the file: a TAB STOP that shows a tooltip on hover and nothing on
     focus. The org diagram had 84 of those. Elements that are deliberately
     not tab stops are a different question, pinned by the test below - the
     first version of this test counted handlers per file and so confused the
     two, reporting the county map's tabindex:-1 dots as a focus defect. */
  const missing: string[] = [];
  for (const [rel, abs] of chartSourceFiles()) {
    const code = readFileSync(abs, 'utf8');
    for (const name of hoverTargets(code)) {
      const creation = creationOf(code, name);
      const isTabStop = /tabindex:\s*'?0'?[,\s}]/.test(creation);
      if (!isTabStop) continue;
      /* Either spelling counts: bound directly, or through chart-util's
         `bindTipFocus`. Review 8 collapsed four verbatim copies of the handler
         into that helper and this test failed on its own refactor, because the
         needle was pinned to `addEventListener('focus')` - a check on spelling
         rather than on shape, which is the mistake P19's build gate made
         three times over. */
      const bound = new RegExp(name + "\\.addEventListener\\('focus'").test(code)
        || new RegExp('bindTipFocus\\(\\s*' + name + '\\b').test(code);
      if (!bound) {
        missing.push(rel + ': ' + name + ' is a tab stop with no focus handler');
      }
    }
  }
  expect(missing).toEqual([]);
});

test('R166: every chart tab stop carries an accessible name, not just a tooltip', () => {
  /* Review 8 of P20. The first pass at this row's second declared test asked
     only whether a tab stop answered `focus`, and every site did - by showing
     the shared tooltip, which is a role-less `<div>` appended to `<body>` with
     no association to the focused node. That serves a sighted keyboard user
     and nobody else. `ltc-client.ts` had it right all along: the mark carries
     `role` and `aria-label` with the same numbers the hover shows. */
  const missing: string[] = [];
  for (const [rel, abs] of chartSourceFiles()) {
    const code = readFileSync(abs, 'utf8');
    for (const name of hoverTargets(code)) {
      const creation = creationOf(code, name);
      if (!/tabindex:\s*'?0'?[,\s}]/.test(creation)) continue;
      if (!/'aria-label'/.test(creation)) {
        missing.push(rel + ': ' + name + ' is a tab stop with no accessible name');
      }
    }
  }
  expect(missing).toEqual([]);
});

test('R166: every hover-only readout has a table that reaches the same numbers', () => {
  /* Review 9 of P20 rewrote this test. It used to pin four pointer-only sites
     as a standing non-pass - "the chart's message is reachable, the per-point
     readout is not" - and it was wrong about one of them: the health cost
     path had a View as table under it all along. The other three now do.

     A hover-only site is a pointer affordance on an element that is not a
     tab stop. Each must name the table that carries its numbers, the page
     must hold that table inside a disclosure, and the client must fill it.
     A fifth site with no table fails here until it has one. */
  const TABLES: Record<string, { page: string; client: string; tables: string[] }> = {
    'src/lib/path-chart.ts:hit': {
      page: 'src/pages/health.astro', client: 'src/scripts/health-client.ts',
      tables: ['path-table']
    },
    /* one identifier, two charts: the revenue path and the top-rate history */
    'src/lib/tax-charts.ts:overlay': {
      page: 'src/pages/tax.astro', client: 'src/scripts/tax-client.ts',
      tables: ['tax-path-table', 'toprate-table']
    },
    /* the county dots: their one pointer handler sits on the county map's svg
       and reads whichever dot is under the pointer, so the site is named for
       that svg. `countySvg` is declared once in the file; the region map's
       `svg` would make `creationOf` depend on which function comes first. */
    'src/scripts/units-client.ts:countySvg': {
      page: 'src/pages/units.astro', client: 'src/scripts/units-client.ts',
      tables: ['units-county-table']
    }
  };
  const repo = (rel: string): string => readFileSync(fileURLToPath(new URL('../../' + rel, import.meta.url)), 'utf8');

  const hoverOnly: string[] = [];
  let sites = 0;
  for (const [rel, abs] of chartSourceFiles()) {
    const code = readFileSync(abs, 'utf8');
    for (const name of hoverTargets(code)) {
      if (/tabindex:\s*'?0'?[,\s}]/.test(creationOf(code, name))) continue;
      hoverOnly.push(rel + ':' + name);
      sites += (code.match(new RegExp(name + "\\.addEventListener\\('pointermove'", 'g')) ?? []).length;
    }
  }
  expect(hoverOnly.sort()).toEqual(Object.keys(TABLES).sort());

  let tables = 0;
  for (const site of hoverOnly) {
    const { page, client, tables: ids } = TABLES[site];
    const markup = repo(page);
    const script = repo(client);
    for (const id of ids) {
      tables++;
      /* Inside a disclosure, the pattern the health page set. The body may
         not cross a closing tag: a lazy match from the first disclosure on the
         page would otherwise run through it and find a table that sits
         outside every disclosure. */
      const disclosure = new RegExp('<details class="tableview">(?:(?!</details>)[\\s\\S])*?id="' + id + '"');
      expect(markup, site + ' -> ' + id).toMatch(disclosure);
      /* and filled by the client, not left as an empty shell */
      expect(script, site + ' -> ' + id).toContain("'" + id + "'");
    }
  }
  /* Four pointer sites, four tables. tax-charts.ts uses one identifier for
     two charts, so the counts are pinned separately from the names: a fifth
     site added under an existing name moves only the first number. */
  expect(sites).toBe(4);
  expect(tables).toBe(sites);
});

/* ---- R245 / R259 -------------------------------------------------------- */

test('R245: no aria-label sits on a container with no role', () => {
  expect(orphanAriaLabelFaults()).toEqual([]);
});

test('R259: no application logic reads an aria attribute as state', () => {
  expect(ariaAsStateFaults()).toEqual([]);
});

test('R259: the rollout timeline carries its selection in a data attribute', () => {
  /* the second declared test, stated as the property rather than the
     mechanism: renaming a phase title must not break selection */
  const code = readFileSync(
    fileURLToPath(new URL('../../src/scripts/rollout-client.ts', import.meta.url)), 'utf8');
  expect(code).toContain('btn.dataset.phaseId = phase.id');
  expect(code).toContain('dataset.phaseId === phase.id');
});

/* ---- role="list": every child is a list item ----------------------------- */

/* P21 [§S15], new finding. A role="list" requires listitem children, and one
   whose children are something else is announced as a list with no items.
   Measured in headless Chrome on the production build, every chapter, after
   the client had drawn: 5 of the 8 role="list" elements had such children,
   29 in all, every one an <article>. Four of the five lists were typed into
   pages, which is what the sweep below reads. The fifth, #data-planes, is
   empty until data-render.ts draws it, so a list that renders empty here has
   to be named in this table with the test that covers its children; a new
   client-drawn list cannot fall between the two tests unnoticed. */
const CLIENT_DRAWN_LISTS: Record<string, string> = {
  'data-planes': 'tests/lib/data-render.test.ts, renderPlanes'
};

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'source', 'track', 'wbr'
]);
/* one tag, whose quoted attribute values may hold ">", or one comment */
const TAG = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g;
const TAG_START = /<[a-zA-Z/]/;

function attr(attrs: string, name: string): string | null {
  const hit = new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s"\'>]+))').exec(attrs);
  return hit ? (hit[1] ?? hit[2] ?? hit[3] ?? '') : null;
}

interface RenderedList { name: string; tag: string; children: { tag: string; role: string | null }[] }

/** Every role="list" in rendered HTML, with its direct element children.
 *  A walk over the tags, not a regex over the list's markup, because only
 *  the first level below a list is its to own. It refuses what it cannot
 *  read (a close tag that does not match the open one, an element left open,
 *  a "<" it could not parse as a tag) so malformed markup fails the test
 *  instead of being counted wrong. */
function roleLists(html: string): RenderedList[] {
  const lists: RenderedList[] = [];
  const open: { tag: string; list: RenderedList | null }[] = [];
  let from = 0;
  TAG.lastIndex = 0;
  let hit: RegExpExecArray | null;
  while ((hit = TAG.exec(html)) !== null) {
    const gap = html.slice(from, hit.index);
    if (TAG_START.test(gap)) throw new Error('unparsed tag: ' + gap.slice(gap.search(TAG_START), 60));
    from = TAG.lastIndex;
    if (hit[0].startsWith('<!--')) continue;
    const tag = hit[2]!.toLowerCase();
    const attrs = hit[3] ?? '';
    if (hit[1]) {
      const top = open.pop();
      if (top?.tag !== tag) throw new Error('</' + tag + '> closes <' + (top?.tag ?? 'nothing') + '>');
      continue;
    }
    const parent = open[open.length - 1];
    if (parent?.list) parent.list.children.push({ tag, role: attr(attrs, 'role') });
    if (VOID_TAGS.has(tag) || hit[4]) continue;
    const list: RenderedList | null = attr(attrs, 'role') === 'list'
      ? { name: attr(attrs, 'id') ?? attr(attrs, 'aria-label') ?? '(unnamed)', tag, children: [] }
      : null;
    if (list) lists.push(list);
    open.push({ tag, list });
    if (tag === 'script' || tag === 'style') {
      /* raw text: what is inside is not markup */
      const end = html.indexOf('</' + tag, from);
      if (end < 0) throw new Error('<' + tag + '> is never closed');
      TAG.lastIndex = from = end;
    }
  }
  if (TAG_START.test(html.slice(from))) throw new Error('unparsed tag after the last one');
  if (open.length) throw new Error('left open: ' + open.map((o) => o.tag).join(' > '));
  return lists;
}

/** Children a screen reader does not meet as list items. An <li> is one by
 *  its tag only while it carries no other role; inside a list, ARIA in HTML
 *  allows an <li> no role but listitem. */
function nonItems(list: RenderedList): string[] {
  return list.children
    .filter((c) => c.role !== 'listitem' && !(c.tag === 'li' && !c.role))
    .map((c) => '<' + c.tag + (c.role ? ' role="' + c.role + '"' : '') + '>');
}

/* The tags ARIA in HTML (W3C Recommendation, 11 August 2026,
   https://www.w3.org/TR/2026/REC-html-aria-20260811/, the document
   conformance table) lets carry role="listitem" wherever they sit: dt, whose
   row names it, and every element whose row allows any role with no
   condition. Landmark and sectioning elements list the roles they allow
   instead, and listitem is not one of them; <article> allows application,
   document, feed, main, none, presentation and region. A browser exposes
   <article role="listitem"> as a list item anyway, so nonItems passes it and
   only this table refuses it. The rows whose any-role allowance has a
   condition (a, figure, label, selectedcontent, summary, td, th, tr and
   custom elements) are left out, so a new one is refused until someone has
   read the condition. div is in, except as the child of a dl, where it may
   only be none or presentation. An <li> is nonItems' to judge. */
const LISTITEM_TAGS = new Set([
  'abbr', 'address', 'b', 'bdi', 'bdo', 'blockquote', 'canvas', 'cite', 'code',
  'data', 'del', 'dfn', 'div', 'dt', 'em', 'hgroup', 'i', 'ins', 'kbd', 'mark',
  'output', 'p', 'pre', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'small', 'span',
  'strong', 'sub', 'sup', 'svg', 'table', 'tbody', 'tfoot', 'thead', 'time',
  'u', 'var'
]);

/** Children that are list items by role="listitem" rather than by an <li> tag. */
function itemsByRole(list: RenderedList): RenderedList['children'] {
  return list.children.filter((c) => c.role === 'listitem' && c.tag !== 'li');
}

/** The itemsByRole ARIA in HTML does not allow where they are: on a tag that
 *  may not carry listitem anywhere, or a div that is the child of a dl. */
function misroledItems(list: RenderedList): string[] {
  return itemsByRole(list)
    .filter((c) => !LISTITEM_TAGS.has(c.tag) || (c.tag === 'div' && list.tag === 'dl'))
    .map((c) => '<' + c.tag + ' role="listitem">');
}

/** One sweep fault: the page, the list, how many of its children fail and
 *  why, and the first of them. */
function listFault(file: string, list: RenderedList, bad: string[], why: string): string {
  return file + ' [' + list.name + '] ' + bad.length + ' of ' + list.children.length +
    ' children ' + why + ', first ' + bad[0];
}

test('the list walk reads only a list\'s own children, and refuses markup it cannot read', () => {
  const lists = roleLists(
    '<div role="list" aria-label="x"><div role="listitem"><article>a</article></div>'
    + '<article><p>b</p></article><li>c</li><br></div>'
    + '<ul data-role="list"><li>d</li></ul><script>if (a<b) x("</p>");</script>');
  /* data-role is not role, and a grandchild is not a child */
  expect(lists.map((l) => l.name)).toEqual(['x']);
  expect(lists[0]!.children.map((c) => c.tag)).toEqual(['div', 'article', 'li', 'br']);
  expect(nonItems(lists[0]!)).toEqual(['<article>', '<br>']);
  expect(() => roleLists('<div role="list"><article></div>')).toThrow(/closes <article>/);
  expect(() => roleLists('<div role="list">')).toThrow(/left open/);
  expect(() => roleLists('<div role="list"><div a="x"b></div></div>')).toThrow(/unparsed tag/);
  /* role="listitem" makes an item of any tag for nonItems, an <li> with
     another role is not one, and misroledItems refuses the tags that may not
     carry the role and a div inside a dl */
  const byTag = roleLists(
    '<div role="list"><article role="listitem">a</article><section role="listitem">b</section>'
    + '<div role="listitem">c</div><span role="listitem">d</span><li role="listitem">e</li>'
    + '<li role="none">f</li></div>'
    + '<dl role="list"><dt role="listitem">g</dt><div role="listitem">h</div></dl>');
  expect(byTag.map(nonItems)).toEqual([['<li role="none">'], []]);
  expect(byTag.map(misroledItems)).toEqual([
    ['<article role="listitem">', '<section role="listitem">'],
    ['<div role="listitem">']
  ]);
});

test('every child of a role="list" on every page is a list item, on a tag allowed that role', async () => {
  const container = await AstroContainer.create();
  const faults: string[] = [];
  const empty: string[] = [];
  let lists = 0;
  let items = 0;
  let byRole = 0;
  for (const file of pageFiles) {
    const mod = await import(/* @vite-ignore */ join(PAGES_DIR, file));
    for (const list of roleLists(await container.renderToString(mod.default))) {
      lists += 1;
      items += list.children.length;
      byRole += itemsByRole(list).length;
      if (list.children.length === 0) empty.push(list.name);
      const bad = nonItems(list);
      if (bad.length) faults.push(listFault(file, list, bad, 'are not list items'));
      const misroled = misroledItems(list);
      if (misroled.length) {
        faults.push(listFault(file, list, misroled,
          'carry role="listitem" where ARIA in HTML does not allow it'));
      }
    }
  }
  expect(faults).toEqual([]);
  expect(empty.sort()).toEqual(Object.keys(CLIENT_DRAWN_LISTS).sort());
  /* the walk found lists with items in them, not just the empty host */
  expect(lists).toBeGreaterThan(empty.length);
  expect(items).toBeGreaterThan(0);
  /* and misroledItems had items by role to judge */
  expect(byRole).toBeGreaterThan(0);
});

/* ---- R246 / R291: live regions ------------------------------------------ */

const LIVE_TAG = /<(div|p|article|section|span)\b[^>]*aria-live[^>]*>/g;

function liveRegions(src: string): string[] {
  LIVE_TAG.lastIndex = 0;
  const out: string[] = [];
  let hit: RegExpExecArray | null;
  while ((hit = LIVE_TAG.exec(src)) !== null) out.push(hit[0]);
  return out;
}

test('R246: every live region is a status line, not a panel', () => {
  /* Measured in the browser before the fix: #quality-selected held 3,043
     characters and was rebuilt on every keystroke, so a search re-announced
     the whole parameter card per character typed. The rule that survives is
     structural - a live region is a <p>, which cannot hold a card. */
  const offenders: string[] = [];
  for (const file of pageFiles) {
    for (const tag of liveRegions(readFileSync(join(PAGES_DIR, file), 'utf8'))) {
      if (!tag.startsWith('<p ')) offenders.push(file + ' ' + tag.slice(0, 70));
    }
  }
  expect(offenders).toEqual([]);
});

test('R291: no aria-live sits on markup a client never writes', () => {
  /* A live region on content present at parse time announces once on load and
     then does nothing. workforce.astro carried four of them. The test: every
     live region has an id, and some client script writes to that id. */
  const SCRIPTS = fileURLToPath(new URL('../../src/scripts', import.meta.url));
  const clientCode = readdirSync(SCRIPTS)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => readFileSync(join(SCRIPTS, f), 'utf8'))
    .join('\n');
  const offenders: string[] = [];
  for (const file of pageFiles) {
    for (const tag of liveRegions(readFileSync(join(PAGES_DIR, file), 'utf8'))) {
      const id = /id="([^"]+)"/.exec(tag);
      if (!id) { offenders.push(file + ' has an aria-live with no id: ' + tag.slice(0, 60)); continue; }
      if (!clientCode.includes(id[1])) offenders.push(file + ' aria-live #' + id[1] + ' is never written');
    }
  }
  expect(offenders).toEqual([]);
});

/* ---- R244: node type in the accessible name ----------------------------- */

test('R244: every diagram node type has a reader-facing name', () => {
  const types: DiagNodeType[] =
    ['param', 'ramp', 'model', 'const', 'index', 'TPP', 'KPP', 'ext'];
  for (const t of types) {
    expect(NODE_TYPE_LABELS[t], t + ' has no label').toBeTruthy();
  }
});

test('R244: the accessible name and the <title> both state the type', () => {
  const code = readFileSync(
    fileURLToPath(new URL('../../src/lib/equation-diagram.ts', import.meta.url)), 'utf8');
  const named = (code.match(/NODE_TYPE_LABELS\[n\.type\] \+ ': ' \+ n\.refId \+ ': ' \+ n\.label/g) ?? []).length;
  /* both halves, as the row asks: one concat is not the fix */
  expect(named).toBe(2);
});

test('R244: the legend chips and the accessible names read the same map', () => {
  /* the sole decoder of the sole encoding used to be six chips typed into
     quality.astro and marked aria-hidden. They are generated now, so a chip
     cannot say one thing while a node says another. */
  const page = readFileSync(join(PAGES_DIR, 'quality.astro'), 'utf8');
  expect(page).toContain('NODE_TYPE_LABELS[t]');
  expect(page).not.toContain('>cost model input<');
});

/* ---- golden rule 2, as a gate ------------------------------------------- */

test('no audit code is shipped to the browser in an HTML comment', () => {
  expect(renderedAuditCodeFaults()).toEqual([]);
});

test('the audit-code gate fires, and does not fire on a region id', () => {
  const root = mkdtempSync(join(tmpdir(), 'p20-audit-'));
  try {
    cpSync(fileURLToPath(new URL('../../src', import.meta.url)), join(root, 'src'), { recursive: true });
    const page = join(root, 'src', 'pages', 'rollout.astro');
    const original = readFileSync(page, 'utf8');

    /* the defect: a section note in an HTML comment, which Astro emits */
    writeFileSync(page, '<!-- R999 [S14]: a note that reaches the page source -->\n' + original);
    expect(renderedAuditCodeFaults(root).length).toBe(1);

    /* and the false positive the narrow needle exists to avoid: the hospital
       administration regions are numbered R01 to R13, and naming one in a
       comment is not a golden-rule breach */
    writeFileSync(page, '<!-- R02 is the largest region by population -->\n' + original);
    expect(renderedAuditCodeFaults(root)).toEqual([]);

    /* an Astro expression comment carrying the same code is stripped at
       compile time, so it is not a breach either */
    writeFileSync(page, '{/* R999 [S14]: stripped by the compiler */}\n' + original);
    expect(renderedAuditCodeFaults(root)).toEqual([]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
