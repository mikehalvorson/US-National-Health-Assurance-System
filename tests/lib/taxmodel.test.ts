import { expect, test } from 'vitest';
import {
  compute, distribution, solveScenario, defaultSettings,
  instrumentRevenue, TAX_SELFTESTS,
  classGrowth,
} from '../../src/lib/taxmodel';
import { PROGRAMS, INSTRUMENTS, SCENARIOS, ECON, GROUPS } from '../../src/lib/taxparams';

/* R43 [§S0]: kept as a smoke check, and labelled for what it is. Both sides
   are sums over the same instrumentRevenue calls, so this identity holds by
   construction and CANNOT detect a fault in that shared computation. The test
   that can is the worked example below, anchored on the published literals. */
test('distribution burden reconciles with total revenue within 0.5% (identity, not a fault detector)', () => {
  const s = defaultSettings();
  const year = 2040;
  const rows = distribution(s, year, 0);
  const sumTax = rows.reduce((a, r) => a + r.taxB, 0);
  const c = compute(s, PROGRAMS);
  const total = c.totalRev[c.years.indexOf(year)];
  expect(Math.abs(sumTax - total) / total).toBeLessThan(0.005);
});

test('revenue is linear in a scale instrument setting', () => {
  const s1 = defaultSettings();
  const s2 = defaultSettings();
  s2.instruments.payroll.value = 2 * s1.instruments.payroll.value;
  const ins = INSTRUMENTS.filter((i) => i.id === 'payroll')[0];
  const a = instrumentRevenue(ins, s1.instruments.payroll, 2040);
  const b = instrumentRevenue(ins, s2.instruments.payroll, 2040);
  expect(Math.abs(b - 2 * a)).toBeLessThan(1e-9);
});

test('every goal scenario meets the funding goal', () => {
  const goals = SCENARIOS.filter((sc) => sc.balancer);
  expect(goals.length).toBeGreaterThan(0);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  for (const sc of goals) {
    const s = solveScenario(sc, PROGRAMS);
    const c = compute(s, PROGRAMS);
    const i41 = c.years.indexOf(2041);
    expect(c.totalRev[i41]).toBeGreaterThanOrEqual(c.need[i41]);
    expect(sum(c.totalRev)).toBeGreaterThanOrEqual(sum(c.need));
  }
});

test('phase-in ramps from 0 to full', () => {
  const ins = INSTRUMENTS.filter((i) => i.id === 'surtax')[0];
  const st = { value: 1, enabled: true, phaseStart: 2029, phaseYears: 4 };
  const before = instrumentRevenue(ins, st, 2028);
  const mid = instrumentRevenue(ins, st, 2030);
  const full = instrumentRevenue(ins, st, 2035) / classGrowth(ins.growth, 2035);
  expect(before).toBe(0);
  expect(mid).toBeGreaterThan(0);
  expect(mid).toBeLessThan(full * 0.75);
  expect(Math.abs(full - ins.rev1x)).toBeLessThan(1);
});

test('all seven tax self-test invariants pass', () => {
  expect(TAX_SELFTESTS.length).toBe(7); // R43 replaced one; count unchanged
  const failing = TAX_SELFTESTS.filter((t) => !t.run()).map((t) => t.name);
  expect(failing).toEqual([]);
});

/* R46 [§S0] — the phase-in self-test divided by ECON.realGrowth while the
   instrument it tests compounds at ECON.growthRates[ins.growth]. It passed only
   because surtax is growth: "gdp" and both constants happened to be 0.019, two
   independently-settable values. realGrowth was labelled "legacy... kept for
   compatibility"; the growth() helper that used it had no callers at all. */
test('R46: no legacy realGrowth constant survives to be coupled to', () => {
  expect('realGrowth' in (ECON as unknown as Record<string, unknown>)).toBe(false);
});

test('R46: the phase-in test strips growth with the same function the instrument uses', () => {
  const ins = INSTRUMENTS.filter((i) => i.id === 'surtax')[0];
  const st = { value: 1, enabled: true, phaseStart: 2029, phaseYears: 4 };
  const full = instrumentRevenue(ins, st, 2035) / classGrowth(ins.growth, 2035);
  // rev1x is an independent literal from taxparams.ts, so this is not tautological
  expect(Math.abs(full - ins.rev1x)).toBeLessThan(1);
});

test('R46: an unknown growth class throws rather than silently falling back', () => {
  expect(() => classGrowth('not-a-class', 2035)).toThrow(/growth class/i);
});

test('R46: each declared growth class compounds at its own rate', () => {
  // gdp 1.9%, wages 1.2%, top 4.0% - distinct, so a coupling would show up here
  const y = 2040;
  expect(classGrowth('gdp', y)).not.toBeCloseTo(classGrowth('wages', y), 6);
  expect(classGrowth('top', y)).toBeGreaterThan(classGrowth('gdp', y));
});

/* R43 [§S0] — the old reconciliation compared two sums over the same
   instrumentRevenue calls, so it collapsed to sum(incidence) === 1, which a
   different self-test already asserts. It could not detect a fault in the sum
   it was reconciling. */
test('R43: a worked example anchors the distribution against published literals', () => {
  // External anchor, not a recomputation: payroll alone, at a year where its
  // ramp is complete, against the published rev1x of 512 and the wages class.
  // CBO Option 61 (1% ~ $128B/yr) x 4pp = $512B at scale 1.0, taxparams.ts:141.
  const s = defaultSettings();
  for (const id of Object.keys(s.instruments)) s.instruments[id].enabled = false;
  s.instruments.payroll.enabled = true;
  s.instruments.payroll.value = 1;
  s.instruments.payroll.phaseStart = 2024; // base year, ramp complete, growth 1.0
  s.instruments.payroll.phaseYears = 1;

  const total = distribution(s, 2024, 0).reduce((a, r) => a + r.taxB, 0);
  expect(total).toBeCloseTo(512, 6); // the literal, not a recomputation
});

test('R43: the worked example moves when the published literal moves', () => {
  const ins = INSTRUMENTS.filter((i) => i.id === 'payroll')[0];
  const original = ins.rev1x;
  try {
    ins.rev1x = 600;
    const s = defaultSettings();
    for (const id of Object.keys(s.instruments)) s.instruments[id].enabled = false;
    s.instruments.payroll.enabled = true;
    s.instruments.payroll.value = 1;
    s.instruments.payroll.phaseStart = 2024;
    s.instruments.payroll.phaseYears = 1;
    const total = distribution(s, 2024, 0).reduce((a, r) => a + r.taxB, 0);
    expect(total).not.toBeCloseTo(512, 6); // the anchor is external, so this fails loudly
    expect(total).toBeCloseTo(600, 6);
  } finally {
    ins.rev1x = original;
  }
});

test('R43: an incidence key naming no income group is caught', () => {
  const ins = INSTRUMENTS.filter((i) => i.id === 'payroll')[0];
  const t = TAX_SELFTESTS.find((x) => /incidence key names a real income group/.test(x.name));
  expect(t).toBeDefined();
  expect(t!.run()).toBe(true);
  try {
    (ins.incidence as Record<string, number>).q9 = 0; // no such group
    expect(t!.run()).toBe(false);
  } finally {
    delete (ins.incidence as Record<string, number>).q9;
  }
});
