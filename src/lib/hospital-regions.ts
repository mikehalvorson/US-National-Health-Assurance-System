/* The thirteen-region hospital administration model, as a pure module.
 *
 * §S9c. Everything here is imported by BOTH src/scripts/units-client.ts (in a
 * browser) and the build (src/pages/units.astro, src/lib/manifest-check.ts),
 * which is the same split src/lib/units.ts keeps for the county network:
 * **no node:fs, no DOM.** The file read lives in src/lib/region-data.ts.
 *
 * Why any of this is a module rather than three loops inside the client:
 * every claim the region map makes to a reader was previously enforced by
 * nothing. The SVG description told screen readers that every state is
 * assigned exactly once while the render loop silently skipped anything it
 * could not resolve; thirteen regions were coloured by array index out of
 * eight variables with no notion of which regions touch; and the page
 * presented a 3.2% margin as a selection. Each of those is a function here,
 * so the build can run it and fail.
 */

export interface Region {
  id: string;
  name: string;
  states: string[];
  population: number;
  rural_share: number;
  centroid: number[];
  mean_state_centroid_miles?: number;
}

/* The four objective components, per candidate count. The model tool emits
   them; before §S9c the published file carried only the weighted `total`,
   which is why no one could re-weight it. */
export interface RegionScore {
  regions: number;
  total: number;
  population_balance: number;
  compactness: number;
  rural_balance: number;
  fragmentation: number;
}

export interface ObjectiveWeights {
  population_scale: number;
  geographic_compactness: number;
  rural_workload: number;
  administrative_fragmentation: number;
}

export interface RegionsData {
  model: {
    version: string;
    run_date: string;
    selected_region_count: number;
    tested_region_counts: RegionScore[];
    candidate_method: string;
    weights: ObjectiveWeights;
    hard_constraints: string[];
    source: string;
    state_adjacency: Record<string, string[]>;
    state_names: Record<string, string>;
  };
  regions: Region[];
}

/* Which component each weight multiplies. Declared once so the sweep, the
   self-test and the page cannot pair them up differently. */
export const WEIGHT_COMPONENTS: ReadonlyArray<
  readonly [keyof ObjectiveWeights, keyof RegionScore]
> = [
  ['population_scale', 'population_balance'],
  ['geographic_compactness', 'compactness'],
  ['rural_workload', 'rural_balance'],
  ['administrative_fragmentation', 'fragmentation']
] as const;

/* Code review [§S9c]: one label per weight, exported.
 *
 * §S9c had two copies -- `WEIGHT_LABELS` in units.astro rendering the sweep
 * table, and `SWEEP_ROW_LABELS` in manifest-check.ts PARSING the published
 * methodology by label. The check compared the methodology against a label
 * map that was not the one the page renders, so renaming a row in one place
 * would have made the check quietly compare against a stale string instead of
 * reporting a drift. */
export const WEIGHT_LABELS: Record<keyof ObjectiveWeights, string> = {
  population_scale: 'Population scale',
  geographic_compactness: 'Geographic compactness',
  rural_workload: 'Rural workload balance',
  administrative_fragmentation: 'Administrative fragmentation'
};

export function weightedTotal(score: RegionScore, weights: ObjectiveWeights): number {
  let sum = 0;
  /* every RegionScore field is a number, so no assertion is needed here --
     and the repo forbids one anyway. */
  for (const [w, c] of WEIGHT_COMPONENTS) sum += weights[w] * score[c];
  return sum;
}

/* The count with the lowest weighted total. Ties break to the smaller count,
   matching tools/model_hospital_regions.py's `min(..., key=(total, regions))`
   so a re-weighting here cannot disagree with the tool for a reason that is
   only about tie-breaking. */
export function bestCount(scores: readonly RegionScore[], weights: ObjectiveWeights): number {
  let best = scores[0];
  let bestTotal = weightedTotal(best, weights);
  for (const s of scores.slice(1)) {
    const t = weightedTotal(s, weights);
    if (t < bestTotal || (t === bestTotal && s.regions < best.regions)) {
      best = s;
      bestTotal = t;
    }
  }
  return best.regions;
}

/* ---------------------------------------------------------------------------
 * R87 / R211 — how much of the answer is the weights
 * ------------------------------------------------------------------------- */

/* One point of the sweep: move a single weight to `value`, rescale the other
   three so the four still sum to 1, and record which count wins.

   Rescaling rather than renormalising all four together is deliberate. The
   question a reader has is "what if this term mattered more, or not at all",
   and the only answer that isolates the term is one where the ratios among
   the other three are held fixed. */
export interface SweepPoint {
  weight: keyof ObjectiveWeights;
  value: number;
  winner: number;
}

export function reweight(
  weights: ObjectiveWeights, key: keyof ObjectiveWeights, value: number
): ObjectiveWeights {
  const others = (Object.keys(weights) as (keyof ObjectiveWeights)[]).filter((k) => k !== key);
  const rest = others.reduce((a, k) => a + weights[k], 0);
  const out = { ...weights, [key]: value } as ObjectiveWeights;
  for (const k of others) out[k] = rest ? (1 - value) * weights[k] / rest : 0;
  return out;
}

/* The interval over which the selected count keeps winning, per weight.
   `step` is the resolution the reported bounds carry; 0.005 is fine enough
   that a bound never rounds to the authored value when they differ. */
export interface WeightInterval {
  weight: keyof ObjectiveWeights;
  authored: number;
  low: number;
  high: number;
  /* whether the authored value sits on a boundary of that interval, i.e.
     whether a plausible re-weighting flips the answer */
  fragile: boolean;
}

export const SWEEP_STEP = 0.005;
/* A weight this far from its authored value is still a defensible choice for
   the same model, so a flip inside this distance is the honest headline. */
export const FRAGILE_WITHIN = 0.05;

export function weightIntervals(
  scores: readonly RegionScore[], weights: ObjectiveWeights, selected: number
): WeightInterval[] {
  const out: WeightInterval[] = [];
  for (const key of Object.keys(weights) as (keyof ObjectiveWeights)[]) {
    let low = Number.NaN;
    let high = Number.NaN;
    for (let i = 0; i * SWEEP_STEP <= 1 + 1e-9; i++) {
      const v = i * SWEEP_STEP;
      if (bestCount(scores, reweight(weights, key, v)) === selected) {
        if (Number.isNaN(low)) low = v;
        high = v;
      }
    }
    out.push({
      weight: key,
      authored: weights[key],
      low, high,
      fragile: Number.isNaN(low) ||
        weights[key] - low < FRAGILE_WITHIN || high - weights[key] < FRAGILE_WITHIN
    });
  }
  return out;
}

/* R211's specific claim, as arithmetic rather than as prose: the
   fragmentation term is a penalty on distance from the selected count, so it
   is zero at the answer and positive everywhere else. If that holds, 15% of
   the objective is defined relative to the thing the objective is choosing.

   Returns the fitted coefficient when the shape is exactly `k * (n - anchor)^2`
   and null when it is not, so the page states this only while it is true. */
export interface FragmentationAnchor {
  anchor: number;
  coefficient: number;
  /* the count whose fragmentation penalty is zero */
  zeroAt: number;
}

export function fragmentationAnchor(
  scores: readonly RegionScore[]
): FragmentationAnchor | null {
  const zeros = scores.filter((s) => s.fragmentation === 0);
  if (zeros.length !== 1) return null;
  const anchor = zeros[0].regions;
  const others = scores.filter((s) => s.regions !== anchor);
  if (!others.length) return null;
  const k = others[0].fragmentation / (others[0].regions - anchor) ** 2;
  for (const s of others) {
    if (Math.abs(s.fragmentation - k * (s.regions - anchor) ** 2) > 1e-9) return null;
  }
  return { anchor, coefficient: k, zeroAt: anchor };
}

/* ---------------------------------------------------------------------------
 * R71 / R190 — the "assigned once" claim, as something that can fail
 * ------------------------------------------------------------------------- */

export interface AssignmentFault {
  state: string;
  problem: string;
}

/* Every fault the SVG description forbids, in one pass:
 *   - a state in two rosters (the render loop overwrites, last one wins)
 *   - a state in none
 *   - a roster naming something that is not a state
 *   - a GeoJSON feature whose name resolves to no abbreviation, which is the
 *     "Washington, D.C." / "District of Columbia" case R190 names: it renders
 *     as absence under a description that says absence is impossible
 *   - an assigned state with no feature to draw it on
 *
 * `featureNames` is optional because the client has the GeoJSON and the
 * self-test that runs before it may not; the roster half is checked either
 * way. */
export function regionAssignmentFaults(
  regions: readonly Region[],
  stateNames: Record<string, string>,
  featureNames?: readonly string[]
): AssignmentFault[] {
  const faults: AssignmentFault[] = [];
  const owner = new Map<string, string>();
  for (const r of regions) {
    for (const s of r.states) {
      if (!(s in stateNames)) {
        faults.push({ state: s, problem: 'is in ' + r.id + ' and is not a state' });
        continue;
      }
      const prior = owner.get(s);
      if (prior) faults.push({ state: s, problem: 'is in both ' + prior + ' and ' + r.id });
      else owner.set(s, r.id);
    }
  }
  for (const s of Object.keys(stateNames)) {
    if (!owner.has(s)) faults.push({ state: s, problem: 'is in no region' });
  }
  if (featureNames) {
    const byName = new Map<string, string>();
    for (const [abbr, name] of Object.entries(stateNames)) byName.set(name, abbr);
    const drawn = new Set<string>();
    for (const n of featureNames) {
      const abbr = byName.get(n);
      if (!abbr) faults.push({ state: n, problem: 'is drawn and resolves to no abbreviation' });
      else if (drawn.has(abbr)) faults.push({ state: abbr, problem: 'is drawn twice' });
      else drawn.add(abbr);
    }
    for (const s of owner.keys()) {
      if (!drawn.has(s)) faults.push({ state: s, problem: 'is assigned and is not drawn' });
    }
  }
  return faults;
}

/* ---------------------------------------------------------------------------
 * R72 / R191 — colour by adjacency, not by array index
 * ------------------------------------------------------------------------- */

/* Two regions are adjacent when any member state of one borders any member
   state of the other. The adjacency is the model's own, shipped in the data
   file, so this cannot drift from the graph the partition was built on. */
export function regionAdjacency(
  regions: readonly Region[], stateAdjacency: Record<string, string[]>
): Map<string, Set<string>> {
  const regionOf = new Map<string, string>();
  for (const r of regions) for (const s of r.states) regionOf.set(s, r.id);
  const out = new Map<string, Set<string>>();
  for (const r of regions) out.set(r.id, new Set<string>());
  for (const [state, neighbours] of Object.entries(stateAdjacency)) {
    const a = regionOf.get(state);
    if (!a) continue;
    for (const n of neighbours) {
      const b = regionOf.get(n);
      if (!b || b === a) continue;
      out.get(a)!.add(b);
      out.get(b)!.add(a);
    }
  }
  return out;
}

export const REGION_PALETTE = [
  'var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)',
  'var(--series-5)', 'var(--series-6)', 'var(--series-7)', 'var(--series-8)'
];

/* Greedy graph colouring, highest degree first.
 *
 * Two objectives, and the order between them is the whole design. Correctness
 * first: a region never takes a colour one of its neighbours already has, so
 * no border on the map dissolves. Legibility second: among the colours that
 * are still legal, take the one used least so far, so thirteen regions spread
 * across the whole palette instead of collapsing onto the four the theorem
 * says would suffice. Plain first-fit is correct and produces a four-colour
 * map, which is worse to look at than the eight-colour one it replaced.
 *
 * Deterministic: ties in degree and in usage break on the region id, so the
 * same data always yields the same map. */
export function assignRegionColors(
  regions: readonly Region[],
  adjacency: Map<string, Set<string>>,
  palette: readonly string[] = REGION_PALETTE
): Map<string, string> {
  const order = regions.map((r) => r.id).sort((a, b) => {
    const da = adjacency.get(a)?.size ?? 0;
    const db = adjacency.get(b)?.size ?? 0;
    return db - da || (a < b ? -1 : a > b ? 1 : 0);
  });
  const used = new Map<string, number>();
  for (const c of palette) used.set(c, 0);
  const out = new Map<string, string>();
  for (const id of order) {
    const taken = new Set<string>();
    for (const n of adjacency.get(id) ?? []) {
      const c = out.get(n);
      if (c) taken.add(c);
    }
    let pick = '';
    let pickUse = Infinity;
    for (const c of palette) {
      if (taken.has(c)) continue;
      const u = used.get(c) ?? 0;
      if (u < pickUse) { pick = c; pickUse = u; }
    }
    /* No legal colour means the palette is smaller than the graph needs. The
       four-colour theorem says that cannot happen for a planar map with eight
       colours, but the palette is a parameter and the caller may pass a
       shorter one, so this reports rather than silently reusing. */
    if (!pick) throw new Error(
      'no colour left for ' + id + ': palette of ' + palette.length +
      ' cannot colour a region with ' + (adjacency.get(id)?.size ?? 0) + ' neighbours');
    out.set(id, pick);
    used.set(pick, (used.get(pick) ?? 0) + 1);
  }
  return out;
}

export interface ColorClash { a: string; b: string; color: string }

/* The property the colouring exists to guarantee, checkable against any
   assignment including one produced some other way. */
export function colorClashes(
  adjacency: Map<string, Set<string>>, colors: Map<string, string>
): ColorClash[] {
  const out: ColorClash[] = [];
  for (const [a, neighbours] of adjacency) {
    for (const b of neighbours) {
      if (a < b && colors.get(a) && colors.get(a) === colors.get(b)) {
        out.push({ a, b, color: colors.get(a)! });
      }
    }
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * R88 / R213 — what the selected map actually achieved
 * ------------------------------------------------------------------------- */

export interface RegionSize {
  region: Region;
  /* population over the equal-population target */
  ratio: number;
  /* how far from target, in either direction: |ratio - 1| */
  distance: number;
}

export interface RegionGeometry {
  total: number;
  target: number;
  largest: Region;
  smallest: Region;
  /* largest population over smallest */
  spread: number;
  /* regions below and above target, most extreme first */
  below: RegionSize[];
  above: RegionSize[];
  ruralLow: Region;
  ruralHigh: Region;
  ruralSpread: number;
}

export function regionGeometry(regions: readonly Region[]): RegionGeometry {
  const total = regions.reduce((a, r) => a + r.population, 0);
  const target = total / regions.length;
  const byPop = [...regions].sort((a, b) => a.population - b.population);
  const byRural = [...regions].sort((a, b) => a.rural_share - b.rural_share);
  const size = (r: Region): RegionSize => ({
    region: r,
    ratio: r.population / target,
    distance: Math.abs(r.population / target - 1)
  });
  return {
    total, target,
    largest: byPop[byPop.length - 1],
    smallest: byPop[0],
    spread: byPop[byPop.length - 1].population / byPop[0].population,
    below: byPop.filter((r) => r.population < target).map(size),
    above: [...byPop].reverse().filter((r) => r.population >= target).map(size),
    ruralLow: byRural[0],
    ruralHigh: byRural[byRural.length - 1],
    ruralSpread: byRural[byRural.length - 1].rural_share / byRural[0].rural_share
  };
}

/* Code review [§S9c]: the page's "the smallest region is further from target
 * than <a large one> is" sentence, with the large one COMPUTED rather than
 * picked by index.
 *
 * §S9c shipped it as `LARGEST[0]`, which is the largest region by population
 * and therefore the one furthest from target in the other direction, so the
 * sentence rendered was false: New England sits 0.412 from target and
 * California and Hawaii 0.562. `R88`'s own text compares R13 against **R04**,
 * the second entry, and the published methodology says Texas and Louisiana.
 * Only the page was wrong, and only the page had no check.
 *
 * Returns the LARGEST above-target region the smallest one still beats, so
 * the comparison is the strongest true one, and null when there is none --
 * in which case the page renders no claim at all rather than a false one. */
export function outsizedComparator(geo: RegionGeometry): RegionSize | null {
  if (!geo.below.length) return null;
  const worstSmall = geo.below[0];
  /* `above` runs largest first, so the first match is the biggest region
     whose distance from target is still smaller. */
  return geo.above.find((a) => a.distance < worstSmall.distance) ?? null;
}

/* ---------------------------------------------------------------------------
 * R212 — the margin the page withholds
 * ------------------------------------------------------------------------- */

export interface SelectionMargin {
  selected: number;
  selectedTotal: number;
  runnerUp: number;
  runnerUpTotal: number;
  /* (runner-up - selected) / runner-up, in percent */
  marginPct: number;
}

export function selectionMargin(
  scores: readonly RegionScore[], selected: number
): SelectionMargin {
  const chosen = scores.find((s) => s.regions === selected);
  if (!chosen) throw new Error('selected region count ' + selected + ' is not among the scored candidates');
  const rest = scores.filter((s) => s.regions !== selected)
    .sort((a, b) => a.total - b.total);
  const runner = rest[0];
  return {
    selected, selectedTotal: chosen.total,
    runnerUp: runner.regions, runnerUpTotal: runner.total,
    marginPct: 100 * (runner.total - chosen.total) / runner.total
  };
}

/* ---------------------------------------------------------------------------
 * R192 — what the score chart's bars encode
 * ------------------------------------------------------------------------- */

/* The fraction of the axis a candidate's bar fills, on a scale where the best
 * candidate is 1 and the worst is 0.
 *
 * This lives here rather than inline in the client because the defect it
 * fixes is not a pixel calculation, it is a claim about meaning: the bar used
 * to be proportional to a lower-is-better score, so the winner drew shortest.
 * As a function, a self-test can assert the selected candidate is the tallest
 * bar; as `49 * row.total / max` inside a render loop, nothing could.
 *
 * A flat set of candidates gives every bar 0, which the caller floors to a
 * visible stub. */
export function scoreBarFraction(
  total: number, best: number, worst: number
): number {
  const span = worst - best;
  return span > 0 ? (worst - total) / span : 0;
}

/* ---------------------------------------------------------------------------
 * R70 — an acronym key that is also a state
 * ------------------------------------------------------------------------- */

/* The collision R70 is about, as a predicate rather than as a list.
   `VA` is the one that collides today, `PA` having been removed from the
   glossary by R307; `IN`, `OR`, `OK`, `ID`, `ME` and `HI` are all plausible
   future glossary entries that would collide the same way, which is why this
   asks the state table rather than naming them. */
export function stateCollisions(
  keys: readonly string[], stateNames: Record<string, string>
): string[] {
  return keys.filter((k) => k in stateNames).sort();
}
