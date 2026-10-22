import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  loadFailureReason, UNITS_FILES, UNITS_SURFACES, unitsFailures, unitsFileProblem, unitsLoadPlan,
  type UnitsFailures, type UnitsFile, type UnitsSurface
} from '../../src/lib/units-load';
import { maskComments } from '../../src/lib/manifest-check';

/* =========================================================================
 * R75 [§S15]: a failed fetch is visibly distinguishable from an empty dataset.
 *
 * Measured before this existed, failing each file in headless Chrome by
 * answering its request with a 404 through the DevTools protocol:
 *   hospital-regions.json - the region map said so; the region select (0
 *     options), the region detail and the score chart stayed empty with no
 *     explanation, and the region integrity line still read "Map integrity is
 *     checked when the map draws". That is the row as filed.
 *   counties.json - the county map said so; the unit verdict tiles, the unit
 *     type cards, the integrity line and the slider readout were all blank,
 *     and the slider and the five filter buttons looked live and carried no
 *     listener at all. The row never named this one.
 *   us-states.json - both maps said so and everything else drew. Handled.
 * ========================================================================= */

const PAGE = readFileSync(fileURLToPath(new URL('../../src/pages/units.astro', import.meta.url)), 'utf8');

/* every combination of failed files, the empty one first */
const COMBOS: UnitsFile[][] = [[]];
for (const f of UNITS_FILES) {
  for (const c of COMBOS.slice()) COMBOS.push([...c, f]);
}

test('there are eight combinations and the files are the three the page fetches', () => {
  expect(COMBOS.length).toBe(8);
  expect([...UNITS_FILES]).toEqual(['counties.json', 'us-states.json', 'hospital-regions.json']);
});

test('every surface the plan names is an element on the page', () => {
  /* a surface renamed on the page and not here would stop being told */
  for (const s of UNITS_SURFACES) expect(PAGE, s.id).toContain('id="' + s.id + '"');
});

test("each surface's kind fits the element it names", () => {
  /* a note paragraph written into a <p> or a <span> is invalid markup, and a
     caption only exists on a table */
  const fits: Record<string, string[]> = {
    block: ['div'], inline: ['p', 'span'], select: ['select'], table: ['table'], control: ['input', 'span']
  };
  for (const s of UNITS_SURFACES) {
    const tag = new RegExp('<([a-z]+)\\b[^>]*\\bid="' + s.id + '"').exec(PAGE);
    expect(tag, s.id).toBeTruthy();
    expect(fits[s.kind], s.id + ' is a <' + (tag?.[1] ?? '') + '>').toContain(tag?.[1]);
  }
});

test('every element the client looks up is one the plan covers', () => {
  /* The other direction: an element the client starts filling from the data
     and the plan does not list would go back to failing silently. Comments
     are masked so a sentence about an element is not a lookup of it. */
  const client = maskComments(readFileSync(
    fileURLToPath(new URL('../../src/scripts/units-client.ts', import.meta.url)), 'utf8'));
  const looked = new Set<string>();
  /* an id selector needs a hyphen, so a colour such as '#e8e8e8' is not one */
  for (const m of client.matchAll(/\$\('([a-z0-9-]+)'\)|'#([a-z]+-[a-z0-9-]+)[ '.]/g)) looked.add(m[1] ?? m[2] ?? '');
  expect(looked.size).toBeGreaterThanOrEqual(12);
  const listed = new Set<string>(UNITS_SURFACES.map((s) => s.id));
  expect([...looked].filter((id) => !listed.has(id))).toEqual([]);
  expect([...listed].filter((id) => !looked.has(id))).toEqual([]);
});

test('with everything loaded, nothing is marked unavailable', () => {
  const plan = unitsLoadPlan({});
  expect(plan.messages).toEqual({});
  expect(plan.disabled).toEqual([]);
  for (const s of UNITS_SURFACES) expect(plan.can(s.id), s.id).toBe(true);
});

test('every surface that needs a failed file says so, in every combination', () => {
  for (const failed of COMBOS) {
    const failures: UnitsFailures = {};
    for (const f of failed) failures[f] = { kind: 'not loaded', reason: '404' };
    const plan = unitsLoadPlan(failures);
    for (const s of UNITS_SURFACES) {
      const missing = s.needs.filter((f) => failed.includes(f));
      const label = failed.join('+') + ' / ' + s.id;
      expect(plan.can(s.id), label).toBe(missing.length === 0);
      if (!missing.length) {
        expect(plan.messages[s.id], label).toBeUndefined();
        expect(plan.disabled, label).not.toContain(s.id);
      } else if (s.kind === 'control') {
        /* a control carries no text of its own: it is disabled, and the
           surface beside it that it drives carries the message */
        expect(plan.disabled, label).toContain(s.id);
      } else {
        const m = plan.messages[s.id] ?? '';
        for (const f of missing) expect(m, label).toContain(f + ' did not load (404)');
        expect(m, label).not.toMatch(/—/);
      }
    }
  }
});

test('every control is disabled only alongside a surface that explains why', () => {
  for (const failed of COMBOS.slice(1)) {
    const failures: UnitsFailures = {};
    for (const f of failed) failures[f] = { kind: 'not loaded', reason: 'network error' };
    const plan = unitsLoadPlan(failures);
    for (const id of plan.disabled) {
      const control: UnitsSurface | undefined = UNITS_SURFACES.find((s) => s.id === id);
      expect(control?.explainedBy, id).toBeDefined();
      expect(plan.messages[control?.explainedBy ?? ''], id + ' in ' + failed.join('+')).toBeDefined();
    }
  }
});

test('which elements each single failure blocks, as measured before the plan existed', () => {
  /* Review of P21: the combination test above works out "missing" with the
     same needs.filter the plan uses, so a wrong needs table passes it. These
     sets are written out independently, from what the page drew and did not
     draw when each file was failed in headless Chrome before R75 (the county
     network drew without us-states.json; the region scores drew without it
     too). The union rule for combinations is what the plan adds. */
  const measured: Record<UnitsFile, string[]> = {
    'counties.json': ['unit-verdict', 'unit-type-cards', 'units-vpc-val', 'units-vpc', 'units-integrity',
      'units-state-table', 'units-county-table', 'units-map', 'units-filter'],
    'us-states.json': ['units-map', 'units-filter', 'hospital-region-map', 'hospital-region-integrity'],
    'hospital-regions.json': ['hospital-region-map', 'hospital-region-integrity', 'hospital-region-select',
      'hospital-region-detail', 'hospital-region-scores']
  };
  for (const file of UNITS_FILES) {
    const failures: UnitsFailures = {};
    failures[file] = { kind: 'not loaded', reason: '404' };
    const plan = unitsLoadPlan(failures);
    const blocked = UNITS_SURFACES.filter((s) => !plan.can(s.id)).map((s) => s.id).sort();
    expect(blocked, file).toEqual([...measured[file]].sort());
  }
});

test('the plan refuses an id it does not know, rather than calling it drawable', () => {
  // @ts-expect-error - the id type rejects this at compile time as well
  expect(() => unitsLoadPlan({}).can('units-mapp')).toThrow(/units-mapp/);
});

test('a file that arrives in a shape the page cannot read is a failure, not an empty dataset', () => {
  /* Review of P21: only the county file was checked, so a states or regions
     file that arrived as null passed as loaded and the renderer threw before
     any message was written. */
  const good = {
    'counties.json': { meta: {}, counties: [] },
    'us-states.json': { meta: {}, features: [] },
    'hospital-regions.json': {
      regions: [],
      model: { state_names: {}, state_adjacency: {}, tested_region_counts: [], selected_region_count: 13 }
    }
  };
  const settle = (over: Partial<Record<UnitsFile, unknown>>): PromiseSettledResult<unknown>[] =>
    UNITS_FILES.map((f) => ({ status: 'fulfilled', value: f in over ? over[f] : good[f] }));
  const unreadable = (reason: string) => ({ kind: 'unreadable', reason });
  expect(unitsFailures(settle({}))).toEqual({});
  expect(unitsFailures(settle({ 'us-states.json': null })))
    .toEqual({ 'us-states.json': unreadable('the file holds no data') });
  expect(unitsFailures(settle({ 'us-states.json': { meta: {} } })))
    .toEqual({ 'us-states.json': unreadable('the file holds no state outlines') });
  expect(unitsFailures(settle({ 'counties.json': [] })))
    .toEqual({ 'counties.json': unreadable('the file holds no county list') });
  /* review 2 of P21: the second version checked two of the five region
     fields, and a file without state_names threw in the map renderer */
  expect(unitsFailures(settle({ 'hospital-regions.json': { regions: [], model: { tested_region_counts: [] } } })))
    .toEqual({ 'hospital-regions.json': unreadable('the file holds no state name table, no state adjacency ' +
      'table, no selected region count') });
  expect(unitsFailures(settle({ 'hospital-regions.json': { regions: [], model: {
    state_names: {}, state_adjacency: {}, selected_region_count: 13 } } })))
    .toEqual({ 'hospital-regions.json': unreadable('the file holds no scored region counts') });
  const rejected: PromiseSettledResult<unknown>[] = settle({});
  rejected[1] = { status: 'rejected', reason: new Error('us-states.json 404') };
  expect(unitsFailures(rejected)).toEqual({ 'us-states.json': { kind: 'not loaded', reason: '404' } });
  expect(unitsFileProblem('us-states.json', { features: 'x' })).toBe('the file holds no state outlines');
});

test('a file that arrived is never said not to have loaded', () => {
  /* Review 2 of P21: an unreadable file was reported as "did not load". */
  const failures: UnitsFailures = { 'us-states.json': { kind: 'unreadable', reason: 'the file holds no state outlines' } };
  const plan = unitsLoadPlan(failures);
  expect(plan.messages['units-map']).toBe('The county map could not be shown: us-states.json arrived but could ' +
    'not be read (the file holds no state outlines).');
  expect(Object.values(plan.messages).filter((m) => m.includes('did not load'))).toEqual([]);
});

test('the real data files have every field the shape check requires', () => {
  /* A check that rejected the shipped files would blank the page; this reads
     them from public/data. */
  for (const file of UNITS_FILES) {
    const value: unknown = JSON.parse(readFileSync(
      fileURLToPath(new URL('../../public/data/' + file, import.meta.url)), 'utf8'));
    expect(unitsFileProblem(file, value), file).toBeNull();
  }
});

test('the reason a fetch failed is reduced to what a reader can use', () => {
  expect(loadFailureReason('counties.json', new Error('counties.json 404'))).toBe('404');
  expect(loadFailureReason('us-states.json', new TypeError('Failed to fetch'))).toBe('Failed to fetch');
  expect(loadFailureReason('hospital-regions.json', 'timeout')).toBe('timeout');
  expect(loadFailureReason('counties.json', undefined)).toBe('unknown error');
});
