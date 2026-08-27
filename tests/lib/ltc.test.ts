import { expect, test } from 'vitest';
import { calendarYear, LTC_BENEFIT_PHASE } from '../../src/lib/rollout';
/* The end of the latest ten-year federal projection window (2024-2034):
   an external fact the LTC page cites, not a phase-derived year. */
const PROJECTION_WINDOW_END = 2034;
import {
  COUNTRY_SYSTEMS, LTC_GDP_2021, US_FAILURE_STATS, PLAN_PILLARS,
  LTC_COST_2024, COST_IN_FRAMEWORK, WORKFORCE_ASSESS, WHAT_WORKS, MEDICARE_GAP,
  KIND_STYLE, UNPAID_FAMILY_CARE_B, perCapitaSpend, PLANNING_INPUTS,
  type GdpKind
} from '../../src/lib/ltc';
import { gdpKindStyleFaults } from '../../src/lib/manifest-check';
import { LTC_WORKFORCE } from '../../src/lib/workforce';
import { PARAMS_BY_ID, DEFLATOR_2023_TO_2024 } from '../../src/lib/params';

test('COUNTRY_SYSTEMS: four working systems, all fields present', () => {
  expect(COUNTRY_SYSTEMS).toHaveLength(4);
  const ok = COUNTRY_SYSTEMS.every((c) =>
    c.country && c.system && c.since && c.funding && c.design && c.why && c.confidence);
  expect(ok).toBe(true);
});

test('LTC_GDP_2021: includes a United States bar and an OECD average', () => {
  expect(LTC_GDP_2021.length).toBeGreaterThanOrEqual(6);
  expect(LTC_GDP_2021.some((r) => r.kind === 'us')).toBe(true);
  expect(LTC_GDP_2021.some((r) => /OECD/.test(r.country))).toBe(true);
  // every share is a plausible percent of GDP
  expect(LTC_GDP_2021.every((r) => r.pct > 0 && r.pct < 10)).toBe(true);
  // every bar also carries a per-person dollar figure for the tooltip
  expect(LTC_GDP_2021.every((r) => r.perCapita > 0 && r.perCapita < 10000)).toBe(true);
});

test('WORKFORCE_ASSESS: three headcounts rise from today to 2034 to maturity', () => {
  const w = WORKFORCE_ASSESS;
  expect(w.directCare2024.value).toBeLessThan(w.projected2034.value);
  expect(w.projected2034.value).toBeLessThan(w.matureFramework.value);
  // the openings flow is larger than any single-point headcount and is not a bar
  expect(w.openings2034.value).toBeGreaterThan(w.matureFramework.value);
  // 2034 stock ties to today plus PHI's new-jobs projection
  expect(Math.abs(w.directCare2024.value + w.newJobs2034.value -
    w.projected2034.value)).toBeLessThan(0.05);
});

/* R283 [S9d]: the page attributed these to "The Workforce model" while this
   module imported only params.ts and typed all seven itself. */
test('R283: every direct-care figure reads the workforce model', () => {
  const w = WORKFORCE_ASSESS;
  expect(w.directCare2024.value).toBe(LTC_WORKFORCE.currentDirectCareM);
  expect(w.newJobs2034.value).toBe(LTC_WORKFORCE.newJobs2034M);
  expect(w.projected2034.value).toBe(LTC_WORKFORCE.projected2034M);
  expect(w.matureFramework.value).toBe(LTC_WORKFORCE.matureFrameworkM);
  expect(w.openings2034.value).toBe(LTC_WORKFORCE.openings2034M);
  expect(w.medianWage2024.value).toBe(LTC_WORKFORCE.medianWageNow);
  expect(w.homeTurnover.value).toBe(LTC_WORKFORCE.homeTurnoverPct);
  /* The `note` field this used to assert on is gone. The code review found
     it had no consumer anywhere in src/ -- R282's own defect, recreated by
     the commit that fixed R282. The page's paragraph is the published copy
     and tests/pages/ltc.test.ts asserts it reads the model. */
  expect('note' in w).toBe(false);
});

/* R284 [S9d]: one grade per figure. The maturity figure is a planning
   estimate from two plan assumptions, and was published beside four PHI
   measurements under a single object-level `medium`. */
test('R284: the maturity headcount is graded low, alone among the seven', () => {
  const w = WORKFORCE_ASSESS;
  expect(w.matureFramework.confidence).toBe('low');
  const graded = [w.directCare2024, w.newJobs2034, w.projected2034,
    w.openings2034, w.medianWage2024, w.homeTurnover];
  expect(graded.every((f) => f.confidence === 'high')).toBe(true);
  // the grade arrives with its reason, and the reason names both inputs
  expect(w.matureFramework.basis).toContain(String(LTC_WORKFORCE.coveredFteM));
  expect(w.matureFramework.basis).toContain(String(LTC_WORKFORCE.fteFraction));
  // WORKFORCE_ASSESS no longer carries one grade for all seven
  expect('confidence' in w).toBe(false);
});

/* R284 [S9d, fix run] first declared test: "every input to a published figure
   carries its own source and grade". The section's first pass met the second
   test ("no figure inherits a grade from a sibling") for the seven headcounts
   and then broke it one level down: the two inputs BEHIND the maturity figure
   were explained only inside that figure's own `basis`, which is inheritance
   from a parent rather than a grade of their own. Found by the code review. */
test('R284: the two planning inputs are graded in their own right', () => {
  expect(PLANNING_INPUTS).toHaveLength(2);
  expect(PLANNING_INPUTS.map((f) => f.value))
    .toEqual([LTC_WORKFORCE.coveredFteM, LTC_WORKFORCE.fteFraction]);
  // both low, and each says why in its own words
  expect(PLANNING_INPUTS.every((f) => f.confidence === 'low')).toBe(true);
  /* Rendered with its unit. Without a display string 5.0 reaches the page as
     "5", and the two inputs are in different units, so one format cannot
     serve both. Measured in the browser before this was added. */
  expect(PLANNING_INPUTS[0].display).toBe(
    LTC_WORKFORCE.coveredFteM.toFixed(1) + ' million');
  expect(PLANNING_INPUTS[1].display).toBe(LTC_WORKFORCE.fteFraction.toFixed(2));
  expect(PLANNING_INPUTS.every((f) => /\d/.test(f.display))).toBe(true);
  expect(PLANNING_INPUTS.every((f) => /not a published figure/.test(f.basis))).toBe(true);
  // and the figure they produce reproduces from them
  const derived = Math.round(
    (LTC_WORKFORCE.coveredFteM / LTC_WORKFORCE.fteFraction) * 10) / 10;
  expect(derived).toBe(WORKFORCE_ASSESS.matureFramework.value);
});

/* R282 [S9d]: both constants were exported, never rendered, and had already
   drifted from the copies typed into the page. */
test("R282: WHAT_WORKS and MEDICARE_GAP carry the published wording", () => {
  expect(WHAT_WORKS).toHaveLength(5);
  expect(WHAT_WORKS.every((s) => s.length > 40)).toBe(true);
  // the clause that existed only on the page, and would have been lost by
  // rendering the constant as it stood
  expect(MEDICARE_GAP.body).toContain('largest single payer of it in the country');
  // the clause that existed only in the constant, and would have been lost by
  // deleting it
  expect(WHAT_WORKS[1]).toContain('an insurance contribution or a tax');
});

/* R287 [S9d]: perCapita was documented as derived and stored as eight typed
   literals. Every published figure had to survive the switch. */
test('R287: perCapita is computed from a stored GDP per capita', () => {
  const published: Record<string, number> = {
    Netherlands: 3017, Norway: 3227, Sweden: 2114, Denmark: 2218,
    Japan: 1012, Germany: 1566, 'OECD average': 922, 'United States': 929
  };
  for (const row of LTC_GDP_2021) {
    expect(row.perCapita).toBe(published[row.country]);
    expect(row.perCapita).toBe(perCapitaSpend(row));
  }
  // and the derivation is live: move a share, the dollars move with it
  const japan = LTC_GDP_2021.find((r) => r.country === 'Japan')!;
  expect(perCapitaSpend({ ...japan, pct: 2.0 })).toBe(920);
});

/* R288 [S9d]: the OECD average is an aggregate, not a funding model, and was
   drawn in the tax-funded colour under a legend labelling it "Tax-funded". */
test('R288: every funding kind has a distinct colour and its own legend label', () => {
  const kinds = Object.keys(KIND_STYLE);
  const colors = kinds.map((k) => KIND_STYLE[k as keyof typeof KIND_STYLE].color);
  expect(new Set(colors).size).toBe(kinds.length);
  const oecd = LTC_GDP_2021.find((r) => /OECD/.test(r.country))!;
  expect(oecd.kind).toBe('benchmark');
  expect(KIND_STYLE.benchmark.color).not.toBe(KIND_STYLE.tax.color);
});

/* R288 [S9d, fix run]: gdpKindStyleFaults' first clause -- a kind with no
   style -- cannot fire with the default arguments, because KIND_STYLE is a
   Record over the same union the data's `kind` uses and TypeScript has
   already refused the bad case. The section's code review measured that.
   The clause still guards against a cast or a widened read reaching the
   function, so it is exercised HERE through the injected arguments rather
   than deleted: a check nothing can make fail is worth as much as its
   payload, and this is the payload. */
test('R288: gdpKindStyleFaults catches a kind that reached the data by a cast', () => {
  const rogue = [{ country: 'Nowhere', kind: 'mutual' as GdpKind }];
  const faults = gdpKindStyleFaults(rogue.concat(LTC_GDP_2021), KIND_STYLE);
  expect(faults.some((f) => f.kind === 'mutual')).toBe(true);
  // a styled kind nothing draws is the other direction
  const thin = LTC_GDP_2021.filter((r) => r.kind === 'us');
  expect(gdpKindStyleFaults(thin, KIND_STYLE).length).toBeGreaterThan(0);
  // and two kinds sharing a colour merges two categories on the chart
  const merged = { ...KIND_STYLE, tax: { ...KIND_STYLE.tax, color: KIND_STYLE.insurance.color } };
  expect(gdpKindStyleFaults(LTC_GDP_2021, merged)
    .some((f) => f.problem.includes('one category'))).toBe(true);
  // the shipped data is clean
  expect(gdpKindStyleFaults()).toEqual([]);
});

/* R286 [S9d]: five typed copies of $600B and six of $17.36, with canonical
   fields sitting unused in the same file. */
test('R286: the repeated figures resolve to one field each', () => {
  const wage = '$' + LTC_WORKFORCE.medianWageNow.toFixed(2);
  const unpaid = '$' + UNPAID_FAMILY_CARE_B + 'B';
  expect(PLAN_PILLARS[2].body).toContain(unpaid);
  expect(PLAN_PILLARS[3].body).toContain(wage);
  expect(COST_IN_FRAMEWORK.body).toContain(unpaid);
  expect(US_FAILURE_STATS.some((s) => s.value === unpaid)).toBe(true);
  expect(US_FAILURE_STATS.some((s) => s.value === wage + '/hr')).toBe(true);
  // the Nordic and Dutch shares inside COUNTRY_SYSTEMS resolve to the chart
  const nl = LTC_GDP_2021.find((r) => r.country === 'Netherlands')!;
  expect(COUNTRY_SYSTEMS[2].funding).toContain(nl.pct.toFixed(1) + '%');
  const dk = LTC_GDP_2021.find((r) => r.country === 'Denmark')!;
  expect(COUNTRY_SYSTEMS[3].funding).toContain('Denmark ' + dk.pct.toFixed(1) + '%');
});

test('LTC cost is read from the fiscal model, not a separate number', () => {
  const p = PARAMS_BY_ID['ltcExpansion'];
  expect(LTC_COST_2024.mode).toBe(Math.round(p.mode * DEFLATOR_2023_TO_2024));
  expect(LTC_COST_2024.low).toBe(Math.round(p.low * DEFLATOR_2023_TO_2024));
  expect(LTC_COST_2024.high).toBe(Math.round(p.high * DEFLATOR_2023_TO_2024));
  // the cost callout text quotes the derived mode
  expect(COST_IN_FRAMEWORK.body).toContain('$' + LTC_COST_2024.mode + 'B');
});

test('workforce assessment carries the current direct-care figures', () => {
  expect(WORKFORCE_ASSESS.directCare2024.value).toBeGreaterThan(4);
  expect(WORKFORCE_ASSESS.openings2034.value)
    .toBeGreaterThan(WORKFORCE_ASSESS.directCare2024.value);
  expect(PLAN_PILLARS.length).toBeGreaterThanOrEqual(4);
});

test('no em dashes anywhere in the LTC data strings', () => {
  const strings: string[] = [];
  const push = (o: object) =>
    Object.values(o).forEach((v) => { if (typeof v === 'string') strings.push(v); });
  COUNTRY_SYSTEMS.forEach(push);
  LTC_GDP_2021.forEach(push);
  US_FAILURE_STATS.forEach(push);
  PLAN_PILLARS.forEach(push);
  push(WORKFORCE_ASSESS);
  Object.values(WORKFORCE_ASSESS).forEach((v) => {
    if (v && typeof v === 'object' && 'basis' in v) strings.push(v.basis);
  });
  push(COST_IN_FRAMEWORK);
  push(MEDICARE_GAP);
  WHAT_WORKS.forEach((s) => strings.push(s));
  expect(strings.some((s) => s.includes('—'))).toBe(false);
});

/* R262 [§S2] clause 2 — "the workforce horizon year is derived from the
   benefit's phase, not typed". The horizon itself (2034) is an external fact,
   the end of the ten-year federal projection window, so it cannot be derived
   from a phase. What CAN be pinned is the relationship the page states between
   the two, which is the sentence that was wrong before: if the roadmap moves
   long-term care, this fails and the paragraph has to be rewritten. */

test('R262: the benefit starts two years after the projection window closes', () => {
  const start = calendarYear(LTC_BENEFIT_PHASE!.year);
  expect(start).toBe(2036);
  expect(start - PROJECTION_WINDOW_END).toBe(2);
  expect(LTC_BENEFIT_PHASE!.id).toBe('P7');
});

/* R285 [S9d]: AW5's second site. `role="img"` prunes the whole subtree from
   the accessibility tree, and renderGdpChart then gave each of the eight row
   groups tabindex: 0 -- so every row was a keyboard tab stop that announced
   nothing, with pointermove/pointerleave handlers and no focus/blur pair.
   units-client.ts, cited by the audit as the worked example, gets this right
   one directory away.

   Asserted against the client SOURCE rather than a rendered chart: the chart
   is built by hand-rolled SVG at runtime and there is no jsdom in this suite,
   so the source is what can be checked here. The consequence is that this
   test pins the shape of the code, not the shape of the DOM -- which is worth
   saying out loud, because it is weaker than it looks. */
test('R285: the GDP chart is a group, is keyboard-reachable, and draws per-capita', async () => {
  const src = await import('node:fs').then((fs) =>
    fs.readFileSync(new URL('../../src/scripts/ltc-client.ts', import.meta.url), 'utf8'));
  /* Both anchors are asserted before the slice. Without that, renaming
     renderCountryCards makes indexOf return -1, slice(start, -1) runs to
     EOF, and the not.toContain below fails on renderWorkforce's role: 'img'
     -- which is CORRECT there, that chart has no focusable children. A test
     that fails for an unrelated reason is not a passing test with a caveat. */
  const start = src.indexOf('function renderGdpChart');
  const stop = src.indexOf('function renderCountryCards');
  expect(start).toBeGreaterThan(-1);
  expect(stop).toBeGreaterThan(start);
  const chart = src.slice(start, stop);
  expect(chart).toContain("role: 'group'");
  expect(chart).not.toContain("role: 'img'");
  // focus and blur alongside the pointer pair, not instead of it
  for (const ev of ['pointermove', 'pointerleave', 'focus', 'blur']) {
    expect(chart).toContain("addEventListener('" + ev + "'");
  }
  // every focusable row carries its own accessible name
  expect(chart).toContain("'aria-label': r.country");
  // and per-capita is drawn, not only spoken
  expect(chart).toContain('ltc-percapita');
});
