/* R147 [§S3] : what stage one of the pipeline actually contributes.
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
import {
  applyPhaseTargets, hasRelRule, parseNum, REL_FALLBACK_IDS, REL_FALLBACK_PHASE,
  staleRelevanceFallbacks, undeclaredRelevanceFallbacks, withoutAsides
} from '../../src/lib/phase-targets';
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

describe('R150: the relevance table has no silent default', () => {
  test('every metric matches a rule or is on the declared fallback list', () => {
    expect(undeclaredRelevanceFallbacks(QUALITY_DATA)).toEqual([]);
    expect(staleRelevanceFallbacks(QUALITY_DATA)).toEqual([]);
  });

  test('a metric with no rule and no declaration is reported', () => {
    const invented = {
      parameters: [{ id: 'TPP-NEWFAMILY1', type: 'TPP', rollout: [] }]
    } as unknown as QualityData;
    expect(undeclaredRelevanceFallbacks(invented)).toEqual(['TPP-NEWFAMILY1']);
  });

  test('a declared id that has left the catalog is reported', () => {
    const thin = {
      parameters: [{ id: 'KPP-W2', type: 'KPP', rollout: [] }]
    } as unknown as QualityData;
    /* The other ten declared ids are absent from this catalog. */
    expect(staleRelevanceFallbacks(thin).length).toBe(REL_FALLBACK_IDS.length - 1);
  });

  test('no declared fallback id is also matched by a rule', () => {
    for (const id of REL_FALLBACK_IDS) {
      expect(hasRelRule(id), id + ' has a rule and should not be on the fallback list')
        .toBe(false);
    }
  });

  test('the declared fallback ids start where the fallback says, unless the data plan moves them', () => {
    for (const id of REL_FALLBACK_IDS) {
      const p = QUALITY_DATA.parameters.find((x) => x.id === id);
      expect(p, id).toBeDefined();
      /* TPP-FORM1 is a data-plan metric: the plan's first phase wins, which is
         why the list records it as reaching relevance() rather than as ending
         up at P4. */
      if (id === 'TPP-FORM1') expect(p!._phaseStart).toBe('P0');
      else expect(p!._phaseStart, id).toBe(REL_FALLBACK_PHASE);
    }
  });
});

/* R277 [§S3], clause 2: "fix the first-number match".
 *
 * The acceptance criterion is `a target string containing a parenthetical year
 * does not parse the year as the value`. Asserted directly on the parser, with
 * the row's own worked example, and with the limits the fix does NOT close
 * stated as assertions rather than left to be rediscovered. */
describe('R277: a parenthetical cannot supply the number', () => {
  test("the row's worked example no longer parses its scale note", () => {
    const template = '<=${X} per person per year (2024 dollars, 2023 scale)';
    expect(parseNum(template)).toBeNull();
  });

  test('a parenthetical year is not read as the value', () => {
    const meta = parseNum('>=95% of claims auto-adjudicated (2024 baseline)');
    expect(meta!.num).toBe(95);
    expect(meta!.cmp).toBe('>=');
    expect(meta!.unit).toBe('%');
  });

  test('a value that is only in an aside parses as nothing, not as the aside', () => {
    expect(parseNum('to be calibrated (against 2024)')).toBeNull();
  });

  test('the unit is still read from the whole string, asides included', () => {
    /* The unit sniff deliberately runs on the original: a unit written only in
       an aside is still the unit. */
    const meta = parseNum('<=30 (median hours to resolution)');
    expect(meta!.num).toBe(30);
    expect(meta!.unit).toBe('hours');
  });

  test('nested and unclosed parentheses degrade safely', () => {
    expect(parseNum('>=90% complete (see note (a) 2024)')!.num).toBe(90);
    expect(parseNum('>=90% complete (unclosed 2024')!.num).toBe(90);
  });

  test('what the fix does not close, stated rather than assumed', () => {
    /* The first number in the surviving text still wins. This one is covered
       by the template mechanism, not by the parser. */
    expect(parseNum('>={X}% reduction in 30-day readmissions')!.num).toBe(30);
    /* And KPP-C2's target has no parenthesis at all, so the strip cannot
       help it; it is declared, and R233 keeps it out of the anchor set. */
    expect(parseNum('to be reconciled with $4.75T total system cost')!.num).toBe(4.75);
  });

  test('stripping asides changes no live parse', () => {
    /* Measured before the change landed, and pinned so it stays true: of every
       maturity target, rollout value and carried raw value, none depends on a
       number inside a parenthesis. */
    let checked = 0;
    for (const p of QUALITY_DATA.parameters) {
      const strings = [p.target, ...(p.rollout || []).flatMap((e) => [e.value, e.raw])];
      for (const s of strings) {
        if (typeof s !== 'string') continue;
        checked += 1;
        expect(JSON.stringify(parseNum(s)), s)
          .toBe(JSON.stringify(parseNum(withoutAsides(s))));
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });
});

/* R148 [§S3], the row's stated acceptance criterion: `implied annual
 * improvement rate is monotone across a derived trajectory, or the variation
 * is declared`.
 *
 * The earlier test asserted the fix (values sit nearer the calendar convention
 * than the index one). This asserts the criterion, which is a different claim:
 * within a bracket the implied ANNUAL rate must be constant, which is what
 * interpolating on years means and what interpolating on list position
 * violates. P3 to P4 is two calendar years and P0 to P1 is one, so an
 * index-based step demands the same gain over twice the calendar and the rate
 * halves mid-bracket.
 *
 * Across brackets the rate is NOT constant and is not required to be: each
 * bracket runs between two different committed anchors, and a plan that
 * commits to a steeper climb between P6 and P7 than between P1 and P2 is
 * making a claim about the plan, not about the interpolation. That is the
 * "or the variation is declared" half, and this is the declaration. */
describe('R148: the implied annual rate is constant within a bracket', () => {
  test('every interpolated value is linear in years between its own anchors', () => {
    const rowsById = new Map<string, Map<string, string>>();
    for (const p of stage1.parameters) {
      const m = new Map<string, string>();
      for (const e of (p.rollout || [])) m.set(e.phase, e.value);
      rowsById.set(p.id, m);
    }

    let checked = 0, spanningATwoYearStep = 0;
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

        const spanYears = PHASE_YEAR[hiK] - PHASE_YEAR[loK];
        const stepYears = PHASE_YEAR[e.phase] - PHASE_YEAR[loK];
        if (spanYears === 0 || stepYears === 0) continue;
        const bracketRate = (hi.num - lo.num) / spanYears;
        const impliedRate = (got.num - lo.num) / stepYears;
        checked += 1;

        /* The published string is rounded to the target's own precision, so
           the rate comparison carries that rounding: one display unit spread
           over the step. */
        const unit = mat.decimals ? Math.pow(10, -mat.decimals) : 1;
        const slack = Math.max(Math.abs(bracketRate) * 0.02, unit / stepYears);
        expect(Math.abs(impliedRate - bracketRate), p.id + ' ' + e.phase +
          ' (' + loK + '-' + hiK + '): ' + impliedRate.toFixed(4) +
          '/yr vs bracket ' + bracketRate.toFixed(4) + '/yr').toBeLessThanOrEqual(slack);

        /* The rows that discriminate: a bracket containing an uneven step is
           where the index convention produces a different rate per step. */
        const uneven = ['P4', 'P7', 'P8'].indexOf(e.phase) >= 0 ||
          (PHASE_YEAR[e.phase] - PHASE_YEAR[loK]) > (PHASES_IN_ORDER.indexOf(e.phase) - PHASES_IN_ORDER.indexOf(loK));
        if (uneven) spanningATwoYearStep += 1;
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(spanningATwoYearStep).toBeGreaterThan(20);
  });
});

const PHASES_IN_ORDER = Object.keys(PHASE_YEAR);
