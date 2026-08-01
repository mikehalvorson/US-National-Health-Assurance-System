import { expect, test } from 'vitest';
import { GOV_GROUPS } from '../../src/lib/gov';

test('GOV_GROUPS: 82 entities under 9 governing bodies', () => {
  expect(GOV_GROUPS).toHaveLength(9);
  const total = GOV_GROUPS.reduce((n, g) => n + g.members.length, 0);
  expect(total).toBe(82);
});

test('GOV_GROUPS: every entity has code, name, short, role, why, replaces, leader', () => {
  const ok = GOV_GROUPS.every((g) =>
    g.head && g.members.every((m) =>
      m.code && m.name && m.short && m.role && m.why && m.replaces && m.leader));
  expect(ok).toBe(true);
});
