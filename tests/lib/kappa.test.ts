/* R227 [§S3]: KAPPA is registered, sourced, graded and banded.
 *
 * The row's finding is exposure rather than error, so most of these assert
 * that the exposure is visible - that the constant traces to a real gate
 * floor, that the document says so, and that the band the document publishes
 * is the band the model produces. */
import { describe, expect, test } from 'vitest';
import {
  KAPPA_BAND, KAPPA_CONFIDENCE, KAPPA_MATURE_PCT, KAPPA_SOURCE_FLOOR_PCT,
  KAPPA_SOURCE_GATE, KAPPA_VALUE, currentKappa, evaluateAtPhase, withKappa
} from '../../src/lib/equations';
import {
  calibrationDrift, kappaBand, kappaFromObservation, kappaRegistryGaps,
  kappaTableDrift, renderedKappaRows
} from '../../src/lib/kappa-check';
import { GATES } from '../../src/lib/rollout';

describe('R227: the constant traces to its source', () => {
  test('KAPPA is what the gate observation implies', () => {
    expect(kappaFromObservation()).toBe(KAPPA_VALUE);
  });

  test('the cited gate still carries the floor the fit assumed', () => {
    const g5 = GATES.find((g) => g.n === KAPPA_SOURCE_GATE)!;
    expect(g5.floor).toContain(String(KAPPA_SOURCE_FLOOR_PCT) + '%');
    expect(calibrationDrift()).toEqual([]);
  });

  test('a changed gate floor invalidates the calibration', () => {
    /* The check reads the gate rather than repeating the number, so moving
       the floor to 98% gives a different KAPPA and is reported. */
    expect(kappaFromObservation(98, KAPPA_MATURE_PCT)).toBe(4);
    expect(kappaFromObservation(96, KAPPA_MATURE_PCT)).toBe(12);
  });
});

describe('R227: the model can be run at other values', () => {
  test('withKappa changes interior targets and restores the setting', () => {
    const base = evaluateAtPhase('TPP-8.1', 'SCN-BASE', 'P3');
    const low = withKappa(4, () => evaluateAtPhase('TPP-8.1', 'SCN-BASE', 'P3'));
    const high = withKappa(16, () => evaluateAtPhase('TPP-8.1', 'SCN-BASE', 'P3'));
    expect(low).not.toBeCloseTo(base, 6);
    expect(high).not.toBeCloseTo(base, 6);
    expect(currentKappa()).toBe(KAPPA_VALUE);
  });

  test('maturity is unchanged at every value in the band', () => {
    /* Why the constant was invisible: the one assertion that existed looked
       at P8, where every ramp is complete and F(t) collapses to 1. */
    for (const k of KAPPA_BAND) {
      expect(withKappa(k, () => evaluateAtPhase('TPP-1.1', 'SCN-BASE', 'P8')))
        .toBeCloseTo(evaluateAtPhase('TPP-1.1', 'SCN-BASE', 'P8'), 9);
    }
  });

  test('the setting is restored even when the run throws', () => {
    expect(() => withKappa(4, () => { throw new Error('boom'); })).toThrow('boom');
    expect(currentKappa()).toBe(KAPPA_VALUE);
  });
});

describe('R227: the band is published and cannot drift', () => {
  test('most of the catalog moves with the constant', () => {
    const band = kappaBand();
    const fitted = band.find((r) => r.kappa === KAPPA_VALUE)!;
    expect(fitted.metricsMoved).toBe(0);
    for (const r of band.filter((x) => x.kappa !== KAPPA_VALUE)) {
      expect(r.metricsMoved, 'kappa=' + r.kappa).toBeGreaterThan(90);
      expect(r.p90AbsShiftPct, 'kappa=' + r.kappa).toBeGreaterThan(10);
    }
  });

  test('the methodology carries every rendered row', () => {
    expect(renderedKappaRows()).toHaveLength(KAPPA_BAND.length);
    expect(kappaTableDrift()).toEqual([]);
  });

  test('the registry entry names its source and grade', () => {
    expect(KAPPA_CONFIDENCE).toBe('low');
    expect(kappaRegistryGaps()).toEqual([]);
  });
});
