import { expect, test } from 'vitest';
import {
  compute, distribution, solveScenario, defaultSettings,
  instrumentRevenue, overlapFactors, overlapFamily, topShare, TAX_SELFTESTS,
  classGrowth,
} from '../../src/lib/taxmodel';
import {
  PROGRAMS, INSTRUMENTS, OVERLAP, SCENARIOS, ECON, GROUPS
} from '../../src/lib/taxparams';
import { ESTIMATED_BY, SCORED_AGAINST } from '../../src/lib/tax-types';

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

/* R126 [§S6a]: every distribution() call in this file passed three arguments,
   so `wageGainB` defaulted to zero and the wage pass-through was never
   exercised here. It is the mechanism that reduces apparent household burden
   while its other half reduces the new-revenue requirement, and it crosses the
   seam between the two engines. The self-test harness holds the cross-engine
   reconciliation; this holds the function's own behaviour. */
test('R126: distribution allocates a non-zero wageGainB by wage share', () => {
  const s = defaultSettings();
  const year = 2041;
  const wageGainB = 284;
  const withWage = distribution(s, year, 0, wageGainB);
  const without = distribution(s, year, 0);

  /* the whole of it lands, and only by wage share */
  const allocated = withWage.reduce((a, r) => a + r.wageB, 0);
  expect(allocated).toBeCloseTo(wageGainB, 9);
  expect(GROUPS.reduce((a, g) => a + g.wageShare, 0)).toBeCloseTo(1, 9);

  withWage.forEach((r, i) => {
    expect(r.wageB).toBeCloseTo(wageGainB * r.group.wageShare, 9);
    /* it reduces net burden, never raises it */
    expect(r.netPerHH).toBeLessThanOrEqual(without[i].netPerHH);
    /* and the per-household figure is the group's own share over its own
       household count, not an average smeared across the population */
    /* dollars per household, so six decimals is a millionth of a cent; nine
       is below the float's own resolution at this magnitude */
    expect(without[i].netPerHH - r.netPerHH).toBeCloseTo(
      wageGainB * r.group.wageShare * 1e9 / (r.group.hhM * 1e6), 6);
  });

  /* the three-argument call is the one that was silently testing nothing */
  expect(without.every((r) => r.wageB === 0)).toBe(true);
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
     four, R38/R37/R39 three more and R145 [§S11b] the unsourced-default rule;
     the owner's 2026-10-12 decision added the payroll-yield bound.
     Pinning the count is what makes a silently dropped invariant a failure
     rather than a smaller green number. */
  /* 18 since the owner's exclusivity row (2026-10-19) */
  expect(TAX_SELFTESTS.length).toBe(18);
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
  /* owner, 2026-10-19: the inheritance tax replaces the estate tax, so
     turning it on turns estate restoration off, as the page does */
  s.instruments.inherit.enabled = true;
  s.instruments.inherit.value = 1;
  s.instruments.estate.enabled = false;
  s.instruments.estate.value = 0;
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
  /* the estate tax is off here (the inheritance tax replaced it), so it
     raises nothing and there is nothing of it to cut */
  expect(gross.estate).toBe(0);
  fam.forEach((ins) => {
    if (ins.id === anchor.id || gross[ins.id] === 0) return;
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

test('R48: coverage is a sentinel, not Infinity, when there is nothing to cover', () => {
  /* Live today, not latent: the fallback need path is 0 in 2027 and 2028
     while several instruments have already begun phasing in. */
  const c = compute(defaultSettings(), PROGRAMS);
  const i28 = c.years.indexOf(2028);
  expect(c.need[i28]).toBe(0);
  expect(c.totalRev[i28]).toBeGreaterThan(0);
  expect(c.coverage[i28]).toBeNull();
  expect(c.coverage.every((v) => v === null || Number.isFinite(v))).toBe(true);
  /* need 0 AND revenue 0 is fully covered, which is a different answer */
  const none = defaultSettings();
  Object.keys(none.instruments).forEach((id) => {
    none.instruments[id].enabled = false;
    none.instruments[id].value = 0;
  });
  expect(compute(none, PROGRAMS).coverage[c.years.indexOf(2027)]).toBe(1);
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
  // ramp is complete, against the published score and the wages class.
  // CBO Option 61 re-based to the 2024 economy (P25: 1% ~ $109B/yr, its
  // 2030-34 figures over CBO's February 2024 GDP times FY2024 GDP) x 4pp
  // = $436B at scale 1.0.
  const s = defaultSettings();
  for (const id of Object.keys(s.instruments)) s.instruments[id].enabled = false;
  s.instruments.payroll.enabled = true;
  s.instruments.payroll.value = 1;
  s.instruments.payroll.phaseStart = 2024; // base year, ramp complete, growth 1.0
  s.instruments.payroll.phaseYears = 1;

  const total = distribution(s, 2024, 0).reduce((a, r) => a + r.taxB, 0);
  expect(total).toBeCloseTo(436, 6); // the literal, not a recomputation
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
    expect(total).not.toBeCloseTo(436, 6); // the anchor is external, so this fails loudly
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

/* R146 [§S18], the row's two declared tests: "every instrument declares the
   baseline its score was computed against" and "totals report how much
   revenue rests on a superseded baseline". The row named two pre-OBBBA
   instruments; measured, every estimate in the menu but the plan's own rent
   levy predates the July 4, 2025 act, which changed the law most of them
   were computed against.
   Review of the content run: the first version of this test read a year
   out of each `source`, which ten of the fifteen sources do not carry, so
   most declarations could flip and pass; it now reads the dated publication
   each `scoreBasis` ends with. And the surtax was declared as one of fifteen
   external scores; its revenue is this model's own calculation. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const BASIS_DATE = new RegExp('\\((?:(' + MONTHS.join('|') + ') )?((?:19|20)\\d\\d)\\)$');
/* the act was signed July 4, 2025: a basis dated July 2025 by month alone
   cannot be placed on either side, and is a fault */
const side = (basis: string): 'pre-obbba' | 'post-obbba' | 'undated' | 'ambiguous' => {
  const m = BASIS_DATE.exec(basis);
  if (!m) return 'undated';
  const year = Number(m[2]);
  const month = m[1] ? MONTHS.indexOf(m[1]) + 1 : 0;
  if (year < 2025 || (year === 2025 && month > 0 && month < 7)) return 'pre-obbba';
  if (year > 2025 || (year === 2025 && month > 7)) return 'post-obbba';
  return 'ambiguous';
};
const PUBLISHER = /\b(?:CBO|JCT|Treasury|TPC|Batchelder|Saez)\b/;

test('R146: every instrument declares what its estimate was computed against and who made it, from a dated basis', () => {
  const faults: string[] = [];
  for (const ins of INSTRUMENTS) {
    if (!(ins.scoredAgainst in SCORED_AGAINST)) faults.push(ins.id + ': "' + ins.scoredAgainst + '" is not a declared baseline');
    if (!(ins.estimatedBy in ESTIMATED_BY)) faults.push(ins.id + ': "' + ins.estimatedBy + '" is not a declared estimator');
    const dated = side(ins.scoreBasis);
    if (ins.scoredAgainst === 'unscored') {
      /* no estimate outside the plan: no publication, no date, the plan's figure */
      if (dated !== 'undated') faults.push(ins.id + ': unscored, but its basis is dated');
      if (ins.estimatedBy !== 'plan') faults.push(ins.id + ': unscored, but not the plan\'s figure');
      if (!/No external score/.test(ins.source)) faults.push(ins.id + ': unscored, but its source does not say so');
    } else {
      if (dated !== ins.scoredAgainst) faults.push(ins.id + ': declared ' + ins.scoredAgainst + ', but its basis "' + ins.scoreBasis + '" reads ' + dated);
      if (ins.estimatedBy === 'plan') faults.push(ins.id + ': the plan\'s figure, but declared against a baseline');
      /* the publication the basis names is the one the source cites */
      const publisher = PUBLISHER.exec(ins.scoreBasis);
      if (!publisher || ins.source.indexOf(publisher[0]) < 0) faults.push(ins.id + ': the basis names no publisher its source cites');
    }
    /* a model calculation is what a "Computed:" source is, and only that */
    if ((ins.estimatedBy === 'model') !== /^Computed:/.test(ins.source)) faults.push(ins.id + ': estimatedBy disagrees with its source');
  }
  expect(faults).toEqual([]);
});

/* The counts the log states, computed: fourteen published scores and one
   model calculation against superseded law, and the plan's one figure. */
test('R146: what the menu rests on, counted', () => {
  const count = (against: string, by: string): number =>
    INSTRUMENTS.filter((i) => i.scoredAgainst === against && i.estimatedBy === by).length;
  expect([count('pre-obbba', 'published'), count('pre-obbba', 'model'), count('unscored', 'plan')]).toEqual([14, 1, 1]);
  expect(count('pre-obbba', 'published') + count('pre-obbba', 'model') + count('unscored', 'plan')).toBe(INSTRUMENTS.length);
});

test('R146: the totals report the revenue resting on a superseded baseline, and it adds up', () => {
  const c = compute(defaultSettings(), PROGRAMS);
  const pre = INSTRUMENTS.filter((ins) => ins.scoredAgainst === 'pre-obbba');
  const model = pre.filter((ins) => ins.estimatedBy === 'model').map((ins) => ins.id);
  c.years.forEach((_, i) => {
    const recount = pre.reduce((s, ins) => s + c.byInstrument[ins.id][i], 0);
    expect(Math.abs(c.supersededRev[i] - recount)).toBeLessThan(1e-6);
    expect(c.supersededRev[i]).toBeLessThanOrEqual(c.totalRev[i] + 1e-6);
    const modelRecount = model.reduce((s, id) => s + c.byInstrument[id][i], 0);
    expect(Math.abs(c.supersededModelRev[i] - modelRecount)).toBeLessThan(1e-6);
    expect(c.supersededModelRev[i]).toBeLessThanOrEqual(c.supersededRev[i] + 1e-6);
  });
  const late = c.years.length - 1;
  expect(c.supersededRev[late]).toBeGreaterThan(0);
  expect(c.supersededModelRev[late]).toBeGreaterThan(0);
});

/* Review of the owner batch: removing "framework" from the Tax page turned
   "a framework judgment" into "a plan judgment", crediting the plan with a
   figure the plan never states. The overlap rate is this model's own
   choice (the comment on OVERLAP derives it), and the source text says so;
   the plan's own figures, like the rent levy's $20B, still say "plan". */
test('review of the owner batch: the overlap rate is credited to the model, the rent levy to the plan', () => {
  expect(OVERLAP.source).toMatch(/^Model judgment\./);
  expect(OVERLAP.source).not.toMatch(/\bplan\b/i);
  const rents = INSTRUMENTS.filter((i) => i.id === 'rents')[0];
  expect(rents.source).toMatch(/^Plan design;/);
});

/* Owner, 2026-10-12: ECON's earnings base and above-cap share, read by
   nothing until now, bound the payroll instruments' scores and feed the
   donut instrument's description. */
test('owner 2026-10-12: no payroll score raises more than its rate on the earnings it taxes', async () => {
  const { payrollYieldFaults } = await import('../../src/lib/taxmodel');
  const { INSTRUMENTS, ECON } = await import('../../src/lib/taxparams');
  const r = payrollYieldFaults();
  expect(r.faults).toEqual([]);
  expect(INSTRUMENTS.filter((i) => i.payrollBase).map((i) => i.id)).toEqual(['payroll', 'sscap']);
  expect(r.checked).toBe(2);
  /* a score typed ten times too large is caught; so is the share read wrong */
  const big = INSTRUMENTS.map((i) => (i.id === 'payroll' ? { ...i, rev1x: 5120 } : i));
  expect(payrollYieldFaults(big).faults).toEqual(['payroll scores $5120B a year at its default rate; 4% of a $13700B base is at most $548B']);
  expect(payrollYieldFaults(INSTRUMENTS, { wagesB: ECON.wagesB, aboveCapShare: 0.017 }).faults).toHaveLength(1);
  /* nothing to check is reported as nothing checked */
  expect(payrollYieldFaults([]).checked).toBe(0);
  /* the donut's description states ECON's share */
  const sscap = INSTRUMENTS.find((i) => i.id === 'sscap')!;
  expect(sscap.desc).toContain('about ' + Math.round(ECON.aboveCapShare * 100) + '% of covered earnings');
});

/* P25 (owner, 2026-10-14 and 2026-10-15): every score is its scorer's path
   re-based to the 2024 economy by the one rule in score-rebase.ts. Review 3
   of P24's test held the payroll and donut scores to a tenth of their
   ten-year figures; the rule changed, and the test with it. It restates the
   rule once from figures typed off CBO's own page and data, so the engine's
   arithmetic is held to something other than itself; it holds every score
   to its path and the units its default carries, every cited total to the
   source text, and every score to being computed rather than typed (review 4
   of P24: a value test cannot tell the two apart, so the code is read). */
test('P25: every tax score is its scorer\'s path re-based to the 2024 economy', async () => {
  const T = await import('../../src/lib/taxparams');
  const R = await import('../../src/lib/score-rebase');
  const { readFileSync } = await import('node:fs');
  const byId = (id: string) => {
    const ins = T.INSTRUMENTS.find((i) => i.id === id);
    expect(ins, id).toBeDefined();
    return ins!;
  };
  const path = (id: string) => {
    const p = T.SCORE_PATHS.entries[id];
    expect(p, id).toBeDefined();
    return p!;
  };
  const pathIds = Object.keys(T.SCORE_PATHS.entries);
  /* the rule, restated: CBO Option 61's last five years over CBO's February
     2024 GDP for those fiscal years, times actual FY2024 GDP */
  const option61 = [135.3, 140.1, 145.0, 150.0, 155.0];
  const feb2024 = [35745.9, 37156.6, 38609.4, 40106.5, 41645.7];
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  expect(R.rebaseTo2024(path('payroll'))).toBeCloseTo(sum(option61) / sum(feb2024) * 28947.9, 9);

  /* each score at its default: its path re-based, times its units */
  const units: Record<string, number> = { corp: T.CORP_FIGURES.defaultPoints, vat: T.VAT_FIGURES.defaultPoints / T.VAT_FIGURES.scoredRate };
  for (const id of pathIds) {
    if (id === 'payroll') continue;
    expect(byId(id).rev1x, id).toBe(Math.round(R.rebaseTo2024(path(id)) * (units[id] ?? 1)));
  }
  const payroll = byId('payroll');
  expect(T.PAYROLL_PER_POINT_B).toBe(Math.round(R.rebaseTo2024(path('payroll'))));
  expect(payroll.rev1x).toBe(T.PAYROLL_PER_POINT_B * T.ratePoints(payroll.payrollBase!.rate));
  expect(payroll.desc).toContain('1% ≈ $' + T.PAYROLL_PER_POINT_B + 'B/yr');
  /* the surtax is the model's own: its score and incidence are the same sums */
  const surtax = byId('surtax');
  const groups = T.surtaxByGroup();
  expect(surtax.rev1x).toBe(Math.round(sum(Object.values(groups))));
  for (const [id, v] of Object.entries(groups)) {
    expect(surtax.incidence[id], id).toBe(Math.round(v / sum(Object.values(groups)) * 1000) / 1000);
  }

  /* every source prints its path's total and years. This holds presence: a
     source that stops printing them fails. It does not hold the value, since
     each source is built from the same path (review 2 of P25); the build row
     holds each table to the total its scorer prints. Review 1 of P25: the
     paths with no printed total are named by their kind, so a skip cannot
     pass on silence. */
  const printedB = (x: number) => '$' + x.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'B';
  expect(Object.fromEntries(pathIds.filter((id) => path(id).kind !== 'table').map((id) => [id, path(id).kind])))
    .toEqual({ wealth: 'solved', inherit: 'window', enforce: 'window' });
  for (const id of pathIds) {
    if (id === 'enforce') continue;
    expect(byId(id).source, id).toContain(printedB(R.citedTotal(path(id))) + ' over ' + R.yearSpan(path(id)));
  }
  expect(path('wealth')).toBe(R.SZ_WEALTH_PATH);
  const irs = T.IRS_FUNDING_FIGURES;
  expect(byId('enforce').source).toContain('$' + irs.revenue10yrB + 'B over ' + R.yearSpan(path('enforce')));
  expect(byId('enforce').source).toContain('net of the $' + irs.enforcementSpend10yrB + 'B of enforcement spending');
  /* each path's text says its own year type: Treasury's are fiscal years
     though OMB's GDP is calendar, CBO's (the IRS window too) fiscal, the
     letter's calendar */
  expect(byId('capgains').source).toContain('over FY2025–34');
  expect(byId('enforce').source).toContain('over FY2022–31');
  expect(byId('wealth').source).toContain('over 2023–32');
  /* the income groups are CBO's 2022 incomes carried to 2024 by nominal GDP
     (owner, 2026-10-15), restated from CBO's middle-quintile figure and
     CBO's actual GDP; and the top bands keep CBO's top-1% aggregate */
  const q3 = T.GROUPS.find((g) => g.id === 'q3')!;
  expect(q3.avgIncome).toBe(Math.round(94000 * 29298.0 / 26054.6 / 100) * 100);
  const top = T.GROUPS.filter((g) => g.g === 'top');
  const topAggregate = sum(top.map((g) => g.hhM * g.avgIncome));
  expect(topAggregate / (1.2 * 2700900 * 29298.0 / 26054.6)).toBeCloseTo(1, 3);
  /* the letter's path reproduces both totals the letter prints. Review 2 of
     P25: the letter rounds its parts to the billion and prints its totals
     from the unrounded parts (219 + 131 against a printed 351), so each
     total is held to its parts within that rounding, and the path to the
     totals; the wealth description and wealthTaxPotential's note print the
     first-year total */
  const letter = R.szLetterPath();
  const L = R.SZ_LETTER;
  for (const part of [L.firstYearB, L.tenYearB]) expect(Math.abs(part.base + part.surtax - part.total)).toBeLessThanOrEqual(1);
  expect(L.firstYearB.total).toBe(351);
  expect(L.tenYearB.total).toBe(3906);
  expect(letter.valuesB[0]).toBeCloseTo(L.firstYearB.total, 9);
  expect(sum(letter.valuesB)).toBeCloseTo(L.tenYearB.total, 9);
  expect(byId('wealth').desc).toContain('$' + L.firstYearB.total + 'B for ' + L.firstYear);

  /* review 6 of P24: a rate's points print as written, at the rates where
     `rate * 100` carries floating-point noise, and are exact */
  for (const [rate, points] of [[0.04, '4'], [0.07, '7'], [0.0425, '4.25'], [0.045, '4.5'], [0.124, '12.4']] as const) {
    expect(String(T.ratePoints(rate)), String(rate)).toBe(points);
  }
  expect(T.PAYROLL_RATE_POINTS).toBe(T.ratePoints(payroll.payrollBase!.rate));

  /* No score is typed. Review 1 of P25: this read only `rev1x:` fields, so
     `PAYROLL_PER_POINT_B = 109` or `const B = 41; ... rev1x: B` passed, and
     review 5 of P24 had caught the first by reading every literal. The code
     is parsed, not stripped by regex (a stripped scan located its hits
     wrongly while measuring this), and two things are read from it:
     1. every instrument's rev1x is its scorer's path through scoreOf(),
        except the three named here: the payroll score (per point, then the
        rate's points), the model's own surtax, and the plan's rent levy;
     2. no numeric literal outside the scorers' tables equals a score, except
        at the locations named here: the rent levy's own figure, the 1925 and
        1930 top rates (25%), and the 99-99.5% band's wealth ($13.0T). Those
        two are coincidences with today's rounded scores, so a score that
        moves can add or retire one; the list failing then is the review a
        new coincidence needs, not a defect in the list. */
  const ts = (await import('typescript')).default;
  const file = readFileSync(new URL('../../src/lib/taxparams.ts', import.meta.url), 'utf8');
  const sf = ts.createSourceFile('taxparams.ts', file, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const declOf = (n: import('typescript').Node): string => {
    for (let p: import('typescript').Node | undefined = n; p; p = p.parent) {
      if (ts.isVariableDeclaration(p)) return p.name.getText(sf);
    }
    return '(module)';
  };
  const recordIdOf = (n: import('typescript').Node): string => {
    for (let p: import('typescript').Node | undefined = n; p; p = p.parent) {
      if (ts.isObjectLiteralExpression(p)) {
        const idProp = p.properties.find((q) => ts.isPropertyAssignment(q) && q.name.getText(sf) === 'id');
        if (idProp && ts.isPropertyAssignment(idProp) && ts.isStringLiteral(idProp.initializer)) return idProp.initializer.text;
      }
    }
    return '';
  };
  const rev1xText: Record<string, string> = {};
  const scores = new Set<number>([...T.INSTRUMENTS.map((i) => i.rev1x), T.PAYROLL_PER_POINT_B]);
  const hits: string[] = [];
  let payrollPerPointInit = '';
  let surtaxIncidenceInit = '';
  let literals = 0;
  const visit = (n: import('typescript').Node): void => {
    if (ts.isPropertyAssignment(n) && n.name.getText(sf) === 'rev1x' && declOf(n) === 'INSTRUMENTS') {
      rev1xText[recordIdOf(n)] = n.initializer.getText(sf);
    }
    if (ts.isPropertyAssignment(n) && n.name.getText(sf) === 'incidence' && declOf(n) === 'INSTRUMENTS' &&
      recordIdOf(n) === 'surtax') {
      surtaxIncidenceInit = n.initializer.getText(sf);
    }
    if (ts.isVariableDeclaration(n) && n.name.getText(sf) === 'PAYROLL_PER_POINT_B') {
      payrollPerPointInit = n.initializer ? n.initializer.getText(sf) : '';
    }
    if (ts.isNumericLiteral(n)) {
      const d = declOf(n);
      if (d !== 'SCORE_PATHS' && d !== 'SURTAX_CROSSCHECK_PATH') {
        literals++;
        if (scores.has(Number(n.text))) hits.push(n.text + ' in ' + d + (recordIdOf(n) ? ' ' + recordIdOf(n) : ''));
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  /* reach: every instrument's rev1x was read, and the literal scan read the file */
  expect(Object.keys(rev1xText).sort()).toEqual(T.INSTRUMENTS.map((i) => i.id).sort());
  expect(literals).toBeGreaterThan(200);
  /* review 2 of P25: the whole initializer, since a prefix let a typed
     argument through (scoreOf("corp", 7)) */
  const expectedRev1x: Record<string, string> = Object.fromEntries(T.INSTRUMENTS.map((i) => [i.id, 'scoreOf("' + i.id + '")']));
  Object.assign(expectedRev1x, {
    /* the rent levy's figure is declared once, RENTS_PLAN_B (branch review
       against main) */
    surtax: 'SURTAX_REV1X', payroll: 'PAYROLL_REV1X', rents: 'RENTS_PLAN_B',
    corp: 'scoreOf("corp", CORP_FIGURES.defaultPoints)',
    vat: 'scoreOf("vat", VAT_FIGURES.defaultPoints / VAT_FIGURES.scoredRate)'
  });
  expect(rev1xText).toEqual(expectedRev1x);
  expect(payrollPerPointInit).toBe("scoreOf('payroll')");
  expect(T.INSTRUMENTS.find((i) => i.id === 'rents')!.estimatedBy).toBe('plan');
  expect(hits).toEqual(['20 in RENTS_PLAN_B', '25 in TOP_RATE_HISTORY', '25 in TOP_RATE_HISTORY',
    '13 in WEALTH_DIST p9950']);
  /* and the surtax's incidence is its computed shares, not a typed object
     (a typed copy of the old shares matched the new ones to three decimals
     almost everywhere, and a share-by-share value check alone is weak) */
  expect(surtaxIncidenceInit).toBe('surtaxIncidence');
});

/* Review 2 of P25: a table path's printed total is required by its type, and
   a source file run without the type check can still drop it. The mutation
   run found the module then crashed in a text builder on undefined; the
   lookup of a table's total refuses by name instead. */
test('review 2 of P25: a table score path with no printed total is refused by name', async () => {
  const R = await import('../../src/lib/score-rebase');
  const T = await import('../../src/lib/taxparams');
  const payroll = T.SCORE_PATHS.entries.payroll!;
  expect(payroll.kind).toBe('table');
  const broken: Record<string, unknown> = { ...payroll };
  delete broken.statedTotalB;
  expect(() => R.citedTotal(broken as unknown as typeof payroll)).toThrow(/statedTotalB/);
  /* and the table as declared reads its own printed total */
  expect(R.citedTotal(payroll)).toBe(payroll.kind === 'table' ? payroll.statedTotalB : NaN);
});

/* Owner, 2026-10-19 (decision 5): the inheritance tax replaces the estate and
   gift taxes that estate restoration strengthens, so the two are
   alternatives; and the inheritance instrument is TPC's inheritance tax
   alone, since its full proposal's constructive realization taxes the gains
   the capital gains reform taxes at death. */
test('owner 2026-10-19: estate restoration and the inheritance tax are alternatives, never both on', async () => {
  const T = await import('../../src/lib/taxparams');
  const M = await import('../../src/lib/taxmodel');
  const group = T.INSTRUMENTS.filter((i) => i.exclusiveGroup === T.WEALTH_TRANSFER_GROUP).map((i) => i.id).sort();
  expect(group).toEqual(['estate', 'inherit']);
  /* both on is named and refused */
  const both = M.defaultSettings();
  both.instruments.inherit.enabled = true;
  both.instruments.inherit.value = 1;
  expect(both.instruments.estate.enabled).toBe(true);
  expect(M.exclusiveConflicts(both)).toEqual([T.WEALTH_TRANSFER_GROUP + ': estate and inherit']);
  expect(() => M.compute(both, T.PROGRAMS)).toThrow(/Alternatives cannot both be on/);
  /* the default has one, and each package keeps the one its own text names */
  expect(M.exclusiveConflicts(M.defaultSettings())).toEqual([]);
  const keeps: Record<string, string> = {};
  for (const scn of T.SCENARIOS) {
    const s = M.scenarioSettings(scn);
    expect(M.exclusiveConflicts(s), scn.id).toEqual([]);
    keeps[scn.id] = group.filter((id) => s.instruments[id]!.enabled && s.instruments[id]!.value > 0).join(',');
  }
  expect(keeps).toEqual({ 'goal-top': 'inherit', 'goal-shared': 'estate', 'goal-realist': 'inherit', custom: 'estate' });
  for (const scn of T.SCENARIOS) {
    if (keeps[scn.id] === 'inherit') expect(scn.desc, scn.id).toContain('inheritance-as-income');
    if (scn.id === 'goal-shared') expect(scn.desc).toContain('estate tax restoration');
  }
  /* the inheritance instrument is the inheritance tax alone, TPC's $168B,
     and its source states both rows and the estate repeal they net */
  const F = T.INHERITANCE_FIGURES;
  expect([F.windowTotalB, F.withRealizationB, F.estateRepealB]).toEqual([168, 337, 284]);
  const inherit = T.INSTRUMENTS.find((i) => i.id === 'inherit')!;
  expect(inherit.source).toContain('$168.0B over FY2020–30');
  expect(inherit.source).toContain('$' + F.withRealizationB + 'B');
  expect(inherit.source).toContain('$' + F.estateRepealB + 'B lost');
  expect(inherit.desc).toContain('turning one on turns the other off');
});
