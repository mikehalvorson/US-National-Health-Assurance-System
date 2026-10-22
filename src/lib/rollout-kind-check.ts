/* R228 [§S3]: the checks on the rollout `kind` vocabulary.
 *
 * A KPP/TPP rollout row's `kind` decides what happens to it. Three modules
 * write the field and a fourth reads it to decide precedence:
 *
 *   extract_quality_catalog.py  writes the framework's own rows
 *   phase-targets.ts            adds derived, data-plan and prose-floor rows
 *   equations.ts                replaces rows whose kind is EXACTLY
 *                               'derived interim target', anchors on the
 *                               authoritative ones, and leaves the rest alone
 *
 * R247 [§S16] moved the vocabulary itself to rollout-kinds.ts, where it is the
 * one declaration and `RolloutKind` is its type. What stays here is what the
 * type cannot see: kinds on rows built through a cast, kinds the table
 * declares that nothing produces any more, the derivation the page states,
 * and whether the engine still does with each kind what the table says. */
import { committedAnchors, computeTargets, applyEquationTargets, EQUATIONS } from './equations';
import { declaredVsLive } from './declared-sets';
import { forEachRolloutRow, QUALITY_DATA } from './quality';
import type { QualityData, QualityParameter } from './quality-data';
import {
  committedFloorControls, committedFloorRows, kindsWhere, ROLLOUT_KINDS, ROLLOUT_KIND_NAMES
} from './rollout-kinds';
import type { RolloutKind } from './rollout-kinds';
import { parseNum } from './phase-targets';
import { phasesNamedIn } from './rollout';

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
  const shouldBeLive = ROLLOUT_KIND_NAMES
    .filter((k) => ROLLOUT_KINDS[k].disposition !== 'replaced');
  return declaredVsLive(shouldBeLive, catalogKinds(Q)).stale;
}

/* R247 [§S16]: this used to compare the table's 'authoritative' set with
 * equations.ts's AUTHORITATIVE_KINDS, two copies of one claim. AUTHORITATIVE_KINDS
 * is derived from the table now, so that comparison could no longer fail, and
 * what the collapse relies on is a different property: that the engine still
 * does with each kind what the table's disposition column says.
 *
 * So this drives the engine. It takes one real parameter whose equation parses
 * its own target, gives it one row of every declared kind at its own phase,
 * all carrying the maturity target's value, and asks two questions of the real
 * code: which rows does committedAnchors() clamp to (it must be exactly the
 * authoritative ones), and which does applyEquationTargets() rewrite (it must
 * be exactly the replaced one, rewritten to the equation-output kind). */
export function engineKindDispositionDrift(): string[] {
  const phases = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
  const targets = computeTargets(QUALITY_DATA, 'SCN-BASE');
  /* A host the engine can actually rewrite at every probe phase: a replaced
     row is left alone where the equation has no finite value, which would
     read as the engine ignoring the table. */
  const host = QUALITY_DATA.parameters.find(function (p) {
    const d = EQUATIONS[p.id];
    const t = targets[p.id];
    return p.type !== 'CP' && !!d && !d.template && !!parseNum(p.target) && !!t &&
      phases.every(function (ph) { return !!t[ph] && isFinite(t[ph].num); });
  });
  if (!host) return ['no parameter with a parsing target and a finite equation to drive the engine with'];
  const output = kindsWhere(function (d) { return d.disposition === 'equation-output'; });
  if (ROLLOUT_KIND_NAMES.length > phases.length) return ['more kinds than probe phases'];
  const probe: QualityParameter = JSON.parse(JSON.stringify(host));
  const kindAt: Record<string, RolloutKind> = {};
  probe.rollout = ROLLOUT_KIND_NAMES.map(function (k, i) {
    kindAt[phases[i]] = k;
    return { phase: phases[i], value: host.target, kind: k, gate: '' };
  });
  const out: string[] = [];

  const anchored = Object.keys(committedAnchors(EQUATIONS[host.id], probe));
  ROLLOUT_KIND_NAMES.forEach(function (k, i) {
    const shouldAnchor = ROLLOUT_KINDS[k].disposition === 'authoritative';
    const does = anchored.indexOf(phases[i]) >= 0;
    if (shouldAnchor !== does) {
      out.push(k + (shouldAnchor ? ' is declared authoritative and the engine does not clamp to it'
        : ' is not authoritative and the engine clamps to it'));
    }
  });

  const Q = { ...QUALITY_DATA, parameters: [probe] } as QualityData;
  delete (Q as { __equationApplied?: boolean }).__equationApplied;
  applyEquationTargets(Q, targets);
  probe.rollout.forEach(function (e) {
    const was = kindAt[e.phase];
    const disposition = ROLLOUT_KINDS[was].disposition;
    const rewritten = e.kind !== was;
    if (disposition === 'replaced' && output.indexOf(e.kind) < 0) {
      out.push(was + ' is declared replaced and the engine left it as ' + e.kind);
    }
    if (disposition !== 'replaced' && rewritten) {
      out.push(was + ' is declared ' + disposition + ' and the engine rewrote it to ' + e.kind);
    }
  });
  return out.sort();
}

/* P22 [§S16] new finding, moved here from an inline self-test in the review:
 * every committed floor says what it controls, from its own data, and an
 * ungated row's label names no phase but its own. A gate's decision is the
 * catalog's text, and G1's names the P3-to-P4 transition on purpose, so a
 * gated row is held only to resolving. */
export function committedFloorControlFaults(Q: QualityData = QUALITY_DATA): { rows: number; faults: string[] } {
  const rows = committedFloorRows(Q.parameters);
  const faults: string[] = [];
  for (const r of rows) {
    const where = r.parameter.id + '@' + r.entry.phase;
    try {
      const text = committedFloorControls(r.entry, Q.gates, Q.phases);
      const other = r.entry.gate ? [] : phasesNamedIn(text).filter((p) => p !== r.entry.phase);
      if (other.length) faults.push(where + ' says ' + other.join(', '));
    } catch (e) {
      faults.push(where + ': ' + (e as Error).message);
    }
  }
  return { rows: rows.length, faults: faults };
}
