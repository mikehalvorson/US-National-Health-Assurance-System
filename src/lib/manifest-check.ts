/* R271 [§S0]: compare the committed file manifest against the working tree.
 *
 * The audit that produced this backlog could not enumerate a directory: the
 * git trees API, the Contents API and the HTML tree view all returned empty,
 * so its only discovery mechanism was seeing a file named inside another file.
 * That mechanism missed two entire public chapters (ltc, risk), the route
 * registry that enumerates every chapter (tabs.ts), and 23 files that are named
 * in neither audit document.
 *
 * Build-time only. Imported by selftests.ts, which runs in Node during
 * `astro build` and under vitest; nothing in src/scripts/ imports it, so
 * node:fs never reaches a client bundle.
 *
 * Finding 6 [P16 review 3]: the module is no longer only about the file
 * manifest, and pretending otherwise is how the divergence stayed
 * invisible. It became every build-time check that READS THE REPO'S OWN TEXT -
 * the manifest, rendered self-test names, README counts, research path
 * citations, the build gate's wiring. The reason they shared a home was the
 * paragraph above: one module owned node:fs.
 *
 * For three functions that convention existed only as a comment here citing a
 * convention nothing recorded. It is stated in full above now, which is where
 * a reader of this repo can actually meet it - the agent knowledge base under
 * .agent-kb/ carries it too, but that directory is gitignored on purpose, so
 * pointing a reader at it would repeat finding 10 rather than close finding 6.
 *
 * The branch review against main (2026-10-21) found one module holding every
 * such check changing for every reason any of them did, and declined to split
 * it in that review's fix run because a split is its own change; it proposed
 * one. This is that change. The checks live in modules grouped by what they
 * read: repo-text.ts (the reading layer they share), page-check.ts,
 * accessibility-check.ts, lifecycle-check.ts, readme-check.ts,
 * research-check.ts and code-check.ts, and one module per chapter with a
 * methodology of its own (units-check.ts, workforce-check.ts, ltc-check.ts).
 * Their code moved as it was, except where each module's header says
 * otherwise, and every name is re-exported below, so an import that names
 * this module still works.
 * What stays here is the file manifest, the route table, the build gate's
 * wiring, the retired tree, and the node:fs declaration: NODE_FS_MODULES
 * names every module that imports it, with what it reads, and nodeFsDrift()
 * holds the list to the tree.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FILE_MANIFEST } from './file-manifest';
import { TABS } from './tabs';

/* The branch review against main (2026-10-21): this module held every check
   that reads the repo's text, so it changed for every reason any of them
   did. They live in modules grouped by what they read now, each re-exported
   here so every import that names this module still works. */
import {
  REPO_ROOT, enumerateSourceFiles, sourceText, type CodeReference, maskComments,
  sourceScanFiles
} from './repo-text';
export {
  MANIFEST_ROOTS, enumerateSourceFiles, sourceText, AUDIT_CODE_IN_RENDERED_TEXT,
  type CodeReference, scanSourceLines, maskComments, markdownRows, flowed,
  sourceScanFiles
} from './repo-text';
export {
  type GlobalListenerSite, type GlobalRegistrationCensus, globalRegistrationCensus,
  CLIENT_SCRIPT, clientsWithoutPageLoad, DOCUMENT_LIFETIME_STATE, undeclaredPageState,
  unboundDeferredWork
} from './lifecycle-check';
export {
  SELF_TEST_NAME_CALL, renderedSelfTestNameLeaks, renderedParamProseAuditCodes,
  renderedEquationProseAuditCodes, unsweptSelfTestNameSites, frontmatterStripped,
  HOUSEHOLD_LITERAL_SOURCE, typedHouseholdCounts, ENVELOPE_PAGE, ENVELOPE_LITERAL_SOURCE,
  typedEnvelopeLiterals, REPO_URL, repoLinkTargets, REPO_ROOT_LINK_HOME,
  unresolvedRepoLinks, GATE_SPLIT_PAGE, GATE_SPLIT_EXPRESSIONS, gateSplitNotDerived,
  HEALTH_PAGE, PARAMETER_EXPLORER, divergenceNamesRecommendation, SCENARIO_PICKER,
  SCENARIO_PROVENANCE_READS, scenarioProvenanceNotRendered, bandNoteIsRendered,
  spreadNoteIsRendered, divergenceIsRendered, CARE_SECTION_START, careSectionTypedYears,
  RESIDUAL_CAVEAT_SITES, residualCaveatSitesMissing, typedResidualFigures,
  NARRATIVE_SURFACES, narrativeCatalogCodes, HEALTH_CLIENT, CARE_SCENARIO_CALLS,
  careScenarioCallsMissing, GOV_PAGE, GOV_CLIENT, LEADER_BASIS_READS,
  leaderBasisNotRendered, HOUSEHOLD_DENOMINATOR_READERS, householdDenominatorNotRead,
  MEDICATIONS_PAGE, DRUG_BASE_READS, drugBaseNotRendered, RETAIL_BAND_LOW,
  RETAIL_BAND_HIGH, drugBaseNoteIsRendered, drugLeverNoteIsRendered,
  medicationsFilterReasons, phasePrincipleIsRendered, medicationsSliderRange,
  statedStressBoundary, literalRetailTotals, typedChapterNumbers,
  frontDoorChapterCoverage, BASIS_RENDER_FILE, BASIS_RENDER_EXPRESSIONS,
  basisNotRendered
} from './page-check';
export {
  acronymLayerFaults, SR_COUNT_EXEMPT, literalCountsInAriaLabels,
  literalCountsInScreenReaderText, literalCountsInMetaDescriptions,
  baseLayoutCallsWithoutDescription, roleImgFocusFaults, orphanAriaLabelFaults,
  renderedAuditCodeFaults, ariaAsStateFaults
} from './accessibility-check';
export {
  researchReadmeGateCount, researchReadmeGateList, registrySurfaceRowCount,
  researchReadmeCasedCount, registryGateCountDrift, readmeAdvertisedTestCount,
  type ReadmeDeployDrift, readmeDeployDrift, type StatedCountDrift,
  statedChapterCountDrift, type ReadmeCountClaim, readmeStatedCounts, readmeCountDrift
} from './readme-check';
export {
  PARSER_DEFINITION_SOURCE, PARSER_HOME, parserImplementations, SPLIT_HOME,
  SPLIT_LITERAL_SOURCE, baselineSplitCopies, REVENUE_ENGINE, engineImportsFromParams,
  displayOnlyDatasetsInEngine, ENRICHERS, undeclaredEnrichers, exportedSelfTestSurfaces,
  unregisteredSelfTestSurfaces, ENGINE_FILE, ENGINE_SPAN_START, ENGINE_SPAN_END,
  type EngineLiteral, engineLiterals, unregisteredEngineLiterals,
  undeclaredEngineDeclarations, unreadEngineConstants, unreadStructuralKnobs,
  MATURE_YEAR_HOME, MATURE_YEAR_DERIVATION, matureYearDerivations, PRIMITIVE_ASSERTION,
  type AllowedAssertion, ALLOWED_ASSERTIONS, primitiveAssertions, registryIdAssertions,
  type CatalogIdScan, catalogIdReferences, type TextModeWrite, textModeWrites
} from './code-check';
export {
  type PathExemption, RESEARCH_PATH_EXEMPT, researchPathCitationLeaks,
  staleResearchPathExemptions, mechanismsMissingFromDoc, careEvidenceMisses,
  careRequirementsNotInFramework, IRA_SCORE, IRA_CONTEXT, IRA_RESCORING,
  IRA_CAVEAT_WINDOW, iraScoresWithoutCaveat, iraScoreSites, provenanceStampDrift,
  frameworkVersionDrift, unresolvedMethodologyPath, ADDITIONS_REGISTER,
  registerRowFaults, additionsRegisterDrift, CROSSWALK_DOC, crosswalkDispositions,
  crosswalkDomainTitles, crosswalkDomainDrift, crosswalkCountDrift,
  crosswalkDispositionDrift, catalogTraceDrift, methodologyAuditCodes,
  trackerSchemaDrift, trackerDateDrift, trackerTemplateDrift, removalRulingSites,
  decisionName, CITED_ENACTMENTS, legalAuthorityTrackerFaults, OPEN_ITEM_REGISTER,
  openItemReferences, openItemRegisterDrift, RESEARCH_DATE_EXEMPT,
  researchDateStampFaults, trackerParameterDrift
} from './research-check';
export {
  type UnitsCostReconciliation, RECONCILIATION_MAX_ERROR_PCT,
  unitsCostReconciliation, type UnitAllocationDisagreement, unitAllocationDrift,
  type SplitClosure, visitSplitClosure, UNIT_ASSUMPTION_IDS, type AssumptionGap,
  gradedUnitRows, unitAssumptionGaps, type AbsorptionSpan, absorptionSpan,
  regionAssignmentReport, type RegionColoring, regionColoring, scoreChartEncoding,
  type RegionSelectionCheck, SCORE_RECONSTRUCTION_TOLERANCE, regionSelection,
  type RegionCountyAgreement, regionCountyAgreement, type MethodologyDrift,
  FRAGMENTATION_CLAIM, type ClaimGuard, fragmentationClaimGuard, regionMethodologyDrift,
  type CountyFileFault, countyFileAudit, KNOWN_STATE_ACRONYM_COLLISIONS,
  stateAcronymCollisions, UNITS_COST_STRESSORS, type UnitsCostStressorDrift,
  unitsCostStressorDrift
} from './units-check';
/* Code review [§S9b]: `countyDemand` was declared here, which made
   units.astro import the audit harness to render a page. It is
   src/lib/counties.ts now, and re-exported for the callers that already had
   it from this module. */
export { countyDemand } from './counties';
export {
  type DirectCareDisagreement, directCareHeadcountDrift, directCareSharedCount,
  requirementFamilyCounts, type UnderSpecified, underSpecifiedAnnualB,
  underSpecifiedExpansions, underSpecifiedRendered, anchoredOccupationCodes,
  type SolvedBlocker, solvedResearchBlockers, type WorkforceProseDisagreement,
  type WorkforceProseAudit, workforceProseDrift, type UnitModelDisagreement,
  unitModelDrift, type SupportRateDisagreement, supportRateDrift
} from './workforce-check';
export {
  type PlanningInputFault, ltcPlanningInputFaults, type KindStyleFault,
  gdpKindStyleFaults, type RepeatedLiteral, ltcRepeatedLiterals, ltcRepeatedWatched,
  type RangeDrift, ltcOecdRangeDrift, type DeadExport, deadLtcExports
} from './ltc-check';

/* Finding 4 [P16 review 3]: a review read `health.astro:455` - which renders a
 * failing row's `note`, and the notes added in fix run 4 carry CP-* and RB-*
 * ids and research paths by design - and called it a golden-rule-2 breach. It
 * is not, because `astro:build:start` runs `assertSelfTestsPass` before any
 * route is emitted, so a red row stops the build instead of shipping.
 *
 * The finding was wrong and the reason it was wrong was asserted in five code
 * comments and checked in none. Delete the integration from the config and
 * every one of those comments keeps reading true while the gate is gone - and
 * the config comment two files over already says out loud that it worries
 * about exactly this. So the wiring is read, not assumed.
 *
 * Reading the text is the only option: importing the config would execute the
 * gate this check is registered inside. */
export function buildGateWiring(root = REPO_ROOT): string[] {
  const rel = 'astro.config.mjs';
  let text: string;
  try {
    text = sourceText(rel, root);
  } catch {
    return [rel + ' is missing, so nothing stops a failing self-test from shipping'];
  }
  const out: string[] = [];
  const code = maskComments(text);
  if (!/'astro:build:start'\s*:/.test(code)) {
    out.push(rel + ' has no astro:build:start hook');
  }
  for (const call of ['assertSelfTestsPass(', 'assertReadmeCountCurrent(']) {
    if (!code.includes(call)) out.push(rel + ' no longer calls ' + call + ')');
  }
  /* Defined and never registered is the failure this is really for. */
  if (!/integrations:\s*\[[^\]]*selfTestGate\(\)/.test(code)) {
    out.push(rel + ' defines the gate but does not register it in `integrations`');
  }
  return out;
}

export interface ManifestDrift {
  unlisted: string[]; /* on disk, absent from the manifest */
  missing: string[]; /* in the manifest, absent from disk */
}

export function manifestDrift(actual: string[] = enumerateSourceFiles()): ManifestDrift {
  const listed = new Set(FILE_MANIFEST);
  const onDisk = new Set(actual);
  return {
    unlisted: actual.filter((p) => !listed.has(p)),
    missing: FILE_MANIFEST.filter((p) => !onDisk.has(p))
  };
}

/* R114 [§S1]: no tool may target the retired tree.
 *
 * extract_quality_catalog.py wrote docs/js/qualitydata.js and
 * build_data_phase_targets.py read it and wrote docs/js/dataphases.js, while
 * the live catalog was a hand port marked "do not re-derive". Regenerating
 * updated the retired artifacts and left the deployed site stale, so the
 * reproducibility guarantee the extractor exists to provide never reached the
 * live app. The row's test is "no generator writes to a non-deployed path";
 * this is the checkable form of it, widened to every file under tools/ because
 * a preview server pointed at the retired tree sets the same trap.
 *
 * Path-shaped only: `docs` bounded by a separator or a quote. All four forms
 * are in this repo's history and a narrower pattern misses the one that
 * matters - Python builds the path as ROOT / "docs" / "js", where the
 * separators are operators outside the string and the only boundary is the
 * quote. Prose may still name the retired tree; only pointing at a path in it
 * is the defect. */
const RETIRED_TREE_TARGET =
  /(^|[^A-Za-z0-9_])docs(["'/\\]|$)|["'/\\]docs([^A-Za-z0-9_]|$)/;

export interface ToolTarget { file: string; line: number; text: string }

const toolCache = new Map<string, ToolTarget[]>();

export function retiredTreeTargets(root = REPO_ROOT): ToolTarget[] {
  const hit = toolCache.get(root);
  if (hit) return hit;
  const out: ToolTarget[] = [];
  for (const rel of enumerateSourceFiles(root)) {
    if (!rel.startsWith('tools/')) continue;
    const lines = readFileSync(join(root, rel), 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (RETIRED_TREE_TARGET.test(line)) {
        out.push({ file: rel, line: i + 1, text: line.trim().slice(0, 100) });
      }
    });
  }
  toolCache.set(root, out);
  return out;
}

/* R112 [§S1]: nothing live may point into the retired tree.
 *
 * R1-R111 all name paths under docs/. The defects they describe are real -
 * §V25 established both engines are faithful ports - but the addresses are
 * wrong, so applying them as written changes nothing a reader sees. Re-targeting
 * the backlog is a document job; the code half of it is this: keep src/ free of
 * any live reference to the retired tree, so a re-targeted address cannot
 * silently drift back.
 *
 * Provenance comments are the point, not the problem. Nearly every module in
 * src/lib says which docs/js file it was ported from, and that history is worth
 * keeping. What must not exist is a docs/ path in executable position: an
 * import specifier, a fetch URL, a string literal. So comments are masked out
 * before the search rather than the whole line being skipped.
 *
 * Masking preserves offsets, so reported line numbers stay true. `//` is only
 * a line comment when it is not preceded by ':', because an .astro template is
 * HTML and a `https://` href would otherwise mask the rest of its own line -
 * which would hide exactly the kind of reference this is looking for.
 *
 * Deliberately not string-aware. Tracking quotes made the scanner wrong on
 * this very file: a regex literal like ["'/\\] reads as an unterminated string,
 * everything after it stays "inside a string", and the comment blocks below
 * stop being recognised. The `:` guard is what string-awareness was for, and
 * `/*` inside a string literal does not occur here. */
const RETIRED_TREE_REFERENCE = /docs\/[A-Za-z0-9_.-]/g;

const codeRefCache = new Map<string, CodeReference[]>();

export function retiredTreeCodeReferences(root = REPO_ROOT): CodeReference[] {
  const hit = codeRefCache.get(root);
  if (hit) return hit;
  const out: CodeReference[] = [];
  for (const rel of enumerateSourceFiles(root)) {
    if (!rel.startsWith('src/')) continue;
    const raw = readFileSync(join(root, rel), 'utf8');
    if (!raw.includes('docs/')) continue; /* most files, cheaply skipped */
    const masked = maskComments(raw);
    const lines = raw.split('\n');
    for (const m of masked.matchAll(RETIRED_TREE_REFERENCE)) {
      const line = masked.slice(0, m.index).split('\n').length;
      out.push({ file: rel, line: line, text: lines[line - 1].trim().slice(0, 100) });
    }
  }
  codeRefCache.set(root, out);
  return out;
}

/* R267 [§S0]: route registration.
 *
 * ChapterNav does `TABS.findIndex(...)` and renders nothing on -1, so a page
 * absent from TABS is a dead end at the foot of the chapter with no error.
 * The routes are derived from the manifest rather than typed, so adding a page
 * is enough to trip the check. */
export function pageRoutes(manifest: string[] = FILE_MANIFEST): string[] {
  return manifest
    .filter((p) => p.startsWith('src/pages/') && p.endsWith('.astro'))
    .map((p) => p.slice('src/pages/'.length, -'.astro'.length))
    .filter((name) => !name.startsWith('[')) /* dynamic route, not a fixed path */
    .map((name) => (name === 'index' ? '' : name));
}

export interface RouteDrift {
  unregistered: string[]; /* a page with no TABS entry: navigation dead end */
  unrouted: string[]; /* a TABS entry with no page */
}

export function routeDrift(routes: string[] = pageRoutes(), tabs = TABS): RouteDrift {
  const registered = new Set(tabs.map((t) => t.path));
  const built = new Set(routes);
  return {
    unregistered: routes.filter((r) => !registered.has(r)),
    /* R266 [§S1]: every entry, not only the ones a `ported` flag opted in.
       While that flag existed, a tab added without it was exempt from this
       half of the check and reached the stub route instead - a chapter that
       said "This chapter is being migrated" and shipped. */
    unrouted: tabs
      .filter((t) => t.path !== '')
      .map((t) => t.path)
      .filter((p) => !built.has(p))
  };
}

/* Review of P22 [§S16]: CONVENTIONS said every check that reads the repo's
 * own text lives here, so that node:fs is confined to one build-time module.
 * P22 broke it three times (toolchain-check.ts, style-check.ts,
 * catalog-check.ts) while placing a fourth check correctly, and nothing
 * noticed, because the convention was prose. This reads every .ts and .astro
 * file under src/ (comments masked) for an import of node:fs or fs, static or
 * dynamic, and holds the set to the modules declared below.
 *
 * The rule since the split of 2026-10-21 (the change the branch review
 * against main proposed): a check that reads files lives in a module
 * declared here, a *-check.ts module or repo-text.ts, and the other entries
 * read a data file for the modules that use it (the seed, the county file,
 * the region geometry, the plan's extracts). Each entry says what its module
 * reads. A module that imports fs undeclared fails the build, and an entry
 * whose module stops importing fs is reported. */
export const NODE_FS_MODULES: Record<string, string> = {
  'src/lib/manifest-check.ts': 'the file manifest, the build gate wiring and the retired tree',
  'src/lib/repo-text.ts': 'the file walk and the memoised text every repo-reading check shares',
  'src/lib/page-check.ts': 'the pages, components and clients, for what they render',
  'src/lib/accessibility-check.ts': 'every page, component and client, for what assistive technology meets',
  'src/lib/readme-check.ts': 'README.md, research/README.md, specs/HANDOFF.md and the deploy workflow, for what they state',
  'src/lib/code-check.ts': 'src/lib, src/scripts and tools/ as code, for the shapes they keep',
  'src/lib/research-check.ts': 'research/*.md, the document extracts and healthcare-docs-tracker.csv',
  'src/lib/baseline-registry.ts': 'the seed CSV and the canonical registry (P15/P16)',
  'src/lib/counties.ts': 'public/data/counties.json at build time',
  'src/lib/kappa-check.ts': 'the KAPPA write-up in the methodology',
  'src/lib/methodology-check.ts': 'the generated data-phase methodology',
  'src/lib/phase-map-check.ts': 'the phase map documents',
  'src/lib/region-data.ts': 'the hospital-region and state geometry files',
  'src/lib/style-check.ts': 'the stylesheet, for the legislation badge rules (R103)',
  'src/lib/source-package.ts': 'the Source Package and framework document extracts (R132)'
};

/* The module specifier: fs or node:fs, and their promises entry point.
   Review 2 of P22 found the first version needed a quote straight after
   `fs`, so `fs/promises` and a bare `import 'fs'` went unseen. */
const FS_SPECIFIER = "['\"](?:node:)?fs(?:/promises)?['\"]";
const FS_IMPORT = new RegExp(
  '\\bfrom\\s*' + FS_SPECIFIER +
  '|\\bimport\\s*(?:\\(\\s*)?' + FS_SPECIFIER +
  '|\\brequire\\s*\\(\\s*' + FS_SPECIFIER);

export function nodeFsDrift(root = REPO_ROOT, declared: Record<string, string> = NODE_FS_MODULES): string[] {
  const out: string[] = [];
  const found = sourceScanFiles(root).filter((rel) => FS_IMPORT.test(maskComments(sourceText(rel, root))));
  found.filter((rel) => !(rel in declared))
    .forEach((rel) => out.push(rel + ' imports node:fs; a check that reads files lives in a module declared in NODE_FS_MODULES'));
  Object.keys(declared).filter((rel) => found.indexOf(rel) < 0)
    .forEach((rel) => out.push(rel + ' is declared as an fs module and no longer imports it'));
  return out.sort();
}
