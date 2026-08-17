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
import { declaredVsLive } from './declared-sets';
import { forEachRolloutRow, QUALITY_DATA } from './quality';
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
  forEachRolloutRow(Q, function (_p, e) {
    const decl = ROLLOUT_KINDS[e.kind];
    if (!decl || !decl.derivation) return;
    const hit = byDerivation.get(decl.derivation) ||
      { rows: 0, kinds: new Set<string>() };
    hit.rows += 1;
    hit.kinds.add(e.kind);
    byDerivation.set(decl.derivation, hit);
  });
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
  forEachRolloutRow(Q, function (_p, e) {
    const decl = ROLLOUT_KINDS[e.kind];
    if (!decl || !decl.derivation) out.add(e.kind);
  });
  return [...out].sort();
}

function catalogKinds(Q: QualityData): Set<string> {
  const seen = new Set<string>();
  forEachRolloutRow(Q, function (_p, e) { seen.add(e.kind); });
  return seen;
}

/* A kind on a live row that the table does not describe. This is the one that
   catches a new string added in phase-targets.ts or in the generator. */
export function undeclaredRolloutKinds(Q: QualityData = QUALITY_DATA): string[] {
  return declaredVsLive(Object.keys(ROLLOUT_KINDS), catalogKinds(Q)).undeclared;
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
  const shouldBeLive = Object.keys(ROLLOUT_KINDS)
    .filter((k) => ROLLOUT_KINDS[k].disposition !== 'replaced');
  return declaredVsLive(shouldBeLive, catalogKinds(Q)).stale;
}

/* The table's 'authoritative' set and equations.ts's AUTHORITATIVE_KINDS are
   the same claim written twice. Compared in both directions, so adding a kind
   to either one alone fails. */
export function authoritativeKindDrift(): string[] {
  const declared = Object.keys(ROLLOUT_KINDS)
    .filter((k) => ROLLOUT_KINDS[k].disposition === 'authoritative');
  const inCode = Object.keys(AUTHORITATIVE_KINDS).filter((k) => AUTHORITATIVE_KINDS[k]);
  const diff = declaredVsLive(declared, inCode);
  return [
    ...diff.stale.map((k) => 'declared authoritative, not in AUTHORITATIVE_KINDS: ' + k),
    ...diff.undeclared.map((k) => 'in AUTHORITATIVE_KINDS, not declared authoritative: ' + k)
  ].sort();
}
