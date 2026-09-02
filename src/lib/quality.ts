/* Quality catalog assembler: applies the phase-target derivation to the
   base catalog (once) and builds the per-parameter search index, mirroring
   the qualitydata.js -> phasetargets.js -> quality.js load order.
   Exports the enriched QUALITY_DATA consumed by the Quality tab client.

   ---- The import-time enricher convention (R229 [§S3]) -------------------

   This module is where the pipeline is assembled, so the rule lives here.

   An import-time enricher MUTATES A SHARED CATALOG IN PLACE, at module load,
   for every consumer in the realm. Two exist and both follow the same shape,
   which had been implemented twice as a coincidence rather than written down
   once as a rule:

     applyPhaseTargets    guards with Q.__enriched
     applyEquationTargets guards with Q.__equationApplied

   The rule, for the third one:

     1. Take the catalog as an argument. Do not reach for the singleton.
     2. Set a re-entry flag on that object as the FIRST thing you do, and
        return early if it is already set. The flag belongs to the object, not
        to the module, so a caller working on a clone gets a real second run
        and a caller re-importing does not.
     3. Be idempotent in fact, not only by the flag. R225's test applies both
        enrichers twice and requires identical output.
     4. Declare yourself in ENRICHERS below. The build fails on an exported
        `apply*` in src/lib that is not declared with its guard flag.

   Do NOT "fix" either existing flag: they are correct, and the two names
   differ only because they were written months apart.

   The same hazard has a client-side twin, and it has three different answers
   in this codebase already (BS14): units-client.ts resets every module
   variable explicitly, quality-client.ts persists state across View
   Transitions and re-syncs its controls, and rollout-client.ts holds no
   module state at all and keeps selection in the DOM. All three are
   defensible. A new client should pick one of the three deliberately rather
   than invent a fourth. */
import { NHA_QUALITY_DATA } from './quality-data';
import type { QualityData, QualityParameter, RolloutEntry } from './quality-data';
import { DATA_PHASES } from './data-phases';
import { applyPhaseTargets } from './phase-targets';
import { computeTargets, applyEquationTargets } from './equations';

applyPhaseTargets(NHA_QUALITY_DATA, DATA_PHASES);
/* Replace the rule-derived interim values with base-case equation values
   (committed floors, milestones, and data-plan entries stay authoritative). */
applyEquationTargets(NHA_QUALITY_DATA, computeTargets(NHA_QUALITY_DATA, 'SCN-BASE'));

/* Build the search index (quality.js:89-97). */
NHA_QUALITY_DATA.parameters.forEach(function (parameter) {
  parameter._search = [
    parameter.id, parameter.type, parameter.name, parameter.concept,
    parameter.where, parameter.target, parameter.calculation,
    parameter.datasets, parameter.ownerVerifier, parameter.status,
    parameter.unit, parameter.modelRole, parameter.temporal,
    parameter.unitStatus, parameter.family
  ].join(' ').toLowerCase();
});

/* R115 [§S11b]: the catalog's two sources, held to each other.
 *
 * Ten records are not in the controlled framework document. Both the prompt
 * and two handoffs recorded that nothing identified which ten, so the row
 * could not be implemented. Measured: the addendum names all ten and the live
 * catalog gave all ten a `status` string no other record carried, so they
 * were identifiable twice over and nothing read either signal.
 *
 * `provenance` is the signal now, set by the generator from the file that
 * supplies the records. This holds four things a reader of the page depends
 * on, each able to fail on its own: every record declares a provenance, the
 * declared counts match the records, the plan-defined ids are exactly the
 * ones marked, and the page's sentence states the split it describes. The
 * last is the one that matters most - the sentence names two numbers, and a
 * sentence naming numbers nothing recomputes is how this campaign shipped
 * three wrong counts. */
export const CATALOG_PROVENANCES = ['framework', 'plan-defined'];

export function catalogProvenanceDrift(): string[] {
  const out: string[] = [];
  const prov = NHA_QUALITY_DATA.provenance;
  if (!prov) return ['the catalog declares no provenance block'];
  const counted: Record<string, number> = {};
  const planIds: string[] = [];
  NHA_QUALITY_DATA.parameters.forEach(function (p) {
    const v = p.provenance;
    if (!v || CATALOG_PROVENANCES.indexOf(v) < 0) {
      out.push(p.id + ' declares provenance "' + (v || '') + '"');
      return;
    }
    counted[v] = (counted[v] || 0) + 1;
    if (v === 'plan-defined') planIds.push(p.id);
  });
  if ((counted['framework'] || 0) !== prov.framework) {
    out.push('declares ' + prov.framework + ' framework records, counts ' +
      (counted['framework'] || 0));
  }
  if ((counted['plan-defined'] || 0) !== prov.planDefined) {
    out.push('declares ' + prov.planDefined + ' plan-defined records, counts ' +
      (counted['plan-defined'] || 0));
  }
  const declared = (prov.planDefinedIds || []).slice().sort().join(',');
  if (declared !== planIds.slice().sort().join(',')) {
    out.push('the declared plan-defined ids are not the ones marked');
  }
  /* The sentence names both numbers. Read them out of it rather than trusting
     that whoever last edited it also edited the counts. */
  const stated: string[] = prov.note.match(/\b(\d+)\b/g) || [];
  const wants: string[] = [
    String(prov.framework),
    String(prov.framework + prov.planDefined)
  ];
  wants.forEach(function (n) {
    if (stated.indexOf(n) < 0) out.push('the catalog note does not state ' + n);
  });
  if (!/\bTen\b|\bten\b|\b10\b/.test(prov.note)) {
    out.push('the catalog note does not say how many records are plan-defined');
  }
  return out;
}

export const QUALITY_DATA = NHA_QUALITY_DATA;

/* The two walks §S3 wrote nine times between them.
 *
 * `if (p.type === 'CP') continue;` then iterate p.rollout is the shape of
 * nearly every check in this section, and CP records are the reason: they
 * carry no phase targets at all, so a walk that forgets to skip them counts
 * 310 empty rollouts into whatever it is measuring. Naming the walk once puts
 * that rule in one place instead of nine. */
export function kppTpp(Q: QualityData = QUALITY_DATA): QualityParameter[] {
  return Q.parameters.filter(function (p) { return p.type !== 'CP'; });
}

export function forEachRolloutRow(
  Q: QualityData,
  visit: (p: QualityParameter, entry: RolloutEntry) => void
): void {
  for (const p of kppTpp(Q)) {
    for (const entry of (p.rollout || [])) visit(p, entry);
  }
}
