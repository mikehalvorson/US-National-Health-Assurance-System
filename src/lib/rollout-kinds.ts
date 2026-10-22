/* R247 [§S16]: the rollout `kind` vocabulary, declared once.
 *
 * R228 (§S3) wrote the vocabulary down as a table in rollout-kind-check.ts
 * and checked the catalog against it. It did not make it the only
 * declaration: measured at the start of §S16, six places enumerated the kinds
 * - that table, equations.ts's AUTHORITATIVE_KINDS, data-phases-checks.ts's
 * CATALOG_KINDS, fmea.ts's id slugs, and two exclusion lists in
 * quality-client.ts - and `RolloutEntry.kind` was a bare string, so a
 * misspelled kind compiled anywhere.
 *
 * The client's two lists were the defect R247 named. The phase overview
 * ("Numeric parameter milestones and gate floors") and the floor table showed
 * every row whose kind was NOT one of four, so any new or misspelled kind
 * would have been published as one of the plan's committed floors; and both
 * lists still excluded 'derived interim target', a kind no published row
 * carries, because equations.ts converts every one of them at import.
 *
 * Now:
 *  - this table is the one declaration, and `RolloutKind` is its key type;
 *  - the generated catalog's `RolloutEntry.kind` is a `RolloutKind`, so the
 *    payload and every producer's literal are checked by `astro check`;
 *  - every per-kind fact other modules need is a column here, and they derive
 *    what they need from it rather than restating a list;
 *  - the two client surfaces include by the `committedFloor` column;
 *  - assertRolloutKinds() throws at import, from quality.ts, on a kind the
 *    table does not declare, naming the record, the phase and the string.
 *
 * No imports, so equations.ts, phase-targets.ts and the generated catalog can
 * all depend on it without a cycle. */

/* What applyEquationTargets does with a row carrying this kind. */
export type KindDisposition =
  | 'authoritative'    /* preserved, and usable as a clamping anchor */
  | 'replaced'         /* overwritten with the equation's value */
  | 'equation-output'; /* what a replaced row becomes */

export interface KindDecl {
  producer: string;
  disposition: KindDisposition;
  /* R221 [§S3]: the phrase the Quality tab uses for where a published target
     came from; null for the kind no reader ever sees, because it is replaced. */
  derivation: string | null;
  /* Shown in the Quality tab's phase overview and floor table as one of the
     plan's committed milestones or floors. Inclusion, not exclusion. */
  committedFloor: boolean;
  /* Written by the catalog extractor itself, rather than added or rewritten
     downstream by phase-targets.ts and equations.ts. */
  fromCatalog: boolean;
  /* A row that closes its phase: the floor table says it controls that
     phase's exit, read from the phase's own purpose. */
  closesPhase: boolean;
  /* The suffix a failure-mode id takes when a parameter has two rows at one
     phase (fmea.ts); null for the kind that never reaches the published
     catalog. */
  slug: string | null;
}

const DECLARED = {
  'maturity target': {
    producer: 'tools/extract_quality_catalog.py', disposition: 'authoritative',
    derivation: 'the plan\'s own maturity target',
    committedFloor: false, fromCatalog: true, slug: 'maturity', closesPhase: false
  },
  'phase milestone': {
    producer: 'tools/extract_quality_catalog.py', disposition: 'authoritative',
    derivation: 'the plan\'s own gate floors and milestones',
    committedFloor: true, fromCatalog: true, slug: 'milestone', closesPhase: true
  },
  'progression floor': {
    producer: 'tools/extract_quality_catalog.py and phase-targets.ts EXTRA_ANCHORS',
    disposition: 'authoritative',
    derivation: 'the plan\'s own gate floors and milestones',
    committedFloor: true, fromCatalog: true, slug: 'floor', closesPhase: false
  },
  'data-plan interim target': {
    producer: 'phase-targets.ts, from DATA_PHASES', disposition: 'authoritative',
    derivation: 'the Data tab\'s information-mesh plan',
    committedFloor: false, fromCatalog: false, slug: 'data-plan', closesPhase: false
  },
  'derived interim target': {
    producer: 'phase-targets.ts entry floors, interpolation and QUAL_LADDER',
    disposition: 'replaced', derivation: null,
    committedFloor: false, fromCatalog: false, slug: null, closesPhase: false
  },
  'equation-derived target': {
    producer: 'equations.ts applyEquationTargets', disposition: 'equation-output',
    derivation: 'that parameter\'s own equation',
    committedFloor: false, fromCatalog: false, slug: 'eq', closesPhase: false
  }
} as const;

export type RolloutKind = keyof typeof DECLARED;

export const ROLLOUT_KINDS: Record<RolloutKind, KindDecl> = DECLARED;

export const ROLLOUT_KIND_NAMES = Object.keys(ROLLOUT_KINDS) as RolloutKind[];

export function isRolloutKind(s: string): s is RolloutKind {
  return Object.prototype.hasOwnProperty.call(ROLLOUT_KINDS, s);
}

export function kindsWhere(test: (d: KindDecl) => boolean): RolloutKind[] {
  return ROLLOUT_KIND_NAMES.filter(function (k) { return test(ROLLOUT_KINDS[k]); });
}

/* The one place a kind string from data becomes a declaration. Throws, naming
   the string, rather than returning undefined for a caller to absorb. */
export function kindDecl(kind: string): KindDecl {
  if (!isRolloutKind(kind)) {
    throw new Error('rollout-kinds.ts: "' + kind + '" is not a declared rollout kind');
  }
  return ROLLOUT_KINDS[kind];
}

/* Minimal shape so this module needs no import from the catalog. */
interface KindCarrier { id: string; type: string; rollout?: { phase: string; kind: string }[] }

/* Run from quality.ts once both enrichers have finished, so a kind added by
   either, or by a regenerated catalog read through a cast, stops the import
   before anything renders. */
export function assertRolloutKinds(parameters: KindCarrier[]): void {
  const bad: string[] = [];
  parameters.forEach(function (p) {
    (p.rollout || []).forEach(function (e) {
      if (!isRolloutKind(e.kind)) bad.push(p.id + '@' + e.phase + ' "' + e.kind + '"');
    });
  });
  if (bad.length) {
    throw new Error('rollout-kinds.ts: undeclared rollout kind on ' + bad.length +
      ' row(s): ' + bad.slice(0, 5).join(', '));
  }
}

/* The rows the Quality tab presents as the plan's committed milestones and
   floors: its phase overview and its floor table. Chosen by the
   `committedFloor` column, so a kind is shown there because it was declared
   one, never because it was missing from a list of exclusions. */
type RowOf<P extends { rollout?: { phase: string; kind: string }[] }> = NonNullable<P['rollout']>[number];

export function committedFloorRows<P extends { rollout?: { phase: string; kind: string }[] }>(
  parameters: P[]
): { parameter: P; entry: RowOf<P> }[] {
  const out: { parameter: P; entry: RowOf<P> }[] = [];
  parameters.forEach(function (parameter) {
    ((parameter.rollout || []) as RowOf<P>[]).forEach(function (entry) {
      if (kindDecl(entry.kind).committedFloor) out.push({ parameter: parameter, entry: entry });
    });
  });
  return out;
}

/* P22 [§S16] new finding: what a committed floor controls, for the floor
   table's last column. The table printed the gate's decision for a gated row
   and "P5 delivery-scale exit milestone" for every other one, which was right
   for the one P5 phase milestone and wrong for three ungated progression
   floors, two of them at P7. Each row now says it from its own data: its
   gate's decision, the decision its producer declared, or, for a phase
   milestone, the phase it closes. A row with none of these throws, naming
   itself, because a blank or a borrowed label is the defect. */
export function committedFloorControls(
  entry: { phase: string; kind: string; gate?: string; controls?: string },
  gates: { id: string; decision: string }[],
  phases: { id: string; purpose: string }[]
): string {
  if (entry.gate) {
    const g = gates.find(function (x) { return x.id === entry.gate; });
    if (!g) throw new Error('rollout-kinds.ts: ' + entry.phase + ' floor cites gate ' + entry.gate + ', which the catalog does not carry');
    return g.decision;
  }
  if (entry.controls) return entry.controls;
  if (kindDecl(entry.kind).closesPhase) {
    const ph = phases.find(function (x) { return x.id === entry.phase; });
    if (ph) return 'The ' + ph.id + ' exit milestone: ' + ph.purpose.toLowerCase();
  }
  throw new Error('rollout-kinds.ts: the ' + entry.phase + ' ' + entry.kind +
    ' row has no gate and no stated decision, so the floor table cannot say what it controls');
}
