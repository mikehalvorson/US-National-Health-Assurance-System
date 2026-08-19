/* Build-time self-test aggregator: reconciles the model self-tests
   (selfTest, {name,ok,note}), the bridge-decomposition identity check
   (bridgeSteps().identityError), and the tax invariants (TAX_SELFTESTS,
   {name,run}) into one flat list. Port of docs/js/app.js renderSelfTests
   (608-641) minus the DOM. Runs at build time; pure. */
import {
  baselineCategorySplit, EMBEDDED_DRUG_CLINIC_SHARE, EMBEDDED_DRUG_HOSPITAL_SHARE,
  PROGRAM_INPUT_REAL_GROWTH, runPath, sampleParams, selfTest
} from './model';
import { runOverviewMc } from './overview';
import { runMonteCarlo } from './model';
import {
  bandCounts, BASE_SCENARIO_ID, catalogShapeProblems,
  collapsingSliderParameters, effectiveParams, naturalCeiling,
  OVERRIDES_BEYOND_SLIDER, paramBandNote, provenanceProblems,
  provenanceGradeCounts, scenarioStructural, SCENARIOS as MODEL_SCENARIOS,
  SIGNED_PATH_FIELDS, sliderBandReach, sliderSpreadNote,
  SLIDER_REACH_DECLARED, SLIDER_REACH_TOLERANCE, spreadDependence,
  SPREAD_COLLAPSE_DECLARED,
  STRESS_SCENARIO_COUNT, STRUCTURAL_KNOBS, unknownOverrideKeys,
  unknownStructuralKeys
} from './scenarios';
import { bridgeSteps, BRIDGE_EXCLUSION_NOTE, BRIDGE_IDENTITY_NOTE } from './bridge';
import { benchmarkChartRows, benchmarkText } from './benchmarks';
import { classGrowth, defaultSettings, distribution, TAX_SELFTESTS } from './taxmodel';
import {
  DATASET_VINTAGES, GROUPS as TAX_GROUPS, INSTRUMENTS as TAX_INSTRUMENTS,
  SCENARIOS as TAX_SCENARIOS
} from './taxparams';
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
  ALLOWED_ASSERTIONS, bandNoteIsRendered, baselineSplitCopies,
  spreadNoteIsRendered,
  scenarioProvenanceNotRendered,
  DRUG_BASE_READS, drugBaseNotRendered, drugBaseNoteIsRendered,
  drugLeverNoteIsRendered, literalRetailTotals, MEDICATIONS_PAGE,
  medicationsFilterReasons, phasePrincipleIsRendered,
  RETAIL_BAND_HIGH, RETAIL_BAND_LOW,
  displayOnlyDatasetsInEngine,
  divergenceIsRendered, divergenceNamesRecommendation, ENGINE_FILE, ENRICHERS,
  matureYearDerivations, MATURE_YEAR_HOME, mechanismsMissingFromDoc,
  primitiveAssertions, undeclaredEngineDeclarations,
  guardedGlobalListeners, manifestDrift, PARSER_HOME, parserImplementations,
  readmeAdvertisedTestCount, readmeDeployDrift, retiredTreeCodeReferences,
  retiredTreeTargets, REVENUE_ENGINE, routeDrift, SPLIT_HOME, statedChapterCountDrift,
  typedEnvelopeLiterals, typedHouseholdCounts, undeclaredEnrichers,
  unreadEngineConstants, unreadStructuralKnobs,
  unregisteredEngineLiterals, unregisteredSelfTestSurfaces
} from './manifest-check';
import {
  ALL_DRUG_SPEND_2024, DRUG_BASE, DRUG_BASE_NOTE_FIGURES, drugBaseNote,
  FAMILIES, FAMILY_SOURCES, FAMILY_TAGS, FAMILY_WHY_FLOOR, familyGradeCounts,
  familyPhaseCounts, PHASE_FOR_CLASS, phasePrinciple, shallowFormClassReasons,
  staleFormClassDeclarations, undeclaredFormClasses, unknownFamilyTags,
  unusedFamilyTags
} from './medications';
import {
  DRUG_LEVER, DRUG_LEVER_NOTE_FIGURES, drugLeverNote
} from './drug-lever';
import { TABS } from './tabs';
import type { PercentileBand } from './model-types';
import {
  AGE_STRUCTURE, BASE2023, DEFLATOR_2023_TO_2024, ENGINE_CONSTANTS,
  ENGINE_STRUCTURAL_LITERALS, engineConstant, MONEYFLOW, OFFSET_RAMPS,
  ENGINE_DECLARATION_LITERALS, FRAMEWORK_CLAIM, MATURE_INDEX, MATURE_YEAR,
  MONTE_CARLO_DRAWS, OFFSET_ARCHITECTURE_DOC, PARAM_DEFS,
  PARAMS_BY_ID, RAMPS, RAMP_MILESTONES, RESEARCH_RECOMMENDATIONS, SEED_STABILITY,
  SPONSOR_SHARE, START_YEAR, transitionEnvelope
} from './params';
import {
  EXPANSION_SPAN, LTC_BENEFIT_PHASE, PHASE_YEAR, ROLLOUT_HEADLINES, WORKSTREAMS,
  WORKSTREAM_COST_NOTE, WORKSTREAM_GATE, WORKSTREAM_OWNER
} from './rollout';
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
   the check prints carries the counts.

   R143 [§S5] added the fifth, and it is the most interesting of them. KPP-C8
   publishes five interim rows. Growing the healthcare model's wealth base at
   the sourced top-capital rate rather than at GDP raised wealth financing
   enough that the ordinary-taxpayer burden the equation computes now falls
   BELOW the committed 5% cap at every interim phase - 0.0 at P0/P1/P2/P5/P6,
   1.5 at P3, 0.1 at P4, 1.2 at P7 - so the published number is the cap in
   every one of them. The metric reads as a flat "<=5%" trajectory while the
   equation behind it says something much more variable, and that is worth
   meeting here rather than inferring from a chart. */
const FULLY_CLAMPED = ['KPP-A1', 'KPP-C5', 'KPP-C8', 'TPP-10.2', 'TPP-11.1'];

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

/* ---- R61 [§S6b]: the whole catalog, run once -----------------------------
 * Three checks read this sweep and the ensemble is not free, so it is
 * memoised the way this file's filesystem reads are. Deterministic in both
 * halves: the mode path takes no draws and runOverviewMc is seeded.
 *
 * Both halves are needed. The mode path is where every year of every scenario
 * is visible field by field; the ensemble is where a stress scenario would
 * actually break, at a draw the mode path never visits.
 * ------------------------------------------------------------------------ */
interface CatalogSweep {
  nonFinite: string[];
  negative: string[];
  rows: number;
}

let catalogSweepMemo: CatalogSweep | null = null;

function sweepCatalog(): CatalogSweep {
  if (catalogSweepMemo) return catalogSweepMemo;
  const signed = new Set(SIGNED_PATH_FIELDS.map((f) => f.field));
  const nonFinite: string[] = [];
  const negative: string[] = [];
  let rows = 0;
  for (const s of MODEL_SCENARIOS) {
    const path = runPath(
      sampleParams(effectiveParams(s.id, null), null), scenarioStructural(s.id));
    for (const d of path.detail) {
      rows += 1;
      const rec = d as unknown as Record<string, number | boolean>;
      for (const key of Object.keys(rec)) {
        const v = rec[key];
        if (typeof v !== 'number') continue;
        if (!isFinite(v)) nonFinite.push(s.id + '@' + d.year + ' ' + key);
        else if (v < 0 && !signed.has(key)) {
          negative.push(s.id + '@' + d.year + ' ' + key + '=' + v.toFixed(2));
        }
      }
    }
    const mc = runOverviewMc(s.id, null);
    const bands: Array<[string, PercentileBand]> = [
      ['total', mc.steady.total], ['newRevenue', mc.steady.newRevenue],
      ['perCapita', mc.steady.perCapita], ['gdpPct', mc.steady.gdpPct],
      ['fedIncrease', mc.steady.fedIncrease], ['matureToday', mc.steady.matureToday]
    ];
    for (const pair of bands) {
      for (const q of ['p10', 'p50', 'p90'] as const) {
        const v = pair[1][q];
        if (!isFinite(v)) nonFinite.push(s.id + ' steady.' + pair[0] + '.' + q);
        else if (v < 0) {
          negative.push(s.id + ' steady.' + pair[0] + '.' + q + '=' + v.toFixed(1));
        }
      }
    }
    for (let i = 0; i < mc.yearBands.length; i += 1) {
      for (const q of ['p10', 'p50', 'p90'] as const) {
        const v = mc.yearBands[i][q];
        if (!isFinite(v)) nonFinite.push(s.id + ' yearBand[' + i + '].' + q);
        else if (v <= 0) {
          negative.push(s.id + ' yearBand[' + i + '].' + q + '=' + v.toFixed(1));
        }
      }
    }
  }
  catalogSweepMemo = { nonFinite, negative, rows };
  return catalogSweepMemo;
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
    rows: () => [
      runGuarded('Bridge decomposition matches engine total exactly', () => {
        const identityError = bridgeSteps(runOverviewMc('SCN-BASE', null)).identityError;
        return { ok: identityError < 0.01, note: 'err=' + identityError.toExponential(1) };
      }),
      /* R156 [§S5]: the bridge draws one mature year and the branch that was
         supposed to carry one-time cost could never fire, because transition
         and IT capital are both zero by then. Keeping the mature-year framing
         means that zero is an ASSUMPTION, so it is checked: if any scenario
         ever puts one-time cost in the bridge's own year, the framing is wrong
         and the build says so rather than the chart quietly dropping it. */
      runGuarded('The bridge year carries no one-time cost, in any scenario', () => {
        const bad: string[] = [];
        for (const sc of MODEL_SCENARIOS) {
          const mc = runOverviewMc(sc.id, null);
          const d = mc.modePath.detail[MATURE_INDEX];
          const oneTime = d.trans + d.itcap + d.shock;
          if (Math.abs(oneTime) > 1e-9) bad.push(sc.id + '=' + oneTime.toFixed(1));
        }
        return {
          ok: !bad.length,
          note: bad.length
            ? 'one-time cost at the bridge year: ' + bad.join(', ')
            : MODEL_SCENARIOS.length + ' scenarios, all zero at 2041'
        };
      }),
      /* R156 [§S5]: and the quantity it excludes is stated, non-zero, and
         equal to what the engine actually spends. A silently-zero exclusion
         note would read as "nothing was left out". */
      runGuarded('The bridge states the one-time cost it excludes', () => {
        const mc = runOverviewMc('SCN-BASE', null);
        const b = bridgeSteps(mc);
        const pathSum = mc.modePath.detail.reduce(
          (a, r) => a + r.trans + r.itcap + r.shock, 0);
        const ok = b.excludedOneTime > 0 &&
          Math.abs(b.excludedOneTime - pathSum) < 1e-9 &&
          BRIDGE_EXCLUSION_NOTE.length > 40 && BRIDGE_IDENTITY_NOTE.length > 40;
        return { ok, note: 'excluded $' + b.excludedOneTime.toFixed(0) + 'B (2023$)' };
      }),
      /* R253 [§S5]: the page demands a costed work package, deliverable,
         owner, gate, contingency and transfer of every dollar, and carried
         none of them. Four are data now; the fifth is a declared open state
         rather than a blank, and this holds it to that. */
      runGuarded('Every transition workstream carries its framework fields', () => {
        const bad = WORKSTREAMS.filter((w) =>
          !w.cpAllocation || !w.exit || !w.boundary || w.cost !== 'allocation-open');
        return {
          ok: !bad.length && WORKSTREAMS.length === 13 &&
            !!WORKSTREAM_OWNER && !!WORKSTREAM_GATE && WORKSTREAM_COST_NOTE.length > 40,
          note: bad.length
            ? 'incomplete: ' + bad.map((w) => w.id).join(', ')
            : WORKSTREAMS.length + ' workstreams, owner ' + WORKSTREAM_OWNER +
              ', ' + WORKSTREAM_GATE + ', dollar allocation open by OI-052'
        };
      })
    ]
  },
  {
    /* R143 [§S5]: the two engines' wealth base, held to one rate class.
       Not held to one VALUE, because they are two independently sourced
       numbers in two dollar years: params.ts has gross $350B x 84% = $294B in
       2023$ growing from 2023, taxparams.ts has net $300B in 2024$ growing
       from 2024. That leaves a constant 4.4% level gap - 0.5% from the bases
       and 3.8% from one extra year of compounding - and forcing it to zero
       would be tuning two sourced figures to each other.
       What must not come back is a RATE divergence, which is what the defect
       was: the ratio used to widen from 1.00 at the base year to 1.41 by
       2042. A constant ratio is the invariant; the level gap is bounded and
       reported so it stays small and stays explained. */
    surface: 'wealth-base.ts',
    rows: () => [runGuarded('Both engines grow the wealth base at one rate', () => {
      const mc = runOverviewMc('SCN-BASE', null);
      const w = TAX_INSTRUMENTS.filter((i) => i.id === 'wealth')[0];
      const ratios: number[] = [];
      mc.years.forEach((y: number, i: number) => {
        /* The BASE, not the revenue: `instrumentRevenue` multiplies by the
           phase-in ramp, which is a policy schedule and halved the first
           comparison year. The ramp is not what R143 is about. */
        const tax = w.rev1x * classGrowth(w.growth, y);
        const hc = mc.modePath.detail[i].wealthRevenue * DEFLATOR_2023_TO_2024;
        if (tax > 0 && hc > 0) ratios.push(tax / hc);
      });
      const lo = Math.min(...ratios), hi = Math.max(...ratios);
      const spread = hi - lo;
      return {
        ok: ratios.length > 10 && spread < 1e-6 && lo > 0.9 && lo < 1.1,
        note: 'ratio ' + lo.toFixed(4) + '-' + hi.toFixed(4) + ' across ' +
          ratios.length + ' years (spread ' + spread.toExponential(1) + ')'
      };
    })]
  },
  {
    /* shape 2: {name, run}[] pushed onto a shared array */
    surface: 'taxmodel.ts',
    rows: () => TAX_SELFTESTS.map((t) => runGuarded(t.name, () => ({ ok: !!t.run() })))
  },
  {
    /* R126 [§S6a]: the wage pass-through spans both engines and was tested in
       neither. model.ts self-test 8 checks the feedback arithmetic in
       isolation; taxmodel.ts's reconciliation test calls
       `distribution(s, year, 0)` with three arguments, so `wageGainB` is
       undefined and the parameter defaults to zero. The mechanism reduces the
       new-revenue requirement on one side and household burden on the other -
       it flatters the plan in both directions at once - and nothing exercised
       the seam it crosses. This is where the two sides meet, so this is where
       the check lives; neither file owns it. */
    surface: 'wage-passthrough',
    rows: () => {
      const YEAR = MATURE_YEAR;
      const mc = runOverviewMc('SCN-BASE', null);
      const d = mc.modePath.detail[MATURE_INDEX];
      const wageB = d.wageGain * DEFLATOR_2023_TO_2024;
      const reliefB = d.householdRelief * DEFLATOR_2023_TO_2024;
      const settings = defaultSettings();
      const withWage = distribution(settings, YEAR, reliefB, wageB);
      const without = distribution(settings, YEAR, reliefB, 0);
      return [
        /* the first half of the row: it is exercised at all, and with a value
           the model actually produces rather than a number invented here. A
           check that ran with wageGainB = 0 would pass and prove nothing. */
        runGuarded('The wage pass-through is exercised with the value the model produces', () => {
          const allocated = withWage.reduce((a, r) => a + r.wageB, 0);
          const shares = TAX_GROUPS.reduce((a, g) => a + g.wageShare, 0);
          const problems: string[] = [];
          if (!(wageB > 0)) problems.push('the model produces no wage gain at ' + YEAR);
          if (Math.abs(shares - 1) > 1e-9) {
            problems.push('wage shares sum to ' + shares.toFixed(6) + ', not 1');
          }
          if (Math.abs(allocated - wageB) > 1e-6) {
            problems.push('allocated ' + allocated.toFixed(3) + ' of ' + wageB.toFixed(3));
          }
          return {
            ok: !problems.length,
            note: problems.join('; ') || '$' + wageB.toFixed(1) + 'B at ' + YEAR +
              ', allocated across ' + TAX_GROUPS.length + ' groups by wage share'
          };
        }),
        /* the second half: net household impact reconciles with the health
           model's wageGain. Every household is better off by its own share of
           the pass-through and by no more, and the totals agree across the
           seam to the dollar. */
        runGuarded('Net household impact reconciles with the health model wage gain', () => {
          const problems: string[] = [];
          let reliefTotalB = 0;
          withWage.forEach((r, i) => {
            const base = without[i];
            const shifted = (base.netPerHH - r.netPerHH) * r.group.hhM * 1e6 / 1e9;
            reliefTotalB += shifted;
            const own = wageB * r.group.wageShare;
            if (Math.abs(shifted - own) > 1e-6) {
              problems.push(r.group.id + ' moved ' + shifted.toFixed(3) +
                ' against a share of ' + own.toFixed(3));
            }
            if (r.netPerHH > base.netPerHH + 1e-9) {
              problems.push(r.group.id + ' is worse off with the pass-through');
            }
          });
          if (Math.abs(reliefTotalB - wageB) > 1e-6) {
            problems.push('total moved ' + reliefTotalB.toFixed(3) +
              ' against a wage gain of ' + wageB.toFixed(3));
          }
          return {
            ok: !problems.length,
            note: problems.slice(0, 3).join('; ') ||
              'household burden falls by $' + reliefTotalB.toFixed(1) +
              'B, the whole of the wage gain, spread by wage share'
          };
        })
      ];
    }
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
      }),
      /* R11 [§S6a]: the disjointness the architecture claims, as a check.
         Not that the offsets draw on non-overlapping dollars - three of the
         four touch hospital spend - but that each names one mechanism, no
         mechanism is claimed twice, and the document that explains the
         architecture names all of them. That is what "one home per mechanism"
         means and it is what constraint 4 actually asks for. */
      runGuarded('Each offset is the only home of its mechanism', () => {
        const problems: string[] = [];
        const seen = new Map<string, string>();
        for (const o of OFFSET_RAMPS) {
          if (!o.mechanism.trim()) problems.push(o.id + ' claims no mechanism');
          if (!o.scope.trim()) problems.push(o.id + ' declares no scope');
          const owner = seen.get(o.mechanism);
          if (owner) problems.push(o.mechanism + ' is claimed by ' + owner + ' and ' + o.id);
          else seen.set(o.mechanism, o.id);
        }
        const undocumented = mechanismsMissingFromDoc(
          OFFSET_RAMPS.map((o) => o.mechanism), OFFSET_ARCHITECTURE_DOC);
        if (undocumented.length) {
          problems.push('not in ' + OFFSET_ARCHITECTURE_DOC + ': ' + undocumented.join('; '));
        }
        return {
          ok: !problems.length,
          note: problems.join(' | ') || seen.size + ' mechanisms, one offset each, ' +
            'all described in ' + OFFSET_ARCHITECTURE_DOC
        };
      }),
      /* R21 [§S6a]: the engine may type a structural number - an index, a
         percent conversion, a bit shift - and nothing else. A model quantity
         reaches it from the registry or from a parameter, so after the fix it
         is not a literal at all. This is what stops the eleventh magic number,
         and it reports the line so the failure names the offender. */
      /* R127 [§S6a], second declared test, added after review: the first held
         that no assertion suppresses the compile error. This holds the property
         the assertion was asserting, over the real scenario catalog rather than
         over two fabricated cases: every balancer a shipped scenario names is a
         scale instrument with a numeric scaleMax. The guard in solveScenario
         throws on the failure; this reports it by name at build time instead of
         at the moment a reader picks the scenario. */
      runGuarded('Every scenario balancer is scale-kind with a numeric scaleMax', () => {
        const bad: string[] = [];
        let named = 0;
        for (const sc of TAX_SCENARIOS) {
          if (!sc.balancer) continue;
          named += 1;
          const ins = TAX_INSTRUMENTS.filter((i) => i.id === sc.balancer)[0];
          if (!ins) { bad.push(sc.id + ' names unknown balancer ' + sc.balancer); continue; }
          if (ins.kind !== 'scale') bad.push(sc.id + '/' + ins.id + ' is kind ' + ins.kind);
          else if (typeof ins.scaleMax !== 'number') {
            bad.push(sc.id + '/' + ins.id + ' has no numeric scaleMax');
          }
        }
        return {
          ok: !bad.length,
          note: bad.join(', ') || named + ' of ' + TAX_SCENARIOS.length +
            ' scenarios name a balancer, each scale-kind with a numeric ceiling'
        };
      }),
      /* R134 [§S6a], second declared test, added after review: no parameter
         graded `high` may have a mode set by analyst judgement. `high` is
         reserved here for an official statistic or a scored estimate; a mode
         the analyst placed is a derivation, which the convention grades
         `medium`. This is the rule publicAdminRate broke, and nothing would
         have caught the next one. */
      runGuarded('No parameter graded high has a mode set by judgement', () => {
        const MARKERS = ['mode set', 'derived', 'assumption', 'analyst', 'judgement'];
        const bad: string[] = [];
        for (const p of PARAM_DEFS) {
          if (p.confidence !== 'high') continue;
          const src = (p.source || '').toLowerCase();
          const hit = MARKERS.filter((m) => src.includes(m));
          if (hit.length) bad.push(p.id + ' (' + hit.join(', ') + ')');
        }
        return {
          ok: !bad.length,
          note: bad.join(', ') || PARAM_DEFS.filter((p) => p.confidence === 'high').length +
            ' parameters graded high, none with a judgement-set mode'
        };
      }),
      /* R21 [§S6a], after review: the literal scan starts at the first sampling
         function, so module-scope declarations above it were invisible to it.
         A named constant there is the right home for a structural value and the
         wrong place to hide a model quantity, so the declarations are scanned
         against their own list. */
      runGuarded('The engine declares no module-scope number outside its list', () => {
        const stray = undeclaredEngineDeclarations(
          ENGINE_DECLARATION_LITERALS.map((s) => s.value));
        return {
          ok: !stray.length,
          note: stray.length
            ? stray.slice(0, 4).map((s) => ENGINE_FILE + ':' + s.line + ' = ' + s.value)
              .join(', ')
            : ENGINE_DECLARATION_LITERALS.length + ' declaration values, above ' +
              'the engine span'
        };
      }),
      /* R25 [§S6a]: how reproducible the published figures are, checked rather
         than assumed. The same model at seven seeds, and the spread of the
         central estimate as a share of its own midpoint. This is the check
         that says what a movement in a later section has to beat before it
         means anything: below this tolerance, a "change" is the ensemble
         drawing different numbers. */
      runGuarded('The ensemble reproduces its published figures across seeds', () => {
        const runs = SEED_STABILITY.seeds.map(
          (s) => runMonteCarlo('SCN-BASE', null, MONTE_CARLO_DRAWS, s));
        const spread = (f: (m: (typeof runs)[0]) => number) => {
          const v = runs.map(f);
          const lo = Math.min(...v), hi = Math.max(...v);
          return 100 * (hi - lo) / ((hi + lo) / 2);
        };
        const hero = spread((m) => m.steady.matureToday.p50);
        const tail = spread((m) => m.steady.matureToday.p90);
        const over = [
          hero > SEED_STABILITY.tolerancePct ? 'hero ' + hero.toFixed(2) + '%' : '',
          tail > SEED_STABILITY.tolerancePct ? 'p90 tail ' + tail.toFixed(2) + '%' : ''
        ].filter(Boolean);
        return {
          ok: !over.length,
          note: over.length
            ? over.join(', ') + ' against a declared ' +
              SEED_STABILITY.tolerancePct + '%'
            : MONTE_CARLO_DRAWS + ' draws x ' + SEED_STABILITY.seeds.length +
              ' seeds: hero ' + hero.toFixed(2) + '%, p90 tail ' + tail.toFixed(2) +
              '%, tolerance ' + SEED_STABILITY.tolerancePct + '%'
        };
      }),
      /* R22 [§S6a]: and nothing works out the mature year for itself. */
      runGuarded('The mature year is derived in one place', () => {
        const stray = matureYearDerivations();
        return {
          ok: !stray.length,
          note: stray.length
            ? stray.map((s) => s.file + ':' + s.line).join(', ')
            : 'index ' + MATURE_INDEX + ' = ' + MATURE_YEAR + ', from ' +
              MATURE_YEAR_HOME
        };
      }),
      /* R127 [§S6a]: and no new one arrives. Each allowed assertion carries a
         reason; anything else fails the build where it was typed. */
      runGuarded('No primitive type assertion outside the declared list', () => {
        const stray = primitiveAssertions();
        return {
          ok: !stray.length,
          note: stray.length
            ? stray.slice(0, 4).map((s) => s.file + ':' + s.line).join(', ')
            : ALLOWED_ASSERTIONS.length + ' allowed, each with a reason'
        };
      }),
      runGuarded('The engine types no number that is not declared structural', () => {
        const stray = unregisteredEngineLiterals(
          ENGINE_STRUCTURAL_LITERALS.map((s) => s.value));
        return {
          ok: !stray.length,
          note: stray.length
            ? stray.slice(0, 4).map((s) => ENGINE_FILE + ':' + s.line + ' = ' + s.value)
              .join(', ') + (stray.length > 4 ? ' (+' + (stray.length - 4) + ' more)' : '')
            : ENGINE_STRUCTURAL_LITERALS.length + ' structural values declared, ' +
              ENGINE_CONSTANTS.length + ' constants registered'
        };
      }),
      /* And the other direction. A registry that documents a constant the
         engine stopped reading is worse than no registry: it reads as
         provenance for arithmetic that is no longer there. */
      runGuarded('Every registered engine constant is read by the engine', () => {
        const unread = unreadEngineConstants(ENGINE_CONSTANTS.map((c) => c.id));
        const ungraded = ENGINE_CONSTANTS.filter((c) => !c.basis.trim() || !c.confidence);
        return {
          ok: !unread.length && !ungraded.length,
          note: unread.length || ungraded.length
            ? 'unread: ' + (unread.join(', ') || 'none') + '; ungraded: ' +
              (ungraded.map((c) => c.id).join(', ') || 'none')
            : ENGINE_CONSTANTS.length + ' constants, all read and graded'
        };
      }),
      /* R21 [§S6a]: the four sponsor shares the engine used to restate. It
         divides MONEYFLOW now, so this holds the arithmetic the engine
         actually performed against the map, not the constant against itself:
         a share is recovered back out of a computed path row. */
      runGuarded("The engine's sponsor shares are the money-flow map's", () => {
        const t = MATURE_INDEX;
        const p = sampleParams(effectiveParams('SCN-BASE', null), null);
        const d = runPath(p, {}).detail[t];
        const covR = RAMPS.coverage[t];
        const recovered: Record<string, number> = {
          fed: d.fedRedirect / (d.nheBase * covR),
          state: d.stateMoe / (d.nheBase * covR * engineConstant('stateMoeFraction')),
          emp: d.empContrib / (d.nheBase * covR * (p.employerCapture / 100)),
          hh: (d.householdRelief + d.nheNha * (p.residualPrivateShare / 100) *
            engineConstant('oopShareOfResidual')) / (d.nheBase * covR)
        };
        const bad: string[] = [];
        for (const src of MONEYFLOW.sources) {
          const want = src.value / MONEYFLOW.total;
          const got = recovered[src.id];
          if (got === undefined) continue;
          if (Math.abs(got - want) > 1e-9) {
            bad.push(src.id + ' engine ' + got.toFixed(6) + ' vs map ' + want.toFixed(6));
          }
        }
        return {
          ok: !bad.length,
          note: bad.join(', ') || Object.keys(recovered).length +
            ' shares recovered from the 2041 path row, all equal to MONEYFLOW: ' +
            'fed ' + SPONSOR_SHARE.federal.toFixed(4) + ', state ' +
            SPONSOR_SHARE.stateLocal.toFixed(4) + ', emp ' +
            SPONSOR_SHARE.employer.toFixed(4) + ', hh ' + SPONSOR_SHARE.household.toFixed(4)
        };
      }),
      /* R21 [§S6a]: the embedded-drug split is graded `low` on the strength of
         being unable to move a published number, so that claim is the thing to
         check. The two shares sum to 1, which is what makes the transfer net
         to zero across the categories: hospital and clinical give up exactly
         what the drug base takes on. Both then carry the same payment factor
         and the same utilization term, so their sum is untouched too. */
      /* R27 + R33 [§S6a]: every parameter whose own research file recommends a
         range either covers that range or says out loud that it does not, and
         which way it leans. publicAdminRate used to fail the first half
         silently: 1.5-3.2 against a recommended 2-6, with the 5-6% it cited in
         its own source string unreachable by any draw. */
      runGuarded('Every parameter covers its research recommendation or declares the gap', () => {
        const problems: string[] = [];
        const declared: string[] = [];
        for (const rec of RESEARCH_RECOMMENDATIONS) {
          const p = PARAMS_BY_ID[rec.id];
          if (!p) { problems.push(rec.id + ' has no parameter'); continue; }
          const covers = p.low <= rec.low + 1e-9 && p.high >= rec.high - 1e-9;
          if (covers) {
            if (p.divergence) problems.push(rec.id + ' declares a divergence it does not have');
            continue;
          }
          if (!p.divergence) {
            problems.push(rec.id + ' implements ' + p.low + '-' + p.high +
              ' against a recommended ' + rec.low + '-' + rec.high + ' and says nothing');
            continue;
          }
          if (!divergenceNamesRecommendation(
            p.divergence.note, p.divergence.recommended)) {
            problems.push(rec.id + ' declares a divergence whose note never names ' +
              p.divergence.recommended);
          }
          declared.push(rec.id + ' ' + p.divergence.leans);
        }
        return {
          ok: !problems.length,
          note: problems.join(' | ') || RESEARCH_RECOMMENDATIONS.length +
            ' recommendations checked, declared divergences: ' +
            (declared.join(', ') || 'none')
        };
      }),
      /* R33 [§S6a]: and the note reaches a reader. */
      runGuarded('The parameter explorer renders the divergence notes', () => ({
        ok: divergenceIsRendered(),
        note: PARAM_DEFS.filter((p) => p.divergence).length +
          ' parameters carry a divergence note'
      })),
      /* R134 [§S6a]: a slider cannot push a parameter out of its own domain.
         R63 closed this for scenario `mult` and swept scenarios only; the
         slider path re-centres the band and rebuilds the spread, which reaches
         further. Both slider ends of every adjustable parameter are swept. */
      /* R127 [§S6a]: the control whose assertions hid a defect declares its
         own bounds, and they contain the value it opens at. Without both, the
         slider rendered min="undefined" and step="NaN" and nothing said so. */
      runGuarded('Every adjustable parameter declares slider bounds around its mode', () => {
        const bad: string[] = [];
        for (const p of PARAM_DEFS) {
          if (!p.adjustable) continue;
          if (typeof p.sliderMin !== 'number' || typeof p.sliderMax !== 'number') {
            bad.push(p.id + ' declares no bounds');
            continue;
          }
          if (p.sliderMin >= p.sliderMax) bad.push(p.id + ' bounds do not increase');
          else if (p.mode < p.sliderMin || p.mode > p.sliderMax) {
            bad.push(p.id + ' opens at ' + p.mode + ', outside ' +
              p.sliderMin + '-' + p.sliderMax);
          }
        }
        return {
          ok: !bad.length,
          note: bad.join(', ') ||
            PARAM_DEFS.filter((p) => p.adjustable).length + ' adjustable parameters'
        };
      }),
      runGuarded('No slider position pushes a parameter out of its domain', () => {
        const breaches: string[] = [];
        for (const def of PARAM_DEFS) {
          if (!def.adjustable) continue;
          const cap = naturalCeiling(def);
          if (cap == null) continue;
          for (const at of [def.sliderMin, def.sliderMax]) {
            if (typeof at !== 'number') continue;
            const eff = effectiveParams('SCN-BASE', { [def.id]: at })[def.id];
            const worst = Math.max(eff.low, eff.mode, eff.high);
            const least = Math.min(eff.low, eff.mode, eff.high);
            if (worst > cap + 1e-9 || least < -1e-9) {
              breaches.push(def.id + '@' + at + ' -> ' + least.toFixed(1) + '..' +
                worst.toFixed(1) + ' (domain 0..' + cap + ')');
            }
          }
        }
        const swept = PARAM_DEFS.filter((p) => p.adjustable && naturalCeiling(p) != null);
        return {
          ok: !breaches.length,
          note: breaches.slice(0, 4).join(', ') ||
            swept.length + ' bounded adjustable parameters, both slider ends'
        };
      }),
      runGuarded('The embedded-drug split nets to zero across the categories', () => {
        const e = 250;
        const split = baselineCategorySplit(e);
        const shares = EMBEDDED_DRUG_HOSPITAL_SHARE + EMBEDDED_DRUG_CLINIC_SHARE;
        const before = BASE2023.hospital + BASE2023.physician + BASE2023.otherProf +
          BASE2023.rxRetail;
        const after = split.hosp0 + split.clin0 + split.drug0;
        return {
          ok: Math.abs(shares - 1) < 1e-12 && Math.abs(after - before) < 1e-9,
          note: 'shares sum ' + shares.toFixed(12) + ', categories ' +
            before.toFixed(1) + ' -> ' + after.toFixed(1) +
            ', program input growth ' + (100 * PROGRAM_INPUT_REAL_GROWTH).toFixed(1) + '%/yr'
        };
      })
    ]
  },
  {
    /* R61 [§S6b, AC5, AC8]: the stress catalog, executed. Nothing in
       scenarios.ts pushed a self-test and the engine's Monte Carlo check ran
       the base case alone, so the apparatus the model's robustness claims rest
       on was never run by anything. */
    surface: 'scenarios.ts',
    rows: () => [
      /* R60 [§S6b, AC4]: the guard that refuses an unresolvable key runs at
         module load, which means a build that reaches this row has already
         passed it. So the row holds the mechanism instead of the outcome: a
         fabricated catalog with a key that names nothing has to be caught,
         and the shipped one has to be clean. Asserting only the second would
         be a check that passes whether or not the validator works.

         The two halves are not symmetric, and finding that out is worth
         recording. `structural` is a typed interface, so a bad knob on a
         scenario literal is a compile error - and it became a BUILD error
         only in this section, when the build started running astro check.
         `overrides` is Record<string, ScenarioOverride>, so every string key
         type-checks and the compiler can never help: for override keys the
         runtime guard is the only thing there is. The probe below is built
         through a widened shape for exactly that reason, since a literal
         carrying the bad knob would not compile. */
      runGuarded('An override naming no parameter or knob is refused', () => {
        const ids = PARAM_DEFS.map((p) => p.id);
        const live = unknownOverrideKeys(MODEL_SCENARIOS, ids)
          .concat(unknownStructuralKeys(MODEL_SCENARIOS));
        const probe = [{
          id: 'SCN-PROBE', name: 'probe', desc: 'probe',
          overrides: {
            thisParameterDoesNotExist: { to: [1, 2, 3], why: 'probe', confidence: 'low' }
          },
          structural: { thisKnobDoesNotExist: 1, why: 'probe' }
        }] as unknown as typeof MODEL_SCENARIOS;
        const caught = unknownOverrideKeys(probe, ids)
          .concat(unknownStructuralKeys(probe));
        const problems: string[] = [];
        if (live.length) problems.push('live catalog: ' + live.join(', '));
        if (caught.length !== 2) {
          problems.push('the validator caught ' + caught.length + ' of 2 probes');
        }
        return {
          ok: !problems.length,
          note: problems.join(' | ') || MODEL_SCENARIOS.reduce(
            (n, s) => n + Object.keys(s.overrides).length, 0) +
            ' override keys and every structural knob resolve; both probes caught'
        };
      }),
      /* And the other direction: a knob a scenario can set that the engine
         never reads is a control that does nothing, which is the same silence
         wearing the opposite coat. */
      runGuarded('Every structural knob is read by the engine', () => {
        const unread = unreadStructuralKnobs(STRUCTURAL_KNOBS);
        return {
          ok: !unread.length,
          note: unread.join(', ') || STRUCTURAL_KNOBS.length +
            ' knobs declared, each read in ' + ENGINE_FILE
        };
      }),
      /* New finding [§S6b], not in any row: a control at its far end builds a
         band that is a multiple of the researched high, and the multiple grows
         silently whenever a base band is widened. S6a widened publicAdminRate
         and took the band its slider builds at 6% from about 8.7% to 16.4%
         with nothing anywhere noticing. Declared and held, so the next one has
         to be written down. */
      runGuarded('The widest band a control can build is the declared one', () => {
        const reach = sliderBandReach();
        const worst = reach[0];
        const problems: string[] = [];
        if (!worst) problems.push('no adjustable parameter has a slider ceiling');
        else if (worst.id !== SLIDER_REACH_DECLARED.id) {
          problems.push('the widest is now ' + worst.id + ' at x' +
            worst.times.toFixed(2) + ', declared ' + SLIDER_REACH_DECLARED.id);
        } else if (Math.abs(worst.times - SLIDER_REACH_DECLARED.times) >
            SLIDER_REACH_TOLERANCE) {
          problems.push(worst.id + ' now reaches x' + worst.times.toFixed(2) +
            ', declared x' + SLIDER_REACH_DECLARED.times);
        }
        return {
          ok: !problems.length,
          note: problems.join(' | ') || reach.length +
            ' controls, widest ' + SLIDER_REACH_DECLARED.id + ' at x' +
            SLIDER_REACH_DECLARED.times.toFixed(2) + ', then ' +
            reach.slice(1, 3).map((r) => r.id + ' x' + r.times.toFixed(2)).join(', ')
        };
      }),
      /* R142 [§S6b, AP6]: sliders rebuild the spread from the OVERRIDDEN
         triple, so the same slider value carries different uncertainty in
         different scenarios and the interface never said so. The rule behind
         it is exact: reshape the triple and the band moves, scale it and the
         band does not. Both directions are asserted, so a change to how
         sliders rebuild spread cannot pass by making every case agree. */
      runGuarded('Slider spread follows the scenario, and follows one rule', () => {
        const d = spreadDependence();
        const problems = d.wrongWay.slice();
        if (!d.differing.length) {
          problems.push('no scenario changes the band at a fixed slider value');
        }
        if (!d.identical.length) {
          problems.push('no scenario leaves the band unchanged');
        }
        if (!sliderSpreadNote().includes('depends on the scenario')) {
          problems.push('the note never says the band depends on the scenario');
        }
        return {
          ok: !problems.length,
          note: problems.slice(0, 4).join(' | ') || d.differing.length +
            ' reshaped overrides move the band, ' + d.identical.length +
            ' scaled ones leave it, no exceptions'
        };
      }),
      /* R237 [§S6b, AC7]: the band is proportional to wherever the slider is
         put, so it closes to nothing at zero and the parameter silently leaves
         the ensemble. The row allows either an absolute floor or a statement
         on the control; this is the statement, because a floor would be a
         number with no evidence behind it. The set that can collapse is held
         in both directions, so a parameter that gains a zero slider end is
         either added to the list or fails the build. */
      runGuarded('Every parameter whose band can close to nothing is declared', () => {
        const measured = collapsingSliderParameters();
        const undeclared = measured.filter((m) => !SPREAD_COLLAPSE_DECLARED.includes(m));
        const stale = SPREAD_COLLAPSE_DECLARED.filter((d) => !measured.includes(d));
        const problems = undeclared.map((u) => u + ' collapses and is not declared')
          .concat(stale.map((s) => s + ' is declared and does not collapse'));
        if (!spreadNoteIsRendered()) problems.push('no page tells the reader');
        if (!sliderSpreadNote().includes('proportion')) {
          problems.push('the note never says the band is proportional');
        }
        return {
          ok: !problems.length,
          note: problems.join(' | ') || measured.length + ' of ' +
            PARAM_DEFS.filter((p) => p.adjustable).length +
            ' adjustable parameters reach a zero-width band at a slider end: ' +
            measured.join(', ')
        };
      }),
      /* R141 [§S6b, AP4]: 52 magnitudes and no way to say where any of them
         came from. The provenance is checked for substance rather than
         presence: a medium grade has to name a figure, and a scenario cannot
         call its magnitudes sourced while resting on judgement. */
      runGuarded('Every scenario magnitude carries a reason and a grade', () => {
        const problems = provenanceProblems();
        const counts = provenanceGradeCounts();
        return {
          ok: !problems.length,
          note: problems.slice(0, 4).join(' | ') ||
            (counts.high + counts.medium + counts.low) + ' overrides graded: ' +
            counts.low + ' low, ' + counts.medium + ' medium, ' + counts.high +
            ' high, plus ' +
            MODEL_SCENARIOS.filter((s) => s.structural).length +
            ' structural blocks, each with its reason'
        };
      }),
      /* And it reaches the reader choosing the scenario, not only the file. */
      runGuarded('The scenario picker shows what each magnitude rests on', () => {
        const assumed = MODEL_SCENARIOS.filter((s) => s.basis === 'assumed').length;
        const sourced = MODEL_SCENARIOS.filter((s) => s.basis === 'sourced').length;
        const problems: string[] = [];
        const unread = scenarioProvenanceNotRendered();
        if (unread.length) {
          problems.push('the picker never reads ' + unread.join(', '));
        }
        if (assumed + sourced !== MODEL_SCENARIOS.length) {
          problems.push((MODEL_SCENARIOS.length - assumed - sourced) +
            ' scenarios declare no basis');
        }
        return {
          ok: !problems.length,
          note: problems.join(' | ') || sourced + ' sourced, ' + assumed +
            ' assumed, all shown with the scenario'
        };
      }),
      /* R139 [§S6b, AP1]: AP1 found the catalog respecting exactly one real
         constraint - no override above its parameter's sliderMax - and asked
         that it be written down. It is not respected any more, and it was
         being respected by coincidence: S6a widened publicAdminRate's high to
         6% and SCN-STATE-RESIST's 1.15 multiplier now reaches 6.9% against a
         6% ceiling. So the row's declared test would fail the build today.

         What ships is the declared-exception pattern this repo already uses:
         the one override that steps outside its slider range is named with its
         reason, and the check holds the declared set equal to the measured one
         in BOTH directions. A new one fails the build until somebody writes
         down why; a stale entry fails it too, so the list cannot outlive the
         fact it describes. */
      runGuarded('Every override outside its slider range is declared', () => {
        const measured = bandCounts().beyondSlider;
        const declared = OVERRIDES_BEYOND_SLIDER.map(
          (o) => o.scenario + '/' + o.param);
        const undeclared = measured.filter((m) => !declared.includes(m));
        const stale = declared.filter((d) => !measured.includes(d));
        const unexplained = OVERRIDES_BEYOND_SLIDER
          .filter((o) => o.why.trim().length < 60)
          .map((o) => o.scenario + '/' + o.param + ' gives no reason');
        const problems = undeclared.map((u) => u + ' is not declared')
          .concat(stale.map((s) => s + ' is declared and does not happen'))
          .concat(unexplained);
        return {
          ok: !problems.length,
          note: problems.join(' | ') || declared.length +
            ' declared, each with its reason: ' + (declared.join(', ') || 'none')
        };
      }),
      /* And the relationship itself, where a reader can see it. Declaring what
         low and high mean inside params.ts and never showing it would be the
         same silence at a new address. The note is assembled from the counts
         rather than stating them, so it cannot drift; what is checked here is
         that it reaches the page and that it names the three things a reader
         needs to tell design from defect. */
      runGuarded('The parameter bands say what they are, where a reader can see them', () => {
        const note = paramBandNote();
        const c = bandCounts();
        /* Review [§S6b]: this matched three prose phrases, and rewording the
           note to make it TRUER broke it. Worse, the phrase it insisted on was
           part of the false claim. Match the measured numbers instead: they
           are what makes the sentence honest, a rewrite that keeps them stays
           green, and no amount of vague prose satisfies them.

           The three tiers are the correction itself. The note used to tell a
           reader that what cannot be crossed comes from the unit, and for the
           14 parameters that are dollar amounts and growth rates the unit
           gives no ceiling at all. Both axes of the code review found that
           sentence independently. */
        const mustState = [c.unitCapped, c.sliderCapped, c.floorOnly,
          c.outsideBase, c.overrides, c.parameters];
        const unstated = mustState.filter((n) => !note.includes(String(n)));
        const problems: string[] = [];
        if (!bandNoteIsRendered()) problems.push('the note reaches no page');
        if (unstated.length) {
          problems.push('the note states none of: ' + unstated.join(', '));
        }
        if (c.unitCapped + c.sliderCapped + c.floorOnly !== c.parameters) {
          problems.push('the bound tiers do not sum to the catalog');
        }
        return {
          ok: !problems.length,
          note: problems.join(' | ') || c.outsideBase + ' of ' + c.overrides +
            ' overrides outside the base band; upper bounds ' + c.unitCapped +
            ' from the unit, ' + c.sliderCapped + ' from a slider, ' +
            c.floorOnly + ' with none, all stated on the page'
        };
      }),
      runGuarded('The catalog holds one base case and its declared stress set', () => {
        const problems = catalogShapeProblems();
        return {
          ok: !problems.length,
          note: problems.join(' | ') || STRESS_SCENARIO_COUNT +
            ' stress scenarios plus ' + BASE_SCENARIO_ID + ', ids unique and named'
        };
      }),
      runGuarded('Every scenario runs and produces finite output', () => {
        const sweep = sweepCatalog();
        return {
          ok: !sweep.nonFinite.length,
          note: sweep.nonFinite.slice(0, 4).join(', ') ||
            MODEL_SCENARIOS.length + ' scenarios, ' + sweep.rows +
            ' path rows and every published band finite'
        };
      }),
      runGuarded('No scenario produces a negative cost', () => {
        const sweep = sweepCatalog();
        return {
          ok: !sweep.negative.length,
          note: sweep.negative.slice(0, 4).join(', ') ||
            'all costs and bands non-negative across ' + MODEL_SCENARIOS.length +
            ' scenarios, ' + SIGNED_PATH_FIELDS.length + ' signed field declared: ' +
            SIGNED_PATH_FIELDS.map((f) => f.field).join(', ')
        };
      })
      /* R61's fourth declared assertion, shares in [0,1], is NOT here: model.ts
         check 5f already sweeps pubShare over every scenario at three corners
         of the declared parameter space and every year, which reaches strictly
         further than a mode-path sweep would. AC5 predates it. Adding a weaker
         copy would have raised the test count and covered nothing new. */
    ]
  },
  {
    /* R26 [§S6a]: the $4.75T figure. research/01 calls deriving what it
       represents the single most important open question in the repository,
       and it stayed open because everyone looked for the answer in prose. The
       framework's own catalog states it: KPP-C2 computes per-capita system
       cost from total-system cost and names $4.75T as that total. So the claim
       has a basis, the chart carries it, and these hold both. */
    surface: 'benchmarks.ts',
    rows: () => [
      runGuarded('Every benchmark line declares its accounting basis', () => {
        const rows = benchmarkChartRows(runOverviewMc('SCN-BASE', null),
          DEFLATOR_2023_TO_2024);
        const thin = rows.filter((r) => !r.basis || r.basis.trim().length < 20);
        return {
          ok: !thin.length,
          note: thin.length
            ? 'no basis: ' + thin.map((r) => r.label).join(', ')
            : rows.length + ' lines, each with a stated basis'
        };
      }),
      runGuarded("The stated figure is drawn from the declared constant", () => {
        const rows = benchmarkChartRows(runOverviewMc('SCN-BASE', null),
          DEFLATOR_2023_TO_2024);
        const claim = rows.filter((r) => r.mid === FRAMEWORK_CLAIM.mode)[0];
        const problems: string[] = [];
        if (!claim) problems.push('no row carries the claim');
        else {
          if (claim.lo !== FRAMEWORK_CLAIM.low) problems.push('low typed, not read');
          if (claim.hi !== FRAMEWORK_CLAIM.high) problems.push('high typed, not read');
          if (claim.basis !== FRAMEWORK_CLAIM.basis) problems.push('basis restated');
        }
        if (!FRAMEWORK_CLAIM.basisSource.trim()) problems.push('basis has no source');
        /* Review: this asserted the field equalled its own literal value, which
           is the check checking itself. What the field claims is that the chart's
           model row is THAT band of the ensemble, so that is what is compared. */
        const mc = runOverviewMc('SCN-BASE', null);
        const named = (mc.steady as unknown as Record<string, PercentileBand>)[
          FRAMEWORK_CLAIM.comparableWith];
        const modelRow = rows[0];
        if (!named) {
          problems.push('comparableWith names no band the model publishes: ' +
            FRAMEWORK_CLAIM.comparableWith);
        } else if (Math.abs(named.p50 * DEFLATOR_2023_TO_2024 - (modelRow.mid || 0)) > 1e-6) {
          problems.push('the chart draws a different quantity from the one ' +
            FRAMEWORK_CLAIM.comparableWith + ' names');
        }
        return {
          ok: !problems.length,
          note: problems.join(', ') || 'basis: ' + FRAMEWORK_CLAIM.basis
        };
      }),
      /* And the readout says which way the comparison came out, computed from
         the model rather than typed on the page. The prose it replaced had
         gone stale: it said the model reached the claim under the optimistic
         scenario, and by then no scenario did. */
      runGuarded("The claim readout states the measured gap", () => {
        const mc = runOverviewMc('SCN-BASE', null);
        const text = benchmarkText(mc, DEFLATOR_2023_TO_2024).frameworkClaimResult;
        const mid = mc.steady.matureToday.p50 * DEFLATOR_2023_TO_2024;
        const pct = Math.abs(100 * (mid / FRAMEWORK_CLAIM.mode - 1)).toFixed(1);
        const ok = text.includes(pct + '%') &&
          text.includes(FRAMEWORK_CLAIM.basis.toLowerCase()) &&
          /never a target/.test(text);
        return { ok: ok, note: ok ? 'model is ' + pct + '% from the claim' : text.slice(0, 120) };
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
    /* R214 + R296 [§S7]: one owner for the retail drug line */
    surface: 'medications.ts',
    rows: () => [
      /* The drug base is not an independent number. It is the CMS line this
         repository calibrates on, plus the modal non-retail estimate, both
         deflated once. Reading it back out of BASE2023 is what stops a second
         retail figure being introduced beside it, which is what BJ5 found. */
      runGuarded('The drug base decomposes into the CMS line the model owns', () => {
        const d = DEFLATOR_2023_TO_2024;
        const retailOk = Math.abs(DRUG_BASE.retail - BASE2023.rxRetail * d) < 1e-9;
        const nonOk = Math.abs(
          DRUG_BASE.nonRetail - PARAMS_BY_ID.embeddedDrugSpend.mode * d) < 1e-9;
        const sumOk = Math.abs(
          DRUG_BASE.retail + DRUG_BASE.nonRetail - DRUG_BASE.total) < 1e-9;
        /* The calculator's literal is do-not-touch (§Z, §BY4). It is held to
           the derivation at the precision the page publishes instead. */
        const literalOk = Math.abs(DRUG_BASE.total - ALL_DRUG_SPEND_2024) < 0.05;
        return {
          ok: retailOk && nonOk && sumOk && literalOk,
          note: '$' + DRUG_BASE.retail.toFixed(1) + 'B retail + $' +
            DRUG_BASE.nonRetail.toFixed(1) + 'B non-retail = $' +
            DRUG_BASE.total.toFixed(1) + 'B, published as $' +
            ALL_DRUG_SPEND_2024.toFixed(1) + 'B'
        };
      }),
      /* R296 [§S7]: BY2's finding, as a rule. A segment label that is not the
         value its width encodes is what made the model look as though it
         decomposes into the official figure. */
      runGuarded('The spend bar labels equal the values its widths encode', () => {
        const fromRetailWidth = (DRUG_BASE.retailPct / 100) * DRUG_BASE.total;
        const fromNonWidth = (DRUG_BASE.nonRetailPct / 100) * DRUG_BASE.total;
        const ok = Math.abs(fromRetailWidth - DRUG_BASE.retail) < 0.05 &&
          Math.abs(fromNonWidth - DRUG_BASE.nonRetail) < 0.05 &&
          Math.abs(DRUG_BASE.retailPct + DRUG_BASE.nonRetailPct - 100) < 1e-9;
        return {
          ok,
          note: DRUG_BASE.retailPct.toFixed(2) + '% = $' +
            fromRetailWidth.toFixed(1) + 'B, labelled $' +
            DRUG_BASE.retail.toFixed(1) + 'B'
        };
      }),
      runGuarded('The chapter builds both segments from the model, not from a literal', () => {
        const missing = drugBaseNotRendered();
        const literals = literalRetailTotals();
        return {
          ok: !missing.length && !literals.length,
          note: (missing.length ? 'unread: ' + missing.join(', ') + '. ' : '') +
            (literals.length
              ? 'hand-typed retail totals: ' + literals.join(', ')
              : 'all ' + DRUG_BASE_READS.length + ' fields read, no literal in $' +
                RETAIL_BAND_LOW + '-' + RETAIL_BAND_HIGH + 'B')
        };
      }),
      /* R173 + R204 [§S7]: the note is held to the five figures a reader needs
         in order to know what the savings figures are, not to its wording, so
         it can be rewritten and still has to say them. */
      runGuarded('The chapter says its base is modal and says its base year', () => {
        const note = drugBaseNote();
        const missing = DRUG_BASE_NOTE_FIGURES.filter((f) => !note.includes(f));
        const rendered = drugBaseNoteIsRendered();
        return {
          ok: !missing.length && rendered && /modal/.test(note),
          note: !rendered
            ? 'the note is not rendered on ' + MEDICATIONS_PAGE
            : missing.length
              ? 'the note no longer states: ' + missing.join(', ')
              : 'states ' + DRUG_BASE_NOTE_FIGURES.length + ' measured figures, $' +
                DRUG_BASE.low.toFixed(1) + 'B to $' + DRUG_BASE.high.toFixed(1) +
                'B around a $' + DRUG_BASE.total.toFixed(1) + 'B mode'
        };
      })
    ]
  },
  {
    /* R174 + R175 + R176 [§S7]: the portfolio's own provenance */
    surface: 'medications-portfolio',
    rows: () => [
      /* R175 [§S7]: the principle is the only thing that assigns a phase, so
         the published increments are what it produces. §BJ hand-counted the
         methodology independently and got the same four numbers; this holds
         the derivation to them. */
      runGuarded('Every family\'s phase is derived from its dosage-form class', () => {
        const counts = familyPhaseCounts();
        const ok = FAMILIES.length === 200 && counts.P5 === 61 &&
          counts.P6 === 116 && counts.P7 === 11 && counts.P8 === 12 &&
          FAMILIES.every((f) => f.phase === PHASE_FOR_CLASS[f.formClass]);
        return {
          ok,
          note: FAMILIES.length + ' families, ' + counts.P5 + '/' + counts.P6 +
            '/' + counts.P7 + '/' + counts.P8 + ' across P5 to P8'
        };
      }),
      /* And the class is not just the phase written twice. The essential forms
         are read independently, and every family the reading disagrees with
         has to say why. Held in both directions: a stale reason fails too. */
      runGuarded('Every family whose forms disagree with its class says why', () => {
        const undeclared = undeclaredFormClasses();
        const stale = staleFormClassDeclarations();
        const shallow = shallowFormClassReasons();
        const declared = FAMILIES.filter((f) => f.why).length;
        return {
          ok: !undeclared.length && !stale.length && !shallow.length,
          note: undeclared.length
            ? 'undeclared: ' + undeclared.slice(0, 3).join('; ')
            : stale.length
              ? 'reason no longer needed: ' + stale.join(', ')
              : shallow.length
                ? 'reason under ' + FAMILY_WHY_FLOOR + ' chars: ' + shallow.join(', ')
                : (200 - declared) + ' read off the forms, ' + declared +
                  ' declared with a reason'
        };
      }),
      /* R174 [§S7]: and every family carries both fields, with the grade the
         basis of its own assignment supports. BY6 found `high` published on
         the portfolio while the data graded nothing at all. */
      runGuarded('Every drug family carries a source and a confidence grade', () => {
        const grades = familyGradeCounts();
        const ok = FAMILIES.every((f) =>
          FAMILY_SOURCES[f.source] !== undefined && f.confidence.length > 0) &&
          grades.high + grades.medium === 200 &&
          Object.keys(FAMILY_SOURCES).every((k) =>
            FAMILIES.some((f) => f.source === k));
        return {
          ok,
          note: grades.high + ' high, ' + grades.medium + ' medium, across ' +
            Object.keys(FAMILY_SOURCES).length + ' declared sources'
        };
      }),
      /* R176 [§S7]: the six reasons are a union, and the tab's filter offers
         exactly the reasons some family carries. */
      runGuarded('Every inclusion reason is a member of the declared union', () => {
        const unknown = unknownFamilyTags();
        const unused = unusedFamilyTags();
        const offered = medicationsFilterReasons();
        const missingFromPage = FAMILY_TAGS.filter((t) => !offered.includes(t));
        const strayOnPage = offered.filter((t) => !(FAMILY_TAGS as readonly string[]).includes(t));
        return {
          ok: !unknown.length && !unused.length && !missingFromPage.length &&
            !strayOnPage.length,
          note: unknown.length
            ? 'not in the union: ' + unknown.join(', ')
            : unused.length
              ? 'declared and unused: ' + unused.join(', ')
              : missingFromPage.length || strayOnPage.length
                ? 'the filter and the union disagree: ' +
                  (missingFromPage as readonly string[]).concat(strayOnPage).join(', ')
                : FAMILY_TAGS.length + ' reasons, all used, all offered by the filter'
        };
      }),
      /* R175 [§S7]: and the principle reaches a reader. AZ4 called it coherent
         and undocumented; documenting it in the module and not on the tab
         would leave it exactly as invisible as it was. */
      runGuarded('The tab states what decides a family\'s phase', () => {
        const rows = phasePrinciple();
        const ordered = rows.map((r) => r.phase).join(',');
        return {
          ok: phasePrincipleIsRendered() && rows.length === 4 &&
            ordered === 'P5,P6,P7,P8',
          note: phasePrincipleIsRendered()
            ? rows.map((r) => r.phase + ' ' + r.formClass).join(', ')
            : 'the principle is not rendered on ' + MEDICATIONS_PAGE
        };
      })
    ]
  },
  {
    /* R50 [§S7]: two controls for one quantity, and what they actually do */
    surface: 'drug-lever.ts',
    rows: () => [
      /* R50's own checkable claim was that the two figures should be equal at
         identical settings. They are not, and wiring the sliders would not
         make them equal: the tab multiplies a 2024-scale base and the engine
         multiplies a base grown to the mature year, so the gap is a growth
         factor, not a wiring fault. The claim is replaced by the measurement,
         and the measurement is what the page states. The band is wide because
         the factor moves with the growth parameters; it is narrow enough that
         a change of basis on either side fails it. */
      runGuarded('The two drug-price controls are separate, and the page says by how much', () => {
        const d = DRUG_LEVER;
        const note = drugLeverNote();
        const missing = DRUG_LEVER_NOTE_FIGURES.filter((f) => !note.includes(f));
        const rendered = drugLeverNoteIsRendered();
        const inBand = d.ratio > 1.5 && d.ratio < 3.0;
        return {
          ok: !missing.length && rendered && inBand && d.tabLever > 0,
          note: !rendered
            ? 'the note is not rendered on ' + MEDICATIONS_PAGE
            : missing.length
              ? 'the note no longer states: ' + missing.join(', ')
              : 'at ' + d.cut.toFixed(0) + '% the tab reports $' +
                d.tabLever.toFixed(0) + 'B and the engine $' +
                d.modelSaving.toFixed(0) + 'B at ' + d.matureYear + ', ratio ' +
                d.ratio.toFixed(3)
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
      /* R38 [§S5]: a display-only dataset stays out of the revenue engine.
         The row's real concern is that nothing prevented a later join, and a
         label cannot prevent one. WEALTH_DIST carries 2026:Q1 NOMINAL levels
         inside a 2024$ model, so a join would mix dollar years silently. */
      runGuarded('No display-only dataset is reachable from the revenue engine', () => {
        const displayOnly = DATASET_VINTAGES.filter((v) => !v.computes).map((v) => v.id);
        const found = displayOnlyDatasetsInEngine(displayOnly);
        return {
          ok: !found.length && displayOnly.length > 0,
          note: found.length
            ? found.join(', ') + ' named in ' + REVENUE_ENGINE
            : displayOnly.length + ' display-only datasets, none in ' + REVENUE_ENGINE
        };
      }),
      /* R217 [§S5]: no page types a household count. Fifth inconsistency
         of its kind in the audit, so it is a rule rather than an edit. */
      runGuarded('No page types a household count', () => {
        const typed = typedHouseholdCounts();
        return {
          ok: !typed.length,
          note: typed.length
            ? typed.map((c) => c.file + ':' + c.line + ' "' + c.text + '"').join(', ')
            : 'household counts are rendered from the series they describe'
        };
      }),
      /* R253 [§S5]: the envelope is derived, and the page does not type it. */
      runGuarded('The rollout page types no transition-envelope figure', () => {
        const typed = typedEnvelopeLiterals();
        const env = transitionEnvelope();
        return {
          ok: !typed.length,
          note: typed.length
            ? typed.map((c) => c.file + ':' + c.line + ' "' + c.text + '"').join(', ')
            : 'derived: $' + (env.low / 1000).toFixed(1) + 'T-$' + (env.high / 1000).toFixed(1) +
              'T, central $' + (env.mode / 1000).toFixed(1) + 'T, from ' + env.parts.join(' + ')
        };
      }),
      /* R157 [§S5]: the baseline PHC category split, defined once. */
      runGuarded('The baseline category split has one definition', () => {
        const copies = baselineSplitCopies();
        return {
          ok: !copies.length,
          note: copies.length
            ? 'split arithmetic outside ' + SPLIT_HOME + ': ' +
              copies.map((c) => c.file + ':' + c.line).join(', ')
            : 'defined once, in ' + SPLIT_HOME
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
