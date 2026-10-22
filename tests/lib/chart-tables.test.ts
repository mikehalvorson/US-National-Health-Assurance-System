import { expect, test } from 'vitest';
import { revenueNeedTableData, topRateTableData } from '../../src/lib/tax-charts';
import { countyUnitsTableData } from '../../src/lib/units';
import { compute, defaultSettings } from '../../src/lib/taxmodel';
import { PROGRAMS, TOP_RATE_HISTORY, PRESIDENTS } from '../../src/lib/taxparams';
import type { ComputeResult } from '../../src/lib/tax-types';

/* =========================================================================
 * P20's "Done when" says no data series is reachable only by hover. Review 8
 * recorded four sites that were, and review 9 measured the premise: one of the
 * four, the health cost path, already had a table under it, so the log and
 * the test that pinned it were wrong about it. The other three - the revenue
 * chart, the top-rate history and the county dots - get tables here, built
 * from the same series their charts draw.
 * ========================================================================= */

/* ---- revenue vs need ---------------------------------------------------- */

function syntheticComp(): ComputeResult {
  return {
    years: [2027, 2028],
    byInstrument: {
      payroll: [400, 420],
      capgains: [10, 12],   /* folds into "Other levies" */
      estate: [5, 6],       /* folds into "Other levies" */
      wealth: [0, 0]        /* never raises anything: no column */
    },
    totalRev: [415, 0],
    need: [500, 0],
    /* Deliberately NOT totalRev / need: 415 / 500 is 83%, and nothing over
       nothing has no quotient. A table that divided for itself would print
       "83%" and "n/a"; one that reads the model prints these. */
    coverage: [0.5, 1],
    overlapDeduction: [0, 0],
    supersededRev: [415, 0],
    supersededModelRev: [0, 0]
  };
}

test('the revenue table folds levies the way the stacked chart does', () => {
  const t = revenueNeedTableData(syntheticComp());
  expect(t.head).toEqual(['Year', 'Funding need', 'Total revenue', 'Coverage',
    'NHA payroll contribution (uncapped)', 'Other levies']);
  expect(t.rows).toEqual([
    ['2027', '$500B', '$415B', '50%', '$400B', '$15B'],
    ['2028', '$0B', '$0B', '100%', '$420B', '$18B']
  ]);
});

test('the revenue table on the real model has a row per year and a column per drawn series', () => {
  const comp = compute(defaultSettings(), PROGRAMS);
  const t = revenueNeedTableData(comp);
  expect(t.rows.map((r) => r[0])).toEqual(comp.years.map(String));
  for (const row of t.rows) expect(row).toHaveLength(t.head.length);
  /* the coverage column is the model's number, not a second division */
  comp.coverage.forEach((c, i) => {
    expect(t.rows[i][3]).toBe(c === null ? 'n/a' : Math.round(100 * c) + '%');
  });
});

/* ---- top rate ------------------------------------------------------------ */

test('the top-rate table has a row for every change in either series, once, in order', () => {
  const t = topRateTableData();
  const years = t.rows.map((r) => Number(r[1]));
  const expected = Array.from(new Set(
    TOP_RATE_HISTORY.map((h) => h.y).concat(PRESIDENTS.map((p) => p.y))
  )).filter((y) => y >= 1913 && y <= 2025).sort((a, b) => a - b);
  expect(years).toEqual(expected);
});

test('every top-rate row states the rate and president in force that year', () => {
  const t = topRateTableData();
  for (const [president, from, rate] of t.rows) {
    const y = Number(from);
    const inForce = TOP_RATE_HISTORY.filter((h) => h.y <= y).pop()!;
    const inOffice = PRESIDENTS.filter((p) => p.y <= y).pop()!;
    expect(rate, from).toBe(inForce.r + '%');
    expect(president, from).toBe(inOffice.name);
  }
  /* and a fact the page states in prose: 91% under Eisenhower */
  expect(t.rows.some(([p, , r]) => p === 'Eisenhower' && r === '91%')).toBe(true);
});

/* ---- county units --------------------------------------------------------- */

const COUNTIES = [
  { f: '01001', n: 'Autauga', s: 'AL', p: 59000, r: 0.42, la: 0, lo: 0,
    units: { a: 1, b: 2, c: 0, d: 0, total: 3 } },
  { f: '51059', n: 'Fairfax', s: 'VA', p: 1150000, r: 0.01, la: 0, lo: 0,
    units: { a: 4, b: 30, c: 0, d: 6, total: 40 } },
  { f: '02013', n: 'Aleutians East', s: 'AK', p: 3400, r: 1, la: 0, lo: 0,
    units: { a: 0, b: 0, c: 1, d: 0, total: 1 } },
  { f: '99999', n: 'Nowhere', s: 'ZZ', p: 10, r: 1, la: 0, lo: 0,
    units: { a: 0, b: 0, c: 0, d: 0, total: 0 } },
  { f: '01003', n: 'Baldwin', s: 'AL', p: 250000, r: 0.3, la: 0, lo: 0,
    units: { a: 1, b: 2, c: 0, d: 0, total: 3 } }
];

test('the county table lists every county the map draws, largest network first', () => {
  const t = countyUnitsTableData(COUNTIES);
  /* zero-unit counties are not drawn; ties break by name so the order is stable */
  expect(t.rows.map((r) => r[0])).toEqual(
    ['Fairfax, VA', 'Autauga, AL', 'Baldwin, AL', 'Aleutians East, AK']);
  expect(t.rows[0]).toEqual(
    ['Fairfax, VA', '1,150,000', '1%', '4', '30', '0', '6', '40']);
});

test('every county the type filter can show is in the table, with that type counted', () => {
  /* The table does not follow the filter (review 9: rebuilding it per click
     blocked the main thread for up to 680 ms). This is what makes that safe:
     every dot any filter draws is a row, and the row carries its type's count. */
  const t = countyUnitsTableData(COUNTIES);
  const byName = new Map(t.rows.map((r) => [r[0], r]));
  const column = { a: 3, b: 4, c: 5, d: 6 } as const;
  for (const type of ['a', 'b', 'c', 'd'] as const) {
    for (const c of COUNTIES.filter((x) => x.units[type] > 0)) {
      const row = byName.get(c.n + ', ' + c.s);
      expect(row, type + ' ' + c.n).toBeDefined();
      expect(row![column[type]]).toBe(String(c.units[type]));
    }
  }
});
