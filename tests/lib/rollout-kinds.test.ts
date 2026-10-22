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
import {
  assertRolloutKinds, committedFloorControls, committedFloorRows, kindDecl, kindsWhere,
  ROLLOUT_KIND_NAMES, ROLLOUT_KINDS
} from '../../src/lib/rollout-kinds';
import { parseNum } from '../../src/lib/phase-targets';
import {
  PARSER_DEFINITION_SOURCE, PARSER_HOME, parserImplementations
} from '../../src/lib/manifest-check';
import {
  committedFloorControlFaults, engineKindDispositionDrift, derivationCounts,
  underivedPublishedKinds, undeclaredRolloutKinds, unproducedRolloutKinds
} from '../../src/lib/rollout-kind-check';
import {
  DECLARED_TARGET_MISPARSES, staleTargetMisparses, undeclaredTargetMisparses,
  unTemplatedNonParsingTargets
} from '../../src/lib/target-parse-check';

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

  /* R247 [§S16]: AUTHORITATIVE_KINDS is read off the declaration now, so the
     old two-copy comparison could not fail. What is tested instead is the
     engine: one row of every kind, driven through the real code. */
  test('the engine anchors on, keeps and replaces exactly what the table declares', () => {
    expect(engineKindDispositionDrift()).toEqual([]);
  });

  test('AUTHORITATIVE_KINDS is the authoritative column of the declaration', () => {
    expect([...AUTHORITATIVE_KINDS].sort()).toEqual(
      kindsWhere((d) => d.disposition === 'authoritative').sort());
    /* the four the engine has always kept, pinned independently */
    expect([...AUTHORITATIVE_KINDS].sort()).toEqual([
      'data-plan interim target', 'maturity target', 'phase milestone', 'progression floor'
    ]);
  });

  test('no live kind is left undecided: each is replaced, preserved, or engine output', () => {
    /* The hazard BQ4 named: a kind in neither list survives to the reader
       without anyone having chosen that. */
    for (const p of QUALITY_DATA.parameters) {
      if (p.type === 'CP') continue;
      for (const e of (p.rollout || [])) {
        const decl = kindDecl(e.kind);
        expect(decl, p.id + ' ' + e.phase + ' ' + e.kind).toBeDefined();
        const preserved = AUTHORITATIVE_KINDS.has(e.kind);
        const isEngineOutput = decl.disposition === 'equation-output';
        expect(preserved || isEngineOutput, p.id + ' ' + e.kind).toBe(true);
      }
    }
  });
});

/* R247 [§S16]: one declaration, enforced where the vocabulary is used. */
describe('R247: the rollout kind vocabulary is declared once and enforced', () => {
  test('an undeclared kind throws at import time, naming the row', () => {
    const rows = [{ id: 'TPP-TEST', type: 'TPP',
      rollout: [{ phase: 'P3', kind: 'maturity target' }, { phase: 'P4', kind: 'progression flor' }] }];
    expect(() => assertRolloutKinds(rows)).toThrow(/TPP-TEST@P4 "progression flor"/);
    expect(() => assertRolloutKinds(QUALITY_DATA.parameters)).not.toThrow();
  });

  test('kindDecl throws on an unknown kind instead of returning undefined', () => {
    expect(() => kindDecl('provisional interim target')).toThrow(/not a declared rollout kind/);
    expect(kindDecl('phase milestone').committedFloor).toBe(true);
  });

  test('the committed-floor surfaces include by declaration, not by exclusion', () => {
    const live = committedFloorRows(QUALITY_DATA.parameters);
    const kinds = [...new Set(live.map((r) => r.entry.kind))].sort();
    expect(kinds).toEqual(['phase milestone', 'progression floor']);
    /* Independently of the table: every live floor or milestone row, and
       nothing else. The client showed these twelve under the old exclusion
       list too, so the published set is unchanged. */
    let expected = 0;
    for (const p of QUALITY_DATA.parameters) {
      for (const e of p.rollout) {
        if (e.kind === 'phase milestone' || e.kind === 'progression floor') expected++;
      }
    }
    expect(live.length).toBe(expected);
    expect(live.length).toBe(12);
  });

  test('a misspelled kind cannot reach the committed-floor surfaces', () => {
    /* Under the exclusion lists this row would have been published as a
       committed floor. Now it throws before anything renders. */
    const rows = [{ rollout: [{ phase: 'P5', kind: 'progresion floor' }] }];
    expect(() => committedFloorRows(rows)).toThrow(/progresion floor/);
  });

  test('every published kind has an id slug; only the replaced kind has none', () => {
    for (const k of ROLLOUT_KIND_NAMES) {
      const d = kindDecl(k);
      expect(d.slug === null, k).toBe(d.disposition === 'replaced');
    }
  });
});

/* P22 [§S16] new finding: the floor table said "P5 delivery-scale exit
   milestone" for every ungated row, including two floors at P7. */
describe('P22: every committed floor says what it controls, from its own data', () => {
  const controls = (id: string, phase: string) => {
    const row = committedFloorRows(QUALITY_DATA.parameters)
      .find((r) => r.parameter.id === id && r.entry.phase === phase && !r.entry.gate)!;
    return committedFloorControls(row.entry, QUALITY_DATA.gates, QUALITY_DATA.phases);
  };

  test('the four ungated rows each name their own decision', () => {
    expect(controls('KPP-C5', 'P7')).toBe('Before maturity certification');
    expect(controls('KPP-C6', 'P7')).toBe('Before maturity certification');
    expect(controls('TPP-11.5', 'P5')).toBe('Before national AI-assisted routing');
    expect(controls('KPP-B7', 'P5')).toBe('The P5 exit milestone: workforce and delivery scale');
  });

  /* Review 2 of P22: this test used to re-implement the self-test's check,
     with its own copy of the phase pattern. It calls the check now, on the
     real catalog and on a copy with each fault put in. */
  test('the floor-label check passes the catalog and finds each fault it is for', () => {
    const real = committedFloorControlFaults(QUALITY_DATA);
    expect(real.faults).toEqual([]);
    expect(real.rows).toBeGreaterThan(0);
    /* Reach (review 3 of P22: this compared `rows` with the expression that
       produced it). Point every committed row at a gate the catalog does not
       carry; the check must report each row, once. */
    const every = structuredClone(QUALITY_DATA) as QualityData;
    const everyRow = committedFloorRows(every.parameters);
    everyRow.forEach((r) => { r.entry.gate = 'G9'; });
    const reported = committedFloorControlFaults(every).faults.map((f) => f.slice(0, f.indexOf(':')));
    expect(reported.slice().sort()).toEqual(everyRow.map((r) => r.parameter.id + '@' + r.entry.phase).sort());

    const Q = structuredClone(QUALITY_DATA) as QualityData;
    /* the kind table says which rows are committed floors; the test asks it */
    const entry = (id: string, phase: string) => committedFloorRows(Q.parameters)
      .find((r) => r.parameter.id === id && r.entry.phase === phase)!.entry;
    /* an ungated floor that names a phase other than its own */
    entry('KPP-C5', 'P7').controls = 'Before the P8 maturity certification';
    /* a gated floor citing a gate the catalog does not carry */
    const gated = committedFloorRows(Q.parameters).find((r) => r.entry.gate)!;
    const gatedAt = gated.parameter.id + '@' + gated.entry.phase;
    gated.entry.gate = 'G9';
    expect(committedFloorControlFaults(Q).faults.slice().sort()).toEqual([
      'KPP-C5@P7 says P8',
      gatedAt + ': rollout-kinds.ts: ' + gated.entry.phase + ' floor cites gate G9, which the catalog does not carry'
    ].sort());
  });

  test('a gated row states its gate\'s own decision', () => {
    /* the catalog's text: G1's names the P3-to-P4 transition on purpose */
    for (const r of committedFloorRows(QUALITY_DATA.parameters).filter((x) => x.entry.gate)) {
      expect(committedFloorControls(r.entry, QUALITY_DATA.gates, QUALITY_DATA.phases))
        .toBe(QUALITY_DATA.gates.find((g) => g.id === r.entry.gate)!.decision);
    }
  });

  test('a row with no gate and no stated decision throws instead of borrowing a label', () => {
    expect(() => committedFloorControls({ phase: 'P6', kind: 'progression floor' },
      QUALITY_DATA.gates, QUALITY_DATA.phases)).toThrow(/no gate and no stated decision/);
    expect(() => committedFloorControls({ phase: 'P6', kind: 'progression floor', gate: 'G9' },
      QUALITY_DATA.gates, QUALITY_DATA.phases)).toThrow(/gate G9/);
  });
});

/* R151 + R277 [§S3]: one parser, and its two silent outcomes made loud. */
describe('R277: the target parser has one implementation', () => {
  test('parseNum is defined exactly once, in phase-targets.ts', () => {
    expect(parserImplementations()).toEqual([PARSER_HOME]);
    /* A repo-relative path, so a copy anywhere under src/ is named correctly.
       Slicing 'src/lib/'.length off a src/scripts/ hit reported "ipts/foo.ts". */
    expect(PARSER_HOME).toBe('src/lib/phase-targets.ts');
  });

  test('the scan sees an arrow-function copy, not only a `function` one', () => {
    /* A reimplementation written as `const parseNum = (s) => ...` would pass a
       scan that only knew the `function` keyword, which is how the original
       mirror would have been written today. */
    const re = () => new RegExp(PARSER_DEFINITION_SOURCE);
    expect(re().test('function parseNum(s) { return null; }')).toBe(true);
    expect(re().test('const parseNum = (s: string) => null;')).toBe(true);
    expect(re().test('let parseNum = function (s) { return null; };')).toBe(true);
    expect(re().test('var parseNum: Parser = mirrorOf(other);')).toBe(true);
    /* And it does not fire on a call site or a longer name. */
    expect(re().test('const meta = parseNum(p.target);')).toBe(false);
    expect(re().test('const parseNumber = (s) => null;')).toBe(false);
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
