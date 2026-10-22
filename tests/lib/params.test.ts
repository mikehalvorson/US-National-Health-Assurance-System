import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { AGE_STRUCTURE, BASE2023, CMS_AGE_PER_CAPITA_2020, RAMPS, START_YEAR, costWeight } from '../../src/lib/params';
import { CARE_SCENARIOS, careFromYear } from '../../src/lib/care';
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
   2024-weighted average is ~1". They were not (1.1195). Owner, 2026-10-19:
   the weights are CMS's per-person spending by age over its all-ages figure
   (Age and Sex Tables, Table 7, 2020), restated here from that table, and the
   index is what those weights give on the shares, still not normalised. */
test('R137: the cost weights are CMS\'s age curve, and the index is what it gives', () => {
  const cms2020: Record<string, number> = { '0–18': 4217, '19–44': 6669, '45–64': 12577, '65–84': 20503, '85+': 35995 };
  expect(CMS_AGE_PER_CAPITA_2020.allAges).toBe(10230);
  let idx24 = 0, idx41 = 0;
  for (const b of AGE_STRUCTURE.bands) {
    expect(b.costw, b.id).toBeCloseTo(cms2020[b.id]! / 10230, 12);
    idx24 += b.share2024 * b.costw;
    idx41 += b.share2041 * b.costw;
  }
  expect(Object.keys(cms2020).sort()).toEqual(AGE_STRUCTURE.bands.map((b) => b.id).sort());
  expect(idx24).toBeCloseTo(1.0327, 4);
  expect(idx41).toBeCloseTo(1.1000, 4);
  expect(idx24).not.toBeCloseTo(1.0, 2); // not normalised, and the note does not claim it
});

/* Mutation age-2 (2026-10-20): a band CMS does not state is refused by name
   when params.ts loads, which is why the build row cannot see one. */
test('owner 2026-10-19: a cost weight for a band CMS does not state is refused by name', () => {
  expect(costWeight('85+')).toBeCloseTo(35995 / 10230, 12);
  expect(() => costWeight('85 and over')).toThrow(/CMS states no 2020 per-person spending for age band 85 and over/);
});

test('R137: the decomposition is ratio-based, so normalisation cancels', () => {
  // scaling every weight by any constant must not move the published figure
  const before = growthDecompNote('SCN-BASE', null);
  const originals = AGE_STRUCTURE.bands.map((b) => b.costw);
  try {
    AGE_STRUCTURE.bands.forEach((b) => { b.costw = b.costw / 1.0327; }); // "normalise"
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

/* R81 [§S8] closed it. The two halves this test used to compare are now one
   arithmetic - `careFromYear` reads the ramp - so asserting they agree would
   assert nothing. What is still worth pinning is the ramp itself, and the SIZE
   of the move, against the year the audit measured as a literal. AG1's history
   is the independent side: 2034 is what the file said on 2026-08-18, and if a
   later edit walks the card back toward it this fails. */
const AG1_CARD_YEAR_BEFORE = 2034;

test('R123/R81: AG1 measured three years and R81 moved the card by three', () => {
  const full = RAMPS.costShareElim.findIndex((v) => v >= 1);
  expect(START_YEAR + full).toBe(2037); // the model delivers $0 here
  // At the year the card used to name, a tenth of cost sharing has gone.
  expect(RAMPS.costShareElim[AG1_CARD_YEAR_BEFORE - START_YEAR]).toBeCloseTo(0.10, 9);
  const card = CARE_SCENARIOS.find((s) => s.id === 'er')!;
  expect(careFromYear(card) - AG1_CARD_YEAR_BEFORE).toBe(3);
  // and it moved later, which is the direction the fix is about
  expect(careFromYear(card)).toBeGreaterThan(AG1_CARD_YEAR_BEFORE);
});

test('R81: every card moved later, and none of the ten kept its old year', () => {
  /* The ten typed literals as they stood before §S8, in CARE_SCENARIOS order.
     Recorded here rather than derived, because the point of the row is that
     they were typed and are not any more. */
  const TYPED_BEFORE = [2030, 2034, 2034, 2029, 2034, 2034, 2034, 2034, 2036, 2036];
  const after = CARE_SCENARIOS.map((c) => careFromYear(c));
  expect(after).toHaveLength(TYPED_BEFORE.length);
  after.forEach((y, i) => expect(y).toBeGreaterThan(TYPED_BEFORE[i]));
  expect(after).toEqual([2036, 2037, 2037, 2037, 2037, 2038, 2037, 2038, 2038, 2038]);
});

test('R123: the model reads the ramps 0-based on the same calendar', () => {
  const path = runPath(sampleParams(effectiveParams('SCN-BASE', null), null), {});
  expect(path.years[0]).toBe(START_YEAR);
  expect(path.detail[0].year).toBe(START_YEAR);
  expect(path.years.length).toBe(RAMPS.coverage.length);
});

/* R184 [§S18]: the 2041 household count was typed (141), with a source
   naming a Census projection nothing cites. It is derived from a declared
   assumption now, and moves when the assumption's inputs move. */
test('R184: projected household counts are derived from a declared household-size assumption', async () => {
  const P = await import('../../src/lib/params');
  const base = P.householdDenominator('census');
  const at2041 = P.householdDenominator('census-2041');
  expect(at2041.dataYear).toBe(P.MATURE_YEAR);
  /* the arithmetic the row checked by hand: 132.2 grown at 0.4% for 17 years */
  expect(at2041.households).toBe(141.5);
  const g = P.PARAMS_BY_ID[P.HOUSEHOLD_SIZE_ASSUMPTION.grows].mode / 100;
  expect(at2041.households).toBeCloseTo(base.households * Math.pow(1 + g, P.MATURE_YEAR - base.dataYear), 1);
  /* it reads its inputs: a different growth rate gives a different count */
  const saved = P.PARAMS_BY_ID.popGrowth.mode;
  try {
    P.PARAMS_BY_ID.popGrowth.mode = 0.6;
    expect(P.householdDenominator('census-2041').households).toBeGreaterThan(141.5);
  } finally {
    P.PARAMS_BY_ID.popGrowth.mode = saved;
  }
  /* the source says what it is, and no longer cites a projection */
  expect(at2041.source).toMatch(/^Derived:/);
  expect(at2041.source).not.toMatch(/projection/i);
  expect(P.HOUSEHOLD_SIZE_ASSUMPTION.confidence).toBe('low');
  /* every count other than the one dated today is derived, not typed */
  for (const d of P.HOUSEHOLD_DENOMINATORS) {
    const typed = Object.getOwnPropertyDescriptor(d, 'households')!.get === undefined;
    expect(typed, d.id).toBe(d.dataYear <= base.dataYear);
  }
});

/* Owner, 2026-10-12: the workforceEdu note states the requirement's scope.
   PR-WF-002 asks for 55,000 training slots "in priority specialties and
   advanced clinical roles"; the note called them residency slots. */
test('owner 2026-10-12: workforceEdu describes the 55,000 slots as the requirement does', async () => {
  const { PARAMS_BY_ID } = await import('../../src/lib/params');
  const note = PARAMS_BY_ID.workforceEdu.source || '';
  expect(note).toContain('training slots in priority specialties and advanced clinical roles');
  expect(note).not.toMatch(/55,000 new residency slots/);
  /* and it says what the price assumes */
  expect(note).toContain('every slot is priced at the residency rate');
});
