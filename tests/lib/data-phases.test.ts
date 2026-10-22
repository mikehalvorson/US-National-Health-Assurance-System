import { expect, test } from 'vitest';
import { DATA_PHASES, DATA_PHASE_COUNTS, DATA_PHASE_GAPS } from '../../src/lib/data-phases';
import { QUALITY_DATA } from '../../src/lib/quality';
import {
  coverageGapDrift,
  dataPhaseIdFormat,
  dataPhaseMetricIds,
  dataPhaseMonotonicity,
  dataPhaseTargetCount,
  frameworkBasisClaims,
  frameworkBasisDrift,
  frameworkBasisEntries,
  measuredCoverageGaps,
  unreasonedCoverageGaps,
  uptimeDowntimeDrift,
  uptimeDowntimeRows,
  uncertifiedAtMaturity,
  matureTargetPhasesWithoutRows,
  scopeChangeDrift,
  scopeChangesMissingFromQuality,
  targetsNotNamingTheirMeasure,
  populationsNotStated,
  frameworkPopulationDropped,
  denominatorFaults,
  denominatorsMissingFromQuality
} from '../../src/lib/data-phases-checks';

/* R54 [§S0] — data-phases.ts shipped both counts as fields and asserted
   nothing. Both verify by hand (V4), but the Quality tab reuses this data
   verbatim, so an error propagates to two public tabs with no independent
   check.

   R110 [§S12]: this comment used to state targetCount as 64, which P7's R105
   moved to 66 two sections ago. A count restated in a comment beside the test
   that reads it is a second copy with nothing maintaining it, so the figure is
   gone from here and the assertions below read the field. */

test('R54: the declared metric count equals the distinct metric IDs', () => {
  expect(dataPhaseMetricIds().length).toBe(DATA_PHASE_COUNTS.metricCount);
  expect(DATA_PHASE_COUNTS.metricCount).toBe(26); // V4
});

test('R54: the declared target count equals the per-phase target rows', () => {
  expect(dataPhaseTargetCount()).toBe(DATA_PHASE_COUNTS.targetCount);

  /* R105 [S7]: KPP-T2 and TPP-6.3 gained P8 certification rows, so every
     count this file pins moves by two. Derivation rule 3 names five
     categories that get stricter early floors because a defect can
     directly interrupt care; three were certified at maturity and these
     two were not. */
  /* R104 [S16]: every register metric certified at P8 adds 13 more. */
  expect(DATA_PHASE_COUNTS.targetCount).toBe(79); // V4 + R105 + R104: 5+6+6+7+6+7+9+7+26
});

test('R54: every metric ID conforms to the KPP/TPP pattern', () => {
  // AN5 retracted AB3: TPP-FORM1 and TPP-USE1 are canonical, so the pattern
  // must admit a letter-suffixed form as well as the dotted numeric one.
  expect(dataPhaseIdFormat().nonConforming).toEqual([]);
});

test('R54: no phase target regresses away from its mature target', () => {
  expect(dataPhaseMonotonicity().regressions).toEqual([]);
});

test('R54: framework-basis entries are the seventeen V5 counted, two from R105, thirteen from R104', () => {
  expect(frameworkBasisEntries().length).toBe(32); // V5 + R105 + R104
});

/* R117 [§S2] — the generator validates the vocabulary of `basis` and never the
   claim, while the catalog rollout it already loads carries the framework's own
   entry for every one of them. */

test('R117: every framework-basis target resolves to the catalog entry it claims', () => {
  expect(frameworkBasisDrift()).toEqual([]);
});

test('R117: the check reaches all thirty-two claims and reads the catalog', () => {
  const claims = frameworkBasisClaims();
  expect(claims.length).toBe(32); // V5 + R105 + R104
  expect(claims.every((c) => c.catalogValue !== null)).toBe(true);
  // The P3/P4 Gate 1 floor is the one the phase map used to drop (R121).
  const g1 = claims.filter((c) => c.id === 'TPP-2.1').map((c) => c.phase).sort();
  /* P3 and P4 are the Gate 1 floor R121 restored; P8 is R106's certification */
  expect(g1).toEqual(['P3', 'P4', 'P8']);
});

test('R117: the claims restate the catalog rather than repeating it', () => {
  /* R130 [§S11b] corrected this in data-phases-checks.ts and left the name
     here saying "sixteen of the seventeen". There are nineteen rows and all
     nineteen are reworded, so both figures were wrong; the assertion below
     never depended on either, which is why nothing caught it.
     Why string equality is the wrong instrument: the claims are prose
     restatements of the same quantity, so comparing strings compares the
     wording and comparing the parsed triple compares the claim. */
  const verbatim = frameworkBasisClaims().filter((c) => c.declared === c.catalogValue);
  expect(verbatim.length).toBeLessThan(frameworkBasisClaims().length);
  expect(frameworkBasisDrift()).toEqual([]);
});

/* R57 [§S2] — TPP-11.1 uptime is tracked at P1–P3 and P6–P8 and absent at P4 and
   P5, the phases when hospitals, laboratories and units first depend on the
   rail. Measuring the register found ten metrics with that shape, not one. */

test('R57: every metric that skips a phase declares which phases and why', () => {
  expect(coverageGapDrift()).toEqual([]);
  expect(unreasonedCoverageGaps()).toEqual([]);
});

test('R57: the uptime gap the row filed is one of the declared twenty-three', () => {
  const uptime = DATA_PHASE_GAPS.find((g) => g.id === 'TPP-11.1')!;
  expect(uptime.phases).toEqual(['P4', 'P5']);
  expect(uptime.reason).toMatch(/P5 publishes no continuity measure at all/);
  /* R105 [S7]: 10 -> 12. Certifying KPP-T2 and TPP-6.3 at P8 creates a gap
     for each between its single early measurement and maturity, and both are
     declared. KPP-T2's five-phase gap is the widest any rule-3 category has.
     R104 [S16]: 12 -> 23. Certifying the other thirteen register metrics at
     P8 opens a gap for eleven of them (TPP-12.4 already had one, and TPP-9.1
     is published at P7, next to P8). */
  expect(measuredCoverageGaps().length).toBe(23);
});

/* R56 [§S16]: TPP-2.1 sat at the 75% Gate 1 floor through P4 and then left the
   Data tab for good; the 95% it names for P8 was published nowhere on it. It is
   certified at P8 now, and its P5-P7 gap is declared with the climb named,
   rather than filled with waypoints this register would have to invent (they
   would then override the Quality chapter's computed values there, because a
   data-plan row is authoritative in that catalog). */
test('R56: the claims climb from the Gate 1 floor to maturity is published and declared', () => {
  const rows = DATA_PHASES.flatMap((p) => p.groups.flatMap((g) => g.metrics
    .filter((m) => m.id === 'TPP-2.1').map((m) => p.id + ' ' + m.phaseTarget)));
  expect(rows).toEqual([
    'P3 ≥75% clean-claim auto-adjudication for Wave I',
    'P4 ≥75% clean-claim auto-adjudication for Wave I',
    'P8 ≥95% clean-claim auto-adjudication nationally'
  ]);
  const gap = DATA_PHASE_GAPS.find((g) => g.id === 'TPP-2.1')!;
  expect(gap.phases).toEqual(['P5', 'P6', 'P7']);
  expect(gap.reason).toMatch(/climb from 75% to 95% has no published waypoint/);
});

test('R57: a metric gaining a gap is not silently absorbed', () => {
  // The declarations are exact, both ways: TPP-10.2's gap is P4 and P5, so a
  // check that only asked "is it declared at all" would pass a metric that
  // stopped being published a phase earlier.
  const gaps = new Map(DATA_PHASE_GAPS.map((g) => [g.id, g.phases.join('+')]));
  for (const measured of measuredCoverageGaps()) {
    expect(gaps.get(measured.id)).toBe(measured.phases.join('+'));
  }
  expect(gaps.size).toBe(measuredCoverageGaps().length);
});

test('R54: every phase carries an id, a year and at least one group', () => {
  expect(DATA_PHASES.length).toBe(9);
  for (const p of DATA_PHASES) {
    expect(p.id).toMatch(/^P[0-8]$/);
    expect(p.year).toBeGreaterThan(0);
    expect(p.groups.length).toBeGreaterThan(0);
  }
});

/* R110 [§S12] — §AB7's test list has seven items and six were written. This is
   the seventh: the uptime justifications state an annualized downtime, and it
   must be the one their percentage implies at 8760 hours a year. */

test('R110: every stated annualized downtime matches its uptime target', () => {
  expect(uptimeDowntimeDrift()).toEqual([]);
});

test('R110: five rows state a downtime figure, and the check reads all five', () => {
  /* Pinned so that deleting a figure fails here rather than emptying the
     drift list above and passing. */
  const rows = uptimeDowntimeRows();
  expect(rows.length).toBe(5);
  expect(rows.map((r) => r.phase)).toEqual(['P1', 'P2', 'P3', 'P6', 'P7']);
  expect(rows.every((r) => r.id === 'TPP-11.1')).toBe(true);

  /* The arithmetic, once, in the open: 99.90% uptime leaves 0.10% of 8760
     hours, which is 8 hours 46 minutes. */
  const p1 = rows.filter((r) => r.phase === 'P1')[0];
  expect(p1.uptimePct).toBe(99.9);
  expect(p1.statedMinutes).toBe(8 * 60 + 46);
  expect(Math.round(p1.impliedMinutes)).toBe(526);
});

/* R104 [§S16]: P8 said it assessed "the complete mesh" and certified 13 of 26.
   R106 [§S16]: KPP-B7's and TPP-2.1's controlled targets named P8, with no P8
   row for either. */
test('R104: every register metric has a P8 row at its controlled target', () => {
  expect(uncertifiedAtMaturity()).toEqual([]);
  const p8 = DATA_PHASES.find((p) => p.id === 'P8')!;
  const ids = new Set(p8.groups.flatMap((g) => g.metrics.map((m) => m.id)));
  expect(ids.size).toBe(dataPhaseMetricIds().length);
  /* and each is the framework's maturity target, not a proposal */
  for (const g of p8.groups) for (const m of g.metrics) expect(m.basis, m.id).toBe('framework');
});

test('R106: a maturity target that names a phase has a row at that phase', () => {
  expect(matureTargetPhasesWithoutRows()).toEqual([]);
  const naming = DATA_PHASES.flatMap((p) => p.groups.flatMap((g) => g.metrics))
    .filter((m) => /\bP[0-8]\b/.test(m.matureTarget)).map((m) => m.id);
  /* not vacuous: the two the row filed both name a phase */
  expect([...new Set(naming)].sort()).toEqual(['KPP-B7', 'TPP-2.1']);
});

/* R299 [§S16]: TPP-10.5 runs 80% of prototype cases in a draft timeframe, then
   90% within the statutory one; TPP-11.2 runs tabletop exercises, then
   downtime exercises, then delivery-setting exercises, then drills. Each read
   as one improving series. Every place a ladder changes what it measures is
   now marked on the row and in the Quality strip. */
test('R299: every change in what a ladder measures is marked, on both tabs', () => {
  expect(scopeChangeDrift()).toEqual([]);
  expect(scopeChangesMissingFromQuality()).toEqual([]);
  const marked = DATA_PHASES.flatMap((p) => p.groups.flatMap((g) => g.metrics
    .filter((m) => m.scopeChange).map((m) => m.id + ' ' + p.id)));
  /* the two ladders the row filed, at every phase where they move */
  expect(marked).toEqual(expect.arrayContaining([
    'TPP-10.5 P1', 'TPP-11.2 P1', 'TPP-11.2 P4', 'TPP-11.2 P8'
  ]));
  expect(marked).toHaveLength(24);
});

/* Review 3 of P22: R299's first test, "no metric's phase ladder changes
   denominator without a visible marker", was held as "no wording change
   without a marker". Derivation rule 4 gives each phase band its own
   denominator; every phase states it now, on the Data tab and in the
   Quality strip. */
test('R299: every phase states its rule-4 denominator, and every crossing is reached', () => {
  const real = denominatorFaults();
  expect(real.faults).toEqual([]);
  /* 45 crossings between bands, counted on 2026-10-09 by a walk with its
     own band table (probes-P22); 27 of them had no marker before */
  expect(real.checked).toBe(45);
  expect(DATA_PHASES.map((p) => p.id + ' ' + p.denominator)).toEqual([
    'P0 test or participating cohorts', 'P1 test or participating cohorts',
    'P2 test or participating cohorts', 'P3 Wave I', 'P4 representative pilots',
    'P5 the scaled network', 'P6 national or expanded-benefit operation',
    'P7 national or expanded-benefit operation', 'P8 the mature national system'
  ]);
  const blank = structuredClone(DATA_PHASES);
  blank.find((p) => p.id === 'P5')!.denominator = '';
  expect(denominatorFaults(blank).faults).toEqual(['P5 publishes targets and states no denominator']);
});

test('R299: every register cell in the Quality strip carries its phase denominator', () => {
  expect(denominatorsMissingFromQuality()).toEqual([]);
  const ladder = QUALITY_DATA.parameters.find((p) => p.id === 'TPP-7.1')!.rollout
    .map((e) => e.phase + ' ' + (e.denominator || '-'));
  /* the crossing the review named: pilots at P4, the scaled network at P5;
     the equation's own P6 and P7 values are not register rows */
  expect(ladder).toEqual(expect.arrayContaining(['P4 representative pilots', 'P5 the scaled network', 'P6 -']));
  const Q = structuredClone(QUALITY_DATA);
  delete Q.parameters.find((p) => p.id === 'TPP-7.1')!.rollout.find((e) => e.phase === 'P5')!.denominator;
  expect(denominatorsMissingFromQuality(undefined, Q)).toEqual(['TPP-7.1 P5']);
});

test('R299: the population is stated in every phase target string', () => {
  expect(targetsNotNamingTheirMeasure()).toEqual([]);
  const changes = populationsNotStated();
  const framework = frameworkPopulationDropped();
  expect(changes.faults).toEqual([]);
  expect(framework.faults).toEqual([]);
  /* reach: every declared change and every framework row, counted from the
     payload by a walk that is not the checks' own */
  const rows = DATA_PHASES.flatMap((p) => p.groups.flatMap((g) => g.metrics));
  expect(changes.checked).toBe(rows.filter((m) => m.scopeChange).length);
  expect(framework.checked).toBe(rows.filter((m) => m.basis === 'framework').length);
  expect(changes.checked * framework.checked).toBeGreaterThan(0);
  /* a register with neither checks nothing, and says so */
  const bare = structuredClone(DATA_PHASES);
  bare.forEach((p) => p.groups.forEach((g) => g.metrics.forEach((m) => { delete m.scopeChange; m.basis = 'derived'; })));
  expect(populationsNotStated(bare)).toEqual({ checked: 0, faults: [] });
  expect(frameworkPopulationDropped(bare)).toEqual({ checked: 0, faults: [] });
});

/* Review 2 of P22: the three checks, each handed a copy of the register with
   the defect it is for put back. The first two are the strings the review
   found: a change left to the note, and a controlled population dropped. */
function withTarget(id: string, phase: string, phaseTarget: string): typeof DATA_PHASES {
  const copy = structuredClone(DATA_PHASES);
  const m = copy.find((p) => p.id === phase)!.groups.flatMap((g) => g.metrics).find((x) => x.id === id)!;
  m.phaseTarget = phaseTarget;
  return copy;
}

test('R299: a declared change left to the note is reported', () => {
  expect(populationsNotStated(withTarget('TPP-1.1', 'P8', '≥99.8% match accuracy')).faults).toEqual([
    'TPP-1.1 P8: "≥99.8% match accuracy" leaves "the mature national system" to the note'
  ]);
  /* a string that only repeats the metric's name passes the measure check */
  expect(targetsNotNamingTheirMeasure(withTarget('TPP-1.1', 'P8', '≥99.8% match accuracy'))).toEqual([]);
  /* the metric's own name is not the new population: "API conformance"
     repeats the name and says nothing of the national suite */
  expect(populationsNotStated(withTarget('TPP-10.6', 'P6', '≥97% API conformance')).faults).toEqual([
    'TPP-10.6 P6: "≥97% API conformance" leaves "the national conformance suite" to the note'
  ]);
  /* where the name already says the new population, its own words count */
  expect(populationsNotStated(withTarget('TPP-11.2', 'P1', '≥90% of exercises passed')).faults).toEqual([
    'TPP-11.2 P1: "≥90% of exercises passed" leaves "downtime exercises only" to the note'
  ]);
});

test('R299: a framework row that drops its controlled population is reported', () => {
  expect(frameworkPopulationDropped(withTarget('TPP-10.2', 'P8', '≥95% medication-record completeness')).faults).toEqual([
    'TPP-10.2 P8: "≥95% medication-record completeness" drops "covered persons" from ">=95% covered persons"'
  ]);
  /* the controlled value is read from a catalog-authored entry, never from
     one an enricher wrote from this register at the same phase */
  const Q = structuredClone(QUALITY_DATA);
  const p = Q.parameters.find((x) => x.id === 'TPP-10.2')!;
  p.rollout.unshift({ ...p.rollout.find((e) => e.phase === 'P8')!, kind: 'data-plan interim target',
    value: '≥95% medication-record completeness' });
  expect(frameworkPopulationDropped(withTarget('TPP-10.2', 'P8', '≥95% medication-record completeness'), Q).faults)
    .toHaveLength(1);
  /* phase and gate wording is not a population */
  expect(frameworkPopulationDropped(withTarget('TPP-2.1', 'P3', '≥75% clean-claim auto-adjudication for Wave I')).faults).toEqual([]);
});

test('R299: a target that names nothing of its measure is reported', () => {
  expect(targetsNotNamingTheirMeasure(withTarget('TPP-2.1', 'P8', '≥95% by P8'))).toEqual([
    'TPP-2.1 P8: ≥95% by P8'
  ]);
});
