import { expect, test } from 'vitest';
import { PHASES, DOMAINS, GATES, AGENCIES, WORKSTREAMS } from '../../src/lib/rollout';

test('PHASES: 9 phases P0..P8, first is foundation', () => {
  expect(PHASES).toHaveLength(9);
  expect(PHASES[0].id).toBe('P0');
  expect(PHASES[8].id).toBe('P8');
  expect(PHASES.every((p) => p.work.length > 0 && p.summary && p.evidence)).toBe(true);
});

test('DOMAINS: 13 rows, each name + 5 phase bands', () => {
  expect(DOMAINS).toHaveLength(13);
  expect(DOMAINS.every((d) => d.length === 6)).toBe(true);
});

test('GATES: 8 gates; AGENCIES 3 groups; WORKSTREAMS 13', () => {
  expect(GATES).toHaveLength(8);
  expect(GATES[0].n).toBe('G1');
  expect(AGENCIES).toHaveLength(3);
  expect(WORKSTREAMS).toHaveLength(13);
});
