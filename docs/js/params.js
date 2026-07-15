/* =========================================================================
 * National Health Assurance Simulation — Parameter Base
 * =========================================================================
 * Every uncertain parameter is a triangular distribution (low / mode / high)
 * with a source citation and a confidence grade. Fixed calibration constants
 * (finalized CMS 2023 historical figures) are point values.
 *
 * DESIGN RULES (from HANDOFF.md):
 *  - Calibration base year is 2023 (last finalized CMS NHE historical year).
 *    All dollars are REAL 2023 dollars internally; the UI displays real 2024
 *    dollars via DEFLATOR_2023_TO_2024 so results are comparable with the
 *    framework's own "$4.75T in 2024 dollars" claim.
 *  - No parameter is tuned to reproduce the framework's claimed total.
 *  - Confidence grades: "high" = official government statistic or scored
 *    estimate; "medium" = reputable survey/study or derived combination;
 *    "low" = analyst assumption where no direct source exists (flagged
 *    visibly in the UI).
 * ========================================================================= */
"use strict";
var NHA = window.NHA || {};
window.NHA = NHA;

/* ---- Fixed calibration constants: CMS NHE 2023 (USD billions, nominal 2023) */
NHA.BASE2023 = {
  nheTotal:       4866.5,  // CMS NHE Fact Sheet 2023
  hospital:       1519.7,
  physician:       978.0,  // physician & clinical services
  otherProf:       159.9,  // other professional services
  dental:          173.8,
  otherPersonal:   270.2,  // other health, residential & personal care
  homeHealth:      147.8,
  nursing:         211.3,  // nursing care facilities & CCRC
  rxRetail:        449.7,  // retail prescription drugs
  dme:              72.8,  // durable medical equipment
  nondurables:     124.1,  // other non-durable medical products
  netInsCost:      302.9,  // net cost of private health insurance
  govtAdmin:        57.4,  // government program administration
  publicHealth:    160.2,  // govt public health activity (research file isolation; see note)
  gdp:           27720,    // BEA 2023 nominal GDP (~$27.72T); NHE/GDP = 17.6% ✓
  populationM:     334.0   // implied by CMS $14,570 per capita ✓
};
/* Investment residual (structures & equipment + noncommercial research):
 * derived so categories sum exactly to nheTotal. Flagged medium confidence —
 * see research/01 CP-TOT-004 note about the bundled CMS line. */
(function () {
  var b = NHA.BASE2023;
  var listed = b.hospital + b.physician + b.otherProf + b.dental +
    b.otherPersonal + b.homeHealth + b.nursing + b.rxRetail + b.dme +
    b.nondurables + b.netInsCost + b.govtAdmin + b.publicHealth;
  b.investmentResidual = +(b.nheTotal - listed).toFixed(1); // ≈ 238.7
})();

/* Express internal 2023-real dollars as 2024 dollars for display (CPI-U
 * 2023→2024 ≈ +2.9%; GDP deflator ≈ +2.4%. We use 2.6% mid). */
NHA.DEFLATOR_2023_TO_2024 = 1.026;

/* Simulation clock: enactment assumed calendar 2027 (Year 1 = Phase 0).
 * Baseline is grown from 2023 to 2026 before the policy clock starts. */
NHA.START_YEAR = 2027;
NHA.END_YEAR = 2042;
NHA.PRE_YEARS = 4; // 2023 -> 2027 growth applied before Year 1

/* Framework's own claim, for comparison display only (never a target).
 * Stated in real 2024 dollars. */
NHA.FRAMEWORK_CLAIM = { mode: 4750, low: 4300, high: 5250 };

/* ---- Uncertain parameters ------------------------------------------------
 * Each: { id, group, label, unit, low, mode, high, confidence, source, url,
 *         adjustable (bool → gets a UI slider on the mode value),
 *         sliderMin/sliderMax (bounds for the UI slider when adjustable) }
 * The Monte Carlo samples triangular(low, mode, high); UI sliders shift the
 * mode and proportionally shift low/high to preserve relative spread.
 * ------------------------------------------------------------------------ */
NHA.PARAM_DEFS = [

  /* == Macro trajectory ================================================== */
  {
    id: "baselineRealGrowth", group: "Macro", unit: "%/yr",
    label: "Baseline real health spending growth (status quo)",
    low: 2.6, mode: 3.4, high: 4.2,
    confidence: "high",
    source: "CMS NHE Projections 2024–33: nominal NHE growth 5.6–7.1%/yr, less ~2.3–2.6% inflation. Includes aging effect.",
    url: "https://www.cms.gov/files/document/nhe-projections-forecast-summary.pdf",
    adjustable: true, sliderMin: 1.5, sliderMax: 5.0
  },
  {
    id: "gdpRealGrowth", group: "Macro", unit: "%/yr",
    label: "Real GDP growth",
    low: 1.4, mode: 1.9, high: 2.4,
    confidence: "high",
    source: "CBO Budget and Economic Outlook 2025–2035 long-run real GDP growth.",
    url: "https://www.cbo.gov/publication/60870",
    adjustable: false
  },
  {
    id: "popGrowth", group: "Macro", unit: "%/yr",
    label: "Population growth",
    low: 0.2, mode: 0.4, high: 0.6,
    confidence: "high",
    source: "Census Vintage 2025 estimates (+0.5%/yr, slowing); CBO Demographic Outlook.",
    url: "https://www.census.gov/programs-surveys/popest.html",
    adjustable: false
  },

  /* == Demand response =================================================== */
  {
    id: "utilIncrease", group: "Demand", unit: "%",
    label: "Utilization increase at mature NHA (universal coverage + zero point-of-care cost)",
    low: 6, mode: 10, high: 16,
    confidence: "low",
    source: "DERIVED — no direct citation exists for this exact policy. Anchors: RAND Health Insurance Experiment arc elasticity ≈ −0.2; OOP is ~10.4% of NHE today; CBO single-payer working paper demand-increase discussion; 26.7M uninsured gaining full coverage (KFF 2024). Flagged in HANDOFF.md as the model's most consequential assumption.",
    url: "https://www.rand.org/health-care/projects/hie.html",
    adjustable: true, sliderMin: 0, sliderMax: 30
  },
  {
    id: "coverageDemandShare", group: "Demand", unit: "share",
    label: "Share of utilization increase attributable to covering the uninsured (vs. cost-sharing elimination)",
    low: 0.25, mode: 0.32, high: 0.40,
    confidence: "low",
    source: "DERIVED — uninsured ≈8% of population using roughly half average care; remainder of demand response comes from eliminating cost sharing for the already-insured.",
    url: "https://www.kff.org/uninsured/key-facts-about-the-uninsured-population/",
    adjustable: false
  },

  /* == Prices & payment ================================================== */
  {
    id: "providerPaymentFactor", group: "Payment", unit: "×",
    label: "Blended provider payment factor vs. current average rates (hospital + clinical)",
    low: 0.85, mode: 0.92, high: 1.00,
    confidence: "medium",
    source: "Commercial insurers pay ~254% of Medicare (RAND Hospital Price Transparency); global budgets blend rates down while Medicaid rates rise. Framework is 'capacity-first', so compression is modest vs. CBO's Medicare-rate options. 1.0 = no net rate change.",
    url: "https://www.rand.org/health-care/projects/price-transparency.html",
    adjustable: true, sliderMin: 0.75, sliderMax: 1.10
  },
  {
    id: "drugPriceCut", group: "Payment", unit: "%",
    label: "Net drug price reduction from national purchasing (mature)",
    low: 25, mode: 40, high: 55,
    confidence: "medium",
    source: "US net prices ~2.78× OECD peers overall, 4.22× brand (RAND RRA788-3 2024). IRA first-cycle negotiated cuts 38–79% list / ~22% net Medicare spending (CMS). Framework target SR-DRUG-002 is ≥55%. High end assumes full international-reference-level purchasing.",
    url: "https://www.rand.org/pubs/research_reports/RRA788-3.html",
    adjustable: true, sliderMin: 0, sliderMax: 65
  },
  {
    id: "embeddedDrugSpend", group: "Payment", unit: "$B (2023)",
    label: "Non-retail (hospital/clinic-administered) drug spend embedded in provider categories",
    low: 200, mode: 250, high: 300,
    confidence: "medium",
    source: "Total drug spend incl. non-retail estimated $680–730B vs. $449.7B retail (research/03, derived from CMS + IQVIA). Removed from hospital/clinical bases before payment factors to avoid double-count with drug savings.",
    url: "https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/nhe-fact-sheet",
    adjustable: false
  },

  /* == Administration ==================================================== */
  {
    id: "publicAdminRate", group: "Administration", unit: "% of public spend",
    label: "New public system administrative cost rate (claims, enrollment, operations)",
    low: 1.5, mode: 2.2, high: 3.2,
    confidence: "high",
    source: "CBO single-payer analysis: 1.5–2.0%; Taiwan NHI 1.07% (best-in-class); Urban/RAND cross-checks 5–6% fully loaded. Mode set above CBO to reflect the framework's heavier oversight/appeals architecture.",
    url: "https://www.cbo.gov/publication/56811",
    adjustable: true, sliderMin: 1.0, sliderMax: 6.0
  },
  {
    id: "legacyAdminFloor", group: "Administration", unit: "share",
    label: "Residual legacy insurance admin persisting at maturity (supplemental plans etc.)",
    low: 0.05, mode: 0.08, high: 0.14,
    confidence: "low",
    source: "ASSUMPTION — framework permits certified supplemental/substitute private plans (ASM-004); their overhead persists as a fraction of today's $302.9B net cost of insurance.",
    url: "",
    adjustable: false
  },
  {
    id: "providerAdminSavings", group: "Administration", unit: "% of provider spend",
    label: "Provider-side billing/revenue-cycle savings (hospital + clinical budgets)",
    low: 2, mode: 4, high: 6,
    confidence: "medium",
    source: "US hospital admin 25.3% of budgets vs. 15–20% single-payer peers (Himmelstein et al., Health Affairs 2014); physician billing cost $83k/yr vs. $22k in Ontario (Health Affairs). Scope: provider-internal costs ONLY — payer-side admin is computed separately, so no overlap.",
    url: "https://www.healthaffairs.org/doi/10.1377/hlthaff.2013.1327",
    adjustable: true, sliderMin: 0, sliderMax: 10
  },
  {
    id: "governanceRate", group: "Administration", unit: "% of public spend",
    label: "Independent oversight, appeals, safety & legitimacy bodies",
    low: 0.5, mode: 0.9, high: 1.4,
    confidence: "medium",
    source: "Framework PR-CST-010 mandates 0.25–0.5% for the legitimacy layer alone; HHS OIG/GAO/SSA analogues (research/05) add the oversight/ombudsman/adaptation bodies. Distinct from claims administration above.",
    url: "",
    adjustable: false
  },

  /* == Care-model savings ================================================ */
  {
    id: "careModelSavings", group: "Care model", unit: "$B/yr (2023, mature)",
    label: "ED diversion + avoidable admission + readmission savings",
    low: 10, mode: 25, high: 45,
    confidence: "medium",
    source: "155M ED visits × $2,453 avg (CDC NHAMCS); disputed avoidable share 25–67% (research/02); framework targets ≥30% low-acuity ED reduction (KPP-B3). Net of unit-network substitution cost, which is priced separately in the units category.",
    url: "",
    adjustable: false
  },
  {
    id: "lowValueCapture", group: "Care model", unit: "%",
    label: "Share of low-value/duplicate-testing spend eliminated",
    low: 15, mode: 30, high: 45,
    confidence: "medium",
    source: "Low-value services $75.7–101.2B/yr (JAMA/Choosing Wisely, research/03); capture via records mesh + protocol stewardship. Applied to an $88B midpoint pool.",
    url: "",
    adjustable: false
  },
  {
    id: "extractionSavings", group: "Care model", unit: "$B/yr (2023, mature)",
    label: "Related-party extraction & profit-stripping limits (hospitals)",
    low: 3, mode: 8, high: 15,
    confidence: "low",
    source: "Framework SR-HOSP-006 caps related-party extraction at 0.5% of hospital budgets. Narrow scope on purpose: facility-fee/rate effects live in the payment factor, not here.",
    url: "",
    adjustable: false
  },

  /* == New spending: benefit expansions ================================== */
  {
    id: "ltcExpansion", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "Long-term care benefit expansion (home-first universal LTC)",
    low: 150, mode: 230, high: 330,
    confidence: "medium",
    source: "CBO: an LTSS benefit raises NHE ~4.4% (≈$215B on 2023 base). Genworth cost survey + 0.7M-person HCBS waitlist (KFF) support the range. Largest single expansion in the framework.",
    url: "https://www.cbo.gov/publication/56811",
    adjustable: true, sliderMin: 50, sliderMax: 450
  },
  {
    id: "bhExpansion", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "Behavioral health / SUD expansion",
    low: 40, mode: 70, high: 110,
    confidence: "medium",
    source: "27.1M untreated AMI + 41.1M untreated SUD (SAMHSA NSDUH); MH+SUD spend $139.6B (2021). Serving a large share of unmet need at current unit costs.",
    url: "",
    adjustable: false
  },
  {
    id: "dvhExpansion", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "Dental, vision & hearing expansion",
    low: 35, mode: 60, high: 95,
    confidence: "medium",
    source: "Dental NHE $173.8B (2023) mostly private; vision market $68.3B; hearing aids avg $4,672/pair (research/04). Universal coverage raises utilization among the currently-uncovered.",
    url: "",
    adjustable: false
  },
  {
    id: "emsPhExpansion", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "EMS readiness + public health & prevention boost",
    low: 25, mode: 45, high: 75,
    confidence: "medium",
    source: "Ground ambulance $2,673 mean cost (GADCS); ambulance deserts 8.9% of rural residents; TFAH $4.5B state/local public-health shortfall; framework's readiness-payment model.",
    url: "",
    adjustable: false
  },
  {
    id: "unitsCost", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "Four-unit diagnostic-treatment network (15,000 units, operating + amortized capital)",
    low: 15, mode: 25, high: 36,
    confidence: "low",
    source: "DERIVED — no direct analogue. Urgent-care visit economics ($150–200/visit, ~15% margin) and FQHC cost structures (research/02) imply ~$1–2M avg annual cost/unit × 15,000 units (SR-ACC-010) + capital.",
    url: "",
    adjustable: true, sliderMin: 5, sliderMax: 60
  },
  {
    id: "rdPublic", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "Public biomedical R&D (innovation delinkage replacing monopoly-price financing)",
    low: 50, mode: 85, high: 120,
    confidence: "medium",
    source: "Pharma industry R&D $83–105B/yr (PhRMA/CBO); NIH base $47B. The framework replaces price-based R&D recovery with public funding (ASM-001/002) — this is the replacement cost.",
    url: "",
    adjustable: false
  },
  {
    id: "workforceEdu", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "Workforce pipeline: 55k training slots, scholarships, Rural Service Corps",
    low: 15, mode: 25, high: 40,
    confidence: "medium",
    source: "Medicare GME $100–180k/resident/yr (CMS/MedPAC) × PR-WF-002's 55,000 new slots + AAMC debt-relief scale + rural incentives.",
    url: "",
    adjustable: false
  },
  {
    id: "itOperating", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "Information mesh, cybersecurity & AI operations",
    low: 12, mode: 20, high: 35,
    confidence: "low",
    source: "DERIVED — Epic/Cerner enterprise benchmarks, HIMSS cyber spend ratios, IBM breach costs (research/05). National federated mesh has no direct precedent.",
    url: "",
    adjustable: false
  },

  /* == One-time / transition ============================================= */
  {
    id: "itCapital", group: "Transition", unit: "$B total",
    label: "Information mesh build-out capital (spread over Years 1–8)",
    low: 60, mode: 100, high: 180,
    confidence: "low",
    source: "VA EHRM $16–50B for 9M veterans (cautionary); UK NPfIT £10–12.7B failure; RAND national patient identifier $1.5–11.1B. A federated architecture is assumed cheaper per capita than VA's single-vendor approach.",
    url: "",
    adjustable: false
  },
  {
    id: "transitionTotal", group: "Transition", unit: "$B total",
    label: "Transition protection: worker bridges, hospital corridors, wind-down, continuity (Years 1–12)",
    low: 1000, mode: 1500, high: 2200,
    confidence: "low",
    source: "Framework claims $1.2–2.0T. Independent anchors: ~1.8M insurance-admin workers × TAA-style retraining $10k + income bridges; hospital stabilization corridors; legacy payer wind-down. IT capital is priced separately.",
    url: "",
    adjustable: true, sliderMin: 400, sliderMax: 3000
  },

  /* == System shape ====================================================== */
  {
    id: "residualPrivateShare", group: "System", unit: "% of system cost",
    label: "Residual private + out-of-pocket share at maturity (supplemental, non-covered care)",
    low: 4, mode: 6, high: 9,
    confidence: "low",
    source: "ASSUMPTION — framework allows certified supplemental/substitute plans and some non-covered services; peers: Canada ~30% private (broader exclusions), Taiwan ~15%. Framework's benefit package is unusually comprehensive, so the residual is small.",
    url: "",
    adjustable: false
  },

  /* == Financing ========================================================= */
  {
    id: "employerCapture", group: "Financing", unit: "%",
    label: "Employer Health Assurance Contribution: share of current employer spend captured",
    low: 60, mode: 75, high: 90,
    confidence: "medium",
    source: "Private business sponsors 18% of NHE ≈ $876B (2023, CMS sponsor table). Framework's EHAC (payroll-based) captures most but not all; small-business carve-outs and wage pass-through reduce capture.",
    url: "https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/nhe-fact-sheet",
    adjustable: true, sliderMin: 30, sliderMax: 100
  },
  {
    id: "wealthTaxPotential", group: "Financing", unit: "$B/yr",
    label: "Extreme-wealth + high-income tax package gross potential",
    low: 250, mode: 350, high: 450,
    confidence: "medium",
    source: "Saez–Zucman: 6% marginal wealth tax on >$1B + 2% >$50M ≈ $351B/yr (2023, 15% avoidance assumed). Disputed — avoidance may be far higher. Warren plan menu and PERI options bracket the range.",
    url: "https://eml.berkeley.edu/~saez/saez-zucman-wealthtax-warren-feb21.pdf",
    adjustable: false
  },
  {
    id: "wealthCollectionEff", group: "Financing", unit: "%",
    label: "Wealth-tax collection efficiency",
    low: 70, mode: 84, high: 92,
    confidence: "medium",
    source: "Framework KPP-C7 targets ≥92%; Saez–Zucman assume 85%; critics argue much lower. Applied to gross potential above.",
    url: "",
    adjustable: true, sliderMin: 40, sliderMax: 95
  }
];

/* Quick lookup map */
NHA.PARAMS_BY_ID = {};
NHA.PARAM_DEFS.forEach(function (p) { NHA.PARAMS_BY_ID[p.id] = p; });

/* ---- Phase ramps ---------------------------------------------------------
 * Year index 1..16 (Year 1 = 2027 = Phase 0 enactment). Values are shares
 * of the mature effect realized in that year. Sources: Source Package
 * "Implementation Phases and Phase Gates" (PH-P0..P8, Years 1..12).
 * ------------------------------------------------------------------------ */
NHA.RAMPS = {
  /* Public coverage share of population (P3 wave I yr 4; P6 national yr 8) */
  coverage:      [0, 0,    0,    0,    0.20, 0.30, 0.42, 0.55, 0.85, 0.95, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99],
  /* Cost-sharing elimination (gated on unit coverage; begins P6 yr 8) */
  costShareElim: [0, 0,    0,    0,    0,    0,    0.05, 0.10, 0.50, 0.75, 1.0,  1.0,  1.0,  1.0,  1.0,  1.0 ],
  /* Unit network build-out (pilots P4 yr 6; 65% pop P5 yr 7; 95% P8) */
  units:         [0, 0,    0.02, 0.05, 0.10, 0.20, 0.35, 0.55, 0.70, 0.80, 0.85, 0.90, 0.95, 0.95, 0.95, 0.95],
  /* Drug program (pharmacy utility P2 yr 3; deepens through P6) */
  drugs:         [0, 0,    0.15, 0.35, 0.55, 0.70, 0.80, 0.90, 1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0 ],
  /* Hospital global budgets (pilots P4 yr 6 → 95% of spend by P8) */
  hospitals:     [0, 0,    0,    0,    0.05, 0.10, 0.20, 0.35, 0.55, 0.70, 0.85, 0.90, 0.95, 0.95, 0.95, 0.95],
  /* Expanded benefits: LTC/BH/DVH/EMS (P7 yr 10 → full P8 yr 12) */
  expansions:    [0, 0,    0,    0,    0,    0.05, 0.10, 0.15, 0.25, 0.40, 0.60, 0.80, 1.0,  1.0,  1.0,  1.0 ],
  /* R&D, workforce, IT operating build gradually Years 2–8 */
  infra:         [0, 0.10, 0.25, 0.40, 0.55, 0.65, 0.75, 0.85, 1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0 ],
  /* Transition outlay shape (fractions of total; sums to 1.0 over yrs 1–12) */
  transitionShape: [0.03, 0.06, 0.08, 0.11, 0.12, 0.12, 0.12, 0.12, 0.09, 0.07, 0.05, 0.03, 0, 0, 0, 0],
  /* IT capital shape (fractions of total; sums to 1.0 over yrs 1–8) */
  itCapitalShape:  [0.08, 0.12, 0.15, 0.15, 0.14, 0.13, 0.12, 0.11, 0, 0, 0, 0, 0, 0, 0, 0]
};

/* Benchmarks for the comparison panel (research/01, CP-FIN-015/016).
 * All are single-year or annualized federal-cost concepts — the UI explains
 * that these are different accounting concepts, not one axis. */
NHA.BENCHMARKS = {
  cboFedIncrease: { low: 1500, high: 3000, year: 2030,
    label: "CBO: federal subsidy increase, single-payer options (2030, $B/yr)",
    url: "https://www.cbo.gov/publication/56811" },
  cboNheChange: { low: -700, high: 300, year: 2030,
    label: "CBO: change in total NHE, single-payer options (2030, $B/yr)",
    url: "https://www.cbo.gov/publication/56811" },
  urbanMercatus: { low: 3200, high: 3400,
    label: "Urban Institute / Mercatus: added federal cost (annualized from ~$32–34T/10yr)",
    url: "https://www.mercatus.org/research/working-papers/costs-national-single-payer-healthcare-system" }
};
