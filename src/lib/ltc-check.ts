/* The Long-Term Care checks: the chapter's figures and their grades, held to
 * the page that publishes them and the methodology that sources them.
 *
 * Moved out of manifest-check.ts unchanged (the branch review against main,
 * 2026-10-21, found that module changing for every reason any of its checks
 * did). These read src/pages/ltc.astro, src/lib/ltc.ts as text,
 * research/long_term_care_methodology.md and every module that might
 * consume an LTC export: the planning inputs under the derived headcounts,
 * the GDP-kind styles, literals the page repeats from the data, the OECD
 * range the methodology states, and exports nothing reads.
 *
 * Build-time only; manifest-check.ts re-exports each of them. Every file
 * read goes through repo-text.ts, so this module imports no node:fs. */
import { join } from 'node:path';
import { PARAMS_BY_ID } from './params';
import { LTC_WORKFORCE } from './workforce';
import {
  WORKFORCE_ASSESS, LTC_GDP_2021, KIND_STYLE, UNIVERSAL_COVERAGE_KINDS,
  UNPAID_FAMILY_CARE_B, LTSS_SPEND_2022_B, MEDICAID_ASSET_TEST_TEXT,
  HCBS_WAITING_LIST_TEXT, type GdpKind
} from './ltc';
import { REPO_ROOT, sourceText, walk, renderedSource, flowed } from './repo-text';

export interface PlanningInputFault { figure: string; says: string; expected: string }

/* R284 [§S9d]: the arithmetic under the two headcounts that are derived
 * rather than measured, and the grade the derived one publishes.
 *
 * `projected2034M` is stated in its own comment as `5.4 + 0.772`, and
 * `matureFrameworkM` as `coveredFteM / fteFraction`. Both were comments, so
 * both could have gone stale against the number beside them.
 *
 * The grade clause is the substance of the row. The methodology has graded
 * the maturity figure `low` all along, and gives the reason -- "the FTE count
 * and part-time fraction are planning assumptions" -- while the code
 * published it under one object-level `medium` shared with four PHI
 * measurements. This asserts the code carries the grade the methodology
 * states, so raising it in either place without the other fails.
 */
export function ltcPlanningInputFaults(root = REPO_ROOT): PlanningInputFault[] {
  const out: PlanningInputFault[] = [];
  const w = LTC_WORKFORCE;

  const sum = Math.round((w.currentDirectCareM + w.newJobs2034M) * 10) / 10;
  if (sum !== w.projected2034M) {
    out.push({
      figure: 'projected2034M',
      says: String(w.projected2034M),
      expected: w.currentDirectCareM + ' + ' + w.newJobs2034M + ' = ' + sum
    });
  }

  const derived = Math.round((w.coveredFteM / w.fteFraction) * 10) / 10;
  if (derived !== w.matureFrameworkM) {
    out.push({
      figure: 'matureFrameworkM',
      says: String(w.matureFrameworkM),
      expected: w.coveredFteM + ' / ' + w.fteFraction + ' = ' + derived
    });
  }

  if (WORKFORCE_ASSESS.matureFramework.confidence !== 'low') {
    out.push({
      figure: 'matureFramework grade',
      says: WORKFORCE_ASSESS.matureFramework.confidence,
      expected: 'low, which is what the methodology grades it'
    });
  }
  /* Bounded to the bullet, and this is why. The first version of this clause
     ran `/Universal benefit at maturity[^|]*?Confidence: low/` over the whole
     flowed file. There are TWO "Confidence: low" grades in it -- the maturity
     figure's and the wage floor's, twenty lines apart -- so the pattern
     matched the second one no matter what the first said, and downgrading the
     maturity bullet to `high` left the check green. Measured, not reasoned
     about: prove_p14.py's payload reported it CANNOT FAIL. */
  const note = flowed(sourceText(LTC_METHODOLOGY, root));
  const bullet = note.match(
    /\*\*Universal benefit at maturity.*?(?=- \*\*|## )/);
  if (!bullet) {
    out.push({
      figure: 'the methodology bullet for the maturity figure',
      says: 'no bullet found',
      expected: 'a "Universal benefit at maturity" bullet stating a grade'
    });
  } else if (!/Confidence: low/.test(bullet[0])) {
    /* No `as string` here. The first version reached for one to squeeze the
       grade out of a match in a single expression, and primitiveAssertions
       failed the build for it -- correctly, and by name. */
    const stated = bullet[0].match(/Confidence: (\w+)/);
    out.push({
      figure: 'the methodology bullet for the maturity figure',
      says: stated ? stated[1] : 'no grade at all',
      expected: 'low, the grade the code publishes for this figure'
    });
  }
  return out;
}

/* ---- Long-term care chapter [§S9d] ------------------------------------- */

const LTC_METHODOLOGY = 'research/long_term_care_methodology.md';
const LTC_PAGE = 'src/pages/ltc.astro';
const LTC_DATA = 'src/lib/ltc.ts';

export interface KindStyleFault { kind: string; problem: string }

/* R288 [§S9d]: what `Record<GdpKind, ...>` cannot catch.
 *
 * The type already refuses a kind with no styling, so a check that only
 * looked for a missing entry could not fail while the types held -- the
 * shape this campaign has now shipped three times. These three can:
 *
 *   1. a kind reaching the data through a cast or a widened read. ⚠️ The
 *      section's code review measured this clause AS CALLED and found it
 *      cannot fire: KIND_STYLE is a Record over the same union LTC_GDP_2021's
 *      `kind` uses, so with the default arguments TypeScript has already
 *      refused the bad case. That is P13's colourer finding again -- the
 *      clause is a live regression test on THIS FUNCTION, exercised through
 *      the injected arguments in tests/lib/ltc.test.ts, and what it cannot do
 *      is notice anything about the shipped data. Kept and tested rather than
 *      deleted, because deleting it would lose the payload that does fail;
 *   2. a KIND_STYLE entry no row uses, which puts an unexplained swatch in a
 *      legend derived from the table rather than from the data,
 *   3. two kinds sharing a colour, which silently merges two categories on
 *      the chart and in the legend. This is the defect R288 was filed for,
 *      generalised: the OECD average shared the tax-funded colour.
 */
export function gdpKindStyleFaults(
  rows: { country: string; kind: GdpKind }[] = LTC_GDP_2021,
  style: Record<string, { color: string; label: string }> = KIND_STYLE
): KindStyleFault[] {
  const out: KindStyleFault[] = [];
  const used = new Set<string>();
  for (const r of rows) {
    used.add(r.kind);
    if (!style[r.kind]) {
      out.push({ kind: r.kind, problem: r.country + ' carries a kind with no colour or legend entry' });
    }
  }
  for (const k of Object.keys(style)) {
    if (!used.has(k)) {
      out.push({ kind: k, problem: 'styled but no row uses it, so the legend would carry a swatch nothing draws' });
    }
  }
  const byColor = new Map<string, string[]>();
  for (const k of Object.keys(style)) {
    const list = byColor.get(style[k].color) ?? [];
    list.push(k);
    byColor.set(style[k].color, list);
  }
  for (const [color, kinds] of byColor) {
    if (kinds.length > 1) {
      out.push({ kind: kinds.join(' + '), problem: 'share ' + color + ', so the chart draws them as one category' });
    }
  }
  return out;
}

export interface RepeatedLiteral { figure: string; where: string; times: number }

/* R286 [§S9d]: the figures this chapter states more than once.
 *
 * `BV6` counted five typed copies of $600B and six of $17.36, two of them
 * beside canonical fields sitting unused in the same file, plus the Nordic
 * and Dutch GDP shares retyped inside COUNTRY_SYSTEMS while living in
 * LTC_GDP_2021. Measured here before the fix: $600B six times across ltc.ts
 * and ltc.astro, $17.36 eight times once workforce.astro is counted.
 *
 * Each of these now has exactly one authored home and every other appearance
 * is an interpolation, so the literal should not appear in the source at all.
 * Zero, not one: the declaration is `UNPAID_FAMILY_CARE_B = 600`, which is
 * not the string `$600B`, and `pct: 4.4` is not the string `4.4%`.
 *
 * ltc.astro is scanned for the money figures but NOT for the GDP shares: it
 * states the 2.2% to 4.4% range in prose deliberately, and that sentence is
 * held to LTC_GDP_2021 by ltcOecdRangeDrift instead.
 */
/* Derived from the data, not hand-typed. The first version listed literal
   needles ('Denmark 3.2%', '4.4% of GDP'), so correcting a share silently
   retired the guard for that country -- the check would have gone green
   about a figure it had stopped watching. Both forms keep the context that
   stops Germany's payroll contribution of 3.4% OF WAGES matching Sweden's
   3.4% of GDP: a percentage is not identified by its digits. */
function gdpShareNeedles(): Array<{ figure: string; literal: string; files: string[] }> {
  const out: Array<{ figure: string; literal: string; files: string[] }> = [];
  for (const row of LTC_GDP_2021) {
    const pct = row.pct.toFixed(1) + '%';
    out.push({ figure: row.country + ' share', literal: pct + ' of GDP', files: [LTC_DATA] });
    out.push({ figure: row.country + ' share', literal: row.country + ' ' + pct, files: [LTC_DATA] });
  }
  return out;
}

function ltcRepeatedTable(): Array<{ figure: string; literal: string; files: string[] }> {
  return [
    { figure: 'unpaid family care', literal: '$' + UNPAID_FAMILY_CARE_B + 'B',
      files: [LTC_DATA, LTC_PAGE] },
    { figure: 'LTSS spending 2022', literal: '$' + LTSS_SPEND_2022_B + 'B',
      files: [LTC_DATA, LTC_PAGE] },
    { figure: 'the Medicaid asset test', literal: MEDICAID_ASSET_TEST_TEXT,
      files: [LTC_DATA, LTC_PAGE] },
    { figure: 'the HCBS waiting list', literal: HCBS_WAITING_LIST_TEXT,
      files: [LTC_DATA, LTC_PAGE] }
  ].concat(gdpShareNeedles());
}

export function ltcRepeatedLiterals(root = REPO_ROOT): RepeatedLiteral[] {
  const out: RepeatedLiteral[] = [];
  for (const item of ltcRepeatedTable()) {
    for (const file of item.files) {
      /* renderedSource so a comment naming a figure is not a false failure --
         the same correction M9 forced on directCareHeadcountDrift. */
      const text = renderedSource(file, root);
      const times = text.split(item.literal).length - 1;
      if (times > 0) out.push({ figure: item.figure, where: file, times });
    }
  }
  return out;
}

/* What the green note is allowed to claim: the number of DISTINCT
   figure-and-file pairs this check watches.
   ⚠️ This returned 24 for 16 pairs, because each country contributes two
   needles and the sum counted needles. The same fix run removed
   directCareSharedCount's `6 figures x 2 pages = 12` over-count and shipped
   `12 x 2 = 24` next door, in the function it was writing at the time. */
export function ltcRepeatedWatched(): number {
  const pairs = new Set<string>();
  for (const item of ltcRepeatedTable()) {
    for (const file of item.files) pairs.add(item.figure + '|' + file);
  }
  return pairs.size;
}

export interface RangeDrift { where: string; says: string; expected: string }

/* R265 [§S9d]: the OECD long-term-care range, stated in four places.
 *
 * The methodology recorded correcting Japan from 2.0% to 2.2%. That
 * correction reached the data file, the derived per-capita figure and the
 * public page, and stopped at params.ts, which went on citing a value its own
 * methodology had retired. Nothing connected the four statements, so nothing
 * reported it for as long as it stood.
 *
 * LTC_GDP_2021 is the one series. The cluster is the countries that cover the
 * benefit universally -- which is why UNIVERSAL_COVERAGE_KINDS excludes the
 * United States and the OECD average rather than a hand-written country list
 * that would have to be edited alongside the data.
 *
 * Both directions fail: editing any of the three statements fails here, and
 * so does moving a country's pct without restating them.
 */
export function ltcOecdRangeDrift(root = REPO_ROOT): RangeDrift[] {
  const out: RangeDrift[] = [];
  const cluster = LTC_GDP_2021.filter((r) => UNIVERSAL_COVERAGE_KINDS.includes(r.kind));
  const us = LTC_GDP_2021.find((r) => r.kind === 'us');
  if (!cluster.length || !us) {
    out.push({
      where: 'src/lib/ltc.ts',
      says: cluster.length + ' universal-coverage rows, ' + (us ? 'a' : 'no') + ' United States row',
      expected: 'a United States row and at least one universal-coverage row to quote a range from'
    });
    return out;
  }
  const lo = Math.min(...cluster.map((r) => r.pct)).toFixed(1);
  const hi = Math.max(...cluster.map((r) => r.pct)).toFixed(1);

  /* `source` is optional on the parameter type, and an ltcExpansion with no
     source note at all would satisfy every check below by vacuum. */
  const source = PARAMS_BY_ID['ltcExpansion'].source ?? '';
  const inParams = source.match(/spend ([\d.]+)-([\d.]+)% of GDP/);
  if (!inParams) {
    out.push({
      where: 'params.ts ltcExpansion.source',
      says: 'no "spend L-H% of GDP" clause',
      expected: 'spend ' + lo + '-' + hi + '% of GDP'
    });
  } else if (inParams[1] !== lo || inParams[2] !== hi) {
    out.push({
      where: 'params.ts ltcExpansion.source',
      says: inParams[1] + '-' + inParams[2] + '%',
      expected: lo + '-' + hi + '%'
    });
  }

  const page = flowed(sourceText(LTC_PAGE, root));
  const inPage = page.match(/least, ([\d.]+)%, against ([\d.]+)% to ([\d.]+)%/);
  if (!inPage) {
    out.push({
      where: LTC_PAGE,
      says: 'no "least, U%, against L% to H%" sentence',
      expected: 'least, ' + us.pct.toFixed(1) + '%, against ' + lo + '% to ' + hi + '%'
    });
  } else if (inPage[1] !== us.pct.toFixed(1) || inPage[2] !== lo || inPage[3] !== hi) {
    out.push({
      where: LTC_PAGE,
      says: inPage[1] + '% against ' + inPage[2] + '-' + inPage[3] + '%',
      expected: us.pct.toFixed(1) + '% against ' + lo + '-' + hi + '%'
    });
  }

  const note = flowed(sourceText(LTC_METHODOLOGY, root));
  const inNote = note.match(/cluster at ([\d.]+)-([\d.]+)%/);
  if (!inNote) {
    out.push({
      where: LTC_METHODOLOGY,
      says: 'no "cluster at L-H%" clause',
      expected: 'cluster at ' + lo + '-' + hi + '%'
    });
  } else if (inNote[1] !== lo || inNote[2] !== hi) {
    out.push({
      where: LTC_METHODOLOGY,
      says: inNote[1] + '-' + inNote[2] + '%',
      expected: lo + '-' + hi + '%'
    });
  }

  /* The retired values themselves, PARSED FROM THE METHODOLOGY rather than
     hard-coded. The methodology records the correction in its own words --
     "an earlier mix that had Germany at 2.1%, Japan at 2.0%, and a public-only
     U.S. figure of 1.0%" -- so the list of what must not survive comes from
     the document that retired them, and a future correction extends it
     without anyone editing this function.

     The first version tested only the PAIRED form `2.0-4.4`, while telling
     the reader it enforced "no superseded OECD value anywhere in the source
     note". A bare 2.0% reintroduced beside the corrected range passed. The
     message now matches what the code does, and the code does more. */
  const superseded = note.match(/replaces an earlier mix that had (.*?)the single-series/);
  const retired = superseded
    ? Array.from(superseded[1].matchAll(/(\d+\.\d+)%/g)).map((m) => m[1])
    : [];
  if (!retired.length) {
    out.push({
      where: LTC_METHODOLOGY,
      says: 'no longer records which OECD values it superseded',
      expected: 'the "replaces an earlier mix" clause, which is what names them'
    });
  }
  /* ⚠️ A retired value that is ALSO a current one is not evidence of
     anything, and the list above extends itself, so this guard is not
     hypothetical: the day the methodology's "earlier mix" clause names 4.4,
     a bare digit test fires against an NHE share in ltcExpansion.source
     (it read "raises NHE ~4.4%" until 2026-10-20, a share of NATIONAL HEALTH
     EXPENDITURE, not of GDP) and reddens the build over a correct number. `gdpShareNeedles` says a percentage is not
     identified by its digits six hundred lines from here, and the first
     version of this clause did exactly that. */
  /* A value cannot be both retired and current, and THIS is what stops
     the digit collision: when the self-extending list above names 4.4,
     the Netherlands' live share is 4.4 too, so it is skipped before it
     can match an NHE share in ltcExpansion.source (it read "raises NHE
     ~4.4%" until 2026-10-20), a share of national health expenditure, not of
     GDP. */
  const current = new Set(LTC_GDP_2021.map((r) => r.pct.toFixed(1)));
  for (const value of retired) {
    if (current.has(value)) continue;
    /* Bounded to a percentage and nothing more. A first attempt also
       required the match to read as a share of GDP; measured, that made
       the payload for this row's own declared test pass -- a bare
       ", up from 2.0% (OECD)" reintroduced beside the corrected range
       went green. The `current` guard above was already doing the work
       the context regex was added for, so it cost a real payload and
       bought nothing. */
    const digits = value.replace('.', '\\.');
    if (new RegExp('\\b' + digits + '%').test(source)) {
      out.push({
        where: 'params.ts ltcExpansion.source',
        says: 'still carries ' + value + '%, which the methodology retired',
        expected: 'no superseded OECD value anywhere in the source note'
      });
    }
  }
  return out;
}

export interface DeadExport { name: string; where: string }

/* R282 [§S9d, second fix run]: every exported content constant in the LTC
 * chapter has at least one consumer.
 *
 * This is the row's FIRST declared test, and until now nothing enforced it.
 * The cost of that shows in the history: `WHAT_WORKS` and `MEDICARE_GAP` were
 * exported and dead when the row was filed; the commit that fixed them
 * authored `WORKFORCE_ASSESS.note`, exported and dead; the commit that
 * deleted THAT authored `PLANNING_INPUTS`, exported and dead. Three
 * generations of the same defect, each written by the pass removing the
 * previous one, and every one of them found by a human review rather than by
 * the build.
 *
 * Scoped to ltc.ts on purpose. A repo-wide sweep would need an allowlist for
 * every constant a test or a generator legitimately reads, and an allowlist
 * is what this check exists to avoid. One chapter, no exemptions.
 *
 * A TEST is not a consumer. That is the whole point: `PLANNING_INPUTS` was
 * imported by tests/lib/ltc.test.ts and by nothing that reaches a reader, and
 * it read as covered.
 */
const LTC_EXPORT_CONSUMERS = ['src/pages', 'src/scripts', 'src/lib', 'src/components'];

export function deadLtcExports(root = REPO_ROOT): DeadExport[] {
  const out: DeadExport[] = [];
  const declared = renderedSource(LTC_DATA, root)
    .matchAll(/^export (?:const|function) ([A-Za-z_][A-Za-z0-9_]*)/gm);

  const files: string[] = [];
  for (const dir of LTC_EXPORT_CONSUMERS) walk(join(root, dir), root, files);
  /* ltc.ts itself is a reader, with its own declarations stripped. A constant
     that only feeds another constant in the same module has a consumer; the
     defect this row names is one that NOTHING reads. Measured: without this,
     perCapitaSpend and LTC_COST_2024 both read as dead, and both are used one
     screen from where they are declared. */
  const readers: string[] = [
    renderedSource(LTC_DATA, root)
      .replace(/^export (?:const|function) [A-Za-z_][A-Za-z0-9_]*/gm, ' ')
  ];
  for (const rel of files) {
    if (rel === LTC_DATA) continue;
    if (!/\.(ts|astro)$/.test(rel)) continue;
    readers.push(renderedSource(rel, root));
  }

  for (const m of declared) {
    const name = m[1];
    const used = readers.some((body) =>
      /* Two backslashes. A shell heredoc collapsed the pair when this
         function was appended, leaving a single backslash before the b -- which in a JS STRING
         literal is U+0008, backspace, not a word boundary. The pattern
         became BACKSPACE + name + BACKSPACE, matched nothing, and every
         export in the file read as dead. The check was wrong, not the
         code it was accusing. */
      new RegExp('\\b' + name + '\\b').test(body));
    if (!used) out.push({ name, where: LTC_DATA });
  }
  return out;
}
