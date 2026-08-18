import { expect, test } from 'vitest';
import { computeOverview, computeOverviewFromMc, runOverviewMc } from '../../src/lib/overview';

test('computeOverview equals computeOverviewFromMc(runOverviewMc(...)) for SCN-BASE', () => {
  const viaHelpers = computeOverviewFromMc(runOverviewMc('SCN-BASE', null));
  const direct = computeOverview('SCN-BASE', null);
  expect(viaHelpers).toEqual(direct);
});

/* R32 [§S6a] moved every figure here, and not by as much as it looks: the
   low-value pool became a sampled parameter, and giving each parameter its own
   random stream re-drew the whole ensemble. Pinned to a constant so the
   arithmetic was unchanged, the hero still moved, which is how the reshuffle
   was told apart from the economics. Measured across seven seeds at 600 draws,
   the ensemble reproduces its own hero figure only to about 0.7% and the
   new-revenue requirement to about 2.4%, so these pins are three-significant-
   figure statements about a two-significant-figure estimate. They are kept
   exact anyway: their job is to fail when output moves, and the section that
   moves it says why. */
test('SCN-BASE default matches the known headline figures', () => {
  const v = computeOverview('SCN-BASE', null);
  expect(v.heroValue).toBe('$5.45T/yr');         // includes LTC aide wage floor
  expect(v.nha2041).toBe('$9.42T/yr');
  expect(v.base2041).toBe('$9.11T/yr');          // baseline is not sampled
  expect(v.tiles).toHaveLength(4);
  expect(v.tiles[0].value).toBe('23.7%');       // GDP share
  expect(v.tiles[3].value).toBe('$3.48T/yr');   // new revenue
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
