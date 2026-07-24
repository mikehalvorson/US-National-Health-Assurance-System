import { expect, test } from 'vitest';
import { INSTRUMENTS, GROUPS, ECON } from '../../src/lib/taxparams';

test("every instrument's incidence shares sum to 1", () => {
  for (const ins of INSTRUMENTS) {
    let s = 0;
    for (const g of GROUPS) s += ins.incidence[g.id] || 0;
    expect(Math.abs(s - 1)).toBeLessThan(0.005);
  }
});

test('group shares (wage/cap/consumption/relief) each sum to 1', () => {
  const cols = ['wageShare', 'capShare', 'consumpShare', 'healthRelief'] as const;
  for (const c of cols) {
    let s = 0;
    for (const g of GROUPS) s += (g as unknown as Record<string, number>)[c];
    expect(Math.abs(s - 1)).toBeLessThan(0.01);
  }
});

test('every instrument has a valid growth class', () => {
  for (const ins of INSTRUMENTS) {
    expect(ECON.growthRates[ins.growth || 'gdp']).not.toBeUndefined();
    expect(ECON.growthRates[ins.growth || 'gdp']).not.toBeNull();
  }
});
