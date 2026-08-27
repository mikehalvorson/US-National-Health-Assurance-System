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

const CP_HEADING = /^#{2,6}\s+(CP-[A-Z]+(?:-NEW)?-[0-9]+[a-f]?)\b/;

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
    });
  }
  return out;
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

/* BL ids are sequential and non-semantic, and none reuses a CP number. */
export function baselineIdProblems(): string[] {
  const out: string[] = [];
  BASELINE_ROWS.forEach(function (r, i) {
    const want = 'BL-' + String(i + 1).padStart(4, '0');
    if (r.baselineId !== want) out.push('position ' + (i + 1) + ' is ' + r.baselineId + ', expected ' + want);
    if (/^CP-/.test(r.baselineId)) out.push(r.baselineId + ' is still in the CP namespace');
  });
  const seen = new Set<string>();
  for (const r of BASELINE_ROWS) {
    if (seen.has(r.baselineId)) out.push('duplicate baseline id ' + r.baselineId);
    seen.add(r.baselineId);
  }
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
   expressing a cardinality the id scheme could not carry. After the split none
   survives as an id; each is a BL row whose superseded_id records where it
   came from, and the many-to-one relationship it needed lives in `measures`
   plus `disaggregation`. */
export function letterSuffixSurvivors(): string[] {
  return BASELINE_ROWS
    .filter((r) => /[a-f]$/.test(r.baselineId))
    .map((r) => r.baselineId);
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

export function unseededPriorityParameters(): string[] {
  const blob = BASELINE_ROWS
    .map((r) => r.description + ' ' + r.sourceName + ' ' + r.notes)
    .join(' ');
  return flaggedPriorityParameters()
    .filter((f) => !blob.includes(f.id) && !(f.id in PRIORITY_EXEMPT))
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
