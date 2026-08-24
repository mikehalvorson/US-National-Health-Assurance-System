/* R226/R251/R293/R234/R133 [§S2]: the phase -> year map, its one conversion
 * to an array index, and the ramps that have to land on it.
 *
 * The defect this closes. `rollout.ts` owns the nine anchor years under a
 * header reading "Fidelity-critical: do not re-derive." Two other modules
 * re-derived them anyway - `equations.ts` as `PHASE_T`, `data-phases.ts` as
 * `phase.year` - and all three agreed character for character, so nothing
 * was visibly wrong. What was wrong is that two consumers read those numbers
 * as 1-based (both use `phase.year` as a CSS grid column, correctly) and one
 * read them as 0-based array indices. Since index 0 is Year 1 is 2027, the
 * equation layer resolved every phase one year further along the build than
 * the phase it was labelled with.
 *
 * The copies are gone: `equations.ts` imports `PHASE_YEAR` and converts in
 * exactly one named function, `phaseIndex`. `data-phases.ts` is generated, so
 * its payload still records the years its generator wrote, but `DATA_PHASES`
 * now takes them from `PHASE_YEAR`, and the two are gated below - a generator
 * whose table drifts fails the build instead of publishing a second anchor
 * year for the same phase on a different chapter.
 *
 * The ramps had the mirror-image defect. `params.ts` declared "Year index
 * 1..16" while every reader indexed from 0, and four of the seven policy
 * ramps were authored against the header rather than against the readers, so
 * they delivered their stated milestone a year after the phase claiming it.
 * Realigning those four is what makes the P8 anchor mature: the two fixes
 * cancel there, and either one alone leaves the model worse than before.
 *
 * These checks read no files, so nothing needs memoising.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  calendarYear, calendarYearOfPhase, EXPANSION_SPAN, LTC_BENEFIT_PHASE, PHASE_YEAR,
  PHASES, ROLLOUT_HEADLINES, UNIT_BUILDOUT_STEPS
} from './rollout';
import { DATA_PHASES, DATA_PHASE_YEARS_AS_GENERATED } from './data-phases';
import { CALENDAR_ANCHOR_DENIAL, RAMPS, RAMP_MILESTONES, START_YEAR } from './params';
import { CARE_SCENARIOS, careFromYear } from './care';
import { phaseIndex, EQ_PHASES, modelValueAt, rampValueAt } from './equations';
import { buildRamps, runPath, sampleParams } from './model';
import { effectiveParams, SCENARIOS, scenarioStructural } from './scenarios';

/* ---- 1. one map, and every copy agrees with it (V2, R293) -------------- */
export interface PhaseMapDrift { phase: string; source: string; year: number; expected: number }

export function phaseMapDrift(): PhaseMapDrift[] {
  const out: PhaseMapDrift[] = [];
  for (const p of PHASES) {
    if (PHASE_YEAR[p.id] !== p.year) {
      out.push({ phase: p.id, source: 'rollout.ts PHASES', year: p.year, expected: PHASE_YEAR[p.id] });
    }
  }
  for (const id of Object.keys(DATA_PHASE_YEARS_AS_GENERATED)) {
    const generated = DATA_PHASE_YEARS_AS_GENERATED[id];
    if (PHASE_YEAR[id] === undefined) {
      out.push({ phase: id, source: 'data-phases.ts (no such phase in rollout.ts)', year: generated, expected: NaN });
    } else if (generated !== PHASE_YEAR[id]) {
      out.push({ phase: id, source: 'build_data_phase_targets.py PHASES', year: generated, expected: PHASE_YEAR[id] });
    }
  }
  for (const p of DATA_PHASES) {
    if (PHASE_YEAR[p.id] !== undefined && p.year !== PHASE_YEAR[p.id]) {
      out.push({ phase: p.id, source: 'data-phases.ts DATA_PHASES', year: p.year, expected: PHASE_YEAR[p.id] });
    }
  }
  return out;
}

/* Every phase the equation layer evaluates must exist in the map. A phase
   with no year silently became index NaN before this check existed. */
export function phasesWithoutYear(): string[] {
  return EQ_PHASES.filter((ph) => !Number.isFinite(PHASE_YEAR[ph]));
}

/* ---- 2. the conversion resolves the calendar year it claims (V1, R226) -- */
export interface PhaseYearMismatch { phase: string; label: number; resolved: number }

/* The phase selector on quality.astro and risk.astro prints "P0 (Year 1)", and
   the fiscal engine's row for that phase has to be the year the label states.

   This used to compare modelValueAt('year', ph) against PHASE_YEAR[ph], which
   CANNOT FAIL: modelAt returns `t + 1`, and `t` is phaseIndex(ph), which is
   PHASE_YEAR[ph] - 1. The two sides were the same expression, so the check
   restated the bug it was meant to catch - the defect R43 exists to prevent,
   reintroduced by the section that was fixing the conversion.

   It now compares the calendar year the fiscal engine stamps on its own row
   (`year = START_YEAR + t` in model.ts, reached through path.detail) against
   the calendar year the phase map resolves. Those are two independent
   computations, and R226's off-by-one moved exactly one of them. */
export function phaseYearMismatches(): PhaseYearMismatch[] {
  const detail = runPath(sampleParams(effectiveParams('SCN-BASE', null), null), {}).detail;
  const out: PhaseYearMismatch[] = [];
  for (const ph of EQ_PHASES) {
    const row = detail[Math.min(phaseIndex(ph), detail.length - 1)];
    const expected = calendarYearOfPhase(ph);
    if (row.year !== expected) {
      out.push({ phase: ph, label: expected, resolved: row.year });
    }
  }
  return out;
}

/* Deliberately the long way round: this resolves through the EQUATION layer's
   phaseIndex(), not through rollout.ts's calendarYear(), because its job is to
   catch those two disagreeing. A version that called calendarYearOfPhase()
   would be comparing rollout.ts with itself and could never fail. */
export function calendarYearOf(phase: string): number {
  return START_YEAR + phaseIndex(phase);
}

/* ...which is only a check if something holds the two converters together. */
export interface ConverterSplit { phase: string; viaEquations: number; viaRollout: number }

export function calendarConverterSplit(): ConverterSplit[] {
  const out: ConverterSplit[] = [];
  for (const ph of EQ_PHASES) {
    const viaEquations = calendarYearOf(ph);
    const viaRollout = calendarYearOfPhase(ph);
    if (viaEquations !== viaRollout) out.push({ phase: ph, viaEquations, viaRollout });
  }
  return out;
}

/* ---- 3. every ramp reaches its declared milestone at that phase (R133) -- */
export interface MilestoneMiss { ramp: string; phase: string; claim: string; needed: number; got: number }

export function rampMilestoneMisses(): MilestoneMiss[] {
  const out: MilestoneMiss[] = [];
  for (const m of RAMP_MILESTONES) {
    const arr = (RAMPS as unknown as Record<string, number[]>)[m.ramp];
    const i = phaseIndex(m.phase);
    const got = arr[Math.min(i, arr.length - 1)];
    /* tolerance: these are two-decimal shares typed by hand */
    if (!(got >= m.atLeast - 1e-9)) {
      out.push({ ramp: m.ramp, phase: m.phase, claim: m.claim, needed: m.atLeast, got });
    }
  }
  return out;
}

/* R81 [§S8]: what a care card is allowed to rest its promise on.
 *
 * This replaces `premiumCardYearDrift`, which asserted that the premium card's
 * typed `fromYear` equalled the coverage ramp's FIRST migrating year. That was
 * the right check for a typed year and the wrong claim about the benefit: the
 * first wave opening is not the last wave closing, and the card said `$0` to
 * everybody. The years are derived now, so "the card agrees with the ramp" has
 * become one arithmetic compared with itself and is worth nothing.
 *
 * What can still differ: a card names a ramp and a share, and `RAMP_MILESTONES`
 * separately declares what each ramp claims to deliver and by which phase.
 * A card resting on a share no milestone claims is a promise with nothing
 * behind it.
 *
 * ⚠️ Review [§S8]: this used to say the two lists are "maintained in different
 * files by different rows", and that overstates their independence today. R81
 * added the `coverage@P7 0.99` milestone in the same commit as the premium
 * card's gate, precisely because the gate had nothing behind it. They are
 * separate from here on and they were not separate at birth; the check earns
 * its keep from the next edit, not from this one.
 *
 * The second half is the direction that matters for §AG1: the card's derived
 * year must not fall AFTER the phase whose milestone backs it, because then
 * the page would be promising something the roadmap says has already happened.
 */
export interface CareGateBacking {
  card: string;
  ramp: string;
  atLeast: number;
  why: string;
}

/* R85 [§S8]: which scenarios move the care-card years, declared.
 *
 * §AG7 named two - SCN-TRUST-COLLAPSE and SCN-STATE-RESIST, both applying
 * `coverageDelayYears: 1`. Measured across all twenty scenarios there are
 * four: SCN-LEGAL applies the same coverage delay, and SCN-UNIT-UNDER applies
 * `costShareDelayYears: 2`, which is the largest movement of the four and
 * lands on the six cards a reader is most likely to be looking at.
 *
 * Declared as data and held in both directions, the way UNSTRESSED_DECLARED is
 * held: a scenario that gains a delay fails the build until someone writes
 * down which cards it moves, and a declaration for a scenario that no longer
 * moves anything fails it too. `maxShift` is pinned as a number for the reason
 * R143 pins the KPP-C8 breach count - a real move should be visible.
 */
export interface CareYearShift {
  scenario: string;
  cards: number;   /* how many of the ten move */
  maxShift: number; /* the largest movement, in years */
  why: string;
}

export const CARE_YEAR_SHIFTS_DECLARED: CareYearShift[] = [
  {
    scenario: 'SCN-TRUST-COLLAPSE', cards: 10, maxShift: 1,
    why: 'coverageDelayYears 1 shifts coverage, cost-sharing elimination and expansions together'
  },
  {
    scenario: 'SCN-STATE-RESIST', cards: 10, maxShift: 1,
    why: 'coverageDelayYears 1, the same shift, from states declining to participate'
  },
  {
    scenario: 'SCN-LEGAL', cards: 10, maxShift: 1,
    why: 'coverageDelayYears 1 from litigation; §AG7 did not name this one and it moves the same ten'
  },
  {
    scenario: 'SCN-UNIT-UNDER', cards: 9, maxShift: 2,
    why: 'costShareDelayYears 2 delays only cost-sharing elimination, so the premium ' +
      'card does not move and the other nine move by two years'
  }
];

export interface CareShiftDrift { scenario: string; declared: string; measured: string }

function measuredCareShifts(): Map<string, { cards: number; maxShift: number }> {
  const base = CARE_SCENARIOS.map((c) => careFromYear(c, RAMPS));
  const out = new Map<string, { cards: number; maxShift: number }>();
  for (const sc of SCENARIOS) {
    const ramps = buildRamps(scenarioStructural(sc.id)) as unknown as Record<string, number[]>;
    let cards = 0;
    let maxShift = 0;
    CARE_SCENARIOS.forEach((c, i) => {
      const shift = careFromYear(c, ramps) - base[i];
      if (shift !== 0) cards += 1;
      if (Math.abs(shift) > Math.abs(maxShift)) maxShift = shift;
    });
    if (cards) out.set(sc.id, { cards: cards, maxShift: maxShift });
  }
  return out;
}

export function careYearShiftDrift(): CareShiftDrift[] {
  const measured = measuredCareShifts();
  const declared = new Map(CARE_YEAR_SHIFTS_DECLARED.map((d) => [d.scenario, d]));
  const out: CareShiftDrift[] = [];
  const say = (v: { cards: number; maxShift: number } | undefined) =>
    v ? v.cards + ' cards, max ' + v.maxShift + 'yr' : 'no movement';
  for (const id of new Set([...measured.keys(), ...declared.keys()])) {
    const m = measured.get(id);
    const d = declared.get(id);
    const same = m && d && m.cards === d.cards && m.maxShift === d.maxShift;
    if (!same) {
      out.push({
        scenario: id,
        declared: d ? d.cards + ' cards, max ' + d.maxShift + 'yr' : 'undeclared',
        measured: say(m)
      });
    }
  }
  return out.sort((a, b) => a.scenario.localeCompare(b.scenario));
}

/* R170 [§S8]: the card against the framework, not against the model.
 *
 * The insulin card quoted SR-DRUG-001 - "$0 patient charge for at least 98% of
 * essential formulary fills BY PHASE 8" - and printed 2029, which is Phase 2.
 * Nine years early against the requirement and eight against the model, on the
 * item with the sharpest human stakes on the page.
 *
 * ⚠️ The row's own stated test reads "no card's fromYear precedes the phase its
 * framework requirement names", and that is the wrong direction for this class
 * of requirement. "By Phase 8" is a DEADLINE: delivering in 2037 satisfies a
 * 2038 deadline, and a check written the row's way would fail the model for
 * being a year better than required. What must not happen is the opposite -
 * a card promising later than the framework requires, or the model quietly
 * slipping past the deadline it cites.
 */
export interface CareRequirementMiss {
  card: string;
  requirement: string;
  lands: number;
  deadline: number;
}

export function careRequirementMisses(): CareRequirementMiss[] {
  const out: CareRequirementMiss[] = [];
  for (const card of CARE_SCENARIOS) {
    const f = card.nha.framework;
    if (!f) continue;
    const deadline = calendarYearOfPhase(f.byPhase);
    const lands = careFromYear(card);
    if (!Number.isFinite(deadline) || lands > deadline) {
      out.push({ card: card.id, requirement: f.id, lands: lands, deadline: deadline });
    }
  }
  return out;
}

export function careGatesWithoutMilestone(): CareGateBacking[] {
  const out: CareGateBacking[] = [];
  for (const card of CARE_SCENARIOS) {
    for (const g of card.nha.gates) {
      const claims = RAMP_MILESTONES.filter((m) => m.ramp === g.ramp && m.atLeast >= g.atLeast - 1e-9);
      if (!claims.length) {
        out.push({
          card: card.id, ramp: g.ramp, atLeast: g.atLeast,
          why: 'no RAMP_MILESTONES entry claims ' + g.ramp + ' reaches ' + g.atLeast
        });
        continue;
      }
      /* the earliest phase any backing milestone names */
      const deadline = Math.min.apply(null, claims.map((m) => calendarYearOfPhase(m.phase)));
      const lands = careFromYear(card);
      if (lands > deadline) {
        out.push({
          card: card.id, ramp: g.ramp, atLeast: g.atLeast,
          why: 'card lands ' + lands + ', milestone claims it by ' + deadline
        });
      }
    }
  }
  return out;
}

/* ---- 4. trainProg's denominator spans the rollout horizon (R234) -------- */
/* Its bounds used to be the literals 1 and 12, which omitted the first year
   of the infrastructure build and included a thirteenth. Both are derived
   now, and the observable consequence is that progress is exactly 1 at the
   P8 anchor - not 0.999, and not 1 by accident of an off-by-one. */
export function trainProgAtMaturity(): number {
  return modelValueAt('SCN-BASE', 'trainProg', 'P8');
}

/* ---- 5. published milestones equal what the ramp delivers (R255) -------- */
export interface HeadlineMiss { label: string; phase: string; needed: number; got: number; why: string }

export function rolloutHeadlineMisses(): HeadlineMiss[] {
  const out: HeadlineMiss[] = [];
  for (const h of ROLLOUT_HEADLINES) {
    if (h.ramp === null) continue;
    const arr = (RAMPS as unknown as Record<string, number[]>)[h.ramp];
    const at = (ph: string) => arr[Math.min(phaseIndex(ph), arr.length - 1)];
    const got = at(h.startPhase);
    if (!(got >= h.atLeast - 1e-9)) {
      out.push({
        label: h.label, phase: h.startPhase, needed: h.atLeast, got,
        why: 'the tile publishes ' + h.value + ' and the ' + h.ramp + ' ramp is not there yet'
      });
    }
    /* a span promises completion at its end */
    if (h.endPhase !== null) {
      const end = at(h.endPhase);
      const mature = arr[arr.length - 1];
      if (!(end >= mature - 1e-9)) {
        out.push({
          label: h.label, phase: h.endPhase, needed: mature, got: end,
          why: 'the tile publishes ' + h.value + ' and the ' + h.ramp + ' ramp is not complete at the end of it'
        });
      }
    }
  }
  return out;
}

/* One milestone, one span, across every chapter that describes it. The
   rollout page said "Year 10" while the overview and health chapters said
   "Years 10-12"; the rollout page now derives its text, and these two still
   type theirs, so they are checked rather than trusted. */
const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const EXPANSION_PAGES = ['src/pages/index.astro', 'src/pages/health.astro'];
const spanCache = new Map<string, string[]>();

export function expansionSpanDisagreements(root = REPO_ROOT): string[] {
  const hit = spanCache.get(root);
  if (hit) return hit;
  const out: string[] = [];
  for (const page of EXPANSION_PAGES) {
    const text = readFileSync(join(root, page), 'utf8');
    if (!text.includes(EXPANSION_SPAN)) {
      out.push(page + ' does not state the expansion as "' + EXPANSION_SPAN + '"');
    }
  }
  spanCache.set(root, out);
  return out;
}

/* ---- 6. the calendar anchor is stated once, denied nowhere (R256) ------- */
/* Every .astro page, so a denial cannot reappear on a chapter nobody is
   looking at. Memoised: fourteen file reads, and vitest re-imports per file. */
const PAGE_GLOB_DIR = 'src/pages';
const pageCache = new Map<string, Array<{ page: string; text: string }>>();

function pageTexts(root = REPO_ROOT): Array<{ page: string; text: string }> {
  const hit = pageCache.get(root);
  if (hit) return hit;
  const dir = join(root, PAGE_GLOB_DIR);
  const out = readdirSync(dir)
    .filter((f) => f.endsWith('.astro'))
    .map((f) => ({ page: PAGE_GLOB_DIR + '/' + f, text: readFileSync(join(dir, f), 'utf8') }));
  pageCache.set(root, out);
  return out;
}

export function calendarAnchorDenials(root = REPO_ROOT): string[] {
  return pageTexts(root)
    .filter((p) => p.text.includes(CALENDAR_ANCHOR_DENIAL))
    .map((p) => p.page + ' denies the calendar anchor while the model publishes ' + START_YEAR);
}

/* ---- 7. no page types a benefit start year (R262) ---------------------- */
export interface BenefitStartDrift { page: string; stated: number; phase: string; expected: number }

/* The LTC chapter said the benefit "begins in 2026". The year is now derived
   from the phase whose work list carries long-term care, so this checks the
   derivation still resolves and that no page has typed a competing year. */
export function ltcBenefitStartYear(): number {
  if (!LTC_BENEFIT_PHASE) return NaN;
  return calendarYear(LTC_BENEFIT_PHASE.year);
}

export function benefitStartDrift(root = REPO_ROOT): BenefitStartDrift[] {
  const out: BenefitStartDrift[] = [];
  if (!LTC_BENEFIT_PHASE) {
    out.push({ page: 'rollout.ts', stated: NaN, phase: 'none', expected: NaN });
    return out;
  }
  const expected = ltcBenefitStartYear();
  /* The original sentence read "a benefit that begins in 2026". Matching only
     that wording made this guard DEAD the moment the sentence was rewritten:
     no page contained the phrase, so nothing could fail it. The family below
     catches the ways a contributor would naturally retype the claim. */
  const TYPED = /benefit(?:\s+\w+){0,3}?\s+(?:begins|began|starts|beginning|starting)\s+in\s+(\d{4})/gi;
  for (const p of pageTexts(root)) {
    for (const m of p.text.matchAll(TYPED)) {
      const stated = Number(m[1]);
      if (stated !== expected) {
        out.push({ page: p.page, stated, phase: LTC_BENEFIT_PHASE.id, expected });
      }
    }
  }
  /* The other half, and the half a widened regex still cannot give: the page
     that publishes the start year must DERIVE it. If the binding disappears,
     the year has been typed again, whatever words surround it. */
  const ltc = pageTexts(root).find((p) => p.page.endsWith('ltc.astro'));
  if (ltc && !/calendarYear\(/.test(ltc.text)) {
    out.push({ page: 'src/pages/ltc.astro', stated: NaN, phase: LTC_BENEFIT_PHASE.id, expected });
  }
  return out;
}

/* ---- 8. no bar height encodes an invented number (R258) ---------------- */
export interface BuildoutStepIssue { step: string; problem: string }

/* The three plotted steps must each match a floor the rollout page states in
   prose, and the two off-axis steps must carry no number at all. Both halves
   matter: the invented 24% and 34% were the defect, and re-adding a number to
   an off-axis step would put it back. */
export function unitBuildoutIssues(root = REPO_ROOT): BuildoutStepIssue[] {
  const out: BuildoutStepIssue[] = [];
  const page = readFileSync(join(root, 'src/pages/rollout.astro'), 'utf8');
  for (const step of UNIT_BUILDOUT_STEPS) {
    const id = step.phase + ' · ' + step.value;
    if (step.coverage === null) {
      if (/\d/.test(step.value)) {
        out.push({ step: id, problem: 'an off-axis step carries a number in its label' });
      }
      continue;
    }
    if (!page.includes(String(step.coverage) + '%')) {
      out.push({
        step: id,
        problem: 'plots ' + step.coverage + '% and the page states no such floor'
      });
    }
    if (!step.value.includes(String(step.coverage))) {
      out.push({ step: id, problem: 'its label and its height disagree' });
    }
  }
  return out;
}

/* ---- 9. no module re-derives the map (R251) ---------------------------- */
/* A guard against the copies coming back. `rampValueAt` is exported for the
   visualizer's input legend and resolves through `phaseIndex` like everything
   else; if a second map appeared and a caller used it, this would disagree. */
export function rampLegendDisagreements(): string[] {
  const out: string[] = [];
  for (const ph of EQ_PHASES) {
    const direct = RAMPS.coverage[Math.min(phaseIndex(ph), RAMPS.coverage.length - 1)];
    const viaLegend = rampValueAt('SCN-BASE', 'cov', ph);
    if (Math.abs(direct - viaLegend) > 1e-9) {
      out.push(ph + ': array ' + direct + ' vs legend ' + viaLegend);
    }
  }
  return out;
}
