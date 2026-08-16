import { expect, test } from 'vitest';
import { DATA_PHASES, DATA_PHASE_COUNTS, DATA_PHASE_GAPS } from '../../src/lib/data-phases';
import {
  coverageGapDrift,
  dataPhaseIdFormat,
  dataPhaseMetricIds,
  dataPhaseMonotonicity,
  dataPhaseTargetCount,
  frameworkBasisClaims,
  frameworkBasisDrift,
  frameworkBasisEntries,
  measuredCoverageGaps,
  unreasonedCoverageGaps
} from '../../src/lib/data-phases-checks';

/* R54 [§S0] — data-phases.ts ships metricCount: 26 and targetCount: 64 as
   fields and asserts nothing. Both verify by hand (V4), but the Quality tab
   reuses this data verbatim, so an error propagates to two public tabs with no
   independent check. */

test('R54: the declared metric count equals the distinct metric IDs', () => {
  expect(dataPhaseMetricIds().length).toBe(DATA_PHASE_COUNTS.metricCount);
  expect(DATA_PHASE_COUNTS.metricCount).toBe(26); // V4
});

test('R54: the declared target count equals the per-phase target rows', () => {
  expect(dataPhaseTargetCount()).toBe(DATA_PHASE_COUNTS.targetCount);
  expect(DATA_PHASE_COUNTS.targetCount).toBe(64); // V4: 5+6+6+7+6+7+9+7+11
});

test('R54: every metric ID conforms to the KPP/TPP pattern', () => {
  // AN5 retracted AB3: TPP-FORM1 and TPP-USE1 are canonical, so the pattern
  // must admit a letter-suffixed form as well as the dotted numeric one.
  expect(dataPhaseIdFormat().nonConforming).toEqual([]);
});

test('R54: no phase target regresses away from its mature target', () => {
  expect(dataPhaseMonotonicity().regressions).toEqual([]);
});

test('R54: framework-basis entries are exactly the seventeen V5 counted', () => {
  expect(frameworkBasisEntries().length).toBe(17); // V5
});

/* R117 [§S2] — the generator validates the vocabulary of `basis` and never the
   claim, while the catalog rollout it already loads carries the framework's own
   entry for every one of them. */

test('R117: every framework-basis target resolves to the catalog entry it claims', () => {
  expect(frameworkBasisDrift()).toEqual([]);
});

test('R117: the check reaches all seventeen claims and reads the catalog', () => {
  const claims = frameworkBasisClaims();
  expect(claims.length).toBe(17); // V5
  expect(claims.every((c) => c.catalogValue !== null)).toBe(true);
  // The P3/P4 Gate 1 floor is the one the phase map used to drop (R121).
  const g1 = claims.filter((c) => c.id === 'TPP-2.1').map((c) => c.phase).sort();
  expect(g1).toEqual(['P3', 'P4']);
});

test('R117: wording differs from the catalog on sixteen of the seventeen', () => {
  // The reason string equality is the wrong instrument: the claims are prose
  // restatements of the same quantity, so only the P8 API-conformance style
  // rows repeat the catalog verbatim.
  const verbatim = frameworkBasisClaims().filter((c) => c.declared === c.catalogValue);
  expect(verbatim.length).toBeLessThan(frameworkBasisClaims().length);
  expect(frameworkBasisDrift()).toEqual([]);
});

/* R57 [§S2] — TPP-11.1 uptime is tracked at P1–P3 and P6–P8 and absent at P4 and
   P5, the phases when hospitals, laboratories and units first depend on the
   rail. Measuring the register found ten metrics with that shape, not one. */

test('R57: every metric that skips a phase declares which phases and why', () => {
  expect(coverageGapDrift()).toEqual([]);
  expect(unreasonedCoverageGaps()).toEqual([]);
});

test('R57: the uptime gap the row filed is one of the declared ten', () => {
  const uptime = DATA_PHASE_GAPS.find((g) => g.id === 'TPP-11.1')!;
  expect(uptime.phases).toEqual(['P4', 'P5']);
  expect(uptime.reason).toMatch(/P5 publishes no continuity measure at all/);
  expect(measuredCoverageGaps().length).toBe(10);
});

test('R57: a metric gaining a gap is not silently absorbed', () => {
  // The declarations are exact, both ways: TPP-10.2's gap is P4 and P5, so a
  // check that only asked "is it declared at all" would pass a metric that
  // stopped being published a phase earlier.
  const gaps = new Map(DATA_PHASE_GAPS.map((g) => [g.id, g.phases.join('+')]));
  for (const measured of measuredCoverageGaps()) {
    expect(gaps.get(measured.id)).toBe(measured.phases.join('+'));
  }
  expect(gaps.size).toBe(measuredCoverageGaps().length);
});

test('R54: every phase carries an id, a year and at least one group', () => {
  expect(DATA_PHASES.length).toBe(9);
  for (const p of DATA_PHASES) {
    expect(p.id).toMatch(/^P[0-8]$/);
    expect(p.year).toBeGreaterThan(0);
    expect(p.groups.length).toBeGreaterThan(0);
  }
});
