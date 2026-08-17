/* R227 [§S3]: KAPPA is registered, sourced, graded and banded.
 *
 * The row's finding is exposure rather than error, so most of these assert
 * that the exposure is visible - that the constant traces to a real gate
 * floor, that the document says so, and that the band the document publishes
 * is the band the model produces. */
import { describe, expect, test } from 'vitest';
import {
  KAPPA_BAND, KAPPA_CONFIDENCE, KAPPA_MATURE_PCT, KAPPA_SOURCE_FLOOR_PCT,
  KAPPA_SOURCE_GATE, KAPPA_VALUE, currentKappa, DOCUMENTED_GAPS, EQUATIONS,
  evaluateAtPhase, MATURITY_TOLERANCE, withKappa
} from '../../src/lib/equations';
import {
  calibrationDrift, kappaBand, kappaFromObservation, kappaRegistryGaps,
  kappaTableDrift, maturityToleranceDrift, renderedKappaRows
} from '../../src/lib/kappa-check';
import { parseNum } from '../../src/lib/phase-targets';
import { QUALITY_DATA } from '../../src/lib/quality';
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

/* R231 [§S3]: the tolerance, measured rather than assumed. */
describe('R231: maturity closure says what it means', () => {
  test('the tolerance is a named constant, not a literal', () => {
    expect(MATURITY_TOLERANCE).toBe(0.02);
  });

  test('the methodology states the tolerance the check applies', () => {
    expect(maturityToleranceDrift()).toEqual([]);
  });

  test('the old 12% bound was covering two undeclared misses', () => {
    /* Why the tolerance was tightened rather than the header softened: at 12%
       KPP-C7 (8.7% short) and TPP-W1 (3.9% over) passed silently. Both are
       now named gaps. The check is the same shape either way, so this asserts
       the state that made the loose bound wrong. */
    for (const id of ['KPP-C7', 'TPP-W1']) {
      const p = QUALITY_DATA.parameters.find((x) => x.id === id)!;
      const meta = parseNum(p.target)!;
      const v = evaluateAtPhase(id, 'SCN-BASE', 'P8');
      const missed = meta.cmp === '<='
        ? v > meta.num * (1 + MATURITY_TOLERANCE)
        : v < meta.num * (1 - MATURITY_TOLERANCE);
      expect(missed, id + ' computed ' + v.toFixed(2) + ' vs ' + p.target).toBe(true);
      const withinOld = meta.cmp === '<=' ? v <= meta.num * 1.12 : v >= meta.num * 0.88;
      expect(withinOld, id + ' used to pass the 12% bound').toBe(true);
      expect(DOCUMENTED_GAPS[id], id + ' must be declared').toBeTruthy();
    }
  });

  test('every documented gap really misses, and every other metric closes', () => {
    const gaps = Object.keys(DOCUMENTED_GAPS).sort();
    const missing: string[] = [];
    const closingButExempt: string[] = [];
    for (const p of QUALITY_DATA.parameters) {
      if (p.type === 'CP') continue;
      const d = EQUATIONS[p.id];
      if (!d || d.template) continue;
      const meta = parseNum(p.target);
      if (!meta || !meta.cmp) continue;
      const v = evaluateAtPhase(p.id, 'SCN-BASE', 'P8');
      if (!isFinite(v)) continue;
      const ok = meta.cmp === '<='
        ? v <= meta.num * (1 + MATURITY_TOLERANCE)
        : v >= meta.num * (1 - MATURITY_TOLERANCE);
      if (!ok && !DOCUMENTED_GAPS[p.id]) missing.push(p.id);
      if (ok && DOCUMENTED_GAPS[p.id]) closingButExempt.push(p.id);
    }
    expect(missing, 'misses the target and is not declared').toEqual([]);
    /* R235 turns the second list into a failure with its own message; here it
       is asserted so the exemption list cannot quietly outlive its reason. */
    expect(closingButExempt, 'exempt but now closing').toEqual([]);
    expect(gaps).toEqual(['KPP-C1', 'KPP-C7', 'KPP-C8', 'TPP-W1']);
  });

  test('the closure claim in the module header is no longer "exactly"', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const header = readFileSync('src/lib/equations.ts', 'utf8').slice(0, 2200);
    expect(header).not.toContain('close exactly');
  });
});
