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
  unreasonedCoverageGaps,
  uptimeDowntimeDrift,
  uptimeDowntimeRows
} from '../../src/lib/data-phases-checks';

/* R54 [§S0] — data-phases.ts shipped both counts as fields and asserted
   nothing. Both verify by hand (V4), but the Quality tab reuses this data
   verbatim, so an error propagates to two public tabs with no independent
   check.

   R110 [§S12]: this comment used to state targetCount as 64, which P7's R105
   moved to 66 two sections ago. A count restated in a comment beside the test
   that reads it is a second copy with nothing maintaining it, so the figure is
   gone from here and the assertions below read the field. */

test('R54: the declared metric count equals the distinct metric IDs', () => {
  expect(dataPhaseMetricIds().length).toBe(DATA_PHASE_COUNTS.metricCount);
  expect(DATA_PHASE_COUNTS.metricCount).toBe(26); // V4
});

test('R54: the declared target count equals the per-phase target rows', () => {
  expect(dataPhaseTargetCount()).toBe(DATA_PHASE_COUNTS.targetCount);

  /* R105 [S7]: KPP-T2 and TPP-6.3 gained P8 certification rows, so every
     count this file pins moves by two. Derivation rule 3 names five
     categories that get stricter early floors because a defect can
     directly interrupt care; three were certified at maturity and these
     two were not. */
  expect(DATA_PHASE_COUNTS.targetCount).toBe(66); // V4 + R105: 5+6+6+7+6+7+9+7+13
});

test('R54: every metric ID conforms to the KPP/TPP pattern', () => {
  // AN5 retracted AB3: TPP-FORM1 and TPP-USE1 are canonical, so the pattern
  // must admit a letter-suffixed form as well as the dotted numeric one.
  expect(dataPhaseIdFormat().nonConforming).toEqual([]);
});

test('R54: no phase target regresses away from its mature target', () => {
  expect(dataPhaseMonotonicity().regressions).toEqual([]);
});

test('R54: framework-basis entries are the seventeen V5 counted plus two from R105', () => {
  expect(frameworkBasisEntries().length).toBe(19); // V5 + R105
});

/* R117 [§S2] — the generator validates the vocabulary of `basis` and never the
   claim, while the catalog rollout it already loads carries the framework's own
   entry for every one of them. */

test('R117: every framework-basis target resolves to the catalog entry it claims', () => {
  expect(frameworkBasisDrift()).toEqual([]);
});

test('R117: the check reaches all nineteen claims and reads the catalog', () => {
  const claims = frameworkBasisClaims();
  expect(claims.length).toBe(19); // V5 + R105
  expect(claims.every((c) => c.catalogValue !== null)).toBe(true);
  // The P3/P4 Gate 1 floor is the one the phase map used to drop (R121).
  const g1 = claims.filter((c) => c.id === 'TPP-2.1').map((c) => c.phase).sort();
  expect(g1).toEqual(['P3', 'P4']);
});

test('R117: the claims restate the catalog rather than repeating it', () => {
  /* R130 [§S11b] corrected this in data-phases-checks.ts and left the name
     here saying "sixteen of the seventeen". There are nineteen rows and all
     nineteen are reworded, so both figures were wrong; the assertion below
     never depended on either, which is why nothing caught it.
     Why string equality is the wrong instrument: the claims are prose
     restatements of the same quantity, so comparing strings compares the
     wording and comparing the parsed triple compares the claim. */
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

test('R57: the uptime gap the row filed is one of the declared twelve', () => {
  const uptime = DATA_PHASE_GAPS.find((g) => g.id === 'TPP-11.1')!;
  expect(uptime.phases).toEqual(['P4', 'P5']);
  expect(uptime.reason).toMatch(/P5 publishes no continuity measure at all/);
  /* R105 [S7]: 10 -> 12. Certifying KPP-T2 and TPP-6.3 at P8 creates a gap
     for each between its single early measurement and maturity, and both are
     declared. KPP-T2's five-phase gap is the widest any rule-3 category has. */
  expect(measuredCoverageGaps().length).toBe(12);
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

/* R110 [§S12] — §AB7's test list has seven items and six were written. This is
   the seventh: the uptime justifications state an annualized downtime, and it
   must be the one their percentage implies at 8760 hours a year. */

test('R110: every stated annualized downtime matches its uptime target', () => {
  expect(uptimeDowntimeDrift()).toEqual([]);
});

test('R110: five rows state a downtime figure, and the check reads all five', () => {
  /* Pinned so that deleting a figure fails here rather than emptying the
     drift list above and passing. */
  const rows = uptimeDowntimeRows();
  expect(rows.length).toBe(5);
  expect(rows.map((r) => r.phase)).toEqual(['P1', 'P2', 'P3', 'P6', 'P7']);
  expect(rows.every((r) => r.id === 'TPP-11.1')).toBe(true);

  /* The arithmetic, once, in the open: 99.90% uptime leaves 0.10% of 8760
     hours, which is 8 hours 46 minutes. */
  const p1 = rows.filter((r) => r.phase === 'P1')[0];
  expect(p1.uptimePct).toBe(99.9);
  expect(p1.statedMinutes).toBe(8 * 60 + 46);
  expect(Math.round(p1.impliedMinutes)).toBe(526);
});
