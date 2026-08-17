import { describe, expect, test } from 'vitest';
import {
  BAND_META, committedKindCounts, EQUATION_DERIVED_KIND, FMEA_DATA, fmeaSelfTests,
  phaseOrderDrift, undeclaredCommittedKinds
} from '../../src/lib/fmea';
import { AUTHORITATIVE_KINDS } from '../../src/lib/equations';
import { PHASE_YEAR } from '../../src/lib/rollout';

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

  test('phase-target matrix total equals assessed count and both-critical equals top-right cell', () => {
    let total = 0;
    for (let c = 1; c <= 5; c++) for (let p = 1; p <= 5; p++) total += FMEA_DATA.matrix[c][p];
    expect(total).toBe(FMEA_DATA.counts.assessed);
    expect(FMEA_DATA.both.length).toBe(FMEA_DATA.matrix[5][5]);
  });

  test('the CP calibration matrix is separate and totals the CP records', () => {
    let cptotal = 0;
    for (let c = 1; c <= 5; c++) for (let p = 1; p <= 5; p++) cptotal += FMEA_DATA.cpMatrix[c][p];
    expect(cptotal).toBe(FMEA_DATA.counts.cpAssessed);
    expect(FMEA_DATA.counts.assessed).toBe(727);   // phase-target failures only
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
