/* The Workforce checks: the ledger, the unit staffing model and the
 * direct-care figures, held to the chapters that publish them and the
 * methodology that derives them.
 *
 * Moved out of manifest-check.ts (the branch review against main,
 * 2026-10-21, found that module changing for every reason any of its checks
 * did). These read src/pages/workforce.astro and its client, the Long-Term
 * Care page where it states the same direct-care headcounts,
 * research/workforce_transition_methodology.md, the other research files for
 * a blocker its anchor table has since solved, and the framework extract for
 * the requirement families the expansions price.
 *
 * The code moved as it was. A comment names units-check.ts where it said
 * "above".
 *
 * Build-time only; manifest-check.ts re-exports each of them. Every file
 * read goes through repo-text.ts, so this module imports no node:fs. */
import { FRAMEWORK_EXTRACT } from './source-package';
import { PARAMS_BY_ID } from './params';
import {
  ADMINISTRATIVE_MATCH_IDS, CLINICAL_ENTRANT_IDS, createdGroupTotals,
  CREATED_SCOPE_EXCLUSIONS, OEWS_TOTAL_EMPLOYMENT_2024, TOTAL_US_EMPLOYMENT_2024,
  DIRECT_PATIENT_CARE_PHYSICIANS, priorAuthReleasedFte, SCENARIOS, UNIT_MODEL,
  unitMixWeightedFte, WORKER_SUPPORT_RATE, workforceLedgerFigures
} from './workforce';
import { REPO_ROOT, enumerateSourceFiles, sourceText, renderedSource, flowed } from './repo-text';

/* R283 [§S9d]: the direct-care headcounts, after the collapse.
 *
 * §S9a's review found seven figures authored twice -- `LTC_WORKFORCE` in
 * workforce.ts and `WORKFORCE_ASSESS` in ltc.ts -- with nothing holding them
 * together, and added a check comparing the two objects field by field. Its
 * own comment said "§S9d can then collapse them knowing the collapse is
 * safe". §S9d has: WORKFORCE_ASSESS now reads LTC_WORKFORCE.
 *
 * WHICH MAKES THAT CHECK UNFAILABLE. Both sides of every pair became the same
 * expression. Comparing `LTC_WORKFORCE.currentDirectCareM` with a field
 * initialised from `LTC_WORKFORCE.currentDirectCareM` is a tautology, and a
 * tautology that reports "7 figures shared, all agreeing" reads exactly like
 * a check doing its job.
 *
 * The coverage is re-pointed at what can still go wrong once the modules are
 * wired: a PAGE going back to a hand-typed figure.
 *
 * ⚠️ THE FIRST VERSION OF THIS REPLACEMENT WAS ALSO TOO WEAK, and the section
 * code review measured it rather than reading it. It searched each page for
 * the model's CURRENT value written out -- so typing `9.9 million` passed,
 * deleting a figure entirely passed, and the row still reported "every one
 * interpolated". Both halves below exist because of that.
 *
 * POSITIVE half: every figure must still appear as an interpolation
 * expression in the page that states it. Delete one and this fails. That is
 * the half the value-matching version had no way to do.
 *
 * NEGATIVE half: any literal of the SHAPE these figures take, anywhere in
 * either page, is a fault whatever its value -- because a literal is the
 * defect regardless of whether it currently agrees. The allowlist is the
 * honest cost of that: two figures on the Workforce page genuinely belong to
 * other models and are written the same way. An allowlist entry that stops
 * matching is itself a fault, so a stale exemption cannot hide.
 *
 * renderedSource, not sourceText: it masks comments and strips import lines.
 * The first version's comment claimed this and the code called sourceText, so
 * a comment quoting "5.4 million" would have failed the build.
 */
const DIRECT_CARE_PAGES = ['src/pages/ltc.astro', 'src/pages/workforce.astro'];

/* The interpolation each page is expected to carry. `alias` is what the page
   aliases LTC_WORKFORCE to in its frontmatter; the two pages use different
   names, which is why this is a table rather than a prefix. */
const DIRECT_CARE_INTERPOLATIONS: Array<{ field: string; page: string; alias: string }> = [
  { field: 'currentDirectCareM', page: 'src/pages/ltc.astro', alias: 'wf' },
  { field: 'projected2034M', page: 'src/pages/ltc.astro', alias: 'wf' },
  { field: 'matureFrameworkM', page: 'src/pages/ltc.astro', alias: 'wf' },
  { field: 'openings2034M', page: 'src/pages/ltc.astro', alias: 'wf' },
  { field: 'medianWageNow', page: 'src/pages/ltc.astro', alias: 'wf' },
  { field: 'homeTurnoverPct', page: 'src/pages/ltc.astro', alias: 'wf' },
  { field: 'currentDirectCareM', page: 'src/pages/workforce.astro', alias: 'dc' },
  { field: 'homeCareM', page: 'src/pages/workforce.astro', alias: 'dc' },
  { field: 'openings2034M', page: 'src/pages/workforce.astro', alias: 'dc' },
  { field: 'medianWageNow', page: 'src/pages/workforce.astro', alias: 'dc' },
  { field: 'homeTurnoverPct', page: 'src/pages/workforce.astro', alias: 'dc' },
  { field: 'coveredFteM', page: 'src/pages/workforce.astro', alias: 'dc' }
];

/* Literals shaped like a direct-care figure. Deliberately value-blind.
 *
 * ⚠️ The turnover entry used to read `/\b\d{1,3}% annual home-care turnover\b/`
 * -- the Workforce page's own SENTENCE with the digits blanked. It could not
 * fire at either site that actually states the figure: the tile writes
 * `~75%/yr` and the LTC page writes "turnover runs near 75%". A shape copied
 * from one occurrence is not a shape, it is that occurrence.
 *
 * Built fresh per call rather than shared at module scope. `matchAll` clones
 * its regex and never writes back, so a shared one is safe TODAY -- measured
 * -- but one `.test()` or `.exec()` on it anywhere would leave `lastIndex`
 * non-zero and make `matchAll` silently skip the first match. That is a
 * silent pass waiting for an unrelated edit.
 */
function directCareShapes(): Array<[string, RegExp]> {
  return [
    ['a headcount in millions', /\b\d+\.\d+ million\b/g],
    ['an hourly wage', /\$\d+\.\d\d\b/g],
    /* Any percentage written as a yearly rate, or within forty characters of
       the word "turnover" on either side. Value-blind, and it covers all
       three phrasings the two pages use. */
    ['a turnover rate', /\b\d{1,3}%\/yr\b/g],
    ['a turnover rate', /\b\d{1,3}%[^.]{0,40}turnover|turnover[^.]{0,40}\b\d{1,3}%/g]
  ];
}

/* Figures on the Workforce page that match a shape above and belong to a
   DIFFERENT model, so interpolating them from LTC_WORKFORCE would be wrong.
   Each is checked to still be present: an exemption nothing needs is a fault,
   so this list cannot quietly grow stale or over-broad. */
interface ShapeExemption { page: string; literal: string; times: number }

/* ⚠️ Counted, not matched. The first version skipped every occurrence of an
   exempt string anywhere in the page, so a SECOND, unrelated "1.9 million"
   would have been waved through with the first. An exemption is for one known
   occurrence; a new one is a new fault. */
const DIRECT_CARE_SHAPE_EXEMPTIONS: ShapeExemption[] = [
  /* All healthcare occupation openings (BLS). A labour-market total, not a
     direct-care headcount. */
  { page: 'src/pages/workforce.astro', literal: '1.9 million', times: 1 },
  /* Total US employment, the denominator of the labour-share tile beside it.
     This one was interpolated from TOTAL_US_EMPLOYMENT_2024 during the fix
     run and then put back, because `workforceProseDrift` ALREADY gates the
     literal against that constant -- so the drift was defended, and rewriting
     an earlier section's value gate into a shape gate to remove a literal it
     was watching would have been a worse trade. The exemption is safe because
     another check holds it, which is the only reason an exemption should be
     safe. */
  { page: 'src/pages/workforce.astro', literal: '169.96 million', times: 1 }
];

export interface DirectCareDisagreement {
  figure: string;
  where: string;
  literal: string;
}

export function directCareHeadcountDrift(root = REPO_ROOT): DirectCareDisagreement[] {
  const out: DirectCareDisagreement[] = [];

  for (const want of DIRECT_CARE_INTERPOLATIONS) {
    const body = renderedSource(want.page, root);
    if (!body.includes('{' + want.alias + '.' + want.field)) {
      out.push({
        figure: want.field,
        where: want.page,
        literal: 'no {' + want.alias + '.' + want.field + '} interpolation'
      });
    }
  }

  for (const page of DIRECT_CARE_PAGES) {
    /* ⚠️ flowed(), and this is a regression the section's first fix run
       introduced. The line read `flowed(sourceText(page, root))`; correcting
       sourceText to renderedSource dropped the flatten with it, while every
       shape above hard-codes a single space. `5.4\n        million` was
       therefore invisible -- and ltc.astro already wraps in exactly that
       shape. renderedSource for the comment masking, flowed for the wraps;
       the two fixes are independent and both are needed. */
    const body = flowed(renderedSource(page, root));
    const budget = new Map<string, number>();
    for (const e of DIRECT_CARE_SHAPE_EXEMPTIONS) {
      if (e.page === page) budget.set(e.literal, e.times);
    }
    for (const [shape, pattern] of directCareShapes()) {
      for (const m of body.matchAll(pattern)) {
        const left = budget.get(m[0]);
        if (left !== undefined && left > 0) {
          budget.set(m[0], left - 1);
          continue;
        }
        out.push({ figure: shape, where: page, literal: m[0] });
      }
    }
    /* An exemption nothing spent is an exemption for a literal that has gone,
       so the entry is stale and the list has stopped describing the page. */
    for (const [literal, left] of budget) {
      if (left > 0) {
        out.push({
          figure: 'a stale exemption',
          where: page,
          literal: literal + ' is exempted ' + left + ' more time(s) than it appears'
        });
      }
    }
  }
  return out;
}

/* The number the self-test row reports. It used to multiply six figures by
   two pages and report 12 -- a figure nothing produced, for nine real pairs. */
export function directCareSharedCount(): number {
  return DIRECT_CARE_INTERPOLATIONS.length;
}

/* R168 [§S9a]: requirement density runs inversely to cost, and the dashboard
 * should say so rather than leave it implicit.
 *
 * Measured, not taken from the row. Counting unique SR requirement IDs in the
 * framework transcription:
 *
 *   SR-ARCH 15   SR-ADP 15   SR-ACC 15   SR-IF 15   SR-DATA 12   SR-RGT 12
 *   SR-COV 11    ... SR-BH 3    SR-LTC 3    SR-DVH 2    SR-EMS 2
 *
 * The four thinnest families carry ten requirements between them and govern
 * the benefit expansions, which price at $457B a year. Public health is
 * thinner still: no SR family governs it at all. It is priced inside
 * emsPhExpansion and has no requirements of its own.
 *
 * Both sides can move. The counts come from the framework transcription and
 * the dollars from params.ts, so sourcing a family or repricing a parameter
 * changes the answer, and a family that grows past the threshold stops being
 * reported without anyone editing a list.
 *
 * The threshold is the row's own: fewer than five requirements is
 * under-specified. */
const UNDER_SPECIFIED_BELOW = 5;

export function requirementFamilyCounts(root = REPO_ROOT): Map<string, number> {
  const text = sourceText(FRAMEWORK_EXTRACT, root);
  const seen = new Map<string, Set<string>>();
  for (const m of text.matchAll(/\bSR-([A-Z]+)-(\d{3})\b/g)) {
    const family = 'SR-' + m[1];
    if (!seen.has(family)) seen.set(family, new Set());
    seen.get(family)!.add(m[2]);
  }
  const out = new Map<string, number>();
  for (const [family, ids] of seen) out.set(family, ids.size);
  return out;
}

export interface UnderSpecified {
  domain: string;
  family: string | null;
  requirements: number;
  annualB: number;
  paramIds: string[];
  /* Set when every parameter pricing this domain was already claimed by an
     EARLIER row, and names that row. Public health is the case: it sits
     inside emsPhExpansion, which the EMS row already accounts for, so adding
     its annualB to a total would count that $45B twice. Reported rather than
     hidden, because "no cost line of its own" is part of the finding -- but
     reported against the domain that actually lacks one, not against both
     domains that share a line. */
  pricedInsideRow: string | null;
}

/* Each parameter once. Summing the rows double-counts emsPhExpansion. */
export function underSpecifiedAnnualB(rows: UnderSpecified[]): number {
  const seen = new Set<string>();
  let total = 0;
  for (const row of rows) {
    for (const id of row.paramIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      total += PARAMS_BY_ID[id] ? PARAMS_BY_ID[id].mode : 0;
    }
  }
  return total;
}

export function underSpecifiedExpansions(root = REPO_ROOT): UnderSpecified[] {
  const counts = requirementFamilyCounts(root);
  const out: UnderSpecified[] = [];
  const seenFamilies = new Set<string>();
  for (const exclusion of CREATED_SCOPE_EXCLUSIONS) {
    const family = exclusion.requirementFamily;
    /* dental, vision and hearing are three domains under one family; report
       the family once, priced once */
    const key = family || exclusion.domain;
    if (seenFamilies.has(key)) continue;
    const requirements = family ? (counts.get(family) ?? 0) : 0;
    if (requirements >= UNDER_SPECIFIED_BELOW) continue;
    seenFamilies.add(key);
    const domain = family
      ? CREATED_SCOPE_EXCLUSIONS.filter((e) => e.requirementFamily === family)
        .map((e) => e.domain).join(', ')
      : exclusion.domain;
    /* first row to name a parameter owns its dollars; later rows sharing it
       say whose line they are inside */
    const owner = out.filter(
      (row) => exclusion.paramIds.every((id) => row.paramIds.indexOf(id) >= 0))[0];
    out.push({
      domain: domain,
      family: family,
      requirements: requirements,
      annualB: exclusion.paramIds.reduce(
        (total, id) => total + (PARAMS_BY_ID[id] ? PARAMS_BY_ID[id].mode : 0), 0),
      paramIds: exclusion.paramIds,
      pricedInsideRow: owner ? owner.domain : null
    });
  }
  return out;
}

/* The chapter has to actually render the measurement, not merely be able to.
   Astro frontmatter is stripped from the served HTML, so this reads the source
   for the call AND for the loop that emits it: importing the function and
   never mapping over the result is the "a mention is not a use" defect the
   §S7 review found and §S8 wrote again. */
export function underSpecifiedRendered(root = REPO_ROOT): boolean {
  const page = sourceText(WORKFORCE_PAGE, root);
  return /underSpecifiedExpansions\s*\(/.test(page) &&
    /UNDER_SPECIFIED\.map\s*\(/.test(page);
}

/* R29 [§S9a]: a research file must not carry a "we could not get this" note
 * for data the repository already holds.
 *
 * research/05 recorded that BLS returned HTTP 403 and that the counts for
 * occupation codes 43-9041 and 43-3021 "could not be retrieved". A later pass
 * retrieved them and wrote them into the workforce methodology note's anchor
 * table, and research/05 was never updated -- so the file kept sending the
 * next reader to re-chase a solved problem, with an action item addressed to
 * them by name.
 *
 * The check reads both sides: the anchor table for which SOC codes the
 * repository actually has a count for, and every research file for blocker
 * language naming one of them. A code whose count is present and whose
 * blocker is still advertised is the defect.
 *
 * It fails in both directions, which is what keeps it honest. Deleting the
 * anchor row clears the report by removing the data, and that is a real
 * change of state rather than a loophole: if the count goes, the blocker note
 * is true again. The anchors are separately joined to the chapter, so the
 * count cannot disappear silently. */
const RESEARCH_DIR = 'research';
const BLOCKER_MARKERS = [
  'could not retrieve',
  'could not be retrieved',
  'blocked automated fetch',
  'http 403',
  'returned 403'
];
const SOC_CODE = /\b\d{2}-\d{4}\b/g;

/* SOC codes the anchor table gives a count for, read from the table. */
export function anchoredOccupationCodes(root = REPO_ROOT): Map<string, number> {
  const out = new Map<string, number>();
  const note = sourceText(UNIT_METHODOLOGY, root);
  for (const m of note.matchAll(
    /\|[^|]*SOC (\d{2}-\d{4})\s*\|\s*([\d,]+)\s*\|/g)) {
    out.set(m[1], Number(m[2].split(',').join('')));
  }
  return out;
}

export interface SolvedBlocker {
  file: string;
  code: string;
  count: number;
  marker: string;
}

export function solvedResearchBlockers(root = REPO_ROOT): SolvedBlocker[] {
  const anchored = anchoredOccupationCodes(root);
  const out: SolvedBlocker[] = [];
  if (!anchored.size) return out;
  for (const rel of enumerateSourceFiles(root)) {
    if (!rel.startsWith(RESEARCH_DIR + '/') || !rel.endsWith('.md')) continue;
    if (rel.endsWith('/' + UNIT_METHODOLOGY.split('/')[1])) continue;
    for (const line of sourceText(rel, root).split('\n')) {
      const lower = line.toLowerCase();
      const marker = BLOCKER_MARKERS.filter((b) => lower.indexOf(b) >= 0)[0];
      if (!marker) continue;
      SOC_CODE.lastIndex = 0;
      for (const code of line.match(SOC_CODE) || []) {
        if (anchored.has(code)) {
          out.push({ file: rel, code: code, count: anchored.get(code)!, marker: marker });
        }
      }
    }
  }
  return out;
}

/* R64 [§S9a]: every ledger figure typed into the Workforce chapter, held to
 * the module that derives it.
 *
 * The chapter states its arithmetic three times: once as the static content
 * of the elements the client overwrites (which is what a reader without
 * JavaScript sees, and what a search engine indexes), once in the risk rows
 * and the immigration tiles as prose, and once in the "what is derived" card.
 * None of the three was checked against anything.
 *
 * R64's subject is that landing Type E moves all of them at once -- unit
 * teams, `created`, entrants, the annual pace, and the training-slot ratio,
 * which is the tab's central feasibility argument at 4.4x. Type E is §S9b's
 * and Part 2's. This is what stops the argument being inherited: when the
 * ledger moves and the prose does not, the build names the sentence.
 *
 * Two lists, because the failure modes differ. STATIC_FALLBACKS is mechanical
 * -- an id, the figure it should show, and how the client formats it. The
 * prose claims each need their own anchor, because a bare number in a
 * sentence is not identifiable and matching one would pass on any other
 * sentence that happened to carry it. */
const WORKFORCE_PAGE = 'src/pages/workforce.astro';
const WORKFORCE_CLIENT = 'src/scripts/workforce-client.ts';
const SCOPE_EXCLUSION_ELEMENT = 'wf-scope-exclusions';
const EMPLOYMENT_SERIES_ELEMENT = 'wf-labor-series';

type FigureFormat = 'thousands' | 'short' | 'percent0' | 'percent2' | 'ratio1' | 'plain';

function formatFigure(value: number, format: FigureFormat): string {
  switch (format) {
    case 'thousands': return (value * 1000).toLocaleString('en-US');
    case 'short': return value.toLocaleString('en-US') + 'k';
    case 'percent0': return Math.round(value) + '%';
    case 'percent2': return value.toFixed(2) + '%';
    case 'ratio1': return value.toFixed(1);
    default: return value.toLocaleString('en-US');
  }
}

export interface WorkforceProseDisagreement {
  where: string;
  says: string;
  expected: string;
}

export interface WorkforceProseAudit {
  problems: WorkforceProseDisagreement[];
  /* How many typed figures the run actually covered, counted rather than
     stated. The registered row said "22 no-script fallbacks and 15 stated
     claims" and there are 14: a hardcoded count in a note is the same drift
     the rest of this file exists to catch, one layer down.

     Code review [§S9a]: the first fix for that put the two counts in
     module-level variables set as a SIDE EFFECT of the check, so reading them
     before running it returned {0, 0} -- a figure that is wrong rather than
     absent, which is worse than the typed count it replaced. They are
     returned by the run that produced them now, and there is no shared
     state to read early. */
  fallbacks: number;
  claims: number;
}

export function workforceProseDrift(root = REPO_ROOT): WorkforceProseAudit {
  const out: WorkforceProseDisagreement[] = [];
  const f = workforceLedgerFigures('plan');
  const admin = createdGroupTotals(ADMINISTRATIVE_MATCH_IDS, 'plan');
  const clinical = createdGroupTotals(CLINICAL_ENTRANT_IDS, 'plan');
  const units = createdGroupTotals(['units'], 'plan');
  const rural = createdGroupTotals(['rural'], 'plan');
  const raw = sourceText(WORKFORCE_PAGE, root);

  /* 1. what a reader without JavaScript sees. The client writes the plan
        scenario on init, so the static content has to be the plan scenario. */
  const fallbacks: Array<[string, number, FigureFormat]> = [
    ['wf-eliminated', f.eliminated, 'thousands'],
    ['wf-created', f.created, 'thousands'],
    ['wf-inside', f.inside, 'thousands'],
    ['wf-new-hires', f.entrants, 'thousands'],
    ['wf-supported', f.supported, 'thousands'],
    ['wf-ledger-transfer', f.inside, 'thousands'],
    ['wf-reconcile-created', f.created, 'thousands'],
    ['wf-reconcile-inside', f.inside, 'thousands'],
    ['wf-reconcile-entrants', f.entrants, 'thousands'],
    ['wf-scope-eliminated', f.eliminated, 'thousands'],
    ['wf-scope-created', f.created, 'thousands'],
    ['wf-scope-difference', Math.abs(f.scopedDifference), 'thousands'],
    ['wf-labor-entrants', f.entrants, 'thousands'],
    ['wf-labor-annual', f.annualEntrants, 'plain'],
    ['wf-labor-share', f.employmentSharePct, 'percent2'],
    ['wf-labor-transition', f.transitionSharePct, 'percent0'],
    ['wf-training-ratio', f.trainingRatio, 'ratio1'],
    ['wf-table-annual', f.annualEntrants, 'plain'],
    ['wf-flow-eliminated', f.eliminated, 'short'],
    ['wf-flow-inside', f.inside, 'short'],
    ['wf-flow-external', f.externalPlacement, 'short'],
    ['wf-flow-gap', f.unresolvedGap, 'short']
  ];
  for (const [id, value, format] of fallbacks) {
    const m = raw.match(new RegExp('id="' + id + '"[^>]*>([^<]*)<'));
    const wanted = formatFigure(value, format);
    if (!m) {
      out.push({ where: id, says: 'no such element', expected: wanted });
    } else if (m[1].indexOf(wanted) < 0) {
      out.push({ where: id + ' fallback', says: m[1].trim(), expected: wanted });
    }
  }

  /* 2. the sentences. Each anchored on enough of its own wording to be the
        only place it can match, so a figure that moves is reported against
        the claim that carries it rather than against a line number. */
  const claims: Array<[string, RegExp, number]> = [
    ['the created-positions heading',
      /Where the ([\d,]+) gross positions are created/, f.created * 1000],
    ['the administrative match, fills',
      /([\d,]+) of [\d,]+ planning positions are mapped/, admin.fills * 1000],
    ['the administrative match, total',
      /[\d,]+ of ([\d,]+) planning positions are mapped/, admin.values * 1000],
    ['the unit-team risk row',
      /([\d,]+) planning positions require clinicians/, units.entrants * 1000],
    ['the rural risk row',
      /All ([\d,]+) planning positions require clinical/, rural.values * 1000],
    ['the prior-authorization capacity note',
      /About ([\d,]+) FTE-equivalent/, Math.round(priorAuthReleasedFte() / 1000) * 1000],
    ['the physician denominator',
      /to ([\d,]+) direct-patient-care physicians/, DIRECT_PATIENT_CARE_PHYSICIANS],
    ['the immigration gap tile',
      /<strong>([\d,]+)<\/strong><small>over the twelve-year rollout/, f.entrants * 1000],
    ['the immigration hard-roles tile',
      /<strong>([\d,]+)<\/strong><small>of the gap is unit-clinical and rural-clinical/,
      clinical.entrants * 1000],
    ['the derived-quantities card, eliminated',
      /The ([\d,]+) eliminated-position case/, f.eliminated * 1000],
    ['the derived-quantities card, internal matches',
      /case, ([\d,]+) internal matches/, f.inside * 1000],
    ['the derived-quantities card, new-position floor',
      /matches, ([\d,]+) new-position floor/, f.created * 1000],
    ['the derived-quantities card, flex pool',
      /floor, and ([\d,]+) flex pool/, rural.values * 1000]
  ];
  for (const [label, pattern, expected] of claims) {
    const m = raw.match(pattern);
    if (!m) {
      out.push({
        where: label,
        says: 'the sentence no longer states a figure',
        expected: expected.toLocaleString('en-US')
      });
      continue;
    }
    const stated = Number(m[1].split(',').join(''));
    if (stated !== expected) {
      out.push({
        where: label,
        says: m[1],
        expected: expected.toLocaleString('en-US')
      });
    }
  }

  /* 3. R69: the labour-share denominator declares its series, on the page and
        against the anchor table, and cannot quietly become the OEWS total.

        The three sides are the constant, the methodology note's anchor row,
        and the `<small>` under the share tile. The fourth condition is the
        trap itself: OEWS is a different measure of the same year, about 9%
        smaller, and the moment someone updates "to the latest BLS release" it
        is the wrong number sitting in the right place. */
  if (TOTAL_US_EMPLOYMENT_2024 === OEWS_TOTAL_EMPLOYMENT_2024) {
    out.push({
      where: 'the labour-share denominator',
      says: 'the OEWS occupational total',
      expected: 'BLS industry employment, which includes the self-employed'
    });
  }
  const anchorRow = sourceText(UNIT_METHODOLOGY, root).match(
    /\|\s*Total U\.S\. employment\s*\|\s*([\d,]+)\s*\|\s*(\d{4})\s*\|/);
  if (!anchorRow) {
    out.push({
      where: UNIT_METHODOLOGY,
      says: 'no total-employment anchor row',
      expected: TOTAL_US_EMPLOYMENT_2024.toLocaleString('en-US')
    });
  } else if (Number(anchorRow[1].split(',').join('')) !== TOTAL_US_EMPLOYMENT_2024) {
    out.push({
      where: UNIT_METHODOLOGY + ' total-employment anchor',
      says: anchorRow[1],
      expected: TOTAL_US_EMPLOYMENT_2024.toLocaleString('en-US')
    });
  }
  /* R29 [§S9a]: the occupation anchors the chapter states, against the table
     that holds them. This is what makes "the data is present elsewhere in the
     repo" a checked claim rather than an assertion in a commit message. */
  for (const [code, count] of anchoredOccupationCodes(root)) {
    if (raw.indexOf(count.toLocaleString('en-US')) < 0) {
      out.push({
        where: 'the BLS anchor note, SOC ' + code,
        says: 'the chapter no longer states this anchor',
        expected: count.toLocaleString('en-US')
      });
    }
  }

  const shareLabel = raw.match(/<small>([\d.]+) million jobs nationally/);
  const millions = (TOTAL_US_EMPLOYMENT_2024 / 1e6).toFixed(2);
  if (!shareLabel) {
    out.push({
      where: 'the labour-share tile',
      says: 'states no denominator',
      expected: millions + ' million jobs nationally'
    });
  } else if (shareLabel[1] !== millions) {
    out.push({
      where: 'the labour-share tile',
      says: shareLabel[1] + ' million',
      expected: millions + ' million'
    });
  }
  if (renderedSource(WORKFORCE_PAGE, root).indexOf(EMPLOYMENT_SERIES_ELEMENT) < 0) {
    out.push({
      where: EMPLOYMENT_SERIES_ELEMENT,
      says: 'no such element',
      expected: 'the denominator names its BLS series where a reader can see it'
    });
  }
  if (!/\bTOTAL_US_EMPLOYMENT_SERIES(?![A-Za-z0-9_])/.test(
    renderedSource(WORKFORCE_CLIENT, root))) {
    out.push({
      where: WORKFORCE_CLIENT,
      says: 'imports the series label without rendering it',
      expected: 'TOTAL_US_EMPLOYMENT_SERIES written to the page'
    });
  }

  /* 4. R67: the hand-written scope qualification, against the declared list.
        Two sentences on this page name what the floor leaves out, and a third
        is generated from CREATED_SCOPE_EXCLUSIONS. The generated one cannot
        drift; the hand-written ones did, and will again the next time a
        domain gets sized -- LTC already moved from open to sized and needed
        three separate edits. Every open domain must be named and no sized one
        may still be listed as open.

        The words come from the exclusion's own `pageWords`, not from its
        `domain`: the page writes "EMS" where the data says the full name, and
        splits one domain across an Oxford comma. Deriving the words from the
        domain string produced two false failures on the first run of this
        check, which is how a check ends up loosened until it passes. */
  const floorNote = raw.match(
    /This is deliberately a floor\.[\s\S]*?<\/p>/);
  if (!floorNote) {
    out.push({
      where: 'the scope qualification',
      says: 'the paragraph is gone',
      expected: 'a sentence naming every unsized benefit workforce'
    });
  } else {
    const prose = floorNote[0].toLowerCase();
    for (const exclusion of CREATED_SCOPE_EXCLUSIONS) {
      const named = exclusion.pageWords.every(
        (w) => prose.indexOf(w.toLowerCase()) >= 0);
      if (exclusion.status === 'not-sized' && !named) {
        out.push({
          where: 'the scope qualification',
          says: 'does not name ' + exclusion.domain,
          expected: 'every unsized benefit workforce named'
        });
      }
    }
  }
  if (!raw.includes(SCOPE_EXCLUSION_ELEMENT)) {
    out.push({
      where: SCOPE_EXCLUSION_ELEMENT,
      says: 'no such element',
      expected: 'a rendered element for the declared exclusions'
    });
  }
  const clientText = renderedSource(WORKFORCE_CLIENT, root);
  if (!/\bcreatedScopeStatement\s*\(/.test(clientText)) {
    out.push({
      where: WORKFORCE_CLIENT,
      says: 'imports the exclusion statement without rendering it',
      expected: 'createdScopeStatement() written to the page'
    });
  }

  /* 5. Review 3 of P24: the figures the page now reads instead of typing,
        the training slots and the faculty row's positions (the slots over
        the support ratio). Comparing them with the ledger would compare a
        value with its own source, so the check is that the page reads them;
        a typed copy beside them is refused by tests/lib/one-figure.test.ts.
        This replaces the faculty row's spelled-out comparison and its
        private list of number words. */
  const reads: Array<[string, string]> = [
    ['the training-slot target', "{ANNUAL_TRAINING_TARGET.toLocaleString('en-US')} annual training slots"],
    ['the faculty risk row', "{trainingSupportPositions().toLocaleString('en-US')} positions are small in national terms"]
  ];
  for (const [label, expr] of reads) {
    if (!raw.includes(expr)) {
      out.push({ where: label, says: 'the sentence no longer reads its figure', expected: expr });
    }
  }

  return { problems: out, fallbacks: fallbacks.length, claims: claims.length };
}

/* R179 [§S9a] / R185 [§S9b]: the unit model behind CREATED.units, joined to
 * where its inputs are actually maintained.
 *
 * §S9a had to read the per-type FTE out of PROSE, because that is where it
 * lived: `staff: '~10 (physician or senior NP/PA lead, nurses, techs)'` in
 * units-client.ts, parsed back out with a regex. The comment there said to
 * retarget the check at a typed field if a later section added one. §S9b did:
 * `UNIT_TYPES[k].fte` is typed data in src/lib/units.ts and `UNIT_MODEL`
 * reads it, so the parser is deleted rather than pointed somewhere new. A
 * comparison between a value and its own source is not a check.
 *
 * The same applies to the controlled target: units-client.ts derived its '15,000' floor
 * from a literal, and reads CONTROLLED_TARGET_UNITS now.
 *
 * What replaces both is stronger and lives in units-check.ts -- `unitAllocationDrift`
 * compares the authored per-type counts against the allocation computed over
 * the county file, which is two independent sides rather than one restated.
 *
 * What remains here is the half that is still genuinely two-sided: the
 * published methodology note, which states the allocation, the FTEs, the
 * average and the product in prose a human maintains by hand. */
const UNIT_METHODOLOGY = 'research/workforce_transition_methodology.md';

export interface UnitModelDisagreement {
  where: string;
  says: string;
  expected: string;
}

export function unitModelDrift(root = REPO_ROOT): UnitModelDisagreement[] {
  const out: UnitModelDisagreement[] = [];

  /* 1. the allocation and the rounded result, against the published
        derivation. The note states the counts per type, the total, the total
        FTE, the average, and the product, so every input has a published
        counterpart and none of them can move alone. */
  const note = sourceText(UNIT_METHODOLOGY, root);
  for (const t of UNIT_MODEL.allocation) {
    const row = new RegExp('Type ' + t.key.toUpperCase() +
      ':\\s*([\\d,]+)\\s*units\\s*x\\s*([\\d.]+)\\s*FTE');
    const m = note.match(row);
    if (!m) {
      out.push({
        where: UNIT_METHODOLOGY + ' type ' + t.key,
        says: 'no published allocation row',
        expected: t.allocated + ' units x ' + t.fte + ' FTE'
      });
      continue;
    }
    const allocated = Number(m[1].split(',').join(''));
    if (allocated !== t.allocated || Number(m[2]) !== t.fte) {
      out.push({
        where: UNIT_METHODOLOGY + ' type ' + t.key,
        says: allocated + ' units x ' + m[2] + ' FTE',
        expected: t.allocated + ' units x ' + t.fte + ' FTE'
      });
    }
  }

  /* R66 + R178 [§S9a]: the one part of the non-monotone `fills` that IS
     documented. The methodology note fixes the planning case's unit fills as
     the navigation and operations share of a unit team -- "30,000 navigation
     and operations positions are treated as internal matches" -- so that
     figure has a published counterpart and can be joined. The lower-exposure
     case does not, and the declared exception says so rather than this check
     pretending otherwise. */
  const navigation = note.match(
    /([\d,]+) navigation and operations positions are treated as internal matches/);
  const unitFills = createdGroupTotals(['units'], 'plan').fills * 1000;
  if (!navigation) {
    out.push({
      where: UNIT_METHODOLOGY,
      says: 'no published basis for the unit-team internal matches',
      expected: unitFills.toLocaleString('en-US') + ' navigation and operations positions'
    });
  } else if (Number(navigation[1].split(',').join('')) !== unitFills) {
    out.push({
      where: UNIT_METHODOLOGY + ' unit-team internal matches',
      says: navigation[1],
      expected: unitFills.toLocaleString('en-US')
    });
  }

  /* The published derivation is checked at the precision it publishes, in two
     independent parts, because it is not one equation:

       15,000 x 9.225 = 138,375 FTE

     9.225 is the exact mix (9.22540...) rounded to three decimals, and
     138,375 is 15,000 x that ROUNDED average. The exact product is 138,381.
     Comparing the note's result against the exact product fails by six FTE on
     a figure the dashboard publishes as 138,000 either way, so the check
     would be reporting the rounding rather than a disagreement. Instead: the
     note's average must equal the model's average at the note's own decimal
     places, and the note's product must equal its own base times its own
     average. Both still fail the moment any allocation count or per-type FTE
     moves. */
  const product = note.match(/([\d,]+)\s*x\s*(\d+\.(\d+))\s*=\s*([\d,]+)\s*FTE/);
  if (!product) {
    out.push({
      where: UNIT_METHODOLOGY,
      says: 'no unit-team derivation',
      expected: UNIT_MODEL.controlledTargetUnits + ' x ' +
        unitMixWeightedFte().toFixed(3) + ' = ' +
        Math.round(UNIT_MODEL.controlledTargetUnits * Number(unitMixWeightedFte().toFixed(3)))
    });
  } else {
    const base = Number(product[1].split(',').join(''));
    const average = Number(product[2]);
    const places = product[3].length;
    const result = Number(product[4].split(',').join(''));
    const modelAverage = Number(unitMixWeightedFte().toFixed(places));
    if (base !== UNIT_MODEL.controlledTargetUnits || average !== modelAverage ||
      result !== Math.round(base * average)) {
      out.push({
        where: UNIT_METHODOLOGY,
        says: product[0],
        expected: UNIT_MODEL.controlledTargetUnits + ' x ' + modelAverage +
          ' = ' + Math.round(UNIT_MODEL.controlledTargetUnits * modelAverage)
      });
    }
  }

  return out;
}

/* R177 [§S9a]: the worker-support rate is stated in four places that were
 * written independently, and until now nothing joined any two of them.
 *
 *   1. `WORKER_SUPPORT_RATE` in workforce.ts            (the declaration)
 *   2. KPP-W1 in research/framework_v2_extract.md       (what controls it)
 *   3. the derivation in the methodology note           (the arithmetic)
 *   4. "controlled 75% worker-protection floor" on the  (what a reader sees)
 *      Workforce chapter
 *
 * Every pair can disagree, which is what makes this an invariant rather than
 * a restatement: the framework extract is a transcription of the source
 * document, the methodology note is prose maintained by hand, and the page's
 * label is a static <small>. Raising the rate in one place and not the others
 * is the failure this catches, and it is the specific failure the audit found
 * when it noticed the rate existed only as three literals.
 *
 * The methodology row is the strongest of the three, because it carries the
 * base and the product as well as the rate: `760,000 x 75% = 570,000` cannot
 * survive an edit to plan `eliminated` or plan `supported` either. */
const SUPPORT_BASIS_ELEMENT = 'wf-support-basis';

export interface SupportRateDisagreement {
  where: string;
  says: string;
  expected: string;
}

export function supportRateDrift(root = REPO_ROOT): SupportRateDisagreement[] {
  const out: SupportRateDisagreement[] = [];
  const declaredPct = WORKER_SUPPORT_RATE * 100;
  const plan = SCENARIOS.plan;

  /* 2. KPP-W1's controlled floor, from the framework transcription. Anchored
        on the metric ID: the extract carries several unrelated >=75% targets
        (TPP-3.6, PR-SCH-010) and matching a bare percentage would pass on any
        of them. Absence is drift -- a row that stops stating a threshold is
        how a check quietly turns itself off. */
  const framework = sourceText(FRAMEWORK_EXTRACT, root);
  const kppRows = framework.split('\n').filter(
    (l) => l.includes('KPP-W1') && />=\s*\d+(\.\d+)?%/.test(l));
  if (!kppRows.length) {
    out.push({
      where: FRAMEWORK_EXTRACT,
      says: 'no KPP-W1 row states a threshold',
      expected: '>=' + declaredPct + '%'
    });
  }
  for (const row of kppRows) {
    for (const m of row.matchAll(/>=\s*(\d+(?:\.\d+)?)%/g)) {
      if (Number(m[1]) !== declaredPct) {
        out.push({
          where: FRAMEWORK_EXTRACT + ' KPP-W1',
          says: '>=' + m[1] + '%',
          expected: '>=' + declaredPct + '%'
        });
      }
    }
  }

  /* 3. the derivation, base and product included */
  const methodology = sourceText(UNIT_METHODOLOGY, root);
  const derivation = methodology.match(
    /([\d,]+)\s*x\s*(\d+(?:\.\d+)?)%\s*=\s*([\d,]+)/);
  if (!derivation) {
    out.push({
      where: UNIT_METHODOLOGY,
      says: 'no placement-floor derivation',
      expected: plan.eliminated * 1000 + ' x ' + declaredPct + '% = ' +
        plan.supported * 1000
    });
  } else {
    const base = Number(derivation[1].split(',').join(''));
    const pct = Number(derivation[2]);
    const product = Number(derivation[3].split(',').join(''));
    if (base !== plan.eliminated * 1000 || pct !== declaredPct ||
      product !== plan.supported * 1000) {
      out.push({
        where: UNIT_METHODOLOGY,
        says: derivation[0],
        expected: plan.eliminated * 1000 + ' x ' + declaredPct + '% = ' +
          plan.supported * 1000
      });
    }
  }

  /* 4. what the chapter tells a reader. Comments and imports are stripped, so
        a provenance note explaining the rate is not mistaken for the label. */
  const page = renderedSource(WORKFORCE_PAGE, root);
  const labels = Array.from(page.matchAll(/(\d+(?:\.\d+)?)%\s+(?:worker-protection\s+)?floor/g));
  if (!labels.length) {
    out.push({
      where: WORKFORCE_PAGE,
      says: 'the chapter states no support floor',
      expected: declaredPct + '% floor'
    });
  }
  for (const m of labels) {
    if (Number(m[1]) !== declaredPct) {
      out.push({
        where: WORKFORCE_PAGE,
        says: m[0],
        expected: declaredPct + '% floor'
      });
    }
  }

  /* 5. and the basis has to reach the reader, not merely exist. The §S7
        review's defect, written again in §S8: a read-list scan is satisfied
        by the import line. renderedSource strips imports for exactly this
        reason, so deleting the setText call while leaving the import fails
        here. The page must also still carry the element it writes into. */
  const client = renderedSource(WORKFORCE_CLIENT, root);
  if (!/\bWORKER_SUPPORT_RATE_BASIS(?![A-Za-z0-9_])/.test(client)) {
    out.push({
      where: WORKFORCE_CLIENT,
      says: 'imports the basis without rendering it',
      expected: 'WORKER_SUPPORT_RATE_BASIS written to the page'
    });
  }
  if (!page.includes(SUPPORT_BASIS_ELEMENT)) {
    out.push({
      where: WORKFORCE_PAGE,
      says: 'no ' + SUPPORT_BASIS_ELEMENT + ' element',
      expected: 'a rendered element for the placement floor basis'
    });
  }

  return out;
}
