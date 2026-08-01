import { expect, test } from 'vitest';
import { financingSpec, financingNote } from '../../src/lib/financing';
import { runOverviewMc } from '../../src/lib/overview';
import { DEFLATOR_2023_TO_2024 as DEF } from '../../src/lib/params';

test('financingSpec has 5 segments summing to the public cost, all finite', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const fin = financingSpec(mc, DEF);
  expect(fin.segments.map((s) => s.label)).toEqual([
    'Redirected federal spending',
    'State maintenance-of-effort',
    'Employer contribution',
    'Tax on wage pass-through',
    'New revenue needed',
  ]);
  for (const s of fin.segments) expect(Number.isFinite(s.value)).toBe(true);
  expect(Number.isFinite(fin.gap.value)).toBe(true);
  expect(Number.isFinite(fin.wealth.value)).toBe(true);
  const t = mc.years.length - 2;
  const need = mc.modePath.detail[t].pubCost;
  const sum = fin.segments.reduce((a, s) => a + s.value, 0);
  expect(Math.abs(sum - need)).toBeLessThan(1e-6);
});

test('financingNote mentions the 5% household cap and is em-dash-free', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const note = financingNote(mc, DEF);
  expect(note).toContain('5% of new financing');
  expect(note.includes('—')).toBe(false);
});
