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
  DATA_PHASE_METHODOLOGY_PATH, denominatorText, scopeNoteText
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
          /* R299 [§S16]: the generator appends the population note here */
          metric.justification + (metric.scopeChange
            ? ' ' + scopeNoteText(metric.scopeChange) : '')
        ].map(cell).join(' | ') + ' |');
      }
    }
  }
  return out;
}

/* R299, third review of P22: the methodology states rule 4 and each phase's
   denominator from the same table the payload carries. Reports a phase line
   the document lacks, and a denominator its rule 4 does not name. */
export function denominatorDocDrift(root = REPO_ROOT): string[] {
  const text = readFileSync(join(root, METHODOLOGY), 'utf8');
  const rule = text.split('\n').find((l) => l.startsWith('4. **Use bounded denominators.**')) || '';
  const out: string[] = [];
  if (!rule) out.push('the methodology has no rule 4');
  for (const p of DATA_PHASES) {
    if (rule && rule.indexOf(p.denominator) < 0) out.push('rule 4 does not name ' + p.id + "'s " + p.denominator);
    const section = text.slice(text.indexOf('### ' + p.id + ' - '));
    const end = section.indexOf('\n### ', 4);
    if ((end < 0 ? section : section.slice(0, end)).indexOf('\n' + denominatorText(p.denominator) + '\n') < 0) {
      out.push(p.id + ' section does not state "' + denominatorText(p.denominator) + '"');
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

/* R109 [§S18]: the document states the counts the payload ships.
 *
 * The row's complaint was that the methodology stated neither count, so the
 * count test had no documented value to agree with. The generator writes
 * the sentence from the payload in the same run; this holds the committed
 * sentence to the committed payload, so a regeneration of one file and not
 * the other is reported, and a sentence that goes missing is a fault rather
 * than a pass. Read as figures, not wording. */
const COUNT_SENTENCE = /The register holds \*\*(\d+)\*\* metrics and \*\*(\d+)\*\* phase targets across \*\*(\d+)\*\* phases: \*\*(\d+)\*\* copied from a controlled source target, milestone or gate floor, and \*\*(\d+)\*\* derived\./;

export function methodologyCountStatementDrift(
  root = REPO_ROOT, text: string = readFileSync(join(root, METHODOLOGY), 'utf8')
): string[] {
  const m = COUNT_SENTENCE.exec(text);
  if (!m) return [METHODOLOGY + ' no longer states the register\'s counts'];
  const metrics = DATA_PHASES.flatMap((p) => p.groups.flatMap((g) => g.metrics));
  const specified = metrics.filter((x) => x.basis === 'framework').length;
  const want: Array<[string, number, number]> = [
    ['metrics', Number(m[1]), DATA_PHASE_COUNTS.metricCount],
    ['phase targets', Number(m[2]), DATA_PHASE_COUNTS.targetCount],
    ['phases', Number(m[3]), DATA_PHASES.length],
    ['specified targets', Number(m[4]), specified],
    ['derived targets', Number(m[5]), metrics.length - specified]
  ];
  return want.filter(([, said, is]) => said !== is)
    .map(([what, said, is]) => METHODOLOGY + ' says ' + said + ' ' + what + '; the payload ships ' + is);
}
