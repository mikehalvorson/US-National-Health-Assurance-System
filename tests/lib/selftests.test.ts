import { expect, test } from 'vitest';
import { assertSelfTestsPass, selfTestSummary } from '../../src/lib/selftests';

test('selfTestSummary: every model + bridge + tax self-test passes', () => {
  const s = selfTestSummary();
  expect(s.total).toBeGreaterThanOrEqual(18); // ~11 model + bridge + 7 tax
  expect(s.passed).toBe(s.total);
  expect(s.rows.every((r) => typeof r.name === 'string' && typeof r.ok === 'boolean')).toBe(true);
  // the bridge-identity row is present
  expect(s.rows.some((r) => r.name.includes('Bridge decomposition'))).toBe(true);
});

/* R152 [§S0] — a failing self-test must be able to stop a build. Before this,
   selfTestSummary returned {passed, total} and nothing compared them: a broken
   invariant rendered as a red row in the page footer and the site still shipped. */
test('assertSelfTestsPass: throws, and names every failing row', () => {
  expect(() =>
    assertSelfTestsPass({
      rows: [
        { name: 'a passing invariant', ok: true, note: '' },
        { name: 'a broken invariant', ok: false, note: 'err=1.2' },
        { name: 'another broken one', ok: false, note: '' }
      ],
      passed: 1,
      total: 3
    })
  ).toThrow(/a broken invariant[\s\S]*another broken one/);
});

test('assertSelfTestsPass: reports the count so a build log states the damage', () => {
  expect(() =>
    assertSelfTestsPass({
      rows: [{ name: 'x', ok: false, note: '' }],
      passed: 0,
      total: 1
    })
  ).toThrow(/1 of 1/);
});

test('assertSelfTestsPass: silent when every row passes', () => {
  expect(() => assertSelfTestsPass(selfTestSummary())).not.toThrow();
});
