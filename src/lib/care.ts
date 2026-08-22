/* Point-of-care cost comparison data, ported from docs/js/care.js
   (CARE_SCENARIOS 20-111, moneyRange 162-165). "Today" figures are national
   averages/typical ranges and remain fidelity-critical: do not re-derive one.

   The NHA side is no longer a typed year. R81 [§S8]: all ten cards carried a
   hand-written `fromYear`, and six of them named 2034 - the year Phase 6
   BEGINS - while promising the outcome Phase 6 ends with. In 2034 the model
   has eliminated a tenth of cost sharing. Each card now declares the ramp
   conditions its promise actually depends on and the year is read off them,
   so a card and the model cannot say different things about the same benefit. */

import { RAMPS, START_YEAR, householdDenominator } from './params';

export interface CareAmount { lo: number; hi: number; note: string }

/* The policy ramps a card's promise can depend on. `units`, `hospitals` and
   `infra` build capacity rather than deliver a benefit to a household, so no
   card gates on them. */
export type CareRamp = 'coverage' | 'costShareElim' | 'expansions' | 'drugs';

/* A ramp set: the base RAMPS, or one scenario's shifted ramps from
   model.ts's buildRamps(). Passing the second is what makes a card year
   scenario-aware; nothing here knows about scenarios. */
export type RampSet = Record<string, number[]>;

/* One condition that has to hold before a card's promise is true, and why
   that ramp is the one that governs it. */
export interface CareGate { ramp: CareRamp; atLeast: number; why: string }

/* What kind of promise the card makes. `point-of-care` is the class §AY3 is
   about: a bill a patient would otherwise be handed at the counter. `premium`
   is a payment made before any care happens, and cost-sharing elimination has
   nothing to do with it. Declared rather than inferred, so the rule that every
   point-of-care card gates on costShareElim has two sides that can disagree. */
export type CarePromise = 'point-of-care' | 'premium';

export interface CareNha {
  amount: number;
  promise: CarePromise;
  /* every condition, not just the binding one: the card's year is the latest
     of them, and which one binds is then a measurement rather than a claim */
  gates: CareGate[];
  note: string;
}
export interface CareScenario {
  id: string;
  title: string;
  todayInsured: CareAmount;
  todayUninsured: CareAmount;
  nha: CareNha;
  source: string;
  confidence: string;
}

export function moneyRange(lo: number, hi: number): string {
  const m = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
  return lo === hi ? m(lo) : m(lo) + ' – ' + m(hi);
}

/* ---- Deriving a card's year ---------------------------------------------
 * Index 0 is Year 1 is START_YEAR, the convention `V1` confirms four ways.
 * ------------------------------------------------------------------------ */
function firstIndexAtLeast(arr: number[], atLeast: number): number {
  for (let i = 0; i < arr.length; i++) if (arr[i] >= atLeast - 1e-9) return i;
  return -1;
}

/* The gate that decides the year: the last one to be satisfied. */
export function careBindingGate(card: CareScenario, ramps: RampSet = RAMPS): CareGate {
  let binding = card.nha.gates[0];
  let latest = -1;
  for (const g of card.nha.gates) {
    const i = firstIndexAtLeast(ramps[g.ramp], g.atLeast);
    if (i < 0) {
      throw new Error(
        'care card ' + card.id + ' gates on ' + g.ramp + ' >= ' + g.atLeast +
        ', which that ramp never reaches. careGateProblems() reports this as a ' +
        'self-test; if you are reading it as a stack trace the registry lost the row.'
      );
    }
    if (i > latest) { latest = i; binding = g; }
  }
  return binding;
}

/* The year every one of the card's gates is met - the year the promise on the
   card becomes true for the population, not the year the phase that delivers
   it opens. */
export function careFromYear(card: CareScenario, ramps: RampSet = RAMPS): number {
  const g = careBindingGate(card, ramps);
  return START_YEAR + firstIndexAtLeast(ramps[g.ramp], g.atLeast);
}

/* The first year any of the card's gates starts moving at all: the open end of
   the span the benefit arrives over, which is the "phased 2034-2037" half of
   R81's suggested wording. Returns null when nothing arrives before the year
   on the chip, so the page has nothing to add.

   `firstIndexAtLeast` is deliberately NOT reused here. Its tolerance is
   `>= atLeast - 1e-9`, so asking it for "the first index above zero" answers
   index 0 for every ramp, and every card reported phasing in from the
   enactment year. Caught by rendering it, not by a check, so there is now a
   check: see reliefYearProblems below. */
function firstNonZeroIndex(arr: number[]): number {
  for (let i = 0; i < arr.length; i++) if (arr[i] > 0) return i;
  return -1;
}

export function careReliefYear(card: CareScenario, ramps: RampSet = RAMPS): number | null {
  const full = careFromYear(card, ramps);
  let earliest = -1;
  for (const g of card.nha.gates) {
    const i = firstNonZeroIndex(ramps[g.ramp]);
    if (i >= 0 && (earliest < 0 || i < earliest)) earliest = i;
  }
  return earliest < 0 || START_YEAR + earliest >= full ? null : START_YEAR + earliest;
}

/* The one mechanism that makes a bill at the counter go away, written once
   because eight cards cite it. Returned fresh rather than shared, so no card
   can reach another card's gate. */
function costSharingGate(): CareGate {
  return {
    ramp: 'costShareElim', atLeast: 1,
    why: '$0 at the point of care is delivered by cost-sharing elimination and by ' +
      'nothing else. Drug pricing, coverage migration and the unit build all change ' +
      'what care costs the system; only this ramp changes what the patient is handed.'
  };
}

/* LTC, behavioral health, dental/vision/hearing and EMS are the four benefits
   the expansions ramp builds. A card for one of them needs the benefit to
   exist before cost sharing on it can be zero, so it carries both gates and
   the later one wins. */
function expansionGate(benefit: string): CareGate {
  return {
    ramp: 'expansions', atLeast: 1,
    why: benefit + ' is one of the four expanded benefits the expansions ramp ' +
      'builds (long-term care, behavioral health, dental/vision/hearing, EMS), so ' +
      'the benefit has to be fully built before it can be free.'
  };
}

export const CARE_SCENARIOS: CareScenario[] = [
  {
    id: 'premium',
    title: 'Health insurance premiums (family, per year)',
    todayInsured: { lo: 6850, hi: 6850, note: "worker's share of a $26,993 employer family premium" },
    todayUninsured: { lo: 0, hi: 0, note: 'no premium, and no coverage' },
    nha: {
      amount: 0, promise: 'premium',
      gates: [{
        ramp: 'coverage', atLeast: 0.99,
        why: 'a household stops paying premiums when its own wave migrates, and the ' +
          'ramp does not finish migrating waves until it reaches its mature share of ' +
          '0.99. The card used to name the year the FIRST wave opens, which is true ' +
          'for a fifth of the country and false for the rest.'
      }],
      note: 'no premiums once your coverage wave migrates; waves open from the ' +
        'phase-in year shown and the last one closes in the year on the chip. ' +
        'Employers pay a payroll contribution instead.'
    },
    source: 'KFF Employer Health Benefits Survey 2025',
    confidence: 'high'
  },
  {
    id: 'er',
    title: 'Emergency room visit',
    todayInsured: { lo: 150, hi: 1500, note: 'copay + deductible/coinsurance, plan-dependent' },
    todayUninsured: { lo: 1500, hi: 4000, note: 'billed charges; average total cost ≈ $2,453' },
    nha: {
      amount: 0, promise: 'point-of-care', gates: [costSharingGate()],
      note: 'covered in full; existing cost-sharing keeps applying, at a falling rate, until elimination completes'
    },
    source: 'CDC NHAMCS (average ED visit cost); insured range is plan-dependent',
    confidence: 'medium'
  },
  {
    id: 'childbirth',
    title: 'Having a baby (full episode: pregnancy, delivery, postpartum)',
    todayInsured: { lo: 2000, hi: 4000, note: 'average insured out-of-pocket ≈ $2,854' },
    todayUninsured: { lo: 15000, hi: 30000, note: 'average total episode cost ≈ $18,865' },
    nha: {
      amount: 0, promise: 'point-of-care', gates: [costSharingGate()],
      note: 'covered in full, including prenatal and postpartum care'
    },
    source: 'Peterson–KFF Health System Tracker (2022 analysis of large-employer claims)',
    confidence: 'medium'
  },
  {
    id: 'insulin',
    title: 'Insulin, one month (diabetes)',
    todayInsured: { lo: 35, hi: 100, note: '$35/mo caps now apply in Medicare & many plans' },
    todayUninsured: { lo: 70, hi: 300, note: 'cash price after 2023–24 list-price cuts; production cost is $2–6/vial' },
    nha: {
      amount: 0, promise: 'point-of-care', gates: [costSharingGate()],
      note: '$0 for at least 98% of essential formulary fills, which cost-sharing ' +
        'elimination delivers; the Phase 2 pharmacy utility cuts the price long before that'
    },
    source: 'Yale/BMJ Global Health production-cost study; Civica Rx $30/vial nonprofit price; ADA/manufacturer cap programs',
    confidence: 'medium'
  },
  {
    id: 'mri',
    title: 'MRI scan',
    todayInsured: { lo: 300, hi: 1100, note: 'typically hits the deductible; commercial average price ≈ $1,959' },
    todayUninsured: { lo: 1000, hi: 3000, note: 'billed charges vary several-fold by site' },
    nha: {
      amount: 0, promise: 'point-of-care', gates: [costSharingGate()],
      note: 'covered when clinically indicated; diagnostic-first pathways'
    },
    source: 'Health Care Cost Institute (commercial price data)',
    confidence: 'medium'
  },
  {
    id: 'ambulance',
    title: 'Ground ambulance ride',
    todayInsured: { lo: 450, hi: 1300, note: 'ground ambulance is not protected by the No Surprises Act, so balance billing is common' },
    todayUninsured: { lo: 1300, hi: 3000, note: 'mean cost per transport ≈ $2,673' },
    nha: {
      amount: 0, promise: 'point-of-care',
      gates: [costSharingGate(), expansionGate('Emergency medical services')],
      note: 'EMS becomes a readiness-funded public service, which is one of the expanded benefits'
    },
    source: 'Federal Ground Ambulance Data Collection System (GADCS)',
    confidence: 'high'
  },
  {
    id: 'labs',
    title: 'Routine blood work (metabolic panel + CBC)',
    todayInsured: { lo: 0, hi: 60, note: 'often free preventive; billed if diagnostic' },
    todayUninsured: { lo: 37, hi: 100, note: 'billed charges run 5–6× the Medicare rate ($8–10)' },
    nha: {
      amount: 0, promise: 'point-of-care', gates: [costSharingGate()],
      note: 'included in unit-network and primary-care visits'
    },
    source: 'CMS Clinical Lab Fee Schedule vs. billed-charge studies',
    confidence: 'medium'
  },
  {
    id: 'therapy',
    title: 'Therapy session (mental health)',
    todayInsured: { lo: 20, hi: 75, note: 'in-network copay, when an in-network therapist can be found' },
    todayUninsured: { lo: 100, hi: 200, note: 'typical cash price per session' },
    nha: {
      amount: 0, promise: 'point-of-care',
      gates: [costSharingGate(), expansionGate('Behavioral health')],
      note: 'covered; the behavioral-health expansion carries the 48-hour first-contact standard'
    },
    source: 'SAMHSA spending data; typical market rates (plan- and market-dependent)',
    confidence: 'low'
  },
  {
    id: 'hearing',
    title: 'Hearing aids (pair)',
    todayInsured: { lo: 2000, hi: 8000, note: 'rarely covered today; most people pay full price, averaging about $4,672' },
    todayUninsured: { lo: 2000, hi: 8000, note: 'the same; this is an uncovered market for nearly everyone' },
    nha: {
      amount: 0, promise: 'point-of-care',
      gates: [costSharingGate(), expansionGate('Dental, vision and hearing')],
      note: 'standard devices covered under the dental/vision/hearing expansion'
    },
    source: 'Hearing Industries Association pricing data',
    confidence: 'high'
  },
  {
    id: 'nursing',
    title: 'Nursing home care (one year)',
    todayInsured: { lo: 111000, hi: 128000, note: "Medicare doesn't cover it; Medicaid only after spending down your assets" },
    todayUninsured: { lo: 111000, hi: 128000, note: 'private-pay national average' },
    nha: {
      amount: 0, promise: 'point-of-care',
      gates: [costSharingGate(), expansionGate('Long-term care')],
      note: 'covered under the universal long-term-care benefit (home-first; institutional when needed)'
    },
    source: 'Genworth/CareScout Cost of Care Survey 2024–25',
    confidence: 'high'
  }
];

/* ---- What holds the derivation up ---------------------------------------
 * Deriving the year from the ramp makes "the card agrees with the ramp"
 * unfalsifiable - the two sides are the same arithmetic. These are the
 * assertions whose sides can still differ, so they are the ones worth making.
 * The source-level half (nothing types a year back in) is in manifest-check.ts,
 * because this module ships to the browser and cannot read files.
 * ------------------------------------------------------------------------ */

/* A threshold no ramp ever reaches would make careFromYear throw at build
   time with a stack trace. This reports it by name first. */
export interface CareGateProblem { card: string; ramp: string; atLeast: number; max: number }

export function careGateProblems(ramps: RampSet = RAMPS): CareGateProblem[] {
  const out: CareGateProblem[] = [];
  for (const c of CARE_SCENARIOS) {
    if (!c.nha.gates.length) {
      out.push({ card: c.id, ramp: '(none declared)', atLeast: 0, max: 0 });
      continue;
    }
    for (const g of c.nha.gates) {
      const arr = ramps[g.ramp];
      const max = arr ? Math.max.apply(null, arr) : NaN;
      if (!(max >= g.atLeast - 1e-9)) {
        out.push({ card: c.id, ramp: g.ramp, atLeast: g.atLeast, max: max });
      }
    }
  }
  return out;
}

/* §AY: `$0` at the counter is delivered by cost-sharing elimination and by
   nothing else, so every card that promises it has to be gated on that ramp
   reaching 1.00. Both sides are hand-written - which cards are point-of-care,
   and which gates each one names - so this can fail, and it is what stops the
   next author gating a bill on a ramp that arrives earlier. */
export function pointOfCareCardsMissingCostShareGate(): string[] {
  return CARE_SCENARIOS
    .filter((c) => c.nha.promise === 'point-of-care')
    .filter((c) => !c.nha.gates.some((g) => g.ramp === 'costShareElim' && g.atLeast >= 1))
    .map((c) => c.id);
}

/* Every gate has to say why that ramp governs that card. A gate with no reason
   is a year nobody can review, which is the state R81 found the file in. */
export const CARE_GATE_WHY_FLOOR = 60;

export function shallowCareGateReasons(): string[] {
  const out: string[] = [];
  for (const c of CARE_SCENARIOS) {
    for (const g of c.nha.gates) {
      if (g.why.trim().length < CARE_GATE_WHY_FLOOR) out.push(c.id + '/' + g.ramp);
    }
  }
  return out;
}

/* The phase-in year the page prints beside each chip, checked against the ramp
   rather than against the function that produced it: in the year it names, at
   least one of the card's ramps has to be moving, and in the year before it,
   none of them may be. The first draft of `careReliefYear` reported the
   enactment year for all ten cards - true of nothing, and invisible until the
   page was read - because it borrowed a tolerance meant for a different
   question. */
export function reliefYearProblems(ramps: RampSet = RAMPS): string[] {
  const out: string[] = [];
  for (const c of CARE_SCENARIOS) {
    const y = careReliefYear(c, ramps);
    if (y === null) continue;
    const i = y - START_YEAR;
    const moving = c.nha.gates.some((g) => (ramps[g.ramp][i] || 0) > 0);
    const movedBefore = i > 0 && c.nha.gates.some((g) => (ramps[g.ramp][i - 1] || 0) > 0);
    if (!moving) out.push(c.id + ': nothing is moving in ' + y);
    if (movedBefore) out.push(c.id + ': something was already moving in ' + (y - 1));
  }
  return out;
}

/* Deleting `fromYear` from CareNha makes typing a year back into the FIELD a
   type error, which the build already catches. The hole it leaves is prose:
   a note reading "from 2034" beside a chip reading 2037 is the same defect
   with no compiler to stop it. Source vintages are deliberately not in scope -
   they belong in `source` and in the `today*` notes, and R205 wants more of
   them, not fewer. */
export function careNotesTypingYears(): string[] {
  return CARE_SCENARIOS
    .filter((c) => /\b20\d\d\b/.test(c.nha.note))
    .map((c) => c.id + ': ' + (c.nha.note.match(/\b20\d\d\b/) || [''])[0]);
}

/* The derived table, for the page, the client and the before/after dump. */
export interface CareCardYear {
  id: string;
  fromYear: number;
  reliefYear: number | null;
  bindingRamp: CareRamp;
}

export function careCardYears(ramps: RampSet = RAMPS): CareCardYear[] {
  return CARE_SCENARIOS.map((c) => ({
    id: c.id,
    fromYear: careFromYear(c, ramps),
    reliefYear: careReliefYear(c, ramps),
    bindingRamp: careBindingGate(c, ramps).ramp
  }));
}

export interface HouseholdProfile {
  id: string;
  label: string;
  premium: CareAmount;
  oop: CareAmount;
  confidence: string;
}

/* R84 [§S5]: the Census denominator, read from its declaration rather than
   typed here. This is the right one for a whole-population per-household
   figure; the CBO count (131.0M) is the right one for anything computed per
   income group, and the two are not interchangeable. See
   HOUSEHOLD_DENOMINATORS in params.ts for why. */
export const HOUSEHOLDS_M = householdDenominator('census').households;

/* docs/js/care.js:122-151 (verbatim) */
export const HOUSEHOLD_PROFILES: HouseholdProfile[] = [
  {
    id: 'emp-family',
    label: 'Family with employer coverage',
    premium: { lo: 6850, hi: 6850, note: 'worker share of family premium (KFF 2025)' },
    oop: { lo: 2500, hi: 5500, note: 'deductibles, copays, coinsurance; household average is about $3,825 (derived from CMS)' },
    confidence: 'medium'
  },
  {
    id: 'emp-single',
    label: 'Single person with employer coverage',
    premium: { lo: 1492, hi: 1492, note: 'worker share (~16%) of a $9,325 single premium (KFF 2025)' },
    oop: { lo: 800, hi: 2500, note: 'per-person average ≈ $1,514 (derived from CMS)' },
    confidence: 'medium'
  },
  {
    id: 'marketplace',
    label: 'Family buying marketplace coverage',
    premium: { lo: 6000, hi: 18000, note: 'varies enormously with age, state, and subsidy eligibility; enhanced subsidies expired in 2026' },
    oop: { lo: 3000, hi: 9000, note: 'marketplace deductibles are typically much higher than employer plans' },
    confidence: 'low'
  },
  {
    id: 'uninsured',
    label: 'Uninsured adult',
    premium: { lo: 0, hi: 0, note: 'no premium, no protection' },
    oop: { lo: 500, hi: 5000, note: 'averages hide the real risk: one hospitalization can mean five-figure debt' },
    confidence: 'low'
  }
];
