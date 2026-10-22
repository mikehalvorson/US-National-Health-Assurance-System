import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Hardening from '../../src/pages/hardening.astro';

/* =========================================================================
 * R158 [§S17] (§AU2): "every rendered target string matches its cited
 * requirement's wording".
 *
 * §AU1 verified the Executive Hardening chapter's six acceptance targets
 * against the requirement register, and the section brief puts the page
 * under "do not touch" for that reason. §AU2, in the same section, found one
 * of the six adding a word: SR-LAW-009 requires legal contingency coverage
 * for at least 99% of critical provisions, and the tile said "covered by a
 * tested contingency", a claim the requirement does not make and the page's
 * own limits section argues against. This holds all six, so the one word
 * could be removed without anything else moving:
 *   - the tile's threshold is the requirement's number, as a whole number
 *     (not a substring of a longer one), in the requirement's direction
 *     ("at least", "at or above", "no less than" or "not less than" for >=;
 *     "within", "at most", "no more than" or "not more than" for <=; any case);
 *   - every word of the tile's label is in the requirement, allowing for
 *     inflection (a shared stem of five letters, or the whole of a shorter
 *     word) and for the paraphrases declared below, each with the
 *     requirement word it stands for. A paraphrase no tile uses is reported,
 *     so the table cannot grow quietly.
 *
 * Review of P23: the first version found each tile's requirement by reading
 * the SR or TPP id the tile renders, so the test depended on source-document
 * codes staying on a public page (golden rule 2 keeps them off; that is an
 * open question for the owner), and threw a TypeError rather than failing by
 * name if they went. The mapping is declared here now, by the tile's label,
 * and a rendered code, while it is there, must agree with it. Its threshold
 * check was a substring test, which passed ">=9.5%" against "99.5%".
 * ========================================================================= */

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const EXTRACT = readFileSync(join(REPO_ROOT, 'research/framework_v2_extract.md'), 'utf8');

/* tile label (its opening words) -> the requirement it states; TPP-12.4's
   tile cites no SR id, and SR-RGT-011 is the one requirement tracing it */
const TILE_REQUIREMENTS: Array<[string, string]> = [
  ['core spending under', 'SR-LAW-001'],
  ['critical-office staffing floor', 'SR-LAW-002'],
  ['critical functions continuing', 'SR-LAW-003'],
  ['to initiate action', 'SR-LAW-004'],
  ['required public data', 'SR-RGT-011'],
  ['critical legal provisions', 'SR-LAW-009']
];

const STOPWORDS = new Set(['a', 'an', 'the', 'to', 'of', 'by', 'for', 'on', 'in', 'at', 'and', 'or', 'with']);
/* "continuing" needs no entry: it shares its stem with the requirement's
   "continuity", and the first draft's entry for it was reported as unused. */
const PARAPHRASES: Record<string, string> = {
  through: 'during',        /* "through leadership vacancies" for "during leadership vacancies" */
  after: 'within'           /* "after an unlawful delay flag" for "within 24 hours of unlawful delay flag" */
};

function requirementText(code: string): string {
  const m = new RegExp('^\\| ' + code.replace(/[.-]/g, (c) => '\\' + c) + ' \\| (.+?) \\|', 'm').exec(EXTRACT);
  if (!m) throw new Error('no requirement row for ' + code);
  return m[1];
}

/* the SR requirement whose trace column names this TPP id directly, exactly
   one. A trace column that is only a list of ids is a direct trace; a later
   table's "TPP-12.4 derived through parent requirement trace" is not (first
   run: SR-IF-011 matched that way). */
function requirementIdTracing(tpp: string): string {
  const hits = [...EXTRACT.matchAll(/^\| (SR-[A-Z]+-\d{3}) \| (.+?) \| ([^|]*) \|/gm)]
    .filter((m) => /^[\sA-Z0-9.,/-]+$/.test(m[3]))
    .filter((m) => new RegExp('\\b' + tpp.replace('.', '\\.') + '\\b').test(m[3]));
  const ids = [...new Set(hits.map((h) => h[1]))];
  if (ids.length !== 1) throw new Error(tpp + ' is traced by ' + ids.join(', '));
  return ids[0];
}

const words = (s: string): string[] => s.toLowerCase().replace(/[^a-z0-9.%\s-]/g, ' ').split(/[\s-]+/).filter(Boolean);

function matches(word: string, req: string[]): boolean {
  return req.some((r) => {
    if (r === word) return true;
    let n = 0;
    while (n < word.length && n < r.length && word[n] === r[n]) n += 1;
    return n >= Math.min(5, word.length, r.length) && n >= 4;
  });
}

/* the tile's threshold, as the requirement states it: the same whole number
   and unit, preceded by words of the same direction */
const AT_LEAST = /(?:at least|at or above|no less than|not less than)\s*$/i;
const AT_MOST = /(?:within|at most|no more than|not more than)\s*$/i;

function thresholdFault(value: string, req: string): string | null {
  const t = /(&ge;|≥|&le;|≤)\s*(\d+(?:\.\d+)?)\s*(%| hours)/.exec(value);
  if (!t) return 'threshold ' + value + ' is not a bounded number';
  const atLeast = t[1] === '&ge;' || t[1] === '≥';
  const unit = t[3] === '%' ? '%' : ' hours';
  /* the lookbehind keeps 9.5 out of 99.5; the unit, which must follow the
     number at once, keeps 9 out of 9.5 (review 2 of P23: a lookahead here
     did nothing the unit did not) */
  const at = new RegExp('(?<![\\d.])' + t[2].replace('.', '\\.') + (unit === '%' ? '%' : ' hours')).exec(req);
  if (!at) return 'threshold ' + value + ' is not in "' + req + '"';
  const before = req.slice(0, at.index);
  if (!(atLeast ? AT_LEAST : AT_MOST).test(before)) {
    return 'threshold ' + value + ' runs the other way from "' + req + '"';
  }
  return null;
}

interface Tile { value: string; label: string; codes: string }

async function tiles(): Promise<Tile[]> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Hardening);
  const grid = /<div role="group" class="hardening-target-grid"[\s\S]*?<\/section>/.exec(html);
  expect(grid).not.toBeNull();
  return [...grid![0].matchAll(/<article\b[^>]*>\s*<strong\b[^>]*>([^<]+)<\/strong>\s*<span\b[^>]*>([^<]+)<\/span>(?:\s*<small\b[^>]*>([^<]*)<\/small>)?/g)]
    .map((m) => ({ value: m[1], label: m[2].replace(/\s+/g, ' ').trim(), codes: m[3] || '' }));
}

function faults(t: Tile, used: Set<string>): string[] {
  const mapped = TILE_REQUIREMENTS.filter(([start]) => t.label.startsWith(start));
  if (mapped.length !== 1) return [t.label + ': no declared requirement'];
  const id = mapped[0][1];
  const out: string[] = [];
  /* a code the tile renders, while it renders one, must agree */
  const sr = /SR-[A-Z]+-\d{3}/.exec(t.codes);
  const tpp = /TPP-\d+\.\d+/.exec(t.codes);
  if (sr && sr[0] !== id) out.push(t.label + ': renders ' + sr[0] + ', declared ' + id);
  if (!sr && tpp && requirementIdTracing(tpp[0]) !== id) out.push(t.label + ': renders ' + tpp[0] + ', which does not trace to ' + id);
  const req = requirementText(id);
  const reqWords = words(req);
  const th = thresholdFault(t.value, req);
  if (th) out.push(id + ': ' + th);
  for (const w of words(t.label)) {
    if (STOPWORDS.has(w) || matches(w, reqWords)) continue;
    if (PARAPHRASES[w] && reqWords.includes(PARAPHRASES[w])) { used.add(w); continue; }
    out.push(id + ': "' + w + '" is not in the requirement');
  }
  return out;
}

/* Review 2 of P23: each tile had to map to exactly one entry, and nothing
   asked that each entry be used once, so two copies of one tile and none of
   another passed. Each declared requirement is stated by exactly one tile. */
function unmatchedRequirements(list: Tile[]): string[] {
  return TILE_REQUIREMENTS
    .map(([start]) => [start, list.filter((t) => t.label.startsWith(start)).length] as const)
    .filter(([, n]) => n !== 1)
    .map(([start, n]) => start + ': matched by ' + n + ' tiles');
}

test('R158: every rendered target string matches its cited requirement\'s wording', async () => {
  const all = await tiles();
  expect(all).toHaveLength(TILE_REQUIREMENTS.length);
  expect(unmatchedRequirements(all)).toEqual([]);
  const used = new Set<string>();
  expect(all.flatMap((t) => faults(t, used))).toEqual([]);
  expect(Object.keys(PARAPHRASES).filter((p) => !used.has(p))).toEqual([]);
});

test('R158: the word the requirement does not say is reported, and so is a wrong threshold', () => {
  const used = new Set<string>();
  expect(faults({ value: '&ge;99%', label: 'critical legal provisions covered by a tested contingency', codes: 'SR-LAW-009 / verification package' }, used))
    .toEqual(['SR-LAW-009: "tested" is not in the requirement']);
  expect(faults({ value: '&ge;98%', label: 'core spending under mandatory payment protection', codes: '' }, used))
    .toEqual(['SR-LAW-001: threshold &ge;98% is not in "The system shall place at least 99.5% of core spending under mandatory payment protection by Phase 8."']);
  /* the TPP-only tile's requirement is the one tracing to it */
  expect(requirementIdTracing('TPP-12.4')).toBe('SR-RGT-011');
});

test('review of P23: a threshold is a whole number in the requirement\'s direction', () => {
  const r001 = requirementText('SR-LAW-001');
  const r004 = requirementText('SR-LAW-004');
  expect(thresholdFault('&ge;9.5%', r001)).toMatch(/is not in/);       /* a substring of 99.5% */
  expect(thresholdFault('&le;99.5%', r001)).toMatch(/runs the other way/);
  expect(thresholdFault('&le;4 hours', r004)).toMatch(/is not in/);    /* a substring of 24 hours */
  expect(thresholdFault('&ge;24 hours', r004)).toMatch(/runs the other way/);
  expect(thresholdFault('&ge;99.5%', r001)).toBeNull();
  expect(thresholdFault('&le;24 hours', r004)).toBeNull();
});

test('review of P23: the tiles are matched to requirements without reading their rendered codes', () => {
  const used = new Set<string>();
  /* the codes gone, the check still works */
  expect(faults({ value: '&ge;99%', label: 'critical legal provisions with legal contingency coverage', codes: '' }, used)).toEqual([]);
  /* a rendered code that disagrees with the declaration is reported */
  expect(faults({ value: '&ge;99%', label: 'critical legal provisions with legal contingency coverage', codes: 'SR-LAW-008' }, used))
    .toEqual(['critical legal provisions with legal contingency coverage: renders SR-LAW-008, declared SR-LAW-009']);
  expect(faults({ value: '&ge;99%', label: 'an unknown tile', codes: '' }, used)).toEqual(['an unknown tile: no declared requirement']);
});

test('review 2 of P23: two copies of one tile and none of another are reported', async () => {
  const all = await tiles();
  const legal = all.find((t) => t.label.startsWith('critical legal provisions'))!;
  const swapped = all.map((t) => t.label.startsWith('required public data') ? legal : t);
  expect(swapped).toHaveLength(TILE_REQUIREMENTS.length);
  expect(unmatchedRequirements(swapped)).toEqual([
    'required public data: matched by 0 tiles',
    'critical legal provisions: matched by 2 tiles'
  ]);
});

test('review 2 of P23: the direction words are read in any case, with "not less than" and "not more than"', () => {
  expect(thresholdFault('&ge;5%', 'The system shall keep not less than 5% in reserve.')).toBeNull();
  expect(thresholdFault('&le;5%', 'Not more than 5% may lapse.')).toBeNull();
  expect(thresholdFault('&ge;5%', 'At least 5% of offices.')).toBeNull();
  expect(thresholdFault('&le;5%', 'At least 5% of offices.')).toMatch(/runs the other way/);
});
