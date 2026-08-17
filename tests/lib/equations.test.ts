import { describe, expect, test } from 'vitest';
import { QUALITY_DATA } from '../../src/lib/quality';
import { parseNum } from '../../src/lib/phase-targets';
import {
  EQUATIONS, EQ_PHASES, DIAGRAM_GROUPS, anchorMatchTarget, clampCounts, committedAnchors,
  evaluateAtPhase, equationSelfTests, computeTargets, collectDeps, modelValueAt
} from '../../src/lib/equations';
import { runPath, sampleParams } from '../../src/lib/model';
import { effectiveParams, SCENARIOS, scenarioStructural } from '../../src/lib/scenarios';
import { buildDiagram } from '../../src/lib/equation-diagram';

const KPP_TPP = QUALITY_DATA.parameters.filter(p => p.type !== 'CP');

describe('equation engine', () => {
  test('built-in self-tests pass (coverage, finiteness, maturity closure)', () => {
    const r = equationSelfTests(QUALITY_DATA);
    expect(r.ok, r.messages.join('\n')).toBe(true);
  });

  test('every one of the 130 KPP/TPP records has an equation', () => {
    expect(KPP_TPP).toHaveLength(130);
    for (const p of KPP_TPP) {
      expect(EQUATIONS[p.id], p.id).toBeDefined();
    }
  });

  test('every equation belongs to exactly one diagram group', () => {
    const seen: Record<string, number> = {};
    for (const g of DIAGRAM_GROUPS) {
      for (const id of g.members) seen[id] = (seen[id] || 0) + 1;
    }
    for (const id of Object.keys(EQUATIONS)) {
      expect(seen[id], id).toBe(1);
    }
  });

  test('values are finite for every scenario from each metric start phase', () => {
    const startById: Record<string, string> = {};
    KPP_TPP.forEach(p => { startById[p.id] = p._phaseStart || 'P0'; });
    for (const scn of SCENARIOS) {
      for (const p of KPP_TPP) {
        const startIdx = EQ_PHASES.indexOf(startById[p.id]);
        for (let i = startIdx; i < EQ_PHASES.length; i++) {
          const v = evaluateAtPhase(p.id, scn.id, EQ_PHASES[i]);
          expect(isFinite(v), p.id + ' ' + scn.id + ' ' + EQ_PHASES[i]).toBe(true);
        }
      }
    }
  });

  test('stress scenarios move targets in the stressed direction', () => {
    // Unit underbuild cuts unit coverage and certified units
    expect(evaluateAtPhase('KPP-B7', 'SCN-UNIT-UNDER', 'P8'))
      .toBeLessThan(evaluateAtPhase('KPP-B7', 'SCN-BASE', 'P8'));
    expect(evaluateAtPhase('TPP-6.1', 'SCN-UNIT-UNDER', 'P8'))
      .toBeLessThan(evaluateAtPhase('TPP-6.1', 'SCN-BASE', 'P8'));
    // Wealth underperformance dents revenue sufficiency and reserves
    expect(evaluateAtPhase('KPP-C5', 'SCN-WEALTH-LOW', 'P8'))
      .toBeLessThan(evaluateAtPhase('KPP-C5', 'SCN-BASE', 'P8'));
    expect(evaluateAtPhase('KPP-C6', 'SCN-WEALTH-LOW', 'P8'))
      .toBeLessThan(evaluateAtPhase('KPP-C6', 'SCN-BASE', 'P8'));
    // LTC/aging stress dents home-first placement
    expect(evaluateAtPhase('TPP-9.2', 'SCN-LTC-AGING', 'P8'))
      .toBeLessThan(evaluateAtPhase('TPP-9.2', 'SCN-BASE', 'P8'));
    // An underbuilt unit network lengthens front-door waits at mid-rollout
    expect(evaluateAtPhase('KPP-B1', 'SCN-UNIT-UNDER', 'P4'))
      .toBeGreaterThan(evaluateAtPhase('KPP-B1', 'SCN-BASE', 'P4'));
  });

  test('computeTargets returns text for all 130 parameters at all phases, em-dash free', () => {
    const t = computeTargets(QUALITY_DATA, 'SCN-PESS');
    expect(Object.keys(t)).toHaveLength(130);
    for (const id of Object.keys(t)) {
      for (const ph of EQ_PHASES) {
        expect(t[id][ph].text.includes('—'), id + ' ' + ph).toBe(false);
      }
    }
  });
});

describe('equation-derived rollout targets', () => {
  test('every former rule-derived entry is now equation-derived', () => {
    let count = 0;
    for (const p of KPP_TPP) {
      for (const e of p.rollout) {
        expect(e.kind, p.id).not.toBe('derived interim target');
        if (e.kind === 'equation-derived target') count++;
      }
    }
    expect(count).toBeGreaterThan(400);
  });

  test('applied targets never regress between phases (base case)', () => {
    const PH = EQ_PHASES;
    for (const p of KPP_TPP) {
      const mt = parseNum(p.target);
      if (!mt || !mt.cmp) continue;
      const traj: Record<string, number> = {};
      p.rollout.forEach(e => {
        if (e.kind === 'progression floor' || e.kind === 'phase milestone') return;
        const pn = parseNum(e.value);
        if (pn && pn.unit === mt.unit) traj[e.phase] = pn.num;
      });
      const seq = PH.filter(ph => traj[ph] != null).map(ph => traj[ph]);
      for (let i = 1; i < seq.length; i++) {
        if (mt.cmp === '<=') expect(seq[i], p.id).toBeLessThanOrEqual(seq[i - 1] * 1.01);
        else expect(seq[i], p.id).toBeGreaterThanOrEqual(seq[i - 1] * 0.99);
      }
    }
  });

  test('no rollout value or interpretation uses an em dash', () => {
    for (const p of KPP_TPP) {
      for (const e of p.rollout) {
        expect((e.value + ' ' + (e.interpretation || '')).includes('—'), p.id + ' ' + e.phase).toBe(false);
      }
    }
  });
});

describe('equation flow diagrams', () => {
  test('diagrams build for every group with KPPs on the right edge unless they feed others', () => {
    for (const g of DIAGRAM_GROUPS) {
      const diagram = buildDiagram(g.members);
      expect(diagram.nodes.length, g.id).toBeGreaterThan(3);
      const succs: Record<string, number> = {};
      diagram.edges.forEach(e => { succs[e.from] = (succs[e.from] || 0) + 1; });
      const maxLayer = diagram.layers - 1;
      for (const n of diagram.nodes) {
        if (n.type === 'KPP' && !succs[n.id]) {
          expect(n.layer, g.id + ' ' + n.id).toBe(maxLayer);
        }
        // edges always flow left to right
      }
      const byId: Record<string, number> = {};
      diagram.nodes.forEach(n => { byId[n.id] = n.layer; });
      for (const e of diagram.edges) {
        expect(byId[e.from], g.id + ' ' + e.from + '>' + e.to).toBeLessThan(byId[e.to]);
      }
    }
  });

  test('dependency references all resolve to defined equations', () => {
    for (const id of Object.keys(EQUATIONS)) {
      const deps = collectDeps(EQUATIONS[id].expr);
      for (const r of deps.refs) {
        expect(EQUATIONS[r], id + ' -> ' + r).toBeDefined();
      }
    }
  });
});

/* R226 [§S2] — the row's third acceptance clause, which the section landed
   without: "a fixture asserting costRatio at P0 equals the 2027 row, not 2028".
   The ramps and the fiscal engine's year rows are two different halves of the
   off-by-one, and only the ramp half was pinned. `costRatio` reads
   path.detail[t] directly, so it is the one that catches a detail-row shift. */

test('R226: costRatio at P0 is the 2027 row, not 2028', () => {
  const detail = runPath(
    sampleParams(effectiveParams('SCN-BASE', null), null),
    scenarioStructural('SCN-BASE')
  ).detail;
  const y2027 = detail[0];
  const y2028 = detail[1];
  expect(y2027.year).toBe(2027);
  expect(y2028.year).toBe(2028);

  const atP0 = modelValueAt('SCN-BASE', 'costRatio', 'P0');
  expect(atP0).toBeCloseTo(y2027.nheNha / y2027.nheBase, 12);
  // The failing state R226 describes: P0 reporting 2028's flow under a 2027 label.
  expect(atP0).not.toBeCloseTo(y2028.nheNha / y2028.nheBase, 12);
});

test('R226: the same holds for the other detail-row leaves', () => {
  const detail = runPath(
    sampleParams(effectiveParams('SCN-BASE', null), null),
    scenarioStructural('SCN-BASE')
  ).detail;
  expect(modelValueAt('SCN-BASE', 'pubCost', 'P0')).toBeCloseTo(detail[0].pubCost, 9);
  expect(modelValueAt('SCN-BASE', 'newRev', 'P0')).toBeCloseTo(detail[0].newRevenue, 9);
  // P3 is Year 4 = 2030, index 3 - the phase R226 says used to read Year 5.
  expect(modelValueAt('SCN-BASE', 'pubCost', 'P3')).toBeCloseTo(detail[3].pubCost, 9);
  expect(detail[3].year).toBe(2030);
});

/* R233 [§S3] - the anchor unit guard.
 *
 * `!matMeta` used to mean both "no unit to match" and "match anything", so a
 * metric whose maturity target does not parse admitted every anchor in every
 * unit: a "within 12 months" milestone could clamp a percentage target. It now
 * means "take no anchors", and a templated target is treated the same way,
 * because a template says the catalog string has no numeric scaffold. */
describe('R233: anchors are unit-matched or refused', () => {
  const TEMPLATE_IDS = Object.keys(EQUATIONS).filter(id => EQUATIONS[id].template);

  test('the templated metrics are the eight the audit named', () => {
    expect(TEMPLATE_IDS.sort()).toEqual([
      'KPP-C2', 'KPP-D1', 'KPP-D2', 'KPP-D3', 'KPP-D4', 'KPP-D5', 'KPP-D6', 'KPP-D7'
    ]);
  });

  test('every templated metric admits zero anchors', () => {
    for (const id of TEMPLATE_IDS) {
      const p = QUALITY_DATA.parameters.find(x => x.id === id)!;
      expect(anchorMatchTarget(EQUATIONS[id], p.target), id).toBeNull();
      expect(Object.keys(committedAnchors(EQUATIONS[id], p)), id).toEqual([]);
    }
  });

  test('KPP-C2 no longer admits its own maturity row as a money anchor', () => {
    /* The row parses to 4.75 - $4.75T of national system cost - against a
       metric the equation publishes at about $14,000 per person. */
    const p = QUALITY_DATA.parameters.find(x => x.id === 'KPP-C2')!;
    const maturity = p.rollout.find(e => e.kind === 'maturity target')!;
    expect(parseNum(maturity.value)!.num).toBe(4.75);
    expect(committedAnchors(EQUATIONS['KPP-C2'], p)).toEqual({});
  });

  test('every admitted anchor matches its metric maturity unit', () => {
    for (const p of KPP_TPP) {
      const d = EQUATIONS[p.id];
      const unit = anchorMatchTarget(d, p.target);
      const anchors = committedAnchors(d, p);
      if (!unit) { expect(anchors, p.id).toEqual({}); continue; }
      for (const phase of Object.keys(anchors)) {
        const src = p.rollout.filter(e => e.phase === phase)
          .map(e => parseNum(e.value)).filter(Boolean);
        expect(src.some(m => m!.unit === unit.unit), p.id + ' ' + phase).toBe(true);
      }
    }
  });

  test('a milestone in the wrong unit cannot anchor a target', () => {
    /* The failure the row describes, constructed: a percentage metric with a
       months milestone. Under the old guard an unparseable target made this
       12 an admitted anchor. */
    const monthsMilestone = {
      id: 'TPP-6.1', target: 'reduction to be calibrated',
      rollout: [{ phase: 'P5', kind: 'phase milestone', value: 'within 12 months' }]
    } as unknown as (typeof QUALITY_DATA.parameters)[number];
    const templated = { ...EQUATIONS['TPP-6.1'], template: '>={X}% of units certified' };
    expect(committedAnchors(templated, monthsMilestone)).toEqual({});

    /* And with a parseable percentage target, the months value is still
       refused while a percentage one is taken. */
    const pctTarget = {
      id: 'TPP-6.1', target: '>=95%',
      rollout: [
        { phase: 'P5', kind: 'phase milestone', value: 'within 12 months' },
        { phase: 'P6', kind: 'progression floor', value: '>=60%' }
      ]
    } as unknown as (typeof QUALITY_DATA.parameters)[number];
    expect(committedAnchors(EQUATIONS['TPP-6.1'], pctTarget)).toEqual({ P6: 60 });
  });
});

/* R232 [§S3] - the clamp, disclosed.
 *
 * The row was filed as a missing feature. The feature existed twice and was
 * disconnected both times: applyEquationTargets composed an explanation into
 * `entry.interpretation` that no client read, and buildEquationPanel rendered a
 * raw-value strip gated on `!compact`, which is false at the only call site
 * where the published value is also on screen. */
describe('R232: the raw value survives the clamp', () => {
  test('every bounded entry carries the equation number it replaced', () => {
    let bounded = 0;
    for (const p of KPP_TPP) {
      for (const e of p.rollout) {
        if (!e.bounded) continue;
        bounded += 1;
        expect(e.raw, p.id + '@' + e.phase).toBeTruthy();
        expect(e.raw, p.id + '@' + e.phase).not.toBe(e.value);
      }
    }
    expect(bounded).toBeGreaterThan(0);
  });

  test('an unbounded entry carries no raw value to contradict its own', () => {
    for (const p of KPP_TPP) {
      for (const e of p.rollout) {
        if (e.kind !== 'equation-derived target' || e.bounded) continue;
        expect(e.raw, p.id + '@' + e.phase).toBeUndefined();
      }
    }
  });

  test('the interpretation names both numbers, not just that an adjustment happened', () => {
    /* BQ8 criticised the old string for disclosing that an adjustment
       happened but not from what to what. BR2 found it was never rendered at
       all. Both halves: it now says both numbers, and quality-client renders
       it. */
    const clamped = KPP_TPP.flatMap(p => p.rollout.filter(e => e.bounded));
    expect(clamped.length).toBeGreaterThan(0);
    for (const e of clamped) {
      expect(e.interpretation).toContain(e.raw!);
      expect(e.interpretation).toContain(e.value);
    }
  });

  test('clamp counts are per metric and ranked', () => {
    const counts = clampCounts(QUALITY_DATA);
    const bounded = counts.filter(c => c.bounded > 0);
    expect(bounded.length).toBeGreaterThan(0);
    for (let i = 1; i < bounded.length; i++) {
      expect(bounded[i - 1].bounded).toBeGreaterThanOrEqual(bounded[i].bounded);
    }
    for (const c of counts) {
      expect(c.phases.length, c.id).toBe(c.bounded);
      expect(c.bounded, c.id).toBeLessThanOrEqual(c.rows);
    }
  });

  test('the metrics whose equation does no published work are visible', () => {
    /* The row's own example: a metric bounded at most of its phases is one
       whose equation is not doing the work. KPP-C5 is bounded at every phase
       it publishes. */
    const c5 = clampCounts(QUALITY_DATA).find(c => c.id === 'KPP-C5')!;
    expect(c5.bounded).toBe(c5.rows);
    expect(c5.rows).toBeGreaterThan(1);
  });
});
