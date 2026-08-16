import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { AGE_STRUCTURE, BASE2023, RAMPS, START_YEAR } from '../../src/lib/params';
import { CARE_SCENARIOS } from '../../src/lib/care';
import { runPath, sampleParams } from '../../src/lib/model';
import { effectiveParams } from '../../src/lib/scenarios';
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

/* R123 [§S2] — U1 is closed: ramp index 0 is Year 1 is 2027, confirmed four
   independent ways in model.ts. The row asks for no fix, only that nothing is
   left hedging on it and that AG1 is treated as confirmed rather than
   provisional. These assert the convention at its own index, and pin the gap
   AG1 measures so it cannot quietly change size. Closing that gap is R81's
   job in §S8, not this row's: the cards are what move, not the ramp. */

test('R123: costShareElim index 0 is the enactment year, 2027', () => {
  expect(START_YEAR).toBe(2027);
  expect(START_YEAR + 0).toBe(2027);
  // The convention read from the other end: the ramp's own first relief.
  const firstRelief = RAMPS.costShareElim.findIndex((v) => v > 0);
  expect(START_YEAR + firstRelief).toBe(2033);
});

test('R123: AG1 stands at three years, measured rather than asserted', () => {
  const full = RAMPS.costShareElim.findIndex((v) => v >= 1);
  expect(START_YEAR + full).toBe(2037); // the model delivers $0 here
  const card = CARE_SCENARIOS.find((s) => s.id === 'er')!;
  expect(card.nha.fromYear).toBe(2034); // the card promises it here
  expect(START_YEAR + full - card.nha.fromYear).toBe(3);
  // At the year the card names, a tenth of cost sharing has gone.
  expect(RAMPS.costShareElim[2034 - START_YEAR]).toBeCloseTo(0.10, 9);
});

test('R123: the model reads the ramps 0-based on the same calendar', () => {
  const path = runPath(sampleParams(effectiveParams('SCN-BASE', null), null), {});
  expect(path.years[0]).toBe(START_YEAR);
  expect(path.detail[0].year).toBe(START_YEAR);
  expect(path.years.length).toBe(RAMPS.coverage.length);
});
