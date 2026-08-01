/* =========================================================================
 * Money-flow (Sankey-style) diagram: verbatim port of docs/js/charts.js
 * renderFlowDiagram (lines 452-531). Sources on the left, channels on the
 * right, ribbons proportional to their value. No framework; hand-rolled SVG.
 * ========================================================================= */
import { el, div, tipRow, showTip, hideTip } from './chart-util';
import { money, moneyShort } from './format';

export interface FlowNode {
  id: string;
  label: string;
  value: number;
  color?: string;
}

export interface FlowRibbon {
  from: string;
  to: string;
  value: number;
  note?: string;
}

export interface FlowSpec {
  sources: FlowNode[];
  channels: FlowNode[];
  ribbons: FlowRibbon[];
  aria?: string;
}

interface LaidOutNode {
  y0: number;
  y1: number;
  used: number;
  node: FlowNode;
}

export function renderFlowDiagram(container: HTMLElement, spec: FlowSpec): void {
  container.innerHTML = '';
  const W = 430, H = 330;
  const M = { t: 8, b: 8 };
  const LX = 148, RX = 282, BW = 14; // node-bar x positions and width
  const GAP = 5; // px gap between node bars

  function layout(nodes: FlowNode[]): Record<string, LaidOutNode> {
    const sum = nodes.reduce(function (a, n) { return a + n.value; }, 0);
    const avail = H - M.t - M.b - GAP * (nodes.length - 1);
    let y = M.t;
    const out: Record<string, LaidOutNode> = {};
    nodes.forEach(function (n) {
      const h = Math.max(3, avail * n.value / sum);
      out[n.id] = { y0: y, y1: y + h, used: 0, node: n };
      y += h + GAP;
    });
    return out;
  }
  const L = layout(spec.sources), R = layout(spec.channels);

  const svg = el('svg', {
    viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg',
    role: 'img', 'aria-label': spec.aria || 'Money flow diagram'
  }, container);

  /* ribbons first (under the bars) */
  spec.ribbons.forEach(function (rb) {
    const s = L[rb.from], t = R[rb.to];
    if (!s || !t) return;
    const sh = (s.y1 - s.y0) * rb.value / s.node.value;
    const th = (t.y1 - t.y0) * rb.value /
      spec.ribbons.filter(function (x) { return x.to === rb.to; })
        .reduce(function (a, x) { return a + x.value; }, 0);
    const sy0 = s.y0 + s.used, sy1 = sy0 + sh;
    const ty0 = t.y0 + t.used, ty1 = ty0 + th;
    s.used += sh; t.used += th;
    const x0 = LX + BW, x1 = RX, mid = (x0 + x1) / 2;
    const d = 'M' + x0 + ' ' + sy0 +
      ' C' + mid + ' ' + sy0 + ' ' + mid + ' ' + ty0 + ' ' + x1 + ' ' + ty0 +
      ' L' + x1 + ' ' + ty1 +
      ' C' + mid + ' ' + ty1 + ' ' + mid + ' ' + sy1 + ' ' + x0 + ' ' + sy1 + ' Z';
    const band = el('path', {
      d: d, fill: s.node.color || '', 'fill-opacity': 0.30,
      class: 'flow-ribbon', tabindex: 0
    }, svg);
    function tipIt(evt: { clientX: number; clientY: number }): void {
      const box = document.createElement('div');
      div('tip-head', box).textContent = s.node.label + ' → ' + t.node.label;
      tipRow(box, s.node.color || '', '', money(rb.value) + '/yr', true);
      if (rb.note) tipRow(box, '', '', rb.note, false);
      showTip(box, evt.clientX, evt.clientY);
    }
    band.addEventListener('pointermove', function (e) { tipIt(e as PointerEvent); });
    band.addEventListener('focus', function () {
      const r = (band as unknown as Element).getBoundingClientRect();
      tipIt({ clientX: r.right, clientY: r.top });
    });
    band.addEventListener('pointerleave', hideTip);
    band.addEventListener('blur', hideTip);
  });

  /* node bars + labels */
  Object.keys(L).forEach(function (k) {
    const n = L[k];
    el('rect', {
      x: LX, y: n.y0, width: BW, height: n.y1 - n.y0, rx: 3,
      fill: n.node.color || ''
    }, svg);
    const lab = el('text', {
      x: LX - 8, y: (n.y0 + n.y1) / 2 - 2,
      class: 'row-label', 'text-anchor': 'end'
    }, svg);
    lab.textContent = n.node.label;
    const val = el('text', {
      x: LX - 8, y: (n.y0 + n.y1) / 2 + 12,
      class: 'row-note', 'text-anchor': 'end'
    }, svg);
    val.textContent = moneyShort(n.node.value);
  });
  Object.keys(R).forEach(function (k) {
    const n = R[k];
    el('rect', {
      x: RX, y: n.y0, width: BW, height: n.y1 - n.y0, rx: 3,
      fill: 'var(--total-bar)'
    }, svg);
    const lab = el('text', {
      x: RX + BW + 8, y: (n.y0 + n.y1) / 2 - 2,
      class: 'row-label'
    }, svg);
    lab.textContent = n.node.label;
    const val = el('text', {
      x: RX + BW + 8, y: (n.y0 + n.y1) / 2 + 12,
      class: 'row-note'
    }, svg);
    val.textContent = moneyShort(n.node.value);
  });
}
