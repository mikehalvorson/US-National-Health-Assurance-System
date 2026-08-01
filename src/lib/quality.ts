/* Quality catalog assembler: applies the phase-target derivation to the
   base catalog (once) and builds the per-parameter search index, mirroring
   the qualitydata.js -> phasetargets.js -> quality.js load order.
   Exports the enriched QUALITY_DATA consumed by the Quality tab client. */
import { NHA_QUALITY_DATA } from './quality-data';
import { DATA_PHASES } from './data-phases';
import { applyPhaseTargets } from './phase-targets';

applyPhaseTargets(NHA_QUALITY_DATA, DATA_PHASES);

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
