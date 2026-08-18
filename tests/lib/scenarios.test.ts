import { expect, test } from 'vitest';
import {
  effectiveParams, naturalCeiling, SCENARIOS_BY_ID
} from '../../src/lib/scenarios';
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

/* R63 [§S5] - the `mult` clamp, exercised against a CONSTRUCTED breach.
 *
 * The self-test in model.ts sweeps every shipped scenario and asserts no
 * effective value leaves its natural domain. That check passes today with or
 * without the clamp, because no shipped scenario breaches - which makes it a
 * forward guard, not a test of the clamp. These build the breach the row
 * names and check the clamp actually catches it.
 *
 * The row's own example: `wealthCollectionEff` runs 70/84/92% and "needs only
 * mult: 1.1". At 1.3 its high would reach 119.6% of a quantity that cannot
 * exceed 100. */
test('R63: a multiplier cannot push a bounded share past its natural ceiling', () => {
  const id = 'SCN-R63-PROBE';
  SCENARIOS_BY_ID[id] = {
    id, name: 'R63 probe', desc: 'constructed breach',
    overrides: {
      wealthCollectionEff: { mult: 1.3 },
      employerCapture: { mult: 1.4 },
      lowValueCapture: { mult: 3.0 },
      publicAdminRate: { mult: 2.0 }
    }
  } as (typeof SCENARIOS_BY_ID)[string];
  try {
    const eff = effectiveParams(id, null);
    /* the breach the clamp catches */
    expect(92 * 1.3).toBeGreaterThan(100);
    expect(eff.wealthCollectionEff.high).toBe(100);
    expect(eff.employerCapture.high).toBe(100);
    expect(eff.lowValueCapture.high).toBe(100);
    /* and a share well under its ceiling is left alone: publicAdminRate's
       high is 3.2% of public spend, so x2 is 6.4 and nothing is clamped */
    /* R27 [§S6a] widened publicAdminRate's high from 3.2 to 6.0, so the
       probe's mult of 2 now reaches 12 rather than 6.4. Still under the 100%
       ceiling, so still the case this assertion is here to show: a percentage
       parameter that is nowhere near its domain limit is not clamped. */
    expect(eff.publicAdminRate.high).toBeCloseTo(12, 10);
    /* nothing in the model is meaningfully negative either */
    expect(Math.min(eff.wealthCollectionEff.low, eff.employerCapture.low)).toBeGreaterThan(0);
  } finally {
    delete SCENARIOS_BY_ID[id];
  }
});

test('R63: the natural ceiling comes from the declared unit, not a list', () => {
  const byUnit = (unit: string) => naturalCeiling({ unit });
  expect(byUnit('%')).toBe(100);
  expect(byUnit('% of public spend')).toBe(100);
  expect(byUnit('share of visits')).toBe(100);
  /* a rate of change is not bounded at 100, and neither is a dollar amount */
  expect(byUnit('%/yr')).toBeNull();
  expect(byUnit('$B total')).toBeNull();
  expect(byUnit('$B/yr')).toBeNull();
  /* every percentage parameter the model declares is covered by that rule */
  const bounded = PARAM_DEFS.filter((d) => naturalCeiling(d) === 100);
  expect(bounded.length).toBeGreaterThan(5);
  bounded.forEach((d) => {
    expect(d.high, d.id + ' declares a high above its own ceiling').toBeLessThanOrEqual(100);
  });
});
