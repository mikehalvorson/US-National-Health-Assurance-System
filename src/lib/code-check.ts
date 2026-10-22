/* The code checks: the shapes this repo's source must keep, read from the
 * source itself.
 *
 * Moved out of manifest-check.ts (the branch review against main,
 * 2026-10-21, found that module changing for every reason any of its checks
 * did). These read src/lib, src/scripts and tools/ as code: one target
 * parser, one baseline category split, no display-only dataset in the
 * revenue engine, every import-time enricher declared, every self-test
 * surface registered, no literal in the engine span that is not a declared
 * constant, the mature year computed in one place, no primitive type
 * assertion, no registry id reached through a cast, every catalog-shaped id
 * a record, and every text file a Python tool writes written with LF.
 *
 * The code moved as it was, except that CATALOG_ID gained `export`, because
 * catalogTraceDrift in research-check.ts reads it too; the comment above it
 * says where the P22 checks went.
 *
 * Build-time only; manifest-check.ts re-exports each of them, and
 * NODE_FS_MODULES there declares this module with what it reads. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_PHASES } from './data-phases';
import { NHA_QUALITY_DATA, type QualityData } from './quality-data';
import { pythonTools } from './toolchain-check';
import {
  REPO_ROOT, enumerateSourceFiles, sourceText, type CodeReference, scanSourceLines,
  maskComments, sourceScanFiles
} from './repo-text';

/* R277 [§S3]: the target parser has one implementation.
 *
 * phase-targets.ts owned the original, equations.ts imported it, and fmea.ts
 * reimplemented it under a comment reading "mirrors phase-targets.ts
 * parseNum". Two implementations, three consumers, nothing asserting they
 * agreed - so every robustness concern about the parser applied twice,
 * independently, and the copies could drift without a symptom.
 *
 * A source scan rather than a runtime comparison, because the failure mode is
 * a second implementation existing at all. Comparing outputs would only catch
 * a copy that had ALREADY diverged. */
/* Both declaration forms, because a copy written as an arrow constant would
   otherwise pass a scan that only knows the `function` keyword. Exported so
   the test can exercise the pattern directly rather than re-deriving it. */
export const PARSER_DEFINITION_SOURCE =
  String.raw`\bfunction parseNum\s*\(|\b(?:const|let|var)\s+parseNum\s*(?::[^=]+)?=`;
const PARSER_DEFINITION = new RegExp(PARSER_DEFINITION_SOURCE, 'g');
export const PARSER_HOME = 'src/lib/phase-targets.ts';

export function parserImplementations(root = REPO_ROOT): string[] {
  const out: string[] = [];
  for (const rel of enumerateSourceFiles(root)) {
    if (!rel.startsWith('src/') || !rel.endsWith('.ts')) continue;
    const text = readFileSync(join(root, rel), 'utf8');
    /* The repo-relative path, not a slice: the scan covers all of src/, and
       slicing 'src/lib/'.length off a src/scripts/ hit reported it as
       "ipts/foo.ts". The gate still fired on the count, but the note lied
       about where the copy was, which is the only thing the note is for. */
    for (const _ of text.matchAll(PARSER_DEFINITION)) out.push(rel);
  }
  return out.sort();
}

/* R157 [§S5]: the baseline PHC category split, defined once.
 *
 * `hosp0 = B.hospital - 0.6 * e` and `clin0 = B.physician + B.otherProf -
 * 0.4 * e` were written out in three places - runPath, matureAtScale and
 * bridge.ts - each with its own copy of the 0.6/0.4 embedded-drug literals.
 * The bridge identity catches a bridge.ts <-> runPath divergence; nothing
 * caught runPath <-> matureAtScale except one self-test that runs only under
 * `{}` structural.
 *
 * The split now lives in `baselineCategorySplit` and the literals are named
 * constants. This scan makes that a rule: an arithmetic combination of
 * `B.hospital` or `B.physician` with an embedded-drug term may appear only in
 * model.ts, where the shared function is. Comments are masked, so the
 * explanation above and the ones in model.ts do not trip it. */
export const SPLIT_HOME = 'src/lib/model.ts';
export const SPLIT_LITERAL_SOURCE =
  String.raw`B\.hospital\s*-|B\.otherProf\s*-|B\.rxRetail\s*\+`;
const SPLIT_LITERAL = new RegExp(SPLIT_LITERAL_SOURCE, 'g');

export function baselineSplitCopies(root = REPO_ROOT): CodeReference[] {
  return scanSourceLines(SPLIT_LITERAL, { skip: [SPLIT_HOME] }, root);
}

/* R38 [§S5]: a display-only dataset must stay out of the revenue engine.
 *
 * `WEALTH_DIST` carries Fed DFA 2026:Q1 NOMINAL levels inside a 2024$ model.
 * The row's concern is not the label - it is that "nothing currently prevents
 * a later join". A label cannot prevent one; an import check can. Every
 * dataset `taxparams.ts` declares as `computes: false` is scanned for here,
 * and finding one named inside the engine fails the build.
 *
 * `taxmodel.ts` is the whole revenue engine, so its import list is the seam.
 * The display layer (`tax-client.ts`, `tax-charts.ts`) may import whatever it
 * likes; that is what display-only means.
 *
 * The IMPORT LIST, not the file text. The first version scanned the whole
 * masked source and reported all three display-only datasets, because the
 * vintage self-test in that file names them in a string array. Importing a
 * dataset is what makes a join possible; naming it in a check is the opposite
 * of a join. */
export const REVENUE_ENGINE = 'src/lib/taxmodel.ts';
const TAXPARAMS_IMPORT = /import\s*\{([^}]*)\}\s*from\s*'\.\/taxparams'/g;

export function engineImportsFromParams(root = REPO_ROOT): string[] {
  const masked = maskComments(readFileSync(join(root, REVENUE_ENGINE), 'utf8'));
  const names: string[] = [];
  for (const m of masked.matchAll(TAXPARAMS_IMPORT)) {
    m[1].split(',').forEach((raw) => {
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (name) names.push(name);
    });
  }
  return names;
}

export function displayOnlyDatasetsInEngine(
  displayOnly: string[],
  root = REPO_ROOT
): string[] {
  const imported = new Set(engineImportsFromParams(root));
  return displayOnly.filter((id) => imported.has(id));
}

/* R229 [§S3]: the import-time enricher convention, enforced.
 *
 * The convention itself is written at the top of quality.ts, where the
 * pipeline is assembled. This is the half that makes it a rule rather than a
 * comment: every exported `apply*` in src/lib must be declared here with the
 * re-entry flag it guards on, and the flag must actually appear in the
 * function's own module.
 *
 * The failure it prevents: a third enricher mutating the shared catalog at
 * import time with no guard. Nothing would report that, and the symptom is
 * doubled enrichment in whichever consumer imports twice - which in an Astro
 * build is any page that pulls the module through a different graph. */
export const ENRICHERS: Record<string, { module: string; flag: string }> = {
  applyPhaseTargets: { module: 'phase-targets.ts', flag: '__enriched' },
  applyEquationTargets: { module: 'equations.ts', flag: '__equationApplied' }
};

const ENRICHER_EXPORT = /export function (apply\w+)\s*\(/g;

export function undeclaredEnrichers(root = REPO_ROOT): string[] {
  const out: string[] = [];
  for (const rel of enumerateSourceFiles(root)) {
    if (!rel.startsWith('src/lib/') || !rel.endsWith('.ts')) continue;
    const text = readFileSync(join(root, rel), 'utf8');
    const module = rel.slice('src/lib/'.length);
    for (const m of text.matchAll(ENRICHER_EXPORT)) {
      const decl = ENRICHERS[m[1]];
      if (!decl) { out.push(m[1] + ' in ' + module + ' is not declared'); continue; }
      if (decl.module !== module) {
        out.push(m[1] + ' is declared in ' + decl.module + ' but defined in ' + module);
      } else if (!text.includes(decl.flag)) {
        out.push(m[1] + ' declares the guard ' + decl.flag + ', which is not in ' + module);
      }
    }
  }
  /* And the reverse: a declared enricher that no longer exists. */
  const defined = new Set<string>();
  for (const rel of enumerateSourceFiles(root)) {
    if (!rel.startsWith('src/lib/') || !rel.endsWith('.ts')) continue;
    for (const m of readFileSync(join(root, rel), 'utf8').matchAll(ENRICHER_EXPORT)) {
      defined.add(m[1]);
    }
  }
  for (const name of Object.keys(ENRICHERS)) {
    if (!defined.has(name)) out.push(name + ' is declared but no longer exported');
  }
  return out.sort();
}

/* R206 [§S0]: no self-test surface outside the registry.
 *
 * R24 unified the three shapes that existed. This stops a fourth appearing:
 * it scans src/lib for exported self-test functions and reports any whose
 * module is not declared in SELF_TEST_SOURCES. Every orphaned surface in this
 * backlog - R153's two, R230's, R273's - was written, exported and then simply
 * never called, and nothing reported that. */
const SELF_TEST_EXPORT = /export function (selfTest\w*|\w*SelfTests)\s*\(/g;

/* selftests.ts is the registry, not a surface: its own exports (selfTestSummary,
   assertSelfTestsPass) aggregate the others and must not be required to
   register themselves. */
const REGISTRY_MODULE = 'selftests.ts';

const surfaceCache = new Map<string, Array<{ module: string; fn: string }>>();

export function exportedSelfTestSurfaces(root = REPO_ROOT): Array<{ module: string; fn: string }> {
  const hit = surfaceCache.get(root);
  if (hit) return hit;
  const out: Array<{ module: string; fn: string }> = [];
  for (const rel of enumerateSourceFiles(root)) {
    if (!rel.startsWith('src/lib/') || !rel.endsWith('.ts')) continue;
    if (rel.endsWith('/' + REGISTRY_MODULE)) continue;
    const text = readFileSync(join(root, rel), 'utf8');
    for (const m of text.matchAll(SELF_TEST_EXPORT)) {
      out.push({ module: rel.slice('src/lib/'.length), fn: m[1] });
    }
  }
  surfaceCache.set(root, out);
  return out;
}

export function unregisteredSelfTestSurfaces(
  registeredModules: string[],
  root = REPO_ROOT
): Array<{ module: string; fn: string }> {
  const registered = new Set(registeredModules);
  return exportedSelfTestSurfaces(root).filter((s) => !registered.has(s.module));
}

/* R21 [§S6a]: a numeric literal inside an engine function is a parameter that
 * got away.
 *
 * Ten of them sat in model.ts with no source and no grade, which made their
 * uncertainty zero rather than wide - the Monte Carlo varied everything around
 * them and never them. Sourcing the ten is a one-time fix; this is what stops
 * the eleventh.
 *
 * The span is the engine proper: from the first sampling function to the start
 * of selfTest(), which is test code and holds tolerances, seeds and expected
 * values by the dozen. Comments are masked, so the explanations in that file
 * do not trip it.
 *
 * Every literal in that span must be declared structural in params.ts, with a
 * reason. Model quantities are read from the registry or from a parameter, so
 * after the fix they are not literals at all and cannot appear here. That is
 * why this check does not compare against the registry's VALUES: a registered
 * value typed back into a formula is exactly the duplication the registry
 * exists to remove, so it fails too. */
export const ENGINE_FILE = 'src/lib/model.ts';
/* Review moved this earlier. It used to start at sampleParams, which left the
   ramp and sampling helpers above it unscanned along with the constants block.
   It starts at the first engine function now, so everything that computes is
   inside the span and only the declarations sit above it. */
export const ENGINE_SPAN_START = 'export function rampsAt';
export const ENGINE_SPAN_END = 'export function selfTest';

/* Preceded by neither a word character nor a dot, so `d.pubCost` and
   `p10` are not read as numbers, and property names like `p50:` are skipped
   by the same rule. Exponent forms are matched whole. */
const ENGINE_NUMBER = /(?<![\w.])(\d+\.?\d*(?:e-?\d+)?)/g;

export interface EngineLiteral { line: number; value: number; text: string }

export function engineLiterals(root = REPO_ROOT): EngineLiteral[] {
  const masked = maskComments(readFileSync(join(root, ENGINE_FILE), 'utf8'));
  const lines = masked.split('\n');
  const start = lines.findIndex((l) => l.includes(ENGINE_SPAN_START));
  const end = lines.findIndex((l) => l.includes(ENGINE_SPAN_END));
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('model.ts no longer has an engine span between ' +
      ENGINE_SPAN_START + ' and ' + ENGINE_SPAN_END);
  }
  const out: EngineLiteral[] = [];
  for (let i = start; i < end; i += 1) {
    for (const m of lines[i].matchAll(ENGINE_NUMBER)) {
      out.push({ line: i + 1, value: Number(m[1]), text: lines[i].trim() });
    }
  }
  return out;
}

export function unregisteredEngineLiterals(
  structural: number[],
  root = REPO_ROOT
): EngineLiteral[] {
  const allowed = new Set(structural);
  return engineLiterals(root).filter((l) => !allowed.has(l.value));
}

/* Found by review: the span above starts at the first sampling function, so
   every module-scope declaration ABOVE it was invisible to the check - which is
   exactly where a magic number would go to escape it. Module scope is the
   declared home for a named constant, so declaring one there is right; what was
   missing is that the value has to be declared too.
   The two lists are deliberately different. A quantile of 0.5 is a perfectly
   good band level to declare at module scope and is never a legitimate bare
   number inside an engine formula, where it used to be the OOP share. */
export function undeclaredEngineDeclarations(
  declaration: number[],
  root = REPO_ROOT
): EngineLiteral[] {
  const masked = maskComments(readFileSync(join(root, ENGINE_FILE), 'utf8'));
  const lines = masked.split('\n');
  const spanStart = lines.findIndex((l) => l.includes(ENGINE_SPAN_START));
  const allowed = new Set(declaration);
  const out: EngineLiteral[] = [];
  for (let i = 0; i < spanStart; i += 1) {
    if (/^import|^\s*[A-Za-z_$][\w$]*,?$|from '/.test(lines[i])) continue;
    for (const m of lines[i].matchAll(ENGINE_NUMBER)) {
      const value = Number(m[1]);
      if (!allowed.has(value)) {
        out.push({ line: i + 1, value: value, text: lines[i].trim() });
      }
    }
  }
  return out;
}

/* And the other direction: a constant in the registry that the engine does not
   read is documentation for code that is gone. `usedBy` names the expression,
   which is prose; the identifier is what proves the wiring, so that is what is
   searched for. */
export function unreadEngineConstants(ids: string[], root = REPO_ROOT): string[] {
  const masked = maskComments(readFileSync(join(root, ENGINE_FILE), 'utf8'));
  return ids.filter((id) => !masked.includes("engineConstant('" + id + "')"));
}

/* R60 [§S6b]: a structural knob a scenario can set and the engine never reads
 * is the silent-failure class in its other direction. Same shape as
 * unreadEngineConstants above, and the same reason: a declaration nothing
 * consumes reads as a working control. */
export function unreadStructuralKnobs(names: string[], root = REPO_ROOT): string[] {
  const masked = maskComments(readFileSync(join(root, ENGINE_FILE), 'utf8'));
  /* Review [§S6b]: a bare `includes('s.' + n)` is satisfied by any
     identifier ending in `s`, so `opts.shock` would have passed for
     `s.shock` and renaming the engine's parameter would have broken it
     silently. This file argues elsewhere against checks a deletion cannot
     fail; the same standard applies to its own. The boundary is asserted. */
  return names.filter((n) => !new RegExp('(?<![\\w.])s\\.' + n + '\\b').test(masked));
}

/* R22 [§S6a]: the mature year, computed anywhere but params.ts.
 *
 * Six places derived the same index in three different ways, and they agreed.
 * The failure mode is not that they disagree today, it is that moving END_YEAR
 * moves some of them: the self-tests comparing matureAtScale against the path
 * row would then compare different years and still pass, because each side
 * would be reading its own. So the derivations are what is banned, not the
 * literal - a comment naming 2041 is fine and is masked anyway. */
export const MATURE_YEAR_HOME = 'src/lib/params.ts';
export const MATURE_YEAR_DERIVATION =
  /years\.length\s*-\s*2|END_YEAR\s*-\s*START_YEAR\s*\+\s*1\)\s*-\s*2|204[0-9]\s*-\s*START_YEAR/g;

export function matureYearDerivations(root = REPO_ROOT): CodeReference[] {
  return scanSourceLines(MATURE_YEAR_DERIVATION, { skip: [MATURE_YEAR_HOME] }, root);
}

/* R127 [§S6a]: a primitive type assertion is a claim the compiler stops
 * checking, and X4 is what that costs. `Math.min(v, ins.scaleMax as number)`
 * on an optional field silently produced NaN for a toggle balancer, and the
 * assertion is precisely what suppressed the error that would have caught it -
 * added, by the port, during a migration TO a typed language.
 *
 * Only `as <primitive>` is scanned. Structural casts through `as unknown as`
 * are a different animal: they are how this codebase reaches DOM interfaces
 * that its lib target types loosely, and they assert a shape rather than the
 * presence of a value. Every remaining one is declared below with its reason,
 * so a new assertion has to be argued for rather than typed.
 *
 * Comments are masked, so the paragraph above and the ones in taxmodel.ts do
 * not trip it. */
export const PRIMITIVE_ASSERTION =
  /\bas\s+(number|string|boolean)\b(?!\s*\[)/g;

export interface AllowedAssertion { file: string; why: string }
export const ALLOWED_ASSERTIONS: AllowedAssertion[] = [
  {
    file: 'src/lib/params.ts',
    why: 'BASE2023.investmentResidual is declared 0 and filled by the IIFE ' +
      'below it, so the annotation widens a literal type rather than ' +
      'asserting a value is present.'
  }
];

export function primitiveAssertions(root = REPO_ROOT): CodeReference[] {
  return scanSourceLines(
    PRIMITIVE_ASSERTION, { skip: ALLOWED_ASSERTIONS.map((a) => a.file) }, root);
}

/* R249 [§S16]: no registry id in the equation layer is reached through a type
 * assertion. `RAMP_META[rid as RampId]` and `MODEL_META[mid as ModelId]`
 * compiled because the cast asserted a membership nothing checked; a string
 * from the page becomes an id through keyOrThrow() now, and
 * collectDeps returns typed ids without one. This reads every .ts and .astro
 * file under src/ (comments masked) for an assertion to either id type, in
 * both spellings TypeScript accepts. */
export function registryIdAssertions(root = REPO_ROOT): string[] {
  const out: string[] = [];
  /* The angle-bracket form must be followed by an identifier: `new
     Set<RampId>()` is a type argument, not an assertion. */
  const cast = /\bas\s+(?:RampId|ModelId)\b|<(?:RampId|ModelId)>\s*[A-Za-z_$]/g;
  for (const rel of sourceScanFiles(root)) {
    const code = maskComments(sourceText(rel, root));
    cast.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = cast.exec(code)) !== null) {
      out.push(rel + ':' + code.slice(0, m.index).split('\n').length + ' ' + m[0]);
    }
  }
  return out;
}

/* ---- Moved to manifest-check.ts from catalog-check.ts, toolchain-check.ts
   and style-check.ts in the review of P22, because each reads the repo's own
   text; the split of 2026-10-21 put the ones that read code here. */

/* Every catalog-shaped id a module names, and whether it is a record.
 *
 * The shape is the catalog's own three id forms: KPP-A1 and KPP-TRUST1,
 * TPP-2.1 and TPP-FORM1, CP-POP-004 (a lower-case suffix included, because the
 * seed once invented CP-POP-004a and its kin and this must see one if it comes
 * back). Comments are masked first: a comment explaining a dead id is the
 * documentation of a defect, not a reference to a record, and
 * baseline-registry.ts carries two such.
 *
 * What it reads: every .ts and .astro file sourceScanFiles() returns (every
 * file under src/ except the two generated payloads), plus the Data tab's
 * metric list, which is one of those payloads and is read as data. What it
 * does not see: an id assembled at run time from parts, and an id range
 * written in prose ("TPP-8.1/9.1-9.7" yields TPP-8.1 only); gateWiring() in
 * fmea.ts expands the range notation where it matters.
 *
 * A CP id that the canonical definition registry carries and the quality
 * catalog does not would be refused here. None is named in src/ today; one
 * that is needs a decision about which namespace it belongs to (P16), not an
 * exemption. */
export const CATALOG_ID = /\b(?:KPP-[A-Z]+\d+(?:\.\d+)?|TPP-(?:\d+\.\d+|[A-Z]+\d+)|CP-[A-Z]+-\d{3}[a-z]?)\b/g;

export interface CatalogIdScan { references: number; files: number; unresolved: string[] }

export function catalogIdReferences(
  root?: string, Q: QualityData = NHA_QUALITY_DATA, files?: string[]
): CatalogIdScan {
  const ids = new Set(Q.parameters.map(function (p) { return p.id; }));
  const unresolved: string[] = [];
  let references = 0;
  let withIds = 0;
  for (const rel of files || sourceScanFiles(root)) {
    const code = maskComments(sourceText(rel, root));
    CATALOG_ID.lastIndex = 0;
    let hit: RegExpExecArray | null;
    let any = false;
    while ((hit = CATALOG_ID.exec(code)) !== null) {
      references++;
      any = true;
      if (!ids.has(hit[0])) {
        unresolved.push(rel + ':' + code.slice(0, hit.index).split('\n').length + ' ' + hit[0]);
      }
    }
    if (any) withIds++;
  }
  /* The Data tab's metrics, read as data rather than as text. */
  if (!files) {
    for (const phase of DATA_PHASES) {
      for (const group of phase.groups) {
        for (const metric of group.metrics) {
          references++;
          if (!ids.has(metric.id)) unresolved.push('data-phases.ts ' + phase.id + ' ' + metric.id);
        }
      }
    }
  }
  return { references: references, files: withIds, unresolved: unresolved };
}

/* P22 [§S16] new finding: a Python text-mode write on Windows translates
 * every \n to \r\n. Both generators did it on purpose, with a comment saying
 * LF would leave the file dirty in a Windows worktree - true while the
 * worktree was CRLF under core.autocrlf, and inverted by P12's .gitattributes
 * (eol=lf). Measured on 2026-10-08: a clean regeneration of both catalogs
 * came back byte-identical modulo CR and showed three files modified with an
 * empty `git diff`. That is the trap .gitattributes was written to end, coming
 * back through the tools.
 *
 * So every file a Python tool writes in text mode must say newline="\n".
 * What this reads: each Python tool TOOLCHAINS declares, every `.write_text(`
 * call, and every `open(` call whose mode literal writes or appends text. The
 * call's text runs to its matching parenthesis, so a call split across lines
 * is read whole. What it does not follow: a write reached through an alias
 * (`w = path.write_text`), `io.open` or `codecs.open` under another name, and
 * a mode passed in a variable. None exists in tools/ today. */
export interface TextModeWrite { file: string; line: number; call: string; }

function callText(src: string, open: number): string {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')') {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return src.slice(open);
}

/* `writes` is how many text writes were read, so a scan that found no call
   at all cannot report a clean result on silence. */
export function textModeWrites(root = REPO_ROOT, files = pythonTools()):
  { writes: number; flagged: TextModeWrite[] } {
  const out: TextModeWrite[] = [];
  let writes = 0;
  const call = /\.write_text\s*\(|\bopen\s*\(/g;
  const writeMode = /,\s*(?:mode\s*=\s*)?["'][rwax+t]*[wa][rwax+t]*["']/;
  for (const rel of files) {
    const src = sourceText(rel, root);
    call.lastIndex = 0;
    let hit: RegExpExecArray | null;
    while ((hit = call.exec(src)) !== null) {
      const paren = src.indexOf('(', hit.index);
      const args = callText(src, paren);
      const isOpen = !hit[0].startsWith('.');
      if (isOpen && !writeMode.test(args)) continue;
      writes++;
      /* newline="\n" or newline="" both write \n untranslated; newline=None
         is the platform default this exists to refuse. */
      if (/\bnewline\s*=\s*(["'])(?:\\n)?\1/.test(args)) continue;
      out.push({
        file: rel,
        line: src.slice(0, hit.index).split('\n').length,
        call: (src.slice(hit.index, paren) + args).replace(/\s+/g, ' ').slice(0, 90)
      });
    }
  }
  return { writes, flagged: out };
}
