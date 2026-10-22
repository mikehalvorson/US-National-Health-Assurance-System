/* =========================================================================
 * What the Quality chapter selects when a reader arrives.
 *
 * R223 [§S15]: the equation explorer and the catalog detail panel each hold a
 * selection. The explorer's view settings (scenario, group, phase) carry
 * between visits, by the owner's decision of 2026-10-07; the selections
 * reset on arrival. P21 first
 * reset the explorer's node to its group's default and the catalog to
 * KPP-A1. That made the two agree in the first group only: review 2 of P21
 * pointed out that a reader who left in any other group came back to an
 * explorer on that group's default node and a catalog on KPP-A1. The row
 * offered two fixes, resetting the node or syncing the catalog to it; this is
 * the second, applied on arrival. When the explorer's default node is a
 * catalog parameter the catalog opens on it too, so the panels agree in every
 * group. A default node that is not a parameter leaves the catalog on its own
 * default, which is the row's "or are both defaults".
 *
 * It lives here, not in quality-client.ts, because a client script touches
 * `document` as it is evaluated and so cannot be imported by a test.
 * ========================================================================= */
import { DIAGRAM_GROUPS, EQUATIONS } from './equations';
import { buildDiagram } from './equation-diagram';

/** The parameter the catalog opens on when nothing else decides. */
export const CATALOG_DEFAULT = 'KPP-A1';

/** The node the explorer opens on for a group: its first KPP, else its
    first member. */
export function defaultNodeFor(groupId: string): string | null {
  const group = DIAGRAM_GROUPS.filter(function (g) { return g.id === groupId; })[0];
  if (!group) return null;
  const kpps = group.members.filter(function (id) {
    const eq = EQUATIONS[id];
    return eq !== undefined && eq.kind === 'KPP';
  });
  return kpps[0] || group.members[0] || null;
}

export interface ArrivalSelection { eqNode: string | null; selectedId: string }

/** Both selections on arrival, for the group the explorer carries. */
export function arrivalSelection(groupId: string, isParameter: (id: string) => boolean): ArrivalSelection {
  const node = defaultNodeFor(groupId);
  return { eqNode: node, selectedId: node !== null && isParameter(node) ? node : CATALOG_DEFAULT };
}

/* =========================================================================
 * R250 [§S16]: which diagram a clicked node opens in.
 *
 * The click handler re-homed the diagram when the clicked node was an
 * equation in another group, through EQUATIONS[nodeId], which is undefined
 * for a leaf ('param:x', 'ramp:x', 'model:x'). The catalog panel renders an
 * inputs legend for whichever of the 130 metrics is selected, including one
 * outside the explorer's current group, and its leaf buttons share the
 * handler. Measured in the browser: with the explorer on "coverage", the
 * catalog on TPP-11.1 and its input param:itOperating clicked, the explorer
 * stayed on coverage, opened a panel for a node its diagram does not draw,
 * highlighted nothing, and showed no "Feeds" line at all. Counted over
 * every equation, leaf and other group, about half the clicks landed outside
 * the diagram on screen.
 *
 * The rule: stay if the current diagram draws the node; an equation goes to
 * its own group; a leaf goes to the group of the equation whose legend it was
 * clicked in, when that diagram draws it, and otherwise to the first group
 * whose diagram does. A node no diagram draws throws, naming itself: the
 * review of P22 found the first version fell back to the current group there,
 * which is the defect this exists to stop, kept for the one case nobody
 * tests. No such node exists; a test walks every one.
 * ========================================================================= */
/* Which groups' diagrams draw each node. Built once, at import, from
   constants, and never written again: not page state (src/scripts/README.md),
   because nothing a reader does can change it. */
const DRAWN_BY: Readonly<Record<string, readonly string[]>> = (function () {
  const out: Record<string, string[]> = {};
  DIAGRAM_GROUPS.forEach(function (g) {
    buildDiagram(g.members).nodes.forEach(function (n) {
      (out[n.id] = out[n.id] || []).push(g.id);
    });
  });
  return out;
})();

export function homeGroupFor(nodeId: string, currentGroup: string, contextEquation: string | null): string {
  const drawing = DRAWN_BY[nodeId] || [];
  if (drawing.indexOf(currentGroup) >= 0) return currentGroup;
  const eq = EQUATIONS[nodeId];
  if (eq) return eq.group;
  const ctx = contextEquation ? EQUATIONS[contextEquation] : undefined;
  if (ctx && drawing.indexOf(ctx.group) >= 0) return ctx.group;
  const first = drawing[0];
  if (first === undefined) {
    throw new Error('explorer-selection.ts: no diagram draws "' + nodeId + '", so a click on it has nowhere to open');
  }
  return first;
}
