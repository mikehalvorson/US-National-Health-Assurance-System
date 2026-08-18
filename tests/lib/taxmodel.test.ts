import { expect, test } from 'vitest';
import {
  compute, distribution, solveScenario, defaultSettings,
  instrumentRevenue, overlapFactors, overlapFamily, topShare, TAX_SELFTESTS,
  classGrowth,
} from '../../src/lib/taxmodel';
import {
  PROGRAMS, INSTRUMENTS, OVERLAP, SCENARIOS, ECON, GROUPS
} from '../../src/lib/taxparams';

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

test('every tax self-test invariant passes', () => {
  /* R43 replaced one and left the count at 7; R144/R42/R36/R44 [§S5] added
     four. Pinning the count is what makes a silently dropped invariant a
     failure rather than a smaller green number. */
  expect(TAX_SELFTESTS.length).toBe(11);
  const failing = TAX_SELFTESTS.filter((t) => !t.run()).map((t) => t.name);
  expect(failing).toEqual([]);
});

/* R144 + R42 [§S5] — the overlap deduction, anchored on hand arithmetic
   rather than on whatever the engine happens to produce.

   The family is derived from incidence, so these are measurements of the
   shipped incidence vectors, not choices: bmin 1.00, wealth 0.90, estate
   0.50, msurtax 0.42, capgains 0.40, inherit 0.35. `enforce` at 0.23 is the
   nearest instrument outside it. */
test('R144: the overlap family is derived from incidence, and is the six', () => {
  expect(overlapFamily().map((i) => i.id).sort())
    .toEqual(['bmin', 'capgains', 'estate', 'inherit', 'msurtax', 'wealth']);
  const byId: Record<string, number> = {};
  INSTRUMENTS.forEach((i) => { byId[i.id] = topShare(i); });
  expect(byId.bmin).toBeCloseTo(1.00, 10);
  expect(byId.wealth).toBeCloseTo(0.90, 10);
  expect(byId.inherit).toBeCloseTo(0.35, 10);
  /* the first instrument NOT in the family, and the gap the threshold sits in */
  expect(byId.enforce).toBeCloseTo(0.23, 10);
  expect(OVERLAP.top01Threshold).toBeGreaterThan(byId.enforce);
  expect(OVERLAP.top01Threshold).toBeLessThan(byId.inherit);
});

test('R42: the deduction equals rate x the non-anchor revenue on the shared base', () => {
  const s = defaultSettings();
  s.instruments.inherit.enabled = true;
  s.instruments.inherit.value = 1;
  const year = 2041;
  const factors = overlapFactors(s, year);
  const fam = overlapFamily();
  const gross: Record<string, number> = {};
  fam.forEach((ins) => { gross[ins.id] = instrumentRevenue(ins, s.instruments[ins.id], year); });

  /* wealth raises the most, so it is the anchor and keeps its revenue whole */
  const anchor = fam.reduce((a, b) => (gross[b.id] > gross[a.id] ? b : a));
  expect(anchor.id).toBe('wealth');
  expect(factors.wealth).toBe(1);

  let expected = 0;
  fam.forEach((ins) => {
    if (ins.id === anchor.id) return;
    expect(factors[ins.id]).toBeCloseTo(1 - OVERLAP.rate.mode * topShare(ins), 12);
    expected += gross[ins.id] * OVERLAP.rate.mode * topShare(ins);
  });

  const c = compute(s, PROGRAMS);
  expect(c.overlapDeduction[c.years.indexOf(year)]).toBeCloseTo(expected, 6);
  /* and it is a real reduction, not a rounding artefact */
  expect(expected).toBeGreaterThan(50);
});

test('R42: netting moves the balancer up, in every goal scenario', () => {
  /* The whole point of the row: the balancer solved against an inflated
     total, so the required rate came out too low. Compare the shipped solve
     against the same solve with the deduction switched off. */
  SCENARIOS.filter((sc) => sc.balancer).forEach((sc) => {
    const netted = solveScenario(sc, PROGRAMS)._balanced!.value;
    const saved = OVERLAP.rate.mode;
    (OVERLAP.rate as { mode: number }).mode = 0;
    const naive = solveScenario(sc, PROGRAMS)._balanced!.value;
    (OVERLAP.rate as { mode: number }).mode = saved;
    expect(netted).toBeGreaterThan(naive);
  });
});

test('R44: a toggle balancer throws instead of silently producing NaN', () => {
  const bad = { id: 'x', name: 'x', balancer: 'bmin', desc: '', settings: {} };
  expect(() => solveScenario(bad, PROGRAMS)).toThrow(/scaleMax/);
});

test('R44: a balancer inside the overlap family throws, because the solve is linear', () => {
  /* `wealth` is scale-kind with a numeric scaleMax, so it passes the first
     guard and would have been solved by linear interpolation against a
     revenue curve that is not linear in its own setting. */
  const w = INSTRUMENTS.filter((i) => i.id === 'wealth')[0];
  expect(w.kind).toBe('scale');
  expect(typeof w.scaleMax).toBe('number');
  const bad = { id: 'x', name: 'x', balancer: 'wealth', desc: '', settings: {} };
  expect(() => solveScenario(bad, PROGRAMS)).toThrow(/overlap family/);
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
