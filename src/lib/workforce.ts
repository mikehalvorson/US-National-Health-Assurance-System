/* Workforce data + planning constants, ported verbatim from docs/js/workforce.js
   (constants 11-15, SCENARIOS 17-39, LEGACY 41-97, CREATED 99-163,
   ACRONYMS 165-183). Fidelity-critical: do not re-derive. Values are in
   thousands of jobs unless noted. The LTC direct-care block at the bottom is
   new (long-term care aides) and is kept OUTSIDE the insurance-transition
   ledger above, whose entrant-pace math must not absorb millions of aides. */
import { PARAMS_BY_ID, DEFLATOR_2023_TO_2024 } from './params';
import {
  CONTROLLED_TARGET_UNITS, UNIT_TYPE_KEYS, UNIT_TYPES, type UnitTypeKey
} from './units';

export type ScenarioId = 'low' | 'plan' | 'high';

export interface Scenario {
  label: string;
  eliminated: number;
  inside: number;
  supported: number;
  created: number;
}

export interface LegacyItem {
  id: string;
  name: string;
  values: Record<ScenarioId, number>;
  inside: Record<ScenarioId, number>;
  reason: string;
  destinations: string;
  boundary: string;
  evidence: string;
  continues: string;
}

export interface CreatedItem {
  id: string;
  name: string;
  values: Record<ScenarioId, number>;
  fills: Record<ScenarioId, number>;
  derivation: string;
  roles: string;
  confidence: string;
  /* R66 + R178 [§S9a]: set only where `fills` is NOT monotone across
     low -> plan -> high. Six of the seven items are monotone and carry
     nothing. The one that is not has to say which pair inverts and why, and
     the check refuses both a missing exception and a stale one. */
  fillsException?: FillsException;
}

export interface FillsException {
  /* the adjacent pair that inverts, e.g. ['low', 'plan'] */
  between: [ScenarioId, ScenarioId];
  reason: string;
}

export const ROLLOUT_YEARS = 12;

/* R69 [§S9a]: the labour-share denominator, and the trap that comes with it.
 *
 * This is BLS INDUSTRY employment: every job across all industries, from the
 * employment-by-industry table. The OEWS total for the same year is
 * 155,495,730, and it is NOT a newer vintage of this figure -- OEWS measures
 * occupational employment and excludes the self-employed. Swapping one for
 * the other moves the denominator about 9% for the wrong reason, and the
 * obvious moment for someone to do it is a routine "update to the latest BLS
 * release".
 *
 * So the series is declared beside the number and rendered on the chapter,
 * and the incomparable measure is declared too, with a check that refuses to
 * let this constant become it.
 *
 * The `: number` annotations are load-bearing. A bare integer literal takes
 * that literal as its TYPE, so comparing two of them is a comparison
 * TypeScript rejects as impossible and the guard would be dead at compile
 * time -- which is how §S8 shipped a check that could never run. */
export const TOTAL_US_EMPLOYMENT_2024: number = 169956100;

export const TOTAL_US_EMPLOYMENT_SERIES =
  'BLS employment by industry, all industries, 2024';

/* Declared so it cannot be mistaken for an update. Not used as a denominator
   anywhere and must not become one. */
export const OEWS_TOTAL_EMPLOYMENT_2024: number = 155495730;

export const ANNUAL_TRAINING_TARGET = 55000;
export const DIRECT_PATIENT_CARE_PHYSICIANS = 866460;
export const PRIOR_AUTH_HOURS_PER_WEEK = 13;

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  low: {
    label: "Lower exposure",
    eliminated: 560,
    inside: 270,
    supported: 420,
    created: 390
  },
  plan: {
    label: "Planning case",
    eliminated: 760,
    inside: 360,
    supported: 570,
    created: 510
  },
  high: {
    label: "Stress case",
    eliminated: 1000,
    inside: 460,
    supported: 750,
    created: 650
  }
};

export const LEGACY: LegacyItem[] = [
  {
    id: "insurer",
    name: "Private insurer claims, enrollment, and network administration",
    values: { low: 225, plan: 305, high: 400 },
    inside: { low: 130, plan: 170, high: 220 },
    reason: "One public coverage and payment architecture removes duplicated plan enrollment, network, utilization, and claims operations. Functions needed for payment integrity and service continuity remain.",
    destinations: "Public enrollment and eligibility, payment operations, provider reconciliation, patient navigation, appeals support, fraud control, and transition-wave operations.",
    boundary: "The 611,100-job BLS direct-health-insurer industry is the anchor. The model applies functional exposure shares; it does not assume every insurer employee disappears.",
    evidence: "Planning exposure: 50% of the BLS industry anchor, rounded. Confidence: Medium because the public system keeps many payment, integrity, and service functions but removes payer duplication.",
    continues: "Provider payment, reconciliation, program integrity, complex-case review, enrollment correction, appeals, navigation, and continuity operations."
  },
  {
    id: "provider",
    name: "Provider billing, prior authorization, and revenue-cycle administration",
    values: { low: 170, plan: 235, high: 310 },
    inside: { low: 80, plan: 110, high: 145 },
    reason: "Zero point-of-care billing, standardized public payment, global hospital budgets, and removal of routine insurer prior authorization sharply reduce collection, coding-for-payment, denial, and appeal work.",
    destinations: "Care navigation, referral-packet completion, data quality, records correction, care coordination, provider-payment reconciliation, and patient-rights support.",
    boundary: "BLS counted 417,500 billing and posting clerks across all industries in May 2024. The model uses only a health-function share and keeps medical-records work out of the eliminated total.",
    evidence: "Planning exposure: 56% of the broad BLS occupation anchor, rounded. Confidence: Medium. The AMA's prior-authorization survey supports a large burden, but its 13 weekly hours measure physician and staff time, not a separate job count.",
    continues: "Clinical records, care coding, quality reporting, payment reconciliation, unusual-case review, referral completion, and patient-rights work."
  },
  {
    id: "pbm",
    name: "PBM rebate, formulary, spread-pricing, and purchasing middlemen",
    values: { low: 60, plan: 90, high: 120 },
    inside: { low: 25, plan: 40, high: 55 },
    reason: "A public pharmacy claims utility, national purchasing, transparent formulary rules, and public production remove rebate negotiation, spread pricing, and duplicative benefit management.",
    destinations: "Public medicines procurement, formulary evidence, pharmacy onboarding, inventory visibility, shortage response, quality release, and supply-chain operations.",
    boundary: "No official occupation table isolates PBM employment. This is a scenario slice of broader insurance-related and pharmacy-administration work, not a measured PBM headcount.",
    evidence: "Planning exposure: 24% of a 382,600-job other-insurance-related anchor. Confidence: Low. The FTC reports that the six largest PBMs manage nearly 95% of U.S. prescriptions, establishing concentration and functional reach, not employment.",
    continues: "Pharmacy claims, formulary evidence, utilization safety, procurement, quality release, inventory visibility, specialty-drug handling, and shortage response."
  },
  {
    id: "broker",
    name: "Health-benefit brokerage and employer plan administration",
    values: { low: 55, plan: 70, high: 90 },
    inside: { low: 20, plan: 22, high: 22 },
    reason: "Automatic public coverage removes annual plan shopping, benefit design, carrier bidding, and much of employer enrollment administration.",
    destinations: "Employer/payroll conversion, wage-pass-through compliance, outreach, eligibility support, service navigation, and transition communications.",
    boundary: "The BLS insurance-brokerage industry includes many non-health lines. The model applies a small health-benefit exposure share and does not count the whole industry.",
    evidence: "Planning exposure: 7% of the 1,003,900-job insurance-brokerage industry anchor. Confidence: Low because BLS does not isolate health-benefit brokerage or employer benefits staff.",
    continues: "Temporary payroll conversion, wage-pass-through compliance, worker outreach, eligibility correction, service navigation, and supplemental non-health advice."
  },
  {
    id: "vendor",
    name: "Duplicative clearinghouse, contractor, and vendor-management work",
    values: { low: 50, plan: 60, high: 80 },
    inside: { low: 15, plan: 18, high: 18 },
    reason: "Common interfaces, public rails, portable records, source-code escrow, and fewer payer-specific contracts reduce redundant transaction routing and contract administration.",
    destinations: "Cybersecurity, conformance testing, configuration control, procurement, audit, vendor exit, continuity, and public reporting.",
    boundary: "This category is a residual planning allowance. It is kept separate and low-confidence because national vendor employment overlaps other industry and occupation counts.",
    evidence: "Planning allowance: 60,000. Confidence: Low. No non-overlapping national series separates payer-specific clearinghouse and contractor work from insurance, technology, and consulting employment.",
    continues: "Interoperability, cybersecurity, procurement, audit, configuration control, uptime, data exchange, vendor exit, and disaster recovery."
  }
];

export const CREATED: CreatedItem[] = [
  {
    id: "units",
    name: "Diagnostic-treatment unit teams",
    values: { low: 112, plan: 138, high: 175 },
    fills: { low: 40, plan: 30, high: 45 },
    derivation: "Planning case: the 15,000-unit specification multiplied by the existing unit model's 9.2-FTE mix-weighted average, rounded. The high case moves toward the need-based 24,099-unit allocation but assumes substantial conversion of existing sites.",
    roles: "Nurses, NPs/PAs, physicians, technicians, imaging/lab staff, behavioral-health staff, community health workers, navigators, and unit operations.",
    confidence: "Medium-Low",
    fillsException: {
      between: ['low', 'plan'],
      reason: "The lower-exposure case assigns 40,000 unit-team positions to " +
        "displaced administrative workers and the planning case assigns 30,000, " +
        "from a larger displaced pool. Only the planning figure is derived: the " +
        "methodology note fixes it as the navigation and operations share of a " +
        "unit team, the part of the team that does not require a clinical " +
        "credential. The lower-exposure figure is a planning judgement and no " +
        "source in this repository records how it was reached. It is left as " +
        "authored rather than adjusted to restore the pattern, because moving " +
        "it would be fitting the data to the shape of the other six items."
    }
  },
  {
    id: "public",
    name: "Public enrollment, payment, rights, and transition operations",
    values: { low: 145, plan: 180, high: 220 },
    fills: { low: 130, plan: 180, high: 220 },
    derivation: "Retains the necessary share of today's enrollment, claims/payment, provider reconciliation, appeals, navigation, employer conversion, and continuity workload while removing duplicated payer-specific work.",
    roles: "Eligibility, payment operations, provider support, appeals casework, navigation, ombuds services, employer/payroll conversion, and legacy wind-down.",
    confidence: "Medium-Low"
  },
  {
    id: "data",
    name: "Data, cyber, records, analytics, and conformance",
    values: { low: 50, plan: 70, high: 90 },
    fills: { low: 45, plan: 70, high: 90 },
    derivation: "A national data mesh, protected audit feeds, identity services, records migration, interoperability testing, cybersecurity operations, and offline continuity require durable technical and operational teams.",
    roles: "Data quality, privacy, security operations, engineering, records correction, identity, analytics, audit evidence, conformance, and incident recovery.",
    confidence: "Low"
  },
  {
    id: "medicines",
    name: "Medicines, diagnostics, procurement, and supply operations",
    values: { low: 30, plan: 40, high: 55 },
    fills: { low: 30, plan: 40, high: 55 },
    derivation: "A planning allowance for the Public Medicines Corporation, national purchasing, pharmacy utility, diagnostic/device procurement, batch quality, inventory visibility, and shortage response. Exact plant and product-family staffing remains uncalibrated.",
    roles: "Procurement, pharmacy operations, manufacturing support, quality, logistics, inventory, shortage response, supplier assurance, and diagnostics.",
    confidence: "Low"
  },
  {
    id: "rural",
    name: "Rural flex and rotating travel workforce",
    values: { low: 20, plan: 30, high: 45 },
    fills: { low: 0, plan: 0, high: 0 },
    derivation: "A derived regional relief pool for vacancy coverage, protected leave, training backfill, seasonal demand, and surge. The adopted role-region safe-FTE formula must replace this national placeholder.",
    roles: "Travel nurses, paramedics, respiratory therapists, imaging/lab technicians, pharmacists, behavioral-health clinicians, and short-term supervisory support.",
    confidence: "Low"
  },
  {
    id: "education",
    name: "Education, faculty, and training support",
    values: { low: 8, plan: 11, high: 15 },
    fills: { low: 0, plan: 0, high: 0 },
    derivation: "Planning case: one faculty, preceptor, placement, or program-support FTE for roughly every five of the plan's 55,000 annual publicly funded training slots.",
    roles: "Faculty, preceptors, simulation staff, program operations, rural placement, credential support, learner services, and continuing education.",
    confidence: "Low"
  },
  {
    id: "assurance",
    name: "Regional operations, assurance, and public-health support",
    values: { low: 25, plan: 41, high: 50 },
    fills: { low: 25, plan: 40, high: 50 },
    derivation: "A planning allowance for role-region workforce boards, scope and compensation operations, independent verification, safety and equity review, regional coordination, and workforce performance reporting.",
    roles: "Workforce planning, compensation and scope administration, verification, audit, safety, equity, regional coordination, public reporting, and corrective action.",
    confidence: "Low"
  }
];

/* ---- What the gross-position floor leaves out -----------------------------
   R67 [§S9a]. The 510,000 floor is not a whole-system workforce number. It
   excludes the national job quantity for the expanded benefits -- long-term
   care, behavioral health, dental, vision, hearing, EMS and public health --
   which is the exact domain the benefit-expansion dollars pay for. A reader
   comparing "510,000 new positions" against those dollars is comparing
   incompatible scopes.

   The chapter says so, twice, in prose. The methodology note says so. The
   DATA said nothing: CREATED carries `derivation`, `roles` and `confidence`
   and no field for what is out of scope, so nothing could check that the
   prose list was complete or that it stayed true as domains got sized.

   That has already bitten once. LTC used to be on this list and is now sized
   in its own section on the same chapter, and the prose was updated by hand
   in three places. `status` is what makes the next one mechanical.

   Scope note against the row as written: AD6 asks for the field on CREATED.
   It belongs one level up. The exclusion is a property of the floor, not of
   any one operating function -- no single CREATED row excludes behavioral
   health, the total does -- and putting it on the items would mean writing
   the same sentence seven times or leaving six of them blank. */
export interface ScopeExclusion {
  domain: string;
  /* 'sized' means the chapter now carries a number for it somewhere OUTSIDE
     the transition ledger. It does not mean the domain is inside the floor. */
  status: 'sized-separately' | 'not-sized';
  /* What the reader-facing qualification has to call this domain. Declared
     rather than derived from `domain`, because the page writes "EMS" where
     the data says "emergency medical services" and splits "dental, vision,
     and hearing" across an Oxford comma. Guessing the page's wording from the
     data's produced two false failures on the first run; a check that has to
     guess what prose looks like is a check that will be loosened later. */
  pageWords: string[];
  note: string;
  /* R168 [§S9a]: the framework requirement family that governs this domain,
     and the parameter that prices it. The two together are the finding:
     requirement density runs inversely to cost. Null family means no SR
     family governs the domain at all, which is the strongest form of it. */
  requirementFamily: string | null;
  paramIds: string[];
}

export const CREATED_SCOPE_EXCLUSIONS: ScopeExclusion[] = [
  {
    domain: 'long-term care',
    status: 'sized-separately',
    pageWords: ['long-term care'],
    requirementFamily: 'SR-LTC',
    paramIds: ['ltcExpansion', 'ltcWageFloor'],
    note: 'The direct-care aide workforce is sized in its own section and its ' +
      'wage-floor cost is carried in the fiscal model. It is kept out of the ' +
      'ledger above because the entrant-pace math is about insurance and ' +
      'billing jobs and must not absorb millions of aides.'
  },
  {
    domain: 'behavioral health',
    status: 'not-sized',
    pageWords: ['behavioral health'],
    requirementFamily: 'SR-BH',
    paramIds: ['bhExpansion'],
    note: 'No national job quantity is fixed for the behavioral-health benefit.'
  },
  /* Dental, vision and hearing are one benefit family and three entries. The
     chapter lists them as three, and one entry carrying an internal comma
     made the generated sentence read as five items where it meant three. */
  {
    domain: 'dental',
    status: 'not-sized',
    pageWords: ['dental'],
    requirementFamily: 'SR-DVH',
    paramIds: ['dvhExpansion'],
    note: 'No national job quantity is fixed for the dental benefit.'
  },
  {
    domain: 'vision',
    status: 'not-sized',
    pageWords: ['vision'],
    requirementFamily: 'SR-DVH',
    paramIds: ['dvhExpansion'],
    note: 'No national job quantity is fixed for the vision benefit.'
  },
  {
    domain: 'hearing',
    status: 'not-sized',
    pageWords: ['hearing'],
    requirementFamily: 'SR-DVH',
    paramIds: ['dvhExpansion'],
    note: 'No national job quantity is fixed for the hearing benefit.'
  },
  {
    domain: 'EMS',
    status: 'not-sized',
    pageWords: ['ems'],
    requirementFamily: 'SR-EMS',
    paramIds: ['emsPhExpansion'],
    note: 'No national job quantity is fixed for the emergency medical services benefit.'
  },
  {
    domain: 'public health',
    status: 'not-sized',
    pageWords: ['public health'],
    /* No SR-PH family exists. Public health is priced inside
       emsPhExpansion and governed by nothing of its own. */
    requirementFamily: null,
    paramIds: ['emsPhExpansion'],
    note: 'No national job quantity is fixed for the public-health expansion.'
  }
];

/* Rendered on the chapter beside the floor, from the list rather than typed
   beside it, so a domain that gets sized stops being described as missing. */
export function createdScopeStatement(): string {
  const open = CREATED_SCOPE_EXCLUSIONS
    .filter((e) => e.status === 'not-sized').map((e) => e.domain);
  const sized = CREATED_SCOPE_EXCLUSIONS
    .filter((e) => e.status === 'sized-separately').map((e) => e.domain);
  const openList = open.length > 1
    ? open.slice(0, -1).join(', ') + ' and ' + open[open.length - 1]
    : open.join('');
  const sizedList = sized.length > 1
    ? sized.slice(0, -1).join(', ') + ' and ' + sized[sized.length - 1]
    : sized.join('');
  return 'This floor is a floor, and the scope it leaves out is the scope the ' +
    'expanded benefits pay for. It fixes no national job quantity for ' +
    openList + '. ' +
    (sized.length
      ? 'The ' + sizedList + ' workforce is sized separately on this page and ' +
        'is not inside the ledger above. '
      : '') +
    'Comparing this figure against benefit-expansion dollars compares two ' +
    'different scopes.';
}

/* ---- The figures the Workforce chapter publishes --------------------------
   R64 [§S9a]. Every quantity on the tab was computed in renderFlow() inside
   the client and typed a second time into the page as static HTML, and a
   third time into the chapter's prose. Nine of those typed figures are
   ledger arithmetic: the reconciliation grid, the flow columns, the labour
   grid, the risk rows, and the immigration tiles.

   R64's actual subject is that landing Type E moves all of them at once --
   unit teams 138k, `created` 510k, entrants 150k, the annual pace 12,500 and
   the training ratio 4.4x, which is the tab's central feasibility argument.
   Type E is §S9b and Part 2, and this section does not land it. What this
   section can do is make the inheritance impossible: one derivation, used by
   the client, and a check that every figure typed into the page still agrees
   with it. When Type E lands, the page fails the build instead of quietly
   publishing the old argument.

   Numbers, not formatted strings: formatting stays in the client, where the
   Intl formatter lives. */
export interface LedgerFigures {
  eliminated: number;         // thousands
  inside: number;
  supported: number;
  created: number;
  entrants: number;
  annualEntrants: number;     // positions per year, not thousands
  externalPlacement: number;
  unresolvedGap: number;
  scopedDifference: number;
  employmentSharePct: number;
  transitionSharePct: number;
  trainingRatio: number;
}

export function workforceLedgerFigures(s: ScenarioId): LedgerFigures {
  const scenario = SCENARIOS[s];
  const entrants = scenario.created - scenario.inside;
  return {
    eliminated: scenario.eliminated,
    inside: scenario.inside,
    supported: scenario.supported,
    created: scenario.created,
    entrants: entrants,
    annualEntrants: Math.round(entrants * 1000 / ROLLOUT_YEARS),
    externalPlacement: scenario.supported - scenario.inside,
    unresolvedGap: scenario.eliminated - scenario.supported,
    scopedDifference: scenario.eliminated - scenario.created,
    employmentSharePct: entrants * 1000 / TOTAL_US_EMPLOYMENT_2024 * 100,
    transitionSharePct: scenario.inside / scenario.created * 100,
    trainingRatio: ANNUAL_TRAINING_TARGET /
      Math.round(entrants * 1000 / ROLLOUT_YEARS)
  };
}

/* Practice capacity tied up in prior authorization, in FTE. Stated on the tab
   as "About 282,000 FTE-equivalent" and never added to the position count --
   the page says so, and the ledger keeps it out. */
export function priorAuthReleasedFte(): number {
  return DIRECT_PATIENT_CARE_PHYSICIANS * PRIOR_AUTH_HOURS_PER_WEEK / 40;
}

/* The chapter's four risk rows read the CREATED table by group rather than by
   total. Positions whose work is administrative and whose fills come from the
   displaced pool are the "strong match" row; the two clinical groups are the
   constrained and high-risk rows. */
export const ADMINISTRATIVE_MATCH_IDS = ['public', 'data', 'medicines', 'assurance'];
export const CLINICAL_ENTRANT_IDS = ['units', 'rural'];

export function createdGroupTotals(
  ids: string[], s: ScenarioId
): { values: number; fills: number; entrants: number } {
  const group = CREATED.filter((item) => ids.indexOf(item.id) >= 0);
  const values = group.reduce((total, item) => total + item.values[s], 0);
  const fills = group.reduce((total, item) => total + item.fills[s], 0);
  return { values: values, fills: fills, entrants: values - fills };
}

/* ---- The unit model behind CREATED.units ---------------------------------
   R179 [§S9a]. `CREATED.units` plan = 138 and its derivation says where it
   comes from: "the 15,000-unit specification multiplied by the existing unit
   model's 9.2-FTE mix-weighted average". The methodology note carries the
   arithmetic in full -- 15,000 x 9.225 = 138,375, rounded to 138,000 -- and
   the mix comes from the county allocation, 24,099 units at 222,323 FTE.

   Nothing joined any of it. The unit model's per-type FTE existed in exactly
   one place in the codebase: as PROSE inside the `staff` strings of
   `UNIT_TYPES` in src/scripts/units-client.ts ("~10 (physician or senior
   NP/PA lead, nurses, techs)"). The allocation existed only in the
   methodology note. So the headline unit-workforce number was a hand-typed
   result of a calculation whose inputs lived in two places that neither the
   build nor any test could compare.

   That is why R179 predicts Part 1 breaks the ledger silently: §S9b reworks
   both inputs, and until now nothing downstream would have noticed.

   The inputs are data here, with checks tying each one back to where it is
   actually maintained -- the FTEs to `units-client.ts`, the allocation and
   the rounding to the methodology note. `CREATED.units` stays AUTHORED. The
   derivation is compared against it rather than replacing it, for the same
   reason `supported` stays authored: an assertion whose two sides cannot
   differ is not an assertion.

   Scenario scope: only the planning case is tied to the controlled 15,000
   target, because only the planning case claims to be. The low and high cases
   imply about 12,100 and 19,000 units and the note explains the high one as
   moving toward the need-based allocation; neither is derived here, and
   inventing a unit count for them would be tuning to a target. */
export interface UnitTypeStaffing {
  key: UnitTypeKey;
  label: string;
  allocated: number;  // units in the need-based county allocation
  fte: number;        // staffing per unit, from the unit model
}

/* R185 [§S9b]: the two inputs this ledger multiplies now come from the unit
   model itself. The controlled target and the per-type FTE are read from
   units.ts, so restaffing a type moves the workforce ledger by construction
   rather than by a check noticing that a hand-copied figure drifted.
   `allocated` stays AUTHORED, and is the side that can still disagree: it is
   compared against the allocation actually produced by running the model over
   the county file, which is a computation and not a restatement. */
/* The authored half. These four counts are this module's own claim about the
   need-based allocation, and `unitAllocationDrift` in manifest-check.ts holds
   them against the allocation computed over the county file. */
const ALLOCATED_UNITS: Record<UnitTypeKey, number> =
  { a: 7470, b: 9055, c: 6397, d: 1177 };

/* Code review [§S9b]: `allocation` was an array literal that read
   UNIT_TYPES at module load, so it was still a COPY -- taken once at import
   rather than typed by hand, but a copy. A test that moved UNIT_TYPES and
   watched the ledger caught it: nothing downstream moved. A getter makes the
   derivation live, so the label and the FTE genuinely come from the unit
   model and only `allocated` is authored here. */
export const UNIT_MODEL: {
  controlledTargetUnits: number;
  readonly allocation: UnitTypeStaffing[];
} = {
  controlledTargetUnits: CONTROLLED_TARGET_UNITS,
  get allocation(): UnitTypeStaffing[] {
    return UNIT_TYPE_KEYS.map((key) => ({
      key,
      label: UNIT_TYPES[key].shortName,
      allocated: ALLOCATED_UNITS[key],
      fte: UNIT_TYPES[key].fte
    }));
  }
};

export function unitAllocationTotal(): number {
  return UNIT_MODEL.allocation.reduce((total, t) => total + t.allocated, 0);
}

export function unitAllocationFte(): number {
  return UNIT_MODEL.allocation.reduce((total, t) => total + t.allocated * t.fte, 0);
}

/* the blended average the derivation string names as "9.2 FTE" */
export function unitMixWeightedFte(): number {
  return unitAllocationFte() / unitAllocationTotal();
}

/* unit-team positions at the controlled target, in thousands, rounded the way
   the methodology note rounds: 138,375 -> 138,000 */
export function unitTeamPositionsK(): number {
  return Math.round(UNIT_MODEL.controlledTargetUnits * unitMixWeightedFte() / 1000);
}

/* ---- The cross-decomposition invariants ----------------------------------
   V19 describes this module as carrying "twelve cross-decomposition
   invariants, twelve passes". In the code they were four relations AND-ed
   across three scenarios inside a single `.every()` in
   tests/lib/workforce.test.ts, collapsed to one `expect(ok).toBe(true)`. A
   break read `expected false to be true` and named neither the relation nor
   the scenario -- unserviceable for a section whose job is to distinguish a
   deliberate re-derivation from a regression.

   The audit describes two DIFFERENT twelves. Both list four relations across
   three scenarios; they agree on three relations and disagree on the fourth.
   One counts `supported = eliminated x rate`, which is what the code
   asserted. The other counts `sum(LEGACY.inside) = inside`, which the code
   did not assert -- and which the audit elsewhere records, correctly, as
   untested. There are FIVE relations of interest, four of them asserted here
   and the fifth (`supported`) a policy rate rather than a decomposition, so
   the honest count is five relations across three scenarios: fifteen.

   They are named rows here, one per relation per scenario, and this surface
   is registered in SELF_TEST_SOURCES, so a break fails `pnpm build` and not
   only `pnpm test`. Each row's note carries BOTH sides, so the failure states
   what disagreed with what.

   The relations are genuine cross-checks, not restatements: every quantity on
   the left is authored independently of every quantity on the right. Keep it
   that way. An invariant whose two sides cannot differ is not an invariant. */
export interface WorkforceInvariantRow {
  name: string;
  ok: boolean;
  note: string;
}

export const SCENARIO_IDS: readonly ScenarioId[] = ['low', 'plan', 'high'];

/* R177 [§S9a]: the share of eliminated positions that must reach paid
   placement or approved training.

   It was three literals -- 420 / 570 / 750 -- that happen to be exactly
   0.75 x eliminated in all three scenarios, with nothing in this module
   saying so. Three in four displaced workers receiving transition support is
   the load-bearing assumption behind the whole transition-cost story, and a
   reader of SCENARIOS could not see it.

   It is not an invented planning rate. The framework controls it, and the
   requirement is stricter than a target: PR-WF-007 is a shall.

   `supported` stays authored per scenario rather than being computed from
   this rate. That is deliberate. A derived `supported` would turn
   `supported = eliminated x rate` into a comparison between a value and its
   own derivation -- true by construction, incapable of failing, and the exact
   defect three previous sections each shipped an instance of. Authored on
   both sides, the assertion still catches an edit to any `eliminated`, any
   `supported`, or the rate itself.

   The controlling requirement is KPP-W1, the displaced-worker
   placement/training rate, at or above 75% of eligible displaced workers.
   PR-WF-007 turns it into an obligation: the project shall place or enroll at
   least 75% of eligible displaced administrative workers into approved
   employment or training pathways by Phase 8. It answers need SN-10 and is
   owned by ARCH-AHWCS. Framework v2.0.0 sections 6.6 and 6.9 and Appendix M.

   The identifiers stay here rather than in WORKER_SUPPORT_RATE_BASIS, because
   that string is rendered to a reader and the site's prose rule keeps catalog
   codes out of reader-facing text. supportRateDrift() reads KPP-W1 out of the
   framework transcription, so the tie to the requirement is checked, not just
   asserted in a comment. */
export const WORKER_SUPPORT_RATE = 0.75;

/* Rendered on the Workforce chapter under the placement tile. A rate with no
   visible basis is the defect this row was filed for; a basis that exists
   only in the module is the same defect one layer down.

   Code review [§S9a]: this said "the framework requires...", which breaks
   golden rule 2 as squarely as a catalog code does. The rule is not only
   about identifiers: "Never write 'the framework says/calls for...'. State
   things directly as 'the plan' / 'the system.'" Fixed in the same pass that
   found it. */
export const WORKER_SUPPORT_RATE_BASIS =
  'This floor is controlled, not assumed: the plan must place or enrol at ' +
  'least three in four eligible displaced workers in approved training by ' +
  'Phase 8. Placement means paid work or approved training with a verified ' +
  'start, not a referral or an application.';

interface CrossRelation {
  label: string;
  measured: (s: ScenarioId) => number;
  declared: (s: ScenarioId) => number;
}

const CROSS_RELATIONS: CrossRelation[] = [
  {
    label: 'sum(LEGACY.values) = eliminated',
    measured: (s) => LEGACY.reduce((total, item) => total + item.values[s], 0),
    declared: (s) => SCENARIOS[s].eliminated
  },
  {
    label: 'sum(CREATED.values) = created',
    measured: (s) => CREATED.reduce((total, item) => total + item.values[s], 0),
    declared: (s) => SCENARIOS[s].created
  },
  {
    label: 'sum(CREATED.fills) = inside',
    measured: (s) => CREATED.reduce((total, item) => total + item.fills[s], 0),
    declared: (s) => SCENARIOS[s].inside
  },
  /* R65 [§S9a]: the second, independently authored decomposition of the same
     total. `inside` is maintained on the LEGACY side (workers whose function
     survives) and `fills` on the CREATED side (new roles filled by
     transitioning workers). Both reconciled before this assertion existed;
     only the CREATED side was guarded, so editing any LEGACY.inside value
     broke the reconciliation with nothing failing. This is the relation the
     audit's own summary counts among "twelve" and the code never asserted. */
  {
    label: 'sum(LEGACY.inside) = inside',
    measured: (s) => LEGACY.reduce((total, item) => total + item.inside[s], 0),
    declared: (s) => SCENARIOS[s].inside
  },
  {
    label: 'supported = eliminated x WORKER_SUPPORT_RATE',
    measured: (s) => SCENARIOS[s].supported,
    declared: (s) => SCENARIOS[s].eliminated * WORKER_SUPPORT_RATE
  }
];

export function workforceSelfTests(): WorkforceInvariantRow[] {
  const rows: WorkforceInvariantRow[] = [];
  for (const relation of CROSS_RELATIONS) {
    for (const s of SCENARIO_IDS) {
      const measured = relation.measured(s);
      const declared = relation.declared(s);
      rows.push({
        name: 'Workforce ledger [' + s + ']: ' + relation.label,
        ok: measured === declared,
        note: measured === declared
          ? measured + 'k, both sides'
          : 'measured ' + measured + 'k, declared ' + declared + 'k'
      });
    }
  }

  /* R66 + R178 [§S9a], one defect filed twice: `fills` is monotone across the
     three scenarios for six of the seven CREATED items and inverts for
     `units`, 40 -> 30 -> 45. It is internally consistent and it reads as an
     error. The exception has to be declared, and a declared exception that is
     no longer an exception has to be removed -- otherwise the next edit that
     restores monotonicity leaves a paragraph on the page explaining an
     anomaly that is not there. */
  for (const item of CREATED) {
    const inversions: string[] = [];
    for (let i = 1; i < SCENARIO_IDS.length; i++) {
      const from = SCENARIO_IDS[i - 1];
      const to = SCENARIO_IDS[i];
      if (item.fills[to] < item.fills[from]) inversions.push(from + '->' + to);
    }
    const declared = item.fillsException;
    let ok: boolean;
    let note: string;
    if (!inversions.length) {
      ok = !declared;
      note = declared
        ? 'declares an exception between ' + declared.between.join(' and ') +
          ' but fills is monotone: ' +
          SCENARIO_IDS.map((s) => item.fills[s]).join(' -> ')
        : SCENARIO_IDS.map((s) => item.fills[s]).join(' -> ') + ', monotone';
    } else if (!declared) {
      ok = false;
      note = 'fills inverts at ' + inversions.join(', ') + ' (' +
        SCENARIO_IDS.map((s) => item.fills[s]).join(' -> ') +
        ') with no declared exception';
    } else {
      const pair = declared.between.join('->');
      ok = inversions.indexOf(pair) >= 0 && declared.reason.length > 120;
      note = ok
        ? 'inverts at ' + pair + ' (' +
          SCENARIO_IDS.map((s) => item.fills[s]).join(' -> ') + '), declared'
        : 'declares ' + pair + ' but inverts at ' + inversions.join(', ');
    }
    rows.push({
      name: 'Workforce ledger: CREATED.' + item.id +
        ' fills are monotone or declare the exception',
      ok: ok,
      note: note
    });
  }

  /* R179 [§S9a]: the headline unit-workforce number against the model it says
     it comes from. Nine authored inputs on the left (the controlled target
     and four allocation counts and four per-type FTEs), one authored figure
     on the right. §S9b reworks the left; this is what makes that break loud
     instead of silent. */
  const unitsItem = CREATED.filter((item) => item.id === 'units')[0];
  const derivedK = unitTeamPositionsK();
  const authoredK = unitsItem ? unitsItem.values.plan : NaN;
  rows.push({
    name: 'Workforce ledger [plan]: CREATED.units = target units x mix-weighted FTE',
    ok: derivedK === authoredK,
    note: unitAllocationTotal() + ' units at ' + unitAllocationFte() + ' FTE = ' +
      unitMixWeightedFte().toFixed(3) + ' per unit; ' +
      UNIT_MODEL.controlledTargetUnits + ' x that = ' + derivedK + 'k' +
      (derivedK === authoredK ? ', authored ' + authoredK + 'k'
        : ', but CREATED.units is authored at ' + authoredK + 'k')
  });

  return rows;
}

/* ---- Long-term care direct-care workforce -------------------------------
   The home-first LTC benefit is delivered by aides (home care, residential,
   nursing assistants), not by the clinical or administrative roles counted
   above. This is the benefit's binding workforce constraint. Figures in
   millions of workers unless noted; sourced in
   research/long_term_care_methodology.md (PHI 2024, BLS). */
export const LTC_WORKFORCE = {
  currentDirectCareM: 5.4,   // total direct-care workers, 2024 (PHI 2025)
  homeCareM: 3.2,            // home-care share of that total, 2024 (PHI 2025)
  newJobs2034M: 0.772,       // NEW direct-care jobs added 2024-2034 (PHI 2025)
  projected2034M: 6.2,       // workers the current system needs by 2034 = 5.4 + 0.772 (PHI 2025)
  openings2034M: 9.7,        // total direct-care job openings 2024-2034, incl. replacements (PHI 2025)
  medianWageNow: 17.36,      // $/hr median, 2024 (PHI 2025)
  wageFloorTarget: 22.00,    // $/hr living-wage floor (plan design)
  homeTurnoverPct: 75,       // home-care annual turnover, % (PHI 2025)
  coveredFteM: 5.0,          // covered direct-care FTE at maturity (planning)
  fteFraction: 0.67,         // full-time-equivalent per worker (direct care is heavily part-time)
  matureFrameworkM: 7.5,     // workers a universal home-first benefit needs at maturity ~= coveredFteM / fteFraction (planning, low confidence)
  hoursPerFteYear: 2080,     // full-time-equivalent hours
  loadedUpliftPerHour: 5.00  // loaded $/hr lift toward the floor (incl. benefits allowance)
};

/* Net-new aide compensation cost. Derived here from LTC_WORKFORCE and carried
   in the fiscal model as params.ltcWageFloor, so the workforce tab and the
   healthcare-tab cost model share ONE number and can never drift. The derived
   2023-scale figure must equal params.ltcWageFloor.mode (asserted in tests). */
export function ltcWageFloorCost(): {
  derived2023B: number; low2024B: number; mode2024B: number; high2024B: number;
} {
  const w = LTC_WORKFORCE;
  const derived2023B = Math.round(
    (w.coveredFteM * 1e6 * w.hoursPerFteYear * w.loadedUpliftPerHour) / 1e9);
  const p = PARAMS_BY_ID['ltcWageFloor'];
  return {
    derived2023B: derived2023B,
    low2024B: Math.round(p.low * DEFLATOR_2023_TO_2024),
    mode2024B: Math.round(p.mode * DEFLATOR_2023_TO_2024),
    high2024B: Math.round(p.high * DEFLATOR_2023_TO_2024)
  };
}

export const ACRONYMS: Record<string, string> = {
  "AHWCS": "Administration for Health Workforce, Compensation, and Scope",
  "NHWB": "National Health Workforce Board",
  "NPCB": "National Physician Compensation Board",
  "NCSWB": "National Clinical Scope and Workforce Board",
  "NHWECA": "National Health Workforce Education and Capacity Authority",
  "RS-CORPS": "Rural Service Corps",
  "HATC": "Health Administration Transition Corps",
  "HTIP": "Health Talent Immigration Pathway",
  "NHTIB": "National Health Talent Immigration Board",
  "HCRB": "Health Credential Recognition Board",
  "HPSA": "Health Professional Shortage Area",
  "MUA": "Medically Underserved Area",
  "IMG": "International Medical Graduate",
  "IEN": "Internationally Educated Nurse",
  "WHO": "World Health Organization",
  "BLS": "Bureau of Labor Statistics",
  "PBM": "Pharmacy Benefit Manager",
  "FTE": "Full-Time Equivalent",
  "RN": "Registered Nurse",
  "LPN": "Licensed Practical Nurse",
  "EMS": "Emergency Medical Services",
  "LTC": "Long-Term Care",
  "LTSS": "Long-Term Services and Supports",
  "HCBS": "Home and Community-Based Services",
  "DVH": "Dental, Vision, and Hearing",
  "AI": "Artificial Intelligence",
  "ICU": "Intensive Care Unit"
};
