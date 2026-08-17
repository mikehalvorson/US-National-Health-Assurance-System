import { describe, expect, test } from 'vitest';
import {
  BAND_META, committedKindCounts, EQUATION_DERIVED_KIND, FMEA_DATA, fmeaSelfTests,
  phaseOrderDrift, PROBABILITY_CEILING, PROBABILITY_FLOOR, PROBABILITY_SCALE,
  probabilityScaleReach, undeclaredCommittedKinds
} from '../../src/lib/fmea';
import {
  cpConfidenceWiring, cpFamilyConfidence, DEFERRED_TARGET_DEFINITION, gateBumpedRecords,
  gateWiring, PROBABILITY_SOURCE_NOTE, PROBABILITY_SOURCES, probabilitySourceConflicts,
  probabilitySourceCounts, proxiedInMatrix
} from '../../src/lib/fmea';
import { QUALITY_DATA } from '../../src/lib/quality';
import { AUTHORITATIVE_KINDS } from '../../src/lib/equations';
import { PHASE_YEAR } from '../../src/lib/rollout';
import { PARAMS_BY_ID } from '../../src/lib/params';

describe('FMEA derivation', () => {
  test('built-in self-tests pass', () => {
    const r = fmeaSelfTests();
    expect(r.ok, r.messages.join('\n')).toBe(true);
  });

  test('one failure mode per KPP/TPP phase target plus one per CP', () => {
    // 727 KPP/TPP phase-target rows + 310 CP calibration rows = 1037
    expect(FMEA_DATA.counts.kpptpp).toBe(727);
    expect(FMEA_DATA.counts.cp).toBe(310);
    expect(FMEA_DATA.counts.total).toBe(1037);
  });

  test('every record has scores in range and a consistent band', () => {
    for (const r of FMEA_DATA.records) {
      expect(r.consequence, r.id).toBeGreaterThanOrEqual(1);
      expect(r.consequence, r.id).toBeLessThanOrEqual(5);
      expect(r.probability, r.id).toBeGreaterThanOrEqual(0);
      expect(r.probability, r.id).toBeLessThanOrEqual(5);
      expect(Object.prototype.hasOwnProperty.call(BAND_META, r.band), r.id).toBe(true);
    }
  });

  test('phase-target matrix total equals the scored count and both-critical equals top-right cell', () => {
    let total = 0;
    for (let c = 1; c <= 5; c++) for (let p = 1; p <= 5; p++) total += FMEA_DATA.matrix[c][p];
    expect(total).toBe(FMEA_DATA.counts.scored);
    expect(FMEA_DATA.both.length).toBe(FMEA_DATA.matrix[5][5]);
  });

  test('the CP calibration matrix is separate and totals the scored CP records', () => {
    let cptotal = 0;
    for (let c = 1; c <= 5; c++) for (let p = 1; p <= 5; p++) cptotal += FMEA_DATA.cpMatrix[c][p];
    expect(cptotal).toBe(FMEA_DATA.counts.cpScored);
    expect(FMEA_DATA.counts.cpScored + FMEA_DATA.counts.cpUnscored).toBe(FMEA_DATA.counts.cp);
    expect(FMEA_DATA.cpFamilyRisk.length).toBe(20);
  });

  test('no effect or failure-mode text uses an em dash (site rule)', () => {
    for (const r of FMEA_DATA.records) {
      expect(r.effect.includes('—'), r.id).toBe(false);
      expect(r.failureMode.includes('—'), r.id).toBe(false);
    }
  });

  test('records are ranked by descending risk', () => {
    for (let i = 1; i < FMEA_DATA.records.length; i++) {
      expect(FMEA_DATA.records[i - 1].risk).toBeGreaterThanOrEqual(FMEA_DATA.records[i].risk);
    }
  });

  test('every CP family has a proposed calibration-risk parameter', () => {
    expect(FMEA_DATA.gaps.cpFamilies.length).toBe(20);
    for (const f of FMEA_DATA.gaps.cpFamilies) {
      expect(f.proposed).toMatch(/-RISK$/);
    }
  });

  test('the seven deferred qualitative targets surface as parameter gaps', () => {
    expect(FMEA_DATA.gaps.deferredParamIds.length).toBe(7);
  });
});

/* R279 [§S4]: a deferred target was scored 3 under the words "occurrence
   proxied at moderate", and that 3 landed in a coloured cell, a band total, a
   risk and an RPN, on a page saying the probability could not be assessed. */
describe('R279 a proxied placeholder is not charted as a score', () => {
  test('no proxied record reaches either risk matrix', () => {
    const p = proxiedInMatrix();
    expect(p.records).toBeGreaterThan(0);
    expect(p.cells).toBe(0);
  });

  test('a proxied record publishes no probability, risk, RPN or band', () => {
    const proxied = FMEA_DATA.records.filter((r) => r.probabilitySource === 'proxied');
    expect(proxied.length).toBe(7);
    for (const r of proxied) {
      expect(r.probability, r.id).toBe(0);
      expect(r.risk, r.id).toBe(0);
      expect(r.rpn, r.id).toBe(0);
      expect(r.band, r.id).toBe('unscored');
      expect(r.consequence, r.id).toBeGreaterThanOrEqual(1);  // still assessed
    }
  });

  test('the band totals no longer count a placeholder', () => {
    let charted = 0;
    for (let c = 1; c <= 5; c++) for (let p = 1; p <= 5; p++) charted += FMEA_DATA.matrix[c][p];
    const banded = FMEA_DATA.counts.extreme + FMEA_DATA.counts.high +
      FMEA_DATA.counts.moderate + FMEA_DATA.counts.low;
    expect(charted).toBe(banded);
    expect(charted).toBe(FMEA_DATA.counts.scored);
    expect(FMEA_DATA.counts.scored + proxiedInMatrix().records).toBe(FMEA_DATA.counts.kpptpp);
  });

  test('the deferred-target count and its definition are on the page data', () => {
    expect(FMEA_DATA.gaps.deferredParamIds.length).toBe(7);
    expect(FMEA_DATA.gaps.deferredDefinition).toBe(DEFERRED_TARGET_DEFINITION);
    expect(DEFERRED_TARGET_DEFINITION).toContain('P8');
    expect(DEFERRED_TARGET_DEFINITION).toContain('consequence is still assessed');
  });

  test('proxiedInMatrix reports a placeholder that gets charted again', () => {
    /* Constructed failing input: put the old proxy back on one record. */
    const rec = FMEA_DATA.records.filter((r) => r.probabilitySource === 'proxied')[0];
    const savedP = rec.probability, savedR = rec.risk;
    try {
      rec.probability = 3;
      rec.risk = rec.probability * rec.consequence;
      expect(proxiedInMatrix().cells).toBe(1);
    } finally {
      rec.probability = savedP;
      rec.risk = savedR;
    }
    expect(proxiedInMatrix().cells).toBe(0);
  });
});

/* R278 [§S4]: gate linkage adds +1 to consequence, enough to move a band, and
   nothing checked that the 41 hand-extracted ids existed. The prose they were
   read out of is in the repository, so they are compared with it. */
describe('R278 gate linkage is checked against the gate table', () => {
  test('all 41 gate-linked ids reconcile in both directions and resolve', () => {
    const w = gateWiring();
    expect(w.linkedIds).toBe(41);
    expect(w.unresolved, 'linked id no catalog parameter answers to').toEqual([]);
    expect(w.missing, 'named by the gate but not linked').toEqual([]);
    expect(w.extra, 'linked but not named by the gate').toEqual([]);
    expect(w.phaseDrift, 'bind phase against the phase the floor is written at').toEqual([]);
    expect(w.undeclaredAssumption).toEqual([]);
    expect(w.staleAssumption).toEqual([]);
  });

  test('the go/no-go bump reaches real records', () => {
    const bumped = gateBumpedRecords();
    expect(bumped.length).toBeGreaterThan(0);
    for (const r of bumped) {
      expect(r.gate, r.id).toBeTruthy();
      expect(r.consequenceBasis, r.id).toContain('go/no-go +1');
    }
  });

  test("G5 binds where the catalog tags its floor, not where it was typed", () => {
    /* TPP-11.5 carries a progression floor at P5 and another at P8, and only
       the P8 one is tagged G5. The bump used to fire at P5. */
    const g5 = gateBumpedRecords().filter((r) => r.gate === 'G5');
    expect(g5.length).toBeGreaterThan(0);
    for (const r of g5) expect(r.phase, r.id).toBe('P8');
  });

  test('gateWiring reports a linked id the gate table stops naming', () => {
    const gate = QUALITY_DATA.gates.filter((g) => g.id === 'G1')[0];
    const saved = gate.evidence ?? '';
    try {
      /* Constructed failing input: the extraction and its source disagree. */
      gate.evidence = saved.replace('TPP-2.1/2.2/2.4', 'TPP-2.1/2.4');
      expect(gateWiring().extra).toContain('G1:TPP-2.2');
      gate.evidence = saved.replace('TPP-2.1/2.2/2.4', 'TPP-2.1/2.2/2.4/2.9');
      expect(gateWiring().missing).toContain('G1:TPP-2.9');
    } finally {
      gate.evidence = saved;
    }
    expect(gateWiring().extra).toEqual([]);
    expect(gateWiring().missing).toEqual([]);
  });
});

/* R276 [§S4]: one boolean did three jobs. probabilityAssessed was false for a
   borrowed score, a proxied placeholder and no score at all alike, and the
   client appended "(unscored)" to every one of them beside a numeric pill. */
describe('R276 where a probability came from is a four-way fact', () => {
  test('every record declares one of the four sources, and they sum to the total', () => {
    const by = probabilitySourceCounts();
    const sum = PROBABILITY_SOURCES.reduce((n, s) => n + by[s], 0);
    expect(sum).toBe(FMEA_DATA.counts.total);
    for (const r of FMEA_DATA.records) {
      expect(PROBABILITY_SOURCES, r.id).toContain(r.probabilitySource);
    }
  });

  test('no record both carries a score and denies having one', () => {
    expect(probabilitySourceConflicts()).toEqual([]);
  });

  test('an unscored record carries no number, no band and no risk', () => {
    const unscored = FMEA_DATA.records.filter((r) => r.probabilitySource === 'unscored');
    expect(unscored.length).toBeGreaterThan(0);
    for (const r of unscored) {
      expect(r.probability, r.id).toBe(0);
      expect(r.risk, r.id).toBe(0);
      expect(r.rpn, r.id).toBe(0);
      expect(r.band, r.id).toBe('unscored');
      expect(r.tier, r.id).toBe('Unassessed');
    }
  });

  test('a borrowed score is a real score and is not called unscored', () => {
    const borrowed = FMEA_DATA.records.filter((r) => r.probabilitySource === 'borrowed');
    expect(borrowed.length).toBeGreaterThan(0);
    for (const r of borrowed) {
      expect(r.probability, r.id).toBeGreaterThanOrEqual(PROBABILITY_FLOOR);
      expect(r.band, r.id).not.toBe('unscored');
    }
    expect(PROBABILITY_SOURCE_NOTE.borrowed).toContain('borrowed');
    expect(PROBABILITY_SOURCE_NOTE.borrowed).not.toContain('unscored');
    expect(PROBABILITY_SOURCE_NOTE.unscored).toContain('unscored');
  });

  test('probabilitySourceConflicts reports a score published beside "unscored"', () => {
    /* Constructed failing input: exactly the shipped defect - a record that
       says it has no probability while carrying one. */
    const rec = FMEA_DATA.records.filter((r) => r.probabilitySource === 'unscored')[0];
    const saved = rec.probability;
    try {
      rec.probability = 3;
      expect(probabilitySourceConflicts().join(' ')).toContain(rec.id);
    } finally {
      rec.probability = saved;
    }
    expect(probabilitySourceConflicts()).toEqual([]);
  });
});

/* R275 [§S4]: CP occurrence used to be twenty grades retyped under a comment
   saying they came from params.ts. What is declared now is a list of parameter
   identifiers, which can be checked in both directions. */
describe('R275 cost-parameter occurrence is read from params.ts', () => {
  test('the mapping resolves in both directions', () => {
    const w = cpConfidenceWiring();
    expect(w.unknown, 'mapped id that params.ts does not define').toEqual([]);
    expect(w.undeclared, 'sampled parameter no family claims').toEqual([]);
    expect(w.ungraded, 'mapped parameter with no confidence grade').toEqual([]);
    expect(w.uncovered, 'CP family with no mapping entry').toEqual([]);
    expect(w.unmappedGrades, 'grade with no occurrence score').toEqual([]);
  });

  test('every family covers exactly the twenty in the catalog', () => {
    expect(cpFamilyConfidence().length).toBe(20);
  });

  test('a family grade equals the weakest grade among its own inputs', () => {
    const rank: Record<string, number> = {
      low: 0, 'low-medium': 1, medium: 2, 'medium-high': 3, high: 4
    };
    for (const f of cpFamilyConfidence()) {
      if (!f.inputs.length) { expect(f.grade, f.id).toBeNull(); continue; }
      const grades = f.inputs.map((id) => PARAMS_BY_ID[id].confidence as string);
      const weakest = grades.reduce((a, b) => (rank[b] < rank[a] ? b : a));
      expect(f.grade, f.id + ' from ' + f.inputs.join(', ')).toBe(weakest);
    }
  });

  test('the unassessable branch is reachable, and CP-DX is what reaches it', () => {
    const unassessable = cpFamilyConfidence().filter((f) => f.grade === null);
    expect(unassessable.map((f) => f.id)).toContain('CP-DX');
    const dx = FMEA_DATA.records.filter((r) => r.family === 'CP-DX');
    expect(dx.length).toBeGreaterThan(0);
    for (const r of dx) {
      expect(r.probability, r.id).toBe(0);
      expect(r.tier, r.id).toBe('Unassessed');
      expect(r.probabilityBasis, r.id).toContain('Unassessable');
    }
  });

  test('a compound grade maps to an occurrence rather than to undefined', () => {
    /* medium-high is not in PARAM_DEFS today. It is in OUTCOME_STATS and in the
       seed CSV, so it is one §S11a edit away from reaching here, and it used to
       resolve to undefined and land in the matrix as NaN. Constructed input:
       regrade a mapped parameter and require a real occurrence score out. */
    const def = PARAMS_BY_ID.governanceRate;
    const saved = def.confidence;
    try {
      (def as { confidence?: string }).confidence = 'medium-high';
      const gov = cpFamilyConfidence().filter((f) => f.id === 'CP-GOV')[0];
      expect(gov.grade).toBe('medium-high');
      expect(Number.isFinite(gov.occurrence)).toBe(true);
      expect(gov.occurrence).toBeGreaterThanOrEqual(1);
      expect(cpConfidenceWiring().unmappedGrades).toEqual([]);
    } finally {
      def.confidence = saved;
    }
  });

  test('cpConfidenceWiring reports a mapped id that no longer resolves', () => {
    /* Constructed failing input: the typo the row exists to prevent. */
    const saved = PARAMS_BY_ID.unitsCost;
    try {
      delete (PARAMS_BY_ID as Record<string, unknown>).unitsCost;
      expect(cpConfidenceWiring().unknown.join(' ')).toContain('unitsCost');
    } finally {
      PARAMS_BY_ID.unitsCost = saved;
    }
    expect(cpConfidenceWiring().unknown).toEqual([]);
  });
});

/* R274 [§S4]: the page used to publish "No failure mode scores probability 1"
   as a result. It was Math.round(1.5). The scale the chart draws is now the
   scale the model can reach, so the claim has nothing left to say. */
describe('R274 the occurrence scale is the one the model can reach', () => {
  test('probability 1 is unreachable, and is therefore not part of the scale', () => {
    const scored = FMEA_DATA.records.filter((r) => r.risk > 0);
    expect(scored.some((r) => r.probability === 1)).toBe(false);
    expect(PROBABILITY_FLOOR).toBeGreaterThan(1);
  });

  test('every column the chart can draw carries at least one failure mode', () => {
    const columns: number[] = [];
    for (let p = PROBABILITY_FLOOR; p <= PROBABILITY_CEILING; p++) columns.push(p);
    expect(columns).not.toContain(1);
    for (const p of columns) {
      expect(
        FMEA_DATA.records.some((r) => r.risk > 0 && r.probability === p),
        'no failure mode scores probability ' + p
      ).toBe(true);
    }
  });

  test('the declared floor equals the lowest score any record actually carries', () => {
    const reach = probabilityScaleReach();
    expect(reach.floor).toBe(PROBABILITY_FLOOR);
    expect(reach.ceiling).toBe(PROBABILITY_CEILING);
    expect(reach.unreached).toEqual([]);
  });

  test('probabilityScaleReach reports a reachable score with no published wording', () => {
    expect(probabilityScaleReach().unlabelled).toEqual([]);
    /* Constructed failing input: take the wording away from a score the chart
       still draws. A column with no definition beside it is the same defect as
       a definition with no column. */
    const saved = PROBABILITY_SCALE[PROBABILITY_FLOOR];
    try {
      delete PROBABILITY_SCALE[PROBABILITY_FLOOR];
      expect(probabilityScaleReach().unlabelled).toContain(PROBABILITY_FLOOR);
    } finally {
      PROBABILITY_SCALE[PROBABILITY_FLOOR] = saved;
    }
    expect(probabilityScaleReach().unlabelled).toEqual([]);
  });
});

/* R272 [§S4]: the ranking compares two populations. Which one a row belongs to
   decides whether a correction inside the equation layer moves it, so the
   labelling has to hold and the split has to be published. */
describe('R272 value provenance in the criticality ranking', () => {
  test('every record is labelled by where its scored value came from', () => {
    for (const r of FMEA_DATA.records) {
      if (r.paramType === 'CP') {
        expect(r.targetProvenance, r.id).toBe('calibration');
      } else if (r.targetKind === EQUATION_DERIVED_KIND) {
        expect(r.targetProvenance, r.id).toBe('equation');
      } else {
        expect(r.targetProvenance, r.id).toBe('committed');
      }
    }
  });

  test('the two populations partition the phase-target set and are published', () => {
    expect(FMEA_DATA.counts.equationDerived + FMEA_DATA.counts.committed)
      .toBe(FMEA_DATA.counts.kpptpp);
    const carried = committedKindCounts().reduce((n, k) => n + k.rows, 0);
    expect(carried).toBe(FMEA_DATA.counts.committed);
  });

  test('every carried-forward kind is one the equation layer promised to leave alone', () => {
    expect(undeclaredCommittedKinds()).toEqual([]);
    for (const k of committedKindCounts()) {
      expect(AUTHORITATIVE_KINDS[k.kind], k.kind).toBe(true);
    }
  });

  test('phaseOrderDrift reports a phase order that disagrees with PHASE_YEAR', () => {
    expect(phaseOrderDrift()).toEqual([]);
    /* Constructed failing input: move the last phase back before the first.
       PHASE_ORDER was frozen from PHASE_YEAR at import, so the two now
       disagree and the check has to say so. */
    const restore = PHASE_YEAR.P8;
    try {
      PHASE_YEAR.P8 = 0;
      const problems = phaseOrderDrift();
      expect(problems.length).toBeGreaterThan(0);
      expect(problems.join(' ')).toContain('P8');
    } finally {
      PHASE_YEAR.P8 = restore;
    }
    expect(phaseOrderDrift()).toEqual([]);
  });
});
