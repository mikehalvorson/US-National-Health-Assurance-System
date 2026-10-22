/* =========================================================================
 * U.S. tax system model - parameter base (reconciled)
 *
 * A generic, extensible tax-financing model: income groups × instruments ×
 * years. Built to fund ANY set of programs (healthcare is just the first),
 * with instruments that phase in over time to meet varied funding needs.
 *
 * RECONCILED against research/06_tax_distribution_financing.md (primary
 * sources pulled 2026-07-15):
 *  - Income groups: CBO, "The Distribution of Household Income, 2022"
 *    (pub. Jan 2026), supplemental-data workbook. CBO's 2022 incomes are
 *    carried to the 2024 economy by the growth of nominal GDP from 2022 to
 *    2024 (P25, owner 2026-10-15). The 91–99th group is a weighted
 *    combination of CBO's 91–95 and 96–99 rows.
 *  - Instrument scores: CBO "Options for Reducing the Deficit: 2025–2034"
 *    (Dec 2024, JCT staff), Treasury FY2025 Greenbook, Saez–Zucman (2021),
 *    JCT 99.5%-Act letter, TPC. Each is re-based to the 2024 economy from
 *    its scorer's year-by-year path by the one rule in score-rebase.ts.
 *  - Incidence: CBO/JCT conventions (employer payroll → workers, CBO WP
 *    2021-06; corporate → 25% labor / 75% capital, JCX-14-13); CES 2024
 *    consumption shares; TPC/Burman FTT table (NTJ 2016, Table 6).
 *  - Wage/capital shares derived from CBO's tax-rate-by-tax-type matrix
 *    (supplemental Table 9) × group incomes.
 * All dollars: real 2024 dollars. All revenues: $ billions/year.
 * Known limits: CBO options predate the July 2025 reconciliation act
 * (OBBBA) - scores tied to the old baseline are noted per instrument.
 * R146 [S18]: and declared, as `scoredAgainst` on every instrument, so the
 * model can say how much of a total rests on a superseded baseline
 * (`supersededRev` in taxmodel.ts) instead of only saying so in prose.
 * ========================================================================= */
/* R143 [§S5]: the top-capital rate is declared once in params.ts, because
   model.ts grows the same wealth base and used to do it at GDP. */
import { TOP_CAPITAL_REAL_GROWTH } from './params';
import {
  ACTUAL_GDP, SZ_LETTER, SZ_WEALTH_PATH, citedTotal, rebaseTo2024, windowTotal, yearRange, yearSpan, type ScorePath
} from './score-rebase';
import { lookupOrThrow, namedRegistry } from './registry-lookup';

/* R41 [§S5]: the same declaration params.ts now carries, in the file the
   convention came from. The header above has always said this in prose. */
export const TAX_RECONCILED_AGAINST = [
  'research/06_tax_distribution_financing.md'
];
import type {
  TaxGroup,
  TaxEcon,
  TaxInstrument,
  TaxProgram,
  TopRateHistoryEntry,
  PresidentEntry,
  WealthDist,
  TaxScenario,
} from './tax-types';

/* ---- CBO's 2022 incomes, and the step to the 2024 economy -----------------
 * P25 (owner, 2026-10-15). The groups' incomes were CBO's 2022 dollars times
 * a PCE inflation factor to 2024, so they were 2022's real incomes under a
 * 2024 label, the same mismatch the owner had the instrument scores re-based
 * for. They are carried to the 2024 economy by the growth of nominal GDP from
 * 2022 to 2024, the step score-rebase.ts's rule takes for every score, so the
 * incomes and the taxes set against them stand in one economy.
 *
 * CBO_2022_INCOME is CBO's average income before transfers and taxes per
 * household, 2022 dollars (research/06, core table); the 91st-99th figure is
 * CBO's 91-95 and 96-99 rows weighted by households, derived there. */
export const CBO_2022_INCOME = {
  q1: 26200, q2: 59100, q3: 94000, q4: 143100, d9: 211900, p9199: 388500,
  top1: 2700900, top1HhM: 1.2
};
export const INCOME_TO_2024 = ACTUAL_GDP.CY[2024] / ACTUAL_GDP.CY[2022];
function income2024(x2022: number): number {
  return Math.round(x2022 * INCOME_TO_2024 / 100) * 100;
}
/* The top 1% split into five bands so the ultra-wealthy are visible.
 * Household counts are proportional slices of CBO's 1.2M top-1% households.
 * The bands' relative incomes follow IRS SOI's shape of the top tail; the
 * shape is scaled so the bands' aggregate income is CBO's top-1% aggregate
 * carried to 2024. */
const TOP_BANDS = namedRegistry<string, { hhM: number; shape: number }>('TOP_BANDS', {
  t9950: { hhM: 0.60, shape: 1300000 }, t9970: { hhM: 0.24, shape: 2000000 },
  t9990: { hhM: 0.24, shape: 3350000 }, t9999: { hhM: 0.108, shape: 8200000 },
  t10000: { hhM: 0.012, shape: 41000000 }
});
function topBand(id: string): { hhM: number; avgIncome: number } {
  let shapeAggregate = 0;
  Object.values(TOP_BANDS.entries).forEach(function (b) { shapeAggregate += b.hhM * b.shape; });
  const target = CBO_2022_INCOME.top1HhM * CBO_2022_INCOME.top1 * INCOME_TO_2024;
  const band = lookupOrThrow(TOP_BANDS, id);
  return { hhM: band.hhM, avgIncome: Math.round(band.shape * target / shapeAggregate / 1000) * 1000 };
}

/* ---- Income groups (CBO 2022, carried to the 2024 economy) ---------------
 * hhM: households, millions (CBO; quintiles hold equal PEOPLE, so household
 * counts differ). avgIncome: household income before transfers & taxes.
 * curRate: average federal tax rate, all federal taxes (CBO Table 1/9).
 * Share columns each sum to 1.0 across groups:
 *   wageShare - share of payroll-taxed earnings (derived from CBO's
 *                  payroll-rate-by-group × income matrix)
 *   capShare - share of capital income (derived from CBO's imputed
 *                  corporate-tax burden by group)
 *   consumpShare - share of total consumption (BLS CES 2024; top-quintile
 *                  split by declining consumption propensity)
 *   healthRelief - share of replaced household health spending (CES 2024
 *                  healthcare outlays by quintile: $3,445 → $9,771 bottom
 *                  to top - only a 3:1 spread against a 16:1 income spread,
 *                  which is why relief is so progressive as % of income)
 * ------------------------------------------------------------------------ */
export const GROUPS: TaxGroup[] = [
  { id: "q1",    label: "Lowest 20%",  hhM: 26.4, avgIncome: income2024(CBO_2022_INCOME.q1),
    curRate: 0.014, wageShare: 0.05,  capShare: 0.015, consumpShare: 0.09,  healthRelief: 0.11 },
  { id: "q2",    label: "20–40%",      hhM: 26.9, avgIncome: income2024(CBO_2022_INCOME.q2),
    curRate: 0.095, wageShare: 0.10,  capShare: 0.035, consumpShare: 0.13,  healthRelief: 0.155 },
  { id: "q3",    label: "Middle 20%",  hhM: 26.4, avgIncome: income2024(CBO_2022_INCOME.q3),
    curRate: 0.134, wageShare: 0.155, capShare: 0.06,  consumpShare: 0.17,  healthRelief: 0.185 },
  { id: "q4",    label: "60–80%",      hhM: 25.9, avgIncome: income2024(CBO_2022_INCOME.q4),
    curRate: 0.176, wageShare: 0.245, capShare: 0.10,  consumpShare: 0.23,  healthRelief: 0.235 },
  { id: "d9",    label: "80–90%",      hhM: 12.8, avgIncome: income2024(CBO_2022_INCOME.d9),
    curRate: 0.208, wageShare: 0.17,  capShare: 0.105, consumpShare: 0.155, healthRelief: 0.14 },
  { id: "p9199", label: "90–99%",      hhM: 11.4, avgIncome: income2024(CBO_2022_INCOME.p9199),
    curRate: 0.247, wageShare: 0.235, capShare: 0.225, consumpShare: 0.18,  healthRelief: 0.15 },
  /* The five top-1% bands (TOP_BANDS above). Current-law rates follow the
   * documented pattern of DECLINING effective rates at the extreme top
   * (capital gains dominate; IRS top-400 data shows ~23-26%).
   * Wage/capital/consumption/relief shares are the old top-1% totals
   * allocated across bands by labor income and Fed DFA wealth. Derived,
   * medium confidence.                                                    */
  { id: "t9950", label: "99–99.5%",    ...topBand("t9950"), g: "top",
    curRate: 0.325, wageShare: 0.022, capShare: 0.109, consumpShare: 0.020, healthRelief: 0.013 },
  { id: "t9970", label: "99.5–99.7%",  ...topBand("t9970"), g: "top",
    curRate: 0.330, wageShare: 0.008, capShare: 0.071, consumpShare: 0.008, healthRelief: 0.005 },
  { id: "t9990", label: "99.7–99.9%",  ...topBand("t9990"), g: "top",
    curRate: 0.325, wageShare: 0.008, capShare: 0.071, consumpShare: 0.008, healthRelief: 0.004 },
  { id: "t9999", label: "99.9–99.99%", ...topBand("t9999"), g: "top",
    curRate: 0.300, wageShare: 0.005, capShare: 0.100, consumpShare: 0.006, healthRelief: 0.002 },
  { id: "t10000", label: "Top 0.01%",  ...topBand("t10000"), g: "top",
    curRate: 0.260, wageShare: 0.002, capShare: 0.109, consumpShare: 0.003, healthRelief: 0.001 }
];
/* Provenance: incomes/rates/households HIGH confidence (CBO workbook);
 * wage & capital shares MEDIUM (derived from CBO Table 9 rate matrix);
 * consumption MEDIUM (CES 2024, consumer units ≠ CBO households);
 * healthRelief MEDIUM (CES 2024 outlay pattern; bottom-quintile relief is
 * real - Medicare premiums, marketplace plans - even though most premium
 * relief accrues to employer-covered middle groups). */

/* R47 [§S18]: what the effective-rate chart's "current law" point is, said
 * where the chart is. `curRate` is each group's average federal tax rate in
 * CBO's table, held at that year, while `distribution()` grows incomes to
 * the year the reader selects. The income tax brackets are indexed to prices,
 * not to real income, so current-law rates would drift up as real incomes
 * grow, and the chart shows both points lower than they would be in later
 * years. Neither point's distance from the other moves: `newRate - curRate`
 * is the package's tax over income, which does not read `curRate`. The year
 * is the rates' own vintage, DATASET_VINTAGES' GROUPS entry (review 3 of P24:
 * it was read from the household-count declaration, a proxy for it), so the
 * sentence and the table cannot name different years. */
export function currentLawRateNote(): string {
  const groups = DATASET_VINTAGES.filter(function (v) { return v.id === 'GROUPS'; })[0];
  if (!groups) throw new Error('DATASET_VINTAGES declares no GROUPS vintage');
  const year = groups.dataYear;
  return 'The current-law point is each group\'s average federal tax rate in ' +
    year + ', from CBO, held at that level. Incomes grow to the year selected ' +
    'above faster than prices, and income tax brackets rise only with prices, ' +
    'so in later years current-law rates would be higher than shown and both ' +
    'points sit too low by about the same amount. The distance between them, ' +
    'which is what the package adds, does not depend on it.';
}

/* ---- Economy-wide aggregates (2024$) ------------------------------------ */
export const ECON: TaxEcon = {
  wagesB: 13700,        // Medicare (HI) taxable earnings 2024 ≈ $13.7T - the
                        // uncapped payroll base (SSA contributions ÷ 2.9%)
  aboveCapShare: 0.17,  // share of covered earnings above the SS cap (SSA: 83% below)
  /* Owner, 2026-10-12: both were read by nothing. They bound the payroll
     instruments' scores (payrollYieldFaults in taxmodel.ts), and the
     above-cap share is what sscap's description states, read rather than
     retyped.
     Review 3 of P24 asked why the employer contribution, which the plan
     calls payroll-based, does not read wagesB. The plan leaves that
     contribution's base and rate to later statute
     (research/framework_v2_extract.md, the financing ledger's FL-03 note),
     and the healthcare model measures it as a share of current employer
     health spending (params.ts employerCapture, from the CMS sponsor
     table). A rate on wagesB would need a rate no source sets.
     Owner, 2026-10-14: kept as that bound, a check and not a revenue
     input; the payroll scores stay their scorers'. */
  baseYear: 2024,
  /* Real growth by base class. Top capital compounds faster than the
   * economy; that is the concentration story in the charts above, and the
   * revenue model has to reflect it. Fed DFA: top-0.1% net worth grew at
   * ~7% nominal CAGR 1989-2025, roughly 4.3% real; 4.0% used here as a
   * conservative round figure. Wages follow the healthcare model's 1.2%
   * real wage-cost growth; broad income/GDP bases grow at 1.9% (CBO).   */
  growthRates: { gdp: 0.019, wages: 0.012, top: TOP_CAPITAL_REAL_GROWTH }
};

/* ---- Each instrument's scorer path ----------------------------------------
 * P25 (owner, 2026-10-14 and 2026-10-15). Every score is the scorer's own
 * figures re-based to the 2024 economy by the one rule in score-rebase.ts.
 * Each path is the scorer's table as published: billions of nominal dollars,
 * revenue raised positive, years of the economy the path names. research/06,
 * "Re-basing each score to the 2024 economy", says where each was read. A
 * build row holds each path typed from a scorer's year-by-year table to the
 * total the scorer prints, so a typo in one of those cannot pass for a
 * source. Three paths have no table to typo: the IRS and inheritance figures
 * are window totals, and the letter's path is solved from the two totals the
 * letter prints; the row holds that solve to the ten-year total (review 1 of
 * P25: the row had counted all three as checked). Each path declares its
 * kind (score-rebase.ts).
 *
 * Corrections that ride on this, found reading the scorers' tables:
 * - The wealth tax applied the Saez and Zucman letter's 15% avoidance twice.
 *   The letter's $351B for 2023 is already net of it ("We assume a 15% tax
 *   avoidance/evasion rate", the table's note); the instrument took 85% of it
 *   again, and dated it to 2021 when it is the letter's 2023 figure.
 * - JCT's estate figure (FY2021-31), TPC's millionaires surtax (FY2019-29)
 *   and TPC's inheritance estimate (FY2020-30) each cover eleven fiscal
 *   years and had been divided by ten. The rule reads the path itself.
 * ------------------------------------------------------------------------ */
function millions(xs: number[]): number[] { return xs.map(function (x) { return x / 1000; }); }
const FY2025_34 = yearRange(2025, 2034);
/* CBO's estimate of increased IRS funding (September 2, 2021): about $200B
   of revenue over 2022-2031 from $80B of funding, of which CBO puts about
   $60B on enforcement and its operations support. The instrument is the
   enforcement, so its score is the revenue net of that spending. */
export const IRS_FUNDING_FIGURES = { revenue10yrB: 200, enforcementSpend10yrB: 60, firstYear: 2022, lastYear: 2031 };
/* TPC's estimate for Batchelder's inheritance tax at a $2.5M lifetime
   exemption, FY2020-30 (Batchelder 2020, Table 3). Owner, 2026-10-19: the
   table gives two rows, both net of repealing today's estate and gift taxes
   ($284B lost over the window): the inheritance tax with constructive
   realization of accrued gains on gifts and bequests ($337B), and the
   inheritance tax alone ($168B). The model's capital gains reform already
   taxes gains at transfer (Treasury's design treats death as a realization
   event), so the instrument takes the inheritance tax alone and the gains
   stay with the reform; withRealizationB is the row it no longer uses. */
export const INHERITANCE_FIGURES = {
  exemption: 2500000, windowTotalB: 168, withRealizationB: 337, estateRepealB: 284,
  firstYear: 2020, lastYear: 2030
};
/* Owner, 2026-10-19: the two taxes on a wealth transfer are alternatives.
   The inheritance tax repeals the estate and gift taxes (its score is net of
   that repeal), so it cannot run beside estate restoration, which
   strengthens them: with both on, the model would count the restored estate
   tax and an inheritance tax that has repealed it. */
export const WEALTH_TRANSFER_GROUP = 'wealth-transfer';
export const SCORE_PATHS = namedRegistry<string, ScorePath>('SCORE_PATHS', {
  /* CBO Option 61, a 1% payroll tax on all earnings */
  payroll: { economy: 'cbo-2024-02', kind: 'table', years: FY2025_34, statedTotalB: 1281.5,
    valuesB: [56.7, 118.2, 122.8, 127.2, 131.1, 135.3, 140.1, 145.0, 150.0, 155.0] },
  /* CBO Option 62, earnings above $250,000 */
  sscap: { economy: 'cbo-2024-02', kind: 'table', years: FY2025_34, statedTotalB: 1426.8,
    valuesB: [35.7, 122.0, 129.4, 136.7, 143.7, 152.5, 161.7, 171.5, 181.5, 192.0] },
  /* CBO Option 64, one percentage point on the corporate rate */
  corp: { economy: 'cbo-2024-02', kind: 'table', years: FY2025_34, statedTotalB: 135.7,
    valuesB: [7.5, 12.7, 13.6, 13.7, 14.1, 14.4, 14.5, 14.6, 14.9, 15.7] },
  /* CBO Option 72, a 5% VAT on a broad base, effective January 2026 */
  vat: { economy: 'cbo-2024-02', kind: 'table', years: FY2025_34, statedTotalB: 3380,
    valuesB: [0, 230, 350, 360, 370, 390, 400, 410, 430, 440] },
  /* CBO Option 74, a 0.01% transactions tax (the deficit rises in 2025) */
  ftt: { economy: 'cbo-2024-02', kind: 'table', years: FY2025_34, statedTotalB: 296.8,
    valuesB: [-10.3, 10.3, 25.0, 32.7, 35.9, 37.6, 39.1, 40.6, 42.2, 43.8] },
  /* Treasury's FY2025 revenue table, millions: reform the taxation of
     capital income */
  capgains: { economy: 'omb-fy2025', kind: 'table', yearType: 'FY', years: FY2025_34, statedTotalB: 288.583,
    valuesB: millions([18031, 23713, 25164, 26417, 27624, 29050, 30727, 32158, 33758, 41941]) },
  /* the same table: the billionaire minimum income tax */
  bmin: { economy: 'omb-fy2025', kind: 'table', yearType: 'FY', years: FY2025_34, statedTotalB: 502.668,
    valuesB: millions([0, 50310, 56387, 59430, 60451, 59974, 59331, 53057, 50215, 53513]) },
  /* the same table: the global minimum tax revision */
  intl: { economy: 'omb-fy2025', kind: 'table', yearType: 'FY', years: FY2025_34, statedTotalB: 373.919,
    valuesB: millions([27920, 35889, 34589, 34819, 36215, 37719, 39261, 40846, 42483, 44178]) },
  /* the same table: the stock repurchase excise from 1% to 4% */
  buyback: { economy: 'omb-fy2025', kind: 'table', yearType: 'FY', years: FY2025_34, statedTotalB: 165.966,
    valuesB: millions([15344, 14980, 14936, 15184, 15792, 16458, 17167, 17912, 18691, 19502]) },
  /* JCT's letter on S.994 (March 24, 2021), FY2021-31 */
  estate: { economy: 'cbo-2021-02', kind: 'table', years: yearRange(2021, 2031), statedTotalB: 429.6,
    valuesB: [0.2, 6.1, 41.5, 46.0, 47.2, 49.1, 41.5, 43.8, 47.2, 51.3, 55.7] },
  /* TPC Table T19-0037, Option 3, FY2019-29 */
  msurtax: { economy: 'cbo-2019-01', kind: 'table', years: yearRange(2019, 2029), statedTotalB: 633.9,
    valuesB: [5.2, 22.8, 38.3, 54.4, 59.6, 65.2, 69.7, 72.0, 76.8, 82.4, 87.4] },
  /* the Saez and Zucman letter, 2023-2032 */
  wealth: SZ_WEALTH_PATH,
  inherit: windowTotal('cbo-2020-01', INHERITANCE_FIGURES.firstYear, INHERITANCE_FIGURES.lastYear,
    INHERITANCE_FIGURES.windowTotalB),
  enforce: windowTotal('cbo-2021-07', IRS_FUNDING_FIGURES.firstYear, IRS_FUNDING_FIGURES.lastYear,
    IRS_FUNDING_FIGURES.revenue10yrB - IRS_FUNDING_FIGURES.enforcementSpend10yrB)
});
/* CBO Option 45, one point on every ordinary income rate: the cross-check
   for the model's own surtax, read by the same rule. */
export const SURTAX_CROSSCHECK_PATH: ScorePath = { economy: 'cbo-2024-02', kind: 'table', years: FY2025_34,
  statedTotalB: 1185.3, valuesB: [82.3, 106.3, 106.4, 111.7, 116.5, 121.5, 126.8, 132.4, 137.9, 143.5] };

function lookupPath(id: string): ScorePath {
  return lookupOrThrow(SCORE_PATHS, id);
}
/* An instrument's score at its default setting: its path re-based, times
   the units its default carries, rounded to the billion. */
export function scoreOf(id: string, units = 1): number {
  return Math.round(rebaseTo2024(lookupPath(id)) * units);
}

/* ---- Tax instruments -----------------------------------------------------
 * rev1x - $B/yr at default setting (scale=1), 2024 economy, each computed
 * from its scorer's path by scoreOf(); the health-sector rent levy, which no
 * one has scored, is the plan's own figure.
 * kind 'scale' (slider, linear) or 'toggle'.
 * incidence sums to 1.0. phaseStart/phaseYears adjustable in the UI.
 * ------------------------------------------------------------------------ */
/* Review 3 of P24: the payroll and donut figures their descriptions and
   notes typed again, stated once. Review 4 of P24: exported, so the tests
   that refuse a typed copy compute what they look for from them instead of
   typing today's spelling of each. */
export const PAYROLL_FIGURES = { rate: 0.04, scaleMax: 3.0 };
/* Review 6 of P24: a rate in points, exact and without floating-point noise
   (0.07 x 100 is 7.000000000000001). Review 5 rounded the points to a tenth,
   which changed the score at a rate like 0.0425 while the yield check read
   the exact rate; the score, the notes and the yield check all read this,
   and print it with String(), one spelling. */
export function ratePoints(rate: number): number { return Math.round(rate * 1e6) / 1e4; }
/* the payroll rate in points, and its per-point annual score */
export const PAYROLL_RATE_POINTS = ratePoints(PAYROLL_FIGURES.rate);
export const PAYROLL_PER_POINT_B = scoreOf('payroll');
export const DONUT_FIGURES = { rate: 0.124, floor: 250000 };
/* The corporate default: points above today's statutory rate. */
export const CORP_FIGURES = { currentRate: 21, defaultPoints: 7, scaleMax: 2.0 };
/* The transactions tax: the slider setting that approximates TPC's 0.1%
   design after volume falls (the slider's maximum, and the Wealth-first
   package's setting). */
export const FTT_FIGURES = { tpcScale: 2.3 };
/* The VAT: CBO scores a 5% rate; the slider's 1.0 is 3 points. */
export const VAT_FIGURES = { scoredRate: 5, defaultPoints: 3, scaleMax: 3.33 };
/* The model's own surtax: the points it adds by group at scale 1, the share
   of income it treats as taxable, and the band either side of that share. */
export const SURTAX_FIGURES = {
  points: { q3: 1, q4: 2, d9: 3, p9199: 5, top: 8 } as Record<string, number>,
  taxableSharePct: 75, bandPts: 5
};
/* Each group's surtax at scale 1, $B a year: households (millions) times
   average income times the taxable share times the group's points. */
export function surtaxByGroup(groups: TaxGroup[] = GROUPS): Record<string, number> {
  const out: Record<string, number> = {};
  groups.forEach(function (g) {
    const pts = SURTAX_FIGURES.points[g.g === 'top' ? 'top' : g.id] || 0;
    out[g.id] = g.hhM * g.avgIncome * SURTAX_FIGURES.taxableSharePct / 100 * pts / 100 / 1000;
  });
  return out;
}

/* the plan's own figure for the health-sector rent levy, $B a year at
   scale 1: no external score exists, so it is the one rev1x typed (the
   branch review against main found its note typing it again) */
export const RENTS_PLAN_B = 20;
export const INSTRUMENTS: TaxInstrument[] = (function () {
  const P = PAYROLL_FIGURES, D = DONUT_FIGURES;
  /* Each score is computed from its source's figures (scoreOf), per point
     for the payroll rate and then times the default rate's exact points
     (review 4 of P24 found a 4.5-point default scored as 5; review 6, a
     4.25-point one as 4.3). */
  const PAYROLL_REV1X = PAYROLL_PER_POINT_B * PAYROLL_RATE_POINTS;
  /* the surtax is the model's own calculation on the groups above, so its
     score and its incidence come from the same sums */
  const surtaxEntries = Object.entries(surtaxByGroup());
  let surtaxSum = 0;
  surtaxEntries.forEach(function (e) { surtaxSum += e[1]; });
  const surtaxIncidence: Record<string, number> = {};
  surtaxEntries.forEach(function (e) { surtaxIncidence[e[0]] = Math.round(e[1] / surtaxSum * 1000) / 1000; });
  const SURTAX_REV1X = Math.round(surtaxSum);
  const SHARE = SURTAX_FIGURES.taxableSharePct, BAND = SURTAX_FIGURES.bandPts;
  const crossCheckPerPoint = Math.round(rebaseTo2024(SURTAX_CROSSCHECK_PATH));
  function windowText(id: string, p: ScorePath = lookupPath(id)): string {
    const total = citedTotal(p);
    return '$' + total.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) +
      'B over ' + yearSpan(p);
  }
  /* what the rule makes of a path, for the text beside it */
  const REBASED = ', re-based to the 2024 economy';
  const G = GROUPS;
  function mix(labor: number, capital: number): Record<string, number> {
    const out: Record<string, number> = {};
    G.forEach(function (g) {
      out[g.id] = labor * g.wageShare + capital * g.capShare;
    });
    return out;
  }
  function byCol(col: 'wageShare' | 'capShare' | 'consumpShare' | 'healthRelief'): Record<string, number> {
    const out: Record<string, number> = {};
    G.forEach(function (g) { out[g.id] = g[col]; });
    return out;
  }
  const corpPerPoint = rebaseTo2024(lookupPath('corp'));
  const vatPerPoint = rebaseTo2024(lookupPath('vat')) / VAT_FIGURES.scoredRate;
  const L = SZ_LETTER;

  return [
    {
      id: "surtax", label: "Progressive income surtax",
      desc: "Surtax on taxable income, rising by bracket: +" + SURTAX_FIGURES.points.q3 + "pp middle quintile, +" +
        SURTAX_FIGURES.points.q4 + "pp fourth, +" + SURTAX_FIGURES.points.d9 + "pp 80–90th, +" +
        SURTAX_FIGURES.points.p9199 + "pp 90–99th, +" + SURTAX_FIGURES.points.top +
        "pp above the 99th percentile (at scale 1.0). Bottom two quintiles exempt.",
      kind: "scale", default: 1.0, scaleMax: 2.5, rev1x: SURTAX_REV1X, growth: "gdp",
      incidence: surtaxIncidence,
      phaseStart: 2029, phaseYears: 4,
      scoredAgainst: "pre-obbba", estimatedBy: "model",
      scoreBasis: "This model's calculation on CBO's 2022 incomes, cross-checked against CBO Options 2025-2034, Option 45 (December 2024)",
      source: "Computed: CBO 2022 group incomes carried to the 2024 economy × " + SHARE +
        "% taxable share; cross-checked vs CBO Option 45 (+1pt all rates ≈ $" + crossCheckPerPoint + "B/yr" + REBASED + ")", confidence: "medium",
      /* R39 + R208 [§S5]: the largest instrument in the menu, the only major
         one without an official score, and the balancer in `goal-top` - so it
         absorbs every residual gap the others leave. The band comes from the
         one assumption the estimate is actually built on: a few points
         either way on the taxable share, which moves the revenue in
         proportion. It is not a
         confidence interval and does not pretend to be one; getting a scored
         estimate is the real answer and remains open. */
      revBand: {
        low: Math.round(SURTAX_REV1X * (SHARE - BAND) / SHARE),
        high: Math.round(SURTAX_REV1X * (SHARE + BAND) / SHARE),
        basis: "±" + BAND + " points on the " + SHARE + "% taxable share the derivation rests on (" +
          (SHARE - BAND) + "% to " + (SHARE + BAND) +
          "%). Not a published interval: no official score of this instrument exists, and obtaining one is the open item." }
    },
    {
      id: "payroll", label: "NHA payroll contribution (uncapped)",
      desc: "Flat payroll rate on all earnings, no cap; the premium-replacement workhorse. CBO convention: borne by workers via wages. CBO Option 61: 1% ≈ $" +
        PAYROLL_PER_POINT_B + "B/yr in the 2024 economy.",
      kind: "scale", default: 1.0, scaleMax: P.scaleMax, rev1x: PAYROLL_REV1X, growth: "wages",
      payrollBase: { rate: P.rate, earnings: "all" },
      defaultNote: "default " + String(PAYROLL_RATE_POINTS) + "pp; slider is a multiple (max " +
        String(ratePoints(P.rate * P.scaleMax)) + "pp)",
      incidence: byCol("wageShare"),
      phaseStart: 2031, phaseYears: 4,
      scoredAgainst: "pre-obbba", estimatedBy: "published",
      scoreBasis: "CBO Options 2025-2034 (December 2024)",
      source: "CBO Options 2025–2034, Option 61 (payroll surtax on all earnings: " + windowText("payroll") + " per point" + REBASED + ")", confidence: "high",
      /* R39 [§S5]: the other balancer. CBO publishes this as a point estimate
         against a scored 10-year window and attaches no interval to it, so a
         band here would be invented rather than sourced. Declared absent with
         the reason instead of quietly having none. */
      revBandAbsent: "CBO Option 61 is an official point estimate with no published interval; inventing a band around a scored figure would be less honest than stating there is none."
    },
    {
      id: "sscap", label: "Tax earnings above the SS cap ($" + D.floor / 1000 + "k donut)",
      /* owner 2026-10-12: the share is ECON's, read rather than retyped */
      desc: "Apply the " + (D.rate * 100).toFixed(1) + "% OASDI rate to earnings above $" +
        D.floor.toLocaleString("en-US") + " (CBO's donut design; about " +
        Math.round(ECON.aboveCapShare * 100) + "% of covered earnings are above today's cap).",
      kind: "toggle", default: true, rev1x: scoreOf("sscap"), growth: "wages",
      payrollBase: { rate: D.rate, earnings: "above-cap" },
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0.08, p9199: 0.62,
        t9950: 0.15, t9970: 0.06, t9990: 0.05, t9999: 0.03, t10000: 0.01 },
      phaseStart: 2028, phaseYears: 2,
      scoredAgainst: "pre-obbba", estimatedBy: "published",
      scoreBasis: "CBO Options 2025-2034 (December 2024)",
      source: "CBO Options 2025–2034, Option 62 (" + windowText("sscap") + REBASED + ")", confidence: "high"
    },
    {
      id: "corp", label: "Corporate rate increase",
      desc: "Points above the current " + CORP_FIGURES.currentRate + "% rate; CBO Dec 2024: ≈ $" + corpPerPoint.toFixed(1) +
        "B/yr per point in the 2024 economy. Incidence per CBO/JCT: 25% labor, 75% capital.",
      kind: "scale", default: 1.0, scaleMax: CORP_FIGURES.scaleMax,
      rev1x: scoreOf("corp", CORP_FIGURES.defaultPoints), growth: "gdp",
      defaultNote: "default +" + CORP_FIGURES.defaultPoints + "pp (→" + (CORP_FIGURES.currentRate + CORP_FIGURES.defaultPoints) +
        "%); slider is a multiple (max +" + CORP_FIGURES.defaultPoints * CORP_FIGURES.scaleMax + "pp)",
      incidence: mix(0.25, 0.75),
      phaseStart: 2028, phaseYears: 1,
      scoredAgainst: "pre-obbba", estimatedBy: "published",
      scoreBasis: "CBO Options 2025-2034 (December 2024)",
      source: "CBO Options 2025–2034, Option 64 (" + windowText("corp") + " per point" + REBASED + "); OBBBA expensing may lower near-term yield", confidence: "medium-high"
    },
    {
      id: "capgains", label: "Tax capital gains as ordinary income (>$1M)",
      desc: "Ordinary rates on gains and dividends for incomes above $1M. Only raises durable revenue when paired with taxing gains at death (Greenbook pairing); standalone high rates lose money to realization deferral.",
      kind: "toggle", default: true, rev1x: scoreOf("capgains"), growth: "top",
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0, p9199: 0.15,
        t9950: 0.15, t9970: 0.10, t9990: 0.20, t9999: 0.25, t10000: 0.15 },
      phaseStart: 2028, phaseYears: 1,
      scoredAgainst: "pre-obbba", estimatedBy: "published",
      scoreBasis: "Treasury FY2025 Greenbook (March 2024)",
      source: "Treasury FY2025 Greenbook (" + windowText("capgains") + REBASED + "); realization-elasticity caveat per CRS R41364", confidence: "medium"
    },
    {
      id: "wealth", label: "Extreme-wealth tax",
      desc: "2% above $50M + 4% additional above $1B. Saez–Zucman base: $10.97T above $50M, $3.28T above $1B (~100k households). The February 2021 letter's $" +
        L.firstYearB.total + "B for " + L.firstYear + " is already net of its " + Math.round(L.avoidance * 100) +
        "% avoidance and evasion assumption, and is re-based to the 2024 economy by its share of the letter's own GDP.",
      kind: "scale", default: 1.0, scaleMax: 1.5, rev1x: scoreOf("wealth"), growth: "top",
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0, p9199: 0,
        t9950: 0, t9970: 0, t9990: 0.10, t9999: 0.45, t10000: 0.45 },
      phaseStart: 2028, phaseYears: 2,
      scoredAgainst: "pre-obbba", estimatedBy: "published",
      scoreBasis: "Saez-Zucman revenue letter (February 2021)",
      source: "Saez–Zucman revenue letter (Feb 2021), " + Math.round(L.avoidance * 100) + "% avoidance already in its figures (" +
        windowText("wealth") + REBASED + "); no official JCT/CBO score exists and it is legally contested (the plan carries a fallback matrix)", confidence: "low-medium"
    },
    {
      id: "estate", label: "Estate tax restoration (99.5%-Act-style)", exclusiveGroup: WEALTH_TRANSFER_GROUP,
      desc: "Return toward a $3.5M exemption with graduated 45–65% rates. No current official score exists against the post-OBBBA $15M exemption; JCT scored the 2021 bill against the old baseline, ≈ $" +
        scoreOf("estate") + "B/yr in the 2024 economy.",
      kind: "toggle", default: true, rev1x: scoreOf("estate"), growth: "top",
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0, p9199: 0.10,
        t9950: 0.10, t9970: 0.10, t9990: 0.20, t9999: 0.30, t10000: 0.20 },
      phaseStart: 2028, phaseYears: 1,
      scoredAgainst: "pre-obbba", estimatedBy: "published",
      scoreBasis: "JCT score of S.994 (2021)",
      source: "JCT score of S.994 'For the 99.5 Percent Act' (" + windowText("estate") + ", 2021 baseline" + REBASED + "); no score exists against current law", confidence: "low-medium"
    },
    {
      id: "msurtax", label: "Millionaires surtax (+10pp over $2M income)",
      desc: "A 10-point surtax on all income, wages and capital alike, above $2M ($1M single). Hits roughly the top 0.2% of households; simple to administer because it rides the existing income tax.",
      kind: "toggle", default: true, rev1x: scoreOf("msurtax"), growth: "top",
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0, p9199: 0,
        t9950: 0.18, t9970: 0.14, t9990: 0.26, t9999: 0.27, t10000: 0.15 },
      phaseStart: 2029, phaseYears: 1,
      scoredAgainst: "pre-obbba", estimatedBy: "published",
      scoreBasis: "TPC Table T19-0037, against law as of September 6, 2019 (September 2019)",
      source: "TPC Table T19-0037 (September 23, 2019), the Van Hollen–Beyer design (10% surtax on AGI over $2M married, $1M others): " + windowText("msurtax") + REBASED, confidence: "medium-high"
    },
    {
      id: "bmin", label: "Billionaire minimum income tax (25% incl. unrealized gains)",
      desc: "A 25% minimum rate on total income including unrealized gains, for households worth over $100M (roughly the top 0.01–0.02%). Ends 'buy, borrow, die'. All of its incidence lands on the top 0.1%, the same base the wealth tax, estate restoration, millionaires surtax, capital-gains reform and inheritance tax reach, so those revenues are not additive: the model nets them rather than summing them, and this instrument carries the largest deduction of the six.",
      kind: "toggle", default: true, rev1x: scoreOf("bmin"), growth: "top",
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0, p9199: 0,
        t9950: 0, t9970: 0, t9990: 0, t9999: 0.35, t10000: 0.65 },
      phaseStart: 2029, phaseYears: 2,
      scoredAgainst: "pre-obbba", estimatedBy: "published",
      scoreBasis: "Treasury FY2025 Greenbook (March 2024)",
      source: "Treasury FY2025 Greenbook, Billionaire Minimum Income Tax: " + windowText("bmin") + REBASED, confidence: "medium"
    },
    {
      /* P25 (owner, 2026-10-15): the exemption is the one TPC scored. At $2M,
         which no one has scored, the figure was the model's reading between
         TPC's $2.5M and $1M estimates. */
      id: "inherit", label: "Inheritance income tax (heirs pay above $" + INHERITANCE_FIGURES.exemption / 1e6 + "M received)",
      exclusiveGroup: WEALTH_TRANSFER_GROUP,
      desc: "Taxes large inheritances as ordinary income to the heir, above a $" + INHERITANCE_FIGURES.exemption / 1e6 +
        "M lifetime exemption. Constitutionally solid (it is an income tax on the recipient), hard to avoid, and aimed at dynastic transfers rather than earned success. " +
        "It replaces the estate and gift taxes, so it and estate restoration are alternatives: turning one on turns the other off.",
      kind: "toggle", default: false, rev1x: scoreOf("inherit"), growth: "top",
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0, p9199: 0.10,
        t9950: 0.15, t9970: 0.15, t9990: 0.25, t9999: 0.25, t10000: 0.10 },
      phaseStart: 2029, phaseYears: 1,
      scoredAgainst: "pre-obbba", estimatedBy: "published",
      scoreBasis: "Batchelder (2020)",
      source: "TPC's estimate in Batchelder (Hamilton Project, 2020), Table 3: " + windowText("inherit") + " at a $" +
        INHERITANCE_FIGURES.exemption / 1e6 + "M lifetime exemption for the inheritance tax alone, net of repealing today's estate and gift taxes ($" +
        INHERITANCE_FIGURES.estateRepealB + "B lost over the window)" + REBASED + ". The full proposal's $" + INHERITANCE_FIGURES.withRealizationB +
        "B adds taxing accrued gains at transfer, which the capital gains reform already does", confidence: "medium"
    },
    {
      id: "intl", label: "International minimum tax and anti-shifting package",
      desc: "Pillar-2-style undertaxed-profits rule, tightened offshore rules, and information-exchange enforcement, so corporate and capital taxes cannot be dodged by moving paper profits abroad. A multiplier on every other capital-side instrument as much as a tax itself.",
      kind: "toggle", default: false, rev1x: scoreOf("intl"), growth: "gdp",
      incidence: mix(0.10, 0.90),
      phaseStart: 2028, phaseYears: 2,
      scoredAgainst: "pre-obbba", estimatedBy: "published",
      scoreBasis: "Treasury FY2025 Greenbook (March 2024)",
      source: "Treasury FY2025 Greenbook international reforms: " + windowText("intl") + REBASED, confidence: "medium"
    },
    {
      id: "enforce", label: "High-end IRS enforcement (close the top tax gap)",
      desc: "Sustained audit and collections capacity aimed at pass-throughs, partnerships, and high-wealth returns, where most of the ~$600B/yr gross tax gap sits. Every dollar here is tax already owed under current law.",
      kind: "toggle", default: false, rev1x: scoreOf("enforce"), growth: "gdp",
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0.02, d9: 0.05, p9199: 0.23,
        t9950: 0.20, t9970: 0.12, t9990: 0.15, t9999: 0.13, t10000: 0.10 },
      phaseStart: 2028, phaseYears: 3,
      scoredAgainst: "pre-obbba", estimatedBy: "published",
      scoreBasis: "CBO's estimate of the 2021 IRS funding proposal (September 2021)",
      /* P25: this was "$35B used", the model's reading between CBO's
         estimate and Treasury's, which differ by more than a factor of two
         and which no rule re-bases. CBO's, the official scorekeeper's, is
         the score now; Treasury's (May 2021) also counted a new
         information-reporting regime this instrument does not include. */
      source: "CBO, The Effects of Increased Funding for the IRS (September 2021): about $" + IRS_FUNDING_FIGURES.revenue10yrB +
        "B over " + yearSpan(lookupPath("enforce")) + ", net of the $" + IRS_FUNDING_FIGURES.enforcementSpend10yrB + "B of enforcement spending that raises it" + REBASED +
        ". Revenue ramps as new examiners train, so a mature program raises more than this window average.", confidence: "low-medium"
    },
    {
      id: "buyback", label: "Stock buyback excise, 1% to 4%",
      desc: "Raises the existing buyback excise to parity with dividend taxation. Small but clean: entirely capital-side, already administered.",
      kind: "toggle", default: false, rev1x: scoreOf("buyback"), growth: "top",
      incidence: mix(0, 1),
      phaseStart: 2028, phaseYears: 1,
      scoredAgainst: "pre-obbba", estimatedBy: "published",
      scoreBasis: "Treasury FY2025 Greenbook (March 2024)",
      source: "Treasury FY2025 Greenbook, raise the stock repurchase excise from 1% to 4%: " + windowText("buyback") + REBASED + " (the enacted 1% was JCT-scored in 2022)", confidence: "medium"
    },
    {
      id: "ftt", label: "Financial transactions tax",
      desc: "Securities and derivatives tax. Slider 1.0 is CBO's scored 0.01% design (~$" + scoreOf("ftt") + "B/yr in the 2024 economy); " +
        String(FTT_FIGURES.tpcScale) + " approximates a 0.1% rate after trading-volume response, per TPC (~$" +
        Math.round(scoreOf("ftt") * FTT_FIGURES.tpcScale) +
        "B/yr). The slider is revenue-calibrated rather than rate-linear because volume falls as the rate rises. Falls mostly on asset owners; a slice reaches pensions.",
      kind: "scale", default: 1.0, scaleMax: FTT_FIGURES.tpcScale, rev1x: scoreOf("ftt"), growth: "top",
      incidence: { q1: 0.013, q2: 0.032, q3: 0.068, q4: 0.14, d9: 0.10, p9199: 0.247,
        t9950: 0.09, t9970: 0.05, t9990: 0.06, t9999: 0.10, t10000: 0.10 },
      phaseStart: 2029, phaseYears: 1,
      scoredAgainst: "pre-obbba", estimatedBy: "published",
      scoreBasis: "CBO Options 2025-2034 (December 2024)",
      source: "CBO Options 2025–2034, Option 74 (" + windowText("ftt") + REBASED + "); incidence: TPC/Burman NTJ 2016 Table 6 (top quintile 74.7%, top 1% 40%)", confidence: "high"
    },
    {
      id: "vat", label: "Broad consumption tax (VAT)",
      desc: "Broad-base VAT; CBO: " + VAT_FIGURES.scoredRate + "% ≈ " + windowText("vat") + ", so ≈ $" + Math.round(vatPerPoint) +
        "B/yr per point in the 2024 economy. This is the regressive lever: CES data shows the bottom quintile consumes about twice its income while the top consumes 57%. Turn it on to see the trade-off.",
      kind: "scale", default: 0.0, scaleMax: VAT_FIGURES.scaleMax,
      rev1x: scoreOf("vat", VAT_FIGURES.defaultPoints / VAT_FIGURES.scoredRate), growth: "gdp", /* default 0 */
      defaultNote: "off by default; 1.0 on the slider = " + VAT_FIGURES.defaultPoints + "pp (max " +
        Math.round(VAT_FIGURES.defaultPoints * VAT_FIGURES.scaleMax) + "pp)",
      incidence: byCol("consumpShare"),
      phaseStart: 2032, phaseYears: 3,
      scoredAgainst: "pre-obbba", estimatedBy: "published",
      scoreBasis: "CBO Options 2025-2034 (December 2024)",
      source: "CBO Options 2025–2034, Option 72 (broad base: " + windowText("vat") + REBASED + "; narrow base scores $2,180B/10yr)", confidence: "high"
    },
    {
      /* R145 [§S11b]: off by default, on the VAT's precedent and for a
         different reason.

         Every other instrument in this list carries an external score - CBO
         option numbers, JCT scores of named bills, Treasury Greenbook lines,
         the Saez-Zucman letter. Three are graded low-medium and all three
         still cite one. This is the only instrument graded `low`, and the
         only one whose source is the framework describing its own design.
         $20B/yr for a windfall levy on health-sector monopoly rents is an
         order of magnitude, not an estimate, and nothing outside the plan
         supports it.

         It was `default: true` and enabled in all three goal scenarios, so
         every shipped configuration leaned on it. Turning it off moves the
         balancers by about 2.4% - surtax 1.568 to 1.606, payroll 1.988 to
         2.032 - and leaves coverage unchanged, because the sourced levers
         absorb it. The trade the reader can now see is the honest one: this
         is what the package costs without an uncosted instrument in it.

         It stays available manually, exactly as the VAT does, because the
         levy is in the plan and a reader is entitled to price it. */
      id: "rents", label: "Health-sector rent taxes",
      desc: "Windfall/extraction levies on monopoly rents in the health sector during transition (the plan's Title XIV).",
      kind: "toggle", default: false, rev1x: RENTS_PLAN_B, growth: "gdp",
      defaultNote: "off by default; no external estimate scores this levy, so the shipped packages do not lean on it",
      incidence: mix(0.10, 0.90),
      phaseStart: 2029, phaseYears: 2,
      scoredAgainst: "unscored", estimatedBy: "plan",
      scoreBasis: "No external score; the plan's own figure",
      source: "Plan design; order-of-magnitude only. No external score exists for a windfall levy on health-sector rents, so the $" + RENTS_PLAN_B + "B/yr is the plan's own figure and is graded accordingly.",
      confidence: "low"
    }
  ];
})();

/* ---- Instrument overlap at the top of the distribution -------------------
 * R144 + R42 + R36 [§S5]. `bmin`'s own description has always warned that it
 * "overlaps the wealth tax and the capital-gains reform; running all three at
 * once overstates combined revenue, so treat them as alternatives plus
 * toppers, not a simple sum." All three shipped goal scenarios enabled all
 * three anyway, the engine summed them with no deduction, and the balancer
 * then solved against that inflated total - so the required surtax or payroll
 * rate came out LOWER than the parameters imply. A warning in a description
 * field is not a control.
 *
 * Two decisions are separated here, because they have very different
 * evidential standing.
 *
 * 1. WHICH instruments overlap is DERIVED, not listed. An instrument joins
 *    the family when more than TOP01_THRESHOLD of its incidence lands on the
 *    top 0.1% (the t9999 and t10000 bands). The warning named three; six
 *    qualify - `bmin` 1.00, `wealth` 0.90, `estate` 0.50, `msurtax` 0.42,
 *    `capgains` 0.40, `inherit` 0.35 - and the next instrument down is
 *    `enforce` at 0.23. The threshold sits in that gap, and a self-test holds
 *    the gap open: if any instrument's share lands within TOP01_MARGIN of the
 *    threshold, the classification has stopped being obvious and the build
 *    fails rather than guessing.
 *
 * 2. HOW MUCH they overlap is a judgment, and is graded as one. Within the
 *    family the largest instrument in a given year is the anchor: it claims
 *    the shared base first and its revenue is untouched. Every other family
 *    member keeps the part of its revenue that lands outside the top 0.1%,
 *    and the part that lands inside is cut by `rate`. That is the arithmetic
 *    form of "alternatives plus toppers".
 *
 * `rate` is this model's judgment, with no published estimate behind it. The
 * central 0.50 sits between what the instrument pairs imply on their own
 * terms. Review 1 of the owner decisions: it was argued from four pairs, one
 * of them `estate` and `inherit`, which tax the two ends of one transfer
 * and are now alternatives (owner, 2026-10-19), never both on, so that pair
 * no longer meets here. It was a high-overlap pair, so losing it argues, if
 * anything, for a lower rate; no figure says how much lower (the pairs are
 * graded in words, not numbers). Review 2: the rate is unchanged pending the
 * owner, who has it as an open item, since moving it would move every
 * overlap-netted tile. The pairs: `wealth` (a levy on the stock) and `bmin` (a
 * minimum on the flow of appreciation) are two ways at the same gains, and a
 * real design would credit one against the other (high); the Greenbook
 * credits `bmin` prepayments against later realization, so `capgains`
 * overlaps it heavily at the very top (high); `msurtax` rides realized income
 * whose base the others partly pre-empt (moderate). The low/high are carried
 * so the UI can state the band rather than a false point estimate.
 * ------------------------------------------------------------------------ */
export interface OverlapModel {
  top01Bands: string[];
  top01Threshold: number;
  top01Margin: number;
  rate: { low: number; mode: number; high: number };
  source: string;
  confidence: string;
  note: string;
}
export const OVERLAP: OverlapModel = {
  top01Bands: ['t9999', 't10000'],
  top01Threshold: 0.30,
  top01Margin: 0.05,
  rate: { low: 0.30, mode: 0.50, high: 0.75 },
  source: "Model judgment. No published estimate of cross-instrument base overlap at the top 0.1% exists; the band spans what the instrument pairs imply on their own terms (wealth/bmin two routes to the same appreciation; Greenbook credits bmin against later realization).",
  confidence: "low",
  note: "Instruments concentrated on the top 0.1% tax overlapping slices of one base, so their revenues are not additive. The largest counts in full; the rest are cut on the part that lands there."
};

/* ---- Funding programs ------------------------------------------------------
 * The extensible half: anything that needs money is a program with a
 * need(year) → $B function. Healthcare's need path is linked live from the
 * NHA model at runtime (app wiring); more programs can be added in the UI.
 * ------------------------------------------------------------------------ */
export const PROGRAMS: TaxProgram[] = [
  {
    id: "nha", label: "National Health Assurance (new revenue requirement)",
    builtin: true, enabled: true,
    /* replaced at runtime with the live model path; fallback approximates
       the base-case path if the healthcare model isn't loaded */
    need: function (year: number): number {
      if (year < 2029) return 0;
      if (year < 2034) return (year - 2028) * 400;
      return Math.min(3400, 2000 + (year - 2033) * 200);
    },
    source: "Live from the healthcare model's financing module (mode run)"
  }
];

/* Custom programs added in the UI get: {id, label, amountB, start, rampYears,
 * enabled:true, need(year) computed from those} */
export function makeCustomProgram(label: string, amountB: number, start: number, rampYears: number): TaxProgram {
  return {
    id: "custom_" + Math.random().toString(36).slice(2, 8),
    label: label, builtin: false, enabled: true,
    amountB: amountB, start: start, rampYears: Math.max(0, rampYears || 0),
    need: function (year: number): number {
      if (year < start) return 0;
      /* R127 [§S6a]: rampYears is optional on the type and always set by the
         constructor above, which is a claim the compiler cannot check from
         inside a method. Read it once and handle the missing case. */
      const ramp = typeof this.rampYears === 'number' ? this.rampYears : 0;
      const r = ramp === 0 ? 1 : Math.min(1, (year - start + 1) / ramp);
      return amountB * r;
    },
    source: "User-defined"
  };
}

/* ---- Top marginal income tax rate, 1913-2025 -----------------------------
 * Step series: each entry applies from year y until the next entry.
 * Source: IRS SOI historical Table 23 / Tax Foundation "Historical U.S.
 * Federal Individual Income Tax Rates". The 1946-1951 values reflect the
 * statutory maximum-effective-rate cap. High confidence.                  */
export const TOP_RATE_HISTORY: TopRateHistoryEntry[] = [
  { y: 1913, r: 7 },   { y: 1916, r: 15 },  { y: 1917, r: 67 },
  { y: 1918, r: 77 },  { y: 1919, r: 73 },  { y: 1922, r: 58 },
  { y: 1924, r: 46 },  { y: 1925, r: 25 },  { y: 1930, r: 25 },
  { y: 1932, r: 63 },  { y: 1936, r: 79 },  { y: 1941, r: 81 },
  { y: 1942, r: 88 },  { y: 1944, r: 94 },  { y: 1946, r: 86.45 },
  { y: 1948, r: 82.13 },{ y: 1950, r: 84.36 },{ y: 1951, r: 91 },
  { y: 1952, r: 92 },  { y: 1954, r: 91 },  { y: 1964, r: 77 },
  { y: 1965, r: 70 },  { y: 1982, r: 50 },  { y: 1987, r: 38.5 },
  { y: 1988, r: 28 },  { y: 1991, r: 31 },  { y: 1993, r: 39.6 },
  { y: 2003, r: 35 },  { y: 2013, r: 39.6 }, { y: 2018, r: 37 },
  { y: 2025, r: 37 }
];
/* Presidencies for the chart's era labels (label: short display name) */
export const PRESIDENTS: PresidentEntry[] = [
  { y: 1913, name: "Wilson" },   { y: 1921, name: "Harding" },
  { y: 1923, name: "Coolidge" }, { y: 1929, name: "Hoover" },
  { y: 1933, name: "FDR" },      { y: 1945, name: "Truman" },
  { y: 1953, name: "Eisenhower" }, { y: 1961, name: "JFK" },
  { y: 1963, name: "LBJ" },      { y: 1969, name: "Nixon" },
  { y: 1974, name: "Ford" },     { y: 1977, name: "Carter" },
  { y: 1981, name: "Reagan" },   { y: 1989, name: "Bush" },
  { y: 1993, name: "Clinton" },  { y: 2001, name: "Bush 43" },
  { y: 2009, name: "Obama" },    { y: 2017, name: "Trump" },
  { y: 2021, name: "Biden" },    { y: 2025, name: "Trump" }
];

/* ---- Wealth concentration (Fed DFA 2026:Q1; top-tail split derived) ------
 * DFA publishes bottom 50 / 50-90 / 90-99 / 99-99.9 / top 0.1% ($174.0T
 * total). The 99.9-99.99 vs top-0.01% split and the 99-99.9 interior split
 * are derived from Saez-Zucman capitalization estimates and Forbes-list
 * aggregates (US billionaires ~$5.5-7T), constrained to DFA band totals.
 * avgWealth = wealth / households. Median household net worth ~$205k
 * (SCF 2022, inflated). Bands medium-high; interior splits medium.        */
/* ---- Dataset vintages, declared -----------------------------------------
 * R38 [§S5]. `research/06`'s cross-cutting flag 4 warns that the inputs span
 * CY2022, FY2025, CY2024 and 2026:Q1 and must be deflated consistently. Most
 * of that was honoured - CBO's 2022 incomes were inflated to 2024$ (P25
 * carries them to the 2024 economy instead), and `ECON.baseYear` is 2024 - but `WEALTH_DIST` carries
 * 2026:Q1 NOMINAL levels inside a 2024$ model with no deflation note. If it
 * is display-only that is defensible; it was not labelled as such, and
 * nothing stopped a later join.
 *
 * Both halves are declared here rather than left to a comment: the data year,
 * the dollar year, and whether the dataset participates in computation. Two
 * checks hold it. A computing dataset must be denominated in the model's own
 * base year, and a display-only dataset must not be reachable from the
 * revenue engine - which is the "later join" the row is actually about, and
 * which a label alone cannot prevent.
 * ------------------------------------------------------------------------ */
export interface DatasetVintage {
  id: string;
  dataYear: number;
  dollarYear: number;
  computes: boolean;
  note: string;
}
export const DATASET_VINTAGES: DatasetVintage[] = [
  { id: 'GROUPS', dataYear: 2022, dollarYear: 2024, computes: true,
    note: "CBO Distribution of Household Income 2022, carried to the 2024 economy by the growth of nominal GDP from 2022 to 2024." },
  { id: 'ECON', dataYear: 2024, dollarYear: 2024, computes: true,
    note: "Medicare taxable earnings 2024; growth rates are real, so they carry no dollar year of their own." },
  { id: 'INSTRUMENTS', dataYear: 2024, dollarYear: 2024, computes: true,
    note: "Every score but the plan's own rent levy is its scorer's estimate re-based to the 2024 economy: the estimate over the last five years of its window as a share of the scorer's GDP, times 2024 GDP." },
  { id: 'WEALTH_DIST', dataYear: 2026, dollarYear: 2026, computes: false,
    note: "Fed Distributional Financial Accounts 2026:Q1, NOMINAL. Display only - it drives the inequality chart and nothing else. It is not deflated to 2024$ and must not enter a revenue calculation without being deflated first." },
  { id: 'TOP_RATE_HISTORY', dataYear: 2025, dollarYear: 2025, computes: false,
    note: "IRS SOI historical Table 23. Statutory rates, not dollars; display only." },
  { id: 'PRESIDENTS', dataYear: 2025, dollarYear: 2025, computes: false,
    note: "Era labels for the rate chart. No dollars; display only." }
];

export const WEALTH_DIST: WealthDist = {
  totalT: 174.0, medianHH: 205000,
  groups: [
    { id: "b50",   label: "Bottom 50%",   hhM: 66.2,  wealthT: 4.27 },
    { id: "m4090", label: "50–90%",       hhM: 52.9,  wealthT: 51.5 },
    { id: "p9099", label: "90–99%",       hhM: 11.9,  wealthT: 63.2 },
    { id: "p9950", label: "99–99.5%",     hhM: 0.60,  wealthT: 13.0 },
    { id: "p9990", label: "99.5–99.9%",   hhM: 0.48,  wealthT: 17.0 },
    { id: "p9999", label: "99.9–99.99%",  hhM: 0.119, wealthT: 12.0 },
    { id: "top001", label: "Top 0.01%",   hhM: 0.0132, wealthT: 13.1 }
  ]
};

/* ---- Financing scenarios that MEET the goal ------------------------------
 * Each scenario is a full instrument configuration plus a designated
 * "balancer" instrument whose slider is solved automatically so revenue
 * covers the funding need (102% of the mature-year need and 100%
 * cumulatively, whichever binds harder). Selecting a scenario applies and
 * solves it; every control stays editable afterward, and the coverage
 * tiles keep telling the truth. Two instruments are excluded from
 * all goal scenarios, for two different reasons, and both remain available
 * manually for anyone who wants to see the trade-off: the VAT because
 * consumption taxes are regressive, and the health-sector rent levy (R145,
 * §S11b) because it is the one instrument here with no external score behind
 * its number.                                                           */
export const SCENARIOS: TaxScenario[] = [
  {
    id: "goal-top", name: "Wealth-first", balancer: "surtax",
    desc: "Leans hardest on where the money is: wealth tax at 1.2x, billionaire minimum, millionaires surtax, inheritance-as-income, buyback parity, the 0.1%-equivalent transactions tax, and the full enforcement and international packages. The progressive income surtax (bottom 40% exempt) auto-scales to close whatever gap remains.",
    settings: {
      surtax: { value: 1.0 }, payroll: { value: 1.0 }, sscap: { enabled: true, value: 1 },
      corp: { value: 1.0 }, capgains: { enabled: true, value: 1 },
      wealth: { value: 1.2 }, estate: { enabled: false, value: 0 },
      msurtax: { enabled: true, value: 1 }, bmin: { enabled: true, value: 1 },
      ftt: { value: FTT_FIGURES.tpcScale }, inherit: { enabled: true, value: 1 },
      intl: { enabled: true, value: 1 }, enforce: { enabled: true, value: 1 },
      buyback: { enabled: true, value: 1 }, vat: { value: 0, enabled: false },
      rents: { enabled: false, value: 1 }
    }
  },
  {
    id: "goal-shared", name: "Broad shoulders", balancer: "payroll",
    desc: "The uncapped payroll contribution carries more of the load alongside the full top-end package, with estate tax restoration as its transfer tax, trading some progressivity for a revenue base that cannot flee or defer. The bottom quintiles still finish far ahead: their premiums and bills disappear while their payroll share stays small. Payroll auto-scales to close the gap.",
    settings: {
      surtax: { value: 1.0 }, payroll: { value: 1.25 }, sscap: { enabled: true, value: 1 },
      corp: { value: 1.0 }, capgains: { enabled: true, value: 1 },
      wealth: { value: 1.0 }, estate: { enabled: true, value: 1 },
      msurtax: { enabled: true, value: 1 }, bmin: { enabled: true, value: 1 },
      ftt: { value: 1.0 }, inherit: { enabled: false, value: 0 },
      intl: { enabled: true, value: 1 }, enforce: { enabled: true, value: 1 },
      buyback: { enabled: true, value: 1 }, vat: { value: 0, enabled: false },
      rents: { enabled: false, value: 1 }
    }
  },
  {
    id: "goal-realist", name: "Avoidance-skeptic", balancer: "payroll",
    desc: "Assumes the contested instruments underdeliver: the wealth tax at 60% of its estimate, and the weight shifted to the taxes hardest to dodge, the billionaire minimum, inheritance-as-income, enforcement of tax already owed, international coordination, and payroll. Less elegant, harder to strike down. Payroll auto-scales to close the gap.",
    settings: {
      surtax: { value: 1.3 }, payroll: { value: 1.25 }, sscap: { enabled: true, value: 1 },
      corp: { value: 1.3 }, capgains: { enabled: true, value: 1 },
      wealth: { value: 0.6 }, estate: { enabled: false, value: 0 },
      msurtax: { enabled: true, value: 1 }, bmin: { enabled: true, value: 1 },
      ftt: { value: FTT_FIGURES.tpcScale }, inherit: { enabled: true, value: 1 },
      intl: { enabled: true, value: 1 }, enforce: { enabled: true, value: 1 },
      buyback: { enabled: true, value: 1 }, vat: { value: 0, enabled: false },
      rents: { enabled: false, value: 1 }
    }
  },
  {
    id: "custom", name: "Custom (no auto-balance)", balancer: null,
    /* review 4 of P24: the payroll rate read, not typed */
    desc: "The original default package with no balancing: the wealth tax, surtax, payroll at " +
      String(PAYROLL_RATE_POINTS) + " points, and the scored standards, with the newer ultra-wealth instruments off. " +
      "Edit freely; the coverage tile tells you where you stand.",
    settings: {}
  }
];
