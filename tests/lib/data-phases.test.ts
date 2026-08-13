import { expect, test } from 'vitest';
import { DATA_PHASES, DATA_PHASE_COUNTS } from '../../src/lib/data-phases';
import {
  dataPhaseIdFormat,
  dataPhaseMetricIds,
  dataPhaseMonotonicity,
  dataPhaseTargetCount,
  frameworkBasisEntries
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

test('R54: every phase carries an id, a year and at least one group', () => {
  expect(DATA_PHASES.length).toBe(9);
  for (const p of DATA_PHASES) {
    expect(p.id).toMatch(/^P[0-8]$/);
    expect(p.year).toBeGreaterThan(0);
    expect(p.groups.length).toBeGreaterThan(0);
  }
});
