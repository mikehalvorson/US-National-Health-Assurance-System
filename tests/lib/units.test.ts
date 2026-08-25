import { describe, expect, test } from 'vitest';

import {
  absorptionSpan, countyDemand, unitAllocationDrift, unitAssumptionGaps,
  UNIT_ASSUMPTION_IDS, unitsCostReconciliation, visitSplitClosure
} from '../../src/lib/manifest-check';
import {
  allocateCounty, allocateUnits, ALLOCATION_THRESHOLDS, CONTROLLED_TARGET_UNITS,
  NETWORK_ABSORPTION, networkCost, UNIT_ASSUMPTIONS, UNIT_TYPE_KEYS, UNIT_TYPES,
  unitsCostComparison, VISIT_SPLITS
} from '../../src/lib/units';
import { PARAMS_BY_ID } from '../../src/lib/params';
import { UNIT_MODEL } from '../../src/lib/workforce';

/* R185 R186 R187 R188 [§S9b].
 *
 * These pin what the section established, so a later section that moves one of
 * the six assumptions is told which downstream claim it just invalidated
 * rather than discovering it. Every expectation here is a MEASURED value, not
 * a target: where a figure is authored, the test names the authored side and
 * the computed side separately. */

describe('the unit model is data, and the data is graded', () => {
  test('every assumption carries a grade, a basis and an owner', () => {
    expect(unitAssumptionGaps()).toEqual([]);
    expect(UNIT_ASSUMPTIONS.map((a) => a.id).sort())
      .toEqual([...UNIT_ASSUMPTION_IDS].sort());
  });

  test('nothing behind the unit count is graded above low', () => {
    /* If this ever fails it is good news and the note on units.astro that says
       so has to be rewritten in the same commit. */
    expect(UNIT_ASSUMPTIONS.filter((a) => a.confidence !== 'low')).toEqual([]);
  });

  test('the only assumption carrying a URL carries it as a comparator', () => {
    const sourced = UNIT_ASSUMPTIONS.filter((a) => a.url);
    expect(sourced.map((a) => a.id)).toEqual(['throughput']);
    /* graded low anyway: the comparator is not the framework's own figure */
    expect(sourced[0].confidence).toBe('low');
  });

  test('both visit splits close on the whole of their demand', () => {
    expect(visitSplitClosure()).toEqual([]);
    expect(VISIT_SPLITS.urban.a + VISIT_SPLITS.urban.b + VISIT_SPLITS.urban.d)
      .toBeCloseTo(1, 10);
    expect(VISIT_SPLITS.rural.b + VISIT_SPLITS.rural.c).toBeCloseTo(1, 10);
  });

  test('a split that leaks demand is caught', () => {
    const saved = VISIT_SPLITS.urban.b;
    try {
      VISIT_SPLITS.urban.b = 0.50;
      expect(visitSplitClosure().map((s) => s.which)).toEqual(['urban']);
    } finally {
      VISIT_SPLITS.urban.b = saved;
    }
  });
});

describe('the allocation the workforce ledger multiplies', () => {
  test('the authored per-type counts are the ones the model produces', () => {
    expect(unitAllocationDrift()).toEqual([]);
  });

  test('the county file is the one the client fetches, and it is whole', () => {
    const counties = countyDemand();
    expect(counties.length).toBeGreaterThan(3000);
    expect(counties.every((c) => c.p > 0 && c.r >= 0 && c.r <= 1)).toBe(true);
  });

  test('restaffing a type does not move the count, but repricing throughput does', () => {
    /* fte is a workforce input; throughput is an allocation input. Keeping
       them distinguishable is why UNIT_TYPES carries both. */
    const before = allocateUnits(countyDemand(), NETWORK_ABSORPTION.default).total;
    const saved = UNIT_TYPES.b.throughput;
    try {
      UNIT_TYPES.b.throughput = saved * 2;
      expect(allocateUnits(countyDemand(), NETWORK_ABSORPTION.default).total)
        .toBeLessThan(before);
    } finally {
      UNIT_TYPES.b.throughput = saved;
    }
  });

  test('every county gets at least one unit, including an empty-demand one', () => {
    const tiny = allocateCounty({ p: 100, r: 0.9 }, NETWORK_ABSORPTION.default);
    expect(tiny.units.total).toBeGreaterThanOrEqual(1);
    const urbanTiny = allocateCounty({ p: 100, r: 0 }, NETWORK_ABSORPTION.default);
    expect(urbanTiny.units.b).toBe(1);
  });

  test('the rural floor triggers exactly at the declared share', () => {
    const at = allocateCounty(
      { p: 50000, r: ALLOCATION_THRESHOLDS.ruralFloorShare }, NETWORK_ABSORPTION.default);
    expect(at.units.c).toBeGreaterThanOrEqual(1);
  });
});

describe('unitsCost and the per-type model price the same network', () => {
  test('scaled to the controlled target, the two agree', () => {
    const r = unitsCostReconciliation();
    expect(r.ok).toBe(true);
    expect(r.targetUnits).toBe(CONTROLLED_TARGET_UNITS);
    /* measured: the bottom-up total at 15,000 units lands within a few percent
       of the parameter's centre across the whole amortisation window */
    expect(r.modeErrorPct).toBeLessThan(5);
  });

  test('the printed gap is a count difference, not a cost difference', () => {
    const totals = allocateUnits(countyDemand(), NETWORK_ABSORPTION.default);
    const cmp = unitsCostComparison(totals);
    const param = PARAMS_BY_ID['unitsCost'];
    /* the need-based operating total sits ABOVE the parameter's high bound */
    expect(cmp.needBasedOp).toBeGreaterThan(param.high);
    /* the same mix at the target sits inside it */
    expect(cmp.targetOp).toBeGreaterThan(param.low);
    expect(cmp.targetOp).toBeLessThan(param.high);
    expect(cmp.needBasedUnits).toBeGreaterThan(cmp.targetUnits);
  });

  test('repricing a unit type breaks the reconciliation', () => {
    const saved = UNIT_TYPES.b.opMode;
    try {
      UNIT_TYPES.b.opMode = saved * 3;
      expect(unitsCostReconciliation().ok).toBe(false);
    } finally {
      UNIT_TYPES.b.opMode = saved;
    }
  });
});

describe('the absorption control', () => {
  test('moves the count and this page\'s own cost, across its whole range', () => {
    const a = absorptionSpan();
    expect(a.highUnits).toBeGreaterThan(a.lowUnits);
    expect(a.highOpB).toBeGreaterThan(a.lowOpB);
  });

  test('is not wired to unitsCost, and nothing pretends otherwise', () => {
    /* R187. unitsCost is a sampled PARAM_DEFS entry; the control is module
       state in the client. The independence is the finding, so it is asserted
       rather than left to a reader to infer from two unrelated numbers.

       Snapshot the parameter, run the allocation at both ends of the control,
       compare. A future section that wires them fails here. */
    const before = JSON.stringify(PARAMS_BY_ID['unitsCost']);
    const lo = networkCost(allocateUnits(countyDemand(), NETWORK_ABSORPTION.min));
    const hi = networkCost(allocateUnits(countyDemand(), NETWORK_ABSORPTION.max));
    expect(hi.opTotal - lo.opTotal).toBeGreaterThan(10);
    expect(JSON.stringify(PARAMS_BY_ID['unitsCost'])).toBe(before);
    /* still a slider a reader can move, which is what makes the two
       comparable on screen and worth declaring apart */
    expect(PARAMS_BY_ID['unitsCost'].adjustable).toBe(true);
  });
});

describe('the two modules that share the unit model do not hold two copies', () => {
  test('the workforce ledger reads the per-type FTE from the unit model', () => {
    for (const t of UNIT_MODEL.allocation) {
      expect(t.fte).toBe(UNIT_TYPES[t.key].fte);
      expect(t.label).toBe(UNIT_TYPES[t.key].shortName);
    }
    expect(UNIT_MODEL.controlledTargetUnits).toBe(CONTROLLED_TARGET_UNITS);
  });

  test('the type keys are the same four everywhere', () => {
    expect([...UNIT_TYPE_KEYS]).toEqual(['a', 'b', 'c', 'd']);
    expect(UNIT_MODEL.allocation.map((t) => t.key)).toEqual([...UNIT_TYPE_KEYS]);
  });
});
