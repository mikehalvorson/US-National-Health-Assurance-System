import { describe, expect, test } from 'vitest';
import { QUALITY_DATA } from '../../src/lib/quality';
import { parseNum } from '../../src/lib/phase-targets';
import {
  EQUATIONS, EQ_PHASES, DIAGRAM_GROUPS, evaluateAtPhase, equationSelfTests,
  computeTargets, collectDeps
} from '../../src/lib/equations';
import { SCENARIOS } from '../../src/lib/scenarios';
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
