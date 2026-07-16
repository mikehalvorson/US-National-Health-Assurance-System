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
  { id: "top1",  label: "Top 1%",      hhM: 1.2,  avgIncome: 2873800,
    curRate: 0.315, wageShare: 0.045, capShare: 0.46,  consumpShare: 0.045, healthRelief: 0.025 }
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
  realGrowth: 0.019,    // real growth of tax bases; matches healthcare model
  baseYear: 2024
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
      desc: "Surtax on taxable income, rising by bracket: +1pp middle quintile, +2pp fourth, +3pp 80–90th, +5pp 90–99th, +8pp top 1% (at scale 1.0). Bottom two quintiles exempt.",
      kind: "scale", default: 1.0, scaleMax: 2.5, rev1x: 527,
      incidence: { q1: 0, q2: 0, q3: 0.038, q4: 0.112, d9: 0.123, p9199: 0.335, top1: 0.392 },
      phaseStart: 2029, phaseYears: 4,
      source: "Computed: CBO 2022 group incomes × 75% taxable share; cross-checked vs CBO Option 45 (+1pt all rates ≈ $118B/yr)", confidence: "medium"
    },
    {
      id: "payroll", label: "NHA payroll contribution (uncapped)",
      desc: "Flat payroll rate on all earnings, no cap; the premium-replacement workhorse. CBO convention: borne by workers via wages. CBO Option 61: 1% ≈ $128B/yr.",
      kind: "scale", default: 1.0, scaleMax: 3.0, rev1x: 512, /* default = 4pp */
      defaultNote: "default 4.0pp; slider is a multiple (max 12pp)",
      incidence: byCol("wageShare"),
      phaseStart: 2031, phaseYears: 4,
      source: "CBO Options 2025–2034, Option 61 (payroll surtax on all earnings: $1,281.5B/10yr per point)", confidence: "high"
    },
    {
      id: "sscap", label: "Tax earnings above the SS cap ($250k donut)",
      desc: "Apply the 12.4% OASDI rate to earnings above $250,000 (CBO's donut design; ~17% of covered earnings are above today's cap).",
      kind: "toggle", default: true, rev1x: 143,
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0.08, p9199: 0.62, top1: 0.30 },
      phaseStart: 2028, phaseYears: 2,
      source: "CBO Options 2025–2034, Option 62 ($1,426.8B/10yr)", confidence: "high"
    },
    {
      id: "corp", label: "Corporate rate increase",
      desc: "Points above the current 21% rate; CBO Dec 2024: ≈ $13.6B/yr per point (21→28% ≈ $0.95T/10yr; older ~$1.3T scores used a pre-2024 base). Incidence per CBO/JCT: 25% labor, 75% capital.",
      kind: "scale", default: 1.0, scaleMax: 2.0, rev1x: 95, /* default = +7pp */
      defaultNote: "default +7pp (→28%); slider is a multiple (max +14pp)",
      incidence: mix(0.25, 0.75),
      phaseStart: 2028, phaseYears: 1,
      source: "CBO Options 2025–2034, Option 64 ($135.7B/10yr per point); OBBBA expensing may lower near-term yield", confidence: "medium-high"
    },
    {
      id: "capgains", label: "Tax capital gains as ordinary income (>$1M)",
      desc: "Ordinary rates on gains and dividends for incomes above $1M. Only raises durable revenue when paired with taxing gains at death (Greenbook pairing); standalone high rates lose money to realization deferral.",
      kind: "toggle", default: true, rev1x: 29,
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0, p9199: 0.15, top1: 0.85 },
      phaseStart: 2028, phaseYears: 1,
      source: "Treasury FY2025 Greenbook ($288.5B/10yr); realization-elasticity caveat per CRS R41364", confidence: "medium"
    },
    {
      id: "wealth", label: "Extreme-wealth tax",
      desc: "2% above $50M + 4% additional above $1B, at 85% collection efficiency. Saez–Zucman base: $10.97T above $50M, $3.28T above $1B (~100k households); gross ≈ $351B/yr.",
      kind: "scale", default: 1.0, scaleMax: 1.5, rev1x: 300,
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0, p9199: 0, top1: 1.0 },
      phaseStart: 2028, phaseYears: 2,
      source: "Saez–Zucman revenue letter (Feb 2021), 15% avoidance; no official JCT/CBO score exists and it is legally contested (the framework carries a fallback matrix)", confidence: "low-medium"
    },
    {
      id: "estate", label: "Estate tax restoration (99.5%-Act-style)",
      desc: "Return toward a $3.5M exemption with graduated 45–65% rates. No current official score exists against the post-OBBBA $15M exemption; JCT scored the 2021 bill at ~$43B/yr against the old baseline.",
      kind: "toggle", default: true, rev1x: 40,
      incidence: { q1: 0, q2: 0, q3: 0, q4: 0, d9: 0, p9199: 0.10, top1: 0.90 },
      phaseStart: 2028, phaseYears: 1,
      source: "JCT score of S.994 'For the 99.5 Percent Act' ($429.6B/10yr, 2021 baseline); flagged as a gap, needs re-basing", confidence: "low-medium"
    },
    {
      id: "ftt", label: "Financial transactions tax (0.01%, CBO option)",
      desc: "1 basis point on securities and derivative payments, CBO's scored design (a 0.1% version is a different, larger proposal; TPC pegs the revenue-maximizing rate near 0.34%). Falls mostly on asset owners; a slice reaches pensions.",
      kind: "toggle", default: true, rev1x: 30,
      incidence: { q1: 0.013, q2: 0.032, q3: 0.068, q4: 0.14, d9: 0.10, p9199: 0.247, top1: 0.40 },
      phaseStart: 2029, phaseYears: 1,
      source: "CBO Options 2025–2034, Option 74 ($296.8B/10yr); incidence: TPC/Burman NTJ 2016 Table 6 (top quintile 74.7%, top 1% 40%)", confidence: "high"
    },
    {
      id: "vat", label: "Broad consumption tax (VAT)",
      desc: "Broad-base VAT; CBO: 5% ≈ $3,380B/10yr, so ≈ $68B/yr per point. This is the regressive lever: CES data shows the bottom quintile consumes about twice its income while the top consumes 57%. Turn it on to see the trade-off.",
      kind: "scale", default: 0.0, scaleMax: 3.33, rev1x: 204, /* default 0; 1.0 = 3pp */
      defaultNote: "off by default; 1.0 on the slider = 3pp (max 10pp)",
      incidence: byCol("consumpShare"),
      phaseStart: 2032, phaseYears: 3,
      source: "CBO Options 2025–2034, Option 72 (broad base; narrow base scores $2,180B/10yr)", confidence: "high"
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
