/* R169 [§S18]: the plan's quantified requirements, each one either shown to a
 * reader or declared out of scope with its reason.
 *
 * The plan defines 228 requirements (183 system, 45 project), the same in
 * both upstream documents (R132), and most state a number: a percentage, a
 * threshold, a count or a deadline. They are its own testable commitments.
 * The audit counted 212 and 111 quantified and found about twelve cited;
 * measured 2026-10-12 it is 228 and 146 (a number outside a phase, gate,
 * title or id).
 *
 * A phase is not counted as the requirement's number. Nearly every
 * requirement ends "by Phase 8", so a deadline that is only a phase is the
 * plan's schedule, which the Rollout tab draws phase by phase, not a
 * quantity this module can hold a surface to. Counting phases too gives 159
 * (measured 2026-10-12); the thirteen it adds state nothing but their phase.
 *
 * Most need no declaration. A requirement traces to the catalog metric that
 * measures it, and the Quality tab draws every metric's maturity target and
 * phase strip, so `requirementCoverage()` resolves it by itself when:
 *  - a traced metric's target states the same bound, in the Source Package's
 *    dictionary and in the catalog the tab draws;
 *  - a traced metric's phase strip carries the bound as a committed floor
 *    (the gate and milestone floors, PR-SCH-*); or
 *  - a parameter names it as its `requirement` and its source note, drawn on
 *    the Healthcare tab, states the requirement's figure (review of P24:
 *    the row's own ask, "add the governing requirement ID to every parameter
 *    that has one", held by `parameterRequirementFaults()`).
 * What remains is declared below, one entry per requirement: where a reader
 * meets it, or why the dashboard does not show it. The ids stay data; no page
 * draws them (the owner's 2026-10-10 decision).
 *
 * Pure: the caller passes the parsed requirements (source-package.ts reads
 * them), so this module never touches the filesystem.
 */
import { GOV_GROUPS } from './gov';
import type { ParamDef } from './model-types';
import { PARAM_DEFS } from './params';
import { parseNum, type NumMeta } from './phase-targets';
import { QUALITY_DATA } from './quality';
import { kindsWhere } from './rollout-kinds';
import { TABS } from './tabs';

/* One requirement as the Source Package states it: its sentence and the ids
   its trace names (metrics, KPP/TPP, and stakeholder needs, SN). The type is
   this module's; source-package.ts fills it. */
export interface RequirementText { id: string; text: string; trace: string[] }

/* The text with what is not a figure taken out: ids, phases and phase
   ranges, P#, gates and titles. Review 3 of P24: the readers below each
   excluded different things (this one all of them, the figure lister only
   "Phase N", the plan-figure reader only years), so "Phases 3 to 4" left a
   4 and "Gate 2" demanded a 2 of a note. One reading now. */
function withoutNonFigures(text: string): string {
  return text
    .replace(/\b(?:SN|SR|PR|KPP|TPP|CP|OI|ASM)-[A-Z0-9.-]+/g, '')
    .replace(/\bPhases?\s+\d+(?:\s*(?:-|–|to|and|through)\s*\d+)?/gi, '')
    .replace(/\bP\d\b/g, '')
    .replace(/\bGate\s+\d+/gi, '')
    .replace(/\bTitle\s+[IVXL]+\b/g, '');
}
const FIGURE = /\d[\d,]*(?:\.\d+)?/g;

/* A number in the requirement's sentence that is not a phase, gate, title or
   id: "at least 99%", "within 24 hours", "no later than Year 15". */
export function isQuantified(text: string): boolean {
  return /\d/.test(withoutNonFigures(text));
}

/* A requirement's bound: the number after its comparator phrase, read as a
   claim string parseNum understands ("at least 75% for wave I" is ">=75%").
   The first number in a requirement is often a phase ("from Phase 3 to Phase
   4 unless ... at least 75%"), so parseNum cannot read the sentence itself. A
   requirement with no comparator phrase may state a deadline: "within 24
   hours" and "within median 6 months" are ceilings. */
const BOUND = /\b(at least|at or above|no (?:more|greater) than|at or below)\s+(\$?\d[\d,]*(?:\.\d+)?)/i;
const WITHIN = /\bwithin\s+(?:median\s+)?(\d[\d,]*(?:\.\d+)?)/i;

export function requirementBound(text: string): NumMeta | null {
  const m = BOUND.exec(text);
  if (m) {
    const cmp = /^at (least|or above)/i.test(m[1]) ? '≥' : '≤';
    return parseNum(cmp + m[2] + text.slice(m.index + m[0].length, m.index + m[0].length + 60));
  }
  const w = WITHIN.exec(text);
  return w ? parseNum('≤' + w[1] + text.slice(w.index + w[0].length, w.index + w[0].length + 60)) : null;
}

/* A catalog or dictionary target's bound. The improvement metrics state
   theirs as "baseline +25 percentage points" or ">=60 percentage point
   improvement", which parseNum reads with no comparator or no unit; both
   are the floor "at least N percentage points". */
export function targetBound(text: string): NumMeta | null {
  const pp = /(?:\+|>=|≥)\s*(\d+(?:\.\d+)?)\s+percentage points?/.exec(text);
  if (pp) return { num: Number(pp[1]), cmp: '>=', unit: 'pp', decimals: 0, comma: false };
  return parseNum(text);
}

/* Review 3 of P24: bounds were compared more than one way (a strict
   comparison; the declared metric route, which dropped the unit;
   statesEveryFigure, numbers only). One comparison now, and review 4 of P24
   removed sameBound, which only called it. Strict: number, direction and unit all agree. Lenient (a
   declared metric whose target leaves a direction or a unit unstated, as
   "200 of 200" does): what the target states must agree. */
export function boundsAgree(target: NumMeta | null, req: NumMeta | null, lenient = false): boolean {
  if (!target || !req || target.num !== req.num) return false;
  const agree = (a: string | null, b: string | null) => a === b || (lenient && !a);
  return agree(target.cmp, req.cmp) && agree(target.unit, req.unit);
}

/* The figures a text states, as numbers ("0.50" and "0.5" are one figure),
   commas dropped, a phase's number left out. */
function numbersIn(text: string): number[] {
  return (withoutNonFigures(text).match(FIGURE) || []).map((n) => Number(n.replace(/,/g, '')));
}

/* Review 2 of P24: a text states a requirement only if it states every
   figure the requirement does ("0.25% to 0.50%" needs both ends), not one
   shared number. */
function statesEveryFigure(text: string, requirementText: string): boolean {
  const said = numbersIn(text);
  const want = numbersIn(requirementText);
  return want.length > 0 && want.every((n) => said.indexOf(n) >= 0);
}

/* ---- parameters that state the plan's own figure ------------------------- */

/* Review 2 of P24: a sentence of a parameter's note that names the plan and
   states a figure other than a year states the plan's own figure. The first
   version listed five phrasings fitted to the notes it knew and missed
   ltcExpansion's "a 70% home-and-community target". Review 3 of P24: the
   second version was "the (specific) plan('s)" only, which missed "this
   plan", "the NHA plan" and "The Plan" while its comment said "however it
   is worded"; and it dropped commas before the year test, so "2,000"
   read as a year. It reads the word "plan" in any case and with any word
   before it now, and a year is a bare four-digit token. What it does not
   read: "plans" (insurance plans are not the plan) and "the system", which
   the notes use for the model as often as for the plan. Such a parameter
   names the requirement whose figure the sentence states, or is declared
   below as stating a plan figure no requirement carries. */
const NAMES_THE_PLAN = /\bplan(?:'s)?\b/i;
const YEAR = /^(?:19|20)\d\d$/;

export function planFigureSentences(note: string): string[] {
  return note.split(/(?<=[.;])\s+/).filter((s) => NAMES_THE_PLAN.test(s) &&
    (withoutNonFigures(s).match(FIGURE) || []).some((n) => !YEAR.test(n)));
}

/* A reason is a sentence or more, not a label. Review 4 of P24: the review
   of P24 found this was `length < 40` renamed and nothing more; an
   out-of-scope reason is also checked for fit (ScopeReason, below). */
const REASON_FLOOR = 40;

/* A plan figure that is not a requirement's: the parameter states it and no
   SR or PR requirement carries it. */
export const PLAN_FIGURES_NOT_REQUIREMENTS: Record<string, string> = {
  /* review 3 of P24: the reason no longer retypes the range the note states */
  transitionTotal: 'The plan\'s transition-cost range is its own cost position, stated in its summary and its cost chapter, not in any SR or PR requirement.'
};

/* Review 3 of P24: whether a parameter's note states every figure its
   requirement states. One function, read by the parameter check below and by
   the coverage route, which had each written it out. */
export function noteStatesRequirement(p: ParamDef, r: RequirementText): boolean {
  return statesEveryFigure(p.source || '', r.text);
}

export function parameterRequirementFaults(
  requirements: Map<string, RequirementText>,
  params: ParamDef[] = PARAM_DEFS,
  exempt: Record<string, string> = PLAN_FIGURES_NOT_REQUIREMENTS
): { checked: number; sentences: number; faults: string[] } {
  const faults: string[] = [];
  let checked = 0, sentences = 0;
  for (const p of params) {
    const note = p.source || '';
    const stated = planFigureSentences(note);
    sentences += stated.length;
    const r = p.requirement ? requirements.get(p.requirement) : undefined;
    if (p.requirement) {
      checked += 1;
      if (!r) faults.push(p.id + ' names ' + p.requirement + ', which the plan does not define');
      else if (!noteStatesRequirement(p, r)) faults.push(p.id + '\'s note does not state every figure ' + p.requirement + ' states');
    }
    if (stated.length && !p.requirement && !(p.id in exempt)) {
      faults.push(p.id + '\'s note states the plan\'s own figure and names no requirement: "' + stated[0].slice(0, 80) + '"');
    }
    if (p.id in exempt && (!stated.length || p.requirement)) {
      faults.push(p.id + ' is declared as a plan figure no requirement carries, and its note ' +
        (p.requirement ? 'names one' : 'states no plan figure'));
    }
  }
  for (const [id, reason] of Object.entries(exempt)) {
    if (!params.some((p) => p.id === id)) faults.push(id + ' is declared as a plan figure and is no parameter');
    /* review 3 of P24: the reason was never read, so an empty one passed */
    if (reason.trim().length < REASON_FLOOR) faults.push(id + ' is declared as a plan figure with no reason');
  }
  return { checked, sentences, faults };
}

/* ---- the declared remainder --------------------------------------------- */

export type Disposition =
  /* the catalog metric that states the same commitment, where the
     requirement's own trace does not name it or its wording differs */
  | { metric: string; why: string }
  /* a Governance entity whose card states it */
  | { entity: string; quote: string }
  /* a tab whose server-rendered text states it (held by a page test) */
  | { tab: string; quote: string }
  | { outOfScope: ScopeReason };

/* Review 4 of P24: a reason for leaving requirements out of scope, with the
   topics it covers. scopeReasonFaults() holds it: its text is a sentence or
   more and names every topic; every topic is named by a requirement given
   it; each requirement given it names one of its topics; and no quantified
   requirement outside the ones given it names any of its topics. The last
   is what makes the check complete for a reassignment: a requirement can
   name a reason's topic only if it already has that reason, so handing a
   reason to any other requirement leaves it naming none. A topic is matched
   as written, ignoring case. Reviews 5 and 6 of P24: the first versions
   compared only against reasons in use, and "review", then "appeal",
   "continuity" and "bounce-back" matched requirements given no reason. */
export interface ScopeReason { text: string; topics: string[] }
const mentions = (text: string, topic: string): boolean => text.toLowerCase().indexOf(topic.toLowerCase()) >= 0;


/* Review 4 of P24: this reason listed "waivers", which none of its
   requirements names, and left out processes some of them are about; a
   length check could not see it. Review 5 of P24: its topics are the
   processes its requirements name. */
const OVERSIGHT_PROCESS: ScopeReason = {
  topics: ['scorekeeping', 'verification', 'retrospective review', 'sunset review', 'appeal reversal',
    'appeal category', 'AI lifecycle', 'emergency repair', 'trust repair', 'forecast error', 'exit-plan', 'pilot',
    'red-team', 'corrective action'],
  text: 'A completion or compliance rate for one of the plan\'s own oversight processes: independent ' +
    'scorekeeping, parameter verification, retrospective reviews of major rules, sunset reviews, appeal reversal ' +
    'and appeal category reviews, AI lifecycle reviews, emergency repair, trust repair, forecast error reviews, ' +
    'vendor exit-plan upkeep, pilot decisions, red-team findings and corrective action. The dashboard models what ' +
    'the system costs and delivers, not the workload of the bodies that audit it, so it publishes no rate for these.'
};
const TRANSITION_CASES: ScopeReason = {
  topics: ['complaint'],
  text: 'An operating target for the transition authority\'s complaint handling. ' +
    'The dashboard models the transition\'s cost, schedule and workforce, not its case outcomes.'
};
/* Review 3 of P24: rows that carried a reason that did not describe them. */
const SAFETY_REVIEW: ScopeReason = {
  topics: ['bounce-back review'],
  text: 'A completion rate for the bounce-back reviews a unit\'s same-problem returns trigger. ' +
    'The Quality tab carries the bounce-back rate itself; the dashboard models outcomes, not ' +
    'the completion of the reviews that follow them.'
};
const PATIENT_CONTINUITY: ScopeReason = {
  topics: ['migrated patient continuity'],
  text: 'A migrated patient continuity rate, for patients moved from legacy coverage, at a level ' +
    'of its own. The Quality tab\'s active-treatment transfer metric carries the transition\'s patient ' +
    'continuity at the catalog\'s level, a different figure, and the dashboard does not publish this one.'
};
const DATA_TRANSFER: ScopeReason = {
  topics: ['legacy payer'],
  text: 'A completeness rate for moving legacy payers\' records into the new system. ' +
    'The dashboard models the data platform\'s build and the transition\'s cost and schedule, not ' +
    'record-by-record migration completeness.'
};

export const REQUIREMENT_DISPOSITIONS: Record<string, Disposition> = {
  'SR-DRUG-006': { metric: 'TPP-4.1', why: 'The catalog states the same floor as "200 of 200 controlled product families".' },
  'SR-RGT-007': { metric: 'TPP-6.3', why: 'The requirement traces only to needs; the unit follow-up closure metric is the same commitment at the same level.' },
  'SR-PAY-008': { entity: 'PLCCO', quote: 'the 5% reconciliation-withholding cap for small providers' },
  'PR-TRN-010': { entity: 'NHTCA', quote: 'then sunsets by Year 15' },
  'SR-LAW-009': { tab: 'hardening', quote: '≥99% critical legal provisions with legal contingency coverage' },
  'SR-DATA-010': { tab: 'data', quote: 'Sensitive-access audits ≥99% of required cases' },
  /* owner, 2026-10-12: stated beside the plan's total per person, both computed */
  'PR-CST-003': { tab: 'health', quote: 'at or below $13,300 per person in real 2024 dollars' },
  /* owner, 2026-10-12: the catalog had no metric for it, and one was established */
  /* review 3 of P24: the plan's trace matrix links it to KPP-E1 and TPP-USE1
     only through the needs they share ("derived through stakeholder-need
     link"), and neither measures accommodation or states its floor */
  'SR-RGT-009': { metric: 'KPP-E6', why: 'The plan\'s trace reaches the coverage-gap and rights-comprehension metrics only through shared needs, and neither measures accommodation; KPP-E6 was defined for this requirement and carries its floor.' },
  /* review 3 of P24: the target route now needs every figure, and the
     bounce-back record states the ceiling but not the window that defines a
     bounce-back */
  'SR-ACC-014': { metric: 'TPP-6.5', why: 'The catalog\'s bounce-back metric states the requirement\'s ceiling; the window that defines a bounce-back is in the requirement and the record does not restate it.' },
  'SR-RGT-006': { outOfScope: SAFETY_REVIEW },
  'SR-RGT-012': { outOfScope: OVERSIGHT_PROCESS },
  'SR-ADP-001': { outOfScope: OVERSIGHT_PROCESS },
  'SR-ADP-002': { outOfScope: OVERSIGHT_PROCESS },
  'SR-ADP-004': { outOfScope: OVERSIGHT_PROCESS },
  'SR-ADP-005': { outOfScope: OVERSIGHT_PROCESS },
  'SR-ADP-006': { outOfScope: OVERSIGHT_PROCESS },
  'SR-ADP-007': { outOfScope: OVERSIGHT_PROCESS },
  'SR-ADP-008': { outOfScope: OVERSIGHT_PROCESS },
  'SR-ADP-009': { outOfScope: OVERSIGHT_PROCESS },
  'SR-ADP-010': { outOfScope: OVERSIGHT_PROCESS },
  'SR-ADP-011': { outOfScope: OVERSIGHT_PROCESS },
  'SR-ADP-012': { outOfScope: OVERSIGHT_PROCESS },
  'SR-ADP-013': { outOfScope: OVERSIGHT_PROCESS },
  'SR-ADP-014': { outOfScope: OVERSIGHT_PROCESS },
  'PR-TRN-002': { outOfScope: PATIENT_CONTINUITY },
  'PR-TRN-005': { outOfScope: DATA_TRANSFER },
  'PR-TRN-008': { outOfScope: TRANSITION_CASES },
  'PR-TRN-009': { outOfScope: TRANSITION_CASES }
};

/* Review 4 of P24: what ScopeReason promises, every direction in one place
   (review 5 of P24: the first version split it with requirementCoverage(),
   so a caller had to run both). The R169 build row runs it. */
export function scopeReasonFaults(
  requirements: Map<string, RequirementText>,
  declared: Record<string, Disposition> = REQUIREMENT_DISPOSITIONS
): { reasons: number; faults: string[] } {
  const given = new Map<ScopeReason, string[]>();
  for (const [id, d] of Object.entries(declared)) {
    if (!('outOfScope' in d)) continue;
    given.set(d.outOfScope, (given.get(d.outOfScope) || []).concat(id));
  }
  const faults: string[] = [];
  const quantified = [...requirements.values()].filter((r) => isQuantified(r.text));
  for (const [reason, ids] of given) {
    if (reason.text.trim().length < REASON_FLOOR) for (const id of ids) faults.push(id + ' is declared out of scope with no reason');
    if (!reason.topics.length) faults.push(ids[0] + '\'s out-of-scope reason names no topic');
    for (const t of reason.topics) {
      if (!mentions(reason.text, t)) faults.push(ids[0] + '\'s out-of-scope reason does not say "' + t + '"');
      if (!ids.some((id) => mentions(requirements.get(id)?.text || '', t))) {
        faults.push('no requirement given ' + ids[0] + '\'s reason names its topic "' + t + '"');
      }
      for (const r of quantified) {
        if (ids.indexOf(r.id) < 0 && mentions(r.text, t)) {
          faults.push(r.id + ' mentions "' + t + '", a topic of the reason given to ' + ids[0] + ', and is not given that reason');
        }
      }
    }
    for (const id of ids) {
      const text = requirements.get(id)?.text || '';
      if (reason.topics.length && !reason.topics.some((t) => mentions(text, t))) {
        faults.push(id + ' is declared out of scope for a reason about ' + reason.topics.join(', ') + ', and it names none of them');
      }
    }
  }
  return { reasons: given.size, faults };
}

/* ---- the check ---------------------------------------------------------- */

export interface RequirementCoverage {
  quantified: number;
  byTarget: number;
  byFloor: number;
  byParameter: number;
  declared: number;
  outOfScope: number;
  /* the tab entries a page test must find in the rendered text */
  tabSurfaces: Array<{ id: string; tab: string; quote: string }>;
  faults: string[];
}

const FLOOR_KINDS = new Set<string>(kindsWhere(function (d) { return d.committedFloor; }));

export function requirementCoverage(
  requirements: Map<string, RequirementText>,
  targets: Map<string, string>,
  declared: Record<string, Disposition> = REQUIREMENT_DISPOSITIONS,
  catalog = QUALITY_DATA,
  params: ParamDef[] = PARAM_DEFS
): RequirementCoverage {
  const byId = new Map(catalog.parameters.map((p) => [p.id, p] as const));
  const out: RequirementCoverage = {
    quantified: 0, byTarget: 0, byFloor: 0, byParameter: 0, declared: 0, outOfScope: 0,
    tabSurfaces: [], faults: []
  };
  const resolvedByItself = new Set<string>();

  for (const r of requirements.values()) {
    if (!isQuantified(r.text)) continue;
    out.quantified += 1;
    const bound = requirementBound(r.text);
    const metrics = r.trace.filter((t) => byId.has(t));
    /* review 3 of P24: and the record shows every figure the requirement
       states ("within 24 hours", not only the 99.5%), so a target that loses
       its window stops resolving the requirement */
    const byTarget = metrics.some((m) => {
      const dict = targets.get(m);
      const rec = byId.get(m)!;
      return dict !== undefined && boundsAgree(bound, targetBound(dict)) && boundsAgree(bound, targetBound(rec.target)) &&
        statesEveryFigure(rec.name + ' ' + rec.target, r.text);
    });
    const byFloor = !byTarget && metrics.some((m) => byId.get(m)!.rollout.some((e) =>
      FLOOR_KINDS.has(e.kind) && boundsAgree(bound, targetBound(e.value)) &&
      statesEveryFigure(byId.get(m)!.name + ' ' + e.value, r.text)));
    const byParameter = !byTarget && !byFloor && params.some((p) => p.requirement === r.id && noteStatesRequirement(p, r));
    if (byTarget || byFloor || byParameter) {
      if (byTarget) out.byTarget += 1; else if (byFloor) out.byFloor += 1; else out.byParameter += 1;
      resolvedByItself.add(r.id);
      continue;
    }
    const d = declared[r.id];
    if (!d) { out.faults.push(r.id + ' states a number and is neither shown nor declared out of scope: "' + r.text + '"'); continue; }
    if ('outOfScope' in d) {
      /* its reason, length and fit, is scopeReasonFaults()'s (review 6 of P24) */
      out.outOfScope += 1;
      continue;
    }
    out.declared += 1;
    if ('metric' in d) {
      const p = byId.get(d.metric);
      const t = p ? targetBound(p.target) : null;
      /* the same number, and the same direction and unit wherever the
         target states one ("200 of 200" states neither; "<=99%" is not "at
         least 99%") */
      if (!p) out.faults.push(r.id + ' names ' + d.metric + ', which is not in the catalog');
      else if (!boundsAgree(t, bound, true)) {
        out.faults.push(r.id + ' names ' + d.metric + ', whose target "' + p.target + '" does not state ' +
          (bound ? (bound.cmp === '<=' ? 'at most ' : 'at least ') + bound.num : 'its number'));
      }
      continue;
    }
    const quote = d.quote;
    if (!statesEveryFigure(quote, r.text)) {
      out.faults.push(r.id + '\'s quote "' + quote + '" does not state every figure the requirement states');
    }
    if ('entity' in d) {
      const m = GOV_GROUPS.flatMap((g) => g.members).find((x) => x.code === d.entity);
      const text = m ? [m.role, m.why, m.replaces, m.leader].join(' ') : '';
      if (text.indexOf(quote) < 0) out.faults.push(r.id + ': the ' + d.entity + ' card does not say "' + quote + '"');
    } else {
      if (!TABS.some((t) => t.path === d.tab)) out.faults.push(r.id + ' names a tab that does not exist: ' + d.tab);
      out.tabSurfaces.push({ id: r.id, tab: d.tab, quote });
    }
  }

  /* a declaration for a requirement that resolves by itself, or that no
     longer exists, is a stale exemption */
  for (const id of Object.keys(declared)) {
    if (resolvedByItself.has(id)) out.faults.push(id + ' is declared but resolves through its catalog metric or a parameter');
    else if (!requirements.has(id)) out.faults.push(id + ' is declared and the plan defines no such requirement');
    else if (!isQuantified(requirements.get(id)!.text)) out.faults.push(id + ' is declared and states no number');
  }
  return out;
}
