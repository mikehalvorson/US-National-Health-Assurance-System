/* R228 [§S3]: the rollout `kind` vocabulary, declared in one place.
 *
 * A KPP/TPP rollout row's `kind` decides what happens to it. Three modules
 * write the field and a fourth reads it to decide precedence:
 *
 *   extract_quality_catalog.py  writes the framework's own rows
 *   phase-targets.ts            adds derived, data-plan and prose-floor rows
 *   equations.ts                replaces rows whose kind is EXACTLY
 *                               'derived interim target', preserves the four
 *                               in AUTHORITATIVE_KINDS, and leaves anything
 *                               else untouched
 *
 * That last clause is the hazard this module exists for. A kind string outside
 * both lists is neither replaced nor deliberately preserved: it survives to the
 * reader carrying whatever produced it, and no error is raised. The vocabulary
 * has been six strings for as long as anyone has counted them, but nothing
 * required that, and a seventh would be invisible.
 *
 * So the table below is the enum, `disposition` is what equations.ts will do
 * with each kind, and the three checks assert the table, the catalog and
 * AUTHORITATIVE_KINDS all still describe the same six strings. */
import { AUTHORITATIVE_KINDS, EQUATIONS } from './equations';
import { parseNum } from './phase-targets';
import { QUALITY_DATA } from './quality';
import type { QualityData } from './quality-data';

/* What applyEquationTargets does with a row carrying this kind. */
export type KindDisposition =
  | 'authoritative'    /* preserved, and usable as a clamping anchor */
  | 'replaced'         /* overwritten with the equation's value */
  | 'equation-output'; /* what a replaced row becomes */

/* R221 [§S3]: the phrase the Quality tab uses for where a published target
   came from. The page said "Targets here are calculated, not asserted", which
   is true of 538 of the 727 published rows and false of the other 189. Each
   kind now names its derivation, the page renders the counts from the catalog
   instead of asserting a blanket claim, and no published row may carry a kind
   that has no derivation to state. */
export interface KindDecl {
  producer: string;
  disposition: KindDisposition;
  /* null for the kind no reader ever sees, because it is replaced. */
  derivation: string | null;
}

export const ROLLOUT_KINDS: Record<string, KindDecl> = {
  'maturity target': {
    producer: 'tools/extract_quality_catalog.py', disposition: 'authoritative',
    derivation: 'the plan\'s own maturity target'
  },
  'phase milestone': {
    producer: 'tools/extract_quality_catalog.py', disposition: 'authoritative',
    derivation: 'the plan\'s own gate floors and milestones'
  },
  'progression floor': {
    producer: 'tools/extract_quality_catalog.py and phase-targets.ts EXTRA_ANCHORS',
    disposition: 'authoritative',
    derivation: 'the plan\'s own gate floors and milestones'
  },
  'data-plan interim target': {
    producer: 'phase-targets.ts, from DATA_PHASES', disposition: 'authoritative',
    derivation: 'the Data tab\'s information-mesh plan'
  },
  'derived interim target': {
    producer: 'phase-targets.ts entry floors, interpolation and QUAL_LADDER',
    disposition: 'replaced', derivation: null
  },
  'equation-derived target': {
    producer: 'equations.ts applyEquationTargets', disposition: 'equation-output',
    derivation: 'that parameter\'s own equation'
  }
};

/* The published rows grouped by the derivation the page states for them, so
   the page can render counts instead of a claim. */
export interface DerivationCount { derivation: string; rows: number; kinds: string[] }

export function derivationCounts(Q: QualityData = QUALITY_DATA): DerivationCount[] {
  const byDerivation = new Map<string, { rows: number; kinds: Set<string> }>();
  for (const p of Q.parameters) {
    if (p.type === 'CP') continue;
    for (const e of (p.rollout || [])) {
      const decl = ROLLOUT_KINDS[e.kind];
      if (!decl || !decl.derivation) continue;
      const hit = byDerivation.get(decl.derivation) ||
        { rows: 0, kinds: new Set<string>() };
      hit.rows += 1;
      hit.kinds.add(e.kind);
      byDerivation.set(decl.derivation, hit);
    }
  }
  return [...byDerivation.entries()]
    .map(([derivation, v]) => ({ derivation, rows: v.rows, kinds: [...v.kinds].sort() }))
    .sort((a, b) => b.rows - a.rows);
}

/* A published row whose kind has no stated derivation.
 *
 * The Quality tab renders derivationCounts() directly, so it cannot state a
 * derivation the declaration does not have; what it CAN do is publish a row
 * whose kind was never given one, and that row then appears in a total the
 * page describes without being described. Only 'derived interim target' is
 * allowed to have none, because it is replaced before publication - and if it
 * ever survives, this fires, which is the state R248 reports separately.
 *
 * The page's half of the claim is pinned in tests/pages/quality.test.ts,
 * against the rendered HTML rather than the template. */
export function underivedPublishedKinds(Q: QualityData = QUALITY_DATA): string[] {
  const out = new Set<string>();
  for (const p of Q.parameters) {
    if (p.type === 'CP') continue;
    for (const e of (p.rollout || [])) {
      const decl = ROLLOUT_KINDS[e.kind];
      if (!decl || !decl.derivation) out.add(e.kind);
    }
  }
  return [...out].sort();
}

function catalogKinds(Q: QualityData): Set<string> {
  const seen = new Set<string>();
  for (const p of Q.parameters) {
    if (p.type === 'CP') continue;
    for (const e of (p.rollout || [])) seen.add(e.kind);
  }
  return seen;
}

/* A kind on a live row that the table does not describe. This is the one that
   catches a new string added in phase-targets.ts or in the generator. */
export function undeclaredRolloutKinds(Q: QualityData = QUALITY_DATA): string[] {
  return [...catalogKinds(Q)].filter((k) => !ROLLOUT_KINDS[k]).sort();
}

/* A kind the table declares that no row carries. Catches the reverse drift: a
   producer stops emitting a kind and the vocabulary keeps describing it, which
   is how a stale enum starts lying about the pipeline.

   'derived interim target' is the deliberate exception. phase-targets.ts emits
   538 of them and equations.ts converts every one, so it is absent from the
   finished catalog BY DESIGN - that conversion is what R248's survivor check
   asserts separately. Requiring it here would be requiring the conversion to
   fail. */
export function unproducedRolloutKinds(Q: QualityData = QUALITY_DATA): string[] {
  const live = catalogKinds(Q);
  return Object.keys(ROLLOUT_KINDS)
    .filter((k) => ROLLOUT_KINDS[k].disposition !== 'replaced' && !live.has(k))
    .sort();
}

/* R151 + R277 [§S3]: parseNum takes the FIRST numeric token in a string, and
 * nothing said which strings that is safe on.
 *
 * Two outcomes are silent today. A target that does not parse routes its
 * metric to the qualitative ladder with no error; a target that parses the
 * WRONG number anchors a whole trajectory to it. Both are decided by the
 * catalog's prose, which the audit does not control.
 *
 * Measured across the 130 KPP/TPP maturity targets:
 *   - 7 do not parse: KPP-D1 to D7, the "to be calibrated" outcome metrics.
 *     Every one of them carries a `template` on its equation, which is the
 *     declared mechanism for a target with no numeric scaffold. So the null
 *     result is not silent after all - it is corroborated by a second signal,
 *     and NON_PARSING_IS_TEMPLATED asserts the two sets agree.
 *   - 1 parses a number a reader would not pick: KPP-C2's target reads "to be
 *     reconciled with $4.75T total system cost and current population
 *     denominator", and the parser returns 4.75 with unit 'money' - a national
 *     total in trillions read as a per-person dollar figure. BQ9 filed this
 *     hazard as demonstrated but unverified. It is live, on a maturity target,
 *     and it is used as a clamping anchor. R233 stops it being used; this
 *     declares it so it cannot be rediscovered as new. */
export const DECLARED_TARGET_MISPARSES: Record<string, string> = {
  'KPP-C2': 'the target names $4.75T of national system cost, not a per-person ' +
    'dollar target; parseNum returns 4.75 money. The equation carries a template, ' +
    'so the parse is not used to render the value, and R233 keeps it out of the ' +
    'anchor set.'
};

/* A maturity target that parses to something a reader would not pick, and that
   nobody has declared. Two shapes are caught: a calendar year read as a value,
   and a template metric whose target parses at all - a template says the
   catalog string has no numeric scaffold, so a parse from it is incidental. */
export function undeclaredTargetMisparses(Q: QualityData = QUALITY_DATA): string[] {
  const out: string[] = [];
  for (const p of Q.parameters) {
    if (p.type === 'CP') continue;
    if (DECLARED_TARGET_MISPARSES[p.id]) continue;
    const meta = parseNum(p.target);
    if (meta) {
      const d = EQUATIONS[p.id];
      if (d && d.template) {
        out.push(p.id + ': templated target parses as ' + meta.num + ' ' + meta.unit);
      } else if (isCalendarShaped(meta.num)) {
        out.push(p.id + ': target parses a calendar-shaped ' + meta.num);
      }
    }
    /* Review finding: the scan covered the 130 maturity targets and stopped
       there, but parseNum is also called on every rollout value inside
       committedAnchors, where a wrong number becomes a clamping anchor rather
       than a displayed target. All 727 are scanned now. */
    for (const e of (p.rollout || [])) {
      const ev = parseNum(e.value);
      if (ev && isCalendarShaped(ev.num)) {
        out.push(p.id + '@' + e.phase + ': value parses a calendar-shaped ' + ev.num);
      }
    }
  }
  return out.sort();
}

/* A year read as a quantity is the failure R277 demonstrated. Bounded rather
   than pattern-matched, because the shape it takes varies and the magnitude
   does not: no live KPP/TPP target or rollout value is a count in the 1900s. */
function isCalendarShaped(n: number): boolean {
  return Number.isInteger(n) && n >= 1900 && n <= 2100;
}

/* A declared misparse that no longer reproduces. Keeps the list from
   outliving the prose it describes. */
export function staleTargetMisparses(Q: QualityData = QUALITY_DATA): string[] {
  const byId = new Map(Q.parameters.map((p) => [p.id, p]));
  return Object.keys(DECLARED_TARGET_MISPARSES).filter((id) => {
    const p = byId.get(id);
    if (!p) return true;
    const meta = parseNum(p.target);
    const d = EQUATIONS[id];
    return !meta || !d || !d.template;
  }).sort();
}

/* Every KPP/TPP whose maturity target does not parse must carry a template.
   That is what turns "the parser returned null" from a silent reroute into a
   corroborated decision - two independent signals saying the same thing. */
export function unTemplatedNonParsingTargets(Q: QualityData = QUALITY_DATA): string[] {
  const out: string[] = [];
  for (const p of Q.parameters) {
    if (p.type === 'CP') continue;
    if (parseNum(p.target)) continue;
    const d = EQUATIONS[p.id];
    if (!d || !d.template) out.push(p.id);
  }
  return out.sort();
}

/* The table's 'authoritative' set and equations.ts's AUTHORITATIVE_KINDS are
   the same claim written twice. Compared in both directions, so adding a kind
   to either one alone fails. */
export function authoritativeKindDrift(): string[] {
  const declared = Object.keys(ROLLOUT_KINDS)
    .filter((k) => ROLLOUT_KINDS[k].disposition === 'authoritative');
  const inCode = Object.keys(AUTHORITATIVE_KINDS).filter((k) => AUTHORITATIVE_KINDS[k]);
  const out: string[] = [];
  for (const k of declared) {
    if (!AUTHORITATIVE_KINDS[k]) out.push('declared authoritative, not in AUTHORITATIVE_KINDS: ' + k);
  }
  for (const k of inCode) {
    if (ROLLOUT_KINDS[k]?.disposition !== 'authoritative') {
      out.push('in AUTHORITATIVE_KINDS, not declared authoritative: ' + k);
    }
  }
  return out.sort();
}
