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
import {
  manifestDrift, readmeAdvertisedTestCount, readmeDeployDrift,
  retiredTreeCodeReferences, retiredTreeTargets, routeDrift,
  statedChapterCountDrift, unregisteredSelfTestSurfaces
} from './manifest-check';
import { TABS } from './tabs';
import { AGE_STRUCTURE, RAMPS, RAMP_MILESTONES, START_YEAR } from './params';
import { EXPANSION_SPAN, PHASE_YEAR, ROLLOUT_HEADLINES } from './rollout';
import {
  calendarYearOf, expansionSpanDisagreements, phaseMapDrift, phasesWithoutYear,
  phaseYearMismatches, premiumCardYearDrift, rampLegendDisagreements,
  rampMilestoneMisses, rolloutHeadlineMisses, trainProgAtMaturity
} from './phase-map-check';
import {
  gateFloorChecks, gateFloorDrift, KNOWN_UNANCHORED_FLOORS, unexplainedExemptions
} from './gate-floors';
import { DATA_PHASE_COUNTS, DATA_PHASES } from './data-phases';
import { methodologyCountsAgree, methodologyDrift } from './methodology-check';
import {
  declaredDispositions, legislationStyleDrift, styledDispositions, STYLED_BY_BASE_RULE
} from './style-check';
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

const diagCache = new Map<string, EquationDiagnostics>();

export function equationTargetDiagnostics(scenarioId = 'SCN-BASE'): EquationDiagnostics {
  const hit = diagCache.get(scenarioId);
  if (hit) return hit;
  const result = computeDiagnostics(scenarioId);
  diagCache.set(scenarioId, result);
  return result;
}

function computeDiagnostics(scenarioId: string): EquationDiagnostics {
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

/* The known non-finite cells, by ID and phase. Pinned so one more fails the
   build rather than joining them unnoticed, and so fixing one in §S3 has to be
   a deliberate edit here. This is the documentedGap discipline: name the
   defect, do not tolerate it silently.

   This list was eleven until §S2 corrected the phase->index conversion
   (R226). P0 used to resolve ramp index 1, Year 2; it now resolves index 0,
   Year 1, where every build ramp is still zero - so three more metrics divide
   by a zero build state at P0 and evaluate non-finite: KPP-B5, KPP-E3 and
   TPP-7.2. The growth is the correction landing, not a regression, and it is
   inert: all fourteen sit at a phase EARLIER than the phase their own metric
   becomes measurable (`_phaseStart`), no rollout row exists at any of them,
   and the companion check below confirms none reaches a published row. §S3
   owns making them finite. */
const KNOWN_NON_FINITE = [
  'KPP-B1@P0', 'KPP-B5@P0', 'KPP-D7@P0', 'KPP-E3@P0', 'KPP-TRUST1@P0',
  'TPP-7.2@P0',
  'TPP-9.3@P0', 'TPP-9.3@P1', 'TPP-9.3@P2', 'TPP-9.3@P3',
  'TPP-9.5@P0', 'TPP-9.5@P1', 'TPP-9.5@P2', 'TPP-9.5@P3'
].join(', ');

export interface SelfTestRow { name: string; ok: boolean; note: string }
export interface SelfTestReport {
  rows: SelfTestRow[];
  passed: number;
  total: number;
  /* rows contributed by each registered surface (R24: the count is derived
     from the registry, never maintained by hand) */
  bySurface: Record<string, number>;
}

/* R152 [§S0]: the build gate. selfTestSummary reports; this one refuses.
   Called from astro.config.mjs's astro:build:start hook, so a broken invariant
   stops the build before any page is emitted rather than rendering as a red row
   in the footer of a site that ships anyway. */
export function assertSelfTestsPass(summary: Pick<SelfTestReport, 'rows' | 'total'>): void {
  const failed = summary.rows.filter(function (r) { return !r.ok; });
  if (!failed.length) return;
  throw new Error(
    'Self-tests failed: ' + failed.length + ' of ' + summary.total + '.\n' +
    failed.map(function (r) {
      return '  - ' + r.name + (r.note ? '  (' + r.note + ')' : '');
    }).join('\n')
  );
}

/* R155 [§S0]: the README advertised 27 integrity tests against a real 19.
   A registered row cannot check this, because a row cannot know the total it is
   part of; the gate can, because it holds the finished summary. Separate from
   assertSelfTestsPass so each failure mode is testable on its own. */
export function assertReadmeCountCurrent(
  summary: Pick<SelfTestReport, 'total'>,
  root?: string
): void {
  const advertised = readmeAdvertisedTestCount(root);
  if (advertised === summary.total) return;
  /* A missing figure used to return silently. R113 reached that state by
     accident - rewrapping the sentence put "integrity" and "tests" on separate
     lines, the single-line regex stopped matching, and the build passed with
     the check disabled. Deleting the sentence would do the same thing on
     purpose. Absence is drift. */
  if (advertised === null) {
    throw new Error(
      'README.md states no integrity-test count; the registry has ' + summary.total +
      '. The gate reads the phrase "N built-in integrity tests" from a single ' +
      'line, so restore it rather than removing it.'
    );
  }
  throw new Error(
    'README advertises ' + advertised + ' integrity tests; the registry has ' +
    summary.total + '. Update the figure in README.md.'
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
    /* R226/R251/R293/R234/R133 [§S2]: one phase map, one conversion, and the
       ramps held to the phases they claim. */
    surface: 'phase-map-check.ts',
    rows: () => [
      runGuarded('The phase-to-year map has one definition and every copy agrees', () => {
        const drift = phaseMapDrift();
        const missing = phasesWithoutYear();
        return {
          ok: !drift.length && !missing.length,
          note: [
            drift.map((d) => d.source + ' ' + d.phase + ': ' + d.year + ' not ' + d.expected).join('; '),
            missing.length ? 'no year for ' + missing.join(', ') : ''
          ].filter(Boolean).join(' | ') ||
            Object.keys(PHASE_YEAR).length + ' anchors, 3 sources agree'
        };
      }),
      runGuarded('Each phase resolves the calendar year its label states', () => {
        const bad = phaseYearMismatches();
        return {
          ok: !bad.length,
          note: bad.map((b) => b.phase + ' labelled Year ' + b.label + ' resolves Year ' + b.resolved)
            .join('; ') || 'P0 = Year 1 = ' + calendarYearOf('P0') +
            ', P8 = Year ' + PHASE_YEAR.P8 + ' = ' + calendarYearOf('P8')
        };
      }),
      runGuarded('Every ramp reaches its declared milestone at that phase', () => {
        const miss = rampMilestoneMisses();
        return {
          ok: !miss.length,
          note: miss.map((m) => m.ramp + '@' + m.phase + ' needs ' + m.needed +
            ', has ' + m.got + ' (' + m.claim + ')').join('; ') ||
            RAMP_MILESTONES.length + ' milestones land'
        };
      }),
      runGuarded('The premium card starts the year its coverage ramp does', () => {
        const drift = premiumCardYearDrift();
        return {
          ok: drift === null,
          note: drift ? 'card says ' + drift.fromYear + ', ramp migrates from ' + drift.rampYear
            : 'both ' + (START_YEAR + RAMPS.coverage.findIndex((v) => v > 0))
        };
      }),
      runGuarded('Training progress is exactly complete at the P8 anchor', () => {
        const v = trainProgAtMaturity();
        return { ok: v === 1, note: 'trainProg(P8) = ' + v };
      }),
      runGuarded('The ramp legend resolves the same index as the ramp array', () => {
        const bad = rampLegendDisagreements();
        return { ok: !bad.length, note: bad.join('; ') || 'all 9 phases agree' };
      }),
      /* R255 */
      runGuarded('Every published milestone year is the year its ramp delivers', () => {
        const miss = rolloutHeadlineMisses();
        return {
          ok: !miss.length,
          note: miss.map((m) => m.label + '@' + m.phase + ': ' + m.why +
            ' (' + m.got + ' vs ' + m.needed + ')').join('; ') ||
            ROLLOUT_HEADLINES.filter((h) => h.ramp).length + ' ramp-backed tiles land'
        };
      }),
      runGuarded('One milestone is not described with two different spans', () => {
        const bad = expansionSpanDisagreements();
        return { ok: !bad.length, note: bad.join('; ') || 'expansion stated as ' + EXPANSION_SPAN + ' everywhere' };
      })
    ]
  },
  {
    /* R149 [§S0]: gate floors were exempt from the no-regression test with
       nothing checking them. Now checked against the gate they cite. */
    surface: 'gate-floors.ts',
    rows: () => [
      runGuarded('Every gate floor matches the gate requirement it cites', () => {
        const drift = gateFloorDrift();
        return {
          ok: !drift.length,
          note: drift.map((d) => d.paramId + '@' + d.phase + ' cites ' + d.gate +
            ': ' + d.value).join('; ') || gateFloorChecks().length + ' floors verified'
        };
      }),
      runGuarded('Progression floors without a gate are the three known ones', () => {
        const found = unexplainedExemptions()
          .map((e) => e.paramId + '@' + e.phase).sort().join(', ');
        const known = [...KNOWN_UNANCHORED_FLOORS].sort().join(', ');
        return {
          ok: found === known,
          note: found === known
            ? found + ' (exempt from the no-regression test, nothing anchors them)'
            : 'changed: ' + found
        };
      })
    ]
  },
  {
    /* R137 [§S0]: AGE_STRUCTURE's purpose, asserted. Its cost weights feed the
       growth-decomposition note and nothing else; wiring them into the engine
       would double-count ageing, which baselineRealGrowth already carries. */
    surface: 'growth-decomp.ts',
    rows: () => [
      runGuarded('Age cost-weight index matches its measured value', () => {
        let idx24 = 0;
        for (const b of AGE_STRUCTURE.bands) idx24 += b.share2024 * b.costw;
        return {
          ok: Math.abs(idx24 - 1.1195) < 1e-4,
          note: '2024-weighted average = ' + idx24.toFixed(4) + ' (not 1.0; the ' +
            'decomposition uses a ratio, so this does not need normalising)'
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
    /* R103 [§S1]: a disposition whose badge class nothing styles. */
    surface: 'style-check.ts',
    rows: () => [
      runGuarded('Every legislation disposition reaches a stylesheet rule', () => {
        const d = legislationStyleDrift();
        const parts: string[] = [];
        if (d.baseRuleMissing) parts.push('.legislation-action base rule is gone');
        if (d.unstyled.length) parts.push('no rule: ' + d.unstyled.join(', '));
        if (d.deadRules.length) parts.push('rule with no disposition: ' + d.deadRules.join(', '));
        if (d.exemptionsChanged.length) {
          parts.push('base-rule set changed: ' + d.exemptionsChanged.join(', '));
        }
        return {
          ok: !parts.length,
          note: parts.join(' | ') || declaredDispositions().length + ' dispositions, ' +
            styledDispositions().length + ' with their own rule, ' +
            STYLED_BY_BASE_RULE.join(' and ') + ' painted by the shared rule'
        };
      })
    ]
  },
  {
    /* R107 [§S1]: the methodology document and data-phases.ts are two outputs
       of one generator run. Before R114 one of them was written into the
       retired tree, so regenerating left the deployed site stale and the
       document agreeing with a file nothing serves. */
    surface: 'methodology-check.ts',
    rows: () => [
      runGuarded('Methodology document renders the committed phase targets', () => {
        const d = methodologyDrift();
        const parts: string[] = [];
        if (d.missingHeadings.length) parts.push('headings: ' + d.missingHeadings.join(' | '));
        if (d.missingRows.length) {
          parts.push(d.missingRows.length + ' rows absent, first: ' + d.missingRows[0].slice(0, 90));
        }
        return {
          ok: !parts.length,
          note: parts.join(' | ') ||
            d.dataRowCount + ' rows and ' + DATA_PHASES.length + ' phase headings match'
        };
      }),
      runGuarded('Methodology row count equals the declared target count', () => {
        const d = methodologyDrift();
        return {
          ok: methodologyCountsAgree(),
          note: 'declared ' + DATA_PHASE_COUNTS.targetCount + ', data ' + d.dataRowCount +
            ', document ' + d.documentRowCount
        };
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
      /* R206 [§S0]: a fourth harness shape cannot appear unnoticed. */
      runGuarded('Every exported self-test surface is in the registry', () => {
        const modules = SELF_TEST_SOURCES.map((x) => x.surface);
        const orphans = unregisteredSelfTestSurfaces(modules);
        return {
          ok: !orphans.length,
          note: orphans.map((o) => o.module + ':' + o.fn).join(', ') ||
            modules.length + ' surfaces registered'
        };
      }),
      /* R261 [§S1]: the wrong denominator, stated where a contributor reads it. */
      runGuarded('Every stated chapter count equals the route registry', () => {
        const drift = statedChapterCountDrift();
        return {
          ok: !drift.length,
          note: drift.map((d) => d.file + ':' + d.line + ' says ' + d.stated).join(' | ') ||
            TABS.length + ' chapters, agreed everywhere it is stated'
        };
      }),
      /* R112 [§S1]: a re-targeted address cannot drift back into the retired
         tree. Provenance comments are kept; executable references are not. */
      runGuarded('No live code in src/ references the retired tree', () => {
        const refs = retiredTreeCodeReferences();
        return {
          ok: !refs.length,
          note: refs.map((r) => r.file + ':' + r.line + ': ' + r.text).join(' | ') ||
            'every remaining docs/ mention in src/ is a provenance comment'
        };
      }),
      /* R114 [§S1]: no generator writes to a path nothing deploys. */
      runGuarded('No tool under tools/ targets the retired tree', () => {
        const hits = retiredTreeTargets();
        return {
          ok: !hits.length,
          note: hits.map((h) => h.file + ':' + h.line + ': ' + h.text).join(' | ') ||
            'every tool reads and writes the deployed tree'
        };
      }),
      /* R113 [§S1]: the README cannot document the retired tree as the product,
         which is what made its deploy instruction harmful. */
      runGuarded('README documents the deployed tree, not the retired one', () => {
        const d = readmeDeployDrift();
        const parts: string[] = [];
        if (d.retiredPaths.length) parts.push(d.retiredPaths.join(' | '));
        if (d.missingWorkflowReference) {
          parts.push('README never names .github/workflows/deploy.yml, which is what deploys the site');
        }
        return { ok: !parts.length, note: parts.join(' | ') || 'no retired path, workflow named' };
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
  const rows: SelfTestRow[] = [];
  const bySurface: Record<string, number> = {};
  for (const source of SELF_TEST_SOURCES) {
    const produced = source.rows();
    bySurface[source.surface] = produced.length;
    rows.push(...produced);
  }

  const passed = rows.filter(function (r) { return r.ok; }).length;
  return { rows: rows, passed: passed, total: rows.length, bySurface: bySurface };
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
