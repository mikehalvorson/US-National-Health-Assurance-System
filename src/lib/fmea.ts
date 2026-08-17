/* =========================================================================
 * National Health Assurance - Failure Modes and Effects Analysis (FMEA)
 * =========================================================================
 * A failure mode is a phase-based target that is not met. Every KPP and TPP
 * carries a target at every phase where it is measurable (see phase-targets.ts);
 * each of those phase targets is one potential failure. Cost parameters (CP)
 * carry no phase target, so their failure mode is a calibration-tolerance
 * breach: the controlled value is never calibrated or lands outside its
 * controlled range.
 *
 * For each failure mode this module derives, from signals already present in
 * the controlled catalog:
 *   - the effect (what happens downstream if the target is missed),
 *   - a probability score (occurrence, 1-5),
 *   - a consequence score (severity, 1-5),
 *   - a 5x5 risk band from the standard probability x consequence grid,
 *   - a detectability score and resulting risk priority number (secondary),
 *   - a flag where the catalog does not carry enough information to assess
 *     probability or consequence, which is where a new controlled parameter
 *     is required rather than an invented number.
 *
 * DESIGN RULES (consistent with the rest of the dashboard):
 *   - No number is invented for a target the framework deliberately deferred;
 *     a deferred numeric target is reported as a parameter gap, not a guess.
 *   - Scores are derived from catalog signals (target stringency, required
 *     phase-to-phase improvement, calibration status, gate linkage, domain
 *     criticality), not asserted.
 *   - Self-tests must pass at build time. fmeaSelfTests() is registered in
 *     selftests.ts and enforced by the astro:build:start gate in
 *     astro.config.mjs: a failure stops the build (R152, R273).
 * ========================================================================= */
import { QUALITY_DATA } from './quality';
import type { QualityParameter, RolloutEntry } from './quality-data';
/* R277 [§S3]: this module used to carry its own copy of parseNum under a
   comment reading "mirrors phase-targets.ts parseNum" - two implementations,
   three consumers, and nothing asserting they agreed. phase-targets.ts owns
   the parser; equations.ts already imported it; now so does this. */
import { parseNum } from './phase-targets';
import type { NumMeta } from './phase-targets';
/* R272 [§S4]: two imports that make an invisible dependency visible.
 *
 * This module used to import QUALITY_DATA and nothing else, so nothing at the
 * import line said that the values it scores are rewritten by the equation
 * layer at load time - the dependency arrived entirely through quality.ts
 * mutating the shared catalog. That is why R226's blast radius reached this
 * chapter without anyone tracing it, and why R263 had to be graded on the
 * page's prose instead of on read code.
 *
 *   PHASE_YEAR         - the one phase->year definition (R251). priorNum's
 *                        "previous phase" ordering is a probability input, and
 *                        it used to be ordered by a fourth local copy of the
 *                        phase list declared as a literal in this file.
 *   AUTHORITATIVE_KINDS - the rollout kinds applyEquationTargets does NOT
 *                        rewrite. Rows of those kinds are scored from the
 *                        catalog value verbatim and are ranked against rows the
 *                        equation layer recomputed. See TARGET_PROVENANCE. */
import { PHASE_YEAR } from './rollout';
import { AUTHORITATIVE_KINDS } from './equations';
/* R275 [§S4]: the one confidence store. See CP_FAMILY_MODEL_INPUTS. */
import { PARAM_DEFS, PARAMS_BY_ID } from './params';

/* ---- Phase order and anchors ----------------------------------------- */
const PHASE_ORDER: string[] = Object.keys(PHASE_YEAR)
  .sort(function (a, b) { return PHASE_YEAR[a] - PHASE_YEAR[b]; });
function pIdx(p: string): number { return PHASE_ORDER.indexOf(p); }
const PHASE_ANCHOR: Record<string, string> = {};
QUALITY_DATA.phases.forEach(function (ph) { PHASE_ANCHOR[ph.id] = ph.anchor; });

/* ---- Gate linkage: parameters the framework itself made go/no-go ------
 * Each phase gate (G1..G8) names the parameters whose floors it enforces
 * and the phase at which it binds. Missing a gate floor halts an entire
 * rollout wave, so gate-linked failures carry systemic consequence. Parsed
 * from the controlled gate table (QUALITY_DATA.gates) plus the phase each
 * gate decision binds at. */
const GATE_BIND_PHASE: Record<string, string> = {
  G1: 'P3', G2: 'P6', G3: 'P7', G4: 'P8',
  G5: 'P5', G6: 'P6', G7: 'P3', G8: 'P6'
};
/* Explicit id lists (some gate floors name id ranges in prose). */
const GATE_PARAMS: Record<string, string[]> = {
  G1: ['TPP-2.1', 'TPP-2.2', 'TPP-2.4'],
  G2: ['KPP-B2', 'KPP-B7', 'KPP-B8', 'KPP-B9'],
  G3: ['TPP-8.1', 'TPP-9.1', 'TPP-9.2', 'TPP-9.3', 'TPP-9.4', 'TPP-9.5', 'TPP-9.6', 'TPP-9.7'],
  G4: ['KPP-C5', 'KPP-C6', 'TPP-6.4'],
  G5: ['TPP-11.4', 'TPP-11.5', 'TPP-11.6'],
  G6: ['TPP-10.1', 'TPP-10.2', 'TPP-10.3', 'TPP-10.4', 'TPP-10.5', 'TPP-10.6', 'TPP-11.1', 'TPP-11.2', 'TPP-11.3'],
  G7: ['TPP-LEG1', 'TPP-USE1', 'TPP-USE2', 'TPP-12.4', 'TPP-12.6', 'KPP-TRUST1'],
  G8: ['KPP-T1', 'KPP-T2', 'TPP-12.1', 'TPP-12.5', 'TPP-TRIB1']
};
const GATE_OF_PARAM: Record<string, string> = {};
Object.keys(GATE_PARAMS).forEach(function (g) {
  GATE_PARAMS[g].forEach(function (id) { GATE_OF_PARAM[id] = g; });
});
const GATE_NAME: Record<string, string> = {};
QUALITY_DATA.gates.forEach(function (gate) {
  const short = gate.id.replace(/^G/, 'G');
  GATE_NAME[short] = gate.name || gate.id;
});

/* ---- Effect classes and their base severity (1-5) --------------------
 * The effect of a missed target is grouped by the kind of harm it produces.
 * Base severity is set by that harm class and then adjusted per parameter. */
interface EffectClass { key: string; label: string; severity: number; }
const EFFECT_CLASSES: Record<string, EffectClass> = {
  safety:      { key: 'safety',      label: 'Patient safety and clinical harm',          severity: 5 },
  coverage:    { key: 'coverage',    label: 'Loss of coverage and financial protection', severity: 5 },
  medication:  { key: 'medication',  label: 'Medication and supply continuity',          severity: 5 },
  fiscal:      { key: 'fiscal',      label: 'Fiscal sustainability and solvency',        severity: 5 },
  continuity:  { key: 'continuity',  label: 'Care continuity through transition',         severity: 4 },
  cyber:       { key: 'cyber',       label: 'Data integrity, cyber and system continuity', severity: 4 },
  payment:     { key: 'payment',     label: 'Provider solvency and payment integrity',   severity: 4 },
  access:      { key: 'access',      label: 'Access and capacity shortfall',             severity: 4 },
  rights:      { key: 'rights',      label: 'Rights, equity and legitimacy erosion',     severity: 4 },
  workforce:   { key: 'workforce',   label: 'Workforce capacity',                        severity: 3 },
  governance:  { key: 'governance',  label: 'Governance, transition and oversight',      severity: 3 },
  calibration: { key: 'calibration', label: 'Model calibration and scorekeeping',        severity: 3 },
  innovation:  { key: 'innovation',  label: 'Innovation and training pipeline',          severity: 2 }
};

/* Concept -> default effect class. Overridden below for specific families. */
const CONCEPT_CLASS: Record<string, string> = {
  'Coverage, affordability & eligibility': 'coverage',
  'Access, routing & unit network': 'access',
  'Quality, safety & patient experience': 'safety',
  'Equity, rights & legitimacy': 'rights',
  'Workforce & care delivery': 'workforce',
  'Claims, payments & financing': 'payment',
  'Hospitals & regional delivery': 'access',
  'Medicines, devices & supply': 'medication',
  'Expanded benefits & public health': 'access',
  'Data, cybersecurity & AI': 'cyber',
  'Governance, transition & continuity': 'governance',
  'Research, innovation & training': 'innovation',
  'Population, macroeconomics & offsets': 'fiscal'
};

/* Family / id prefix overrides where the concept default understates the
 * harm. Longest match wins. */
const CLASS_OVERRIDE: [RegExp, string][] = [
  [/^KPP-D/, 'safety'],          // clinical outcomes, mortality, injury
  [/^KPP-B9/, 'safety'],         // unsafe under-referral
  [/^KPP-B[0-9]/, 'access'],
  [/^KPP-A/, 'coverage'],
  [/^KPP-C5/, 'fiscal'],
  [/^KPP-C6/, 'fiscal'],
  [/^KPP-C/, 'fiscal'],          // financing and cost outcomes
  [/^KPP-T/, 'continuity'],      // active-treatment and medication transfer
  [/^KPP-W/, 'workforce'],
  [/^KPP-TRUST/, 'rights'],
  [/^KPP-CULT/, 'workforce'],
  [/^TPP-11\.[456]/, 'safety'],  // clinical AI safety
  [/^TPP-11/, 'cyber'],
  [/^TPP-10/, 'cyber'],
  [/^TPP-3/, 'medication'],
  [/^TPP-4/, 'medication'],
  [/^TPP-2/, 'payment'],
  [/^TPP-LEG/, 'rights'],
  [/^TPP-USE/, 'rights'],
  [/^TPP-9/, 'access'],
  [/^TPP-8/, 'workforce'],
  [/^TPP-13/, 'innovation']
];
/* CP families -> effect class (domain of the ledger). */
const CP_FAMILY_CLASS: Record<string, string> = {
  'CP-TOT': 'fiscal', 'CP-POP': 'fiscal', 'CP-CLM': 'payment', 'CP-HOSP': 'payment',
  'CP-CLIN': 'workforce', 'CP-UNIT': 'access', 'CP-LTC': 'access', 'CP-RX': 'medication',
  'CP-DX': 'access', 'CP-BH': 'access', 'CP-DVH': 'access', 'CP-EMS': 'access',
  'CP-PH': 'access', 'CP-IT': 'cyber', 'CP-GOV': 'governance', 'CP-RD': 'innovation',
  'CP-EDU': 'workforce', 'CP-TRN': 'continuity', 'CP-FIN': 'fiscal', 'CP-OFF': 'fiscal'
};

function effectClassFor(p: QualityParameter): string {
  if (p.type === 'CP') return CP_FAMILY_CLASS[p.family] || 'calibration';
  for (let i = 0; i < CLASS_OVERRIDE.length; i++) {
    if (CLASS_OVERRIDE[i][0].test(p.id)) return CLASS_OVERRIDE[i][1];
  }
  return CONCEPT_CLASS[p.concept] || 'governance';
}

/* ---- CP calibration confidence read from the simulation layer ----------
 * Cost parameters carry no phase target and no native likelihood attribute.
 * The only likelihood signal available is the confidence grade of the modeled
 * quantity each CP family calibrates, and that grade lives in params.ts.
 *
 * R275 [§S4]: it used to be retyped here. Twenty family grades sat under a
 * comment reading "see params.ts" and were not read from params.ts, so two
 * confidence stores existed with nothing reconciling them, and this one was
 * per-family where the real grades are per-parameter. What is declared here
 * now is a list of IDENTIFIERS, not of grades: which sampled parameters enter
 * each family's ledger line in model.ts. Identifiers can be checked against
 * PARAMS_BY_ID in both directions and the build fails on a typo or an
 * unclaimed parameter; grades could only be compared by eye, and were not.
 *
 * The consequence that matters: a regrade in params.ts now moves this chart.
 * The audit's own complaints about these grades (E1 on the offsets lever, E2
 * on population, D1/D2 on behavioral health) become one fix in one file
 * instead of two, and §S11b owns it.
 *
 * The mapping rule, so the next parameter has an obvious home: name the
 * parameters specific to that ledger's cost line in model.ts. Parameters that
 * multiply every line, or no line, belong to no family and are declared in
 * SYSTEM_WIDE_PARAMS instead - folding them in would flatten every family to
 * the weakest grade in the model.
 *
 * A family with no parameterised line in the engine is UNASSESSABLE, and that
 * is not a hypothetical: CP-DX has none. Devices, labs and diagnostics reach
 * the engine only inside otherPhc0, a carried-forward CMS aggregate with no
 * sampled parameter of its own. Before this change all twenty families were
 * in the map, so the branch reporting an unassessable case could never run -
 * an honesty mechanism written and unreachable. */
const CP_FAMILY_MODEL_INPUTS: Record<string, string[]> = {
  'CP-TOT':  ['baselineRealGrowth'],                    // nheBase = nheTotal * G
  'CP-POP':  ['popGrowth', 'gdpRealGrowth'],            // pop, gdp
  'CP-CLM':  ['publicAdminRate', 'legacyAdminFloor', 'providerAdminSavings'],
  'CP-HOSP': ['providerPaymentFactor', 'embeddedDrugSpend'],  // cHosp
  'CP-CLIN': ['providerPaymentFactor', 'embeddedDrugSpend'],  // cClin
  'CP-UNIT': ['unitsCost'],                             // cUnits
  'CP-LTC':  ['ltcExpansion', 'ltcWageFloor'],          // cLtc + cLtcAides
  'CP-RX':   ['drugPriceCut', 'embeddedDrugSpend'],     // cDrugs
  'CP-DX':   [],                                        // no parameterised line
  'CP-BH':   ['bhExpansion'],                           // cBh
  'CP-DVH':  ['dvhExpansion'],                          // cDvh
  'CP-EMS':  ['emsPhExpansion'],                        // cEmsPh, shared with CP-PH
  'CP-PH':   ['emsPhExpansion'],                        // cEmsPh, shared with CP-EMS
  'CP-IT':   ['itOperating', 'itCapital'],              // cItOp + itcap
  'CP-GOV':  ['governanceRate'],                        // govCost
  'CP-RD':   ['rdPublic'],                              // cRd
  'CP-EDU':  ['workforceEdu'],                          // cWf
  'CP-TRN':  ['transitionTotal', 'itCapital'],          // trans + itcap
  'CP-FIN':  ['employerCapture', 'wagePassThrough', 'wealthTaxPotential', 'wealthCollectionEff'],
  'CP-OFF':  ['providerAdminSavings', 'careModelSavings', 'lowValueCapture', 'extractionSavings']
};
/* Parameters that shape demand or the public/private split across every
   ledger at once, so no single family's calibration confidence is theirs. */
const SYSTEM_WIDE_PARAMS: string[] = [
  'utilIncrease', 'coverageDemandShare', 'residualPrivateShare'
];

/* Grades ordered weakest to strongest. The compound grades are not in
   params.ts's PARAM_DEFS today - they appear in OUTCOME_STATS and in the seed
   CSV - but they are in the project's vocabulary, so they are mapped here
   rather than left to resolve to undefined if §S11a or §S11b widens the type.
   A compound grade rounds toward its weaker half, which is the conservative
   direction for an occurrence score. */
const GRADE_RANK: Record<string, number> = {
  low: 0, 'low-medium': 1, medium: 2, 'medium-high': 3, high: 4
};
const CONF_TO_OCC: Record<string, number> = {
  low: 4, 'low-medium': 4, medium: 3, 'medium-high': 3, high: 2
};

/* The weakest grade among a family's inputs: if any quantity calibrating the
   ledger rests on an analyst assumption, the ledger is at least that
   uncertain. Returns null where the family has no parameterised line. */
function familyConfidence(family: string): string | null {
  const ids = CP_FAMILY_MODEL_INPUTS[family];
  if (!ids || !ids.length) return null;
  let weakest: string | null = null;
  ids.forEach(function (id) {
    const grade = PARAMS_BY_ID[id] && PARAMS_BY_ID[id].confidence;
    if (!grade) return;
    if (weakest === null || GRADE_RANK[grade] < GRADE_RANK[weakest]) weakest = grade;
  });
  return weakest;
}
function familyInputLabel(family: string): string {
  const ids = CP_FAMILY_MODEL_INPUTS[family] || [];
  return ids.map(function (id) {
    const grade = (PARAMS_BY_ID[id] && PARAMS_BY_ID[id].confidence) || 'ungraded';
    return id + ' (' + grade + ')';
  }).join(', ');
}

/* ---- 5x5 risk grid: band per (consequence row, probability col) --------
 * Standard risk matrix. Rows are consequence 1..5, columns probability 1..5.
 * Bands map to the dashboard palette: low=green, moderate=yellow,
 * high=orange, extreme=red. */
type Band = 'low' | 'moderate' | 'high' | 'extreme';
const RISK_GRID: Record<number, Band[]> = {
  5: ['high', 'high', 'extreme', 'extreme', 'extreme'],
  4: ['moderate', 'high', 'high', 'extreme', 'extreme'],
  3: ['low', 'moderate', 'high', 'high', 'extreme'],
  2: ['low', 'low', 'moderate', 'moderate', 'high'],
  1: ['low', 'low', 'low', 'moderate', 'moderate']
};
export const BAND_META: Record<Band, { label: string; tier: string; color: string; order: number }> = {
  extreme:  { label: 'Extreme', tier: 'Critical', color: 'var(--series-6)', order: 0 },
  high:     { label: 'High',    tier: 'Serious',  color: 'var(--series-8)', order: 1 },
  moderate: { label: 'Moderate', tier: 'Moderate', color: 'var(--series-3)', order: 2 },
  low:      { label: 'Low',     tier: 'Minor',    color: 'var(--series-4)', order: 3 }
};
function bandFor(consequence: number, probability: number): Band {
  return RISK_GRID[consequence][probability - 1];
}
/* Band for any cell of the chart, including empty ones (for coloring). */
export function cellBand(consequence: number, probability: number): Band {
  return RISK_GRID[consequence][probability - 1];
}

/* ---- Probability (occurrence, 1-5) ------------------------------------
 * Higher when the target is stringent, when it demands a large improvement
 * over the previous phase, when the parameter is not yet calibrated, and in
 * the foundation phases where systems are unproven.
 *
 * R274 [§S4]: the scale this model can actually reach is derived here rather
 * than assumed to be 1..5.
 *
 * Every bump below is additive and non-negative, so a phase target with no
 * bump at all scores the baseline - and Math.round(1.5) is 2. Probability 1
 * was therefore unreachable by construction, which made the first column of
 * the 5x5 chart permanently empty and five of its twenty-five cells dead
 * while cellBand coloured them anyway. The page published that empty column
 * as a finding: "No failure mode scores probability 1: every controlled
 * target sits on an unproven or ambitious trajectory." It was arithmetic
 * about a constant, presented to a reader as evidence about the programme.
 *
 * The baseline is kept. Lowering it to make column 1 reachable would move
 * roughly half of the 727 published probability scores to fix a presentation
 * defect, and would replace one unsourced constant with another. What the
 * model is actually saying is that every controlled target is at least
 * "unlikely" to be missed, because every one of them is a target on a system
 * still being built. That is a modelling position, so it is stated, the claim
 * that dressed it up as a result is gone, and the chart is drawn from the
 * reachable range so an unreachable band cannot be rendered again. */
const PROB_BASELINE = 1.5;
function clampScore(score: number): number { return Math.max(1, Math.min(5, Math.round(score))); }

function stringencyBump(meta: NumMeta): number {
  const isMax = meta.cmp !== '<=';
  if (isMax && meta.unit === '%') {
    const headroom = 100 - meta.num;      /* how close to perfection */
    if (headroom <= 0.5) return 2;        /* 99.5%+ : near-perfect, very hard */
    if (headroom <= 1.5) return 1.5;      /* 98.5%+ */
    if (headroom <= 3) return 1;          /* 97%+ */
    if (headroom <= 7) return 0.5;        /* 93%+ */
    return 0;                             /* below 93%: routine headroom */
  }
  if (!isMax) {
    /* minimize target: a very low ceiling is hard to hold */
    if (meta.unit === '%') {
      if (meta.num <= 0.3) return 2;
      if (meta.num <= 0.8) return 1.5;
      if (meta.num <= 2) return 1;
      if (meta.num <= 6) return 0.5;
      return 0;
    }
    if (meta.unit === 'per10k' || meta.unit === 'per100k') {
      if (meta.num <= 3) return 1.5;
      if (meta.num <= 8) return 0.75;
      return 0.25;
    }
    return 0.5; /* money / time ceilings */
  }
  return 0;
}

/* previous numeric target of the same unit, for required-improvement size */
function priorNum(rollout: RolloutEntry[], phase: string, unit: string): number | null {
  let bestNum: number | null = null;
  let bestIdx = -1;
  rollout.forEach(function (e) {
    if (pIdx(e.phase) >= pIdx(phase)) return;
    const pn = parseNum(e.value);
    if (pn && pn.unit === unit && pIdx(e.phase) > bestIdx) {
      bestNum = pn.num;
      bestIdx = pIdx(e.phase);
    }
  });
  return bestNum;
}
function steepnessBump(meta: NumMeta, prev: number | null): number {
  if (prev === null || prev === 0) return 0;
  const rel = Math.abs(meta.num - prev) / Math.abs(prev);
  if (rel >= 0.3) return 1;
  if (rel >= 0.15) return 0.5;
  return 0;
}
function statusUncertain(p: QualityParameter): boolean {
  const s = ((p.status || '') + ' ' + (p.unitStatus || '')).toLowerCase();
  return /required|inferred|to be|baseline\/acceptance|calibration required/.test(s);
}

function probabilityForRow(p: QualityParameter, e: RolloutEntry): { score: number; basis: string; assessed: boolean } {
  const meta = parseNum(e.value);
  if (!meta) {
    /* qualitative ladder rung: the number itself was deferred */
    return { score: 3, basis: 'Deferred numeric target: occurrence proxied at moderate; a controlled number is required to assess it properly.', assessed: false };
  }
  let score = PROB_BASELINE;
  const parts: string[] = ['baseline ' + PROB_BASELINE];
  const sb = stringencyBump(meta);
  if (sb) { score += sb; parts.push('target stringency +' + sb); }
  const prev = priorNum(p.rollout, e.phase, meta.unit);
  const st = steepnessBump(meta, prev);
  if (st) { score += st; parts.push('required step-up +' + st); }
  if (statusUncertain(p)) { score += 0.5; parts.push('not yet calibrated +0.5'); }
  if (e.phase === 'P0' || e.phase === 'P1') { score += 1; parts.push('unproven foundation system +1'); }
  else if (e.phase === 'P2') { score += 0.5; parts.push('first live operation +0.5'); }
  return { score: clampScore(score), basis: parts.join(', '), assessed: true };
}

/* R274: the reachable ends of the occurrence scale, derived from the two
   things that produce a score - the phase-target construction above, whose
   floor is the baseline with no bump, and the borrowed CP grades. Nothing
   types "2" anywhere; the published scale and the chart both read this. */
export const PROBABILITY_CEILING = 5;
export const PROBABILITY_FLOOR = Math.min(
  clampScore(PROB_BASELINE),
  Math.min.apply(null, Object.keys(CONF_TO_OCC).map(function (k) { return CONF_TO_OCC[k]; }))
);
/* The published wording for each occurrence score, declared over the whole
   1..5 grid so a score leaving the reachable range stops being published
   without its definition being deleted - and so the page renders the scale
   the model can produce rather than a list typed beside it. */
export const PROBABILITY_SCALE: Record<number, string> = {
  5: 'Almost certain: a near-perfect target on an unproven foundation system.',
  4: 'Likely: a stringent target demanding a large step-up in one phase.',
  3: 'Possible: a tight but incremental target on a system in operation.',
  2: 'Unlikely: routine headroom on an established rail.',
  1: 'Rare: a settled target on a system already running at the level required.'
};

/* ---- Consequence (severity, 1-5) --------------------------------------
 * Severity is the harm if the target is missed, scaled by three things:
 *   - the domain harm ceiling of the effect class,
 *   - whether the parameter is a system outcome (KPP) or a technical
 *     enabler (TPP): a missed technical interim target is usually a repair,
 *     not direct harm, unless the domain is itself harmful (safety, cyber,
 *     medication),
 *   - the rollout phase: an early pilot reaches few people (small blast
 *     radius) while a missed national or mature target reaches everyone.
 * A gate floor missed at the phase it binds adds one: it halts a wave. */
const TOP_CLASSES: Record<string, boolean> = { safety: true, coverage: true, medication: true, fiscal: true };
const DIRECT_HARM_CLASSES: Record<string, boolean> = { safety: true, cyber: true, medication: true };
function consequenceForRow(p: QualityParameter, cls: EffectClass, e: RolloutEntry | null): { score: number; basis: string } {
  const parts: string[] = [];

  if (p.type === 'CP') {
    let base = cls.severity;
    parts.push(cls.label.toLowerCase() + ' domain ' + cls.severity);
    const role = (p.modelRole || '').toLowerCase();
    if (/derived output/.test(role)) { parts.push('derived headline output, full domain'); }
    else if (/input/.test(role)) { base -= 2; parts.push('single input line -2'); }
    else { base -= 1; parts.push('state or ledger line -1'); }
    const s = Math.max(2, clampScore(base));
    return { score: s, basis: parts.join(', ') };
  }

  let base = cls.severity;
  parts.push(cls.label.toLowerCase() + ' ceiling ' + cls.severity);
  if (p.type === 'TPP' && !DIRECT_HARM_CLASSES[cls.key]) {
    base -= 1;
    parts.push('technical enabler -1');
  }
  let adj = 0;
  if (e) {
    if (e.phase === 'P0' || e.phase === 'P1') adj = -1;
    else if (e.phase === 'P2') adj = -0.5;
    else if (e.phase === 'P3' || e.phase === 'P4') adj = -0.25;
  }
  if (adj) parts.push('phase blast radius ' + adj);
  let score = base + adj;
  const floor = TOP_CLASSES[cls.key] ? 3 : 1;
  if (score < floor) { score = floor; parts.push('floored at ' + floor); }
  const gate = GATE_OF_PARAM[p.id];
  if (gate && e && e.phase === GATE_BIND_PHASE[gate]) {
    score += 1;
    parts.push('gate ' + gate + ' go/no-go +1');
  }
  return { score: clampScore(score), basis: parts.join(', ') };
}

/* ---- Detectability (1 easy .. 5 hidden) -> risk priority number -------- */
function detectability(p: QualityParameter): { score: number; basis: string } {
  let score = 3;
  const parts: string[] = ['baseline 3'];
  if (/12\.4/.test(p.id)) { score -= 1; parts.push('published on a timeliness clock -1'); }
  if ((p.datasets || '').trim()) { score -= 1; parts.push('named datasets -1'); }
  else if (p.type === 'CP') { score += 1; parts.push('no dataset contract +1'); }
  if ((p.ownerVerifier || '').indexOf('/') >= 0) { score -= 0.5; parts.push('independent verifier -0.5'); }
  return { score: clampScore(score), basis: parts.join(', ') };
}

/* ---- Effect narrative ------------------------------------------------- */
function effectText(p: QualityParameter, cls: EffectClass, e: RolloutEntry | null): string {
  const anchor = e ? (PHASE_ANCHOR[e.phase] || e.phase) : '';
  const when = e ? ('At ' + e.phase + ' (' + anchor + '), ') : '';
  const val = e ? e.value : p.target;
  const name = p.name.charAt(0).toLowerCase() + p.name.slice(1);
  const gate = GATE_OF_PARAM[p.id];
  const gateTail = gate
    ? ' Because this floor gates ' + gate + ' (' + (GATE_NAME[gate] || 'a phase gate') + '), a miss holds the whole rollout wave until it is repaired.'
    : '';
  switch (cls.key) {
    case 'safety':
      return when + 'if ' + name + ' misses ' + val + ', avoidable clinical harm reaches patients before the shortfall is corrected.' + gateTail;
    case 'coverage':
      return when + 'if ' + name + ' misses ' + val + ', people lose continuous coverage or financial protection and face care they cannot afford.' + gateTail;
    case 'medication':
      return when + 'if ' + name + ' misses ' + val + ', patients lose continuity of medicines or supplies during the migration.' + gateTail;
    case 'continuity':
      return when + 'if ' + name + ' misses ' + val + ', active treatment or records break as people move between systems.' + gateTail;
    case 'cyber':
      return when + 'if ' + name + ' misses ' + val + ', the shared record or rail becomes unreliable and every dependent operation inherits the defect.' + gateTail;
    case 'payment':
      return when + 'if ' + name + ' misses ' + val + ', clinicians, pharmacies and hospitals go unpaid or mispaid and provider liquidity is threatened.' + gateTail;
    case 'access':
      return when + 'if ' + name + ' misses ' + val + ', people cannot reach staffed care within the access standard and demand backs up.' + gateTail;
    case 'rights':
      return when + 'if ' + name + ' misses ' + val + ', appeals, explanations or equity protections fail and public legitimacy erodes.' + gateTail;
    case 'workforce':
      return when + 'if ' + name + ' misses ' + val + ', staffing and training cannot support the care the benefit promises.' + gateTail;
    case 'fiscal':
      return when + 'if ' + name + ' misses ' + val + ', dedicated revenue or reserves fall short and the system\'s solvency margin narrows.' + gateTail;
    case 'governance':
      return when + 'if ' + name + ' misses ' + val + ', oversight, transition or public reporting duties lapse and problems go unseen.' + gateTail;
    case 'innovation':
      return when + 'if ' + name + ' misses ' + val + ', the training and research pipeline that replaces monopoly-priced innovation runs behind schedule.' + gateTail;
    case 'calibration':
      return 'If ' + name + ' is never calibrated or lands outside its controlled range, the cost and scorekeeping model that certifies the system is built on an unverified quantity.';
    default:
      return when + 'if ' + name + ' misses ' + val + ', the phase objective is not met.';
  }
}

/* ---- Where the scored value came from (R272) --------------------------
 * applyEquationTargets replaces only 'derived interim target' rows, and marks
 * each one it replaces by rewriting its kind to 'equation-derived target'.
 * Every other rollout kind is carried out of the catalog verbatim: committed
 * progression floors, phase milestones, data-plan interim targets and maturity
 * targets, all declared in AUTHORITATIVE_KINDS because the equation layer is
 * required to leave them alone.
 *
 * Both sets land in one criticality ranking and are compared directly. So a
 * correction inside the equation layer moves part of the ranking and leaves
 * the rest exactly where it was - R226 was such a correction, and it moved 538
 * of the 727 phase-target rows while the other 189 did not move at all. The
 * ranking is this chapter's whole product, so the split is published rather
 * than left for a reader to infer from a `kind` string. */
export const EQUATION_DERIVED_KIND = 'equation-derived target';
export type TargetProvenance = 'equation' | 'committed' | 'calibration';
function provenanceOf(kind: string): TargetProvenance {
  return kind === EQUATION_DERIVED_KIND ? 'equation' : 'committed';
}

/* ---- FMEA record shape ------------------------------------------------ */
export interface FmeaRecord {
  id: string;
  paramId: string;
  paramType: 'KPP' | 'TPP' | 'CP';
  paramName: string;
  concept: string;
  family: string;
  phase: string;          // P0..P8, or 'calibration' for CP
  phaseAnchor: string;
  targetKind: string;
  targetProvenance: TargetProvenance;  // R272: equation-recomputed or carried verbatim
  target: string;         // the phase-target value that must be met
  gate: string | null;
  failureMode: string;
  effectClass: string;    // key
  effectClassLabel: string;
  effect: string;
  probability: number;
  probabilityBasis: string;
  probabilityAssessed: boolean;
  consequence: number;
  consequenceBasis: string;
  detect: number;
  detectBasis: string;
  risk: number;           // probability x consequence
  rpn: number;            // consequence x probability x detectability
  band: Band;
  tier: string;
  needsNewParam: boolean;
  newParamNote: string;
}

const RECORDS: FmeaRecord[] = [];

QUALITY_DATA.parameters.forEach(function (p) {
  const cls = EFFECT_CLASSES[effectClassFor(p)];
  const gate = GATE_OF_PARAM[p.id] || null;

  if (p.type === 'CP') {
    /* one calibration-tolerance failure mode per cost parameter */
    const conf = familyConfidence(p.family);
    const assessed = conf != null;
    const cons = consequenceForRow(p, cls, null);
    const det = detectability(p);
    if (assessed) {
      const prob = CONF_TO_OCC[conf];
      const band = bandFor(cons.score, prob);
      RECORDS.push({
        id: 'FM-' + p.id, paramId: p.id, paramType: 'CP', paramName: p.name,
        concept: p.concept, family: p.family, phase: 'calibration',
        phaseAnchor: 'calibration', targetKind: 'calibration control',
        targetProvenance: 'calibration',
        target: p.target, gate: gate,
        failureMode: 'Value never calibrated, or calibrated outside the controlled range.',
        effectClass: cls.key, effectClassLabel: cls.label, effect: effectText(p, cls, null),
        probability: prob,
        probabilityBasis: 'No native likelihood attribute on the cost parameter; occurrence read from the weakest confidence grade among the simulation parameters that calibrate the ' + p.family + ' ledger: ' + familyInputLabel(p.family) + '. Weakest is ' + conf + ', which maps to ' + prob + '.',
        probabilityAssessed: false,
        consequence: cons.score, consequenceBasis: cons.basis,
        detect: det.score, detectBasis: det.basis,
        risk: prob * cons.score, rpn: cons.score * prob * det.score,
        band: band, tier: BAND_META[band].tier,
        needsNewParam: true,
        newParamNote: 'Cost parameters carry no controlled likelihood attribute. Occurrence had to be borrowed from the simulation layer; a native calibration-confidence parameter on the ' + p.family + ' family would let this be assessed inside the controlled catalog.'
      });
    } else {
      RECORDS.push({
        id: 'FM-' + p.id, paramId: p.id, paramType: 'CP', paramName: p.name,
        concept: p.concept, family: p.family, phase: 'calibration',
        phaseAnchor: 'calibration', targetKind: 'calibration control',
        targetProvenance: 'calibration',
        target: p.target, gate: gate,
        failureMode: 'Value never calibrated, or calibrated outside the controlled range.',
        effectClass: cls.key, effectClassLabel: cls.label, effect: effectText(p, cls, null),
        probability: 0,
        probabilityBasis: 'Unassessable: the ' + p.family + ' ledger has no phase target and no sampled parameter of its own in the simulation, so nothing in either layer supplies a likelihood signal to borrow.',
        probabilityAssessed: false,
        consequence: cons.score, consequenceBasis: cons.basis,
        detect: det.score, detectBasis: det.basis,
        risk: 0, rpn: 0, band: 'low', tier: 'Unassessed',
        needsNewParam: true,
        newParamNote: 'A new controlled calibration-confidence parameter is required before probability can be assessed.'
      });
    }
    return;
  }

  /* KPP / TPP: one failure mode per phase target */
  p.rollout.forEach(function (e) {
    const prob = probabilityForRow(p, e);
    const cons = consequenceForRow(p, cls, e);
    const det = detectability(p);
    const band = bandFor(cons.score, prob.score);
    const isGateRow = gate && e.phase === GATE_BIND_PHASE[gate];
    RECORDS.push({
      id: 'FM-' + p.id + '-' + e.phase,
      paramId: p.id, paramType: p.type as 'KPP' | 'TPP', paramName: p.name,
      concept: p.concept, family: p.id.match(/^(KPP-[A-Z]+|TPP-[0-9]+|TPP-[A-Z]+)/) ? p.id.match(/^(KPP-[A-Z]+|TPP-[0-9]+|TPP-[A-Z]+)/)![0] : p.id,
      phase: e.phase, phaseAnchor: PHASE_ANCHOR[e.phase] || e.phase,
      targetKind: e.kind, targetProvenance: provenanceOf(e.kind), target: e.value,
      gate: isGateRow ? gate : (gate || null),
      failureMode: 'Phase target not met: ' + e.value + ' at ' + e.phase + '.',
      effectClass: cls.key, effectClassLabel: cls.label, effect: effectText(p, cls, e),
      probability: prob.score, probabilityBasis: prob.basis, probabilityAssessed: prob.assessed,
      consequence: cons.score, consequenceBasis: cons.basis,
      detect: det.score, detectBasis: det.basis,
      risk: prob.score * cons.score, rpn: cons.score * prob.score * det.score,
      band: band, tier: BAND_META[band].tier,
      needsNewParam: !prob.assessed,
      newParamNote: !prob.assessed
        ? 'The framework deliberately deferred this numeric target, so its occurrence cannot be assessed from a real number. A calibrated target adopted by the scorekeeping board is the missing parameter.'
        : ''
    });
  });
});

RECORDS.sort(function (a, b) {
  return b.risk - a.risk || b.consequence - a.consequence || b.probability - a.probability;
});

/* ---- Aggregates for the tab ------------------------------------------
 * Phase-target failures (KPP/TPP) and cost-parameter calibration failures
 * are kept on separate charts: the CP occurrence axis is borrowed from the
 * simulation layer, not native to the controlled catalog, so it should not
 * share a matrix with the phase-target failures. */
interface MatrixAgg { matrix: number[][]; bands: Record<Band, number>; assessed: number; }
function buildMatrix(recs: FmeaRecord[]): MatrixAgg {
  const m: number[][] = [];
  for (let c = 1; c <= 5; c++) { m[c] = [0, 0, 0, 0, 0, 0]; }
  const bands: Record<Band, number> = { extreme: 0, high: 0, moderate: 0, low: 0 };
  let assessed = 0;
  recs.forEach(function (r) {
    if (r.probability >= 1 && r.probability <= 5 && r.risk > 0) {
      m[r.consequence][r.probability] += 1;
      bands[r.band] += 1;
      assessed += 1;
    }
  });
  return { matrix: m, bands: bands, assessed: assessed };
}
const PRIMARY = RECORDS.filter(function (r) { return r.paramType !== 'CP'; });
const CP_RECS = RECORDS.filter(function (r) { return r.paramType === 'CP'; });
const P_AGG = buildMatrix(PRIMARY);
const C_AGG = buildMatrix(CP_RECS);

/* R272: the provenance split of the ranked set, and the kinds it was built
   from, so the page can state the mix and a check can compare it with the
   equation layer's own declaration rather than a list retyped here. */
const EQUATION_ROWS = PRIMARY.filter(function (r) { return r.targetProvenance === 'equation'; });
const COMMITTED_ROWS = PRIMARY.filter(function (r) { return r.targetProvenance === 'committed'; });
export function committedKindCounts(): { kind: string; rows: number }[] {
  const byKind: Record<string, number> = {};
  COMMITTED_ROWS.forEach(function (r) { byKind[r.targetKind] = (byKind[r.targetKind] || 0) + 1; });
  return Object.keys(byKind).sort().map(function (k) { return { kind: k, rows: byKind[k] }; });
}
/* A carried-forward row whose kind the equation layer never promised to leave
   alone: either a new kind arrived, or applyEquationTargets stopped rewriting
   one it used to. Both make the provenance label wrong, silently. */
export function undeclaredCommittedKinds(): string[] {
  return committedKindCounts()
    .filter(function (c) { return !AUTHORITATIVE_KINDS[c.kind]; })
    .map(function (c) { return c.kind; });
}
/* R275: the family -> simulation-parameter mapping, checked both directions.
 *
 * Undeclared: a sampled parameter no family claims and SYSTEM_WIDE_PARAMS does
 *   not exempt. Somebody added a cost line and nothing here noticed.
 * Unknown: an id in the mapping that no longer resolves in params.ts. A typo,
 *   or a rename, and the family silently loses that input from its grade.
 * Ungraded: a mapped parameter carrying no confidence grade at all, which
 *   would make the borrowed occurrence quietly weaker than it looks.
 * Uncovered: a CP family in the catalog with no entry in the mapping. A new
 *   ledger family would otherwise be scored unassessable by accident rather
 *   than by a decision.
 * Unmapped grade: a grade in use with no occurrence score, which used to
 *   produce `undefined` and land in the matrix as NaN. */
export function cpConfidenceWiring(): {
  undeclared: string[]; unknown: string[]; ungraded: string[];
  uncovered: string[]; unmappedGrades: string[];
} {
  const claimed: Record<string, boolean> = {};
  const unknown: string[] = [];
  const ungraded: string[] = [];
  Object.keys(CP_FAMILY_MODEL_INPUTS).forEach(function (fam) {
    CP_FAMILY_MODEL_INPUTS[fam].forEach(function (id) {
      claimed[id] = true;
      const def = PARAMS_BY_ID[id];
      if (!def) { unknown.push(fam + ':' + id); return; }
      if (!def.confidence) ungraded.push(fam + ':' + id);
    });
  });
  SYSTEM_WIDE_PARAMS.forEach(function (id) {
    claimed[id] = true;
    if (!PARAMS_BY_ID[id]) unknown.push('SYSTEM_WIDE:' + id);
  });
  const undeclared = PARAM_DEFS
    .map(function (d) { return d.id; })
    .filter(function (id) { return !claimed[id]; });
  const uncovered = (QUALITY_DATA.cpFamilies || [])
    .map(function (f) { return f.id; })
    .filter(function (id) { return CP_FAMILY_MODEL_INPUTS[id] === undefined; });
  const unmappedGrades = Array.from(new Set(
    PARAM_DEFS
      .map(function (d) { return d.confidence || ''; })
      .filter(function (g) { return g && CONF_TO_OCC[g] === undefined; })
  ));
  return {
    undeclared: undeclared, unknown: unknown, ungraded: ungraded,
    uncovered: uncovered, unmappedGrades: unmappedGrades
  };
}

/* R275: what each family's borrowed occurrence resolved to, for the page and
   for the log entry. A family with a null grade is the unassessable case. */
export function cpFamilyConfidence(): {
  id: string; grade: string | null; occurrence: number; inputs: string[];
}[] {
  return (QUALITY_DATA.cpFamilies || []).map(function (f) {
    const grade = familyConfidence(f.id);
    return {
      id: f.id,
      grade: grade,
      occurrence: grade === null ? 0 : CONF_TO_OCC[grade],
      inputs: (CP_FAMILY_MODEL_INPUTS[f.id] || []).slice()
    };
  });
}

/* R274: the occurrence scores the model actually produces, so the declared
   floor can be compared with the reached one. A floor nobody reaches is the
   same false statement as an unreachable band, one column further in. */
export function probabilityScaleReach(): {
  floor: number; ceiling: number; unreached: number[]; unlabelled: number[];
} {
  const scored = RECORDS.filter(function (r) { return r.risk > 0; });
  const seen: Record<number, boolean> = {};
  scored.forEach(function (r) { seen[r.probability] = true; });
  const values = scored.map(function (r) { return r.probability; });
  const unreached: number[] = [];
  const unlabelled: number[] = [];
  for (let p = PROBABILITY_FLOOR; p <= PROBABILITY_CEILING; p++) {
    if (!seen[p]) unreached.push(p);
    if (!PROBABILITY_SCALE[p]) unlabelled.push(p);
  }
  return {
    floor: values.length ? Math.min.apply(null, values) : 0,
    ceiling: values.length ? Math.max.apply(null, values) : 0,
    unreached: unreached,
    unlabelled: unlabelled
  };
}

/* The phase ordering priorNum compares against, checked against the one
   phase->year definition rather than assumed (R251, R272). */
export function phaseOrderDrift(): string[] {
  const problems: string[] = [];
  for (let i = 1; i < PHASE_ORDER.length; i++) {
    const prev = PHASE_ORDER[i - 1], cur = PHASE_ORDER[i];
    if (!(PHASE_YEAR[prev] < PHASE_YEAR[cur])) {
      problems.push(prev + ' (year ' + PHASE_YEAR[prev] + ') not before ' +
        cur + ' (year ' + PHASE_YEAR[cur] + ')');
    }
  }
  QUALITY_DATA.phases.forEach(function (ph) {
    if (pIdx(ph.id) < 0) problems.push(ph.id + ' is in the catalog but not in PHASE_YEAR');
  });
  return problems;
}

/* headline groupings the brief asks for, over the phase-target set */
const mostProbable = PRIMARY.filter(function (r) { return r.probability === 5 && r.risk > 0; });
const mostConsequential = PRIMARY.filter(function (r) { return r.consequence === 5 && r.risk > 0; });
const both = PRIMARY.filter(function (r) { return r.probability === 5 && r.consequence === 5; });

/* per-family CP calibration-risk summary for the CP panel */
const cpFamilyRisk = (QUALITY_DATA.cpFamilies || []).map(function (f) {
  const recs = CP_RECS.filter(function (r) { return r.family === f.id; });
  const bands: Record<Band, number> = { extreme: 0, high: 0, moderate: 0, low: 0 };
  let worst: Band = 'low';
  recs.forEach(function (r) {
    bands[r.band] += 1;
    if (BAND_META[r.band].order < BAND_META[worst].order) worst = r.band;
  });
  return { id: f.id, domain: f.domain, records: f.records, worst: worst, bands: bands };
});

/* parameter gaps: where probability could not be assessed */
const deferredTargets = RECORDS.filter(function (r) { return r.paramType !== 'CP' && r.needsNewParam; });
const deferredParamIds = Array.from(new Set(deferredTargets.map(function (r) { return r.paramId; })));
const cpFamilyGaps = (QUALITY_DATA.cpFamilies || []).map(function (f) {
  return {
    id: f.id, domain: f.domain, records: f.records,
    proposed: f.id + '-RISK',
    note: 'Native calibration-confidence attribute for the ' + f.id + ' ledger (' + f.records + ' records) so occurrence is controlled rather than borrowed.'
  };
});

export const FMEA_DATA = {
  records: RECORDS,
  counts: {
    total: RECORDS.length,
    kpptpp: PRIMARY.length,
    cp: CP_RECS.length,
    assessed: P_AGG.assessed,
    cpAssessed: C_AGG.assessed,
    extreme: P_AGG.bands.extreme, high: P_AGG.bands.high,
    moderate: P_AGG.bands.moderate, low: P_AGG.bands.low,
    cpExtreme: C_AGG.bands.extreme, cpHigh: C_AGG.bands.high,
    cpModerate: C_AGG.bands.moderate, cpLow: C_AGG.bands.low,
    /* R272: how the ranked phase-target set splits by where its value came from */
    equationDerived: EQUATION_ROWS.length,
    committed: COMMITTED_ROWS.length
  },
  committedKinds: committedKindCounts(),
  matrix: P_AGG.matrix,        // KPP/TPP phase-target failures
  cpMatrix: C_AGG.matrix,      // CP calibration failures (borrowed occurrence)
  bandMeta: BAND_META,
  effectClasses: EFFECT_CLASSES,
  phases: QUALITY_DATA.phases,
  concepts: QUALITY_DATA.concepts,
  gates: QUALITY_DATA.gates,
  mostProbable: mostProbable,
  mostConsequential: mostConsequential,
  both: both,
  cpFamilyRisk: cpFamilyRisk,
  gaps: {
    deferredTargets: deferredTargets,
    deferredParamIds: deferredParamIds,
    cpFamilies: cpFamilyGaps
  }
};

/* ---- Self-tests -------------------------------------------------------
 * Registered in selftests.ts; a failure fails the build via the
 * astro:build:start gate in astro.config.mjs (R152, R273). */
export function fmeaSelfTests(): { ok: boolean; messages: string[] } {
  const msgs: string[] = [];
  let ok = true;
  function check(cond: boolean, msg: string) { if (!cond) { ok = false; msgs.push('FAIL: ' + msg); } }

  /* every KPP/TPP phase-target row produced exactly one record */
  let expectedRows = 0;
  QUALITY_DATA.parameters.forEach(function (p) {
    if (p.type === 'CP') { expectedRows += 1; return; }
    expectedRows += p.rollout.length;
  });
  check(RECORDS.length === expectedRows,
    'record count ' + RECORDS.length + ' matches phase-target + CP rows ' + expectedRows);

  /* scores in range */
  RECORDS.forEach(function (r) {
    check(r.consequence >= 1 && r.consequence <= 5, r.id + ' consequence in 1..5');
    check(r.probability >= 0 && r.probability <= 5, r.id + ' probability in 0..5');
  });

  /* every assessed record has a band consistent with the grid */
  RECORDS.forEach(function (r) {
    if (r.risk > 0) {
      check(bandFor(r.consequence, r.probability) === r.band, r.id + ' band matches grid');
    }
  });

  /* each matrix total equals its assessed count */
  let mtot = 0, cptot = 0;
  for (let c = 1; c <= 5; c++) for (let pr = 1; pr <= 5; pr++) {
    mtot += P_AGG.matrix[c][pr];
    cptot += C_AGG.matrix[c][pr];
  }
  check(mtot === P_AGG.assessed, 'phase-target matrix total ' + mtot + ' equals assessed ' + P_AGG.assessed);
  check(cptot === C_AGG.assessed, 'CP matrix total ' + cptot + ' equals CP assessed ' + C_AGG.assessed);
  check(mtot + cptot === RECORDS.filter(function (r) { return r.risk > 0; }).length, 'the two matrices partition the scored records');

  /* the both-critical set is exactly the top-right red cell of the phase-target chart */
  check(both.length === P_AGG.matrix[5][5], 'both-critical count equals phase-target matrix[5][5]');

  /* every record carries a non-empty effect */
  RECORDS.forEach(function (r) { check(!!r.effect && r.effect.length > 10, r.id + ' has an effect narrative'); });

  /* R272: every ranked phase-target row carries a provenance label. The two
     halves are compared against the equation layer's own declaration by a
     separate registered row, so a failure there names that invariant. */
  check(EQUATION_ROWS.length + COMMITTED_ROWS.length === PRIMARY.length,
    'provenance split ' + EQUATION_ROWS.length + ' + ' + COMMITTED_ROWS.length +
    ' covers all ' + PRIMARY.length + ' phase-target records');

  return { ok: ok, messages: msgs };
}

/* R273 [§S0]: this used to run here and call console.error, which is why the
   header's "self-tests must pass at build time" was not true. The call now
   belongs to selftests.ts, which registers it as a named row and lets the
   build gate in astro.config.mjs refuse the build (R152).

   It is registered rather than thrown at import time deliberately: a
   module-level throw fails before the row can be reported, which is the
   "no self-test section at all" failure mode R154 exists to prevent. The gate
   names the broken invariant instead. */
