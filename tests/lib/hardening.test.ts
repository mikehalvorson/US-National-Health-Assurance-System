import { expect, test } from 'vitest';
import { LAYERS, ACRONYMS } from '../../src/lib/hardening';

test('LAYERS: 7 defense layers, first is rights-above-operator', () => {
  expect(LAYERS).toHaveLength(7);
  expect(LAYERS[0].title).toBe('Put rights above the operator');
  expect(LAYERS[0].controls).toBe('EH-01');
  expect(LAYERS.every((l) => l.summary && l.attack && l.continuity && l.check && l.proof)).toBe(true);
});

test('ACRONYMS: dictionary maps abbreviations to expansions', () => {
  expect(ACRONYMS.DNHA).toContain('Department of National Health Assurance');
  expect(Object.keys(ACRONYMS).length).toBeGreaterThan(10);
});
