import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { expect, test } from 'vitest';
import {
  assertReadmeCountCurrent,
  assertSelfTestsPass,
  equationTargetDiagnostics,
  runGuarded,
  SELF_TEST_SOURCES,
  selfTestSummary
} from '../../src/lib/selftests';
import { readmeAdvertisedTestCount } from '../../src/lib/manifest-check';

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
      total: 3
    })
  ).toThrow(/a broken invariant[\s\S]*another broken one/);
});

test('assertSelfTestsPass: reports the count so a build log states the damage', () => {
  expect(() =>
    assertSelfTestsPass({
      rows: [{ name: 'x', ok: false, note: '' }],
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

/* R273 [§S0] — fmea.ts states three times that its self-tests gate the build
   and then called console.error. Seven invariants over 1,037 derived failure
   modes, none able to stop a deploy. */
test('R273: fmeaSelfTests is registered', () => {
  const s = selfTestSummary();
  const row = s.rows.find((r) => /failure.mode/i.test(r.name));
  expect(row).toBeDefined();
  expect(row!.ok).toBe(true);
});

/* R248 [§S0] — two detectors, not one. The row's own instrument counts rollout
   entries still carrying kind === 'derived interim target' after import, and
   that count is genuinely 0. But a zero there does NOT mean every equation
   evaluated: a metric/phase pair with no rollout row is computed and dropped,
   so applyEquationTargets never sees it and the kind survives nowhere. */
test('R248: no rollout entry survives applyEquationTargets as a derived interim target', () => {
  expect(equationTargetDiagnostics().kindSurvivors).toEqual([]);
});

test('R248: every non-finite equation result is reported by ID and phase', () => {
  const found = equationTargetDiagnostics().nonFinite
    .map((c) => c.metric + '@' + c.phase)
    .sort();
  // Known and documented, not tolerated silently: these eleven evaluate NaN at
  // early phases. All eleven are dropped rather than published, because no
  // rollout row exists at that phase. §S3 owns the equations themselves.
  expect(found).toEqual([
    'KPP-B1@P0',
    'KPP-D7@P0',
    'KPP-TRUST1@P0',
    'TPP-9.3@P0', 'TPP-9.3@P1', 'TPP-9.3@P2', 'TPP-9.3@P3',
    'TPP-9.5@P0', 'TPP-9.5@P1', 'TPP-9.5@P2', 'TPP-9.5@P3'
  ]);
});

test('R248: no non-finite cell reaches a published rollout row', () => {
  expect(equationTargetDiagnostics().nonFinitePublished).toEqual([]);
});

/* R24 + R206 [§S0] — the repo ran three incompatible registration mechanisms:
   model.ts's selfTest() returning an array, taxmodel.ts's TAX_SELFTESTS pushing
   {name, run} objects, and phase-targets.ts's bare predicates taking the
   catalog. None knew about the others, so nobody could state the true test
   count or confirm every test executed. */
test('R24: every self-test source is declared in one registry', () => {
  const sources = SELF_TEST_SOURCES;
  expect(sources.length).toBeGreaterThan(0);
  expect(sources.every((s) => typeof s.surface === 'string' && s.surface.length > 0)).toBe(true);
  expect(new Set(sources.map((s) => s.surface)).size).toBe(sources.length);
});

test('R24: the registered count equals the advertised count', () => {
  const s = selfTestSummary();
  const fromSurfaces = Object.values(s.bySurface).reduce((n, v) => n + v, 0);
  expect(s.total).toBe(fromSurfaces);
  expect(s.rows.length).toBe(s.total);
  // every declared surface actually contributed
  expect(Object.keys(s.bySurface).sort()).toEqual(SELF_TEST_SOURCES.map((x) => x.surface).sort());
});

test('R24: no two self-tests share a name, so a failure names one test', () => {
  const names = selfTestSummary().rows.map((r) => r.name);
  expect(new Set(names).size).toBe(names.length);
});

test('R206: all three harness shapes are represented in the registry', () => {
  const surfaces = SELF_TEST_SOURCES.map((s) => s.surface);
  expect(surfaces).toContain('model.ts');       // selfTest(): SelfTestResult[]
  expect(surfaces).toContain('taxmodel.ts');    // TAX_SELFTESTS: {name, run}[]
  expect(surfaces).toContain('phase-targets.ts'); // bare predicate taking Q
});

test('R206: no exported self-test surface is missing from the registry', () => {
  // the six surfaces R153, R230 and R273 enumerate, plus the two added here
  const surfaces = new Set(SELF_TEST_SOURCES.map((s) => s.surface));
  for (const s of [
    'model.ts', 'bridge.ts', 'taxmodel.ts', 'phase-targets.ts',
    'equations.ts', 'fmea.ts', 'data-phases.ts', 'manifest-check.ts'
  ]) {
    expect(surfaces.has(s)).toBe(true);
  }
});


/* R155 [§S0] — the README advertised 27 integrity tests against a real 19.
   Checked in the gate, which holds the finished total; a row cannot know the
   total it is part of. */
test('R155: the gate rejects a README count that has drifted', () => {
  const real = selfTestSummary().total;
  expect(() =>
    assertReadmeCountCurrent({ total: real + 1 })
  ).toThrow(/README advertises/);
});

test('R155: the gate is silent when the README is current', () => {
  expect(() => assertReadmeCountCurrent(selfTestSummary())).not.toThrow();
});

test('R155: the README states the count the registry produces', () => {
  expect(readmeAdvertisedTestCount()).toBe(selfTestSummary().total);
});

/* R155 reopened at §S1 — a README with no figure at all returned silently, so
   the gate switched itself off. R113 reached that state by accident: rewrapping
   the sentence split "integrity" from "tests" and the single-line regex stopped
   matching, while astro build went on passing. Deleting the sentence does the
   same thing on purpose. */
test('R155: a README that states no count is drift, not silence', () => {
  const root = mkdtempSync(join(tmpdir(), 'nha-count-'));
  try {
    writeFileSync(join(root, 'README.md'), 'A dashboard. No figure here.\n', 'utf8');
    expect(() => assertReadmeCountCurrent({ total: 38 }, root)).toThrow(/states no integrity-test count/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('R155: the wrapped-sentence regression is caught', () => {
  const root = mkdtempSync(join(tmpdir(), 'nha-count-'));
  try {
    writeFileSync(
      join(root, 'README.md'),
      'validates itself with 38 built-in integrity\ntests, shown in the footer.\n',
      'utf8'
    );
    expect(() => assertReadmeCountCurrent({ total: 38 }, root)).toThrow(/states no integrity-test count/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
