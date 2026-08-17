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

/* ---- Phase order and anchors ----------------------------------------- */
const PHASE_ORDER = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
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

/* ---- CP calibration confidence imported from the simulation layer ------
 * Cost parameters carry no phase target and no native likelihood attribute.
 * The only likelihood signal available is the confidence grade of the
 * modeled quantity each CP family calibrates (see params.ts). We map that
 * grade to an occurrence score. Where a family has no modeled analogue the
 * occurrence is unassessable and the FMEA reports a parameter gap instead
 * of guessing. */
const CP_FAMILY_CONFIDENCE: Record<string, 'low' | 'medium' | 'high'> = {
  'CP-TOT': 'medium', 'CP-POP': 'high', 'CP-CLM': 'medium', 'CP-HOSP': 'medium',
  'CP-CLIN': 'medium', 'CP-UNIT': 'low', 'CP-LTC': 'low', 'CP-RX': 'medium',
  'CP-DX': 'medium', 'CP-BH': 'medium', 'CP-DVH': 'medium', 'CP-EMS': 'medium',
  'CP-PH': 'medium', 'CP-IT': 'low', 'CP-GOV': 'medium', 'CP-RD': 'medium',
  'CP-EDU': 'medium', 'CP-TRN': 'low', 'CP-FIN': 'medium', 'CP-OFF': 'medium'
};
const CONF_TO_OCC: Record<string, number> = { low: 4, medium: 3, high: 2 };

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
 * the foundation phases where systems are unproven. */
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
  let score = 1.5;
  const parts: string[] = ['baseline 1.5'];
  const sb = stringencyBump(meta);
  if (sb) { score += sb; parts.push('target stringency +' + sb); }
  const prev = priorNum(p.rollout, e.phase, meta.unit);
  const st = steepnessBump(meta, prev);
  if (st) { score += st; parts.push('required step-up +' + st); }
  if (statusUncertain(p)) { score += 0.5; parts.push('not yet calibrated +0.5'); }
  if (e.phase === 'P0' || e.phase === 'P1') { score += 1; parts.push('unproven foundation system +1'); }
  else if (e.phase === 'P2') { score += 0.5; parts.push('first live operation +0.5'); }
  const clamped = Math.max(1, Math.min(5, Math.round(score)));
  return { score: clamped, basis: parts.join(', '), assessed: true };
}

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
    const s = Math.max(2, Math.min(5, Math.round(base)));
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
  const clamped = Math.max(1, Math.min(5, Math.round(score)));
  return { score: clamped, basis: parts.join(', ') };
}

/* ---- Detectability (1 easy .. 5 hidden) -> risk priority number -------- */
function detectability(p: QualityParameter): { score: number; basis: string } {
  let score = 3;
  const parts: string[] = ['baseline 3'];
  if (/12\.4/.test(p.id)) { score -= 1; parts.push('published on a timeliness clock -1'); }
  if ((p.datasets || '').trim()) { score -= 1; parts.push('named datasets -1'); }
  else if (p.type === 'CP') { score += 1; parts.push('no dataset contract +1'); }
  if ((p.ownerVerifier || '').indexOf('/') >= 0) { score -= 0.5; parts.push('independent verifier -0.5'); }
  const clamped = Math.max(1, Math.min(5, Math.round(score)));
  return { score: clamped, basis: parts.join(', ') };
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
    const conf = CP_FAMILY_CONFIDENCE[p.family];
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
        target: p.target, gate: gate,
        failureMode: 'Value never calibrated, or calibrated outside the controlled range.',
        effectClass: cls.key, effectClassLabel: cls.label, effect: effectText(p, cls, null),
        probability: prob,
        probabilityBasis: 'No native likelihood attribute on the cost parameter; occurrence imported from the ' + conf + ' confidence grade of the ' + p.family + ' modeled quantity.',
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
        target: p.target, gate: gate,
        failureMode: 'Value never calibrated, or calibrated outside the controlled range.',
        effectClass: cls.key, effectClassLabel: cls.label, effect: effectText(p, cls, null),
        probability: 0,
        probabilityBasis: 'Unassessable: no phase target and no modeled analogue supply a likelihood signal.',
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
      targetKind: e.kind, target: e.value,
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
    cpModerate: C_AGG.bands.moderate, cpLow: C_AGG.bands.low
  },
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
