import { describe, expect, test } from 'vitest';
import {
  SCENARIOS,
  ROLLOUT_YEARS, ANNUAL_TRAINING_TARGET,
  DIRECT_PATIENT_CARE_PHYSICIANS, PRIOR_AUTH_HOURS_PER_WEEK,
  LTC_WORKFORCE, ltcWageFloorCost, workforceSelfTests
} from '../../src/lib/workforce';
import { PARAMS_BY_ID } from '../../src/lib/params';

/* R65 [§S9a]: docs self-test 1 was four relations AND-ed across three
   scenarios inside one `.every()`, asserted as `expect(ok).toBe(true)`. A
   break read `expected false to be true` and named neither the relation nor
   the scenario. §S9a has to distinguish a deliberate re-derivation from a
   regression and cannot do it against one boolean, so they are named tests,
   generated from the same table the build gate reads.

   Twenty-three, not twelve:
     15  five relations x three scenarios. R65 adds the fifth,
         `sum(LEGACY.inside) = inside`, the second independently authored
         decomposition of the same total, which reconciled before anything
         asserted it.
      7  one per CREATED item: R66 and R178's monotone-or-declared check.
      1  R179's unit-model derivation, a planning-case relation only. */
describe('Workforce: the cross-decomposition invariants (V19)', () => {
  for (const row of workforceSelfTests()) {
    /* asserting the NOTE, not the flag: a failure then prints both sides */
    test(row.name, () => expect(row.ok ? 'holds' : row.note).toBe('holds'));
  }

  /* and the table itself, so quietly deleting a relation is not a green run */
  test('the table still holds twenty-three invariants', () => {
    expect(workforceSelfTests().length).toBe(23);
  });
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
