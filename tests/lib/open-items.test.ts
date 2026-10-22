import { afterAll, expect, test } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPEN_ITEM_REGISTER, openItemReferences, openItemRegisterDrift } from '../../src/lib/manifest-check';
import { WORKSTREAM_COST_NOTE } from '../../src/lib/rollout';

/* R77 [§S17] (§AF5): "every OI referenced in any document appears in the
   published register". The crosswalk cites a range, and the register held only
   its two ends, described as the range. */

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const REGISTER = (): string => readFileSync(join(REPO_ROOT, OPEN_ITEM_REGISTER), 'utf8');
const roots: string[] = [];
afterAll(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

/* one root per case: the reader caches by root and path */
function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'nha-oi-'));
  roots.push(root);
  mkdirSync(join(root, 'src'), { recursive: true });
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text, 'utf8');
  }
  return root;
}

const row = (id: string): string => '| **`' + id + '`** | open | blocks | owner |\n';

test('R77: every OI referenced in any document appears in the published register', () => {
  const scan = openItemRegisterDrift();
  expect(scan.faults).toEqual([]);
  expect(scan.referenced).toBe(scan.rows);
  /* the range the crosswalk cites reaches every item in it */
  const refs = openItemReferences();
  for (let n = 61; n <= 70; n += 1) expect(refs.get('OI-0' + n)).toBe('research/legislation_crosswalk.md');
});

test('R77: each item in the range has its own subject, as the extract gives it', () => {
  const reg = REGISTER();
  expect(reg).toMatch(/\| \*\*`OI-061`\*\* \| Bill text and committee jurisdiction/);
  expect(reg).toMatch(/\| \*\*`OI-070`\*\* \| Regulatory defaults/);
  const row070 = reg.split('\n').find((l) => l.startsWith('| **`OI-070`**'))!;
  expect(row070).not.toMatch(/upper bound|range/);
});

test('R77: a range is expanded, and a register holding only its ends is reported', () => {
  const root = tree({
    'research/x.md': 'Open under OI-061 through OI-064.\n',
    [OPEN_ITEM_REGISTER]: row('OI-061') + row('OI-064')
  });
  expect(openItemRegisterDrift(root).faults).toEqual([
    'research/x.md cites OI-062, and ' + OPEN_ITEM_REGISTER + ' has no row for it',
    'research/x.md cites OI-063, and ' + OPEN_ITEM_REGISTER + ' has no row for it'
  ]);
  /* the other spellings of a range */
  for (const spelled of ['OI-061-OI-064', 'OI-061–064', 'OI-061 to OI-064']) {
    const r = tree({ 'src/x.ts': '// ' + spelled + '\n', [OPEN_ITEM_REGISTER]: row('OI-061') });
    expect(openItemRegisterDrift(r).faults).toHaveLength(3);
  }
});

test('R77: a row nothing cites, a duplicated row, and an unread repo are each reported', () => {
  const root = tree({ 'src/x.ts': 'OI-001\n', [OPEN_ITEM_REGISTER]: row('OI-001') + row('OI-001') + row('OI-002') });
  expect(openItemRegisterDrift(root).faults).toEqual([
    OPEN_ITEM_REGISTER + ' lists OI-001 twice',
    OPEN_ITEM_REGISTER + ' lists OI-002, which nothing outside the extracts cites'
  ]);
  const empty = tree({ [OPEN_ITEM_REGISTER]: '' });
  expect(openItemRegisterDrift(empty).faults).toEqual([
    'no file outside the extracts cites an open item, so nothing was checked',
    OPEN_ITEM_REGISTER + ' has no rows'
  ]);
});

test('R77: the extracts and the register itself do not count as citations', () => {
  const root = tree({
    'research/framework_v2_extract.md': 'OI-099\n',
    'research/source_package_extract.md': 'OI-098\n',
    'src/x.ts': 'OI-001\n',
    [OPEN_ITEM_REGISTER]: row('OI-001') + 'See also OI-097.\n'
  });
  expect(openItemRegisterDrift(root)).toEqual({ referenced: 1, rows: 1, faults: [] });
  /* and the generated quality catalog does count */
  const gen = tree({ 'src/lib/quality-data.ts': 'const X = {"where":"OI-023"};\n', [OPEN_ITEM_REGISTER]: '' });
  expect(openItemReferences(gen).get('OI-023')).toBe('src/lib/quality-data.ts');
});

test('review of P23: a range wider than thirty items is read in full, not as its first item', () => {
  const root = tree({ 'research/x.md': 'Open under OI-061 through OI-100.\n', [OPEN_ITEM_REGISTER]: row('OI-061') });
  expect(openItemRegisterDrift(root).faults).toHaveLength(39);
});

/* Review 2 of P23: this blocked one stale path in the OI-052 row and pinned
   the first file the walk found citing the item. The register's last column
   names what must change; every repo file it names must exist, and the
   OI-052 row's account of the Rollout note must be what the note says. What
   no check here can read is whether a row's prose about a file is true. */
test('review 2 of P23: every file the register names exists, and the OI-052 row describes the note it names', () => {
  const rows = REGISTER().split('\n').filter((l) => l.startsWith('| **`OI-'));
  const owners = rows.map((r) => r.split('|')[4]);
  expect(owners.every((o) => o !== undefined && o.trim() !== '')).toBe(true);
  const paths = owners.flatMap((o) => [...o.matchAll(/`((?:src|research|tests|tools)\/[^`]+)`/g)].map((m) => m[1]));
  expect(paths.length).toBeGreaterThanOrEqual(20);
  expect(paths.filter((p) => !existsSync(join(REPO_ROOT, p)))).toEqual([]);
  const r052 = rows.find((l) => l.startsWith('| **`OI-052`**'))!;
  expect(r052).toContain('wait on the cost-loaded schedule');
  expect(WORKSTREAM_COST_NOTE).toContain('requires a cost-loaded integrated schedule before phase and domain shares are set');
});
