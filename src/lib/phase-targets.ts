/* Phase-target derivation for every KPP and TPP, ported verbatim from
   docs/js/phasetargets.js. Fills each KPP/TPP's rollout with a justifiable
   target at every phase it is measurable (framework anchors, data-plan
   anchors, rule-derived entry, linear interpolation between). Mutates the
   parameters in place; run once. Fidelity-critical: do not re-derive. */
import type { QualityData, QualityParameter } from './quality-data';
import type { DataPhase } from './data-phases';
import { PHASE_YEAR } from './rollout';

const PHASES = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
function pIdx(p: string): number { return PHASES.indexOf(p); }

/* ---- Framework floors carried only as prose in the source ------------- */
const EXTRA_ANCHORS: Record<string, Record<string, { value: string; why: string }>> = {
  'KPP-C5': { P7: { value: '>=98% of certified obligations',
    why: 'PR-SCH-014: maturity certification may not proceed below 98% revenue sufficiency' } },
  'KPP-C6': { P7: { value: '>=6 months of volatile revenue exposure',
    why: 'PR-SCH-014: at least six months of reserves before maturity certification' } },
  'TPP-11.5': { P5: { value: '>=97% of high-stakes AI decisions',
    why: 'PR-SCH-015: national AI-assisted routing may not deploy below 97% human-review capture' } }
};

/* ---- First phase each family is measurable, with the reason ----------- */
const REL: [RegExp, string, string][] = [
  [/^KPP-A6/, 'P6', 'worker premiums only end as national default coverage arrives'],
  [/^KPP-A7/, 'P6', 'bankruptcy effects need national coverage scale to measure'],
  [/^KPP-A/, 'P3', 'measurable from the first coverage wave'],
  [/^KPP-B/, 'P4', 'measurable from the first unit and routing pilots'],
  [/^KPP-C[123]/, 'P6', 'system-level cost ratios are meaningful only at national scale'],
  [/^KPP-C4/, 'P3', 'claims processing cost is measurable from wave-one operations'],
  [/^KPP-C/, 'P3', 'financing flows begin with the first coverage wave'],
  [/^KPP-D/, 'P4', 'clinical outcome baselines start with delivery pilots'],
  [/^KPP-E/, 'P5', 'equity stratification needs delivery scale for stable measurement'],
  [/^KPP-T2/, 'P2', 'medication continuity is at stake from the first pharmacy migration'],
  [/^KPP-T/, 'P3', 'patient migration begins with the first coverage wave'],
  [/^KPP-W1/, 'P4', 'displaced-worker cohorts appear as payer administration shrinks'],
  [/^KPP-TRUST/, 'P3', 'trust movement vs baseline is measurable once the public interacts with coverage'],
  [/^KPP-CULT/, 'P4', 'clinician culture change is measurable from delivery pilots'],
  [/^TPP-1\./, 'P1', 'identity and eligibility run in the registry foundation'],
  [/^TPP-2\./, 'P3', 'medical claims flow from the first coverage wave'],
  [/^TPP-3\./, 'P2', 'the pharmacy rail is the first live operation'],
  [/^TPP-4\./, 'P2', 'public manufacturing phase one begins'],
  [/^TPP-5\./, 'P4', 'hospital global-budget pilots begin'],
  [/^TPP-6\./, 'P4', 'unit pilots begin'],
  [/^TPP-7\./, 'P4', 'specialist backplane pilots begin'],
  [/^TPP-8\./, 'P3', 'workforce programs report from the first operating year'],
  [/^TPP-9\.7/, 'P7', 'EMS readiness standards arrive with the expanded-benefit phase'],
  [/^TPP-9\./, 'P7', 'expanded benefits launch in phase seven'],
  [/^TPP-10\./, 'P1', 'the records foundation starts with registries'],
  [/^TPP-11\.[123]/, 'P1', 'cyber and continuity duties start with the first registries'],
  [/^TPP-11\./, 'P4', 'clinical AI enters with the unit pilots'],
  [/^TPP-12\.4/, 'P0', 'public reporting duties begin with the first governing bodies'],
  [/^TPP-12\.[56]/, 'P3', 'appeals volumes begin with the first coverage wave'],
  [/^TPP-12\./, 'P1', 'oversight machinery stands up in the foundation phase'],
  [/^TPP-13\.1/, 'P4', 'priority R&D portfolios need the innovation agency operating'],
  [/^TPP-13\./, 'P2', 'innovation funding operations begin'],
  [/^TPP-LEG/, 'P3', 'denial explanations exist once claims flow'],
  [/^TPP-USE/, 'P0', 'rights notices and appeals are prototyped before live reliance'],
  [/^TPP-EMP/, 'P3', 'employer transition begins with the first coverage wave'],
  [/^TPP-REG/, 'P5', 'regional waivers begin at delivery scale'],
  [/^TPP-TRIB/, 'P1', 'tribal compacts are foundation-phase work']
];
/* R150 [§S3]: the table above ends in a fallback, and a fallback that nobody
 * enumerates is a silent identifier - the eleventh instance of that class in
 * this codebase, and the best behaved, because it at least declares itself in
 * a `why` string that reaches the reader.
 *
 * What it does not declare is WHO is on it. `_phaseStart` decides the first
 * phase a metric carries a target at, so an id that quietly lands here gets a
 * whole trajectory that starts where nobody chose. Eleven ids do, and all
 * eleven are named below rather than left to be discovered.
 *
 * They stay at P4. There is no sourced start phase for the workforce
 * sufficiency, shortage-staffing, merit-immigration or formula-registry
 * families - the rollout does not place the health-talent channel in a phase -
 * and inventing a reason per family would be the same defect in prose. What
 * changes is that the list is now declared, so a NEW metric arriving without a
 * rule fails the build instead of inheriting P4 in silence. */
export const REL_FALLBACK_PHASE = 'P4';
export const REL_FALLBACK_WHY = 'conservatively tied to the delivery-pilot phase';
export const REL_FALLBACK_IDS = [
  /* Workforce & care delivery: sufficiency, distribution and the merit
     health-talent channel. KPP-W1 has its own rule; W2 to W5 do not. */
  'KPP-W2', 'KPP-W3', 'KPP-W4', 'KPP-W5', 'TPP-W1', 'TPP-W2',
  'TPP-IMM1', 'TPP-IMM2', 'TPP-IMM3', 'TPP-IMM4',
  /* Governance: the only non-workforce id on the list. It is a data-plan
     metric, so the plan's own first phase overrides this fallback before it
     reaches a reader - it is declared because it reaches relevance(), not
     because P4 is what it ends up with. */
  'TPP-FORM1'
];

export function hasRelRule(id: string): boolean {
  return REL.some(function (rule) { return rule[0].test(id); });
}

function relevance(id: string): { phase: string; why: string } {
  for (let i = 0; i < REL.length; i++) {
    if (REL[i][0].test(id)) return { phase: REL[i][1], why: REL[i][2] };
  }
  return { phase: REL_FALLBACK_PHASE, why: REL_FALLBACK_WHY };
}

/* An id with no family rule that nobody has declared. This is the one that
   fires when a metric is added to the catalog and the REL table is not. */
export function undeclaredRelevanceFallbacks(Q: QualityData): string[] {
  const declared = new Set(REL_FALLBACK_IDS);
  return Q.parameters
    .filter(function (p) { return p.type !== 'CP'; })
    .map(function (p) { return p.id; })
    .filter(function (id) { return !hasRelRule(id) && !declared.has(id); })
    .sort();
}

/* The reverse: a declared id that has since gained a rule, or left the
   catalog. Keeps the list from outliving what it describes. */
export function staleRelevanceFallbacks(Q: QualityData): string[] {
  const live = new Set(
    Q.parameters.filter(function (p) { return p.type !== 'CP'; })
      .map(function (p) { return p.id; })
  );
  return REL_FALLBACK_IDS.filter(function (id) {
    return !live.has(id) || hasRelRule(id);
  }).sort();
}

/* ---- Numeric parsing + formatting ------------------------------------- */
function stripTemporal(s: string): string {
  return s.replace(/\s*\b(by|at)\s+(maturity|phase\s*8|ph-?p?8|p8)\b/ig, '')
          .replace(/\s{2,}/g, ' ').trim();
}
export interface NumMeta { num: number; cmp: '>=' | '<=' | null; unit: string; decimals: number; comma: boolean; }
/* returns {num, cmp:'>='|'<=', unit, decimals} or null */
export function parseNum(str: string | undefined): NumMeta | null {
  if (!str) return null;
  const m = str.match(/(median\s*)?(>=|<=|≥|≤)?\s*\$?([\d][\d,]*(?:\.\d+)?)/);
  if (!m) return null;
  const raw = m[3], num = parseFloat(raw.replace(/,/g, ''));
  if (!isFinite(num)) return null;
  const cmp: '>=' | '<=' | null = /≥|>=/.test(m[2] || '') ? '>=' : (/≤|<=/.test(m[2] || '') ? '<=' : null);
  let unit = 'plain';
  if (/%/.test(str)) unit = '%';
  else if (/per 100,000/.test(str)) unit = 'per100k';
  else if (/per 10,000/.test(str)) unit = 'per10k';
  else if (/hours/.test(str)) unit = 'hours';
  else if (/months/.test(str)) unit = 'months';
  else if (/days/.test(str)) unit = 'days';
  else if (/\$/.test(str)) unit = 'money';
  else if (/percentage points/.test(str)) unit = 'pp';
  const decimals = /\.\d/.test(raw) ? (raw.split('.')[1] || '').length : 0;
  const comma = /,/.test(raw);
  return { num: num, cmp: cmp, unit: unit, decimals: decimals, comma: comma };
}
/* re-render a template string with the first numeric token replaced */
export function withNum(template: string, num: number, meta: NumMeta): string {
  const t = stripTemporal(template);
  let txt: string;
  if (meta.comma || num >= 1000) txt = Math.round(num).toLocaleString('en-US');
  else if (meta.decimals) txt = num.toFixed(meta.decimals);
  else txt = (num % 1 === 0) ? String(Math.round(num)) : num.toFixed(1);
  return t.replace(/([\d][\d,]*(?:\.\d+)?)/, txt);
}

/* Entry-floor magnitude for a maturity value with no interior anchor.
 *
 * R147 [§S3] filed these thirteen constants as unsourced numbers setting the
 * starting floor of ~94 public metric trajectories. Measured, they set none of
 * them. Every row this function contributes to is tagged 'derived interim
 * target', and equations.ts replaces every row carrying that kind with an
 * equation value - all 538 of them, survivor count 0 (R228, R248).
 *
 * Proven rather than argued: replacing this whole function with `meta.num *
 * 0.137` changes 0 of the 727 published rows. The constants are a SCAFFOLD -
 * they give each phase a plausible row to exist at, and the row's value is
 * overwritten before a reader sees it.
 *
 * They are kept rather than deleted because the scaffold is load-bearing: the
 * entry anchor is what lets the interpolation below bracket the phases between
 * the start phase and the first committed anchor. Without it those rows are
 * never created, and the published count drops from 727. What a registry entry
 * would document here is the shape of a placeholder, not the source of a
 * number - so R147 closes as a measurement, not as thirteen citations.
 *
 * The inertness is pinned in tests/lib/phase-targets.test.ts. If an equation
 * is ever lost or evaluates non-finite at a published phase, one of these
 * numbers becomes visible, and that test is what says so. */
function entryNum(meta: NumMeta): number {
  const M = meta.num, isMax = meta.cmp !== '<=';
  if (isMax) {
    if (meta.unit === '%') return M - Math.min(10, Math.max(0.5, (100 - M) * 4));
    if (meta.unit === 'months') return Math.max(1, Math.round(M / 4));
    if (meta.unit === 'pp') return M * 0.3;
    return M * 0.25; /* counts */
  }
  switch (meta.unit) {
    case '%': return Math.min(M * 5, M + 20);
    case 'per10k': case 'per100k': return M * 2.7;
    case 'hours': case 'days': case 'months': return M * 2;
    case 'money': return M * 2;
    case 'pp': return M * 4;
    default: return M * 1.25; /* bare ratios like 1.10 */
  }
}

const QUAL_LADDER = [
  'baseline measurement established and published',
  'improvement trend vs baseline demonstrated',
  'numeric target calibrated and adopted by NHASB',
  'calibrated target certified at maturity'
];

interface Anchor { num: number; source: string; value: string; why?: string; }

function finalize(p: QualityParameter, relPhase: string, relWhy: string): void {
  p.rollout.sort(function (a, b) { return pIdx(a.phase) - pIdx(b.phase); });
  p._phaseStart = relPhase;
  p.phaseNote = 'Targets shown for every phase from ' + relPhase + ' onward (' +
    relWhy + '). Specified floors and gate values are authoritative; ' +
    'data-plan entries reuse the Data tab\'s methodology; entries marked ' +
    'derived interpolate between those anchors and the maturity target.';
}

/* ---- Enrich every KPP/TPP -------------------------------------------- */
export function applyPhaseTargets(Q: QualityData, D: DataPhase[]): void {
  if (!Q || !Q.parameters) return;
  if ((Q as { __enriched?: boolean }).__enriched) return;
  (Q as { __enriched?: boolean }).__enriched = true;

  /* ---- Data-plan overrides: id -> phase -> {value, basis, justification} */
  const dp: Record<string, Record<string, { value: string; basis: string; justification: string }>> = {};
  if (D) D.forEach(function (ph) {
    (ph.groups || []).forEach(function (g) {
      (g.metrics || []).forEach(function (m) {
        (dp[m.id] = dp[m.id] || {})[ph.id] = {
          value: m.phaseTarget, basis: m.basis, justification: m.justification
        };
      });
    });
  });

  Q.parameters.forEach(function (p) {
    if (p.type === 'CP') return;
    p.rollout = p.rollout || [];
    const isDataPlan = !!dp[p.id];
    const extra = EXTRA_ANCHORS[p.id] || {};

    /* start phase: data-plan metrics start where the data plan starts */
    const rel = relevance(p.id);
    let relPhase = rel.phase, relWhy = rel.why;
    if (isDataPlan) {
      const earliest = PHASES.filter(function (ph) { return dp[p.id][ph]; })[0];
      if (earliest) { relPhase = earliest; relWhy = 'the information-mesh plan first measures it here'; }
    }
    const startIdx = pIdx(relPhase);

    /* existing framework entries by phase (authoritative anchors) */
    const have: Record<string, boolean> = {};
    p.rollout.forEach(function (e) { have[e.phase] = true; });
    const haveEntry: Record<string, { value: string }> = {};
    p.rollout.forEach(function (e) { haveEntry[e.phase] = e; });

    /* qualitative metrics: ladder, no numbers */
    const mat = parseNum(p.target);
    if (!mat) {
      let q = 0;
      for (let qi = startIdx; qi < PHASES.length - 1; qi++) {
        const ph = PHASES[qi];
        if (have[ph]) continue;
        p.rollout.push({ phase: ph, gate: '', kind: 'derived interim target',
          value: QUAL_LADDER[Math.min(q, QUAL_LADDER.length - 1)],
          interpretation: 'The framework deliberately left this target to be ' +
            'calibrated from operating data; the interim obligation is ' +
            'measurement and demonstrated direction, not an invented number.' });
        q++;
      }
      finalize(p, relPhase, relWhy);
      return;
    }

    /* build numeric anchors: phase -> {num, source, value} */
    const anchors: Record<string, Anchor> = {};
    /* framework catalog entries */
    Object.keys(haveEntry).forEach(function (ph) {
      const pn = parseNum(haveEntry[ph].value);
      if (pn) anchors[ph] = { num: pn.num, source: 'framework', value: haveEntry[ph].value };
    });
    /* data-plan entries */
    if (isDataPlan) Object.keys(dp[p.id]).forEach(function (ph) {
      if (anchors[ph]) return;
      const pn = parseNum(dp[p.id][ph].value);
      if (pn) {
        anchors[ph] = { num: pn.num, source: 'dataplan', value: dp[p.id][ph].value,
          why: dp[p.id][ph].justification };
      }
    });
    /* extra prose floors */
    Object.keys(extra).forEach(function (ph) {
      if (anchors[ph]) return;
      const pn = parseNum(extra[ph].value);
      if (pn) anchors[ph] = { num: pn.num, source: 'extra', value: extra[ph].value, why: extra[ph].why };
    });
    /* maturity anchor */
    if (!anchors.P8) anchors.P8 = { num: mat.num, source: 'maturity', value: p.target };

    /* entry anchor at the start phase, pulled to any stricter interior floor */
    if (!anchors[relPhase] && !isDataPlan) {
      let en = entryNum(mat);
      const floors: number[] = [];
      Object.keys(anchors).forEach(function (ph) {
        if (ph !== 'P8' && pIdx(ph) > startIdx) floors.push(anchors[ph].num);
      });
      if (floors.length) {
        const fl = mat.cmp === '<=' ? Math.max.apply(null, floors) : Math.min.apply(null, floors);
        en = mat.cmp === '<=' ? Math.max(en, fl) : Math.min(en, fl);
      }
      anchors[relPhase] = { num: en, source: 'entry', value: withNum(p.target, en, mat) };
    }

    /* interpolate every phase from start to P8 */
    const anchoredPhases = Object.keys(anchors)
      .filter(function (ph) { return pIdx(ph) >= startIdx; })
      .sort(function (a, b) { return pIdx(a) - pIdx(b); });

    for (let i = startIdx; i < PHASES.length; i++) {
      const phase = PHASES[i];
      if (have[phase]) continue;         /* framework entry already present */
      if (anchors[phase] && anchors[phase].source === 'dataplan') {
        p.rollout.push({ phase: phase, gate: '', kind: 'data-plan interim target',
          value: anchors[phase].value,
          interpretation: 'From the information-mesh data plan: ' +
            (anchors[phase].why || 'phase target from the Data tab methodology.') });
        continue;
      }
      if (anchors[phase] && anchors[phase].source === 'extra') {
        p.rollout.push({ phase: phase, gate: '', kind: 'progression floor',
          value: anchors[phase].value, interpretation: anchors[phase].why });
        continue;
      }
      if (phase === 'P8') continue;      /* maturity row already exists */
      if (anchors[phase] && anchors[phase].source === 'entry') {
        p.rollout.push({ phase: phase, gate: '', kind: 'derived interim target',
          value: anchors[phase].value,
          interpretation: 'Entry floor: the phase this metric first becomes ' +
            'measurable (' + relPhase + ', because ' + relWhy + '), set from the ' +
            'maturity target\'s shape.' });
        continue;
      }
      /* find bracketing anchors and interpolate linearly */
      let lo: string | null = null, hi: string | null = null;
      anchoredPhases.forEach(function (ap) {
        if (pIdx(ap) <= i) lo = ap;
        if (pIdx(ap) >= i && hi === null) hi = ap;
      });
      if (lo === null || hi === null || lo === hi) continue;
      const loK: string = lo, hiK: string = hi;
      /* R148 [§S3]: interpolate on the calendar, not on the phase's position in
         the list. The phases are unevenly spaced - P3 is Year 4, P4 is Year 6,
         P7 is Year 10, P8 is Year 12 - so dividing by the index gives every
         phase step the same increment and silently halves the implied annual
         rate of improvement across P3-P4, P6-P7 and P7-P8. PHASE_YEAR is the
         one map (R251), imported rather than re-derived. */
      const f = (PHASE_YEAR[phase] - PHASE_YEAR[loK]) / (PHASE_YEAR[hiK] - PHASE_YEAR[loK]);
      const num = anchors[loK].num + (anchors[hiK].num - anchors[loK].num) * f;
      p.rollout.push({ phase: phase, gate: '', kind: 'derived interim target',
        value: withNum(p.target, num, mat),
        interpretation: 'Derived: linear interpolation between the ' +
          loK + ' and ' + hiK + ' anchors toward the maturity target.' });
    }

    finalize(p, relPhase, relWhy);
  });
}

/* ---- Self-tests (ported from phasetargets.js:311-349) ----------------- */
export function selfTestEveryRelevantPhase(Q: QualityData): boolean {
  return Q.parameters.filter(function (p) { return p.type !== 'CP'; })
    .every(function (p) {
      const start = pIdx(p._phaseStart || relevance(p.id).phase);
      const have: Record<string, boolean> = {};
      p.rollout.forEach(function (e) { have[e.phase] = true; });
      for (let i = start; i < PHASES.length; i++) if (!have[PHASES[i]]) return false;
      return true;
    });
}
export function selfTestNoRegression(Q: QualityData): boolean {
  return Q.parameters.filter(function (p) {
    const pn = parseNum(p.target);
    return p.type !== 'CP' && pn && pn.cmp;
  }).every(function (p) {
    const mt = parseNum(p.target)!;
    const traj: Record<string, number> = {};
    p.rollout.forEach(function (e) {
      if (e.kind === 'progression floor' || e.kind === 'phase milestone') return;
      const pn = parseNum(e.value);
      if (pn && pn.unit === mt.unit) traj[e.phase] = pn.num;
    });
    const ordered = PHASES.filter(function (ph) { return traj[ph] != null; })
      .map(function (ph) { return traj[ph]; });
    for (let i = 1; i < ordered.length; i++) {
      if (mt.cmp === '<=' && ordered[i] > ordered[i - 1] * 1.01) return false;
      if (mt.cmp !== '<=' && ordered[i] < ordered[i - 1] * 0.99) return false;
    }
    return true;
  });
}
