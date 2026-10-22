import { afterEach, expect, test } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { QUALITY_DATA } from '../../src/lib/quality';
import type { QualityData } from '../../src/lib/quality-data';
import {
  catalogCountDrift, conceptVocabularyFaults, conceptWhereDrift,
  generatedPayloadAuditCodes,
  GOVERNANCE_CONCEPT, kppConceptFallthrough
} from '../../src/lib/catalog-check';
import {
  additionsRegisterDrift, catalogIdReferences, catalogTraceDrift, registerRowFaults, sourceText
} from '../../src/lib/manifest-check';

/* R303 [§S16]: read quality-data.ts locally, and make the two things that
   reading established into build checks: the declared counts equal the
   records, and every id another module names is a record. */

function clone(): QualityData {
  return JSON.parse(JSON.stringify(QUALITY_DATA)) as QualityData;
}

test('R303: the live catalog\'s declared counts equal its records', () => {
  expect(catalogCountDrift()).toEqual([]);
  /* Measured independently of the declaration, so the check is not reading
     its own expectation back. */
  const byType = { KPP: 0, TPP: 0, CP: 0 } as Record<string, number>;
  QUALITY_DATA.parameters.forEach((p) => { byType[p.type] += 1; });
  expect(byType).toEqual({ KPP: 46, TPP: 85, CP: 310 });
});

test('R303: a declared count that disagrees with the records is reported', () => {
  const Q = clone();
  Q.counts.TPP = 84;
  expect(catalogCountDrift(Q)).toEqual(['declares 84 TPP, carries 85']);
});

test('R303: a record moved between types keeps the total and is still reported', () => {
  /* The vitest pins checked the total against the record list, and a record
     retyped from TPP to KPP leaves the total unchanged. */
  const Q = clone();
  const tpp = Q.parameters.find((p) => p.type === 'TPP')!;
  tpp.type = 'KPP';
  expect(catalogCountDrift(Q)).toEqual([
    'declares 46 KPP, carries 47',
    'declares 85 TPP, carries 84'
  ]);
});

test('R303: a duplicated id is reported even when the counts are bumped to match', () => {
  const Q = clone();
  const kpp = Q.parameters.find((p) => p.type === 'KPP')!;
  Q.parameters.push({ ...kpp });
  Q.counts.KPP += 1;
  Q.counts.total += 1;
  expect(catalogCountDrift(Q)).toEqual(['id ' + kpp.id + ' names two records']);
});

test('R303: every catalog id the modules name resolves, and the scan read some', () => {
  const scan = catalogIdReferences();
  expect(scan.unresolved).toEqual([]);
  /* Hundreds today; a floor well under that catches a scan that read
     nothing without pinning a count every new reference would break. */
  expect(scan.references).toBeGreaterThan(300);
  expect(scan.files).toBeGreaterThan(10);
});

const roots: string[] = [];
afterEach(() => { while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true }); });
function fixture(body: string): string {
  /* One root per case: sourceText memoises by root and path (trap 33). */
  const root = mkdtempSync(join(tmpdir(), 'nha-ids-'));
  roots.push(root);
  mkdirSync(join(root, 'src', 'lib'), { recursive: true });
  writeFileSync(join(root, 'src', 'lib', 'probe.ts'), body, 'utf8');
  return root;
}
const scanOf = (body: string) =>
  catalogIdReferences(fixture(body), QUALITY_DATA, ['src/lib/probe.ts']);

test('R303: each id form that is not a record is refused', () => {
  const s = scanOf(
    "export const A = ['KPP-A99', 'TPP-99.9', 'TPP-NOPE1', 'CP-POP-004a', 'CP-POP-999'];\n"
  );
  expect(s.unresolved).toEqual([
    'src/lib/probe.ts:1 KPP-A99',
    'src/lib/probe.ts:1 TPP-99.9',
    'src/lib/probe.ts:1 TPP-NOPE1',
    'src/lib/probe.ts:1 CP-POP-004a',
    'src/lib/probe.ts:1 CP-POP-999'
  ]);
});

/* R119 [§S16]: kpp_concept() ended `return CONCEPTS[10]`, filing an unknown
   KPP domain under governance in silence. It raises now; this is the half the
   build can hold, read off the catalog the extractor produced. */
test('R119: no framework KPP sits under governance unless its domain is a transition one', () => {
  expect(kppConceptFallthrough()).toEqual([]);
  const gov = QUALITY_DATA.parameters.filter((p) =>
    p.type === 'KPP' && p.concept === GOVERNANCE_CONCEPT);
  /* not vacuous: the legitimate route is taken today */
  expect(gov.length).toBeGreaterThan(0);
  for (const p of gov) expect(p.where.toLowerCase().startsWith('transition'), p.id).toBe(true);
});

test('R119: a KPP filed under governance from another domain is reported', () => {
  const Q = clone();
  const kpp = Q.parameters.find((p) => p.type === 'KPP' && p.provenance === 'framework' &&
    !p.where.toLowerCase().startsWith('transition'))!;
  kpp.concept = GOVERNANCE_CONCEPT;
  expect(kppConceptFallthrough(Q)).toEqual([kpp.id + ' (' + kpp.where + ')']);
});

test('R119: a renamed concept is reported rather than matching nothing', () => {
  const Q = clone();
  Q.concepts = Q.concepts.map((c) => (c === GOVERNANCE_CONCEPT ? 'Governance' : c));
  expect(kppConceptFallthrough(Q)).toEqual([
    'the catalog declares no concept named "' + GOVERNANCE_CONCEPT + '"'
  ]);
});

/* R302 [§S16]: concept and where were one value on all 85 TPPs, because the
   extractor copied the concept for want of a trace column. */
test('R302: no record repeats its concept as its trace, and the split is by type', () => {
  expect(conceptWhereDrift()).toEqual([]);
  const byType = { KPP: 0, TPP: 0, CP: 0 } as Record<string, number>;
  QUALITY_DATA.parameters.forEach((p) => { if (p.where) byType[p.type] += 1; });
  expect(byType).toEqual({ KPP: 46, TPP: 0, CP: 310 });
});

test('R302: each way back to one value shown twice is reported', () => {
  const Q = clone();
  const tpp = Q.parameters.find((p) => p.type === 'TPP')!;
  const kpp = Q.parameters.find((p) => p.type === 'KPP')!;
  const cp = Q.parameters.find((p) => p.type === 'CP')!;
  tpp.where = tpp.concept;      /* the old extractor */
  kpp.where = kpp.concept;      /* a hand edit */
  cp.where = '';                /* emptying instead of fixing */
  expect(conceptWhereDrift(Q)).toEqual([
    kpp.id + ' repeats its concept as its trace',
    tpp.id + ' repeats its concept as its trace',
    tpp.id + ' (TPP) carries a trace the TPP dictionary does not',
    cp.id + ' (CP) has no trace'
  ]);
});

/* P22 new finding: the Data tab's P8 section opened "R105: derivation rule
   3 ..." in the browser. Client-rendered from the generated payload, so the
   .astro comment check P20 wrote could not see it. */
test('P22: no audit code reaches a page through the generated catalogs', () => {
  const scan = generatedPayloadAuditCodes();
  expect(scan.hits).toEqual([]);
  /* thousands of strings: the Data tab's fields and 727 rollout rows */
  expect(scan.read).toBeGreaterThan(1000);
});

test('P22: an audit code in a rollout interpretation is reported, with where it is', () => {
  const Q = clone();
  const p = Q.parameters.find((x) => x.type === 'KPP')!;
  p.rollout[0].interpretation = 'Per R105, the floor holds.';
  const hits = generatedPayloadAuditCodes(Q).hits.filter((h) => h.startsWith('Quality'));
  expect(hits).toEqual(['Quality ' + p.id + '@' + p.rollout[0].phase +
    ' interpretation renders a recommendation number ("R105")']);
});

/* Review of P22: the plan-defined KPPs were outside the R119 check. */
test('R119: a plan-defined KPP filed under governance is reported too', () => {
  const Q = clone();
  const w3 = Q.parameters.find((p) => p.id === 'KPP-W3')!;
  expect(w3.provenance).toBe('plan-defined');
  w3.concept = GOVERNANCE_CONCEPT;
  expect(kppConceptFallthrough(Q)).toEqual(['KPP-W3 (' + w3.where + ')']);
});

test('every record is filed under a declared concept, and every concept is used', () => {
  expect(conceptVocabularyFaults()).toEqual([]);
  const Q = clone();
  Q.parameters[0]!.concept = 'Coverage and affordability';
  Q.concepts.push('An empty concept');
  expect(conceptVocabularyFaults(Q)).toEqual([
    Q.parameters[0]!.id + ' is filed under an undeclared concept "Coverage and affordability"',
    'the concept "An empty concept" groups no record'
  ]);
});

test('R303: real ids pass and a dead id in a comment is documentation', () => {
  const s = scanOf(
    "/* the seed once invented CP-POP-004a */\n" +
    "// KPP-A99 was never a record\n" +
    "export const A = ['KPP-A1', 'KPP-TRUST1', 'TPP-2.1', 'TPP-FORM1', 'CP-POP-004'];\n"
  );
  expect(s.unresolved).toEqual([]);
  expect(s.references).toBe(5);
});

/* R165 [§S16]: one register for what the plan added after the controlled
   framework, held to the catalog's provenance marks and gov.ts's declaration
   in both directions. */
test('R165: the additions register lists exactly the plan-defined records and entities', () => {
  expect(additionsRegisterDrift()).toEqual([]);
  expect(QUALITY_DATA.parameters.filter((p) => p.provenance === 'plan-defined')).toHaveLength(11);
});

/* Owner, 2026-10-12: each addition keeps its own table. The checks read
   only the first "### Catalog records" until KPP-E6's section added a
   second; both are read now, and a fault in the second is reported. */
test('owner 2026-10-12: a second Catalog records table is held like the first', () => {
  const real = sourceText('research/post_framework_additions.md');
  const marker = '\n### Catalog records\n';
  expect(real.split(marker).length - 1).toBe(2);
  const dropped = real.replace(/\| KPP-E6 \|[^\n]*\n/, '');
  expect(additionsRegisterDrift(registerFixture(dropped))).toEqual(['KPP-E6 is plan-defined in the catalog and not in the register']);
  const undated = real.replace('| >=98% | 2026-10-13, `484ab7a` |', '| >=98% | October |');
  expect(registerRowFaults(undated, 'Catalog records')).toEqual(['Catalog records KPP-E6: Added reads "October", not a date and a commit']);
});

function registerFixture(text: string): string {
  const root = mkdtempSync(join(tmpdir(), 'nha-reg-'));
  roots.push(root);
  mkdirSync(join(root, 'research'), { recursive: true });
  writeFileSync(join(root, 'research', 'post_framework_additions.md'), text, 'utf8');
  return root;
}

test('R165: a missing record, a stale record and an undeclared entity are each reported', () => {
  const real = sourceText('research/post_framework_additions.md');
  const edited = real
    .replace('| KPP-W5 | KPP |', '| KPP-A1 | KPP |')          /* one dropped, one stale */
    .replace('| HCRB | Health Credential Recognition Board |', '| NPCB | Pay board |');
  expect(additionsRegisterDrift(registerFixture(edited)).sort()).toEqual([
    'HCRB is declared added in gov.ts and not in the register',
    'KPP-A1 is in the register and not marked plan-defined in the catalog',
    'KPP-W5 is plan-defined in the catalog and not in the register',
    'NPCB is in the register and not declared added in gov.ts'
  ]);
});

/* Review 2 of P22: the row asks for date, rationale and source status for
   every addition; the governance table had none of the three. */
test('R165: every row of both register tables states when, why and on what source', () => {
  const real = sourceText('research/post_framework_additions.md');
  expect(registerRowFaults(real, 'Catalog records')).toEqual([]);
  expect(registerRowFaults(real, 'Governance entities')).toEqual([]);
  const edited = real
    .replace('| AHWCS | 2026-08-01, `2b187d4` | One accountable body', '| AHWCS | August | One accountable body')
    .replace(/(\| HCRB \| .*?\| )Not in the framework\. [^|]*\|/, '$1 |')
    .replace('| Id | Type | Name | Target | Added | Why it is in the plan | Source status |',
      '| Id | Type | Name | Target | Added | Why it is in the plan | Status |');
  expect(registerRowFaults(edited, 'Catalog records')).toEqual(['Catalog records: no "Source status" column']);
  expect(registerRowFaults(edited, 'Governance entities')).toEqual([
    'Governance entities NHTIB: Added reads "August", not a date and a commit',
    'Governance entities HCRB: empty "Source status"'
  ]);
  expect(additionsRegisterDrift(registerFixture(edited))).toHaveLength(3);
  /* a register without the section: the row check says so, and the drift
     check reports every entity it can no longer find */
  const noEntities = real.slice(0, real.indexOf('\n### Governance entities\n'));
  expect(registerRowFaults(noEntities, 'Governance entities')).toEqual(['Governance entities: no such table']);
  expect(additionsRegisterDrift(registerFixture(noEntities))).toEqual(expect.arrayContaining([
    'NHTIB is declared added in gov.ts and not in the register',
    'HCRB is declared added in gov.ts and not in the register',
    'Governance entities: no such table'
  ]));
});

test('R165: every framework record is in the extract, and no plan-defined one is', () => {
  expect(catalogTraceDrift()).toEqual([]);
  const Q = clone();
  Q.parameters.find((p) => p.id === 'KPP-W2')!.provenance = 'framework';
  Q.parameters.find((p) => p.id === 'KPP-A1')!.provenance = 'plan-defined';
  expect(catalogTraceDrift(undefined, Q)).toEqual([
    'KPP-A1 is marked plan-defined and the extract names it',
    'KPP-W2 is marked framework and the extract does not name it'
  ]);
});

test('R165: an entity declared added that does not exist is reported', () => {
  const real = sourceText('research/post_framework_additions.md');
  expect(additionsRegisterDrift(registerFixture(real), QUALITY_DATA, ['NHTIB', 'HCRB'], [{ members: [{ code: 'NHTIB' }] }]))
    .toEqual(['HCRB is declared added and is not a governance entity']);
});
