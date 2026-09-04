import { expect, test } from 'vitest';
import { LAYERS } from '../../src/lib/hardening';

test('LAYERS: 7 defense layers, first is rights-above-operator', () => {
  expect(LAYERS).toHaveLength(7);
  expect(LAYERS[0].title).toBe('Put rights above the operator');
  expect(LAYERS[0].controls).toBe('EH-01');
  expect(LAYERS.every((l) => l.summary && l.attack && l.continuity && l.check && l.proof)).toBe(true);
});

/* P19 [S13]: this module's 16-key acronym map is gone. The keys it held are
   asserted against the one surviving glossary in tests/lib/acronym-layer.test.ts,
   which also refuses a new per-tab map anywhere in src/. */
