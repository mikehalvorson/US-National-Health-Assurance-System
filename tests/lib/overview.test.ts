import { expect, test } from 'vitest';
import { computeOverview, computeOverviewFromMc, runOverviewMc } from '../../src/lib/overview';

test('computeOverview equals computeOverviewFromMc(runOverviewMc(...)) for SCN-BASE', () => {
  const viaHelpers = computeOverviewFromMc(runOverviewMc('SCN-BASE', null));
  const direct = computeOverview('SCN-BASE', null);
  expect(viaHelpers).toEqual(direct);
});

test('SCN-BASE default matches the known headline figures', () => {
  const v = computeOverview('SCN-BASE', null);
  expect(v.heroValue).toBe('$5.38T/yr');         // includes LTC aide wage floor
  expect(v.nha2041).toBe('$9.39T/yr');
  expect(v.base2041).toBe('$9.11T/yr');
  expect(v.tiles).toHaveLength(4);
  expect(v.tiles[0].value).toBe('23.6%');       // GDP share
  expect(v.tiles[3].value).toBe('$3.42T/yr');   // new revenue
});

test('family note is non-empty prose without an em dash', () => {
  const v = computeOverview('SCN-BASE', null);
  expect(v.familyNote.length).toBeGreaterThan(100);
  expect(v.familyNote.includes('—')).toBe(false); // U+2014
});

test('a stress scenario changes the hero value', () => {
  const base = computeOverview('SCN-BASE', null);
  const opt = computeOverview('SCN-OPT', null);
  expect(opt.heroValue).not.toBe(base.heroValue);
});
