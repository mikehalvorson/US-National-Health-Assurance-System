import { expect, test } from 'vitest';
import { FIXES, PLANES, STORE_ROWS, CARE_ACTORS, PUBLIC_ACTORS, CYBER_CONTROLS } from '../../src/lib/data-view';
import { DATA_PHASES } from '../../src/lib/data-phases';

test('data-view: shapes match the docs catalog counts', () => {
  expect(FIXES).toHaveLength(6);
  expect(PLANES).toHaveLength(6);
  expect(STORE_ROWS).toHaveLength(7);
  expect(STORE_ROWS.every((r) => r.length === 3)).toBe(true);
  expect(CARE_ACTORS).toHaveLength(8);
  expect(PUBLIC_ACTORS).toHaveLength(8);
  expect(CYBER_CONTROLS).toHaveLength(10);
});

test('data-phases: P0..P8 with grouped metrics', () => {
  expect(DATA_PHASES.length).toBe(9);
  expect(DATA_PHASES[0].id).toBe('P0');
  expect(DATA_PHASES[8].id).toBe('P8');
  expect(DATA_PHASES.every((p) => p.groups.length > 0 && p.work.length > 0)).toBe(true);
});
