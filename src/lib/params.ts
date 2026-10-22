/* =========================================================================
 * National Health Assurance Simulation - Parameter Base
 * =========================================================================
 * Every uncertain parameter is a triangular distribution (low / mode / high)
 * with a source citation and a confidence grade. Fixed calibration constants
 * (CMS's 2023 figures, as its latest release states them) are point values.
 *
 * DESIGN RULES (from BUILD-BRIEF.md):
 *  - Calibration base year is 2023, read from CMS's latest NHE release (the
 *    2024 release, which finalizes 2024 and revises 2023; owner, 2026-10-19).
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
import { type Confidence, type ParamDef } from './model-types';
import { lookupOrThrow, namedRegistry } from './registry-lookup';
import { SZ_LETTER, SZ_WEALTH_PATH, steadyShare } from './score-rebase';

/* The branch review against main (2026-10-21): the checks over this table
   live in params-check.ts, re-exported here so every import that names this
   module still works. */
export {
  denominatorSumDrift, unsourcedGradedParameters, parameterSourceBacklog,
  paramProseCatalogCodes
} from './params-check';

/* R41 [§S5]: the research files this parameter base reconciles against, as
   data. Checked to exist on disk, so the header cannot outlive them. */
export const RECONCILED_AGAINST = [
  'research/01_macro_financing_population_offsets.md',
  'research/02_hospital_clinical_workforce_education.md',
  'research/03_drugs_pharmacy_diagnostics_devices.md',
  'research/04_ltc_behavioral_dvh_ems_publichealth.md',
  'research/05_it_governance_rd_transition.md'
];

/* ---- Fixed calibration constants: CMS NHE 2023 (USD billions, nominal 2023)
 * Owner, 2026-10-19 ("recalibrate it to most recent and connected data"):
 * CMS's 2024 release, Table 2 (by type of expenditure) and Table 1 (GDP and
 * population), its 2023 column. That release revises every 2023 line the
 * 2023 release gave (total 4,866.5 to 4,925.3) and finalizes 2024, and the
 * archive CMS serves holds only it (R35, research/README.md). GDP and
 * population are the ones CMS divides by, so the GDP share is CMS's 17.7%;
 * the amount per person computes to $14,581 on the population as Table 1
 * prints it (337.8M), a dollar above CMS's $14,580, which divides by the
 * unrounded count. The base year stays 2023, the year every parameter's
 * dollars are stated in. */
export const BASE2023 = {
  nheTotal:       4925.3,  // national health expenditures
  hospital:       1501.1,  // hospital care
  physician:      1026.9,  // physician & clinical services
  otherProf:       166.9,  // other professional services
  dental:          177.5,  // dental services
  otherPersonal:   293.7,  // other health, residential & personal care
  homeHealth:      153.6,  // home health care
  nursing:         205.0,  // nursing care facilities & CCRC
  rxRetail:        432.9,  // retail prescription drugs
  dme:              81.9,  // durable medical equipment
  nondurables:     123.3,  // other non-durable medical products
  netInsCost:      313.4,  // non-medical insurance expenditures (the net cost of insurance)
  govtAdmin:        57.7,  // government administration
  publicHealth:    158.0,  // government public health activities
  gdp:           27811.5,  // GDP, BEA, as Table 1 states it
  populationM:     337.8,  // U.S. population, Census (resident-based, less armed forces overseas), Table 1
  investmentResidual: 0 as number,
};
/* Investment (research, structures and equipment): the rest, so the
 * categories sum exactly to nheTotal. In the 2024 release this equals CMS's
 * own investment line (233.4), where the 2023 release's bundled lines had
 * left a derived 238.7 (research/01 RB-01-TOT-004). */
(function () {
  const b = BASE2023;
  const listed = b.hospital + b.physician + b.otherProf + b.dental +
    b.otherPersonal + b.homeHealth + b.nursing + b.rxRetail + b.dme +
    b.nondurables + b.netInsCost + b.govtAdmin + b.publicHealth;
  b.investmentResidual = +(b.nheTotal - listed).toFixed(1); // CMS's investment line, 233.4 in the 2024 release
})();

/* Owner, 2026-10-12: the 2023 baseline as the pages state it, formatted from
 * BASE2023. "$4.87T", "17.6% of GDP" and "$14,570 per person" were typed on
 * the Overview and Healthcare pages beside the figures they round. */
/* Review 3 of P24: the GDP share and the per-person figure were each written
   out here and again in KPP-C1 and KPP-C2. One function each now, of the
   base they read, so a test can hand them another base and see them move. */
type NheBase = Pick<typeof BASE2023, 'nheTotal' | 'gdp' | 'populationM'>;
export function nheGdpSharePct(b: NheBase = BASE2023): number {
  return 100 * b.nheTotal / b.gdp;
}
/* dollars per person, in the base's own dollars (2023 for BASE2023) */
export function nhePerPerson(b: NheBase = BASE2023): number {
  return b.nheTotal * 1e3 / b.populationM;
}
export function base2023Text(b: NheBase = BASE2023): { total: string; gdpShare: string; perPerson: string } {
  return {
    total: '$' + (b.nheTotal / 1000).toFixed(2) + 'T',
    gdpShare: nheGdpSharePct(b).toFixed(1) + '%',
    perPerson: '$' + Math.round(nhePerPerson(b)).toLocaleString('en-US')
  };
}
export const BASE2023_TEXT = base2023Text();

/* ---- Who finances 2023's spending: CMS's sponsor tables -------------------
 * Owner, 2026-10-19: the money-flow map's ribbons are sums of these rows, read
 * from CMS's 2024 release, Tables 5-1 to 5-4 and Table 5, 2023 column ($B).
 * They were a decomposition fitted to the 2023 release's totals, graded
 * medium. Each row is assigned to the channel that pays the care it finances.
 * Medicaid (873.7) and out-of-pocket (525.4) then equal CMS's payer totals
 * (Table 3); private insurance and Medicare land near them (1,500.5 against
 * 1,511.2; 1,021.4 against 1,037.3), because a sponsor row and a payer line
 * are cut differently; and CHIP, VA and DoD sit in CMS's "other federal health
 * insurance and programs", so in other programs, as Table 3 counts them. */
/* the sponsors and payer channels of CMS's tables, as the rows name them */
export type SponsorId = 'hh' | 'emp' | 'fed' | 'state' | 'oth';
export type ChannelId = 'priv' | 'medicare' | 'medicaid' | 'oop' | 'other';
export const NHE_2023_SPONSOR_ROWS: Array<{ from: SponsorId; to: ChannelId; value: number; row: string }> = [
  { from: 'hh', to: 'priv', value: 357.8, row: 'employee contributions to employer plans' },
  { from: 'hh', to: 'priv', value: 80.6, row: 'individual-market premiums' },
  { from: 'hh', to: 'other', value: 47.1, row: 'medical claims paid by property and casualty insurance' },
  { from: 'hh', to: 'medicare', value: 230.9, row: 'employee payroll tax' },
  { from: 'hh', to: 'medicare', value: 123.0, row: 'Part B and D premiums' },
  { from: 'hh', to: 'oop', value: 525.4, row: 'deductibles, copays, uncovered care' },
  { from: 'emp', to: 'priv', value: 708.7, row: 'employer share of group premiums' },
  { from: 'emp', to: 'medicare', value: 152.4, row: 'employer payroll tax' },
  { from: 'emp', to: 'other', value: 55.0, row: "workers' compensation and worksite care" },
  { from: 'fed', to: 'priv', value: 44.1, row: 'federal employee premiums' },
  { from: 'fed', to: 'priv', value: 0.5, row: 'retiree drug subsidy' },
  { from: 'fed', to: 'priv', value: 86.4, row: 'marketplace tax credits' },
  { from: 'fed', to: 'medicare', value: 5.5, row: 'federal employer payroll tax' },
  { from: 'fed', to: 'medicare', value: 464.7, row: 'general revenue and trust-fund draw' },
  { from: 'fed', to: 'medicare', value: 16.8, row: 'Medicare premiums paid for dual eligibles' },
  { from: 'fed', to: 'medicaid', value: 592.6, row: 'federal Medicaid share' },
  { from: 'fed', to: 'other', value: 355.8, row: 'VA, DoD, CHIP, public health and other programs' },
  { from: 'state', to: 'priv', value: 222.4, row: 'state and local employee premiums' },
  { from: 'state', to: 'medicare', value: 18.5, row: 'state and local employer payroll tax' },
  { from: 'state', to: 'medicare', value: 9.6, row: 'Medicare premiums paid for dual eligibles' },
  { from: 'state', to: 'medicaid', value: 281.1, row: 'state Medicaid share' },
  { from: 'state', to: 'other', value: 235.4, row: 'public health, CHIP and other programs' },
  { from: 'oth', to: 'other', value: 310.8, row: 'philanthropy and other private funding' }
];
/* the 2023 rows from a sponsor, into a channel, or both, summed and rounded
   to CMS's tenth ($B); a match no row makes is refused by name */
function sponsorRowSum(from: SponsorId | null, to: ChannelId | null): number {
  let s = 0, n = 0;
  NHE_2023_SPONSOR_ROWS.forEach(function (r) {
    if ((from === null || r.from === from) && (to === null || r.to === to)) { s += r.value; n++; }
  });
  if (!n) throw new Error('No 2023 sponsor rows' + (from ? ' from ' + from : '') + (to ? ' paying ' + to : ''));
  return Math.round(s * 10) / 10;
}
/* one sponsor's 2023 total, $B */
export function sponsorTotal2023(id: SponsorId): number { return sponsorRowSum(id, null); }
/* one payer channel's 2023 total, $B */
export function channelTotal2023(to: ChannelId): number { return sponsorRowSum(null, to); }
/* one sponsor's 2023 rows into one channel, $B */
export function sponsorFlow2023(from: SponsorId, to: ChannelId): number { return sponsorRowSum(from, to); }

/* Express internal 2023-real dollars as 2024 dollars for display (CPI-U
 * 2023→2024 ≈ +2.9%; GDP deflator ≈ +2.4%. We use 2.6% mid). */
export const DEFLATOR_2023_TO_2024 = 1.026;

/* ---- Observed 2024 national health expenditure --------------------------
 * R183 [§S12]. 5300 was typed twice: as the benchmark chart's observed row,
 * where it carried a label, a band and a basis, and again as a bare literal
 * in overview.ts's family-share sentence, where it carried nothing. Two
 * copies of one observed figure, one of them naked, and only the first
 * discoverable by a reader asking where the number came from.
 *
 * The row also charges that the public sentence "compares a nominal figure to
 * a deflated one". Measured, it does not: the figure it is compared against
 * is `mc.baseline[MATURE_INDEX] * DEFLATOR_2023_TO_2024`, so both sides are
 * real 2024 dollars, the same basis the benchmark chart puts them on.
 *
 * What the row's arithmetic does show is a different thing worth stating:
 * growing the calibration base forward a year in real 2024 dollars lands
 * below this observed total, so the model's own 2024 baseline runs a little
 * under what was actually spent. That is a
 * model-versus-observed gap, which the benchmark chart exists to display, not
 * a unit mismatch. "Today" in a public sentence means the observed figure. */
export const NHE_2024_OBSERVED = {
  /* Owner, 2026-10-19: CMS's 2024 release finalizes 2024 (Table 1); this
     was the preliminary 5,250-5,350 band around 5,300 */
  mid: 5278.6, low: 5278.6, high: 5278.6,
  label: 'Observed U.S. health spending, 2024',
  note: 'CMS, final (2024 release)',
  basis: 'Total national health expenditure actually spent in 2024, all payers',
  url: 'https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/historical'
};

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
     the Quality and Risk tabs, which use them as identifiers. */
  basisSource: "That is the plan's own accounting basis for the figure: its " +
    'cost catalog defines per-capita system cost as total system cost over ' +
    'covered population, and names this figure as that total.',
  comparableWith: 'matureToday'
};

/* The plan's total per person, in its own 2024 dollars, over the 2023
   population its comparison basis (matureToday) is stated at. */
export function claimPerPerson(): number {
  return FRAMEWORK_CLAIM.mode * 1e9 / (BASE2023.populationM * 1e6);
}

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
/* P25: the Census count, read from the Census Bureau's own table (CPS ASEC,
   Historical Households Table HH-1, thousands of households), where until
   then it had been named only here. research/06, "Household denominators". */
export const CENSUS_HOUSEHOLDS_2024_K = 132216;
export const HOUSEHOLD_DENOMINATORS: HouseholdDenominator[] = [
  { id: 'census', households: Math.round(CENSUS_HOUSEHOLDS_2024_K / 100) / 10, dataYear: 2024,
    source: 'US Census Bureau, Current Population Survey Annual Social and Economic Supplement, Historical Households Table HH-1: ' +
      CENSUS_HOUSEHOLDS_2024_K.toLocaleString('en-US') + ' thousand households in 2024.',
    useFor: 'Whole-population per-household figures not derived from CBO income groups: the household calculator and the KPP-C8 burden share.' },
  { id: 'cbo', households: 131.0, dataYear: 2022,
    source: 'CBO, The Distribution of Household Income 2022, supplemental workbook.',
    useFor: 'Anything computed per income group, because the group incomes and the group counts come from the same CBO table and must not be mixed with another universe.' },
  /* R172 [§S8]: a fourth site, and the one R84 did not reach. `overview.ts`
     typed both `hhNow = 132.2` and `hh2041 = 141` beside the family-burden
     sentence, so the Census count had a second copy and the 2041 projection had
     no owner at all. §BC3 named the first; nobody had checked the second.
     R184 [§S18]: and the owner R172 gave it was still a typed 141.0, with a
     source naming a "Census household projection" that no file cites. It is
     derived now, by `householdsAt()` below: the Census count grown at the
     population growth the model runs on, under a declared assumption about
     household size. A getter, because the growth rate is declared further
     down this file. */
  { id: 'census-2041', dataYear: MATURE_YEAR,
    get households(): number { return householdsAt(MATURE_YEAR); },
    /* review of P24: the assumption is stated once, below, and read here */
    get source(): string {
      return 'Derived: the 2024 Census count grown at the model\'s central population growth rate to the mature year. ' +
        HOUSEHOLD_SIZE_ASSUMPTION.statement + ' Graded ' + HOUSEHOLD_SIZE_ASSUMPTION.confidence +
        '; see research/06_tax_distribution_financing.md, "Household denominators".';
    },
    useFor: 'Per-household figures stated at the mature year, where the country is bigger than it is today. Never use it for a figure dated now.' }
];

/* R184 [§S18]: the assumption the 2041 count rests on, stated once.
 *
 * The model tracks population, not households, so a household count for a
 * future year needs a household-size assumption, and none existed. This one
 * is the plainest available: average household size holds at its 2024 level,
 * so households grow at the population growth rate. Graded low because it is
 * an assumption rather than a projection: if households keep getting smaller,
 * the 2041 count is higher than this and every per-household figure divided
 * by it is lower. */
export const HOUSEHOLD_SIZE_ASSUMPTION = {
  statement: 'Average household size holds at its 2024 level, so the number of households grows at the population growth rate.',
  confidence: 'low' as const,
  grows: 'popGrowth',
  from: 'census'
};

/* Households in `year`, in millions, one decimal like the counts declared
   above. Reads the growth rate's central value, which is the path the
   per-household figures it serves are computed on. */
export function householdsAt(year: number): number {
  const base = householdDenominator(HOUSEHOLD_SIZE_ASSUMPTION.from);
  const growth = lookupOrThrow(PARAM_REGISTRY, HOUSEHOLD_SIZE_ASSUMPTION.grows).mode / 100;
  return Math.round(base.households * Math.pow(1 + growth, year - base.dataYear) * 10) / 10;
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

/* ---- U.S. drug prices against peer countries ----------------------------
 * Owner, 2026-10-12: one figure. RAND's international comparison (RR-A788-3,
 * 2022 prices) puts U.S. prescription drug prices at 2.78 times those of 33
 * peer countries. It was typed three times: as a headline statistic, in
 * drugPriceCut's note, and as the 64% price-parity reduction TPP-3.3's
 * equation takes from it (1 - 1/2.78). Each reads it here, and so does the
 * Governance card that states it. Read 2026-10-20 (citation-excerpts.ts):
 * both ratios are of manufacturer GROSS prices; after rebates RAND puts U.S.
 * net brand prices at over three times, and gives no all-drug net ratio. */
export const US_PEER_DRUG_PRICE_RATIO = 2.78;
/* Review 3 of P24: the same comparison's brand-name ratio, and the IRA's
   first-cycle negotiated cuts (CMS, percent off list), were each typed again
   beside the other: drugPriceCut's note and the headline statistic, and that
   note and the negotiation office's Governance card. */
export const US_PEER_BRAND_PRICE_RATIO = 4.22;
/* the number of comparison countries in the same RAND comparison, and the
   year of the prices it compares (seed BL-0048's year) */
export const RAND_PEER_COUNTRIES = 33;
export const RAND_PRICE_DATA_YEAR = 2022;
export const IRA_FIRST_CYCLE_CUTS = { low: 38, high: 79 };
export function iraCutRange(): string {
  return IRA_FIRST_CYCLE_CUTS.low + '–' + IRA_FIRST_CYCLE_CUTS.high + '%';
}
/* The plan's own net-price target for the negotiation lever (SR-DRUG-002),
   stated in drugPriceCut's note and on the negotiation office's card; held to
   the requirement by tests/lib/one-figure.test.ts. */
export const PLAN_DRUG_PRICE_CUT_TARGET = 55;
/* Review 4 of P24: KPP-C6's maturity target, the stabilization reserve in
   months of volatile revenue, which the Equalization Fund's card typed. A
   constant rather than a catalog read because the Governance client would
   otherwise load the whole catalog; held to KPP-C6's record by the build row
   "The Equalization Fund's reserve figure is the catalog's". */
export const RESERVE_ADEQUACY_MONTHS = 12;
/* The plan's annual publicly funded training slots (PR-WF-002, TPP-8.3).
   Defined here, where workforceEdu's note reads it, and re-exported by
   workforce.ts for the Workforce tab and the Governance card; held to the
   requirement and the catalog record by tests/lib/one-figure.test.ts. */
export const ANNUAL_TRAINING_TARGET = 55000;

/* ---- The wealth-tax potential, from the letter it cites ------------------
 * P25. wealthTaxPotential took the Saez and Zucman letter's $351B for 2023
 * as a gross figure and wealthCollectionEff (about 85%) was applied to it.
 * The letter's figures are already net of its own 15% avoidance and evasion
 * assumption (the note to its table: "We assume a 15% tax avoidance/evasion
 * rate"), so the avoidance was taken twice. The potential is now the
 * letter's estimate gross of that assumption, carried into the model's 2023
 * economy by the rule the tax model uses for every score (score-rebase.ts):
 * the share of the letter's own GDP its estimate reaches over the last five
 * years of its window, times the model's 2023 GDP.
 *
 * The band keeps the relative width the parameter carried before P25, a
 * judgement of how far the letter may be off, kept as ratios because the
 * letter states no range of its own. Review 2 of P25: that triple is declared
 * once here; SCN-WEALTH-LOW's stress reads it too. */
export const WEALTH_BAND_SHAPE = { low: 250, mode: 350, high: 450 };
export const WEALTH_POTENTIAL_2023 = (function () {
  const B = WEALTH_BAND_SHAPE;
  const mode = steadyShare(SZ_WEALTH_PATH) * BASE2023.gdp / (1 - SZ_LETTER.avoidance);
  return { low: Math.round(mode * B.low / B.mode), mode: Math.round(mode), high: Math.round(mode * B.high / B.mode) };
})();

/* Review 1 of P25: figures a parameter's note states that a seed row or a
   research table defines, declared once so the note reads them, and held to
   the seed or the research text by tests/lib/problem-stats.test.ts. CBO's
   single-payer administrative share in 2030 (seed BL-0074); the Trade
   Adjustment Assistance cost per participant in 2006 dollars (BL-0079);
   HearingTracker's average price of a pair of hearing aids, its 2018 survey
   (BL-0063) and its 2025 survey (research/04). */
export const CBO_SINGLE_PAYER_ADMIN_PCT = { low: 1.5, high: 1.8 };
export const TAA_COST_PER_PARTICIPANT_2006 = 5786;
export const HEARING_AID_PAIR_USD = { survey2018: 4672, survey2025: 2694 };
/* The administrative jobs the workforce chapter's ledger counts as eliminated,
   thousands, by its three cases (workforce.ts SCENARIOS reads these; the
   ledger's own check holds them to its legacy categories). Declared here,
   as ANNUAL_TRAINING_TARGET is, because a note in this file reads them and
   workforce.ts imports this file. Review 1 of P25: transitionTotal's note
   said "~1.8M insurance-admin workers", a figure no research file states
   and more than twice the ledger's planning case. */
export const DISPLACED_ADMIN_WORKERS_K = { low: 560, plan: 760, high: 1000 };
/* transitionTotal's band ($B total, 2023 dollars), declared so its note can
   compare its worker anchor with the mode; and that anchor, the ledger's
   planning case times TAA's cost per participant, billions of 2006 dollars */
const TRANSITION_TOTAL_B = { low: 1000, mode: 1500, high: 2200 };
const TAA_WORKER_PART_2006_B = DISPLACED_ADMIN_WORKERS_K.plan * 1000 * TAA_COST_PER_PARTICIPANT_2006 / 1e9;

/* 2026-10-20, read at their sources for the citation excerpts
   (citation-excerpts.ts). Census, Health Insurance Coverage in the United
   States: 2024 (P60-288): the share of people uninsured for the whole
   calendar year, all ages, from the Current Population Survey. It is the
   all-ages share the coverage terms use (coverageDemandShare, KPP-A1); KFF's
   26.7M counts people under 65, a different universe. */
export const CENSUS_UNINSURED_2024 = { pct: 8.0, year: 2024 };
/* CMS NHE Table 3 (2024 release), 2023 column, $B: private health insurance.
   The out-of-pocket line equals its sponsor row (channelTotal2023('oop')). */
export const NHE_2023_PRIVATE_INSURANCE_B = 1511.2;
/* CMS's NHE projections: the release the baseline growth band was set from
   (2024-33, nominal growth and the inflation taken off it) and the release
   its url now serves (2025-34, average nominal growth). */
export const NHE_PROJECTIONS = {
  band: { release: '2024–33', nominalLow: 5.6, nominalHigh: 7.1, inflationLow: 2.3, inflationHigh: 2.6 },
  current: { release: '2025–34', averageNominal: 5.4 }
};
/* CBO, How CBO Analyzes the Costs of Proposals for Single-Payer Health Care
   Systems (Working Paper 2020-08): NHE about 5 percent larger with the LTSS
   benefit in Option 5. */
export const CBO_LTSS_NHE_INCREASE_PCT = 5;
/* PHI, Direct Care Workers in the United States: Key Facts 2025: the
   median hourly wage of all direct care workers, 2024 (citation-excerpts.ts).
   The Workforce and LTC tabs read it through LTC_WORKFORCE. */
export const DIRECT_CARE_MEDIAN_WAGE_2024 = 17.36;
/* Shrank et al., JAMA 2019: overtreatment or low-value care, $B a year */
export const LOW_VALUE_POOL_B = { low: 75.7, high: 101.2 };
/* The plan's own claim for its transition protection, $B (Years 1-12):
   the transitionTotal note states it and the rollout envelope compares
   against it. Display only; never a target. The branch review against main
   found the note typing it beside the envelope's copy. */
export const TRANSITION_PLAN_CLAIM_B = { low: 1200, high: 2000 };
/* S5 of review 1 of the owner decisions: an engine constant whose note
   states its own value is declared here, and its note reads it */
const STATE_MOE_FRACTION = 0.75;
const WAGE_TAX_FEEDBACK_RATE = 0.28;
const PROGRAM_INPUT_GROWTH = 0.012;
const QUANTILE_CLAMP = 0.02;

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
    source: "CMS NHE projections. The band was set from the " + NHE_PROJECTIONS.band.release + " release: nominal NHE growth " +
      NHE_PROJECTIONS.band.nominalLow + "–" + NHE_PROJECTIONS.band.nominalHigh + "%/yr, less ~" + NHE_PROJECTIONS.band.inflationLow + "–" +
      NHE_PROJECTIONS.band.inflationHigh + "% inflation, including the aging effect. CMS's " + NHE_PROJECTIONS.current.release +
      " release, which this address now serves, puts average nominal NHE growth at " + NHE_PROJECTIONS.current.averageNominal +
      "% a year; less the same inflation that is " +
      (NHE_PROJECTIONS.current.averageNominal - NHE_PROJECTIONS.band.inflationHigh).toFixed(1) + "–" +
      (NHE_PROJECTIONS.current.averageNominal - NHE_PROJECTIONS.band.inflationLow).toFixed(1) +
      "% real, inside the band and below its mode, and the band has not been re-estimated against it. The " +
      NHE_PROJECTIONS.band.release + " projections were published in June 2025 and assumed the law then in force, including the expiry of the enhanced Marketplace subsidies. The One Big Beautiful Bill Act (July 2025) came later: its Medicaid and Marketplace changes and the CMS interim final rule that puts its work requirement into operation lower projected public spending, its Rural Health Transformation Program adds rural funding for 2026 to 2030, and none of it is yet reflected in this range.",
    url: "https://www.cms.gov/files/document/nhe-projections-forecast-summary.pdf",
    adjustable: true, sliderMin: 1.5, sliderMax: 5.0
  },
  {
    id: "gdpRealGrowth", group: "Macro", unit: "%/yr",
    label: "Real GDP growth",
    low: 1.4, mode: 1.9, high: 2.4,
    confidence: "high",
    source: "CBO, The Budget and Economic Outlook: 2026 to 2036 (February 2026): real potential GDP grows by an average of 2.1% a year from 2026 to 2030 and 1.8% a year from 2031 to 2036. The band was set from the 2025 to 2035 outlook and has not been re-estimated; its mode sits between the two.",
    url: "https://www.cbo.gov/publication/62105",
    adjustable: false
  },
  {
    id: "popGrowth", group: "Macro", unit: "%/yr",
    label: "Population growth",
    low: 0.2, mode: 0.4, high: 0.6,
    confidence: "high",
    source: "Census Vintage 2025 estimates: the population grew 0.5% from July 2024 to July 2025, down from 1.0% the year before as net international migration fell; CBO Demographic Outlook.",
    url: "https://www.census.gov/newsroom/press-releases/2026/population-growth-slows.html",
    adjustable: false
  },

  /* == Demand response =================================================== */
  {
    id: "utilIncrease", group: "Demand", unit: "%",
    label: "Utilization increase at mature NHA (universal coverage + zero point-of-care cost)",
    low: 6, mode: 10, high: 16,
    confidence: "low",
    source: "DERIVED; no direct citation exists for this exact policy. Anchors: the RAND Health Insurance Experiment's price elasticity of medical spending, ≈ −0.2, as Aron-Dine, Einav and Finkelstein (Journal of Economic Perspectives, 2013, cited here) restate it, with its limits for summarizing nonlinear insurance contracts; OOP is ~" +
      (100 * channelTotal2023('oop') / BASE2023.nheTotal).toFixed(1) + "% of NHE (2023); CBO single-payer working paper demand-increase discussion; 26.7M uninsured under 65 gaining full coverage (KFF analysis of Census ACS, 2024). It is the model's most consequential assumption. The 26.7M is a 2024 count. The One Big Beautiful Bill Act's Medicaid and Marketplace changes, the CMS interim final rule implementing its work requirement, and the expiration of ACA enhanced premium tax credits at the end of 2025 all came after it and are projected to raise the number of uninsured people the plan would newly cover; the range does not yet include them.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3943162/",
    adjustable: true, sliderMin: 0, sliderMax: 30
  },
  {
    id: "coverageDemandShare", group: "Demand", unit: "share",
    label: "Share of utilization increase attributable to covering the uninsured (vs. cost-sharing elimination)",
    low: 0.25, mode: 0.32, high: 0.40,
    confidence: "low",
    source: "DERIVED; " + CENSUS_UNINSURED_2024.pct.toFixed(1) + "% of people were uninsured for all of " + CENSUS_UNINSURED_2024.year +
      " (Census Bureau, Current Population Survey), using roughly half average care; remainder of demand response comes from eliminating cost sharing for the already-insured. KFF's higher rate counts people under 65, a different measure. The " +
      CENSUS_UNINSURED_2024.pct.toFixed(1) + "% is a pre-2025 share. The One Big Beautiful Bill Act, the CMS interim final rule implementing its Medicaid work requirement, and the expiration of ACA enhanced premium tax credits raise it, and with it this share, which is not yet re-estimated.",
    url: "https://www.census.gov/library/publications/2025/demo/p60-288.html",
    adjustable: false
  },

  /* == Prices & payment ================================================== */
  {
    id: "providerPaymentFactor", group: "Payment", unit: "×",
    label: "Blended provider payment factor vs. current average rates (hospital + clinical)",
    low: 0.85, mode: 0.92, high: 1.00,
    confidence: "medium",
    source: "Employers and private insurers paid hospitals 254% of what Medicare would have paid in 2022 (RAND hospital price transparency study, round 5); global budgets blend rates down while Medicaid rates rise. The plan is 'capacity-first', so compression is modest vs. CBO's Medicare-rate options. 1.0 = no net rate change.",
    url: "https://www.rand.org/news/press/2024/05/13.html",
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
    requirement: 'SR-DRUG-002',
    label: "Net drug price reduction from national purchasing (mature)",
    low: 25, mode: 40, high: 55,
    confidence: "medium",
    /* Code review [§S7]: this string is rendered to readers in the parameter
       table (health.astro), so the `R34:` prefix put an internal remediation
       code in reader-facing text, which is the class golden rule 2 forbids.
       The substance stays; the code goes. */
    source: "US gross prices ~" + US_PEER_DRUG_PRICE_RATIO + "× OECD peers overall, " + US_PEER_BRAND_PRICE_RATIO + "× brand (RAND RRA788-3 2024); after manufacturer rebates, US net brand prices are still over three times. IRA first-cycle negotiated cuts " + iraCutRange() + " list / ~22% net Medicare spending (CMS). The IRA precedent here is the original CBO score: CBO re-scoring in 2025 revised the package's projected deficit reduction downward, so the precedent shows that negotiation can save at program level, not how much a national purchaser would save. The plan's own target for this lever is at least " + PLAN_DRUG_PRICE_CUT_TARGET + "%. High end assumes full international-reference-level purchasing. The cut is measured from 2023 net prices. Since then the Inflation Reduction Act's Medicare Drug Price Negotiation Program (first-cycle prices from 2026, a second cycle from 2027) and the Consolidated Appropriations Act, 2026's PBM reforms (rebate pass-through to employer plans and flat-fee Part D compensation) have lowered some status-quo net costs. Neither is estimated here, so part of the modelled cut on the affected drugs may already be realized under current law.",
    url: "https://www.rand.org/pubs/research_reports/RRA788-3.html",
    adjustable: true, sliderMin: 0, sliderMax: 65
  },
  {
    id: "embeddedDrugSpend", group: "Payment", unit: "$B (2023)",
    label: "Non-retail (hospital/clinic-administered) drug spend embedded in provider categories",
    low: 200, mode: 250, high: 300,
    confidence: "medium",
    source: "Total drug spend incl. non-retail estimated $680–730B vs. $" + BASE2023.rxRetail + "B retail (research/03, derived from CMS + IQVIA). Removed from hospital/clinical bases before payment factors to avoid double-count with drug savings.",
    url: "https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/historical",
    adjustable: false
  },

  /* == Administration ==================================================== */
  {
    id: "publicAdminRate", group: "Administration", unit: "% of public spend",
    label: "New public system administrative cost rate (claims, enrollment, operations)",
    low: CBO_SINGLE_PAYER_ADMIN_PCT.low, mode: 2.2, high: 6.0,
    confidence: "medium",
    source: "CBO single-payer analysis: " + CBO_SINGLE_PAYER_ADMIN_PCT.low + "-" + CBO_SINGLE_PAYER_ADMIN_PCT.high + "% of total spending in 2030; Taiwan NHI 1.07%, best in class; Urban and RAND cross-checks 5-6% fully loaded. The plausible band for this ratio is 2-6%, and the spread is itself a defensible modelling uncertainty rather than noise to be collapsed to one number, so the sampled range spans everything the evidence names: " + CBO_SINGLE_PAYER_ADMIN_PCT.low + "% is the aggressive case and 6% the conservative one. The mode sits above CBO for a heavier oversight and appeals architecture, which is a judgement rather than a scored estimate, so this is graded medium; the underlying question is contested and is the most politically disputed number in single-payer modelling.",
    url: "https://www.cbo.gov/publication/56811",
    adjustable: true, sliderMin: 1.0, sliderMax: 6.0
  },
  {
    id: "legacyAdminFloor", group: "Administration", unit: "share",
    label: "Residual legacy insurance admin persisting at maturity (supplemental plans etc.)",
    low: 0.05, mode: 0.08, high: 0.14,
    confidence: "low",
    source: "ASSUMPTION; the plan permits certified supplemental/substitute private plans; their overhead persists as a fraction of today's $" + BASE2023.netInsCost + "B net cost of insurance (CMS's non-medical insurance expenditures, 2023).",
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
    requirement: 'PR-CST-010',
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
    requirement: 'SR-ACC-003',
    label: "ED diversion + avoidable admission + readmission savings",
    low: 10, mode: 25, high: 45,
    confidence: "medium",
    source: "155M ED visits (CDC NHAMCS) × $2,453 average cost. The two figures come from two places and the citation covers the first: $2,453 is the Peterson-KFF Health System Tracker, NOT CDC, and pairing them under one attribution is what the seed row for this pair was corrected for. Avoidable share is disputed 25–67%; the plan targets at least a 30% reduction in low-acuity ED use. Net of unit-network substitution cost, which is priced separately in the units category.",
    url: "https://www.cdc.gov/nchs/fastats/emergency-department.htm",
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
    low: LOW_VALUE_POOL_B.low, mode: (LOW_VALUE_POOL_B.low + LOW_VALUE_POOL_B.high) / 2, high: LOW_VALUE_POOL_B.high,
    confidence: "medium",
    source: "Low-value services $" + LOW_VALUE_POOL_B.low + "-" + LOW_VALUE_POOL_B.high + "B/yr, the overtreatment category of the JAMA 2019 waste synthesis (Shrank et al.), applying the Institute of Medicine waste taxonomy. The engine carried the midpoint of that range as a literal 88, so a $" + (LOW_VALUE_POOL_B.high - LOW_VALUE_POOL_B.low).toFixed(1) + "B-wide published range contributed no uncertainty at all while the capture rate applied to it varied 15-45%. Sampled now, at the midpoint of its own range. Broader definitions run higher: the Lown Institute puts estimates at $100 billion to $700 billion a year. The band keeps the synthesis's range, whose method is stated, so it is the conservative choice on this side.",
    url: "https://doi.org/10.1001/jama.2019.13978",
    adjustable: false
  },
  {
    id: "extractionSavings", group: "Care model", unit: "$B/yr (2023, mature)",
    requirement: 'SR-HOSP-006',
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
    requirement: 'SR-LTC-002',
    label: "Long-term care benefit expansion (home-first universal LTC)",
    low: 150, mode: 230, high: 330,
    confidence: "medium",
    source: "Net new national spending for a universal, home-first long-term care benefit, above the ~$415B already spent on LTSS in 2022 (Medicaid 61%, out-of-pocket 17%). CBO estimates NHE would be about " + CBO_LTSS_NHE_INCREASE_PCT + " percent larger with the LTSS benefit in its single-payer Option 5, about $" +
      Math.round(BASE2023.nheTotal * CBO_LTSS_NHE_INCREASE_PCT / 100) + "B on the 2023 base; the mode sits a little below it. The specific plan drives the range up: a 70% home-and-community target that pays for care now given unpaid ($600B/yr, AARP 2023), eliminating the ~711,000-person HCBS waiting list (KFF 2024), and a direct-care wage floor above the $" +
      DIRECT_CARE_MEDIAN_WAGE_2024.toFixed(2) + "/hr 2024 median (PHI). Peer systems that cover this benefit spend 2.2-4.4% of GDP on it (OECD). Largest single expansion in the plan.",
    url: "https://www.cbo.gov/publication/56811",
    adjustable: true, sliderMin: 50, sliderMax: 450
  },
  {
    id: "ltcWageFloor", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "Long-term care direct-care wage floor (aide pay lifted above prevailing)",
    low: 29, mode: 52, high: 94,
    confidence: "low",
    source: "DERIVED, and separate from ltcExpansion, which prices care at prevailing wages. A home-first benefit is delivered by direct-care aides whose 2024 median wage is $" + DIRECT_CARE_MEDIAN_WAGE_2024.toFixed(2) + "/hr (PHI, 2025 edition). Lifting a covered direct-care workforce of about 5.0M FTE (range 4-6M) by a loaded ~$5.00/hr toward a living-wage floor (range $3.50-7.50) gives 5.0M x 2,080 hr x $5.00 = ~$52B/yr. This is net new spending on top of the base LTC benefit and is what raises staffing stability; without it the benefit is funded but cannot be staffed.",
    url: "https://www.phinational.org/resource/direct-care-workers-in-the-united-states-key-facts-2025/",
    adjustable: true, sliderMin: 0, sliderMax: 150
  },
  {
    id: "bhExpansion", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "Behavioral health / SUD expansion",
    low: 40, mode: 70, high: 110,
    confidence: "medium",
    source: "27.1M untreated AMI + 41.4M untreated SUD (SAMHSA NSDUH, cited here) alongside MH+SUD spend of $139.6B in 2021, which is a separate Health Affairs figure and a different vintage. Serving a large share of unmet need at current unit costs.",
    url: "https://www.samhsa.gov/data/report/2023-nsduh-annual-national-report",
    adjustable: false
  },
  {
    id: "dvhExpansion", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "Dental, vision & hearing expansion",
    low: 35, mode: 60, high: 95,
    confidence: "medium",
    source: "Dental NHE $" + BASE2023.dental + "B (2023), mostly private - the citation, and the only one of the three with a primary source. Vision is a $68.3B industry market estimate from The Vision Council, not CMS, and includes non-medical eyewear. The " + dollars(HEARING_AID_PAIR_USD.survey2018) + " average hearing-aid pair is a 2018 reader survey (HearingTracker), whose 2025 survey puts it at " + dollars(HEARING_AID_PAIR_USD.survey2025) + ", so it is graded low-medium. Universal coverage raises utilization among the currently-uncovered.",
    url: "https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/historical",
    adjustable: false
  },
  {
    id: "emsPhExpansion", group: "Expansions", unit: "$B/yr (2023, mature)",
    label: "EMS readiness + public health & prevention boost",
    low: 25, mode: 45, high: 75,
    confidence: "medium",
    source: "Ground ambulance $2,673 mean cost per transport (the median is $1,340, so high-cost organizations pull the mean up), from CMS's mandatory Ground Ambulance Data Collection System report on its first two cohorts - the citation. Ambulance deserts at 8.9% of rural residents and the TFAH $4.5B state/local public-health shortfall are separate sources carried in the research files. Plus the plan's readiness-payment model.",
    url: "https://www.cms.gov/medicare/payment/fee-schedules/ambulance-fee-schedule/medicare-gadcs-resources/gadcs-report-year-1-year-2-cohort-analysis",
    adjustable: false
  },
  {
    id: "unitsCost", group: "Expansions", unit: "$B/yr (2023, mature)",
    requirement: 'SR-ACC-010',
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
    source: "Pharma industry R&D $83–105B/yr. The citation is CBO, which states $83B for 2019 and is the conservative US-focused end; the top of the band is PhRMA-member reporting, which is scoped differently year to year. NIH base $47B is a third figure with its own source. The plan replaces price-based R&D recovery with public funding; this is the replacement cost.",
    url: "https://www.cbo.gov/publication/57126",
    adjustable: false
  },
  {
    id: "workforceEdu", group: "Expansions", unit: "$B/yr (2023, mature)",
    requirement: 'PR-WF-002',
    label: "Workforce pipeline: " + Math.round(ANNUAL_TRAINING_TARGET / 1000) + "k training slots, scholarships, Rural Service Corps",
    low: 15, mode: 25, high: 40,
    confidence: "medium",
    source: "Medicare GME $100–180k/resident/yr × the plan's " + ANNUAL_TRAINING_TARGET.toLocaleString('en-US') + " new annual publicly funded training slots in priority specialties and advanced clinical roles, plus AAMC debt-relief scale and rural incentives. The plan does not say how the " + ANNUAL_TRAINING_TARGET.toLocaleString('en-US') + " divide between physician residencies and other advanced clinical roles, so every slot is priced at the residency rate. The attribution used to read CMS/MedPAC and that was wrong. This pass extracted the MedPAC contractor report it pointed at and found that the $105,761–$182,233 per-resident-amount range is not in it, in any formatting - that report's own per-resident amounts run about $57k to $150k. The range is Chen et al.'s (JAMA Internal Medicine, 2019), as the authors' institution's release states it.",
    url: "https://shareprogram.gwu.edu/medicare-overpayments-graduate-medical-education-could-total-128-billion-annually-new-study-says",
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
    source: "VA EHRM $16–50B for 9M veterans (cautionary); UK NPfIT £9.8–12.7B failure; RAND national patient identifier $1.5–11.1B. A federated architecture is assumed cheaper per capita than VA's single-vendor approach.",
    url: "",
    adjustable: false
  },
  {
    id: "transitionTotal", group: "Transition", unit: "$B total",
    label: "Transition protection: worker bridges, hospital corridors, wind-down, continuity (Years 1–12)",
    low: TRANSITION_TOTAL_B.low, mode: TRANSITION_TOTAL_B.mode, high: TRANSITION_TOTAL_B.high,
    confidence: "low",
    source: "The plan claims $" + (TRANSITION_PLAN_CLAIM_B.low / 1000).toFixed(1) + "–" +
      (TRANSITION_PLAN_CLAIM_B.high / 1000).toFixed(1) + "T. The independent anchors bound only its worker part: the workforce chapter's " +
      (DISPLACED_ADMIN_WORKERS_K.plan * 1000).toLocaleString('en-US') + " eliminated administrative jobs (its planning case) × " +
      dollars(TAA_COST_PER_PARTICIPANT_2006) + " per participant for training and allowances on the Trade Adjustment Assistance model (2006 dollars, Mathematica for the Labor Department, 2012) is about $" +
      Math.round(TAA_WORKER_PART_2006_B) +
      "B in 2006 dollars, before income bridges. Against this band's mode, in 2023 dollars, it would reach 1% only if prices had risen " +
      (Math.round(TRANSITION_TOTAL_B.mode / 100 / TAA_WORKER_PART_2006_B * 10) / 10) +
      " times over since 2006. Hospital stabilization corridors and legacy payer wind-down have no independent anchor, so the band rests on the plan's own claim and is graded low. IT capital is priced separately.",
    url: "",
    adjustable: true, sliderMin: 400, sliderMax: 3000
  },

  /* == System shape ====================================================== */
  {
    id: "residualPrivateShare", group: "System", unit: "% of system cost",
    label: "Residual private + out-of-pocket share at maturity (supplemental, non-covered care)",
    low: 4, mode: 6, high: 9,
    confidence: "low",
    source: "ASSUMPTION; the plan allows certified supplemental/substitute plans and some non-covered services; peers: Canada ~30% private (broader exclusions), Taiwan ~15%. The plan's benefit package is unusually comprehensive, so the residual is small.",
    url: "",
    adjustable: false
  },

  /* == Financing ========================================================= */
  {
    id: "employerCapture", group: "Financing", unit: "%",
    label: "Employer Health Assurance Contribution: share of current employer spend captured",
    low: 60, mode: 75, high: 90,
    confidence: "medium",
    source: "Private business sponsors " + (100 * sponsorTotal2023('emp') / BASE2023.nheTotal).toFixed(1) + "% of NHE, $" + sponsorTotal2023('emp') + "B (2023, CMS sponsor table). The plan's EHAC (payroll-based) captures most but not all; small-business carve-outs and wage pass-through reduce capture.",
    url: "https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/historical",
    adjustable: true, sliderMin: 30, sliderMax: 100
  },
  {
    id: "wagePassThrough", group: "Financing", unit: "%",
    label: "Employer premium savings passed through to wages",
    low: 40, mode: 70, high: 95,
    confidence: "medium",
    source: "CBO convention holds that employer health costs come out of wages, so employer savings flow back as wages over time. The cited paper (Carloni, CBO Working Paper 2021-06) studies payroll taxes, the nearest measured case: it estimates that 58 percent of an increase on all earnings falls on employees in the short run, and that the long-run share depends on the tax change's wider economic effects. Wage gains are then taxable: the model applies a " +
      Math.round(WAGE_TAX_FEEDBACK_RATE * 100) + "% average marginal federal rate on the passed-through wages as a revenue feedback, an assumption the paper does not state.",
    url: "https://www.cbo.gov/publication/57089",
    adjustable: true, sliderMin: 0, sliderMax: 100
  },
  {
    id: "wealthTaxPotential", group: "Financing", unit: "$B/yr",
    label: "Extreme-wealth + high-income tax package gross potential",
    low: WEALTH_POTENTIAL_2023.low, mode: WEALTH_POTENTIAL_2023.mode, high: WEALTH_POTENTIAL_2023.high,
    confidence: "low-medium",
    source: "Saez–Zucman (February 2021 letter): a 6% marginal wealth tax on >$1B + 2% >$50M raises $" +
      SZ_LETTER.firstYearB.total + "B in " + SZ_LETTER.firstYear + ", already net of the letter's " +
      Math.round(SZ_LETTER.avoidance * 100) + "% avoidance assumption. Here gross of it, so the collection efficiency below applies avoidance once, and carried into the 2023 economy by the letter's share of its own GDP. Disputed; avoidance may be far higher. Warren plan menu and PERI options bracket the range. Its constitutionality is also unsettled: Moore v. United States (2024) upheld a tax on undistributed income and expressly left open whether a tax on wealth must be apportioned among the states.",
    url: "https://eml.berkeley.edu/~saez/saez-zucman-wealthtax-warren-feb21.pdf",
    adjustable: false
  },
  {
    id: "wealthCollectionEff", group: "Financing", unit: "%",
    requirement: 'PR-CST-008',
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
export const PARAMS_BY_ID: Record<string, ParamDef> = {};
PARAM_DEFS.forEach(function (p) { PARAMS_BY_ID[p.id] = p; });
/* R249: the parameter registry, with its own name for lookupOrThrow. */
export const PARAM_REGISTRY = namedRegistry('PARAMS_BY_ID', PARAMS_BY_ID);

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
    frameworkLow: TRANSITION_PLAN_CLAIM_B.low, frameworkHigh: TRANSITION_PLAN_CLAIM_B.high
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
 * GAP markers; and, since the owner's 2026-10-10 decision took them off every
 * page, MC cost categories, TW transition workstreams and EH hardening
 * controls. Returned fresh rather than shared, so no caller inherits another
 * caller's `lastIndex`. Also ASM assumptions, PF product families and PH
 * phase codes, which a probe of every page for any code-like token found
 * drawn outside this shape.
 *
 * Review of the content run: Quality's draw-time stripper and the page sweep
 * each wrote the families out again, and two hand lists drifting apart is
 * how ASM, PF and PH were drawn unseen. The two lists below are the only
 * ones; the shape and the stripper are built from them. */
/* the catalog's own ids, which Quality and Risk show (the owner's 2026-10-10
   decision, golden rule 2's written exception) */
export const CATALOG_ID_FAMILIES = ['KPP', 'TPP', 'CP'] as const;
/* every other family of source-document code; no page draws one */
export const OTHER_CODE_FAMILIES = ['SR', 'PR', 'OI', 'SN', 'GAP', 'MC', 'TW', 'EH', 'ASM', 'PF', 'PH'] as const;
export const CATALOG_CODE_SOURCE =
  String.raw`\b(?:` + [...CATALOG_ID_FAMILIES, ...OTHER_CODE_FAMILIES].join('|') + String.raw`)-[A-Z0-9][A-Z0-9.\-]*`;

export function catalogCode(flags?: string): RegExp {
  return new RegExp(CATALOG_CODE_SOURCE, flags);
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

/* ---- Money-flow map: who pays, through what channel (2023) ---------------
 * One ribbon per sponsor and channel, summed from NHE_2023_SPONSOR_ROWS above
 * (CMS's 2024 release, sponsor tables, 2023 column), its note naming the rows
 * it sums. Owner, 2026-10-19: the ribbons had been a decomposition fitted to
 * the 2023 release's sponsor and payer totals (graded medium); they are CMS's
 * rows now, and the sources, channels and sponsor shares are read from them. */
const FLOW_RIBBONS = (function () {
  const out: Array<{ from: SponsorId; to: ChannelId; value: number; note: string }> = [];
  NHE_2023_SPONSOR_ROWS.forEach(function (r) {
    const hit = out.filter(function (x) { return x.from === r.from && x.to === r.to; })[0];
    if (hit) { hit.value = Math.round((hit.value + r.value) * 10) / 10; hit.note += ' + ' + r.row; }
    else out.push({ from: r.from, to: r.to, value: r.value, note: r.row });
  });
  return out;
})();
/* review 2 of the owner decisions: annotated, so each id is checked against
   CMS's sponsors and channels when the file compiles */
const MONEYFLOW_SOURCES: Array<{ id: SponsorId; label: string; color: string }> = [
  { id: "hh",    label: "Households",        color: "var(--series-1)" },
  { id: "emp",   label: "Employers",         color: "var(--series-2)" },
  { id: "fed",   label: "Federal government", color: "var(--series-5)" },
  { id: "state", label: "State & local",     color: "var(--series-3)" },
  { id: "oth",   label: "Other private",     color: "var(--series-7)" }
];
const MONEYFLOW_CHANNELS: Array<{ id: ChannelId; label: string }> = [
  { id: "priv",     label: "Private insurance" },
  { id: "medicare", label: "Medicare" },
  { id: "medicaid", label: "Medicaid" },
  { id: "oop",      label: "Out-of-pocket bills" },
  { id: "other",    label: "Other programs" }
];
export const MONEYFLOW = {
  total: BASE2023.nheTotal,
  sources: MONEYFLOW_SOURCES.map(function (s) { return { ...s, value: sponsorTotal2023(s.id) }; }),
  channels: MONEYFLOW_CHANNELS.map(function (c) { return { ...c, value: channelTotal2023(c.id) }; }),
  ribbons: FLOW_RIBBONS
};
/* one channel's 2023 total, $B (the Overview states out-of-pocket's) */
export function moneyFlowChannel(id: ChannelId): number {
  const c = MONEYFLOW.channels.filter(function (x) { return x.id === id; })[0];
  if (!c) throw new Error('No money-flow channel ' + id);
  return c.value;
}


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
    id: 'stateMoeFraction', value: STATE_MOE_FRACTION,
    unit: 'share of the state/local sponsor share',
    usedBy: 'stateMoe',
    basis: 'ASSUMPTION. How much of current state and local health spending a ' +
      'maintenance-of-effort provision redirects into the public program. The ' +
      'money-flow map names what is there to redirect: of the $' + sponsorTotal2023('state') + 'B state and ' +
      'local sponsors carry (2023), $' + sponsorFlow2023('state', 'medicaid') + 'B is the state Medicaid share and $' +
      sponsorFlow2023('state', 'priv') + 'B is state and local employee premiums, together ' +
      Math.round(100 * (sponsorFlow2023('state', 'medicaid') + sponsorFlow2023('state', 'priv')) / sponsorTotal2023('state')) +
      '% of the total. ' + STATE_MOE_FRACTION + ' therefore also assumes about $' +
      Math.round(STATE_MOE_FRACTION * sponsorTotal2023('state') - sponsorFlow2023('state', 'medicaid') - sponsorFlow2023('state', 'priv')) +
      'B of state and local public-health and facilities spending moves. That is a design choice about what the ' +
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
      'Today the comparable ratio is lower: out-of-pocket $' + channelTotal2023('oop') + 'B against ' +
      'private insurance $' + NHE_2023_PRIVATE_INSURANCE_B.toLocaleString('en-US') + 'B (2023) is ' +
      Math.round(100 * channelTotal2023('oop') / (channelTotal2023('oop') + NHE_2023_PRIVATE_INSURANCE_B)) + '% of the two together. The residual ' +
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
      'those two before the drug price factor is applied to the drug base. The ' +
      'data book splits one payer\'s part of it: of Medicare fee-for-service ' +
      'spending on separately paid Part B drugs in 2022, physician offices ' +
      'accounted for 55 percent, hospital outpatient departments for 41 ' +
      'percent and pharmacy suppliers for 4 percent. No source splits the ' +
      'national total, which also holds drugs bundled into inpatient payments ' +
      'and every other payer, so the split here is an assumption. The split is ' +
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
      'bridge identity exact. A self-test holds the sum. The data book\'s ' +
      'Medicare figure for physician offices, 55 percent of separately paid ' +
      'Part B drugs in 2022, is one payer\'s share, not the national split.',
    url: 'https://www.medpac.gov/wp-content/uploads/2024/07/July2024_MedPAC_DataBook_Sec10_SEC.pdf',
    confidence: 'low', sampled: false
  },
  {
    id: 'programInputRealGrowth', value: PROGRAM_INPUT_GROWTH,
    unit: 'real growth per year',
    usedBy: 'runPath and matureAtScale, as Gw',
    basis: 'ASSUMPTION. The expansions that are program payrolls rather than ' +
      'health services - the direct-care wage floor, the unit network, public ' +
      'R&D, the workforce pipeline and IT operations - are grown at a real ' +
      'input-cost rate instead of the health-cost rate, which is ' +
      'baselineRealGrowth at ' + lookupOrThrow(PARAM_REGISTRY, 'baselineRealGrowth').mode + '% central. Nothing in the repo sources the ' +
      (PROGRAM_INPUT_GROWTH * 100).toFixed(1) + '%. It compounds from ' + BASE_YEAR + ', so it is worth more than its size ' +
      'suggests: by ' + END_YEAR + ' it has raised those lines ' +
      Math.round((Math.pow(1 + PROGRAM_INPUT_GROWTH, END_YEAR - BASE_YEAR) - 1) * 100) + '% before any ramp. Using ' +
      'the health-cost rate instead would raise them ' +
      Math.round((Math.pow(1 + lookupOrThrow(PARAM_REGISTRY, 'baselineRealGrowth').mode / 100, END_YEAR - BASE_YEAR) - 1) * 100) +
      '%, so the choice of the ' +
      'lower rate is the conservative one for those lines and the optimistic ' +
      'one for total cost.',
    url: '', confidence: 'low', sampled: false
  },
  {
    id: 'correlatedDrawQuantileClamp', value: QUANTILE_CLAMP,
    unit: 'quantile, applied at both ends',
    usedBy: 'sampleParams',
    basis: 'ASSUMPTION, and one the first sweep of engine constants did not name. Each run draws a systemic ' +
      'factor z, and a parameter tagged in PARAM_CORR has its sampling ' +
      'quantile shifted by CORR_WEIGHT x sign x z. That shift can push the ' +
      'quantile outside [0,1], where the triangular inverse is undefined, so ' +
      'it is clamped - but it is clamped to [' + QUANTILE_CLAMP + ', ' + (1 - QUANTILE_CLAMP) + '] rather than to ' +
      '[0, 1]. Staying inside the unit interval needs the second; the first ' +
      'also removes the outer ' + QUANTILE_CLAMP * 100 + '% of the range of every tagged parameter, so ' +
      'the reported p10 and p90 sit inside what the declared low and high ' +
      'imply. ' + Object.keys(PARAM_CORR).length + ' of the parameters are tagged and only those are clamped. ' +
      'Nothing sources the ' + QUANTILE_CLAMP * 100 + '%. It narrows published bands and moves no ' +
      'central estimate, which is why it went unnoticed.',
    url: '', confidence: 'low', sampled: false
  },
  {
    id: 'wageTaxFeedbackRate', value: WAGE_TAX_FEEDBACK_RATE,
    unit: 'average marginal federal rate',
    usedBy: 'taxFeedback',
    basis: 'ASSUMPTION. The rate applied to wages employers pass through once ' +
      'the health contribution replaces premiums, returning revenue to the ' +
      'federal government. It was registered at the grade of the paper the ' +
      'wagePassThrough parameter cites (Carloni, CBO Working Paper 2021-06) ' +
      'as though the paper set it. Read on 2026-10-20, the paper estimates ' +
      'who bears payroll taxes, 58 percent of an increase on all earnings ' +
      'falling on employees in the short run, and states no tax rate on the ' +
      'passed-through wages, so the rate is graded low until a source for an ' +
      'average marginal federal rate on those wages is cited. It ' +
      'is fixed, so this term contributes no uncertainty while the ' +
      'pass-through share it multiplies contributes plenty; whether it should ' +
      'be sampled is an open question.',
    url: 'https://www.cbo.gov/publication/57089',
    confidence: 'low', sampled: false
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
 * Every figure traces to the research files in the repo (research/01–06).
 *
 * R6 [§S11a], closed in P25: the statistics typed their values, so nothing
 * tied a headline to the row that sources it. Each is formatted from a
 * declared input below, and each input names where it is stated: a seed row
 * (its value, or its notes) or a research file. tests/lib/problem-stats.test.ts
 * holds every input to that statement, so a figure cannot drift from its
 * source unseen. Read 2026-10-15 against the sources themselves where the
 * seed or research file cites a page: KFF's key facts, Chartis's 2026
 * state-of-the-state, BLS CES 2024 through research/06. */
export const PROBLEM_STAT_INPUTS = {
  /* KFF analysis of Census ACS, 2024: ages 0-64 (BL-0016) */
  uninsuredUnder65: { underAge: 65, countM: 26.7, riseM: 1.3, ratePct: 9.8, year: 2024, statedIn: 'BL-0016' },
  /* BLS CES 2024 by income quintile: health outlays and income before
     taxes (research/06, "Health spending by income quintile") */
  healthBurden: { q1HealthD: 3445, q1IncomeD: 16658, q5HealthD: 9771, q5IncomeD: 264510, year: 2024,
    statedIn: 'research/06_tax_distribution_financing.md' },
  /* Himmelstein et al., Health Affairs 2014, 2011 data (BL-0038): the U.S.
     share and the two peers it names, England and the Netherlands */
  hospitalAdmin: { usPct: 25.3, peerLowPct: 15.5, peerHighPct: 19.8, year: 2011, statedIn: 'BL-0038' },
  /* Shrank, Rogstad and Parekh, JAMA 2019 (BL-0054's notes) */
  waste: { lowB: 760, highB: 935, year: 2019, statedIn: 'BL-0054' },
  /* Morra et al., Health Affairs 2011 (BL-0040) */
  billing: { usPerPhysicianD: 83000, ontarioPerPhysicianD: 22000, year: 2011, statedIn: 'BL-0040' },
  /* Chartis, 2026 Rural Health State of the State (BL-0035) */
  rural: { atRisk: 417, closedOrConvertedSince2010: 206, since: 2010, year: 2025, statedIn: 'BL-0035' },
  /* KFF 2025 Employer Health Benefits Survey (BL-0023) */
  premium: { familyD: 26993, workerD: 6850, year: 2025, statedIn: 'BL-0023' }
};
const PS = PROBLEM_STAT_INPUTS;
function dollars(x: number): string { return '$' + x.toLocaleString('en-US'); }
function pct1(x: number): string { return (Math.round(x * 10) / 10).toFixed(1) + '%'; }
export const PROBLEM_STATS = [
  { value: BASE2023_TEXT.gdpShare + " of GDP", label: "U.S. health spending, " + BASE_YEAR,
    note: BASE2023_TEXT.total + ", or " + BASE2023_TEXT.perPerson + " per person, the highest of any nation (CMS NHE)" },
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
  { value: PS.uninsuredUnder65.countM + "M", label: "people under " + PS.uninsuredUnder65.underAge + " uninsured",
    note: "up " + PS.uninsuredUnder65.riseM + "M on " + (PS.uninsuredUnder65.year - 1) + ", a " + PS.uninsuredUnder65.ratePct +
      "% rate, after Medicaid unwinding and ACA subsidy expiration (KFF analysis of Census ACS, " + PS.uninsuredUnder65.year + ")" },
  { value: pct1(100 * PS.healthBurden.q1HealthD / PS.healthBurden.q1IncomeD), label: "of income goes to healthcare in the poorest fifth of households",
    note: "vs " + pct1(100 * PS.healthBurden.q5HealthD / PS.healthBurden.q5IncomeD) + " in the richest fifth; the same bills hit " +
      Math.round(PS.healthBurden.q5IncomeD / PS.healthBurden.q1IncomeD) + " times harder at the bottom (BLS CES " + PS.healthBurden.year + ")" },
  { value: US_PEER_DRUG_PRICE_RATIO + "×", label: "U.S. prescription drug prices vs " + RAND_PEER_COUNTRIES + " peer countries",
    note: US_PEER_BRAND_PRICE_RATIO + "× for brand-name drugs (RAND international price comparison, " + RAND_PRICE_DATA_YEAR + " data)" },
  { value: PS.hospitalAdmin.usPct + "%", label: "of U.S. hospital budgets go to administration",
    note: "vs " + PS.hospitalAdmin.peerLowPct + "–" + PS.hospitalAdmin.peerHighPct +
      "% in England and the Netherlands (Himmelstein et al., Health Affairs cross-national study, " + PS.hospitalAdmin.year + " data)" },
  { value: "$" + PS.waste.lowB + "–" + PS.waste.highB + "B", label: "wasted every year, roughly a quarter of all health spending",
    note: "administrative complexity, pricing failures, low-value care, fraud (JAMA " + PS.waste.year + " synthesis)" },
  { value: dollars(PS.billing.usPerPhysicianD), label: "per physician, per year, spent on billing and insurance paperwork",
    note: "vs ~" + dollars(PS.billing.ontarioPerPhysicianD) + " for physicians in single-payer Ontario (Health Affairs)" },
  { value: String(PS.rural.atRisk), label: "rural hospitals at risk of closure",
    note: PS.rural.closedOrConvertedSince2010 + " have closed or stopped inpatient care since " + PS.rural.since + " (Chartis)" },
  { value: dollars(PS.premium.familyD), label: "average family premium, " + PS.premium.year,
    note: "workers pay " + dollars(PS.premium.workerD) + " of it, before any deductible or copay (KFF Employer Survey)" }
];


/* ---- Age structure and cost weights (demographic growth decomposition) --
 * Shares: Census projections (2024 vs ~2041), not re-read at a source; a
 * download of the Census 2023 projection tables would settle them.
 * Cost weights (owner, 2026-10-19): CMS's personal health care spending per
 * person by age, its Age and Sex Tables, Table 7, 2020 (the latest year CMS
 * publishes by age), over the all-ages figure in the same table. They had
 * been typed (0.45 / 0.65 / 1.20 / 2.40 / 4.40) with no source, and the two
 * oldest bands ran above CMS's (2.00 and 3.52). High for the weights.
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
export const CMS_AGE_PER_CAPITA_2020 = {
  allAges: 10230,
  bands: { '0–18': 4217, '19–44': 6669, '45–64': 12577, '65–84': 20503, '85+': 35995 } as Record<string, number>
};
/* a band CMS does not state is refused here, by name, when this module
   loads: before any self-test can run (mutation age-2, 2026-10-20) */
/* CMS's 2020 per-person spending for one band, refused by name when CMS
   does not state the band (costWeight and the excerpt registry read it) */
export function cmsPerPerson2020(id: string): number {
  const v = CMS_AGE_PER_CAPITA_2020.bands[id];
  if (v === undefined) throw new Error('CMS states no 2020 per-person spending for age band ' + id);
  return v;
}
export function costWeight(id: string): number {
  return cmsPerPerson2020(id) / CMS_AGE_PER_CAPITA_2020.allAges;
}
export const AGE_STRUCTURE = {
  bands: [
    { id: "0–18",  share2024: 0.217, share2041: 0.197, costw: costWeight("0–18") },
    { id: "19–44", share2024: 0.345, share2041: 0.334, costw: costWeight("19–44") },
    { id: "45–64", share2024: 0.243, share2041: 0.236, costw: costWeight("45–64") },
    { id: "65–84", share2024: 0.176, share2041: 0.204, costw: costWeight("65–84") },
    { id: "85+",   share2024: 0.019, share2041: 0.029, costw: costWeight("85+") }
  ],
  source: "Census Bureau population projections; CMS, Health Expenditures by Age and Sex, Table 7 (personal health care spending per person, 2020)"
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
