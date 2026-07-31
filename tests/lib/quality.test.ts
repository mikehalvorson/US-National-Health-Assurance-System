import { expect, test } from 'vitest';
import { QUALITY_DATA } from '../../src/lib/quality';
import { selfTestEveryRelevantPhase, selfTestNoRegression } from '../../src/lib/phase-targets';

test('quality catalog: 430 parameters (41 KPP + 79 TPP + 310 CP)', () => {
  expect(QUALITY_DATA.counts.total).toBe(430);
  expect(QUALITY_DATA.counts.KPP).toBe(41);
  expect(QUALITY_DATA.counts.TPP).toBe(79);
  expect(QUALITY_DATA.counts.CP).toBe(310);
  expect(QUALITY_DATA.parameters).toHaveLength(430);
});

test('phase-targets self-tests reconcile (docs phasetargets.js:311-349)', () => {
  expect(selfTestEveryRelevantPhase(QUALITY_DATA)).toBe(true);
  expect(selfTestNoRegression(QUALITY_DATA)).toBe(true);
});
