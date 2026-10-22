import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, expect, test } from 'vitest';
import { maskComments, retiredTreeCodeReferences } from '../../src/lib/manifest-check';

/* R112 [§S1] — R1-R111 all name paths under docs/. The defects are real (V25:
   both engines are faithful ports) but the addresses are not, so applying them
   as written changes nothing a reader sees. Re-targeting the backlog is a
   document job; this is the code half, keeping a re-targeted address from
   drifting back. */

const roots: string[] = [];

function srcFixture(name: string, body: string): string {
  const root = mkdtempSync(join(tmpdir(), 'nha-src-'));
  roots.push(root);
  mkdirSync(join(root, 'src', 'lib'), { recursive: true });
  writeFileSync(join(root, 'src', 'lib', name), body, 'utf8');
  return root;
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

test('R112: no live code in src/ references the retired tree', () => {
  expect(retiredTreeCodeReferences()).toEqual([]);
});

test('R112: a fetch of a retired path is reported with its line', () => {
  const hits = retiredTreeCodeReferences(srcFixture(
    'thing.ts',
    '/* Ported from docs/js/thing.js */\nexport const url = "docs/data/counties.json";\n'
  ));
  expect(hits).toHaveLength(1);
  expect(hits[0].line).toBe(2);
});

test('R112: provenance comments are kept, in all three comment forms', () => {
  /* Nearly every module in src/lib records which docs/js file it was ported
     from. That history is worth keeping; only executable references are not. */
  expect(retiredTreeCodeReferences(srcFixture(
    'thing.ts',
    '/* Port of docs/js/model.js\n   continued: docs/js/app.js on a line with no marker */\n' +
    '// see docs/js/charts.js\n' +
    '<!-- docs/index.html -->\n' +
    'export const x = 1;\n'
  ))).toEqual([]);
});

test('R112: a URL does not mask the rest of its own line', () => {
  /* An .astro template is HTML, where // is not a comment. Treating it as one
     would hide any reference later on the same line. */
  const hits = retiredTreeCodeReferences(srcFixture(
    'thing.ts',
    'const a = "https://example.com/x"; const b = "docs/js/thing.js";\n'
  ));
  expect(hits).toHaveLength(1);
});

test('R112: masking preserves offsets so line numbers stay true', () => {
  const masked = maskComments('a\n/* two\n   three */\nfour\n');
  expect(masked.split('\n')).toHaveLength(5);
  expect(masked.split('\n')[3]).toBe('four');
  expect(masked.split('\n')[1].trim()).toBe('');
});

test('R112: a regex literal does not derail the scan', () => {
  /* Tracking quotes made the scanner wrong on manifest-check.ts itself: a
     character class reads as an unterminated string and every comment after it
     stops being recognised. */
  const hits = retiredTreeCodeReferences(srcFixture(
    'thing.ts',
    'const re = /["\'\\/]docs/;\n/* Port of docs/js/model.js */\nconst u = "docs/js/x.js";\n'
  ));
  expect(hits.map((h) => h.line)).toEqual([3]);
});
