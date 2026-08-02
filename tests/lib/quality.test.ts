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

test('phase-targets self-tests reconcile (docs phasetargets.js:311-349)', () => {
  expect(selfTestEveryRelevantPhase(QUALITY_DATA)).toBe(true);
  expect(selfTestNoRegression(QUALITY_DATA)).toBe(true);
});
