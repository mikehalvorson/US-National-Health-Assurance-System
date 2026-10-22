/* The accessibility gates: what assistive technology meets on a page, held
 * to the rules the site keeps for it.
 *
 * Moved out of manifest-check.ts (the branch review against main,
 * 2026-10-21, found that module changing for every reason any of its checks
 * did). These read every page, component and client for the same few shapes:
 * the one acronym glossary and decorator, an image-role subtree with a tab
 * stop, a label on an element with no role, application logic reading aria
 * state, an audit code in an HTML comment, a count typed into a label, a
 * screen-reader caption or a meta description, and a page with no
 * description. Several needles are assembled from character codes so the
 * gates can read their own source; the comments beside them say why.
 *
 * The code moved as it was except ariaAsStateFaults' skip: the gate skips
 * the file that holds it, which has to spell the aria reads it looks for,
 * and that file is this one now, so the skip names accessibility-check.ts
 * where it named manifest-check.ts. Comments that said kappa-check and
 * manifest-check use word boundaries say "the repo-reading checks".
 *
 * Build-time only; manifest-check.ts re-exports each of them, and
 * NODE_FS_MODULES there declares this module with what it reads. */
import { NUMBER_WORDS } from './format';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ACRONYMS as SITE_ACRONYMS, HARDCODED_ONLY, SHORT_KEY_REASONS } from './acronyms';
import { REPO_ROOT, walk, maskComments, sourceScanFiles } from './repo-text';

/* R305 + R306 + R301 [S13]: one glossary and one decorator, at build time.
 *
 * The vitest suite holds thirteen guards on this layer. None of them runs
 * during `pnpm build`, so the invariant that mattered most had no gate: a
 * reintroduced per-tab decorator would ship, and the last one shipped for
 * five chapters. What is checked here is the shape that caused the defect,
 * not the defect itself, because the defect only shows in a browser.
 *
 * The tell for a second decorator is rebuilding an alternation out of the
 * glossary keys, not the class name or the regex flavour. The tell for the
 * original bug is a source-built word boundary in a client script: `-` is a
 * non-word character, so `\bCP\b` matches the CP in CP-POP-004. src/lib keeps
 * legitimate uses of one in kappa-check and the repo-reading checks, which
 * match prose and identifiers rather than glossary keys; a client script has
 * no reason to write one, and all five deleted decorators did.
 *
 * The fourth fault is the one measurement found and the section brief did not:
 * a title attribute typed into page markup is a second copy of glossary text
 * and drifts from it silently. Three had, and units.astro was rendering two
 * spellings of EMS at once. */
const ACRONYM_HOME = 'src/lib/acronyms.ts';
const ACRONYM_DECORATOR = 'src/scripts/acronyms-client.ts';

/* The two characters a source file writes to put a word boundary into a RegExp
   built from a string. Assembled from char codes rather than typed: every
   attempt in this campaign to carry a backslash through a shell produced
   U+0008, and a pattern that matches nothing passes on everything. */
const SOURCE_WORD_BOUNDARY =
  String.fromCharCode(92) + String.fromCharCode(92) + 'b';

/* `.join('|')` and `.join("|")`, assembled rather than typed for the same
   reason and a sharper one: this file is inside the tree it scans, and the
   first run of this gate failed on itself, reporting manifest-check.ts as a
   second acronym matcher. Exempting the checker from its own rule would have
   left a hole exactly where a future decorator could be written; not spelling
   the needle leaves the rule total. Do not "simplify" these back to literals.

   Review of P19 [S13]: the first version pinned `escaped.join('|')` verbatim,
   so renaming the local to `esc`, or switching to double quotes, walked past
   the gate. What identifies a matcher is joining a key list with a pipe INTO A
   RegExp, not what the local is called.

   Widening it to any pipe-join alone was too far and the gate failed on this
   file a third time: `src/lib/manifest-check.ts:2501` joins on a pipe to
   rebuild an escaped table cell, and `src/lib/selftests.ts` writes one inside
   a note. Both are honest. Requiring `new RegExp(` on the same line separates
   them: across all of src/ that shape matches exactly one line, which is
   acronymPattern() itself. */
const Q1 = String.fromCharCode(39);
const Q2 = String.fromCharCode(34);
const PIPE_JOINS = [
  '.join(' + Q1 + '|' + Q1 + ')',
  '.join(' + Q2 + '|' + Q2 + ')'
];

function buildsKeyMatcher(code: string): boolean {
  return code.split('\n').some((line) =>
    line.includes('new RegExp(') && PIPE_JOINS.some((j) => line.includes(j)));
}

const HARDCODED_ABBR = /<abbr[^>]*title="([^"]*)"[^>]*>([^<]+)<\/abbr>/g;
const ABBR_WRAPPER = /(?:createElement|el)\(\s*['"]abbr['"]/;

export function acronymLayerFaults(root = REPO_ROOT): string[] {
  const faults: string[] = [];

  for (const rel of sourceScanFiles(root)) {
    const text = readFileSync(join(root, rel), 'utf8');
    /* The source-shape rules read masked text, following this file's own
       convention. The second run of this gate failed on the comment two
       screens up, which spells a needle in order to explain why the needle is
       not spelled - the explanation reintroducing the thing it explains.
       The <abbr> rule below reads raw text instead, because it scans .astro
       markup that maskComments is not written for. */
    const code = maskComments(text);

    if (rel !== ACRONYM_HOME && /\bconst ACRONYMS\b/.test(code)) {
      faults.push(rel + ' declares a second acronym dictionary');
    }
    if (rel !== ACRONYM_HOME && buildsKeyMatcher(code)) {
      faults.push(rel + ' builds a second acronym matcher');
    }
    if (rel.startsWith('src/scripts/') && rel !== ACRONYM_DECORATOR
      && ABBR_WRAPPER.test(code)) {
      faults.push(rel + ' wraps its own acronyms');
    }
    /* A word boundary is forbidden outright in a client script, which has no
       reason to write one. Elsewhere under src/ it is forbidden only next to a
       joined key list: kappa-check and the repo-reading checks use word boundaries
       legitimately, against prose and identifiers rather than glossary keys.
       Review of P19 [S13]: the first version checked src/scripts only, so the
       defect could have come back one directory over. */
    if (code.includes(SOURCE_WORD_BOUNDARY)
      && (rel.startsWith('src/scripts/') || buildsKeyMatcher(code))) {
      faults.push(rel + ' builds a pattern with a word boundary, which matches '
        + 'inside a hyphenated identifier');
    }
    if (rel.endsWith('.astro')) {
      HARDCODED_ABBR.lastIndex = 0;
      let hit: RegExpExecArray | null;
      while ((hit = HARDCODED_ABBR.exec(text)) !== null) {
        const key = hit[2].trim();
        const title = hit[1].replace(/&amp;|&#38;/g, '&');
        const expected = SITE_ACRONYMS[key] ?? HARDCODED_ONLY[key];
        if (expected === undefined) {
          faults.push(rel + ' hardcodes ' + key + ', which the glossary does not define');
        } else if (expected !== title) {
          faults.push(rel + ' hardcodes ' + key + ' as "' + title
            + '", the glossary says "' + expected + '"');
        }
      }
    }
  }

  /* R101 [S13]: "require a minimum key length or an explicit allow-context for
     2-character keys". Every key of two characters or fewer has to carry a
     stated reason in acronyms.ts, so a new one is argued for rather than
     typed. Review of P19 [S13] found this half of the row unimplemented. */
  for (const key of Object.keys(SITE_ACRONYMS)) {
    if (key.length <= 2 && !SHORT_KEY_REASONS[key]) {
      faults.push('the glossary expands the two-character key ' + key
        + ' with no reason recorded in SHORT_KEY_REASONS');
    }
  }
  for (const key of Object.keys(SHORT_KEY_REASONS)) {
    if (!(key in SITE_ACRONYMS)) {
      faults.push('SHORT_KEY_REASONS argues for ' + key
        + ', which the glossary no longer expands');
    }
  }
  for (const key of Object.keys(HARDCODED_ONLY)) {
    if (key in SITE_ACRONYMS) {
      faults.push(key + ' is in both the glossary and HARDCODED_ONLY, so a page '
        + 'and the decorator can disagree about it');
    }
  }

  return faults;
}

/* R292 [§S12]: no aria-label may assert a count as a literal.
 *
 * The row names four. Sweeping the class found nine, every one on a container
 * with no role - so assistive technology ignores the label and a sighted
 * reader never sees it either. All nine were correct, which is the point:
 * "six planes" next to a grid rendering seven is a disagreement that cannot
 * be observed from either side.
 *
 * A DERIVED count in a label is fine and is one of the two fixes, so the rule
 * is about literals: this reads the attribute as written in the source and
 * skips anything inside an Astro expression. The other fix is role="list",
 * where the browser announces a count it computes from the rendered children,
 * which is stronger than any string.
 *
 * Number words are listed rather than pattern-matched because "one" and "no"
 * appear in ordinary label prose; the list holds the ones that read as counts
 * at the start of a label or before a noun.
 *
 * Review of P18 widened this to THREE surfaces and one scanner. The other two
 * are sr-only text, where the rollout page made the identical claim in a
 * <caption>, and <meta name="description">, where this section's own commits
 * put two literal counts on pages that derive those very numbers a few lines
 * away. Each surface keeps its own self-test row - they fail for different
 * reasons, and one row with three failure modes reports none of them clearly -
 * but the matching lives in one place now.
 *
 * That sharing is the actual fix for something this section got wrong twice:
 * the sr-only sweep was a retyped copy of the aria sweep, and it shipped with
 * the same collapsed backslash, unable to fail, an hour after the first was
 * repaired. Duplicated bodies duplicate defects. */
const COUNT_WORDS = NUMBER_WORDS.slice(2);

interface CountedSurface {
  what: string;    /* how a finding names the place */
  pattern: RegExp; /* global; the counted text is capture group 1 */
}

/* Kept beside the scanner so an exemption reads as a judgement about ONE
   string, not a hole in the rule. Keyed by exact text: reword the caption and
   the exemption lapses, which forces the judgement to be made again. */
export const SR_COUNT_EXEMPT: Record<string, string> = {
  'Staggered ten-week travel-nurse rotation':
    'ten-week is the length of a rotation, not the size of a collection'
};

function literalCountsIn(surface: CountedSurface, root: string): string[] {
  const out: string[] = [];
  for (const dir of ['src/pages', 'src/components']) {
    const files: string[] = [];
    walk(join(root, dir), root, files);
    for (const rel of files.filter((f) => f.endsWith('.astro')).sort()) {
      const body = maskComments(readFileSync(join(root, rel), 'utf8'));
      body.split('\n').forEach((line, i) => {
        for (const m of line.matchAll(surface.pattern)) {
          const text = m[1];
          if (SR_COUNT_EXEMPT[text.trim()]) continue;
          const digits = /\d/.test(text);
          /* Two backslashes. Written as one this is U+0008, the pattern
             matches nothing, and the check passes on everything - which is
             how both of the sweeps this function replaces first shipped. */
          const word = COUNT_WORDS.filter((w) =>
            new RegExp('\\b' + w + '\\b', 'i').test(text))[0];
          if (!digits && !word) continue;
          out.push(rel + ':' + (i + 1) + ' asserts a count in ' + surface.what
            + ': "' + text.trim() + '"'
            + (digits ? '' : ' (the word "' + word + '")'));
        }
      });
    }
  }
  return out;
}

export function literalCountsInAriaLabels(root = REPO_ROOT): string[] {
  return literalCountsIn(
    { what: 'an aria-label', pattern: /aria-label="([^"]*)"/g }, root);
}

/* The same claim in an element the aria sweep does not read. */
export function literalCountsInScreenReaderText(root = REPO_ROOT): string[] {
  return literalCountsIn({
    what: 'screen-reader-only text',
    pattern: /<(?:caption|span|div|p)[^>]*class="[^"]*\bsr-only\b[^"]*"[^>]*>([^<{]*)</g
  }, root);
}

/* The page head. Not rendered as text, but it is what a search result and a
   link preview show, so a stale count there is published all the same. */
export function literalCountsInMetaDescriptions(root = REPO_ROOT): string[] {
  return literalCountsIn(
    { what: 'a meta description', pattern: /\bdescription="([^"]*)"/g }, root);
}

/* R269 [§S12]: every page ships a meta description.
 *
 * BaseLayout has always accepted one and rendered it conditionally. One of
 * fourteen callers passed it, so the conditional never fired on thirteen
 * chapters and they went out with no description at all - which is what a
 * search result and a link preview show for a document meant to be shared
 * and cited.
 *
 * Read from the rendered artefact rather than the source, because the point
 * is what reaches the DOM: a page could pass an empty string and satisfy any
 * source scan. A description shorter than the floor is reported too, since a
 * three-word one is the same defect wearing the fix. */
const DESCRIPTION_MIN_CHARS = 60;

/* Review of P18: pagesWithoutDescription was written here, exported, and
   imported by nothing. It read dist/**, which the build gate cannot do -
   the gate runs at astro:build:start, before any page is rendered - so it
   could never have been registered as a self-test in the first place.
   Deleted rather than wired: baseLayoutCallsWithoutDescription reads the
   source, runs in the gate, and the rendered output was verified by hand
   across all fourteen pages. */

/* The source half, which is the one that can run during the build gate: every
   caller of BaseLayout passes a real description.
   Review of P18: the first version matched `description="..."` only, so the
   three pages that DERIVE their description - the fix the count sweep asks
   for - were reported as passing none. The two rules pull in opposite
   directions unless this one knows about expressions, so it accepts either
   form and measures length only on the literal it can read. */
export function baseLayoutCallsWithoutDescription(root = REPO_ROOT): string[] {
  const out: string[] = [];
  const files: string[] = [];
  walk(join(root, 'src/pages'), root, files);
  for (const rel of files.filter((f) => f.endsWith('.astro')).sort()) {
    const body = readFileSync(join(root, rel), 'utf8');
    const open = body.indexOf('<BaseLayout');
    if (open === -1) {
      out.push(rel + ' does not render through BaseLayout');
      continue;
    }
    const tag = body.slice(open, body.indexOf('>', open) + 1);
    const literal = tag.match(/description="([^"]*)"/);
    const derived = /description=\{/.test(tag);
    if (!literal && !derived) {
      out.push(rel + ' passes no description to BaseLayout');
    } else if (literal && literal[1].trim().length < DESCRIPTION_MIN_CHARS) {
      out.push(rel + ' passes a ' + literal[1].trim().length + '-character description');
    }
  }
  return out;
}

/* =========================================================================
 * §S14 accessibility invariants (P20).
 *
 * These are source-shape rules, and they are deliberately narrow about what
 * counts as a defect, because the wide version of each one fires on an honest
 * use elsewhere in the tree. Every rule below was run against the tree before
 * the fixes landed and reported the count stated in the remediation log (in
 * the audit-docs repo); a rule that reported nothing then would not be a
 * rule, it would be a comment.
 * ========================================================================= */

/* The needles below are assembled from character codes rather than spelled.
   The first run of this gate reported one fault, in this file, on the line
   that declared the needle: the gate scans src/ and this file has to contain
   whatever it searches for. Exempting manifest-check.ts was the wrong answer -
   it would leave a hole exactly where a future defect would be written - so
   the needle is built instead. DO NOT simplify these back into regex literals;
   the gate will then fail on its own source, and the fix that suggests itself
   at that point is the exemption this comment exists to prevent. */
const SQ = String.fromCharCode(39);   /* ' */
const DQ = String.fromCharCode(34);   /* " */

/* An `<svg>` built by el('svg', {...}) or by setAttribute, given the image
   role. That role makes its whole subtree presentational, so nothing inside it
   may be a tab stop. Both spellings are matched because the codebase uses
   an attribute object in some places and markup in others. */
const ROLE_IMG_LITERAL = new RegExp(
  'role:\\s*' + SQ + 'img' + SQ
  + '|setAttribute\\(\\s*' + SQ + 'role' + SQ + ',\\s*' + SQ + 'img' + SQ
  + '|role=' + DQ + 'img' + DQ
);
/* A tab stop: index zero as an attribute-object value, a string, or markup.
   A negative index is deliberately not matched - it is how units-client.ts
   marks the county dots unreachable, which is correct and must not be
   flagged. */
const TAB_STOP = new RegExp(
  'tabindex:\\s*' + SQ + '?0' + SQ + '?[,\\s}]'
  + '|tabindex=' + DQ + '0' + DQ
);

/**
 * R166: no focusable element inside a `role="img"` subtree.
 *
 * The unit of scanning is the function, not the file: `tax-charts.ts` renders
 * six charts and two of them legitimately keep `role="img"` because they have
 * no tab stops. Splitting on `export function` is exact here because every
 * chart in this codebase is one top-level exported function that builds one
 * `<svg>`; the split is asserted below rather than assumed, so a file that
 * stops having that shape fails loudly instead of being scanned wrongly.
 */
export function roleImgFocusFaults(root = REPO_ROOT): string[] {
  const faults: string[] = [];
  for (const rel of sourceScanFiles(root)) {
    const code = maskComments(readFileSync(join(root, rel), 'utf8'));
    if (!ROLE_IMG_LITERAL.test(code)) continue;
    /* keep the leading segment so a role="img" above the first function is
       still scanned against that segment's tab stops */
    const segments = code.split(/\nexport function |\nfunction /);
    /* The assertion the comment above promises. Review 8 found that sentence
       describing a check that was not written - the same shape this campaign
       recorded in P18, where a comment promised a guard the code lacked. A
       file that carries the image role in one place and a tab stop in another
       is only safely judged if the two can be told apart, and one segment
       means the whole file is one haystack. */
    if (segments.length < 2) {
      /* Review 9 narrowed this: a file with the image role and NO tab stop
         anywhere is safe however it is shaped - a static page with one
         decorative `<svg role="img">` is the ordinary case. Only both needles
         in one undivided haystack are unattributable. */
      if (TAB_STOP.test(code)) {
        faults.push(rel + ' carries the image role and a tab stop but has no '
          + 'function boundary to tell them apart; split it or scan it by hand');
      }
      continue;
    }
    for (const segment of segments) {
      if (ROLE_IMG_LITERAL.test(segment) && TAB_STOP.test(segment)) {
        const name = segment.slice(0, segment.indexOf('(')).trim() || '(file scope)';
        faults.push(rel + ' ' + name +
          ' puts a tab stop inside a role="img" subtree');
      }
    }
  }
  return faults;
}

/* An aria-label in markup, with the whole opening tag captured so the rule can
   ask whether that same tag carries a role. */
const LABELLED_TAG = /<(div|span)\b[^>]*aria-label[^>]*>/g;
/* Elements that supply their own role: a name on these is not ignored. */
const SETS_ROLE = /\brole=|\brole:\s*'|setAttribute\(\s*'role'/;
/* The same question asked of a client script's attribute object. */
const ARIA_LABEL_KEY = /'aria-label'|setAttribute\(\s*'aria-label'/;

/* Tags with no implicit role, so a name on one is dropped. Deliberately not
   "any tag": the first version of this rule asked only whether an element was
   built and labelled, and reported eleven faults - every one of them a
   `<button>`, `<abbr>`, `<select>` or `<input>`, which carry their own role
   and read their label correctly. Widening a needle creates false positives
   in the honest uses; the tree was re-read hit by hit before this list was
   narrowed to the tags that genuinely have nothing. */
const ROLELESS_TAGS = new Set([
  'g', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'ellipse',
  'text', 'div', 'span'
]);

/**
 * The statements in a client module that build one roleless element and give
 * it attributes: an `el('<tag>', {...})` call up to its terminating semicolon,
 * and each run of `setAttribute` calls on an identifier that was created as a
 * roleless tag.
 *
 * Bounded by `;` rather than by brace matching, because a brace-counting
 * parser over TypeScript is not a count anybody has made - this campaign
 * watched one work by accident when a regex character class happened to have
 * balanced braces.
 */
function clientElementStatements(code: string): string[] {
  const out: string[] = [];
  const creation = /=\s*el\(\s*'([a-z]+)'[^;]*;/g;
  let hit: RegExpExecArray | null;
  while ((hit = creation.exec(code)) !== null) {
    if (ROLELESS_TAGS.has(hit[1])) out.push(hit[0]);
  }
  /* Identifiers created as a roleless tag by the DOM API rather than by el(). */
  const roleless = new Set<string>();
  const created = /(?:const|let|var)\s+(\w+)\s*=\s*document\.createElement\(\s*'([a-z]+)'/g;
  while ((hit = created.exec(code)) !== null) {
    if (ROLELESS_TAGS.has(hit[2])) roleless.add(hit[1]);
  }
  /* setAttribute runs: group by the identifier they are called on, so a role
     set on the line above a label still counts as the same element. */
  const byName: Record<string, string[]> = {};
  const setter = /(\w+)\.setAttribute\(\s*'([^']+)'/g;
  while ((hit = setter.exec(code)) !== null) {
    if (!roleless.has(hit[1])) continue;
    (byName[hit[1]] = byName[hit[1]] || []).push("setAttribute('" + hit[2] + "'");
  }
  for (const name of Object.keys(byName)) out.push(byName[name].join(' '));
  return out;
}

/**
 * R245: `aria-label` on a generic container with no role is dropped by
 * assistive technology. Measured at runtime across the fourteen pages before
 * the fix: 102 elements, in two families - 51 map paths built by
 * `units-client.ts` and 51 containers, 44 of them typed into markup.
 */
export function orphanAriaLabelFaults(root = REPO_ROOT): string[] {
  const faults: string[] = [];
  for (const rel of sourceScanFiles(root)) {
    const text = readFileSync(join(root, rel), 'utf8');
    if (rel.endsWith('.astro')) {
      LABELLED_TAG.lastIndex = 0;
      let hit: RegExpExecArray | null;
      while ((hit = LABELLED_TAG.exec(text)) !== null) {
        if (!SETS_ROLE.test(hit[0])) {
          faults.push(rel + ' labels a <' + hit[1] + '> that has no role');
        }
      }
      continue;
    }
    /* Review 8: the first version of this rule stopped at `.astro`, which is
       half the measured population and the smaller half. Fifty-one of the 102
       orphaned labels were `<path>` elements built by `units-client.ts`, and
       seven more were score cells built by the same file - none of them
       reachable by a rule that only reads markup. A regression there would
       have passed the gate, and the negative case that "proved" the gate
       anchored on a page, so it would have passed too. */
    for (const statement of clientElementStatements(maskComments(text))) {
      if (ARIA_LABEL_KEY.test(statement) && !SETS_ROLE.test(statement)) {
        faults.push(rel + ' labels an element it builds without giving it a role');
      }
    }
  }
  return faults;
}

/**
 * Golden rule 2, as a gate. An HTML comment in an `.astro` template is emitted
 * into the page; an Astro expression comment is not. Four comments carrying
 * audit codes were shipping in the built HTML when this was written - three in
 * `workforce.astro` from an earlier section, and one this section had just
 * added - and nothing was checking.
 *
 * The needle is the code together with its bracketed section tag, not the code
 * alone: the hospital administration regions are numbered `R01` to `R13` and a
 * rule matching a bare code would flag the page that names one.
 */
export function renderedAuditCodeFaults(root = REPO_ROOT): string[] {
  const faults: string[] = [];
  const htmlComment = /<!--([\s\S]*?)-->/g;
  const auditCode = new RegExp('R\\d{2,3}\\s*\\[\\s*' + String.fromCharCode(167) + '?S');
  for (const rel of sourceScanFiles(root)) {
    if (!rel.endsWith('.astro')) continue;
    const text = readFileSync(join(root, rel), 'utf8');
    htmlComment.lastIndex = 0;
    let hit: RegExpExecArray | null;
    while ((hit = htmlComment.exec(text)) !== null) {
      const code = auditCode.exec(hit[1]);
      if (code) {
        faults.push(rel + ' ships an audit code to the browser in an HTML comment: '
          + code[0].trim());
      }
    }
  }
  return faults;
}

/**
 * R259: no application logic reads an `aria-*` attribute. Selection state read
 * back out of a human-readable label breaks on any rewording, and this
 * codebase ships a script that rewrites rendered text.
 */
export function ariaAsStateFaults(root = REPO_ROOT): string[] {
  const faults: string[] = [];
  for (const rel of sourceScanFiles(root)) {
    /* This file and selftests.ts are the exception by construction: a gate
       that checks aria attributes has to read them. */
    if (rel === 'src/lib/accessibility-check.ts' || rel === 'src/lib/selftests.ts') continue;
    const code = maskComments(readFileSync(join(root, rel), 'utf8'));
    for (const shape of ARIA_STATE_READS) {
      if (shape.pattern.test(code)) {
        faults.push(rel + ' reads an aria attribute as state (' + shape.name + ')');
      }
    }
  }
  return faults;
}

/* Review 9 of P20: the first version matched `getAttribute('aria-...')` and
   nothing else, so a selection read back with `querySelector('[aria-pressed=
   "true"]')` - the more common spelling in this codebase's idiom - would have
   passed. The tree had no instance of any of these when this was written;
   each shape is here because a gate that knows one spelling of a defect is
   the shape review 8 found in the aria-label rule. Styling on aria state in a
   stylesheet is not logic, and a stylesheet is not scanned. */
const ARIA_STATE_READS: { name: string; pattern: RegExp }[] = [
  { name: 'getAttribute', pattern: /getAttribute\(\s*['"]aria-/ },
  { name: 'hasAttribute', pattern: /hasAttribute\(\s*['"]aria-/ },
  { name: 'selector', pattern: /(?:querySelector(?:All)?|closest|matches)\(\s*['"`][^'"`]*\[aria-/ },
  /* an ARIA reflection property read: `el.ariaPressed`, but not the
     assignment `el.ariaPressed = ...`, which writes. The `\b` is load-bearing:
     without it `\w*` gives back one letter, the lookahead then sees `d = `
     instead of ` = `, and every write matches as a read. */
  { name: 'reflection', pattern: /\.aria[A-Z]\w*\b(?!\s*=(?!=))/ }
];
