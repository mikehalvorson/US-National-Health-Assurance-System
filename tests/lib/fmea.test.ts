import { describe, expect, test } from 'vitest';
import { FMEA_DATA, fmeaSelfTests, BAND_META } from '../../src/lib/fmea';

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
