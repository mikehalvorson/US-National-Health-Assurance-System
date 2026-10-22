import { expect, test } from 'vitest';
import {
  crossDocumentDrift, frameworkDocument, ID_KINDS, sourcePackage
} from '../../src/lib/source-package';

/* R132 [§S18]: the cross-document count check the audit found free and
   already passing (310 CP / 41 KPP / 79 TPP from both extracts, the same
   twenty CP families). Held as id sets rather than counts, so two documents
   that each lost a different id still fail, and widened to the 228
   requirements, which the same two documents define. */

test('R132: the two upstream documents define the same ids and cost families', () => {
  const r = crossDocumentDrift();
  expect(r.faults).toEqual([]);
  expect(r.counts).toEqual({
    CP: { sourcePackage: 310, framework: 310 },
    KPP: { sourcePackage: 41, framework: 41 },
    TPP: { sourcePackage: 79, framework: 79 },
    SR: { sourcePackage: 183, framework: 183 },
    PR: { sourcePackage: 45, framework: 45 }
  });
  expect(r.families).toBe(20);
  /* the family table is read, not only the definitions: twenty declared */
  expect(frameworkDocument().declaredFamilies.size).toBe(20);
  expect([...frameworkDocument().declaredFamilies.values()].reduce((a, b) => a + b, 0)).toBe(310);
  /* and the reader saw the shapes it is for: dictionary targets and the
     requirements' traces */
  expect(sourcePackage().targets.size).toBe(41 + 79);
  expect(sourcePackage().requirements.get('PR-SCH-010')!.trace).toEqual(['TPP-2.1', 'SN-06']);
});

test('R132: a divergence in either direction, or in a family count, is reported', () => {
  const sp = sourcePackage(), fw = frameworkDocument();
  const lost = new Set(sp.ids); lost.delete('TPP-2.1');
  expect(crossDocumentDrift({ ids: lost, families: sp.families }, fw).faults)
    .toEqual(['TPP: 1 only in the framework document (TPP-2.1)']);
  const extra = new Set(sp.ids); extra.add('SR-COV-099');
  expect(crossDocumentDrift({ ids: extra, families: sp.families }, fw).faults)
    .toEqual(['SR: 1 only in the Source Package (SR-COV-099)']);
  /* each document losing a different id: equal counts, unequal sets */
  const a = new Set(sp.ids); a.delete('KPP-A1');
  const b = { ...fw, ids: new Set(fw.ids) }; b.ids.delete('KPP-A2');
  expect(crossDocumentDrift({ ids: a, families: sp.families }, b).faults).toEqual([
    'KPP: 1 only in the Source Package (KPP-A2)', 'KPP: 1 only in the framework document (KPP-A1)'
  ]);
  const fams = new Map(sp.families); fams.set('TOT', 9);
  expect(crossDocumentDrift({ ids: sp.ids, families: fams }, fw).faults)
    .toEqual(['CP-TOT: Source Package 9, framework document 10, its Table G-1 declares 10']);
  const declared = { ...fw, declaredFamilies: new Map(fw.declaredFamilies) };
  declared.declaredFamilies.delete('OFF');
  expect(crossDocumentDrift({ ids: sp.ids, families: sp.families }, declared).faults)
    .toEqual(['CP-OFF: Source Package 20, framework document 20, its Table G-1 declares absent']);
  /* a reader that found nothing compared nothing, and says so */
  expect(crossDocumentDrift({ ids: new Set(), families: new Map() }, { ids: new Set(), families: new Map(), declaredFamilies: new Map() }).faults)
    .toEqual(ID_KINDS.map((k) => k + ': the Source Package defines none, so nothing was compared'));
});

/* R58 [§S18]: the Data tab's targets marked as the plan's own, against the
   Source Package. The count the row expected (seventeen) is thirty-two since
   P7 and P22 added maturity rows; it is held where it was, in
   data-phases.test.ts. */
test('R58: every target the plan specifies resolves against the Source Package', async () => {
  const { frameworkClaimsAgainstSourcePackage } = await import('../../src/lib/source-package');
  const { frameworkBasisEntries } = await import('../../src/lib/data-phases-checks');
  const claims = frameworkClaimsAgainstSourcePackage();
  expect(claims.filter((c) => c.problem)).toEqual([]);
  expect(claims).toHaveLength(frameworkBasisEntries().length);
  /* the six below maturity are AB6's five gate and milestone floors, read
     from the requirements that set them */
  expect(claims.filter((c) => c.via === 'requirement').map((c) => c.phase + ' ' + c.id + ' ' + c.resolvedBy)).toEqual([
    'P3 TPP-2.1 PR-SCH-010', 'P4 TPP-2.1 PR-SCH-010', 'P5 KPP-B7 PR-SCH-006',
    'P6 KPP-B7 PR-SCH-011', 'P6 KPP-B9 PR-SCH-012', 'P7 TPP-9.1 PR-SCH-013'
  ]);
  expect(claims.filter((c) => c.via === 'dictionary').every((c) => c.phase === 'P8')).toBe(true);
});

test('R58: a target the Source Package does not set is reported, at maturity and below it', async () => {
  const { frameworkClaimsAgainstSourcePackage } = await import('../../src/lib/source-package');
  const { requirementBound } = await import('../../src/lib/requirements');
  const { DATA_PHASES } = await import('../../src/lib/data-phases');
  const withTarget = (phase: string, id: string, value: string): typeof DATA_PHASES => {
    const copy = structuredClone(DATA_PHASES);
    copy.find((p) => p.id === phase)!.groups.flatMap((g) => g.metrics).find((m) => m.id === id && m.basis === 'framework')!.phaseTarget = value;
    return copy;
  };
  expect(frameworkClaimsAgainstSourcePackage(withTarget('P8', 'KPP-A1', '≥99.4% continuous coverage')).filter((c) => c.problem)
    .map((c) => c.phase + ' ' + c.id + ': ' + c.problem))
    .toEqual(['P8 KPP-A1: declares "≥99.4% continuous coverage", the Source Package\'s target is ">=99.5%"']);
  expect(frameworkClaimsAgainstSourcePackage(withTarget('P6', 'KPP-B9', '≤4 unsafe under-referrals per 10,000 non-escalated encounters')).filter((c) => c.problem)
    .map((c) => c.phase + ' ' + c.id))
    .toEqual(['P6 KPP-B9']);
  /* the comparator counts: at most 75% is not at least 75% */
  expect(frameworkClaimsAgainstSourcePackage(withTarget('P3', 'TPP-2.1', '≤75% clean-claim auto-adjudication for Wave I')).filter((c) => c.problem)
    .map((c) => c.phase + ' ' + c.id)).toEqual(['P3 TPP-2.1']);
  /* a requirement's bound is the number after its comparator phrase, not
     its first number, which is often a phase */
  expect(requirementBound('The project shall not proceed from Phase 3 to Phase 4 unless clean-claim auto-adjudication is at least 75% for wave I medical claims.'))
    .toMatchObject({ num: 75, cmp: '>=', unit: '%' });
  expect(requirementBound('unless unsafe under-referral is no greater than 5 per 10,000 non-escalated unit encounters.'))
    .toMatchObject({ num: 5, cmp: '<=', unit: 'per10k' });
  expect(requirementBound('The system shall require a structured referral packet for every non-emergency specialist referral.')).toBeNull();
});

/* Review of P24: R58 reads a dictionary target the way R169 does. An
   improvement metric's target is written "baseline +25 percentage points";
   parseNum reads that with no comparator, so the same claim resolved in one
   check and not the other. */
test('R58: an improvement target is read as the floor it is', async () => {
  const { frameworkClaimsAgainstSourcePackage } = await import('../../src/lib/source-package');
  const { DATA_PHASES } = await import('../../src/lib/data-phases');
  const copy = structuredClone(DATA_PHASES);
  const p8 = copy.find((p) => p.id === 'P8')!;
  const m = p8.groups.flatMap((g) => g.metrics).find((x) => x.basis === 'framework')!;
  m.phaseTarget = '≥25 percentage points above baseline';
  const targets = new Map(sourcePackage().targets);
  targets.set(m.id, 'baseline +25 percentage points');
  const claims = frameworkClaimsAgainstSourcePackage(copy, { targets, requirements: sourcePackage().requirements });
  expect(claims.find((c) => c.id === m.id && c.phase === 'P8')!.problem).toBe('');
});

/* Review 3 of P24: the structural findings of the third review. */
test('review 3 of P24: a claim is read the way the target is, so one worded like the dictionary agrees with itself', async () => {
  const { frameworkClaimsAgainstSourcePackage } = await import('../../src/lib/source-package');
  const { DATA_PHASES } = await import('../../src/lib/data-phases');
  const phases = structuredClone(DATA_PHASES);
  const last = phases[phases.length - 1]!;
  const metric = last.groups.flatMap((g) => g.metrics).find((m) => m.basis === 'framework')!;
  metric.phaseTarget = 'baseline +25 percentage points';
  const targets = new Map(sourcePackage().targets);
  targets.set(metric.id, 'baseline +25 percentage points');
  const mine = frameworkClaimsAgainstSourcePackage(phases, { targets, requirements: sourcePackage().requirements })
    .filter((c) => c.id === metric.id && c.phase === last.id);
  expect(mine.map((c) => c.problem)).toEqual(['']);
  expect(mine.map((c) => c.via)).toEqual(['dictionary']);
});

test('review 3 of P24: one requirement read for the pages, one record lookup, one CP parser', async () => {
  const { requiredBound } = await import('../../src/lib/source-package');
  const { qualityRecord } = await import('../../src/lib/quality');
  const { CP_DEFINITIONS, extractDisagreements } = await import('../../src/lib/baseline-registry');
  expect(requiredBound('SR-DATA-010', 'a percentage', (b) => b.unit === '%').num).toBe(99);
  expect(() => requiredBound('SR-ZZZ-999', 'anything', () => true)).toThrow(/not a requirement/);
  expect(() => requiredBound('SR-DATA-010', 'a dollar figure', (b) => b.unit === 'money')).toThrow(/does not state a dollar figure/);
  expect(qualityRecord('TPP-11.1').id).toBe('TPP-11.1');
  expect(() => qualityRecord('TPP-99.9')).toThrow(/not a record/);
  /* the registry check reads the extract's CP names through sourcePackage() */
  expect(sourcePackage().cpNames.size).toBe(CP_DEFINITIONS.size);
  expect(extractDisagreements()).toEqual([]);
});
