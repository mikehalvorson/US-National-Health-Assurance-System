/* =========================================================================
 * National Health Assurance Simulation - Parameter Base
 * =========================================================================
 * Every uncertain parameter is a triangular distribution (low / mode / high)
 * with a source citation and a confidence grade. Fixed calibration constants
 * (finalized CMS 2023 historical figures) are point values.
 *
 * DESIGN RULES (from BUILD-BRIEF.md):
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
import type { ParamDef } from './model-types';

/* ---- Fixed calibration constants: CMS NHE 2023 (USD billions, nominal 2023) */
export const BASE2023 = {
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
  populationM:     334.0,  // implied by CMS $14,570 per capita ✓
  investmentResidual: 0 as number,
};
/* Investment residual (structures & equipment + noncommercial research):
 * derived so categories sum exactly to nheTotal. Flagged medium confidence - 
 * see research/01 CP-TOT-004 note about the bundled CMS line. */
(function () {
  const b = BASE2023;
  const listed = b.hospital + b.physician + b.otherProf + b.dental +
    b.otherPersonal + b.homeHealth + b.nursing + b.rxRetail + b.dme +
    b.nondurables + b.netInsCost + b.govtAdmin + b.publicHealth;
  b.investmentResidual = +(b.nheTotal - listed).toFixed(1); // ≈ 238.7
})();

/* Express internal 2023-real dollars as 2024 dollars for display (CPI-U
 * 2023→2024 ≈ +2.9%; GDP deflator ≈ +2.4%. We use 2.6% mid). */
export const DEFLATOR_2023_TO_2024 = 1.026;

/* Simulation clock: enactment assumed calendar 2027 (Year 1 = Phase 0).
 * Baseline is grown from 2023 to 2026 before the policy clock starts. */
export const START_YEAR = 2027;
export const END_YEAR = 2042;
export const PRE_YEARS = 4; // 2023 -> 2027 growth applied before Year 1

/* ---- The calendar anchor, stated once ------------------------------------
 * R256 [§S2]: the phase years ARE calendar-anchored, and the repository
 * behaved as though they were long before it said so. model.ts computes
 * `year = START_YEAR + t` and runs 2027-2042; the care cards publish calendar
 * years a reader can plan around; the health chapter's year chips say
 * "assuming enactment in 2027". Against that, the rollout chapter carried a
 * note saying year numbers "do not assign a calendar start date" - a single
 * page denying an anchor that four other modules had already published.
 *
 * The anchor wins, because it is what the model computes. What the rollout
 * note was reaching for is true and is kept: an anchor is an assumption about
 * enactment, and a failed readiness gate moves the calendar date a phase
 * lands on. That is a different claim from having no anchor at all.
 *
 * Every chapter that needs to say this imports the sentence. Nothing restates
 * it, and a self-test fails the build if a page denies it.
 * ------------------------------------------------------------------------ */
export const CALENDAR_ANCHOR_NOTE =
  'Year 1 is calendar ' + START_YEAR + ', the assumed enactment year, and every ' +
  'phase year on this site is counted from it. The anchor is an assumption ' +
  'about when enactment happens, not a deadline: an independent readiness gate ' +
  'can hold, resize, or roll back a wave, which moves the calendar date a phase ' +
  'lands on rather than the order the phases run in.';

/* The claim this replaced. Pinned so it cannot come back on any page while
   the rest of the site publishes calendar dates. */
export const CALENDAR_ANCHOR_DENIAL = 'do not assign a calendar start date';

/* Framework's own claim, for comparison display only (never a target).
 * Stated in real 2024 dollars. */
export const FRAMEWORK_CLAIM = { mode: 4750, low: 4300, high: 5250 };

/* ---- Uncertain parameters ------------------------------------------------
 * Each: { id, group, label, unit, low, mode, high, confidence, source, url,
 *         adjustable (bool → gets a UI slider on the mode value),
 *         sliderMin/sliderMax (bounds for the UI slider when adjustable) }
 * The Monte Carlo samples triangular(low, mode, high); UI sliders shift the
 * mode and proportionally shift low/high to preserve relative spread.
 * ------------------------------------------------------------------------ */
export const PARAM_DEFS: ParamDef[] = [

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
    source: "DERIVED; no direct citation exists for this exact policy. Anchors: RAND Health Insurance Experiment arc elasticity ≈ −0.2; OOP is ~10.4% of NHE today; CBO single-payer working paper demand-increase discussion; 26.7M uninsured gaining full coverage (KFF 2024). Flagged in BUILD-BRIEF.md as the model's most consequential assumption.",
    url: "https://www.rand.org/health-care/projects/hie.html",
    adjustable: true, sliderMin: 0, sliderMax: 30
  },
  {
    id: "coverageDemandShare", group: "Demand", unit: "share",
    label: "Share of utilization increase attributable to covering the uninsured (vs. cost-sharing elimination)",
    low: 0.25, mode: 0.32, high: 0.40,
    confidence: "low",
    source: "DERIVED; uninsured ≈8% of population using roughly half average care; remainder of demand response comes from eliminating cost sharing for the already-insured.",
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
    source: "ASSUMPTION; the framework permits certified supplemental/substitute private plans (ASM-004); their overhead persists as a fraction of today's $302.9B net cost of insurance.",
    url: "",
    adjustable: false
  },
  {
    id: "providerAdminSavings", group: "Administration", unit: "% of provider spend",
    label: "Provider-side billing/revenue-cycle savings (hospital + clinical budgets)",
    low: 2, mode: 4, high: 6,
    confidence: "medium",
    source: "US hospital admin 25.3% of budgets vs. 15–20% single-payer peers (Himmelstein et al., Health Affairs 2014); physician billing cost $83k/yr vs. $22k in Ontario (Health Affairs). Scope: provider-internal costs only; payer-side admin is computed separately, so no overlap.",
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
    source: "Net new national spending for a universal, home-first long-term care benefit, above the ~$415B already spent on LTSS in 2022 (Medicaid 61%, out-of-pocket 17%). CBO's comprehensive-LTSS option raises NHE ~4.4% (≈$215B on the 2023 base) and anchors the mode. The specific plan drives the range up: a 70% home-and-community target that pays for care now given unpaid ($600B/yr, AARP 2023), eliminating the ~711,000-person HCBS waiting list (KFF 2024), and a direct-care wage floor above the $17.36/hr 2024 median (PHI). Peer systems that cover this benefit spend 2.0-4.4% of GDP on it (OECD). Largest single expansion in the framework.",
    url: "https://www.cbo.gov/publication/56811",
    adjustable: true, sliderMin: 50, sliderMax: 450
  },
  {
    id: "ltcWageFloor", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "Long-term care direct-care wage floor (aide pay lifted above prevailing)",
    low: 29, mode: 52, high: 94,
    confidence: "low",
    source: "DERIVED, and separate from ltcExpansion, which prices care at prevailing wages. A home-first benefit is delivered by direct-care aides whose 2024 median wage is $17.36/hr with ~75% home-care turnover (PHI). Lifting a covered direct-care workforce of about 5.0M FTE (range 4-6M) by a loaded ~$5.00/hr toward a living-wage floor (range $3.50-7.50) gives 5.0M x 2,080 hr x $5.00 = ~$52B/yr. This is net new spending on top of the base LTC benefit and is what raises staffing stability; without it the benefit is funded but cannot be staffed.",
    url: "https://www.phinational.org/resource/direct-care-workers-in-the-united-states-key-facts-2024/",
    adjustable: true, sliderMin: 0, sliderMax: 150
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
    source: "DERIVED; no direct analogue exists. Urgent-care visit economics ($150–200/visit, ~15% margin) and FQHC cost structures (research/02) imply ~$1–2M avg annual cost/unit × 15,000 units (SR-ACC-010) + capital.",
    url: "",
    adjustable: true, sliderMin: 5, sliderMax: 60
  },
  {
    id: "rdPublic", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "Public biomedical R&D (innovation delinkage replacing monopoly-price financing)",
    low: 50, mode: 85, high: 120,
    confidence: "medium",
    source: "Pharma industry R&D $83–105B/yr (PhRMA/CBO); NIH base $47B. The framework replaces price-based R&D recovery with public funding (ASM-001/002); this is the replacement cost.",
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
    source: "DERIVED from Epic/Cerner enterprise benchmarks, HIMSS cyber spend ratios, IBM breach costs (research/05). National federated mesh has no direct precedent.",
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
    source: "ASSUMPTION; the framework allows certified supplemental/substitute plans and some non-covered services; peers: Canada ~30% private (broader exclusions), Taiwan ~15%. Framework's benefit package is unusually comprehensive, so the residual is small.",
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
    id: "wagePassThrough", group: "Financing", unit: "%",
    label: "Employer premium savings passed through to wages",
    low: 40, mode: 70, high: 95,
    confidence: "medium",
    source: "CBO convention holds that employer health costs come out of wages, so employer savings flow back as wages over time (Carloni, CBO Working Paper 2021-06 reviews the pass-through evidence; long-run convention is ~100%, short-run estimates are lower). Wage gains are then taxable: the model applies a 28% average marginal federal rate on the passed-through wages as a revenue feedback.",
    url: "https://www.cbo.gov/publication/57089",
    adjustable: true, sliderMin: 0, sliderMax: 100
  },
  {
    id: "wealthTaxPotential", group: "Financing", unit: "$B/yr",
    label: "Extreme-wealth + high-income tax package gross potential",
    low: 250, mode: 350, high: 450,
    confidence: "medium",
    source: "Saez–Zucman: 6% marginal wealth tax on >$1B + 2% >$50M ≈ $351B/yr (2023, 15% avoidance assumed). Disputed; avoidance may be far higher. Warren plan menu and PERI options bracket the range.",
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
export const PARAMS_BY_ID: Record<string, ParamDef> = {};
PARAM_DEFS.forEach(function (p) { PARAMS_BY_ID[p.id] = p; });

/* ---- Phase ramps ---------------------------------------------------------
 * ZERO-BASED year index 0..15. Index 0 is Year 1 is 2027, the enactment
 * year, matching model.ts's `year = START_YEAR + t` and every other reader.
 * Values are shares of the mature effect realized in that year. Sources:
 * Source Package "Implementation Phases and Phase Gates" (PH-P0..P8,
 * Years 1..12).
 *
 * The convention above used to read "Year index 1..16", and four of the
 * seven policy ramps were authored against it while every consumer read
 * them 0-based - so those four delivered their stated milestone a year
 * after the phase that claims it. They are realigned here. The milestones
 * are declared as data in RAMP_MILESTONES below and gated by a self-test,
 * so a ramp and the year it claims can no longer drift apart in prose.
 * ------------------------------------------------------------------------ */
export const RAMPS = {
  /* Public coverage share of population (P3 wave I yr 4; P6 national yr 8) */
  coverage:      [0, 0,    0,    0.20, 0.30, 0.42, 0.55, 0.85, 0.95, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99],
  /* Cost-sharing elimination (gated on unit coverage; first relief yr 7) */
  costShareElim: [0, 0,    0,    0,    0,    0,    0.05, 0.10, 0.50, 0.75, 1.0,  1.0,  1.0,  1.0,  1.0,  1.0 ],
  /* Unit network build-out (pilots P4 yr 6; scale-up P5 yr 7; 95% P8) */
  units:         [0, 0.02, 0.05, 0.10, 0.20, 0.35, 0.55, 0.70, 0.80, 0.85, 0.90, 0.95, 0.95, 0.95, 0.95, 0.95],
  /* Drug program (pharmacy utility P2 yr 3; deepens through P6) */
  drugs:         [0, 0,    0.15, 0.35, 0.55, 0.70, 0.80, 0.90, 1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0 ],
  /* Hospital global budgets (pilots P4 yr 6 → 95% of spend by P8) */
  hospitals:     [0, 0,    0,    0.05, 0.10, 0.20, 0.35, 0.55, 0.70, 0.85, 0.90, 0.95, 0.95, 0.95, 0.95, 0.95],
  /* Expanded benefits: LTC/BH/DVH/EMS (P7 yr 10 → full P8 yr 12) */
  expansions:    [0, 0,    0,    0,    0.05, 0.10, 0.15, 0.25, 0.40, 0.60, 0.80, 1.0,  1.0,  1.0,  1.0,  1.0 ],
  /* R&D, workforce, IT operating build gradually Years 2–9 */
  infra:         [0, 0.10, 0.25, 0.40, 0.55, 0.65, 0.75, 0.85, 1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0 ],
  /* Transition outlay shape (fractions of total; sums to 1.0 over yrs 1–12) */
  transitionShape: [0.03, 0.06, 0.08, 0.11, 0.12, 0.12, 0.12, 0.12, 0.09, 0.07, 0.05, 0.03, 0, 0, 0, 0],
  /* IT capital shape (fractions of total; sums to 1.0 over yrs 1–8) */
  itCapitalShape:  [0.08, 0.12, 0.15, 0.15, 0.14, 0.13, 0.12, 0.11, 0, 0, 0, 0, 0, 0, 0, 0]
};

/* ---- Declared ramp milestones -------------------------------------------
 * Each policy ramp claims, in its comment above, to deliver something by a
 * named phase. Those claims are restated here as data so a self-test can
 * hold the arrays to them; prose alone drifted for four of the seven.
 * `atLeast` is the share the ramp must have reached at that phase's anchor
 * year. transitionShape and itCapitalShape are deliberately absent: they
 * are shapes over a span, not milestones at a year.
 * ------------------------------------------------------------------------ */
export interface RampMilestone { ramp: keyof typeof RAMPS; phase: string; atLeast: number; claim: string }
export const RAMP_MILESTONES: RampMilestone[] = [
  { ramp: 'coverage',      phase: 'P3', atLeast: 0.20, claim: 'public coverage wave I opens' },
  { ramp: 'coverage',      phase: 'P6', atLeast: 0.85, claim: 'national public default coverage' },
  { ramp: 'drugs',         phase: 'P2', atLeast: 0.15, claim: 'pharmacy utility first operation' },
  { ramp: 'drugs',         phase: 'P6', atLeast: 0.90, claim: 'drug program deepened through P6' },
  { ramp: 'drugs',         phase: 'P8', atLeast: 1.00, claim: 'drug program at full depth' },
  { ramp: 'units',         phase: 'P4', atLeast: 0.20, claim: 'unit-network pilots running' },
  { ramp: 'units',         phase: 'P8', atLeast: 0.95, claim: 'mature unit-network population share' },
  { ramp: 'hospitals',     phase: 'P4', atLeast: 0.10, claim: 'hospital global-budget pilots running' },
  { ramp: 'hospitals',     phase: 'P8', atLeast: 0.95, claim: 'mature hospital budget-migration share' },
  { ramp: 'expansions',    phase: 'P7', atLeast: 0.60, claim: 'expanded benefits substantially built' },
  { ramp: 'expansions',    phase: 'P8', atLeast: 1.00, claim: 'expanded benefits complete' },
  { ramp: 'infra',         phase: 'P1', atLeast: 0.10, claim: 'infrastructure build under way' },
  { ramp: 'costShareElim', phase: 'P8', atLeast: 1.00, claim: 'cost sharing fully eliminated' }
];

/* ---- Declared offset ramp pairings --------------------------------------
 * R203 [§S2]: every explicit offset is a savings term that only arrives when
 * some capability is built, and the ramp it multiplies is the model's claim
 * about which capability that is. The claim was implicit in the arithmetic,
 * so it could not be reviewed and could not be wrong out loud. It is data
 * here, model.ts reads the ramp for each offset from this table rather than
 * naming one inline, and a self-test requires every offset the engine
 * produces to have an entry with a reason.
 *
 * The row filed offLowValue: it ramps on `infra`, which reaches 1.0 at index
 * 8 and is tied with `drugs` as the fastest curve in the model, and it is the
 * most optimistic pairing available to a savings term. That is true, it is
 * kept, and the reason is stated rather than left to be re-derived. Moving it
 * to `units` or `hospitals` would change published output on the strength of
 * no source; `honest` here means declaring the pairing and its optimism, not
 * silently picking a slower curve because it reads as more conservative.
 * ------------------------------------------------------------------------ */
export interface OffsetPairing {
  id: string;
  ramp: keyof typeof RAMPS;
  delivers: string;
  why: string;
}
export const OFFSET_RAMPS: OffsetPairing[] = [
  {
    id: 'offProvAdmin', ramp: 'coverage',
    delivers: 'provider-side billing and collections savings',
    why: 'A practice stops maintaining multi-payer billing only as its payer mix ' +
      'consolidates onto the public rail, so the saving tracks coverage share and ' +
      'nothing else. It is already scoped to hospital and clinical spend.'
  },
  {
    id: 'offCareModel', ramp: 'units',
    delivers: 'ED diversion and avoidable admissions',
    why: 'The diversion has to have somewhere to divert to. Both halves of this ' +
      'term depend on a staffed diagnostic-treatment unit being reachable, which ' +
      'is exactly what the unit-network ramp measures.'
  },
  {
    id: 'offLowValue', ramp: 'infra',
    delivers: 'reduction in the low-value-care pool',
    why: 'Low-value care is captured by measurement and decision support at the ' +
      'point of order - appropriateness criteria in the shared record, and the ' +
      'clinician education to apply them - which is the R&D, workforce and IT ' +
      'operating build this ramp carries, not the physical unit network. Noted ' +
      'openly: infra is the fastest curve in the model, reaching full scale in ' +
      'Year 9, so this is the most optimistic ramp any offset uses and this term ' +
      'matures earlier than every other saving.'
  },
  {
    id: 'offExtraction', ramp: 'hospitals',
    delivers: 'related-party extraction recovered',
    why: 'Extraction is recovered by the budget agreement that replaces ' +
      'fee-for-service billing at a hospital, so it arrives with the ' +
      'global-budget migration and stops at the share of spend that has migrated.'
  }
];

/* Benchmarks for the comparison panel (research/01, CP-FIN-015/016).
 * All are single-year or annualized federal-cost concepts - the UI explains
 * that these are different accounting concepts, not one axis. */
export const BENCHMARKS = {
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

/* ---- Money-flow map: who pays, through what channel (2023 actual) --------
 * Sponsor totals are CMS NHE 2023 sponsor analysis (high confidence):
 * households $1,314B (27%), private business $876B (18%), federal $1,557B
 * (32%), state/local $779B (16%), other private $341B (7%). Channel totals
 * are CMS payer categories: private insurance $1,464.6B, Medicare
 * $1,029.8B, Medicaid/CHIP $871.7B, out-of-pocket $505.7B, other programs
 * $994B (VA/DoD, ACA subsidies flow inside federal lines, public health,
 * investment, philanthropy). Ribbon-level values are a derived
 * decomposition consistent with those row/column totals (medium
 * confidence): e.g., households → private insurance is the employee share
 * of employer premiums plus individual-market premiums; households →
 * Medicare is payroll tax employee share plus Part B/D premiums.        */
export const MONEYFLOW = {
  total: 4866.5,
  sources: [
    { id: "hh",    label: "Households",        value: 1314, color: "var(--series-1)" },
    { id: "emp",   label: "Employers",         value: 876,  color: "var(--series-2)" },
    { id: "fed",   label: "Federal government", value: 1557, color: "var(--series-5)" },
    { id: "state", label: "State & local",     value: 779,  color: "var(--series-3)" },
    { id: "oth",   label: "Other private",     value: 341,  color: "var(--series-7)" }
  ],
  channels: [
    { id: "priv",     label: "Private insurance",   value: 1465 },
    { id: "medicare", label: "Medicare",            value: 1030 },
    { id: "medicaid", label: "Medicaid & CHIP",     value: 872 },
    { id: "oop",      label: "Out-of-pocket bills", value: 506 },
    { id: "other",    label: "Other programs",      value: 994 }
  ],
  ribbons: [
    { from: "hh",    to: "priv",     value: 570, note: "employee premium shares + individual-market premiums" },
    { from: "hh",    to: "oop",      value: 506, note: "deductibles, copays, uncovered care" },
    { from: "hh",    to: "medicare", value: 238, note: "employee payroll tax + Part B/D premiums" },
    { from: "emp",   to: "priv",     value: 726, note: "employer share of group premiums" },
    { from: "emp",   to: "medicare", value: 150, note: "employer payroll tax" },
    { from: "fed",   to: "medicare", value: 642, note: "general revenue + trust-fund draw" },
    { from: "fed",   to: "medicaid", value: 558, note: "federal Medicaid/CHIP match" },
    { from: "fed",   to: "other",    value: 357, note: "VA/DoD care, ACA subsidies, public health, research" },
    { from: "state", to: "priv",     value: 169, note: "state/local employee premiums" },
    { from: "state", to: "medicaid", value: 314, note: "state Medicaid share" },
    { from: "state", to: "other",    value: 296, note: "public health, subsidies, facilities" },
    { from: "oth",   to: "other",    value: 341, note: "philanthropy, investment income, workers' comp" }
  ]
};

/* ---- "What's wrong, by the numbers" - sourced problem statistics --------
 * Every figure traces to the research files in the repo (research/01–06). */
export const PROBLEM_STATS = [
  { value: "17.6% of GDP", label: "U.S. health spending, 2023",
    note: "$4.87T, or $14,570 per person, the highest of any nation (CMS NHE)" },
  { value: "26.7M", label: "people uninsured",
    note: "rising again after Medicaid unwinding and ACA subsidy expiration (KFF/Census, 2024)" },
  { value: "20.7%", label: "of income goes to healthcare in the poorest fifth of households",
    note: "vs 3.7% in the richest fifth; the same bills hit 16 times harder at the bottom (BLS CES 2024)" },
  { value: "2.78×", label: "U.S. prescription drug prices vs 33 peer countries",
    note: "4.22× for brand-name drugs (RAND international price comparison, 2022 data)" },
  { value: "25.3%", label: "of U.S. hospital budgets go to administration",
    note: "vs ~15–20% in peer nations (Himmelstein et al., Health Affairs cross-national study)" },
  { value: "$760–935B", label: "wasted every year, roughly a quarter of all health spending",
    note: "administrative complexity, pricing failures, low-value care, fraud (JAMA 2019 synthesis)" },
  { value: "$83,000", label: "per physician, per year, spent on billing and insurance paperwork",
    note: "vs ~$22,000 for physicians in single-payer Ontario (Health Affairs)" },
  { value: "417", label: "rural hospitals at risk of closure",
    note: "150–210 have already closed since 2010 (Chartis; UNC Sheps Center)" },
  { value: "$26,993", label: "average family premium, 2025",
    note: "workers pay $6,850 of it, before any deductible or copay (KFF Employer Survey)" }
];

/* ---- Systemic correlation map for Monte Carlo draws ----------------------
 * Real-world forecast errors are not independent: a world where benefit
 * expansions run over budget is usually also a world where savings levers
 * underdeliver. Each run draws one systemic factor z in [-1, 1]; parameters
 * tagged +1 (cost side) shift toward their high end when z is positive,
 * parameters tagged -1 (savings side) shift toward their low end, with
 * weight CORR_WEIGHT. Untagged parameters stay independent.               */
export const CORR_WEIGHT = 0.35;
export const PARAM_CORR: Record<string, number> = {
  utilIncrease: 1, providerPaymentFactor: 1, ltcExpansion: 1, ltcWageFloor: 1,
  bhExpansion: 1,
  dvhExpansion: 1, emsPhExpansion: 1, unitsCost: 1, rdPublic: 1,
  workforceEdu: 1, itOperating: 1, itCapital: 1, transitionTotal: 1,
  publicAdminRate: 1, governanceRate: 1, legacyAdminFloor: 1,
  drugPriceCut: -1, providerAdminSavings: -1, careModelSavings: -1,
  lowValueCapture: -1, extractionSavings: -1
};

/* ---- Age structure and cost weights (demographic growth decomposition) --
 * Shares: Census projections (2024 vs ~2041). Cost weights: relative
 * per-capita personal health spending by age (CMS/MEPS age curves).
 * Medium confidence.
 *
 * R137 [§S0]: the previous line here claimed the weights are "normalized so
 * the 2024-weighted average is ~1". They are not - the 2024-weighted average
 * is 1.1195 (2041: 1.2061). The claim was false and is removed rather than
 * fixed, because normalising would change nothing: the only consumer,
 * growthDecompNote, uses the RATIO idx2041/idx24, in which any common scaling
 * of costw cancels exactly.
 *
 * What AGE_STRUCTURE is for: the demographic growth-decomposition note, which
 * explains what share of an already-set baselineRealGrowth is attributable to
 * ageing. It is deliberately NOT an engine input. runPath uses a flat
 * popGrowth and folds ageing into baselineRealGrowth, whose own note says
 * "Includes aging effect" - so wiring costw into the engine would apply the
 * same cost driver twice. selftests.ts asserts both halves of that. */
export const AGE_STRUCTURE = {
  bands: [
    { id: "0–18",  share2024: 0.217, share2041: 0.197, costw: 0.45 },
    { id: "19–44", share2024: 0.345, share2041: 0.334, costw: 0.65 },
    { id: "45–64", share2024: 0.243, share2041: 0.236, costw: 1.20 },
    { id: "65–84", share2024: 0.176, share2041: 0.204, costw: 2.40 },
    { id: "85+",   share2024: 0.019, share2041: 0.029, costw: 4.40 }
  ],
  source: "Census Bureau population projections; CMS/MEPS per-capita spending by age"
};

/* ---- Health outcomes the model does not price ----------------------------
 * Displayed with sources; deliberately NOT monetized into system cost.    */
export const OUTCOME_STATS = [
  { value: "20,000–68,000", label: "deaths per year linked to being uninsured",
    note: "coverage-mortality studies imply one death averted per ~830–1,600 people gaining coverage (Sommers et al.); Woolhandler & Himmelstein put it near 35,000/yr, Galvani et al. (Lancet, 2020) at 68,000/yr. Mechanism under NHA: universal automatic coverage.",
    confidence: "medium" },
  { value: "~530,000", label: "bankruptcies per year that filers tie to medical bills or illness-related work loss",
    note: "Himmelstein et al., AJPH 2019; the causal share is debated, the association is not. Mechanism under NHA: medical debt for covered care is prohibited.",
    confidence: "low-medium" },
  { value: "100M people / ~$220B", label: "Americans carrying medical debt, and the total owed",
    note: "KFF-NPR investigation, 2022. Mechanism under NHA: $0 point-of-care for covered care ends new covered-care debt.",
    confidence: "medium-high" },
  { value: "38%", label: "of adults delayed or skipped care over cost in 2024, a record high",
    note: "Gallup/West Health survey. Mechanism under NHA: removing the price at the point of use; the model's utilization-increase parameter is this effect showing up as cost.",
    confidence: "medium" }
];
