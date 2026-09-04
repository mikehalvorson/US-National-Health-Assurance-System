import { expect, test } from 'vitest';
import {
  DOMAINS,
  ENABLING_ACT_GROUPS,
  ENABLING_ACT_TITLE_COUNT,
  numberedActGroups
} from '../../src/lib/legislation';

test('DOMAINS: 13 legal domains, first is Coverage', () => {
  expect(DOMAINS).toHaveLength(13);
  expect(DOMAINS[0].short).toBe('Coverage');
  expect(DOMAINS[0].actions.length).toBeGreaterThan(0);
  expect(DOMAINS[0].sources[0]).toHaveLength(2); // [label, url]
  expect(DOMAINS.every((d) => d.laws.length > 0 && d.change && d.preserve && d.method && d.phase)).toBe(true);
});

/* P19 [S13]: this module's 54-key acronym map is gone. See
   tests/lib/acronym-layer.test.ts. */

/* R297 [§S12] — the enabling act's numbering is derived from the group sizes
   rather than typed into five `start` attributes and nineteen Roman numerals.
   These pin the values the derivation replaced, which is what makes it a
   confirmation rather than a swap: if a derived start stops matching, the
   literal it replaced was wrong and the row needs revisiting. */

test('R297: the derived starts reproduce the five values they replaced', () => {
  expect(numberedActGroups().map((g) => g.start)).toEqual([1, 5, 11, 13, 17]);
  expect(numberedActGroups().map((g) => g.titles.length)).toEqual([4, 6, 2, 4, 3]);
});

test('R297: the title count is nineteen and the numbering is contiguous', () => {
  const all = numberedActGroups().flatMap((g) => g.titles);
  expect(ENABLING_ACT_TITLE_COUNT).toBe(19); // BY9 verified this by hand
  expect(all.length).toBe(ENABLING_ACT_TITLE_COUNT);
  expect(all.map((t) => t.n)).toEqual(all.map((_, i) => i + 1));
  expect(all[0].roman).toBe('I');
  expect(all[18].roman).toBe('XIX');
});

test('R297: a twentieth title fails rather than rendering without a numeral', () => {
  /* The Roman table is written out, so growing the act past it is the one
     way this derivation can go wrong quietly. It does not go quietly. */
  ENABLING_ACT_GROUPS[4].titles.push('A title with no numeral');
  try {
    expect(() => numberedActGroups()).toThrow(/no Roman numeral for act title 20/);
  } finally {
    ENABLING_ACT_GROUPS[4].titles.pop();
  }
  expect(numberedActGroups().flatMap((g) => g.titles).length).toBe(19);
});
