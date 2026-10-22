import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { collectDeps, DIAGRAM_GROUPS, EQUATIONS } from '../../src/lib/equations';
import { buildDiagram } from '../../src/lib/equation-diagram';
import { QUALITY_DATA } from '../../src/lib/quality';
import {
  arrivalSelection, CATALOG_DEFAULT, defaultNodeFor, homeGroupFor
} from '../../src/lib/explorer-selection';
import { maskComments } from '../../src/lib/manifest-check';

/* =========================================================================
 * R223 [§S15], the row's declared test: "after navigation, selectedId and
 * eqNode refer to the same parameter or are both defaults".
 *
 * Review 2 of P21 found P21's fix met that only through "or are both
 * defaults": in every group but the first, a return visit put the explorer on
 * the group's default node and the catalog on KPP-A1. These hold the arrival
 * decision to "the same parameter whenever the explorer's node is one", for
 * every group the explorer offers, with the same predicate the client uses.
 * ========================================================================= */

const isParameter = (id: string): boolean =>
  !!EQUATIONS[id] && QUALITY_DATA.parameters.some((p) => p.id === id);

test('on arrival, the explorer and the catalog select the same parameter in every group', () => {
  expect(DIAGRAM_GROUPS.length).toBeGreaterThan(1);
  for (const group of DIAGRAM_GROUPS) {
    const arrival = arrivalSelection(group.id, isParameter);
    expect(arrival.eqNode, group.id).toBe(defaultNodeFor(group.id));
    if (arrival.eqNode !== null && isParameter(arrival.eqNode)) {
      expect(arrival.selectedId, group.id).toBe(arrival.eqNode);
    } else {
      expect(arrival.selectedId, group.id).toBe(CATALOG_DEFAULT);
    }
  }
});

test('the first group still opens both panels where they always opened', () => {
  /* the page measured explorer KPP-A1, catalog KPP-A1 on a fresh load */
  const first = DIAGRAM_GROUPS[0];
  expect(first).toBeDefined();
  expect(arrivalSelection(first?.id ?? '', isParameter)).toEqual({ eqNode: 'KPP-A1', selectedId: 'KPP-A1' });
});

test('initQuality takes both selections from the arrival decision', () => {
  /* The client cannot be imported by a test, so the wiring is read from its
     source with comments masked: both resets must come from one call. */
  const src = maskComments(readFileSync(
    fileURLToPath(new URL('../../src/scripts/quality-client.ts', import.meta.url)), 'utf8'));
  const init = /function initQuality\(\): void \{([\s\S]*?)\n\}/.exec(src);
  expect(init, 'initQuality not found').toBeTruthy();
  const body = init?.[1] ?? '';
  const call = /const (\w+) = arrivalSelection\(eqGroup,/.exec(body);
  expect(call, 'initQuality does not ask arrivalSelection').toBeTruthy();
  const name = call?.[1] ?? '';
  expect(body).toContain('selectedId = ' + name + '.selectedId;');
  expect(body).toContain('eqNode = ' + name + '.eqNode;');
});

/* R250 [§S16]: a leaf clicked in the catalog panel's legend opened a detail
   panel for a node the diagram beside it did not draw, with nothing
   highlighted and no "Feeds" line. Reproduced in the browser with the
   explorer on coverage and param:itOperating clicked from TPP-11.1's legend. */
describe('R250: a clicked node opens in a diagram that draws it', () => {
  const diagramOf = (group: string) =>
    buildDiagram(DIAGRAM_GROUPS.find((g) => g.id === group)!.members);

  test('the reproduced case moves to the legend\'s own diagram', () => {
    const home = homeGroupFor('param:itOperating', 'coverage', 'TPP-11.1');
    expect(home).toBe(EQUATIONS['TPP-11.1']!.group);
    expect(diagramOf(home).nodes.some((n) => n.id === 'param:itOperating')).toBe(true);
  });

  test('a node the current diagram already draws does not move it', () => {
    const coverage = diagramOf('coverage');
    const shared = coverage.nodes.find((n) => n.type === 'ramp')!;
    expect(homeGroupFor(shared.id, 'coverage', 'TPP-11.1')).toBe('coverage');
  });

  test('every leaf of every equation, from every starting group, lands where it is drawn and feeds something', () => {
    let checked = 0;
    for (const id of Object.keys(EQUATIONS)) {
      const deps = collectDeps(EQUATIONS[id]!.expr);
      const leaves = deps.params.map((p) => 'param:' + p)
        .concat(deps.ramps.map((r) => 'ramp:' + r), deps.models.map((m) => 'model:' + m));
      for (const g of DIAGRAM_GROUPS) {
        for (const leaf of leaves) {
          const d = diagramOf(homeGroupFor(leaf, g.id, id));
          expect(d.nodes.some((n) => n.id === leaf), leaf + ' from ' + g.id).toBe(true);
          expect(d.edges.some((e) => e.from === leaf), leaf + ' feeds nothing').toBe(true);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  test('a leaf drawn in several diagrams opens in the one whose legend it was clicked in', () => {
    /* The cases where "the first diagram that draws it" and "the clicked
       legend's diagram" differ; without them the preference is untested,
       which the first mutation run of this test showed. */
    let cases = 0;
    for (const id of Object.keys(EQUATIONS)) {
      const own = EQUATIONS[id]!.group;
      for (const p of collectDeps(EQUATIONS[id]!.expr).params) {
        const leaf = 'param:' + p;
        const drawing = DIAGRAM_GROUPS.filter((g) => diagramOf(g.id).nodes.some((n) => n.id === leaf));
        if (drawing.length < 2 || drawing[0]!.id === own) continue;
        const start = DIAGRAM_GROUPS.find((g) => !drawing.some((d) => d.id === g.id));
        if (!start) continue;
        expect(homeGroupFor(leaf, start.id, id), leaf + ' clicked in ' + id).toBe(own);
        cases++;
      }
    }
    expect(cases).toBeGreaterThan(0);
  });

  test('an equation node opens in its own group from anywhere', () => {
    for (const id of Object.keys(EQUATIONS)) {
      for (const g of DIAGRAM_GROUPS) {
        const home = homeGroupFor(id, g.id, null);
        expect(diagramOf(home).nodes.some((n) => n.id === id), id + ' from ' + g.id).toBe(true);
      }
    }
  });
});

/* Review of P22: the first version fell back to the current group for a node
   no diagram draws, which is R250's defect kept for the untested case. */
test('R250: a node no diagram draws throws instead of staying put', () => {
  expect(() => homeGroupFor('param:noSuchParameter', 'coverage', 'TPP-11.1'))
    .toThrow(/no diagram draws "param:noSuchParameter"/);
});
