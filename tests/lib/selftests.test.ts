import { expect, test } from 'vitest';
import { selfTestSummary } from '../../src/lib/selftests';

test('selfTestSummary: every model + bridge + tax self-test passes', () => {
  const s = selfTestSummary();
  expect(s.total).toBeGreaterThanOrEqual(18); // ~11 model + bridge + 7 tax
  expect(s.passed).toBe(s.total);
  expect(s.rows.every((r) => typeof r.name === 'string' && typeof r.ok === 'boolean')).toBe(true);
  // the bridge-identity row is present
  expect(s.rows.some((r) => r.name.includes('Bridge decomposition'))).toBe(true);
});
