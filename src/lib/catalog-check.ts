/* §S16: build checks over the quality catalog itself, quality-data.ts.
 *
 * R303 [§S16]: the audit never read quality-data.ts whole. Every remote fetch
 * truncated it mid-string, so it could not say whether the catalog's declared
 * counts match its records, or whether every id another module names is a
 * record. P0 read the file locally and both held, and P22 measured them again
 * (the figures are in the log, and in the row note this check computes).
 * Holding today is not a check, and nothing in the build asked either
 * question. The vitest suite pinned the four declared counts as literals and
 * compared the total with the record list, which says what the counts are
 * and not that the records are.
 *
 * Kept out of quality-data.ts, which the extractor regenerates whole. The
 * checks in this module read data, not files: the two that read the repo's
 * text (every catalog id a module names, and the additions register) live in
 * code-check.ts and research-check.ts, among the modules NODE_FS_MODULES
 * declares. */
import type { QualityData } from './quality-data';
import { QUALITY_DATA } from './quality';
import { DATA_PHASES, DATA_PHASE_GAPS } from './data-phases';
import { AUDIT_CODE_IN_RENDERED_TEXT } from './repo-text';

/* The catalog's declared counts against its records: by type, in total, and
   with every id distinct, because a duplicated record would satisfy the total
   while one id meant two things. */
export function catalogCountDrift(Q: QualityData = QUALITY_DATA): string[] {
  const out: string[] = [];
  const byType: Record<string, number> = {};
  Q.parameters.forEach(function (p) { byType[p.type] = (byType[p.type] || 0) + 1; });
  (['KPP', 'TPP', 'CP'] as const).forEach(function (t) {
    if ((byType[t] || 0) !== Q.counts[t]) {
      out.push('declares ' + Q.counts[t] + ' ' + t + ', carries ' + (byType[t] || 0));
    }
  });
  Object.keys(byType).forEach(function (t) {
    if (t !== 'KPP' && t !== 'TPP' && t !== 'CP') {
      out.push(byType[t] + ' records of undeclared type ' + t);
    }
  });
  if (Q.parameters.length !== Q.counts.total) {
    out.push('declares ' + Q.counts.total + ' in total, carries ' + Q.parameters.length);
  }
  const seen = new Set<string>();
  Q.parameters.forEach(function (p) {
    if (seen.has(p.id)) out.push('id ' + p.id + ' names two records');
    seen.add(p.id);
  });
  return out;
}


/* R119 [§S16]: kpp_concept() in the extractor ended `return CONCEPTS[10]`, so
 * a KPP domain matching none of its prefixes was filed under "Governance,
 * transition & continuity" without a word. It raises now. This is the half
 * the build can hold without running Python: in the catalog it produced, a
 * framework KPP sits under that concept only when its domain begins with
 * "transition", the one prefix that legitimately leads there. A record filed
 * there any other way is the fallthrough, or a hand edit that looks like one.
 * Review of P22: this skipped the plan-defined KPPs, whose concept the
 * extractor did not check; it checks it now (load_addendum), so this reads
 * every KPP, and conceptVocabularyFaults() below holds every record. */
export const GOVERNANCE_CONCEPT = 'Governance, transition & continuity';

export function kppConceptFallthrough(Q: QualityData = QUALITY_DATA): string[] {
  /* A renamed concept would make the filter below match nothing and pass on
     silence, so the name is checked against the catalog's own list first. */
  if (Q.concepts.indexOf(GOVERNANCE_CONCEPT) < 0) {
    return ['the catalog declares no concept named "' + GOVERNANCE_CONCEPT + '"'];
  }
  return Q.parameters
    .filter(function (p) {
      return p.type === 'KPP' &&
        p.concept === GOVERNANCE_CONCEPT && !/^transition/i.test(p.where);
    })
    .map(function (p) { return p.id + ' (' + p.where + ')'; });
}

/* Review of P22: the concept is a controlled field, and "one enum per
 * controlled field" held for the extracted records only, not the addendum's.
 * Every record's concept must be one the catalog declares, and every declared
 * concept must group at least one record, so neither list can drift from the
 * other. */
export function conceptVocabularyFaults(Q: QualityData = QUALITY_DATA): string[] {
  const out: string[] = [];
  const declared = new Set(Q.concepts);
  const used = new Set<string>();
  Q.parameters.forEach(function (p) {
    used.add(p.concept);
    if (!declared.has(p.concept)) out.push(p.id + ' is filed under an undeclared concept "' + p.concept + '"');
  });
  Q.concepts.filter(function (c) { return !used.has(c); })
    .forEach(function (c) { out.push('the concept "' + c + '" groups no record'); });
  return out;
}

/* R302 [§S16]: `concept` drives the Quality tab's grouping and `where` its
 * "Where it matters" column, so the two must not be one value shown twice.
 * Measured: they were equal on 85 records, every one a TPP, because the
 * extractor copied the concept into `where` for lack of a trace column in the
 * TPP dictionary. TPPs now carry no `where`. This holds both halves: no record
 * repeats its concept as its trace, and every KPP and CP has a trace, so
 * emptying the field is not how a later edit gets past the first half. */
export function conceptWhereDrift(Q: QualityData = QUALITY_DATA): string[] {
  const out: string[] = [];
  Q.parameters.forEach(function (p) {
    if (p.where && p.where === p.concept) out.push(p.id + ' repeats its concept as its trace');
    if (!p.where && p.type !== 'TPP') out.push(p.id + ' (' + p.type + ') has no trace');
    if (p.where && p.type === 'TPP') out.push(p.id + ' (TPP) carries a trace the TPP dictionary does not');
  });
  return out;
}

/* P22 [§S16] new finding: the Data tab printed an audit code. The P8
 * scorecard section added by R105 opened its "why" with "R105: derivation rule
 * 3 ...", and data-render.ts writes that field into the page. P20 made "an
 * audit code must not reach the browser" a build rule, but its check reads the
 * HTML comments of .astro templates, and this text is written by a client
 * script from a generated payload, which no build output contains (the blind
 * spot trap 46 names). Two coverage-gap reasons carried the same prefix into
 * the published methodology.
 *
 * This reads what the generated catalogs hand the two tabs to render: every
 * text field of every Data-tab phase, group and metric, every coverage-gap
 * reason, and every Quality rollout row's value and interpretation, the last
 * written at import by phase-targets.ts and equations.ts. It applies the
 * repo's one list of audit-code shapes, AUDIT_CODE_IN_RENDERED_TEXT. It does
 * not read the catalog's own record fields (status, calculation, where),
 * which carry the source dictionary's codes verbatim; whether those may be
 * shown is the owner's open question about golden rule 2, not this check's. */
export function generatedPayloadAuditCodes(Q: QualityData = QUALITY_DATA): { read: number; hits: string[] } {
  const hits: string[] = [];
  let read = 0;
  function sweep(where: string, text: string | undefined): void {
    if (!text) return;
    read++;
    for (const [pattern, what] of AUDIT_CODE_IN_RENDERED_TEXT) {
      const m = pattern.exec(text);
      if (m) { hits.push(where + ' renders ' + what + ' ("' + m[0] + '")'); return; }
    }
  }
  for (const phase of DATA_PHASES) {
    sweep('Data ' + phase.id + ' title', phase.title);
    sweep('Data ' + phase.id + ' summary', phase.summary);
    phase.work.forEach(function (w, i) { sweep('Data ' + phase.id + ' work ' + (i + 1), w); });
    for (const group of phase.groups) {
      sweep('Data ' + phase.id + ' section', group.section);
      sweep('Data ' + phase.id + ' ' + group.section + ' why', group.why);
      for (const m of group.metrics) {
        sweep('Data ' + phase.id + ' ' + m.id + ' name', m.name);
        sweep('Data ' + phase.id + ' ' + m.id + ' target', m.phaseTarget);
        sweep('Data ' + phase.id + ' ' + m.id + ' justification', m.justification);
        sweep('Data ' + phase.id + ' ' + m.id + ' scope change', m.scopeChange);
      }
    }
  }
  DATA_PHASE_GAPS.forEach(function (g) { sweep('Data gap ' + g.id, g.reason); });
  Q.parameters.forEach(function (p) {
    (p.rollout || []).forEach(function (e) {
      sweep('Quality ' + p.id + '@' + e.phase + ' value', e.value);
      sweep('Quality ' + p.id + '@' + e.phase + ' interpretation', e.interpretation);
      /* both rendered since P22: the floor table's last column, and the
         phase strip's population note */
      sweep('Quality ' + p.id + '@' + e.phase + ' controls', e.controls);
      sweep('Quality ' + p.id + '@' + e.phase + ' scope change', e.scopeChange);
    });
  });
  return { read: read, hits: hits };
}

