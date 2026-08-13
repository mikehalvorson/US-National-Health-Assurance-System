/* Build-time self-test aggregator: reconciles the model self-tests
   (selfTest, {name,ok,note}), the bridge-decomposition identity check
   (bridgeSteps().identityError), and the tax invariants (TAX_SELFTESTS,
   {name,run}) into one flat list. Port of docs/js/app.js renderSelfTests
   (608-641) minus the DOM. Runs at build time; pure. */
import { selfTest } from './model';
import { runOverviewMc } from './overview';
import { bridgeSteps } from './bridge';
import { TAX_SELFTESTS } from './taxmodel';
import { selfTestEveryRelevantPhase, selfTestNoRegression } from './phase-targets';
import { QUALITY_DATA } from './quality';
import { computeTargets, equationSelfTests } from './equations';
import { fmeaSelfTests } from './fmea';
import { manifestDrift, routeDrift } from './manifest-check';
import { DATA_PHASE_COUNTS } from './data-phases';
import {
  dataPhaseIdFormat, dataPhaseMetricIds, dataPhaseMonotonicity,
  dataPhaseTargetCount, frameworkBasisEntries
} from './data-phases-checks';

/* R248 [§S0]: two detectors, because the row's own instrument only sees one of
   the two ways an equation can fail to produce a number.

   applyEquationTargets rewrites `kind` on every rollout entry it replaces, so a
   surviving 'derived interim target' is an entry it skipped - and the only way
   to be skipped is `if (!val || !isFinite(val.num)) return;`. That count is
   currently 0 and correctly so: all 538 convert.

   But a metric/phase pair with NO rollout row is never offered to
   applyEquationTargets at all. computeTargets still evaluates it, and if the
   result is non-finite nothing anywhere reports that. Eleven cells are in that
   state today. They are dropped rather than published, so no reader sees NaN -
   but they are silently failing equations, which is exactly what this row is
   for. §S3 owns the equations; this reports them. */
export interface EquationCell { metric: string; phase: string; text: string }
export interface EquationDiagnostics {
  kindSurvivors: Array<{ paramId: string; phase: string }>;
  nonFinite: EquationCell[];
  nonFinitePublished: EquationCell[];
}

export function equationTargetDiagnostics(scenarioId = 'SCN-BASE'): EquationDiagnostics {
  const kindSurvivors: Array<{ paramId: string; phase: string }> = [];
  const publishedPhases = new Map<string, Set<string>>();
  for (const p of QUALITY_DATA.parameters) {
    const phases = new Set<string>();
    for (const e of (p.rollout || [])) {
      phases.add(e.phase);
      if (e.kind === 'derived interim target') {
        kindSurvivors.push({ paramId: p.id, phase: e.phase });
      }
    }
    publishedPhases.set(p.id, phases);
  }

  const nonFinite: EquationCell[] = [];
  const nonFinitePublished: EquationCell[] = [];
  const targets = computeTargets(QUALITY_DATA, scenarioId);
  for (const metric of Object.keys(targets)) {
    for (const phase of Object.keys(targets[metric])) {
      const v = targets[metric][phase];
      if (Number.isFinite(v.num)) continue;
      const cell = { metric: metric, phase: phase, text: v.text };
      nonFinite.push(cell);
      if (publishedPhases.get(metric)?.has(phase)) nonFinitePublished.push(cell);
    }
  }
  return { kindSurvivors, nonFinite, nonFinitePublished };
}

/* The eleven known non-finite cells, by ID and phase. Pinned so a twelfth fails
   the build rather than joining them unnoticed, and so fixing one in §S3 has to
   be a deliberate edit here. This is the documentedGap discipline: name the
   defect, do not tolerate it silently. */
const KNOWN_NON_FINITE = [
  'KPP-B1@P0', 'KPP-D7@P0', 'KPP-TRUST1@P0',
  'TPP-9.3@P0', 'TPP-9.3@P1', 'TPP-9.3@P2', 'TPP-9.3@P3',
  'TPP-9.5@P0', 'TPP-9.5@P1', 'TPP-9.5@P2', 'TPP-9.5@P3'
].join(', ');

export interface SelfTestRow { name: string; ok: boolean; note: string }
export interface SelfTestReport { rows: SelfTestRow[]; passed: number; total: number }

/* R152 [§S0]: the build gate. selfTestSummary reports; this one refuses.
   Called from astro.config.mjs's astro:build:start hook, so a broken invariant
   stops the build before any page is emitted rather than rendering as a red row
   in the footer of a site that ships anyway. */
export function assertSelfTestsPass(summary: SelfTestReport): void {
  const failed = summary.rows.filter(function (r) { return !r.ok; });
  if (!failed.length) return;
  throw new Error(
    'Self-tests failed: ' + failed.length + ' of ' + summary.total + '.\n' +
    failed.map(function (r) {
      return '  - ' + r.name + (r.note ? '  (' + r.note + ')' : '');
    }).join('\n')
  );
}

/* Pure and deterministic (the Monte Carlo is seeded), so the result is cached:
   the build gate and the footer panel would otherwise each pay for a 600-draw run. */
let cached: SelfTestReport | null = null;

export function selfTestSummary(): SelfTestReport {
  if (cached) return cached;
  cached = buildSummary();
  return cached;
}

/* R154 [§S0]: the one runner. Every registered surface goes through this, so a
   throw becomes a named failed row instead of taking down the whole summary.
   Before this, only the tax loop was wrapped: a throw in selfTest() or
   bridgeSteps() rendered NO self-test section at all, which reads as success. */
export function runGuarded(
  name: string,
  run: () => { ok: boolean; note?: string }
): SelfTestRow {
  try {
    const r = run();
    return { name: name, ok: !!r.ok, note: r.note || '' };
  } catch (e) {
    return { name: name, ok: false, note: 'threw: ' + String(e) };
  }
}

/* R24 + R206 [§S0]: one registry, one runner, one count.
   The repo ran three incompatible registration mechanisms and none knew about
   the others, so nobody could state the true test count or confirm every test
   executed: model.ts's selfTest() returns an array; taxmodel.ts's TAX_SELFTESTS
   pushes {name, run} objects; phase-targets.ts exports bare predicates taking
   the catalog. selftests.ts aggregated only the first two.

   Every surface now declares itself here, whatever its shape. Adding one is a
   single entry, and `total` is the length of what this produces rather than a
   number anyone maintains by hand. */
export interface SelfTestSource {
  surface: string;
  rows: () => SelfTestRow[];
}

export const SELF_TEST_SOURCES: SelfTestSource[] = [
  {
    /* shape 1: a function returning its own {name, ok, note} array. Guard the
       call itself, so a throw before the array is built is still a row. */
    surface: 'model.ts',
    rows: () => runGuardedList('model self-tests', () =>
      selfTest().map((r) => ({ name: r.name, ok: r.ok, note: r.note || '' })))
  },
  {
    surface: 'bridge.ts',
    rows: () => [runGuarded('Bridge decomposition matches engine total exactly', () => {
      const identityError = bridgeSteps(runOverviewMc('SCN-BASE', null)).identityError;
      return { ok: identityError < 0.01, note: 'err=' + identityError.toExponential(1) };
    })]
  },
  {
    /* shape 2: {name, run}[] pushed onto a shared array */
    surface: 'taxmodel.ts',
    rows: () => TAX_SELFTESTS.map((t) => runGuarded(t.name, () => ({ ok: !!t.run() })))
  },
  {
    /* shape 3: bare predicates taking the catalog (R153, R206) */
    surface: 'phase-targets.ts',
    rows: () => [
      runGuarded('Every relevant phase carries a target', () =>
        ({ ok: selfTestEveryRelevantPhase(QUALITY_DATA) })),
      runGuarded('Phase targets show no regression toward maturity', () =>
        ({ ok: selfTestNoRegression(QUALITY_DATA) }))
    ]
  },
  {
    /* R230 */
    surface: 'equations.ts',
    rows: () => [
      runGuarded('Equation layer: coverage, acyclicity and P8 closure', () => {
        const r = equationSelfTests(QUALITY_DATA);
        return { ok: r.ok, note: r.messages.join('; ') };
      }),
      /* R248: both detectors */
      runGuarded('No rollout entry survives import as a derived interim target', () => {
        const s = equationTargetDiagnostics().kindSurvivors;
        return {
          ok: s.length === 0,
          note: s.length ? s.map((x) => x.paramId + '@' + x.phase).join(', ') : 'all converted'
        };
      }),
      runGuarded('Non-finite equation results are the eleven known ones', () => {
        const d = equationTargetDiagnostics();
        const found = d.nonFinite.map((c) => c.metric + '@' + c.phase).sort().join(', ');
        return {
          ok: found === KNOWN_NON_FINITE,
          note: found === KNOWN_NON_FINITE
            ? d.nonFinite.length + ' known, none published'
            : 'changed: ' + found
        };
      }),
      runGuarded('No non-finite equation result reaches a published row', () => {
        const p = equationTargetDiagnostics().nonFinitePublished;
        return {
          ok: p.length === 0,
          note: p.map((c) => c.metric + '@' + c.phase + ' = ' + c.text).join(', ')
        };
      })
    ]
  },
  {
    /* R273 */
    surface: 'fmea.ts',
    rows: () => [runGuarded('Failure-mode records: counts, score ranges and bands', () => {
      const r = fmeaSelfTests();
      return { ok: r.ok, note: r.messages.join('; ') };
    })]
  },
  {
    /* R54 */
    surface: 'data-phases.ts',
    rows: () => [
      runGuarded('Data-tab metric count equals its distinct metric IDs', () => {
        const n = dataPhaseMetricIds().length;
        return {
          ok: n === DATA_PHASE_COUNTS.metricCount,
          note: 'declared ' + DATA_PHASE_COUNTS.metricCount + ', derived ' + n
        };
      }),
      runGuarded('Data-tab target count equals its per-phase rows', () => {
        const n = dataPhaseTargetCount();
        return {
          ok: n === DATA_PHASE_COUNTS.targetCount,
          note: 'declared ' + DATA_PHASE_COUNTS.targetCount + ', derived ' + n
        };
      }),
      runGuarded('Data-tab metric IDs conform to the KPP/TPP pattern', () => {
        const bad = dataPhaseIdFormat().nonConforming;
        return { ok: !bad.length, note: bad.join(', ') || 'all conform' };
      }),
      runGuarded('Data-tab phase targets never regress from their mature target', () => {
        const r = dataPhaseMonotonicity().regressions;
        return {
          ok: !r.length,
          note: r.map((x) => x.id + ' ' + x.from + '->' + x.to +
            ' (' + x.fromValue + '->' + x.toValue + ')').join(', ') || 'monotone'
        };
      }),
      runGuarded('Data-tab framework-basis entries number seventeen', () => {
        const n = frameworkBasisEntries().length;
        return { ok: n === 17, note: n + ' entries carry basis: framework' };
      })
    ]
  },
  {
    /* R271 + R267: the inventory and the route registry stop being guesses */
    surface: 'manifest-check.ts',
    rows: () => [
      runGuarded('File manifest matches the working tree', () => {
        const d = manifestDrift();
        const parts: string[] = [];
        if (d.unlisted.length) parts.push('unlisted: ' + d.unlisted.join(', '));
        if (d.missing.length) parts.push('missing: ' + d.missing.join(', '));
        return {
          ok: !parts.length,
          note: parts.length
            ? parts.join(' | ') + ' -- run: node tools/build_file_manifest.mjs'
            : 'in sync'
        };
      }),
      runGuarded('Every page is registered in the route registry', () => {
        const d = routeDrift();
        const parts: string[] = [];
        if (d.unregistered.length) parts.push('no TABS entry: ' + d.unregistered.join(', '));
        if (d.unrouted.length) parts.push('no page: ' + d.unrouted.join(', '));
        return { ok: !parts.length, note: parts.join(' | ') || 'all routes registered' };
      })
    ]
  }
];

function buildSummary(): SelfTestReport {
  const rows: SelfTestRow[] = SELF_TEST_SOURCES.flatMap((s) => s.rows());

  const passed = rows.filter(function (r) { return r.ok; }).length;
  return { rows: rows, passed: passed, total: rows.length };
}

/* A surface that yields many rows at once. If it throws before producing them,
   report one failed row naming the surface rather than losing all of them
   silently — losing them would shrink `total`, which nothing would notice. */
function runGuardedList(name: string, run: () => SelfTestRow[]): SelfTestRow[] {
  try {
    return run();
  } catch (e) {
    return [{ name: name, ok: false, note: 'threw: ' + String(e) }];
  }
}
