/* =========================================================================
 * Tax model engine
 *
 * Computes, for a package of instrument settings and a set of funding
 * programs, over the model horizon (2027-2042):
 *   - revenue by instrument by year (phase-in schedules, bases growing
 *     with the economy)
 *   - total need by year (sum of enabled programs)
 *   - coverage (revenue / need)
 *   - distributional table at any year: per income group, new taxes paid
 *     ($/household and % of income), health-cost relief, and NET impact
 *   - effective federal tax rate curve, current law vs. proposed
 *
 * Pure functions over taxparams.ts data; no DOM. Self-tests are exported as
 * TAX_SELFTESTS for a shared self-test harness to aggregate.
 *
 * Ported from docs/js/taxmodel.js in full: defaultSettings, instrumentRevenue,
 * compute, distribution, solveScenario, and their private helpers (growth,
 * classGrowth, ramp), plus the seven NHA.SELFTESTS tax invariants.
 * ========================================================================= */
import {
  DATASET_VINTAGES, GROUPS, ECON, INSTRUMENTS, OVERLAP, PROGRAMS, SCENARIOS,
  WEALTH_BASE_VINTAGE, WEALTH_REV_VINTAGE_VALUE
} from './taxparams';
import type {
  TaxInstrument,
  TaxProgram,
  TaxScenario,
  InstrumentSetting,
  TaxSettings,
  DistributionRow,
  ComputeResult,
} from './tax-types';

const YEARS: number[] = [];
for (let y = 2027; y <= 2042; y++) YEARS.push(y);

/* ---- settings object ----
 * { instruments: {id: {value, phaseStart, phaseYears, enabled}} }
 * value semantics: 'scale' -> multiple of default rev1x; 'toggle' -> 0/1.
 */
export function defaultSettings(): TaxSettings {
  const s: TaxSettings = { instruments: {} };
  INSTRUMENTS.forEach(function (ins) {
    s.instruments[ins.id] = {
      value: ins.kind === 'toggle' ? (ins.default ? 1 : 0) : (ins.default as number),
      phaseStart: ins.phaseStart,
      phaseYears: ins.phaseYears,
      enabled: ins.kind === 'toggle' ? !!ins.default : (ins.default as number) > 0,
    };
  });
  return s;
}

/* Per-class base growth: broad income/GDP 1.9%, wages 1.2%, top capital
 * 4.0% real (see ECON.growthRates). Wealth-side instruments compound
 * faster than the economy because their base does.
 *
 * R46 [§S0]: the `?? ECON.realGrowth` fallback is gone, and so is realGrowth
 * itself. It was labelled "legacy... kept for compatibility" and its only live
 * effect was to let an unknown growth class resolve silently to the GDP rate.
 * An unknown class is a typo in a controlled field, so it throws. */
export function classGrowth(cls: string | undefined, year: number): number {
  const key = cls || 'gdp';
  const r = ECON.growthRates && ECON.growthRates[key];
  if (r == null) throw new Error('Unknown growth class: ' + key);
  return Math.pow(1 + r, year - ECON.baseYear);
}
function ramp(year: number, start: number | undefined, years: number | undefined): number {
  if (start == null || year < start) return 0;
  if (years == null || years <= 0) return 1;
  return Math.min(1, (year - start + 1) / years);
}

/* Revenue for one instrument in one year, $B (2024$) */
export function instrumentRevenue(ins: TaxInstrument, st: InstrumentSetting, year: number): number {
  if (!st.enabled || st.value <= 0) return 0;
  return ins.rev1x * st.value * ramp(year, st.phaseStart, st.phaseYears) *
         classGrowth(ins.growth, year);
}

/* ---- Instrument overlap at the top of the distribution -----------------
 * R144 + R42 [§S5]. The model of the overlap - which instruments, and how
 * much - is declared as OVERLAP in taxparams.ts, with the reasoning and the
 * grade. This is the part that applies it.
 *
 * `topShare` is the share of an instrument's incidence landing on the top
 * 0.1%. The family is everything above the declared threshold; the family
 * member raising the most in that year is the anchor and keeps its revenue
 * whole; the rest are cut by `rate` on the part of their revenue that lands
 * on the shared base.
 *
 * The result is a per-instrument FACTOR rather than a lump deduction, so the
 * stacked revenue chart, `totalRev` and the distributional table all move
 * together. A lump would have left the stack overshooting the line it is
 * drawn against, and `distribution` allocating tax the package never raised.
 * ---------------------------------------------------------------------- */
export function topShare(ins: TaxInstrument): number {
  return OVERLAP.top01Bands.reduce(function (a, k) {
    return a + (ins.incidence[k] || 0);
  }, 0);
}

export function overlapFamily(): TaxInstrument[] {
  return INSTRUMENTS.filter(function (ins) {
    return topShare(ins) > OVERLAP.top01Threshold;
  });
}

/* Every instrument's revenue multiplier for one year, given the whole
   package. 1 for anything outside the family and for the anchor. */
export function overlapFactors(
  settings: TaxSettings,
  year: number,
  rate: number = OVERLAP.rate.mode
): Record<string, number> {
  const factors: Record<string, number> = {};
  INSTRUMENTS.forEach(function (ins) { factors[ins.id] = 1; });

  const active = overlapFamily()
    .map(function (ins) {
      return { ins: ins, rev: instrumentRevenue(ins, settings.instruments[ins.id], year) };
    })
    .filter(function (x) { return x.rev > 0; });
  if (active.length < 2) return factors;

  let anchor = active[0];
  active.forEach(function (x) { if (x.rev > anchor.rev) anchor = x; });
  active.forEach(function (x) {
    if (x.ins.id === anchor.ins.id) return;
    factors[x.ins.id] = 1 - rate * topShare(x.ins);
  });
  return factors;
}

/* Revenue for one instrument in one year, net of its share of the overlap. */
export function netInstrumentRevenue(
  ins: TaxInstrument,
  st: InstrumentSetting,
  year: number,
  factors: Record<string, number>
): number {
  return instrumentRevenue(ins, st, year) * (factors[ins.id] ?? 1);
}

/* Full computation over the horizon */
export function compute(settings: TaxSettings, programs: TaxProgram[]): ComputeResult {
  const byInstrument: Record<string, number[]> = {}; // id -> [per year]
  const totalRev = YEARS.map(function () { return 0; });
  /* R42 [§S5]: the deduction is applied here, before totalRev accumulates,
     and reported as its own series so the page can state what it removed. */
  const factorsByYear = YEARS.map(function (yr) { return overlapFactors(settings, yr); });
  const overlapDeduction = YEARS.map(function () { return 0; });
  INSTRUMENTS.forEach(function (ins) {
    const st = settings.instruments[ins.id];
    byInstrument[ins.id] = YEARS.map(function (yr, i) {
      const gross = instrumentRevenue(ins, st, yr);
      const r = gross * (factorsByYear[i][ins.id] ?? 1);
      overlapDeduction[i] += gross - r;
      totalRev[i] += r;
      return r;
    });
  });

  const need = YEARS.map(function (yr) {
    let n = 0;
    programs.forEach(function (p) { if (p.enabled) n += p.need(yr); });
    return n;
  });

  const coverage = YEARS.map(function (_, i) {
    return need[i] > 0 ? totalRev[i] / need[i] : (totalRev[i] > 0 ? Infinity : 1);
  });

  return { years: YEARS, byInstrument: byInstrument, totalRev: totalRev,
           need: need, coverage: coverage, overlapDeduction: overlapDeduction };
}

/* ---- Distribution at one year ----
 * healthReliefB: aggregate household health spending replaced in that
 * year ($B, 2024$), from the healthcare model; 0 if not linked.
 * wageGainB: wages passed through from employers' net premium savings
 * ($B, 2024$), allocated to groups by wage share; 0 if not linked.
 * Returns rows per group + totals.
 */
export function distribution(
  settings: TaxSettings,
  year: number,
  healthReliefB: number,
  wageGainB?: number
): DistributionRow[] {
  const rows: DistributionRow[] = [];
  /* R42 [§S5]: the same netting compute() applies. Allocating gross revenue
     here would show the top bands paying tax the package does not raise. */
  const factors = overlapFactors(settings, year);
  GROUPS.forEach(function (grp) {
    /* incomes grow with each band's own base class: the top bands'
       incomes compound at the capital rate, everyone else at GDP */
    const g = classGrowth(grp.g || 'gdp', year);
    let taxB = 0;
    INSTRUMENTS.forEach(function (ins) {
      const st = settings.instruments[ins.id];
      const rev = netInstrumentRevenue(ins, st, year, factors);
      taxB += rev * (ins.incidence[grp.id] || 0);
    });
    const reliefB = (healthReliefB || 0) * grp.healthRelief;
    const wageB = (wageGainB || 0) * grp.wageShare;
    const hh = grp.hhM * 1e6;
    const income = grp.avgIncome * g; /* incomes grow with the economy too */
    const taxPerHH = taxB * 1e9 / hh;
    const reliefPerHH = reliefB * 1e9 / hh;
    const wagePerHH = wageB * 1e9 / hh;
    const netPerHH = taxPerHH - reliefPerHH - wagePerHH;
    rows.push({
      group: grp, taxB: taxB, reliefB: reliefB, wageB: wageB,
      taxPerHH: taxPerHH, reliefPerHH: reliefPerHH, wagePerHH: wagePerHH,
      netPerHH: netPerHH,
      netPctIncome: netPerHH / income,
      taxPctIncome: taxPerHH / income,
      curRate: grp.curRate,
      newRate: grp.curRate + taxPerHH / income,
      avgIncomeNow: income
    });
  });
  return rows;
}

/* ---- Scenario application with auto-balancing solver -------------------
 * Applies a scenario's instrument settings over the defaults, then (if
 * the scenario names a balancer) solves the balancer's scale linearly so
 * revenue reaches 102% of the mature-year (2041) need and 100% of the
 * cumulative 2027-2042 need, whichever requires more. Returns the
 * settings plus a _balanced report {id, value, clamped}.               */
export function solveScenario(scn: TaxScenario, programs: TaxProgram[]): TaxSettings {
  const s = defaultSettings();
  Object.keys(scn.settings || {}).forEach(function (id) {
    const o = scn.settings[id], st = s.instruments[id];
    if (!st) return;
    if (o.value != null) { st.value = o.value; st.enabled = o.value > 0 || o.enabled === true; }
    if (o.enabled != null) { st.enabled = o.enabled; if (o.enabled && st.value <= 0) st.value = 1; }
    if (o.phaseStart != null) st.phaseStart = o.phaseStart;
  });
  if (!scn.balancer) return s;

  /* R44 [§S5]: the solver reads `ins.scaleMax`, which exists only on
     kind:'scale' instruments. On a toggle balancer `v > undefined` is false
     and `Math.min(v, undefined)` is NaN, so revenue became NaN silently -
     every downstream chart and tile rendering "NaN" with no error anywhere.
     Ten of the sixteen instruments have no scaleMax.

     R42 adds a second requirement the solver equally depends on and equally
     never stated: it solves LINEARLY, taking revenue at balancer 0 and 1 and
     interpolating. The overlap deduction is a function of which family member
     is largest, so a balancer inside the overlap family makes revenue
     non-linear in its own setting and the interpolation is simply wrong.
     `wealth` is scale-kind with a scaleMax and sits in the family, so this is
     reachable by naming one plausible instrument.

     Both throw rather than degrade, following R46's precedent in this file:
     a balancer that cannot be solved is a broken scenario definition, not a
     value to guess at. */
  const balIns = INSTRUMENTS.filter(function (i) { return i.id === scn.balancer; })[0];
  if (!balIns) {
    throw new Error('Scenario ' + scn.id + ' names unknown balancer ' + scn.balancer);
  }
  if (balIns.kind !== 'scale' || typeof balIns.scaleMax !== 'number') {
    throw new Error(
      'Scenario ' + scn.id + ' balancer ' + balIns.id + ' is kind "' + balIns.kind +
      '" with scaleMax ' + String(balIns.scaleMax) +
      '; the linear solver needs a scale instrument with a numeric scaleMax'
    );
  }
  if (overlapFamily().some(function (i) { return i.id === balIns.id; })) {
    throw new Error(
      'Scenario ' + scn.id + ' balancer ' + balIns.id + ' is in the overlap family ' +
      '(top-0.1% incidence ' + topShare(balIns).toFixed(2) + '); revenue is not ' +
      'linear in its setting, so the linear solve would be wrong'
    );
  }

  const bal = s.instruments[scn.balancer];
  const baseVal = bal.value;
  bal.enabled = true;

  bal.value = 0;
  const c0 = compute(s, programs);
  bal.value = 1;
  const c1 = compute(s, programs);

  const i41 = c0.years.indexOf(2041);
  function sum(a: number[]): number { return a.reduce(function (x, y) { return x + y; }, 0); }
  const u41 = c1.totalRev[i41] - c0.totalRev[i41];
  const uCum = sum(c1.totalRev) - sum(c0.totalRev);
  const need41 = (c0.need[i41] * 1.02 - c0.totalRev[i41]) / (u41 || 1);
  const needCum = (sum(c0.need) - sum(c0.totalRev)) / (uCum || 1);
  const v = Math.max(need41, needCum, baseVal, 0);

  const clamped = v > (balIns.scaleMax as number);
  bal.value = Math.min(v, balIns.scaleMax as number);
  s._balanced = { id: scn.balancer, value: bal.value, clamped: clamped };
  return s;
}

/* ---- Self-tests (exported for the shared self-test harness) ---- */
export const TAX_SELFTESTS: { name: string; run: () => boolean }[] = [
  {
    name: "Tax: every instrument's incidence shares sum to 1",
    run: function () {
      return INSTRUMENTS.every(function (ins) {
        let s = 0;
        GROUPS.forEach(function (g) { s += ins.incidence[g.id] || 0; });
        return Math.abs(s - 1) < 0.005;
      });
    }
  },

  {
    name: "Tax: group shares (wage/capital/consumption/relief) each sum to 1",
    run: function () {
      const cols: ('wageShare' | 'capShare' | 'consumpShare' | 'healthRelief')[] =
        ['wageShare', 'capShare', 'consumpShare', 'healthRelief'];
      return cols.every(function (c) {
        let s = 0;
        GROUPS.forEach(function (g) { s += g[c]; });
        return Math.abs(s - 1) < 0.01;
      });
    }
  },

  {
    /* R43 [§S0]: REPLACED. The old row here was
       "Tax: distribution burden reconciles with total revenue", which compared
       the distributional total against compute()'s totalRev. Both are sums over
       the SAME instrumentRevenue calls, so the identity collapses to
       `sum_instruments rev x sum_groups incidence` - and sum_groups incidence
       is 1 by the incidence self-test above. It could never detect a fault in
       the sum it was reconciling, and perturbing a sourced literal moved both
       sides together.

       Test convention this establishes: a reconciliation between two quantities
       computed the same way cannot detect a fault in the shared computation.
       The replacement below checks the one thing the identity assumed and never
       verified - that every incidence key resolves to a real group. The
       externally-anchored worked example lives in tests/lib/taxmodel.test.ts,
       against the published rev1x literals at the base year.

       And the fault the old reconciliation could not reach. Incidence is Incidence is
       read as `ins.incidence[grp.id] || 0`, so a key that names no group is
       silently dropped from every distributional total - while the
       shares-sum-to-1 test still passes, because it sums the object's own
       values. */
    name: "Tax: every incidence key names a real income group",
    run: function () {
      const ids = new Set(GROUPS.map(function (g) { return g.id; }));
      return INSTRUMENTS.every(function (ins) {
        return Object.keys(ins.incidence).every(function (k) { return ids.has(k); });
      });
    }
  },

  {
    /* R144 [§S5]: the overlap family is derived from incidence, so the only
       thing that can go wrong is the threshold landing in a crowd. This holds
       the gap open. `enforce` at 0.23 and `inherit` at 0.35 are the two
       nearest neighbours today, both clear of the 0.30 +/- 0.05 band. */
    name: "Tax: the overlap threshold separates the instruments cleanly",
    run: function () {
      const lo = OVERLAP.top01Threshold - OVERLAP.top01Margin;
      const hi = OVERLAP.top01Threshold + OVERLAP.top01Margin;
      return INSTRUMENTS.every(function (ins) {
        const s = topShare(ins);
        return s <= lo || s >= hi;
      }) && overlapFamily().length >= 2;
    }
  },

  {
    /* R42 + R36 [§S5]: the assertion both rows ask for. Every shipped
       scenario that turns on two or more family instruments must raise less
       than their naive sum - which is what the engine did before, in all
       three of them. */
    name: "Tax: no scenario sums a declared-overlapping set naively",
    run: function () {
      const yr = 2041;
      return SCENARIOS.every(function (scn) {
        const s = scn.balancer ? solveScenario(scn, PROGRAMS) : defaultSettings();
        if (!scn.balancer) {
          Object.keys(scn.settings || {}).forEach(function (id) {
            const o = scn.settings[id], st = s.instruments[id];
            if (!st) return;
            if (o.value != null) { st.value = o.value; st.enabled = o.value > 0 || o.enabled === true; }
            if (o.enabled != null) { st.enabled = o.enabled; if (o.enabled && st.value <= 0) st.value = 1; }
          });
        }
        const fam = overlapFamily().filter(function (ins) {
          return instrumentRevenue(ins, s.instruments[ins.id], yr) > 0;
        });
        if (fam.length < 2) return true;
        const factors = overlapFactors(s, yr);
        let gross = 0, net = 0;
        fam.forEach(function (ins) {
          const g = instrumentRevenue(ins, s.instruments[ins.id], yr);
          gross += g;
          net += g * factors[ins.id];
        });
        return net < gross;
      });
    }
  },

  {
    /* R42 [§S5]: turning an instrument ON must never lower the package total.
       The deduction reassigns which family member counts in full, so this is
       the property the anchor rule exists to guarantee, and the one that
       breaks first if that rule is changed.

       Every subset of the family is tried, not just the shipped package: the
       first version of this check enabled one instrument at a time from the
       defaults, and inverting the anchor rule to pick the SMALLEST member
       still passed it, because the defaults never put the new instrument at
       the bottom. Over all 64 subsets it fails immediately - {wealth} plus
       capgains would drop the total from $701B to $442B. */
    name: "Tax: enabling any instrument never lowers total revenue",
    run: function () {
      const yr = 2041;
      const fam = overlapFamily();
      function totalOf(onIds: Set<string>): number {
        const s = defaultSettings();
        INSTRUMENTS.forEach(function (ins) {
          const on = onIds.has(ins.id);
          s.instruments[ins.id].enabled = on;
          s.instruments[ins.id].value = on ? Math.max(1, s.instruments[ins.id].value) : 0;
        });
        const f = overlapFactors(s, yr);
        let t = 0;
        INSTRUMENTS.forEach(function (ins) {
          t += instrumentRevenue(ins, s.instruments[ins.id], yr) * f[ins.id];
        });
        return t;
      }
      for (let mask = 0; mask < (1 << fam.length); mask++) {
        const on = new Set<string>();
        fam.forEach(function (ins, bit) { if (mask & (1 << bit)) on.add(ins.id); });
        const before = totalOf(on);
        if (!(before >= 0)) return false;
        for (let bit = 0; bit < fam.length; bit++) {
          if (mask & (1 << bit)) continue;
          const plus = new Set(on);
          plus.add(fam[bit].id);
          if (totalOf(plus) < before - 1e-9) return false;
        }
      }
      return true;
    }
  },

  {
    /* R44 [§S5]: every scenario balancer must be solvable by the linear
       solver - scale-kind with a numeric scaleMax (or NaN revenue), and
       outside the overlap family (or the interpolation is wrong). */
    name: "Tax: every scenario balancer is scale-type and outside the overlap family",
    run: function () {
      const family = new Set(overlapFamily().map(function (i) { return i.id; }));
      return SCENARIOS.filter(function (sc) { return sc.balancer; })
        .every(function (sc) {
          const ins = INSTRUMENTS.filter(function (i) { return i.id === sc.balancer; })[0];
          return !!ins && ins.kind === 'scale' &&
            typeof ins.scaleMax === 'number' && !family.has(ins.id);
        });
    }
  },

  {
    /* R38 [§S5]: every dataset in the file declares its vintage and whether it
       participates in computation, and a computing one is denominated in the
       model's own base year. `WEALTH_DIST` is the reason: 2026:Q1 nominal
       levels inside a 2024$ model, unlabelled. */
    name: "Tax: every dataset declares its vintage and whether it computes",
    run: function () {
      const declared = new Set(DATASET_VINTAGES.map(function (v) { return v.id; }));
      const required = ['GROUPS', 'ECON', 'INSTRUMENTS', 'WEALTH_DIST',
        'TOP_RATE_HISTORY', 'PRESIDENTS'];
      if (!required.every(function (id) { return declared.has(id); })) return false;
      return DATASET_VINTAGES.every(function (v) {
        if (!v.note || v.note.length < 20) return false;
        return v.computes ? v.dollarYear === ECON.baseYear : true;
      });
    }
  },

  {
    /* R37 [§S5]: the wealth base is carried from its own cited vintage to the
       model's base year, at the rate the instrument itself compounds at. The
       check re-derives it rather than pinning the literal, so changing the
       growth class or the vintage moves the base with it. */
    name: "Tax: the wealth-tax base is carried from its cited vintage to the base year",
    run: function () {
      const w = INSTRUMENTS.filter(function (i) { return i.id === 'wealth'; })[0];
      const expected = Math.round(
        WEALTH_REV_VINTAGE_VALUE *
        Math.pow(1 + ECON.growthRates[w.growth || 'gdp'], ECON.baseYear - WEALTH_BASE_VINTAGE)
      );
      return w.rev1x === expected && WEALTH_BASE_VINTAGE < ECON.baseYear &&
        w.rev1x > WEALTH_REV_VINTAGE_VALUE;
    }
  },

  {
    /* R39 + R208 [§S5]: a balancer absorbs whatever gap the rest of the
       package leaves, so it carries the package's residual risk. Each one
       must state its uncertainty - a band where the evidence supports one, or
       an explicit reason there is none. `surtax` is the case that matters:
       $527B at scale 1, the largest instrument in the menu, an in-house
       derivation graded medium, and the balancer in the flagship scenario. */
    name: "Tax: every balancer states its revenue uncertainty",
    run: function () {
      const ids = new Set(SCENARIOS.filter(function (sc) { return sc.balancer; })
        .map(function (sc) { return sc.balancer as string; }));
      return Array.from(ids).every(function (id) {
        const ins = INSTRUMENTS.filter(function (i) { return i.id === id; })[0];
        if (!ins) return false;
        const band = ins.revBand;
        if (band) {
          return band.low < ins.rev1x && band.high > ins.rev1x &&
            !!band.basis && band.basis.length > 30;
        }
        return !!ins.revBandAbsent && ins.revBandAbsent.length > 30;
      });
    }
  },

  {
    name: "Tax: revenue is linear in a scale instrument's setting",
    run: function () {
      const s1 = defaultSettings(), s2 = defaultSettings();
      s2.instruments.payroll.value = 2 * s1.instruments.payroll.value;
      const ins = INSTRUMENTS.filter(function (i) { return i.id === 'payroll'; })[0];
      const a = instrumentRevenue(ins, s1.instruments.payroll, 2040);
      const b = instrumentRevenue(ins, s2.instruments.payroll, 2040);
      return Math.abs(b - 2 * a) < 1e-9;
    }
  },

  {
    name: "Tax: every goal scenario meets the funding goal (fallback need path)",
    run: function () {
      return SCENARIOS.filter(function (sc) { return sc.balancer; })
        .every(function (sc) {
          const s = solveScenario(sc, PROGRAMS);
          const c = compute(s, PROGRAMS);
          const i41 = c.years.indexOf(2041);
          function sum(a: number[]): number { return a.reduce(function (x, y) { return x + y; }, 0); }
          return c.totalRev[i41] >= c.need[i41] && sum(c.totalRev) >= sum(c.need);
        });
    }
  },

  {
    name: "Tax: every instrument has a valid growth class",
    run: function () {
      return INSTRUMENTS.every(function (ins) {
        return ECON.growthRates[ins.growth || 'gdp'] != null;
      });
    }
  },

  {
    name: "Tax: phase-in ramps from 0 to full",
    run: function () {
      const ins = INSTRUMENTS.filter(function (i) { return i.id === 'surtax'; })[0];
      const st: InstrumentSetting = { value: 1, enabled: true, phaseStart: 2029, phaseYears: 4 };
      const before = instrumentRevenue(ins, st, 2028);
      const mid = instrumentRevenue(ins, st, 2030);
      const full = instrumentRevenue(ins, st, 2035) / classGrowth(ins.growth, 2035);
      return before === 0 && mid > 0 && mid < full * 0.75 &&
             Math.abs(full - ins.rev1x) < 1;
    }
  }
];
