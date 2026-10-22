import { expect, test } from 'vitest';
import {
  CMS_AGE_PER_CAPITA_2020, ENGINE_CONSTANTS, NHE_2023_PRIVATE_INSURANCE_B, NHE_2024_OBSERVED, PARAM_DEFS
} from '../../src/lib/params';
import {
  CITATION_EXCERPTS, DECLARED_EXCERPTS, DECLARED_NOT_EXCERPTED, MAX_EXCERPT_WORDS
} from '../../src/lib/citation-excerpts';
import { TODAY_LEVELS } from '../../src/lib/equations';
import { INHERITANCE_FIGURES } from '../../src/lib/taxparams';

/* Trap table of P25, 2026-10-20: a url that answers is not a source that
   states the figure. Each cited note is held here, offline, to the excerpt
   recorded when its source was read (src/lib/citation-excerpts.ts). */

type Cited = { id: string; url: string; note: string };
const cited: Cited[] = [
  ...PARAM_DEFS.filter((d) => (d.url ?? '').trim()).map((d) => ({ id: d.id, url: d.url ?? '', note: d.source ?? '' })),
  ...ENGINE_CONSTANTS.filter((c) => (c.url ?? '').trim()).map((c) => ({ id: c.id, url: c.url ?? '', note: c.basis ?? '' }))
];

/* The numbers a figure states, in order, with the decimals each is written
   to. A hyphen or minus sign is a sign only where no digit stands before it,
   so "1.5-1.8" is two positive numbers and "−0.2" one negative one; commas
   group thousands. */
function numbersIn(s: string): { v: number; decimals: number }[] {
  const out: { v: number; decimals: number }[] = [];
  for (const m of s.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const at = m.index ?? 0;
    const before = s.charAt(at - 1);
    const neg = (before === '−' || before === '-') && !/\d/.test(s.charAt(at - 2));
    const text = m[0].replace(/,/g, '');
    const v = Number(text) * (neg ? -1 : 1);
    out.push({ v, decimals: (text.split('.')[1] ?? '').length });
  }
  return out;
}

test('the number reader reads ranges, signs and grouped thousands as written', () => {
  expect(numbersIn('$75.7-101.2B')).toEqual([{ v: 75.7, decimals: 1 }, { v: 101.2, decimals: 1 }]);
  expect(numbersIn('≈ −0.2')).toEqual([{ v: -0.2, decimals: 1 }]);
  expect(numbersIn('$105,761–$182,233')).toEqual([{ v: 105761, decimals: 0 }, { v: 182233, decimals: 0 }]);
  expect(numbersIn('one percent or less')).toEqual([]);
});

test('every cited parameter and constant has an excerpt, and every excerpt a citation', () => {
  expect(cited.length).toBeGreaterThan(0);
  expect(Object.keys(CITATION_EXCERPTS).sort()).toEqual(cited.map((c) => c.id).sort());
});

test.each(cited)('$id: the excerpt was read at the url the note cites', (c) => {
  const e = CITATION_EXCERPTS[c.id];
  expect(e).toBeDefined();
  expect(e!.url).toBe(c.url);
  expect(e!.read).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  if (e!.kind === 'table') expect(e!.where ?? '').not.toBe('');
});

test.each(cited)('$id: each excerpt is short, and states each figure the note states', (c) => {
  const e = CITATION_EXCERPTS[c.id]!;
  expect(e.excerpts.length).toBeGreaterThan(0);
  expect(e.figures.length).toBeGreaterThan(0);
  for (const x of e.excerpts) {
    expect(x.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(MAX_EXCERPT_WORDS);
  }
  for (const f of e.figures) {
    expect(e.excerpts.some((x) => x.includes(f.source)), f.source + ' in the excerpt').toBe(true);
    expect(c.note.includes(f.note), f.note + ' in the note').toBe(true);
    const a = numbersIn(f.source), b = numbersIn(f.note);
    expect(b.length, f.note + ' states as many numbers as ' + f.source).toBe(a.length);
    if (!a.length) {
      expect(f.note.toLowerCase()).toBe(f.source.toLowerCase());
      continue;
    }
    a.forEach((x, i) => {
      const y = b[i]!;
      /* agree to the note's rounding: half a unit of its last decimal */
      const tol = 0.5 * Math.pow(10, -y.decimals) + 1e-9;
      expect(Math.abs(x.v * (f.scale ?? 1) - y.v), f.source + ' against ' + f.note).toBeLessThanOrEqual(tol);
    });
  }
});

/* Review 1 of the owner decisions: the constants the decisions of
   2026-10-19 cite outside PARAM_DEFS and ENGINE_CONSTANTS. The keys come
   from the constants themselves, so a new level, band or figure needs an
   excerpt or a named reason in DECLARED_NOT_EXCERPTED. */
function declaredKeys(): string[] {
  const keys: string[] = [];
  for (const id of Object.keys(TODAY_LEVELS.entries)) keys.push('TODAY_LEVELS:' + id);
  keys.push('CMS_AGE_PER_CAPITA_2020:allAges');
  for (const band of Object.keys(CMS_AGE_PER_CAPITA_2020.bands)) keys.push('CMS_AGE_PER_CAPITA_2020:' + band);
  for (const [k, v] of Object.entries(INHERITANCE_FIGURES)) if (typeof v === 'number') keys.push('INHERITANCE_FIGURES:' + k);
  for (const [k, v] of Object.entries(NHE_2024_OBSERVED)) if (typeof v === 'number') keys.push('NHE_2024_OBSERVED:' + k);
  /* review 2 of the owner decisions: the decisions' private-insurance line */
  if (typeof NHE_2023_PRIVATE_INSURANCE_B === 'number') keys.push('NHE_2023_PRIVATE_INSURANCE_B:value');
  return keys.sort();
}

test('every figure the owner decisions cite outside the two tables has an excerpt or a named reason', () => {
  const excerpted = Object.keys(DECLARED_EXCERPTS);
  const named = Object.keys(DECLARED_NOT_EXCERPTED);
  expect([...excerpted, ...named].sort()).toEqual(declaredKeys());
  expect(excerpted.filter((k) => named.includes(k))).toEqual([]);
  for (const reason of Object.values(DECLARED_NOT_EXCERPTED)) expect(reason.length).toBeGreaterThan(20);
  /* the reason given for the 2024 band */
  expect(NHE_2024_OBSERVED.low).toBe(NHE_2024_OBSERVED.mid);
  expect(NHE_2024_OBSERVED.high).toBe(NHE_2024_OBSERVED.mid);
});

test.each(Object.entries(DECLARED_EXCERPTS).map(([key, e]) => ({ key, e })))(
  '$key: the excerpt is short and states each figure, and the figure is the constant\'s value', ({ e }) => {
    expect(e.read).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(e.url).toMatch(/^https:\/\//);
    if (e.kind === 'table') expect(e.where ?? '').not.toBe('');
    expect(e.excerpts.length).toBeGreaterThan(0);
    expect(e.figures.length).toBeGreaterThan(0);
    for (const x of e.excerpts) expect(x.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(MAX_EXCERPT_WORDS);
    for (const f of e.figures) {
      expect(e.excerpts.some((x) => x.includes(f.source)), f.source + ' in the excerpt').toBe(true);
      const n = numbersIn(f.source);
      expect(n.length, f.source + ' states one number').toBe(1);
      const scale = f.scale ?? 1;
      /* agree to the source's own rounding */
      const tol = 0.5 * Math.pow(10, -n[0]!.decimals) * scale + 1e-9;
      expect(Math.abs(n[0]!.v * scale - f.value), f.source + ' against ' + f.value).toBeLessThanOrEqual(tol);
    }
  });

/* each B is its rule applied to its source's figures, the arithmetic
   restated here rather than read through todayLevelFrom() */
test('each today\'s level is its rule applied to the figures its excerpt states', () => {
  for (const [id, lvl] of Object.entries(TODAY_LEVELS.entries)) {
    const e = DECLARED_EXCERPTS['TODAY_LEVELS:' + id];
    expect(e, id).toBeDefined();
    expect(e!.figures.map((f) => f.value), id).toEqual(lvl.evidence);
    /* review 2: narrowed on the rule, so each reads the figures it has (a
       true branch narrows the tuple; the two-figure rules come first) */
    const want = lvl.rule === 'midpoint' ? (lvl.evidence[0] + lvl.evidence[1]) / 2
      : lvl.rule === 'midpoint of complements' ? 100 - (lvl.evidence[0] + lvl.evidence[1]) / 2
      : lvl.rule === 'complement' ? 100 - lvl.evidence[0]
      : lvl.evidence[0];
    expect(lvl.pct, id).toBeCloseTo(want, 1);
  }
});
