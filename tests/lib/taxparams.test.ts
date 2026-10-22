import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INSTRUMENTS, GROUPS, ECON } from '../../src/lib/taxparams';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

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

/* R47 [§S18]: the effective-rate chart's current-law point is CBO's rate
   for its table year, held, while incomes grow to the selected year. The
   page says so, with the year read from the table's declaration, and the
   note's claim that the package's addition does not depend on that
   baseline is checked here rather than asserted. */
test('R47: the effective-rate chart says its current-law rates are held at the CBO year', async () => {
  const { currentLawRateNote } = await import('../../src/lib/taxparams');
  const { DATASET_VINTAGES } = await import('../../src/lib/taxparams');
  const note = currentLawRateNote();
  /* review 3 of P24: the rates' own vintage, not the household count's */
  expect(note).toContain('average federal tax rate in ' + DATASET_VINTAGES.find((v) => v.id === 'GROUPS')!.dataYear + ', from CBO, held');
  expect(note).toMatch(/both points sit too low/);
  /* the page renders it beside the chart */
  const page = readFileSync(join(REPO_ROOT, 'src/pages/tax.astro'), 'utf8');
  const at = page.indexOf('{currentLawRateNote()}');
  expect(at).toBeGreaterThan(0);
  expect(page.indexOf('id="tax-rate-chart"')).toBeGreaterThan(at);
  expect(page.slice(at, page.indexOf('id="tax-rate-chart"'))).not.toContain('<section');
});

test('R47: the package\'s addition to each group\'s rate does not read the current-law rate', async () => {
  const { distribution, defaultSettings } = await import('../../src/lib/taxmodel');
  const s = defaultSettings();
  const before = distribution(s, 2041, 0).map((r) => r.newRate - r.curRate);
  const saved = GROUPS.map((g) => g.curRate);
  try {
    GROUPS.forEach((g) => { g.curRate += 0.05; });
    const after = distribution(s, 2041, 0).map((r) => r.newRate - r.curRate);
    after.forEach((d, i) => expect(d).toBeCloseTo(before[i], 12));
    /* and the levels did move, so the comparison saw the change */
    expect(distribution(s, 2041, 0)[0].curRate).toBeCloseTo(saved[0] + 0.05, 12);
  } finally {
    GROUPS.forEach((g, i) => { g.curRate = saved[i]; });
  }
});
