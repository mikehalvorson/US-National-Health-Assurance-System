import { expect, test } from 'vitest';
import { FAMILIES, calcSavings } from '../../src/lib/medications';

test('Medications: 200 unique sequential families (docs self-test 1)', () => {
  const seen: Record<string, boolean> = {};
  const ok = FAMILIES.length === 200 && FAMILIES.every((family, i) => {
    const expected = 'PF-' + String(i + 1).padStart(3, '0');
    if (family[0] !== expected || seen[family[0]]) return false;
    seen[family[0]] = true;
    return true;
  });
  expect(ok).toBe(true);
});

test('Medications: phase counts + savings attribution reconcile (docs self-test 2)', () => {
  const counts: Record<string, number> = { P5: 0, P6: 0, P7: 0, P8: 0 };
  FAMILIES.forEach((family) => { counts[family[3]] += 1; });
  expect(counts.P5).toBe(61);
  expect(counts.P6).toBe(116);
  expect(counts.P7).toBe(11);
  expect(counts.P8).toBe(12);
  expect(Math.abs(calcSavings(5, 25) - 8.97375)).toBeLessThan(0.001);
  expect(Math.abs(calcSavings(15, 40) - 43.074)).toBeLessThan(0.001);
  expect(Math.abs(calcSavings(25, 55) - 98.71125)).toBeLessThan(0.001);
});
