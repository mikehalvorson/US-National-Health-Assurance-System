/* =========================================================================
 * Financing waterfall chart: verbatim port of docs/js/charts.js
 * renderFinancingChart (lines 329-385). A stacked bar of funding segments
 * plus a wealth-tax-vs-gap comparison. Hand-rolled SVG; no framework.
 * ========================================================================= */
import { el, barPath, tipRow, showTip, hideTip, legend } from './chart-util';
import { money, moneyShort, pct } from './format';

export interface FinancingSegment {
  label: string;
  value: number;
  color: string;
}

export interface FinancingSpec {
  segments: FinancingSegment[];
  gap: { label: string; value: number };
  wealth: { label: string; value: number };
}

export function renderFinancingChart(
  container: HTMLElement,
  fin: FinancingSpec,
  deflate: number
): void {
  container.innerHTML = '';
  const W = 860, H = 190, M = { l: 8, r: 8, t: 24, b: 8 };
  const total = fin.segments.reduce(function (s, seg) { return s + seg.value; }, 0);
  const svg = el('svg', {
    viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img',
    'aria-label': 'How the mature National Health Assurance public cost is financed'
  }, container);

  const barY = M.t + 10, barH = 24, iw = W - M.l - M.r;
  let xCur = M.l;
  const head = el('text', { x: M.l, y: M.t - 4, class: 'row-label' }, svg);
  head.textContent = 'Mature-year public cost ' + money(total * deflate) + ', funded by:';

  fin.segments.forEach(function (seg, i) {
    const w = iw * seg.value / total;
    const isLast = i === fin.segments.length - 1;
    const p = el('path', {
      d: isLast ? barPath(xCur, barY, Math.max(0, w - 0), barH, 4, 'right')
        : 'M' + xCur + ',' + barY + ' h' + Math.max(0, w - 2) + ' v' + barH + ' h-' + Math.max(0, w - 2) + 'Z',
      fill: seg.color, class: 'bar-mark', tabindex: 0
    }, svg);
    /* inline label only if it comfortably fits */
    const labelText = seg.label + '  ' + moneyShort(seg.value * deflate);
    if (w > labelText.length * 7 + 16) {
      const t = el('text', { x: xCur + 8, y: barY + barH / 2 + 4, class: 'inbar-label' }, svg);
      t.textContent = labelText;
    }
    function tipIt(evt: { clientX: number; clientY: number }): void {
      const box = document.createElement('div');
      tipRow(box, seg.color, seg.label, money(seg.value * deflate), true);
      tipRow(box, '', 'share of public cost', pct(100 * seg.value / total, 0), false);
      showTip(box, evt.clientX, evt.clientY);
    }
    p.addEventListener('pointermove', function (e) { tipIt(e as PointerEvent); });
    p.addEventListener('pointerleave', hideTip);
    xCur += w;
  });

  /* wealth-tax coverage comparison row */
  const y2 = barY + barH + 34;
  const t2 = el('text', { x: M.l, y: y2 - 6, class: 'row-label' }, svg);
  t2.textContent = 'New revenue needed vs. extreme-wealth tax package potential:';
  const maxV = Math.max(fin.gap.value, fin.wealth.value) * 1.15 || 1;
  ([[fin.gap, 'var(--series-5)'], [fin.wealth, 'var(--series-2)']] as [{ label: string; value: number }, string][])
    .forEach(function (pair, i) {
      const item = pair[0], color = pair[1];
      const yy = y2 + 6 + i * 30;
      const w = iw * 0.72 * item.value / maxV;
      el('path', { d: barPath(M.l, yy, Math.max(2, w), 20, 4, 'right'), fill: color, class: 'bar-mark' }, svg);
      const t = el('text', { x: M.l + Math.max(2, w) + 8, y: yy + 14, class: 'value-label' }, svg);
      t.textContent = item.label + ': ' + money(item.value * deflate) + '/yr';
    });

  legend(container, fin.segments.map(function (s) {
    return { color: s.color, label: s.label };
  }));
}
