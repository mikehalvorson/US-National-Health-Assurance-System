import { expect, test } from 'vitest';
import { growthDecompNote } from '../../src/lib/growth-decomp';

test('growthDecompNote reports the aging and total growth figures, em-dash-free', () => {
  const note = growthDecompNote('SCN-BASE', null);
  expect(note).toContain('%/yr real growth assumption');
  expect(note).toMatch(/\d\.\d points/);
  expect(note.includes('—')).toBe(false);
});
