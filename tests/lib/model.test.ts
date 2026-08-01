import { expect, test } from 'vitest';
import { sampleParams, runPath, matureAtScale, runMonteCarlo, selfTest } from '../../src/lib/model';
import { effectiveParams } from '../../src/lib/scenarios';
import { START_YEAR } from '../../src/lib/params';

const effective = effectiveParams('SCN-BASE', null);

test('neutral policy reproduces the baseline within 0.5% (no free lunch)', () => {
  const n = sampleParams(effective, null);
  n.utilIncrease = 0; n.drugPriceCut = 0; n.providerPaymentFactor = 1;
  n.providerAdminSavings = 0; n.careModelSavings = 0; n.lowValueCapture = 0;
  n.extractionSavings = 0; n.ltcExpansion = 0; n.bhExpansion = 0;
  n.dvhExpansion = 0; n.emsPhExpansion = 0; n.unitsCost = 0; n.rdPublic = 0;
  n.workforceEdu = 0; n.itOperating = 0; n.itCapital = 0; n.transitionTotal = 0;
  n.legacyAdminFloor = 1; n.publicAdminRate = 0; n.governanceRate = 0;
  const path = runPath(n, {});
  const last = path.detail[path.detail.length - 1];
  const relDiff = Math.abs(last.nheNha - last.nheBase) / last.nheBase;
  expect(relDiff).toBeLessThan(0.005);
});

test('baseline trajectory is monotonically increasing', () => {
  const path = runPath(sampleParams(effective, null), {});
  for (let i = 1; i < path.baseline.length; i++) {
    expect(path.baseline[i]).toBeGreaterThan(path.baseline[i - 1]);
  }
});

test('offsets are always smaller than their source categories', () => {
  const path = runPath(sampleParams(effective, null), {});
  for (const d of path.detail) {
    expect(d.offProvAdmin + d.offExtraction).toBeLessThan(d.cHosp + d.cClin);
    expect(d.offCareModel).toBeLessThan(d.cHosp);
    expect(d.offLowValue).toBeLessThan(d.cHosp + d.cClin + d.cOtherPhc);
  }
});

test('correlated draws: z=+1 raises costs and cuts savings vs z=-1', () => {
  const fixed = () => 0.5;
  const hi = sampleParams(effective, fixed, 1);
  const lo = sampleParams(effective, fixed, -1);
  expect(hi.utilIncrease).toBeGreaterThan(lo.utilIncrease);
  expect(hi.drugPriceCut).toBeLessThan(lo.drugPriceCut);
});

test('wage pass-through feedback is 28% of wage gain and lowers new revenue', () => {
  const p0 = sampleParams(effective, null); p0.wagePassThrough = 0;
  const p9 = sampleParams(effective, null); p9.wagePassThrough = 95;
  const idx = 2041 - START_YEAR;
  const d0 = runPath(p0, {}).detail[idx];
  const d9 = runPath(p9, {}).detail[idx];
  expect(d0.newRevenue).toBeGreaterThan(d9.newRevenue);
  expect(Math.abs(d9.taxFeedback - 0.28 * d9.wageGain)).toBeLessThan(0.01);
  expect(d0.wageGain).toBe(0);
});

test('mature-at-scale matches the 2041 path value', () => {
  const p = sampleParams(effective, null);
  const d2041 = runPath(p, {}).detail[2041 - START_YEAR];
  const mas = matureAtScale(p, {}, 18);
  const err = Math.abs(mas.nheNha - d2041.nheNha) / d2041.nheNha;
  expect(err).toBeLessThan(0.001);
});

test('Monte Carlo percentile bands are ordered (p10 <= p50 <= p90)', () => {
  const mc = runMonteCarlo('SCN-BASE', null, 60, 7);
  for (const b of mc.yearBands) {
    expect(b.p10).toBeLessThanOrEqual(b.p50 + 1e-9);
    expect(b.p50).toBeLessThanOrEqual(b.p90 + 1e-9);
  }
});

test('selfTest() reports all nine invariants passing', () => {
  const results = selfTest();
  expect(results.length).toBeGreaterThanOrEqual(9);
  const failing = results.filter((r) => !r.ok).map((r) => r.name);
  expect(failing).toEqual([]);
});
