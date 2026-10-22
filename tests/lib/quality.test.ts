import { expect, test } from 'vitest';
import { NO_TECHNICAL_TRACE, QUALITY_DATA, whereItMatters } from '../../src/lib/quality';
import { selfTestEveryRelevantPhase, selfTestNoRegression } from '../../src/lib/phase-targets';

/* owner, 2026-10-12: 441 since KPP-E6, the disability accommodation metric */
test('quality catalog: 441 parameters (46 KPP + 85 TPP + 310 CP)', () => {
  expect(QUALITY_DATA.counts.total).toBe(441);
  expect(QUALITY_DATA.counts.KPP).toBe(46);
  expect(QUALITY_DATA.counts.TPP).toBe(85);
  expect(QUALITY_DATA.counts.CP).toBe(310);
  expect(QUALITY_DATA.parameters).toHaveLength(441);
});

/* R220 [S12], review: AGENTS.md rule 4 says a changed count and its test ship
   in the same commit. The rendered maturity line moved from a typed 120 to
   counts.KPP + counts.TPP, and the two operands were already pinned above -
   but the SUM is the number a reader sees, and 120 was wrong for as long as
   nothing asserted it. This is that assertion. */
test('Review of P22: no record reads "Not specified" under Where it matters', () => {
  /* R302 emptied the TPP traces; the fallback must say why, not that the
     plan left it open. */
  const shown = QUALITY_DATA.parameters.map((p) => [p.type, whereItMatters(p)] as const);
  expect(shown.filter(([, w]) => w === 'Not specified')).toEqual([]);
  expect(shown.filter(([t, w]) => t === 'TPP' && w === NO_TECHNICAL_TRACE)).toHaveLength(85);
  expect(shown.filter(([t, w]) => t !== 'TPP' && w === NO_TECHNICAL_TRACE)).toEqual([]);
  const kpp = QUALITY_DATA.parameters.find((p) => p.id === 'KPP-A1')!;
  expect(whereItMatters(kpp)).toBe(kpp.where);
  expect(whereItMatters({ ...kpp, where: '', family: '' })).toBe('Not specified');
});

test('R220: the maturity line counts every KPP and TPP, and it is 131', () => {
  expect(QUALITY_DATA.counts.KPP + QUALITY_DATA.counts.TPP).toBe(131);
  const kppTpp = QUALITY_DATA.parameters.filter((p) => p.type !== 'CP');
  expect(kppTpp).toHaveLength(131);
});

/* R220 [S12], review: the ten records the plan adopted later carry the mark
   the display splits on. Both halves: the count, and the exact ids, so
   marking an eleventh or losing one fails here rather than on the page. */
test('R220: exactly the eleven declared records are plan-defined', () => {
  const provisional = QUALITY_DATA.parameters
    .filter((p) => p.provenance === 'plan-defined')
    .map((p) => p.id)
    .sort();
  expect(provisional).toEqual([...QUALITY_DATA.provenance.planDefinedIds].sort());
  expect(provisional).toHaveLength(QUALITY_DATA.provenance.planDefined);
  expect(provisional).toHaveLength(11);
});

test('phase-targets self-tests reconcile (docs phasetargets.js:311-349)', () => {
  expect(selfTestEveryRelevantPhase(QUALITY_DATA)).toBe(true);
  expect(selfTestNoRegression(QUALITY_DATA)).toBe(true);
});
