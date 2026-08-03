/* =========================================================================
 * Equation flow diagram: a layered, traversable directed graph rendered as
 * hand-rolled SVG. Nodes flow left to right (inputs -> indices -> TPPs ->
 * KPPs); every node is clickable/focusable and the caller receives the
 * selected node id. KPPs sit in the rightmost layer unless they feed
 * another equation in the same diagram. No chart library.
 * ========================================================================= */
import { EQUATIONS, collectDeps, RAMP_META, MODEL_META } from './equations';
import type { RampId, ModelId } from './equations';
import { PARAMS_BY_ID } from './params';

export type DiagNodeType = 'param' | 'ramp' | 'model' | 'const' | 'index' | 'TPP' | 'KPP' | 'ext';

export interface DiagNode {
  id: string;          /* unique node id, e.g. 'KPP-A1', 'param:drugPriceCut' */
  refId: string;       /* underlying id (param id, ramp id, equation id) */
  type: DiagNodeType;
  label: string;
  layer: number;
  slot: number;
}
export interface DiagEdge { from: string; to: string; }
export interface Diagram { nodes: DiagNode[]; edges: DiagEdge[]; layers: number; }

const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(tag: string): SVGElement {
  return document.createElementNS(SVG_NS, tag) as SVGElement;
}

export function buildDiagram(members: string[]): Diagram {
  const inGroup: Record<string, boolean> = {};
  members.forEach(function (id) { inGroup[id] = true; });
  const nodes: Record<string, DiagNode> = {};
  const edges: DiagEdge[] = [];
  const edgeSeen: Record<string, boolean> = {};

  function addNode(id: string, refId: string, type: DiagNodeType, label: string): void {
    if (!nodes[id]) nodes[id] = { id: id, refId: refId, type: type, label: label, layer: 0, slot: 0 };
  }
  function addEdge(from: string, to: string): void {
    const key = from + '>' + to;
    if (edgeSeen[key]) return;
    edgeSeen[key] = true;
    edges.push({ from: from, to: to });
  }

  members.forEach(function (id) {
    const d = EQUATIONS[id];
    if (!d) return;
    addNode(id, id, d.kind === 'index' ? 'index' : d.kind, d.name);
    const deps = collectDeps(d.expr);
    deps.params.forEach(function (pid) {
      const def = PARAMS_BY_ID[pid];
      addNode('param:' + pid, pid, 'param', (def && def.label) || pid);
      addEdge('param:' + pid, id);
    });
    deps.ramps.forEach(function (rid) {
      addNode('ramp:' + rid, rid, 'ramp', RAMP_META[rid as RampId].label);
      addEdge('ramp:' + rid, id);
    });
    deps.models.forEach(function (mid) {
      addNode('model:' + mid, mid, 'model', MODEL_META[mid as ModelId].label);
      addEdge('model:' + mid, id);
    });
    deps.refs.forEach(function (rid) {
      if (!nodes[rid]) {
        const rd = EQUATIONS[rid];
        addNode(rid, rid, inGroup[rid] && rd ? (rd.kind === 'index' ? 'index' : rd.kind) : 'ext',
          rd ? rd.name : rid);
      }
      addEdge(rid, id);
    });
  });

  /* ---- layering: longest path from the leaves --------------------------- */
  const ids = Object.keys(nodes);
  const preds: Record<string, string[]> = {};
  const succs: Record<string, string[]> = {};
  ids.forEach(function (id) { preds[id] = []; succs[id] = []; });
  edges.forEach(function (e) { preds[e.to].push(e.from); succs[e.from].push(e.to); });

  const layerMemo: Record<string, number> = {};
  function layerOf(id: string, seen: Record<string, boolean>): number {
    if (layerMemo[id] !== undefined) return layerMemo[id];
    if (seen[id]) return 0;
    seen[id] = true;
    let L = 0;
    preds[id].forEach(function (p2) { L = Math.max(L, layerOf(p2, seen) + 1); });
    seen[id] = false;
    layerMemo[id] = L;
    return L;
  }
  ids.forEach(function (id) { nodes[id].layer = layerOf(id, {}); });

  let maxLayer = 0;
  ids.forEach(function (id) { maxLayer = Math.max(maxLayer, nodes[id].layer); });
  /* KPPs with no dependents in this diagram go to the far right */
  ids.forEach(function (id) {
    if (nodes[id].type === 'KPP' && succs[id].length === 0) nodes[id].layer = maxLayer;
  });

  /* ---- vertical slots: barycenter of predecessors ----------------------- */
  const byLayer: Record<number, DiagNode[]> = {};
  ids.forEach(function (id) {
    const L = nodes[id].layer;
    (byLayer[L] = byLayer[L] || []).push(nodes[id]);
  });
  for (let L = 0; L <= maxLayer; L++) {
    const list = byLayer[L] || [];
    list.sort(function (a, b) {
      function bary(nd: DiagNode): number {
        const ps = preds[nd.id].map(function (p2) { return nodes[p2].slot; });
        if (!ps.length) return nd.type === 'param' ? 100 : 50; /* params low, ramps high */
        return ps.reduce(function (x, y) { return x + y; }, 0) / ps.length;
      }
      const d = bary(a) - bary(b);
      return d !== 0 ? d : a.id.localeCompare(b.id, undefined, { numeric: true });
    });
    list.forEach(function (nd, i) { nd.slot = i; });
  }

  return { nodes: ids.map(function (id) { return nodes[id]; }), edges: edges, layers: maxLayer + 1 };
}

/* ---- SVG rendering ------------------------------------------------------ */
const NODE_W = 138, NODE_H = 42, GAP_X = 54, GAP_Y = 12, PAD = 14;

function nodeXY(n: DiagNode): { x: number; y: number } {
  return { x: PAD + n.layer * (NODE_W + GAP_X), y: PAD + n.slot * (NODE_H + GAP_Y) };
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : s;
}

export function renderDiagram(
  container: HTMLElement,
  diagram: Diagram,
  selectedId: string | null,
  onSelect: (nodeId: string) => void
): void {
  container.innerHTML = '';
  let maxSlot = 0;
  diagram.nodes.forEach(function (n) { maxSlot = Math.max(maxSlot, n.slot); });
  const W = PAD * 2 + diagram.layers * NODE_W + (diagram.layers - 1) * GAP_X;
  const H = PAD * 2 + (maxSlot + 1) * NODE_H + maxSlot * GAP_Y;

  const svg = svgEl('svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('width', String(W));
  svg.setAttribute('height', String(H));
  svg.setAttribute('class', 'eqd-svg');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', 'Equation flow diagram; nodes are selectable');

  const byId: Record<string, DiagNode> = {};
  diagram.nodes.forEach(function (n) { byId[n.id] = n; });

  /* edges first (under the nodes) */
  const edgeLayer = svgEl('g');
  diagram.edges.forEach(function (e) {
    const a = nodeXY(byId[e.from]), b = nodeXY(byId[e.to]);
    const x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2;
    const x2 = b.x, y2 = b.y + NODE_H / 2;
    const mx = (x1 + x2) / 2;
    const path = svgEl('path');
    path.setAttribute('d', 'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2);
    let cls = 'eqd-edge';
    if (selectedId && (e.from === selectedId || e.to === selectedId)) cls += ' is-active';
    path.setAttribute('class', cls);
    edgeLayer.appendChild(path);
  });
  svg.appendChild(edgeLayer);

  diagram.nodes.forEach(function (n) {
    const pos = nodeXY(n);
    const g = svgEl('g');
    let cls = 'eqd-node eqd-' + n.type.toLowerCase();
    if (n.id === selectedId) cls += ' is-selected';
    g.setAttribute('class', cls);
    g.setAttribute('transform', 'translate(' + pos.x + ',' + pos.y + ')');
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('data-node-id', n.id);
    g.setAttribute('aria-label', n.refId + ': ' + n.label);
    g.setAttribute('aria-pressed', n.id === selectedId ? 'true' : 'false');

    const rect = svgEl('rect');
    rect.setAttribute('width', String(NODE_W));
    rect.setAttribute('height', String(NODE_H));
    rect.setAttribute('rx', '8');
    g.appendChild(rect);

    const isLeaf = n.type === 'param' || n.type === 'ramp' || n.type === 'model';
    const t1 = svgEl('text');
    t1.setAttribute('x', '8');
    t1.setAttribute('y', '17');
    const t2 = svgEl('text');
    t2.setAttribute('x', '8');
    t2.setAttribute('y', '31');
    if (isLeaf) {
      /* leaf inputs: the label wrapped over two lines */
      t1.setAttribute('class', 'eqd-name');
      t2.setAttribute('class', 'eqd-name');
      const words = n.label.split(' ');
      let line1 = '';
      let i = 0;
      while (i < words.length && (line1 + ' ' + words[i]).trim().length <= 24) {
        line1 = (line1 + ' ' + words[i]).trim();
        i++;
      }
      t1.textContent = line1 || truncate(n.label, 24);
      t2.textContent = truncate(words.slice(i).join(' '), 24);
    } else {
      t1.setAttribute('class', 'eqd-id');
      t1.textContent = n.refId;
      t2.setAttribute('class', 'eqd-name');
      t2.textContent = truncate(n.label, 26);
    }
    g.appendChild(t1);
    g.appendChild(t2);

    const title = svgEl('title');
    title.textContent = n.refId + ': ' + n.label;
    g.appendChild(title);

    g.addEventListener('click', function () { onSelect(n.id); });
    g.addEventListener('keydown', function (ev) {
      const key = (ev as KeyboardEvent).key;
      if (key === 'Enter' || key === ' ') {
        ev.preventDefault();
        onSelect(n.id);
      }
    });
    svg.appendChild(g);
  });

  container.appendChild(svg);
}
