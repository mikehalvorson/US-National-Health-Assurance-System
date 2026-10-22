import { afterAll, beforeAll, expect, test } from 'vitest';
import {
  administrationsFaults, administrationsPhrase, DEPARTMENT_ADMINISTRATIONS, GOV_GROUPS,
  LEADER_BASIS_LABELS, leaderBasis, leaderBasisCounts
} from '../../src/lib/gov';
import { distinctDispositions, DOMAINS } from '../../src/lib/legislation';
import { LAYERS } from '../../src/lib/hardening';

/* =========================================================================
 * R161 [§S17] (§AV1): "every chapter's rendered entity count equals its data
 * source's length". Governance, Legislation and Executive Hardening are the
 * three chapters the audit found shipping empty mount points and building
 * everything in a client script (§AJ1, §AU6, §AV1), so their counts were
 * checked by nothing that ran the script. This runs each real client against
 * a minimal document - enough for what the three render at load - and counts
 * what they draw.
 *
 * It also carries R94's first test, "rendered domain count equals
 * DOMAINS.length", which only the client can answer: the domain buttons are
 * drawn there.
 * ========================================================================= */

class StubNode {
  tagName: string;
  className = '';
  id = '';
  own = '';
  type = ''; href = ''; target = ''; rel = '';
  open = false;
  children: StubNode[] = [];
  attributes: Record<string, string> = {};
  dataset: Record<string, string> = {};
  style: Record<string, string> = {};
  listeners: Record<string, number> = {};
  constructor(tag: string) { this.tagName = tag.toUpperCase(); }
  appendChild(child: StubNode): StubNode { this.children.push(child); return child; }
  append(...nodes: StubNode[]): void { this.children.push(...nodes); }
  setAttribute(name: string, value: string): void { this.attributes[name] = String(value); }
  getAttribute(name: string): string | null { return this.attributes[name] ?? null; }
  addEventListener(type: string): void { this.listeners[type] = (this.listeners[type] || 0) + 1; }
  querySelectorAll(tag: string): StubNode[] { return all(this, (n) => n.tagName === tag.toUpperCase()); }
  get textContent(): string { return this.own + this.children.map((c) => c.textContent).join(''); }
  set textContent(value: string) { this.own = value; this.children = []; }
}

function all(n: StubNode, pred: (x: StubNode) => boolean): StubNode[] {
  const out: StubNode[] = [];
  for (const c of n.children) { if (pred(c)) out.push(c); out.push(...all(c, pred)); }
  return out;
}

const hosts: Record<string, StubNode> = {};
for (const id of ['gov-summary', 'gov-groups', 'legislation-law-list', 'legislation-law-detail',
  'hardening-stepper', 'hardening-detail']) {
  hosts[id] = new StubNode('div');
  hosts[id].id = id;
}

const stubDocument = {
  readyState: 'complete',
  addEventListener(): void { /* the page-load listener; the direct call is what runs here */ },
  getElementById(id: string): StubNode | null { return hosts[id] ?? null; },
  createElement(tag: string): StubNode { return new StubNode(tag); },
  createElementNS(_ns: string, tag: string): StubNode { return new StubNode(tag); },
  createTextNode(text: string): StubNode { const t = new StubNode('#text'); t.own = text; return t; }
};

const saved = (globalThis as { document?: unknown }).document;
beforeAll(async () => {
  (globalThis as { document?: unknown }).document = stubDocument;
  await import('../../src/scripts/gov-client');
  await import('../../src/scripts/legislation-client');
  await import('../../src/scripts/hardening-client');
});
afterAll(() => { (globalThis as { document?: unknown }).document = saved; });

/* HTML nodes take a className; the org diagram's SVG nodes take a class
   attribute through chart-util's el() */
const classed = (root: StubNode, cls: string): StubNode[] =>
  all(root, (n) => (n.className + ' ' + (n.attributes['class'] || '')).split(' ').indexOf(cls) >= 0);

test('R161: the Governance chapter draws one body per group and one entity per member', () => {
  const members = GOV_GROUPS.reduce((n, g) => n + g.members.length, 0);
  const sections = hosts['gov-groups'].children;
  expect(sections).toHaveLength(GOV_GROUPS.length);
  expect(classed(hosts['gov-groups'], 'gov-card')).toHaveLength(members);
  expect(classed(hosts['gov-groups'], 'org-box')).toHaveLength(members);
  /* each body's summary line counts its own cards */
  sections.forEach((s, i) => {
    const cards = classed(s, 'gov-card').length;
    expect(cards).toBe(GOV_GROUPS[i].members.length);
    expect(all(s, (n) => n.tagName === 'SUMMARY')[0].textContent).toContain('(' + cards + ' entities)');
  });
  /* and the tiles say what was drawn */
  const tiles = classed(hosts['gov-summary'], 'tile').map((t) => t.textContent);
  expect(tiles[0]).toContain('Governing bodies' + sections.length);
  expect(tiles[1]).toContain('Entities in total' + members);
  expect(members).toBe(84);
});

/* R289 [§S18]: the Specified/Derived pattern was ported to Governance in P10
   (R164): each entity card says whose title its leader holds, as text. The
   port had no test that read the drawn badges back; the Data tab's has had
   one since P18 (R111). Each card's badge, in the order the data gives, with
   both labels drawn, so the page does not state a distinction it fails to
   render. */
test('R289: every Governance card draws the basis badge its leader\'s title has', () => {
  const cards = classed(hosts['gov-groups'], 'gov-card');
  const members = GOV_GROUPS.flatMap((g) => g.members);
  expect(cards).toHaveLength(members.length);
  const drawn = cards.map((card) => all(card, (n) => n.className.split(' ')[0] === 'data-basis'));
  expect(drawn.map((b) => b.length)).toEqual(members.map(() => 1));
  drawn.forEach((b, i) => {
    const basis = leaderBasis(members[i]!.code);
    expect(b[0]!.textContent, members[i]!.code).toBe(LEADER_BASIS_LABELS[basis]);
    expect(b[0]!.className, members[i]!.code).toBe(basis === 'design' ? 'data-basis derived' : 'data-basis');
  });
  /* both labels drawn, and counted as the data counts them */
  const labels = drawn.map((b) => b[0]!.textContent);
  const counts = leaderBasisCounts();
  expect(labels.filter((l) => l === LEADER_BASIS_LABELS.existing)).toHaveLength(counts.existing);
  expect(labels.filter((l) => l === LEADER_BASIS_LABELS.design)).toHaveLength(counts.design);
  expect(counts.existing * counts.design).toBeGreaterThan(0);
});

test('R161: the governing-bodies tile counts the department\'s administrations from the list', () => {
  const tile = classed(hosts['gov-summary'], 'tile')[0].textContent;
  expect(tile).toContain('the operating department and its ' + administrationsPhrase() + ',');
  expect(tile).not.toContain('five administrations');
  expect(administrationsPhrase()).toBe('four administrations');
  expect(administrationsFaults()).toEqual([]);
  /* the four are groups 3 to 6 */
  expect(DEPARTMENT_ADMINISTRATIONS).toEqual(GOV_GROUPS.slice(2, 6).map((g) => g.id));
  expect(administrationsFaults(['meds', 'meds', 'nope'])).toEqual([
    'DEPARTMENT_ADMINISTRATIONS names "nope", which is no governing body',
    'DEPARTMENT_ADMINISTRATIONS names a body twice'
  ]);
  expect(administrationsFaults([])).toEqual(['DEPARTMENT_ADMINISTRATIONS is empty']);
});

/* Review of P23: the first version of the test above looked only for "five
   administrations", and the Office of the Secretary's card, two screens
   down, said "Six administrations". Any count of administrations the chapter
   draws, in words or digits, must be the one the list gives. */
test('review of P23: every count of administrations the Governance chapter draws is the declared one', () => {
  const drawn = hosts['gov-summary'].textContent + ' ' + hosts['gov-groups'].textContent;
  const counts = [...drawn.matchAll(/\b(no|one|two|three|four|five|six|seven|eight|nine|ten|\d+) administrations?\b/gi)]
    .map((m) => m[0].toLowerCase());
  expect(counts.length).toBeGreaterThanOrEqual(2);
  expect([...new Set(counts)]).toEqual([administrationsPhrase()]);
});

test('R94/R161: the Legislation chapter draws one button per domain and the first domain\'s detail', () => {
  expect(hosts['legislation-law-list'].querySelectorAll('button')).toHaveLength(DOMAINS.length);
  expect(DOMAINS.length).toBe(13);
  const detail = hosts['legislation-law-detail'];
  /* the owner's 2026-10-10 decision: the shared dispositions are stated once
     on the page, so a domain draws only its own */
  expect(classed(detail, 'legislation-action').map((n) => n.textContent)).toEqual(distinctDispositions(DOMAINS[0]));
  expect(classed(detail, 'legislation-action').map((n) => n.textContent)).not.toContain('Preserve');
  expect(all(detail, (n) => n.tagName === 'A')).toHaveLength(DOMAINS[0].sources.length);
});

test('R161: the Executive Hardening chapter draws one step per layer', () => {
  expect(hosts['hardening-stepper'].querySelectorAll('button')).toHaveLength(LAYERS.length);
});
