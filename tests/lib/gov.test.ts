import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { GOV_GROUPS } from '../../src/lib/gov';
import { catalogCode } from '../../src/lib/params';
import { QUALITY_DATA } from '../../src/lib/quality';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

test('GOV_GROUPS: 84 entities under 9 governing bodies', () => {
  expect(GOV_GROUPS).toHaveLength(9);
  const total = GOV_GROUPS.reduce((n, g) => n + g.members.length, 0);
  expect(total).toBe(84);
});

test('GOV_GROUPS: every entity has code, name, short, role, why, replaces, leader', () => {
  const ok = GOV_GROUPS.every((g) =>
    g.head && g.members.every((m) =>
      m.code && m.name && m.short && m.role && m.why && m.replaces && m.leader));
  expect(ok).toBe(true);
});

/* The owner's decision of 2026-10-10 (golden rule 2's written exception):
   Governance draws no catalog or requirement ids. Each member's ids moved
   out of its prose into `targets`, which nothing draws; every one must still
   name a catalog record or a requirement row, so the numbers keep their
   pointer, and no drawn field may carry one. */
test('owner decision: every id behind a Governance number resolves, and no drawn field carries one', () => {
  const catalog = new Set(QUALITY_DATA.parameters.map((p) => p.id));
  const extract = readFileSync(join(REPO_ROOT, 'research/framework_v2_extract.md'), 'utf8');
  const members = GOV_GROUPS.flatMap((g) => g.members);
  const targets = members.flatMap((m) => m.targets || []);
  expect(targets.length).toBeGreaterThanOrEqual(30);
  const unresolved = targets.filter((id) => !catalog.has(id) && extract.indexOf('\n| ' + id + ' |') < 0);
  expect(unresolved).toEqual([]);
  const drawn = members.flatMap((m) => [m.code, m.name, m.short, m.role, m.why, m.replaces, m.leader]);
  expect(drawn.filter((s) => catalogCode().test(s))).toEqual([]);
});

/* Content, 2026-10-11: the Credential Recognition Board's case said
   internationally trained clinicians are "a sixth of nurses". NCSBN's 2022
   survey puts internationally educated RNs at 5.2%, cited in the Workforce
   methodology; one in twenty is what the board's text says now. */
test('content: the credential board states the cited nurse share', () => {
  const hcrb = GOV_GROUPS.flatMap((g) => g.members).filter((m) => m.code === 'HCRB')[0];
  expect(hcrb.why).toContain('a quarter of physicians, about one nurse in twenty');
  const methodology = readFileSync(join(REPO_ROOT, 'research/workforce_transition_methodology.md'), 'utf8');
  expect(methodology).toContain('5.2% of U.S. registered nurses got their entry-level nursing education abroad');
});
