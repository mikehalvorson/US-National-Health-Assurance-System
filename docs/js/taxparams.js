/* =========================================================================
 * U.S. tax system model — parameter base (reconciled)
 *
 * A generic, extensible tax-financing model: income groups × instruments ×
 * years. Built to fund ANY set of programs (healthcare is just the first),
 * with instruments that phase in over time to meet varied funding needs.
 *
 * RECONCILED against research/06_tax_distribution_financing.md (primary
 * sources pulled 2026-07-15):
 *  - Income groups: CBO, "The Distribution of Household Income, 2022"
 *    (pub. Jan 2026), supplemental-data workbook. CBO's 2022 dollars are
 *    inflated to 2024$ by the PCE factor ≈ 1.064. The 91–99th group is a
 *    weighted combination of CBO's 91–95 and 96–99 rows.
 *  - Instrument scores: CBO "Options for Reducing the Deficit: 2025–2034"
 *    (Dec 2024, JCT staff), Treasury FY2025 Greenbook, Saez–Zucman (2021),
 *    JCT 99.5%-Act letter. Annualized from 10-year scores.
 *  - Incidence: CBO/JCT conventions (employer payroll → workers, CBO WP
 *    2021-06; corporate → 25% labor / 75% capital, JCX-14-13); CES 2024
 *    consumption shares; TPC/Burman FTT table (NTJ 2016, Table 6).
 *  - Wage/capital shares derived from CBO's tax-rate-by-tax-type matrix
 *    (supplemental Table 9) × group incomes.
 * All dollars: real 2024 dollars. All revenues: $ billions/year.
 * Known limits: CBO options predate the July 2025 reconciliation act
 * (OBBBA) — scores tied to the old baseline are noted per instrument.
 * ========================================================================= */
"use strict";
var NHA = window.NHA || {};
window.NHA = NHA;
NHA.TAX = {};

/* ---- Income groups (CBO 2022, → 2024$) ----------------------------------
 * hhM: households, millions (CBO; quintiles hold equal PEOPLE, so household
 * counts differ). avgIncome: household income before transfers & taxes.
 * curRate: average federal tax rate, all federal taxes (CBO Table 1/9).
 * Share columns each sum to 1.0 across groups:
 *   wageShare    — share of payroll-taxed earnings (derived from CBO's
 *                  payroll-rate-by-group × income matrix)
 *   capShare     — share of capital income (derived from CBO's imputed
 *                  corporate-tax burden by group)
 *   consumpShare — share of total consumption (BLS CES 2024; top-quintile
 *                  split by declining consumption propensity)
 *   healthRelief — share of replaced household health spending (CES 2024
 *                  healthcare outlays by quintile: $3,445 → $9,771 bottom
 *                  to top — only a 3:1 spread against a 16:1 income spread,
 *                  which is why relief is so progressive as % of income)
 * ------------------------------------------------------------------------ */
NHA.TAX.GROUPS = [
  { id: "q1",    label: "Lowest 20%",  hhM: 26.4, avgIncome: 27900,
    curRate: 0.014, wageShare: 0.05,  capShare: 0.015, consumpShare: 0.09,  healthRelief: 0.11 },
  { id: "q2",    label: "20–40%",      hhM: 26.9, avgIncome: 62900,
    curRate: 0.095, wageShare: 0.10,  capShare: 0.035, consumpShare: 0.13,  healthRelief: 0.155 },
  { id: "q3",    label: "Middle 20%",  hhM: 26.4, avgIncome: 100000,
    curRate: 0.134, wageShare: 0.155, capShare: 0.06,  consumpShare: 0.17,  healthRelief: 0.185 },
  { id: "q4",    label: "60–80%",      hhM: 25.9, avgIncome: 152300,
    curRate: 0.176, wageShare: 0.245, capShare: 0.10,  consumpShare: 0.23,  healthRelief: 0.235 },
  { id: "d9",    label: "80–90%",      hhM: 12.8, avgIncome: 225500,
    curRate: 0.208, wageShare: 0.17,  capShare: 0.105, consumpShare: 0.155, healthRelief: 0.14 },
  { id: "p9199", label: "90–99%",      hhM: 11.4, avgIncome: 413400,
    curRate: 0.247, wageShare: 0.235, capShare: 0.225, consumpShare: 0.18,  healthRelief: 0.15 },
  /* The top 1% split into five bands so the ultra-wealthy are visible.
   * Household counts are proportional slices of CBO's 1.2M top-1%
   * households; band average incomes are derived from IRS SOI's shape of
   * the top tail, constrained to reproduce CBO's top-1% aggregate income
   * ($3.44T) exactly. Current-law rates follow the documented pattern of
   * DECLINING effective rates at the extreme top (capital gains dominate;
   * IRS top-400 data shows ~23-26%). Wage/capital/consumption/relief
   * shares are the old top-1% totals allocated across bands by labor
   * income and Fed DFA wealth. Derived, medium confidence.               */
  { id: "t9950", label: "99–99.5%",    hhM: 0.60,  avgIncome: 1300000, g: "top",
    curRate: 0.325, wageShare: 0.022, capShare: 0.109, consumpShare: 0.020, healthRelief: 0.013 },
  { id: "t9970", label: "99.5–99.7%",  hhM: 0.24,  avgIncome: 2000000, g: "top",
    curRate: 0.330, wageShare: 0.008, capShare: 0.071, consumpShare: 0.008, healthRelief: 0.005 },
  { id: "t9990", label: "99.7–99.9%",  hhM: 0.24,  avgIncome: 3350000, g: "top",
    curRate: 0.325, wageShare: 0.008, capShare: 0.071, consumpShare: 0.008, healthRelief: 0.004 },
  { id: "t9999", label: "99.9–99.99%", hhM: 0.108, avgIncome: 8200000, g: "top",
    curRate: 0.300, wageShare: 0.005, capShare: 0.100, consumpShare: 0.006, healthRelief: 0.002 },
  { id: "t10000", label: "Top 0.01%",  hhM: 0.012, avgIncome: 41000000, g: "top",
    curRate: 0.260, wageShare: 0.002, capShare: 0.109, consumpShare: 0.003, healthRelief: 0.001 }
];
/* Provenance: incomes/rates/households HIGH confidence (CBO workbook);
 * wage & capital shares MEDIUM (derived from CBO Table 9 rate matrix);
 * consumption MEDIUM (CES 2024, consumer units ≠ CBO households);
 * healthRelief MEDIUM (CES 2024 outlay pattern; bottom-quintile relief is
 * real — Medicare premiums, marketplace plans — even though most premium
 * relief accrues to employer-covered middle groups). */

/* ---- Economy-wide aggregates (2024$) ------------------------------------ */
NHA.TAX.ECON = {
  wagesB: 13700,        // Medicare (HI) taxable earnings 2024 ≈ $13.7T — the
                        // uncapped payroll base (SSA contributions ÷ 2.9%)
  aboveCapShare: 0.17,  // share of covered earnings above the SS cap (SSA: 83% below)
  realGrowth: 0.019,    // legacy default (GDP class); kept for compatibility
  baseYear: 2024,
  /* Real growth by base class. Top capital compounds faster than the
   * economy; that is the concentration story in the charts above, and the
   * revenue model has to reflect it. Fed DFA: top-0.1% net worth grew at
   * ~7% nominal CAGR 1989-2025, roughly 4.3% real; 4.0% used here as a
   * conservative round figure. Wages follow the healthcare model's 1.2%
   * real wage-cost growth; broad income/GDP bases grow at 1.9% (CBO).   */
  growthRates: { gdp: 0.019, wages: 0.012, top: 0.040 }
};

/* ---- Tax instruments -----------------------------------------------------
 * rev1x — $B/yr at default setting (scale=1), 2024 economy (annualized from
 * the cited 10-year scores). kind 'scale' (slider, linear) or 'toggle'.
 * incidence sums to 1.0. phaseStart/phaseYears adjustable in the UI.
 * ------------------------------------------------------------------------ */
(function () {
  var G = NHA.TAX.GROUPS;
  function mix(labor, capital) {
    var out = {};
    G.forEach(function (g) {
      out[g.id] = labor * g.wageShare + capital * g.capShare;
    });
    return out;
  }
  function byCol(col) {
    var out = {};
    G.forEach(function (g) { out[g.id] = g[col]; });
    return out;
  }

  NHA.TAX.INSTRUMENTS = [
    {
      id: "surtax", label: "Progressive income surtax",
      desc: "Surtax on taxable income, rising by bracket: +1pp middle quintile, +2pp fourth, +3pp 80–90th, +5pp 90–99th, +8pp above the 99th percentile (at scale 1.0). Bottom two quintiles exempt.",
      kind: "scale", default: 1.0, scaleMax: 2.5, rev1x: 527, growth: "gdp",
      incidence: { q1: 0, q2: 0, q3: 0.038, q4: 0.112, d9: 0.123, p9199: 0.335,
        t9950: 0.088, t9970: 0.055, t9990: 0.092, t9999: 0.101, t10000: 0.056 },
      phaseStart: 2029, phaseYears: 4,
      source: "Computed: CBO 2022 group incomes × 75% taxable share; cross-checked vs CBO Option 45 (+1pt all rates ≈ $118B/yr)", confidence: "medium"
    },
    {
      id: "payroll", label: "NHA payroll contribution (uncapped)",
      desc: "Flat payroll rate on all earnings, no cap; the premium-replacement workhorse. CBO convention: borne by workers via wages. CBO Option 61: 1% ≈ $128B/yr.",
      kind: "scale", default: 1.0, scaleMax: 3.0, rev1x: 512, growth: "wages", /* default = 4pp */
      defaultNote: "default 4.0pp; slider is a multiple (max 12pp)",
      incidence: byCol("wageShare"),
      phaseStart: 2031, phaseYears: 4,
      source: "CBO Options 2025–2034, Option 61 (payroll surtax on all earnings: $1,281.5B/10yr per point)", confidence: "high"
    },
    {
      id: "sscap", label: "Tax earnings above the SS cap ($250k donut)",
      desc: "Apply the 12.4% OASDI rate to earnings above $250,000 (CBO's donut design; ~17% of covered earnings are above today's cap).",
      kind: "toggle", default: true, rev1x: 143, growth: "wages",
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0.08, p9199: 0.62,
        t9950: 0.15, t9970: 0.06, t9990: 0.05, t9999: 0.03, t10000: 0.01 },
      phaseStart: 2028, phaseYears: 2,
      source: "CBO Options 2025–2034, Option 62 ($1,426.8B/10yr)", confidence: "high"
    },
    {
      id: "corp", label: "Corporate rate increase",
      desc: "Points above the current 21% rate; CBO Dec 2024: ≈ $13.6B/yr per point (21→28% ≈ $0.95T/10yr; older ~$1.3T scores used a pre-2024 base). Incidence per CBO/JCT: 25% labor, 75% capital.",
      kind: "scale", default: 1.0, scaleMax: 2.0, rev1x: 95, growth: "gdp", /* default = +7pp */
      defaultNote: "default +7pp (→28%); slider is a multiple (max +14pp)",
      incidence: mix(0.25, 0.75),
      phaseStart: 2028, phaseYears: 1,
      source: "CBO Options 2025–2034, Option 64 ($135.7B/10yr per point); OBBBA expensing may lower near-term yield", confidence: "medium-high"
    },
    {
      id: "capgains", label: "Tax capital gains as ordinary income (>$1M)",
      desc: "Ordinary rates on gains and dividends for incomes above $1M. Only raises durable revenue when paired with taxing gains at death (Greenbook pairing); standalone high rates lose money to realization deferral.",
      kind: "toggle", default: true, rev1x: 29, growth: "top",
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0, p9199: 0.15,
        t9950: 0.15, t9970: 0.10, t9990: 0.20, t9999: 0.25, t10000: 0.15 },
      phaseStart: 2028, phaseYears: 1,
      source: "Treasury FY2025 Greenbook ($288.5B/10yr); realization-elasticity caveat per CRS R41364", confidence: "medium"
    },
    {
      id: "wealth", label: "Extreme-wealth tax",
      desc: "2% above $50M + 4% additional above $1B, at 85% collection efficiency. Saez–Zucman base: $10.97T above $50M, $3.28T above $1B (~100k households); gross ≈ $351B/yr.",
      kind: "scale", default: 1.0, scaleMax: 1.5, rev1x: 300, growth: "top",
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0, p9199: 0,
        t9950: 0, t9970: 0, t9990: 0.10, t9999: 0.45, t10000: 0.45 },
      phaseStart: 2028, phaseYears: 2,
      source: "Saez–Zucman revenue letter (Feb 2021), 15% avoidance; no official JCT/CBO score exists and it is legally contested (the plan carries a fallback matrix)", confidence: "low-medium"
    },
    {
      id: "estate", label: "Estate tax restoration (99.5%-Act-style)",
      desc: "Return toward a $3.5M exemption with graduated 45–65% rates. No current official score exists against the post-OBBBA $15M exemption; JCT scored the 2021 bill at ~$43B/yr against the old baseline.",
      kind: "toggle", default: true, rev1x: 40, growth: "top",
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0, p9199: 0.10,
        t9950: 0.10, t9970: 0.10, t9990: 0.20, t9999: 0.30, t10000: 0.20 },
      phaseStart: 2028, phaseYears: 1,
      source: "JCT score of S.994 'For the 99.5 Percent Act' ($429.6B/10yr, 2021 baseline); flagged as a gap, needs re-basing", confidence: "low-medium"
    },
    {
      id: "msurtax", label: "Millionaires surtax (+10pp over $2M income)",
      desc: "A 10-point surtax on all income, wages and capital alike, above $2M ($1M single). Hits roughly the top 0.2% of households; simple to administer because it rides the existing income tax.",
      kind: "toggle", default: true, rev1x: 64, growth: "top",
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0, p9199: 0,
        t9950: 0.18, t9970: 0.14, t9990: 0.26, t9999: 0.27, t10000: 0.15 },
      phaseStart: 2029, phaseYears: 1,
      source: "TPC score of the Millionaires Surtax Act (Van Hollen–Beyer): ~$635B/10yr", confidence: "medium-high"
    },
    {
      id: "bmin", label: "Billionaire minimum income tax (25% incl. unrealized gains)",
      desc: "A 25% minimum rate on total income including unrealized gains, for households worth over $100M (roughly the top 0.01–0.02%). Ends 'buy, borrow, die'. Overlaps the wealth tax and the capital-gains reform; running all three at once overstates combined revenue, so treat them as alternatives plus toppers, not a simple sum.",
      kind: "toggle", default: true, rev1x: 50, growth: "top",
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0, p9199: 0,
        t9950: 0, t9970: 0, t9990: 0, t9999: 0.35, t10000: 0.65 },
      phaseStart: 2029, phaseYears: 2,
      source: "Treasury FY2025 Greenbook, Billionaire Minimum Income Tax: $503B/10yr", confidence: "medium"
    },
    {
      id: "inherit", label: "Inheritance income tax (heirs pay above $2M received)",
      desc: "Taxes large inheritances as ordinary income to the heir, above a $2M lifetime exemption. Constitutionally solid (it is an income tax on the recipient), hard to avoid, and aimed at dynastic transfers rather than earned success.",
      kind: "toggle", default: false, rev1x: 40, growth: "top",
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0, p9199: 0.10,
        t9950: 0.15, t9970: 0.15, t9990: 0.25, t9999: 0.25, t10000: 0.10 },
      phaseStart: 2029, phaseYears: 1,
      source: "Batchelder (NYU/Treasury, 2020): inheritance-as-income proposals score $34-90B/yr depending on exemption; $40B/yr used", confidence: "medium"
    },
    {
      id: "intl", label: "International minimum tax and anti-shifting package",
      desc: "Pillar-2-style undertaxed-profits rule, tightened offshore rules, and information-exchange enforcement, so corporate and capital taxes cannot be dodged by moving paper profits abroad. A multiplier on every other capital-side instrument as much as a tax itself.",
      kind: "toggle", default: false, rev1x: 37, growth: "gdp",
      incidence: mix(0.10, 0.90),
      phaseStart: 2028, phaseYears: 2,
      source: "Treasury FY2025 Greenbook international reforms: ~$374B/10yr", confidence: "medium"
    },
    {
      id: "enforce", label: "High-end IRS enforcement (close the top tax gap)",
      desc: "Sustained audit and collections capacity aimed at pass-throughs, partnerships, and high-wealth returns, where most of the ~$600B/yr gross tax gap sits. Every dollar here is tax already owed under current law.",
      kind: "toggle", default: false, rev1x: 35, growth: "gdp",
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0.02, d9: 0.05, p9199: 0.23,
        t9950: 0.20, t9970: 0.12, t9990: 0.15, t9999: 0.13, t10000: 0.10 },
      phaseStart: 2028, phaseYears: 3,
      source: "CBO and Treasury estimates of IRS enforcement ROI; net revenue $15-40B/yr at scale, $35B used", confidence: "low-medium"
    },
    {
      id: "buyback", label: "Stock buyback excise, 1% to 4%",
      desc: "Raises the existing buyback excise to parity with dividend taxation. Small but clean: entirely capital-side, already administered.",
      kind: "toggle", default: false, rev1x: 17, growth: "top",
      incidence: mix(0, 1),
      phaseStart: 2028, phaseYears: 1,
      source: "JCT-basis scoring of the enacted 1% excise scaled to 4% (~$166B/10yr additional)", confidence: "medium"
    },
    {
      id: "ftt", label: "Financial transactions tax",
      desc: "Securities and derivatives tax. Slider 1.0 is CBO's scored 0.01% design (~$30B/yr); 2.3 approximates a 0.1% rate after trading-volume response, per TPC (~$69B/yr). The slider is revenue-calibrated rather than rate-linear because volume falls as the rate rises. Falls mostly on asset owners; a slice reaches pensions.",
      kind: "scale", default: 1.0, scaleMax: 2.3, rev1x: 30, growth: "top",
      incidence: { q1: 0.013, q2: 0.032, q3: 0.068, q4: 0.14, d9: 0.10, p9199: 0.247,
        t9950: 0.09, t9970: 0.05, t9990: 0.06, t9999: 0.10, t10000: 0.10 },
      phaseStart: 2029, phaseYears: 1,
      source: "CBO Options 2025–2034, Option 74 ($296.8B/10yr); incidence: TPC/Burman NTJ 2016 Table 6 (top quintile 74.7%, top 1% 40%)", confidence: "high"
    },
    {
      id: "vat", label: "Broad consumption tax (VAT)",
      desc: "Broad-base VAT; CBO: 5% ≈ $3,380B/10yr, so ≈ $68B/yr per point. This is the regressive lever: CES data shows the bottom quintile consumes about twice its income while the top consumes 57%. Turn it on to see the trade-off.",
      kind: "scale", default: 0.0, scaleMax: 3.33, rev1x: 204, growth: "gdp", /* default 0; 1.0 = 3pp */
      defaultNote: "off by default; 1.0 on the slider = 3pp (max 10pp)",
      incidence: byCol("consumpShare"),
      phaseStart: 2032, phaseYears: 3,
      source: "CBO Options 2025–2034, Option 72 (broad base; narrow base scores $2,180B/10yr)", confidence: "high"
    },
    {
      id: "rents", label: "Health-sector rent taxes",
      desc: "Windfall/extraction levies on monopoly rents in the health sector during transition (the plan's Title XIV).",
      kind: "toggle", default: true, rev1x: 20, growth: "gdp",
      incidence: mix(0.10, 0.90),
      phaseStart: 2029, phaseYears: 2,
      source: "Framework design; order-of-magnitude only", confidence: "low"
    }
  ];
})();

/* ---- Funding programs ----------------------------------------------------
 * The extensible half: anything that needs money is a program with a
 * need(year) → $B function. Healthcare's need path is linked live from the
 * NHA model at runtime (app wiring); more programs can be added in the UI.
 * ------------------------------------------------------------------------ */
NHA.TAX.PROGRAMS = [
  {
    id: "nha", label: "National Health Assurance (new revenue requirement)",
    builtin: true, enabled: true,
    /* replaced at runtime with the live model path; fallback approximates
       the base-case path if the healthcare model isn't loaded */
    need: function (year) {
      if (year < 2029) return 0;
      if (year < 2034) return (year - 2028) * 400;
      return Math.min(3400, 2000 + (year - 2033) * 200);
    },
    source: "Live from the healthcare model's financing module (mode run)"
  }
];

/* Custom programs added in the UI get: {id, label, amountB, start, rampYears,
 * enabled:true, need(year) computed from those} */
NHA.TAX.makeCustomProgram = function (label, amountB, start, rampYears) {
  return {
    id: "custom_" + Math.random().toString(36).slice(2, 8),
    label: label, builtin: false, enabled: true,
    amountB: amountB, start: start, rampYears: Math.max(0, rampYears || 0),
    need: function (year) {
      if (year < start) return 0;
      var r = this.rampYears === 0 ? 1 : Math.min(1, (year - start + 1) / this.rampYears);
      return amountB * r;
    },
    source: "User-defined"
  };
};

/* ---- Top marginal income tax rate, 1913-2025 -----------------------------
 * Step series: each entry applies from year y until the next entry.
 * Source: IRS SOI historical Table 23 / Tax Foundation "Historical U.S.
 * Federal Individual Income Tax Rates". The 1946-1951 values reflect the
 * statutory maximum-effective-rate cap. High confidence.                  */
NHA.TAX.TOP_RATE_HISTORY = [
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
NHA.TAX.PRESIDENTS = [
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
NHA.TAX.WEALTH_DIST = {
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
 * tiles keep telling the truth. The VAT is excluded from all goal
 * scenarios because consumption taxes are regressive; it remains
 * available manually for anyone who wants to see that trade-off.        */
NHA.TAX.SCENARIOS = [
  {
    id: "goal-top", name: "Wealth-first", balancer: "surtax",
    desc: "Leans hardest on where the money is: wealth tax at 1.2x, billionaire minimum, millionaires surtax, inheritance-as-income, buyback parity, the 0.1%-equivalent transactions tax, and the full enforcement and international packages. The progressive income surtax (bottom 40% exempt) auto-scales to close whatever gap remains.",
    settings: {
      surtax: { value: 1.0 }, payroll: { value: 1.0 }, sscap: { enabled: true, value: 1 },
      corp: { value: 1.0 }, capgains: { enabled: true, value: 1 },
      wealth: { value: 1.2 }, estate: { enabled: true, value: 1 },
      msurtax: { enabled: true, value: 1 }, bmin: { enabled: true, value: 1 },
      ftt: { value: 2.3 }, inherit: { enabled: true, value: 1 },
      intl: { enabled: true, value: 1 }, enforce: { enabled: true, value: 1 },
      buyback: { enabled: true, value: 1 }, vat: { value: 0, enabled: false },
      rents: { enabled: true, value: 1 }
    }
  },
  {
    id: "goal-shared", name: "Broad shoulders", balancer: "payroll",
    desc: "The uncapped payroll contribution carries more of the load alongside the full top-end package, trading some progressivity for a revenue base that cannot flee or defer. The bottom quintiles still finish far ahead: their premiums and bills disappear while their payroll share stays small. Payroll auto-scales to close the gap.",
    settings: {
      surtax: { value: 1.0 }, payroll: { value: 1.25 }, sscap: { enabled: true, value: 1 },
      corp: { value: 1.0 }, capgains: { enabled: true, value: 1 },
      wealth: { value: 1.0 }, estate: { enabled: true, value: 1 },
      msurtax: { enabled: true, value: 1 }, bmin: { enabled: true, value: 1 },
      ftt: { value: 1.0 }, inherit: { enabled: true, value: 1 },
      intl: { enabled: true, value: 1 }, enforce: { enabled: true, value: 1 },
      buyback: { enabled: true, value: 1 }, vat: { value: 0, enabled: false },
      rents: { enabled: true, value: 1 }
    }
  },
  {
    id: "goal-realist", name: "Avoidance-skeptic", balancer: "payroll",
    desc: "Assumes the contested instruments underdeliver: the wealth tax at 60% of its estimate, and the weight shifted to the taxes hardest to dodge, the billionaire minimum, inheritance-as-income, enforcement of tax already owed, international coordination, and payroll. Less elegant, harder to strike down. Payroll auto-scales to close the gap.",
    settings: {
      surtax: { value: 1.3 }, payroll: { value: 1.25 }, sscap: { enabled: true, value: 1 },
      corp: { value: 1.3 }, capgains: { enabled: true, value: 1 },
      wealth: { value: 0.6 }, estate: { enabled: true, value: 1 },
      msurtax: { enabled: true, value: 1 }, bmin: { enabled: true, value: 1 },
      ftt: { value: 2.3 }, inherit: { enabled: true, value: 1 },
      intl: { enabled: true, value: 1 }, enforce: { enabled: true, value: 1 },
      buyback: { enabled: true, value: 1 }, vat: { value: 0, enabled: false },
      rents: { enabled: true, value: 1 }
    }
  },
  {
    id: "custom", name: "Custom (no auto-balance)", balancer: null,
    desc: "The original default package with no balancing: the wealth tax, surtax, payroll at 4 points, and the scored standards, with the newer ultra-wealth instruments off. Edit freely; the coverage tile tells you where you stand.",
    settings: {}
  }
];
