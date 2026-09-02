/* R54 [§S0]: self-tests for data-phases.ts.
 *
 * The module ships metricCount: 26 and targetCount: 64 as fields and asserts
 * nothing at all - no registration on any harness. Both figures verify by hand
 * (V4), but the Quality tab reuses this data verbatim, so an error here reaches
 * two public chapters with no independent check.
 *
 * Kept out of data-phases.ts because that file is a verbatim port marked
 * "Fidelity-critical: do not re-derive"; the data stays untouched and the
 * assertions live next to it.
 */
import { DATA_PHASES, DATA_PHASE_GAPS } from './data-phases';
import type { DataMetric } from './data-phases';
import { parseNum } from './phase-targets';
import { QUALITY_DATA } from './quality';

/* AN5 retracted AB3: all four of the catalog's IDs are canonical. The document's
   suffix convention is broader than the pattern the audit tested, so this admits
   both the dotted numeric form (TPP-10.6, KPP-A1) and the letter-suffixed one
   (TPP-FORM1, TPP-USE1, KPP-TRUST1). */
const ID_PATTERN = /^(KPP|TPP)-[A-Z]*\d+(\.\d+)?$/;

function everyMetric(): Array<{ phase: string; metric: DataMetric }> {
  const out: Array<{ phase: string; metric: DataMetric }> = [];
  for (const phase of DATA_PHASES) {
    for (const group of phase.groups) {
      for (const metric of group.metrics) out.push({ phase: phase.id, metric: metric });
    }
  }
  return out;
}

export function dataPhaseMetricIds(): string[] {
  return [...new Set(everyMetric().map((m) => m.metric.id))].sort();
}

export function dataPhaseTargetCount(): number {
  return everyMetric().length;
}

export function dataPhaseIdFormat(): { nonConforming: string[] } {
  return {
    nonConforming: dataPhaseMetricIds().filter((id) => !ID_PATTERN.test(id))
  };
}

export function frameworkBasisEntries(): Array<{ phase: string; id: string }> {
  return everyMetric()
    .filter((m) => m.metric.basis === 'framework')
    .map((m) => ({ phase: m.phase, id: m.metric.id }));
}

/* R117 [§S2]: check what a `basis: "framework"` target CLAIMS, not just that the
   word is spelled right.
 *
 * build_data_phase_targets.py raises on an unknown basis value and stops there,
 * while the verification data sits in the same function it never reads:
 * load_quality_parameters() returns each parameter's `rollout`, which the
 * catalog extractor filled from the framework's own gate and milestone tables.
 * A `framework` basis asserts that the framework fixed this number at this
 * phase, so the catalog's entry at that phase is the thing to check it against.
 *
 * String equality is the wrong instrument, because these rows restate the
 * catalog in the page's own words: the generator declares '>=98% API
 * conformance' where the catalog says '>=98%', and '>=65% population within
 * the unit-network coverage milestone' where the catalog says '>=65% by phase
 * end'. Comparing the parsed (comparator, number, unit) triple compares the
 * claim; comparing the strings compares the wording.
 *
 * R130 [§S11b]: this comment used to say "sixteen of the seventeen". There
 * are nineteen rows and all nineteen are reworded, so both halves were wrong
 * and nothing maintained either. The self-test note beside this computes both
 * figures, so the count belongs there and the property belongs here.
 *
 * Only these three kinds come from the catalog. 'derived interim target',
 * 'data-plan interim target' and 'equation-derived target' are added or
 * rewritten downstream by phase-targets.ts and equations.ts, and checking a
 * framework claim against a data-plan entry would be checking the generator
 * against itself. */
const CATALOG_KINDS = new Set(['maturity target', 'phase milestone', 'progression floor']);

export interface FrameworkClaim {
  id: string;
  phase: string;
  declared: string;
  catalogValue: string | null;
  kind: string | null;
  problem: string; /* '' when the claim resolves */
}

export function frameworkBasisClaims(): FrameworkClaim[] {
  const byId = new Map(QUALITY_DATA.parameters.map((p) => [p.id, p] as const));

  return everyMetric()
    .filter((row) => row.metric.basis === 'framework')
    .map((row) => {
      const base: FrameworkClaim = {
        id: row.metric.id,
        phase: row.phase,
        declared: row.metric.phaseTarget,
        catalogValue: null,
        kind: null,
        problem: ''
      };
      const entries = (byId.get(row.metric.id)?.rollout || [])
        .filter((e) => e.phase === row.phase && CATALOG_KINDS.has(e.kind));
      if (!entries.length) {
        return { ...base, problem: 'no framework entry at this phase' };
      }
      const claim = parseNum(row.metric.phaseTarget);
      if (!claim) return { ...base, problem: 'the declared target states no number' };

      let nearest: FrameworkClaim | null = null;
      for (const entry of entries) {
        const source = parseNum(entry.value);
        const detail = { ...base, catalogValue: entry.value, kind: entry.kind };
        if (!source) {
          nearest = nearest || { ...detail, problem: 'the catalog entry states no number' };
          continue;
        }
        const problem = source.num !== claim.num
          ? 'declares ' + claim.num + ', the catalog carries ' + source.num
          : source.cmp !== claim.cmp
            ? 'declares ' + (claim.cmp || 'no comparator') + ', the catalog carries ' +
              (source.cmp || 'no comparator')
            : source.unit !== claim.unit
              ? 'declares ' + claim.unit + ', the catalog carries ' + source.unit
              : '';
        if (!problem) return { ...detail, problem: '' };
        nearest = nearest || { ...detail, problem: problem };
      }
      return nearest as FrameworkClaim;
    });
}

export function frameworkBasisDrift(): FrameworkClaim[] {
  return frameworkBasisClaims().filter((c) => c.problem !== '');
}

/* R57 [§S2]: a metric that stops being published and starts again must say why.
 *
 * The row filed one case - TPP-11.1 uptime, tracked at P1-P3 and P6-P8, absent
 * at P4 and P5, which are the phases when hospitals, laboratories and units
 * first depend on the rail. Measuring the register found nine more metrics with
 * the same shape, so the remedy is a rule and not a paragraph.
 *
 * The generator owns the declarations and refuses to write data-phases.ts if
 * one is missing or stale. This recomputes the gaps from the shipped payload,
 * so the two cannot drift apart and a hand edit to the generated file fails the
 * build rather than publishing an unexplained gap. */
export interface CoverageGapDrift {
  id: string;
  measured: string[];
  declared: string[] | null;
}

export function measuredCoverageGaps(): Array<{ id: string; phases: string[] }> {
  const order = DATA_PHASES.map((p) => p.id);
  const seen = new Map<string, number[]>();
  DATA_PHASES.forEach((phase, index) => {
    for (const group of phase.groups) {
      for (const metric of group.metrics) {
        seen.set(metric.id, [...(seen.get(metric.id) || []), index]);
      }
    }
  });

  const out: Array<{ id: string; phases: string[] }> = [];
  for (const [id, indexes] of seen) {
    const missing: string[] = [];
    for (let i = Math.min(...indexes); i <= Math.max(...indexes); i += 1) {
      if (!indexes.includes(i)) missing.push(order[i]);
    }
    if (missing.length) out.push({ id: id, phases: missing });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

export function coverageGapDrift(): CoverageGapDrift[] {
  const declared = new Map(DATA_PHASE_GAPS.map((g) => [g.id, g] as const));
  const out: CoverageGapDrift[] = [];

  for (const gap of measuredCoverageGaps()) {
    const match = declared.get(gap.id);
    if (!match || match.phases.join() !== gap.phases.join()) {
      out.push({ id: gap.id, measured: gap.phases, declared: match ? match.phases : null });
    }
  }
  const measured = new Set(measuredCoverageGaps().map((g) => g.id));
  for (const gap of DATA_PHASE_GAPS) {
    if (!measured.has(gap.id)) out.push({ id: gap.id, measured: [], declared: gap.phases });
  }
  return out;
}

export function unreasonedCoverageGaps(): string[] {
  return DATA_PHASE_GAPS.filter((g) => g.reason.trim().length < 40).map((g) => g.id);
}

export interface Regression {
  id: string;
  from: string;
  to: string;
  fromValue: number;
  toValue: number;
}

/* A phase target must move toward its mature target, never away from it. The
   direction is set by the mature target's comparator: >= tightens upward,
   <= tightens downward. */
export function dataPhaseMonotonicity(): { regressions: Regression[] } {
  const byId = new Map<string, Array<{ phase: string; metric: DataMetric }>>();
  for (const row of everyMetric()) {
    const list = byId.get(row.metric.id) || [];
    list.push(row);
    byId.set(row.metric.id, list);
  }

  const regressions: Regression[] = [];
  for (const [id, rows] of byId) {
    const mature = parseNum(rows[0].metric.matureTarget);
    if (!mature || !mature.cmp) continue; /* no comparator: no declared direction */
    const rising = mature.cmp === '>=';
    for (let i = 1; i < rows.length; i += 1) {
      const prev = parseNum(rows[i - 1].metric.phaseTarget);
      const cur = parseNum(rows[i].metric.phaseTarget);
      if (!prev || !cur) continue;
      const wrongWay = rising ? cur.num < prev.num : cur.num > prev.num;
      if (wrongWay) {
        regressions.push({
          id: id,
          from: rows[i - 1].phase,
          to: rows[i].phase,
          fromValue: prev.num,
          toValue: cur.num
        });
      }
    }
  }
  return { regressions };
}
