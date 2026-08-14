import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test } from 'vitest';
import { retiredTreeTargets } from '../../src/lib/manifest-check';
import { NHA_QUALITY_DATA } from '../../src/lib/quality-data';

/* R114 [§S1] — the extraction pipeline wrote into the retired tree while the
   live catalog was a hand port marked "do not re-derive", so the
   reproducibility guarantee the extractor exists to provide never reached the
   deployed site. Any change to the controlled DOCX needed a manual re-port
   that nothing verified. */

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const roots: string[] = [];

function toolsFixture(name: string, body: string): string {
  const root = mkdtempSync(join(tmpdir(), 'nha-tools-'));
  roots.push(root);
  mkdirSync(join(root, 'tools'), { recursive: true });
  writeFileSync(join(root, 'tools', name), body, 'utf8');
  return root;
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

test('R114: no committed tool targets the retired tree', () => {
  expect(retiredTreeTargets()).toEqual([]);
});

test('R114: a generator writing into the retired tree is reported', () => {
  /* The form the extractor actually used. The separators are Python operators
     outside the string, so the only boundary is the quote; a pattern that
     insists on docs/ misses the write target and catches only the docstring. */
  const hits = retiredTreeTargets(
    toolsFixture('gen.py', 'OUT = ROOT / "docs" / "js" / "thing.js"\n')
  );
  expect(hits).toHaveLength(1);
  expect(hits[0].line).toBe(1);
});

test('R114: the slash form is reported', () => {
  const hits = retiredTreeTargets(toolsFixture('gen.py', 'OUT = "docs/js/thing.js"\n'));
  expect(hits).toHaveLength(1);
});

test('R114: the backslash form is reported too', () => {
  /* tools/serve.ps1 pointed at "..\\docs", so a local preview showed a
     different application from the deployed one. A slash-only check misses it. */
  const hits = retiredTreeTargets(
    toolsFixture('serve.ps1', '$root = Join-Path $PSScriptRoot "..\\docs"\n')
  );
  expect(hits).toHaveLength(1);
});

test('R114: a tool naming the tree without pointing into it is allowed', () => {
  const hits = retiredTreeTargets(
    toolsFixture('gen.py', '# The retired tree is not read by this script.\n')
  );
  expect(hits).toEqual([]);
});

/* The ten records that are not in the controlled DOCX are carried in a sidecar
   so src/lib/quality-data.ts regenerates rather than being maintained by hand.
   If the sidecar and the catalog drift, the next regeneration silently drops or
   duplicates records. */
test('R114: every addendum record is in the generated catalog', () => {
  const addendum = JSON.parse(
    readFileSync(join(REPO_ROOT, 'tools', 'quality_catalog_addendum.json'), 'utf8')
  ) as { records: Array<{ id: string; type: string }> };
  expect(addendum.records).toHaveLength(10);

  const catalogIds = new Set(NHA_QUALITY_DATA.parameters.map((p) => p.id));
  for (const record of addendum.records) expect(catalogIds.has(record.id)).toBe(true);
});

test('R114: the catalog counts equal 430 extracted plus the addendum', () => {
  const addendum = JSON.parse(
    readFileSync(join(REPO_ROOT, 'tools', 'quality_catalog_addendum.json'), 'utf8')
  ) as { records: Array<{ id: string; type: string }> };
  const added = { KPP: 0, TPP: 0 } as Record<string, number>;
  for (const record of addendum.records) added[record.type] += 1;

  /* The extractor asserts (41, 79, 310, 430) against the DOCX before merging. */
  expect(NHA_QUALITY_DATA.counts.KPP).toBe(41 + added.KPP);
  expect(NHA_QUALITY_DATA.counts.TPP).toBe(79 + added.TPP);
  expect(NHA_QUALITY_DATA.counts.CP).toBe(310);
  expect(NHA_QUALITY_DATA.counts.total).toBe(430 + addendum.records.length);
  expect(NHA_QUALITY_DATA.parameters.length).toBe(NHA_QUALITY_DATA.counts.total);
});
