/* R227 [§S3]: KAPPA is registered, sourced, graded and banded.
 *
 * The row's finding is exposure rather than error, so most of these assert
 * that the exposure is visible - that the constant traces to a real gate
 * floor, that the document says so, and that the band the document publishes
 * is the band the model produces. */
import { describe, expect, test } from 'vitest';
import {
  KAPPA_BAND, KAPPA_CONFIDENCE, KAPPA_MATURE_PCT, KAPPA_SOURCE_FLOOR_PCT,
  KAPPA_SOURCE_GATE, KAPPA_VALUE, currentKappa, documentedGapIds, EQUATIONS,
  equationSelfTests, evaluateAtPhase, MATURITY_TOLERANCE, withKappa
} from '../../src/lib/equations';
import {
  calibrationDrift, kappaBand, kappaFromObservation, kappaRegistryGaps,
  documentedGapDrift, kappaTableDrift, maturityToleranceDrift, renderedKappaRows
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
      expect(p.documentedGap, id + ' must be declared').toBeTruthy();
    }
  });

  test('every documented gap really misses, and every other metric closes', () => {
    const gaps = documentedGapIds(QUALITY_DATA);
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
      if (!ok && !p.documentedGap) missing.push(p.id);
      if (ok && p.documentedGap) closingButExempt.push(p.id);
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

/* R235 [§S3]: the exemption belongs to the record, not to the test. */
describe('R235: documented gaps travel with their parameter', () => {
  test('each exempt metric carries its reason and a pointer', () => {
    const ids = documentedGapIds(QUALITY_DATA);
    expect(ids).toEqual(['KPP-C1', 'KPP-C7', 'KPP-C8', 'TPP-W1']);
    for (const id of ids) {
      const p = QUALITY_DATA.parameters.find((x) => x.id === id)!;
      expect(p.documentedGap!.length, id).toBeGreaterThan(60);
      expect(p.documentedGapSection, id)
        .toContain('research/quality-equation-methodology.md#');
    }
  });

  test('the record and the methodology name the same set', () => {
    expect(documentedGapDrift()).toEqual([]);
  });

  test('an exemption that is no longer needed is reported, not tolerated', () => {
    /* The defect the row names: if a gap closes, a hardcoded map in the test
       keeps exempting a metric that now passes, and nothing says so. Simulated
       by exempting a metric that already meets its target. */
    const clone = {
      ...QUALITY_DATA,
      parameters: QUALITY_DATA.parameters.map((p) =>
        p.id === 'TPP-1.1' ? { ...p, documentedGap: 'invented for this test' } : p)
    };
    const r = equationSelfTests(clone as typeof QUALITY_DATA);
    expect(r.ok).toBe(false);
    expect(r.messages.join(' ')).toContain('exemption no longer needed: TPP-1.1');
  });

  test('a real gap with its exemption removed still fails as a miss', () => {
    const clone = {
      ...QUALITY_DATA,
      parameters: QUALITY_DATA.parameters.map((p) =>
        p.id === 'KPP-C7' ? { ...p, documentedGap: undefined } : p)
    };
    const r = equationSelfTests(clone as typeof QUALITY_DATA);
    expect(r.ok).toBe(false);
    expect(r.messages.join(' ')).toContain('maturity miss: KPP-C7');
  });
});

/* Review fix: a non-finite maturity value is a failure, not a skip.
 *
 * R231 introduced `if (!isFinite(v)) return;` in the closure loop while
 * tightening the tolerance. Before it, a NaN at P8 reported as "computed NaN"
 * because every comparison against NaN is false. The early return replaced a
 * loud wrong answer with silence, in the section whose whole subject was
 * silences. It reports explicitly now. */
describe('maturity closure reports a non-finite value', () => {
  const FAKE = 'TPP-NONFINITE1';

  test('a metric that evaluates non-finite at P8 fails by name', () => {
    /* The non-finite value has to come from an equation, because the closure
       loop calls evaluateAtPhase rather than reading the catalog. Division by
       zero is the mechanism all fourteen known cases use. */
    (EQUATIONS as Record<string, unknown>)[FAKE] = {
      id: FAKE, kind: 'TPP', name: 'Constructed non-finite metric', group: 'access',
      cmp: '>=', unit: '%', decimals: 0,
      expr: {
        k: 'div',
        a: { k: 'num', v: 1, label: 'numerator' },
        b: { k: 'num', v: 0, label: 'zero build state' }
      },
      why: 'Constructed for tests/lib/kappa.test.ts; never in the live catalog.'
    };
    try {
      const withFake = {
        ...QUALITY_DATA,
        parameters: [
          ...QUALITY_DATA.parameters,
          { id: FAKE, type: 'TPP', target: '>=95%', rollout: [], _phaseStart: 'P8' }
        ]
      };
      const r = equationSelfTests(withFake as typeof QUALITY_DATA);
      expect(r.ok).toBe(false);
      expect(r.messages.join(' ')).toContain('maturity value is not finite: ' + FAKE);
      /* And it is NOT reported as a miss, which is what the NaN comparison
         used to produce before R231 replaced it with an early return. */
      expect(r.messages.join(' ')).not.toContain('maturity miss: ' + FAKE);
    } finally {
      delete (EQUATIONS as Record<string, unknown>)[FAKE];
    }
  });

  test('the live catalog is finite at P8 everywhere', () => {
    expect(equationSelfTests(QUALITY_DATA).ok).toBe(true);
  });
});
