import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { PHASES, DOMAINS, GATES, AGENCIES, WORKSTREAMS } from '../../src/lib/rollout';
import { catalogCode as codeShape } from '../../src/lib/params';
import { QUALITY_DATA } from '../../src/lib/quality';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

test('PHASES: 9 phases P0..P8, first is foundation', () => {
  expect(PHASES).toHaveLength(9);
  expect(PHASES[0].id).toBe('P0');
  expect(PHASES[8].id).toBe('P8');
  expect(PHASES.every((p) => p.work.length > 0 && p.summary && p.evidence)).toBe(true);
});

test('DOMAINS: 13 rows, each name + 5 phase bands', () => {
  expect(DOMAINS).toHaveLength(13);
  expect(DOMAINS.every((d) => d.length === 6)).toBe(true);
});

test('GATES: 8 gates; AGENCIES 3 groups; WORKSTREAMS 13', () => {
  expect(GATES).toHaveLength(8);
  expect(GATES[0].n).toBe('G1');
  expect(AGENCIES).toHaveLength(3);
  expect(WORKSTREAMS).toHaveLength(13);
});

/* P23 [§S17] new finding: the workstream cost note is rendered on the
   Rollout page, and it said "the framework fixes ... and requires" with an
   open item's code in brackets. Golden rule 2 keeps both off every page. */
test('the rendered workstream cost note carries no catalog code and no framework voice', async () => {
  const { WORKSTREAM_COST_NOTE } = await import('../../src/lib/rollout');
  const { catalogCode } = await import('../../src/lib/params');
  expect(WORKSTREAM_COST_NOTE.match(catalogCode('g'))).toBeNull();
  expect(WORKSTREAM_COST_NOTE).not.toMatch(/\bframework\b/i);
  expect(WORKSTREAM_COST_NOTE).toContain('cost-loaded integrated schedule');
});

/* The owner's decision of 2026-10-10: the Rollout workstreams draw plain
   words, not TW-, CP- or MC- codes. The coded fields from Table D6B-15 stay
   as data, and the two drawn fields must name, in the catalog's own words,
   every cost family, transition record and operating cost category those
   codes stand for: family and record names from the catalog, category names
   from the extract's operating-category table. */
function expandCodes(s: string, prefix: 'CP' | 'MC'): string[] {
  const out: string[] = [];
  const shape = prefix === 'CP'
    ? /CP-([A-Z]+)(?:-(\d{3}))?((?:\/(?:CP-[A-Z]+|[A-Z]+|\d{3}))*)/g
    : /MC-(\d{2})((?:\/\d{2})*)/g;
  for (const m of s.matchAll(shape)) {
    if (prefix === 'MC') {
      out.push('MC-' + m[1], ...(m[2] ? m[2].slice(1).split('/').map((n) => 'MC-' + n) : []));
      continue;
    }
    const family = 'CP-' + m[1];
    out.push(m[2] ? family + '-' + m[2] : family);
    for (const more of (m[3] ? m[3].slice(1).split('/') : [])) {
      if (/^\d{3}$/.test(more)) out.push(family + '-' + more);
      else out.push(more.startsWith('CP-') ? more : 'CP-' + more);
    }
  }
  return out;
}

test('owner decision: each workstream\'s drawn fields name every code its data carries, and carry none', () => {
  const families = new Map((QUALITY_DATA.cpFamilies || []).map((f) => [f.id, f.domain]));
  const records = new Map(QUALITY_DATA.parameters.map((p) => [p.id, p.name]));
  const extract = readFileSync(join(REPO_ROOT, 'research/framework_v2_extract.md'), 'utf8');
  const categories = new Map([...extract.matchAll(/^\| (MC-\d{2}) \| ([^|]+?) \|/gm)].map((m) => [m[1], m[2]]));
  const faults: string[] = [];
  let checked = 0;
  let plainExits = 0;
  for (const w of WORKSTREAMS) {
    for (const code of expandCodes(w.cpAllocation, 'CP')) {
      const name = records.get(code) || families.get(code);
      checked += 1;
      if (!name) faults.push(w.id + ': ' + code + ' has no name in the catalog');
      else if (w.families.toLowerCase().indexOf(name.toLowerCase()) < 0) faults.push(w.id + ': families omits "' + name + '" (' + code + ')');
    }
    for (const code of expandCodes(w.exit, 'MC')) {
      const name = categories.get(code);
      checked += 1;
      if (!name) faults.push(w.id + ': ' + code + ' has no row in the extract');
      else if (w.transfersTo.toLowerCase().indexOf(name.toLowerCase()) < 0) faults.push(w.id + ': transfersTo omits "' + name + '" (' + code + ')');
    }
    if (codeShape().test(w.families + ' ' + w.transfersTo)) faults.push(w.id + ': a code in a drawn field');
    /* an exit with no category code is drawn as written (review of the
       owner batch: these five were not checked at all) */
    if (!expandCodes(w.exit, 'MC').length) {
      checked += 1;
      plainExits += 1;
      if (w.transfersTo !== w.exit[0].toLowerCase() + w.exit.slice(1)) faults.push(w.id + ': transfersTo is not its exit');
    }
  }
  expect(faults).toEqual([]);
  expect(checked).toBeGreaterThanOrEqual(30);
  /* the no-code branch ran for every exit that names no category, counted
     a second way (second review: the total alone would not notice it stop) */
  expect(plainExits).toBe(WORKSTREAMS.filter((w) => w.exit.indexOf('MC-') < 0).length);
  expect(plainExits).toBeGreaterThan(0);
});

test('owner decision: the code reader expands the table\'s shorthand', () => {
  expect(expandCodes('CP-TRN-005/006', 'CP')).toEqual(['CP-TRN-005', 'CP-TRN-006']);
  expect(expandCodes('CP-RX/CP-DX capital/startup', 'CP')).toEqual(['CP-RX', 'CP-DX']);
  expect(expandCodes('CP-GOV/IT; CP-TRN-018/020', 'CP')).toEqual(['CP-GOV', 'CP-IT', 'CP-TRN-018', 'CP-TRN-020']);
  expect(expandCodes('CP-UNIT capital/startup; CP-TRN where uniquely transitional', 'CP')).toEqual(['CP-UNIT', 'CP-TRN']);
  expect(expandCodes('MC-05/06 mature production', 'MC')).toEqual(['MC-05', 'MC-06']);
});
