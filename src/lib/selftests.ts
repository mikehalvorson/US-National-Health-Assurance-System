/* Build-time self-test aggregator: reconciles the model self-tests
   (selfTest, {name,ok,note}), the bridge-decomposition identity check
   (bridgeSteps().identityError), and the tax invariants (TAX_SELFTESTS,
   {name,run}) into one flat list. Port of docs/js/app.js renderSelfTests
   (608-641) minus the DOM. Runs at build time; pure. */
import { runPath, sampleParams, selfTest } from './model';
import { runOverviewMc } from './overview';
import { effectiveParams, scenarioStructural } from './scenarios';
import { bridgeSteps } from './bridge';
import { TAX_SELFTESTS } from './taxmodel';
import {
  REL_FALLBACK_IDS, REL_FALLBACK_PHASE, selfTestEveryRelevantPhase, selfTestNoRegression,
  staleRelevanceFallbacks, undeclaredRelevanceFallbacks
} from './phase-targets';
import { QUALITY_DATA } from './quality';
import {
  AUTHORITATIVE_KINDS, clampCounts, computeTargets, documentedGapIds, equationSelfTests,
  KAPPA_CONFIDENCE, KAPPA_SOURCE_FLOOR_PCT, KAPPA_SOURCE_GATE, KAPPA_VALUE, MATURITY_TOLERANCE,
  NOT_RELEVANT_TEXT
} from './equations';
import {
  calibrationDrift, documentedGapDrift, kappaBand, kappaRegistryGaps, kappaTableDrift,
  maturityToleranceDrift
} from './kappa-check';
import {
  authoritativeKindDrift, derivationCounts, ROLLOUT_KINDS, undeclaredRolloutKinds,
  underivedPublishedKinds, unproducedRolloutKinds
} from './rollout-kind-check';
import {
  DECLARED_TARGET_MISPARSES, staleTargetMisparses, undeclaredTargetMisparses,
  unTemplatedNonParsingTargets
} from './target-parse-check';
import {
  committedKindCounts, cpConfidenceWiring, cpFamilyConfidence, duplicateRecordIds, FMEA_DATA,
  fmeaSelfTests, gateBumpedRecords, gateWiring, phaseOrderDrift, PROBABILITY_CEILING,
  PROBABILITY_FLOOR, PROBABILITY_SOURCES, probabilityScaleReach, probabilitySourceConflicts,
  probabilitySourceCounts, proxiedInMatrix, undeclaredCommittedKinds, unslugedKinds
} from './fmea';
import {
  ENRICHERS, guardedGlobalListeners, manifestDrift, PARSER_HOME, parserImplementations,
  readmeAdvertisedTestCount, readmeDeployDrift, retiredTreeCodeReferences, retiredTreeTargets,
  routeDrift, statedChapterCountDrift, undeclaredEnrichers, unregisteredSelfTestSurfaces
} from './manifest-check';
import { TABS } from './tabs';
import { AGE_STRUCTURE, OFFSET_RAMPS, RAMPS, RAMP_MILESTONES, START_YEAR } from './params';
import { EXPANSION_SPAN, LTC_BENEFIT_PHASE, PHASE_YEAR, ROLLOUT_HEADLINES } from './rollout';
import {
  benefitStartDrift, calendarAnchorDenials, calendarConverterSplit, calendarYearOf,
  expansionSpanDisagreements,
  ltcBenefitStartYear, phaseMapDrift, phasesWithoutYear, phaseYearMismatches,
  premiumCardYearDrift, rampLegendDisagreements, rampMilestoneMisses,
  rolloutHeadlineMisses, trainProgAtMaturity, unitBuildoutIssues
} from './phase-map-check';
import {
  gateFloorChecks, gateFloorCollisions, gateFloorDrift, gatePhaseDrift,
  KNOWN_UNANCHORED_FLOORS, unexplainedExemptions
} from './gate-floors';
import { DATA_PHASE_COUNTS, DATA_PHASE_GAPS, DATA_PHASES } from './data-phases';
import { methodologyCountsAgree, methodologyDrift } from './methodology-check';
import { TOOLCHAINS, toolchainDrift, toolsInManifest } from './toolchain-check';
import {
  declaredDispositions, legislationStyleDrift, styledDispositions, STYLED_BY_BASE_RULE
} from './style-check';
import {
  coverageGapDrift, dataPhaseIdFormat, dataPhaseMetricIds, dataPhaseMonotonicity,
  dataPhaseTargetCount, frameworkBasisClaims, frameworkBasisDrift, frameworkBasisEntries,
  unreasonedCoverageGaps
} from './data-phases-checks';

/* R248 [§S0]: two detectors, because the row's own instrument only sees one of
   the two ways an equation can fail to produce a number.

   applyEquationTargets rewrites `kind` on every rollout entry it replaces, so a
   surviving 'derived interim target' is an entry it skipped - and the only way
   to be skipped is `if (!val || !isFinite(val.num)) return;`. That count is
   currently 0 and correctly so: all 538 convert.

   But a metric/phase pair with NO rollout row is never offered to
   applyEquationTargets at all. computeTargets still evaluates it, and if the
   result is non-finite nothing anywhere reports that. Fourteen cells are in
   that state (eleven when this was written; R226 added three by correcting the
   phase conversion, and KNOWN_NON_FINITE below carries the reasoning).
   They are dropped rather than published, so no reader sees NaN -
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

/* R232 [§S3]: the metrics whose published trajectory is entirely committed
   floors carried forward, with the equation contributing no interim number a
   reader ever sees. The row's own words: a metric bounded at six of nine
   phases is a metric whose equation is not doing the work, and nobody could
   see that, because the bound was applied and then discarded.

   Four are in that state, and they are named rather than counted so a fifth
   fails the build. This is not a defect to fix by loosening the clamp - the
   clamp is correct, it stops the equation contradicting a committed floor. It
   is a fact about where the model is decorative, and it belongs where someone
   reading the checks will meet it.

   They are not equally interesting. KPP-C5 publishes four interim rows and
   every one is a floor; TPP-10.2 and TPP-11.1 publish two each. KPP-A1
   publishes exactly one, so "all of it" is one row, which is a much weaker
   statement about the same arrangement. The list does not rank them; the note
   the check prints carries the counts. */
const FULLY_CLAMPED = ['KPP-A1', 'KPP-C5', 'TPP-10.2', 'TPP-11.1'];

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
        ({ ok: selfTestNoRegression(QUALITY_DATA) })),
      /* R150 [§S3]: the relevance table's fallback, enumerated. */
      runGuarded('Every metric matches a relevance rule or a declared fallback', () => {
        const undeclared = undeclaredRelevanceFallbacks(QUALITY_DATA);
        const stale = staleRelevanceFallbacks(QUALITY_DATA);
        return {
          ok: !undeclared.length && !stale.length,
          note: [
            undeclared.length ? 'no rule, not declared: ' + undeclared.join(', ') : '',
            stale.length ? 'declared but ruled or gone: ' + stale.join(', ') : ''
          ].filter(Boolean).join(' | ') ||
            REL_FALLBACK_IDS.length + ' on the declared fallback at ' + REL_FALLBACK_PHASE
        };
      })
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
      runGuarded('Non-finite equation results are the known ones', () => {
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
      }),
      /* §S3, with R226: the row above is the guard that keeps a non-finite cell
         off the page. This is the one that means a reader could not be hurt if
         that guard were ever wrong. formatEqTarget used to render a non-finite
         value into the metric's own template and produce "median <=NaN hours";
         the cell now carries a sentence instead, so there is no NaN string in
         the layer at all rather than one that nothing happens to publish. */
      runGuarded('No equation cell carries a formatted non-finite value', () => {
        const d = equationTargetDiagnostics();
        const wrong = d.nonFinite.filter((c) => c.text !== NOT_RELEVANT_TEXT);
        const leaked = d.nonFinite.filter((c) => /NaN|Infinity/.test(c.text));
        return {
          ok: !wrong.length && !leaked.length,
          note: leaked.length
            ? 'renders a raw non-finite: ' + leaked.map((c) => c.metric + '@' + c.phase + ' = ' + c.text).join(', ')
            : wrong.length
              ? 'non-finite cell not labelled: ' + wrong.map((c) => c.metric + '@' + c.phase).join(', ')
              : d.nonFinite.length + ' non-finite cells, every one reading "' + NOT_RELEVANT_TEXT + '"'
        };
      }),
      /* R232 [§S3]: both halves of the clamp disclosure. */
      runGuarded('Every clamped value carries the equation number it replaced', () => {
        const missing = clampCounts(QUALITY_DATA)
          .flatMap((c) => {
            const p = QUALITY_DATA.parameters.filter((x) => x.id === c.id)[0];
            return (p?.rollout || [])
              .filter((e) => e.bounded && !e.raw)
              .map((e) => c.id + '@' + e.phase);
          });
        const counts = clampCounts(QUALITY_DATA).filter((c) => c.bounded > 0);
        return {
          ok: !missing.length,
          note: missing.length
            ? 'bounded with no raw value: ' + missing.join(', ')
            : counts.reduce((n, c) => n + c.bounded, 0) + ' clamped rows across ' +
              counts.length + ' metrics, each carrying its raw value'
        };
      }),
      runGuarded('Every metric whose equation is fully overridden is declared', () => {
        const full = clampCounts(QUALITY_DATA)
          .filter((c) => c.rows > 0 && c.bounded === c.rows)
          .map((c) => c.id).sort();
        const declared = FULLY_CLAMPED.slice().sort();
        const added = full.filter((id) => declared.indexOf(id) < 0);
        const gone = declared.filter((id) => full.indexOf(id) < 0);
        return {
          ok: !added.length && !gone.length,
          note: [
            added.length ? 'newly fully clamped: ' + added.join(', ') : '',
            gone.length ? 'no longer fully clamped: ' + gone.join(', ') : ''
          ].filter(Boolean).join(' | ') ||
            full.length + ' metrics publish only committed floors: ' +
            clampCounts(QUALITY_DATA).filter((c) => full.indexOf(c.id) >= 0)
              .map((c) => c.id + ' (' + c.bounded + '/' + c.rows + ')').join(', ')
        };
      })
    ]
  },
  {
    /* R227 [§S3]: one fitted scalar shapes the interior of most of the 130
       trajectories. Its source, its grade and its band are all checked. */
    surface: 'kappa-check.ts',
    rows: () => [
      runGuarded('KAPPA still follows from the gate floor it was fitted to', () => {
        const drift = calibrationDrift();
        return {
          ok: !drift.length,
          note: drift.map((d) => d.what + ': expected ' + d.expected + ', found ' + d.found)
            .join('; ') ||
            'GATES[' + KAPPA_SOURCE_GATE + '] at ' + KAPPA_SOURCE_FLOOR_PCT + '% gives KAPPA = ' + KAPPA_VALUE
        };
      }),
      runGuarded('KAPPA carries a registry entry with its source and grade', () => {
        const gaps = kappaRegistryGaps();
        return {
          ok: !gaps.length,
          note: gaps.join('; ') || 'registered, sourced to GATES[' + KAPPA_SOURCE_GATE + '], graded ' + KAPPA_CONFIDENCE
        };
      }),
      /* R231 [§S3]: the stated tolerance and the applied one. */
      runGuarded('The methodology states the maturity tolerance the check applies', () => {
        const drift = maturityToleranceDrift();
        return {
          ok: !drift.length,
          note: drift.join('; ') ||
            'closure checked at ' + (MATURITY_TOLERANCE * 100) + '%, ' +
            documentedGapIds(QUALITY_DATA).length + ' documented gaps exempt'
        };
      }),
      /* R235 [§S3]: the exemption travels with the record it exempts. */
      runGuarded('Every documented gap is stamped on its record and written up', () => {
        const drift = documentedGapDrift();
        return {
          ok: !drift.length,
          note: drift.join('; ') ||
            documentedGapIds(QUALITY_DATA).join(', ') + ', each pointing at the methodology'
        };
      }),
      runGuarded('The published KAPPA sensitivity band matches the model', () => {
        const drift = kappaTableDrift();
        return {
          ok: !drift.length,
          note: drift.length
            ? drift.length + ' row(s) not in the methodology: ' + drift.join(' ')
            : kappaBand().map((r) => r.kappa + ': ' + r.metricsMoved + ' metrics move').join(', ')
        };
      })
    ]
  },
  {
    /* R228 [§S3]: the `kind` field decides whether a row is replaced, preserved
       or silently carried through. Three modules write it; one reads it. */
    surface: 'rollout-kind-check.ts',
    rows: () => [
      runGuarded('Every rollout kind is in the declared vocabulary', () => {
        const undeclared = undeclaredRolloutKinds();
        return {
          ok: !undeclared.length,
          note: undeclared.length
            ? 'undeclared: ' + undeclared.join(', ')
            : Object.keys(ROLLOUT_KINDS).length + ' kinds declared'
        };
      }),
      runGuarded('Every declared rollout kind still has a producer', () => {
        const unproduced = unproducedRolloutKinds();
        return {
          ok: !unproduced.length,
          note: unproduced.length ? 'no live row: ' + unproduced.join(', ') : 'all produced'
        };
      }),
      runGuarded('The authoritative kinds agree with what the engine preserves', () => {
        const drift = authoritativeKindDrift();
        return {
          ok: !drift.length,
          note: drift.join('; ') ||
            Object.keys(AUTHORITATIVE_KINDS).length + ' preserved by applyEquationTargets'
        };
      }),
      /* R221 [§S3]: the page names where every published target came from. */
      runGuarded('Every published target has a derivation the page can state', () => {
        const missing = underivedPublishedKinds();
        return {
          ok: !missing.length,
          note: missing.length
            ? 'published with no stated derivation: ' + missing.join(', ')
            : derivationCounts().map((d) => d.rows + ' from ' + d.derivation).join('; ')
        };
      }),
      /* R151 [§S3]: what the target parser does, said out loud. */
      runGuarded('Every target that does not parse carries an equation template', () => {
        const bad = unTemplatedNonParsingTargets();
        return {
          ok: !bad.length,
          note: bad.length
            ? 'no template, silently qualitative: ' + bad.join(', ')
            : 'the 7 deferred outcome metrics, each templated'
        };
      }),
      runGuarded('Every target that misparses is declared', () => {
        const undeclared = undeclaredTargetMisparses();
        const stale = staleTargetMisparses();
        return {
          ok: !undeclared.length && !stale.length,
          note: [
            undeclared.length ? 'undeclared: ' + undeclared.join('; ') : '',
            stale.length ? 'declared but no longer misparsing: ' + stale.join(', ') : ''
          ].filter(Boolean).join(' | ') ||
            Object.keys(DECLARED_TARGET_MISPARSES).length + ' declared (KPP-C2)'
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
      /* R262 fallout, found by review: two named converters now exist - one for
         an array index, one for a calendar date - and each is only a check of
         the other while something holds them together. */
      runGuarded('Both year converters resolve the same calendar year', () => {
        const split = calendarConverterSplit();
        return {
          ok: !split.length,
          note: split.map((s) => s.phase + ': equations ' + s.viaEquations +
            ' vs rollout ' + s.viaRollout).join('; ') ||
            'phaseIndex and calendarYear agree on all ' + Object.keys(PHASE_YEAR).length
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
      }),
      /* R256 */
      runGuarded('No page denies the calendar anchor the model publishes', () => {
        const bad = calendarAnchorDenials();
        return { ok: !bad.length, note: bad.join('; ') || 'Year 1 = ' + START_YEAR + ', stated once' };
      }),
      /* R258 */
      runGuarded('No bar height encodes a number the page never states', () => {
        const bad = unitBuildoutIssues();
        return {
          ok: !bad.length,
          note: bad.map((b) => b.step + ': ' + b.problem).join('; ') ||
            'three plotted steps match stated floors, two plotted off the axis'
        };
      }),
      /* R262 */
      runGuarded('No page states a benefit start year its phase contradicts', () => {
        const bad = benefitStartDrift();
        return {
          ok: !bad.length,
          note: bad.map((b) => b.page + ' says ' + b.stated + '; ' + b.phase + ' is ' + b.expected)
            .join('; ') || 'long-term care begins ' + ltcBenefitStartYear() +
            ' (' + (LTC_BENEFIT_PHASE ? LTC_BENEFIT_PHASE.id : '?') + ')'
        };
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
      }),
      /* R121 [§S2]: the gate -> phase map, checked against the gate's own
         decision point rather than trusted. Gate 1 names a transition; a
         mapping that keeps only one end of it is the collapse this row is
         about, and it is what left R117 with one claim it could not confirm. */
      runGuarded('Every gate floor lands on the phases its decision point names', () => {
        const drift = gatePhaseDrift();
        return {
          ok: !drift.length,
          note: drift.map((d) => d.gate + ' "' + d.when + '" names ' +
            d.named.join('+') + ', writes ' + (d.written.join('+') || 'nothing')).join(' | ') ||
            'G1 carries its claims floor at both P3 and P4; the rest name an event, not a boundary'
        };
      }),
      runGuarded('No two gates write one undistinguished floor', () => {
        const clashes = gateFloorCollisions();
        return {
          ok: !clashes.length,
          note: clashes.map((c) => c.paramId + '@' + c.phase + ': ' + c.gates.join(' and '))
            .join(' | ') || 'G4 and G5 share P8 but no parameter; every floor keeps its gate'
        };
      })
    ]
  },
  {
    /* R131 [§S2]: the repo carried two extractors doing one job in two
       languages because nothing stated which runtime a tool needs. The port was
       validated against its original and the duplicate is gone; this keeps the
       statement that replaced it exhaustive, against the manifest rather than
       against a list kept by hand. */
    surface: 'toolchain-check.ts',
    rows: () => [
      runGuarded('Every tool in tools/ runs on a documented toolchain', () => {
        const d = toolchainDrift();
        const parts: string[] = [];
        if (d.undeclared.length) parts.push('no declared runtime: ' + d.undeclared.join(', '));
        if (d.stale.length) parts.push('declared but absent: ' + d.stale.join(', '));
        if (d.unexplained.length) parts.push('entry says nothing: ' + d.unexplained.join(', '));
        return {
          ok: !parts.length,
          note: parts.join(' | ') || toolsInManifest().length + ' files in tools/, ' +
            TOOLCHAINS.filter((t) => t.runtime === 'node').length + ' node, ' +
            TOOLCHAINS.filter((t) => t.runtime === 'python').length + ' python, ' +
            TOOLCHAINS.filter((t) => t.runtime === 'powershell').length + ' powershell, ' +
            TOOLCHAINS.filter((t) => t.runtime === 'data').length + ' data'
        };
      })
    ]
  },
  {
    /* R203 [§S2]: an offset's ramp is a claim about what delivers that saving.
       The row filed offLowValue ramping on infra, the fastest curve in the
       model; the pairing is kept and declared rather than quietly moved to a
       slower ramp, and the declaration is now what the engine reads. The
       offsets are enumerated from a computed detail row, not from a list
       written next to this check, so a fifth offset cannot be added without
       either a declaration or a failure. */
    surface: 'params.ts',
    rows: () => [
      runGuarded('Every offset ramps on a declared capability', () => {
        const row = runPath(sampleParams(effectiveParams('SCN-BASE', null), null),
          scenarioStructural('SCN-BASE')).detail[0] as unknown as Record<string, unknown>;
        const produced = Object.keys(row).filter((k) => k.startsWith('off')).sort();
        const declared = new Map(OFFSET_RAMPS.map((o) => [o.id, o] as const));
        const problems: string[] = [];
        for (const id of produced) {
          const pairing = declared.get(id);
          if (!pairing) { problems.push(id + ' has no declared ramp'); continue; }
          if (!(pairing.ramp in RAMPS)) problems.push(id + ' names unknown ramp ' + pairing.ramp);
          if (pairing.why.trim().length < 60) problems.push(id + ' declares no reason');
          if (!pairing.delivers.trim()) problems.push(id + ' declares nothing delivered');
        }
        for (const o of OFFSET_RAMPS) {
          if (!produced.includes(o.id)) problems.push(o.id + ' is declared but not produced');
        }
        return {
          ok: !problems.length,
          note: problems.join(' | ') || produced.length + ' offsets, each paired: ' +
            OFFSET_RAMPS.map((o) => o.id.replace(/^off/, '') + '->' + o.ramp).join(', ')
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
    rows: () => [
      runGuarded('Failure-mode records: counts, score ranges and bands', () => {
        const r = fmeaSelfTests();
        return { ok: r.ok, note: r.messages.join('; ') };
      }),
      /* R272 [§S4]: the criticality ranking compares rows the equation layer
         recomputed against rows it is required to carry verbatim. That split is
         published, so it has to be the equation layer's own declaration and not
         a kind list retyped in fmea.ts. */
      runGuarded('Every carried-forward failure mode has a kind the equation layer leaves alone', () => {
        const undeclared = undeclaredCommittedKinds();
        const kinds = committedKindCounts();
        return {
          ok: !undeclared.length,
          note: undeclared.length
            ? 'not in AUTHORITATIVE_KINDS: ' + undeclared.join(', ')
            : kinds.reduce((n, k) => n + k.rows, 0) + ' carried forward across ' +
              kinds.map((k) => k.kind + ' ' + k.rows).join(', ')
        };
      }),
      /* NEW FINDING (P5 §S4): every consumer resolves a failure mode by
         `filter(r => r.id === id)[0]`, so a shared id makes a record
         unselectable and lights two table rows at once. */
      runGuarded('Every failure mode has an id no other failure mode shares', () => {
        const dups = duplicateRecordIds();
        const unsluged = unslugedKinds();
        return {
          ok: !dups.length && !unsluged.length,
          note: [
            dups.length ? 'shared by more than one record: ' + dups.join(', ') : '',
            unsluged.length ? 'rollout kind with no id slug: ' + unsluged.join(', ') : ''
          ].filter(Boolean).join(' | ') || FMEA_DATA.counts.total + ' records, all ids distinct'
        };
      }),
      /* R279 [§S4]: a deferred target had its occurrence "proxied at moderate"
         and that 3 was a real score everywhere it mattered - a coloured cell,
         a band total, a risk and an RPN computed through it - on a page saying
         its probability could not be assessed. Checked against the built
         aggregate, not against the filter that builds it. */
      runGuarded('No proxied probability is charted as a real one', () => {
        const p = proxiedInMatrix();
        return {
          ok: p.cells === 0,
          note: p.cells
            ? p.cells + ' proxied records are counted in a risk matrix'
            : p.records + ' deferred targets, none on the chart or in a band total'
        };
      }),
      /* R278 [§S4]: gate linkage adds +1 to consequence, enough to move a band,
         on exactly the parameters the framework made go/no-go. The 41 ids were
         read out of each gate's `evidence` string, so they are compared with it
         in both directions and resolved against the catalog. A typo used to
         leave a GATE_OF_PARAM key that never matches, so the +1 would silently
         never fire and the failure mode would publish one band too low. */
      runGuarded('Every gate-linked parameter matches the gate table and the catalog', () => {
        const w = gateWiring();
        const problems = [
          w.unresolved.length ? 'no such parameter: ' + w.unresolved.join(', ') : '',
          w.missing.length ? 'named by the gate, not linked: ' + w.missing.join(', ') : '',
          w.extra.length ? 'linked, not named by the gate: ' + w.extra.join(', ') : '',
          w.phaseDrift.length ? w.phaseDrift.join('; ') : '',
          w.undeclaredAssumption.length ? 'bind phase with no evidence and no declared reason: ' + w.undeclaredAssumption.join(', ') : '',
          w.staleAssumption.length ? 'declared unevidenced but now evidenced: ' + w.staleAssumption.join(', ') : ''
        ].filter(Boolean);
        return {
          ok: !problems.length,
          note: problems.join(' | ') ||
            w.linkedIds + ' gate-linked ids reconcile with the gate table, ' +
            gateBumpedRecords().length + ' failure modes carry the go/no-go bump'
        };
      }),
      /* R276 [§S4]: a record either carries a score on the published scale or
         carries none, and it says which. The failure this catches is the one
         the row names: a numeric pill rendered beside the word "unscored". */
      runGuarded('No failure mode both carries a score and denies having one', () => {
        const conflicts = probabilitySourceConflicts();
        const by = probabilitySourceCounts();
        return {
          ok: !conflicts.length,
          note: conflicts.slice(0, 5).join(' | ') ||
            PROBABILITY_SOURCES.map((s) => by[s] + ' ' + s).join(', ')
        };
      }),
      /* R275 [§S4]: CP occurrence is borrowed from params.ts, so what is
         declared in fmea.ts is a list of parameter IDENTIFIERS. Identifiers can
         be checked in both directions; the grades they used to retype could
         only be compared by eye, and were not. */
      runGuarded('Cost-parameter occurrence is wired to params.ts in both directions', () => {
        const w = cpConfidenceWiring();
        const problems = [
          w.unknown.length ? 'no such parameter: ' + w.unknown.join(', ') : '',
          w.undeclared.length ? 'parameter no family claims: ' + w.undeclared.join(', ') : '',
          w.ungraded.length ? 'mapped but ungraded: ' + w.ungraded.join(', ') : '',
          w.uncovered.length ? 'CP family with no mapping: ' + w.uncovered.join(', ') : '',
          w.unmappedGrades.length ? 'grade with no occurrence score: ' + w.unmappedGrades.join(', ') : ''
        ].filter(Boolean);
        const fams = cpFamilyConfidence();
        const unassessable = fams.filter((f) => f.grade === null).map((f) => f.id);
        return {
          ok: !problems.length,
          note: problems.join(' | ') ||
            fams.length + ' families read from params.ts, ' +
            (unassessable.length
              ? unassessable.join(', ') + ' unassessable (no sampled parameter)'
              : 'all assessable')
        };
      }),
      /* R274 [§S4]: the published occurrence scale and the scale the model can
         reach are the same claim. The chart is drawn from PROBABILITY_FLOOR, so
         an unreachable column cannot be rendered; this catches the mirror
         failure, a declared floor no record ever reaches. */
      runGuarded('Every score on the published occurrence scale is reachable', () => {
        const reach = probabilityScaleReach();
        return {
          ok: !reach.unreached.length && !reach.unlabelled.length &&
            reach.floor === PROBABILITY_FLOOR,
          note: reach.unreached.length
            ? 'no failure mode scores ' + reach.unreached.join(', ')
            : reach.unlabelled.length
              ? 'no published wording for ' + reach.unlabelled.join(', ')
              : reach.floor !== PROBABILITY_FLOOR
                ? 'declared floor ' + PROBABILITY_FLOOR + ', lowest reached ' + reach.floor
                : 'scale ' + PROBABILITY_FLOOR + '..' + PROBABILITY_CEILING + ', every score reached and published'
        };
      }),
      /* R272 [§S4]: priorNum's "previous phase" comparison is one of the two
         probability inputs. It used to be ordered by a fourth local copy of the
         phase list; it now reads PHASE_YEAR, and this is what keeps it there. */
      runGuarded('Failure-mode phase ordering comes from the one phase-year map', () => {
        const problems = phaseOrderDrift();
        return {
          ok: !problems.length,
          note: problems.join('; ') ||
            Object.keys(PHASE_YEAR).length + ' phases, strictly increasing by year'
        };
      })
    ]
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
      }),
      /* R57 [§S2]: TPP-11.1 uptime is tracked at P1-P3 and P6-P8 and absent at
         P4 and P5 - the phases when hospitals, laboratories and units first
         depend on the rail. Nine more metrics have the same shape. Each one now
         carries a declared reason, and this recomputes the gaps from the
         payload so a new silent gap fails the build. */
      runGuarded('Every interrupted metric declares the phases it skips', () => {
        const drift = coverageGapDrift();
        const thin = unreasonedCoverageGaps();
        const parts = drift.map((d) => d.id + ' misses ' + (d.measured.join('+') || 'nothing') +
          ', declares ' + (d.declared ? d.declared.join('+') : 'nothing'));
        if (thin.length) parts.push('reason too thin to be one: ' + thin.join(', '));
        return {
          ok: !parts.length,
          note: parts.join(' | ') || DATA_PHASE_GAPS.length + ' of ' +
            DATA_PHASE_COUNTS.metricCount + ' metrics skip a phase, each with its reason'
        };
      }),
      /* R117 [§S2]: the generator checks that `basis` is spelled from its
         vocabulary and never that the claim is true. A framework basis asserts
         the framework fixed this number at this phase, and the catalog entry it
         claims is in the same function the generator already loads. Compared as
         (comparator, number, unit), because sixteen of the seventeen restate
         the catalog in the page's own words rather than repeating it. */
      runGuarded('Every framework-basis target matches the catalog entry it claims', () => {
        const drift = frameworkBasisDrift();
        const claims = frameworkBasisClaims();
        const verbatim = claims.filter((c) => c.declared === c.catalogValue).length;
        return {
          ok: !drift.length,
          note: drift.map((d) => d.id + '@' + d.phase + ' ' + d.problem).join(' | ') ||
            claims.length + ' claims resolve, ' + (claims.length - verbatim) +
            ' of them worded differently from the catalog'
        };
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
        /* R57 [§S2]: the declared gaps are part of the rendering too, so a
           reason that exists only in the payload fails the same way. */
        if (d.missingGapRows.length) {
          parts.push(d.missingGapRows.length + ' coverage-gap rows absent, first: ' +
            d.missingGapRows[0].slice(0, 90));
        }
        return {
          ok: !parts.length,
          note: parts.join(' | ') ||
            d.dataRowCount + ' rows, ' + DATA_PHASE_GAPS.length + ' declared gaps and ' +
            DATA_PHASES.length + ' phase headings match'
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
      /* R280 [§S15]: an element-guarded init may not register a listener on a
         target the guard does not cover. <ClientRouter /> replaces the guard
         element, so the init runs again on every return visit; a listener on
         `document` or `window` outlives that swap and accumulates. Measured on
         fmea-client.ts before the fix: one extra listener per return visit,
         linear, and after three visits one click ran the selection handler
         four times. The shape is checked rather than the instance, because
         there are seven client scripts and it recurs. */
      runGuarded('No element-guarded init registers a document or window listener', () => {
        const bad = guardedGlobalListeners();
        return {
          ok: !bad.length,
          note: bad.map((b) => b.file + ':' + b.fn + ' binds ' + b.target).join(', ') ||
            'every global listener is registered at module scope'
        };
      }),
      /* R229 [§S3]: the convention is in quality.ts; this is what makes it a
         rule. An undeclared import-time enricher fails the build. Registered
         under this surface rather than under the vocabulary's, because the
         scan lives here and `surface` is what attributes a check to its
         module (R206). */
      runGuarded('Every import-time enricher is declared with its re-entry guard', () => {
        const bad = undeclaredEnrichers();
        return {
          ok: !bad.length,
          note: bad.join('; ') ||
            Object.keys(ENRICHERS).map((n) => n + ' (' + ENRICHERS[n].flag + ')').join(', ')
        };
      }),
      /* R277 [§S3]: one parser, enforced by a source scan. */
      runGuarded('The target parser has one implementation', () => {
        const found = parserImplementations();
        const ok = found.length === 1 && found[0] === PARSER_HOME;
        return {
          ok: ok,
          note: ok
            ? 'parseNum defined once, in ' + PARSER_HOME
            : 'defined in: ' + (found.join(', ') || 'nowhere')
        };
      }),
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
