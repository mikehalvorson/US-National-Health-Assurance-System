/* R226/R251/R293/R234/R133 [§S2]: the phase -> year map, its one conversion
 * to an array index, and the ramps that have to land on it.
 *
 * The defect this closes. `rollout.ts` owns the nine anchor years under a
 * header reading "Fidelity-critical: do not re-derive." Two other modules
 * re-derived them anyway - `equations.ts` as `PHASE_T`, `data-phases.ts` as
 * `phase.year` - and all three agreed character for character, so nothing
 * was visibly wrong. What was wrong is that two consumers read those numbers
 * as 1-based (both use `phase.year` as a CSS grid column, correctly) and one
 * read them as 0-based array indices. Since index 0 is Year 1 is 2027, the
 * equation layer resolved every phase one year further along the build than
 * the phase it was labelled with.
 *
 * The copies are gone: `equations.ts` imports `PHASE_YEAR` and converts in
 * exactly one named function, `phaseIndex`. `data-phases.ts` is generated, so
 * its payload still records the years its generator wrote, but `DATA_PHASES`
 * now takes them from `PHASE_YEAR`, and the two are gated below - a generator
 * whose table drifts fails the build instead of publishing a second anchor
 * year for the same phase on a different chapter.
 *
 * The ramps had the mirror-image defect. `params.ts` declared "Year index
 * 1..16" while every reader indexed from 0, and four of the seven policy
 * ramps were authored against the header rather than against the readers, so
 * they delivered their stated milestone a year after the phase claiming it.
 * Realigning those four is what makes the P8 anchor mature: the two fixes
 * cancel there, and either one alone leaves the model worse than before.
 *
 * These checks read no files, so nothing needs memoising.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { EXPANSION_SPAN, PHASE_YEAR, PHASES, ROLLOUT_HEADLINES } from './rollout';
import { DATA_PHASES, DATA_PHASE_YEARS_AS_GENERATED } from './data-phases';
import { RAMPS, RAMP_MILESTONES, START_YEAR } from './params';
import { CARE_SCENARIOS } from './care';
import { phaseIndex, EQ_PHASES, modelValueAt, rampValueAt } from './equations';

/* ---- 1. one map, and every copy agrees with it (V2, R293) -------------- */
export interface PhaseMapDrift { phase: string; source: string; year: number; expected: number }

export function phaseMapDrift(): PhaseMapDrift[] {
  const out: PhaseMapDrift[] = [];
  for (const p of PHASES) {
    if (PHASE_YEAR[p.id] !== p.year) {
      out.push({ phase: p.id, source: 'rollout.ts PHASES', year: p.year, expected: PHASE_YEAR[p.id] });
    }
  }
  for (const id of Object.keys(DATA_PHASE_YEARS_AS_GENERATED)) {
    const generated = DATA_PHASE_YEARS_AS_GENERATED[id];
    if (PHASE_YEAR[id] === undefined) {
      out.push({ phase: id, source: 'data-phases.ts (no such phase in rollout.ts)', year: generated, expected: NaN });
    } else if (generated !== PHASE_YEAR[id]) {
      out.push({ phase: id, source: 'build_data_phase_targets.py PHASES', year: generated, expected: PHASE_YEAR[id] });
    }
  }
  for (const p of DATA_PHASES) {
    if (PHASE_YEAR[p.id] !== undefined && p.year !== PHASE_YEAR[p.id]) {
      out.push({ phase: p.id, source: 'data-phases.ts DATA_PHASES', year: p.year, expected: PHASE_YEAR[p.id] });
    }
  }
  return out;
}

/* Every phase the equation layer evaluates must exist in the map. A phase
   with no year silently became index NaN before this check existed. */
export function phasesWithoutYear(): string[] {
  return EQ_PHASES.filter((ph) => !Number.isFinite(PHASE_YEAR[ph]));
}

/* ---- 2. the conversion resolves the calendar year it claims (V1, R226) -- */
export interface PhaseYearMismatch { phase: string; label: number; resolved: number }

/* The phase selector on quality.astro and risk.astro prints "P0 (Year 1)".
   `year(t)` is what the equation layer reports for the same phase, and
   START_YEAR + phaseIndex is the calendar year the fiscal engine's row
   carries. All three have to be the same phase. */
export function phaseYearMismatches(): PhaseYearMismatch[] {
  const out: PhaseYearMismatch[] = [];
  for (const ph of EQ_PHASES) {
    const label = PHASE_YEAR[ph];
    const reported = modelValueAt('SCN-BASE', 'year', ph);
    if (reported !== label) out.push({ phase: ph, label, resolved: reported });
  }
  return out;
}

export function calendarYearOf(phase: string): number {
  return START_YEAR + phaseIndex(phase);
}

/* ---- 3. every ramp reaches its declared milestone at that phase (R133) -- */
export interface MilestoneMiss { ramp: string; phase: string; claim: string; needed: number; got: number }

export function rampMilestoneMisses(): MilestoneMiss[] {
  const out: MilestoneMiss[] = [];
  for (const m of RAMP_MILESTONES) {
    const arr = (RAMPS as unknown as Record<string, number[]>)[m.ramp];
    const i = phaseIndex(m.phase);
    const got = arr[Math.min(i, arr.length - 1)];
    /* tolerance: these are two-decimal shares typed by hand */
    if (!(got >= m.atLeast - 1e-9)) {
      out.push({ ramp: m.ramp, phase: m.phase, claim: m.claim, needed: m.atLeast, got });
    }
  }
  return out;
}

/* The ramp the care page's premium card depends on. AY1: the card's own note
   says the coverage wave migrates over Years 4-8, so its `fromYear` has to be
   the calendar year of the coverage ramp's first migrating index, not one
   after it. Pinned here because the two live in different files. */
export function premiumCardYearDrift(): { fromYear: number; rampYear: number } | null {
  const card = CARE_SCENARIOS.find((s) => s.id === 'premium');
  if (!card) return { fromYear: NaN, rampYear: NaN };
  const first = RAMPS.coverage.findIndex((v) => v > 0);
  const rampYear = START_YEAR + first;
  return card.nha.fromYear === rampYear ? null : { fromYear: card.nha.fromYear, rampYear };
}

/* ---- 4. trainProg's denominator spans the rollout horizon (R234) -------- */
/* Its bounds used to be the literals 1 and 12, which omitted the first year
   of the infrastructure build and included a thirteenth. Both are derived
   now, and the observable consequence is that progress is exactly 1 at the
   P8 anchor - not 0.999, and not 1 by accident of an off-by-one. */
export function trainProgAtMaturity(): number {
  return modelValueAt('SCN-BASE', 'trainProg', 'P8');
}

/* ---- 5. published milestones equal what the ramp delivers (R255) -------- */
export interface HeadlineMiss { label: string; phase: string; needed: number; got: number; why: string }

export function rolloutHeadlineMisses(): HeadlineMiss[] {
  const out: HeadlineMiss[] = [];
  for (const h of ROLLOUT_HEADLINES) {
    if (h.ramp === null) continue;
    const arr = (RAMPS as unknown as Record<string, number[]>)[h.ramp];
    const at = (ph: string) => arr[Math.min(phaseIndex(ph), arr.length - 1)];
    const got = at(h.startPhase);
    if (!(got >= h.atLeast - 1e-9)) {
      out.push({
        label: h.label, phase: h.startPhase, needed: h.atLeast, got,
        why: 'the tile publishes ' + h.value + ' and the ' + h.ramp + ' ramp is not there yet'
      });
    }
    /* a span promises completion at its end */
    if (h.endPhase !== null) {
      const end = at(h.endPhase);
      const mature = arr[arr.length - 1];
      if (!(end >= mature - 1e-9)) {
        out.push({
          label: h.label, phase: h.endPhase, needed: mature, got: end,
          why: 'the tile publishes ' + h.value + ' and the ' + h.ramp + ' ramp is not complete at the end of it'
        });
      }
    }
  }
  return out;
}

/* One milestone, one span, across every chapter that describes it. The
   rollout page said "Year 10" while the overview and health chapters said
   "Years 10-12"; the rollout page now derives its text, and these two still
   type theirs, so they are checked rather than trusted. */
const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const EXPANSION_PAGES = ['src/pages/index.astro', 'src/pages/health.astro'];
const spanCache = new Map<string, string[]>();

export function expansionSpanDisagreements(root = REPO_ROOT): string[] {
  const hit = spanCache.get(root);
  if (hit) return hit;
  const out: string[] = [];
  for (const page of EXPANSION_PAGES) {
    const text = readFileSync(join(root, page), 'utf8');
    if (!text.includes(EXPANSION_SPAN)) {
      out.push(page + ' does not state the expansion as "' + EXPANSION_SPAN + '"');
    }
  }
  spanCache.set(root, out);
  return out;
}

/* ---- 6. no module re-derives the map (R251) ---------------------------- */
/* A guard against the copies coming back. `rampValueAt` is exported for the
   visualizer's input legend and resolves through `phaseIndex` like everything
   else; if a second map appeared and a caller used it, this would disagree. */
export function rampLegendDisagreements(): string[] {
  const out: string[] = [];
  for (const ph of EQ_PHASES) {
    const direct = RAMPS.coverage[Math.min(phaseIndex(ph), RAMPS.coverage.length - 1)];
    const viaLegend = rampValueAt('SCN-BASE', 'cov', ph);
    if (Math.abs(direct - viaLegend) > 1e-9) {
      out.push(ph + ': array ' + direct + ' vs legend ' + viaLegend);
    }
  }
  return out;
}
