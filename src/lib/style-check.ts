/* R103 [§S1]: every disposition a legislation domain declares must reach a
 * stylesheet rule.
 *
 * legislation-client.ts builds each badge's class by lowercasing the action
 * string: `legislation-action legislation-action-` + action.toLowerCase(). A
 * typo in either the data or the stylesheet produces a class nothing styles,
 * and the audit's concern was that this would render an invisible badge.
 *
 * Retargeted here from the retired stylesheet. Measured against
 * src/styles/global.css: thirteen domains declare seven distinct dispositions,
 * and five of them have their own colour rule. `amend` and `preserve` do not,
 * and are painted by the shared `.legislation-action` rule instead - visible
 * and legible, just not colour-coded. So the badge is not invisible, and the
 * two are pinned rather than given invented colours.
 *
 * That pin is only safe while the shared rule exists, which is why its absence
 * is checked too: delete `.legislation-action` and those two badges really do
 * go unstyled.
 *
 * Build-time only, like manifest-check.ts. Memoised: the stylesheet is ~76 KB
 * and vitest re-imports once per test file.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DOMAINS } from './legislation';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const STYLESHEET = 'src/styles/global.css';

const BASE_RULE = '.legislation-action';
const VARIANT_RULE = /\.legislation-action-([a-z0-9]+(?:-[a-z0-9]+)*)\b/g;

/* Not a disposition: the flex container the badges sit in. */
const NON_DISPOSITION_CLASSES = new Set(['badges']);

/* Dispositions with no colour rule of their own, painted by BASE_RULE. Pinned
   so an eighth cannot join them unnoticed, and so giving one a colour has to
   be a deliberate edit here. */
export const STYLED_BY_BASE_RULE = ['amend', 'preserve'];

export interface LegislationStyleDrift {
  unstyled: string[]; /* declared by a domain, no rule and not pinned */
  deadRules: string[]; /* a rule no domain can produce */
  exemptionsChanged: string[]; /* the pinned set, when it no longer matches */
  baseRuleMissing: boolean;
}

const cache = new Map<string, LegislationStyleDrift>();

export function declaredDispositions(): string[] {
  const out = new Set<string>();
  for (const domain of DOMAINS) {
    for (const action of domain.actions) out.add(action.toLowerCase());
  }
  return [...out].sort();
}

export function styledDispositions(root = REPO_ROOT): string[] {
  const css = readFileSync(join(root, STYLESHEET), 'utf8');
  const out = new Set<string>();
  for (const m of css.matchAll(VARIANT_RULE)) {
    if (!NON_DISPOSITION_CLASSES.has(m[1])) out.add(m[1]);
  }
  return [...out].sort();
}

export function legislationStyleDrift(root = REPO_ROOT): LegislationStyleDrift {
  const hit = cache.get(root);
  if (hit) return hit;

  const declared = declaredDispositions();
  const styled = new Set(styledDispositions(root));
  const pinned = new Set(STYLED_BY_BASE_RULE);
  const css = readFileSync(join(root, STYLESHEET), 'utf8');

  const fellThrough = declared.filter((d) => !styled.has(d));
  const result: LegislationStyleDrift = {
    unstyled: fellThrough.filter((d) => !pinned.has(d)),
    deadRules: [...styled].filter((s) => !declared.includes(s)).sort(),
    exemptionsChanged:
      fellThrough.join(', ') === [...STYLED_BY_BASE_RULE].sort().join(', ') ? [] : fellThrough,
    /* The rule, not a longer class that merely starts with it. */
    baseRuleMissing: !new RegExp('\\' + BASE_RULE + '\\s*\\{').test(css)
  };
  cache.set(root, result);
  return result;
}
