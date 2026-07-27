/* =========================================================================
 * Cost-bridge waterfall chart: verbatim port of docs/js/charts.js
 * renderBridgeChart (lines 244-324). Rows step from the status-quo baseline
 * total to the NHA total; additions and savings between. Hand-rolled SVG.
 * ========================================================================= */
import { el, niceTicks, barPath, div, tipRow, showTip, hideTip, cssVar, legend } from './chart-util';
import { money, moneyShort, axis } from './format';

export interface BridgeStep {
  label: string;
  value: number;
  kind: 'total' | 'add' | 'sub';
}

interface BridgeRow {
  label: string;
  x0: number;
  x1: number;
  kind: 'total' | 'add' | 'sub';
  val: number;
}

export function renderBridgeChart(
  container: HTMLElement,
  steps: BridgeStep[],
  deflate: number
): void {
  container.innerHTML = '';
  const W = 860, rowH = 30, gap = 8, M = { l: 300, r: 96, t: 8, b: 30 };
  const H = M.t + steps.length * (rowH + gap) + M.b;

  /* running positions */
  let running = 0;
  const rows: BridgeRow[] = [];
  steps.forEach(function (s) {
    if (s.kind === 'total') {
      rows.push({ label: s.label, x0: 0, x1: s.value, kind: 'total', val: s.value });
      running = s.value;
    } else {
      const x0 = running, x1 = running + s.value;
      rows.push({
        label: s.label, x0: Math.min(x0, x1), x1: Math.max(x0, x1),
        kind: s.kind, val: s.value
      });
      running = x1;
    }
  });
  const xMax = Math.max.apply(null, rows.map(function (r) { return r.x1; })) * 1.05;
  const x = function (v: number): number { return M.l + (W - M.l - M.r) * (v * deflate / (xMax * deflate)); };

  const svg = el('svg', {
    viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img',
    'aria-label': 'Cost bridge from status quo baseline to National Health Assurance total at maturity'
  }, container);

  niceTicks(0, xMax * deflate, 5).forEach(function (tv) {
    const xv = M.l + (W - M.l - M.r) * (tv / (xMax * deflate));
    el('line', { x1: xv, x2: xv, y1: M.t, y2: H - M.b, class: 'gridline' }, svg);
    const t = el('text', { x: xv, y: H - 10, class: 'axis-text', 'text-anchor': 'middle' }, svg);
    t.textContent = axis(tv);
  });

  rows.forEach(function (r, i) {
    const yPos = M.t + i * (rowH + gap);
    const lab = el('text', { x: M.l - 10, y: yPos + rowH / 2 + 4, class: 'row-label', 'text-anchor': 'end' }, svg);
    lab.textContent = r.label;

    const color = r.kind === 'total' ? 'var(--total-bar)' :
      r.kind === 'add' ? 'var(--diverge-add)' : 'var(--diverge-sub)';
    const bx = x(r.x0), bw = Math.max(2, x(r.x1) - x(r.x0));
    const p = el('path', {
      d: barPath(bx, yPos + 3, bw, rowH - 6, 4, 'right'),
      fill: color, class: 'bar-mark', tabindex: 0
    }, svg);

    /* connector to next row */
    if (i < rows.length - 1) {
      const connectX = r.kind === 'sub' ? x(r.x0) : x(r.x1);
      el('line', {
        x1: connectX, x2: connectX, y1: yPos + rowH - 2,
        y2: yPos + rowH + gap + 4, class: 'connector'
      }, svg);
    }
    /* value label at the data end */
    const vLab = el('text', { x: x(r.x1) + 6, y: yPos + rowH / 2 + 4, class: 'value-label' }, svg);
    vLab.textContent = (r.kind === 'add' ? '+' : r.kind === 'sub' ? '−' : '') +
      moneyShort(Math.abs(r.val) * deflate);
    if (r.kind === 'sub') vLab.setAttribute('x', String(x(r.x1) + 6));

    function showBarTip(evt: { clientX: number; clientY: number }): void {
      const box = document.createElement('div');
      const head = div('tip-head', box); head.textContent = r.label;
      const pfx = r.kind === 'add' ? '+' : r.kind === 'sub' ? '−' : '';
      tipRow(box, color.indexOf('var') === 0 ? cssVar(color.slice(4, -1)) : color,
        r.kind === 'total' ? 'Total' : r.kind === 'add' ? 'Adds' : 'Saves',
        pfx + money(Math.abs(r.val) * deflate), true);
      showTip(box, evt.clientX, evt.clientY);
      p.classList.add('hover');
    }
    p.addEventListener('pointermove', function (e) { showBarTip(e as PointerEvent); });
    p.addEventListener('focus', function () {
      const rect = (p as unknown as Element).getBoundingClientRect();
      showBarTip({ clientX: rect.right, clientY: rect.top });
    });
    p.addEventListener('pointerleave', function () { hideTip(); p.classList.remove('hover'); });
    p.addEventListener('blur', function () { hideTip(); p.classList.remove('hover'); });
  });

  legend(container, [
    { color: 'var(--total-bar)', label: 'Totals' },
    { color: 'var(--diverge-add)', label: 'Cost additions' },
    { color: 'var(--diverge-sub)', label: 'Savings / offsets' }
  ]);
}
