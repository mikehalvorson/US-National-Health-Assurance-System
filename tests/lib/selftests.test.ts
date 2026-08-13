import { expect, test } from 'vitest';
import { assertSelfTestsPass, runGuarded, selfTestSummary } from '../../src/lib/selftests';

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

/* R154 [§S0] — the model and bridge calls were bare while the tax loop was
   wrapped, so a throw in either took down selfTestSummary entirely and the
   build rendered no self-test section at all: the failure mode most easily
   mistaken for success. */
test('runGuarded: a throwing self-test is reported as a failure, not an absence', () => {
  const row = runGuarded('exploding invariant', () => {
    throw new Error('boom');
  });
  expect(row.name).toBe('exploding invariant');
  expect(row.ok).toBe(false);
  expect(row.note).toContain('boom');
});

test('runGuarded: a passing self-test keeps its own note', () => {
  const row = runGuarded('fine', () => ({ ok: true, note: 'err=1.8e-12' }));
  expect(row).toEqual({ name: 'fine', ok: true, note: 'err=1.8e-12' });
});

test('runGuarded: a runner returning false is a failure', () => {
  expect(runGuarded('nope', () => ({ ok: false, note: '' })).ok).toBe(false);
});

test('selfTestSummary: no row is missing when a surface throws', () => {
  // every registered surface appears as a row, pass or fail
  const s = selfTestSummary();
  expect(s.rows.length).toBe(s.total);
  expect(s.rows.every((r) => r.name.length > 0)).toBe(true);
});
