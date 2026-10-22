/* The README checks: what the repo's front-page documents claim, held to
 * the code that makes each claim true.
 *
 * Moved out of manifest-check.ts (the branch review against main,
 * 2026-10-21, found that module changing for every reason any of its checks
 * did). These read README.md (the advertised self-test count, its other
 * counts, the deploy instruction), research/README.md (how many self-tests
 * gate the measurement seed, listed and counted), specs/HANDOFF.md (the
 * chapter count) and the deploy workflow. A README states a count because
 * the count is the claim, so each one is read back rather than trusted.
 *
 * The code moved as it was. A comment names page-check.ts where it said
 * "one screen up".
 *
 * Build-time only; manifest-check.ts re-exports each of them, and
 * NODE_FS_MODULES there declares this module with what it reads. */
import { NUMBER_WORDS } from './format';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MONTE_CARLO_DRAWS, PARAM_DEFS } from './params';
import { STRESS_SCENARIO_COUNT } from './scenarios';
import { TABS } from './tabs';
import { REPO_ROOT, sourceText, maskComments } from './repo-text';

/* Finding 14 [P16 fix run 4]: research/README.md said "nine self-tests gate
 * it" and then listed seven. It was corrected to eleven, then to twelve one
 * run later, because the block keeps growing - which is the point. Finding 13
 * was the same defect in a code comment eight feet away, and the resolution
 * there was to state no count at all.
 *
 * A README cannot do that: the count is the claim. So it is gated instead,
 * the way the root README's "N built-in integrity tests" already is. The
 * repo's prose spells numbers, so the comparison spells them too.
 *
 * `null` means the sentence is gone, which is itself drift worth failing on. */
/* review 3 of P24: format.ts's one list of number words, imported */

export function researchReadmeGateCount(root = REPO_ROOT): string | null {
  const text = sourceText('research/README.md', root);
  const m = text.match(/and \*\*([a-z]+)\*\* self-tests\s*\ngate it/);
  return m ? m[1] : null;
}

/* Finding 1 [P16 review 3]: the check above compares the spelled number and
 * nothing else, so when the paragraph said fourteen and listed twelve it was
 * green. 14 == 14. It never counted the list, which is the half that failed -
 * inside the fix for the previous review's finding that the paragraph said
 * nine and listed seven.
 *
 * The list is bullets now, one gate per line, because a comma-separated
 * English list cannot be counted without guessing what a comma means. */
export function researchReadmeGateList(root = REPO_ROOT): string[] {
  const text = sourceText('research/README.md', root);
  const m = text.match(/and \*\*[a-z]+\*\* self-tests\s*\ngate it:[ \t]*\n/);
  if (!m) return [];
  const out: string[] = [];
  for (const line of text.slice(m.index! + m[0].length).split('\n')) {
    if (line.trim() === '') {
      if (out.length) break;
      continue;
    }
    if (!line.startsWith('- ')) break;
    out.push(line.slice(2).trim());
  }
  return out;
}

/* Counted from the SOURCE, and this is not a stylistic choice.
 *
 * ⚠️ The first version of the row that consumes this asked
 * `SELF_TEST_SOURCES.find(s => s.surface === 'baseline-registry.ts').rows()`
 * for the count - from inside that very surface. `rows()` builds every row in
 * the block including the one asking, so it recursed until the process hung:
 * a five-minute timeout with no error, in a check written to enforce honesty
 * about a count. A self-test that measures its own surface cannot execute it.
 *
 * Reading the text is also what `renderedSelfTestNameLeaks` (page-check.ts)
 * does, and for the same reason. */
export function registrySurfaceRowCount(root = REPO_ROOT): number {
  const code = maskComments(sourceText('src/lib/selftests.ts', root));
  const start = code.indexOf("surface: 'baseline-registry.ts'");
  if (start < 0) return -1;
  const end = code.indexOf('\n];', start);
  return (code.slice(start, end < 0 ? undefined : end).match(/runGuarded\(/g) || []).length;
}

/* Both halves, and they fail for different reasons: the number drifts when
 * someone edits prose, the list drifts when someone adds a gate and stops
 * after the number. Reporting them separately is what lets the negative test
 * prove each one, which is how the list half got in unproved. */
/* [P17 fix run 6]: the same paragraph carries a SECOND count - "All fourteen
 * of them now have a case" - and it was ungated, two clauses after the file
 * says a count no check maintains is a claim with a half-life. It names the
 * same fourteen gates, so it is held to the same number. */
export function researchReadmeCasedCount(root = REPO_ROOT): string | null {
  const text = sourceText('research/README.md', root);
  const m = text.match(/\*\*All ([a-z]+) of them now have a case\*\*/);
  return m ? m[1] : null;
}

export function registryGateCountDrift(actual: number, root = REPO_ROOT): string[] {
  const out: string[] = [];
  const said = researchReadmeGateCount(root);
  const want = NUMBER_WORDS[actual];
  if (said === null) {
    out.push('research/README.md no longer states how many self-tests gate the seed');
  } else if (want === undefined) {
    out.push('the registry surface has ' + actual + ' rows, past the spelled range');
  } else if (said !== want) {
    out.push('research/README.md says ' + said + ' self-tests gate the seed; there are '
      + want + ' (' + actual + ')');
  }
  const listed = researchReadmeGateList(root);
  if (listed.length !== actual) {
    out.push('research/README.md lists ' + listed.length + ' gates by name; there are '
      + actual);
  }
  const cased = researchReadmeCasedCount(root);
  if (cased === null) {
    out.push('research/README.md no longer states how many gates have a case');
  } else if (want !== undefined && cased !== want) {
    out.push('research/README.md says ' + cased + ' gates have a negative case; there are '
      + want + ' gates (' + actual + ')');
  }
  return out;
}

/* R155 [§S0]: the README's advertised self-test count, read from the file.
 *
 * It said 27. The real figure was 19 (11 model + 1 bridge + 7 tax), and the
 * two orphans R153 wired took it to 21. Fifth instance of a hardcoded count
 * drifting (AB2, AC8, AJ2, AO4). Comparing it against selfTestSummary().total
 * is what stops it being hand-maintained. */
const readmeCache = new Map<string, number | null>();

export function readmeAdvertisedTestCount(root = REPO_ROOT): number | null {
  if (readmeCache.has(root)) return readmeCache.get(root)!;
  const text = readFileSync(join(root, 'README.md'), 'utf8');
  const m = text.match(/(\d+) built-in integrity tests/);
  const n = m ? Number(m[1]) : null;
  readmeCache.set(root, n);
  return n;
}

/* R113 [§S1]: the README's deploy instruction told the reader to set Pages to
 * "Deploy from a branch, folder /docs", which switches Pages off the Actions
 * workflow and publishes the retired tree over the live app at the same URL.
 * The README is also where a new contributor or agent orients, which is why an
 * audit spent seventeen passes reading a directory nothing deploys.
 *
 * The check is three exact patterns rather than a reading of the prose,
 * because prose matching is what let the figure in R155 drift in the first
 * place:
 *   1. does the README name a file inside the retired tree (`docs/<name>`)?
 *   2. does it name `/docs` as a Pages folder?
 *   3. does it name the workflow that actually deploys the site?
 * (1) is the load-bearing half: a README whose file manifest IS the retired
 * tree cannot avoid presenting it as the product. Naming the bare directory in
 * prose is deliberately still allowed, because warning a reader off `docs/` is
 * the correct thing for this file to do - only paths INTO it are the defect.
 * (3) stops the section being deleted rather than corrected. */
const DEPLOY_WORKFLOW = '.github/workflows/deploy.yml';
const PAGES_DEPLOY_ACTION = 'actions/deploy-pages';
const RETIRED_TREE_PATH = /docs\/[A-Za-z0-9_.-]/;
const PAGES_FOLDER_TOKEN = '/docs';

export interface ReadmeDeployDrift {
  retiredPaths: string[]; /* lines naming a file in, or the folder form of, the retired tree */
  missingWorkflowReference: boolean;
}

const deployCache = new Map<string, ReadmeDeployDrift>();

export function readmeDeployDrift(root = REPO_ROOT): ReadmeDeployDrift {
  const hit = deployCache.get(root);
  if (hit) return hit;
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  const retiredPaths = readme
    .split('\n')
    .map((line, i) => ({ line: line.trim(), n: i + 1 }))
    .filter((x) => RETIRED_TREE_PATH.test(x.line) || x.line.includes(PAGES_FOLDER_TOKEN))
    .map((x) => 'README.md:' + x.n + ': ' + x.line.slice(0, 100));

  /* Only demand the reference when the workflow is what deploys the site. If
     Pages ever legitimately moves off Actions, this half goes quiet instead of
     forcing the README to describe something that no longer runs. */
  let deploysViaActions = false;
  try {
    deploysViaActions = readFileSync(join(root, DEPLOY_WORKFLOW), 'utf8')
      .includes(PAGES_DEPLOY_ACTION);
  } catch {
    deploysViaActions = false;
  }
  const result: ReadmeDeployDrift = {
    retiredPaths: retiredPaths,
    missingWorkflowReference: deploysViaActions && !readme.includes(DEPLOY_WORKFLOW)
  };
  deployCache.set(root, result);
  return result;
}

/* R261 [§S1]: a stated chapter count must be the real one.
 *
 * The app has fourteen chapters. The audit's boundary tables said twelve and
 * omitted Long-Term Care and Risk entirely, so every coverage claim from Pass
 * 18 on used a wrong denominator and four recommendations were scoped against
 * a page set that was missing two of its members. The same figure was stale in
 * three places in specs/HANDOFF.md, which is where a new contributor starts.
 *
 * TABS is the authority (R266), so any prose figure is checkable against it.
 * The number must sit immediately before the noun, which is what keeps
 * sentences like "the other 11 are standalone pages" out of it. */
const STATED_COUNT_DOCS = ['README.md', 'specs/HANDOFF.md'];
const STATED_COUNT = /(\d+)[ -](pages|chapters|tabs)\b/gi;

export interface StatedCountDrift { file: string; line: number; stated: number; text: string }

const statedCache = new Map<string, StatedCountDrift[]>();

export function statedChapterCountDrift(root = REPO_ROOT, tabs = TABS): StatedCountDrift[] {
  const key = root + '|' + tabs.length;
  const hit = statedCache.get(key);
  if (hit) return hit;
  const out: StatedCountDrift[] = [];
  for (const doc of STATED_COUNT_DOCS) {
    let text: string;
    try {
      text = readFileSync(join(root, doc), 'utf8');
    } catch {
      continue; /* a document that does not exist states nothing */
    }
    text.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(STATED_COUNT)) {
        const stated = Number(m[1]);
        if (stated === tabs.length) continue;
        out.push({ file: doc, line: i + 1, stated: stated, text: line.trim().slice(0, 100) });
      }
    });
  }
  statedCache.set(key, out);
  return out;
}

/* R136 [§S12]: the README's other three counts, gated the way R155 gated the
 * fourth.
 *
 * The row filed one instance - PARAM_DEFS has 31 and the README said "27
 * sourced parameter distributions." Measured, the README now says 32 and
 * PARAM_DEFS holds 32, so that instance closed in some earlier pass without
 * anything being written to keep it closed. The sentence carries four
 * numbers: the Monte Carlo draws, the parameter distributions, the stress
 * scenarios and the integrity tests. Only the last was checked.
 *
 * A README cannot interpolate, so the count IS the claim and gating is the
 * only available fix - the same reasoning R155 and the research README's gate
 * already record. Each is read with its own pattern and compared against its
 * own collection, so the three fail separately and for different reasons.
 *
 * MONTE_CARLO_DRAWS is formatted with a thousands separator in the prose and
 * without one in the code, which is why the pattern admits the comma rather
 * than the README being changed to read "1500 Monte Carlo draws". */
export interface ReadmeCountClaim {
  what: string;
  stated: number | null;
  actual: number;
}

export function readmeStatedCounts(root = REPO_ROOT): ReadmeCountClaim[] {
  const text = readFileSync(join(root, 'README.md'), 'utf8');
  const read = (re: RegExp): number | null => {
    const m = text.match(re);
    return m ? Number(m[1].replace(/,/g, '')) : null;
  };
  return [
    {
      what: 'Monte Carlo draws',
      stated: read(/([\d,]+) Monte Carlo draws/),
      actual: MONTE_CARLO_DRAWS
    },
    {
      what: 'sourced parameter distributions',
      stated: read(/(\d+) sourced parameter distributions/),
      actual: PARAM_DEFS.length
    },
    {
      what: 'stress scenarios',
      stated: read(/(\d+) stress scenarios/),
      actual: STRESS_SCENARIO_COUNT
    }
  ];
}

export function readmeCountDrift(root = REPO_ROOT): string[] {
  return readmeStatedCounts(root)
    .filter((c) => c.stated !== c.actual)
    .map((c) => c.stated === null
      ? 'README.md no longer states how many ' + c.what + ' there are; the code has ' + c.actual
      : 'README.md says ' + c.stated + ' ' + c.what + '; the code has ' + c.actual);
}
