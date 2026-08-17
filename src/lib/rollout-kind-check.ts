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
import { AUTHORITATIVE_KINDS } from './equations';
import { QUALITY_DATA } from './quality';
import type { QualityData } from './quality-data';

/* What applyEquationTargets does with a row carrying this kind. */
export type KindDisposition =
  | 'authoritative'    /* preserved, and usable as a clamping anchor */
  | 'replaced'         /* overwritten with the equation's value */
  | 'equation-output'; /* what a replaced row becomes */

export interface KindDecl { producer: string; disposition: KindDisposition }

export const ROLLOUT_KINDS: Record<string, KindDecl> = {
  'maturity target': {
    producer: 'tools/extract_quality_catalog.py', disposition: 'authoritative'
  },
  'phase milestone': {
    producer: 'tools/extract_quality_catalog.py', disposition: 'authoritative'
  },
  'progression floor': {
    producer: 'tools/extract_quality_catalog.py and phase-targets.ts EXTRA_ANCHORS',
    disposition: 'authoritative'
  },
  'data-plan interim target': {
    producer: 'phase-targets.ts, from DATA_PHASES', disposition: 'authoritative'
  },
  'derived interim target': {
    producer: 'phase-targets.ts entry floors, interpolation and QUAL_LADDER',
    disposition: 'replaced'
  },
  'equation-derived target': {
    producer: 'equations.ts applyEquationTargets', disposition: 'equation-output'
  }
};

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
