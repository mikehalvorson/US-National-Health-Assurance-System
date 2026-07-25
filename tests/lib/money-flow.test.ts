import { expect, test } from 'vitest';
import { todayFlowSpec, nhaFlowSpec, nhaFlowTitle } from '../../src/lib/money-flow';
import { runOverviewMc } from '../../src/lib/overview';
import { DEFLATOR_2023_TO_2024 as DEF } from '../../src/lib/params';

test('todayFlowSpec has the 5 CMS sources and 5 channels', () => {
  const s = todayFlowSpec();
  expect(s.sources.map((n) => n.id)).toEqual(['hh', 'emp', 'fed', 'state', 'oth']);
  expect(s.channels).toHaveLength(5);
  expect(s.ribbons.length).toBeGreaterThan(0);
});

test('nhaFlowSpec has 5 sources, 2 public/residual channels, 6 ribbons, all finite', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const spec = nhaFlowSpec(mc, DEF);
  expect(spec.sources.map((n) => n.id)).toEqual(['hh', 'emp', 'wealth', 'fed', 'state']);
  expect(spec.channels.map((n) => n.id)).toEqual(['pub', 'res']);
  expect(spec.ribbons).toHaveLength(6);
  for (const n of [...spec.sources, ...spec.channels]) expect(Number.isFinite(n.value)).toBe(true);
  for (const r of spec.ribbons) expect(Number.isFinite(r.value)).toBe(true);
});

test('nhaFlowTitle reports the mature-scale total as money', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  expect(nhaFlowTitle(mc, DEF)).toMatch(/^Under NHA: mature system at 2024 scale \(\$[\d.]+T\)$/);
});
