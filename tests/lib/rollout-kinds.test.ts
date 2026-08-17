/* R228 [§S3] — the rollout `kind` vocabulary.
 *
 * The row asked a question before it asked for code: does phase-targets.ts tag
 * every value derived from entryNum() as 'derived interim target'? Measured:
 * it emits 538 of them and applyEquationTargets converts all 538, so the
 * answer is yes and the survivor count is 0 (asserted by R248's registered
 * check, and by 'every former rule-derived entry is now equation-derived' in
 * equations.test.ts).
 *
 * What was NOT covered is the row's second clause: every kind string emitted
 * by phase-targets.ts is in a declared enum. These tests cover that, and they
 * are written against constructed catalogs rather than only the live one, so
 * they can fail without the repository first being broken. */
import { describe, expect, test } from 'vitest';
import type { QualityData } from '../../src/lib/quality-data';
import { QUALITY_DATA } from '../../src/lib/quality';
import { AUTHORITATIVE_KINDS } from '../../src/lib/equations';
import {
  authoritativeKindDrift, ROLLOUT_KINDS, undeclaredRolloutKinds, unproducedRolloutKinds
} from '../../src/lib/rollout-kind-check';

function catalogWithKinds(kinds: string[]): QualityData {
  return {
    parameters: [{
      id: 'TPP-TEST', type: 'TPP',
      rollout: kinds.map((k, i) => ({ phase: 'P' + i, value: '>=1%', kind: k }))
    }]
  } as unknown as QualityData;
}

describe('R228: the rollout kind vocabulary', () => {
  test('the live catalog uses only declared kinds', () => {
    expect(undeclaredRolloutKinds()).toEqual([]);
  });

  test('an undeclared kind is reported, not ignored', () => {
    const bad = catalogWithKinds(['maturity target', 'provisional interim target']);
    expect(undeclaredRolloutKinds(bad)).toEqual(['provisional interim target']);
  });

  test('every declared kind except the replaced one is live', () => {
    expect(unproducedRolloutKinds()).toEqual([]);
  });

  test('a declared kind nothing produces is reported', () => {
    const thin = catalogWithKinds(['maturity target']);
    expect(unproducedRolloutKinds(thin)).toEqual([
      'data-plan interim target', 'equation-derived target', 'phase milestone', 'progression floor'
    ]);
  });

  test("'derived interim target' is exempt from the producer check by design", () => {
    /* It is the one kind whose absence from the finished catalog is the
       success condition: equations.ts converts every one. A producer check
       that demanded it would demand the conversion fail. */
    expect(ROLLOUT_KINDS['derived interim target'].disposition).toBe('replaced');
    expect(unproducedRolloutKinds(catalogWithKinds([]))).not.toContain('derived interim target');
  });

  test('the declared authoritative set and AUTHORITATIVE_KINDS agree', () => {
    expect(authoritativeKindDrift()).toEqual([]);
  });

  test('every kind the engine preserves is declared authoritative', () => {
    for (const k of Object.keys(AUTHORITATIVE_KINDS)) {
      expect(ROLLOUT_KINDS[k], k).toBeDefined();
      expect(ROLLOUT_KINDS[k].disposition, k).toBe('authoritative');
    }
  });

  test('no live kind is left undecided: each is replaced, preserved, or engine output', () => {
    /* The hazard BQ4 named: a kind in neither list survives to the reader
       without anyone having chosen that. */
    for (const p of QUALITY_DATA.parameters) {
      if (p.type === 'CP') continue;
      for (const e of (p.rollout || [])) {
        const decl = ROLLOUT_KINDS[e.kind];
        expect(decl, p.id + ' ' + e.phase + ' ' + e.kind).toBeDefined();
        const preserved = !!AUTHORITATIVE_KINDS[e.kind];
        const isEngineOutput = decl.disposition === 'equation-output';
        expect(preserved || isEngineOutput, p.id + ' ' + e.kind).toBe(true);
      }
    }
  });
});
