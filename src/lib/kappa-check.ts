/* R227 [§S3]: KAPPA's registry entry, its source, and its published band.
 *
 * KAPPA = 8 is fitted to one observation and shapes the interior of most of
 * the 130 metric trajectories. The audit's finding is exposure, not error: the
 * arithmetic verifies (V7) and the observation is a real controlled gate
 * floor, GATES[G5]. What was missing is that a reader had no way to know
 * either fact, and no way to see how much the published interim numbers depend
 * on it.
 *
 * This module supplies three things the row asks for:
 *
 *   1. The source, checked rather than cited. calibrationDrift() re-derives
 *      KAPPA from G5's floor text and the mature target, and fails if the
 *      gate's own wording no longer supports the constant. A citation that
 *      cannot go stale is worth more than a comment.
 *   2. The sensitivity band, computed by re-running the whole catalog at each
 *      value in KAPPA_BAND.
 *   3. The rendered table rows, so research/quality-equation-methodology.md
 *      publishes the band and cannot drift from it - the same arrangement
 *      methodology-check.ts uses for the data-plan document.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  computeTargets, EQ_PHASES, EQUATIONS, KAPPA_BAND, KAPPA_BUILD_AT_P5, KAPPA_CONFIDENCE,
  KAPPA_MATURE_PCT, KAPPA_SOURCE_FLOOR_PCT, KAPPA_SOURCE_GATE, KAPPA_VALUE,
  documentedGapIds, evaluateAtPhase, MATURITY_TOLERANCE, withKappa
} from './equations';
import { QUALITY_DATA } from './quality';
import { GATES } from './rollout';
import { SCENARIOS } from './scenarios';
import { parseNum } from './phase-targets';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const METHODOLOGY = 'research/quality-equation-methodology.md';

/* ---- 1. the source, re-derived ---------------------------------------- */

/* The calibration in one line: an interior floor F times above the mature
   shortfall, at a build fraction b, implies KAPPA = (F - 1) / (1 - b). */
export function kappaFromObservation(
  floorPct = KAPPA_SOURCE_FLOOR_PCT,
  maturePct = KAPPA_MATURE_PCT,
  buildFraction = KAPPA_BUILD_AT_P5
): number {
  const matureShortfall = 100 - maturePct;
  const interiorShortfall = 100 - floorPct;
  const stress = interiorShortfall / matureShortfall;
  return (stress - 1) / (1 - buildFraction);
}

export interface CalibrationDrift { what: string; expected: string; found: string }

/* Does the gate the constant was fitted to still say what the fit assumed? */
export function calibrationDrift(): CalibrationDrift[] {
  const out: CalibrationDrift[] = [];
  const gate = GATES.filter((g) => g.n === KAPPA_SOURCE_GATE)[0];
  if (!gate) {
    out.push({ what: 'source gate', expected: KAPPA_SOURCE_GATE, found: 'not in GATES' });
    return out;
  }
  const pct = /(\d+(?:\.\d+)?)\s*%/.exec(gate.floor.replace(/[≥>=<≤]/g, ''));
  if (!pct) {
    out.push({ what: KAPPA_SOURCE_GATE + ' floor', expected: KAPPA_SOURCE_FLOOR_PCT + '%', found: gate.floor });
  } else if (Number(pct[1]) !== KAPPA_SOURCE_FLOOR_PCT) {
    out.push({
      what: KAPPA_SOURCE_GATE + ' floor percentage',
      expected: String(KAPPA_SOURCE_FLOOR_PCT), found: pct[1]
    });
  }
  const derived = kappaFromObservation();
  if (Math.abs(derived - KAPPA_VALUE) > 1e-9) {
    out.push({ what: 'KAPPA from the observation', expected: String(KAPPA_VALUE), found: String(derived) });
  }
  return out;
}

/* ---- 2. the band ------------------------------------------------------- */

export interface KappaRow {
  kappa: number;
  /* Interior phases only: maturity closes at the same value under every
     setting, which is exactly why the constant was invisible to the one test
     that looked. */
  medianAbsShiftPct: number;
  p90AbsShiftPct: number;
  metricsMoved: number;
  /* The single widest interim target, in the metric's own language, so the
     band reads as something a reviewer can check rather than a percentage.
     Chosen by absolute movement rather than relative, because the relative
     measure explodes on early phases where the base value is near zero. */
  widest: string;
}

const bandCache = new Map<string, KappaRow[]>();

export function kappaBand(scenarioId = 'SCN-BASE'): KappaRow[] {
  const hit = bandCache.get(scenarioId);
  if (hit) return hit;

  const startById: Record<string, string> = {};
  for (const p of QUALITY_DATA.parameters) {
    if (p.type === 'CP') continue;
    startById[p.id] = p._phaseStart || 'P0';
  }
  const interior = (id: string) => {
    const from = EQ_PHASES.indexOf(startById[id] || 'P0');
    return EQ_PHASES.filter((_, i) => i >= from && i < EQ_PHASES.length - 1);
  };

  const base = computeTargets(QUALITY_DATA, scenarioId);
  const rows: KappaRow[] = KAPPA_BAND.map((k) => {
    const at = withKappa(k, () => computeTargets(QUALITY_DATA, scenarioId));
    const shifts: number[] = [];
    let widest = { gap: -1, text: 'none' };
    let moved = 0;
    for (const id of Object.keys(base)) {
      if (!EQUATIONS[id]) continue;
      let metricMoved = false;
      for (const ph of interior(id)) {
        const b = base[id]?.[ph]?.num, v = at[id]?.[ph]?.num;
        if (!Number.isFinite(b) || !Number.isFinite(v)) continue;
        if (b !== 0) {
          const pct = Math.abs((v - b) / b) * 100;
          shifts.push(pct);
          if (pct > 0.05) metricMoved = true;
        } else if (v !== 0) metricMoved = true;
        /* Scale the gap by the metric's own maturity level so a percentage
           metric and a count metric are comparable. */
        const scale = Math.abs(base[id]?.P8?.num || 1) || 1;
        const gap = Math.abs(v - b) / scale;
        if (gap > widest.gap) {
          widest = {
            gap: gap,
            text: id + '@' + ph + ': ' + base[id][ph].text + ' to ' + at[id][ph].text
          };
        }
      }
      if (metricMoved) moved += 1;
    }
    shifts.sort((a, b) => a - b);
    const at90 = (xs: number[]) => xs.length ? xs[Math.min(xs.length - 1, Math.floor(xs.length * 0.9))] : 0;
    const median = shifts.length ? shifts[Math.floor(shifts.length / 2)] : 0;
    return {
      kappa: k,
      medianAbsShiftPct: Number(median.toFixed(1)),
      p90AbsShiftPct: Number(at90(shifts).toFixed(1)),
      metricsMoved: moved,
      widest: widest.text
    };
  });
  bandCache.set(scenarioId, rows);
  return rows;
}

/* ---- 3. the published table -------------------------------------------- */

export function renderedKappaRows(): string[] {
  return kappaBand().map((r) => '| ' + [
    r.kappa === KAPPA_VALUE ? '**' + r.kappa + '** (fitted)' : String(r.kappa),
    String(r.metricsMoved),
    r.medianAbsShiftPct.toFixed(1) + '%',
    r.p90AbsShiftPct.toFixed(1) + '%',
    '`' + r.widest.split(':')[0] + '`, ' + r.widest.split(': ').slice(1).join(': ')
  ].join(' | ') + ' |');
}

let methodologyText: string | null = null;
function methodology(): string {
  if (methodologyText === null) {
    methodologyText = readFileSync(join(REPO_ROOT, METHODOLOGY), 'utf8');
  }
  return methodologyText;
}

/* A rendered row the document does not carry. */
export function kappaTableDrift(): string[] {
  const text = methodology();
  return renderedKappaRows().filter((row) => !text.includes(row));
}

/* R231 [§S3]: the tolerance the document states and the tolerance the check
   applies are the same claim written twice, and the pair that just cost this
   section a finding was a header saying "exactly" against an assertion
   permitting 12%. Compared here rather than trusted. */
export function maturityToleranceDrift(): string[] {
  const stated = /`MATURITY_TOLERANCE`, currently (\d+(?:\.\d+)?)%/.exec(methodology());
  if (!stated) return ['the methodology does not state the maturity tolerance'];
  const pct = Number(stated[1]);
  if (Math.abs(pct - MATURITY_TOLERANCE * 100) > 1e-9) {
    return ['the methodology states ' + pct + '%, the check applies ' +
      (MATURITY_TOLERANCE * 100) + '%'];
  }
  return [];
}

/* R235 [§S3]: each exempt record points at a methodology section, and that
   section must actually name it. Checked in both directions, so a gap written
   up but not stamped, or stamped but not written up, fails. */
export function documentedGapDrift(): string[] {
  const text = methodology();
  const out: string[] = [];
  const heading = 'Documented gaps the model refuses to hide';
  const start = text.indexOf('## ' + heading);
  if (start < 0) return ['the methodology has no "' + heading + '" section'];
  const rest = text.slice(start + heading.length);
  const nextHeading = rest.indexOf('\n## ');
  const section = nextHeading < 0 ? rest : rest.slice(0, nextHeading);

  const stamped = documentedGapIds(QUALITY_DATA);
  for (const id of stamped) {
    if (!section.includes(id)) out.push('stamped but not written up: ' + id);
  }
  /* Every KPP/TPP id the section names must be stamped. Matching on the id
     pattern rather than on a list, so a gap added to the prose alone is
     caught. */
  for (const m of section.matchAll(/\*\*((?:KPP|TPP)-[A-Z0-9.]+)\*\*/g)) {
    if (stamped.indexOf(m[1]) < 0) out.push('written up but not stamped: ' + m[1]);
  }
  /* And the pointer on the record has to lead here. */
  for (const p of QUALITY_DATA.parameters) {
    if (!p.documentedGap) continue;
    if (!p.documentedGapSection || !p.documentedGapSection.startsWith(METHODOLOGY)) {
      out.push(p.id + ' points at ' + (p.documentedGapSection || 'nothing'));
    }
  }
  return [...new Set(out)].sort();
}

/* R125 [§S11b]: the figures a documented gap states, checked against the
 * model that produces them.
 *
 * `documentedGapDrift` above reconciles the SET of stamped ids against the set
 * written up, in both directions. It reads no number out of either. So
 * KPP-C8's disclosure - the audit calls this block the most honest thing in
 * the codebase - published "the base case computes 4.6% ... twelve of the
 * twenty scenarios breach it, the worst at 15.6%" while the model computed
 * 5.6%, seventeen and 16.7%. Three of those four figures were already stale
 * before R125 touched anything: the neighbouring test had been pinning eleven
 * since R140, and nothing compared the two.
 *
 * A set check and a figure check are different checks. This is the second.
 *
 * Each row lifts a number out of the published prose and recomputes it. A row
 * whose pattern finds nothing FAILS, so deleting the figure to quiet the check
 * is not a way out; the figure has to be there and it has to be right.
 */
export interface GapFigure {
  id: string;
  what: string;
  /* one capture group, the number as the prose states it */
  pattern: RegExp;
  compute: () => number;
  /* the prose rounds, so state how far it may round */
  tolerance: number;
}

function breachCount(id: string): number {
  const p = QUALITY_DATA.parameters.filter(function (x) { return x.id === id; })[0];
  const meta = p && parseNum(p.target);
  if (!meta || !meta.cmp) return NaN;
  return SCENARIOS.filter(function (sc) {
    const v = evaluateAtPhase(id, sc.id, 'P8');
    if (!isFinite(v)) return true;
    return meta.cmp === '<='
      ? !(v <= meta.num * (1 + MATURITY_TOLERANCE))
      : !(v >= meta.num * (1 - MATURITY_TOLERANCE));
  }).length;
}

function worstScenarioValue(id: string): number {
  const vals = SCENARIOS.map(function (sc) { return evaluateAtPhase(id, sc.id, 'P8'); })
    .filter(function (v) { return isFinite(v); });
  return vals.length ? Math.max.apply(null, vals) : NaN;
}

export const GAP_FIGURES: GapFigure[] = [
  {
    id: 'KPP-C1', what: 'base-case maturity value',
    pattern: /computes about ([0-9.]+)% at maturity/,
    compute: function () { return evaluateAtPhase('KPP-C1', 'SCN-BASE', 'P8'); },
    tolerance: 0.5
  },
  {
    id: 'KPP-C7', what: 'base-case maturity value',
    pattern: /the researched mature collection rate is ([0-9.]+)%/,
    compute: function () { return evaluateAtPhase('KPP-C7', 'SCN-BASE', 'P8'); },
    tolerance: 0.5
  },
  {
    id: 'KPP-C8', what: 'base-case maturity value',
    pattern: /the base case computes ([0-9.]+)% of program cost/,
    compute: function () { return evaluateAtPhase('KPP-C8', 'SCN-BASE', 'P8'); },
    tolerance: 0.05
  },
  {
    id: 'KPP-C8', what: 'breaching scenario count',
    pattern: /and ([0-9]+) of the [0-9]+ scenarios breach it/,
    compute: function () { return breachCount('KPP-C8'); },
    tolerance: 0
  },
  {
    id: 'KPP-C8', what: 'scenario count',
    pattern: /and [0-9]+ of the ([0-9]+) scenarios breach it/,
    compute: function () { return SCENARIOS.length; },
    tolerance: 0
  },
  {
    id: 'KPP-C8', what: 'worst scenario value',
    pattern: /the worst at ([0-9.]+)%/,
    compute: function () { return worstScenarioValue('KPP-C8'); },
    tolerance: 0.05
  }
];

export function documentedGapFigureDrift(): string[] {
  const out: string[] = [];
  const byId: Record<string, string> = {};
  QUALITY_DATA.parameters.forEach(function (p) {
    if (p.documentedGap) byId[p.id] = p.documentedGap;
  });
  GAP_FIGURES.forEach(function (f) {
    const prose = byId[f.id];
    if (!prose) { out.push(f.id + ' has no documented gap to read ' + f.what + ' from'); return; }
    const m = f.pattern.exec(prose);
    if (!m) {
      out.push(f.id + ' no longer states its ' + f.what + ' in the disclosure');
      return;
    }
    const stated = Number(m[1]);
    const actual = f.compute();
    if (!isFinite(actual)) { out.push(f.id + ': ' + f.what + ' could not be computed'); return; }
    if (Math.abs(stated - actual) > f.tolerance) {
      out.push(f.id + ' states ' + f.what + ' ' + stated + ', the model computes ' +
        (f.tolerance === 0 ? String(actual) : actual.toFixed(2)));
    }
  });
  return out;
}

/* The registry entry itself. Read off the ONE table row that names the
   constant, rather than searched for anywhere in the document: "low" appears
   in four other rows of the same table, so a document-wide search for the
   grade would pass whether or not kappa carried one. */
export function kappaRegistryGaps(): string[] {
  const out: string[] = [];
  const rows = methodology().split('\n')
    .filter((l) => l.trim().startsWith('|'))
    .filter((l) => new RegExp('kappa\\s*=\\s*' + KAPPA_VALUE + '\\b', 'i').test(l));
  if (rows.length !== 1) {
    out.push(rows.length + ' registry rows name kappa = ' + KAPPA_VALUE + ', expected 1');
    return out;
  }
  const cells = rows[0].split('|').map((c) => c.trim()).filter(Boolean);
  if (!rows[0].includes('GATES[' + KAPPA_SOURCE_GATE + ']')) {
    out.push('the kappa registry row does not cite GATES[' + KAPPA_SOURCE_GATE + ']');
  }
  if (cells[cells.length - 1] !== KAPPA_CONFIDENCE) {
    out.push('the kappa registry row grades it "' + cells[cells.length - 1] +
      '", the code declares "' + KAPPA_CONFIDENCE + '"');
  }
  return out;
}
