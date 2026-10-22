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

   The same hazard has a client-side twin: a client module outlives every
   page that imports it. It had four answers in this codebase, none written
   down (BS14, BU9). Since §S15 there is one, in src/scripts/README.md: a
   visit starts from nothing, state that outlives a page is declared with its
   reason, and three build checks hold the clients to it. */
import { NHA_QUALITY_DATA } from './quality-data';
import { catalogRecordById } from './registry-lookup';
import type { QualityData, QualityParameter, RolloutEntry } from './quality-data';
import { DATA_PHASES } from './data-phases';
import { applyPhaseTargets } from './phase-targets';
import { NUMBER_WORDS } from './format';
import { computeTargets, applyEquationTargets } from './equations';
import { assertRolloutKinds } from './rollout-kinds';
import { CATALOG_ID_FAMILIES, OTHER_CODE_FAMILIES } from './params';

applyPhaseTargets(NHA_QUALITY_DATA, DATA_PHASES);
/* Replace the rule-derived interim values with base-case equation values
   (committed floors, milestones, and data-plan entries stay authoritative). */
applyEquationTargets(NHA_QUALITY_DATA, computeTargets(NHA_QUALITY_DATA, 'SCN-BASE'));
/* R247 [§S16]: an undeclared kind stops the import here, after both
   enrichers, rather than reaching a page that shows it as a committed floor. */
assertRolloutKinds(NHA_QUALITY_DATA.parameters);

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

/* Review 3 of P24: one lookup of a catalog record by id, throwing when the id
   is not a record, for the pages that cite one (the Data tab wrote its own).
   Review 4 of P24: the lookup itself is catalogRecordById(), which the engine's
   catalogTargetMeta() also reads; equations.ts cannot import this module,
   which imports it. */
export function qualityRecord(id: string, Q: QualityData = QUALITY_DATA): QualityParameter {
  return catalogRecordById(Q.parameters, id);
}

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
  /* Owner, 2026-10-12: this looked for "ten", fitted to the ten records it
     knew, so an eleventh would have left the sentence wrong and this green.
     It reads the count the catalog declares, in words or digits. */
  const word = NUMBER_WORDS[prov.planDefined];
  const says = new RegExp('\\b(?:' + prov.planDefined + (word ? '|' + word : '') + ')\\b', 'i');
  if (!says.test(prov.note)) {
    out.push('the catalog note does not say how many records are plan-defined (' + prov.planDefined + ')');
  }
  return out;
}

export const QUALITY_DATA = NHA_QUALITY_DATA;

/* The owner's 2026-10-10 decision, golden rule 2's one written exception:
   the catalog tabs, Quality and Risk, show the catalog's own ids, because
   they are the working identifiers there (equations, selectors, failure
   modes). Both tabs say once what the ids are; every other page draws
   none (tests/lib/rendered-codes.test.ts). */
/* The exception covers the catalog's ids and nothing else. The catalog's
   records also carry the source document's other codes - stakeholder-need
   SN-xx in "where it matters", open items OI-xxx in a status or definition,
   schedule requirements PR-xxx in a phase justification - which the open-item
   register and the extract checks read, so they stay in the data. This is
   what the Quality tab draws instead: the text with those codes taken out and
   the separators they leave tidied. A string with none comes back unchanged.
   (Review of the owner batch: the first sweep could not reach Quality's
   records, and these were drawn there.) */
const NON_CATALOG_FAMILY = '(?:' + OTHER_CODE_FAMILIES.join('|') + ')';
const CATALOG_FAMILY = '(?:' + CATALOG_ID_FAMILIES.join('|') + ')';
/* a code's body ends on a letter or digit, so a sentence's period stays */
const CODE_BODY = '[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?';
/* never inside another id: CP-PH-001 is a catalog id, not "CP-" and a
   phase code (review of the content run, when PH joined the one list) */
const NON_CATALOG_CODE = new RegExp('(?<![\\w-])' + NON_CATALOG_FAMILY + '-' + CODE_BODY +
  /* "SN-09/SN-16", "TPP-USE1/2": the chain continues, but never into a
     catalog id ("SN-02/KPP-A1" keeps KPP-A1) */
  '(?:\\/(?!' + CATALOG_FAMILY + '-)(?:' + NON_CATALOG_FAMILY + '-)?' + CODE_BODY + ')*' +
  /* a range, "PF-001–PF-200" or "SR-DATA-001–012" */
  '(?:\\s*–\\s*(?:' + NON_CATALOG_FAMILY + '-' + CODE_BODY + '|\\d+))?', 'g');
/* PH-P3 is the source document's name for Phase 3: said in words */
const PHASE_CODE = /\bPH-P(\d)\b/g;
/* an open item keeps its marker in words; "open OI-023" already says it */
const OPEN_ITEM = /\b(open )?OI-\d{3}\b/g;

export function withoutSourceCodes(text: string): string {
  NON_CATALOG_CODE.lastIndex = 0; PHASE_CODE.lastIndex = 0; OPEN_ITEM.lastIndex = 0;
  const found = NON_CATALOG_CODE.test(text) || PHASE_CODE.test(text) || OPEN_ITEM.test(text);
  NON_CATALOG_CODE.lastIndex = 0; PHASE_CODE.lastIndex = 0; OPEN_ITEM.lastIndex = 0;
  if (!found) return text;
  const out = text
    .replace(PHASE_CODE, 'Phase $1')
    .replace(OPEN_ITEM, (_m, open?: string) => (open ? 'open' : 'open item'))
    .replace(NON_CATALOG_CODE, '')
    .replace(/\(\s*[;,:]?\s*\)/g, '')
    .replace(/(^|\s)\/(?=\S)/g, '$1')
    .replace(/\s+([;,:.])/g, '$1')
    .replace(/[;,:](?=[;,:.]|\s*$)/g, '')
    .replace(/^\s*[;,:]\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  /* a string that opened with a code opens with a capital still */
  return /^[a-z]/.test(out) && /^[A-Z]/.test(text) ? out[0].toUpperCase() + out.slice(1) : out;
}

export const CATALOG_ID_NOTE =
  'Each parameter carries its catalog reference id: KPP for a system outcome, ' +
  'TPP for operating performance, CP for a cost quantity. The name beside the ' +
  'id says what it measures.';

/* Review of P22 [§S16]: R302 emptied every TPP's `where`, which had been a
 * copy of its concept, and the client's fallback then said "Not specified"
 * on every TPP. That reads as the plan leaving a gap; what is true is that the
 * catalog records no trace for a technical parameter. One rendering for
 * both places "Where it matters" shows (the table column and the detail
 * field). */
export const NO_TECHNICAL_TRACE = 'Not recorded for technical parameters';

export function whereItMatters(p: QualityParameter): string {
  const text = [p.where, p.family].filter(Boolean).join(' · ');
  if (text) return text;
  return p.type === 'TPP' ? NO_TECHNICAL_TRACE : 'Not specified';
}

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
