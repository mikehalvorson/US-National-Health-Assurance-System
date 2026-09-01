import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { expect, test } from 'vitest';
import {
  assertReadmeCountCurrent,
  assertSelfTestsPass,
  equationTargetDiagnostics,
  runGuarded,
  SELF_TEST_SOURCES,
  selfTestSummary
} from '../../src/lib/selftests';
import {
  AUDIT_CODE_IN_RENDERED_TEXT, buildGateWiring, readmeAdvertisedTestCount,
  registryGateCountDrift, registrySurfaceRowCount, renderedSelfTestNameLeaks,
  researchPathCitationLeaks, researchReadmeGateCount, researchReadmeGateList,
  RESEARCH_PATH_EXEMPT, sourceText, staleResearchPathExemptions,
  unsweptSelfTestNameSites
} from '../../src/lib/manifest-check';
import {
  CONFIDENCE_GRADES, isConfidence, isSourcedGrade
} from '../../src/lib/model-types';
import { SOURCED_GRADES } from '../../src/lib/baseline-registry';
import {
  PARAM_DEFS, parameterSourceBacklog, unsourcedGradedParameters
} from '../../src/lib/params';

test('selfTestSummary: every model + bridge + tax self-test passes', () => {
  const s = selfTestSummary();
  expect(s.total).toBeGreaterThanOrEqual(18); // ~11 model + bridge + 7 tax
  expect(s.passed).toBe(s.total);
  expect(s.rows.every((r) => typeof r.name === 'string' && typeof r.ok === 'boolean')).toBe(true);
  // the bridge-identity row is present
  expect(s.rows.some((r) => r.name.includes('Bridge decomposition'))).toBe(true);
});

/* R152 [§S0] — a failing self-test must be able to stop a build. Before this,
   selfTestSummary returned {passed, total} and nothing compared them: a broken
   invariant rendered as a red row in the page footer and the site still shipped. */
test('assertSelfTestsPass: throws, and names every failing row', () => {
  expect(() =>
    assertSelfTestsPass({
      rows: [
        { name: 'a passing invariant', ok: true, note: '' },
        { name: 'a broken invariant', ok: false, note: 'err=1.2' },
        { name: 'another broken one', ok: false, note: '' }
      ],
      total: 3
    })
  ).toThrow(/a broken invariant[\s\S]*another broken one/);
});

test('assertSelfTestsPass: reports the count so a build log states the damage', () => {
  expect(() =>
    assertSelfTestsPass({
      rows: [{ name: 'x', ok: false, note: '' }],
      total: 1
    })
  ).toThrow(/1 of 1/);
});

test('assertSelfTestsPass: silent when every row passes', () => {
  expect(() => assertSelfTestsPass(selfTestSummary())).not.toThrow();
});

/* R154 [§S0] — the model and bridge calls were bare while the tax loop was
   wrapped, so a throw in either took down selfTestSummary entirely and the
   build rendered no self-test section at all: the failure mode most easily
   mistaken for success. */
test('runGuarded: a throwing self-test is reported as a failure, not an absence', () => {
  const row = runGuarded('exploding invariant', () => {
    throw new Error('boom');
  });
  expect(row.name).toBe('exploding invariant');
  expect(row.ok).toBe(false);
  expect(row.note).toContain('boom');
});

test('runGuarded: a passing self-test keeps its own note', () => {
  const row = runGuarded('fine', () => ({ ok: true, note: 'err=1.8e-12' }));
  expect(row).toEqual({ name: 'fine', ok: true, note: 'err=1.8e-12' });
});

test('runGuarded: a runner returning false is a failure', () => {
  expect(runGuarded('nope', () => ({ ok: false, note: '' })).ok).toBe(false);
});

test('selfTestSummary: no row is missing when a surface throws', () => {
  // every registered surface appears as a row, pass or fail
  const s = selfTestSummary();
  expect(s.rows.length).toBe(s.total);
  expect(s.rows.every((r) => r.name.length > 0)).toBe(true);
});

/* R153 [§S0] — phase-targets.ts exports selfTestEveryRelevantPhase and
   selfTestNoRegression and nothing called them. They are the only tests
   covering the module that generates the published phase trajectories. */
test('R153: the two phase-target self-tests are registered', () => {
  const s = selfTestSummary();
  expect(s.rows.some((r) => /relevant phase/i.test(r.name))).toBe(true);
  expect(s.rows.some((r) => /regression/i.test(r.name))).toBe(true);
});

/* R230 [§S0] — equationSelfTests asserts coverage, acyclicity and P8 maturity
   closure over the equation layer, and selftests.ts never imported it. It ran
   under vitest only, so it could not stop a deploy. */
test('R230: equationSelfTests is registered and its messages reach the row note', () => {
  const s = selfTestSummary();
  const row = s.rows.find((r) => /equation/i.test(r.name));
  expect(row).toBeDefined();
  expect(row!.ok).toBe(true);
});

/* R273 [§S0] — fmea.ts states three times that its self-tests gate the build
   and then called console.error. Seven invariants over 1,037 derived failure
   modes, none able to stop a deploy. */
test('R273: fmeaSelfTests is registered', () => {
  const s = selfTestSummary();
  const row = s.rows.find((r) => /failure.mode/i.test(r.name));
  expect(row).toBeDefined();
  expect(row!.ok).toBe(true);
});

/* R248 [§S0] — two detectors, not one. The row's own instrument counts rollout
   entries still carrying kind === 'derived interim target' after import, and
   that count is genuinely 0. But a zero there does NOT mean every equation
   evaluated: a metric/phase pair with no rollout row is computed and dropped,
   so applyEquationTargets never sees it and the kind survives nowhere. */
test('R248: no rollout entry survives applyEquationTargets as a derived interim target', () => {
  expect(equationTargetDiagnostics().kindSurvivors).toEqual([]);
});

test('R248: every non-finite equation result is reported by ID and phase', () => {
  const found = equationTargetDiagnostics().nonFinite
    .map((c) => c.metric + '@' + c.phase)
    .sort();
  // Known and documented, not tolerated silently: these fourteen evaluate NaN
  // at early phases. All fourteen are dropped rather than published, because no
  // rollout row exists at that phase. §S3 owns the equations themselves.
  //
  // Eleven until §S2 fixed the phase->index conversion (R226). P0 resolved ramp
  // index 1 (Year 2) and now resolves index 0 (Year 1), where every build ramp
  // is still zero, so KPP-B5, KPP-E3 and TPP-7.2 divide by a zero build state
  // there too. Each of the three sits well before its own _phaseStart (P4, P5,
  // P4), so none was ever going to be published.
  expect(found).toEqual([
    'KPP-B1@P0',
    'KPP-B5@P0',
    'KPP-D7@P0',
    'KPP-E3@P0',
    'KPP-TRUST1@P0',
    'TPP-7.2@P0',
    'TPP-9.3@P0', 'TPP-9.3@P1', 'TPP-9.3@P2', 'TPP-9.3@P3',
    'TPP-9.5@P0', 'TPP-9.5@P1', 'TPP-9.5@P2', 'TPP-9.5@P3'
  ]);
});

test('R248: no non-finite cell reaches a published rollout row', () => {
  expect(equationTargetDiagnostics().nonFinitePublished).toEqual([]);
});

/* R24 + R206 [§S0] — the repo ran three incompatible registration mechanisms:
   model.ts's selfTest() returning an array, taxmodel.ts's TAX_SELFTESTS pushing
   {name, run} objects, and phase-targets.ts's bare predicates taking the
   catalog. None knew about the others, so nobody could state the true test
   count or confirm every test executed. */
test('R24: every self-test source is declared in one registry', () => {
  const sources = SELF_TEST_SOURCES;
  expect(sources.length).toBeGreaterThan(0);
  expect(sources.every((s) => typeof s.surface === 'string' && s.surface.length > 0)).toBe(true);
  expect(new Set(sources.map((s) => s.surface)).size).toBe(sources.length);
});

test('R24: the registered count equals the advertised count', () => {
  const s = selfTestSummary();
  const fromSurfaces = Object.values(s.bySurface).reduce((n, v) => n + v, 0);
  expect(s.total).toBe(fromSurfaces);
  expect(s.rows.length).toBe(s.total);
  // every declared surface actually contributed
  expect(Object.keys(s.bySurface).sort()).toEqual(SELF_TEST_SOURCES.map((x) => x.surface).sort());
});

test('R24: no two self-tests share a name, so a failure names one test', () => {
  const names = selfTestSummary().rows.map((r) => r.name);
  expect(new Set(names).size).toBe(names.length);
});

test('R206: all three harness shapes are represented in the registry', () => {
  const surfaces = SELF_TEST_SOURCES.map((s) => s.surface);
  expect(surfaces).toContain('model.ts');       // selfTest(): SelfTestResult[]
  expect(surfaces).toContain('taxmodel.ts');    // TAX_SELFTESTS: {name, run}[]
  expect(surfaces).toContain('phase-targets.ts'); // bare predicate taking Q
});

test('R206: no exported self-test surface is missing from the registry', () => {
  // the six surfaces R153, R230 and R273 enumerate, plus the two added here
  const surfaces = new Set(SELF_TEST_SOURCES.map((s) => s.surface));
  for (const s of [
    'model.ts', 'bridge.ts', 'taxmodel.ts', 'phase-targets.ts',
    'equations.ts', 'fmea.ts', 'data-phases.ts', 'manifest-check.ts'
  ]) {
    expect(surfaces.has(s)).toBe(true);
  }
});


/* R155 [§S0] — the README advertised 27 integrity tests against a real 19.
   Checked in the gate, which holds the finished total; a row cannot know the
   total it is part of. */
test('R155: the gate rejects a README count that has drifted', () => {
  const real = selfTestSummary().total;
  expect(() =>
    assertReadmeCountCurrent({ total: real + 1 })
  ).toThrow(/README advertises/);
});

test('R155: the gate is silent when the README is current', () => {
  expect(() => assertReadmeCountCurrent(selfTestSummary())).not.toThrow();
});

test('R155: the README states the count the registry produces', () => {
  expect(readmeAdvertisedTestCount()).toBe(selfTestSummary().total);
});

/* R155 reopened at §S1 — a README with no figure at all returned silently, so
   the gate switched itself off. R113 reached that state by accident: rewrapping
   the sentence split "integrity" from "tests" and the single-line regex stopped
   matching, while astro build went on passing. Deleting the sentence does the
   same thing on purpose. */
test('R155: a README that states no count is drift, not silence', () => {
  const root = mkdtempSync(join(tmpdir(), 'nha-count-'));
  try {
    writeFileSync(join(root, 'README.md'), 'A dashboard. No figure here.\n', 'utf8');
    expect(() => assertReadmeCountCurrent({ total: 38 }, root)).toThrow(/states no integrity-test count/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('R155: the wrapped-sentence regression is caught', () => {
  const root = mkdtempSync(join(tmpdir(), 'nha-count-'));
  try {
    writeFileSync(
      join(root, 'README.md'),
      'validates itself with 38 built-in integrity\ntests, shown in the footer.\n',
      'utf8'
    );
    expect(() => assertReadmeCountCurrent({ total: 38 }, root)).toThrow(/states no integrity-test count/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/* Findings 1 and 17 [P16 fix run 2]: a self-test name is rendered output.
   health.astro prints every row's `name` in the site footer, so golden rule 2
   binds it, and ten names carried audit codes - nine R-numbers and one section
   reference - through an inline review and a two-axis review. Nothing had ever
   read a self-test name. */
/* Finding 3 [P16 review 3]: this file used to inline a three-alternative copy
   of the pattern list. The shipped list has eight. `Appendix C`, `OI-014`,
   `Table 3`, `Section 8` and `S9b` all passed the copy and fail production -
   and OI-0xx, appendix and table numbers are codes golden rule 2 names by
   hand. So the negative case below proved the COPY fired, not the list that
   ships. One list, one home; it is imported now. */
const hitsAuditCode = (name: string): boolean =>
  AUDIT_CODE_IN_RENDERED_TEXT.some(([pattern]) => pattern.test(name));

test('finding 1 / 17: no self-test name puts an internal code on the page', () => {
  expect(renderedSelfTestNameLeaks()).toEqual([]);
  /* Finding 11 [P16 review 3]: the rendered set, not just the source, and with
     the production list. This is the half production cannot run - a self-test
     calling selfTestSummary() from inside selfTestSummary() recurses - so the
     three sites that name their rows inside a callee are covered here or they
     are covered nowhere. */
  const rows = selfTestSummary().rows;
  expect(rows.length).toBeGreaterThan(200);
  expect(rows.filter((r) => hitsAuditCode(r.name)).map((r) => r.name)).toEqual([]);
});

test('finding 2: the source sweep says how much of the surface it cannot read', () => {
  /* The sweep matched single-quoted names only for one run. Of 183 call sites
     179 are single-quoted, 3 double-quoted and 1 passes a variable; the three
     double-quoted names happened to be clean, so nothing showed. All three
     quote styles are swept now, and what stays unreadable is counted rather
     than assumed away - every site here is a row the test above covers from
     the rendered side. */
  const unswept = unsweptSelfTestNameSites();
  expect(unswept).toHaveLength(3);
  const code = sourceText('src/lib/selftests.ts');
  expect((code.match(/runGuarded\(\s*"/g) || []).length).toBe(3);
  expect((code.match(/runGuarded\(\s*'/g) || []).length).toBeGreaterThan(150);
});

test('finding 1 / 17: the leak check fires on the shape it was written for', () => {
  /* Written against a live defect and watched fail on all ten. Re-proved here
     against the exact strings, because the source they came from is now clean
     and a check with nothing left to catch is a check nobody can see work. */
  /* The five the inline copy silently passed. Named one by one, because
     losing one to a list edit should fail here rather than go quiet. */
  for (const name of [
    'The workforce split matches Appendix C',
    'OI-014 is closed and the ledger says so',
    'The unit mix agrees with Table 3',
    'Section 8 targets are carried into the phase model',
    'The scenarios named for S9b still stress unit cost'
  ]) {
    expect(hitsAuditCode(name)).toBe(true);
    /* And every one of them passed the copy this file used to inline,
       which is the whole reason the copy had to go. */
    expect(name).not.toMatch(
      /\u00a7|\bR[0-9]{1,3}\b|\b(?:CP|BL|RB)-(?:\*|[A-Z]{2,4}\b|[0-9])/
    );
  }
  const codes = [
    'R129: CP-* is defined in one file and nowhere else',
    'The scenarios that stress unit cost still do, and are named for \u00a7S9b',
    'R1: a row graded medium or better says where its number came from'
  ];
  for (const name of codes) {
    expect(hitsAuditCode(name)).toBe(true);
  }
  /* KPP-W1 and P8 are framework vocabulary the site itself publishes - "Phase
     8" appears on five pages - so they are the plan's language and must NOT
     trip it. This is the whole judgement call, pinned. */
  for (const name of [
    'The worker-support rate agrees with KPP-W1, the derivation and the page',
    'Training progress is exactly complete at the P8 anchor'
  ]) {
    expect(hitsAuditCode(name)).toBe(false);
  }
});

/* Finding 14 [P16 fix run 4]: research/README.md said "nine self-tests gate
   it" and listed seven. Finding 13 was the same defect in a code comment and
   was fixed by deleting the count; a README cannot do that, because there the
   count IS the claim. So it is gated. */
test('finding 14: the seed documentation states the number of gates it has', () => {
  const rows = registrySurfaceRowCount();
  expect(rows).toBeGreaterThan(0);
  expect(registryGateCountDrift(rows)).toEqual([]);
  expect(researchReadmeGateCount()).toBe('fourteen');
  /* The check can fail in both directions, and a check that only fires one way
     lets the README run ahead of the code. */
  expect(registryGateCountDrift(rows + 1)).not.toEqual([]);
  expect(registryGateCountDrift(rows - 1)).not.toEqual([]);
});

/* Finding 1 [P16 review 3]: finding 14's own fix shipped a paragraph that said
   fourteen and listed twelve, and the gate written to stop exactly that was
   green - it compared 14 to 14 and never counted the list. The two halves fail
   for different reasons, so they get separate cases; one case covering both is
   how the list half went unproved. */
test('finding 1: the gate counts the list, not only the spelled number', () => {
  const rows = registrySurfaceRowCount();
  const listed = researchReadmeGateList();
  expect(listed).toHaveLength(rows);
  expect(new Set(listed).size).toBe(listed.length);
  /* The number half held while the list half was wrong, so break only the
     list half and watch it fail on its own. */
  const root = mkdtempSync(join(tmpdir(), 'nha-gatelist-'));
  try {
    mkdirSync(join(root, 'research'), { recursive: true });
    const text = sourceText('research/README.md');
    const dropped = text.replace('\n- the citation read-back', '');
    expect(dropped).not.toBe(text);
    writeFileSync(join(root, 'research/README.md'), dropped, 'utf8');
    expect(researchReadmeGateCount(root)).toBe('fourteen'); /* number still right */
    expect(researchReadmeGateList(root)).toHaveLength(rows - 1);
    expect(registryGateCountDrift(rows, root).join(' ')).toMatch(/lists 13 gates by name/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/* R135 [P17 SS11b]: nine medium-graded parameters in params.ts carried an empty
   url through five sections, because the seed had a sourcing gate and the module
   the live engine reads had none. This is the seed's rule, one layer up. */
test('R135: no parameter is graded medium or better with no citation', () => {
  expect(unsourcedGradedParameters()).toEqual([]);

  /* The nine, closed. Named so that losing one to an edit fails here. */
  const nine = [
    'governanceRate', 'careModelSavings', 'lowValueCapture', 'bhExpansion',
    'dvhExpansion', 'emsPhExpansion', 'rdPublic', 'workforceEdu',
    'wealthCollectionEff'
  ];
  for (const id of nine) {
    const d = PARAM_DEFS.find((x) => x.id === id);
    expect(d, id).toBeDefined();
    /* Either it now cites something, or it is graded below medium and says so.
       lowValueCapture is the second kind: no study estimates what share of
       low-value care a records mesh removes, so it was downgraded rather than
       pointed at the pool's URL, which does not carry that number. */
    const cited = (d!.url ?? '').trim() !== '';
    const graded = d!.confidence !== undefined && SOURCED_GRADES.includes(d!.confidence);
    expect(cited || !graded, id).toBe(true);
  }
  expect(PARAM_DEFS.find((x) => x.id === 'lowValueCapture')!.confidence).toBe('low');

  /* The backlog is reported, not asserted away. It must shrink or hold, never
     silently become a bare pass. */
  const backlog = parameterSourceBacklog();
  expect(backlog.length).toBe(8);
  for (const entry of backlog) expect(entry).toContain('(low)');
});

/* Finding 4 [P16 review 3]: the review called health.astro's rendering of a
   failing row's note a rule-2 breach. It is not - the build refuses a failing
   row first - but that answer rested on five comments and no check. */
test('finding 4: the build gate that makes a rendered note safe is wired', () => {
  expect(buildGateWiring()).toEqual([]);
  const text = sourceText('astro.config.mjs');
  /* One temp root PER mutation, and this is not tidiness. sourceText memoises
     by root+path, so rewriting one temp file twice serves the first content to
     the second case - which silently passed the second assertion here until it
     happened to expect a different message. A negative test that reuses a path
     through a cached reader proves one case and reports two. */
  const breaks: [string, string, RegExp][] = [
    /* Defined and never registered: the failure the config comment names, and
       the one no comment could have caught. */
    ['integrations: [selfTestGate()]', 'integrations: []', /does not register it/],
    ['assertSelfTestsPass(summary);', '', /no longer calls assertSelfTestsPass/],
    ["'astro:build:start': (ctx)", "'astro:build:done': (ctx)", /no astro:build:start hook/]
  ];
  for (const [from, to, want] of breaks) {
    const root = mkdtempSync(join(tmpdir(), 'nha-gate-'));
    try {
      const broken = text.replace(from, to);
      expect(broken).not.toBe(text);
      writeFileSync(join(root, 'astro.config.mjs'), broken, 'utf8');
      expect(buildGateWiring(root).join(' ')).toMatch(want);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
  expect(buildGateWiring(mkdtempSync(join(tmpdir(), 'nha-gate-absent-')))).toHaveLength(1);
});

/* R138 [Pi17 SS11b]: one confidence vocabulary, and the measurement that chose
   it. The recommendation said OUTCOME_STATS invents medium-high against
   params.ts high/medium/low; the seed grades 19 of 85 rows on the hyphenated
   levels and SOURCED_GRADES gates against them, so the three-grade surface was
   the narrow one and standardising on it would have re-graded sourced rows. */
test('R138: the confidence scale is one list, and SOURCED_GRADES is its head', () => {
  expect(CONFIDENCE_GRADES).toEqual(['high', 'medium-high', 'medium', 'low-medium', 'low']);
  expect(SOURCED_GRADES).toEqual(CONFIDENCE_GRADES.slice(0, 3));
  for (const g of CONFIDENCE_GRADES) expect(isConfidence(g)).toBe(true);
  /* The shapes a surface actually drifts into: a near-miss spelling and a
     grade from a scale nobody declared. */
  for (const g of ['med-high', 'moderate', 'High', 'medium high', '']) {
    expect(isConfidence(g)).toBe(false);
  }
  expect(isSourcedGrade('medium-high')).toBe(true);
  expect(isSourcedGrade('low-medium')).toBe(false);
  expect(isSourcedGrade('med-high')).toBe(false);
});

/* Finding 10 [P16 review 3]: research/README.md cited a path a reader of this
   repo cannot open, load-bearing for its claim that every gate has a negative
   case. The class sweep found two more the review had not. */
test('finding 10: every cited research path resolves, or is exempt with a reason', () => {
  expect(researchPathCitationLeaks()).toEqual([]);
  expect(staleResearchPathExemptions()).toEqual([]);
  /* Two exemptions rest on a claim about the document - that the citation
     itself tells the reader the file is elsewhere. An unchecked claim about a
     file is the defect this check exists to catch, so the disclosure is read
     at the citation. */
  const disclosed = Object.entries(RESEARCH_PATH_EXEMPT)
    .filter(([, e]) => e.disclose !== null);
  expect(disclosed.length).toBeGreaterThan(0);
  const readme = sourceText("research/README.md");
  for (const [tok, e] of disclosed) {
    if (!readme.includes(tok)) continue;
    const at = readme.indexOf(tok);
    expect(readme.slice(Math.max(0, at - 400), at + 400)).toContain(e.disclose!);
  }
});

test('finding 14: the row counts the source and never executes its own surface', () => {
  /* The first version asked SELF_TEST_SOURCES for `rows()` from inside the
     surface `rows()` builds. It recursed until the process hung - five minutes,
     no error, in a check written to enforce honesty about a count. */
  const surface = SELF_TEST_SOURCES.find((s) => s.surface === 'baseline-registry.ts');
  expect(surface).toBeDefined();
  expect(registrySurfaceRowCount()).toBe(surface!.rows().length);
});
