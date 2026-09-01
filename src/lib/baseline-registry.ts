/* R129 [§S10]: the namespace separation, enforced.
 *
 * Two unrelated registries claimed the CP-* prefix. The Source Package's
 * dictionary DEFINES 310 model cost parameters - a name, sometimes a
 * definition, sometimes a unit, and never a value, a year or a citation. The
 * seed CSV and research/01-05 MEASURE the current US system - value, year,
 * citation - and had renumbered themselves inside the same space. 57 of 80
 * seed ids and 143 of 160 research ids denoted a different quantity than the
 * canonical id of the same name, so any join by id bound a silently wrong
 * value. Nothing errored; the numbers were simply wrong.
 *
 * A per-id remap could not fix that, because there is no value layer to remap
 * onto. §AN2 measured it: all 310 canonical entries carry a value column and
 * every one of them is empty. So the layers are separated instead:
 *
 *   definitions   CP-*   research/cp_registry_canonical.csv, the SOLE
 *                        authority. Nothing else may define one.
 *   measurements  BL-*   research/parameter_baseline_seed.csv. Sequential and
 *                        non-semantic, so a measurement id can never carry a
 *                        meaning that collides with anything.
 *   evidence      RB-*   research/01-05 headings, one index per file.
 *
 * and every join is explicit. resolveDefinition() throws on a miss, so a
 * mismatch is a build failure rather than a silent bind. That throw is the
 * eighth application of the pattern tools/build_data_phase_targets.py already
 * uses (`raise ValueError(f"Unknown KPP/TPP: {identifier}")`), copied rather
 * than redesigned.
 *
 * BUILD TIME ONLY. This module reads the CSVs with node:fs, so it must never
 * reach a client bundle - the same constraint counties.ts and manifest-check.ts
 * carry.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FILE_MANIFEST } from './file-manifest';
/* One comment-stripper, not two. manifest-check.ts owns it and this module
   is the second caller; a private copy here would be the duplicate-parser
   smell the repo already checks for elsewhere. Neither module imports the
   other's state, so there is no cycle. */
import { maskComments } from './manifest-check';
/* The CP namespace's generated mirror. A leaf module with no imports of
   its own, so reading it here cannot form a cycle. The cast follows
   quality.ts, which imports the value and the type separately because the
   generated literal infers a union rather than the declared shape. */
import { NHA_QUALITY_DATA } from './quality-data';
import type { QualityData, QualityParameter } from './quality-data';

const QUALITY_CATALOG = NHA_QUALITY_DATA as unknown as QualityData;

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

const SEED = 'research/parameter_baseline_seed.csv';
const CANON = 'research/cp_registry_canonical.csv';
const EXTRACT = 'research/source_package_extract.md';

/* The definition layer's upstream source, and the one dated record of the
   pre-separation state. Exempt from the definition-only sweep - but the
   extract's exemption is not a free pass: extractDisagreements() requires it
   to agree with the registry on all 310, so an exemption that stopped being
   true would fail. */
const DEFINITION_SOURCES = new Set([CANON, EXTRACT]);
const HISTORICAL_RECORD = new Set([
  'research/task_zero_findings.md',
  'research/framework_v2_extract.md'
]);

export interface CpDefinition {
  id: string;
  name: string;
  definition: string;
  unit: string;
  section: string;
}

export interface BaselineRow {
  baselineId: string;
  supersededId: string;
  measures: string;
  measuresStatus: string;
  disaggregation: string;
  category: string;
  description: string;
  value: string;
  valueLow: string;
  valueHigh: string;
  valueType: string;
  unit: string;
  year: string;
  useAs: string;
  sourceName: string;
  sourceUrl: string;
  confidence: string;
  notes: string;
}

export const MEASURES_STATUSES = ['mapped', 'unmapped', 'no-canonical-equivalent'];
export const VALUE_TYPES = ['point', 'range', 'contested-range', 'compound'];

/* ---- reading ----------------------------------------------------------- */

function read(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), 'utf8');
}

/* RFC 4180 enough for these two files: quoted fields, doubled quotes inside
   them, commas and newlines inside quotes. Written here because the repo has
   no CSV reader and these are the only two CSVs any module reads. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else { quoted = false; }
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (ch === '\r') continue;
    field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

function records(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  const head = rows[0];
  return rows.slice(1).map(function (r) {
    const out: Record<string, string> = {};
    head.forEach(function (h, i) { out[h] = r[i] === undefined ? '' : r[i]; });
    return out;
  });
}

function loadDefinitions(): Map<string, CpDefinition> {
  const out = new Map<string, CpDefinition>();
  for (const r of records(read(CANON))) {
    out.set(r.canonical_id, {
      id: r.canonical_id,
      name: r.name,
      definition: r.definition,
      unit: r.unit,
      section: r.appendix_or_section
    });
  }
  return out;
}

function loadBaseline(): BaselineRow[] {
  return records(read(SEED)).map(function (r): BaselineRow {
    return {
      baselineId: r.baseline_id,
      supersededId: r.superseded_id,
      measures: r.measures,
      measuresStatus: r.measures_status,
      disaggregation: r.disaggregation,
      category: r.category,
      description: r.description,
      value: r.value,
      valueLow: r.value_low,
      valueHigh: r.value_high,
      valueType: r.value_type,
      unit: r.unit,
      year: r.year,
      useAs: r.use_as,
      sourceName: r.source_name,
      sourceUrl: r.source_url,
      confidence: r.confidence,
      notes: r.notes
    };
  });
}

export const CP_DEFINITIONS: Map<string, CpDefinition> = loadDefinitions();
export const BASELINE_ROWS: BaselineRow[] = loadBaseline();

const BY_BASELINE_ID = new Map(BASELINE_ROWS.map((r) => [r.baselineId, r]));

/* ---- the join ---------------------------------------------------------- */

export function baselineRow(blId: string): BaselineRow {
  const row = BY_BASELINE_ID.get(blId);
  if (!row) throw new Error('Unknown baseline id: ' + blId);
  return row;
}

/* The one resolver. It throws on every miss, including the two misses that
   are not typos: a row that measures nothing canonical, and a row whose bind
   does not resolve. Callers that expect an unmapped row must ask
   measuresStatus first rather than catching. */
export function resolveDefinition(blId: string): CpDefinition {
  const row = baselineRow(blId);
  if (!row.measures) {
    throw new Error(
      'Baseline row ' + blId + ' declares no canonical parameter (measures_status='
      + row.measuresStatus + '): ' + row.description
    );
  }
  const def = CP_DEFINITIONS.get(row.measures);
  if (!def) throw new Error('Unknown canonical parameter: ' + row.measures + ' (from ' + blId + ')');
  return def;
}

/* ---- the checks -------------------------------------------------------- */

const CP_HEADING = /^#{1,6}\s+(CP-[A-Z]+(?:-NEW)?-[0-9]+[a-f]?)\b/;
/* A family prefix carries no number, which is exactly why the pattern
   above could not see the nineteen headings finding 16 is about. */
const CP_FAMILY_HEADING = /^#{1,6}\s+(CP-[A-Z]+)(?!-[0-9])\b/;

/* Any CP-* id DEFINED as a heading outside cp_registry_canonical.csv. This is
   what §8.0.3 point 1 asks for, and it is why research/01-05 renumbered onto
   RB-*: a version of this check that exempted research/ would be a check that
   cannot fail. The file list comes from FILE_MANIFEST, which the build already
   gates against the working tree, so a new research file cannot dodge it. */
export function definitionNamespaceLeaks(): string[] {
  const out: string[] = [];
  for (const rel of FILE_MANIFEST) {
    if (!rel.startsWith('research/') || !rel.endsWith('.md')) continue;
    if (DEFINITION_SOURCES.has(rel) || HISTORICAL_RECORD.has(rel)) continue;
    const lines = read(rel).split('\n');
    lines.forEach(function (line, i) {
      const m = CP_HEADING.exec(line.trim());
      if (m) out.push(rel + ':' + (i + 1) + ' defines ' + m[1]);
      /* Finding 16 [P16 fix run 4]: the family prefixes. Nineteen headings
         read `## CP-LTC: Long-Term Care` and similar, and the numbered
         pattern above could not see them - it requires a trailing number.
         The files index `RB-*` now, so a `CP-*` family header sat above
         `### RB-04-LTC-011` and implied that row belonged to the CP family,
         which is the namespace conflation §S10 was done to end. The family
         segment is the same word in both schemes, so the headings keep it and
         drop the prefix: `## LTC: Long-Term Care`. */
      const fam = CP_FAMILY_HEADING.exec(line.trim());
      if (fam) {
        out.push(rel + ':' + (i + 1) + ' heads a section with the CP family '
          + fam[1] + '; the rows under it are RB-*');
      }
    });
  }
  return out;
}

/* Finding 15 [P16 fix run 4]: the second definition source nobody was
 * checking, found by measuring the claim instead of reading it.
 *
 * research/README.md says "Nothing outside cp_registry_canonical.csv may
 * define a CP-* id" and "the build enforces all three". Measured:
 * `src/lib/quality-data.ts` carries **all 310** ids with `name`, `unit`,
 * `family` and a `calculation` that is a definition in prose. It is a second
 * registry of the same namespace by any reading, and the sweep above could
 * never have seen it - that reads markdown headings under research/ and
 * nothing else, so its live search space across every non-exempt file is
 * currently EMPTY.
 *
 * Neither file can be hand-edited: the registry is generated from the Source
 * Package extract and `extractDisagreements()` pins it there, and quality-data
 * is generated by tools/extract_quality_catalog.py from the v2.0.0 FINAL docx.
 * Two generated artefacts from two upstream documents. So the honest model is
 * not "one authority" but "one authority and one mirror, checked to agree" -
 * the same shape the extract's exemption already takes, one file further out.
 *
 * Divergences are declared with their reason, and a declaration that stops
 * being true is reported by `staleMirrorDivergences()`. */
export const CP_MIRROR_DIVERGENCES: Record<string, string> = {
  'CP-TOT-009':
    'Measured 2026-08-31. Registry/extract say "Gross added framework spending"; '
    + 'quality-data says "Gross added system spending". Same parameter, and the '
    + 'two upstreams word it differently. Neither file is hand-editable.',
  'CP-TOT-010':
    'Measured 2026-08-31. Registry/extract say "Gross framework savings"; '
    + 'quality-data says "Gross system savings". Same divergence as CP-TOT-009 '
    + 'and from the same pair of documents.'
};

/* Finding 5 [P16 review 3]: three places projected the catalog down to its
 * CP rows, one of them a test asserting the premise the other two rest on.
 * A premise asserted against a rebuilt copy of itself is not asserted. */
export function catalogCpParameters(): QualityParameter[] {
  return QUALITY_CATALOG.parameters.filter((p) => p.type === 'CP');
}

export function definitionMirrorDisagreements(): string[] {
  const out: string[] = [];
  const mirror = catalogCpParameters();
  const seen = new Set<string>();
  for (const p of mirror) {
    seen.add(p.id);
    const def = CP_DEFINITIONS.get(p.id);
    if (!def) { out.push(p.id + ' is in the quality catalog and not in the registry'); continue; }
    if (def.name.trim() !== p.name.trim() && !(p.id in CP_MIRROR_DIVERGENCES)) {
      out.push(p.id + ' name disagrees: catalog "' + p.name.trim()
        + '" vs registry "' + def.name.trim() + '"');
    }
  }
  for (const id of CP_DEFINITIONS.keys()) {
    if (!seen.has(id)) out.push(id + ' is in the registry and not in the quality catalog');
  }
  return out;
}

/* A declared divergence that has stopped diverging is a stale exemption, and
   an exemption nobody retires is how a check quietly narrows. */
export function staleMirrorDivergences(): string[] {
  const byId = new Map(
    catalogCpParameters().map((p): [string, QualityParameter] => [p.id, p])
  );
  return Object.keys(CP_MIRROR_DIVERGENCES).filter(function (id) {
    const p = byId.get(id);
    const def = CP_DEFINITIONS.get(id);
    return !p || !def || def.name.trim() === p.name.trim();
  });
}

/* The extract is exempt from the sweep above because the registry is generated
   FROM it. That exemption is only honest while the two agree, so: every id the
   extract states must exist in the registry under the same name. */
export function extractDisagreements(): string[] {
  const out: string[] = [];
  const line = /^(CP-[A-Z]+-[0-9]+):\s*([^.]+)\./;
  let seen = 0;
  for (const raw of read(EXTRACT).split('\n')) {
    const m = line.exec(raw.trim());
    if (!m) continue;
    seen += 1;
    const def = CP_DEFINITIONS.get(m[1]);
    if (!def) { out.push(m[1] + ' is in the extract and not in the registry'); continue; }
    if (def.name.trim() !== m[2].trim()) {
      out.push(m[1] + ' name disagrees: extract "' + m[2].trim() + '" vs registry "'
        + def.name.trim() + '"');
    }
  }
  if (seen !== CP_DEFINITIONS.size) {
    out.push('extract states ' + seen + ' definitions, registry holds ' + CP_DEFINITIONS.size);
  }
  return out;
}

/* BL ids are sequential and non-semantic.
 *
 * ⚠️ Finding 8 [P16 fix run 3]: this used to carry two more clauses, and
 * neither could add a failure. `want` is always `BL-` + four digits, so:
 *
 *   - an id starting `CP-` is already unequal to `want`, and the position
 *     clause has fired before the namespace clause is reached;
 *   - two rows sharing an id sit at different indices, so their `want` values
 *     differ and at least one has already failed the position check.
 *
 * Both were strict subsets, which is worse than absent: a reader of this
 * function came away believing uniqueness and namespace were tested here.
 * They are tested, independently and from the FILES rather than the parsed
 * rows, by `idsResolvingToTwoDefinitions()` - a duplicate `baseline_id` in the
 * CSV and a BL id living in the CP namespace both fail there. Deleting them
 * here loses no coverage and stops the function overstating itself.
 *
 * One check, one property. The position rule pins format, sequence,
 * uniqueness and namespace at once, and says so. */
export function baselineIdProblems(): string[] {
  const out: string[] = [];
  BASELINE_ROWS.forEach(function (r, i) {
    const want = 'BL-' + String(i + 1).padStart(4, '0');
    if (r.baselineId !== want) out.push('position ' + (i + 1) + ' is ' + r.baselineId + ', expected ' + want);
  });
  return out;
}

/* Every row declares what it measures, `measures` is non-empty if and only if
   the status is `mapped`, and every bind resolves. The if-and-only-if is the
   load-bearing half: it is what stops an analogue being recorded as a bind,
   which is the shape that produced the 57 collisions. */
export function bindProblems(): string[] {
  const out: string[] = [];
  for (const r of BASELINE_ROWS) {
    if (!MEASURES_STATUSES.includes(r.measuresStatus)) {
      out.push(r.baselineId + ' measures_status "' + r.measuresStatus + '" is outside the three');
      continue;
    }
    const bound = r.measures !== '';
    if (bound !== (r.measuresStatus === 'mapped')) {
      out.push(r.baselineId + ' has measures="' + r.measures + '" with status '
        + r.measuresStatus + '; measures is non-empty iff mapped');
    }
    if (bound && !CP_DEFINITIONS.has(r.measures)) {
      out.push(r.baselineId + ' measures ' + r.measures + ', which does not resolve');
    }
  }
  return out;
}

/* A cut's role is read off the end of `disaggregation`. The column is prose by
   design - it says which cut of what a row is - but the parent/part
   distinction inside it has to be machine-readable, so the one word that
   changes arithmetic is pinned to a pattern. */
const TOTAL_MARKER = /,\s*total$/i;

/* Finding 4 [P16 fix run 2]: `measures` reproduced the many-to-one trap
   `research/README.md` already documents for `use_as`.
 *
 * Five rows carry `measures = CP-FIN-002`: four components and their $2,050B
 * total. Only free-text `disaggregation` separates the parent from the parts,
 * so anything that sums the rows resolving to one canonical id double-counts.
 * Nothing consumes `measures` yet, which is why the defect is silent and why
 * it is worth gating before the first consumer exists rather than after.
 *
 * ⚠️ Read this as a REGRESSION GATE, not as a repair. The two multi-bound ids
 * today (CP-FIN-002 with 5 rows, CP-OFF-008 with 2) already carry
 * disaggregation on every row and at most one total, so this check passes on
 * the tree that shipped the defect. What it stops is the next bind arriving
 * naked - and it can fail: 18 mapped rows have an empty disaggregation, and
 * any one of them binding an already-bound id fires it. */
export function multiBindProblems(): string[] {
  const out: string[] = [];
  const byCanonical = new Map<string, BaselineRow[]>();
  for (const r of BASELINE_ROWS) {
    if (r.measuresStatus !== 'mapped' || !r.measures) continue;
    const list = byCanonical.get(r.measures);
    if (list) list.push(r); else byCanonical.set(r.measures, [r]);
  }
  for (const [canonical, rows] of byCanonical) {
    if (rows.length < 2) continue;
    for (const r of rows) {
      if (r.disaggregation.trim() === '') {
        out.push(r.baselineId + ' shares ' + canonical + ' with '
          + (rows.length - 1) + ' other row(s) and declares no disaggregation, '
          + 'so nothing says whether it is a part or the whole');
      }
    }
    const totals = rows.filter((r) => TOTAL_MARKER.test(r.disaggregation.trim()));
    if (totals.length > 1) {
      out.push(canonical + ' has ' + totals.length + ' rows marked total ('
        + totals.map((r) => r.baselineId).join(', ') + '); at most one cut of a '
        + 'canonical parameter can be the whole of it');
    }
  }
  return out;
}

/* Every id a multi-bound canonical parameter groups, with the total separated
   from the parts, so a consumer never has to parse the prose itself. Unused by
   the site today; it exists so the first consumer of `measures` has a correct
   path available rather than a plausible wrong one. */
export function boundCuts(canonicalId: string): { total?: BaselineRow; parts: BaselineRow[] } {
  const rows = BASELINE_ROWS.filter(
    (r) => r.measuresStatus === 'mapped' && r.measures === canonicalId
  );
  return {
    total: rows.find((r) => TOTAL_MARKER.test(r.disaggregation.trim())),
    parts: rows.filter((r) => !TOTAL_MARKER.test(r.disaggregation.trim()))
  };
}

/* R236 / B1: after the split, no identifier resolves to two definitions.
 *
 * ⚠️ The obvious way to write this cannot fail. Iterating CP_DEFINITIONS looks
 * for a duplicate canonical id in a Map KEYED BY canonical id; iterating
 * BASELINE_ROWS for a BL id bound twice runs after baselineIdProblems() has
 * already required BL ids to be unique. Both failing sets are empty by
 * construction - which is precisely the defect P15 shipped as R13's declared
 * test, and precisely the shape §8.0.6 says converts an unexamined area into
 * an apparently examined one.
 *
 * So this reads the FILES rather than the loaded structures, and asks the
 * question B1 actually asks: does any one string denote two different things
 * across the three namespaces? A duplicate row in either CSV, a research
 * heading defined twice, or one identifier living in two namespaces all fail.
 */
export function idsResolvingToTwoDefinitions(): string[] {
  const out: string[] = [];

  const collect = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) out.push(label + ' defines ' + id + ' twice');
      seen.add(id);
    }
    return seen;
  };

  const canonRows = parseCsv(read(CANON)).slice(1).filter((r) => r[0]);
  const cp = collect('cp_registry_canonical.csv', canonRows.map((r) => r[0]));

  const seedRows = parseCsv(read(SEED)).slice(1).filter((r) => r[0]);
  const bl = collect('parameter_baseline_seed.csv', seedRows.map((r) => r[0]));

  const rbIds: string[] = [];
  const rbOwner = new Map<string, string>();
  for (const rel of FILE_MANIFEST) {
    if (!/^research\/0[1-6]_/.test(rel)) continue;
    for (const raw of read(rel).split('\n')) {
      const m = RB_HEADING.exec(raw.trim());
      if (!m) continue;
      if (rbOwner.has(m[1]) && rbOwner.get(m[1]) !== rel) {
        out.push(m[1] + ' is defined in both ' + rbOwner.get(m[1]) + ' and ' + rel);
      }
      rbOwner.set(m[1], rel);
      rbIds.push(m[1]);
    }
  }
  const rb = collect('research/01-06 headings', rbIds);

  const namespaces: [string, Set<string>][] = [['CP', cp], ['BL', bl], ['RB', rb]];
  for (let i = 0; i < namespaces.length; i += 1) {
    for (let j = i + 1; j < namespaces.length; j += 1) {
      for (const id of namespaces[i][1]) {
        if (namespaces[j][1].has(id)) {
          out.push(id + ' is an identifier in both the ' + namespaces[i][0]
            + ' and ' + namespaces[j][0] + ' namespaces');
        }
      }
    }
  }

  /* And the retired ids must stay retired: a superseded_id that is now a live
     identifier in any namespace would resolve to two different things
     depending on which side of the migration the reader is standing on. */
  for (const r of BASELINE_ROWS) {
    if (!r.supersededId) continue;
    if (bl.has(r.supersededId) || rb.has(r.supersededId)) {
      out.push(r.supersededId + ' is retired on ' + r.baselineId + ' and live elsewhere');
    }
  }
  return out;
}

/* R236 / J3: the fifteen letter-suffixed ids were never invalid - they were
 * expressing a cardinality the id scheme could not carry. After the split none
 * survives as an id; each is a BL row whose superseded_id records where it
 * came from, and the many-to-one relationship it needed lives in `measures`
 * plus `disaggregation`.
 *
 * ⚠️ Finding 6 [P16 fix run 3]: this used to filter BASELINE_ROWS for
 * /[a-f]$/ and could not fail. `baselineIdProblems()` pins every id to exactly
 * `BL-` + its 1-based position, so an id ending in a letter is not merely
 * absent - it is unreachable, and the check was a `[]` asserted against a set
 * that is empty by construction.
 *
 * The question J3 actually asks is not "did a suffix survive in the seed" but
 * "did a suffix survive ANYWHERE", and one namespace has real room to fail:
 * RB_HEADING matches `[0-9]+[a-f]?`, so `### RB-01-POP-004a` is a legal
 * heading that nothing forbids. That is the namespace finding 2's dead
 * citation was pointing into. So this reads the files, across all three. */
export function letterSuffixedIdentifiers(): string[] {
  const out: string[] = [];
  const suffixed = /[a-f]$/;

  for (const r of BASELINE_ROWS) {
    if (suffixed.test(r.baselineId)) out.push('measurement id ' + r.baselineId);
  }
  for (const id of CP_DEFINITIONS.keys()) {
    if (suffixed.test(id)) out.push('definition id ' + id);
  }
  for (const rel of FILE_MANIFEST) {
    if (!/^research\/0[1-6]_/.test(rel)) continue;
    read(rel).split('\n').forEach(function (raw, i) {
      const m = RB_HEADING.exec(raw.trim());
      if (m && suffixed.test(m[1])) {
        out.push('research heading ' + m[1] + ' (' + rel + ':' + (i + 1) + ')');
      }
    });
  }
  return out;
}

export function letterSuffixedOrigins(): BaselineRow[] {
  return BASELINE_ROWS.filter((r) => /[a-f]$/.test(r.supersededId));
}

/* R12: a contested parameter is a distribution, not a point value with a
   caveat in a notes column. The check has to be able to fail in both
   directions, so `compound` cannot be used as an escape hatch: a compound row
   whose value is a single number is a mislabelled point. */
export function valueTypeProblems(): string[] {
  const out: string[] = [];
  const single = /^-?[0-9][0-9,]*\.?[0-9]*$/;
  const num = (s: string) => Number(s.replace(/,/g, ''));
  for (const r of BASELINE_ROWS) {
    const t = r.valueType;
    if (!VALUE_TYPES.includes(t)) { out.push(r.baselineId + ' value_type "' + t + '" is outside the four'); continue; }
    const banded = t === 'range' || t === 'contested-range';
    if (banded) {
      if (!single.test(r.valueLow) || !single.test(r.valueHigh)) {
        out.push(r.baselineId + ' is ' + t + ' but its band is not two numbers: "'
          + r.valueLow + '".."' + r.valueHigh + '"');
      } else if (num(r.valueLow) > num(r.valueHigh)) {
        out.push(r.baselineId + ' band is inverted: ' + r.valueLow + ' > ' + r.valueHigh);
      }
    } else {
      if (r.valueLow !== '' || r.valueHigh !== '') {
        out.push(r.baselineId + ' is ' + t + ' and must carry no band');
      }
      if (t === 'point' && !single.test(r.value)) {
        out.push(r.baselineId + ' is point but its value is not a single number: "' + r.value + '"');
      }
      if (t === 'compound' && single.test(r.value)) {
        out.push(r.baselineId + ' is compound but its value is a single number: "' + r.value + '"');
      }
    }
  }
  return out;
}

/* R31's standing check. Two research files independently flagged their most
   important parameter and the seed dropped both, which is a selection failure
   rather than two coincidences: the seed took parameters that already had
   clean numeric values, which excluded exactly the ones flagged as important
   BECAUSE they needed more work.
 *
 * A flagged parameter must be named by some seed row, or be listed in
 * PRIORITY_EXEMPT with a reason. Section bodies stop at the next heading of
 * any level, so a "Most Load-Bearing Numbers" summary table below a section
 * does not get attributed to it. */
export const PRIORITY_PHRASES = [
  'most load-bearing',
  'highest-value',
  'highest value',
  'single most important',
  'most consequential'
];

export const PRIORITY_EXEMPT: Record<string, string> = {
  'RB-05-GOV-006':
    'Measured 2026-08-27: neither URL research/05 cites carries the 7.0%/7.5% net-cost-of-'
    + 'health-insurance share. Both fetch 200, and neither page states it. The figure is in '
    + 'the NHE Tables archive, which no pass has opened. Seeding it would mean inventing a '
    + 'citation. The dollar level of the same quantity is seeded as BL-0010.'
};

const RB_HEADING = /^#{2,6}\s+(RB-[0-9]{2}-[A-Z]+(?:-NEW)?-[0-9]+[a-f]?)\b/;

/* Deliberately WIDER than RB_HEADING: it ends `[a-z]?` where the heading ends
   `[a-f]?`, so a reference to a suffix no heading can carry is caught rather
   than skipped as not-an-id. A reference pattern narrower than its definition
   pattern silently exonerates the exact malformation it should catch. */
const RB_REFERENCE = /RB-[0-9]{2}-[A-Z]+(?:-NEW)?-[0-9]+[a-z]?/g;

/* The RB namespace's sole authority, matching how idsResolvingToTwoDefinitions
   defines it: a heading in research/01-06, one index per file. */
export function definedResearchIds(): Set<string> {
  const out = new Set<string>();
  for (const rel of FILE_MANIFEST) {
    if (!/^research\/0[1-6]_/.test(rel)) continue;
    for (const raw of read(rel).split('\n')) {
      const m = RB_HEADING.exec(raw.trim());
      if (m) out.add(m[1]);
    }
  }
  return out;
}

/* Finding 2 [P16 fix run 2]: two identifiers that never existed.
 *
 * `research/quality-equation-methodology.md` cited two letter-suffixed ids in
 * the POP family. Neither is defined anywhere and neither ever was:
 * rename_research_ids.py substring-replaced CP-POP-004 -> RB-01-POP-004, which
 * matched INSIDE the suffixed CP-POP-004a and CP-POP-004b, declared "expect 2
 * occurrences", found exactly 2, and passed.
 *
 * ⚠️ This comment used to spell the two dead ids, and the check below flagged
 * its own documentation on the first run - the pass removing a defect authoring
 * a fresh one, inside ten minutes. The literals live in REMEDIATION_LOG.md,
 * which the sweep does not reach, and that is the point of the scope note.
 *
 * A total match rate is the signal and not the reassurance -
 * the same shape P15 recorded one level up. The migration had no read-back, so
 * a citation pointing at nothing survived the rename and two reviews.
 *
 * This is the read-back. Every RB-* token in every manifest file must name an
 * id a research heading defines.
 *
 * SCOPE, stated because a check that sweeps less than its claim is finding
 * 15's defect: the manifest's .md, .ts, .astro and .csv files - 128 files
 * across research/, src/ and tools/.
 *
 * Two things are deliberately outside it, and each is a decision rather than
 * an oversight:
 *
 *   - Repo-root documents (REMEDIATION_LOG.md, AGENTS.md, the handoffs). This
 *     is what lets the log name a dead id in the sentence explaining it.
 *   - Comments in .ts and .astro. A comment is prose ABOUT the code; a
 *     citation is a pointer a reader follows. The check flagged its own
 *     documentation twice - once in fix run 2 and again in fix run 3, in the
 *     comment that has to show `RB-04-LTC-01` inside `RB-04-LTC-011` to
 *     explain finding 12 at all. Rewording won a round and lost the next one.
 *     Code STRINGS stay swept, and that is where the real .ts references live:
 *     `params.ts` holds `parameterId: 'RB-05-GOV-008'` and its kin in data,
 *     which go stale silently if a heading is renamed. The cost is a stale
 *     "see RB-XX-YYY-NNN" in a comment, which nothing now catches. */
export function researchReferenceProblems(): string[] {
  const defined = definedResearchIds();
  const out: string[] = [];
  for (const rel of FILE_MANIFEST) {
    if (!/\.(md|ts|astro|csv)$/.test(rel)) continue;
    const raw = read(rel);
    const text = /\.(ts|astro)$/.test(rel) ? maskComments(raw) : raw;
    text.split('\n').forEach(function (line, i) {
      if (RB_HEADING.test(line.trim())) return;
      const found = line.match(RB_REFERENCE);
      if (!found) return;
      for (const id of found) {
        if (defined.has(id)) continue;
        out.push(rel + ':' + (i + 1) + ' names ' + id
          + ', which no research heading defines');
      }
    });
  }
  return out;
}

export function flaggedPriorityParameters(): { id: string; file: string; phrase: string }[] {
  const found: { id: string; file: string; phrase: string }[] = [];
  for (const rel of FILE_MANIFEST) {
    if (!/^research\/0[1-6]_/.test(rel)) continue;
    let current = '';
    let body: string[] = [];
    const flush = () => {
      if (!current) return;
      const text = body.join(' ').toLowerCase();
      const hit = PRIORITY_PHRASES.find((p) => text.includes(p));
      if (hit) found.push({ id: current, file: rel, phrase: hit });
      current = '';
      body = [];
    };
    for (const raw of read(rel).split('\n')) {
      const line = raw.trim();
      const m = RB_HEADING.exec(line);
      if (m) { flush(); current = m[1]; continue; }
      if (line.startsWith('#')) { flush(); continue; }
      if (current) body.push(line);
    }
    flush();
  }
  return found;
}

/* ⚠️ Finding 12 [P16 fix run 3]: this used `blob.includes(f.id)`, a substring
 * match over concatenated prose. `RB-04-LTC-01` matches inside
 * `RB-04-LTC-011`, so a shorter id reads as seeded on the strength of a longer
 * one it merely prefixes. Identical root cause to finding 2, one file apart:
 * a substring operation standing in for an identifier comparison.
 *
 * Measured before fixing, because the review relayed this one without running
 * it: today no RB id is a strict prefix of another, so the bug is LATENT and
 * nothing is currently mis-reported. It is one heading away from live -
 * RB_HEADING accepts `[0-9]+`, with no width rule, so `RB-04-LTC-01` is a
 * legal heading. A latent defect in a check is still a defect in a check.
 *
 * A right-hand boundary is enough on its own, since every id begins `RB-`, but
 * both sides are asserted so the rule reads as "this token, not this text". */
/* Finding 5 [P16 review 3]: the test rebuilt this and dropped the escape,
 * then said in a comment that it was exercising "the fix itself". It was
 * exercising a copy that could not have caught the bug the escape prevents.
 * Exported so there is one matcher and both sides run it. */
export function namesIdAsToken(id: string, text: string): boolean {
  return new RegExp(
    '(?<![0-9A-Za-z])' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![0-9A-Za-z])'
  ).test(text);
}

export function unseededPriorityParameters(): string[] {
  const blob = BASELINE_ROWS
    .map((r) => r.description + ' ' + r.sourceName + ' ' + r.notes)
    .join(' ');
  return flaggedPriorityParameters()
    .filter((f) => !namesIdAsToken(f.id, blob) && !(f.id in PRIORITY_EXEMPT))
    .map((f) => f.id + ' (' + f.file + ', "' + f.phrase + '")');
}

export function stalePriorityExemptions(): string[] {
  const flagged = new Set(flaggedPriorityParameters().map((f) => f.id));
  return Object.keys(PRIORITY_EXEMPT).filter((id) => !flagged.has(id));
}

/* R1 [§S10], the seed half. 49 of 80 rows carried a confidence grade with no
   source URL at all, 41 of them high or medium-high. P15 backfilled 46 and
   downgraded 12, and left three empty - each graded below `medium` precisely
   because nothing citable was found. Nothing gated any of it, so the state was
   one careless edit from returning.
 *
 * The rule: a row graded `medium` or better states where its number came from,
 * or names itself pending. The backlog of honestly-empty rows is counted and
 * printed rather than hidden, which is the "noisy backlog counter" the row
 * asks for - a gap nobody can see is a gap nobody closes. */
export const SOURCED_GRADES = ['high', 'medium-high', 'medium'];

export function unsourcedGradedRows(): string[] {
  return BASELINE_ROWS
    .filter((r) => SOURCED_GRADES.includes(r.confidence)
      && r.sourceUrl.trim() === ''
      && !r.sourceName.trim().toLowerCase().startsWith('pending'))
    .map((r) => r.baselineId + ' (' + r.confidence + ') ' + r.description);
}

export function sourceBacklog(): { id: string; confidence: string }[] {
  return BASELINE_ROWS
    .filter((r) => r.sourceUrl.trim() === '')
    .map((r) => ({ id: r.baselineId, confidence: r.confidence }));
}

/* ---- reporting --------------------------------------------------------- */

export function measuresStatusCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of MEASURES_STATUSES) out[s] = 0;
  for (const r of BASELINE_ROWS) out[r.measuresStatus] = (out[r.measuresStatus] || 0) + 1;
  return out;
}
