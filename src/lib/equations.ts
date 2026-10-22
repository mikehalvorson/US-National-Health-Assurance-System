/* =========================================================================
 * Equation engine for every KPP and TPP target.
 *
 * Each of the 130 KPP/TPP records carries a structured equation (an
 * expression tree) that computes the level the system can credibly demand
 * at each rollout phase from actual inputs:
 *   - the cost model's sourced parameters (scenario-varied through
 *     effectiveParams, so stress scenarios move every derived target),
 *   - the rollout build ramps (coverage, cost-share elimination, units,
 *     pharmacy, hospitals, expansions, infrastructure), shifted or scaled
 *     by each scenario's structural knobs,
 *   - the fiscal engine itself (runPath) for the cost/financing KPPs,
 *   - other KPP/TPP equations (outcome metrics consume operational ones).
 *
 * Three reusable functional forms cover most operating metrics:
 *   share    v = M * S(t)              adoption/coverage counts
 *   ceiling  v = 100 - (100-M) * F(t)  maximize-% metrics
 *   errors   v = M * F(t)              minimize metrics (waits, error rates)
 * where S(t) is the metric's build state (a composite of ramps and upstream
 * equations, 0..1) and F(t) = 1 + KAPPA * (1 - S(t)) inflates the mature
 * shortfall or error ceiling while the subsystem is immature. KAPPA = 8 is
 * calibrated from the one controlled interior error floor the plan states
 * (AI oversight capture: 97% at P5 against 99% at maturity, with the
 * records/AI infrastructure 75% built at P5: 3x the mature shortfall at
 * 25% remaining build implies 1 + 8 * 0.25 = 3).
 * Queue metrics use a load form v = M * L(t)/L(mature), L = demand /
 * (workforce sufficiency * capacity build). Cost KPPs read the fiscal
 * engine directly. Where a scenario inflates a need-driven cost parameter
 * (EMS, LTC, behavioral health, IT), the excess enters as a need-inflation
 * divisor >= 1: the same build buys less capability when need runs hotter.
 *
 * The phase map reads each ramp at the END of the phase's anchor year
 * (P0 year 1 ... P8 year 12), which is also where every ramp reaches its
 * mature level. 106 of the 118 checkable metrics therefore close on their
 * source target to within one part in a million; the composite and queue
 * forms normalize against base-case mature load instead of solving to the
 * target, so they close to within MATURITY_TOLERANCE. Four metrics miss by
 * more and are named in DOCUMENTED_GAPS rather than absorbed.
 * ========================================================================= */
import { effectiveParams, scenarioStructural, SCENARIOS } from './scenarios';
import { baselineAdminSpend, buildRamps, runPath } from './model';
import { BASE2023, CENSUS_UNINSURED_2024, DEFLATOR_2023_TO_2024, PARAM_REGISTRY, RAMPS, US_PEER_DRUG_PRICE_RATIO, nheGdpSharePct, nhePerPerson } from './params';
import type { BuiltRamps } from './model';
import type { SampledParams, PathResult } from './model-types';
import type { QualityData, QualityParameter } from './quality-data';
import { NHA_QUALITY_DATA } from './quality-data';
import { parseNum, withNum, type NumMeta } from './phase-targets';
import { PHASE_YEAR } from './rollout';
import { kindsWhere } from './rollout-kinds';
import { catalogRecordById, lookupOrThrow, namedRegistry } from './registry-lookup';

/* ---- Expression tree ---------------------------------------------------- */
export type RampId = 'cov' | 'cs' | 'unit' | 'drug' | 'hosp' | 'exp' | 'inf';
export type ModelId = 'util' | 'trainProg' | 'year' | 'costRatio'
  | 'adminShare' | 'pubCost' | 'newRev' | 'wealthRev' | 'houseRelief' | 'wageGain'
  | 'wageGainNet';

export type ExprNode =
  /* `kappa` marks the one leaf whose value is a sensitivity knob rather than a
     fixed number: it is read from the active setting at evaluation time so the
     model can be run at other values (R227). Every other num node is its v. */
  | { k: 'num'; v: number; label: string; kappa?: boolean; from?: string; own?: 'level' | 'shortfall' }
  | { k: 'param'; id: string }
  | { k: 'ramp'; id: RampId }
  | { k: 'model'; id: ModelId }
  | { k: 'ref'; id: string }
  | { k: 'add' | 'sub' | 'mul' | 'div' | 'pow'; a: ExprNode; b: ExprNode }
  | { k: 'min' | 'max'; args: ExprNode[] }
  | { k: 'base8'; of: ExprNode }
  | { k: 'basep'; of: ExprNode };

export interface EquationDef {
  id: string;
  kind: 'KPP' | 'TPP' | 'index';
  name: string;
  group: string;
  cmp: '>=' | '<=';
  unit: string;             /* display suffix for raw computed values */
  decimals: number;
  template?: string;        /* '{X}' template when the catalog target has no numeric scaffold */
  expr: ExprNode;
  why: string;
}

/* ---- Builders (internal) ------------------------------------------------ */
function n(v: number, label: string): ExprNode { return { k: 'num', v: v, label: label }; }
function p(id: string): ExprNode { return { k: 'param', id: id }; }
function r(id: RampId): ExprNode { return { k: 'ramp', id: id }; }
function m(id: ModelId): ExprNode { return { k: 'model', id: id }; }
function q(id: string): ExprNode { return { k: 'ref', id: id }; }
function add(a: ExprNode, b: ExprNode): ExprNode { return { k: 'add', a: a, b: b }; }
function sub(a: ExprNode, b: ExprNode): ExprNode { return { k: 'sub', a: a, b: b }; }
function mul(a: ExprNode, b: ExprNode): ExprNode { return { k: 'mul', a: a, b: b }; }
function dv(a: ExprNode, b: ExprNode): ExprNode { return { k: 'div', a: a, b: b }; }
function pw(a: ExprNode, b: ExprNode): ExprNode { return { k: 'pow', a: a, b: b }; }
function mn(...args: ExprNode[]): ExprNode { return { k: 'min', args: args }; }
function mx(...args: ExprNode[]): ExprNode { return { k: 'max', args: args }; }
function b8(of: ExprNode): ExprNode { return { k: 'base8', of: of }; }
function bp(of: ExprNode): ExprNode { return { k: 'basep', of: of }; }

/* R227 [§S3]: the immaturity stress multiplier.
 *
 * KAPPA sets the interior shape of the `ceiling` and `errors` forms, which
 * between them cover most of the 130 metrics. It is fitted to ONE observation:
 * the controlled AI-oversight floor, 97% at P5 against 99% at maturity with
 * the records and AI infrastructure 75% built - three times the mature
 * shortfall at 25% remaining build, so 1 + KAPPA x 0.25 = 3 and KAPPA = 8.
 *
 * The arithmetic is correct and the observation is real: it is GATES[G5],
 * "High-stakes human review and audit capture >=97%", a controlled gate floor
 * rather than an invented anchor. The exposure is the finding. A one-parameter
 * model through one point fits that point exactly by construction, so nothing
 * in the calibration distinguishes 8 from 5 or 12 on any metric other than the
 * one it was fitted to, and there is no argument that ambulance response times
 * share a curvature with AI oversight capture.
 *
 * Its source, grade and sensitivity band are registered in
 * research/quality-equation-methodology.md, checked against this constant by
 * kappa-check.ts. KAPPA_SOURCE_GATE names the gate so a change to that floor
 * invalidates the calibration loudly instead of leaving it stale. */
/* One registry entry rather than seven loose constants. They only ever travel
   together - kappa-check.ts, selftests.ts and quality.astro each imported the
   whole block - and they are one claim: this value, from this observation, at
   this grade, with this band. The individual names are kept as aliases so the
   call sites read as prose. */
export interface KappaCalibration {
  value: number;
  /* The single observation the value is fitted to. */
  sourceGate: string;
  sourceFloorPct: number;
  maturePct: number;
  buildAtP5: number;
  confidence: string;
  /* The band published as the uncertainty range. Halving and doubling the
     fitted value, because one observation gives no basis for a narrower one. */
  band: number[];
}

export const KAPPA_CALIBRATION: KappaCalibration = {
  value: 8,
  sourceGate: 'G5',
  sourceFloorPct: 97,
  maturePct: 99,
  buildAtP5: 0.75,
  confidence: 'low',
  band: [4, 8, 16]
};

export const KAPPA_VALUE = KAPPA_CALIBRATION.value;
export const KAPPA_SOURCE_GATE = KAPPA_CALIBRATION.sourceGate;
export const KAPPA_SOURCE_FLOOR_PCT = KAPPA_CALIBRATION.sourceFloorPct;
export const KAPPA_MATURE_PCT = KAPPA_CALIBRATION.maturePct;
export const KAPPA_BUILD_AT_P5 = KAPPA_CALIBRATION.buildAtP5;
export const KAPPA_CONFIDENCE = KAPPA_CALIBRATION.confidence;
export const KAPPA_BAND = KAPPA_CALIBRATION.band;

/* The active value. Evaluation reads this rather than a baked-in 8, so the
   whole catalog can be recomputed at another setting without rebuilding the
   expression trees. Restored by withKappa's finally, so no caller can leave
   the model on a different constant. */
let activeKappa = KAPPA_VALUE;
export function currentKappa(): number { return activeKappa; }
export function withKappa<T>(k: number, run: () => T): T {
  const prev = activeKappa;
  activeKappa = k;
  try { return run(); } finally { activeKappa = prev; }
}

function KAPPA(): ExprNode {
  return {
    k: 'num', v: KAPPA_VALUE, kappa: true,
    label: 'immaturity stress multiplier, calibrated from the controlled P5 AI-oversight floor'
  };
}
/* F(t) = 1 + KAPPA * (1 - S) */
function stressF(S: ExprNode): ExprNode {
  return add(n(1, 'mature baseline'), mul(KAPPA(), sub(n(1, 'full build'), S)));
}
/* Owner, 2026-10-12: an equation's own controlled target, read from its
 * catalog record. Most equations typed it as M beside the record that
 * states it, R252's class across the catalog. OWN leaves a placeholder that
 * def() fills from the record, so a target reworded to another number moves
 * its equation, and one that stops stating a number fails at import. */
const OWN = 'own' as const;
function own(label: string, form: 'level' | 'shortfall' = 'level'): ExprNode {
  return { k: 'num', v: NaN, label: label, own: form };
}
/* ceiling form: max(0, 100 - (100 - M) * F(t)) */
function ceil2(M: number | typeof OWN, S: ExprNode): ExprNode {
  return mx(n(0, 'floor'),
    sub(n(100, 'full attainment'),
      mul(M === OWN ? own('mature shortfall allowance', 'shortfall') : n(100 - M, 'mature shortfall allowance'),
        stressF(S))));
}
/* Owner, 2026-10-19 (decision 1 on the ceiling-form proposal): the
 * baseline-start form, for metrics with a measured level today well below
 * where the ceiling form starts them. However little is built, the ceiling
 * form holds a metric within (100 - M) x kappa points of its target; these
 * five have a current-system level far under that start, so their path
 * begins there instead:
 *
 *   v = B + (M - B) * S(t)
 *
 * B is today's level at zero build and M the target at full build, so the
 * target is the plan's and stays beyond today's system (the owner's
 * principle: a low baseline sets where the path starts, never the target).
 * Each B is declared once here with the reading of its evidence and a
 * grade; quality-equation-methodology.md, "The baseline-start form", has the
 * sources. The ceiling form's kappa does not reach these five. */
/* review 1 of the owner decisions: the figures the source states, in the
   order its excerpt gives them (citation-excerpts.ts holds each to the
   source), and the rule that reads B from them; B was typed beside them.
   Review 2: one figure or two, by rule, as a tuple, so a rule cannot read a
   figure its source does not give. */
type TodayOne = { rule: 'as stated' | 'complement'; evidence: [number] };
type TodayTwo = { rule: 'midpoint' | 'midpoint of complements'; evidence: [number, number] };
type TodayGrade = 'high' | 'medium-high' | 'medium' | 'low-medium' | 'low';
export type TodayLevel = (TodayOne | TodayTwo) & { pct: number; reading: string; grade: TodayGrade };
/* B from its source's figures by the named rule, to the tenth */
function todayLevelFrom(t: TodayOne | TodayTwo): number {
  switch (t.rule) {
    case 'as stated': return t.evidence[0];
    case 'complement': return +(100 - t.evidence[0]).toFixed(1);
    case 'midpoint': return +((t.evidence[0] + t.evidence[1]) / 2).toFixed(1);
    case 'midpoint of complements': return +(100 - (t.evidence[0] + t.evidence[1]) / 2).toFixed(1);
  }
}
function one(rule: TodayOne['rule'], a: number, grade: TodayGrade, reading: (a: number) => string): TodayLevel {
  const e: TodayOne = { rule, evidence: [a] };
  return { ...e, pct: todayLevelFrom(e), grade, reading: reading(a) };
}
function two(rule: TodayTwo['rule'], a: number, b: number, grade: TodayGrade, reading: (a: number, b: number) => string): TodayLevel {
  const e: TodayTwo = { rule, evidence: [a, b] };
  return { ...e, pct: todayLevelFrom(e), grade, reading: reading(a, b) };
}
export const TODAY_LEVELS = namedRegistry<string, TodayLevel>('TODAY_LEVELS', {
  /* review 2: the 80% is CHIME's (the ONC contractor's figure is Pew's 50%
     between organizations); the study and patient counts, drawn and typed,
     are left to the methodology table, which states them with their sources */
  'TPP-1.1': one('as stated', 80, 'medium', (a) =>
    'within-facility patient matching "as low as ' + a + ' percent" (Pew, 2018, citing CHIME)'),
  'TPP-6.3': two('midpoint of complements', 6.8, 62, 'medium', (a, b) =>
    'the midpoint of the ' + +(100 - b).toFixed(1) + '% to ' + +(100 - a).toFixed(1) +
    '% follow-up closure of laboratory results across the studies reviewed (Callen et al., J Gen Intern Med, 2012)'),
  'KPP-E5': one('as stated', 17, 'medium', (a) =>
    'professional interpreter use with physicians at admission, ' + a + '% of hospitalized patients with limited English (Schenker et al., J Gen Intern Med, 2011)'),
  'TPP-10.1': one('complement', 48.74, 'medium-high', (a) =>
    'Medicare Advantage directory locations with no inaccuracy, 100 less ' + a + '% (CMS online provider directory review, round 3, 2018)'),
  'TPP-10.4': two('midpoint', 12, 34, 'medium', (a, b) =>
    'the midpoint of the ' + a + '% to ' + b + '% of first post-discharge visits with a discharge summary available (Kripalani et al., JAMA, 2007)')
});
function base2(id: string, S: ExprNode): ExprNode {
  const today = lookupOrThrow(TODAY_LEVELS, id);
  const B = (): ExprNode => ({ k: 'num', v: today.pct, label: "today's level: " + today.reading, from: 'today:' + id });
  return add(B(), mul(sub(own('controlled target (%)'), B()), S));
}
/* error form: M * F(t), M the equation's own target (review 3 of P24: every
   caller read its own target, so the numeric form went) */
function err3(label: string, S: ExprNode): ExprNode {
  return mul(own(label), stressF(S));
}
/* normalized attainment of another equation vs its base-case maturity */
function qn(id: string): ExprNode {
  return mn(n(1, 'attainment cap'), dv(q(id), b8(q(id))));
}
/* R252 [§S11b]: a controlled target read from the record that controls it.
 *
 * The row asks that "at least 15,000 certified units" be sourced or removed
 * from the maturity requirement. Measured: it is neither unsourced nor
 * removable. The framework document carries it twice - as SR-ACC-010, "the
 * system shall operate at least 15,000 certified Type A/B/C/D units by Phase
 * 8", and as TPP-6.1's own target - and the equation that restated it as a
 * literal IS TPP-6.1's equation. So the defect is the restatement, not the
 * number: a controlled quantity typed a second time in the module that
 * computes the record carrying it, which is R21's class one layer up.
 *
 * `ctrl` reads it off the catalog. A target reworded to a different number
 * moves the equation with it, and a target that stops carrying a number at
 * all fails the build at import rather than silently keeping the old one. */
/* Review 3 of P24: the one read of a record's numeric target, for ctrl()
   and for the OWN placeholder def() fills, which had each written it out. */
export function catalogTargetMeta(id: string): NumMeta {
  const record = catalogRecordById(NHA_QUALITY_DATA.parameters, id);
  const meta = parseNum(record.target);
  if (!meta) {
    throw new Error(id + ' carries no numeric target to read: "' + record.target + '"');
  }
  return meta;
}
/* review 3 of P24: a record's target as an equation's explanation states it */
function targetFigure(id: string): string {
  const meta = catalogTargetMeta(id);
  return meta.num.toFixed(meta.decimals);
}
function ctrl(id: string, label: string): ExprNode {
  return { k: 'num', v: catalogTargetMeta(id).num, label: label + ' (read from ' + id + ')', from: 'catalog:' + id };
}

function avg(...xs: ExprNode[]): ExprNode {
  let s = xs[0];
  for (let i = 1; i < xs.length; i++) s = add(s, xs[i]);
  return dv(s, n(xs.length, 'component count'));
}
/* queue-load form: M * L / L(base maturity), L = demand / (WSI * capacity) */
function qload(S: ExprNode): ExprNode {
  return dv(m('util'), mul(q('IDX-WSI'), S));
}
function queue(label: string, S: ExprNode): ExprNode {
  return mul(own(label), dv(qload(S), b8(qload(S))));
}
/* Owner, 2026-10-12: one figure, read where it is defined.
 *
 * Equation leaves typed three kinds of figure that are defined elsewhere:
 * a cost-model parameter's central value (labelled "planned", which for
 * several was not the plan's figure: drugPriceCut's central 40% sits below
 * the plan's own 55%), a ramp's mature share, and another catalog record's
 * controlled target. Each is read now, and the leaf records where from, so
 * tests/lib/one-figure.test.ts can hold every such leaf to its source. */
function central(paramId: string, label: string): ExprNode {
  return { k: 'num', v: lookupOrThrow(PARAM_REGISTRY, paramId).mode, label: label + ', the cost model\'s central value',
    from: 'param:' + paramId };
}
function matureShare(ramp: 'coverage' | 'units' | 'hospitals', label: string): ExprNode {
  const path = RAMPS[ramp];
  const v = path[path.length - 1];
  if (v === undefined) throw new Error('Ramp ' + ramp + ' has no mature share');
  return { k: 'num', v: v, label: label, from: 'ramp:' + ramp };
}
/* need-inflation divisor: max(1, actual / central) */
function NI(paramId: string, label: string): ExprNode {
  return mx(n(1, 'no excess need'), dv(p(paramId), central(paramId, label)));
}
/* normalized ramps */
function covN(): ExprNode { return dv(r('cov'), matureShare('coverage', 'mature public coverage share')); }
function unitN(): ExprNode { return dv(r('unit'), matureShare('units', 'mature unit-network population share')); }
function hospN(): ExprNode { return dv(r('hosp'), matureShare('hospitals', 'mature hospital budget-migration share')); }
/* the share protected from new covered-care debt at maturity: 100 less KPP-A4's ceiling */
function protectionShare(): ExprNode {
  return sub(n(100, 'whole population'), ctrl('KPP-A4', 'controlled new covered-care debt incidence ceiling (%)'));
}
/* the baseline vacancy level KPP-W2's demand carries: TPP-W1's ceiling, as a share */
function vacancyShare(): ExprNode {
  return dv(ctrl('TPP-W1', 'controlled role-vacancy ceiling (%)'), n(100, 'percent scale'));
}

/* ---- Phase -> ramp index -------------------------------------------------
 * The map itself lives in rollout.ts and is imported, not re-derived. What
 * belongs here is the CONVERSION, and this is the only place it happens.
 *
 * PHASE_YEAR holds 1-based year NUMBERS (P0 = Year 1). Every array the
 * evaluator indexes - the policy ramps in params.ts and the fiscal engine's
 * path.detail rows - is 0-based on the same calendar, so index 0 is Year 1
 * is 2027. The evaluator's `t` is therefore always an index, never a year.
 * ------------------------------------------------------------------------ */
export function phaseIndex(phase: string): number {
  return PHASE_YEAR[phase] - 1;
}
export const EQ_PHASES = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];

/* ---- Leaf metadata for rendering and diagrams --------------------------- */
export const RAMP_META: Record<RampId, { sym: string; label: string }> = {
  cov: { sym: 'cov(t)', label: 'Public coverage share of the population' },
  cs: { sym: 'cs(t)', label: 'Cost-sharing elimination progress' },
  unit: { sym: 'unit(t)', label: 'Unit network build-out (population share)' },
  drug: { sym: 'drug(t)', label: 'Pharmacy rail and drug program depth' },
  hosp: { sym: 'hosp(t)', label: 'Hospital global-budget migration share' },
  exp: { sym: 'exp(t)', label: 'Expanded benefits build (LTC, BH, DVH, EMS)' },
  inf: { sym: 'inf(t)', label: 'Registries, records, IT, and program infrastructure build' }
};
export const MODEL_META: Record<ModelId, { sym: string; label: string }> = {
  util: { sym: 'D(t)', label: 'Demand index: utilization vs baseline from the cost model' },
  trainProg: { sym: 'train(t)', label: 'Cumulative training-pipeline progress (infrastructure-weighted)' },
  year: { sym: 'year(t)', label: 'Rollout year of the phase anchor' },
  costRatio: { sym: 'cost ratio(t)', label: 'System cost relative to the same-year baseline from the fiscal engine' },
  adminShare: { sym: 'admin%(t)', label: 'Administration share of system cost from the fiscal engine' },
  pubCost: { sym: 'pubCost(t)', label: 'Public program cost from the fiscal engine ($B)' },
  newRev: { sym: 'newRev(t)', label: 'New dedicated revenue requirement from the fiscal engine ($B)' },
  wealthRev: { sym: 'wealthRev(t)', label: 'Wealth-financing revenue delivered ($B)' },
  houseRelief: { sym: 'relief(t)', label: 'Household premium and out-of-pocket relief ($B)' },
  wageGain: { sym: 'wages(t)', label: 'Wage gains from employer premium pass-through ($B)' },
  wageGainNet: { sym: 'wages_net(t)', label: 'Wage gains kept by households, net of the tax feedback ($B)' }
};
/* R249: the two leaf registries, each with its own name for lookupOrThrow. */
export const RAMP_REGISTRY = namedRegistry('RAMP_META', RAMP_META);
export const MODEL_REGISTRY = namedRegistry('MODEL_META', MODEL_META);

/* ---- The equation catalog ----------------------------------------------- */
const DEFS: EquationDef[] = [];
/* Review 3 of P24: the one place that knows which nodes have children.
   resolveOwn, collectDeps and numLeaves walk through it, so a new node kind
   is one edit here rather than one in each walker. */
export function childrenOf(e: ExprNode): ExprNode[] {
  if ('a' in e) return [e.a, e.b];
  if ('of' in e) return [e.of];
  if ('args' in e) return e.args;
  return [];
}
type NumNode = Extract<ExprNode, { k: 'num' }>;
export function numLeaves(e: ExprNode, out: NumNode[] = []): NumNode[] {
  if (e.k === 'num') out.push(e);
  childrenOf(e).forEach(function (c) { numLeaves(c, out); });
  return out;
}
function resolveOwn(id: string, e: ExprNode): void {
  numLeaves(e).forEach(function (leaf) {
    if (!leaf.own) return;
    const meta = catalogTargetMeta(id);
    leaf.v = leaf.own === 'shortfall' ? 100 - meta.num : meta.num;
    leaf.label = leaf.label + ' (read from ' + id + ')';
    leaf.from = 'catalog:' + id;
  });
}
function def(d: EquationDef): void { resolveOwn(d.id, d.expr); DEFS.push(d); }

/* ======== Internal indices (equation parameters, mid-diagram) ============ */
def({
  id: 'IDX-CLAIMS', kind: 'index', name: 'Claims rail maturity', group: 'coverage',
  cmp: '>=', unit: 'index', decimals: 2,
  expr: pw(mul(covN(), r('inf')), n(0.5, 'joint dependence')),
  why: 'Clean claims need both an enrolled population and the records infrastructure, so the index is the geometric mean of the two builds.'
});
def({
  id: 'IDX-SPEC', kind: 'index', name: 'Specialist backplane maturity', group: 'access',
  cmp: '>=', unit: 'index', decimals: 2,
  expr: avg(unitN(), r('inf')),
  why: 'The specialist queue and e-consult backplane rides on the unit network for referrals and on the records build for routing.'
});
def({
  id: 'IDX-WSI', kind: 'index', name: 'Workforce sufficiency index', group: 'workforce',
  cmp: '>=', unit: 'index', decimals: 2,
  expr: dv(q('KPP-W2'), n(100, 'percent scale')),
  why: 'Every queue and staffing-dependent metric scales with the workforce sufficiency ratio.'
});

/* ======== Coverage and financial protection (KPP-A, TPP-1/2, EMP1) ====== */
def({
  id: 'TPP-1.1', kind: 'TPP', name: 'Master person index match accuracy', group: 'coverage',
  cmp: '>=', unit: '%', decimals: 1,
  expr: base2('TPP-1.1', r('inf')),
  why: 'Identity matching starts from the level records reach today and rises to the target as the registry infrastructure is built.'
});
def({
  id: 'TPP-1.2', kind: 'TPP', name: 'Eligibility determination latency', group: 'coverage',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('inf')),
  why: 'Real-time eligibility rides directly on the registry and records build.'
});
def({
  id: 'TPP-1.3', kind: 'TPP', name: 'Erroneous coverage termination rate', group: 'coverage',
  cmp: '<=', unit: 'per 100,000', decimals: 0,
  expr: err3('controlled erroneous-termination ceiling (per 100,000)', avg(r('inf'), qn('TPP-1.1'))),
  why: 'Wrongful terminations fall as the registries mature and identity matching improves.'
});
def({
  id: 'TPP-1.4', kind: 'TPP', name: 'Provisional coverage activation rate', group: 'coverage',
  cmp: '>=', unit: '%', decimals: 1,
  expr: ceil2(OWN, avg(r('inf'), qn('TPP-1.2'))),
  why: 'Provisional activation depends on the registry build and on eligibility responses arriving in real time.'
});
def({
  id: 'TPP-2.1', kind: 'TPP', name: 'Clean claim auto-adjudication rate', group: 'coverage',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, q('IDX-CLAIMS')),
  why: 'Auto-adjudication tracks the claims-rail maturity index.'
});
def({
  id: 'TPP-2.2', kind: 'TPP', name: 'Clean claim payment timeliness', group: 'coverage',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, q('IDX-CLAIMS')),
  why: 'Payment timeliness tracks the claims-rail maturity index.'
});
def({
  id: 'TPP-2.3', kind: 'TPP', name: 'Improper payment rate', group: 'coverage',
  cmp: '<=', unit: '%', decimals: 0,
  expr: err3('controlled improper-payment ceiling (%)', avg(q('IDX-CLAIMS'), qn('TPP-1.1'))),
  why: 'Improper payments decay with claims-rail maturity and identity accuracy.'
});
def({
  id: 'TPP-2.4', kind: 'TPP', name: 'Provider cash-flow disruption rate', group: 'coverage',
  cmp: '<=', unit: '%', decimals: 1,
  expr: err3('controlled disruption ceiling (%)', avg(q('IDX-CLAIMS'), qn('TPP-2.2'))),
  why: 'Cash-flow disruptions decay as the rail matures and payments run on time.'
});
def({
  id: 'TPP-2.5', kind: 'TPP', name: 'OMB/apportionment bypass success', group: 'coverage',
  cmp: '>=', unit: '%', decimals: 1,
  expr: ceil2(OWN, r('inf')),
  why: 'The mandatory-disbursement rail is legal and systems work that stands up with the program infrastructure.'
});
def({
  id: 'TPP-EMP1', kind: 'TPP', name: 'Employer wage-pass-through compliance', group: 'coverage',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, dv(avg(covN(), r('inf')),
    mx(n(1, 'no excess evasion'), dv(central('employerCapture', 'employer contribution capture (%)'), p('employerCapture'))))),
  why: 'Pass-through compliance builds with enforcement infrastructure and coverage conversion, and degrades when employer capture underruns its plan.'
});
def({
  id: 'KPP-A1', kind: 'KPP', name: 'National continuous coverage rate', group: 'coverage',
  cmp: '>=', unit: '%', decimals: 1,
  expr: sub(n(100, 'whole population'),
    /* R6 [S11a]: this label read "26.7M of 334M, KFF/Census 2024", which
       asserts that 26.7M is 8.0% of the population. It is not. 8.0% is the
       Census CPS ASEC all-ages uninsured rate; 26.7M is KFF's count of the
       uninsured under 65, whose rate is 9.8%. The division works only
       because 26.7/334.0 happens to land on 8.0. The value is unchanged --
       8.0% all-ages is the right input for a national coverage rate -- and
       only the claim about where it comes from is corrected. */
    mul(n(CENSUS_UNINSURED_2024.pct, 'baseline uninsured share of the population, all ages (Census CPS ASEC, ' + CENSUS_UNINSURED_2024.year + ')'),
      sub(n(1, 'full closure'),
        mul(covN(), mul(dv(q('TPP-1.4'), n(100, 'percent scale')), dv(q('TPP-1.1'), n(100, 'percent scale'))))))),
  why: 'The baseline uninsured share closes as public coverage rolls out, discounted by identity-match accuracy and provisional-activation success.'
});
def({
  id: 'KPP-A2', kind: 'KPP', name: 'Residual uninsured rate', group: 'coverage',
  cmp: '<=', unit: '%', decimals: 1,
  expr: sub(n(100, 'whole population'), q('KPP-A1')),
  why: 'The residual uninsured rate is the complement of continuous coverage.'
});
def({
  id: 'KPP-A3', kind: 'KPP', name: 'Covered-care patient-billing rate', group: 'coverage',
  cmp: '<=', unit: '%', decimals: 1,
  expr: mul(own('controlled mature billing-error ceiling (%)'),
    dv(sub(n(100, 'full attainment'), q('TPP-2.1')), sub(n(100, 'full attainment'), ctrl('TPP-2.1', 'controlled clean-claim rate (%)')))),
  why: 'Patients get billed for covered care when claims fail to auto-adjudicate cleanly, so the billing rate scales with the clean-claim shortfall.'
});
def({
  id: 'KPP-A4', kind: 'KPP', name: 'New covered-care medical debt incidence', group: 'coverage',
  cmp: '<=', unit: '% of baseline', decimals: 0,
  expr: mul(n(100, 'baseline debt formation'), sub(n(1, 'baseline'), mul(r('cov'), r('cs')))),
  why: 'New covered-care debt persists wherever coverage or cost-sharing elimination has not yet arrived; both ramps must close for debt formation to stop.'
});
def({
  id: 'KPP-A5', kind: 'KPP', name: 'Household direct health burden', group: 'coverage',
  cmp: '>=', unit: '% reduction', decimals: 0,
  expr: mul(n(100, 'percent scale'),
    mul(mul(r('cov'), r('cs')), sub(n(1, 'whole burden'), dv(p('residualPrivateShare'), n(100, 'percent scale'))))),
  why: 'Household burden falls with coverage and cost-sharing elimination, less the residual private share that never converts.'
});
def({
  id: 'KPP-A6', kind: 'KPP', name: 'Worker premium elimination rate', group: 'coverage',
  cmp: '>=', unit: '%', decimals: 0,
  expr: mul(n(100, 'percent scale'), r('cov')),
  why: 'Worker premiums end exactly as workers move onto public default coverage.'
});
def({
  id: 'KPP-A7', kind: 'KPP', name: 'Medical bankruptcy reduction', group: 'coverage',
  cmp: '>=', unit: '% reduction', decimals: 0,
  expr: mul(dv(ctrl('KPP-A7', 'controlled bankruptcy reduction (%)'), protectionShare()),
    sub(n(100, 'baseline'), q('KPP-A4'))),
  why: 'Bankruptcy reduction follows debt-formation elimination, discounted for the bankruptcies that stem from illness-related work loss rather than bills.'
});
def({
  id: 'KPP-T1', kind: 'KPP', name: 'Active treatment transfer success', group: 'coverage',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, avg(qn('TPP-10.4'), qn('TPP-1.1'))),
  why: 'Treatment transfers succeed when discharge records are structured and identity matching is accurate.'
});
def({
  id: 'TPP-LEG1', kind: 'TPP', name: 'Denial/routing explanation completeness', group: 'coverage',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, avg(q('IDX-CLAIMS'), r('inf'))),
  why: 'Machine-readable denial explanations require the claims rail and the records build.'
});

/* ======== Access and the unit network (KPP-B, TPP-6/7, KPP-E3) ========== */
def({
  id: 'KPP-B1', kind: 'KPP', name: 'Primary front-door access time', group: 'access',
  cmp: '<=', unit: 'hours', decimals: 0,
  expr: queue('controlled mature front-door standard (hours)', unitN()),
  why: 'Front-door waits scale with demand load over workforce-adjusted unit capacity; the load ratio is normalized to the base-case mature system.'
});
def({
  id: 'KPP-B2', kind: 'KPP', name: 'Same-day low-acuity access rate', group: 'access',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, mul(unitN(), q('IDX-WSI'))),
  why: 'Same-day capacity requires both the unit build and sufficient staffing.'
});
def({
  id: 'KPP-B3', kind: 'KPP', name: 'Avoidable ED diversion rate', group: 'access',
  cmp: '>=', unit: '% reduction', decimals: 0,
  expr: mul(own('controlled mature diversion target (% of low-acuity ED use)'), mul(unitN(), qn('KPP-B8'))),
  why: 'ED diversion is the unit network absorbing low-acuity demand, which requires units to exist and to resolve what they absorb.'
});
def({
  id: 'KPP-B4', kind: 'KPP', name: 'Specialist e-consult resolution rate', group: 'access',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, q('IDX-SPEC')),
  why: 'E-consult resolution tracks the specialist backplane maturity.'
});
def({
  id: 'KPP-B5', kind: 'KPP', name: 'Routine specialist wait time', group: 'access',
  cmp: '<=', unit: 'days', decimals: 0,
  expr: queue('controlled mature routine-wait standard (days)', q('IDX-SPEC')),
  why: 'Routine waits scale with demand load over workforce-adjusted backplane capacity.'
});
def({
  id: 'KPP-B6', kind: 'KPP', name: 'Urgent specialist timeliness', group: 'access',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, mul(q('IDX-SPEC'), q('IDX-WSI'))),
  why: 'Urgent timeliness needs reserved backplane capacity and the staff to serve it.'
});
def({
  id: 'KPP-B7', kind: 'KPP', name: 'Diagnostic-treatment unit coverage', group: 'access',
  cmp: '>=', unit: '% of population', decimals: 0,
  expr: mul(n(100, 'percent scale'), r('unit')),
  why: 'Unit coverage is the unit-network build ramp read directly as a population share.'
});
def({
  id: 'KPP-B8', kind: 'KPP', name: 'Unit-resolved encounter rate', group: 'access',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, avg(unitN(), r('drug'),
    mn(n(1, 'attainment cap'), dv(q('TPP-6.6'), ctrl('TPP-6.6', 'controlled AI-productivity target (%)'))))),
  why: 'Units resolve encounters without escalation when the network, the on-site pharmacy rail, and safe AI-assisted throughput are all in place.'
});
def({
  id: 'KPP-B9', kind: 'KPP', name: 'Unsafe under-referral rate', group: 'access',
  cmp: '<=', unit: 'per 10,000', decimals: 0,
  expr: err3('controlled under-referral ceiling (per 10,000)', avg(unitN(), qn('TPP-11.4'), qn('TPP-6.3'))),
  why: 'Unsafe under-referrals decay as units mature, AI protocols are validated, and abnormal-result follow-up closes.'
});
def({
  id: 'KPP-E3', kind: 'KPP', name: 'Specialist wait equity ratio', group: 'access',
  cmp: '<=', unit: 'ratio', decimals: 2,
  expr: add(n(1, 'parity'), mul(sub(ctrl('KPP-E3', 'controlled wait-equity ratio'), n(1, 'parity')),
    dv(qload(q('IDX-SPEC')), b8(qload(q('IDX-SPEC')))))),
  why: 'Wait-time dispersion between population groups widens with overall queue load; at mature load the ratio settles at the controlled ' +
    targetFigure('KPP-E3') + '.'
});
def({
  id: 'TPP-6.1', kind: 'TPP', name: 'Certified unit count', group: 'access',
  cmp: '>=', unit: 'units', decimals: 0,
  expr: mul(ctrl('TPP-6.1', 'controlled certified-unit count at maturity'), unitN()),
  why: 'Certified units scale directly with the unit-network build ramp.'
});
def({
  id: 'TPP-6.2', kind: 'TPP', name: 'Unit diagnostic completeness', group: 'access',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, unitN()),
  why: 'Diagnostic completeness tracks unit-network maturity.'
});
def({
  id: 'TPP-6.3', kind: 'TPP', name: 'Unit follow-up closure', group: 'access',
  cmp: '>=', unit: '%', decimals: 0,
  expr: base2('TPP-6.3', avg(unitN(), r('inf'))),
  why: 'Closing abnormal results starts from the share closed today and needs mature units and the records infrastructure that carries results.'
});
def({
  id: 'TPP-6.4', kind: 'TPP', name: 'Antibiotic stewardship compliance', group: 'access',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, unitN()),
  why: 'Stewardship compliance tracks unit protocol maturity.'
});
def({
  id: 'TPP-6.5', kind: 'TPP', name: 'Unit bounce-back rate', group: 'access',
  cmp: '<=', unit: '%', decimals: 1,
  expr: err3('controlled bounce-back ceiling (%)', avg(unitN(), qn('TPP-6.2'), qn('TPP-6.3'))),
  why: 'Bounce-backs decay as units mature, diagnostics complete, and follow-up closes.'
});
def({
  id: 'TPP-6.6', kind: 'TPP', name: 'AI-assisted clinician productivity', group: 'access',
  cmp: '>=', unit: '%', decimals: 0,
  expr: mul(own('controlled AI-productivity target (%)'),
    mul(mn(n(1.2, 'upside cap'), dv(p('careModelSavings'), central('careModelSavings', 'mature care-model savings ($B/yr)'))),
      mul(pw(mul(unitN(), r('inf')), n(0.5, 'joint readiness')), qn('TPP-11.4')))),
  why: 'AI-assisted throughput needs the units, the data infrastructure, validated protocols, and delivered care-model savings as the evidence the tooling works.'
});
def({
  id: 'TPP-7.1', kind: 'TPP', name: 'Referral packet completeness', group: 'access',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, avg(r('inf'), qn('TPP-10.3'))),
  why: 'Complete referral packets require the records build and interoperable lab results.'
});
def({
  id: 'TPP-7.2', kind: 'TPP', name: 'E-consult response time', group: 'access',
  cmp: '<=', unit: 'hours', decimals: 0,
  expr: queue('controlled mature e-consult standard (hours)', q('IDX-SPEC')),
  why: 'E-consult response scales with demand load over the workforce-adjusted specialist backplane.'
});
def({
  id: 'TPP-7.3', kind: 'TPP', name: 'Inappropriate specialist referral rate', group: 'access',
  cmp: '<=', unit: '%', decimals: 0,
  expr: err3('controlled inappropriate-referral ceiling (%)', avg(q('IDX-SPEC'), qn('TPP-7.1'))),
  why: 'Inappropriate referrals decay as the backplane matures and referral packets complete.'
});
def({
  id: 'TPP-7.4', kind: 'TPP', name: 'Specialist urgent/e-consult capacity reservation', group: 'access',
  cmp: '>=', unit: '% of capacity', decimals: 0,
  expr: mul(own('controlled reservation target (% of public specialist capacity)'), q('IDX-SPEC')),
  why: 'Reserved capacity scales with the backplane build.'
});
def({
  id: 'TPP-7.5', kind: 'TPP', name: 'Regional queue participation', group: 'access',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, q('IDX-SPEC')),
  why: 'Queue participation tracks backplane maturity.'
});

/* ======== Medicines and public manufacturing (TPP-3/4, KPP-T2) ========== */
def({
  id: 'TPP-3.1', kind: 'TPP', name: 'Pharmacy claims real-time adjudication', group: 'meds',
  cmp: '>=', unit: '%', decimals: 1,
  expr: ceil2(OWN, avg(r('drug'), r('inf'))),
  why: 'Real-time pharmacy adjudication needs the pharmacy rail and the records build.'
});
def({
  id: 'TPP-3.2', kind: 'TPP', name: 'Essential drug $0-access rate', group: 'meds',
  cmp: '>=', unit: '%', decimals: 0,
  expr: mul(own('controlled mature $0-fill target (%)'), r('drug')),
  why: '$0 essential fills reach patients exactly as the pharmacy rail deepens.'
});
def({
  id: 'TPP-3.3', kind: 'TPP', name: 'Net unit drug price reduction', group: 'meds',
  cmp: '>=', unit: '%', decimals: 0,
  expr: mn(n(70, 'reduction cap'),
    mul(n(100 * (1 - 1 / US_PEER_DRUG_PRICE_RATIO), 'price-parity reduction implied by the U.S.-to-peer price ratio (RAND, 2022 prices): 1 - 1/ratio'),
      mul(r('drug'), dv(p('drugPriceCut'), central('drugPriceCut', 'economy-wide negotiated cut (%)'))))),
  why: 'Target-drug price reduction moves toward international parity as negotiation deepens, scaled by how the negotiated cut actually lands.'
});
def({
  id: 'TPP-3.4', kind: 'TPP', name: 'PBM displacement rate', group: 'meds',
  cmp: '>=', unit: '%', decimals: 0,
  expr: mul(own('controlled displacement target (%)'), r('drug')),
  why: 'Benefit dollars leave the PBM model as the public pharmacy rail takes over.'
});
def({
  id: 'TPP-3.5', kind: 'TPP', name: 'Critical drug shortage exposure', group: 'meds',
  cmp: '<=', unit: '%', decimals: 0,
  expr: err3('controlled shortage-exposure ceiling (% of critical list)',
    avg(r('drug'), qn('TPP-4.2'), mn(n(1, 'attainment cap'), dv(p('drugPriceCut'), central('drugPriceCut', 'negotiated cut (%)'))))),
  why: 'Shortage exposure decays with the purchasing rail, dual-source coverage, and negotiation strength; a stressed negotiation program raises exposure.'
});
def({
  id: 'TPP-3.6', kind: 'TPP', name: 'Therapeutic substitution success', group: 'meds',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, avg(r('drug'), r('inf'))),
  why: 'Substitution programs need the formulary rail and the records infrastructure.'
});
def({
  id: 'TPP-4.1', kind: 'TPP', name: 'PMC product coverage', group: 'meds',
  cmp: '>=', unit: 'families', decimals: 0,
  expr: mul(own('controlled product families'), r('drug')),
  why: 'Public manufacturing brings product families online with the drug-program ramp.'
});
def({
  id: 'TPP-4.2', kind: 'TPP', name: 'Critical product dual-source rate', group: 'meds',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('drug')),
  why: 'Dual-sourcing is procurement work that deepens with the drug program.'
});
def({
  id: 'TPP-4.3', kind: 'TPP', name: 'Batch quality release success', group: 'meds',
  cmp: '>=', unit: '%', decimals: 1,
  expr: ceil2(OWN, r('drug')),
  why: 'Batch release quality matures with manufacturing operations.'
});
def({
  id: 'TPP-4.4', kind: 'TPP', name: 'API domestic/friendly-source coverage', group: 'meds',
  cmp: '>=', unit: '%', decimals: 0,
  expr: mul(own('controlled API-coverage target (%)'), pw(r('drug'), n(1.5, 'onshoring lag exponent (supply chains move slower than purchasing)'))),
  why: 'API onshoring lags the purchasing ramp because physical supply chains move slower than contracts.'
});
def({
  id: 'TPP-4.5', kind: 'TPP', name: 'Inventory visibility rate', group: 'meds',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, avg(r('drug'), r('inf'))),
  why: 'SKU-level visibility needs the drug program and the data infrastructure.'
});
def({
  id: 'KPP-T2', kind: 'KPP', name: 'Critical medication interruption rate', group: 'meds',
  cmp: '<=', unit: '%', decimals: 1,
  expr: err3('controlled interruption ceiling (%)', avg(r('drug'), qn('TPP-3.1'))),
  why: 'Medication interruptions during migration decay as the pharmacy rail deepens and adjudication runs in real time.'
});

/* ======== System cost and financing (KPP-C) =============================
 * Owner, 2026-10-12: the three baselines below were typed (17.6, 14950,
 * 7.4) beside the BASE2023 figures they were rounded from. Each is computed
 * from those figures now, so a recalibration of the base year moves the
 * targets with the engine instead of leaving them on the old numbers. */
def({
  id: 'KPP-C1', kind: 'KPP', name: 'Total national health expenditure ratio', group: 'cost',
  cmp: '<=', unit: '% of GDP', decimals: 1,
  expr: mul(n(nheGdpSharePct(), 'baseline health share of GDP (CMS NHE 2023 over BEA GDP 2023)'), m('costRatio')),
  why: 'The fiscal engine\'s cost ratio applied to the 2023 GDP share, holding the scale-year constant so the number is never compared across different economies.'
});
def({
  id: 'KPP-C2', kind: 'KPP', name: 'Per-capita system cost', group: 'cost',
  cmp: '<=', unit: '$/person', decimals: 0,
  template: '<=${X} per person per year (2024 dollars, 2023 scale)',
  expr: mul(m('costRatio'), n(nhePerPerson() * DEFLATOR_2023_TO_2024,
    'baseline per-person health cost at 2023 scale in 2024 dollars (CMS NHE 2023 over the 2023 population)')),
  why: 'The fiscal engine\'s cost ratio applied to today\'s per-person cost, holding the scale-year constant.'
});
def({
  id: 'KPP-C3', kind: 'KPP', name: 'Administrative cost ratio', group: 'cost',
  cmp: '>=', unit: '% reduction', decimals: 0,
  expr: mx(n(0, 'floor'), mul(n(100, 'percent scale'),
    sub(n(1, 'baseline'), dv(m('adminShare'), n(100 * baselineAdminSpend() / BASE2023.nheTotal,
      'baseline insurance and program administration share of NHE (CMS 2023)'))))),
  why: 'Administrative reduction compares the engine-computed administration share against the 2023 baseline share.'
});
def({
  id: 'KPP-C4', kind: 'KPP', name: 'Claims clean-processing cost', group: 'cost',
  cmp: '<=', unit: '$/claim', decimals: 0,
  expr: err3('controlled mature cost per clean claim ($)', q('IDX-CLAIMS')),
  why: 'Per-claim cost decays toward the mature ceiling as the claims rail matures and volume scales.'
});
def({
  id: 'KPP-C5', kind: 'KPP', name: 'Dedicated revenue sufficiency', group: 'cost',
  cmp: '>=', unit: '%', decimals: 0,
  expr: mul(n(100, 'percent scale'), sub(n(1, 'full sufficiency'),
    dv(mx(n(0, 'no shortfall'), sub(bp(m('wealthRev')), m('wealthRev'))), m('pubCost')))),
  why: 'Sufficiency falls below 100% when the volatile wealth-financing pillar delivers less than its planned path; the shortfall is measured against program cost.'
});
def({
  id: 'KPP-C6', kind: 'KPP', name: 'Stabilization reserve adequacy', group: 'cost',
  cmp: '>=', unit: 'months', decimals: 0,
  expr: mul(mul(own('mature reserve standard (months)'),
    mn(n(1, 'schedule cap'), mx(n(0, 'accrual start'), dv(sub(m('year'), n(4, 'reserve accrual begins with wave-one revenue (year 4)')), n(8, 'accrual span to maturity (years)'))))),
    mn(n(1, 'delivery cap'), dv(m('wealthRev'), bp(m('wealthRev'))))),
  why: 'Reserves accrue on the statutory schedule from wave-one revenue to the ' + targetFigure('KPP-C6') +
    '-month standard, slowed in proportion to any volatile-revenue underdelivery.'
});
def({
  id: 'KPP-C7', kind: 'KPP', name: 'Wealth-financing collection efficiency', group: 'cost',
  cmp: '>=', unit: '%', decimals: 0,
  expr: sub(n(100, 'full collection'),
    mul(sub(n(100, 'full collection'), p('wealthCollectionEff')), stressF(r('inf')))),
  why: 'Collection efficiency approaches the researched mature rate as enforcement infrastructure is built; the researched rate itself sits below the controlled ' +
    targetFigure('KPP-C7') + '% ambition.'
});
def({
  id: 'KPP-C8', kind: 'KPP', name: 'Ordinary taxpayer protection ratio', group: 'cost',
  cmp: '<=', unit: '%', decimals: 1,
  expr: mul(n(100, 'percent scale'),
    dv(mx(n(0, 'no net burden'), sub(sub(sub(m('newRev'), m('wealthRev')), m('houseRelief')), m('wageGainNet'))),
      mx(m('pubCost'), n(1, 'positive-cost guard ($B)')))),
  why: 'The ordinary-taxpayer share of program cost is the new revenue not covered by wealth financing and not returned as premium relief, out-of-pocket relief, or pass-through wage gains. The wage term is net of the tax feedback on those wages, because the financing requirement is already reduced by that feedback; subtracting the gross would relieve households by more than the wages they keep.'
});

/* ======== Clinical outcomes and equity (KPP-D, KPP-E, TRUST) ============ */
def({
  id: 'KPP-D1', kind: 'KPP', name: 'Avoidable hospitalization rate', group: 'outcomes',
  cmp: '>=', unit: '% reduction', decimals: 0,
  template: '>={X}% reduction in avoidable admissions',
  expr: mul(p('lowValueCapture'), avg(unitN(), r('inf'))),
  why: 'Avoidable admissions fall as the captured low-value-care share is delivered through the unit network and its data infrastructure.'
});
def({
  id: 'KPP-D2', kind: 'KPP', name: '30-day readmission rate', group: 'outcomes',
  cmp: '>=', unit: '% reduction', decimals: 0,
  template: '>={X}% reduction in 30-day readmissions',
  expr: mul(q('KPP-D1'), mul(qn('TPP-6.3'), qn('TPP-10.4'))),
  why: 'Readmission reduction follows avoidable-admission reduction, discounted by follow-up closure and discharge-record completeness.'
});
def({
  id: 'KPP-D3', kind: 'KPP', name: 'Preventive service completion', group: 'outcomes',
  cmp: '>=', unit: '%', decimals: 0,
  template: '>={X}% of cost-driven preventive deferral recovered',
  expr: mul(n(100, 'full recovery'), mul(mul(covN(), r('cs')), qn('KPP-A1'))),
  why: 'Cost-driven deferral of preventive care (38% of adults deferred care over cost, Gallup 2024) unwinds as coverage arrives and the price at the point of care reaches $0.'
});
def({
  id: 'KPP-D4', kind: 'KPP', name: 'Chronic disease control composite', group: 'outcomes',
  cmp: '>=', unit: '%', decimals: 0,
  template: '>={X}% of the chronic-care control gap closed',
  expr: mul(avg(q('KPP-D3'), q('KPP-D5')), unitN()),
  why: 'Chronic control combines recovered prevention and adherence, delivered through the unit network that manages chronic disease.'
});
def({
  id: 'KPP-D5', kind: 'KPP', name: 'Medication adherence for priority chronic drugs', group: 'outcomes',
  cmp: '>=', unit: '%', decimals: 0,
  template: '>={X}% of cost-related nonadherence eliminated',
  expr: mul(n(100, 'full elimination'),
    mul(r('drug'), mul(qn('TPP-3.2'), sub(n(1, 'full availability'), dv(q('TPP-3.5'), n(100, 'percent scale')))))),
  why: 'Cost-related nonadherence ends as $0 essential fills arrive, less whatever the shortage exposure keeps off the shelf.'
});
def({
  id: 'KPP-D6', kind: 'KPP', name: 'Serious safety event reporting completeness', group: 'outcomes',
  cmp: '>=', unit: '%', decimals: 0,
  template: '>={X}% of serious safety events reported within statutory windows',
  expr: ceil2(95, r('inf')),
  why: 'Reporting completeness rides the records build; the 95% mature standard matches the records-completeness family of floors.'
});
def({
  id: 'KPP-D7', kind: 'KPP', name: 'Patient-reported care experience', group: 'outcomes',
  cmp: '>=', unit: '%', decimals: 0,
  template: '>={X}% of the mature care-experience benchmark',
  expr: mul(n(100, 'benchmark scale'),
    pw(mul(mul(qn('KPP-A1'), mn(n(1, 'attainment cap'), dv(ctrl('KPP-B1', 'controlled front-door standard (hours)'), q('KPP-B1')))),
      mn(n(1, 'attainment cap'), dv(sub(n(100, 'baseline'), q('KPP-A4')), protectionShare()))),
      n(0.3333, 'geometric mean of three drivers'))),
  why: 'Care experience is a geometric composite of coverage security, access speed, and freedom from billing; all three must move for experience to move.'
});
def({
  id: 'KPP-E1', kind: 'KPP', name: 'Coverage equity gap', group: 'outcomes',
  cmp: '<=', unit: 'pp', decimals: 1,
  expr: q('KPP-A2'),
  why: 'The maximum between-group coverage gap is bounded by the residual uninsured rate, which concentrates in the least-covered groups.'
});
def({
  id: 'KPP-E2', kind: 'KPP', name: 'Access equity gap', group: 'outcomes',
  cmp: '<=', unit: '%', decimals: 0,
  expr: err3('controlled access-gap ceiling (%)', avg(unitN(), qn('KPP-E4'))),
  why: 'Between-group access gaps decay as the unit network reaches everywhere and rural access closes.'
});
def({
  id: 'KPP-E4', kind: 'KPP', name: 'Rural essential access index', group: 'outcomes',
  cmp: '>=', unit: 'pp', decimals: 0,
  expr: mul(own('controlled rural access-gain target (points)'),
    dv(unitN(), NI('emsPhExpansion', 'EMS and public-health expansion ($B/yr)'))),
  why: 'Rural access gains ride the unit build and shrink when rural EMS and readiness needs run above plan.'
});
def({
  id: 'KPP-E5', kind: 'KPP', name: 'Language-access compliance', group: 'outcomes',
  cmp: '>=', unit: '%', decimals: 0,
  expr: base2('KPP-E5', avg(r('inf'), qn('TPP-USE1'))),
  why: 'Language access starts from the share of patients who get a professional interpreter today and requires the records and notice infrastructure plus comprehensible patient materials.'
});
/* Owner, 2026-10-12: the metric for the plan's disability accommodation
   requirement, defined and graded in quality-equation-methodology.md,
   "Disability accommodation compliance". The minimum mirrors the record's
   calculation, the lowest of its three rates. The share form, not ceil2:
   however little is built, ceil2 keeps a metric within (100 - M) x kappa
   points of its target (at zero build it reads 100 - (100 - M)(1 + kappa),
   82% for this 98% target), and the evidence puts accessible equipment
   under 20% of audited offices, so this one rises from the build itself. */
def({
  id: 'KPP-E6', kind: 'KPP', name: 'Disability accommodation compliance', group: 'outcomes',
  cmp: '>=', unit: '%', decimals: 0,
  expr: mul(own('controlled accommodation compliance target (%)'), mn(avg(unitN(), hospN()), r('inf'), qn('KPP-E5'))),
  why: 'Compliance is the lowest of three rates, so it moves with the slowest of three builds: accessible equipment, as new units open built to the federal standard and hospital budgets fund replacement; request fulfilment, once the shared record carries accommodation needs and requests; and the interpreter and accessible-format services that language access builds.'
});
def({
  id: 'KPP-TRUST1', kind: 'KPP', name: 'Public trust in fairness', group: 'outcomes',
  cmp: '>=', unit: 'pp', decimals: 0,
  expr: mul(own('controlled trust-gain target (points)'),
    add(add(mul(n(0.4, 'coverage-security weight (planning)'), qn('KPP-A1')),
      mul(n(0.3, 'access weight (planning)'), mn(n(1, 'attainment cap'), dv(ctrl('KPP-B1', 'controlled front-door standard (hours)'), q('KPP-B1'))))),
      mul(n(0.3, 'billing-protection weight (planning)'),
        mn(n(1, 'attainment cap'), dv(sub(n(100, 'baseline'), q('KPP-A4')), protectionShare()))))),
  why: 'Trust follows delivered results: secure coverage, fast access, and the end of surprise bills, weighted by their public salience.'
});

/* ======== Workforce and transition (KPP-W, TPP-8, IMM, CULT) ============ */
def({
  id: 'TPP-W2', kind: 'TPP', name: 'Training-slot to completed-hire conversion', group: 'workforce',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('inf')),
  why: 'Conversion from slot to hire matures with the training and placement infrastructure.'
});
def({
  id: 'KPP-W4', kind: 'KPP', name: 'Merit immigration shortage-role fill rate', group: 'workforce',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('inf')),
  why: 'Shortage-role fills through the merit channel scale with the processing and licensing infrastructure.'
});
def({
  id: 'KPP-W2', kind: 'KPP', name: 'Health workforce sufficiency ratio', group: 'workforce',
  cmp: '>=', unit: '%', decimals: 0,
  expr: mul(n(100, 'percent scale'), mn(n(1, 'sufficiency cap'),
    dv(add(n(1, 'baseline filled supply'),
      mul(add(sub(b8(m('util')), n(1, 'demand parity')), vacancyShare()),
        add(mul(n(0.8, 'domestic pipeline weight (planning)'),
          mul(m('trainProg'), dv(q('TPP-W2'), ctrl('TPP-W2', 'controlled slot-to-hire conversion (%)')))),
          mul(n(0.2, 'merit-immigration pipeline weight (planning)'),
            mul(r('inf'), dv(q('KPP-W4'), n(100, 'percent scale'))))))),
      mul(m('util'), add(n(1, 'demand parity'), vacancyShare()))))),
  why: 'Sufficiency compares supply (baseline staff plus the training pipeline plus merit-immigration fills) against demand grown by induced utilization.'
});
def({
  id: 'KPP-W3', kind: 'KPP', name: 'Shortage-area staffing sufficiency', group: 'workforce',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, avg(qn('KPP-W2'), qn('TPP-8.4'), qn('KPP-W4'))),
  why: 'Shortage-area fills require overall sufficiency plus the distribution levers: service obligations and merit-immigration placement.'
});
def({
  id: 'KPP-W5', kind: 'KPP', name: 'Internationally recruited clinician retention', group: 'workforce',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, avg(qn('TPP-8.6'), qn('TPP-12.2'))),
  why: 'Retention at three years tracks working conditions: falling burnout and enforced staffing floors.'
});
def({
  id: 'KPP-W1', kind: 'KPP', name: 'Displaced worker placement/training rate', group: 'workforce',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, mul(r('inf'), mn(n(1, 'capacity cap'), dv(p('workforceEdu'), central('workforceEdu', 'workforce education and transition funding ($B/yr)'))))),
  why: 'Placement of displaced administrative workers depends on the transition infrastructure and adequately funded retraining capacity.'
});
def({
  id: 'TPP-8.1', kind: 'TPP', name: 'Critical workforce vacancy rate', group: 'workforce',
  cmp: '<=', unit: '%', decimals: 0,
  expr: mul(sub(n(100, 'full staffing'), q('KPP-W2')), stressF(r('inf'))),
  why: 'Critical vacancies are the sufficiency gap, inflated while hiring and credentialing infrastructure is immature.'
});
def({
  id: 'TPP-8.2', kind: 'TPP', name: 'Specialist Bottleneck Index reduction', group: 'workforce',
  cmp: '>=', unit: '% reduction', decimals: 0,
  expr: mul(own('controlled bottleneck-reduction target (%)'), mul(q('IDX-SPEC'), q('IDX-WSI'))),
  why: 'Bottleneck relief needs the backplane to route demand and the workforce to serve it.'
});
def({
  id: 'TPP-8.3', kind: 'TPP', name: 'Publicly funded training slots', group: 'workforce',
  cmp: '>=', unit: 'slots', decimals: 0,
  expr: mul(ctrl('TPP-8.3', 'controlled annual training slots'), r('inf')),
  why: 'Funded slots come online with the education and program infrastructure.'
});
def({
  id: 'TPP-8.4', kind: 'TPP', name: 'Service obligation fulfillment', group: 'workforce',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('inf')),
  why: 'Obligation tracking and enforcement mature with program infrastructure.'
});
def({
  id: 'TPP-8.5', kind: 'TPP', name: 'Scope-rule implementation', group: 'workforce',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('inf')),
  why: 'Scope-of-practice implementation is regulatory work that lands with the program build.'
});
def({
  id: 'TPP-8.6', kind: 'TPP', name: 'Clinician burnout risk index', group: 'workforce',
  cmp: '>=', unit: '% reduction', decimals: 0,
  expr: mul(own('controlled burnout-reduction target (%)'),
    mul(mn(n(1.25, 'upside cap'), dv(p('providerAdminSavings'), central('providerAdminSavings', 'provider administrative savings (% of spend)'))),
      avg(q('IDX-CLAIMS'), q('IDX-WSI')))),
  why: 'Burnout relief comes from removing billing burden (13 prior-authorization hours per physician week today) and from adequate staffing.'
});
def({
  id: 'TPP-W1', kind: 'TPP', name: 'Role-region vacancy rate ceiling', group: 'workforce',
  cmp: '<=', unit: '%', decimals: 0,
  expr: err3('controlled worst-role-region vacancy ceiling (%)', avg(r('inf'), q('IDX-WSI'))),
  why: 'Worst-cell vacancies decay with hiring infrastructure and overall sufficiency.'
});
def({
  id: 'TPP-IMM1', kind: 'TPP', name: 'Merit selection shortage-occupation targeting', group: 'workforce',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('inf')),
  why: 'Selection targeting matures with the occupation registry and petition infrastructure.'
});
def({
  id: 'TPP-IMM2', kind: 'TPP', name: 'Health-talent petition processing time', group: 'workforce',
  cmp: '<=', unit: 'weeks', decimals: 0,
  expr: err3('controlled processing standard (weeks)', r('inf')),
  why: 'Petition processing accelerates as the adjudication infrastructure is built.'
});
def({
  id: 'TPP-IMM3', kind: 'TPP', name: 'Credential recognition and licensing-bridge time', group: 'workforce',
  cmp: '<=', unit: 'months', decimals: 0,
  expr: err3('controlled licensing-bridge standard (months)', r('inf')),
  why: 'Licensing-bridge time shortens as recognition compacts and bridge programs come online.'
});
def({
  id: 'TPP-IMM4', kind: 'TPP', name: 'Ethical recruitment safeguards compliance', group: 'workforce',
  cmp: '>=', unit: '%', decimals: 0,
  expr: n(100, 'binding rule: recruitment restricted to non-safeguarded source countries from day one'),
  why: 'Safeguard compliance is a binding legal rule, not a ramped capability; the requirement is 100% in every phase.'
});
def({
  id: 'KPP-CULT1', kind: 'KPP', name: 'Clinician safety-culture score', group: 'workforce',
  cmp: '>=', unit: 'pp', decimals: 0,
  expr: mul(own('controlled culture-gain target (points)'),
    avg(qn('TPP-8.6'), qn('TPP-6.6'), qn('TPP-5.5'))),
  why: 'Culture gains follow the drivers clinicians feel: falling burnout, working AI support, and safe staffing.'
});

/* ======== Hospitals and expanded benefits (TPP-5, TPP-9) ================ */
def({
  id: 'TPP-5.1', kind: 'TPP', name: 'Hospital budget migration', group: 'hospitals',
  cmp: '>=', unit: '% of spending', decimals: 0,
  expr: mul(n(100, 'percent scale'), r('hosp')),
  why: 'Budget migration is the hospital global-budget ramp read directly.'
});
def({
  id: 'TPP-5.2', kind: 'TPP', name: 'Global budget variance', group: 'hospitals',
  cmp: '<=', unit: '%', decimals: 0,
  expr: err3('controlled variance ceiling (% absolute)', avg(hospN(), r('inf'))),
  why: 'Budget-setting error decays as migration matures and the data that calibrates budgets completes.'
});
def({
  id: 'TPP-5.3', kind: 'TPP', name: 'Facility-fee elimination rate', group: 'hospitals',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, hospN()),
  why: 'Facility fees end as encounters move inside global budgets.'
});
def({
  id: 'TPP-5.4', kind: 'TPP', name: 'Essential service continuity', group: 'hospitals',
  cmp: '>=', unit: '% of regions', decimals: 0,
  expr: ceil2(OWN, dv(hospN(), NI('emsPhExpansion', 'EMS and public-health expansion ($B/yr)'))),
  why: 'Regional service continuity tracks budget migration and weakens when rural readiness needs run above plan.'
});
def({
  id: 'TPP-5.5', kind: 'TPP', name: 'Hospital staffing safety compliance', group: 'hospitals',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, avg(hospN(), q('IDX-WSI'))),
  why: 'Staffing compliance needs migrated budgets that fund floors and a workforce sufficient to fill them.'
});
def({
  id: 'TPP-5.6', kind: 'TPP', name: 'Related-party extraction ratio', group: 'hospitals',
  cmp: '<=', unit: '% of budget', decimals: 1,
  expr: err3('controlled extraction ceiling (% of hospital budget)',
    mul(hospN(), mn(n(1, 'attainment cap'), dv(p('extractionSavings'), central('extractionSavings', 'extraction recovery ($B/yr)'))))),
  why: 'Related-party extraction decays as budgets migrate and the recovery program actually captures what it planned.'
});
def({
  id: 'TPP-9.1', kind: 'TPP', name: 'LTC functional assessment timeliness', group: 'hospitals',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, dv(avg(r('exp'), q('IDX-WSI')), NI('ltcExpansion', 'LTC expansion ($B/yr)'))),
  why: 'Assessment timeliness needs the LTC benefit build and staffing, and degrades when aging demand runs above plan.'
});
def({
  id: 'TPP-9.2', kind: 'TPP', name: 'Home-first LTC placement rate', group: 'hospitals',
  cmp: '>=', unit: '%', decimals: 0,
  expr: mul(own('controlled home-first target (%)'),
    dv(r('exp'), NI('ltcExpansion', 'LTC expansion ($B/yr)'))),
  why: 'Home-first placement scales with the benefit build and falls behind when LTC demand exceeds the plan.'
});
def({
  id: 'TPP-9.3', kind: 'TPP', name: 'Behavioral health first-contact access', group: 'hospitals',
  cmp: '<=', unit: 'hours', decimals: 0,
  expr: mul(queue('controlled mature first-contact standard (hours)', r('exp')),
    NI('bhExpansion', 'behavioral-health expansion ($B/yr)')),
  why: 'First-contact waits scale with queue load on the behavioral-health build, inflated when unmet-need release runs above plan.'
});
def({
  id: 'TPP-9.4', kind: 'TPP', name: 'Behavioral health crisis response time', group: 'hospitals',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, dv(r('exp'), NI('bhExpansion', 'behavioral-health expansion ($B/yr)'))),
  why: 'Crisis response coverage tracks the benefit build against realized behavioral-health demand.'
});
def({
  id: 'TPP-9.5', kind: 'TPP', name: 'Dental basic access time', group: 'hospitals',
  cmp: '<=', unit: 'days', decimals: 0,
  expr: queue('controlled mature dental standard (days)', r('exp')),
  why: 'Dental waits scale with queue load on the expanded-benefit build.'
});
def({
  id: 'TPP-9.6', kind: 'TPP', name: 'Hearing/vision standard device fulfillment', group: 'hospitals',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('exp')),
  why: 'Device fulfillment tracks the expanded-benefit supply build.'
});
def({
  id: 'TPP-9.7', kind: 'TPP', name: 'EMS readiness compliance', group: 'hospitals',
  cmp: '>=', unit: '% of regions', decimals: 0,
  expr: ceil2(OWN, dv(r('exp'), NI('emsPhExpansion', 'EMS and public-health expansion ($B/yr)'))),
  why: 'EMS readiness tracks the benefit build against realized EMS and public-health need.'
});

/* ======== Records, cyber, and governance (TPP-10..13, rights) =========== */
def({
  id: 'TPP-10.1', kind: 'TPP', name: 'Provider/facility registry completeness', group: 'records',
  cmp: '>=', unit: '%', decimals: 1,
  expr: base2('TPP-10.1', r('inf')),
  why: 'Registry completeness starts from the accuracy provider directories reach today and rides the records build directly.'
});
def({
  id: 'TPP-10.2', kind: 'TPP', name: 'Medication record completeness', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, avg(r('inf'), r('drug'))),
  why: 'Medication records need the records build and the pharmacy rail that generates them.'
});
def({
  id: 'TPP-10.3', kind: 'TPP', name: 'Lab result interoperability', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('inf')),
  why: 'Lab interoperability rides the records and standards build.'
});
def({
  id: 'TPP-10.4', kind: 'TPP', name: 'Discharge summary availability', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: base2('TPP-10.4', avg(r('inf'), mx(hospN(), unitN()))),
  why: 'Structured discharge summaries start from how often one reaches the next visit today and need the records build plus participating delivery settings.'
});
def({
  id: 'TPP-10.5', kind: 'TPP', name: 'Record correction closure', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, avg(r('inf'), qn('TPP-12.6'))),
  why: 'Correction closure needs the records build and a working appeals machine.'
});
def({
  id: 'TPP-10.6', kind: 'TPP', name: 'API conformance rate', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('inf')),
  why: 'API conformance rides the standards and certification build.'
});
def({
  id: 'TPP-11.1', kind: 'TPP', name: 'Critical system uptime', group: 'records',
  cmp: '>=', unit: '%', decimals: 2,
  expr: sub(n(100, 'always up'), mul(own('mature downtime allowance (%)', 'shortfall'),
    stressF(dv(r('inf'), NI('itOperating', 'IT operating spend ($B/yr)'))))),
  why: 'Downtime decays with the resilience build and grows when IT operations are running above plan (incident load, recovery work).'
});
def({
  id: 'TPP-11.2', kind: 'TPP', name: 'Downtime continuity success', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('inf')),
  why: 'Drill pass rates mature with the continuity program.'
});
def({
  id: 'TPP-11.3', kind: 'TPP', name: 'Critical vulnerability remediation', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, dv(r('inf'), NI('itOperating', 'IT operating spend ($B/yr)'))),
  why: 'Remediation speed tracks the security build and degrades under incident-driven operational load.'
});
def({
  id: 'TPP-11.4', kind: 'TPP', name: 'AI clinical safety validation', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, mul(pw(mul(unitN(), r('inf')), n(0.5, 'joint readiness')),
    mn(n(1, 'attainment cap'), dv(p('careModelSavings'), central('careModelSavings', 'mature care-model savings ($B/yr)'))))),
  why: 'Protocol validation needs deployed units, the data infrastructure, and evidence the AI-driven care model is actually delivering.'
});
def({
  id: 'TPP-11.5', kind: 'TPP', name: 'AI override/audit capture', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('inf')),
  why: 'Override capture rides the audit infrastructure; this equation reproduces the controlled 97% floor at P5 exactly, which is what calibrates the engine-wide stress multiplier.'
});
def({
  id: 'TPP-11.6', kind: 'TPP', name: 'AI equity drift', group: 'records',
  cmp: '<=', unit: '%', decimals: 0,
  expr: err3('controlled drift ceiling (% deviation)', avg(qn('TPP-11.4'), r('inf'))),
  why: 'Equity drift decays as validation and monitoring infrastructure matures.'
});
def({
  id: 'TPP-12.1', kind: 'TPP', name: 'Mandatory payment protection coverage', group: 'records',
  cmp: '>=', unit: '%', decimals: 1,
  expr: ceil2(OWN, r('inf')),
  why: 'Payment protection is legal-rail work that lands with the program build.'
});
def({
  id: 'TPP-12.2', kind: 'TPP', name: 'Statutory staffing floor compliance', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, avg(r('inf'), q('IDX-WSI'))),
  why: 'Staffing-floor compliance needs enforcement machinery and a workforce sufficient to comply with.'
});
def({
  id: 'TPP-12.3', kind: 'TPP', name: 'Vacancy-proof operating continuity', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('inf')),
  why: 'Succession and continuity rules stand up with the governance build.'
});
def({
  id: 'TPP-12.4', kind: 'TPP', name: 'Required public data publication timeliness', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('inf')),
  why: 'Publication timeliness rides the reporting infrastructure from the first governing bodies.'
});
def({
  id: 'TPP-12.5', kind: 'TPP', name: 'Anti-impoundment response time', group: 'records',
  cmp: '<=', unit: 'hours', decimals: 0,
  expr: err3('controlled response standard (hours)', r('inf')),
  why: 'Response time shortens as the legal-response machinery is built and drilled.'
});
def({
  id: 'TPP-12.6', kind: 'TPP', name: 'Appeals resolution timeliness', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, dv(avg(r('inf'), q('IDX-CLAIMS')),
    mx(n(1, 'no excess load'), dv(p('governanceRate'), central('governanceRate', 'governance and oversight rate (% of public spend)'))))),
  why: 'Appeals timeliness needs the machinery and the claims rail, and degrades when governance load (disputes, ombudsman volume) runs above plan.'
});
def({
  id: 'TPP-13.1', kind: 'TPP', name: 'Public R&D portfolio coverage', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, mul(r('inf'), mn(n(1, 'funding cap'), dv(p('rdPublic'), central('rdPublic', 'public R&D replacement funding ($B/yr)'))))),
  why: 'Portfolio coverage needs the innovation agency operating and its funding delivered.'
});
def({
  id: 'TPP-13.2', kind: 'TPP', name: 'Public-interest licensing attachment', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('inf')),
  why: 'Licensing attachment is contract discipline that matures with the funding infrastructure.'
});
def({
  id: 'TPP-13.3', kind: 'TPP', name: 'Comparative effectiveness cycle time', group: 'records',
  cmp: '<=', unit: 'months', decimals: 0,
  expr: err3('controlled cycle standard (months)', r('inf')),
  why: 'Review cycles shorten as the evidence infrastructure matures.'
});
def({
  id: 'TPP-13.4', kind: 'TPP', name: 'Innovation reward value alignment', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('inf')),
  why: 'Post-market reconciliation matures with the outcomes-data infrastructure.'
});
def({
  id: 'TPP-USE1', kind: 'TPP', name: 'Patient rights notice comprehension', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('inf')),
  why: 'Notice comprehension improves with tested, iterated plain-language materials.'
});
def({
  id: 'TPP-USE2', kind: 'TPP', name: 'Appeal filing completion without assistance', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, avg(r('inf'), qn('TPP-USE1'))),
  why: 'Unassisted appeal completion needs usable systems and comprehensible notices.'
});
def({
  id: 'TPP-TRIB1', kind: 'TPP', name: 'Tribal compact compliance', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('inf')),
  why: 'Compact compliance machinery stands up in the foundation build.'
});
def({
  id: 'TPP-REG1', kind: 'TPP', name: 'Regional adaptation waiver evaluation completion', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('inf')),
  why: 'Waiver evaluation capacity matures with the governance build.'
});
def({
  id: 'TPP-FORM1', kind: 'TPP', name: 'Formula registry completeness', group: 'records',
  cmp: '>=', unit: '%', decimals: 0,
  expr: ceil2(OWN, r('inf')),
  why: 'Formula registration rides the records and governance build.'
});

/* ---- Registry ----------------------------------------------------------- */
export const EQUATIONS: Record<string, EquationDef> = {};
DEFS.forEach(function (d) { EQUATIONS[d.id] = d; });

/* ---- Diagram groups ----------------------------------------------------- */
export interface DiagramGroup { id: string; title: string; desc: string; members: string[]; }
export const DIAGRAM_GROUPS: DiagramGroup[] = [
  {
    id: 'coverage', title: 'Coverage and financial protection',
    desc: 'Identity and claims machinery feeding the coverage, billing, debt, and bankruptcy outcomes.',
    members: []
  },
  {
    id: 'access', title: 'Access and the unit network',
    desc: 'The unit build, specialist backplane, and AI tooling feeding the access outcomes.',
    members: []
  },
  {
    id: 'meds', title: 'Medicines and public manufacturing',
    desc: 'The pharmacy rail and manufacturing base feeding drug access, price, and continuity outcomes.',
    members: []
  },
  {
    id: 'cost', title: 'System cost and financing',
    desc: 'The fiscal engine read directly: cost ratios, revenue sufficiency, reserves, and taxpayer protection.',
    members: []
  },
  {
    id: 'outcomes', title: 'Clinical outcomes and equity',
    desc: 'Operational metrics compounding into clinical outcomes, equity gaps, and public trust.',
    members: []
  },
  {
    id: 'workforce', title: 'Workforce and transition',
    desc: 'The training pipeline and merit immigration feeding sufficiency, vacancies, and culture.',
    members: []
  },
  {
    id: 'hospitals', title: 'Hospitals and expanded benefits',
    desc: 'Global-budget migration and the expanded-benefit build under realized demand.',
    members: []
  },
  {
    id: 'records', title: 'Records, cyber, and governance',
    desc: 'The records, security, oversight, and innovation infrastructure metrics.',
    members: []
  }
];
DIAGRAM_GROUPS.forEach(function (g) {
  g.members = DEFS.filter(function (d) { return d.group === g.id; }).map(function (d) { return d.id; });
});

/* ---- Dependency extraction ---------------------------------------------- */
export interface DepSet { params: string[]; ramps: RampId[]; models: ModelId[]; refs: string[]; }
export function collectDeps(e: ExprNode): DepSet {
  /* R249 [§S16]: sets keyed by the node's own typed id, so the result needs
     no `as RampId[]` / `as ModelId[]` to come out typed. */
  const params = new Set<string>();
  const ramps = new Set<RampId>();
  const models = new Set<ModelId>();
  const refs = new Set<string>();
  (function walk(x: ExprNode): void {
    if (x.k === 'param') params.add(x.id);
    else if (x.k === 'ramp') ramps.add(x.id);
    else if (x.k === 'model') models.add(x.id);
    else if (x.k === 'ref') refs.add(x.id);
    childrenOf(x).forEach(walk);
  })(e);
  return { params: [...params], ramps: [...ramps], models: [...models], refs: [...refs] };
}

/* ---- Evaluation --------------------------------------------------------- */
interface ScnCtx { P: SampledParams; ramps: BuiltRamps; path: PathResult; }
const scnCache: Record<string, ScnCtx> = {};
function scnCtx(scenarioId: string): ScnCtx {
  if (scnCache[scenarioId]) return scnCache[scenarioId];
  const eff = effectiveParams(scenarioId, null);
  const P = {} as SampledParams;
  Object.keys(eff).forEach(function (id) { P[id] = eff[id].mode; });
  const structural = scenarioStructural(scenarioId);
  const ctx: ScnCtx = { P: P, ramps: buildRamps(structural), path: runPath(P, structural) };
  scnCache[scenarioId] = ctx;
  return ctx;
}

export const RAMP_ARRAY: Record<RampId, keyof BuiltRamps> = {
  cov: 'coverage', cs: 'costShareElim', unit: 'units', drug: 'drugs',
  hosp: 'hospitals', exp: 'expansions', inf: 'infra'
};
function rampAt(ctx: ScnCtx, id: RampId, t: number): number {
  const arr = ctx.ramps[RAMP_ARRAY[id]];
  return arr[Math.min(t, arr.length - 1)] || 0;
}
function modelAt(ctx: ScnCtx, id: ModelId, t: number): number {
  /* `t` is a 0-based index; a rollout year is 1-based. */
  if (id === 'year') return t + 1;
  if (id === 'util') {
    const cds = ctx.P.coverageDemandShare;
    return 1 + (ctx.P.utilIncrease / 100) *
      (cds * rampAt(ctx, 'cov', t) + (1 - cds) * rampAt(ctx, 'cs', t));
  }
  if (id === 'trainProg') {
    /* Cumulative share of the infrastructure build completed by index t.
       The denominator spans the rollout horizon - index 0 (Year 1) through
       the P8 anchor - so progress reaches exactly 1.0 at maturity. Both
       bounds are derived, never typed, so they follow if the horizon moves. */
    const inf = ctx.ramps.infra;
    const last = Math.min(phaseIndex('P8'), inf.length - 1);
    let cum = 0, tot = 0;
    for (let i = 0; i <= last; i++) {
      const v = inf[i] || 0;
      tot += v;
      if (i <= t) cum += v;
    }
    return tot > 0 ? cum / tot : 0;
  }
  const row = ctx.path.detail[Math.min(t, ctx.path.detail.length - 1)];
  switch (id) {
    case 'costRatio': return row.nheNha / row.nheBase;
    case 'adminShare': return 100 * (row.legacyAdmin + row.newAdmin + row.govCost) / row.nheNha;
    case 'pubCost': return row.pubCost;
    case 'newRev': return row.newRevenue;
    case 'wealthRev': return row.wealthRevenue;
    case 'houseRelief': return row.householdRelief;
    case 'wageGain': return row.wageGain;
    case 'wageGainNet': return row.wageGainNet;
  }
  return NaN;
}

const evalMemo: Record<string, number> = {};
function evalExpr(x: ExprNode, scenarioId: string, t: number, stack: Record<string, boolean>): number {
  const ctx = scnCtx(scenarioId);
  switch (x.k) {
    case 'num': return x.kappa ? activeKappa : x.v;
    case 'param': return ctx.P[x.id];
    case 'ramp': return rampAt(ctx, x.id, t);
    case 'model': return modelAt(ctx, x.id, t);
    case 'ref': return evaluateEquation(x.id, scenarioId, t, stack);
    case 'add': return evalExpr(x.a, scenarioId, t, stack) + evalExpr(x.b, scenarioId, t, stack);
    case 'sub': return evalExpr(x.a, scenarioId, t, stack) - evalExpr(x.b, scenarioId, t, stack);
    case 'mul': return evalExpr(x.a, scenarioId, t, stack) * evalExpr(x.b, scenarioId, t, stack);
    case 'div': {
      const d = evalExpr(x.b, scenarioId, t, stack);
      return d === 0 ? NaN : evalExpr(x.a, scenarioId, t, stack) / d;
    }
    case 'pow': return Math.pow(evalExpr(x.a, scenarioId, t, stack), evalExpr(x.b, scenarioId, t, stack));
    case 'min': return Math.min.apply(null, x.args.map(function (a) { return evalExpr(a, scenarioId, t, stack); }));
    case 'max': return Math.max.apply(null, x.args.map(function (a) { return evalExpr(a, scenarioId, t, stack); }));
    case 'base8': return evalExpr(x.of, 'SCN-BASE', phaseIndex('P8'), stack);
    case 'basep': return evalExpr(x.of, 'SCN-BASE', t, stack);
  }
}
export function evaluateEquation(
  id: string, scenarioId: string, t: number,
  stack?: Record<string, boolean>
): number {
  /* The active kappa is part of the key: the same metric at the same phase is
     a different number under a different setting, and the sensitivity run
     would otherwise read the base case back out of the cache. */
  const key = scenarioId + '|' + t + '|' + id + '|' + activeKappa;
  if (evalMemo[key] !== undefined) return evalMemo[key];
  const s = stack || {};
  const sKey = id + '@' + scenarioId + '@' + t;
  if (s[sKey]) throw new Error('Equation cycle at ' + id);
  s[sKey] = true;
  const d = EQUATIONS[id];
  if (!d) throw new Error('No equation for ' + id);
  const v = evalExpr(d.expr, scenarioId, t, s);
  delete s[sKey];
  evalMemo[key] = v;
  return v;
}
export function evaluateAtPhase(id: string, scenarioId: string, phase: string): number {
  return evaluateEquation(id, scenarioId, phaseIndex(phase));
}
/* Review 3 of P24: the model's mature cost per person, 2024 dollars over the
   2023 population: the per-capita equation at the last phase, base case. The
   Healthcare tab sets it beside the plan's own per-person ceiling. */
export function modelPerCapitaAtMaturity(): number {
  return evaluateAtPhase('KPP-C2', 'SCN-BASE', EQ_PHASES[EQ_PHASES.length - 1]!);
}
/* Review 4 of P24: the ceiling form's value for a target M at build S,
   evaluated through ceil2 itself, so the methodology's statement of where
   the form starts is held to the engine and not to a restatement of it. */
export function ceilingFormValue(M: number, S: number): number {
  return evalExpr(ceil2(M, n(S, 'build')), 'SCN-BASE', 0, {});
}
/* Leaf values for the visualizer's input legend */
export function paramValueAt(scenarioId: string, paramId: string): number {
  return scnCtx(scenarioId).P[paramId];
}
export function rampValueAt(scenarioId: string, rampId: RampId, phase: string): number {
  return rampAt(scnCtx(scenarioId), rampId, phaseIndex(phase));
}
export function modelValueAt(scenarioId: string, modelId: ModelId, phase: string): number {
  return modelAt(scnCtx(scenarioId), modelId, phaseIndex(phase));
}

/* ---- Formatting --------------------------------------------------------- */
function fmtNumber(v: number, decimals: number, comma: boolean): string {
  if (comma || v >= 10000) return Math.round(v).toLocaleString('en-US');
  return decimals > 0 ? v.toFixed(decimals) : String(Math.round(v));
}
/* Render a computed value in the parameter's own target language. */
export function formatEqTarget(d: EquationDef, catalogTarget: string, v: number): string {
  if (d.template) {
    return d.template.replace('{X}', fmtNumber(v, d.decimals, d.decimals === 0 && v >= 1000));
  }
  const meta = parseNum(catalogTarget);
  if (meta) return withNum(catalogTarget, v, meta);
  return fmtNumber(v, d.decimals, false) + (d.unit ? ' ' + d.unit : '');
}

/* ---- Target computation for a scenario ---------------------------------- */
export interface EqPhaseValue { num: number; text: string; }
export type EqTargets = Record<string, Record<string, EqPhaseValue>>;

/* Raw equation values per phase for every KPP/TPP (no anchor bounding).
   Needs the catalog for target-template text. */
/* R226-adjacent, §S3: what a cell says when the equation cannot produce a
 * number at that phase.
 *
 * Fourteen cells across eight metrics evaluate non-finite, all of them at a
 * phase EARLIER than the phase their own metric becomes measurable. The cause
 * is structural, not a bug in any one equation: the queueing form is
 *
 *     queue(M, S) = M x (load(S) / load_at_P8(S)),  load(S) = util / (WSI x S)
 *
 * and at P0 every build ramp S is zero, so load is Infinity and the ratio is
 * Infinity / Infinity. TPP-9.3 and TPP-9.5 read the expansions ramp, which
 * stays zero until P4, which is why they contribute four phases each rather
 * than one. The list grew from eleven to fourteen when R226 corrected the
 * phase-to-index conversion: P0 used to resolve ramp index 1, Year 2, where
 * some build had begun; it now resolves index 0, Year 1, where none has.
 *
 * There is no number to invent here. A wait time under a system that does not
 * exist yet is not a large number, it is not a quantity. Flooring the ramp at
 * some epsilon would manufacture one, which is the failure mode this codebase
 * exists to prevent. So the cell keeps its non-finite `num` - the diagnostics
 * in selftests.ts still count them, and KNOWN_NON_FINITE still pins them - and
 * carries a sentence a reader can act on instead of a formatted NaN.
 *
 * Before this, formatEqTarget rendered the value into the metric's own
 * template and produced strings like "median <=NaN hours". Nothing published
 * them, because applyEquationTargets skips non-finite values and no rollout
 * row exists at any of those phases. That guard is correct and stays. It was
 * also the only thing standing between those strings and a reader: add one
 * early-phase rollout row to any of the eight metrics and the page ships
 * "median <=NaN hours". This removes the string, so there is nothing to
 * publish even if the guard is one day wrong. */
export const NOT_RELEVANT_TEXT = 'Parameter not relevant yet.';

export function computeTargets(Q: QualityData, scenarioId: string): EqTargets {
  const out: EqTargets = {};
  const byId: Record<string, QualityParameter> = {};
  Q.parameters.forEach(function (p) { byId[p.id] = p; });
  DEFS.forEach(function (d) {
    if (d.kind === 'index') return;
    const cat = byId[d.id];
    if (!cat) return;
    const rec: Record<string, EqPhaseValue> = {};
    EQ_PHASES.forEach(function (ph) {
      const v = evaluateAtPhase(d.id, scenarioId, ph);
      rec[ph] = {
        num: v,
        text: isFinite(v) ? formatEqTarget(d, cat.target, v) : NOT_RELEVANT_TEXT
      };
    });
    out[d.id] = rec;
  });
  return out;
}

/* ---- Apply base-scenario equation targets into the catalog rollout ------
 * Replaces every 'derived interim target' value (the previously rule-derived
 * interpolations and qualitative ladders) with the equation-computed value,
 * bounded by the plan's own committed anchors so targets never regress:
 *   maximize metrics: at least every earlier committed value, at most any
 *   later committed value; minimize metrics: mirrored.
 * Entry counts and phases are unchanged. */
/* R247 [§S16]: read off the one declaration in rollout-kinds.ts. This was a
   second hand-written list that rollout-kind-check.ts compared with the
   first; that comparison is now a check on what this engine DOES with each
   kind (engineKindDispositionDrift), which is the property the collapse
   relies on. */
export const AUTHORITATIVE_KINDS: ReadonlySet<string> = new Set<string>(
  kindsWhere(function (d) { return d.disposition === 'authoritative'; }));
/* R233 [§S3]: the unit an anchor must match, or null for "match nothing".
 *
 * The guard downstream exists to stop a rollout entry in one unit clamping a
 * target in another - a "within 12 months" milestone bounding a percentage. It
 * used to read `!matMeta || pn.unit === matMeta.unit`, so a metric whose
 * maturity target does not parse took EVERY anchor in every unit instead of
 * none. `!matMeta` was doing double duty: "no unit to match" and "match
 * anything".
 *
 * A template is the second half of the same question. `template` is set
 * exactly when the catalog target carries no numeric scaffold, so any number
 * parsed out of that prose is incidental - KPP-C2's target names $4.75T of
 * national system cost and parses as 4.75 in unit money, against a metric
 * published in dollars per person (declared in R151/R277). Reading a unit off
 * that string is the same mistake as reading a value off it.
 *
 * So: no parse, or a templated target, means take no anchors. */
export function anchorMatchTarget(d: EquationDef, catalogTarget: string) {
  return d.template ? null : parseNum(catalogTarget);
}

/* The committed numeric anchors a metric's trajectory is bounded by, keyed by
   phase. Extracted so R233's guard is observable: a test can ask which anchors
   a parameter admits without reproducing the bounding loop. */
export function committedAnchors(
  d: EquationDef, p: QualityParameter
): Record<string, number> {
  const matMeta = anchorMatchTarget(d, p.target);
  const anchors: Record<string, number> = {};
  if (!matMeta) return anchors;
  (p.rollout || []).forEach(function (e) {
    if (!AUTHORITATIVE_KINDS.has(e.kind)) return;
    const pn = parseNum(e.value);
    if (!pn || pn.unit !== matMeta.unit) return;
    anchors[e.phase] = anchors[e.phase] !== undefined
      ? (d.cmp === '<=' ? Math.min(anchors[e.phase], pn.num) : Math.max(anchors[e.phase], pn.num))
      : pn.num;
  });
  return anchors;
}

export function applyEquationTargets(Q: QualityData, targets: EqTargets): void {
  const marker = Q as { __equationApplied?: boolean };
  if (marker.__equationApplied) return;
  marker.__equationApplied = true;
  const order = EQ_PHASES;
  Q.parameters.forEach(function (p) {
    if (p.type === 'CP') return;
    const d = EQUATIONS[p.id];
    const t = targets[p.id];
    if (!d || !t) return;
    const anchors = committedAnchors(d, p);
    let prevShown: number | null = null;
    order.forEach(function (ph) {
      if (anchors[ph] !== undefined) { prevShown = anchors[ph]; }
      const entries = p.rollout.filter(function (e) {
        return e.phase === ph && e.kind === 'derived interim target';
      });
      if (!entries.length) return;
      const val = t[ph];
      if (!val || !isFinite(val.num)) return;
      let v = val.num;
      /* bound by future committed anchors */
      let futureBound: number | null = null;
      order.forEach(function (ph2) {
        if (order.indexOf(ph2) > order.indexOf(ph) && anchors[ph2] !== undefined) {
          futureBound = futureBound === null
            ? anchors[ph2]
            : (d.cmp === '<=' ? Math.max(futureBound, anchors[ph2]) : Math.min(futureBound, anchors[ph2]));
        }
      });
      let bounded = false;
      if (d.cmp === '<=') {
        if (prevShown !== null && v > prevShown) { v = prevShown; bounded = true; }
        if (futureBound !== null && v < futureBound) { v = futureBound; bounded = true; }
      } else {
        if (prevShown !== null && v < prevShown) { v = prevShown; bounded = true; }
        if (futureBound !== null && v > futureBound) { v = futureBound; bounded = true; }
      }
      prevShown = v;
      const entry = entries[0];
      entry.value = formatEqTarget(d, p.target, v);
      entry.kind = 'equation-derived target';
      /* R232 [§S3]: when the value is clamped, the published number is a flat
         carry-forward of the previous phase or a committed anchor, and it is
         NOT what the equation produced. Carry the equation's own number beside
         it so the two can be shown together, rather than leaving a reader to
         evaluate the tree in the explorer and get a third number. */
      entry.bounded = bounded;
      entry.raw = bounded ? formatEqTarget(d, p.target, val.num) : undefined;
      entry.interpretation = 'Calculated from this parameter\'s equation at the phase build state. '
        + d.why
        + (bounded
          ? ' The equation gives ' + entry.raw + ' here; the published value holds at ' +
            entry.value + ' to stay consistent with the plan\'s committed floors and milestones.'
          : '');
    });
  });
}

/* R232 [§S3]: how often the clamp fires, per metric.
 *
 * The size of the clamp is itself a finding. A metric bounded at six of nine
 * phases is a metric whose equation is not doing the work: the trajectory a
 * reader sees is the plan's committed floors carried forward, and the equation
 * is decoration. Nobody could see that before, because the bound was applied
 * and then discarded. */
export interface ClampCount {
  id: string;
  /* equation-derived rows this metric publishes */
  rows: number;
  /* of those, rows where the published value is not the equation's */
  bounded: number;
  phases: string[];
}
export function clampCounts(Q: QualityData): ClampCount[] {
  const out: ClampCount[] = [];
  Q.parameters.forEach(function (p) {
    if (p.type === 'CP') return;
    let rows = 0, bounded = 0;
    const phases: string[] = [];
    (p.rollout || []).forEach(function (e) {
      if (e.kind !== 'equation-derived target') return;
      rows += 1;
      if (e.bounded) { bounded += 1; phases.push(e.phase); }
    });
    if (rows) out.push({ id: p.id, rows: rows, bounded: bounded, phases: phases });
  });
  return out.sort(function (a, b) {
    return b.bounded - a.bounded || a.id.localeCompare(b.id);
  });
}

/* ---- Maturity closure: the tolerance, and what it is allowed to cover ----
 *
 * R231 [§S3]: the header claimed base-case maturity values "close exactly" and
 * the assertion permitted a 12% miss. A 99% target passed at 87.1%; a
 * 30-minute target passed at 33.6 minutes. Those are materially different
 * promises and both shipped green, which is the mechanism by which a slowly
 * drifting model stays green.
 *
 * Measured, the claim was nearly true and the tolerance was far too loose. Of
 * the 118 metrics the check covers, 106 close to within one part in a million.
 * Everything the slack was actually carrying sat in two places:
 *
 *   - Composite and queue-form metrics normalize against base-case mature
 *     load rather than solving to the target, so they close to a couple of
 *     percent rather than exactly. The widest is KPP-B2 at 1.4%.
 *   - Four metrics genuinely miss, by 3.9% to 29.2%.
 *
 * So the tolerance is 2%: it covers the normalization residual with about half
 * a point of headroom and nothing else. The four real misses are named below
 * instead of being absorbed. Two of them, KPP-C7 and TPP-W1, were inside the
 * old 12% and therefore invisible - the loose bound was hiding exactly the
 * thing the exemption list exists to make visible. */
export const MATURITY_TOLERANCE = 0.02;

/* R235 [§S3]: the exemption is a property of the record, not of the test.
 *
 * It began as `const documentedGap = { 'KPP-C1': true, 'KPP-C8': true }`
 * inside the closure check. The audit calls that the most honest thing in the
 * codebase and it was: the model does not reach two of its own targets, and
 * the code said so by ID with a pointer to the write-up. What it could not do
 * was survive contact with anything else - a reader of the catalog could not
 * see it, and if a gap ever closed the exemption would persist in silence.
 *
 * The reasons now live in the generator and are stamped onto the parameter
 * (`documentedGap`, `documentedGapSection`), so they travel with the record,
 * and the check below fails in both directions. */
export function documentedGapIds(Q: QualityData): string[] {
  return Q.parameters.filter(function (p) { return !!p.documentedGap; })
    .map(function (p) { return p.id; }).sort();
}

/* ---- Self-checks (consumed by Vitest) ----------------------------------- */
export function equationSelfTests(Q: QualityData): { ok: boolean; messages: string[] } {
  const messages: string[] = [];
  const kppTpp = Q.parameters.filter(function (p) { return p.type !== 'CP'; });
  /* 1. coverage: every KPP/TPP has an equation */
  kppTpp.forEach(function (p) {
    if (!EQUATIONS[p.id]) messages.push('missing equation: ' + p.id);
  });
  /* 2. acyclic + finite from the phase each metric becomes measurable */
  const startById: Record<string, string> = {};
  kppTpp.forEach(function (p) { startById[p.id] = p._phaseStart || 'P0'; });
  DEFS.forEach(function (d) {
    const startIdx = d.kind === 'index' ? EQ_PHASES.length - 1
      : EQ_PHASES.indexOf(startById[d.id] || 'P0');
    EQ_PHASES.forEach(function (ph, i) {
      if (i < startIdx) return;
      let v: number;
      try { v = evaluateAtPhase(d.id, 'SCN-BASE', ph); }
      catch (err) { messages.push(String(err)); return; }
      if (!isFinite(v)) messages.push('non-finite: ' + d.id + ' at ' + ph);
    });
  });
  /* R143 [§S5]: the scenario set the widened stale-exemption test reads. */
  const SCENARIO_IDS = SCENARIOS.map(function (sc) { return sc.id; });
  /* 3. base-case maturity meets the source target, within MATURITY_TOLERANCE,
     except for the metrics whose shortfall is documented rather than hidden.
     R235: an exempt metric that now MEETS its target is reported too, so
     closing a gap surfaces the stale exemption instead of hiding behind it. */
  kppTpp.forEach(function (p) {
    const d = EQUATIONS[p.id];
    if (!d || d.template) return;
    const meta = parseNum(p.target);
    if (!meta || !meta.cmp) return;
    const v = evaluateAtPhase(p.id, 'SCN-BASE', 'P8');
    /* A non-finite maturity value is a failure, not a skip. It used to report
       as "computed NaN" because every comparison against NaN is false; R231
       briefly turned that into an early return, which added a silence to the
       one section whose defects were silences. Reported explicitly instead, so
       the message says what happened rather than describing a miss. */
    if (!isFinite(v)) {
      messages.push('maturity value is not finite: ' + p.id + ' at P8 vs ' + p.target);
      return;
    }
    const ok = meta.cmp === '<='
      ? v <= meta.num * (1 + MATURITY_TOLERANCE)
      : v >= meta.num * (1 - MATURITY_TOLERANCE);
    const exempt = !!p.documentedGap;
    if (!ok && !exempt) {
      messages.push('maturity miss: ' + p.id + ' computed ' + v.toFixed(2) + ' vs ' + p.target);
    }
    /* R143 [§S5] widened this. It used to retire an exemption the moment the
       BASE CASE met its target, and R143 walked straight into the hole: moving
       the healthcare model's wealth base onto the sourced top-capital rate
       took KPP-C8 from about 5.9% to 4.64% on SCN-BASE, so the check demanded
       the gap be deleted - while 10 of the 20 scenarios still breach the 5%
       cap. R143 measured 12; P7 re-drew the same model with one random stream
       per parameter and got 10, with no economics changed, which is the
       measurement saying that the COUNT is a statistic of the ensemble rather
       than a property of the framework. What survives re-drawing is that the
       base case is inside the cap and that scenarios outside it exist.
       Deleting a true disclosure on the strength of
       one favourable scenario is the exact failure this check exists to
       prevent, pointed the other way.
       A gap is stale only when it has closed everywhere. */
    if (ok && exempt) {
      const breaching = SCENARIO_IDS.filter(function (id) {
        const sv = evaluateAtPhase(p.id, id, 'P8');
        if (!isFinite(sv)) return true;
        return meta.cmp === '<='
          ? !(sv <= meta.num * (1 + MATURITY_TOLERANCE))
          : !(sv >= meta.num * (1 - MATURITY_TOLERANCE));
      });
      if (!breaching.length) {
        messages.push('exemption no longer needed: ' + p.id + ' computed ' + v.toFixed(2) +
          ' and now meets ' + p.target + ' in every scenario. Remove it from ' +
          'DOCUMENTED_GAPS in tools/extract_quality_catalog.py and from ' +
          (p.documentedGapSection || 'the methodology') + '.');
      }
    }
  });
  return { ok: messages.length === 0, messages: messages };
}
