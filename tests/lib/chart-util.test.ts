import { expect, test } from 'vitest';
import { niceTicks, barPath } from '../../src/lib/chart-util';

test('niceTicks(0,100,5) yields evenly spaced nice values', () => {
  expect(niceTicks(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100]);
});

test('niceTicks handles a zero span without dividing by zero', () => {
  expect(niceTicks(5, 5, 5)).toEqual([5]);
});

test('barPath square base (r<=0.5) is a plain rectangle path', () => {
  expect(barPath(0, 0, 10, 10, 0, 'up')).toBe('M0,0 h10 v10 h-10Z');
});

test('barPath up with radius produces rounded top corners', () => {
  const d = barPath(0, 0, 10, 20, 3, 'up');
  expect(d.startsWith('M0,20')).toBe(true);
  expect(d).toContain('Q'); // has curve segments
});
