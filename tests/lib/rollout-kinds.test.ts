/* R228 [§S3] : the rollout `kind` vocabulary.
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
import { AUTHORITATIVE_KINDS, EQUATIONS } from '../../src/lib/equations';
import { parseNum } from '../../src/lib/phase-targets';
import { PARSER_HOME, parserImplementations } from '../../src/lib/manifest-check';
import {
  authoritativeKindDrift, DECLARED_TARGET_MISPARSES, derivationCounts, ROLLOUT_KINDS,
  staleTargetMisparses, underivedPublishedKinds,
  undeclaredRolloutKinds, undeclaredTargetMisparses, unproducedRolloutKinds,
  unTemplatedNonParsingTargets
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

/* R151 + R277 [§S3]: one parser, and its two silent outcomes made loud. */
describe('R277: the target parser has one implementation', () => {
  test('parseNum is defined exactly once, in phase-targets.ts', () => {
    expect(parserImplementations()).toEqual([PARSER_HOME]);
  });

  test('fmea.ts scores from the shared parser', async () => {
    /* The former mirror was invisible because both copies agreed. What the
       scan protects is a third copy appearing, not a disagreement today. */
    const fmea = await import('../../src/lib/fmea');
    expect(fmea.FMEA_DATA.records.length).toBeGreaterThan(1000);
  });
});

describe('R151: parse outcomes are declared, not silent', () => {
  test('every target that does not parse carries an equation template', () => {
    expect(unTemplatedNonParsingTargets()).toEqual([]);
  });

  test('the non-parsing targets are the seven deferred outcome metrics', () => {
    const nonParsing = QUALITY_DATA.parameters
      .filter((p) => p.type !== 'CP' && !parseNum(p.target))
      .map((p) => p.id)
      .sort();
    expect(nonParsing).toEqual([
      'KPP-D1', 'KPP-D2', 'KPP-D3', 'KPP-D4', 'KPP-D5', 'KPP-D6', 'KPP-D7'
    ]);
  });

  test('an untemplated non-parsing target is reported', () => {
    const bad = {
      parameters: [{ id: 'TPP-1.1', type: 'TPP', target: 'to be decided later', rollout: [] }]
    } as unknown as QualityData;
    /* TPP-1.1 has an equation with no template, so a prose target on it is
       exactly the silent reroute to QUAL_LADDER the row is about. */
    expect(EQUATIONS['TPP-1.1'].template).toBeUndefined();
    expect(unTemplatedNonParsingTargets(bad)).toEqual(['TPP-1.1']);
  });

  test('KPP-C2 misparses, and the misparse is declared', () => {
    const p = QUALITY_DATA.parameters.find((x) => x.id === 'KPP-C2')!;
    const meta = parseNum(p.target)!;
    /* $4.75T of national system cost, read as a per-person dollar target. */
    expect(meta.num).toBe(4.75);
    expect(meta.unit).toBe('money');
    expect(DECLARED_TARGET_MISPARSES['KPP-C2']).toBeDefined();
    expect(undeclaredTargetMisparses()).toEqual([]);
    expect(staleTargetMisparses()).toEqual([]);
  });

  test('an undeclared templated target that parses is reported', () => {
    const bad = {
      parameters: [{
        id: 'KPP-D1', type: 'KPP',
        target: 'reduction to be calibrated against the 2024 baseline', rollout: []
      }]
    } as unknown as QualityData;
    expect(undeclaredTargetMisparses(bad)).toEqual([
      'KPP-D1: templated target parses as 2024 plain'
    ]);
  });
});

describe('R221: every published target has a stated derivation', () => {
  test('no live kind is published without one', () => {
    expect(underivedPublishedKinds()).toEqual([]);
  });

  test('the derivations partition the published rows', () => {
    const counts = derivationCounts();
    const total = counts.reduce((n, d) => n + d.rows, 0);
    const published = QUALITY_DATA.parameters
      .filter((p) => p.type !== 'CP')
      .reduce((n, p) => n + (p.rollout || []).length, 0);
    expect(total).toBe(published);
    expect(counts.map((d) => d.derivation)).toEqual([
      "that parameter's own equation",
      "the plan's own maturity target",
      "the Data tab's information-mesh plan",
      "the plan's own gate floors and milestones"
    ]);
  });

  test('a kind published without a derivation is reported', () => {
    /* The state the row is about: a row reaching a reader with nothing the
       page can say about where it came from. 'derived interim target' is the
       one kind with no derivation, because it is replaced before publication;
       a catalog where one survives is exactly that failure. */
    const survived = {
      parameters: [{
        id: 'TPP-1.1', type: 'TPP',
        rollout: [{ phase: 'P3', kind: 'derived interim target', value: '>=90%' }]
      }]
    } as unknown as QualityData;
    expect(underivedPublishedKinds(survived)).toEqual(['derived interim target']);
  });
});
