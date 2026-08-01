/* Port of NHA.renderPathChart from docs/js/charts.js (lines 138-239).
 * Verbatim geometry/tick math and DOM wiring; typed for src/lib.
 *
 * Reconciliation note: the brief says "MonteCarloResult type from ./model",
 * but src/lib/model.ts does not re-export that type (it only imports it
 * internally from ./model-types). MonteCarloResult is imported here from
 * ./model-types, its actual export location, per the reconciliation rule
 * (do not invent an export that does not exist). */

import { el, div, niceTicks, showTip, hideTip, tipRow, cssVar, legend } from './chart-util';
import { money, moneyShort, axis } from './format';
import type { MonteCarloResult } from './model-types';

/** Clears `container` and draws the status-quo vs NHA percentile-band SVG. (charts.js:138-239) */
export function renderPathChart(container: HTMLElement, mc: MonteCarloResult, deflate: number): void {
  container.innerHTML = '';
  var years = mc.years;
  var base = mc.baseline.map(function (v) { return v * deflate; });
  var p50 = mc.yearBands.map(function (b) { return b.p50 * deflate; });
  var p10 = mc.yearBands.map(function (b) { return b.p10 * deflate; });
  var p90 = mc.yearBands.map(function (b) { return b.p90 * deflate; });

  var W = 860, H = 360, M = { l: 64, r: 118, t: 16, b: 34 };
  var iw = W - M.l - M.r, ih = H - M.t - M.b;
  var yMax = Math.max.apply(null, base.concat(p90)) * 1.06;
  var yMin = 0;
  var x = function (i: number): number { return M.l + iw * (i / (years.length - 1)); };
  var y = function (v: number): number { return M.t + ih * (1 - (v - yMin) / (yMax - yMin)); };

  var svg = el('svg', {
    viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img',
    'aria-label': 'Projected annual total health system cost, status quo versus National Health Assurance, 2027 to 2042'
  }, container) as unknown as SVGSVGElement;

  /* gridlines + y ticks */
  niceTicks(yMin, yMax, 5).forEach(function (tv) {
    el('line', { x1: M.l, x2: W - M.r, y1: y(tv), y2: y(tv), class: 'gridline' }, svg);
    var t = el('text', { x: M.l - 8, y: y(tv) + 4, class: 'axis-text', 'text-anchor': 'end' }, svg);
    t.textContent = axis(tv);
  });
  /* x ticks */
  years.forEach(function (yr, i) {
    if ((yr - years[0]) % 3 !== 0) return;
    var t = el('text', { x: x(i), y: H - 10, class: 'axis-text', 'text-anchor': 'middle' }, svg);
    t.textContent = String(yr);
  });
  el('line', { x1: M.l, x2: W - M.r, y1: y(0), y2: y(0), class: 'baseline-axis' }, svg);

  function lineD(vals: number[]): string {
    return vals.map(function (v, i) { return (i ? 'L' : 'M') + x(i) + ',' + y(v); }).join(' ');
  }
  /* uncertainty band */
  var bandD = p90.map(function (v, i) { return (i ? 'L' : 'M') + x(i) + ',' + y(v); }).join(' ') +
    p10.slice().reverse().map(function (v, j) {
      var i = p10.length - 1 - j; return ' L' + x(i) + ',' + y(v);
    }).join('') + ' Z';
  el('path', { d: bandD, fill: 'var(--series-1)', 'fill-opacity': '0.10', stroke: 'none' }, svg);

  el('path', { d: lineD(base), class: 'line', stroke: 'var(--baseline-series)' }, svg);
  el('path', { d: lineD(p50), class: 'line', stroke: 'var(--series-1)' }, svg);

  /* end markers + direct end labels */
  var li = years.length - 1;
  el('circle', { cx: x(li), cy: y(base[li]), r: 4, fill: 'var(--baseline-series)', class: 'marker' }, svg);
  el('circle', { cx: x(li), cy: y(p50[li]), r: 4, fill: 'var(--series-1)', class: 'marker' }, svg);
  var lblB = el('text', { x: x(li) + 10, y: y(base[li]) + 4, class: 'end-label' }, svg);
  lblB.textContent = 'Status quo ' + moneyShort(base[li]);
  var lblN = el('text', { x: x(li) + 10, y: y(p50[li]) + 4, class: 'end-label' }, svg);
  lblN.textContent = 'NHA ' + moneyShort(p50[li]);
  /* nudge labels apart if colliding */
  var byB = y(base[li]), byN = y(p50[li]);
  if (Math.abs(byB - byN) < 16) {
    var mid = (byB + byN) / 2;
    lblB.setAttribute('y', String(byB <= byN ? mid - 9 : mid + 13));
    lblN.setAttribute('y', String(byB <= byN ? mid + 13 : mid - 9));
  }

  /* crosshair + hover */
  var cross = el('line', { y1: M.t, y2: H - M.b, class: 'crosshair', style: 'display:none' }, svg);
  var hoverDots = [
    el('circle', { r: 5, fill: 'var(--baseline-series)', class: 'marker', style: 'display:none' }, svg),
    el('circle', { r: 5, fill: 'var(--series-1)', class: 'marker', style: 'display:none' }, svg)
  ];
  var hit = el('rect', { x: M.l, y: M.t, width: iw, height: ih, fill: 'transparent' }, svg);

  function onMove(evt: PointerEvent): void {
    var pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    var loc = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    var i = Math.round((loc.x - M.l) / iw * (years.length - 1));
    i = Math.max(0, Math.min(years.length - 1, i));
    cross.setAttribute('x1', String(x(i))); cross.setAttribute('x2', String(x(i)));
    cross.style.display = '';
    hoverDots[0].setAttribute('cx', String(x(i))); hoverDots[0].setAttribute('cy', String(y(base[i])));
    hoverDots[1].setAttribute('cx', String(x(i))); hoverDots[1].setAttribute('cy', String(y(p50[i])));
    hoverDots.forEach(function (d) { d.style.display = ''; });

    var box = document.createElement('div');
    var head = div('tip-head', box); head.textContent = String(years[i]);
    tipRow(box, cssVar('--series-1') || '#2a78d6', 'NHA (median)', money(p50[i]), true);
    tipRow(box, '', '80% range', moneyShort(p10[i]) + ' – ' + moneyShort(p90[i]), false);
    tipRow(box, cssVar('--baseline-series') || '#898781', 'Status quo', money(base[i]), true);
    var dlt = p50[i] - base[i];
    tipRow(box, '', 'NHA vs status quo', (dlt >= 0 ? '+' : '−') + moneyShort(Math.abs(dlt)), false);
    showTip(box, evt.clientX, evt.clientY);
  }
  hit.addEventListener('pointermove', onMove);
  hit.addEventListener('pointerleave', function () {
    cross.style.display = 'none';
    hoverDots.forEach(function (d) { d.style.display = 'none'; });
    hideTip();
  });

  legend(container, [
    { color: 'var(--series-1)', label: 'National Health Assurance (median, with 10th–90th pct band)', line: true },
    { color: 'var(--baseline-series)', label: 'Status quo (CMS-trajectory baseline)', line: true }
  ]);
}
