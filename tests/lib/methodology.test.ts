import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test } from 'vitest';
import {
  methodologyCountsAgree,
  methodologyDrift,
  renderedGapRows,
  renderedHeadings,
  renderedRows
} from '../../src/lib/methodology-check';
import { DATA_PHASE_COUNTS, DATA_PHASE_GAPS } from '../../src/lib/data-phases';

/* R107 [§S1] — research/data_phase_target_methodology.md is a rendering;
   tools/build_data_phase_targets.py is the source of truth. Before R114 the
   generator wrote the document and a copy of the data into the retired tree,
   so regenerating updated the retired artifact and the methodology together
   and left the deployed site stale (§AL3). The document would then agree with
   a file nothing serves and disagree with the site a reader is looking at. */

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const METHODOLOGY = join('research', 'data_phase_target_methodology.md');
const GAPS_HEADING = '## Declared coverage gaps';
const roots: string[] = [];

function fixture(text: string): string {
  const root = mkdtempSync(join(tmpdir(), 'nha-method-'));
  roots.push(root);
  mkdirSync(join(root, 'research'), { recursive: true });
  writeFileSync(join(root, METHODOLOGY), text, 'utf8');
  return root;
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

test('R107: the committed document renders every phase target', () => {
  const drift = methodologyDrift();
  expect(drift.missingRows).toEqual([]);
  expect(drift.missingHeadings).toEqual([]);
});

test('R107: the declared count, the data and the document agree', () => {
  expect(methodologyCountsAgree()).toBe(true);
  expect(methodologyDrift().dataRowCount).toBe(DATA_PHASE_COUNTS.targetCount);
});

test('R107: one changed word in the document is reported', () => {
  const committed = readFileSync(join(REPO_ROOT, METHODOLOGY), 'utf8');
  const drifted = committed.replace(
    'A 70% foundation threshold',
    'A 71% foundation threshold'
  );
  expect(drifted).not.toBe(committed); // the anchor still exists

  const drift = methodologyDrift(fixture(drifted));
  expect(drift.missingRows).toHaveLength(1);
  expect(drift.missingRows[0]).toContain('TPP-FORM1');
});

test('R107: a document missing a whole phase is reported', () => {
  const committed = readFileSync(join(REPO_ROOT, METHODOLOGY), 'utf8');
  const heading = renderedHeadings()[0];
  const drift = methodologyDrift(fixture(committed.replace(heading, '### P0 - Year 1: Renamed')));
  expect(drift.missingHeadings).toEqual([heading]);
});

test('R107: a row count that no longer matches the data is reported', () => {
  const committed = readFileSync(join(REPO_ROOT, METHODOLOGY), 'utf8');
  // Inside the register: R57 gave the document a second table, and only the
  // register describes the collection the declared counts describe.
  const drifted = committed.replace(GAPS_HEADING, renderedRows()[0] + '\n\n' + GAPS_HEADING);
  const drift = methodologyDrift(fixture(drifted));
  expect(drift.documentRowCount).toBe(drift.dataRowCount + 1);
});

/* R57 [§S2] — the declared coverage gaps are part of the same rendering. A
   reason that exists in the payload and not in the document is drift. */

test('R57: the committed document renders every declared coverage gap', () => {
  expect(methodologyDrift().missingGapRows).toEqual([]);
  expect(renderedGapRows()).toHaveLength(DATA_PHASE_GAPS.length);
});

test('R57: a gap row dropped from the document is reported', () => {
  const committed = readFileSync(join(REPO_ROOT, METHODOLOGY), 'utf8');
  const row = renderedGapRows().find((r) => r.includes('TPP-11.1'))!;
  // Line-based: the generator writes platform line endings, so a raw string
  // replace carrying '\n' misses the row on a Windows worktree.
  const without = committed.split(/\r?\n/).filter((l) => l.trimEnd() !== row).join('\n');
  const drift = methodologyDrift(fixture(without));
  expect(drift.missingGapRows).toEqual([row]);
  // The register's own count is untouched by a change to the other table.
  expect(drift.documentRowCount).toBe(drift.dataRowCount);
});

test('R57: the gaps table does not inflate the phase target count', () => {
  expect(methodologyDrift().documentRowCount).toBe(DATA_PHASE_COUNTS.targetCount);
});
