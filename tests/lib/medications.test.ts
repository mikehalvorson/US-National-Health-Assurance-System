import { expect, test } from 'vitest';
import {
  ALL_DRUG_SPEND_2024, calcSavings, DRUG_BASE, FAMILIES
} from '../../src/lib/medications';
import {
  medicationsSliderRange, statedStressBoundary
} from '../../src/lib/manifest-check';
import { PARAMS_BY_ID } from '../../src/lib/params';

test('Medications: 200 unique sequential families (docs self-test 1)', () => {
  const seen: Record<string, boolean> = {};
  const ok = FAMILIES.length === 200 && FAMILIES.every((family, i) => {
    const expected = 'PF-' + String(i + 1).padStart(3, '0');
    if (family.id !== expected || seen[family.id]) return false;
    seen[family.id] = true;
    return true;
  });
  expect(ok).toBe(true);
});

/* R52 [§S7]: the second test used to assert calcSavings(5, 25) === 8.97375,
 * which verifies that multiplication works. Against a hardcoded base it cannot
 * fail unless the formula is edited, and if the formula is edited it fails for
 * a reason the test does not name. It is renamed to what it is, a snapshot
 * guard on a protected calculation, and the reconciliations that can fail for
 * a real reason are the four tests below it. */
test('Medications: savings snapshot at the three documented points', () => {
  expect(Math.abs(calcSavings(5, 25) - 8.97375)).toBeLessThan(0.001);
  expect(Math.abs(calcSavings(15, 40) - 43.074)).toBeLessThan(0.001);
  expect(Math.abs(calcSavings(25, 55) - 98.71125)).toBeLessThan(0.001);
});

/* Fails if a family's dosage-form class moves, if a family is added or
 * removed, or if the derivation stops running. §BJ hand-counted the
 * methodology and recorded the same four numbers. */
test('Medications: the derived phase counts equal the published increments', () => {
  const counts: Record<string, number> = { P5: 0, P6: 0, P7: 0, P8: 0 };
  FAMILIES.forEach((family) => { counts[family.phase] += 1; });
  expect(counts.P5).toBe(61);
  expect(counts.P6).toBe(116);
  expect(counts.P7).toBe(11);
  expect(counts.P8).toBe(12);
  expect(counts.P5 + counts.P6 + counts.P7 + counts.P8).toBe(200);
});

/* R52's own suggestion: the base has to land inside the sourced range, not
 * merely be the number it has always been. Fails if the CMS retail line, the
 * embedded-drug estimate or the deflator moves the base out of RB-03-RX-002's
 * $680-730B, which is the reason the range is quoted on the page at all. */
test('Medications: the drug base falls inside the sourced all-drug range', () => {
  expect(DRUG_BASE.total).toBeGreaterThan(680);
  expect(DRUG_BASE.total).toBeLessThan(730);
  expect(Math.abs(DRUG_BASE.total - ALL_DRUG_SPEND_2024)).toBeLessThan(0.05);
  /* And the sampled base stays inside it at both ends of the distribution the
     engine actually draws from, which the modal figure alone cannot show. */
  expect(DRUG_BASE.low).toBeLessThan(DRUG_BASE.total);
  expect(DRUG_BASE.high).toBeGreaterThan(DRUG_BASE.total);
});

/* The page's caption claims this slider shares its range with the fiscal
 * model's national drug-price parameter. §BJ6 verified the claim by hand.
 * Fails if either side is re-ranged without the other, which is the divergence
 * R50 was filed for. */
test('Medications: the reduction slider shares drugPriceCut\'s declared range', () => {
  const reduction = medicationsSliderRange('medications-reduction');
  expect(reduction).not.toBeNull();
  const cut = PARAMS_BY_ID.drugPriceCut;
  expect(reduction!.min).toBe(cut.low);
  expect(reduction!.max).toBe(cut.high);
  expect(reduction!.value).toBe(cut.mode);
});

/* V9's stress boundary, checked against the controls that produce it instead
 * of against two numbers retyped here. Fails if either slider is re-ranged, if
 * the base moves, or if the sentence is edited away from what the calculator
 * does. The disclosure itself is protected, so this reads it. */
test('Medications: the stated stress boundary is the product of the slider extremes', () => {
  const share = medicationsSliderRange('medications-share');
  const reduction = medicationsSliderRange('medications-reduction');
  const stated = statedStressBoundary();
  expect(share).not.toBeNull();
  expect(reduction).not.toBeNull();
  expect(stated).not.toBeNull();
  const low = calcSavings(share!.min, reduction!.min);
  const high = calcSavings(share!.max, reduction!.max);
  expect(Math.round(low)).toBe(stated![0]);
  expect(Math.round(high)).toBe(stated![1]);
});
