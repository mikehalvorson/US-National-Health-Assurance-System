import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { CATALOG_ID_FAMILIES, catalogCode, END_YEAR, START_YEAR } from '../../src/lib/params';
import { TABS } from '../../src/lib/tabs';
import { CATALOG_ID_NOTE, QUALITY_DATA, withoutSourceCodes } from '../../src/lib/quality';
import { SCENARIOS } from '../../src/lib/scenarios';

/* =========================================================================
 * The owner's decision of 2026-10-10, golden rule 2's written exception:
 * the catalog tabs, Quality and Risk, show the catalog's own ids (KPP-, TPP-,
 * CP-), each with a line saying what they are. No other page draws a
 * source-document code (catalog, requirement, control, workstream or cost
 * category id), the catalog tabs draw no code but those three, and no page
 * calls the source document "the framework".
 *
 * Two surfaces, because a page is two things:
 *   - what the server renders: every page, through the Astro container;
 *   - what a client script draws, in the states the sweep reaches (named,
 *     with what it does not reach, above the client test): each
 *     page's server HTML is parsed into a stub document, so a filter holds
 *     the value its first option gives it and a server-rendered button can be
 *     clicked, the page's real client runs against it, and then every button
 *     is clicked, every select option chosen and every input toggled. Text a
 *     reader meets without it being in the flow - title, aria-label, alt and
 *     placeholder attributes - counts too.
 * Measured in the browser on 2026-10-10 before this existed, every phase,
 * layer and domain clicked: 117 distinct codes on five non-catalog pages
 * (Data 26, Governance 33, Executive Hardening 22, Rollout 35, Healthcare 1;
 * by this file's code shape Rollout is 34, 116 in all) and "framework" on
 * seven.
 *
 * Review of the owner batch: the first stub created every host on demand as
 * an empty div, so Quality's and Risk's filters read "" where a browser reads
 * "all", both explorers showed no records, and 311 uses of "framework" in
 * Quality's cost-parameter notes passed. Each page now has to prove its
 * client drew something, and the two catalog tabs that a cost record was
 * reached.
 * ========================================================================= */

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const CATALOG_TABS = new Set(['quality', 'risk']);
const CATALOG_PREFIXES = new Set<string>(CATALOG_ID_FAMILIES);
const FRAMEWORK_ALL = /\bframeworks?\b/gi;
/* Review 3 of P24: rule 2 forbids naming the source document, and "framework"
   was the only name the sweep knew. Self-test row names, listed by name
   on the Healthcare page, called it "the Source Package", "the two upstream
   documents", "the plan document" and "the plan extract". Each name the repo
   uses for an upstream document is refused on every page. */
const UPSTREAM_DOC = /\b(?:Source Package|upstream documents?|plan documents?|(?:plan|definition|framework) extracts?)\b/gi;

const PAGES = import.meta.glob('../../src/pages/*.astro');
const pageName = (path: string): string => path.replace(/^.*\/(\w+)\.astro$/, '$1');

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', ge: '≥', le: '≤',
  ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', times: '×'
};
const decode = (s: string): string => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENTITIES[e] ?? m));

const text = (html: string): string => decode(html
  .replace(/<script\b[\s\S]*?<\/script>/g, ' ').replace(/<style\b[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

/* R182 [§S18]: a doubled word. The one the row filed, "and the the plan caps
   ordinary households", was two string literals joined across a line break,
   so only the rendered text shows it. Read one block's text or one attribute
   at a time, as a reader meets them: joined, a page puts neighbouring cells
   ("Deploy Deploy" on Workforce) and the breadcrumb ("Overview Overview")
   side by side; the first probe of the built pages, on 2026-10-12, reported
   nine such pairs and no real one. */
const DOUBLED = /\b([a-z]+)\s+\1\b/gi;
const READ_ATTRIBUTES = ['title', 'aria-label', 'alt', 'placeholder'];
/* A place whose name repeats a word is a name: the sweep found "Walla Walla,
   WA" in the Units county table. Exempt exactly the pairs the county file's
   own names contain, in their own case, so the exemption is the data's and
   not a list someone keeps. */
const COUNTY_NAME_DOUBLES = new Set<string>(
  (JSON.parse(readFileSync(join(REPO_ROOT, 'public/data/counties.json'), 'utf8')) as { counties: Array<{ n: string }> })
    .counties.flatMap((c) => [...c.n.matchAll(DOUBLED)].map((m) => m[0])));
function doubled(page: string, runs: string[]): string[] {
  const out: string[] = [];
  for (const run of runs) {
    for (const m of run.replace(/\s+/g, ' ').matchAll(DOUBLED)) {
      if (COUNTY_NAME_DOUBLES.has(m[0])) continue;
      out.push(page + ': "' + m[0] + '" in "' + run.replace(/\s+/g, ' ').slice(Math.max(0, m.index! - 40), m.index! + m[0].length + 30).trim() + '"');
    }
  }
  return out;
}
/* Review of P24: a run is a block's text, and inline elements are part of
   it, so "and the <em>the</em> plan" is one run, as a reader sees it. A
   block boundary (a cell, a list item, a paragraph) still ends a run. */
/* review 2 of P24: label and output added (the built pages use both), and
   the rest of HTML's phrasing elements that carry text */
/* review 3 of P24: and the phrasing elements the list left out (button,
   option, select, textarea, meter, progress, ruby, rt, rp) */
const INLINE_TAGS = ['a', 'abbr', 'b', 'bdi', 'bdo', 'button', 'cite', 'code', 'data', 'del', 'dfn', 'em', 'i', 'ins',
  'kbd', 'label', 'mark', 'meter', 'option', 'output', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'select',
  'small', 'span', 'strong', 'sub', 'sup', 'textarea', 'time', 'u', 'var'];
const INLINE_TAG = new RegExp('</?(?:' + INLINE_TAGS.join('|') + ')\\b[^>]*>', 'gi');
const htmlRuns = (html: string): string[] => {
  const body = html.replace(/<script\b[\s\S]*?<\/script>/g, ' ').replace(/<style\b[\s\S]*?<\/style>/g, ' ');
  const runs = body.replace(INLINE_TAG, '').split(/<[^>]+>/).map(decode);
  for (const m of body.matchAll(new RegExp('\\s(?:' + READ_ATTRIBUTES.join('|') + ')="([^"]*)"', 'g'))) runs.push(decode(m[1]));
  return runs;
};

/* The stress scenarios' source-document ids (SCN-BASE, SCN-UNIT-UNDER), in
   full and as Health once drew them ("UNIT-UNDER: Unit network underbuilt"),
   each as a whole upper-case token wherever it stands (review of the content
   run: the first version matched a stripped id only before ": ").
   A probe of every page for any code-like token found these, and ASM, PF and
   PH codes, outside catalogCode()'s shape; the shape takes the last three. */
const SCENARIO_ID = new RegExp('\\b(?:SCN-[A-Z]|(?:' + SCENARIOS.map((s) => s.id.replace(/^SCN-/, '')).join('|') +
  ')\\b(?!-))', 'g');

function hits(page: string, body: string): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(SCENARIO_ID)) out.push(page + ': scenario id ' + m[0] + ' in "' + body.slice(Math.max(0, m.index! - 40), m.index! + 30) + '"');
  for (const m of body.matchAll(catalogCode('g'))) {
    if (CATALOG_TABS.has(page) && CATALOG_PREFIXES.has(m[0].split('-')[0])) continue;
    out.push(page + ': ' + m[0] + ' in "' + body.slice(Math.max(0, m.index! - 40), m.index! + 30) + '"');
  }
  for (const fw of body.matchAll(FRAMEWORK_ALL)) out.push(page + ': "framework" in "' + body.slice(Math.max(0, fw.index! - 50), fw.index! + 40) + '"');
  for (const d of body.matchAll(UPSTREAM_DOC)) out.push(page + ': upstream document "' + d[0] + '" in "' + body.slice(Math.max(0, d.index! - 50), d.index! + 40) + '"');
  return out;
}

async function serverHtml(page: string): Promise<string> {
  const container = await AstroContainer.create();
  const mod = (await PAGES['../../src/pages/' + page + '.astro']()) as { default: Parameters<typeof container.renderToString>[0] };
  return container.renderToString(mod.default);
}

test('no page the server renders draws a source code outside Quality and Risk, says "framework" or names an upstream document', async () => {
  const byPage: Record<string, string[]> = {};
  for (const path of Object.keys(PAGES)) byPage[pageName(path)] = hits(pageName(path), text(await serverHtml(pageName(path))));
  expect(Object.keys(byPage)).toHaveLength(TABS.length);
  expect(Object.values(byPage).flat()).toEqual([]);
});

test('R182: no page the server renders draws a doubled word', async () => {
  const found: string[] = [];
  const read: Record<string, number> = {};
  for (const path of Object.keys(PAGES)) {
    const runs = htmlRuns(await serverHtml(pageName(path)));
    read[pageName(path)] = runs.filter((r) => /[a-z]/i.test(r)).length;
    found.push(...doubled(pageName(path), runs));
  }
  expect(found).toEqual([]);
  /* reach: every page, each read as many runs of text, not one */
  expect(Object.keys(read)).toHaveLength(TABS.length);
  expect(Object.keys(read).filter((p) => !(read[p] > 1))).toEqual([]);
});

test('R182: the reader finds a doubled word inside one run, and not across two', () => {
  /* the sentence the row filed, as the page drew it */
  expect(doubled('overview', ['the point of use and the the plan caps ordinary households at 5%']))
    .toEqual(['overview: "the the" in "the point of use and the the plan caps ordinary households"']);
  /* a county whose name repeats a word, and only in the name's own spelling */
  expect(COUNTY_NAME_DOUBLES).toEqual(new Set(['Walla Walla']));
  expect(doubled('units', ['Walla Walla, WA'])).toEqual([]);
  expect(doubled('units', ['walla walla'])).toHaveLength(1);
  expect(doubled('x', ['A line that ends with The', 'the next node'])).toEqual([]);
  expect(doubled('x', ['Overview', 'Overview'])).toEqual([]);
  /* across a line break inside one node, which is how the typo was written */
  expect(doubled('x', ['and the\n   the plan'])).toHaveLength(1);
  /* from HTML: a text node, and an attribute */
  expect(doubled('x', htmlRuns('<p>Deploy</p><p>Deploy</p><a aria-label="Open the the chart">x</a>')))
    .toEqual(['x: "the the" in "Open the the chart"']);
  /* a word inside a longer one is not a repeat */
  expect(doubled('x', ['the theory', 'is island'])).toEqual([]);
  /* review of P24: an inline element is part of its block's run, so a pair
     split by one is found; a block boundary still separates */
  expect(doubled('x', htmlRuns('<p>and the <em>the</em> plan</p>'))).toHaveLength(1);
  expect(doubled('x', htmlRuns('<p>and <a href="#">the</a> the plan</p>'))).toHaveLength(1);
  expect(doubled('x', htmlRuns('<tr><td>Deploy</td><td>Deploy</td></tr>'))).toEqual([]);
  const p = new StubNode('p');
  p.append('and the ');
  const em = new StubNode('em'); em.append('the'); p.appendChild(em);
  p.append(' plan');
  expect(doubled('x', p.runs())).toHaveLength(1);
  const row = new StubNode('tr');
  for (const w of ['Deploy', 'Deploy']) { const td = new StubNode('td'); td.append(w); row.appendChild(td); }
  expect(doubled('x', row.runs())).toEqual([]);
  /* review 2 of P24: a label is inline too, and text either side of a block
     child is two runs in both readers */
  expect(doubled('x', htmlRuns('<p>View in <label>in</label> year</p>'))).toHaveLength(1);
  const div = new StubNode('div');
  div.append('Deploy');
  const inner = new StubNode('p'); inner.append('x'); div.appendChild(inner);
  div.append(' Deploy');
  expect(doubled('x', div.runs())).toEqual([]);
  expect(doubled('x', htmlRuns('<div>Deploy<p>x</p> Deploy</div>'))).toEqual([]);
});

/* the exception's other half: each catalog tab says once what the ids are
   (that they draw them is the client test's to show) */
test('the two catalog tabs say once what their ids are', async () => {
  for (const page of CATALOG_TABS) {
    const body = text(await serverHtml(page));
    expect(body.split(CATALOG_ID_NOTE).length - 1, page).toBe(1);
  }
});

/* ---- the clients, in every state a reader can reach --------------------- */

type Handler = (e: unknown) => void;

class StubNode {
  tagName: string;
  className = '';
  id = '';
  own = '';
  type = ''; href = ''; target = ''; rel = ''; title = '';
  open = false; hidden = false; disabled = false; checked = false;
  children: StubNode[] = [];
  parentNode: StubNode | null = null;
  attributes: Record<string, string> = {};
  dataset: Record<string, string> = {};
  style: Record<string, unknown> = { setProperty(): void { /* inert */ } };
  handlers: Record<string, Handler[]> = {};
  set: string | null = null;
  constructor(tag: string) { this.tagName = tag.toUpperCase(); }
  /* a select's value is its chosen option's, as in a browser */
  get value(): string {
    if (this.set !== null) return this.set;
    if (this.tagName === 'SELECT') {
      const opts = this.options;
      const chosen = opts.filter((o) => 'selected' in o.attributes)[0] || opts[0];
      return chosen ? chosen.value : '';
    }
    if (this.tagName === 'OPTION') return this.attributes.value ?? this.textContent.trim();
    return this.attributes.value ?? '';
  }
  set value(v: string) { this.set = String(v); }
  get selectedIndex(): number { return Math.max(0, this.options.map((o) => o.value).indexOf(this.value)); }
  get classList(): { add: (...c: string[]) => void; remove: (...c: string[]) => void; toggle: (c: string, on?: boolean) => boolean; contains: (c: string) => boolean } {
    const self = this;
    const list = (): string[] => self.className.split(/\s+/).filter(Boolean);
    const add = (...c: string[]): void => { self.className = [...new Set([...list(), ...c])].join(' '); };
    const remove = (...c: string[]): void => { self.className = list().filter((x) => c.indexOf(x) < 0).join(' '); };
    return {
      add, remove,
      toggle: (c, on) => { const want = on === undefined ? list().indexOf(c) < 0 : on; if (want) add(c); else remove(c); return want; },
      contains: (c) => list().indexOf(c) >= 0
    };
  }
  appendChild(child: StubNode): StubNode {
    if (child.tagName === '#FRAGMENT') { for (const c of [...child.children]) this.appendChild(c); child.children = []; return child; }
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this; this.children.push(child); return child;
  }
  append(...nodes: Array<StubNode | string>): void { for (const n of nodes) this.appendChild(typeof n === 'string' ? textNode(n) : n); }
  prepend(...nodes: StubNode[]): void { for (const n of nodes.reverse()) { n.parentNode = this; this.children.unshift(n); } }
  insertBefore(child: StubNode, ref: StubNode | null): StubNode {
    if (child.parentNode) child.parentNode.removeChild(child);
    const i = ref ? this.children.indexOf(ref) : -1;
    child.parentNode = this;
    if (i < 0) this.children.push(child); else this.children.splice(i, 0, child);
    return child;
  }
  removeChild(child: StubNode): StubNode { this.children = this.children.filter((c) => c !== child); child.parentNode = null; return child; }
  remove(): void { if (this.parentNode) this.parentNode.removeChild(this); }
  replaceChildren(...nodes: StubNode[]): void { this.children = []; this.append(...nodes); }
  replaceWith(n: StubNode): void { const p = this.parentNode; if (p) { p.insertBefore(n, this); p.removeChild(this); } }
  cloneNode(deep?: boolean): StubNode {
    const c = new StubNode(this.tagName); c.className = this.className; c.id = this.id; c.own = this.own;
    c.attributes = { ...this.attributes }; c.dataset = { ...this.dataset };
    if (deep) for (const k of this.children) c.appendChild(k.cloneNode(true));
    return c;
  }
  setAttribute(name: string, value: string): void {
    this.attributes[name] = String(value);
    if (name === 'class') this.className = String(value);
    if (name === 'id') this.id = String(value);
    /* a data-* attribute is also its dataset entry, as in a browser */
    if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-(\w)/g, (_x, c: string) => c.toUpperCase())] = String(value);
  }
  getAttribute(name: string): string | null { return name === 'class' ? this.className : this.attributes[name] ?? null; }
  removeAttribute(name: string): void { delete this.attributes[name]; }
  hasAttribute(name: string): boolean { return name in this.attributes; }
  toggleAttribute(name: string, on?: boolean): boolean { const want = on ?? !(name in this.attributes); if (want) this.attributes[name] = ''; else delete this.attributes[name]; return want; }
  addEventListener(type: string, fn: Handler): void { (this.handlers[type] = this.handlers[type] || []).push(fn); }
  removeEventListener(): void { /* inert */ }
  /* x: where the pointer is, across the page (a crosshair tooltip shows the
     column under it) */
  dispatch(type: string, x = 100): void {
    const e = {
      type, target: this, currentTarget: this, key: 'Enter', clientX: x, clientY: 100, pageX: x, pageY: 100,
      offsetX: x, offsetY: 100, pointerType: 'mouse', relatedTarget: null,
      preventDefault(): void { /* inert */ }, stopPropagation(): void { /* inert */ }
    };
    for (let n: StubNode | null = this; n; n = n.parentNode) {
      for (const fn of n.handlers[type] || []) fn(e);
      /* a handler assigned as a property (details.ontoggle = ...) runs too */
      const prop = (n as unknown as Record<string, unknown>)['on' + type];
      if (typeof prop === 'function') (prop as Handler).call(n, e);
    }
    for (const fn of docHandlers[type] || []) fn(e);
  }
  dispatchEvent(e: { type: string }): boolean { this.dispatch(e.type); return true; }
  click(): void {
    /* a summary opens and closes its details, which then fires toggle */
    const d = this.tagName === 'SUMMARY' ? this.parentNode : null;
    if (d && d.tagName === 'DETAILS') { d.open = !d.open; d.dispatch('toggle'); }
    this.dispatch('click');
  }
  get nodeValue(): string { return this.own; }
  set nodeValue(v: string) { this.own = String(v); }
  get parentElement(): StubNode | null { return this.parentNode; }
  replaceChild(next: StubNode, old: StubNode): StubNode {
    const i = this.children.indexOf(old);
    if (i < 0) return old;
    const incoming = next.tagName === '#FRAGMENT' ? [...next.children] : [next];
    for (const n of incoming) { if (n.parentNode) n.parentNode.removeChild(n); n.parentNode = this; }
    this.children.splice(i, 1, ...incoming);
    old.parentNode = null;
    return old;
  }
  focus(): void { /* inert */ }
  blur(): void { /* inert */ }
  scrollIntoView(): void { /* inert */ }
  getBoundingClientRect(): { width: number; height: number; top: number; left: number; right: number; bottom: number } {
    return { width: 800, height: 400, top: 0, left: 0, right: 800, bottom: 400 };
  }
  /* SVG geometry, as chart tooltips position themselves: the screen
     transform is the identity, as for a chart drawn at its own size at the
     page's corner, so a pointer's x reaches the chart as itself */
  createSVGPoint(): { x: number; y: number; matrixTransform: () => { x: number; y: number } } {
    const p = { x: 0, y: 0, matrixTransform: (): { x: number; y: number } => ({ x: p.x, y: p.y }) };
    return p;
  }
  getScreenCTM(): { inverse: () => Record<string, number> } { return { inverse: () => ({}) }; }
  getBBox(): { x: number; y: number; width: number; height: number } { return { x: 0, y: 0, width: 100, height: 20 }; }
  getTotalLength(): number { return 100; }
  getPointAtLength(): { x: number; y: number } { return { x: 0, y: 0 }; }
  get ownerSVGElement(): StubNode | null { return this.closest('svg'); }
  get clientWidth(): number { return 800; }
  get offsetWidth(): number { return 800; }
  matches(sel: string): boolean { return sel.split(',').some((s) => matchOne(this, s.trim())); }
  closest(sel: string): StubNode | null { for (let n: StubNode | null = this; n; n = n.parentNode) if (n.matches(sel)) return n; return null; }
  contains(other: StubNode | null): boolean { for (let n = other; n; n = n.parentNode) if (n === this) return true; return false; }
  querySelectorAll(sel: string): StubNode[] { return all(this, (n) => n.matches(sel)); }
  querySelector(sel: string): StubNode | null { return this.querySelectorAll(sel)[0] ?? null; }
  getElementsByTagName(tag: string): StubNode[] { return all(this, (n) => n.tagName === tag.toUpperCase()); }
  /* in the current document, as boundToPage() asks before drawing */
  get isConnected(): boolean { for (let n: StubNode | null = this; n; n = n.parentNode) if (n === root) return true; return false; }
  get firstChild(): StubNode | null { return this.children[0] ?? null; }
  get lastChild(): StubNode | null { return this.children[this.children.length - 1] ?? null; }
  get firstElementChild(): StubNode | null { return this.children.filter((c) => c.tagName[0] !== '#')[0] ?? null; }
  get childNodes(): StubNode[] { return this.children; }
  get nextSibling(): StubNode | null { const p = this.parentNode; return p ? p.children[p.children.indexOf(this) + 1] ?? null : null; }
  get previousSibling(): StubNode | null { const p = this.parentNode; return p ? p.children[p.children.indexOf(this) - 1] ?? null : null; }
  get options(): StubNode[] { return all(this, (c) => c.tagName === 'OPTION'); }
  createTHead(): StubNode { return this.appendChild(new StubNode('thead')); }
  createTBody(): StubNode { return this.appendChild(new StubNode('tbody')); }
  insertRow(): StubNode { return this.appendChild(new StubNode('tr')); }
  insertCell(): StubNode { return this.appendChild(new StubNode('td')); }
  get innerHTML(): string { return this.textContent; }
  set innerHTML(v: string) { this.children = []; this.own = ''; for (const n of parse(String(v))) this.appendChild(n); }
  get textContent(): string { return this.own + this.children.map((c) => c.textContent).join(' '); }
  /* as in a browser, an element's text is a text node child, which the
     acronym decorator's tree walker visits; a text node holds its own */
  set textContent(value: string) {
    this.children = [];
    if (this.tagName[0] === '#') { this.own = String(value); return; }
    this.own = '';
    if (String(value) !== '') this.appendChild(textNode(String(value)));
  }
  get innerText(): string { return this.textContent; }
  /* what a reader meets outside the text flow */
  get readable(): string {
    const a = READ_ATTRIBUTES.map((k) => this.attributes[k] || '').join(' ') + ' ' + this.title;
    return this.own + ' ' + a + ' ' + this.children.map((c) => c.readable).join(' ');
  }
  /* the same text, one node's own text or one attribute at a time (R182) */
  runs(out: string[] = []): string[] {
    /* a block's text with its inline children's text in it (review of P24),
       and each attribute a reader meets as a run of its own */
    const walk = (n: StubNode, cur: string[]): void => {
      if (n.own) cur.push(n.own);
      for (const k of READ_ATTRIBUTES) if (n.attributes[k]) out.push(n.attributes[k]);
      if (n.title) out.push(n.title);
      for (const c of n.children) {
        if (c.tagName[0] === '#' || INLINE_TAGS.indexOf(c.tagName.toLowerCase()) >= 0) walk(c, cur);
        else {
          /* a block child ends the run before it, as the server reader's
             split does (review 2 of P24) */
          if (cur.length) { out.push(cur.join('')); cur.length = 0; }
          const inner: string[] = []; walk(c, inner); if (inner.length) out.push(inner.join(''));
        }
      }
    };
    const top: string[] = [];
    walk(this, top);
    if (top.length) out.push(top.join(''));
    return out;
  }
}

/* tag, .class, #id, [attr], [attr=value], and compounds of those, matched on
   the last compound of a descendant selector */
function matchOne(n: StubNode, sel: string): boolean {
  if (n.tagName[0] === '#') return false;
  const last = sel.split(/\s+|>/).filter(Boolean).pop() || '';
  const parts = last.match(/^[a-zA-Z][\w-]*|\.[\w-]+|#[\w-]+|\[[^\]]+\]/g) || [];
  if (!parts.length) return false;
  return parts.every((p) => {
    if (p[0] === '.') return n.className.split(/\s+/).indexOf(p.slice(1)) >= 0;
    if (p[0] === '#') return n.id === p.slice(1);
    if (p[0] === '[') {
      const m = /^\[([\w-]+)(?:=["']?([^"'\]]*)["']?)?\]$/.exec(p);
      if (!m) return false;
      const v = m[1].startsWith('data-') ? n.dataset[m[1].slice(5).replace(/-(\w)/g, (_x, c: string) => c.toUpperCase())] : n.attributes[m[1]];
      return m[2] === undefined ? v !== undefined : v === m[2];
    }
    return n.tagName === p.toUpperCase();
  });
}

function all(n: StubNode, pred: (x: StubNode) => boolean): StubNode[] {
  const out: StubNode[] = [];
  for (const c of n.children) { if (pred(c)) out.push(c); out.push(...all(c, pred)); }
  return out;
}

function textNode(t: string): StubNode { const n = new StubNode('#text'); n.own = t; return n; }

/* a small HTML reader: enough of the server's markup to give each element its
   tag, class, id, data-*, attributes and text, in their nesting */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
function parse(html: string): StubNode[] {
  const top = new StubNode('#fragment');
  const stack: StubNode[] = [top];
  const clean = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '').replace(/<!doctype[^>]*>/gi, '');
  const token = /<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = token.exec(clean)) !== null) {
    const cur = stack[stack.length - 1];
    if (m[1]) {
      const tag = m[1].toUpperCase();
      for (let i = stack.length - 1; i > 0; i -= 1) if (stack[i].tagName === tag) { stack.length = i; break; }
    } else if (m[2]) {
      const n = new StubNode(m[2]);
      for (const a of m[3].matchAll(/([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
        const val = decode(a[2] ?? a[3] ?? a[4] ?? '');
        const name = a[1].toLowerCase();
        if (name.startsWith('data-')) n.dataset[name.slice(5).replace(/-(\w)/g, (_x, c: string) => c.toUpperCase())] = val;
        n.setAttribute(name, val);
        if (name === 'title') n.title = val;
        if (name === 'type') n.type = val;
      }
      cur.appendChild(n);
      if (!m[4] && !VOID.has(m[2].toLowerCase())) stack.push(n);
    } else if (m[5] && m[5].trim()) {
      cur.appendChild(textNode(decode(m[5])));
    }
  }
  return [...top.children];
}

let root = new StubNode('body');
const docHandlers: Record<string, Handler[]> = {};
const stubDocument = {
  readyState: 'complete',
  get body(): StubNode { return root; },
  documentElement: new StubNode('html'),
  addEventListener(type: string, fn: Handler): void { if (type !== 'astro:page-load' && type !== 'DOMContentLoaded') (docHandlers[type] = docHandlers[type] || []).push(fn); },
  removeEventListener(): void { /* inert */ },
  getElementById(id: string): StubNode | null { return all(root, (n) => n.id === id)[0] ?? null; },
  querySelector(sel: string): StubNode | null { return root.querySelector(sel); },
  querySelectorAll(sel: string): StubNode[] { return root.querySelectorAll(sel); },
  getElementsByTagName(tag: string): StubNode[] { return root.getElementsByTagName(tag); },
  createElement(tag: string): StubNode { return new StubNode(tag); },
  createElementNS(_ns: string, tag: string): StubNode { return new StubNode(tag); },
  createTextNode: textNode,
  createDocumentFragment(): StubNode { return new StubNode('#fragment'); },
  /* the acronym decorator walks text nodes */
  createTreeWalker(start: StubNode): { currentNode: StubNode | null; nextNode: () => StubNode | null } {
    const texts = all(start, (n) => n.tagName === '#TEXT');
    let i = -1;
    const walker = { currentNode: null as StubNode | null, nextNode: (): StubNode | null => { i += 1; walker.currentNode = texts[i] ?? null; return walker.currentNode; } };
    return walker;
  }
};

const CLIENTS: Record<string, () => Promise<unknown>> = {
  gov: () => import('../../src/scripts/gov-client'),
  hardening: () => import('../../src/scripts/hardening-client'),
  legislation: () => import('../../src/scripts/legislation-client'),
  rollout: () => import('../../src/scripts/rollout-client'),
  data: () => import('../../src/scripts/data-client'),
  index: () => import('../../src/scripts/overview-client'),
  health: () => import('../../src/scripts/health-client'),
  tax: () => import('../../src/scripts/tax-client'),
  units: () => import('../../src/scripts/units-client'),
  ltc: () => import('../../src/scripts/ltc-client'),
  medications: () => import('../../src/scripts/medications-client'),
  workforce: () => import('../../src/scripts/workforce-client'),
  risk: () => import('../../src/scripts/fmea-client'),
  quality: () => import('../../src/scripts/quality-client')
};

/* the data files a client fetches, served from public/ */
async function stubFetch(url: string): Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }> {
  const path = String(url).replace(/^.*?\/data\//, 'public/data/').replace(/[?#].*$/, '');
  const body = readFileSync(join(REPO_ROOT, path), 'utf8');
  return { ok: true, status: 200, json: async () => JSON.parse(body), text: async () => body };
}

const G = globalThis as Record<string, unknown>;
const STUB_GLOBALS: Record<string, unknown> = {
  document: stubDocument,
  window: {
    addEventListener(): void { /* inert */ }, removeEventListener(): void { /* inert */ },
    innerWidth: 1200, innerHeight: 900, devicePixelRatio: 1, scrollY: 0,
    setTimeout: (fn: () => void, ms?: number): unknown => setTimeout(fn, ms),
    clearTimeout: (h: ReturnType<typeof setTimeout>): void => clearTimeout(h),
    setInterval: (): number => 0, clearInterval: (): void => { /* inert */ },
    requestAnimationFrame: (fn: () => void): number => { fn(); return 0; },
    cancelAnimationFrame: (): void => { /* inert */ },
    location: { pathname: '/US-National-Health-Assurance-System/', hash: '', search: '' },
    getComputedStyle: (): { getPropertyValue: () => string } => ({ getPropertyValue: () => '' }),
    matchMedia: (): { matches: boolean; addEventListener: () => void; removeEventListener: () => void } =>
      ({ matches: false, addEventListener(): void { /* inert */ }, removeEventListener(): void { /* inert */ } })
  },
  fetch: stubFetch,
  Node: StubNode, Element: StubNode, HTMLElement: StubNode, SVGElement: StubNode,
  HTMLInputElement: StubNode, HTMLSelectElement: StubNode, HTMLButtonElement: StubNode,
  HTMLAnchorElement: StubNode, HTMLTableElement: StubNode, HTMLDetailsElement: StubNode,
  NodeFilter: { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2, FILTER_SKIP: 3 },
  getComputedStyle: (): { getPropertyValue: () => string; display: string; visibility: string } =>
    ({ getPropertyValue: () => '', display: 'block', visibility: 'visible' }),
  /* observers never fire here; the sweep acts on the page directly */
  MutationObserver: class { observe(): void { /* inert */ } disconnect(): void { /* inert */ } takeRecords(): unknown[] { return []; } },
  IntersectionObserver: class { observe(): void { /* inert */ } unobserve(): void { /* inert */ } disconnect(): void { /* inert */ } },
  ResizeObserver: class { observe(): void { /* inert */ } unobserve(): void { /* inert */ } disconnect(): void { /* inert */ } },
  requestAnimationFrame: (fn: () => void): number => { fn(); return 0; },
  cancelAnimationFrame: (): void => { /* inert */ },
  matchMedia: (): { matches: boolean; addEventListener: () => void; removeEventListener: () => void } =>
    ({ matches: false, addEventListener(): void { /* inert */ }, removeEventListener(): void { /* inert */ } })
};
const saved: Record<string, unknown> = {};
beforeAll(() => { for (const [k, v] of Object.entries(STUB_GLOBALS)) { saved[k] = G[k]; G[k] = v; } });
afterAll(() => { for (const k of Object.keys(STUB_GLOBALS)) G[k] = saved[k]; });

const settle = async (): Promise<void> => { for (let i = 0; i < 3; i += 1) await new Promise((r) => setTimeout(r, 0)); };
const COST_NOTE = 'Cost/model parameter, not a phase performance target.';
const POINTER = ['mouseenter', 'mouseover', 'pointerenter', 'pointerover', 'pointermove', 'mousemove', 'focus', 'focusin'];

/* Second review of the owner fix run (H1): reach was proved per page, so a
   page could pass while one of its surfaces drew nothing (Units' tables open
   only on a details toggle; a failed fetch falls back to notes). Each named
   surface must be drawn. */
const SURFACES: Record<string, Array<[string, (r: StubNode) => boolean]>> = {
  units: [
    ['the county table, built when its details open', (r) => all(r.querySelector('#units-county-table') || new StubNode('x'), (n) => n.tagName === 'TR').length > 10],
    ['the absorption control, drawn after the data loads', (r) => r.textContent.indexOf('visits/person/yr') >= 0]
  ],
  risk: [['a failure mode\'s detail card', (r) => r.querySelector('.fmea-detail-grid') !== null]],
  /* R146: the totals say how much revenue rests on a superseded baseline */
  tax: [['the superseded-baseline tile, with the model\'s own share', (r) => r.textContent.indexOf('Estimated against superseded law') >= 0 &&
    /\d+% of revenue rests on estimates made before the July 2025 tax law; \$[\d.,]+[BT]?\/yr of it is this model's own calculation/.test(r.textContent)]],
  quality: [['a cost record\'s notes', (r) => r.textContent.indexOf(COST_NOTE) >= 0]]
};

/* Review of the content run: two kinds of tooltip were outside the sweep.
   A listener that delegates (Units' one listener for every county dot) was
   hovered only on itself, so it found no dot and hid; and a crosshair
   tooltip, which shows the column under the pointer, was hovered at one x
   and showed one year. A tooltip is gone by the next hover, so what proves
   reach is the tooltip heads seen along the way. */
const DELEGATE_SAMPLE = 24;
const SWEEP_X = Array.from({ length: 226 }, (_, k) => k * 4); /* 0 to 900 */
const MOVES = ['pointermove', 'mousemove'];
const everyYear = (h: Set<string>): boolean => {
  for (let y = START_YEAR; y <= END_YEAR; y += 1) if (!h.has(String(y))) return false;
  return true;
};
const TOOLTIPS: Record<string, Array<[string, (heads: Set<string>) => boolean]>> = {
  units: [['a county dot\'s tooltip, through the map\'s one listener', (h) => [...h].some((x) => /, [A-Z]{2}$/.test(x))]],
  health: [['every year of the cost path chart', everyYear]],
  tax: [
    ['every year of the revenue chart', everyYear],
    ['every year of the top-rate history, 1913 to 2025', (h) => [...h].filter((x) => /^(?:19|20)\d\d \(/.test(x)).length === 2025 - 1913 + 1]
  ]
};

/* The owner, 2026-10-11: keep the source document's entity acronyms
   (A1-HCAC, RS-CORPS, DNHA-SEC, ...) and make sure every acronym a reader
   sees has a hover. Read after the decorator has run, in the page and the
   site header and footer (a tooltip is a hover itself, and sits outside
   them): every
   acronym-shaped token is inside an <abbr>; or in an SVG label that carries
   the decorator's <title>; or in an org box whose tooltip heading, seen
   during the sweep, is the name its aria-label opens with; or in an option
   with a title; or it is not an acronym, for the reason NOT_ACRONYMS gives.
   Measured first, on the sweep's end state: the entity codes in the
   Governance diagrams (covered by the boxes' own tooltips), chart labels in
   SVG with no hover, prose pairs the matcher refused at a slash ("RN/LPN",
   "HFASB/NHASB"), the header's CMS and CBO, and acronyms the glossary
   lacked. */
const ACRONYM_SHAPE = /(?<![\w-])(?=[A-Z0-9-]*[A-Z][A-Z0-9-]*[A-Z])[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*(?![\w-])/g;
const CATALOG_ID = new RegExp('^(?:' + CATALOG_ID_FAMILIES.join('|') + ')-');
const NOT_ACRONYMS: Array<[RegExp, string]> = [
  [/^[IVXLC]+$/, 'a Roman numeral, a Title or Part number'],
  [/^P\d-P\d$/, 'a phase range'],
  [/^A-D$/, 'the unit types A to D'],
  [/^(?:GAO-22-104960|RRA788-3)$/, 'a report number, cited as written'],
  [/^FY\d{4}$/, 'a fiscal year, as written'],
  [/^(?:DERIVED|ASSUMPTION|RATIO|NOT|NO)$/, 'a word set in capitals for emphasis in a source note'],
  [/^(?:COST|MODEL|INPUT|BUILD|STATE|FISCAL|ENGINE)$/, 'a word of Quality\'s diagram labels, set in capitals'],
  [/^ID$/, 'a table column heading, "identifier"; Idaho\'s code too, so not a glossary key'],
  [/^(?:LIVE|KAPPA|LEGACY|CREATED|README|LF)$/, 'an identifier in a build self-test\'s name, which Healthcare lists verbatim']
];
type HoverReach = { abbr: number; svgTitle: number; ownTooltip: number; option: number; notAcronym: number; chrome: number };

function acronymHovers(page: string, heads: Set<string>, chromeSelector: string): { faults: string[]; reach: HoverReach } {
  const faults: string[] = [];
  const reach: HoverReach = { abbr: 0, svgTitle: 0, ownTooltip: 0, option: 0, notAcronym: 0, chrome: 0 };
  const up = (n: StubNode, pred: (p: StubNode) => boolean): StubNode | null => {
    for (let p = n.parentNode; p; p = p.parentNode) if (pred(p)) return p;
    return null;
  };
  const chrome = root.querySelectorAll(chromeSelector);
  for (const c of chrome) reach.chrome += all(c, (x) => x.tagName === 'ABBR' && x.className === 'acronym').length;
  for (const region of [root.querySelector('main'), ...chrome]) {
    if (!region) continue;
    for (const t of all(region, (x) => x.tagName === '#TEXT')) {
      /* the decorator's own <title> is the hover, not a label */
      if (up(t, (p) => ['SCRIPT', 'STYLE', 'TITLE'].indexOf(p.tagName) >= 0)) continue;
      /* state codes on the maps, kept off the glossary on purpose */
      if (up(t, (p) => 'noAcronyms' in p.dataset)) continue;
      for (const m of t.own.matchAll(ACRONYM_SHAPE)) {
        const tok = m[0];
        /* the catalog's own ids, said once by CATALOG_ID_NOTE and named beside each */
        if (CATALOG_TABS.has(page) && CATALOG_ID.test(tok)) continue;
        if (up(t, (p) => p.tagName === 'ABBR')) { reach.abbr += 1; continue; }
        if (up(t, (p) => p.tagName === 'SVG')) {
          const own = up(t, (p) => 'ownTooltip' in p.dataset);
          if (own) {
            const aria = own.attributes['aria-label'] || '';
            if ([...heads].some((h) => aria.startsWith(h + '. '))) { reach.ownTooltip += 1; continue; }
          } else {
            const label = up(t, (p) => p.tagName === 'TEXT');
            const title = label ? label.children.filter((c) => c.tagName === 'TITLE')[0] : undefined;
            if (title && title.textContent.indexOf(tok + ': ') >= 0) { reach.svgTitle += 1; continue; }
          }
        }
        const option = up(t, (p) => p.tagName === 'OPTION');
        if (option && (option.attributes.title || '').indexOf(tok + ': ') >= 0) { reach.option += 1; continue; }
        if (NOT_ACRONYMS.some(([re]) => re.test(tok))) { reach.notAcronym += 1; continue; }
        faults.push(page + ': ' + tok + ' has no hover, in "' + t.own.slice(Math.max(0, m.index! - 40), m.index! + 40).replace(/\s+/g, ' ') + '"');
      }
    }
  }
  return { faults, reach };
}

/* What the sweep does not reach, said rather than implied: keyboard-only
   paths, draws triggered by scroll, resize or an observer, work a timer
   defers past three turns of the event loop, a vertical pointer position
   (every hover is at one height), a tooltip that changes with x but reads
   the same at the page's left and right edges (only a tooltip that differs
   there is moved across every x), and the nodes of a delegating listener
   beyond an evenly spaced sample of DELEGATE_SAMPLE. */
test('no page\'s client draws a source code, says "framework" or doubles a word, in the states the sweep reaches', async () => {
  const { decoratePage, SITE_CHROME } = await import('../../src/scripts/acronyms-client');
  const surfaceFaults: string[] = [];
  const decorated: Record<string, number> = {};
  const hoverFaults: string[] = [];
  const hoverReach: Record<string, HoverReach> = {};
  const byPage: Record<string, string[]> = {};
  const drew: Record<string, number> = {};
  const actions: Record<string, number> = {};
  const drawnIds: Record<string, number> = {};
  const atLoad: Record<string, boolean> = {};
  const costRecord: Record<string, boolean> = {};
  const doubledSeen = new Set<string>();
  const runsRead: Record<string, number> = {};
  for (const [page, load] of Object.entries(CLIENTS)) {
    const html = await serverHtml(page);
    root = new StubNode('body');
    const body = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html);
    for (const n of parse(body ? body[1] : html)) root.appendChild(n);
    for (const k of Object.keys(docHandlers)) delete docHandlers[k];
    const before = root.textContent.replace(/\s+/g, ' ').length;
    await load();
    await settle();
    const seen = new Set<string>();
    const heads = new Set<string>();
    const look = (): void => {
      const t = root.readable.replace(/\s+/g, ' ');
      for (const h of hits(page, t)) seen.add(h);
      const runs = root.runs();
      runsRead[page] = Math.max(runsRead[page] || 0, runs.length);
      for (const h of doubled(page, runs)) doubledSeen.add(h);
      if (t.indexOf(COST_NOTE) >= 0) costRecord[page] = true;
      for (const h of root.querySelectorAll('.tip-head')) heads.add(h.textContent.replace(/\s+/g, ' ').trim());
    };
    /* the tooltip alone, read after each step of a sweep; the whole page is
       read once the node's sweep is done */
    const lookTip = (): void => {
      for (const tip of root.querySelectorAll('.nha-tooltip')) {
        for (const h of hits(page, tip.readable.replace(/\s+/g, ' '))) seen.add(h);
        for (const h of doubled(page, tip.runs())) doubledSeen.add(h);
        for (const h of tip.querySelectorAll('.tip-head')) heads.add(h.textContent.replace(/\s+/g, ' ').trim());
      }
    };
    look();
    /* the explorer's own count line: every record shown, none filtered out */
    atLoad[page] = /\b([\d,]+) of \1 (?:parameters|failure modes) shown/.test(root.textContent);
    /* a surface may show only in the default state (the Tax tile's model
       share needs the surtax on, which the sweep later toggles off), or only
       after a control opens it (Units' county table): drawn at load or at
       the end */
    const surfaceAtLoad = (SURFACES[page] || []).map(([, drawn]) => drawn(root));
    drew[page] = root.textContent.replace(/\s+/g, ' ').length - before;
    let n = 0;
    for (const b of root.querySelectorAll('button, summary, [role=tab], [role=button]')) { b.click(); n += 1; look(); }
    for (const s of root.querySelectorAll('select')) {
      for (const o of s.options) { s.value = o.value; s.dispatch('input'); s.dispatch('change'); n += 1; look(); }
    }
    for (const i of root.querySelectorAll('input')) {
      if (i.type === 'checkbox' || i.type === 'radio') i.checked = !i.checked;
      else if (i.type === 'range' || i.type === 'number') i.value = i.attributes.max ?? i.value;
      else i.value = 'cost';
      i.dispatch('input'); i.dispatch('change'); n += 1; look();
    }
    /* what the interactions drew can be clicked in its turn: one more pass,
       SVG role=button nodes included (Quality's diagram groups) */
    for (const b of root.querySelectorAll('button, [role=button]')) { b.click(); n += 1; look(); }
    /* hover and focus, where tooltips are drawn: on every node that listens;
       a node that listens for movement, at every x across the page; and a
       sample of the nodes inside it, for a listener that delegates */
    const listens = (x: StubNode, ev: string): boolean =>
      (x.handlers[ev] || []).length > 0 || typeof (x as unknown as Record<string, unknown>)['on' + ev] === 'function';
    for (const t of all(root, (x) => POINTER.some((ev) => listens(x, ev)))) {
      for (const ev of POINTER) t.dispatch(ev);
      n += 1; look();
      if (MOVES.some((ev) => listens(t, ev))) {
        /* a tooltip that differs between the left and right of the page
           shows the column under the pointer: move it across every x */
        const tipText = (): string => root.querySelectorAll('.nha-tooltip').map((x) => x.textContent).join('|');
        for (const ev of MOVES) t.dispatch(ev, SWEEP_X[0]);
        const atLeft = tipText(); lookTip();
        for (const ev of MOVES) t.dispatch(ev, SWEEP_X[SWEEP_X.length - 1]);
        n += 2; lookTip();
        if (tipText() !== atLeft) for (const x of SWEEP_X) { for (const ev of MOVES) t.dispatch(ev, x); n += 1; lookTip(); }
      }
      const inside = all(t, (d) => d.tagName[0] !== '#');
      const step = Math.max(1, Math.ceil(inside.length / DELEGATE_SAMPLE));
      for (let k = 0; k < inside.length; k += step) { for (const ev of POINTER) inside[k].dispatch(ev); n += 1; lookTip(); }
      look();
    }
    await settle(); look();
    /* the site-wide acronym decorator, which writes title and aria-label */
    /* the client's own page-arrival path: <main>, and the site header and
       footer once per page */
    decoratePage();
    decorated[page] = all(root, (x) => x.tagName === 'ABBR' && x.className === 'acronym').length;
    const hover = acronymHovers(page, heads, SITE_CHROME);
    hoverFaults.push(...hover.faults);
    hoverReach[page] = hover.reach;
    look();
    (SURFACES[page] || []).forEach(([what, drawn], k) => { if (!surfaceAtLoad[k] && !drawn(root)) surfaceFaults.push(page + ': ' + what + ' was not drawn'); });
    for (const [what, reached] of TOOLTIPS[page] || []) if (!reached(heads)) surfaceFaults.push(page + ': ' + what + ' was not reached');
    actions[page] = n;
    byPage[page] = [...seen];
    drawnIds[page] = (root.textContent.match(catalogCode('g')) || []).length;
  }
  expect(Object.values(byPage).flat()).toEqual([]);
  /* R182: and no doubled word in any state the sweep reached, one text node
     or attribute at a time, on every page */
  expect([...doubledSeen]).toEqual([]);
  expect(Object.keys(CLIENTS).filter((p) => !(runsRead[p] > 1))).toEqual([]);
  /* reach: every client drew something past its server HTML, and was acted on */
  expect(Object.keys(drew).filter((p) => !(drew[p] > 0)).map((p) => p + ' drew ' + drew[p])).toEqual([]);
  /* every page was acted on (Long-Term Care has no control, but its charts'
     tooltips answer hover) */
  expect(Object.keys(actions).filter((p) => !(actions[p] > 0))).toEqual([]);
  /* the catalog tabs drew their ids, and a cost record's notes were reached */
  for (const page of CATALOG_TABS) expect(drawnIds[page], page).toBeGreaterThan(0);
  /* and drew records on arrival, before any control was touched, as a
     browser shows them: a filter reading "" rather than its first option
     showed none (review of the owner batch) */
  for (const page of CATALOG_TABS) expect(atLoad[page], page + ' shows every record at load').toBe(true);
  expect(costRecord.quality).toBe(true);
  /* a named surface or tooltip under a page the sweep does not load would
     be skipped without a word */
  expect(Object.keys(SURFACES).concat(Object.keys(TOOLTIPS)).filter((p) => !(p in CLIENTS))).toEqual([]);
  expect(surfaceFaults).toEqual([]);
  /* the decorator ran on every page and wrote its titles where the sweep
     read them (review of the content run: one total across pages could
     hide a page it never reached) */
  expect(Object.keys(CLIENTS).filter((p) => !(decorated[p] > 0)).map((p) => p + ' decorated ' + decorated[p])).toEqual([]);
  /* every acronym a reader sees has a hover (the owner, 2026-10-11) */
  expect(hoverFaults).toEqual([]);
  /* and each kind of hover was checked: the org boxes' tooltips on
     Governance, SVG titles and option titles somewhere, the site header on
     every page */
  const total = (k: keyof HoverReach): number => Object.values(hoverReach).reduce((s, r) => s + r[k], 0);
  expect(hoverReach.gov.ownTooltip).toBeGreaterThan(0);
  expect([total('svgTitle'), total('option')].map((v) => v > 0)).toEqual([true, true]);
  expect(Object.keys(CLIENTS).filter((p) => !(hoverReach[p].chrome > 0))).toEqual([]);
  console.log('[rendered-codes] hovers ' + Object.keys(hoverReach).map((p) => p + ' ' + JSON.stringify(hoverReach[p])).join('; '));
  console.log('[rendered-codes] ' + Object.keys(actions).map((p) => p + ' ' + actions[p] + ' actions, +' + drew[p] + ' chars, ' + decorated[p] + ' acronyms').join('; '));
}, 600_000);

test('Quality draws a record\'s text without the source document\'s non-catalog codes', () => {
  expect(withoutSourceCodes('coverage/affordability; SN-02')).toBe('coverage/affordability');
  /* an open item keeps its marker in words (second review: the first
     version left TPP-6.6's status with no sign it was open) */
  expect(withoutSourceCodes('OI-001; target preserved, not baselined')).toBe('Open item; target preserved, not baselined');
  expect(withoutSourceCodes('weighted controlled-condition components; numerator/weights open OI-023'))
    .toBe('weighted controlled-condition components; numerator/weights open');
  expect(withoutSourceCodes('OI-008; branch 1.25x and 2.25x')).toBe('Open item; branch 1.25x and 2.25x');
  /* a string that opened with a code still opens with a capital */
  expect(withoutSourceCodes('PR-SCH-014: maturity certification')).toBe('Maturity certification');
  expect(withoutSourceCodes('SN-09/SN-16 baseline +25 percentage points')).toBe('Baseline +25 percentage points');
  expect(withoutSourceCodes('a; SN-02; b')).toBe('a; b');
  /* a chain never swallows a catalog id; a bare-number range goes whole */
  expect(withoutSourceCodes('SN-02/KPP-A1 coverage')).toBe('KPP-A1 coverage');
  expect(withoutSourceCodes('SR-DATA-001–012; records')).toBe('Records');
  /* the families found by the any-token probe, in the catalog's own
     strings: a product-family range, a phase code said in words, an
     assumption code */
  expect(withoutSourceCodes('200 of 200 controlled PMC product families PF-001–PF-200 in routine conforming public production by PH-P8'))
    .toBe('200 of 200 controlled PMC product families in routine conforming public production by Phase 8');
  expect(withoutSourceCodes('Before major expansion and specifically PH-P3 to PH-P4')).toBe('Before major expansion and specifically Phase 3 to Phase 4');
  expect(withoutSourceCodes('substitute plans (ASM-004); their overhead')).toBe('substitute plans; their overhead');
  /* the catalog's own ids, and text with no code, come back unchanged */
  expect(withoutSourceCodes('KPP-A1 and TPP-1.4, CP-TOT-008')).toBe('KPP-A1 and TPP-1.4, CP-TOT-008');
  /* a catalog id with a family's letters inside it is one id */
  expect(withoutSourceCodes('CP-PH-001; SN-02')).toBe('CP-PH-001');
  expect(withoutSourceCodes('  spacing kept  ')).toBe('  spacing kept  ');
});

/* Second review of the owner fix run (J1): the stripper's defects were
   latent, so hold it to every string the catalog actually gives Quality:
   no non-catalog code survives, every catalog id does, and no separator,
   space or lowercase start is left where a code was. */
test('the stripper, over every string field of every catalog record', () => {
  const faults: string[] = [];
  let changed = 0;
  const ids = new RegExp('\\b(?:' + CATALOG_ID_FAMILIES.join('|') + ')-[A-Z0-9][A-Z0-9.-]*[A-Z0-9]', 'g');
  const strings: Array<[string, string, string]> = [];
  for (const p of QUALITY_DATA.parameters) {
    for (const [field, value] of Object.entries(p)) if (typeof value === 'string') strings.push([p.id, field, value]);
    /* the phase strip: each entry's value and its "Why this value" */
    (p.rollout || []).forEach((e, i) => {
      for (const [field, value] of Object.entries(e)) if (typeof value === 'string') strings.push([p.id, 'rollout[' + i + '].' + field, value]);
    });
  }
  /* the prose floors compose their reason without the requirement's id at
     the source, so the stripper is not what keeps PR-SCH off the page */
  expect(strings.filter(([, f, v]) => /interpretation$/.test(f) && /\bPR-[A-Z]/.test(v))).toEqual([]);
  for (const [record, field, value] of strings) {
    const out = withoutSourceCodes(value);
    if (out === value) continue;
    changed += 1;
    const where = record + '.' + field + ': "' + out + '"';
    if (catalogCode().test(out.replace(ids, ''))) faults.push(where + ' keeps a non-catalog code');
    for (const kept of value.match(ids) || []) if (out.indexOf(kept) < 0) faults.push(where + ' lost ' + kept);
    if (/\s[;,:.]|[;,:]\s*$|^\s*[;,:]|\(\s*\)|\s{2}/.test(out)) faults.push(where + ' has a dangling separator');
    if (/^[A-Z]/.test(value) && /^[a-z]/.test(out)) faults.push(where + ' lost its capital');
    if (/\bOI-\d/.test(value) && !/\bopen\b/i.test(out)) faults.push(where + ' lost its open-item marker');
  }
  expect(faults).toEqual([]);
  expect(changed).toBeGreaterThan(40);
});

test('the reader parses nesting, attributes, data-* and select values as a browser would', () => {
  const [sel] = parse('<select id="t"><option value="all">All</option><option value="CP">Cost</option></select>');
  expect([sel.id, sel.value, sel.options.length]).toEqual(['t', 'all', 2]);
  sel.value = 'CP';
  expect(sel.value).toBe('CP');
  const [div] = parse('<div class="a b" data-phase-id="P3" title="T &amp; U"><span>x</span><br><b>y</b></div>');
  expect([div.className, div.dataset.phaseId, div.title, div.children.map((c) => c.tagName)]).toEqual(['a b', 'P3', 'T & U', ['SPAN', 'BR', 'B']]);
  expect(div.readable).toContain('T & U');
  expect(hits('risk', 'SR-LAW-001 and KPP-A1')).toEqual(['risk: SR-LAW-001 in "SR-LAW-001 and KPP-A1"']);
  /* review 3 of P24: each upstream-document name is refused, the plan is not */
  for (const name of ['Source Package', 'two upstream documents', 'the plan document', 'the plan extract', 'definition extract']) {
    expect(hits('health', 'matches ' + name + ' today'), name).toHaveLength(1);
  }
  expect(hits('health', 'Every target the plan specifies matches the plan\'s own definition')).toEqual([]);
});
