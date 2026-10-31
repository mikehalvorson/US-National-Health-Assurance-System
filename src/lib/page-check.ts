/* The page checks: what the pages and the clients that build them render,
 * held to the modules that own each figure and note.
 *
 * Moved out of manifest-check.ts (the branch review against main,
 * 2026-10-21, found that module changing for every reason any of its checks
 * did). These read src/pages, src/components and the client scripts, plus the
 * prose those surfaces draw from data: the self-test names the Healthcare
 * page lists, and the parameter and equation text it and the Quality chapter
 * render. The Healthcare, Medications, Governance and Rollout pages, the
 * household figures, the front door's chapter list and the repository links
 * are here. The accessibility gates, and the checks that read a chapter's
 * methodology or the research documents, are not.
 *
 * The code moved as it was. A comment points at the audit-code list in
 * repo-text.ts where it said "below".
 *
 * Build-time only; manifest-check.ts re-exports each of them, and
 * NODE_FS_MODULES there declares this module with what it reads. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalogCode, PARAM_DEFS } from './params';
import { EQUATIONS } from './equations';
import { CHAPTERS } from './tabs';
import {
  REPO_ROOT, enumerateSourceFiles, sourceText, AUDIT_CODE_IN_RENDERED_TEXT, walk,
  type CodeReference, scanSourceLines, maskComments, pageCallsOutsideComments,
  renderedSource
} from './repo-text';

/* Findings 1 and 17 [P16 fix run 2]: golden rule 2, applied to the one piece
 * of rendered text nothing had ever read.
 *
 * `src/pages/health.astro` renders every self-test row's `name` verbatim in
 * the site footer. A self-test name is therefore rendered output, and rule 2
 * binds it: the UI never surfaces the source document's internal codes. Ten
 * names breached it - nine R-numbers added in §S10 and one section reference
 * added in §S9a - and neither an inline review nor a two-axis review caught
 * the tenth, because no check had ever looked at a self-test name.
 *
 * Comments are masked before the sweep. The audit codes belong in the
 * comments and stay there: that is where a name's traceability lives, and
 * comments do not render.
 *
 * NOT flagged: `P8` is the plan's language the site publishes ("Phase 8" on
 * five pages), not the document's code. This also exempted `KPP-W1`; the
 * owner's 2026-10-10 decision keeps catalog ids off every page but Quality
 * and Risk, so renderedSelfTestNameLeaks() below flags it now. */
/* Finding 2 [P16 review 3]: this used to match single-quoted names only.
 * Most call sites are single-quoted, a few are double-quoted and one passes
 * a variable, so several names were outside the sweep. They were clean,
 * which is the whole problem with a latent gap: nothing shows until one is
 * not. No figures here on purpose - this comment said "183 call sites, 179
 * single-quoted" and five new rows in the same session made both stale,
 * with nothing to catch it. `unsweptSelfTestNameSites()` counts the live
 * gap and the self-test note prints it.
 *
 * Exported because `tests/lib/selftests.test.ts` inlined its own copy of
 * both this and the pattern list, and the copy had three alternatives where
 * the list (AUDIT_CODE_IN_RENDERED_TEXT, repo-text.ts) has eight - so the
 * negative case proved the copy fired,
 * not the shipped list. One list, one home. */
export const SELF_TEST_NAME_CALL =
  /runGuarded\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`)/;

/* Reads the source rather than selfTestSummary(), for two reasons: a check
   that inspected the summary it belongs to would recurse, and the source
   catches a name that a conditionally-skipped row never emits. */
/* The owner's 2026-10-10 decision, for the names the Healthcare page draws:
   no catalog, requirement or control id (KPP-W1 was the one left, by the
   judgement call above, which this decision reverses) and no "framework" for
   the source document. Names only: the audit-code list is shared with
   surfaces where catalog ids are the subject. */
const SELF_TEST_NAME_RULES: [RegExp, string][] = AUDIT_CODE_IN_RENDERED_TEXT.concat([
  [catalogCode(), 'a source-document code'],
  [/\bframeworks?\b/i, 'the word "framework"']
]);

export function renderedSelfTestNameLeaks(root = REPO_ROOT): string[] {
  const rel = 'src/lib/selftests.ts';
  const code = maskComments(sourceText(rel, root));
  const out: string[] = [];
  const call = new RegExp(SELF_TEST_NAME_CALL.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = call.exec(code)) !== null) {
    const name = m[1] ?? m[2] ?? m[3];
    const line = code.slice(0, m.index).split('\n').length;
    for (const [pattern, what] of SELF_TEST_NAME_RULES) {
      const hit = pattern.exec(name);
      if (hit) {
        out.push(rel + ':' + line + ' renders ' + what + ' ("' + hit[0]
          + '") in a self-test name: ' + name);
        break;
      }
    }
  }
  return out;
}

/* [P17 fix run 6]: the same list, over the OTHER rendered prose it binds.
 *
 * `health.astro` renders each parameter's `label`, `unit`, `source` and its
 * three divergence fields, so all six are reader prose under golden rule 2.
 * `paramProseCatalogCodes()` already swept them - but with `catalogCode()`,
 * which matches `KPP|TPP|CP|SR|PR|OI|SN|GAP` and no R-numbers. So the sweep
 * covered the surface and not the code class, and R135 shipped "R135" into two
 * `source` strings in the very commit whose log entry says those strings are
 * rendered reader prose.
 *
 * The two lists are complementary, not nested: this one has the R-numbers,
 * section signs and appendix/table references; the catalog one has the
 * KPP/TPP/SR/PR ids. Both run, over the same six fields.
 *
 * Measured before it was wired: over every parameter it hits exactly the two
 * defects and nothing else, so the eight patterns are safe against this prose. */
export function renderedParamProseAuditCodes(): string[] {
  const out: string[] = [];
  for (const p of PARAM_DEFS) {
    const fields: Array<[string, string]> = [
      ['label', p.label || ''],
      ['unit', p.unit || ''],
      ['source', p.source || ''],
      ['divergence.leans', p.divergence ? p.divergence.leans : ''],
      ['divergence.recommended', p.divergence ? p.divergence.recommended : ''],
      ['divergence.note', p.divergence ? p.divergence.note : '']
    ];
    for (const [where, text] of fields) {
      for (const [pattern, what] of AUDIT_CODE_IN_RENDERED_TEXT) {
        const hit = pattern.exec(text);
        if (hit) {
          out.push(p.id + '.' + where + ' renders ' + what + ' ("' + hit[0] + '")');
          break;
        }
      }
    }
  }
  return out;
}

/* R125 [§S11b]: the third rendered surface the same list binds, found by
 * authoring the defect into it.
 *
 * `quality-client.ts` renders `EQUATIONS[id].why` as the equation card's
 * lead paragraph and `name` as its heading, so both are reader prose under
 * golden rule 2. Neither sweep above reaches them: one reads
 * `selftests.ts`'s source, the other walks `PARAM_DEFS`. Fixing KPP-C8's
 * wage term put "R125" straight into a `why` string, in the session whose
 * handoff opens by naming that exact defect - so this is the surface the
 * previous fix generalised over, one module short.
 *
 * Measured before it was wired: 133 equations, zero hits on `why` and zero on
 * `name`, so the eight patterns are safe against this prose too.
 */
export function renderedEquationProseAuditCodes(): string[] {
  const out: string[] = [];
  for (const id of Object.keys(EQUATIONS)) {
    const d = EQUATIONS[id];
    if (!d) continue;
    const fields: Array<[string, string]> = [
      ['name', d.name || ''],
      ['why', d.why || '']
    ];
    for (const [where, text] of fields) {
      for (const [pattern, what] of AUDIT_CODE_IN_RENDERED_TEXT) {
        const hit = pattern.exec(text);
        if (hit) {
          out.push(id + '.' + where + ' renders ' + what + ' ("' + hit[0] + '")');
          break;
        }
      }
    }
  }
  return out;
}

/* Findings 2 and 11 [P16 review 3]: the sweep above reads the SOURCE, so a
 * name the source does not spell is a name it cannot read. Rather than
 * assert that gap is empty, measure it: this returns every site whose
 * rendered name the sweep is structurally blind to, and the row that
 * consumes it prints them. A gap nobody can see is a gap nobody closes.
 *
 * The other half is closed in vitest, which sweeps the RENDERED set with
 * this same pattern list. Production cannot do that: a self-test calling
 * selfTestSummary() from inside selfTestSummary() recurses to a timeout. */
export function unsweptSelfTestNameSites(root = REPO_ROOT): string[] {
  const rel = 'src/lib/selftests.ts';
  const code = maskComments(sourceText(rel, root));
  const out: string[] = [];
  const any = /(function\s+)?runGuarded(List)?\(\s*(.)/g;
  let m: RegExpExecArray | null;
  while ((m = any.exec(code)) !== null) {
    if (m[1]) continue; /* the declaration, not a call */
    const line = code.slice(0, m.index).split('\n').length;
    if (m[2]) {
      out.push(rel + ':' + line + ' runGuardedList names its rows inside the'
        + ' callee, where the source sweep cannot read them');
    } else if (!/['"`]/.test(m[3])) {
      out.push(rel + ':' + line + ' passes a variable as the self-test name');
    }
  }
  return out;
}

/* R217 [§S5]: no page types a household count.
 *
 * `tax.astro` wrote "the 13,200 households of the top 0.01%" in the
 * DISTRIBUTIONAL section - the WEALTH_DIST figure, which drives the inequality
 * chart - while describing the chart that runs on GROUPS.t10000, 12,000. Both
 * numbers are right about their own series; the prose named the wrong one. It
 * is the fifth household-count inconsistency the audit has found (F1, R172,
 * R184, now this), so the fix is a rule rather than an edit.
 *
 * Any four-or-more-digit figure immediately followed by "household" on a page
 * is a count that should have come from the series it describes. Astro
 * expressions are rendered at build time, so a derived count never appears in
 * the source as a literal and never trips this.
 */
/* An .astro file's leading `---` fence pair, blanked so line numbers survive. */
export function frontmatterStripped(text: string): string {
  if (!text.startsWith('---')) return text;
  const end = text.indexOf('\n---', 3);
  if (end < 0) return text;
  const head = text.slice(0, end + 4);
  return head.replace(/[^\n]/g, ' ') + text.slice(end + 4);
}

export const HOUSEHOLD_LITERAL_SOURCE =
  String.raw`\b\d{1,3}(?:,\d{3})+\s+households?\b|\b\d{4,}\s+households?\b`;
const HOUSEHOLD_LITERAL = new RegExp(HOUSEHOLD_LITERAL_SOURCE, 'g');

export function typedHouseholdCounts(root = REPO_ROOT): CodeReference[] {
  const out: CodeReference[] = [];
  for (const rel of enumerateSourceFiles(root)) {
    if (!rel.startsWith('src/pages/') || !rel.endsWith('.astro')) continue;
    const raw = readFileSync(join(root, rel), 'utf8');
    /* The rendered body only. An .astro file's frontmatter is TypeScript
       between --- fences: a figure there is part of a derivation or of the
       comment explaining one, and neither is a published count. The first
       version scanned the whole file and reported this row's own explanatory
       comment, which names the number it exists to stop being typed. */
    const lines = frontmatterStripped(raw).split('\n');
    lines.forEach((line, i) => {
      for (const m of line.matchAll(HOUSEHOLD_LITERAL)) {
        out.push({ file: rel, line: i + 1, text: m[0] });
      }
    });
  }
  return out;
}

/* R253 [§S5]: the transition envelope, derived rather than typed.
 *
 * One quantity was stated three ways: the page typed "$1.2-$2.0 trillion" in
 * prose and "$1.2T-$2.0T" again in a display tile, `params.ts` carried
 * $1.0-2.2T plus $0.06-0.18T of IT capital, and the cost bridge excluded the
 * whole thing. The page now renders `transitionEnvelope()`. This keeps it
 * that way: a trillion-scale dollar literal written into the rollout page is
 * a fourth copy of a number the parameters already answer.
 *
 * The framework's own controlled envelope is still shown, but it is read from
 * `transitionEnvelope().frameworkLow/High` in params.ts, so there is exactly
 * one place either figure lives. */
export const ENVELOPE_PAGE = 'src/pages/rollout.astro';
export const ENVELOPE_LITERAL_SOURCE = String.raw`\$\d+(?:\.\d+)?\s*(?:T\b|trillion)`;
const ENVELOPE_LITERAL = new RegExp(ENVELOPE_LITERAL_SOURCE, 'g');

export function typedEnvelopeLiterals(root = REPO_ROOT): CodeReference[] {
  const out: CodeReference[] = [];
  const lines = readFileSync(join(root, ENVELOPE_PAGE), 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(ENVELOPE_LITERAL)) {
      out.push({ file: ENVELOPE_PAGE, line: i + 1, text: m[0] });
    }
  });
  return out;
}

/* R160 [§S11b]: a link labelled "Sources and methodology" has to lead to
 * sources.
 *
 * Four pages sent it to the repository ROOT - quality, hardening, risk and
 * rollout - where a reader arrives at a README about the dashboard and has to
 * go looking. Nine other pages already pointed at the research file that
 * carries their numbers, so the four were the exception and nothing said so.
 *
 * Three counts were in circulation for this row and all three were wrong: the
 * prompt said one page, the log said three and named health.astro, which has
 * pointed at research/01 for some time. Counted here instead of asserted, and
 * that is the shape of the check: it does not hold a number, it holds the
 * property. A repo link that names a path must name a path that exists, and a
 * repo link that names none is the bare root.
 *
 * `research/` files are the target; the check reads the tree, so a renamed or
 * deleted research file fails the page that cites it, which is the defect
 * P16's review found in research/README.md itself - a path no reader could
 * open.
 *
 * Review 5: this scanned `src/pages/` only, and the two biggest instances
 * were in `src/components/`. SiteFooter and SiteHeader both carry a "sources
 * and methodology" link and both render on all fourteen pages through
 * BaseLayout, so the widest surface was the one the sweep could not see -
 * while its comment claimed to hold a property rather than a count. Both
 * directories now. That is the fourth count this row has had (the prompt said
 * one page, the log said three, the first sweep said five, then four), and the
 * reason the check must enumerate rather than assert a number. */
export const REPO_URL =
  'https://github.com/mikehalvorson/healthcare';
const REPO_LINK = new RegExp('href="' + REPO_URL + '([^"]*)"', 'g');

export function repoLinkTargets(root = REPO_ROOT): {
  file: string; line: number; path: string; exists: boolean;
}[] {
  const out: { file: string; line: number; path: string; exists: boolean }[] = [];
  for (const rel of enumerateSourceFiles(root)) {
    const reader = rel.startsWith('src/pages/') || rel.startsWith('src/components/');
    if (!reader || !rel.endsWith('.astro')) continue;
    const lines = readFileSync(join(root, rel), 'utf8').split('\n');
    lines.forEach((line, i) => {
      REPO_LINK.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = REPO_LINK.exec(line)) !== null) {
        /* strip /blob/main/ or /tree/main/ and any #anchor */
        const tail = m[1].replace(/^\/(?:blob|tree)\/main\//, '').split('#')[0];
        out.push({
          file: rel, line: i + 1, path: tail,
          exists: tail !== '' && existsSync(join(root, tail))
        });
      }
    });
  }
  return out;
}

/* The one page that may name the repository root, and why. index.astro calls
   it "this dashboard" in a sentence about the project, which is a link TO the
   repository rather than a link to sources. Declared rather than pattern-
   matched on the label, because a label is prose and prose gets edited. */
export const REPO_ROOT_LINK_HOME = 'src/pages/index.astro';

export function unresolvedRepoLinks(root = REPO_ROOT): string[] {
  return repoLinkTargets(root)
    .filter((t) => !t.exists)
    .filter((t) => !(t.path === '' && t.file === REPO_ROOT_LINK_HOME))
    .map((t) => t.file + ':' + t.line +
      (t.path === '' ? ' points at the repository root, where a reader has to' +
        ' go looking for the sources' : ' points at ' + t.path +
        ', which is not in the tree'));
}

/* R257 [§S11b]: the rollout page splits its gates into the ones that set a
 * threshold and the ones that set conditions, and it must derive that split
 * rather than type it. Checked here because this is the module that reads
 * source files; selftests.ts consumes the result. */
export const GATE_SPLIT_PAGE = 'src/pages/rollout.astro';
export const GATE_SPLIT_EXPRESSIONS = [
  'GATES.filter(gateIsMeasurable).length',
  '{measurableGates} of the {GATES.length}'
];

export function gateSplitNotDerived(root = REPO_ROOT): string[] {
  const page = readFileSync(join(root, GATE_SPLIT_PAGE), 'utf8');
  return GATE_SPLIT_EXPRESSIONS
    .filter((e) => !page.includes(e))
    .map((e) => GATE_SPLIT_PAGE + ' no longer derives the gate split: "' + e + '"');
}

/* R33 [§S6a]: a divergence from a research recommendation is only disclosed if
   a reader can see it, and the only place a reader meets a parameter whole is
   the full parameter table. Declaring the note in params.ts and never
   rendering it would be the same silence in a new place, so the page that
   renders the table is scanned for it. */
export const HEALTH_PAGE = 'src/pages/health.astro';

/* The same file HEALTH_PAGE names, under the name this check reads it by.
   One owner: a second literal path is how two checks end up scanning
   different files after a rename. */
export const PARAMETER_EXPLORER = HEALTH_PAGE;

/* Review: the divergence check tested `note.length >= 80`, which is a check on
   effort rather than on content. A note that does not name the number it
   diverges from is not a disclosure, and that is checkable. */
export function divergenceNamesRecommendation(
  note: string,
  recommended: string
): boolean {
  /* The headline number, not every number in the phrasing: a recommendation
     written as "about 0.39, which is 1 / 2.54" is named by a note that says
     0.39. Requiring all three would fail a note that explains itself in
     percentages, which is what a reader wants. */
  const digits = recommended.match(/[\d.]+/g) || [];
  const headline = digits[0];
  return headline !== undefined && note.includes(headline);
}

/* R141 [§S6b]: the scenario picker is where a reader chooses a stress case, so
 * it is where the case has to say what its numbers rest on. Declaring the
 * provenance in scenarios.ts and never showing it would repeat the omission
 * AP4 filed, one layer further in. */
export const SCENARIO_PICKER = 'src/scripts/health-client.ts';

/* Each read is named separately. The first version of this asked only that
 * SOME `.why` appeared in the file, and it passed with the per-override reason
 * deleted, because the structural block's own `why` satisfied it. A render
 * check that a deletion cannot fail is not a render check. */
export const SCENARIO_PROVENANCE_READS = [
  'ov.why', 'ov.confidence', 'scn.basis', 'scn.structural.why'
];

export function scenarioProvenanceNotRendered(root = REPO_ROOT): string[] {
  const text = readFileSync(join(root, SCENARIO_PICKER), 'utf8');
  return SCENARIO_PROVENANCE_READS.filter((r) => !text.includes(r));
}

/* R139 [§S6b]: the same shape as the divergence check below, and for the same
 * reason. Declaring what low and high mean inside params.ts and never showing
 * it is the silence AP1 filed, moved to a new address. The only place a reader
 * meets a parameter whole is the full parameter table, so that page is read. */
export function bandNoteIsRendered(root = REPO_ROOT): boolean {
  return pageCallsOutsideComments(PARAMETER_EXPLORER, [/paramBandNote\(\)/], root);
}

/* R237 [§S6b]: and the note about what a slider does to the band, on the page
 * that carries the sliders. */
export function spreadNoteIsRendered(root = REPO_ROOT): boolean {
  return pageCallsOutsideComments(PARAMETER_EXPLORER, [/sliderSpreadNote\(\)/], root);
}

export function divergenceIsRendered(root = REPO_ROOT): boolean {
  return pageCallsOutsideComments(PARAMETER_EXPLORER, [/p\.divergence/, /divergence\.note/, /divergence\.recommended/], root);
}

/* R81 [§S8]: the care cards' section of the Healthcare page must not type a
 * year either. Removing `fromYear` from `CareNha` makes a typed year a type
 * error inside the data, and `careNotesTypingYears` covers the card notes, but
 * the section's own prose is neither: it carried "assuming enactment in 2027",
 * a second copy of the calendar anchor `R256` settled in one place.
 *
 * Scoped to the care section rather than the file, because the rest of the page
 * legitimately publishes calendar years - "2027-2042" is a chart heading and
 * "actual 2023 spending" is a vintage. Comments are masked for the reason
 * `literalRetailTotals` masks them: a note explaining why a year was removed
 * has to name the year. */
export const CARE_SECTION_START = 'id="care-card-section"';

export function careSectionTypedYears(root = REPO_ROOT): string[] {
  const text = maskComments(readFileSync(join(root, HEALTH_PAGE), 'utf8'));
  const from = text.indexOf(CARE_SECTION_START);
  if (from < 0) return ['the care card section is gone: ' + CARE_SECTION_START + ' not found'];
  const end = text.indexOf('</section>', from);
  const section = text.slice(from, end < 0 ? text.length : end);
  return (section.match(/\b20\d\d\b/g) || []);
}

/* R171 [§S8]: the residual-billing caveat has one owner and four render sites,
 * and none of them may restate the figure.
 *
 * §AY3: two requirements govern point-of-care cost and neither promises an
 * absolute zero. The Overview said so; the ten cards, the household
 * calculator's `$0` line and the family-burden sentence did not. Four sites,
 * four separately-typed sentences, one of which was missing.
 *
 * Each site is named separately rather than counted, for the reason
 * DRUG_BASE_READS names its five separately: a check that asks whether SOME
 * site renders the caveat passes with three of the four deleted. */
export const RESIDUAL_CAVEAT_SITES = [
  'src/pages/health.astro',
  'src/pages/index.astro',
  'src/lib/household.ts',
  'src/lib/overview.ts'
];

/* Review [§S8]: and a tooltip is not a rendered caveat.
 *
 * The §S8 spec review found the per-card carrier was a `title=` attribute:
 * present in the markup, invisible on a touch device and in print, and read by
 * this check as if it were text. So the identifier has to appear at least once
 * OUTSIDE an attribute value on every site. `health.astro` carries it visibly
 * under the card grid and associates each card's `$0` with that note through
 * `aria-describedby`, which is a real association rather than a second copy. */
const ATTRIBUTE_VALUE = /\b[a-zA-Z-]+\s*=\s*\{?[^\s>{}]*RESIDUAL_BILLING_CAVEAT[^\s>{}]*\}?/g;

export function residualCaveatSitesMissing(root = REPO_ROOT): string[] {
  return RESIDUAL_CAVEAT_SITES.filter((rel) => {
    const text = renderedSource(rel, root).replace(ATTRIBUTE_VALUE, ' ');
    return !/\bRESIDUAL_BILLING_CAVEAT(?![A-Za-z0-9_])/.test(text);
  });
}

/* And the other half of one owner: the figure itself, typed beside a $0 claim,
   is how four sites came to say four things. `care.ts` is the declaration and
   is the only place the number may appear. */
export function typedResidualFigures(root = REPO_ROOT): CodeReference[] {
  return scanSourceLines(
    /\b0\.5\s*%|\bhalf a percent\b/g,
    { skip: ['src/lib/care.ts'], only: RESIDUAL_CAVEAT_SITES },
    root
  );
}

/* R171 [§S8], and the golden rule the §S8 brief inherited: no catalog code in
 * reader prose outside the Quality and Risk chapters, which use the catalog's
 * ids as identifiers and say what they are (the owner's 2026-10-10 decision;
 * Data once shared the exception).
 *
 * `household.ts` rendered "KPP-A3 allows <=0.5% billing exceptions" and
 * `money-flow.ts` labelled a ribbon "(KPP-C8)", both on the Healthcare
 * chapter, both predating §S6a and in no row. R170's own first draft added a
 * third - "Framework requirement SR-DRUG-001" on the insulin card - written by
 * the pass that was fixing the chapter, which is why this exists as a check
 * and not as a sweep.
 *
 * ⚠️ SCOPED, and the scope is the finding. This covers the Healthcare
 * chapter's narrative surfaces only. Measured across all of `src/`, eighteen
 * other files carry catalog codes in string literals; most are legitimate
 * (equations.ts, quality-data.ts, fmea.ts and data-phases.ts ARE the catalog),
 * but `rollout.ts` carried nineteen OI-0xx references, `gov.ts` thirty-three
 * KPP/TPP codes, `hardening.ts` two SR ids and `units-client.ts` one, and
 * whether those reached a reader was a sweep no row owned. Since the owner's
 * 2026-10-10 decision, tests/lib/rendered-codes.test.ts is that sweep: every
 * page and every clickable state of every client, held to no code outside
 * Quality and Risk. Where the codes carry traceability they stay as data
 * the pages do not draw.
 *
 * `care.ts` is deliberately NOT in this list. It DECLARES a requirement id and
 * the requirement's verbatim words so the extract check has something to match,
 * and neither reaches a reader; a line scan cannot tell a declared id from a
 * rendered one. Its rendered fields are checked by value instead, in
 * `careProseCatalogCodes`, which is the stronger test of the two. */
export const NARRATIVE_SURFACES = [
  'src/pages/health.astro',
  'src/pages/index.astro',
  'src/lib/household.ts',
  'src/lib/overview.ts',
  'src/lib/money-flow.ts'
];

/* The code shapes the convention names: KPP/TPP/CP metric ids, SR/PR
   requirement ids, OI open issues, SN source notes. Matched only inside string
   literals would need a parser; the whole masked line is enough, because these
   modules have no other reason to write one. */
export function narrativeCatalogCodes(root = REPO_ROOT): CodeReference[] {
  return scanSourceLines(catalogCode('g'), { only: NARRATIVE_SURFACES }, root);
}

/* R85 [§S8]: the client has to actually re-derive the card years.
 *
 * `careYearShiftDrift` proves the MODEL moves the years under four scenarios.
 * It says nothing about whether the page shows the move, and the defect §AG7
 * filed is precisely a model that moves while the cards do not. Deleting one
 * call from health-client.ts would restore that state with every self-test
 * still green.
 *
 * Each of the four sentence builders is named separately, for the reason
 * SCENARIO_PROVENANCE_READS gives and the reason the §S7 review found the hard
 * way: a check that asks whether SOME care function is called passes with three
 * of the four deleted. The call parenthesis is required, so an import that is
 * no longer used does not satisfy it. */
export const HEALTH_CLIENT = 'src/scripts/health-client.ts';

export const CARE_SCENARIO_CALLS = [
  'careChipText', 'carePhasingText', 'careEarlyText', 'careRequirementText',
  'buildRamps', 'scenarioStructural'
];

export function careScenarioCallsMissing(root = REPO_ROOT): string[] {
  const text = maskComments(readFileSync(join(root, HEALTH_CLIENT), 'utf8'));
  return CARE_SCENARIO_CALLS.filter(
    (name) => !new RegExp('\\b' + name + '\\s*\\(').test(text));
}

/* R164 [§S8]: the leadership disclaimer has to reach the DOM.
 *
 * §AW3's finding is that the sentence existed only in a source comment. Moving
 * it into a constant and never rendering it would be the same silence one layer
 * in, which is the failure `drugBaseNoteIsRendered` exists to catch on another
 * chapter. Each read is named separately for the reason DRUG_BASE_READS names
 * its five separately, and imports are stripped so a module that imports the
 * label map and stops using it does not satisfy the scan. */
export const GOV_PAGE = 'src/pages/gov.astro';
export const GOV_CLIENT = 'src/scripts/gov-client.ts';

export const LEADER_BASIS_READS: Array<{ file: string; read: string }> = [
  { file: GOV_PAGE, read: 'LEADER_BASIS_NOTE' },
  { file: GOV_CLIENT, read: 'leaderBasis' },
  { file: GOV_CLIENT, read: 'LEADER_BASIS_LABELS' }
];

export function leaderBasisNotRendered(root = REPO_ROOT): string[] {
  return LEADER_BASIS_READS.filter((r) =>
    !new RegExp('\\b' + r.read + '(?![A-Za-z0-9_])').test(renderedSource(r.file, root))
  ).map((r) => r.file + ' never uses ' + r.read);
}

/* R172 [§S8]: the modules that publish a per-household figure must read a
 * declared denominator rather than type one.
 *
 * R84 declared the two universes and wired `care.ts` to them, and the comment
 * beside the declaration says a self-test holds every per-household output to
 * naming one. It did not: `care.ts` was the only reader, and `overview.ts` went
 * on typing `hhNow = 132.2` and `hh2041 = 141` beside the family-burden
 * sentence under the hero. §BC3 named the first of those; the 2041 projection
 * had no owner at all and nobody had looked.
 *
 * Import statements are stripped for the reason residualCaveatSitesMissing
 * strips them: a module that imports the reader and stops calling it would
 * otherwise pass. */
export const HOUSEHOLD_DENOMINATOR_READERS = [
  'src/lib/care.ts',
  'src/lib/overview.ts'
];

export function householdDenominatorNotRead(root = REPO_ROOT): string[] {
  return HOUSEHOLD_DENOMINATOR_READERS.filter(
    (rel) => !/\bhouseholdDenominator\s*\(/.test(renderedSource(rel, root)));
}

/* R296 [§S7]: the medications chapter is where the drug base meets a reader,
 * so it is where the base has to be the model's own decomposition rather than
 * a number typed beside it. BY2 found the spend bar captioned "Modeled
 * all-drug spending split" with its 65% segment labelled with the CMS retail
 * figure, which is $5.2B away from the model's retail component: close enough
 * that nobody would notice, far enough to be the $16.9B reconciliation failure
 * in miniature.
 *
 * Each read is named separately, for the reason SCENARIO_PROVENANCE_READS
 * gives: a check that only asks whether SOME field is read passes with the
 * deletion it exists to catch. */
export const MEDICATIONS_PAGE = 'src/pages/medications.astro';

export const DRUG_BASE_READS = [
  'DRUG_BASE_LABELS.retail', 'DRUG_BASE_LABELS.nonRetail',
  'DRUG_BASE_LABELS.total', 'DRUG_BASE_LABELS.retailWidth',
  'DRUG_BASE_LABELS.nonRetailWidth'
];

/* Code review [§S7]: `includes` was the wrong test, and it defeated the reason
 * these five are named separately. `DRUG_BASE.retail` is a substring of
 * `DRUG_BASE.retailPct`, and `DRUG_BASE.nonRetail` of `DRUG_BASE.nonRetailPct`,
 * so a page that read only the two percentages satisfied all five entries: the
 * two label reads this check exists to protect could be deleted and it still
 * passed. Exactly the failure the comment above claims to avoid, one layer in.
 * The property name has to end where the entry ends. */
function readsField(text: string, read: string): boolean {
  return new RegExp(read.replace('.', '\\.') + '(?![A-Za-z0-9_])').test(text);
}

export function drugBaseNotRendered(root = REPO_ROOT): string[] {
  const text = readFileSync(join(root, MEDICATIONS_PAGE), 'utf8');
  return DRUG_BASE_READS.filter((r) => !readsField(text, r));
}

/* Code review [§S7]: comments are masked, for the reason
 * retiredTreeCodeReferences masks them: a provenance comment explaining why a
 * figure was removed necessarily quotes the figure, and quoting it in a
 * comment is not publishing it. The first version of this scan failed on its
 * own fix note. */

/* R214 [§S7]: and the other half of one owner. A hand-typed dollar total in
 * the retail drug band is how the CMS 2024 figure got onto a segment the model
 * produced in the first place. The band is deliberately narrow: it covers the
 * retail prescription drug line and nothing else the chapter publishes. A
 * derived read reaches the page as `${...}B`, which starts with a brace and
 * cannot match. */
export const RETAIL_BAND_LOW = 400;
export const RETAIL_BAND_HIGH = 560;

/* R173 + R204 [§S7]: and the note that says the base is modal and dated has to
 * reach the page, for the reason bandNoteIsRendered exists: declaring it in the
 * module and never showing it is the omission, moved one layer in. */
export function drugBaseNoteIsRendered(root = REPO_ROOT): boolean {
  return pageCallsOutsideComments(MEDICATIONS_PAGE, [/drugBaseNote\(\)/], root);
}

/* R50 [§S7]: and the note saying the two reduction controls are separate has
 * to sit beside the control it is about. §BY5's point was that the caption is
 * where the reader forms the belief. */
export function drugLeverNoteIsRendered(root = REPO_ROOT): boolean {
  return pageCallsOutsideComments(MEDICATIONS_PAGE, [/drugLeverNote\(\)/], root);
}

/* R176 [§S7]: the six inclusion reasons are typed in the data and typed again,
 * as strings, into the tab's filter markup. A union that the filter does not
 * offer is a reason no reader can select; a filter option outside the union
 * matches nothing and silently returns an empty list, which is the failure
 * mode the union was added to stop. Read the option values and hold the two
 * lists equal in both directions. */
export function medicationsFilterReasons(root = REPO_ROOT): string[] {
  const text = readFileSync(join(root, MEDICATIONS_PAGE), 'utf8');
  const block = text.match(
    /<select id="medications-reason-filter">([\s\S]*?)<\/select>/);
  if (!block) return [];
  const out: string[] = [];
  for (const m of block[1].matchAll(/<option value="([^"]*)"/g)) {
    if (m[1]) out.push(m[1]);
  }
  return out;
}

/* R175 [§S7]: and the principle behind the phases has to be on the page that
 * publishes them, not only in the module that derives them. */
export function phasePrincipleIsRendered(root = REPO_ROOT): boolean {
  return pageCallsOutsideComments(MEDICATIONS_PAGE, [/phasePrinciple\(\)/], root);
}

/* R52 [§S7]: the medication tests asserted that multiplication works. What
 * they should assert is what the page and the model have agreed to share, and
 * that needs the page's actual controls rather than numbers retyped into a
 * test. Both readers below fail closed: a control that stops being a range
 * input, or a boundary sentence that stops stating two figures, returns null
 * and the assertion has nothing to pass on. */
export function medicationsSliderRange(
  id: string, root = REPO_ROOT
): { min: number; max: number; value: number } | null {
  const text = readFileSync(join(root, MEDICATIONS_PAGE), 'utf8');
  const m = text.match(new RegExp(
    '<input id="' + id + '" type="range" min="(\\d+)" max="(\\d+)"[^>]*value="(\\d+)"'));
  return m ? { min: Number(m[1]), max: Number(m[2]), value: Number(m[3]) } : null;
}

/* The stated stress boundary, read out of the prose §BY4 verified and §S7
 * protects. Read, not rewritten: the disclosure is do-not-touch, so this
 * checks it rather than deriving it. */
export function statedStressBoundary(root = REPO_ROOT): [number, number] | null {
  const text = readFileSync(join(root, MEDICATIONS_PAGE), 'utf8');
  const m = text.match(/stress boundary is\s+approximately \$(\d+)[^\d]+(\d+)B per year/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

export function literalRetailTotals(root = REPO_ROOT): string[] {
  const text = maskComments(readFileSync(join(root, MEDICATIONS_PAGE), 'utf8'));
  const found: string[] = [];
  for (const m of text.matchAll(/\$(\d{3}(?:\.\d)?)B/g)) {
    const v = Number(m[1]);
    if (v >= RETAIL_BAND_LOW && v <= RETAIL_BAND_HIGH) found.push(m[0]);
  }
  return found;
}

/* R163 / R270 [§S12]: no page may type its own chapter number.
 *
 * This is the check whose absence let the front door go stale. The repo had
 * `statedChapterCountDrift`, whose own comment explains that four
 * recommendations were scoped against twelve chapters when the app has
 * fourteen - and it swept README.md and specs/HANDOFF.md. Two markdown files.
 * The surface actually publishing chapter numbers to readers, `src/pages/`,
 * was never in its scope, and index.astro's grid was wrong in seven places.
 *
 * Scope, stated rather than assumed: the literal string "Chapter" followed by
 * digits, anywhere under src/pages/ and src/components/, with comments masked
 * so a note explaining this rule does not trip it. The derived form renders
 * through chapterMarker() and contains no digits in the source, so it does
 * not match. Prose that says "the Physical Care chapter" carries no number
 * and is not in scope. */
const CHAPTER_NUMBER_DIRS = ['src/pages', 'src/components'];
const TYPED_CHAPTER_NUMBER = /Chapter\s+\d+/g;

export function typedChapterNumbers(root = REPO_ROOT): string[] {
  const out: string[] = [];
  for (const dir of CHAPTER_NUMBER_DIRS) {
    const files: string[] = [];
    walk(join(root, dir), root, files);
    for (const rel of files.filter((f) => /\.(astro|ts)$/.test(f)).sort()) {
      const body = maskComments(readFileSync(join(root, rel), 'utf8'));
      body.split('\n').forEach((line, i) => {
        for (const m of line.matchAll(TYPED_CHAPTER_NUMBER)) {
          out.push(rel + ':' + (i + 1) + ' types "' + m[0] + '" instead of deriving it');
        }
      });
    }
  }
  return out;
}

/* R163 [§S12]: every chapter in the registry reaches the front door.
 *
 * The grid renders from TABS now, so a missing card throws at build. This is
 * the other half - the half that made the stale grid invisible for two
 * chapters: it reports the membership, so the count in this note is one the
 * check computes rather than a number someone typed beside it. */
export function frontDoorChapterCoverage(root = REPO_ROOT): {
  registry: number; carded: number; missing: string[];
} {
  const page = readFileSync(join(root, 'src/pages/index.astro'), 'utf8');
  const copy = page.slice(page.indexOf('const CHAPTER_COPY'), page.indexOf('const chapterCards'));
  const missing = CHAPTERS
    /* Same heredoc collapse as above: this read '[^\w]', which in a JS string
       is the letter w, so the class was "anything but w". It happened to give
       the right answer for the case that was run. */
    .filter((t) => !new RegExp('(^|[^\\w])' + t.path + ':').test(copy))
    .map((t) => t.path);
  return { registry: CHAPTERS.length, carded: CHAPTERS.length - missing.length, missing: missing };
}

/* R111 [§S12]: the Data tab must show which targets are framework requirements
 * and which are analyst proposals.
 *
 * Most phase targets carry basis "derived" (47 when this was written, of 66
 * then and 79 since R104), and the methodology says
 * in terms that a derived target "is not a new framework requirement and must
 * not be presented as one". The row filed this as unverified because the
 * fetch truncated before reaching the render. Measured, it does reach the
 * DOM - data-client.ts builds a span whose text is "Specified" or "Derived"
 * and appends it to the identity row - so this is a check that the row stays
 * closed, not a fix.
 *
 * Scope, stated rather than assumed: this reads the client SOURCE, because the
 * span is written at runtime and never appears in dist. Comments are masked,
 * so a note about the labels does not satisfy it, and the three expressions
 * are the read, the label and the append - deleting any one of them stops the
 * basis reaching the reader, and deleting all three is the failure the row
 * describes.
 *
 * R295 [§S15] moved the Data chapter's renderers out of the client into
 * data-render.ts so a test could call them, and this check moved with them.
 * data-render.test.ts now also renders every phase and reads the label back
 * out of the drawn row, which this source check cannot do. */
export const BASIS_RENDER_FILE = 'src/lib/data-render.ts';
export const BASIS_RENDER_EXPRESSIONS = [
  "basis.className = 'data-basis ' + metric.basis",
  "metric.basis === 'framework' ? 'Specified' : 'Derived'",
  'identity.appendChild(basis)'
];

export function basisNotRendered(root = REPO_ROOT): string[] {
  const body = maskComments(readFileSync(join(root, BASIS_RENDER_FILE), 'utf8'));
  return BASIS_RENDER_EXPRESSIONS
    .filter((e) => !body.includes(e))
    .map((e) => BASIS_RENDER_FILE + ' no longer renders each target\u2019s basis: "' + e + '"');
}
