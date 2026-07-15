/* =========================================================================
 * U.S. tax system model — parameter base
 *
 * A generic, extensible tax-financing model: income groups × instruments ×
 * years. Built to fund ANY set of programs (healthcare is just the first),
 * with instruments that can phase in over time to meet varied funding needs.
 *
 * Seeded values are labeled with source + confidence, same convention as the
 * healthcare model. Group table follows CBO's "Distribution of Household
 * Income and Federal Taxes" format (2021 data year scaled to ~2024 levels);
 * pending reconciliation against research/06_tax_distribution_financing.md.
 * All dollars: real 2024 dollars. All revenues: $ billions/year.
 * ========================================================================= */
"use strict";
var NHA = window.NHA || {};
window.NHA = NHA;
NHA.TAX = {};

/* ---- Income groups (CBO format) ----------------------------------------
 * hhM: households (millions). avgIncome: average household income before
 * transfers and taxes, ~2024$. curRate: current-law average federal tax
 * rate, all federal taxes combined (CBO 2021, adjusted toward a normal
 * non-pandemic year). Shares columns are each group's share of the named
 * national aggregate (each column sums to 1.0):
 *   wageShare      — share of total wages & salaries (payroll incidence)
 *   capShare       — share of capital income/asset ownership (corporate 75%,
 *                    cap-gains, FTT incidence)
 *   consumpShare   — share of total consumption (VAT incidence, BLS CES)
 *   healthRelief   — share of the household health spending that NHA
 *                    replaces (premium shares + OOP; low at the bottom
 *                    because Medicaid already covers many low-income
 *                    households — they gain coverage, not bill relief)
 * ------------------------------------------------------------------------ */
NHA.TAX.GROUPS = [
  { id: "q1",   label: "Lowest 20%",  hhM: 26.44, avgIncome: 33000,
    curRate: 0.015, wageShare: 0.03, capShare: 0.01, consumpShare: 0.09, healthRelief: 0.063 },
  { id: "q2",   label: "20–40%",      hhM: 26.44, avgIncome: 74000,
    curRate: 0.070, wageShare: 0.08, capShare: 0.02, consumpShare: 0.13, healthRelief: 0.145 },
  { id: "q3",   label: "Middle 20%",  hhM: 26.44, avgIncome: 119000,
    curRate: 0.125, wageShare: 0.14, capShare: 0.04, consumpShare: 0.17, healthRelief: 0.214 },
  { id: "q4",   label: "60–80%",      hhM: 26.44, avgIncome: 184000,
    curRate: 0.165, wageShare: 0.22, capShare: 0.08, consumpShare: 0.22, healthRelief: 0.261 },
  { id: "d9",   label: "80–90%",      hhM: 13.22, avgIncome: 267000,
    curRate: 0.195, wageShare: 0.18, capShare: 0.10, consumpShare: 0.14, healthRelief: 0.147 },
  { id: "p9199", label: "90–99%",     hhM: 11.90, avgIncome: 453000,
    curRate: 0.230, wageShare: 0.25, capShare: 0.35, consumpShare: 0.18, healthRelief: 0.150 },
  { id: "top1", label: "Top 1%",      hhM: 1.32,  avgIncome: 3200000,
    curRate: 0.300, wageShare: 0.10, capShare: 0.40, consumpShare: 0.07, healthRelief: 0.020 }
];
/* Sources: CBO Distribution of Household Income and Federal Taxes (2021 data,
 * pub. 2024) for incomes/rates [medium — scaled to 2024]; SSA/BEA for wage
 * shares [medium]; Fed Distributional Financial Accounts for capital shares
 * [medium]; BLS Consumer Expenditure Survey for consumption [medium];
 * KFF/MEPS spending patterns for health-relief shares [low-medium, derived]. */

/* ---- Economy-wide aggregates (2024$) ------------------------------------ */
NHA.TAX.ECON = {
  wagesB: 11600,        // total U.S. wages & salaries, $B (BEA 2024) [high]
  aboveCapShare: 0.175, // share of wages above the SS taxable max (SSA) [medium]
  realGrowth: 0.019,    // real growth of tax bases, matches healthcare model [high]
  baseYear: 2024
};

/* ---- Tax instruments -----------------------------------------------------
 * Each instrument:
 *   rev1x     — $B/yr at the default setting (scale=1), 2024 economy
 *   kind      — 'scale' (continuous slider, revenue linear in scale) or
 *               'toggle' (on/off)
 *   scaleMax  — slider max (in units of the default), for 'scale'
 *   incidence — {groupId: share of burden}, sums to 1.0
 *   phaseStart/phaseYears — default schedule (adjustable): revenue ramps
 *               linearly from phaseStart over phaseYears
 *   source/confidence — provenance of the revenue estimate
 * Incidence conventions (CBO/JCT): employer payroll → workers via wages;
 * corporate → 25% labor + 75% capital.
 * ------------------------------------------------------------------------ */
(function () {
  var G = NHA.TAX.GROUPS;
  function mix(labor, capital) {
    /* corporate-style blend: share × wageShare + share × capShare */
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
      desc: "Surtax on taxable income, rising by bracket: +1pp middle quintile, +2pp fourth, +3pp 80–90th, +5pp 90–99th, +8pp top 1% (at scale 1.0). Bottom two quintiles exempt.",
      kind: "scale", default: 1.0, scaleMax: 2.5, rev1x: 630,
      incidence: { q1: 0, q2: 0, q3: 0.037, q4: 0.116, d9: 0.125, p9199: 0.320, top1: 0.402 },
      phaseStart: 2029, phaseYears: 4,
      source: "Computed from group taxable income (CBO distribution × ~75% taxable share)", confidence: "medium"
    },
    {
      id: "payroll", label: "NHA payroll contribution (uncapped)",
      desc: "Flat employer-side payroll rate on all wages, no cap — the premium-replacement workhorse. CBO convention: borne by workers via wages. Each 1pp ≈ $110B/yr.",
      kind: "scale", default: 1.0, scaleMax: 3.0, rev1x: 440, /* default = 4pp */
      defaultNote: "default 4.0pp; slider is a multiple (max 12pp)",
      incidence: byCol("wageShare"),
      phaseStart: 2031, phaseYears: 4,
      source: "BEA wage base × rate, 95% compliance; CBO payroll option scoring", confidence: "medium-high"
    },
    {
      id: "sscap", label: "Eliminate Social Security payroll cap",
      desc: "Apply the 12.4% OASDI rate to earnings above the taxable maximum (~17.5% of wages are above the cap today).",
      kind: "toggle", default: true, rev1x: 150,
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0.10, p9199: 0.60, top1: 0.30 },
      phaseStart: 2028, phaseYears: 2,
      source: "CBO Options for Reducing the Deficit (payroll cap options)", confidence: "medium-high"
    },
    {
      id: "corp", label: "Corporate rate increase",
      desc: "Points above the current 21% rate; ≈ $15B/yr per point (28% ≈ $105B/yr). Incidence per CBO/JCT: 25% labor, 75% capital.",
      kind: "scale", default: 1.0, scaleMax: 2.0, rev1x: 105, /* default = +7pp */
      defaultNote: "default +7pp (→28%); slider is a multiple (max +14pp)",
      incidence: mix(0.25, 0.75),
      phaseStart: 2028, phaseYears: 1,
      source: "CBO/JCT corporate rate scoring (~$1.3T/10yr for 21→28)", confidence: "medium-high"
    },
    {
      id: "capgains", label: "Tax capital gains as ordinary income (>$1M)",
      desc: "Ordinary rates on gains and dividends for incomes above $1M, with realization-elasticity haircut already applied.",
      kind: "toggle", default: true, rev1x: 35,
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0, p9199: 0.15, top1: 0.85 },
      phaseStart: 2028, phaseYears: 1,
      source: "JCT-convention scoring with behavioral response; mark-to-market variants score far higher but are legally untested", confidence: "medium"
    },
    {
      id: "wealth", label: "Extreme-wealth tax",
      desc: "2% above $50M + 4% additional above $1B, at 85% collection efficiency (the framework's own instrument; Saez-Zucman gross ≈ $351B/yr).",
      kind: "scale", default: 1.0, scaleMax: 1.5, rev1x: 300,
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0, p9199: 0, top1: 1.0 },
      phaseStart: 2028, phaseYears: 2,
      source: "Saez–Zucman revenue memo (2021), 15% avoidance; legally contested — see framework's fallback matrix", confidence: "low-medium"
    },
    {
      id: "estate", label: "Restore 2009 estate tax",
      desc: "2009 exemption/rate parameters ($3.5M exemption, 45% rate).",
      kind: "toggle", default: true, rev1x: 25,
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0, p9199: 0.10, top1: 0.90 },
      phaseStart: 2028, phaseYears: 1,
      source: "CBO Options (estate tax variants)", confidence: "medium-high"
    },
    {
      id: "ftt", label: "Financial transactions tax (0.1%)",
      desc: "0.1% on securities transactions. Falls mostly on asset owners; a slice reaches pensions and 401(k)s across the distribution.",
      kind: "toggle", default: true, rev1x: 60,
      incidence: { q1: 0.01, q2: 0.02, q3: 0.04, q4: 0.08, d9: 0.12, p9199: 0.33, top1: 0.40 },
      phaseStart: 2029, phaseYears: 1,
      source: "CBO Options (FTT, 0.1%)", confidence: "medium"
    },
    {
      id: "vat", label: "Broad consumption tax (VAT)",
      desc: "Broad-base VAT; ≈ $62B/yr per point. The regressive lever — burden follows consumption, which is a much larger share of income at the bottom. Use it to see the trade-off.",
      kind: "scale", default: 0.0, scaleMax: 3.33, rev1x: 186, /* default 0; 1.0 = 3pp */
      defaultNote: "off by default; 1.0 on the slider = 3pp (max 10pp)",
      incidence: byCol("consumpShare"),
      phaseStart: 2032, phaseYears: 3,
      source: "CBO Options (5% broad VAT ≈ $310B/yr)", confidence: "medium-high"
    },
    {
      id: "rents", label: "Health-sector rent taxes",
      desc: "Windfall/extraction levies on monopoly rents in the health sector during transition (framework Title XIV).",
      kind: "toggle", default: true, rev1x: 20,
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
