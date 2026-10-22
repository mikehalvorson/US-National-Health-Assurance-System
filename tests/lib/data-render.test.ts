import { afterEach, beforeEach, expect, test } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { maskComments, orphanAriaLabelFaults } from '../../src/lib/manifest-check';
import {
  renderCyberControls, renderDataPhaseTimeline, renderFixes, renderPlanes,
  renderStoreTable, renderTransferMap, selectDataPhase, type PhaseHosts
} from '../../src/lib/data-render';
import { DATA_PHASES, scopeNoteText } from '../../src/lib/data-phases';
import { CYBER_CONTROLS, FIXES, PLANES, STORE_ROWS } from '../../src/lib/data-view';

/* =========================================================================
 * R295 [§S15] declares: "every render function is idempotent when called
 * twice" and "no guard protects a host it does not own".
 *
 * Before this, six of the seven renderers appended into their host, and the
 * only thing that kept the page from doubling was that the init calling them
 * ran once per page instance behind a guard on #data-fixes - a different
 * element from five of the six hosts. These call each renderer twice on the
 * same host and require the second call to leave exactly what the first drew.
 *
 * The guard is still on #data-fixes, and still runs the init once per visit;
 * that is its job. What the row's second test asks for is that no renderer's
 * correctness depends on it. Read that way it is the idempotence tests plus
 * the one after them: each renderer draws only into the host it is handed
 * and never looks one up, so no guard is standing in for a check it lacks.
 * Review of P21 found this header claimed the second test while nothing
 * tested it; the log records the reading as a discrepancy.
 * ========================================================================= */

/* A minimal document: enough for the renderers, and a serialisation that sees
   tags, classes, attributes, data, the properties the renderers set, and text,
   in order. */
class StubNode {
  className = '';
  own = '';
  children: StubNode[] = [];
  attributes: Record<string, string> = {};
  dataset: Record<string, string> = {};
  style: Record<string, string> = {};
  listeners: Record<string, (() => void)[]> = {};
  type = ''; href = ''; target = ''; rel = ''; scope = '';
  readonly tagName: string;
  constructor(tag: string) { this.tagName = tag.toUpperCase(); }
  appendChild(child: StubNode): StubNode { this.children.push(child); return child; }
  replaceChildren(...nodes: StubNode[]): void { this.children = [...nodes]; }
  /* the real DOM has it, so a renderer that appends is testable rather than
     a TypeError, which would fail these tests for the wrong reason */
  append(...nodes: StubNode[]): void { this.children.push(...nodes); }
  setAttribute(name: string, value: string): void { this.attributes[name] = String(value); }
  getAttribute(name: string): string | null { return this.attributes[name] ?? null; }
  addEventListener(type: string, fn: () => void): void { (this.listeners[type] ??= []).push(fn); }
  get textContent(): string { return this.own + this.children.map((c) => c.textContent).join(''); }
  set textContent(value: string) { this.own = value; this.children = []; }
  get caption(): StubNode | null { return this.children.find((c) => c.tagName === 'CAPTION') ?? null; }
}

function serialise(n: StubNode): string {
  const attrs = Object.keys(n.attributes).sort().map((k) => k + '=' + n.attributes[k]).join(',');
  const data = Object.keys(n.dataset).sort().map((k) => k + '=' + n.dataset[k]).join(',');
  const props = [n.type, n.href, n.target, n.rel, n.scope, n.style.gridColumn ?? ''].join('|');
  return n.tagName + '.' + n.className + '[' + attrs + '](' + data + ')<' + props + '>"' + n.own + '"{' +
    n.children.map(serialise).join('') + '}';
}

function all(n: StubNode, pred: (m: StubNode) => boolean): StubNode[] {
  return [...(pred(n) ? [n] : []), ...n.children.flatMap((c) => all(c, pred))];
}

const g = globalThis as { document?: unknown };
let saved: unknown;
beforeEach(() => {
  saved = g.document;
  g.document = {
    createElement: (tag: string) => new StubNode(tag),
    createTextNode: (text: string) => { const t = new StubNode('#text'); t.own = text; return t; }
  };
});
afterEach(() => { if (saved === undefined) delete g.document; else g.document = saved; });

/* the renderers take real element types; the stub stands in for them */
const asElement = (n: StubNode) => n as unknown as HTMLElement;

const GRIDS: [string, (host: HTMLElement) => void, number][] = [
  ['renderFixes', renderFixes, FIXES.length],
  ['renderPlanes', renderPlanes, PLANES.length],
  ['renderTransferMap', renderTransferMap, 3],
  ['renderCyberControls', renderCyberControls, CYBER_CONTROLS.length]
];

test.each(GRIDS)('%s draws the same thing once when called twice on its host', (_name, render, children) => {
  const host = new StubNode('div');
  render(asElement(host));
  const once = serialise(host);
  expect(host.children.length).toBe(children);
  render(asElement(host));
  expect(host.children.length).toBe(children);
  expect(serialise(host)).toBe(once);
});

test('no renderer looks a host up: each draws only into what it is handed', () => {
  /* Review 2 of P21: the first version of this test asserted that a host
     never passed to anything came out untouched, which the stub guaranteed,
     and it covered four of the seven renderers. This one gives the document
     lookup functions that record every call, runs all seven, and requires
     none of them to have been called. */
  const lookups: string[] = [];
  const doc = g.document as Record<string, unknown>;
  for (const fn of ['getElementById', 'querySelector', 'querySelectorAll', 'getElementsByClassName',
    'getElementsByTagName']) {
    doc[fn] = (arg: string) => { lookups.push(fn + '(' + arg + ')'); return null; };
  }
  for (const [, render] of GRIDS) render(asElement(new StubNode('div')));
  renderStoreTable(new StubNode('table') as unknown as HTMLTableElement);
  const { hosts, detail } = phaseHosts();
  renderDataPhaseTimeline(hosts);
  selectDataPhase(hosts, DATA_PHASES[2]?.id ?? 'P0');
  expect(detail.children.length).toBe(3);
  expect(GRIDS.length + 3).toBe(7);
  expect(lookups).toEqual([]);
});

test('every element in data-render.ts is made by a plain const createElement statement', () => {
  /* The R245 check finds an element's tag only from that statement shape.
     Review 2 of P21 found one conditional `cond ? createElement('th') :
     createElement('td')` the check could not see while the file's header
     said every element used the plain shape. */
  const source = maskComments(readFileSync(
    fileURLToPath(new URL('../../src/lib/data-render.ts', import.meta.url)), 'utf8'));
  const lines = source.split('\n').filter((l) => l.includes('createElement('));
  expect(lines.length).toBeGreaterThan(40);
  expect(lines.filter((l) => !/^\s*const [A-Za-z]+ = document\.createElement\('[a-z0-9]+'\);$/.test(l)))
    .toEqual([]);
});

test('the R245 check can see the elements these renderers make', () => {
  /* Review of P21: a small factory helper in the first version hid every
     element's tag from orphanAriaLabelFaults, so a role-less labelled element
     built here passed it. The file now makes each element with a plain
     document.createElement statement; this swaps a plane's role for a label,
     leaving one labelled role-less <div>, and requires the check to name the
     file. */
  const root = mkdtempSync(join(tmpdir(), 'p21-r245-'));
  try {
    cpSync(fileURLToPath(new URL('../../src', import.meta.url)), join(root, 'src'), { recursive: true });
    const file = join(root, 'src', 'lib', 'data-render.ts');
    const text = readFileSync(file, 'utf8');
    const from = "    const item = document.createElement('div');\n    item.setAttribute('role', 'listitem');\n    item.className = 'data-plane';";
    expect(text.split(from).length - 1).toBe(1);
    writeFileSync(file, text.replace(from,
      "    const item = document.createElement('div');\n    item.setAttribute('aria-label', 'a plane');\n    item.className = 'data-plane';"));
    expect(orphanAriaLabelFaults(root)).toEqual(['src/lib/data-render.ts labels an element it builds without giving it a role']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('renderPlanes draws every plane as an item of its role="list" host', () => {
  /* P21 [§S15], new finding: the planes were <article> elements inside
     #data-planes, a role="list", so a screen reader met a list with no items.
     The page sweep in accessibility.test.ts cannot see them, because the host
     is empty until this renderer runs; it requires #data-planes to be a list
     that renders empty and names this test as the one that covers it. An
     <article> is refused too: HTML does not allow it the listitem role. */
  const host = new StubNode('div');
  renderPlanes(asElement(host));
  expect(host.children.length).toBe(PLANES.length);
  const wrong = host.children
    .filter((c) => c.getAttribute('role') !== 'listitem' || c.tagName === 'ARTICLE')
    .map((c) => '<' + c.tagName.toLowerCase() + ' role=' + c.getAttribute('role') + '>');
  expect(wrong).toEqual([]);
});

test('renderStoreTable draws one head and one body when called twice, and keeps the caption', () => {
  /* the caption is static markup naming the table for a screen reader; the
     row's own suggestion, one blanket clear per renderer, would delete it */
  const table = new StubNode('table');
  const caption = new StubNode('caption');
  caption.textContent = 'Major information-mesh datasets and examples';
  table.appendChild(caption);
  renderStoreTable(table as unknown as HTMLTableElement);
  const once = serialise(table);
  renderStoreTable(table as unknown as HTMLTableElement);
  expect(serialise(table)).toBe(once);
  expect(table.children.map((c) => c.tagName)).toEqual(['CAPTION', 'THEAD', 'TBODY']);
  expect(table.children[0]).toBe(caption);
  expect(table.children[2]?.children.length).toBe(STORE_ROWS.length);
});

function phaseHosts(): { hosts: PhaseHosts; timeline: StubNode; detail: StubNode; link: StubNode } {
  const timeline = new StubNode('div');
  const detail = new StubNode('div');
  const link = new StubNode('a');
  return {
    hosts: { timeline: asElement(timeline), detail: asElement(detail), methodologyLink: link as unknown as HTMLAnchorElement },
    timeline, detail, link
  };
}

test('the phase timeline and its detail draw once when rendered twice', () => {
  const { hosts, timeline, detail } = phaseHosts();
  renderDataPhaseTimeline(hosts);
  const once = serialise(timeline) + serialise(detail);
  renderDataPhaseTimeline(hosts);
  expect(timeline.children.length).toBe(DATA_PHASES.length);
  expect(serialise(timeline) + serialise(detail)).toBe(once);
});

test('choosing a phase replaces the detail, and choosing it again changes nothing', () => {
  const { hosts, timeline, detail, link } = phaseHosts();
  renderDataPhaseTimeline(hosts);
  const target = DATA_PHASES[3];
  expect(target).toBeDefined();
  const button = timeline.children.find((b) => b.dataset.phaseId === target!.id)!;
  for (const fn of button.listeners.click ?? []) fn();
  const once = serialise(detail);
  expect(detail.children.length).toBe(3);
  expect(detail.textContent).toContain(target!.title);
  expect(timeline.children.filter((b) => b.attributes['aria-pressed'] === 'true')
    .map((b) => b.dataset.phaseId)).toEqual([target!.id]);
  expect(link.href).toContain(target!.id.toLowerCase());
  selectDataPhase(hosts, target!.id);
  expect(serialise(detail)).toBe(once);
});

test('R111: every drawn target row shows its own basis, read back from the row', () => {
  /* basisNotRendered() holds the three source statements; this renders
     every phase and reads the label out of what was drawn, which a source
     check cannot do */
  const { hosts, detail } = phaseHosts();
  renderDataPhaseTimeline(hosts);
  let rows = 0;
  for (const phase of DATA_PHASES) {
    selectDataPhase(hosts, phase.id);
    const metrics = phase.groups.flatMap((grp) => grp.metrics);
    const drawn = all(detail, (n) => n.className === 'data-target-row');
    expect(drawn.length, phase.id).toBe(metrics.length);
    drawn.forEach((row, i) => {
      const metric = metrics[i]!;
      const label = all(row, (n) => n.className.split(/\s+/).includes('data-basis'))[0];
      expect(label?.className, phase.id + ' ' + metric.id).toBe('data-basis ' + metric.basis);
      expect(label?.textContent, phase.id + ' ' + metric.id)
        .toBe(metric.basis === 'framework' ? 'Specified' : 'Derived');
    });
    rows += drawn.length;
  }
  expect(rows).toBeGreaterThan(0);
});

/* R289 [§S18]: the legend above the register names two classes; both are
   drawn somewhere across the phases, and nothing is drawn that the legend
   does not name. Read from the page's markup, so a third class in the
   legend, or a badge the legend does not explain, fails. */
test('R289: the Data legend\'s two classes are the ones the register draws', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(join(fileURLToPath(new URL('../..', import.meta.url)), 'src/pages/data.astro'), 'utf8');
  const legend = /<div[^>]*class="data-target-legend"[\s\S]*?<\/div>/.exec(page)![0];
  const named = [...legend.matchAll(/class="(data-basis [a-z]+)"/g)].map((m) => m[1]).sort();
  expect(named).toEqual(['data-basis derived', 'data-basis framework']);
  const { hosts, detail } = phaseHosts();
  renderDataPhaseTimeline(hosts);
  const drawn = new Set<string>();
  for (const phase of DATA_PHASES) {
    selectDataPhase(hosts, phase.id);
    for (const n of all(detail, (x) => x.className.split(/\s+/).includes('data-basis'))) drawn.add(n.className);
  }
  expect([...drawn].sort()).toEqual(named);
});

/* Review 3 of P22: every phase panel states its own rule-4 denominator. */
test('R299: each Data-tab phase states the denominator its targets apply to', () => {
  const { hosts, detail } = phaseHosts();
  renderDataPhaseTimeline(hosts);
  const said: Record<string, string> = {};
  for (const phase of DATA_PHASES) {
    selectDataPhase(hosts, phase.id);
    const line = all(detail, (n) => n.className === 'data-phase-denominator');
    expect(line.length, phase.id).toBe(1);
    said[phase.id] = line[0]!.textContent || '';
  }
  expect(said.P4).toBe('Applies to representative pilots. Specified values remain controlling where shown.');
  expect(said.P5).toBe('Applies to the scaled network. Specified values remain controlling where shown.');
  expect(said.P8).toBe('Applies to the mature national system. Targets are the controlled maturity values.');
});

test('R299: a row that changes what it measures says so, and only that row', () => {
  /* rendered and read back, for every phase */
  const { hosts, detail } = phaseHosts();
  renderDataPhaseTimeline(hosts);
  let notes = 0;
  for (const phase of DATA_PHASES) {
    selectDataPhase(hosts, phase.id);
    const metrics = phase.groups.flatMap((grp) => grp.metrics);
    const drawn = all(detail, (n) => n.className === 'data-target-row');
    drawn.forEach((row, i) => {
      const metric = metrics[i]!;
      const note = all(row, (n) => n.className === 'data-scope-change');
      if (metric.scopeChange) {
        expect(note.length, phase.id + ' ' + metric.id).toBe(1);
        expect(note[0]!.textContent).toBe(scopeNoteText(metric.scopeChange));
        notes++;
      } else {
        expect(note.length, phase.id + ' ' + metric.id).toBe(0);
      }
    });
  }
  expect(notes).toBe(24);
  /* Review 2 of P22: the loop above computes its expectation with
     scopeNoteText(), the wording under test. One note, pinned as text. */
  selectDataPhase(hosts, 'P1');
  const pinned = all(detail, (n) => n.className === 'data-scope-change').map((n) => n.textContent);
  expect(pinned).toContain('Measures every correction case against the statutory timeframe, ' +
    'rather than prototype cases against a draft one.');
});
