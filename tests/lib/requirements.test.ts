import { expect, test } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import {
  boundsAgree, isQuantified, parameterRequirementFaults, planFigureSentences, PLAN_FIGURES_NOT_REQUIREMENTS,
  scopeReasonFaults, type ScopeReason,
  requirementBound, requirementCoverage, REQUIREMENT_DISPOSITIONS, targetBound,
  type Disposition, type RequirementText
} from '../../src/lib/requirements';
import { PARAM_DEFS } from '../../src/lib/params';
import { sourcePackage } from '../../src/lib/source-package';
import { QUALITY_DATA } from '../../src/lib/quality';

/* R169 [§S18]: every quantified requirement is shown, or declared out of
   scope with its reason. */

const sp = sourcePackage();

test('R169: every quantified requirement is shown or declared out of scope', () => {
  const c = requirementCoverage(sp.requirements, sp.targets);
  expect(c.faults).toEqual([]);
  expect(sp.requirements.size).toBe(228);
  /* measured 2026-10-12; the row said 111 of 212 */
  expect(c.quantified).toBe(146);
  expect(c.byTarget + c.byFloor + c.byParameter + c.declared + c.outOfScope).toBe(c.quantified);
  /* every route carries weight: none of the five is empty */
  expect([c.byTarget, c.byFloor, c.byParameter, c.declared, c.outOfScope].every((n) => n > 0)).toBe(true);
  /* the declarations are exactly the requirements no route resolves */
  expect(c.declared + c.outOfScope).toBe(Object.keys(REQUIREMENT_DISPOSITIONS).length);
});

test('R169: each declared tab surface is in the page a reader is served', async () => {
  const c = requirementCoverage(sp.requirements, sp.targets);
  expect(c.tabSurfaces.map((s) => s.tab).sort()).toEqual(['data', 'hardening', 'health']);
  const container = await AstroContainer.create();
  for (const s of c.tabSurfaces) {
    const page = (await import(`../../src/pages/${s.tab}.astro`)).default;
    const text = (await container.renderToString(page))
      .replace(/<script\b[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&ge;/g, '≥').replace(/&#8805;/g, '≥').replace(/\s+/g, ' ');
    expect(text, s.id + ' on ' + s.tab).toContain(s.quote);
  }
});

test('R169: the Data tab\'s audit tile publishes the requirement\'s own number, as Specified', async () => {
  const req = sp.requirements.get('SR-DATA-010')!;
  expect(req.text).toContain('at least 99% of required cases');
  const page = (await import('../../src/pages/data.astro')).default;
  const html = await (await AstroContainer.create()).renderToString(page);
  const tile = /class="label"[^>]*>Sensitive-access audits<\/div>[\s\S]*?class="cyber-target-basis"[^>]*>([^<]*)<\/span>/.exec(html)!;
  expect(tile).not.toBeNull();
  expect(tile[0]).toContain('≥' + requirementBound(req.text)!.num + '%');
  expect(tile[1]).toBe('Specified');
  expect(html).not.toContain('Not yet set');
});

const req = (id: string, text: string, trace: string[] = []): [string, RequirementText] => [id, { id, text, trace }];

test('R169: a quantified requirement with no route and no declaration is reported', () => {
  const reqs = new Map([req('SR-ZZZ-001', 'The system shall do it for at least 42% of cases by Phase 8.', ['SN-01'])]);
  expect(requirementCoverage(reqs, new Map(), {}).faults).toEqual([
    'SR-ZZZ-001 states a number and is neither shown nor declared out of scope: "The system shall do it for at least 42% of cases by Phase 8."'
  ]);
  /* a requirement whose only number is its phase is not quantified */
  const phaseOnly = new Map([req('SR-ZZZ-002', 'The system shall publish a register by Phase 8.')]);
  expect(requirementCoverage(phaseOnly, new Map(), {})).toMatchObject({ quantified: 0, faults: [] });
});

test('R169: a stale, empty or unfounded declaration is reported', () => {
  const real = new Map([...sp.requirements].filter(([id]) => id === 'SR-COV-001' || id === 'SR-PAY-008' || id === 'SR-ADP-001'));
  const with_ = (d: Record<string, Disposition>) => requirementCoverage(real, sp.targets, d).faults;
  /* declared, but it resolves through its own metric's target */
  expect(with_({ 'SR-COV-001': { outOfScope: { text: 'x'.repeat(50), topics: ['coverage'] } }, 'SR-PAY-008': REQUIREMENT_DISPOSITIONS['SR-PAY-008'], 'SR-ADP-001': REQUIREMENT_DISPOSITIONS['SR-ADP-001'] }))
    .toEqual(['SR-COV-001 is declared but resolves through its catalog metric or a parameter']);
  /* a reason too thin to be one (review 6 of P24: scopeReasonFaults() holds
     every ScopeReason check, the length floor too) */
  expect(scopeReasonFaults(real, { 'SR-PAY-008': REQUIREMENT_DISPOSITIONS['SR-PAY-008'], 'SR-ADP-001': { outOfScope: { text: 'scorekeeping', topics: ['scorekeeping'] } } }).faults)
    .toEqual(['SR-ADP-001 is declared out of scope with no reason']);
  /* a card that does not say it, a quote without the number, a metric that does not state it */
  expect(with_({ 'SR-PAY-008': { entity: 'PLCCO', quote: 'the 6% cap' }, 'SR-ADP-001': { metric: 'KPP-A1', why: 'x' } })).toEqual([
    'SR-PAY-008\'s quote "the 6% cap" does not state every figure the requirement states',
    'SR-PAY-008: the PLCCO card does not say "the 6% cap"',
    'SR-ADP-001 names KPP-A1, whose target ">=99.5%" does not state at least 99'
  ]);
  expect(with_({ 'SR-PAY-008': { entity: 'PLCCO', quote: 'reconciliation-withholding cap' }, 'SR-ADP-001': REQUIREMENT_DISPOSITIONS['SR-ADP-001'] }))
    .toEqual(['SR-PAY-008\'s quote "reconciliation-withholding cap" does not state every figure the requirement states']);
  /* a declaration for a requirement the plan does not define */
  expect(with_({ 'SR-PAY-008': REQUIREMENT_DISPOSITIONS['SR-PAY-008'], 'SR-ADP-001': REQUIREMENT_DISPOSITIONS['SR-ADP-001'], 'SR-ZZZ-009': { outOfScope: { text: 'x'.repeat(50), topics: ['x'] } } }))
    .toEqual(['SR-ZZZ-009 is declared and the plan defines no such requirement']);
});

test('R169: bounds are read the way the requirements and targets state them', () => {
  /* a comparator phrase wins over a deadline in the same sentence */
  expect(requirementBound('The system shall provisionally cover unresolved eligibility cases within 24 hours in at least 99.5% of cases by Phase 8.'))
    .toMatchObject({ num: 99.5, cmp: '>=', unit: '%' });
  /* with no comparator, a deadline is a ceiling */
  expect(requirementBound('The system shall provide median front-door primary or unit access within 24 hours by Phase 8.'))
    .toMatchObject({ num: 24, cmp: '<=', unit: 'hours' });
  expect(requirementBound('complete comparative effectiveness assessments within median 6 months of priority question initiation'))
    .toMatchObject({ num: 6, cmp: '<=', unit: 'months' });
  /* an improvement target is a floor in percentage points, however worded */
  expect(targetBound('baseline +25 percentage points')).toMatchObject({ num: 25, cmp: '>=', unit: 'pp' });
  expect(targetBound('>=60 percentage point improvement')).toMatchObject({ num: 60, cmp: '>=', unit: 'pp' });
  expect(requirementBound('improve the score by at least 25 percentage points from baseline')).toMatchObject({ num: 25, cmp: '>=', unit: 'pp' });
  /* phases, gates and titles are not numbers the plan commits to */
  expect(isQuantified('from Phase 3 to Phase 4 under Title IV after Gate 2 (SR-LAW-001, TPP-2.1)')).toBe(false);
  expect(isQuantified('no later than Year 15')).toBe(true);
});

/* Review of P24: R169's own ask, the governing requirement on every
   parameter that has one. */
test('R169: every parameter that states the plan\'s own figure names its requirement', async () => {
  const { parameterRequirementFaults, planFigureSentences, PLAN_FIGURES_NOT_REQUIREMENTS } = await import('../../src/lib/requirements');
  const { PARAM_DEFS } = await import('../../src/lib/params');
  const r = parameterRequirementFaults(sp.requirements);
  expect(r.faults).toEqual([]);
  expect(PARAM_DEFS.filter((p) => p.requirement).map((p) => p.id + ' ' + p.requirement)).toEqual([
    'drugPriceCut SR-DRUG-002', 'governanceRate PR-CST-010', 'careModelSavings SR-ACC-003',
    'extractionSavings SR-HOSP-006', 'ltcExpansion SR-LTC-002', 'unitsCost SR-ACC-010',
    'workforceEdu PR-WF-002', 'wealthCollectionEff PR-CST-008'
  ]);
  /* careModelSavings was found by the first version of this check, not by the
     grep that listed six; ltcExpansion ("a 70% home-and-community target")
     only by the sentence rule that replaced the first version's five phrases
     (review 2 of P24) */
  expect(r.checked).toBe(8);
  /* reach: every parameter with a sentence that names the plan with a
     figure is either one that names its requirement or the declared
     exception (a note may hold more than one such sentence) */
  expect(PARAM_DEFS.filter((p) => planFigureSentences(p.source || '').length).length)
    .toBe(r.checked + Object.keys(PLAN_FIGURES_NOT_REQUIREMENTS).length);
  /* review 3 of P24: the reach, pinned as measured (owner 2026-10-12 had
     loosened it to at-least): ten sentences, workforceEdu's note holding two */
  expect(r.sentences).toBe(10);
  /* the rule is a rule, not a list of phrasings: any wording, and a year is
     not a figure */
  expect(planFigureSentences('Peer systems differ. The plan requires at least 42% by then.')).toHaveLength(1);
  expect(planFigureSentences('The plan aims for 7 days.')).toHaveLength(1);
  expect(planFigureSentences('The plan was announced in 2025.')).toEqual([]);
  expect(planFigureSentences('Plans vary by 30%.')).toEqual([]);
  const base = PARAM_DEFS.find((p) => p.id === 'wealthCollectionEff')!;
  const only = (p: typeof base) => parameterRequirementFaults(sp.requirements, [p], {}).faults;
  expect(only({ ...base, requirement: undefined }))
    .toEqual(['wealthCollectionEff\'s note states the plan\'s own figure and names no requirement: "The plan targets at least 92%."']);
  expect(only({ ...base, source: 'Collection depends on enforcement; the plan requires at least 92% of what is due.', requirement: undefined }))
    .toHaveLength(1);
  expect(only({ ...base, requirement: 'PR-CST-099' }))
    .toEqual(['wealthCollectionEff names PR-CST-099, which the plan does not define']);
  expect(only({ ...base, requirement: 'PR-CST-002' })[0])
    .toBe('wealthCollectionEff\'s note does not state every figure PR-CST-002 states');
  /* every figure, not one: PR-CST-010 states 0.25% and 0.50% */
  const gov = PARAM_DEFS.find((p) => p.id === 'governanceRate')!;
  expect(only({ ...gov, source: 'The plan sets aside 0.25% for the legitimacy layer alone.' }))
    .toEqual(['governanceRate\'s note does not state every figure PR-CST-010 states']);
  /* the declared exception: stale when the note stops stating a plan figure
     or starts naming a requirement */
  const tt = PARAM_DEFS.find((p) => p.id === 'transitionTotal')!;
  expect(parameterRequirementFaults(sp.requirements, [tt]).faults).toEqual([]);
  expect(parameterRequirementFaults(sp.requirements, [{ ...tt, source: 'A transition cost.' }]).faults)
    .toEqual(['transitionTotal is declared as a plan figure no requirement carries, and its note states no plan figure']);
  expect(parameterRequirementFaults(sp.requirements, [{ ...tt, requirement: 'PR-CST-002' }]).faults)
    .toContain('transitionTotal is declared as a plan figure no requirement carries, and its note names one');
  expect(parameterRequirementFaults(sp.requirements, [], { gone: 'A plan figure its summary states and no requirement carries.' }).faults)
    .toEqual(['gone is declared as a plan figure and is no parameter']);
  /* nothing named, nothing checked: the build row fails at zero */
  expect(parameterRequirementFaults(sp.requirements, [], {}).checked).toBe(0);
});

test('R169: a declared metric must state the requirement\'s direction as well as its number', () => {
  const one = new Map([...sp.requirements].filter(([id]) => id === 'SR-RGT-007'));
  /* TPP-6.3 states ">=99%": the same commitment */
  expect(requirementCoverage(one, sp.targets, { 'SR-RGT-007': REQUIREMENT_DISPOSITIONS['SR-RGT-007'] }).faults).toEqual([]);
  /* a metric whose target is a ceiling at the same number is not it */
  const ceiling = { ...structuredClone(sp.requirements.get('SR-RGT-007')!) };
  const cat = structuredClone(QUALITY_DATA);
  cat.parameters.find((p) => p.id === 'TPP-6.3')!.target = '<=99% abnormal results';
  expect(requirementCoverage(new Map([['SR-RGT-007', ceiling]]), sp.targets,
    { 'SR-RGT-007': REQUIREMENT_DISPOSITIONS['SR-RGT-007'] }, cat).faults)
    .toEqual(['SR-RGT-007 names TPP-6.3, whose target "<=99% abnormal results" does not state at least 99']);
});

/* Owner, 2026-10-12: SR-RGT-009 had no metric and was declared out of scope.
   KPP-E6 was defined for it; it carries the requirement's floor, is marked as
   an addition, and the requirement resolves through it. */
test('owner 2026-10-12: the disability accommodation requirement is carried by KPP-E6 at its own floor', () => {
  const req = sp.requirements.get('SR-RGT-009')!;
  const e6 = QUALITY_DATA.parameters.find((p) => p.id === 'KPP-E6')!;
  expect(e6.provenance).toBe('plan-defined');
  expect(requirementBound(req.text)).not.toBeNull();
  expect(targetBound(e6.target)?.num).toBe(requirementBound(req.text)!.num);
  expect(REQUIREMENT_DISPOSITIONS['SR-RGT-009']).toEqual({ metric: 'KPP-E6', why: expect.any(String) });
  expect(requirementCoverage(sp.requirements, sp.targets).faults).toEqual([]);
});

/* Review 3 of P24: the coverage routes, the bound comparison, the figure
   reader and the plan-figure reader, as the third review found them. */
test('review 3 of P24: a route resolves a requirement only when the reader is shown every figure', () => {
  const text = 'The system shall remediate at least 99% of critical vulnerabilities within 15 days by Phase 8.';
  const one = new Map([['SR-ZZZ-002', { id: 'SR-ZZZ-002', text, trace: ['TPP-11.3'] }]]);
  /* TPP-11.3 shows ">=99% within 15 days": both figures, so it resolves */
  expect(requirementCoverage(one, sp.targets, {}).byTarget).toBe(1);
  /* a record that lost its window does not, and the requirement is reported */
  const cat = structuredClone(QUALITY_DATA);
  cat.parameters.find((p) => p.id === 'TPP-11.3')!.target = '>=99%';
  const lost = requirementCoverage(one, sp.targets, {}, cat);
  expect(lost.byTarget).toBe(0);
  expect(lost.faults).toHaveLength(1);
  /* the one requirement measured that way: its record states the ceiling and
     not the 72-hour window, so it is declared, with the reason */
  expect(REQUIREMENT_DISPOSITIONS['SR-ACC-014']).toEqual({ metric: 'TPP-6.5', why: expect.any(String) });
});

test('review 3 of P24: a declared metric must agree on the unit as well as the number and direction', () => {
  const one = new Map([...sp.requirements].filter(([id]) => id === 'SR-RGT-009'));
  const ok = requirementCoverage(one, sp.targets, { 'SR-RGT-009': REQUIREMENT_DISPOSITIONS['SR-RGT-009'] });
  expect(ok.faults).toEqual([]);
  const cat = structuredClone(QUALITY_DATA);
  cat.parameters.find((p) => p.id === 'KPP-E6')!.target = '>=98 sites';
  expect(requirementCoverage(one, sp.targets, { 'SR-RGT-009': REQUIREMENT_DISPOSITIONS['SR-RGT-009'] }, cat).faults)
    .toHaveLength(1);
  /* one comparison: strict for the routes, lenient only where a target leaves
     a direction or unit unstated */
  const pct = { num: 98, cmp: '>=' as const, unit: '%', decimals: 0, comma: false };
  expect(boundsAgree(pct, pct)).toBe(true);
  expect(boundsAgree({ ...pct, unit: '' }, pct)).toBe(false);
  expect(boundsAgree({ ...pct, unit: '' }, pct, true)).toBe(true);
  expect(boundsAgree({ ...pct, unit: 'money' }, pct, true)).toBe(false);
  expect(boundsAgree({ ...pct, cmp: null }, pct, true)).toBe(true);
  expect(boundsAgree({ ...pct, cmp: '<=' }, pct, true)).toBe(false);
});

test('review 3 of P24: the plan-figure reader reads any mention of the plan, and a figure with a comma is not a year', () => {
  expect(planFigureSentences('This plan funds 2,000 clinics.')).toHaveLength(1);
  expect(planFigureSentences('The NHA plan sets 40% by then.')).toHaveLength(1);
  expect(planFigureSentences('Under The Plan, 12 hubs open.')).toHaveLength(1);
  expect(planFigureSentences('Insurance plans cover 80%.')).toEqual([]);
  expect(planFigureSentences('The plan was announced in 2025.')).toEqual([]);
  /* a gate's number is not a figure the plan commits to */
  expect(planFigureSentences('The plan opens after Gate 2.')).toEqual([]);
  /* an exemption's reason is read: an empty one is a fault */
  const tt = PARAM_DEFS.find((p) => p.id === 'transitionTotal')!;
  expect(parameterRequirementFaults(sp.requirements, [tt], { transitionTotal: '' }).faults)
    .toEqual(['transitionTotal is declared as a plan figure with no reason']);
  expect(PLAN_FIGURES_NOT_REQUIREMENTS.transitionTotal).not.toMatch(/\d/);
});

test('review 3 of P24: each out-of-scope reason describes the requirements it is given to', () => {
  /* review 4 of P24: for every reason, not only the complaint one; the
     review found the oversight reason's own list naming "waivers", which
     none of its requirements does, and topics some of them have missing */
  const decl = REQUIREMENT_DISPOSITIONS;
  const real = scopeReasonFaults(sp.requirements);
  expect(real.faults).toEqual([]);
  expect(real.reasons).toBeGreaterThan(1);
  expect(requirementCoverage(sp.requirements, sp.targets).faults).toEqual([]);
  const oversight = (decl['SR-ADP-001'] as { outOfScope: ScopeReason }).outOfScope;
  const continuity = (decl['PR-TRN-002'] as { outOfScope: ScopeReason }).outOfScope;
  /* every declaration with one reason replaced by another */
  const replaced = (from: ScopeReason, to: ScopeReason): Record<string, Disposition> => Object.fromEntries(
    Object.entries(decl).map(([id, d]) => [id, 'outOfScope' in d && d.outOfScope === from ? { outOfScope: to } : d]));
  /* a reason handed to a requirement it does not describe */
  expect(scopeReasonFaults(sp.requirements, { ...decl, 'PR-TRN-002': { outOfScope: oversight } }).faults)
    .toEqual(['PR-TRN-002 is declared out of scope for a reason about ' + oversight.topics.join(', ') + ', and it names none of them']);
  /* review 5 of P24: review 3's own defect, the bounce-back requirement
     handed the oversight reason, which the first topic check passed */
  expect(scopeReasonFaults(sp.requirements, { ...decl, 'SR-RGT-006': { outOfScope: oversight } }).faults)
    .toEqual(['SR-RGT-006 is declared out of scope for a reason about ' + oversight.topics.join(', ') + ', and it names none of them']);
  /* and a generic topic is refused wherever it matches a quantified
     requirement given no such reason, so "review" could not come back */
  const generic = scopeReasonFaults(sp.requirements, replaced(oversight, { ...oversight, topics: oversight.topics.concat('review') })).faults;
  expect(generic).toContain('SR-RGT-006 mentions "review", a topic of the reason given to SR-RGT-012, and is not given that reason');
  expect(generic.every((f) => / mentions "review", a topic of the reason given to SR-RGT-012/.test(f))).toBe(true);
  /* review 6 of P24: every reassignment of a reason in use, to every
     quantified requirement it is not given, faults; the review found
     reassignments that passed, some through the whole build row */
  const quantified = [...sp.requirements.values()].filter((r) => isQuantified(r.text));
  const inUse = new Map<ScopeReason, string[]>();
  for (const [id, d] of Object.entries(decl)) if ('outOfScope' in d) inUse.set(d.outOfScope, (inUse.get(d.outOfScope) || []).concat(id));
  const passed: string[] = [];
  let tried = 0;
  for (const [reason, ids] of inUse) {
    for (const r of quantified) {
      if (ids.indexOf(r.id) >= 0) continue;
      tried++;
      if (!scopeReasonFaults(sp.requirements, { ...decl, [r.id]: { outOfScope: reason } }).faults.length) passed.push(r.id + ' given ' + ids[0] + '\'s reason');
    }
  }
  expect(passed).toEqual([]);
  expect(tried).toBeGreaterThan(0);
  /* a topic none of its requirements names, and a topic its text omits */
  expect(scopeReasonFaults(sp.requirements, replaced(oversight, { ...oversight, topics: oversight.topics.concat('waivers') })).faults).toEqual([
    'SR-RGT-012\'s out-of-scope reason does not say "waivers"',
    'no requirement given SR-RGT-012\'s reason names its topic "waivers"',
    /* review 6 of P24: and the strict rule sees the shown requirement that
       is about waivers */
    'SR-ADP-015 mentions "waivers", a topic of the reason given to SR-RGT-012, and is not given that reason'
  ]);
  /* a reason with no topics */
  expect(scopeReasonFaults(sp.requirements, { 'PR-TRN-002': { outOfScope: { ...continuity, topics: [] } } }).faults)
    .toEqual(['PR-TRN-002\'s out-of-scope reason names no topic']);
});
