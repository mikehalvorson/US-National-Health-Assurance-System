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
import { DATA_PHASES } from './data-phases';
import type { DataMetric } from './data-phases';
import { parseNum } from './phase-targets';

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
