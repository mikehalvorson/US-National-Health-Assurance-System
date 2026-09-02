import { expect, test } from 'vitest';
import { buildRamps, matureAtScale, offsetRamp, runMonteCarlo, runPath, sampleParams, selfTest } from '../../src/lib/model';
import { effectiveParams } from '../../src/lib/scenarios';
import { MATURE_YEAR, OFFSET_RAMPS, PRE_YEARS, RAMPS, START_YEAR } from '../../src/lib/params';

const effective = effectiveParams('SCN-BASE', null);

test('neutral policy reproduces the baseline within 0.5% (no free lunch)', () => {
  const n = sampleParams(effective, null);
  n.utilIncrease = 0; n.drugPriceCut = 0; n.providerPaymentFactor = 1;
  n.providerAdminSavings = 0; n.careModelSavings = 0; n.lowValueCapture = 0;
  n.extractionSavings = 0; n.ltcExpansion = 0; n.ltcWageFloor = 0; n.bhExpansion = 0;
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

/* R203 [§S2] — offLowValue ramps on `infra`, which reaches 1.0 at index 8 and
   is tied with `drugs` as the fastest curve in the model. The pairing is kept
   and declared; these hold the engine to the declaration and pin that reading
   the ramp through it computes exactly what naming it inline computed. */

test('R203: every offset equals its declared ramp times its own scope', () => {
  const p = sampleParams(effective, null);
  const path = runPath(p, {});
  const ramps = buildRamps({});
  const g = p.baselineRealGrowth / 100;

  path.detail.forEach((d, t) => {
    const G = Math.pow(1 + g, PRE_YEARS + t);
    expect(d.offProvAdmin).toBeCloseTo(
      (p.providerAdminSavings / 100) * (d.cHosp + d.cClin) * ramps.coverage[t], 9);
    expect(d.offCareModel).toBeCloseTo(p.careModelSavings * G * ramps.units[t], 9);
    expect(d.offLowValue).toBeCloseTo(
      (p.lowValueCapture / 100) * p.lowValuePool * G * ramps.infra[t], 9);
    expect(d.offExtraction).toBeCloseTo(p.extractionSavings * G * ramps.hospitals[t], 9);
  });
});

test('R203: each offset the engine produces carries a reasoned pairing', () => {
  const produced = Object.keys(runPath(sampleParams(effective, null), {}).detail[0])
    .filter((k) => k.startsWith('off')).sort();
  expect(produced).toEqual(OFFSET_RAMPS.map((o) => o.id).sort());
  for (const o of OFFSET_RAMPS) {
    expect(Object.keys(RAMPS)).toContain(o.ramp);
    expect(o.why.length).toBeGreaterThan(60);
    expect(o.delivers).not.toBe('');
  }
  // The one the row filed, stated rather than found by reading arithmetic.
  const lowValue = OFFSET_RAMPS.find((o) => o.id === 'offLowValue')!;
  expect(lowValue.ramp).toBe('infra');
  expect(lowValue.why).toMatch(/fastest curve in the model/);
});

test('R203: an offset with no declared pairing cannot reach a ramp', () => {
  const values = { coverage: 0.5, units: 0.4, drugs: 0.3, hospitals: 0.2, expansions: 0.1, infra: 0.9, costShareElim: 0 };
  expect(offsetRamp('offLowValue', values)).toBe(values.infra);
  expect(() => offsetRamp('offSomethingNew', values)).toThrow(/declares no ramp pairing/);
});

/* R125 [§S11b]: the wage pass-through crosses two engines and was double
   counted on the household side. `taxFeedback` is 28% of `wageGain` and is
   subtracted from `newRevenue`, so those cents are government revenue.
   Households keep `wageGain - taxFeedback`. Two published surfaces credited
   them the gross: the tax page's distribution rows and KPP-C8. */
test('the detail row publishes the wage gain net of the feedback already booked as revenue', () => {
  const path = runPath(sampleParams(effective, null), {});
  const idx = path.years.indexOf(MATURE_YEAR);
  const d = path.detail[idx];
  expect(d.wageGain).toBeGreaterThan(0);
  expect(d.taxFeedback).toBeGreaterThan(0);
  expect(d.wageGainNet).toBeCloseTo(d.wageGain - d.taxFeedback, 9);
  /* the point of the field: households and the treasury together get the
     gross exactly once, not 1.28 times it */
  expect(d.wageGainNet + d.taxFeedback).toBeCloseTo(d.wageGain, 9);
  expect(d.wageGainNet).toBeLessThan(d.wageGain);
});
