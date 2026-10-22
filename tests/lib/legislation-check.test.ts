import { expect, test } from 'vitest';
import { DOMAINS } from '../../src/lib/legislation';
import {
  domainShapeFaults, phaseTokenFaults, sourceShapeFaults, unusedDispositions
} from '../../src/lib/legislation-check';
import { PHASES } from '../../src/lib/rollout';
import { SELF_TEST_SOURCES } from '../../src/lib/selftests';

/* R99 [§S17] (§AJ8): the domains' phase strings name rollout phases and
   gates as free text; each token resolves against rollout.ts now. */
test('R99: every P-token in every domain phase string resolves to a declared phase', () => {
  const scan = phaseTokenFaults();
  expect(scan.faults).toEqual([]);
  /* every domain names at least one phase */
  expect(DOMAINS.every((d) => /\bP\d/.test(d.phase))).toBe(true);
  expect(scan.tokens).toBeGreaterThanOrEqual(DOMAINS.length);
});

test('R99: a renamed phase, an unknown gate and a backwards range are each reported', () => {
  const one = [{ title: 'D', phase: 'P1 charter; P3-P9 scale; P6-P5 drift; Gate 9 proof.' }];
  expect(phaseTokenFaults(one).faults).toEqual([
    'D: "P3-P9" names P9, which the rollout does not declare',
    'D: "P6-P5" runs backwards or names one phase twice',
    'D: "Gate 9" names a gate the rollout does not declare'
  ]);
  /* the registry, not the string, decides: drop P4 from it and the two
     domains that name P4 on its own or as a range end are reported */
  const withoutP4 = PHASES.map((p) => p.id).filter((id) => id !== 'P4');
  const lost = phaseTokenFaults(DOMAINS, withoutP4).faults;
  expect(lost.length).toBeGreaterThan(0);
  expect(lost.every((f) => /names P4, which the rollout does not declare$/.test(f))).toBe(true);
});

test('R99: a phase field with no token is not a pass', () => {
  expect(phaseTokenFaults([{ title: 'D', phase: 'every phase' }]).faults)
    .toEqual(['no domain names a phase or gate, so nothing was resolved']);
});

/* ---- R100 [§S17] (§AJ9) ---------------------------------------------------- */

test('R100: 13 domains; each has a law, a source, and non-empty change/preserve/method/phase', () => {
  expect(domainShapeFaults()).toEqual({ domains: 13, faults: [] });
  const broken = DOMAINS.map((d, i) => i === 4 ? { ...d, laws: [], method: ' ' } : i === 7 ? { ...d, sources: [] } : d);
  expect(domainShapeFaults(broken).faults).toEqual([
    DOMAINS[4].title + ': no law, or an empty one',
    DOMAINS[4].title + ': empty method',
    DOMAINS[7].title + ': no source'
  ]);
  expect(domainShapeFaults([]).faults).toEqual(['no legal domain to check']);
});

test('R100: every source is a [label, url] pair and every url is absolute https', () => {
  expect(sourceShapeFaults()).toEqual({ sources: 39, faults: [] });
  const one = (sources: unknown[]) => sourceShapeFaults([{ title: 'D', sources }]).faults;
  expect(one([['A', 'http://uscode.house.gov/x']])).toEqual(['D source 1 is not an absolute https url: "http://uscode.house.gov/x"']);
  expect(one([['A', '/research/x.md']])).toEqual(['D source 1 is not an absolute https url: "/research/x.md"']);
  expect(one([['A', ' https://x.gov']])).toEqual(['D source 1 is not an absolute https url: " https://x.gov"']);
  expect(one([['https://x.gov']])).toEqual(['D source 1 is not a [label, url] pair']);
  expect(one([['', 'https://x.gov']])).toEqual(['D source 1 has no label']);
  expect(sourceShapeFaults([{ title: 'D', sources: [] }]).faults).toEqual(['no legal source to check']);
});

test('R100: the chapter has its own self-test surface, and every row on it passes', () => {
  const surface = SELF_TEST_SOURCES.find((s) => s.surface === 'legislation-check.ts');
  expect(surface).toBeDefined();
  const rows = surface!.rows();
  expect(rows).toHaveLength(6);
  expect(rows.filter((r) => !r.ok)).toEqual([]);
});

test('R100: every declared disposition marks at least one domain', () => {
  expect(unusedDispositions().unused).toEqual([]);
  /* Fallback is on Coverage and Administration only; take it off both */
  const without = DOMAINS.map((d) => ({ actions: d.actions.filter((a) => a !== 'Fallback') }));
  expect(unusedDispositions(without).unused).toEqual(['Fallback']);
  expect(unusedDispositions([]).badges).toBe(0);
});
