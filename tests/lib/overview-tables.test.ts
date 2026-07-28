import { expect, test } from 'vitest';
import { pathTableData, bridgeTableData, financingTableData } from '../../src/lib/overview-tables';
import { bridgeSteps } from '../../src/lib/bridge';
import { runOverviewMc } from '../../src/lib/overview';
import { DEFLATOR_2023_TO_2024 as DEF } from '../../src/lib/params';

test('pathTableData: 5 columns, one row per model year', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const d = pathTableData(mc, DEF);
  expect(d.head).toHaveLength(5);
  expect(d.rows).toHaveLength(mc.years.length);
  expect(d.rows[0]).toHaveLength(5);
  expect(d.rows[0][0]).toBe(String(mc.years[0]));
});

test('bridgeTableData: one row per bridge step, totals unsigned', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const d = bridgeTableData(mc, DEF);
  expect(d.rows).toHaveLength(bridgeSteps(mc).steps.length);
  expect(d.rows[0][1].startsWith('+')).toBe(false);
  expect(d.rows[0][1].startsWith('−')).toBe(false);
});

test('financingTableData: 7 rows, amounts formatted', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const d = financingTableData(mc, DEF);
  expect(d.rows).toHaveLength(7);
  expect(d.rows[0][0]).toBe('Total public cost');
  expect(d.rows[0][1]).toMatch(/^\$/);
});

import { sponsorTableData } from '../../src/lib/overview-tables';

test('sponsorTableData: one row per MONEYFLOW source, 4 columns', () => {
  const d = sponsorTableData();
  expect(d.head).toEqual(['Who pays', '2023 amount', 'Share', 'What it consists of']);
  expect(d.rows).toHaveLength(5);
  expect(d.rows[0]).toHaveLength(4);
  expect(d.rows[0][2]).toMatch(/%$/);
  expect(d.rows[0][3].length).toBeGreaterThan(0);
});
