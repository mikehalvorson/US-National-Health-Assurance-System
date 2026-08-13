import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { BASE2023, RAMPS, AGE_STRUCTURE } from '../../src/lib/params';
import { growthDecompNote } from '../../src/lib/growth-decomp';

test('2023 categories sum to the CMS NHE total (calibration invariant)', () => {
  const B = BASE2023 as Record<string, number>;
  const listed =
    B.hospital + B.physician + B.otherProf + B.dental + B.otherPersonal +
    B.homeHealth + B.nursing + B.rxRetail + B.dme + B.nondurables +
    B.netInsCost + B.govtAdmin + B.publicHealth + B.investmentResidual;
  expect(Math.abs(listed - B.nheTotal)).toBeLessThan(0.11);
});

test('transition outlay shape sums to 100%', () => {
  const s = RAMPS.transitionShape.reduce((a, b) => a + b, 0);
  expect(Math.abs(s - 1)).toBeLessThan(1e-9);
});

test('IT capital shape sums to 100%', () => {
  const s = RAMPS.itCapitalShape.reduce((a, b) => a + b, 0);
  expect(Math.abs(s - 1)).toBeLessThan(1e-9);
});

test('age-structure shares sum to 1 in 2024 and 2041', () => {
  let s24 = 0, s41 = 0;
  for (const b of AGE_STRUCTURE.bands) { s24 += b.share2024; s41 += b.share2041; }
  expect(Math.abs(s24 - 1)).toBeLessThan(0.005);
  expect(Math.abs(s41 - 1)).toBeLessThan(0.005);
});

/* R137 [§S0] — AGE_STRUCTURE claimed its cost weights were "normalized so the
   2024-weighted average is ~1". They are not: it is 1.1195. The claim was
   false; the data is fine, because its only consumer uses a ratio. */
test('R137: the cost-weight index is what it actually is, not the claimed 1.0', () => {
  let idx24 = 0, idx41 = 0;
  for (const b of AGE_STRUCTURE.bands) {
    idx24 += b.share2024 * b.costw;
    idx41 += b.share2041 * b.costw;
  }
  expect(idx24).toBeCloseTo(1.1195, 4);
  expect(idx41).toBeCloseTo(1.2061, 4);
  expect(idx24).not.toBeCloseTo(1.0, 2); // the removed claim, asserted false
});

test('R137: the decomposition is ratio-based, so normalisation cancels', () => {
  // scaling every weight by any constant must not move the published figure
  const before = growthDecompNote('SCN-BASE', null);
  const originals = AGE_STRUCTURE.bands.map((b) => b.costw);
  try {
    AGE_STRUCTURE.bands.forEach((b) => { b.costw = b.costw / 1.1195; }); // "normalise"
    expect(growthDecompNote('SCN-BASE', null)).toBe(before);
  } finally {
    AGE_STRUCTURE.bands.forEach((b, i) => { b.costw = originals[i]; });
  }
});

test('R137: no cost driver is applied in two places', () => {
  // costw must not reach the engine: baselineRealGrowth already carries ageing
  const engine = readFileSync(
    new URL('../../src/lib/model.ts', import.meta.url), 'utf8'
  );
  // model.ts imports AGE_STRUCTURE only to assert its shares sum to 1
  const uses = engine.split('\n').filter((l) => l.includes('costw'));
  expect(uses).toEqual([]);
});
