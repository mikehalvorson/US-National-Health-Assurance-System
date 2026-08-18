import { expect, test } from 'vitest';
import { benchmarkChartRows, benchmarkText } from '../../src/lib/benchmarks';
import { runOverviewMc } from '../../src/lib/overview';
import { DEFLATOR_2023_TO_2024 as DEF, FRAMEWORK_CLAIM } from '../../src/lib/params';

test('benchmarkChartRows: model row, observed row, framework claim, finite', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const rows = benchmarkChartRows(mc, DEF);
  expect(rows).toHaveLength(3);
  expect(rows[1].mid).toBe(5300);
  for (const r of rows) {
    expect(Number.isFinite(r.lo)).toBe(true);
    expect(Number.isFinite(r.hi)).toBe(true);
    expect(r.lo).toBeLessThanOrEqual(r.hi);
    /* R26 [§S6a]: two lines on one axis that answer different accounting
       questions are not a comparison. Every line says which question it
       answers. */
    expect(r.basis.length).toBeGreaterThan(20);
  }
  /* the framework's own figure is read from the constant, never typed */
  expect(rows[2].lo).toBe(FRAMEWORK_CLAIM.low);
  expect(rows[2].mid).toBe(FRAMEWORK_CLAIM.mode);
  expect(rows[2].hi).toBe(FRAMEWORK_CLAIM.high);
  expect(rows[2].basis).toBe(FRAMEWORK_CLAIM.basis);
});

test('the framework claim readout derives its comparison', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const t = benchmarkText(mc, DEF).frameworkClaimResult;
  const mid = mc.steady.matureToday.p50 * DEF;
  const pct = Math.abs(100 * (mid / FRAMEWORK_CLAIM.mode - 1)).toFixed(1);
  expect(t).toContain(pct + '%');
  expect(t).toContain(mid > FRAMEWORK_CLAIM.mode ? 'above' : 'below');
  /* the claim is below the 10th percentile of the base case, so the readout
     has to say outside rather than inside */
  expect(t).toContain('outside');
  expect(t).toContain('never a target');
  expect(t.includes('—')).toBe(false);
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
