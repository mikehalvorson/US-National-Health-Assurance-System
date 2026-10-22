import { afterAll, expect, test } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESEARCH_DATE_EXEMPT, researchDateStampFaults } from '../../src/lib/manifest-check';

/* R216 [§S17] (§BK4): "every research methodology carries a compiled date
   and a last-reviewed date". The stamp says "Last revised", which is what the
   repository can evidence; see the check's comment. */

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const roots: string[] = [];
afterAll(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

function research(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'nha-dates-'));
  roots.push(root);
  mkdirSync(join(root, 'research'), { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(join(root, 'research', name), text, 'utf8');
  return root;
}

test('R216: every research methodology carries a compiled date and a last-revised date', () => {
  const scan = researchDateStampFaults();
  expect(scan.faults).toEqual([]);
  expect(scan.stamped).toBeGreaterThanOrEqual(16);
  /* the file the audit found undated is dated, and reviewed against the tracker */
  const ltc = readFileSync(join(REPO_ROOT, 'research/long_term_care_methodology.md'), 'utf8');
  expect(ltc).toMatch(/^Compiled 2026-08-02\. Last revised 2026-10-20\.$/m);
  expect(ltc).toContain('No federal staffing ratio is assumed');
});

test('R216: a missing stamp, a stamp after the first section, and an impossible order are reported', () => {
  const root = research({
    'a.md': '# A\n\nNo date here.\n\n## One\n',
    'b.md': '# B\n\n## One\n\nCompiled 2026-07-01. Last revised 2026-08-01.\n',
    'c.md': '# C\n\nCompiled 2026-09-01. Last revised 2026-08-01.\n',
    'd.md': '# D\n\nCompiled 2026-02-30. Last revised 2026-08-01.\n',
    'e.md': '# E\n\nCompiled 2026-07-01. Last revised 2026-08-01.\n'
  });
  expect(researchDateStampFaults(root, {})).toEqual({ stamped: 1, faults: [
    'research/a.md has no "Compiled ... Last revised ..." line before its first section',
    'research/b.md has no "Compiled ... Last revised ..." line before its first section',
    'research/c.md: last revised 2026-08-01 is before compiled 2026-09-01',
    'research/d.md: a stamp date is not a real date'
  ] });
});

test('R216: an exemption must name a document, give a reason, and not be stamped anyway', () => {
  const root = research({
    'x.md': '# X\n\nCompiled 2026-07-01. Last revised 2026-08-01.\n',
    'y.md': '# Y\n\nundated by design\n'
  });
  expect(researchDateStampFaults(root, { 'research/x.md': 'why', 'research/y.md': '', 'research/z.md': 'gone' }).faults).toEqual([
    'research/x.md is exempt from the date stamp and carries one; drop the exemption',
    'the date-stamp exemption for research/y.md gives no reason',
    'the date-stamp exemption for research/z.md names no research document',
    'no research document carries a date stamp'
  ]);
  expect(Object.values(RESEARCH_DATE_EXEMPT).every((r) => r.length > 20)).toBe(true);
});
