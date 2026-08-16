import { expect, test } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOLCHAINS, toolchainDrift, toolsInManifest } from '../../src/lib/toolchain-check';

/* R131 [§S2] — the repo carried tools/extract_docx.py, committed having never
   been run, beside tools/extract_docx.mjs, the port that actually produced the
   extracts. Running both settled it: identical content on all three .docx
   files, diverging only in line endings, because Python's text-mode write
   translates \n to \r\n on Windows. The port is faithful; the duplicate is
   deleted; what remains is a statement of which runtime each tool needs. */

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

test('R131: every tool in tools/ has a declared runtime, and none is stale', () => {
  const d = toolchainDrift();
  expect(d.undeclared).toEqual([]);
  expect(d.stale).toEqual([]);
  expect(d.unexplained).toEqual([]);
});

test('R131: the two-extractor split is resolved, not just documented', () => {
  expect(existsSync(join(REPO_ROOT, 'tools/extract_docx.py'))).toBe(false);
  expect(existsSync(join(REPO_ROOT, 'tools/extract_docx.mjs'))).toBe(true);
  expect(TOOLCHAINS.filter((t) => t.path.includes('extract_docx'))).toHaveLength(1);
});

test('R131: every declared tool is a file the repo actually carries', () => {
  for (const tool of TOOLCHAINS) {
    expect(existsSync(join(REPO_ROOT, tool.path))).toBe(true);
  }
  expect(TOOLCHAINS.map((t) => t.path).sort()).toEqual(toolsInManifest());
});

test('R131: python is claimed only by the tools that genuinely need it', () => {
  const python = TOOLCHAINS.filter((t) => t.runtime === 'python').map((t) => t.path);
  expect(python).toEqual([
    'tools/build_data_phase_targets.py',
    'tools/extract_quality_catalog.py',
    'tools/model_hospital_regions.py'
  ]);
  // Only the catalog extractor needs a third-party package.
  const withDeps = TOOLCHAINS.filter((t) => t.needs.includes('python-docx')).map((t) => t.path);
  expect(withDeps).toEqual(['tools/extract_quality_catalog.py']);
});
