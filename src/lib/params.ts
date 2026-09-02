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
 *
 * RECONCILED against research/01_macro_financing_population_offsets.md,
 * research/02_hospital_clinical_workforce_education.md,
 * research/03_drugs_pharmacy_diagnostics_devices.md,
 * research/04_ltc_behavioral_dvh_ems_publichealth.md and
 * research/05_it_governance_rd_transition.md.
 *
 * R41 [§S5]: `taxparams.ts` carries an explicit "RECONCILED against
 * research/06" header, per-instrument source and confidence, named known
 * limits, and its hazards written into the data rather than left to a reader.
 * §W calls it the in-repo template and asks that this file be brought up to
 * it. The header above is the first half; RECONCILED_AGAINST below makes the
 * claim machine-checkable, so a research file this base draws on cannot be
 * renamed or deleted without the build saying so.
 *
 * Known limits, in the same spirit as taxparams.ts's:
 *  - Ten engine constants are still unregistered literals (K2/R21); §S6a owns
 *    sourcing or grading them.
 *  - Some parameters carry an empty `url`, and no count is stated here.
 *    This bullet said sixteen, nine medium and seven low; R135 made all
 *    three false in one commit, two screens above the change it made.
 *    The live figures are in `parameterSourceBacklog()`, which computes
 *    them, and in the self-test note that prints it.
 *  - `transitionShape` and `itCapitalShape` are outlay profiles whose
 *    provenance no pass has confirmed either way (BS4/R254).
 * ========================================================================= */
import { isSourcedGrade, type Confidence, type ParamDef } from './model-types';

/* R41 [§S5]: the research files this parameter base reconciles against, as
   data. Checked to exist on disk, so the header cannot outlive them. */
export const RECONCILED_AGAINST = [
  'research/01_macro_financing_population_offsets.md',
  'research/02_hospital_clinical_workforce_education.md',
  'research/03_drugs_pharmacy_diagnostics_devices.md',
  'research/04_ltc_behavioral_dvh_ems_publichealth.md',
  'research/05_it_governance_rd_transition.md'
];

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
 * see research/01 RB-01-TOT-004 note about the bundled CMS line. */
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

/* ---- The mature year, stated once ---------------------------------------
 * R22 [§S6a]. The year the model reports its mature system from was computed
 * four different ways in six places: `mc.years.length - 2` in bridge.ts and
 * financing.ts, `(END_YEAR - START_YEAR + 1) - 2` inside matureAtScale, and
 * `2041 - START_YEAR` in four self-tests. The row filed the third of those.
 * They agree today. Moving END_YEAR would have moved some and not others, and
 * the self-tests comparing the two would have compared different years while
 * still passing, because each side would be reading its own.
 *
 * It is the second-to-last year on purpose: the last year of the path is the
 * end of the window rather than a steady state, and transition outlays and IT
 * capital have both wound down by the year before it.
 * ------------------------------------------------------------------------ */
export const BASE_YEAR = START_YEAR - PRE_YEARS;
export const MATURE_YEAR = END_YEAR - 1;
export const MATURE_INDEX = MATURE_YEAR - START_YEAR;
export const MATURE_YEARS_FROM_BASE = MATURE_YEAR - BASE_YEAR;

/* ---- The ensemble's size, and what it buys -------------------------------
 * R25 [§S6a] asks whether 600 draws is enough for the tails. Measured, by
 * running the same model at seven seeds and taking the spread of the
 * published central estimate as a share of its own midpoint:
 *
 *     draws   mature-year p50   p90 tail   new revenue p50   ms/run
 *       600        0.72%          1.00%        2.44%           18
 *     1,500        0.56%          0.40%        1.37%           36
 *     3,000        0.49%          0.47%        1.21%           79
 *     6,000        0.42%          0.34%        0.86%          160
 *    12,000        0.25%          0.20%        0.71%        1,355
 *
 * 1,500 is the choice, because that is where the curve bends. Going from 600
 * to 1,500 more than halves the tail spread the row asks about, from 1.00% to
 * 0.40%, and cuts the new-revenue spread from 2.44% to 1.37%, for 36ms. Going
 * on to 3,000 buys nothing measurable on the tail and costs another 43ms per
 * run and, measured, 17 seconds of build time, because every self-test that
 * runs the ensemble pays it too. 6,000 doubles the wait after every slider
 * drag; 12,000 leaves the page slower than the interaction it is answering.
 *
 * 36ms also sits well inside the 160ms debounce the sliders already impose, so
 * a reader dragging a control still sees the result land in one beat.
 *
 * What no draw count fixes: at 12,000 the hero figure still moves 0.25% across
 * seeds, which is $13B on $5.4T. The dashboard publishes it to three
 * significant figures and the ensemble supports two. That is a display
 * question rather than a sampling one, and it is stated here rather than
 * solved by adding zeroes.
 *
 * The seeds and the tolerance are declared so the claim above is checked
 * rather than asserted: a change to the sampling that makes the ensemble less
 * reproducible fails the build.
 * ------------------------------------------------------------------------ */
export const MONTE_CARLO_DRAWS = 1500;
export const MONTE_CARLO_SEED = 42;
export const SEED_STABILITY = {
  seeds: [42, 43, 7, 99, 12345, 2024, 555],
  /* Measured at these seeds and this draw count: hero 0.56%, p90 tail 0.40%.
     The tolerance is a little above the larger of the two, so the check fails
     on a real loss of reproducibility rather than on the third decimal. */
  tolerancePct: 0.7
};

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

/* ---- The framework's own $4.75T claim, on a declared basis --------------
 * R26 [§S6a]. research/01 says no source it found reproduces the number and
 * calls deriving what it represents the single most important open question,
 * naming three candidate readings: total system NHE, net new federal spending,
 * or net new revenue. It has stood open through every pass since.
 *
 * The framework answers it, in its own quality catalog rather than in its
 * prose. KPP-C2 computes per-capita system cost as "CP-TOT-001 total-system
 * cost / covered population" and states its target as "to be reconciled with
 * $4.75T total system cost and current population denominator". The claim is
 * therefore total system cost, all payers, at maturity, in real 2024 dollars -
 * the first of the three candidates, and the model's `matureToday` is the
 * quantity computed to be comparable with it.
 *
 * That settles what it means. It does not make it reproducible: on that basis
 * the model lands about 15% above it, and the claim sits below the 10th
 * percentile of every scenario in the catalog. The comparison is published
 * with its basis attached and computed from this constant, so it cannot go
 * stale, and the number is never a target.
 *
 * One coincidence, named so nobody rediscovers it as a finding: the model's
 * mature federal increase is currently within a fraction of a percent of
 * $4.75T. That is the second candidate reading, and it is a different
 * accounting basis from the one the catalog states; the literature puts that
 * quantity at $3.2-3.4T/yr (Urban and Mercatus), so the match is arithmetic,
 * not evidence.
 * ------------------------------------------------------------------------ */
export const FRAMEWORK_CLAIM = {
  mode: 4750, low: 4300, high: 5250,
  basis: 'Total national health expenditure at maturity, all payers, real 2024 dollars',
  /* Rendered on the Health tab, so it states the basis plainly and leaves the
     catalog identifiers to the comment above: rule 2 keeps those codes inside
     the Data and Quality tabs, whose subject is the catalog itself. */
  basisSource: "That is the plan's own accounting basis for the figure: its " +
    'cost catalog defines per-capita system cost as total system cost over ' +
    'covered population, and names this figure as that total.',
  comparableWith: 'matureToday'
};

/* ---- Household denominators, declared ------------------------------------
 * R84 [§S5]. Two per-household calculators divided by different numbers:
 * `care.ts` used 132.2M (Census 2024) and `taxparams.ts`'s income groups sum
 * to 131.0M (CBO 2022). §AG5 filed it as an inconsistency to reconcile.
 *
 * Measured, and it is a three-way split, not two: `WEALTH_DIST` inside
 * taxparams.ts ALSO sums to 132.2M, matching care.ts rather than the income
 * groups in its own file. So the disagreement runs through the middle of the
 * tax module, which is a fact §AG5 did not have.
 *
 * They are NOT reconciled to one number, and that is the finding rather than
 * a shortfall. CBO's 131.0M is the household universe its own income
 * distribution is built on; every per-group figure the tax page prints is
 * CBO's count divided into CBO's income, and substituting a Census total
 * would make those rows disagree with their own source. Census's 132.2M is
 * the right denominator for a whole-population per-household figure that is
 * not derived from CBO's table. Two different questions, two right answers.
 *
 * What was wrong is that neither said which it was. Each denominator is
 * declared here with its source, its vintage and what it is for, and a
 * self-test holds every per-household output to naming one.
 * ------------------------------------------------------------------------ */
export interface HouseholdDenominator {
  id: string;
  households: number;      /* millions */
  source: string;
  dataYear: number;
  useFor: string;
}
export function householdDenominator(id: string): HouseholdDenominator {
  const d = HOUSEHOLD_DENOMINATORS.filter(function (x) { return x.id === id; })[0];
  if (!d) throw new Error('Unknown household denominator: ' + id);
  return d;
}
export const HOUSEHOLD_DENOMINATORS: HouseholdDenominator[] = [
  { id: 'census', households: 132.2, dataYear: 2024,
    source: 'US Census Bureau, households 2024.',
    useFor: 'Whole-population per-household figures not derived from CBO income groups: the household calculator and the KPP-C8 burden share.' },
  { id: 'cbo', households: 131.0, dataYear: 2022,
    source: 'CBO, The Distribution of Household Income 2022, supplemental workbook.',
    useFor: 'Anything computed per income group, because the group incomes and the group counts come from the same CBO table and must not be mixed with another universe.' },
  /* R172 [§S8]: a fourth site, and the one R84 did not reach. `overview.ts`
     typed both `hhNow = 132.2` and `hh2041 = 141` beside the family-burden
     sentence, so the Census count had a second copy and the 2041 projection had
     no owner at all. §BC3 named the first; nobody had checked the second. */
  { id: 'census-2041', households: 141.0, dataYear: 2041,
    source: 'Census household projection for the mature year, consistent with the population growth the model runs on.',
    useFor: 'Per-household figures stated at the mature year, where the country is bigger than it is today. Never use it for a figure dated now.' }
];

/* R172 [§S8]: the two distributions that carry their own household counts have
 * to agree with the denominator they are declared to be. `GROUPS` sums to CBO's
 * universe and `WEALTH_DIST` to the Census one, which is the three-way split
 * R84 measured; nothing held either sum to its declaration, so the split could
 * quietly become a four-way one. The sums live in taxparams.ts and the
 * declarations here, so this takes them as arguments rather than importing
 * across the seam.
 */
export function denominatorSumDrift(
  sums: Array<{ id: string; sum: number; of: string }>
): string[] {
  const out: string[] = [];
  for (const s of sums) {
    const d = HOUSEHOLD_DENOMINATORS.filter((x) => x.id === s.of)[0];
    if (!d) { out.push(s.id + ': no denominator declared as ' + s.of); continue; }
    /* the counts are one-decimal figures typed by hand in both places */
    if (Math.abs(s.sum - d.households) > 0.05) {
      out.push(s.id + ' sums to ' + s.sum.toFixed(2) + ', ' + s.of + ' declares ' + d.households);
    }
  }
  return out;
}

/* ---- Top-capital real growth, one number ---------------------------------
 * R143 [§S5]. Two engines grew the same wealth-tax base at two different
 * rates. `taxmodel.ts` compounds the `wealth` instrument at the `top` class,
 * 4.0% real; `model.ts` compounded `wealthRevenue` at GDP, 1.9%, simply
 * because `Ggdp` was the growth factor already in scope. The divergence is
 * invisible at the base year and maximal exactly where the headline figures
 * are read: measured before the fix, the tax model's wealth base ran 38.1%
 * above the healthcare model's at 2041 and 40.9% at 2042.
 *
 * It was not a disagreement anyone had: it was created by scaling one module
 * and not the other, and it reached the reader in two places - the overview's
 * "of which the wealth-tax package could cover N%" row, and the tax page's
 * printed claim that "top-capital bases compound at 4% real".
 *
 * The tax side wins on evidence, so this is its rate, declared once and read
 * by both. Sourced: Fed Distributional Financial Accounts, top-0.1% net worth
 * grew at roughly 7% nominal CAGR 1989-2025, about 4.3% real; 4.0% is used as
 * a conservative round figure. `taxparams.ts` reads it as ECON.growthRates.top
 * and `model.ts` reads it for wealthRevenue, so the two cannot drift apart
 * again without one edit moving both.
 * ------------------------------------------------------------------------ */
export const TOP_CAPITAL_REAL_GROWTH = 0.040;

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
    source: "DERIVED; no direct citation exists for this exact policy. Anchors: RAND Health Insurance Experiment arc elasticity ≈ −0.2; OOP is ~10.4% of NHE today; CBO single-payer working paper demand-increase discussion; 26.7M uninsured under 65 gaining full coverage (KFF analysis of Census ACS, 2024). Flagged in BUILD-BRIEF.md as the model's most consequential assumption.",
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
    adjustable: true, sliderMin: 0.75, sliderMax: 1.10,
    divergence: {
      recommended: 'about 0.39, which is 1 / 2.54',
      leans: 'conservative',
      note: 'The source this parameter cites is the same RAND finding that ' +
        'commercial payers pay about 254% of Medicare, and moving every payer ' +
        'to Medicare rates would imply a payment factor near 0.39. The range ' +
        'here tops out at no change at all and bottoms at an 8% reduction ' +
        'from the mode. That is a deliberate choice: the plan builds capacity ' +
        'first and does not assume aggressive rate compression. It is ' +
        'declared because it leans the opposite way to the administrative ' +
        'rate, so the two used to offset in the headline with neither one ' +
        'visible.'
    }
  },
  {
    id: "drugPriceCut", group: "Payment", unit: "%",
    label: "Net drug price reduction from national purchasing (mature)",
    low: 25, mode: 40, high: 55,
    confidence: "medium",
    /* Code review [§S7]: this string is rendered to readers in the parameter
       table (health.astro), so the `R34:` prefix put an internal remediation
       code in reader-facing text, which is the class golden rule 2 forbids.
       The substance stays; the code goes. */
    source: "US net prices ~2.78× OECD peers overall, 4.22× brand (RAND RRA788-3 2024). IRA first-cycle negotiated cuts 38–79% list / ~22% net Medicare spending (CMS). The IRA precedent here is the original CBO score: CBO re-scoring in 2025 revised the package's projected deficit reduction downward, so the precedent shows that negotiation can save at program level, not how much a national purchaser would save. The plan's own target for this lever is at least 55%. High end assumes full international-reference-level purchasing.",
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
    low: 1.5, mode: 2.2, high: 6.0,
    confidence: "medium",
    source: "CBO single-payer analysis: 1.5-2.0%; Taiwan NHI 1.07%, best in class; Urban and RAND cross-checks 5-6% fully loaded. The plausible band for this ratio is 2-6%, and the spread is itself a defensible modelling uncertainty rather than noise to be collapsed to one number, so the sampled range spans everything the evidence names: 1.5% is the aggressive case and 6% the conservative one. The mode sits above CBO for a heavier oversight and appeals architecture, which is a judgement rather than a scored estimate, so this is graded medium; the underlying question is contested and is the most politically disputed number in single-payer modelling.",
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
    source: "The plan sets aside 0.25–0.5% for the legitimacy layer alone; HHS OIG/GAO/SSA analogues add the oversight/ombudsman/adaptation bodies. Distinct from claims administration above. The citation is the SSA analogue, which is the one that carries a RATIO rather than a budget line: administrative expenses have been one percent or less of combined trust-fund cost every year since 1989, and the 0.3% retirement / 1.9% disability split brackets this band. The HHS OIG and GAO budgets are dollar figures for differently-scoped bodies and are comparators, not the anchor.",
    url: "https://www.ssa.gov/oact/STATS/admin.html",
    adjustable: false
  },

  /* == Care-model savings ================================================ */
  {
    id: "careModelSavings", group: "Care model", unit: "$B/yr (2023, mature)",
    label: "ED diversion + avoidable admission + readmission savings",
    low: 10, mode: 25, high: 45,
    confidence: "medium",
    source: "155M ED visits (CDC NHAMCS) × $2,453 average cost. The two figures come from two places and the citation covers the first: $2,453 is the Peterson-KFF Health System Tracker, NOT CDC, and pairing them under one attribution is what the seed row for this pair was corrected for. Avoidable share is disputed 25–67%; the plan targets at least a 30% reduction in low-acuity ED use. Net of unit-network substitution cost, which is priced separately in the units category.",
    url: "https://www.cdc.gov/nchs/dhcs/ed-visits/index.htm",
    adjustable: false
  },
  {
    id: "lowValueCapture", group: "Care model", unit: "%",
    label: "Share of low-value/duplicate-testing spend eliminated",
    low: 15, mode: 30, high: 45,
    confidence: "low",
    source: "ASSUMPTION, and downgraded from medium for the absence of a citation rather than on the evidence. Applied to the lowValuePool parameter rather than to a fixed pool: the pool is how much low-value care there is to find, this is the share a records mesh and protocol stewardship actually remove, and they are separate uncertainties. The pool is measured and cited; the capture share is not. This was searched for: the waste literature sizes low-value care and does not estimate what fraction of it a records mesh and protocol stewardship remove, so citing the pool's source here would attach a URL that does not carry this number.",
    url: "",
    adjustable: false
  },
  {
    id: "lowValuePool", group: "Care model", unit: "$B/yr (2023)",
    label: "Low-value and duplicate-testing spending pool the capture rate applies to",
    low: 75.7, mode: 88.45, high: 101.2,
    confidence: "medium",
    source: "Low-value services $75.7-101.2B/yr, the overtreatment category of the JAMA 2019 waste synthesis (Shrank et al.), applying the Institute of Medicine waste taxonomy. The engine carried the midpoint of that range as a literal 88, so a $25.5B-wide published range contributed no uncertainty at all while the capture rate applied to it varied 15-45%. Sampled now, at the midpoint of its own range. The same source records a more recent framing of 'more than $100 billion annually', which lands at the top of this band rather than above it, so the band is not extended past its published high.",
    url: "https://lowninstitute.org/lown-issues/low-value-care/",
    adjustable: false
  },
  {
    id: "extractionSavings", group: "Care model", unit: "$B/yr (2023, mature)",
    label: "Related-party extraction & profit-stripping limits (hospitals)",
    low: 3, mode: 8, high: 15,
    confidence: "low",
    source: "The plan caps related-party extraction at 0.5% of hospital budgets. Narrow scope on purpose: facility-fee/rate effects live in the payment factor, not here.",
    url: "",
    adjustable: false
  },

  /* == New spending: benefit expansions ================================== */
  {
    id: "ltcExpansion", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "Long-term care benefit expansion (home-first universal LTC)",
    low: 150, mode: 230, high: 330,
    confidence: "medium",
    source: "Net new national spending for a universal, home-first long-term care benefit, above the ~$415B already spent on LTSS in 2022 (Medicaid 61%, out-of-pocket 17%). CBO's comprehensive-LTSS option raises NHE ~4.4% (≈$215B on the 2023 base) and anchors the mode. The specific plan drives the range up: a 70% home-and-community target that pays for care now given unpaid ($600B/yr, AARP 2023), eliminating the ~711,000-person HCBS waiting list (KFF 2024), and a direct-care wage floor above the $17.36/hr 2024 median (PHI). Peer systems that cover this benefit spend 2.2-4.4% of GDP on it (OECD). Largest single expansion in the framework.",
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
    source: "27.1M untreated AMI + 41.1M untreated SUD (SAMHSA NSDUH, cited here) alongside MH+SUD spend of $139.6B in 2021, which is a separate Health Affairs figure and a different vintage. Serving a large share of unmet need at current unit costs.",
    url: "https://www.samhsa.gov/data/report/2023-nsduh-annual-national-report",
    adjustable: false
  },
  {
    id: "dvhExpansion", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "Dental, vision & hearing expansion",
    low: 35, mode: 60, high: 95,
    confidence: "medium",
    source: "Dental NHE $173.8B (2023), mostly private - the citation, and the only one of the three with a primary source. Vision is a $68.3B industry market estimate from The Vision Council, not CMS, and includes non-medical eyewear. The $4,672 average hearing-aid pair has NO primary source located: the seed row carrying that same figure was downgraded for exactly that. Universal coverage raises utilization among the currently-uncovered.",
    url: "https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/nhe-fact-sheet",
    adjustable: false
  },
  {
    id: "emsPhExpansion", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "EMS readiness + public health & prevention boost",
    low: 25, mode: 45, high: 75,
    confidence: "medium",
    source: "Ground ambulance $2,673 mean cost per transport, from CMS's mandatory Ground Ambulance Data Collection System - the citation. Ambulance deserts at 8.9% of rural residents and the TFAH $4.5B state/local public-health shortfall are separate sources carried in the research files. Plus the framework's readiness-payment model.",
    url: "https://www.cms.gov/medicare/payment/fee-schedules/ambulance/medicare-ground-ambulance-data-collection-system",
    adjustable: false
  },
  {
    id: "unitsCost", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "Four-unit diagnostic-treatment network (15,000 units, operating + amortized capital)",
    low: 15, mode: 25, high: 36,
    confidence: "low",
    source: "DERIVED; no direct analogue exists. Urgent-care visit economics ($150–200/visit, ~15% margin) and FQHC cost structures (research/02) imply ~$1–2M avg annual cost/unit × the plan's 15,000-unit network + capital.",
    url: "",
    adjustable: true, sliderMin: 5, sliderMax: 60
  },
  {
    id: "rdPublic", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "Public biomedical R&D (innovation delinkage replacing monopoly-price financing)",
    low: 50, mode: 85, high: 120,
    confidence: "medium",
    source: "Pharma industry R&D $83–105B/yr. The citation is CBO, which states $83B for 2019 and is the conservative US-focused end; the top of the band is PhRMA-member reporting, which is scoped differently year to year. NIH base $47B is a third figure with its own source. The framework replaces price-based R&D recovery with public funding (ASM-001/002); this is the replacement cost.",
    url: "https://www.cbo.gov/publication/57126",
    adjustable: false
  },
  {
    id: "workforceEdu", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "Workforce pipeline: 55k training slots, scholarships, Rural Service Corps",
    low: 15, mode: 25, high: 40,
    confidence: "medium",
    source: "Medicare GME $100–180k/resident/yr × the plan's 55,000 new residency slots, plus AAMC debt-relief scale and rural incentives. The attribution used to read CMS/MedPAC and that was wrong. This pass extracted the MedPAC contractor report it pointed at and found that the $105,761–$182,233 per-resident-amount range is not in it, in any formatting - that report's own per-resident amounts run about $57k to $150k. The range is in the study summary cited here.",
    url: "https://www.fiercehealthcare.com/practices/study-suggests-medicare-overpaying-1-28b-annually-to-support-residency-programs",
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
    source: "The plan targets at least 92%. Saez–Zucman assume 85%, stated in the cited memo as households reducing liability by 15% through evasion and avoidance combined; critics argue much lower. Applied to gross potential above.",
    url: "https://www.warren.senate.gov/imo/media/doc/Wealth%20Tax%20Revenue%20Estimates%20by%20Saez%20and%20Zucman%20-%20Feb%2024%2020211.pdf",
    adjustable: true, sliderMin: 40, sliderMax: 95
  }
];

/* ---- What the research files recommend, as data (R33 [§S6a]) ------------
 * A parameter whose implemented range does not contain the range its own
 * research file recommends is not necessarily wrong - the framework makes
 * policy choices its sources do not - but the gap has to be visible. Two of
 * them ran in opposite directions, so they partly cancelled in the headline
 * and a reader could see neither.
 *
 * Declared here rather than left in prose so a self-test can hold the pair:
 * either the declared range contains the recommendation, or the parameter
 * carries a divergence note saying which way it leans and why. Adding a
 * recommendation without doing one or the other fails the build.
 * ------------------------------------------------------------------------ */
export interface ResearchRecommendation {
  id: string;
  low: number;
  high: number;
  file: string;
  parameterId: string;
}
export const RESEARCH_RECOMMENDATIONS: ResearchRecommendation[] = [
  {
    id: 'publicAdminRate', low: 2, high: 6,
    file: 'research/05_it_governance_rd_transition.md', parameterId: 'RB-05-GOV-008'
  },
  {
    id: 'providerPaymentFactor', low: 0.39, high: 0.39,
    file: 'research/03_drugs_pharmacy_diagnostics_devices.md', parameterId: 'RB-03-RX-015 / RB-03-DX-011'
  }
];

/* Quick lookup map */
/* R135 [§S11b]: a parameter graded medium or better states where its number
 * came from.
 *
 * This is baseline-registry.ts's ninth check, one layer up, and P17 said in so
 * many words to copy the shape rather than design a new one. The seed has had
 * this gate since P15; params.ts is what the live engine reads and it had
 * nothing, so nine medium-graded parameters carried an empty url through five
 * sections.
 *
 * Two things are deliberate, both taken from the seed's version:
 *
 * 1. The honestly-ungraded are PRINTED, not counted into a bare pass. A
 *    parameter with no external source is fine as long as it is graded low and
 *    says so; a gap nobody can see is a gap nobody closes.
 * 2. Failure is on grade-without-citation, never on the absence of a citation
 *    by itself. lowValueCapture went the other way for exactly this reason:
 *    no study estimates what share of low-value care a records mesh removes,
 *    so it is graded low with the search recorded, rather than pointed at the
 *    pool's URL, which does not carry that number. */
export function unsourcedGradedParameters(): string[] {
  /* [P17 fix run 6]: ENGINE_CONSTANTS lives in this file, carries the same
     `confidence` and `url` pair, and was outside this sweep. Latent rather than
     live - its one medium-graded constant has a URL - but the rule is about the
     pair, not about which array holds it. */
  const graded = (c: string | undefined, url: string | undefined) =>
    c !== undefined && isSourcedGrade(c) && (url === undefined || url.trim() === '');
  return [
    ...PARAM_DEFS
      .filter((d) => graded(d.confidence, d.url))
      .map((d) => d.id + ' (' + d.confidence + ') ' + (d.label || '')),
    ...ENGINE_CONSTANTS
      .filter((c) => graded(c.confidence, c.url))
      .map((c) => c.id + ' (' + c.confidence + ') engine constant')
  ];
}

/* The other half of the pair: which parameters are honestly without a source.
   Reported so the number is visible and can go down, not asserted away. */
export function parameterSourceBacklog(): string[] {
  return [
    ...PARAM_DEFS.filter((d) => d.url === undefined || d.url.trim() === '')
      .map((d) => d.id + ' (' + (d.confidence ?? 'ungraded') + ')'),
    ...ENGINE_CONSTANTS.filter((c) => c.url === undefined || c.url.trim() === '')
      .map((c) => c.id + ' (' + c.confidence + ')')
  ];
}

export const PARAMS_BY_ID: Record<string, ParamDef> = {};
PARAM_DEFS.forEach(function (p) { PARAMS_BY_ID[p.id] = p; });

/* ---- The transition envelope, derived -----------------------------------
 * R253 [§S5]. One quantity was stated three ways and none of the three knew
 * about the others: `rollout.astro` typed "$1.2-$2.0 trillion" in prose and
 * again in a display tile; `params.ts` carries `transitionTotal` at
 * $1,000-2,200B with $1,500B central plus `itCapital` at $60-180B with $100B
 * central; and the cost-bridge chart excluded the whole thing through a
 * branch that could never fire (R156). The page's band was narrower than the
 * model's on both ends and its caption claimed to cover "infrastructure"
 * while leaving IT capital out of the envelope entirely.
 *
 * The published figure is now computed from the two parameters rather than
 * typed. The framework's own controlled envelope - Table D6B-14, $1.2T-$2.0T
 * over 10-12 years - is carried alongside as the anchor it is, not deleted:
 * the model's range is wider on both ends because it prices IT capital
 * separately and holds a wider band on transition protection.
 * ------------------------------------------------------------------------ */
export interface TransitionEnvelope {
  low: number; mode: number; high: number;
  parts: string[];
  frameworkLow: number; frameworkHigh: number;
}
export function transitionEnvelope(): TransitionEnvelope {
  const ids = ['transitionTotal', 'itCapital'];
  const parts = ids.map(function (id) {
    const p = PARAMS_BY_ID[id];
    if (!p) throw new Error('Transition envelope names unknown parameter ' + id);
    return p;
  });
  return {
    low: parts.reduce(function (a, p) { return a + p.low; }, 0),
    mode: parts.reduce(function (a, p) { return a + p.mode; }, 0),
    high: parts.reduce(function (a, p) { return a + p.high; }, 0),
    parts: ids,
    /* Framework Table D6B-14, the controlled position this is measured
       against. Display only; never a target. */
    frameworkLow: 1200, frameworkHigh: 2000
  };
}

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

/* ---- The two outlay shapes, and what is actually claimed about them ------
 * R254 [§S11b]. The row said `rollout.astro` states the plan "explicitly does
 * not invent phase shares or straight-line the total" and that `params.ts`
 * shipping `transitionShape` contradicts it. Measured: no such sentence
 * exists anywhere in `src/`, and `grep -rni "phase share"` returns nothing.
 * What `rollout.astro` says is that transition cost "is not straight-lined:
 * the model carries an annual outlay profile", which asserts that these
 * arrays exist and do what they do. The page and the code agree.
 *
 * The real gap is smaller and it is here. Twenty hand-set fractions, and the
 * only thing checked about them was that each array sums to 1. Three claims
 * were being made and one was being tested:
 *
 *   - the sum. Checked already.
 *   - the SPAN. The comments say "over yrs 1-12" and "over yrs 1-8", and the
 *     page says "runs over 10-12 years". Nothing held the arrays to it, so
 *     moving weight into year 14 would keep the sum at 1 and quietly make
 *     three statements false.
 *   - "not straight-lined", which the page states outright. Nothing tested
 *     it, so a flat profile would have satisfied every check while
 *     contradicting the sentence describing it.
 *
 * Declared here so all three can fail. What is NOT claimed is that the
 * fractions are sourced: they are an analyst-shaped profile, graded as one,
 * and `basis` says what would have to exist to do better.
 * ------------------------------------------------------------------------ */
export interface OutlayShape {
  id: 'transitionShape' | 'itCapitalShape';
  years: number;
  label: string;
  basis: string;
}
export const OUTLAY_SHAPES: OutlayShape[] = [
  {
    id: 'transitionShape', years: 12,
    label: 'Transition outlay profile',
    basis: 'ASSUMPTION. The shape of transition spending over the years it ' +
      'runs: slow in year one while contracts are let, a plateau through the ' +
      'middle years when wave conversion and worker bridges overlap, then a ' +
      'taper as legacy operations close. No source estimates the annual ' +
      'profile of a transition of this kind, because none has been run. What ' +
      'would move it is a costed work-package schedule, which the plan ' +
      'requires and does not yet have. The total it distributes is ' +
      'transitionTotal, which is itself graded low.'
  },
  {
    id: 'itCapitalShape', years: 8,
    label: 'Information mesh capital profile',
    basis: 'ASSUMPTION. Capital for the records mesh, front-loaded because ' +
      'the build has to precede the reliance that gates on it. Same standing ' +
      'as the transition profile: no external schedule exists for it.'
  }
];

/* ---- Declared ramp milestones -------------------------------------------
 * Each policy ramp claims, in its comment above, to deliver something by a
 * named phase. Those claims are restated here as data so a self-test can
 * hold the arrays to them; prose alone drifted for four of the seven.
 * `atLeast` is the share the ramp must have reached at that phase's anchor
 * year. transitionShape and itCapitalShape are deliberately absent: they
 * are shapes over a span, not milestones at a year.
 * ------------------------------------------------------------------------ */
/* §S8 finding: the full parameter table on the Healthcare chapter renders
   `label`, `unit`, `source` and the divergence fields, so those four are reader
   prose and golden rule 2 applies to them. Seven catalog codes were reaching a
   reader there, four of them in the "Framework X requires Y" register the same
   rule forbids. Checked by value rather than by scanning the file, for the
   reason careProseCatalogCodes is: this module legitimately names CP ids in
   comments and in research-file pointers that nothing renders. */
/* Review [§S8]: the one owner of the catalog-code shape.
 *
 * It was written out three times - here, in care.ts and in manifest-check.ts -
 * by the three commits that each needed it. That is the duplication
 * `PARAMETER_EXPLORER = HEALTH_PAGE` was collapsed to avoid, reintroduced one
 * field over: a second literal is how two checks end up scanning for different
 * things after an edit. `params.ts` owns it because it is the module the other
 * two already depend on.
 *
 * KPP/TPP/CP metric ids, SR/PR requirement ids, OI open issues, SN source notes,
 * GAP markers. Returned fresh rather than shared, so no caller inherits another
 * caller's `lastIndex`. */
export const CATALOG_CODE_SOURCE =
  String.raw`\b(?:KPP|TPP|CP|SR|PR|OI|SN|GAP)-[A-Z0-9][A-Z0-9.\-]*`;

export function catalogCode(flags?: string): RegExp {
  return new RegExp(CATALOG_CODE_SOURCE, flags);
}

export function paramProseCatalogCodes(): string[] {
  const code = catalogCode();
  const out: string[] = [];
  for (const p of PARAM_DEFS) {
    const rendered: Array<{ where: string; text: string }> = [
      { where: 'label', text: p.label || '' },
      { where: 'unit', text: p.unit || '' },
      { where: 'source', text: p.source || '' },
      { where: 'divergence.leans', text: p.divergence ? p.divergence.leans : '' },
      { where: 'divergence.recommended', text: p.divergence ? p.divergence.recommended : '' },
      { where: 'divergence.note', text: p.divergence ? p.divergence.note : '' }
    ];
    for (const r of rendered) {
      const hit = r.text.match(code);
      if (hit) out.push(p.id + '.' + r.where + ': ' + hit[0]);
    }
  }
  return out;
}

export interface RampMilestone { ramp: keyof typeof RAMPS; phase: string; atLeast: number; claim: string }
export const RAMP_MILESTONES: RampMilestone[] = [
  { ramp: 'coverage',      phase: 'P3', atLeast: 0.20, claim: 'public coverage wave I opens' },
  { ramp: 'coverage',      phase: 'P6', atLeast: 0.85, claim: 'national public default coverage' },
  /* R81 [§S8]: the care page's premium card rests on migration being FINISHED,
     not started, and no milestone said when that is. 0.99 is the ramp's own
     mature share: the residual is KPP-A2's uninsured rate, not an unmigrated
     wave. Declared here so the card's gate has something behind it. */
  { ramp: 'coverage',      phase: 'P7', atLeast: 0.99, claim: 'coverage migration complete' },
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
  /* R11 [§S6a]: the mechanism this offset is the one home of, and the base it
     acts on. `HANDOFF.md` constraint 4 asked for a demonstration that no
     saving is counted twice; the engine has always had the property and the
     document was never written. research/offset_architecture.md is that
     document, and these two fields are what holds it to the code: it names
     every offset the engine produces and no others, and no two offsets may
     claim the same mechanism. */
  mechanism: string;
  scope: string;
}

/* The document that explains the architecture these pairings implement.
   Checked to exist, and checked to name every mechanism below. */
export const OFFSET_ARCHITECTURE_DOC = 'research/offset_architecture.md';
export const OFFSET_RAMPS: OffsetPairing[] = [
  {
    id: 'offProvAdmin', ramp: 'coverage',
    mechanism: 'provider billing and revenue cycle',
    scope: 'hospital + clinical spend',
    delivers: 'provider-side billing and collections savings',
    why: 'A practice stops maintaining multi-payer billing only as its payer mix ' +
      'consolidates onto the public rail, so the saving tracks coverage share and ' +
      'nothing else. It is already scoped to hospital and clinical spend.'
  },
  {
    id: 'offCareModel', ramp: 'units',
    mechanism: 'avoided emergency and inpatient activity',
    scope: 'avoided emergency and inpatient activity',
    delivers: 'ED diversion and avoidable admissions',
    why: 'The diversion has to have somewhere to divert to. Both halves of this ' +
      'term depend on a staffed diagnostic-treatment unit being reachable, which ' +
      'is exactly what the unit-network ramp measures.'
  },
  {
    id: 'offLowValue', ramp: 'infra',
    mechanism: 'low-value and duplicate care not ordered',
    scope: 'the declared national low-value-care pool',
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
    mechanism: 'related-party extraction recovered',
    scope: 'hospital budgets',
    delivers: 'related-party extraction recovered',
    why: 'Extraction is recovered by the budget agreement that replaces ' +
      'fee-for-service billing at a hospital, so it arrives with the ' +
      'global-budget migration and stops at the share of spend that has migrated.'
  }
];

/* Benchmarks for the comparison panel (research/01, RB-01-FIN-015/016).
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

/* ---- Sponsor shares, read from the money-flow map -----------------------
 * R21 [§S6a]. The engine restated all four of MONEYFLOW's sponsor shares as
 * literals - 0.32 federal, 0.16 state/local, 0.18 employer, 0.27 household -
 * so the financing block and the money-flow chart carried the same four
 * numbers with nothing linking them. They agree to the rounding and that is
 * the whole problem: 1557/4866.5 = 0.3199, 779/4866.5 = 0.1601,
 * 876/4866.5 = 0.1800, 1314/4866.5 = 0.2700, so a correction to a sponsor
 * total would have moved the chart and left the engine where it was.
 *
 * The engine divides rather than restating. The rounding that was baked into
 * the four literals goes with it, which moves published output slightly: that
 * movement is the measurement of how far the two had already drifted.
 * ------------------------------------------------------------------------ */
export function sponsorShare(id: string): number {
  const s = MONEYFLOW.sources.filter(function (x) { return x.id === id; })[0];
  if (!s) throw new Error('MONEYFLOW declares no sponsor ' + id);
  return s.value / MONEYFLOW.total;
}
export const SPONSOR_SHARE = {
  household: sponsorShare('hh'),
  employer: sponsorShare('emp'),
  federal: sponsorShare('fed'),
  stateLocal: sponsorShare('state'),
  otherPrivate: sponsorShare('oth')
};

/* ---- The engine's own constants -----------------------------------------
 * R21 [§S6a]. Ten load-bearing numbers sat inside model.ts with no parameter,
 * no source and no confidence grade, which meant their uncertainty was not
 * wide or narrow - it was absent. Four were the sponsor shares above and are
 * now derived. The rest are here.
 *
 * A constant in this registry is NOT a parameter: it does not vary across the
 * Monte Carlo draws, and `sampled: false` says so out loud rather than leaving
 * a reader to infer it from the absence of a distribution. Where a value is an
 * analyst assumption with no source, it is graded `low` and `basis` says what
 * would have to be measured to move it - the same honesty convention the
 * parameter base uses. Where the repo's own data can name a comparator for the
 * assumption, `basis` gives that comparator and the direction the assumption
 * leans, because "no source" and "no way to check it" are different claims.
 *
 * The engine reads these; nothing restates them. Two self-tests hold that: one
 * fails the build on a numeric literal inside the engine that is neither
 * structural nor registered here, and one fails it on a registered constant
 * the engine never reads, so the registry cannot fill up with documentation
 * for code that no longer exists.
 * ------------------------------------------------------------------------ */
export interface EngineConstant {
  id: string;
  value: number;
  unit: string;
  usedBy: string;
  basis: string;
  url: string;
  /* R138 [P17 fix run 6]: was `'high' | 'medium' | 'low'`. R138 typed
     ParamDef from the declared scale and left this one restating the
     narrow three - the exact narrowing R138 existed to remove. */
  confidence: Confidence;
  sampled: boolean;
}

export const ENGINE_CONSTANTS: EngineConstant[] = [
  {
    id: 'stateMoeFraction', value: 0.75,
    unit: 'share of the state/local sponsor share',
    usedBy: 'stateMoe',
    basis: 'ASSUMPTION. How much of current state and local health spending a ' +
      'maintenance-of-effort provision redirects into the public program. The ' +
      'money-flow map names what is there to redirect: of the $779B state and ' +
      'local sponsors carry, $314B is the state Medicaid share and $169B is ' +
      'state and local employee premiums, together 62% of the total. 0.75 ' +
      'therefore also assumes about $100B of state and local public-health and ' +
      'facilities spending moves. That is a design choice about what the ' +
      'provision covers, not a measured quantity. It raises the state ' +
      'contribution, so it lowers the new-revenue requirement.',
    url: '', confidence: 'low', sampled: false
  },
  {
    id: 'oopShareOfResidual', value: 0.5,
    unit: 'share of residual private spend',
    usedBy: 'householdRelief',
    basis: 'ASSUMPTION. Of the private spending that survives at maturity - ' +
      'supplemental and substitute plans, plus care the benefit does not ' +
      'cover - the share households pay directly instead of through a premium. ' +
      'Today the comparable ratio is lower: out-of-pocket $505.7B against ' +
      'private insurance $1,464.6B is 26% of the two together. The residual ' +
      'under NHA is a different mix, weighted toward uncovered care that is ' +
      'paid at the counter, which is the argument for a higher share; nothing ' +
      'measures it. It is subtracted from household relief, so setting it too ' +
      'high understates the relief rather than flattering it.',
    url: '', confidence: 'low', sampled: false
  },
  {
    id: 'embeddedDrugHospitalShare', value: 0.6,
    unit: 'share of embedded drug spend',
    usedBy: 'baselineCategorySplit',
    basis: 'ASSUMPTION. Provider-administered drugs are booked inside the ' +
      'hospital and physician categories rather than in retail drugs (MedPAC ' +
      'July 2024 Data Book, Section 10), so embeddedDrugSpend is taken out of ' +
      'those two before the drug price factor is applied to the drug base. No ' +
      'source splits that total between the two settings. The split is ' +
      'output-neutral by construction: both categories carry the same payment ' +
      'factor and the same utilization term, so their sum does not depend on ' +
      'it and only the decomposition rows move. A self-test pins that, which ' +
      'is why an unsourced constant is tolerable here and would not be ' +
      'anywhere else.',
    url: 'https://www.medpac.gov/wp-content/uploads/2024/07/July2024_MedPAC_DataBook_Sec10_SEC.pdf',
    confidence: 'low', sampled: false
  },
  {
    id: 'embeddedDrugClinicShare', value: 0.4,
    unit: 'share of embedded drug spend',
    usedBy: 'baselineCategorySplit',
    basis: 'ASSUMPTION. The remainder of embeddedDrugHospitalShare, and it has ' +
      'to be the remainder: the two shares sum to 1 so the split nets to zero ' +
      'across the four baseline categories, which is what makes the cost ' +
      'bridge identity exact. A self-test holds the sum.',
    url: 'https://www.medpac.gov/wp-content/uploads/2024/07/July2024_MedPAC_DataBook_Sec10_SEC.pdf',
    confidence: 'low', sampled: false
  },
  {
    id: 'programInputRealGrowth', value: 0.012,
    unit: 'real growth per year',
    usedBy: 'runPath and matureAtScale, as Gw',
    basis: 'ASSUMPTION. The expansions that are program payrolls rather than ' +
      'health services - the direct-care wage floor, the unit network, public ' +
      'R&D, the workforce pipeline and IT operations - are grown at a real ' +
      'input-cost rate instead of the health-cost rate, which is ' +
      'baselineRealGrowth at 3.4% central. Nothing in the repo sources the ' +
      '1.2%. It compounds from 2023, so it is worth more than its size ' +
      'suggests: by 2042 it has raised those lines 25% before any ramp. Using ' +
      'the health-cost rate instead would raise them 89%, so the choice of the ' +
      'lower rate is the conservative one for those lines and the optimistic ' +
      'one for total cost.',
    url: '', confidence: 'low', sampled: false
  },
  {
    id: 'correlatedDrawQuantileClamp', value: 0.02,
    unit: 'quantile, applied at both ends',
    usedBy: 'sampleParams',
    basis: 'ASSUMPTION, and one R21 did not name. Each run draws a systemic ' +
      'factor z, and a parameter tagged in PARAM_CORR has its sampling ' +
      'quantile shifted by CORR_WEIGHT x sign x z. That shift can push the ' +
      'quantile outside [0,1], where the triangular inverse is undefined, so ' +
      'it is clamped - but it is clamped to [0.02, 0.98] rather than to ' +
      '[0, 1]. Staying inside the unit interval needs the second; the first ' +
      'also removes the outer 2% of the range of every tagged parameter, so ' +
      'the reported p10 and p90 sit inside what the declared low and high ' +
      'imply. 21 of the parameters are tagged and only those are clamped. ' +
      'Nothing sources the 2%. It narrows published bands and moves no ' +
      'central estimate, which is why it went unnoticed.',
    url: '', confidence: 'low', sampled: false
  },
  {
    id: 'wageTaxFeedbackRate', value: 0.28,
    unit: 'average marginal federal rate',
    usedBy: 'taxFeedback',
    basis: 'The rate applied to wages employers pass through once the health ' +
      'contribution replaces premiums, returning revenue to the federal ' +
      'government. The pass-through convention and this rate both come from ' +
      "CBO's review of who bears employer premiums (Carloni, CBO Working " +
      'Paper 2021-06), which the wagePassThrough parameter already cites; the ' +
      'rate itself was documented in a code comment and in that source string ' +
      'and registered nowhere. Registered here at the grade of its source. It ' +
      'is fixed, so this term contributes no uncertainty while the ' +
      'pass-through share it multiplies contributes plenty; whether it should ' +
      'be sampled is R124, and §S11b owns that.',
    url: 'https://www.cbo.gov/publication/57089',
    confidence: 'medium', sampled: false
  }
];

export const ENGINE_CONSTANTS_BY_ID: Record<string, EngineConstant> = {};
ENGINE_CONSTANTS.forEach(function (c) { ENGINE_CONSTANTS_BY_ID[c.id] = c; });

export function engineConstant(id: string): number {
  const c = ENGINE_CONSTANTS_BY_ID[id];
  if (!c) throw new Error('No engine constant registered as ' + id);
  return c.value;
}

/* The literals the engine may still type inline, and why each one is not a
   model quantity. Anything else in an engine function fails the build. */
export interface StructuralLiteral { value: number; why: string }
export const ENGINE_STRUCTURAL_LITERALS: StructuralLiteral[] = [
  { value: 0, why: 'identity, ramp default, and loop start' },
  { value: 1, why: 'identity, and 1 - share complements' },
  { value: 2, why: 'index arithmetic into the year array' },
  { value: 3, why: 'the steady state is the mean of the final three years' },
  { value: 10, why: 'the ten-year federal window the comparators use' },
  { value: 100, why: 'percent to share' },
  { value: 1000, why: '$B over population in millions gives $ per person' },
  { value: 2030, why: "CBO's comparator year, named because it is a calendar year" },
  { value: 7, why: 'mulberry32 bit shift' },
  { value: 14, why: 'mulberry32 bit shift' },
  { value: 15, why: 'mulberry32 bit shift' },
  { value: 61, why: 'mulberry32 mixing constant' },
  { value: 42, why: 'default RNG seed, so a run without one is still reproducible' },
  { value: 4294967296, why: 'mulberry32 divisor, 2^32' }
];

/* And the literals a module-scope DECLARATION in the engine may hold, which is
   a different question from what a formula may hold. Found by review: the scan
   above starts at the first sampling function, so declarations above it were
   invisible - and a named constant at module scope is the right home for a
   structural value, not a loophole. The lists are deliberately not the same.
   0.5 belongs here as a band level and never inside an engine formula, where
   it used to be the out-of-pocket share of residual private spend. */
export const ENGINE_DECLARATION_LITERALS: StructuralLiteral[] = [
  { value: 0.1, why: 'the 10th percentile band level' },
  { value: 0.5, why: 'the median band level' },
  { value: 0.9, why: 'the 90th percentile band level' },
  { value: 2166136261, why: "FNV-1a's offset basis, in the per-parameter stream hash" },
  { value: 16777619, why: "FNV-1a's prime, in the same hash" }
];

/* ---- "What's wrong, by the numbers" - sourced problem statistics --------
 * Every figure traces to the research files in the repo (research/01–06). */
export const PROBLEM_STATS = [
  { value: "17.6% of GDP", label: "U.S. health spending, 2023",
    note: "$4.87T, or $14,570 per person, the highest of any nation (CMS NHE)" },
  /* R6 [S11a]. This said "(KFF/Census, 2024)", which named both sources and
     so hid that the two do not measure the same population. 26.7M is KFF's
     count of the uninsured UNDER AGE 65 in 2024, at a 9.8% rate. The 8.0%
     the model uses as its uninsured share is the Census CPS ASEC ALL-AGES
     rate. 26.7 / 334.0 does come to 8.0%, which is why nobody caught it, but
     the numerator is an under-65 count and the denominator an all-ages
     population -- and the seed's own BL-0015 has read "two incompatible
     measures exist" since it was written. Only the label is corrected here:
     moving the 8.0% input would move scenario economics, and this is a
     labelling defect. See research/README.md, "The 26.7M uninsured headline". */
  { value: "26.7M", label: "people under 65 uninsured",
    note: "up 1.3M on 2023, a 9.8% rate, after Medicaid unwinding and ACA subsidy expiration (KFF analysis of Census ACS, 2024)" },
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
