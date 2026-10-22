import { afterAll, expect, test } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CROSSWALK_DOC, crosswalkCountDrift, crosswalkDomainDrift, crosswalkDomainTitles
} from '../../src/lib/manifest-check';
import {
  DOMAINS,
  ENABLING_ACT_GROUPS,
  ENABLING_ACT_TITLE_COUNT,
  distinctDispositions,
  numberedActGroups,
  sharedDispositions,
  sharedDispositionSentence
} from '../../src/lib/legislation';
import { preserveBadgeFaults } from '../../src/lib/legislation-check';

test('DOMAINS: 13 legal domains, first is Coverage', () => {
  expect(DOMAINS).toHaveLength(13);
  expect(DOMAINS[0].short).toBe('Coverage');
  expect(DOMAINS[0].actions.length).toBeGreaterThan(0);
  expect(DOMAINS[0].sources[0]).toHaveLength(2); // [label, url]
  expect(DOMAINS.every((d) => d.laws.length > 0 && d.change && d.preserve && d.method && d.phase)).toBe(true);
});

/* P19 [S13]: this module's 54-key acronym map is gone. See
   tests/lib/acronym-layer.test.ts. */

/* R297 [§S12] — the enabling act's numbering is derived from the group sizes
   rather than typed into five `start` attributes and nineteen Roman numerals.
   These pin the values the derivation replaced, which is what makes it a
   confirmation rather than a swap: if a derived start stops matching, the
   literal it replaced was wrong and the row needs revisiting. */

test('R297: the derived starts reproduce the five values they replaced', () => {
  expect(numberedActGroups().map((g) => g.start)).toEqual([1, 5, 11, 13, 17]);
  expect(numberedActGroups().map((g) => g.titles.length)).toEqual([4, 6, 2, 4, 3]);
});

test('R297: the title count is nineteen and the numbering is contiguous', () => {
  const all = numberedActGroups().flatMap((g) => g.titles);
  expect(ENABLING_ACT_TITLE_COUNT).toBe(19); // BY9 verified this by hand
  expect(all.length).toBe(ENABLING_ACT_TITLE_COUNT);
  expect(all.map((t) => t.n)).toEqual(all.map((_, i) => i + 1));
  expect(all[0].roman).toBe('I');
  expect(all[18].roman).toBe('XIX');
});

test('R297: a twentieth title fails rather than rendering without a numeral', () => {
  /* The Roman table is written out, so growing the act past it is the one
     way this derivation can go wrong quietly. It does not go quietly. */
  ENABLING_ACT_GROUPS[4].titles.push('A title with no numeral');
  try {
    expect(() => numberedActGroups()).toThrow(/no Roman numeral for act title 20/);
  } finally {
    ENABLING_ACT_GROUPS[4].titles.pop();
  }
  expect(numberedActGroups().flatMap((g) => g.titles).length).toBe(19);
});

/* R98 [§S17] (§AJ7): Domain 5 was "...and production" in the code and
   "...and public production" in the crosswalk; Domain 6 lost "program". */

const R98_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const r98Roots: string[] = [];
afterAll(() => r98Roots.forEach((r) => rmSync(r, { recursive: true, force: true })));
function crosswalkCopy(edit: (t: string) => string): string {
  const root = mkdtempSync(join(tmpdir(), 'nha-r98-'));
  r98Roots.push(root);
  mkdirSync(join(root, 'research'), { recursive: true });
  writeFileSync(join(root, CROSSWALK_DOC), edit(readFileSync(join(R98_ROOT, CROSSWALK_DOC), 'utf8')), 'utf8');
  return root;
}

test('R98: every domain title in legislation.ts appears verbatim in legislation_crosswalk.md', () => {
  const listed = crosswalkDomainTitles();
  for (const d of DOMAINS) expect(listed).toContain(d.title);
  expect(crosswalkDomainDrift()).toEqual({ compared: 13, faults: [] });
});

test('R98: the old Domain 5 title is reported, by number', () => {
  const root = crosswalkCopy((t) => t.replace('5. Drugs, devices, diagnostics, and public production.',
    '5. Drugs, devices, diagnostics, and production.'));
  expect(crosswalkDomainDrift(root).faults).toEqual([
    'domain 5: legislation.ts "Drugs, devices, diagnostics, and public production", ' +
    CROSSWALK_DOC + ' "Drugs, devices, diagnostics, and production"'
  ]);
});

test('R98: a dropped item, and a missing list, are reported rather than passed', () => {
  const short = crosswalkDomainDrift(crosswalkCopy((t) => t.replace('13. Competition, corporate structure, and research.\n', '')));
  expect(short.compared).toBe(12);
  expect(short.faults).toEqual(['domain 13: legislation.ts "Competition, corporate structure, and research", ' +
    CROSSWALK_DOC + ' "none"']);
  const gone = crosswalkDomainDrift(crosswalkCopy((t) => t.replace('## Major-law-family crosswalk', '## Domains')));
  expect(gone.faults[0]).toBe(CROSSWALK_DOC + ' lists no numbered domains under its crosswalk heading');
});

/* R80 [§S17]: the crosswalk's prose states "thirteen domains" and a
   "19-title enabling act"; both are held to the collections. */
test('R80: legislation domain and title counts match the crosswalk', () => {
  expect(crosswalkCountDrift()).toEqual({ stated: 2, faults: [] });
  expect(crosswalkCountDrift(undefined, 14, 19).faults).toEqual([CROSSWALK_DOC + ' says thirteen domains; legislation.ts has 14']);
  expect(crosswalkCountDrift(undefined, 13, 20).faults).toEqual([CROSSWALK_DOC + ' says a 19-title act; legislation.ts has 20']);
});

test('R80: a crosswalk that stops stating a count is reported', () => {
  const root = crosswalkCopy((t) => t.replace('19-title enabling\nact architecture', 'enabling act architecture')
    .replace('into thirteen domains', 'into domains'));
  expect(crosswalkCountDrift(root)).toEqual({ stated: 0, faults: [
    CROSSWALK_DOC + ' no longer states how many domains it groups the law into',
    CROSSWALK_DOC + ' no longer states how many titles the enabling act has'
  ] });
});

/* R96 [§S17] (§AJ4): Coverage and Employer plans said what they preserve
   and carried no Preserve badge. */
test('R96: every domain whose preserve field is non-empty carries the Preserve badge, or is a declared exception', () => {
  expect(preserveBadgeFaults()).toEqual({ read: 13, faults: [] });
  expect(DOMAINS.filter((d) => d.actions.includes('Preserve'))).toHaveLength(13);
});

test('R96: the two domains as they were are reported, and an exception must earn its place', () => {
  const was = DOMAINS.map((d, i) => i === 0 || i === 2
    ? { ...d, actions: d.actions.filter((a) => a !== 'Preserve') } : d);
  expect(preserveBadgeFaults(was).faults).toEqual([
    'Coverage and public programs: its preserve field is non-empty and it carries no Preserve badge',
    'Employer insurance and labor: its preserve field is non-empty and it carries no Preserve badge'
  ]);
  expect(preserveBadgeFaults(was, {
    'Coverage and public programs': 'a reason', 'Employer insurance and labor': ''
  }).faults).toEqual([
    'Employer insurance and labor: its preserve field is non-empty and it carries no Preserve badge',
    'the Preserve exception for "Employer insurance and labor" states no reason'
  ]);
  expect(preserveBadgeFaults(DOMAINS, { 'Coverage and public programs': 'stale', 'No such domain': 'x' }).faults).toEqual([
    'the Preserve exception for "Coverage and public programs" is stale: it carries the badge',
    'the Preserve exception for "No such domain" names no domain'
  ]);
  expect(preserveBadgeFaults(DOMAINS.map((d) => ({ ...d, preserve: ' ' }))).faults)
    .toEqual(['no domain states what it preserves, so nothing was checked']);
});

/* The owner's decision of 2026-10-10: the dispositions every domain shares
   are stated once, and each domain's badges show the rest. Read from the
   data, so a domain that stops sharing one brings its badge back. */
test('owner decision: the shared dispositions are read from the data, and each domain draws the rest', () => {
  expect(sharedDispositions()).toEqual(['Preserve', 'Amend']);
  expect(sharedDispositionSentence()).toBe('Every domain carries Preserve (stays operative) and Amend (changes existing ' +
    'text), so they are stated here once; each domain shows the dispositions that set it apart.');
  for (const d of DOMAINS) {
    expect(distinctDispositions(d), d.title).toEqual(d.actions.filter((a) => a !== 'Preserve' && a !== 'Amend'));
    expect(distinctDispositions(d).length, d.title).toBeGreaterThan(0);
  }
  /* a domain that drops Amend takes it out of the shared set, and every
     other domain draws its Amend badge again */
  const without = DOMAINS.map((d, i) => (i === 0 ? { ...d, actions: d.actions.filter((a) => a !== 'Amend') } : d));
  expect(sharedDispositions(without)).toEqual(['Preserve']);
  expect(distinctDispositions(DOMAINS[1], sharedDispositions(without))).toContain('Amend');
  expect(sharedDispositionSentence(['Preserve'])).toMatch(/^Every domain carries Preserve \(stays operative\), so it is stated/);
  expect(sharedDispositions([])).toEqual([]);
  expect(sharedDispositionSentence([])).toBe('');
});
