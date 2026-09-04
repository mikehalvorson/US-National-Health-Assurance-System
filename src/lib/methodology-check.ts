/* R107 [§S1]: the methodology document is a rendering, the generator is the
 * source of truth.
 *
 * research/data_phase_target_methodology.md and src/lib/data-phases.ts are two
 * outputs of one run of tools/build_data_phase_targets.py. Before R114 the
 * generator wrote the document and a retired copy of the data, so regenerating
 * produced a document that agreed with a file nothing serves and disagreed
 * with the deployed site (§AL3). Both now come from src/lib/quality-data.ts,
 * and this check keeps them in step without needing Python on the machine that
 * runs the build: it re-renders every table row from DATA_PHASES and requires
 * the committed document to contain exactly those rows.
 *
 * Build-time only, like manifest-check.ts. Memoised, because vitest re-imports
 * once per test file and this reads and parses a 30 KB document.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DATA_PHASES, DATA_PHASE_COUNTS, DATA_PHASE_GAPS,
  DATA_PHASE_METHODOLOGY_PATH
} from './data-phases';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
/* R298 [S12], review: a fifth hand-typed copy of the path the payload
   carries as a field. Read, not retyped. */
const METHODOLOGY = DATA_PHASE_METHODOLOGY_PATH;

/* The generator escapes a pipe inside a cell so the row keeps its shape. */
function cell(value: string): string {
  return value.split('|').join('\\|');
}

/* One row per metric, in the generator's column order. */
export function renderedRows(): string[] {
  const out: string[] = [];
  for (const phase of DATA_PHASES) {
    for (const group of phase.groups) {
      for (const metric of group.metrics) {
        out.push('| ' + [
          group.section,
          '`' + metric.id + '` - ' + metric.name,
          metric.phaseTarget,
          metric.matureTarget,
          metric.basis.charAt(0).toUpperCase() + metric.basis.slice(1),
          metric.justification
        ].map(cell).join(' | ') + ' |');
      }
    }
  }
  return out;
}

/* R57 [§S2]: the declared coverage gaps render as their own table, so the
   document a reader opens carries the reason a metric stops being published. */
export function renderedGapRows(): string[] {
  return DATA_PHASE_GAPS.map(
    (g) => '| ' + ['`' + g.id + '`', g.phases.join(' '), g.reason].map(cell).join(' | ') + ' |'
  );
}

export function renderedHeadings(): string[] {
  return DATA_PHASES.map(
    (p) => '### ' + p.id + ' - Year ' + p.year + ': ' + p.title
  );
}

export interface MethodologyDrift {
  missingRows: string[]; /* rendered from the data, absent from the document */
  missingGapRows: string[];
  missingHeadings: string[];
  documentRowCount: number;
  dataRowCount: number;
}

/* The document holds more than one table now, and only the phase target
   register describes the collection the declared counts describe. Counting
   every row in the file made the coverage-gap table read as eleven more phase
   targets, so the count is taken from the register's own section. */
function sectionLines(lines: string[], heading: string): string[] {
  const start = lines.indexOf(heading);
  if (start < 0) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('## '));
  return end < 0 ? rest : rest.slice(0, end);
}

const cache = new Map<string, MethodologyDrift>();

export function methodologyDrift(root = REPO_ROOT): MethodologyDrift {
  const hit = cache.get(root);
  if (hit) return hit;
  const lines = readFileSync(join(root, METHODOLOGY), 'utf8').split('\n')
    .map((l) => l.trimEnd());
  const present = new Set(lines);

  /* Data rows only: the header and the |---| separator are not metrics. */
  const documentRowCount = sectionLines(lines, '## Phase target register').filter(
    (l) => l.startsWith('| ') && !l.startsWith('|---') && !l.startsWith('| Data-tab section ')
  ).length;

  const rows = renderedRows();
  const result: MethodologyDrift = {
    missingRows: rows.filter((r) => !present.has(r)),
    missingGapRows: renderedGapRows().filter((r) => !present.has(r)),
    missingHeadings: renderedHeadings().filter((h) => !present.has(h)),
    documentRowCount: documentRowCount,
    dataRowCount: rows.length
  };
  cache.set(root, result);
  return result;
}

/* The declared count, the data, and the document all describe one collection. */
export function methodologyCountsAgree(): boolean {
  const d = methodologyDrift();
  return d.dataRowCount === DATA_PHASE_COUNTS.targetCount &&
    d.documentRowCount === DATA_PHASE_COUNTS.targetCount;
}
