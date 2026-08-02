import { expect, test } from 'vitest';
import {
  SCENARIOS, LEGACY, CREATED,
  ROLLOUT_YEARS, ANNUAL_TRAINING_TARGET,
  DIRECT_PATIENT_CARE_PHYSICIANS, PRIOR_AUTH_HOURS_PER_WEEK,
  LTC_WORKFORCE, ltcWageFloorCost,
  type ScenarioId
} from '../../src/lib/workforce';
import { PARAMS_BY_ID } from '../../src/lib/params';

function sumField(items: { [k: string]: Record<ScenarioId, number> }[] | any[], field: string, s: ScenarioId): number {
  return items.reduce((total, item) => total + item[field][s], 0);
}

test('Workforce: scenario job ledgers reconcile (docs self-test 1)', () => {
  const ok = (Object.keys(SCENARIOS) as ScenarioId[]).every((s) => {
    const scenario = SCENARIOS[s];
    return sumField(LEGACY, 'values', s) === scenario.eliminated &&
      sumField(CREATED, 'values', s) === scenario.created &&
      sumField(CREATED, 'fills', s) === scenario.inside &&
      scenario.supported === scenario.eliminated * 0.75;
  });
  expect(ok).toBe(true);
});

test('Workforce: entrant pace and prior-auth capacity math reconcile (docs self-test 2)', () => {
  const entrants = SCENARIOS.plan.created - SCENARIOS.plan.inside;
  const annualEntrants = entrants * 1000 / ROLLOUT_YEARS;
  const releasedFte = DIRECT_PATIENT_CARE_PHYSICIANS * PRIOR_AUTH_HOURS_PER_WEEK / 40;
  expect(entrants).toBe(150);
  expect(annualEntrants).toBe(12500);
  expect(Math.round(releasedFte)).toBe(281600);
  expect(Math.abs(ANNUAL_TRAINING_TARGET / annualEntrants - 4.4)).toBeLessThan(0.001);
});

test('Workforce: LTC aide compensation is derived and equals the model param', () => {
  // the workforce-tab derivation must equal params.ltcWageFloor.mode so the
  // tab and the healthcare-tab cost model can never drift
  const c = ltcWageFloorCost();
  expect(c.derived2023B).toBe(PARAMS_BY_ID['ltcWageFloor'].mode);
  // derivation is transparent: covered FTE x hours x hourly lift
  const w = LTC_WORKFORCE;
  const check = Math.round((w.coveredFteM * 1e6 * w.hoursPerFteYear * w.loadedUpliftPerHour) / 1e9);
  expect(c.derived2023B).toBe(check);
  // adding aide pay must raise the displayed (2024-scale) figure above zero
  expect(c.mode2024B).toBeGreaterThan(0);
  expect(w.openings2034M).toBeGreaterThan(w.currentDirectCareM);
});
