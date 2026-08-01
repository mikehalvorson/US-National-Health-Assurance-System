import { expect, test } from 'vitest';
import {
  SCENARIOS, LEGACY, CREATED,
  ROLLOUT_YEARS, ANNUAL_TRAINING_TARGET,
  DIRECT_PATIENT_CARE_PHYSICIANS, PRIOR_AUTH_HOURS_PER_WEEK,
  type ScenarioId
} from '../../src/lib/workforce';

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
