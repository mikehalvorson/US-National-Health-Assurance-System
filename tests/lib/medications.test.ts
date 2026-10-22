import { expect, test } from 'vitest';
import {
  ALL_DRUG_SPEND_2024, calcSavings, DRUG_BASE, FAMILIES, familyTagShapeFaults
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
  /* on the $700.7B base (owner, 2026-10-19; $717.9B before BASE2023 read
     CMS's latest release) */
  expect(Math.abs(calcSavings(5, 25) - 8.75875)).toBeLessThan(0.001);
  expect(Math.abs(calcSavings(15, 40) - 42.042)).toBeLessThan(0.001);
  expect(Math.abs(calcSavings(25, 55) - 96.34625)).toBeLessThan(0.001);
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

/* R53 [§S16]: "every family tag is drawn from the declared vocabulary and every
   family has >=1". R176 (§S7) made the six reasons a union, which holds the
   first half at compile time; the type now requires at least one, and this
   holds records that reach the list some other way and refuses a repeat. */
test('R53: every family carries one or more distinct reasons', () => {
  expect(familyTagShapeFaults()).toEqual([]);
  expect(FAMILIES.every((f) => f.tags.length >= 1)).toBe(true);
});

test('R53: an untagged family and a repeated reason are both reported', () => {
  const base = FAMILIES[0]!;
  const records = [
    { ...base, id: 'PF-X1', tags: [] as unknown as typeof base.tags },
    { ...base, id: 'PF-X2', tags: ['critical', 'critical'] as typeof base.tags },
    { ...base, id: 'PF-X3', tags: ['critical', 'preparedness'] as typeof base.tags }
  ];
  expect(familyTagShapeFaults(records)).toEqual(['PF-X1 carries no reason', 'PF-X2 repeats a reason']);
});

/* P25: the families are the plan's own register (Table T-2), and the check
   that holds them to it reports each kind of drift and what it read. */
test('P25: every family is its register entry, and each kind of drift is caught', async () => {
  const { pfRegister, pfRegisterDrift } = await import('../../src/lib/source-package');
  const register = pfRegister();
  expect(register).toHaveLength(FAMILIES.length);
  expect(pfRegisterDrift(FAMILIES)).toEqual({ checked: FAMILIES.length, faults: [] });
  const one = FAMILIES[0]!;
  const rest = FAMILIES.slice(1);
  const renamed = [{ ...one, name: one.name + ' sodium' }, ...rest];
  expect(pfRegisterDrift(renamed).faults).toEqual([one.id + ' is "' + one.name + ' sodium"; the register says "' + one.name + '"']);
  const reformed = [{ ...one, form: 'oral solid' }, ...rest];
  expect(pfRegisterDrift(reformed).faults[0]).toContain(one.id + '\'s forms are "oral solid"');
  const later = [{ ...one, phase: one.phase === 'P8' ? 'P7' : 'P8' }, ...rest];
  expect(pfRegisterDrift(later).faults[0]).toContain(one.id + ' qualifies by');
  expect(pfRegisterDrift(rest).faults).toEqual([one.id + ' is in the register and not in the module']);
  expect(pfRegisterDrift([]).checked).toBe(0);
});
