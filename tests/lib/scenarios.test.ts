import { expect, test } from 'vitest';
import { effectiveParams, SCENARIOS_BY_ID } from '../../src/lib/scenarios';
import { PARAM_DEFS } from '../../src/lib/params';

test('SCN-BASE effective params return an entry per ParamDef with low<=mode<=high', () => {
  const eff = effectiveParams('SCN-BASE', null);
  expect(Object.keys(eff).length).toBe(PARAM_DEFS.length);
  for (const p of PARAM_DEFS) {
    const e = eff[p.id];
    expect(e).toBeDefined();
    expect(e.low).toBeLessThanOrEqual(e.mode);
    expect(e.mode).toBeLessThanOrEqual(e.high);
  }
});

test('unknown scenario id falls back to SCN-BASE', () => {
  expect(SCENARIOS_BY_ID['SCN-BASE']).toBeDefined();
  const unknown = effectiveParams('SCN-DOES-NOT-EXIST', null);
  const base = effectiveParams('SCN-BASE', null);
  expect(unknown).toEqual(base);
});

test('a slider mode overrides the mode for that parameter', () => {
  const targetId = PARAM_DEFS[0].id;
  const eff = effectiveParams('SCN-BASE', { [targetId]: 3 });
  expect(eff[targetId].mode).toBe(3);
});
