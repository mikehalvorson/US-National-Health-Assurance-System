import { afterAll, beforeAll, expect, test } from 'vitest';

/* =========================================================================
 * R102 [§S17] (§AJ11): "decorating the same subtree twice produces no
 * nested abbr elements".
 *
 * The row was filed against the retired legislation.js, which decorated its
 * detail pane and then the whole view that contained it. P19 deleted every
 * per-tab decorator, so that double pass is gone. The guard the row asked to
 * pin is not: the one decorator left re-sweeps all of <main> after every
 * mutation, including text it wrapped on the previous sweep, and only
 * `abbr` in its SKIP selector stops a second <abbr> inside the first. This
 * runs the real decorator twice over one subtree in a minimal document.
 * ========================================================================= */

type Kind = 'element' | 'text' | 'fragment';

class StubNode {
  kind: Kind;
  tagName: string;
  nodeValue: string | null;
  parentNode: StubNode | null = null;
  childNodes: StubNode[] = [];
  attributes: Record<string, string> = {};
  className = '';
  title = '';
  constructor(kind: Kind, tag = '', value: string | null = null) {
    this.kind = kind; this.tagName = tag.toUpperCase(); this.nodeValue = value;
  }
  get parentElement(): StubNode | null { return this.parentNode && this.parentNode.kind === 'element' ? this.parentNode : null; }
  appendChild(c: StubNode): StubNode {
    if (c.kind === 'fragment') { [...c.childNodes].forEach((x) => this.appendChild(x)); return c; }
    c.parentNode = this; this.childNodes.push(c); return c;
  }
  replaceChild(next: StubNode, old: StubNode): void {
    const i = this.childNodes.indexOf(old);
    const incoming = next.kind === 'fragment' ? [...next.childNodes] : [next];
    incoming.forEach((x) => { x.parentNode = this; });
    this.childNodes.splice(i, 1, ...incoming);
    old.parentNode = null;
  }
  setAttribute(k: string, v: string): void { this.attributes[k] = v; }
  set textContent(v: string) { this.childNodes = []; this.appendChild(new StubNode('text', '', v)); }
  get textContent(): string { return this.kind === 'text' ? (this.nodeValue || '') : this.childNodes.map((c) => c.textContent).join(''); }
  /* enough of Element.closest for a comma list of tag names and [attr] */
  closest(selector: string): StubNode | null {
    const parts = selector.split(',').map((s) => s.trim());
    for (let n: StubNode | null = this; n; n = n.parentElement) {
      if (parts.some((p) => p.startsWith('[') ? p.slice(1, -1) in n!.attributes : n!.tagName === p.toUpperCase())) return n;
    }
    return null;
  }
}

function texts(root: StubNode): StubNode[] {
  const out: StubNode[] = [];
  for (const c of root.childNodes) { if (c.kind === 'text') out.push(c); else out.push(...texts(c)); }
  return out;
}
function elements(root: StubNode, tag: string): StubNode[] {
  const out: StubNode[] = [];
  for (const c of root.childNodes) {
    if (c.kind === 'element' && c.tagName === tag) out.push(c);
    out.push(...elements(c, tag));
  }
  return out;
}

const main = new StubNode('element', 'main');
const g = globalThis as Record<string, unknown>;
const saved = { document: g.document, NodeFilter: g.NodeFilter, MutationObserver: g.MutationObserver };
let decorate: (root: unknown) => void;

beforeAll(async () => {
  g.NodeFilter = { SHOW_TEXT: 4 };
  g.MutationObserver = class { observe(): void {} disconnect(): void {} };
  g.document = {
    readyState: 'loading', /* the module's own start() waits; the test drives it */
    addEventListener(): void {},
    querySelector: (sel: string) => (sel === 'main' ? main : null),
    createTreeWalker(root: StubNode) {
      const list = texts(root);
      let i = -1;
      return { get currentNode() { return list[i]; }, nextNode: () => (++i < list.length ? list[i] : null) };
    },
    createDocumentFragment: () => new StubNode('fragment'),
    createTextNode: (v: string) => new StubNode('text', '', v),
    createElement: (tag: string) => new StubNode('element', tag)
  };
  ({ decorate } = await import('../../src/scripts/acronyms-client') as unknown as { decorate: (root: unknown) => void });
});
afterAll(() => { Object.assign(g, saved); });

function page(): StubNode {
  const p = new StubNode('element', 'p');
  p.appendChild(new StubNode('text', '', 'The FTC and CMS publish data; the FTC acts.'));
  main.childNodes = [];
  main.appendChild(p);
  return p;
}

test('R102: decorating the same subtree twice produces no nested abbr elements', () => {
  const p = page();
  decorate(main);
  const once = elements(main, 'ABBR').length;
  expect(once).toBe(3);
  decorate(main);
  decorate(p);
  const abbrs = elements(main, 'ABBR');
  expect(abbrs).toHaveLength(once);
  expect(abbrs.filter((a) => elements(a, 'ABBR').length > 0)).toEqual([]);
  expect(main.textContent).toBe('The FTC and CMS publish data; the FTC acts.');
});

test('R102: text under an opted-out container is left alone', () => {
  const p = page();
  p.setAttribute('data-no-acronyms', '');
  decorate(main);
  expect(elements(main, 'ABBR')).toHaveLength(0);
});
