/* The Physical Care checks: the unit network, the county file and the
 * hospital regions, held to the page and the methodology that publish them.
 *
 * Moved out of manifest-check.ts (the branch review against main,
 * 2026-10-21, found that module changing for every reason any of its checks
 * did). These read the county file through counties.ts, the region and state
 * geometry through region-data.ts, src/pages/units.astro and
 * research/hospital_regionalization_methodology.md: the units cost against
 * the per-type model, the need-based allocation, the visit split, the graded
 * unit rows, the network absorption span, the region assignment, colouring,
 * score chart, selection and county agreement, the published region tables,
 * the fragmentation claim, the county file itself, the state codes the
 * glossary collides with, and the scenarios that stress unit cost.
 *
 * The code moved as it was. A comment names workforce-check.ts where it
 * said "above", and the countyDemand re-export stayed in manifest-check.ts.
 *
 * Build-time only; manifest-check.ts re-exports each of them. Every file
 * read goes through repo-text.ts, counties.ts or region-data.ts, so this
 * module imports no node:fs of its own. */
import { ACRONYMS as SITE_ACRONYMS } from './acronyms';
import { countyDemand, countyMeta, type CountyMeta } from './counties';
import {
  assignRegionColors, bestCount, colorClashes, fragmentationAnchor, regionAdjacency,
  regionAssignmentFaults, scoreBarFraction, selectionMargin, stateCollisions,
  weightedTotal, weightIntervals, REGION_PALETTE, WEIGHT_LABELS, type AssignmentFault,
  type ColorClash, type FragmentationAnchor, type SelectionMargin, type WeightInterval
} from './hospital-regions';
import { regionModel, statesGeoMeta, stateFeatureNames, STATES_GEO } from './region-data';
import {
  allocateUnits, CAPITAL_AMORTISATION_YEARS, NATIONAL_COMPARATOR, NETWORK_ABSORPTION,
  networkCost, UNIT_ASSUMPTIONS, unitsCostComparison, VISIT_SPLITS, type UnitAssumption
} from './units';
import { PARAMS_BY_ID } from './params';
import { SCENARIOS as MODEL_SCENARIOS, SCENARIOS_BY_ID } from './scenarios';
import { UNIT_MODEL } from './workforce';
import { REPO_ROOT, sourceText, markdownRows, flowed } from './repo-text';

/* R188 [§S9b]: what `unitsCost` and the per-type model actually say to each
 * other. This replaces `unitsCostRangeDrift`, which policed a hardcoded
 * "$15-36B" in units-client.ts; the client reads params.ts directly now, so
 * there is no copy left to police and a check on one could not fail.
 *
 * MEASURED, and it contradicts the premise the section was written on.
 * §BE7 read the page's printed gap as a top-down / bottom-up disagreement and
 * Part 1 was scoped around reconciling one. There is no disagreement. The two
 * numbers price different networks:
 *
 *   unitsCost                  15,000 units, "operating + amortized capital"
 *   the page's bottom-up total the need-based count, ~24,100 at the default
 *
 * Hold the type mix, scale the bottom-up model to 15,000 units, and it lands
 * within a couple of percent of unitsCost's mode at any capital amortisation
 * between ten and thirty years. The published gap is a COUNT difference
 * rendered as a cost difference.
 *
 * The check asserts the agreement rather than the gap, because the agreement
 * is the finding. It fails in every direction that matters: restaff or
 * reprice a type, move either bound of unitsCost, or change the controlled
 * target, and the two stop meeting. */
export interface UnitsCostReconciliation {
  targetUnits: number;
  needBasedUnits: number;
  /* operating plus capital over the short and long amortisation windows */
  annualisedShort: number;
  annualisedLong: number;
  paramLow: number;
  paramMode: number;
  paramHigh: number;
  ok: boolean;
  /* how far the midpoint of the two windows sits from the parameter's mode */
  modeErrorPct: number;
}

/* Code review [§S9b]: the check used to assert only that the annualised
   window overlapped `unitsCost`'s range, which left the operating total free
   to fall 40% or rise 34% while the self-test's own note advertised agreement
   "within a couple of percent". `modeErrorPct` was computed, printed, and
   never gated. The measured error is 3.4%; the gate is set at 10, which is
   loose enough not to fire on a rounding change and tight enough that
   repricing a type or moving the target trips it. Both conditions have to
   hold: overlapping a wide range is not agreement. */
export const RECONCILIATION_MAX_ERROR_PCT = 10;

export function unitsCostReconciliation(root = REPO_ROOT): UnitsCostReconciliation {
  const param = PARAMS_BY_ID['unitsCost'];
  const totals = allocateUnits(countyDemand(root), NETWORK_ABSORPTION.default);
  const cmp = unitsCostComparison(totals);
  const annualisedShort = cmp.targetAnnualised(CAPITAL_AMORTISATION_YEARS.short);
  const annualisedLong = cmp.targetAnnualised(CAPITAL_AMORTISATION_YEARS.long);
  const mid = (annualisedShort + annualisedLong) / 2;
  return {
    targetUnits: cmp.targetUnits,
    needBasedUnits: cmp.needBasedUnits,
    annualisedShort, annualisedLong,
    paramLow: param.low, paramMode: param.mode, paramHigh: param.high,
    /* both ends of the window have to sit inside the parameter's range, or the
       agreement is a coincidence at one amortisation choice */
    ok: annualisedLong >= param.low && annualisedShort <= param.high &&
      100 * Math.abs(mid - param.mode) / param.mode <= RECONCILIATION_MAX_ERROR_PCT,
    modeErrorPct: 100 * Math.abs(mid - param.mode) / param.mode
  };
}

/* R185 [§S9b]: the workforce ledger's per-type unit counts, against the
 * allocation the model actually produces.
 *
 * `UNIT_MODEL.allocation` carries 7,470 / 9,055 / 6,397 / 1,177, and until
 * this section those four figures were the hand-copied output of a
 * client-side computation nothing could re-run: `allocate()` lived in
 * units-client.ts and read counties.json over fetch, so it existed only in a
 * browser. The workforce chapter's 138,000 unit-team positions descend from
 * them.
 *
 * The allocation is a pure function now and the county file is on disk, so
 * the build runs it. Both sides stay independent: `allocated` is authored,
 * the comparison is a computation over every county in the file. Move a
 * throughput, a visit split, a threshold or the absorption default and this
 * fails and names the type. */
export interface UnitAllocationDisagreement {
  key: string;
  authored: number;
  computed: number;
}

export function unitAllocationDrift(root = REPO_ROOT): UnitAllocationDisagreement[] {
  const totals = allocateUnits(countyDemand(root), NETWORK_ABSORPTION.default);
  const out: UnitAllocationDisagreement[] = [];
  for (const t of UNIT_MODEL.allocation) {
    const computed = totals[t.key];
    if (computed !== t.allocated) {
      out.push({ key: t.key, authored: t.allocated, computed });
    }
  }
  return out;
}

/* R186 [§S9b]: a visit split that does not close on 1 is demand the model
 * stops placing, silently. Urban splits three ways and rural two; before this
 * section both were bare literals inside one arithmetic expression, and
 * editing 0.57 to 0.50 would have removed 7% of urban demand from the country
 * with every test still green. Compared at a tolerance, because these are
 * decimal fractions in binary floating point. */
export interface SplitClosure { which: string; sum: number }

export function visitSplitClosure(): SplitClosure[] {
  const out: SplitClosure[] = [];
  const urban = VISIT_SPLITS.urban.a + VISIT_SPLITS.urban.b + VISIT_SPLITS.urban.d;
  const rural = VISIT_SPLITS.rural.b + VISIT_SPLITS.rural.c;
  if (Math.abs(urban - 1) > 1e-9) out.push({ which: 'urban', sum: urban });
  if (Math.abs(rural - 1) > 1e-9) out.push({ which: 'rural', sum: rural });
  return out;
}

/* R186 [§S9b]: every input to the unit count carries a grade and an owner,
 * and every graded row corresponds to something the model reads.
 *
 * The second half is the one that matters, and it is the shape §S9a shipped
 * twice and the review caught: a coverage check whose data source can go away
 * reports "nothing ungraded" for a table that has disappeared. The expected
 * ids are declared here, so deleting a row fails rather than passing. */
export const UNIT_ASSUMPTION_IDS = [
  'absorption', 'throughput', 'urban-split', 'rural-split',
  'type-d-threshold', 'rural-floor'
];

export interface AssumptionGap { id: string; missing: string }

/* Every row the reader is shown: the six model inputs plus the national
   comparator, which is rendered beside them and was previously covered by
   nothing. */
export function gradedUnitRows(): readonly UnitAssumption[] {
  return [...UNIT_ASSUMPTIONS, NATIONAL_COMPARATOR];
}

export function unitAssumptionGaps(): AssumptionGap[] {
  const out: AssumptionGap[] = [];
  const seen = new Set<string>();
  for (const a of gradedUnitRows()) {
    seen.add(a.id);
    if (!a.basis.trim()) out.push({ id: a.id, missing: 'basis' });
    if (!a.owner.trim()) out.push({ id: a.id, missing: 'owner' });
    if (!a.value.trim()) out.push({ id: a.id, missing: 'value' });
    if (!a.label.trim()) out.push({ id: a.id, missing: 'label' });
  }
  /* Code review [§S9b]: a regex testing `confidence` against
     low|medium|high was dead -- the field is typed as exactly those three, so
     nothing could reach the branch. What actually needed asserting is the
     claim the page and the self-test note both make: that nothing behind the
     unit count is graded above `low`. The comparator is the one exception and
     is named, because it is published and the inputs are not. */
  for (const a of UNIT_ASSUMPTIONS) {
    if (a.confidence !== 'low') {
      out.push({ id: a.id, missing: 'a `low` grade, or a rewrite of the page note that says none is above it' });
    }
  }
  /* A row that carries a URL has to be a real one. */
  for (const a of gradedUnitRows()) {
    if (a.url && !/^https:\/\//.test(a.url)) {
      out.push({ id: a.id, missing: 'an https source URL' });
    }
  }
  if (!NATIONAL_COMPARATOR.url) {
    out.push({ id: NATIONAL_COMPARATOR.id, missing: 'the citation it exists to carry' });
  }
  for (const id of UNIT_ASSUMPTION_IDS) {
    if (!seen.has(id)) out.push({ id, missing: 'the row itself' });
  }
  for (const a of UNIT_ASSUMPTIONS) {
    if (!UNIT_ASSUMPTION_IDS.includes(a.id)) {
      out.push({ id: a.id, missing: 'a declaration in UNIT_ASSUMPTION_IDS' });
    }
  }
  return out;
}

/* R187 [§S9b]: the absorption control and `unitsCost` are independent, and
 * that is a statement the build holds now rather than one a reader has to
 * infer.
 *
 * §BD5 suspected they were unlinked and §BE did not confirm it. Confirmed:
 * `visitsPerCapita` is module state in units-client.ts, it reaches
 * `allocateCounty` and nothing else, and `unitsCost` is a PARAM_DEFS entry the
 * Monte Carlo samples. Moving the control changes the unit count and the
 * page's own bottom-up cost; it does not move a dollar in the healthcare
 * model. R187 allows either wiring them or declaring the independence, and
 * declaring it is right: the count is a capacity plan and the parameter is a
 * sampled cost input with its own range.
 *
 * The check is that the two ends of the control produce genuinely different
 * networks, so the page is showing a live consequence rather than a control
 * that does nothing. */
export interface AbsorptionSpan {
  low: number; high: number; lowUnits: number; highUnits: number;
  lowOpB: number; highOpB: number; unitsCostMode: number;
}

export function absorptionSpan(root = REPO_ROOT): AbsorptionSpan {
  const counties = countyDemand(root);
  const lo = allocateUnits(counties, NETWORK_ABSORPTION.min);
  const hi = allocateUnits(counties, NETWORK_ABSORPTION.max);
  return {
    low: NETWORK_ABSORPTION.min, high: NETWORK_ABSORPTION.max,
    lowUnits: lo.total, highUnits: hi.total,
    lowOpB: networkCost(lo).opTotal, highOpB: networkCost(hi).opTotal,
    unitsCostMode: PARAMS_BY_ID['unitsCost'].mode
  };
}

/* =========================================================================
 * §S9c — the thirteen-region hospital administration model
 * ========================================================================= */

/* R71 / R190: the claim the SVG description makes to a screen reader, run
 * against the shipped rosters AND the shipped outlines.
 *
 * The description said "every state and the District of Columbia is assigned
 * once" and the render loop dropped anything it could not resolve, so the two
 * failure modes it forbids -- a state in two regions, a state in none, an
 * outline whose name matches no abbreviation -- were all silent. §AH verified
 * by hand that the data was correct; hand verification is not a guard, which
 * is the whole of what R71 asks for. */
export function regionAssignmentReport(root = REPO_ROOT): {
  faults: AssignmentFault[]; states: number; features: number; regions: number;
} {
  const model = regionModel(root);
  const names = stateFeatureNames(root);
  return {
    faults: regionAssignmentFaults(model.regions, model.model.state_names, names),
    states: Object.keys(model.model.state_names).length,
    features: names.length,
    regions: model.regions.length
  };
}

/* R72 / R191: no two regions that share a border share a fill.
 *
 * Code review [§S9c]: this row shipped the defect class it belongs to.
 *
 * §S9c asserted `colorClashes(adjacency, assignRegionColors(...))` and nothing
 * else, which is a property checked against the function that enforces it.
 * The review called it unfailable. Measured, that is half right and the half
 * matters: breaking `assignRegionColors` so it ignores its neighbours DOES
 * fail the build, so the assertion is a live regression test on the colourer.
 * What it cannot do is notice anything about the DATA, because the colourer
 * adapts to whatever graph it is handed -- and the row is about the map, not
 * about one function.
 *
 * Both halves are gated now. Dropping the clash assertion, which is what the
 * review proposed, was tried and reverted: the break-and-restore pass caught
 * it immediately, because a payload that used to fail the build stopped
 * failing it. A guard that fires on a real regression is not a guard to
 * delete; it is a guard to put something beside.
 *
 * What the rest of it holds, none of which the colourer can satisfy on its
 * own:
 *
 *   1. the adjacency graph having substance -- every region has a neighbour,
 *      the relation is symmetric, every assigned state has an entry. A clash
 *      check over an empty graph passes forever, which is the shape §S9a and
 *      §S9b both shipped;
 *   2. the palette still being large enough that the colouring is a real
 *      constraint rather than the last resort before the throw. `spare` is
 *      how many palette entries the busiest region did NOT need; if it
 *      reaches zero the map is one added border away from being uncolourable,
 *      and the throw would take the page down rather than degrade it;
 *   3. thirteen regions still spreading across the whole palette, which is
 *      the legibility half and is genuinely losable -- a first-fit colourer
 *      satisfies the adjacency property with four colours.
 *
 * The property is ALSO asserted against a colouring this function did not
 * produce, in tests/lib/hospital-regions.test.ts, so `colorClashes` itself is
 * shown to be capable of returning something. */
export interface RegionColoring {
  clashes: ColorClash[];
  graphFaults: string[];
  distinctColors: number;
  regions: number;
  edges: number;
  maxDegree: number;
  /* palette entries beyond the most any one region's neighbours actually
     consume. NOT palette minus degree: neighbours share colours, so degree
     overstates what is consumed and understates the room left. */
  spare: number;
}

export function regionColoring(root = REPO_ROOT): RegionColoring {
  const model = regionModel(root);
  const adjacency = regionAdjacency(model.regions, model.model.state_adjacency);
  const colors = assignRegionColors(model.regions, adjacency);
  const graphFaults: string[] = [];
  let edges = 0;
  let maxDegree = 0;
  for (const [id, neighbours] of adjacency) {
    edges += neighbours.size;
    maxDegree = Math.max(maxDegree, neighbours.size);
    if (!neighbours.size) graphFaults.push(id + ' borders no other region');
    for (const n of neighbours) {
      if (!adjacency.get(n)?.has(id)) {
        graphFaults.push(id + ' borders ' + n + ' but not the reverse');
      }
    }
  }
  /* The state adjacency the graph is built from has to cover the states the
     rosters assign, or a region with no listed neighbours looks isolated
     rather than unlisted. */
  for (const r of model.regions) {
    for (const s of r.states) {
      if (!(s in model.model.state_adjacency)) {
        graphFaults.push(s + ' is in ' + r.id + ' and has no adjacency entry');
      }
    }
  }
  /* Second code review [§S9c]: `spare` was `palette - maxDegree`, which is
     not what its own comment said and not what the note rendered. The busiest
     region has 7 neighbours but they consume only 6 distinct colours between
     them, so the real room is 2 and the gate was firing a border early while
     the page told a reader the map was "one border away from being
     uncolourable". Count the colours, not the neighbours. */
  let consumed = 0;
  for (const [id, neighbours] of adjacency) {
    void id;
    const used = new Set<string>();
    for (const n of neighbours) {
      const c = colors.get(n);
      if (c) used.add(c);
    }
    consumed = Math.max(consumed, used.size);
  }

  return {
    clashes: colorClashes(adjacency, colors),
    graphFaults,
    distinctColors: new Set(colors.values()).size,
    regions: model.regions.length,
    edges: edges / 2,
    maxDegree,
    spare: REGION_PALETTE.length - consumed
  };
}

/* R192: the selected candidate draws the tallest bar.
 *
 * Asserted through the same function the client renders with, so this cannot
 * pass while the chart is inverted. It was inverted: the bar was proportional
 * to a score the caption itself describes as lower-is-better. */
export function scoreChartEncoding(root = REPO_ROOT): {
  ok: boolean; selected: number; tallest: number; selectedFraction: number;
} {
  const model = regionModel(root).model;
  const scores = model.tested_region_counts;
  const best = Math.min(...scores.map((s) => s.total));
  const worst = Math.max(...scores.map((s) => s.total));
  let tallest = scores[0];
  let tallestF = scoreBarFraction(scores[0].total, best, worst);
  for (const s of scores) {
    const f = scoreBarFraction(s.total, best, worst);
    if (f > tallestF) { tallest = s; tallestF = f; }
  }
  return {
    ok: tallest.regions === model.selected_region_count,
    selected: model.selected_region_count,
    tallest: tallest.regions,
    selectedFraction: scoreBarFraction(
      scores.find((s) => s.regions === model.selected_region_count)!.total, best, worst)
  };
}

/* R87 / R211 / R212: the published result is the one its own components
 * produce, and the margin the page shows is real.
 *
 * Two independent sides, which is what makes it a check rather than a
 * restatement. `total` and `selected_region_count` were written by
 * tools/model_hospital_regions.py; the reconstruction re-derives both from the
 * four components and the four weights in the same file. A hand-edited score,
 * a re-weighting that was never re-run, or a component dropped from the
 * emitter all break it. */
export interface RegionSelectionCheck {
  reconstructionFaults: string[];
  declaredWinner: number;
  computedWinner: number;
  margin: SelectionMargin;
  anchor: FragmentationAnchor | null;
  fragile: WeightInterval[];
  intervals: WeightInterval[];
}

/* Floating point: the components are 17-digit doubles and the weights are
   two-decimal literals, so the reconstruction agrees to rounding, not to the
   bit. A component silently dropped moves a total by percent, not by 1e-15. */
export const SCORE_RECONSTRUCTION_TOLERANCE = 1e-12;

export function regionSelection(root = REPO_ROOT): RegionSelectionCheck {
  const model = regionModel(root).model;
  const scores = model.tested_region_counts;
  const faults: string[] = [];
  for (const s of scores) {
    const t = weightedTotal(s, model.weights);
    if (Math.abs(t - s.total) > SCORE_RECONSTRUCTION_TOLERANCE) {
      faults.push(s.regions + ' regions: file says ' + s.total +
        ', its components weight to ' + t);
    }
  }
  const sumW = Object.values(model.weights).reduce((a, b) => a + b, 0);
  if (Math.abs(sumW - 1) > 1e-9) faults.push('the four weights sum to ' + sumW + ', not 1');
  /* Code review [§S9c]: computed once. The sweep is 4 weights x 201 steps x a
     bestCount over seven candidates, and it was being run twice per call. */
  const intervals = weightIntervals(scores, model.weights, model.selected_region_count);
  return {
    reconstructionFaults: faults,
    declaredWinner: model.selected_region_count,
    computedWinner: bestCount(scores, model.weights),
    margin: selectionMargin(scores, model.selected_region_count),
    anchor: fragmentationAnchor(scores),
    fragile: intervals.filter((i) => i.fragile),
    intervals
  };
}

/* R88 / R213 / V18: the region file and the county file describe the same
 * country.
 *
 * The handoff into this section flagged it as free: §S9b measures the
 * national total from public/data/counties.json and §AH verified the thirteen
 * region populations sum to 340,110,988, and nothing compared the two. They
 * are genuinely independent -- one is 3,144 rows summed in TypeScript, the
 * other is thirteen integers written by a Python model -- so this is the
 * strongest arithmetic check on this page. */
export interface RegionCountyAgreement {
  regionTotal: number;
  countyTotal: number;
  perRegion: { id: string; regionSays: number; countiesSay: number }[];
}

export function regionCountyAgreement(root = REPO_ROOT): RegionCountyAgreement {
  const model = regionModel(root);
  const byState = new Map<string, number>();
  for (const c of countyDemand(root)) {
    byState.set(c.s, (byState.get(c.s) ?? 0) + c.p);
  }
  const perRegion: { id: string; regionSays: number; countiesSay: number }[] = [];
  for (const r of model.regions) {
    const countiesSay = r.states.reduce((a, s) => a + (byState.get(s) ?? 0), 0);
    if (countiesSay !== r.population) {
      perRegion.push({ id: r.id, regionSays: r.population, countiesSay });
    }
  }
  return {
    regionTotal: model.regions.reduce((a, r) => a + r.population, 0),
    countyTotal: [...byState.values()].reduce((a, b) => a + b, 0),
    perRegion
  };
}

/* R87 / R89 / R211 [§S9c]: the region methodology's prose, against the model.
 *
 * The sweep this section added to research/hospital_regionalization_methodology.md
 * is four intervals typed into a table. They were computed -- twice, once in
 * Python and once here, agreeing -- but a computed figure typed into prose is
 * a typed figure from the next commit onward, and that is trap D2: a number
 * that inherits the credibility of the derived ones beside it. §S9a shipped
 * one of those in the commit that closed the defect class.
 *
 * So the published table is parsed and compared against the intervals the
 * build computes, along with the margin and the thirteen region names. The
 * same shape as `unitModelDrift` (workforce-check.ts), for the same reason. */
const REGION_METHODOLOGY = 'research/hospital_regionalization_methodology.md';

export interface MethodologyDrift { where: string; says: string; expected: string }

/* Second code review [§S9c]: whether the chapter's disclosure of the anchored
 * term is still WIRED to the model, rather than merely present.
 *
 * The first attempt at this greped the page source for the sentence and
 * compared that against the model. It could not work, and it recreated the
 * defect it was written to remove. The sentence lives inside
 * `{ANCHOR && (...)}`, so the page already stops rendering it the moment
 * `fragmentationAnchor` returns null -- but the SOURCE still contains it, so
 * the grep returned `true` unconditionally and `anchored === claimed` reduced
 * to `anchored`. That is the original backwards gate verbatim: satisfying
 * R211 would have turned the build red.
 *
 * What is actually checkable, and is the failure mode worth catching, is
 * whether the sentence is still INSIDE the guard. A disclosure moved out of
 * the guard would be rendered whether or not the model still has an anchored
 * term, which is the page asserting something it cannot know. That can fail,
 * it fails for the right reason, and it stays green on the day R211 is
 * finally satisfied. */
const UNITS_PAGE = 'src/pages/units.astro';

export const FRAGMENTATION_CLAIM = 'the score is defined relative to the answer';
const ANCHOR_GUARD_OPEN = '{ANCHOR &&';

export interface ClaimGuard {
  /* the sentence appears in the page at all */
  present: boolean;
  /* it appears inside the `{ANCHOR && (...)}` block */
  guarded: boolean;
}

/* The end of the `{...}` expression that starts at `open`, by brace depth.
   Scanning for the first `)}` does not work: the block's own
   `{Math.round(... * 100)}` closes before the sentence does, which made the
   first version of this report a guarded paragraph as unguarded. */
function braceBlockEnd(src: string, open: number): number {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

export function fragmentationClaimGuard(root = REPO_ROOT): ClaimGuard {
  const src = sourceText(UNITS_PAGE, root);
  const at = src.indexOf(FRAGMENTATION_CLAIM);
  if (at < 0) return { present: false, guarded: false };
  const open = src.lastIndexOf(ANCHOR_GUARD_OPEN, at);
  if (open < 0) return { present: true, guarded: false };
  const end = braceBlockEnd(src, open);
  return { present: true, guarded: end > at };
}

/* `override` exists for the tests, which reformat the published prose the way
   a markdown formatter would and assert this stays silent. `sourceText`
   memoises per file, so a test cannot get a second reading of the real file
   in one process, and rewriting the repo's own documentation from a test is
   worse than passing the text in. */
export function regionMethodologyDrift(
  root = REPO_ROOT, override?: string
): MethodologyDrift[] {
  const out: MethodologyDrift[] = [];
  const note = override ?? sourceText(REGION_METHODOLOGY, root);
  const rows = markdownRows(note);
  const prose = flowed(note);
  const model = regionModel(root);
  const intervals = weightIntervals(
    model.model.tested_region_counts, model.model.weights, model.model.selected_region_count);

  /* The sweep table: one row per objective term, weight and interval. Keyed
     on the label the PAGE renders, so the two cannot name a row differently.

     TWO tables in this file start with the weight label -- the objective
     components table ("Population scale | 45% | Avoid regions too small...")
     and the sweep. Matching on the label alone picks whichever comes first,
     which is the wrong one; the interval shape in the third cell is what
     tells them apart. The regexes this replaced disambiguated by accident,
     which is not the same as disambiguating. */
  const INTERVAL = /^(\d+)%\s*to\s*(\d+)%$/;
  for (const i of intervals) {
    const label = WEIGHT_LABELS[i.weight];
    const matching = rows.filter((c) => c[0] === label && c.length >= 3);
    const row = matching.find((c) => INTERVAL.test(c[2]));
    const expected = Math.round(i.authored * 100) + '%, ' +
      Math.round(i.low * 100) + '% to ' + Math.round(i.high * 100) + '%';
    if (!row) {
      out.push({
        where: REGION_METHODOLOGY + ' sweep row ' + label,
        says: matching.length
          ? 'no row carrying an interval; found ' + matching.length + ' other row(s) with this label'
          : 'no published row',
        expected
      });
      continue;
    }
    const bounds = row[2].match(INTERVAL)!;
    const weight = row[1].match(/(\d+)%/);
    if (!weight) {
      out.push({
        where: REGION_METHODOLOGY + ' sweep row ' + label,
        says: 'weight cell reads ' + row[1], expected
      });
      continue;
    }
    const says = weight[1] + '%, ' + bounds[1] + '% to ' + bounds[2] + '%';
    if (says !== expected) {
      out.push({ where: REGION_METHODOLOGY + ' sweep row ' + label, says, expected });
    }
  }

  /* the margin over the runner-up */
  const margin = selectionMargin(model.model.tested_region_counts, model.model.selected_region_count);
  const mm = prose.match(/best, by ([\d.]+)% over the/);
  const wantMargin = margin.marginPct.toFixed(2) + '%';
  if (!mm) {
    out.push({ where: REGION_METHODOLOGY + ' margin', says: 'no published margin', expected: wantMargin });
  } else if (mm[1] + '%' !== wantMargin) {
    out.push({ where: REGION_METHODOLOGY + ' margin', says: mm[1] + '%', expected: wantMargin });
  }

  /* R89: the region table's names and populations. A rename that lands in the
     model and not here leaves a public map and a published methodology
     calling the same region two different things. */
  for (const r of model.regions) {
    const row = rows.find((c) => c[0] === r.id);
    if (!row || row.length < 4) {
      out.push({ where: REGION_METHODOLOGY + ' ' + r.id, says: 'no published row', expected: r.name });
      continue;
    }
    if (row[1] !== r.name) {
      out.push({ where: REGION_METHODOLOGY + ' ' + r.id, says: row[1], expected: r.name });
    }
    if (Number(row[3].split(',').join('')) !== r.population) {
      out.push({
        where: REGION_METHODOLOGY + ' ' + r.id + ' population',
        says: row[3], expected: r.population.toLocaleString('en-US')
      });
    }
  }

  /* R211: the fragmentation coefficient the prose states. Spacing inside the
     expression is not a drift either. */
  const anchor = fragmentationAnchor(model.model.tested_region_counts);
  const am = prose.match(/exactly\s*`?\s*([\d.]+)\s*\*\s*\(\s*n\s*-\s*(\d+)\s*\)\s*\^\s*2/);
  if (!anchor) {
    if (am) {
      out.push({
        where: REGION_METHODOLOGY + ' fragmentation',
        says: 'the term is ' + am[1] + ' * (n - ' + am[2] + ')^2',
        expected: 'no anchored term; the paragraph must be rewritten'
      });
    }
  } else if (!am) {
    out.push({
      where: REGION_METHODOLOGY + ' fragmentation',
      says: 'no published coefficient',
      expected: anchor.coefficient + ' * (n - ' + anchor.anchor + ')^2'
    });
  } else if (Number(am[1]) !== anchor.coefficient || Number(am[2]) !== anchor.anchor) {
    out.push({
      where: REGION_METHODOLOGY + ' fragmentation',
      says: am[1] + ' * (n - ' + am[2] + ')^2',
      expected: anchor.coefficient + ' * (n - ' + anchor.anchor + ')^2'
    });
  }

  return out;
}

/* R90 / R92: the county file, audited.
 *
 * R90 is filed as an audit task -- "a shared dependency of two chapters,
 * never examined". Reading it once and reporting that it was fine would have
 * closed the row and guarded nothing, which is the failure mode this whole
 * campaign keeps finding. So the audit is a check that runs on every build.
 *
 * The state table is not restated here. The 5-digit FIPS prefix and the USPS
 * code are both IN the file, so the mapping between them is checked for
 * self-consistency -- one prefix per state, one state per prefix -- and the
 * set of state codes is checked against the region model's `state_names`,
 * which is the authority. A fourth copy of the state list would be one more
 * thing to drift.
 *
 * R92's half is the last group: the metadata has to declare a vintage for
 * every field that varies with time, and the region model's own vintage claim
 * has to agree with it. Those two files have described the same Census
 * releases in prose, separately, since Pass 14. */
export interface CountyFileFault { what: string; detail: string }

export function countyFileAudit(root = REPO_ROOT): {
  faults: CountyFileFault[]; records: number; population: number; states: number;
  meta: CountyMeta;
} {
  const meta = countyMeta(root);
  const rows = countyDemand(root);
  const faults: CountyFileFault[] = [];

  if (rows.length !== meta.records) {
    faults.push({ what: 'record count', detail: rows.length + ' rows, metadata declares ' + meta.records });
  }
  const population = rows.reduce((a, c) => a + c.p, 0);
  if (population !== meta.population_total) {
    faults.push({ what: 'population total', detail: population + ' summed, metadata declares ' + meta.population_total });
  }

  const seen = new Set<string>();
  const prefixToState = new Map<string, string>();
  const stateToPrefix = new Map<string, string>();
  let malformed = 0;
  let badRural = 0;
  let badPoint = 0;
  for (const c of rows) {
    if (!/^[0-9]{5}$/.test(c.f)) { malformed++; continue; }
    if (seen.has(c.f)) faults.push({ what: 'duplicate FIPS', detail: c.f });
    seen.add(c.f);
    if (!(c.r >= 0 && c.r <= 1)) badRural++;
    if (!(c.la >= -90 && c.la <= 90 && c.lo >= -180 && c.lo <= 180)) badPoint++;
    if (c.p < 0) faults.push({ what: 'negative population', detail: c.f });
    const prefix = c.f.slice(0, 2);
    const priorState = prefixToState.get(prefix);
    if (priorState && priorState !== c.s) {
      faults.push({ what: 'FIPS prefix ' + prefix, detail: 'covers both ' + priorState + ' and ' + c.s });
    } else prefixToState.set(prefix, c.s);
    const priorPrefix = stateToPrefix.get(c.s);
    if (priorPrefix && priorPrefix !== prefix) {
      faults.push({ what: 'state ' + c.s, detail: 'spans FIPS prefixes ' + priorPrefix + ' and ' + prefix });
    } else stateToPrefix.set(c.s, prefix);
  }
  if (malformed) faults.push({ what: 'malformed FIPS', detail: malformed + ' rows' });
  if (badRural) faults.push({ what: 'rural share outside 0 to 1', detail: badRural + ' rows' });
  if (badPoint) faults.push({ what: 'coordinates off the globe', detail: badPoint + ' rows' });

  /* The authority on which states exist is the region model, which assigns
     every one of them exactly once. */
  const names = regionModel(root).model.state_names;
  for (const s of stateToPrefix.keys()) {
    if (!(s in names)) faults.push({ what: 'unknown state code', detail: s });
  }
  for (const s of Object.keys(names)) {
    if (!stateToPrefix.has(s)) faults.push({ what: 'state with no counties', detail: s });
  }

  /* R92: every time-varying field declared, and the two files agreeing. */
  for (const f of ['p', 'r', 'la', 'lo']) {
    if (!meta.fields[f]) faults.push({ what: 'undeclared field', detail: f });
  }
  /* Code review [§S9c]: the row says EVERY data file, and §S9c did only this
     one. The third file the units page fetches carries geometry, which is
     time-varying too -- boundary files get re-issued and re-simplified. */
  const geoMeta = statesGeoMeta(root);
  if (!Number.isInteger(geoMeta.geometry_vintage) ||
      geoMeta.geometry_vintage < 1990 || geoMeta.geometry_vintage > 2100) {
    faults.push({
      what: 'implausible vintage', detail: STATES_GEO + ' says ' + geoMeta.geometry_vintage
    });
  }
  if (geoMeta.features !== stateFeatureNames(root).length) {
    faults.push({
      what: 'feature count', detail: STATES_GEO + ' declares ' + geoMeta.features +
        ' and holds ' + stateFeatureNames(root).length
    });
  }
  if (!/^https:\/\//.test(geoMeta.url)) {
    faults.push({ what: 'source URL', detail: STATES_GEO + ' has no https source' });
  }
  for (const v of [meta.population_vintage, meta.rural_vintage, meta.geometry_vintage]) {
    if (!Number.isInteger(v) || v < 1990 || v > 2100) {
      faults.push({ what: 'implausible vintage', detail: String(v) });
    }
  }
  const claim = regionModel(root).model.source;
  if (!claim.includes(String(meta.population_vintage))) {
    faults.push({
      what: 'vintage disagreement',
      detail: 'the region model cites "' + claim + '" and the county file declares population vintage ' + meta.population_vintage
    });
  }
  if (!claim.includes(String(meta.rural_vintage))) {
    faults.push({
      what: 'vintage disagreement',
      detail: 'the region model cites "' + claim + '" and the county file declares rural vintage ' + meta.rural_vintage
    });
  }

  return { faults, records: rows.length, population, states: stateToPrefix.size, meta };
}

/* R70 + R307: an acronym key that is also a US state abbreviation.
 *
 * R307 landed and this list shrank from two to one, which is how it shows its
 * work. `PA` is gone from the glossary. It expanded to "Physician assistant"
 * and it never once fired: across all fourteen rendered pages, and across
 * every non-generated file in src/, the only bare `PA` was the entry itself
 * and the comments discussing this collision. The page that names the role
 * writes "Physician assistants" in full. So the entry carried a screen-reader
 * hazard for a hover that had no text to attach to, and deleting it removes
 * the hazard at its source rather than containing it. Same disposition as
 * `IV`, for the same reason.
 *
 * `VA` stays, because it is doing real work: four occurrences across the
 * health and legislation chapters, every one of them the Department of
 * Veterans Affairs and correctly expanded. It is contained rather than
 * removed, by the `data-no-acronyms` hosts on every surface that renders a
 * state code.
 *
 * This is a tripwire, not the fix. The glossary is where the hazard
 * originates, and it grows: `IN`, `OR`, `OK`, `ID`, `ME`, `HI`, `DE` and `MS`
 * are all expansions someone could add without ever thinking about a map. So
 * the collisions are pinned. A new one fails the build and lands on whoever
 * added it, rather than surfacing as Pennsylvania being read out as a job
 * title. Removing one also fails, which is what happened here. */
export const KNOWN_STATE_ACRONYM_COLLISIONS = ['VA'];

export function stateAcronymCollisions(root = REPO_ROOT): {
  collisions: string[]; unexpected: string[]; resolved: string[];
} {
  const names = regionModel(root).model.state_names;
  const collisions = stateCollisions(Object.keys(SITE_ACRONYMS), names);
  return {
    collisions,
    unexpected: collisions.filter((c) => !KNOWN_STATE_ACRONYM_COLLISIONS.includes(c)),
    resolved: KNOWN_STATE_ACRONYM_COLLISIONS.filter((c) => !collisions.includes(c))
  };
}

/* R62 [§S9a]: the three scenarios that stress unit cost, named, so §S9b
 * cannot deprecate `unitsCost` and leave them running while stressing
 * nothing.
 *
 * Measured before writing this. R60 (§S6b) already refuses an override keyed
 * to a parameter that does not exist, at module load, and it is the guard the
 * instruction table says covers this row. It does cover the naive case: strip
 * `unitsCost` out of PARAM_DEFS and the build throws with all three scenario
 * ids in the message.
 *
 * It does not cover the case Part 1 actually specifies. §1.2 says to "keep
 * the ID resolving to the new aggregate so nothing silently breaks", and the
 * moment `unitsCost` resolves to a shim, R60 is satisfied and the three
 * scenarios go on multiplying a number that no longer drives per-type cost.
 * SCN-UNIT-UNDER would still slow the ramp through `unitsRampMult` and still
 * appear in the catalog, while no longer raising cost at all -- which is the
 * one thing its name promises.
 *
 * So this is the second half of R60, aimed at the case R60 cannot see. It is
 * a build-time reader rather than an edit to scenarios.ts or params.ts:
 * neither file is §S9a's, and the tripwire does not need to live in them.
 *
 * Three conditions, each able to fail on its own:
 *
 *   1. exactly these three scenarios override `unitsCost`. A fourth appearing
 *      or one of them dropping it is a change to what the catalog stresses.
 *   2. each override still moves the number. A `mult` of 1 is an override
 *      that runs and does nothing, which is R60's silent-ignore failure
 *      wearing a different hat.
 *   3. `unitsCost` is still the single blended network parameter. Its label
 *      names the whole four-unit network; when §S9b replaces it with a
 *      per-type chain that label changes, and the failure carries the list of
 *      scenarios that have to migrate with it. */
export const UNITS_COST_STRESSORS = [
  'SCN-UNIT-UNDER', 'SCN-AI-FAIL', 'SCN-RURAL-STRESS'
];
const UNITS_COST_PARAM = 'unitsCost';
/* The label is the tell that it is still one blended parameter for the whole
   network. §S9b replaces the basis, so it replaces this. */
const UNITS_COST_BLENDED_LABEL = 'Four-unit diagnostic-treatment network';

export interface UnitsCostStressorDrift {
  where: string;
  says: string;
  expected: string;
}

export function unitsCostStressorDrift(): UnitsCostStressorDrift[] {
  const out: UnitsCostStressorDrift[] = [];
  const overriding = MODEL_SCENARIOS
    .filter((s) => Object.keys(s.overrides).indexOf(UNITS_COST_PARAM) >= 0)
    .map((s) => s.id);

  for (const id of UNITS_COST_STRESSORS) {
    if (overriding.indexOf(id) < 0) {
      out.push({
        where: id,
        says: 'no longer overrides ' + UNITS_COST_PARAM,
        expected: 'it stresses unit cost, or it stops claiming to'
      });
    }
  }
  for (const id of overriding) {
    if (UNITS_COST_STRESSORS.indexOf(id) < 0) {
      out.push({
        where: id,
        says: 'overrides ' + UNITS_COST_PARAM + ' and is not declared',
        expected: 'UNITS_COST_STRESSORS lists every scenario §S9b must migrate'
      });
    }
  }
  for (const id of overriding) {
    const override = SCENARIOS_BY_ID[id].overrides[UNITS_COST_PARAM] as
      { mult?: number; to?: [number, number, number] };
    if (override && override.mult === 1) {
      out.push({
        where: id,
        says: 'multiplies ' + UNITS_COST_PARAM + ' by 1',
        expected: 'an override that moves the number it names'
      });
    }
  }

  const param = PARAMS_BY_ID[UNITS_COST_PARAM];
  if (!param) {
    out.push({
      where: UNITS_COST_PARAM,
      says: 'the parameter is gone',
      expected: 'these three scenarios migrate in the same commit: ' +
        UNITS_COST_STRESSORS.join(', ')
    });
  } else if ((param.label || '').indexOf(UNITS_COST_BLENDED_LABEL) < 0) {
    out.push({
      where: UNITS_COST_PARAM + ' label',
      says: param.label || '(no label)',
      expected: 'still one blended network parameter, or these three ' +
        'scenarios migrate to the per-type chain: ' +
        UNITS_COST_STRESSORS.join(', ')
    });
  }

  return out;
}
