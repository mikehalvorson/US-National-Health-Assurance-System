/* R147 [§S3] — what stage one of the pipeline actually contributes.
 *
 * phase-targets.ts derives an interim value for every phase a metric is
 * measurable at, from thirteen entry-floor constants plus linear interpolation.
 * equations.ts then replaces every one of those rows. This file is the pin on
 * that replacement: it runs stage one alone against a clone of the generated
 * catalog, collects every value stage one produced, and requires that none of
 * them reached the published catalog.
 *
 * It can fail. Lose an equation, or let one evaluate non-finite at a phase that
 * carries a row, and applyEquationTargets skips that row - the stage-one string
 * is then what a reader sees, and these assertions say so by ID and phase. */
import { beforeAll, describe, expect, test, vi } from 'vitest';
import type { QualityData } from '../../src/lib/quality-data';
import { DATA_PHASES } from '../../src/lib/data-phases';
import { applyPhaseTargets, parseNum } from '../../src/lib/phase-targets';
import { QUALITY_DATA } from '../../src/lib/quality';
import { PHASE_YEAR } from '../../src/lib/rollout';

/* A catalog carrying stage one only.
 *
 * Both enrichers mutate the generated catalog IN PLACE at import time, so the
 * statically imported NHA_QUALITY_DATA is already through both stages by the
 * time any test body runs - and its re-entry flag is an own property, so a
 * structural clone inherits it. Resetting the module registry and importing
 * the generated module again is what produces a pristine copy. */
let stage1: QualityData;

beforeAll(async () => {
  vi.resetModules();
  const fresh = await import('../../src/lib/quality-data');
  const clone = JSON.parse(JSON.stringify(fresh.NHA_QUALITY_DATA)) as QualityData;
  applyPhaseTargets(clone, DATA_PHASES);
  stage1 = clone;
});

/* Every row stage one derived, keyed by parameter and phase. */
function derivedRows() {
  const out: Array<{ id: string; phase: string; value: string; interpretation: string }> = [];
  for (const p of stage1.parameters) {
    if (p.type === 'CP') continue;
    for (const e of (p.rollout || [])) {
      if (e.kind !== 'derived interim target') continue;
      out.push({ id: p.id, phase: e.phase, value: e.value, interpretation: e.interpretation || '' });
    }
  }
  return out;
}

describe('R147: the entry floors and the interpolation are a replaced scaffold', () => {
  test('stage one derives rows for every measurable phase', () => {
    const rows = derivedRows();
    /* Non-empty is the half that matters: a stage one that stopped deriving
       would leave phases with no row at all, and the published count would
       fall. 538 today - 97 entry floors, 413 interpolations, 28 ladder rows. */
    expect(rows.length).toBeGreaterThan(500);
    const entryFloors = rows.filter((r) => r.interpretation.startsWith('Entry floor:'));
    const interpolated = rows.filter((r) => r.interpretation.startsWith('Derived: linear'));
    const ladder = rows.filter((r) => r.interpretation.startsWith('The framework deliberately'));
    expect(entryFloors.length).toBeGreaterThan(0);
    expect(interpolated.length).toBeGreaterThan(0);
    expect(ladder.length).toBeGreaterThan(0);
    expect(entryFloors.length + interpolated.length + ladder.length).toBe(rows.length);
  });

  test('every row stage one derived was converted, none skipped', () => {
    /* The mechanism: applyEquationTargets rewrites `kind` in place on each row
       it replaces, and the only way to be skipped is a missing or non-finite
       equation value. So the two counts are equal exactly when nothing was
       skipped, and a skipped row shows up here and in the next test by ID.

       Value equality is deliberately NOT the test. Twelve published rows carry
       the same string stage one produced - KPP-C5 at P3 to P6, TPP-11.3 at P5
       and nine others - because the equation value was clamped to the same
       committed anchor the interpolation was aiming at. Those are agreements,
       not survivals, and a check written on strings would call them defects. */
    const derived = derivedRows().length;
    let converted = 0;
    for (const p of QUALITY_DATA.parameters) {
      for (const e of (p.rollout || [])) {
        if (e.kind === 'equation-derived target') converted += 1;
      }
    }
    expect(converted).toBe(derived);
  });

  test('the published row at every derived phase is equation output', () => {
    const published = new Map<string, string>();
    for (const p of QUALITY_DATA.parameters) {
      for (const e of (p.rollout || [])) published.set(p.id + '@' + e.phase, e.kind);
    }
    for (const r of derivedRows()) {
      const kind = published.get(r.id + '@' + r.phase);
      expect(kind, r.id + '@' + r.phase).toBe('equation-derived target');
    }
  });

  test('R148: interpolation divides by years, not by phase index', () => {
    /* Every interpolated row names its own bracketing anchors, so each one can
       be recomputed from the two anchor values and checked against both
       conventions. The phases are unevenly spaced, so the two disagree
       wherever a bracket spans a two-year step. */
    const PHASES = Object.keys(PHASE_YEAR);
    const rowsById = new Map<string, Map<string, string>>();
    for (const p of stage1.parameters) {
      const m = new Map<string, string>();
      for (const e of (p.rollout || [])) m.set(e.phase, e.value);
      rowsById.set(p.id, m);
    }

    let checked = 0, discriminating = 0;
    for (const p of stage1.parameters) {
      if (p.type === 'CP') continue;
      const mat = parseNum(p.target);
      if (!mat) continue;
      for (const e of (p.rollout || [])) {
        const m = /^Derived: linear interpolation between the (P\d) and (P\d) anchors/
          .exec(e.interpretation || '');
        if (!m) continue;
        const [, loK, hiK] = m;
        const rows = rowsById.get(p.id)!;
        const lo = parseNum(rows.get(loK)), hi = parseNum(rows.get(hiK));
        const got = parseNum(e.value);
        if (!lo || !hi || !got) continue;

        const fYear = (PHASE_YEAR[e.phase] - PHASE_YEAR[loK]) / (PHASE_YEAR[hiK] - PHASE_YEAR[loK]);
        const fIdx = (PHASES.indexOf(e.phase) - PHASES.indexOf(loK)) /
          (PHASES.indexOf(hiK) - PHASES.indexOf(loK));
        const byYear = lo.num + (hi.num - lo.num) * fYear;
        const byIndex = lo.num + (hi.num - lo.num) * fIdx;
        checked += 1;
        /* withNum rounds to the maturity target's own precision - integers
           above 1,000 - so the comparison is which convention the published
           number is nearer to, not an exact match against either. */
        const spread = Math.abs(byYear - byIndex);
        if (spread <= Math.max(0.06, Math.abs(byYear) * 0.002)) continue;
        discriminating += 1;
        const label = p.id + ' ' + e.phase + ' (' + loK + '-' + hiK + '): ' + got.num +
          ' vs year ' + byYear.toFixed(2) + ' / index ' + byIndex.toFixed(2);
        expect(Math.abs(got.num - byYear), label).toBeLessThan(Math.abs(got.num - byIndex));
      }
    }
    expect(checked).toBeGreaterThan(100);
    /* Without this the assertions above could all be vacuous: a corpus where
       the two conventions never differ would pass either implementation. */
    expect(discriminating).toBeGreaterThan(20);
  });

  test('stage one and stage two produce the same number of rows', () => {
    /* The scaffold's real job. If entry floors were deleted rather than
       overwritten, phases between the start phase and the first committed
       anchor would lose their bracket and never get a row. */
    const s1 = stage1.parameters.reduce((n, p) => n + (p.rollout || []).length, 0);
    const s2 = QUALITY_DATA.parameters.reduce((n, p) => n + (p.rollout || []).length, 0);
    expect(s2).toBe(s1);
  });
});
