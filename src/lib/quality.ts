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

export const QUALITY_DATA = NHA_QUALITY_DATA;
