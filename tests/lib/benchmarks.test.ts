import { expect, test } from 'vitest';
import { benchmarkChartRows, benchmarkText } from '../../src/lib/benchmarks';
import { runOverviewMc } from '../../src/lib/overview';
import { DEFLATOR_2023_TO_2024 as DEF } from '../../src/lib/params';

test('benchmarkChartRows: model row + observed row, finite', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const rows = benchmarkChartRows(mc, DEF);
  expect(rows).toHaveLength(2);
  expect(rows[1].mid).toBe(5300);
  for (const r of rows) {
    expect(Number.isFinite(r.lo)).toBe(true);
    expect(Number.isFinite(r.hi)).toBe(true);
    expect(r.lo).toBeLessThanOrEqual(r.hi);
  }
});

test('benchmarkText: all six fields present, verdict non-trivial, em-dash-free', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const t = benchmarkText(mc, DEF);
  for (const v of [t.nheResult, t.fedModel, t.fedModelRange, t.fedResult, t.delta2030Result, t.verdict]) {
    expect(v.length).toBeGreaterThan(0);
    expect(v.includes('—')).toBe(false);
  }
  expect(t.fedModel).toMatch(/\/yr$/);
  expect(t.verdict).toContain('plausibility');
});
