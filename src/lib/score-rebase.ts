/* =========================================================================
 * Re-basing a scorer's estimate to the 2024 economy
 * =========================================================================
 * Owner, 2026-10-14: every tax instrument's score is re-based to the 2024
 * economy from its scorer's year-by-year path, by one rule, stated in
 * research/06 and computed from the source figures. The score had been a
 * tenth of a ten-year total, which is that window's average year: high for a
 * base that grows, and dated to whatever economy the scorer forecast.
 *
 * The rule (the owner chose it on 2026-10-15 over a path back-cast):
 *
 *   score in 2024 = (the scorer's estimate summed over its steady years)
 *                   / (the GDP the scorer projected for the same years)
 *                   x actual 2024 GDP of the same year type
 *
 * - Steady years are the last five years of the scorer's published window.
 *   The early years carry phase-ins and timing effects: CBO's transactions
 *   tax ramps for three years, Treasury's billionaire minimum front-loads
 *   prepayments, and every window opens on a part year.
 * - Where a scorer publishes only a total for its window, the window.
 * - The owner's rule also reads a one-year figure as that year. No score is
 *   one today, so that case is not built (review 1 of P25).
 *
 * A share of the scorer's own GDP is what carries an estimate out of the
 * economy the scorer forecast and into the 2024 economy as measured: the
 * forecasts behind the 2019 and 2021 estimates put 2024 GDP well below where
 * it came in. Other rules were measured and rejected (research/06,
 * "Re-basing each score to the 2024 economy"): the third window year
 * carried back at the path's growth reads the transactions tax mid-ramp, and
 * a log-linear fit of the last five years carried back reads the billionaire
 * minimum's falling path as a rising one. Neither moves an old forecast's
 * economy.
 *
 * Every figure here is a scorer's or an agency's; nothing is tuned. The
 * year-by-year paths and GDP projections are recorded with how they were read
 * in research/06, "Re-basing each score to the 2024 economy".
 * ========================================================================= */
import { lookupOrThrow, namedRegistry } from './registry-lookup';

export type YearType = 'FY' | 'CY';

/* Actual GDP, billions of dollars: CBO's February 2026 historical data
   (The Budget and Economic Outlook: 2026 to 2036), whose actual values
   reflect data released as of December 3, 2025. */
export const ACTUAL_GDP = {
  FY: { 2024: 28947.9 },
  CY: { 2022: 26054.6, 2024: 29298.0 }
} as const;

export interface Economy {
  yearType: YearType;
  gdpB: Record<number, number>;
}

/* The years first to last, inclusive: a scorer's window. */
export function yearRange(first: number, last: number): number[] {
  const out: number[] = [];
  for (let y = first; y <= last; y++) out.push(y);
  return out;
}

/* The Saez and Zucman letter to Senator Warren (February 24, 2021), as it
   states its estimate for the 2% tax above $50 million with the 4%
   billionaire surtax: revenue collected in 2023 on end-2022 wealth, net of
   the letter's own 15% avoidance and evasion assumption, and its ten-year
   total, each in two parts; the growth it projects for each part (the broad
   base with the economy at 4% a year, the billionaire base at 1% under a 6%
   top rate); and the GDP it measures against, its 2023 figure growing with
   the economy.

   Each total is the one the letter prints. Review 2 of P25: the letter
   prints its parts rounded to the billion and its total from the unrounded
   parts, so its first year reads 219 + 131 and "Total revenue (summing the
   two components): 351"; the path had been solved from 350, the sum of the
   rounded parts. */
export const SZ_LETTER = {
  firstYear: 2023,
  firstYearB: { base: 219, surtax: 131, total: 351 },
  tenYearB: { base: 2532, surtax: 1374, total: 3906 },
  growth: { economy: 0.04, billionaire: 0.01 },
  gdp2023B: 24300,
  avoidance: 0.15
};

function geometricSum(rate: number, years: number): number {
  return (Math.pow(1 + rate, years) - 1) / rate;
}

/* The letter's path, year by year. The letter states the first year and
   the ten-year total, and that the broad base grows with the economy while
   the billionaire base grows at 1%; the two parts of the path that reproduce
   both stated totals at those two rates are solved for here. */
export function szLetterPath(): { years: number[]; valuesB: number[] } {
  const L = SZ_LETTER;
  const first = L.firstYearB.total;
  const total = L.tenYearB.total;
  const sE = geometricSum(L.growth.economy, 10), sB = geometricSum(L.growth.billionaire, 10);
  const atEconomy = (total - first * sB) / (sE - sB);
  const atBillionaire = first - atEconomy;
  const years = yearRange(L.firstYear, L.firstYear + 9);
  const valuesB = years.map(function (_y, k) {
    return atEconomy * Math.pow(1 + L.growth.economy, k) +
      atBillionaire * Math.pow(1 + L.growth.billionaire, k);
  });
  return { years, valuesB };
}

function letterEconomy(): Record<number, number> {
  const out: Record<number, number> = {};
  yearRange(SZ_LETTER.firstYear, SZ_LETTER.firstYear + 9).forEach(function (y, k) {
    out[y] = SZ_LETTER.gdp2023B * Math.pow(1 + SZ_LETTER.growth.economy, k);
  });
  return out;
}

/* Each scorer's GDP projection, billions of nominal dollars. CBO's vintages
   are from its economic projections data (cbo.gov/data/budget-economic-data,
   "10-Year Economic Projections"); OMB's from the FY2025 Budget, Table S-9. */
export const ECONOMIES = namedRegistry<string, Economy>('ECONOMIES', {
  /* CBO's February 2024 baseline, which CBO's December 2024 revenue options
     are measured against */
  'cbo-2024-02': {
    yearType: 'FY',
    gdpB: { 2030: 35745.9, 2031: 37156.6, 2032: 38609.4, 2033: 40106.5, 2034: 41645.7 }
  },
  /* The Administration's FY2025 Budget economic assumptions, behind
     Treasury's FY2025 revenue estimates. OMB states GDP by calendar year
     only, so Treasury's fiscal-year estimates are measured against calendar
     GDP and re-based at calendar 2024 GDP; research/06 sizes the mix. */
  'omb-fy2025': {
    yearType: 'CY',
    gdpB: { 2030: 36368, 2031: 37947, 2032: 39594, 2033: 41313, 2034: 43110 }
  },
  /* CBO's February 2021 baseline, current when JCT scored the 2021 estate
     tax bill */
  'cbo-2021-02': {
    yearType: 'FY',
    gdpB: { 2027: 28424.8, 2028: 29505.8, 2029: 30622.7, 2030: 31750.9, 2031: 32933.4 }
  },
  /* CBO's July 2021 baseline, which CBO's September 2021 IRS estimate is
     measured against */
  'cbo-2021-07': {
    yearType: 'FY',
    gdpB: { 2022: 24323.3, 2023: 25356.2, 2024: 26191.1, 2025: 27076.5, 2026: 28033.3,
      2027: 29103.0, 2028: 30194.9, 2029: 31305.1, 2030: 32448.9, 2031: 33669.7 }
  },
  /* CBO's January 2019 baseline, the projections TPC's 2019 model builds on */
  'cbo-2019-01': {
    yearType: 'FY',
    gdpB: { 2025: 26656.1, 2026: 27667.2, 2027: 28737.8, 2028: 29861.8, 2029: 31006.1 }
  },
  /* CBO's January 2020 baseline, the first to cover TPC's 2020-2030 window
     for the inheritance tax */
  'cbo-2020-01': {
    yearType: 'FY',
    gdpB: { 2020: 22111.1, 2021: 23029.0, 2022: 23916.5, 2023: 24809.0, 2024: 25723.7,
      2025: 26652.7, 2026: 27615.5, 2027: 28653.0, 2028: 29736.9, 2029: 30849.9, 2030: 32003.1 }
  },
  /* The Saez and Zucman letter's own GDP */
  'sz-2021': {
    yearType: 'CY',
    gdpB: letterEconomy()
  }
});

/* What kind of path a score has, which says what can be wrong with it
   (review 2 of P25: the kind had been inferred three ways):
   - a table, typed from the scorer's year-by-year figures, which a build row
     holds to the total the scorer prints;
   - a window, one total the scorer states for its whole window, read over the
     window, with nothing to sum;
   - solved, a path solved from figures the scorer states (the letter's).
   The rule reads a table's or a solved path's last five years. */
interface PathFigures {
  economy: string;
  /* the scorer's own year type, where it differs from its economy's
     (Treasury's fiscal years against OMB's calendar GDP) */
  yearType?: YearType;
  years: number[];
  /* billions of nominal dollars, revenue raised positive */
  valuesB: number[];
}
export type ScorePath =
  | (PathFigures & { kind: 'table'; statedTotalB: number })
  | (PathFigures & { kind: 'window' })
  | (PathFigures & { kind: 'solved' });

/* The letter's path, read by the rule. Both engines read this one path: the
   tax model's wealth instrument and the healthcare model's wealth potential. */
export const SZ_WEALTH_PATH: ScorePath = { economy: 'sz-2021', kind: 'solved', ...szLetterPath() };

export function pathSum(p: ScorePath): number {
  let s = 0;
  p.valuesB.forEach(function (v) { s += v; });
  return s;
}

/* What a source cites: the scorer's printed total, or the path's sum. A
   table's total is required by its type; a source file run without the type
   check (the harness, a probe) can still drop it, and this says so by name
   rather than letting a text builder crash on undefined (review 2 of P25's
   mutation run). Every table's text reads this at import, so a table with
   no total stops the build here. */
export function citedTotal(p: ScorePath): number {
  if (p.kind !== 'table') return pathSum(p);
  if (typeof p.statedTotalB !== 'number') {
    throw new Error('A table score path names the total its scorer prints (statedTotalB): ' + p.economy + ' ' + p.years[0]);
  }
  return p.statedTotalB;
}

export function steadyYears(p: ScorePath): number[] {
  return p.kind === 'window' ? p.years : p.years.slice(-5);
}

/* The path's own years as its text prints them: "FY2025–34", "2023–32". */
export function yearSpan(p: ScorePath): string {
  const type = p.yearType ?? lookupOrThrow(ECONOMIES, p.economy).yearType;
  const last = p.years[p.years.length - 1];
  return (type === 'FY' ? 'FY' : '') + p.years[0] + '–' + String(last).slice(2);
}

/* The share of the scorer's GDP the estimate reaches over its steady years.
   Throws if the scorer's economy is not declared for a steady year, so a
   path cannot be measured against a GDP it does not have. */
export function steadyShare(p: ScorePath): number {
  const e = lookupOrThrow(ECONOMIES, p.economy);
  if (p.years.length !== p.valuesB.length) throw new Error('A score path has one value per year');
  let rev = 0, gdp = 0;
  steadyYears(p).forEach(function (y) {
    const g = e.gdpB[y];
    if (g === undefined) throw new Error(p.economy + ' declares no GDP for ' + y);
    rev += p.valuesB[p.years.indexOf(y)] ?? 0;
    gdp += g;
  });
  return rev / gdp;
}

/* The rule above: that share, times actual 2024 GDP of the economy's year
   type. */
export function rebaseTo2024(p: ScorePath): number {
  return steadyShare(p) * ACTUAL_GDP[lookupOrThrow(ECONOMIES, p.economy).yearType][2024];
}

/* For a window-total figure: the window's years with the total on the first
   of them, so the window sum is the total and the rule reads the window. */
export function windowTotal(economy: string, firstYear: number, lastYear: number, totalB: number): ScorePath {
  const years = yearRange(firstYear, lastYear);
  const valuesB = years.map(function (y) { return y === firstYear ? totalB : 0; });
  return { economy, kind: 'window', years, valuesB };
}
