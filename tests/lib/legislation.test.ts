import { expect, test } from 'vitest';
import { DOMAINS, ACRONYMS } from '../../src/lib/legislation';

test('DOMAINS: 13 legal domains, first is Coverage', () => {
  expect(DOMAINS).toHaveLength(13);
  expect(DOMAINS[0].short).toBe('Coverage');
  expect(DOMAINS[0].actions.length).toBeGreaterThan(0);
  expect(DOMAINS[0].sources[0]).toHaveLength(2); // [label, url]
  expect(DOMAINS.every((d) => d.laws.length > 0 && d.change && d.preserve && d.method && d.phase)).toBe(true);
});

test('ACRONYMS: dictionary maps abbreviations to expansions', () => {
  expect(ACRONYMS.ERISA).toContain('Employee Retirement');
  expect(Object.keys(ACRONYMS).length).toBeGreaterThan(30);
});
