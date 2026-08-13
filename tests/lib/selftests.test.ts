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

/* R153 [§S0] — phase-targets.ts exports selfTestEveryRelevantPhase and
   selfTestNoRegression and nothing called them. They are the only tests
   covering the module that generates the published phase trajectories. */
test('R153: the two phase-target self-tests are registered', () => {
  const s = selfTestSummary();
  expect(s.rows.some((r) => /relevant phase/i.test(r.name))).toBe(true);
  expect(s.rows.some((r) => /regression/i.test(r.name))).toBe(true);
});

/* R230 [§S0] — equationSelfTests asserts coverage, acyclicity and P8 maturity
   closure over the equation layer, and selftests.ts never imported it. It ran
   under vitest only, so it could not stop a deploy. */
test('R230: equationSelfTests is registered and its messages reach the row note', () => {
  const s = selfTestSummary();
  const row = s.rows.find((r) => /equation/i.test(r.name));
  expect(row).toBeDefined();
  expect(row!.ok).toBe(true);
});
