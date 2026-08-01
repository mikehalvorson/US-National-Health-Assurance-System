/* =========================================================================
 * Benchmark interval chart: verbatim port of docs/js/charts.js
 * renderBenchmarkChart (lines 390-440). Rows of value ranges (lo..hi) with an
 * optional central marker, on a shared axis. Hand-rolled SVG; no framework.
 * ========================================================================= */
import { el, niceTicks, barPath, div, tipRow, showTip, hideTip } from './chart-util';
import { money, moneyShort, axis } from './format';

export interface BenchmarkRow {
  label: string;
  lo: number;
  hi: number;
  mid?: number;
  color: string;
  note?: string;
}

export interface BenchmarkOpts {
  aria?: string;
}

export function renderBenchmarkChart(
  container: HTMLElement,
  rows: BenchmarkRow[],
  opts?: BenchmarkOpts
): void {
  container.innerHTML = '';
  const W = 860, rowH = 42, M = { l: 320, r: 60, t: 10, b: 32 };
  const H = M.t + rows.length * rowH + M.b;
  let lo = Math.min.apply(null, rows.map(function (r) { return r.lo; }));
  let hi = Math.max.apply(null, rows.map(function (r) { return r.hi; }));
  const pad = (hi - lo) * 0.08 || 1;
  lo = Math.min(0, lo - pad); hi = hi + pad;
  const x = function (v: number): number { return M.l + (W - M.l - M.r) * ((v - lo) / (hi - lo)); };

  const svg = el('svg', {
    viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img',
    'aria-label': (opts && opts.aria) || 'Benchmark comparison'
  }, container);

  niceTicks(lo, hi, 5).forEach(function (tv) {
    el('line', { x1: x(tv), x2: x(tv), y1: M.t, y2: H - M.b, class: 'gridline' }, svg);
    const t = el('text', { x: x(tv), y: H - 10, class: 'axis-text', 'text-anchor': 'middle' }, svg);
    t.textContent = axis(tv);
  });
  if (lo < 0 && hi > 0) el('line', { x1: x(0), x2: x(0), y1: M.t, y2: H - M.b, class: 'baseline-axis' }, svg);

  rows.forEach(function (r, i) {
    const cy = M.t + i * rowH + rowH / 2;
    const lab = el('text', { x: M.l - 10, y: cy - 2, class: 'row-label', 'text-anchor': 'end' }, svg);
    lab.textContent = r.label;
    if (r.note) {
      const nt = el('text', { x: M.l - 10, y: cy + 12, class: 'row-note', 'text-anchor': 'end' }, svg);
      nt.textContent = r.note;
    }
    const g = el('g', { class: 'bench-row', tabindex: 0 }, svg);
    el('path', {
      d: barPath(x(r.lo), cy - 5, Math.max(2, x(r.hi) - x(r.lo)), 10, 4, 'right'),
      fill: r.color, 'fill-opacity': 0.35
    }, g);
    if (r.mid != null) {
      el('circle', { cx: x(r.mid), cy: cy, r: 5, fill: r.color, class: 'marker' }, g);
    }
    function tipIt(evt: { clientX: number; clientY: number }): void {
      const box = document.createElement('div');
      const head = div('tip-head', box); head.textContent = r.label;
      if (r.mid != null) tipRow(box, r.color, 'central', money(r.mid), true);
      tipRow(box, '', 'range', moneyShort(r.lo) + ' – ' + moneyShort(r.hi), false);
      if (r.note) tipRow(box, '', '', r.note, false);
      showTip(box, evt.clientX, evt.clientY);
    }
    g.addEventListener('pointermove', function (e) { tipIt(e as PointerEvent); });
    g.addEventListener('pointerleave', hideTip);
  });
}
