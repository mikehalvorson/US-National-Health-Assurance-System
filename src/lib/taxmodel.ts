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
import { GROUPS, ECON, INSTRUMENTS, PROGRAMS, SCENARIOS } from './taxparams';
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

function growth(year: number): number {
  return Math.pow(1 + ECON.realGrowth, year - ECON.baseYear);
}
/* Per-class base growth: broad income/GDP 1.9%, wages 1.2%, top capital
 * 4.0% real (see ECON.growthRates). Wealth-side instruments compound
 * faster than the economy because their base does. */
function classGrowth(cls: string | undefined, year: number): number {
  let r = ECON.growthRates && ECON.growthRates[cls || 'gdp'];
  if (r == null) r = ECON.realGrowth;
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

/* Full computation over the horizon */
export function compute(settings: TaxSettings, programs: TaxProgram[]): ComputeResult {
  const byInstrument: Record<string, number[]> = {}; // id -> [per year]
  const totalRev = YEARS.map(function () { return 0; });
  INSTRUMENTS.forEach(function (ins) {
    const st = settings.instruments[ins.id];
    byInstrument[ins.id] = YEARS.map(function (yr, i) {
      const r = instrumentRevenue(ins, st, yr);
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
           need: need, coverage: coverage };
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
  GROUPS.forEach(function (grp) {
    /* incomes grow with each band's own base class: the top bands'
       incomes compound at the capital rate, everyone else at GDP */
    const g = classGrowth(grp.g || 'gdp', year);
    let taxB = 0;
    INSTRUMENTS.forEach(function (ins) {
      const st = settings.instruments[ins.id];
      const rev = instrumentRevenue(ins, st, year);
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

  const ins = INSTRUMENTS.filter(function (i) { return i.id === scn.balancer; })[0];
  const clamped = v > (ins.scaleMax as number);
  bal.value = Math.min(v, ins.scaleMax as number);
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
    name: "Tax: distribution burden reconciles with total revenue",
    run: function () {
      const s = defaultSettings();
      const year = 2040;
      const rows = distribution(s, year, 0);
      const sumTax = rows.reduce(function (a, r) { return a + r.taxB; }, 0);
      const c = compute(s, PROGRAMS);
      const total = c.totalRev[c.years.indexOf(year)];
      return Math.abs(sumTax - total) / total < 0.005;
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
      const full = instrumentRevenue(ins, st, 2035) /
                 Math.pow(1 + ECON.realGrowth, 2035 - ECON.baseYear);
      return before === 0 && mid > 0 && mid < full * 0.75 &&
             Math.abs(full - ins.rev1x) < 1;
    }
  }
];
