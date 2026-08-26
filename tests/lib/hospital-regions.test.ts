import { describe, expect, test } from 'vitest';

import {
  countyFileAudit, regionAssignmentReport, regionColoring, regionCountyAgreement,
  regionMethodologyDrift, regionSelection, scoreChartEncoding, stateAcronymCollisions,
  KNOWN_STATE_ACRONYM_COLLISIONS
} from '../../src/lib/manifest-check';
import {
  assignRegionColors, bestCount, colorClashes, fragmentationAnchor,
  regionAdjacency, regionAssignmentFaults, reweight, scoreBarFraction,
  selectionMargin, stateCollisions, weightedTotal, weightIntervals,
  REGION_PALETTE, WEIGHT_COMPONENTS,
  type Region, type RegionScore
} from '../../src/lib/hospital-regions';
import { regionModel, stateFeatureNames } from '../../src/lib/region-data';
import { countyMeta } from '../../src/lib/counties';

/* R70 R71 R72 R87 R88 R89 R90 R92 R190 R191 R192 R193 R211 R212 R213 [§S9c].
 *
 * The build's self-tests run every one of these against the shipped data, and
 * pass. What is here is the half the shipped data cannot exercise: the shape
 * of a failure, the boundary cases, and the two claims that are about the
 * ABSENCE of something and would otherwise be asserted by nothing. Every
 * expectation is a measured value or a constructed fixture, never a target. */

const MODEL = regionModel();
const SCORES = MODEL.model.tested_region_counts;
const WEIGHTS = MODEL.model.weights;

/* A three-candidate fixture with a component structure this repo's data does
   not have, so the functions are exercised outside the one dataset they ship
   against. */
function score(regions: number, pb: number, cp: number, rb: number, fr: number): RegionScore {
  const s = {
    regions, total: 0, population_balance: pb, compactness: cp,
    rural_balance: rb, fragmentation: fr
  };
  s.total = weightedTotal(s, WEIGHTS);
  return s;
}

function region(id: string, states: string[], population: number, rural: number): Region {
  return { id, name: id, states, population, rural_share: rural, centroid: [0, 0] };
}

describe('the objective reconstructs, and the selection follows from it', () => {
  test('every published total is the weighted sum of its four components', () => {
    for (const s of SCORES) {
      expect(weightedTotal(s, WEIGHTS)).toBeCloseTo(s.total, 12);
    }
  });

  test('the four weights pair with four distinct components', () => {
    expect(WEIGHT_COMPONENTS).toHaveLength(4);
    expect(new Set(WEIGHT_COMPONENTS.map(([w]) => w)).size).toBe(4);
    expect(new Set(WEIGHT_COMPONENTS.map(([, c]) => c)).size).toBe(4);
    expect(Object.keys(WEIGHTS).sort())
      .toEqual(WEIGHT_COMPONENTS.map(([w]) => w).slice().sort());
  });

  test('the declared winner is the one the components produce', () => {
    const r = regionSelection();
    expect(r.reconstructionFaults).toEqual([]);
    expect(r.computedWinner).toBe(r.declaredWinner);
    expect(r.declaredWinner).toBe(13);
  });

  test('bestCount breaks a tie toward the smaller count, as the model tool does', () => {
    const flat = [score(10, 1, 1, 1, 0), score(11, 1, 1, 1, 0), score(12, 1, 1, 1, 0)];
    expect(bestCount(flat, WEIGHTS)).toBe(10);
  });

  test('reweight moves one weight and keeps the four summing to 1', () => {
    for (const v of [0, 0.25, 0.5, 1]) {
      const w = reweight(WEIGHTS, 'rural_workload', v);
      expect(w.rural_workload).toBeCloseTo(v, 12);
      expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      /* the other three keep their ratios to each other -- except at v = 1,
         where all three are legitimately zero and the ratio is undefined */
      if (v < 1) {
        expect(w.population_scale / w.geographic_compactness)
          .toBeCloseTo(WEIGHTS.population_scale / WEIGHTS.geographic_compactness, 12);
      } else {
        expect(w.population_scale).toBe(0);
        expect(w.geographic_compactness).toBe(0);
      }
    }
  });
});

describe('R87 R211 -- what decides thirteen', () => {
  /* The headline of the section, pinned. If a later change makes 13 robust,
     this fails and the page's paragraph has to be rewritten -- which is the
     right outcome, because the page would then be saying something false. */
  test('the two 15% terms are fragile and the two larger ones are not', () => {
    const by = Object.fromEntries(
      weightIntervals(SCORES, WEIGHTS, 13).map((i) => [i.weight, i]));
    expect(by.population_scale.fragile).toBe(false);
    expect(by.geographic_compactness.fragile).toBe(false);
    expect(by.rural_workload.fragile).toBe(true);
    expect(by.administrative_fragmentation.fragile).toBe(true);
    /* measured bounds, to the sweep's own resolution */
    expect(by.rural_workload.high).toBeCloseTo(0.195, 3);
    expect(by.administrative_fragmentation.low).toBeCloseTo(0.11, 3);
  });

  test('zeroing the fragmentation weight selects a different count', () => {
    expect(bestCount(SCORES, reweight(WEIGHTS, 'administrative_fragmentation', 0)))
      .not.toBe(13);
  });

  test('the fragmentation term is a parabola centred on the selected count', () => {
    const a = fragmentationAnchor(SCORES);
    expect(a).not.toBeNull();
    expect(a!.anchor).toBe(13);
    expect(a!.coefficient).toBeCloseTo(0.04, 12);
    for (const s of SCORES) {
      expect(s.fragmentation).toBeCloseTo(0.04 * (s.regions - 13) ** 2, 12);
    }
  });

  test('a term that is not an anchored parabola is reported as none', () => {
    /* two zeros: no single anchor */
    expect(fragmentationAnchor([score(10, 1, 1, 1, 0), score(11, 1, 1, 1, 0)])).toBeNull();
    /* one zero, but the rest are not a squared distance from it */
    expect(fragmentationAnchor([
      score(10, 1, 1, 1, 0.5), score(11, 1, 1, 1, 0), score(12, 1, 1, 1, 0.1)
    ])).toBeNull();
  });

  test('the margin is over the best of the others, not the next count up', () => {
    const m = selectionMargin(SCORES, 13);
    expect(m.runnerUp).toBe(12);
    expect(m.marginPct).toBeCloseTo(3.2219, 3);
    /* 14 is nearer in count and much worse in score */
    expect(SCORES.find((s) => s.regions === 14)!.total)
      .toBeGreaterThan(SCORES.find((s) => s.regions === 12)!.total);
  });

  test('a margin against a count that was never scored throws', () => {
    expect(() => selectionMargin(SCORES, 99)).toThrow(/not among the scored candidates/);
  });
});

describe('R71 R190 -- the assigned-once claim', () => {
  test('the shipped data has no faults, against the rosters and the outlines', () => {
    const r = regionAssignmentReport();
    expect(r.faults).toEqual([]);
    expect(r.states).toBe(51);
    expect(r.features).toBe(51);
    expect(r.regions).toBe(13);
    expect(stateFeatureNames()).toHaveLength(51);
  });

  test('each of the five faults it exists to catch is caught', () => {
    const names = { AA: 'Aaa', BB: 'Bbb', CC: 'Ccc' };
    const two = [region('R1', ['AA', 'BB'], 1, 0), region('R2', ['BB', 'CC'], 1, 0)];
    expect(regionAssignmentFaults(two, names).map((f) => f.problem))
      .toContain('is in both R1 and R2');

    const none = [region('R1', ['AA'], 1, 0)];
    expect(regionAssignmentFaults(none, names).map((f) => f.state).sort())
      .toEqual(['BB', 'CC']);

    const alien = [region('R1', ['AA', 'ZZ'], 1, 0), region('R2', ['BB', 'CC'], 1, 0)];
    expect(regionAssignmentFaults(alien, names).map((f) => f.problem))
      .toContain('is in R1 and is not a state');

    const all = [region('R1', ['AA', 'BB', 'CC'], 1, 0)];
    expect(regionAssignmentFaults(all, names, ['Aaa', 'Bbb', 'Zzz'])
      .map((f) => f.problem))
      .toEqual(expect.arrayContaining([
        'is drawn and resolves to no abbreviation',
        'is assigned and is not drawn'
      ]));

    expect(regionAssignmentFaults(all, names, ['Aaa', 'Aaa', 'Bbb', 'Ccc'])
      .map((f) => f.problem)).toContain('is drawn twice');
  });

  test('a clean fixture produces no faults, so the fault list is not always non-empty', () => {
    const names = { AA: 'Aaa', BB: 'Bbb' };
    expect(regionAssignmentFaults(
      [region('R1', ['AA'], 1, 0), region('R2', ['BB'], 1, 0)], names, ['Aaa', 'Bbb']))
      .toEqual([]);
  });
});

describe('R72 R191 -- colour by adjacency', () => {
  const ADJ = regionAdjacency(MODEL.regions, MODEL.model.state_adjacency);

  test('the region graph is symmetric and nobody is isolated', () => {
    const c = regionColoring();
    expect(c.graphFaults).toEqual([]);
    expect(c.clashes).toEqual([]);
    expect(c.regions).toBe(13);
    expect(c.maxDegree).toBeGreaterThan(1);
  });

  test('thirteen regions still take all eight palette entries', () => {
    /* correctness is the first objective and legibility the second; a plain
       first-fit would be correct and would collapse onto four colours. */
    expect(regionColoring().distinctColors).toBe(REGION_PALETTE.length);
  });

  test('the colouring is deterministic', () => {
    const a = assignRegionColors(MODEL.regions, ADJ);
    const b = assignRegionColors(MODEL.regions, ADJ);
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
  });

  test('colorClashes finds a clash when it is there', () => {
    /* the property, against an assignment made some other way -- otherwise it
       is only ever checked against the producer that cannot violate it */
    const bad = new Map(MODEL.regions.map((r) => [r.id, 'var(--series-1)']));
    expect(colorClashes(ADJ, bad).length).toBeGreaterThan(0);
  });

  test('a palette too small for the graph throws rather than reusing a colour', () => {
    expect(() => assignRegionColors(MODEL.regions, ADJ, ['a', 'b']))
      .toThrow(/no colour left/);
  });

  test('the adjacency the model ships covers every assigned state', () => {
    const listed = Object.keys(MODEL.model.state_adjacency);
    for (const r of MODEL.regions) {
      for (const s of r.states) expect(listed).toContain(s);
    }
    /* and it is a symmetric relation between states, not just between regions */
    for (const [s, ns] of Object.entries(MODEL.model.state_adjacency)) {
      for (const n of ns) expect(MODEL.model.state_adjacency[n]).toContain(s);
    }
  });
});

describe('R192 -- the score chart encodes better as taller', () => {
  test('the selected candidate fills the axis and the worst sits at the floor', () => {
    const e = scoreChartEncoding();
    expect(e.ok).toBe(true);
    expect(e.tallest).toBe(e.selected);
    expect(e.selectedFraction).toBeCloseTo(1, 12);
  });

  test('the fraction runs 1 at the best score and 0 at the worst', () => {
    expect(scoreBarFraction(1, 1, 5)).toBe(1);
    expect(scoreBarFraction(5, 1, 5)).toBe(0);
    expect(scoreBarFraction(3, 1, 5)).toBeCloseTo(0.5, 12);
  });

  test('a flat set of candidates does not divide by zero', () => {
    expect(scoreBarFraction(2, 2, 2)).toBe(0);
    expect(Number.isFinite(scoreBarFraction(2, 2, 2))).toBe(true);
  });
});

describe('R88 R213 V18 -- the two files describe one country', () => {
  test('thirteen region populations and 3,144 county rows agree to the person', () => {
    const a = regionCountyAgreement();
    expect(a.perRegion).toEqual([]);
    expect(a.regionTotal).toBe(a.countyTotal);
    expect(a.regionTotal).toBe(340110988);
  });
});

describe('R90 R92 -- the county file', () => {
  test('it is internally consistent and declares its vintages', () => {
    const a = countyFileAudit();
    expect(a.faults).toEqual([]);
    expect(a.records).toBe(3144);
    expect(a.states).toBe(51);
    expect(a.population).toBe(340110988);
  });

  test('the vintages are the deliberate four-year gap, not an accident', () => {
    const m = countyMeta();
    expect(m.population_vintage).toBe(2024);
    expect(m.rural_vintage).toBe(2020);
    expect(m.population_vintage - m.rural_vintage).toBe(4);
    /* and the region model cites the same two years in its own prose */
    expect(MODEL.model.source).toContain(String(m.population_vintage));
    expect(MODEL.model.source).toContain(String(m.rural_vintage));
  });

  test('the declared totals are declared, not derived from the rows at read time', () => {
    /* if these were computed on load they could not disagree, and the check
       that compares them would be a tautology */
    const m = countyMeta();
    expect(m.records).toBe(3144);
    expect(m.population_total).toBe(340110988);
  });
});

describe('R70 -- an acronym key that is also a state', () => {
  test('the collisions are exactly the two that are recorded', () => {
    const c = stateAcronymCollisions();
    expect(c.unexpected).toEqual([]);
    expect(c.resolved).toEqual([]);
    expect(c.collisions).toEqual(['PA', 'VA']);
    expect(KNOWN_STATE_ACRONYM_COLLISIONS).toEqual(['PA', 'VA']);
  });

  test('stateCollisions asks the state table rather than naming two keys', () => {
    const names = { OR: 'Oregon', IN: 'Indiana' };
    expect(stateCollisions(['OR', 'CMS', 'IN'], names)).toEqual(['IN', 'OR']);
    expect(stateCollisions(['CMS', 'ICU'], names)).toEqual([]);
  });

  test('the units page module no longer expands PA', async () => {
    /* R70 asks for the vocabulary; the live fix is data-no-acronyms on the
       containers, because the site-wide glossary is a different file and
       still carries PA. Both halves matter, so both are asserted. */
    const src = await import('node:fs').then((fs) => fs.readFileSync(
      new URL('../../src/scripts/units-client.ts', import.meta.url), 'utf8'));
    /* the KEYS of the map, not the text of the file -- the comment above the
       map quotes the entry it removed, and a text search matches that. */
    const block = src.slice(src.indexOf('const ACRONYMS: Record<string, string> = {'));
    const keys = block.slice(0, block.indexOf('\n};'))
      .match(/^\s*'([A-Z]+)':/gm)!.map((k) => k.trim().slice(1, -2));
    expect(keys.length).toBeGreaterThan(10);
    expect(stateCollisions(keys, MODEL.model.state_names)).toEqual([]);
    /* the three containers that render bare state codes: the region detail
       line, the region tooltip, and the state allocation table's first
       column. The declaration is `stateCodeHost<T extends...`, so it is not
       one of these three matches. */
    expect(src.match(/stateCodeHost\(/g)).toHaveLength(3);
    expect(src).toContain("const ACRONYM_SAFE = 'data-no-acronyms'");
    /* and this module's own decorator honours it too, or the two decorators
       disagree about what counts as prose */
    expect(src).toMatch(/closest\('abbr[^']*\[' \+ ACRONYM_SAFE \+ '\]'\)/);
  });
});

describe('R87 R89 R211 -- the published methodology tracks the model', () => {
  test('the sweep, the margin, the coefficient and thirteen names all agree', () => {
    expect(regionMethodologyDrift()).toEqual([]);
  });
});
