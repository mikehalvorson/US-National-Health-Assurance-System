import { expect, test } from 'vitest';
import { QUALITY_DATA } from '../../src/lib/quality';
import { selfTestEveryRelevantPhase, selfTestNoRegression } from '../../src/lib/phase-targets';

test('quality catalog: 440 parameters (45 KPP + 85 TPP + 310 CP)', () => {
  expect(QUALITY_DATA.counts.total).toBe(440);
  expect(QUALITY_DATA.counts.KPP).toBe(45);
  expect(QUALITY_DATA.counts.TPP).toBe(85);
  expect(QUALITY_DATA.counts.CP).toBe(310);
  expect(QUALITY_DATA.parameters).toHaveLength(440);
});

/* R220 [S12], review: AGENTS.md rule 4 says a changed count and its test ship
   in the same commit. The rendered maturity line moved from a typed 120 to
   counts.KPP + counts.TPP, and the two operands were already pinned above -
   but the SUM is the number a reader sees, and 120 was wrong for as long as
   nothing asserted it. This is that assertion. */
test('R220: the maturity line counts every KPP and TPP, and it is 130', () => {
  expect(QUALITY_DATA.counts.KPP + QUALITY_DATA.counts.TPP).toBe(130);
  const kppTpp = QUALITY_DATA.parameters.filter((p) => p.type !== 'CP');
  expect(kppTpp).toHaveLength(130);
});

/* R220 [S12], review: the ten records the plan adopted later carry the mark
   the display splits on. Both halves: the count, and the exact ids, so
   marking an eleventh or losing one fails here rather than on the page. */
test('R220: exactly the ten declared records are plan-defined', () => {
  const provisional = QUALITY_DATA.parameters
    .filter((p) => p.provenance === 'plan-defined')
    .map((p) => p.id)
    .sort();
  expect(provisional).toEqual([...QUALITY_DATA.provenance.planDefinedIds].sort());
  expect(provisional).toHaveLength(QUALITY_DATA.provenance.planDefined);
  expect(provisional).toHaveLength(10);
});

test('phase-targets self-tests reconcile (docs phasetargets.js:311-349)', () => {
  expect(selfTestEveryRelevantPhase(QUALITY_DATA)).toBe(true);
  expect(selfTestNoRegression(QUALITY_DATA)).toBe(true);
});
