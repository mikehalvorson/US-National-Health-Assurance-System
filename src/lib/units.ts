/* R186 / R185 [§S9b]: the unit network model, as data that can be graded.
 *
 * Every number that produces the national unit count used to live as a bare
 * literal inside `allocate()` in src/scripts/units-client.ts, restated in
 * prose in the method note on src/pages/units.astro, with nothing joining the
 * two and nothing recording what any of them rested on. A client script runs
 * in a browser, so none of it was reachable at build time either: the workforce
 * chapter's unit-team headcount is derived from this allocation and had to be
 * hand-copied into workforce.ts because there was no way to compute it.
 *
 * This module is the source. It is pure -- no node:fs, no DOM -- so the client
 * imports it for the live page and selftests.ts imports it to run the same
 * allocation over the same county file at build time.
 *
 * THE GRADES ARE THE POINT. `UNIT_ASSUMPTIONS` carries one row per input, each
 * with a confidence grade, what it rests on, and who closes it. None of these
 * numbers had a source when this section started, and most still do not. An
 * assumption graded `low` with a named owner is worth more than a citation
 * retro-fitted onto an authored figure, and the page says so to the reader
 * rather than only to a contributor.
 */

export type UnitTypeKey = 'a' | 'b' | 'c' | 'd';

export const UNIT_TYPE_KEYS: readonly UnitTypeKey[] = ['a', 'b', 'c', 'd'];

export interface UnitType {
  key: UnitTypeKey;
  name: string;
  /* short form, for prose that has already said "Type B" */
  shortName: string;
  color: string;
  /* $M per unit per year */
  opLo: number; opMode: number; opHi: number;
  /* $M per unit, one time */
  capital: number;
  /* visits per unit per year */
  throughput: number;
  /* clinical and support FTE per unit. Typed, because the workforce ledger
     multiplies it: before §S9b this figure existed only inside the `staff`
     prose below, and manifest-check.ts parsed it back out of that string. */
  fte: number;
  staff: string;
  role: string;
}

export const UNIT_TYPES: Record<UnitTypeKey, UnitType> = {
  a: {
    key: 'a', name: 'Type A: Micro-unit', shortName: 'Micro-unit',
    color: 'var(--series-2)',
    opLo: 0.30, opMode: 0.45, opHi: 0.65, capital: 0.25,
    throughput: 15000, fte: 2.5,
    staff: '2–3 (nurse/tech + teleclinician link)',
    role: 'Sits inside pharmacies, groceries, schools, workplaces, and transit hubs. Vitals, point-of-care tests, vaccinations, prescription refills, screening, and a teleclinician on screen for anything ambiguous.'
  },
  b: {
    key: 'b', name: 'Type B: Neighborhood unit', shortName: 'Neighborhood unit',
    color: 'var(--series-1)',
    opLo: 1.2, opMode: 1.6, opHi: 2.2, capital: 1.8,
    throughput: 30000, fte: 10,
    staff: '~10 (physician or senior NP/PA lead, nurses, techs)',
    role: 'The default urgent-care replacement and the network\'s workhorse: ECG, basic labs, X-ray, splinting, common procedures, uncomplicated respiratory/ENT/UTI/skin/musculoskeletal care, chronic-disease measurement and follow-up.'
  },
  c: {
    key: 'c', name: 'Type C: Rural enhanced unit', shortName: 'Rural enhanced unit',
    color: 'var(--series-3)',
    opLo: 2.0, opMode: 2.6, opHi: 3.5, capital: 3.5,
    throughput: 12000, fte: 14,
    staff: '~14 (adds observation nursing, ultrasound, EMS liaison)',
    role: 'Everything Type B does, plus tele-specialty, longer observation, point-of-care ultrasound, limited IV therapy, EMS coordination, maternal and pediatric triage, and mobile outreach. Built to hold a patient safely when the nearest hospital is an hour away.'
  },
  d: {
    key: 'd', name: 'Type D: Urban public-health unit', shortName: 'Urban public-health unit',
    color: 'var(--series-6)',
    opLo: 2.5, opMode: 3.4, opHi: 4.5, capital: 4.5,
    throughput: 40000, fte: 20,
    staff: '~20 (adds behavioral-health and public-health staff)',
    role: 'High-volume urban front door: respiratory surge capacity, vaccines, STI and reproductive services, behavioral-health touchpoints, addiction-care linkage, wound care, heat/smoke/climate response, and neighborhood outreach.'
  }
};

/* ---- the allocation rules ------------------------------------------------
 * Urban and rural demand are split across types, then divided by throughput.
 * Each split must close on 1: a share that goes missing is demand the model
 * silently stops placing, and nothing before §S9b would have noticed. */

export const VISIT_SPLITS: {
  urban: { a: number; b: number; d: number };
  rural: { b: number; c: number };
} = {
  urban: { a: 0.28, b: 0.57, d: 0.15 },
  rural: { b: 0.30, c: 0.70 }
};

export const ALLOCATION_THRESHOLDS: {
  /* urban residents a county needs before it gets its own Type D; below this,
     the Type D share folds into Type B */
  urbanPopForTypeD: number;
  /* rural share at or above which a county keeps at least one Type C */
  ruralFloorShare: number;
  /* county population below which the same floor applies regardless of share */
  ruralFloorPop: number;
} = {
  urbanPopForTypeD: 200000,
  ruralFloorShare: 0.50,
  ruralFloorPop: 20000
};

/* The absorption control. This -- not the "1.1 billion national ambulatory
   encounters" the method note used to name -- is what actually drives demand:
   visits = population x absorption. */
export const NETWORK_ABSORPTION: {
  default: number; min: number; max: number; step: number;
} = { default: 1.5, min: 1.2, max: 1.8, step: 0.05 };

/* The framework's controlled certified-unit count at maturity. It was
   authored in workforce.ts as UNIT_MODEL.controlledTargetUnits and typed again
   into the unit page's verdict tile; both now read it from here. */
export const CONTROLLED_TARGET_UNITS = 15000;

/* ---- the grades ---------------------------------------------------------- */

export type Confidence = 'low' | 'medium' | 'high';

export interface UnitAssumption {
  id: string;
  /* what a reader sees */
  label: string;
  /* rendered value, including its unit */
  value: string;
  confidence: Confidence;
  /* what the number rests on today, stated plainly. When the honest answer is
     "it was chosen", say that. */
  basis: string;
  /* the pull or decision that would close it. Never blank. */
  owner: string;
  /* a published source, when one exists. Empty means none does, and the grade
     is the only thing standing behind the figure. */
  url: string;
}

export const UNIT_ASSUMPTIONS: readonly UnitAssumption[] = [
  {
    id: 'absorption',
    label: 'Network absorption at maturity',
    value: NETWORK_ABSORPTION.default.toFixed(2) + ' network visits per person per year (' +
      NETWORK_ABSORPTION.min.toFixed(2) + '–' + NETWORK_ABSORPTION.max.toFixed(2) + ' on the control)',
    confidence: 'low',
    basis: 'Chosen. It is the single largest driver of the count, and the range on the control was set to bracket the choice rather than derived from observed substitution.',
    owner: 'A substitution study: what share of primary, urgent and low-acuity emergency demand a community unit network actually absorbs. Nothing in this repository measures it.',
    url: ''
  },
  {
    id: 'throughput',
    label: 'Per-unit throughput, Types A to D',
    value: (UNIT_TYPES.a.throughput / 1000) + 'k / ' + (UNIT_TYPES.b.throughput / 1000) + 'k / ' +
      (UNIT_TYPES.c.throughput / 1000) + 'k / ' + (UNIT_TYPES.d.throughput / 1000) + 'k visits per unit per year',
    confidence: 'low',
    basis: 'Chosen as design capacity, not observed. The closest published comparator is the federal health-centre programme: about 121.8 million in-person visits across more than 16,200 service delivery sites, roughly 7,500 visits per site per year. Every figure here is above that, Type A by about double and Type B by about four times.',
    owner: 'The visits-per-site and visits-per-clinical-FTE pull that research/02 proposed and did not run.',
    url: 'https://data.hrsa.gov/topics/healthcenters/uds/overview/national'
  },
  {
    id: 'urban-split',
    label: 'Urban demand split across types',
    value: pct(VISIT_SPLITS.urban.a) + ' micro-unit, ' + pct(VISIT_SPLITS.urban.b) +
      ' neighborhood, ' + pct(VISIT_SPLITS.urban.d) + ' urban public-health',
    confidence: 'low',
    basis: 'Chosen. It is a statement about what kind of care people will seek where, and no measured distribution stands behind it.',
    owner: 'The same substitution study as the absorption rate: a split cannot be measured without knowing what the network absorbs.',
    url: ''
  },
  {
    id: 'rural-split',
    label: 'Rural demand split across types',
    value: pct(VISIT_SPLITS.rural.b) + ' neighborhood, ' + pct(VISIT_SPLITS.rural.c) + ' rural enhanced',
    confidence: 'low',
    basis: 'Chosen, and it carries the network’s rural access promise: the heavier the share sent to Type C, the more capable and more expensive the rural unit has to be.',
    owner: 'The same substitution study, run separately for rural counties.',
    url: ''
  },
  {
    id: 'type-d-threshold',
    label: 'Urban population before a county gets its own Type D',
    value: ALLOCATION_THRESHOLDS.urbanPopForTypeD.toLocaleString('en-US') + ' urban residents',
    confidence: 'low',
    basis: 'Chosen. Below it the public-health share folds into Type B, so the threshold moves cost between two types rather than changing total demand.',
    owner: 'A siting study. The page already says this is a capacity plan and not one.',
    url: ''
  },
  {
    id: 'rural-floor',
    label: 'Rural access floor',
    value: 'rural share at or above ' + pct(ALLOCATION_THRESHOLDS.ruralFloorShare) +
      ', or county population under ' + ALLOCATION_THRESHOLDS.ruralFloorPop.toLocaleString('en-US'),
    confidence: 'low',
    basis: 'A policy choice, not an estimate, and the page says so: it guarantees a unit where volume alone would not justify one. Measured, the population test is the one doing the work: every county the rural-share test would floor already earns a rural unit from demand, at every setting of the control.',
    owner: 'The access standard that sets the floor. It is a policy decision to ratify rather than a figure to source.',
    url: ''
  }
];

function pct(share: number): string {
  return Math.round(share * 100) + '%';
}

/* The national ambulatory-encounter comparator.
 *
 * The method note used to say the model "converts the network's expected share
 * of the nation's ~1.1 billion annual ambulatory encounters into units". It
 * does not. Nothing reads a national encounter total anywhere in this
 * repository -- demand is population x absorption, and 1.1 billion appeared in
 * exactly one place, that sentence.
 *
 * The figure is kept as what it always actually was, a comparator, and given
 * the published number it was approximating. The survey counts office-based
 * physician visits only; emergency and hospital outpatient visits are extra,
 * and the survey that counted those ended in 2022, so no single current
 * federal total for "ambulatory encounters" exists to cite. */
export const NATIONAL_OFFICE_VISITS: {
  visits: number; year: number; label: string; source: string; url: string;
  confidence: Confidence;
} = {
  visits: 1.0e9,
  year: 2019,
  label: 'office-based physician visits',
  source: 'National Ambulatory Medical Care Survey, 2019 national summary tables',
  url: 'https://www.cdc.gov/nchs/data/ahcd/namcs_summary/2019-namcs-web-tables-508.pdf',
  confidence: 'medium'
};

/* ---- the allocation ------------------------------------------------------ */

export interface CountyDemand {
  /* population */
  p: number;
  /* rural share, 0 to 1 */
  r: number;
}

export interface UnitCounts { a: number; b: number; c: number; d: number; total: number }

export interface AllocationTotals {
  a: number; b: number; c: number; d: number;
  total: number; pop: number; floored: number;
  /* network visits placed, at the absorption used */
  visits: number;
}

export interface CostRow { op: number; opLo: number; opHi: number; capital: number }

export interface NetworkCost {
  a: CostRow; b: CostRow; c: CostRow; d: CostRow;
  opTotal: number; opTotalLo: number; opTotalHi: number; capitalTotal: number;
}

/* Units for one county. Pure, and separated from the sweep so the build can
   test a single county's rules without a data file. */
export function allocateCounty(county: CountyDemand, absorption: number): {
  units: UnitCounts; floored: number;
} {
  const T = UNIT_TYPES, S = VISIT_SPLITS, TH = ALLOCATION_THRESHOLDS;
  const urbanPop = county.p * (1 - county.r), ruralPop = county.p * county.r;
  const uv = urbanPop * absorption, rv = ruralPop * absorption;

  let a = uv * S.urban.a / T.a.throughput;
  const dRaw = uv * S.urban.d;
  let d = 0, bExtra = 0;
  if (urbanPop >= TH.urbanPopForTypeD) d = dRaw / T.d.throughput;
  else bExtra = dRaw; /* small-city Type D demand folds into Type B */
  let b = (uv * S.urban.b + bExtra + rv * S.rural.b) / T.b.throughput;
  let c = rv * S.rural.c / T.c.throughput;

  a = Math.round(a); b = Math.round(b); c = Math.round(c); d = Math.round(d);

  let floored = 0;
  /* Rural access floor: majority-rural or small counties keep a Type C.
     R185 [§S9b], measured over the whole county file at every setting of the
     absorption control: the SHARE half of this test decides nothing. It floors
     491 counties at the default and all 491 also satisfy the population test;
     with the population test removed entirely the share test adds zero, because
     a majority-rural county with enough people to miss the population test
     already earns a Type C from demand. §AI2 and §BE6 filed the two-decimal
     rural share against a boundary at exactly 0.50 as a rounding hazard -- a
     county at 0.495 rounding up and tripping the floor. It cannot: such a
     county is floored by population or not at all. The share test stays because
     it states the policy and a different county file could make it bite; it is
     recorded here as currently inert so nobody treats it as a live guard. */
  if ((county.r >= TH.ruralFloorShare || county.p < TH.ruralFloorPop) && ruralPop > 0 && c === 0) {
    c = 1; floored++;
  }
  /* Every county gets at least one unit of its dominant character. Reached 1
     to 7 times across the control, and its rural branch NEVER: by the time
     this runs, any county with rural population has been given a Type C
     above, so `county.r >= ruralFloorShare` is false whenever control gets
     here. Kept as the guard it is, and stated as unreached rather than left to
     read as load-bearing. */
  if (a + b + c + d === 0) {
    if (county.r >= TH.ruralFloorShare) c = 1; else b = 1;
    floored++;
  }
  return { units: { a, b, c, d, total: a + b + c + d }, floored };
}

export function allocateUnits(counties: CountyDemand[], absorption: number): AllocationTotals {
  const totals: AllocationTotals =
    { a: 0, b: 0, c: 0, d: 0, total: 0, pop: 0, floored: 0, visits: 0 };
  for (const county of counties) {
    const out = allocateCounty(county, absorption);
    totals.a += out.units.a; totals.b += out.units.b;
    totals.c += out.units.c; totals.d += out.units.d;
    totals.total += out.units.total;
    totals.pop += county.p;
    totals.visits += county.p * absorption;
    totals.floored += out.floored;
  }
  return totals;
}

/* $B per year and $B one-time, from per-unit $M. */
export function networkCost(counts: { a: number; b: number; c: number; d: number }): NetworkCost {
  const cost = {} as NetworkCost;
  for (const k of UNIT_TYPE_KEYS) {
    cost[k] = {
      op: counts[k] * UNIT_TYPES[k].opMode / 1000,
      opLo: counts[k] * UNIT_TYPES[k].opLo / 1000,
      opHi: counts[k] * UNIT_TYPES[k].opHi / 1000,
      capital: counts[k] * UNIT_TYPES[k].capital / 1000
    };
  }
  cost.opTotal = cost.a.op + cost.b.op + cost.c.op + cost.d.op;
  cost.opTotalLo = cost.a.opLo + cost.b.opLo + cost.c.opLo + cost.d.opLo;
  cost.opTotalHi = cost.a.opHi + cost.b.opHi + cost.c.opHi + cost.d.opHi;
  cost.capitalTotal = cost.a.capital + cost.b.capital + cost.c.capital + cost.d.capital;
  return cost;
}

/* ---- unitsCost, and what it is actually comparable with -------------------
 *
 * R188 [§S9b]: the page has always printed its bottom-up network operating
 * cost beside the healthcare model's `unitsCost` range and invited the reader
 * to read a disagreement. §BE7 read one too, and Part 1 was scoped around it.
 *
 * MEASURED: there is no disagreement. The two price different networks.
 * `unitsCost` is labelled "15,000 units, operating + amortized capital" and
 * the bottom-up total prices the need-based count, which at the default
 * absorption is around 24,100 units. Hold the type mix and scale the
 * bottom-up model to the same 15,000 units and it lands within a percent or
 * two of `unitsCost`'s mode, at any capital amortisation between ten and
 * thirty years. The gap on the page is a COUNT difference presented as a cost
 * difference.
 *
 * That is the relationship, and it is stated here so the page, the parameter
 * and the workforce ledger all read it from one place. */
export interface UnitsCostComparison {
  /* the need-based network the page actually renders */
  needBasedUnits: number;
  needBasedOp: number;
  /* the same type mix, scaled to the controlled target */
  targetUnits: number;
  targetOp: number;
  targetOpLo: number;
  targetOpHi: number;
  targetCapital: number;
  /* operating plus capital spread over `years`, the form unitsCost is in */
  targetAnnualised: (years: number) => number;
}

export function unitsCostComparison(totals: {
  a: number; b: number; c: number; d: number; total: number;
}): UnitsCostComparison {
  const need = networkCost(totals);
  const scale = totals.total > 0 ? CONTROLLED_TARGET_UNITS / totals.total : 0;
  const targetOp = need.opTotal * scale;
  const targetCapital = need.capitalTotal * scale;
  return {
    needBasedUnits: totals.total,
    needBasedOp: need.opTotal,
    targetUnits: CONTROLLED_TARGET_UNITS,
    targetOp,
    targetOpLo: need.opTotalLo * scale,
    targetOpHi: need.opTotalHi * scale,
    targetCapital,
    targetAnnualised: (years: number) => targetOp + targetCapital / years
  };
}

/* The amortisation window `unitsCost`'s own label implies and never states.
   Both ends are carried because the reconciliation has to hold across the
   whole plausible range or it is a coincidence at one value. */
export const CAPITAL_AMORTISATION_YEARS = { short: 10, long: 30 };
