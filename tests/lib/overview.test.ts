import { expect, test } from 'vitest';
import { computeOverview } from '../../src/lib/overview';

test('SCN-BASE default matches the known headline figures', () => {
  const v = computeOverview('SCN-BASE', null);
  expect(v.heroValue).toBe('$5.34T/yr');
  expect(v.nha2041).toBe('$9.39T/yr');
  expect(v.base2041).toBe('$9.11T/yr');
  expect(v.tiles).toHaveLength(4);
  expect(v.tiles[0].value).toBe('23.5%');       // GDP share
  expect(v.tiles[3].value).toBe('$3.38T/yr');   // new revenue
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
