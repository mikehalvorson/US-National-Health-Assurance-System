import { expect, test } from 'vitest';
import {
  COUNTRY_SYSTEMS, LTC_GDP_2021, US_FAILURE_STATS, PLAN_PILLARS,
  LTC_COST_2024, COST_IN_FRAMEWORK, WORKFORCE_ASSESS
} from '../../src/lib/ltc';
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
  expect(w.directCare2024).toBeLessThan(w.projected2034);
  expect(w.projected2034).toBeLessThan(w.matureFramework);
  // the openings flow is larger than any single-point headcount and is not a bar
  expect(w.openings2034).toBeGreaterThan(w.matureFramework);
  // 2034 stock ties to today plus PHI's new-jobs projection
  expect(Math.abs(w.directCare2024 + w.newJobs2034 - w.projected2034)).toBeLessThan(0.05);
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
  expect(WORKFORCE_ASSESS.directCare2024).toBeGreaterThan(4);
  expect(WORKFORCE_ASSESS.openings2034).toBeGreaterThan(WORKFORCE_ASSESS.directCare2024);
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
  push(COST_IN_FRAMEWORK);
  expect(strings.some((s) => s.includes('—'))).toBe(false);
});
