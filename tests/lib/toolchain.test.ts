import { afterEach, expect, test } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { TOOLCHAINS, toolchainDrift, toolsInManifest } from '../../src/lib/toolchain-check';
import { textModeWrites } from '../../src/lib/manifest-check';

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

/* P22 [§S16] new finding: both generators wrote CRLF on Windows, deliberately,
   on a premise P12's eol=lf had inverted. A clean regeneration showed three
   files modified with an empty diff. */
const fixtureRoots: string[] = [];
afterEach(() => {
  while (fixtureRoots.length) rmSync(fixtureRoots.pop()!, { recursive: true, force: true });
});
function pyFixture(body: string): string {
  const root = mkdtempSync(join(tmpdir(), 'nha-py-'));
  fixtureRoots.push(root);
  mkdirSync(join(root, 'tools'), { recursive: true });
  writeFileSync(join(root, 'tools', 'gen.py'), body, 'utf8');
  return root;
}
const scan = (body: string) => textModeWrites(pyFixture(body), ['tools/gen.py']);

test('P22: every text write in the real Python tools sets LF', () => {
  const real = textModeWrites();
  expect(real.flagged).toEqual([]);
  // The three writes the two generators make. A scan that read nothing
  // would also report no flagged write, so the count is pinned.
  expect(real.writes).toBe(3);
});

test('P22: a platform-default write is refused in each spelling', () => {
  expect(scan('OUT.write_text(text, encoding="utf-8")\n').flagged).toHaveLength(1);
  expect(scan('OUT.write_text(text, encoding="utf-8", newline=None)\n').flagged).toHaveLength(1);
  expect(scan('with open(path, "w", encoding="utf-8") as f:\n    f.write(t)\n').flagged)
    .toHaveLength(1);
  expect(scan('f = open(path, mode="a")\n').flagged).toHaveLength(1);
  // split across lines, the form a long call takes after formatting
  expect(scan('OUT.write_text(\n    render(payload),\n    encoding="utf-8",\n)\n').flagged)
    .toHaveLength(1);
});

test('P22: an LF write, a binary write and a read all pass', () => {
  const ok = scan(
    'OUT.write_text(text, encoding="utf-8", newline="\\n")\n' +
    'DOC.write_text(\n    md,\n    encoding="utf-8",\n    newline="",\n)\n' +
    'open(path, "wb").write(blob)\n' +
    'data = open(path, encoding="utf-8").read()\n'
  );
  expect(ok.flagged).toEqual([]);
  expect(ok.writes).toBe(2);
});
