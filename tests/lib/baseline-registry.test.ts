import { expect, test } from 'vitest';
import {
  BASELINE_ROWS, CP_DEFINITIONS, MEASURES_STATUSES, PRIORITY_EXEMPT, VALUE_TYPES,
  baselineIdProblems, baselineRow, bindProblems, definitionNamespaceLeaks,
  extractDisagreements, flaggedPriorityParameters, idsResolvingToTwoDefinitions,
  boundCuts, definedResearchIds,
  letterSuffixedIdentifiers, letterSuffixedOrigins, measuresStatusCounts,
  multiBindProblems, parseCsv, researchReferenceProblems,
  CP_MIRROR_DIVERGENCES, definitionMirrorDisagreements, staleMirrorDivergences,
  resolveDefinition, stalePriorityExemptions, unseededPriorityParameters, valueTypeProblems
} from '../../src/lib/baseline-registry';
import { NHA_QUALITY_DATA } from '../../src/lib/quality-data';

/* R129 [§S10]: two registries claimed the CP-* prefix, so 57 of 80 seed ids
   and 143 of 160 research ids bound a different quantity than the canonical id
   of the same name. Nothing errored; the numbers were simply wrong. These tests
   hold the separation in place: CP-* defines, BL-* measures, RB-* is evidence,
   and every join throws rather than binding silently. */

test('R129: CP-* is definition-only, and no other file defines one', () => {
  expect(definitionNamespaceLeaks()).toEqual([]);
});

test('R129: the extract exemption is not a free pass, so the two must agree', () => {
  expect(extractDisagreements()).toEqual([]);
  expect(CP_DEFINITIONS.size).toBe(310);
});

test('AN2: the definition layer holds no values, which is why a remap was impossible', () => {
  const withValue = Array.from(CP_DEFINITIONS.values()).filter((d) => d.name === '');
  expect(withValue).toEqual([]);
  /* 50 of 310 carry a definition and 32 a unit. §AN2 and §8.0.3 both say all
     310 do; measured 2026-08-27, they do not, and a mapping pass that expected
     a definition on every row would have had nothing to read on 260 of them. */
  const defined = Array.from(CP_DEFINITIONS.values()).filter((d) => d.definition.trim() !== '');
  expect(defined.length).toBe(50);
});

test('R129: measurement ids are sequential, unique and non-semantic', () => {
  expect(baselineIdProblems()).toEqual([]);
  expect(BASELINE_ROWS[0].baselineId).toBe('BL-0001');
  expect(BASELINE_ROWS.every((r) => /^BL-[0-9]{4}$/.test(r.baselineId))).toBe(true);
});

test('R129: no BL number reuses a CP number from the row it replaced', () => {
  for (const r of BASELINE_ROWS) {
    if (!r.supersededId) continue;
    expect(r.baselineId).not.toBe(r.supersededId);
    expect(r.baselineId.replace('BL-', '')).not.toBe(r.supersededId.replace(/^CP-[A-Z]+-/, ''));
  }
});

test('R129: every row declares measures and measures_status, and every bind resolves', () => {
  expect(bindProblems()).toEqual([]);
  for (const r of BASELINE_ROWS) expect(MEASURES_STATUSES).toContain(r.measuresStatus);
});

test('R129: the resolver returns the canonical record for a mapped row', () => {
  const mapped = BASELINE_ROWS.find((r) => r.measuresStatus === 'mapped');
  expect(mapped).toBeDefined();
  const def = resolveDefinition(mapped!.baselineId);
  expect(def.id).toBe(mapped!.measures);
  expect(def.name.length).toBeGreaterThan(0);
});

test('R129: the resolver THROWS on every miss rather than binding silently', () => {
  /* Copied from tools/build_data_phase_targets.py, which raises
     ValueError(f"Unknown KPP/TPP: {identifier}") rather than returning a
     default. A silent default is how a hospital count came to stand in for
     $1.5T of hospital spending. */
  expect(() => baselineRow('BL-9999')).toThrow(/Unknown baseline id/);
  expect(() => resolveDefinition('BL-9999')).toThrow(/Unknown baseline id/);

  const unbound = BASELINE_ROWS.find((r) => r.measuresStatus !== 'mapped');
  expect(unbound).toBeDefined();
  expect(() => resolveDefinition(unbound!.baselineId)).toThrow(/declares no canonical parameter/);
});

test('R236 / B1: no id resolves to two definitions after the split', () => {
  expect(idsResolvingToTwoDefinitions()).toEqual([]);
});

test('R236 / J3: the letter-suffix invention is gone as an id and kept as a fact', () => {
  /* They were never invalid. They were expressing a cardinality the id scheme
     could not carry, and now `measures` plus `disaggregation` carries it. */
  expect(letterSuffixedIdentifiers()).toEqual([]);
  const origins = letterSuffixedOrigins();
  expect(origins.length).toBe(15);
  for (const r of origins) {
    expect(r.disaggregation.length).toBeGreaterThan(0);
    expect(BASELINE_ROWS.filter((o) => o.baselineId === r.baselineId).length).toBe(1);
  }
});

test('R236 / J3: the six NHE category rows are six rows, not one', () => {
  const cats = letterSuffixedOrigins().filter((r) => r.supersededId.startsWith('CP-TOT-004'));
  expect(cats.length).toBe(6);
  /* §8.0.3 says they all carry measures = CP-TOT-004. They do not, and must
     not: canonical CP-TOT-004 is "Public share of system cost", not "NHE by
     category", and that reading comes from research/01, which is the measurement
     layer. Binding them to it would be matching by id, which §8.0.3 point 7
     forbids in the same breath. */
  expect(CP_DEFINITIONS.get('CP-TOT-004')!.name).toBe('Public share of system cost');
  expect(cats.map((r) => r.measures)).not.toContain('CP-TOT-004');
});

test('R28: the CBO administrative estimate is not bound to Appeal volume', () => {
  const row = BASELINE_ROWS.find((r) => r.supersededId === 'CP-GOV-002');
  expect(row).toBeDefined();
  expect(row!.description).toMatch(/CBO/);
  expect(row!.unit).toMatch(/percent/);
  /* The backlog says its "canonical id is CP-GOV-007". That is research/05's
     numbering, now RB-05-GOV-007. Canonical CP-GOV-007 is Appeal volume, and a
     dollar-vs-percentage collision is exactly what R28 exists to stop. */
  expect(CP_DEFINITIONS.get('CP-GOV-007')!.name).toBe('Appeal volume');
  expect(row!.measures).toBe('');
  expect(row!.notes).toMatch(/RB-05-GOV-007/);
});

test('R12: a contested parameter is a distribution, not a point with a caveat', () => {
  expect(valueTypeProblems()).toEqual([]);
  const gov = BASELINE_ROWS.find((r) => r.supersededId === 'CP-GOV-001');
  expect(gov!.valueType).toBe('contested-range');
  expect(Number(gov!.valueLow)).toBe(1.3);
  expect(Number(gov!.valueHigh)).toBe(6.4);
});

test('R31: a research-flagged priority parameter reaches the seed or says why not', () => {
  expect(unseededPriorityParameters()).toEqual([]);
  /* The exemption list cannot rot silently in either direction: an exemption
     for a parameter nothing flags any more is stale and fails too. */
  expect(stalePriorityExemptions()).toEqual([]);
  expect(flaggedPriorityParameters().length).toBeGreaterThan(0);
  for (const reason of Object.values(PRIORITY_EXEMPT)) {
    expect(reason.length).toBeGreaterThan(80);
  }
});

test('R31 / C1: both dropped priority parameters are now seeded', () => {
  const blob = BASELINE_ROWS.map((r) => r.description + ' ' + r.notes).join(' ');
  expect(blob).toContain('RB-03-DX-011'); // RAND commercial-to-Medicare multiplier
  expect(blob).toContain('RB-02-UNIT-003'); // FQHC cost per visit
  expect(blob).toContain('RB-04-LTC-011'); // avoided institutionalization
});

test('R129: the CSV reader survives quoted commas, which every notes column has', () => {
  const rows = parseCsv('a,b\n"x,1","he said ""hi"""\n');
  expect(rows).toEqual([['a', 'b'], ['x,1', 'he said "hi"']]);
});

test('R129: the split is reported, not assumed', () => {
  const counts = measuresStatusCounts();
  const total = MEASURES_STATUSES.reduce((n, s) => n + counts[s], 0);
  expect(total).toBe(BASELINE_ROWS.length);
  expect(counts.mapped).toBeGreaterThan(0);
  /* A migration that mapped everything would mean the mapping was done by id
     similarity, which is what produced the 57 collisions. */
  expect(counts['no-canonical-equivalent']).toBeGreaterThan(0);
});

test('every value_type is one of the four and carries the band it claims', () => {
  for (const r of BASELINE_ROWS) expect(VALUE_TYPES).toContain(r.valueType);
});

/* ---- P16 fix run 2 ------------------------------------------------------ */

test('finding 2: every RB-* reference in the file inventory resolves', () => {
  expect(researchReferenceProblems()).toEqual([]);
  /* The check is worth having only if the namespace it validates is large
     enough to typo. It is. */
  expect(definedResearchIds().size).toBeGreaterThan(150);
});

test('finding 2: the reference pattern is wider than the definition pattern', () => {
  /* The defect was RB-01-POP-004a: a letter suffix no heading can carry. A
     reference pattern that ended [a-f]? like the heading pattern would have
     read it as "not an id" and exonerated it. Proven by construction: no
     defined id ends in a letter, so any suffixed reference must be dangling. */
  for (const id of definedResearchIds()) expect(id).not.toMatch(/[a-z]$/);
});

test('finding 3 / 5: two binds withdrawn, and the rows say why', () => {
  for (const id of ['BL-0014', 'BL-0055']) {
    const row = BASELINE_ROWS.find((r) => r.baselineId === id)!;
    expect(row.measuresStatus).toBe('unmapped');
    expect(row.measures).toBe('');
    /* `unmapped` obliges the row to name what it informs, in prose, because
       no code can join on it. An empty notes column would make the status a
       shrug rather than a statement. */
    expect(row.notes).toMatch(/No bind:/);
  }
  const ltc = BASELINE_ROWS.find((r) => r.baselineId === 'BL-0055')!;
  /* The conversion the old `mapped` bind silently assumed is now stated, and
     attributed: the division is this row's, not the source's. */
  expect(ltc.notes).toContain('365');
});

test('finding 4: a canonical parameter measured by several rows says which is the whole', () => {
  expect(multiBindProblems()).toEqual([]);
  const fin = boundCuts('CP-FIN-002');
  expect(fin.total!.baselineId).toBe('BL-0022');
  expect(fin.parts.map((r) => r.baselineId))
    .toEqual(['BL-0017', 'BL-0018', 'BL-0020', 'BL-0021']);
  /* The point of the guard: summing every row that resolves to CP-FIN-002
     counts the $2,050B total AND its parts. boundCuts is the path that does
     not. */
  expect(fin.parts.length + 1).toBe(
    BASELINE_ROWS.filter((r) => r.measures === 'CP-FIN-002').length
  );
});

test('finding 4: the guard can fail, which is the only reason to keep it', () => {
  /* 18 mapped rows carry an empty disaggregation. Each is one edit - binding
     an already-bound canonical id - away from firing this check. A guard whose
     failing set is empty by construction is the trap this campaign keeps
     re-finding, so the room to fail is asserted rather than assumed. */
  const naked = BASELINE_ROWS.filter(
    (r) => r.measuresStatus === 'mapped' && r.disaggregation.trim() === ''
  );
  expect(naked.length).toBeGreaterThan(0);
});

/* ---- P16 fix run 3: findings 6, 7, 8 and 12 ----------------------------- */

test('finding 6: the letter-suffix check asks a question that can be answered wrongly', () => {
  expect(letterSuffixedIdentifiers()).toEqual([]);
  /* The old form filtered BASELINE_ROWS for /[a-f]$/, which baselineIdProblems
     empties by construction. The room to fail is in the RB namespace, whose
     heading pattern accepts a suffix outright - so the check is only worth
     keeping if that namespace is real and unsuffixed by choice, not by rule. */
  const ids = [...definedResearchIds()];
  expect(ids.length).toBeGreaterThan(150);
  expect(/[a-f]?$/.test('RB-01-POP-004a')).toBe(true);
  for (const id of ids) expect(id).not.toMatch(/[a-f]$/);
});

test('finding 7: the resolver returns the definition the row names, for every row', () => {
  /* bindProblems only asks whether `measures` EXISTS in the registry. A
     resolver that ignored its argument would satisfy it and bind every mapped
     row to one wrong parameter. That is the half nothing tested. */
  let mapped = 0;
  let refused = 0;
  for (const r of BASELINE_ROWS) {
    if (r.measuresStatus === 'mapped') {
      expect(resolveDefinition(r.baselineId).id).toBe(r.measures);
      mapped += 1;
    } else {
      expect(() => resolveDefinition(r.baselineId)).toThrow(/declares no canonical parameter/);
      refused += 1;
    }
  }
  expect(mapped).toBeGreaterThan(0);
  expect(refused).toBeGreaterThan(0);
  expect(mapped + refused).toBe(BASELINE_ROWS.length);
  /* Distinct targets, not one definition returned 25 times - the failure the
     naming check exists to catch would still show 25 successful resolves. */
  const targets = new Set(
    BASELINE_ROWS.filter((r) => r.measuresStatus === 'mapped')
      .map((r) => resolveDefinition(r.baselineId).id)
  );
  expect(targets.size).toBeGreaterThan(1);
});

test('finding 8: the position rule is what pins uniqueness and namespace', () => {
  expect(baselineIdProblems()).toEqual([]);
  /* The two deleted clauses were strict subsets. Proven rather than asserted:
     any id that would have tripped them is already unequal to its position's
     expected value, so the position clause has fired first. */
  BASELINE_ROWS.forEach((r, i) => {
    const want = 'BL-' + String(i + 1).padStart(4, '0');
    expect(r.baselineId).toBe(want);
    expect(want).not.toMatch(/^CP-/);
  });
  /* And the properties are still gated, independently, from the files. */
  expect(idsResolvingToTwoDefinitions()).toEqual([]);
});

test('finding 12: a flagged id is matched as a token, not as a substring', () => {
  expect(unseededPriorityParameters()).toEqual([]);
  const flagged = flaggedPriorityParameters();
  expect(flagged.length).toBeGreaterThan(0);
  /* Latent, not live, and the difference is worth recording: no RB id is
     currently a strict prefix of another, so the substring form reported the
     same answer. RB_HEADING has no width rule, so that is a convention and not
     a guarantee. */
  const ids = [...definedResearchIds()];
  const prefixPairs = ids.filter((a) => ids.some((b) => b !== a && b.startsWith(a)));
  expect(prefixPairs).toEqual([]);
  /* The fix itself, exercised on the shape the ids happen not to have yet. */
  const boundary = (id: string, hay: string) =>
    new RegExp('(?<![0-9A-Za-z])' + id + '(?![0-9A-Za-z])').test(hay);
  expect('RB-04-LTC-011'.includes('RB-04-LTC-01')).toBe(true);
  expect(boundary('RB-04-LTC-01', 'seeded as RB-04-LTC-011 in the notes')).toBe(false);
  expect(boundary('RB-04-LTC-011', 'seeded as RB-04-LTC-011 in the notes')).toBe(true);
});

/* ---- P16 fix run 4: findings 14, 15 and 16 ------------------------------ */

test('finding 15: the quality catalog is a second definition source, and it is checked', () => {
  expect(definitionMirrorDisagreements()).toEqual([]);
  expect(staleMirrorDivergences()).toEqual([]);
  /* The claim in research/README.md was not too strong, it was pointed at the
     wrong surface: quality-data.ts carries the WHOLE dictionary. If that ever
     stops being true the mirror check is guarding nothing, so the premise is
     asserted rather than assumed. */
  const mirrored = NHA_QUALITY_DATA.parameters.filter((p: { type: string }) => p.type === 'CP');
  expect(mirrored.length).toBe(CP_DEFINITIONS.size);
  expect(CP_DEFINITIONS.size).toBe(310);
  /* Two real divergences, declared by id with a reason. A declaration with no
     divergence behind it is reported by staleMirrorDivergences, above. */
  expect(Object.keys(CP_MIRROR_DIVERGENCES).sort()).toEqual(['CP-TOT-009', 'CP-TOT-010']);
  for (const reason of Object.values(CP_MIRROR_DIVERGENCES)) {
    expect(reason.length).toBeGreaterThan(60);
  }
});

test('finding 16: no research file heads a section with a CP-* id or family', () => {
  expect(definitionNamespaceLeaks()).toEqual([]);
  /* Nineteen family headings were renamed - `## CP-LTC:` to `## LTC:`. The
     review said twenty and listed nineteen; nineteen is the number, counted
     here rather than propagated. The family word survives because it is the
     same segment the RB ids under it carry. */
  const families = new Set(
    [...definedResearchIds()].map((id) => id.split('-')[2])
  );
  expect(families.size).toBeGreaterThan(10);
  for (const f of ['LTC', 'GOV', 'POP', 'TOT']) expect(families.has(f)).toBe(true);
});
