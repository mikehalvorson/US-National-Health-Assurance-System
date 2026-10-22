/* Tax view charts, ported verbatim from docs/js/taxcharts.js. Same spec as
   the Overview charts (chart-util helpers). Fidelity-critical geometry.
   Six renderers: revenue-vs-need stacked area, net household impact, effective
   rate dumbbell, top-rate history, wealth distribution, save-vs-pay. */
import {
  el, div, niceTicks, showTip, hideTip, tipRow, barPath, bindTipFocus, type TipPoint
} from './chart-util';
import { money, axis, dollarsKMB, dollarsMagnitude, householdsMillions } from './format';
import { INSTRUMENTS, TOP_RATE_HISTORY, PRESIDENTS, WEALTH_DIST } from './taxparams';
import type { ComputeResult, DistributionRow } from './tax-types';
import type { TableData } from './overview-tables';

/* Instrument -> categorical slot. >8 series folds smallest into "Other". */
const STACK_ORDER = ['payroll', 'surtax', 'wealth', 'vat', 'sscap', 'corp', 'ftt', '_other'];
const SLOT: Record<string, string> = {
  payroll: 'var(--series-1)', surtax: 'var(--series-2)', wealth: 'var(--series-3)',
  vat: 'var(--series-4)', sscap: 'var(--series-5)', corp: 'var(--series-6)',
  ftt: 'var(--series-7)', _other: 'var(--series-8)'
};
const OTHER_IDS = ['capgains', 'estate', 'rents', 'msurtax', 'bmin',
  'inherit', 'intl', 'enforce', 'buyback'];

function labelFor(id: string): string {
  if (id === '_other') return 'Other levies (cap-gains, estate, inheritance, millionaire & billionaire taxes, enforcement, international, buybacks, rents)';
  const ins = INSTRUMENTS.filter(function (i) { return i.id === id; })[0];
  return ins ? ins.label : id;
}

/* Each instrument's revenue by year, folded into the chart's eight slots. The
   stacked chart and its table both read this, so they cannot disagree about
   which levy a dollar belongs to. */
function stackSeries(comp: ComputeResult): Record<string, number[]> {
  const series: Record<string, number[]> = {};
  STACK_ORDER.forEach(function (id) { series[id] = comp.years.map(function () { return 0; }); });
  Object.keys(comp.byInstrument).forEach(function (id) {
    const target = OTHER_IDS.indexOf(id) >= 0 ? '_other' : id;
    comp.byInstrument[id].forEach(function (v, i) { series[target][i] += v; });
  });
  return series;
}

/* Revenue as a share of need in one year, as the tooltip and the table state
   it. Review 9: the tooltip used to divide for itself, and disagreed with the
   model's own `coverage` in one case - nothing needed and nothing raised,
   which the model counts as covered and the tooltip called "n/a". The model
   is the source; `null` is its sentinel for a ratio with no meaning. */
function coverageText(comp: ComputeResult, i: number): string {
  const c = comp.coverage[i];
  return c === null ? 'n/a' : Math.round(100 * c) + '%';
}

/**
 * The revenue-vs-need chart as a table.
 *
 * Review 9 of P20: this chart's per-year figures were reachable only by moving
 * a pointer across it - the overlay is not a tab stop and the svg keeps the
 * image role - which left P20's exit condition, "no data series is reachable
 * only by hover", unmet. A table reaches every figure by keyboard and screen
 * reader, which a scrubbable crosshair could not do without becoming a
 * widget. The columns are exactly the tooltip's rows.
 */
export function revenueNeedTableData(comp: ComputeResult): TableData {
  const series = stackSeries(comp);
  const shown = STACK_ORDER.filter(function (id) {
    return series[id].some(function (v) { return v >= 0.5; });
  });
  return {
    head: ['Year', 'Funding need', 'Total revenue', 'Coverage'].concat(
      shown.map(function (id) { return id === '_other' ? 'Other levies' : labelFor(id); })),
    rows: comp.years.map(function (yr, i) {
      return [String(yr), money(comp.need[i]), money(comp.totalRev[i]), coverageText(comp, i)].concat(
        shown.map(function (id) { return money(series[id][i]); }));
    })
  };
}

/* ---- 1. Revenue vs need, stacked area over years ---- */
export function renderRevenueNeedChart(container: HTMLElement, comp: ComputeResult): void {
  container.innerHTML = '';
  const W = 860, H = 340, M = { l: 64, t: 16, r: 24, b: 40 };
  const years = comp.years;

  const series = stackSeries(comp);

  let maxY = 0;
  years.forEach(function (_, i) {
    let s = 0;
    STACK_ORDER.forEach(function (id) { s += series[id][i]; });
    maxY = Math.max(maxY, s, comp.need[i]);
  });
  maxY *= 1.08;

  const x = function (i: number) { return M.l + (W - M.l - M.r) * (i / (years.length - 1)); };
  const y = function (v: number) { return H - M.b - (H - M.t - M.b) * (v / maxY); };

  const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img',
    'aria-label': 'Tax revenue by instrument versus funding need, by year' }, container);

  niceTicks(0, maxY, 5).forEach(function (tv) {
    el('line', { x1: M.l, x2: W - M.r, y1: y(tv), y2: y(tv), class: 'gridline' }, svg);
    const t = el('text', { x: M.l - 8, y: y(tv) + 4, class: 'axis-text', 'text-anchor': 'end' }, svg);
    t.textContent = axis(tv);
  });
  years.forEach(function (yr, i) {
    if (yr % 3 !== 0) return;
    const t = el('text', { x: x(i), y: H - 14, class: 'axis-text', 'text-anchor': 'middle' }, svg);
    t.textContent = String(yr);
  });
  el('line', { x1: M.l, x2: W - M.r, y1: y(0), y2: y(0), class: 'baseline-axis' }, svg);

  let cum = years.map(function () { return 0; });
  STACK_ORDER.forEach(function (id) {
    const vals = series[id];
    if (vals.every(function (v) { return v < 0.5; })) return;
    const lower = cum.slice();
    const upper = cum.map(function (c, i) { return c + vals[i]; });
    const dTop = upper.map(function (v, i) { return (i ? 'L' : 'M') + x(i) + ' ' + y(v); }).join(' ');
    const dArea = dTop + ' ' + lower.slice().reverse().map(function (v, i) {
      const j = years.length - 1 - i;
      return 'L' + x(j) + ' ' + y(v);
    }).join(' ') + ' Z';
    el('path', { d: dArea, fill: SLOT[id], 'fill-opacity': 0.32, stroke: 'none' }, svg);
    el('path', { d: dTop, fill: 'none', stroke: SLOT[id], 'stroke-width': 2,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    cum = upper;
  });

  const dNeed = years.map(function (_, i) { return (i ? 'L' : 'M') + x(i) + ' ' + y(comp.need[i]); }).join(' ');
  el('path', { d: dNeed, fill: 'none', stroke: 'var(--need-line)', 'stroke-width': 2.5,
    'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
  const endLab = el('text', { x: x(years.length - 1) - 6, y: y(comp.need[years.length - 1]) - 8,
    class: 'direct-label', 'text-anchor': 'end' }, svg);
  endLab.textContent = 'Funding need';

  const hair = el('line', { y1: M.t, y2: H - M.b, class: 'crosshair', visibility: 'hidden' }, svg);
  const overlay = el('rect', { x: M.l, y: M.t, width: W - M.l - M.r, height: H - M.t - M.b,
    fill: 'transparent' }, svg);
  overlay.addEventListener('pointermove', (function (evt: PointerEvent) {
    const r = svg.getBoundingClientRect();
    const px = (evt.clientX - r.left) * (W / r.width);
    let i = Math.round((px - M.l) / ((W - M.l - M.r) / (years.length - 1)));
    i = Math.max(0, Math.min(years.length - 1, i));
    hair.setAttribute('x1', String(x(i))); hair.setAttribute('x2', String(x(i)));
    hair.setAttribute('visibility', 'visible');
    const box = document.createElement('div');
    div('tip-head', box).textContent = String(years[i]);
    tipRow(box, '', 'Funding need', money(comp.need[i]), true);
    tipRow(box, '', 'Total revenue', money(comp.totalRev[i]), true);
    tipRow(box, '', 'Coverage', coverageText(comp, i), false);
    STACK_ORDER.slice().reverse().forEach(function (id) {
      if (series[id][i] > 0.5) tipRow(box, SLOT[id], labelFor(id), money(series[id][i]), false);
    });
    showTip(box, evt);
  }) as EventListener);
  overlay.addEventListener('pointerleave', function () {
    hair.setAttribute('visibility', 'hidden'); hideTip();
  });

  const leg = div('legend', container);
  STACK_ORDER.forEach(function (id) {
    if (series[id].every(function (v) { return v < 0.5; })) return;
    const item = div('legend-item', leg);
    const sw = document.createElement('span');
    sw.className = 'legend-swatch'; sw.style.background = SLOT[id];
    item.appendChild(sw);
    item.appendChild(document.createTextNode(labelFor(id)));
  });
  const needItem = div('legend-item', leg);
  const nl = document.createElement('span');
  nl.className = 'legend-line'; nl.style.background = 'var(--need-line)';
  needItem.appendChild(nl);
  needItem.appendChild(document.createTextNode('Funding need (all programs)'));
}

/* ---- 2. Net household impact by income group (diverging bars) ---- */
export function renderNetImpactChart(container: HTMLElement, rows: DistributionRow[], mode: string): void {
  container.innerHTML = '';
  const W = 860, rowH = 40, M = { l: 150, r: 150, t: 8, b: 34 };
  const H = M.t + rows.length * rowH + M.b;

  const vals = rows.map(function (r) {
    return mode === 'pct' ? r.netPctIncome * 100 : r.netPerHH;
  });
  let lo = Math.min(0, Math.min.apply(null, vals));
  let hi = Math.max(0, Math.max.apply(null, vals));
  const pad = (hi - lo) * 0.12 || 1;
  lo -= pad; hi += pad;
  const x = function (v: number) { return M.l + (W - M.l - M.r) * ((v - lo) / (hi - lo)); };

  const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'group',
    'aria-label': 'Net annual household impact by income group: new taxes minus health-cost savings' }, container);

  niceTicks(lo, hi, 6).forEach(function (tv) {
    el('line', { x1: x(tv), x2: x(tv), y1: M.t, y2: H - M.b, class: 'gridline' }, svg);
    const t = el('text', { x: x(tv), y: H - 12, class: 'axis-text', 'text-anchor': 'middle' }, svg);
    t.textContent = mode === 'pct' ? tv.toFixed(1) + '%'
      : (Math.abs(tv) >= 1000 ? '$' + (tv / 1000) + 'k' : '$' + tv);
  });
  el('line', { x1: x(0), x2: x(0), y1: M.t, y2: H - M.b, class: 'baseline-axis' }, svg);

  rows.forEach(function (r, i) {
    const v = vals[i];
    const cy = M.t + i * rowH + rowH / 2;
    const lab = el('text', { x: M.l - 10, y: cy + 4, class: 'row-label', 'text-anchor': 'end' }, svg);
    lab.textContent = r.group.label;

    const isCost = v > 0;
    const color = isCost ? 'var(--div-warm)' : 'var(--div-cool)';
    const x0 = x(Math.min(0, v)), x1 = x(Math.max(0, v));
    const g = el('g', {
      class: 'bench-row', tabindex: 0, role: 'group',
      /* R166 [S14], review 8: a tab stop whose only output is a tooltip
         serves a sighted keyboard user and nobody else. */
      'aria-label': r.group.label + ': ' + (mode === 'pct'
        ? (v > 0 ? 'pays ' : 'ahead ') + Math.abs(v).toFixed(1) + '% of income'
        : (v > 0 ? 'pays $' : 'ahead $') +
          Math.round(Math.abs(v)).toLocaleString('en-US'))
    }, svg);
    el('path', { d: barPath(x0, cy - 11, Math.max(2, x1 - x0), 22, 4, isCost ? 'right' : 'left'),
      fill: color, 'fill-opacity': 0.85 }, g);

    const valTxt = mode === 'pct'
      ? (v > 0 ? '+' : '') + v.toFixed(1) + '% of income'
      : (v > 0 ? '+$' : '−$') + Math.round(Math.abs(v)).toLocaleString('en-US');
    const vt = el('text', {
      x: W - M.r + 10, y: cy + 4,
      class: 'direct-label', 'text-anchor': 'start'
    }, svg);
    vt.textContent = valTxt;

    function tipIt(evt: TipPoint): void {
      const box = document.createElement('div');
      div('tip-head', box).textContent = r.group.label +
        ' (avg income $' + Math.round(r.avgIncomeNow).toLocaleString('en-US') + ')';
      tipRow(box, 'var(--div-warm)', 'New taxes', '$' +
        Math.round(r.taxPerHH).toLocaleString('en-US') + '/hh/yr', false);
      tipRow(box, 'var(--div-cool)', 'Health costs eliminated', '−$' +
        Math.round(r.reliefPerHH).toLocaleString('en-US') + '/hh/yr', false);
      if (r.wagePerHH > 0.5) {
        tipRow(box, 'var(--div-cool)', 'Wages from employer pass-through', '−$' +
          Math.round(r.wagePerHH).toLocaleString('en-US') + '/hh/yr', false);
      }
      tipRow(box, '', 'Net', (r.netPerHH > 0 ? '+$' : '−$') +
        Math.round(Math.abs(r.netPerHH)).toLocaleString('en-US') + '/hh/yr (' +
        (r.netPctIncome > 0 ? '+' : '') + (r.netPctIncome * 100).toFixed(1) + '% of income)', true);
      showTip(box, evt);
    }
    g.addEventListener('pointermove', function (e) { tipIt(e as PointerEvent); });
    g.addEventListener('pointerleave', hideTip);
    /* R166 [S14]: the row is a tab stop; the focus pair makes it say something. */
    bindTipFocus(g, tipIt);
  });

  const leg = div('legend', container);
  ([['var(--div-cool)', 'Net savings (health costs eliminated exceed new taxes)'],
    ['var(--div-warm)', 'Net cost (new taxes exceed health savings)']] as [string, string][]).forEach(function (pair) {
    const item = div('legend-item', leg);
    const sw = document.createElement('span');
    sw.className = 'legend-swatch'; sw.style.background = pair[0];
    item.appendChild(sw);
    item.appendChild(document.createTextNode(pair[1]));
  });
}

/* ---- 3. Effective federal tax rate: current vs proposed (dumbbell) ---- */
export function renderRateCurve(container: HTMLElement, rows: DistributionRow[]): void {
  container.innerHTML = '';
  const W = 860, rowH = 38, M = { l: 150, r: 70, t: 8, b: 34 };
  const H = M.t + rows.length * rowH + M.b;
  const hi = Math.max.apply(null, rows.map(function (r) { return r.newRate; })) * 100 * 1.15;
  const x = function (v: number) { return M.l + (W - M.l - M.r) * (v / hi); };

  const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'group',
    'aria-label': 'Average federal tax rate by income group, current law versus proposed package' }, container);

  niceTicks(0, hi, 6).forEach(function (tv) {
    el('line', { x1: x(tv), x2: x(tv), y1: M.t, y2: H - M.b, class: 'gridline' }, svg);
    const t = el('text', { x: x(tv), y: H - 12, class: 'axis-text', 'text-anchor': 'middle' }, svg);
    t.textContent = Math.round(tv) + '%';
  });

  rows.forEach(function (r, i) {
    const cy = M.t + i * rowH + rowH / 2;
    const lab = el('text', { x: M.l - 10, y: cy + 4, class: 'row-label', 'text-anchor': 'end' }, svg);
    lab.textContent = r.group.label;
    const c = r.curRate * 100, n = r.newRate * 100;
    const g = el('g', {
      class: 'bench-row', tabindex: 0, role: 'group',
      /* R166 [S14], review 8: a tab stop whose only output is a tooltip
         serves a sighted keyboard user and nobody else. */
      'aria-label': r.group.label + ': current law ' + c.toFixed(1) +
        '%, with package ' + n.toFixed(1) + '%'
    }, svg);
    el('line', { x1: x(c), x2: x(n), y1: cy, y2: cy, stroke: 'var(--gridline-strong)',
      'stroke-width': 2 }, g);
    el('circle', { cx: x(c), cy: cy, r: 5, fill: 'var(--baseline-series)', class: 'marker' }, g);
    el('circle', { cx: x(n), cy: cy, r: 5, fill: 'var(--series-1)', class: 'marker' }, g);
    const vt = el('text', { x: x(Math.max(c, n)) + 10, y: cy + 4, class: 'direct-label' }, svg);
    vt.textContent = c.toFixed(1) + '% → ' + n.toFixed(1) + '%';

    function tipIt(evt: TipPoint): void {
      const box = document.createElement('div');
      div('tip-head', box).textContent = r.group.label;
      tipRow(box, 'var(--baseline-series)', 'Current law', c.toFixed(1) + '%', false);
      tipRow(box, 'var(--series-1)', 'With package', n.toFixed(1) + '%', true);
      tipRow(box, '', 'Note', 'new-tax dollars ÷ group income; excludes health savings', false);
      showTip(box, evt);
    }
    g.addEventListener('pointermove', function (e) { tipIt(e as PointerEvent); });
    g.addEventListener('pointerleave', hideTip);
    /* R166 [S14]: the row is a tab stop; the focus pair makes it say something. */
    bindTipFocus(g, tipIt);
  });

  const leg = div('legend', container);
  ([['var(--baseline-series)', 'Current law (CBO)'], ['var(--series-1)', 'With this tax package']] as [string, string][]).forEach(function (p) {
    const item = div('legend-item', leg);
    const sw = document.createElement('span');
    sw.className = 'legend-swatch'; sw.style.borderRadius = '50%';
    sw.style.background = p[0];
    item.appendChild(sw);
    item.appendChild(document.createTextNode(p[1]));
  });
}

/* Both series on the top-rate chart are step functions: a rate holds until the
   next change, a president until the next inauguration. */
function topRateIn(yr: number): number {
  let r = TOP_RATE_HISTORY[0].r;
  TOP_RATE_HISTORY.forEach(function (h) { if (h.y <= yr) r = h.r; });
  return r;
}

function presidentIn(yr: number): string {
  let name = PRESIDENTS[0].name;
  PRESIDENTS.forEach(function (p) { if (p.y <= yr) name = p.name; });
  return name;
}

/**
 * The top-rate history as a table: one row for every year either series
 * changes, which is every value the chart can show and nothing it cannot.
 *
 * Review 9 of P20: like the revenue chart, this one's readout was reachable
 * only by pointer. One row per year would be 113 rows of mostly repetition; a
 * row per change is lossless because both series are steps.
 */
export function topRateTableData(): TableData {
  const years: number[] = [];
  TOP_RATE_HISTORY.forEach(function (h) { years.push(h.y); });
  PRESIDENTS.forEach(function (p) { years.push(p.y); });
  const changes = years
    .filter(function (y, i) { return years.indexOf(y) === i && y >= 1913 && y <= 2025; })
    .sort(function (a, b) { return a - b; });
  return {
    head: ['President', 'From', 'Top marginal rate'],
    rows: changes.map(function (y) {
      return [presidentIn(y), String(y), topRateIn(y) + '%'];
    })
  };
}

/* ---- 4. Top marginal income tax rate, 1913-2025, with presidency labels ---- */
export function renderTopRateChart(container: HTMLElement): void {
  container.innerHTML = '';
  const H0 = TOP_RATE_HISTORY, P = PRESIDENTS;
  const W = 900, H = 380, M = { l: 52, r: 18, t: 64, b: 30 };
  const y0 = 1913, y1 = 2026;
  const x = function (yr: number) { return M.l + (W - M.l - M.r) * ((yr - y0) / (y1 - y0)); };
  const y = function (r: number) { return M.t + (H - M.t - M.b) * (1 - r / 100); };

  const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img',
    'aria-label': 'Top marginal federal income tax rate from 1913 to 2025 with presidencies' }, container);

  [0, 25, 50, 75, 100].forEach(function (tv) {
    el('line', { x1: M.l, x2: W - M.r, y1: y(tv), y2: y(tv), class: 'gridline' }, svg);
    const t = el('text', { x: M.l - 8, y: y(tv) + 4, class: 'axis-text', 'text-anchor': 'end' }, svg);
    t.textContent = tv + '%';
  });
  [1920, 1940, 1960, 1980, 2000, 2020].forEach(function (yr) {
    const t = el('text', { x: x(yr), y: H - 8, class: 'axis-text', 'text-anchor': 'middle' }, svg);
    t.textContent = String(yr);
  });

  P.forEach(function (p, i) {
    el('line', { x1: x(p.y), x2: x(p.y), y1: M.t - 6, y2: H - M.b, class: 'gridline' }, svg);
    const end = i + 1 < P.length ? P[i + 1].y : y1;
    if (end - p.y < 3.5) return;
    const lx = x((p.y + end) / 2);
    const ly = (i % 2 === 0) ? 16 : 34;
    const t = el('text', { x: lx, y: ly, class: 'pres-label', 'text-anchor': 'middle' }, svg);
    t.textContent = p.name;
  });

  let d = '';
  for (let i = 0; i < H0.length; i++) {
    const yr = H0[i].y, r = H0[i].r;
    const end = (i + 1 < H0.length) ? H0[i + 1].y : y1;
    d += (i === 0 ? 'M' : 'L') + x(yr) + ' ' + y(r) + ' L' + x(end) + ' ' + y(r);
  }
  el('path', { d: d, fill: 'none', stroke: 'var(--series-1)', 'stroke-width': 2.5,
    'stroke-linejoin': 'round' }, svg);

  const a1 = el('text', { x: x(1957), y: y(92) - 10, class: 'direct-label',
    'text-anchor': 'middle' }, svg);
  a1.textContent = '91–92% for two decades';
  const a2 = el('text', { x: x(2021), y: y(37) - 10, class: 'direct-label',
    'text-anchor': 'end' }, svg);
  a2.textContent = '37% today';

  const hair = el('line', { y1: M.t, y2: H - M.b, class: 'crosshair', visibility: 'hidden' }, svg);
  const overlay = el('rect', { x: M.l, y: M.t, width: W - M.l - M.r, height: H - M.t - M.b,
    fill: 'transparent' }, svg);
  overlay.addEventListener('pointermove', (function (evt: PointerEvent) {
    const rct = svg.getBoundingClientRect();
    const px = (evt.clientX - rct.left) * (W / rct.width);
    let yr = Math.round(y0 + (px - M.l) / (W - M.l - M.r) * (y1 - y0));
    yr = Math.max(y0, Math.min(2025, yr));
    hair.setAttribute('x1', String(x(yr))); hair.setAttribute('x2', String(x(yr)));
    hair.setAttribute('visibility', 'visible');
    const box = document.createElement('div');
    div('tip-head', box).textContent = yr + ' (' + presidentIn(yr) + ')';
    tipRow(box, 'var(--series-1)', 'Top marginal rate', topRateIn(yr) + '%', true);
    showTip(box, evt);
  }) as EventListener);
  overlay.addEventListener('pointerleave', function () {
    hair.setAttribute('visibility', 'hidden'); hideTip();
  });
}

/* ---- 5. Average wealth per household by group (linear scale) ---- */
export function renderWealthChart(container: HTMLElement): void {
  container.innerHTML = '';
  const Wd = WEALTH_DIST;
  const rows = Wd.groups.map(function (g) {
    return { label: g.label, hhM: g.hhM, wealthT: g.wealthT,
             avg: g.wealthT * 1e12 / (g.hhM * 1e6),
             share: 100 * g.wealthT / Wd.totalT };
  });
  const W = 900, rowH = 42, M = { l: 330, r: 24, t: 8, b: 30 };
  const nameX = 122, valX = 130;
  const H = M.t + rows.length * rowH + M.b;
  const maxAvg = Math.max.apply(null, rows.map(function (r) { return r.avg; }));
  const x = function (v: number) { return M.l + (W - M.l - M.r) * (v / maxAvg); };

  const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'group',
    'aria-label': 'Average net worth per household by wealth group, linear scale' }, container);

  rows.forEach(function (r, i) {
    const cy = M.t + i * rowH + rowH / 2;
    const lab = el('text', { x: nameX, y: cy + 4, class: 'row-label', 'text-anchor': 'end' }, svg);
    lab.textContent = r.label;
    const mult = r.avg / Wd.medianHH;
    const vt = el('text', { x: valX, y: cy + 4, class: 'direct-label', 'text-anchor': 'start' }, svg);
    vt.textContent = dollarsKMB(r.avg) + ' (' +
      (mult >= 10 ? Math.round(mult).toLocaleString('en-US') : mult.toFixed(1)) + '× median)';

    const w = Math.max(1.5, x(r.avg) - M.l);
    const g = el('g', {
      class: 'bench-row', tabindex: 0, role: 'group',
      /* R166 [S14], review 8: a tab stop whose only output is a tooltip
         serves a sighted keyboard user and nobody else. */
      'aria-label': r.label + ': average net worth ' + dollarsKMB(r.avg) +
        ' per household, ' + r.share.toFixed(1) +
        '% of all U.S. household wealth'
    }, svg);
    el('path', { d: barPath(M.l, cy - 11, w, 22, 4, 'right'),
      fill: 'var(--series-1)', 'fill-opacity': 0.85 }, g);

    function tipIt(evt: TipPoint): void {
      const box = document.createElement('div');
      div('tip-head', box).textContent = r.label;
      tipRow(box, 'var(--series-1)', 'Average net worth', dollarsKMB(r.avg) + ' per household', true);
      tipRow(box, '', 'Households', householdsMillions(r.hhM), false);
      tipRow(box, '', 'Total held', '$' + r.wealthT.toFixed(1) + 'T (' +
        r.share.toFixed(1) + '% of all U.S. household wealth)', false);
      showTip(box, evt);
    }
    g.addEventListener('pointermove', function (e) { tipIt(e as PointerEvent); });
    g.addEventListener('pointerleave', hideTip);
    /* R166 [S14]: the row is a tab stop; the focus pair makes it say something. */
    bindTipFocus(g, tipIt);
  });

  const note = el('text', { x: nameX - 12, y: H - 8, class: 'axis-text' }, svg);
  note.textContent = 'Linear scale, deliberately: most of America is invisible next to the top 0.01%. That is the chart.';
}

/* ---- 6. Save-vs-pay comparison per bracket (% of income) ---- */

export function renderSaveVsPayChart(container: HTMLElement, rows: DistributionRow[]): void {
  container.innerHTML = '';
  const W = 900, rowH = 44, M = { l: 128, r: 148, t: 30, b: 30 };
  const H = M.t + rows.length * rowH + M.b;

  let maxPct = 0.01;
  rows.forEach(function (r) {
    const save = (r.reliefPerHH + (r.wagePerHH || 0)) / r.avgIncomeNow;
    const pay = r.taxPerHH / r.avgIncomeNow;
    maxPct = Math.max(maxPct, save, pay);
  });
  maxPct *= 1.06;
  const axisShift = 14;
  const cx = M.l + (W - M.l - M.r) / 2 - axisShift;
  const half = Math.min(cx - M.l, (W - M.r) - cx);
  const xL = function (p: number) { return cx - half * (p / maxPct); };
  const xR = function (p: number) { return cx + half * (p / maxPct); };

  const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'group',
    'aria-label': 'Healthcare savings versus new taxes by income group, as share of income' }, container);

  el('line', { x1: cx, x2: cx, y1: M.t - 4, y2: H - M.b, class: 'baseline-axis' }, svg);
  const hSave = el('text', { x: cx - 10, y: M.t - 12, class: 'axis-text', 'text-anchor': 'end' }, svg);
  hSave.textContent = 'saves on healthcare →';
  const hPay = el('text', { x: cx + 10, y: M.t - 12, class: 'axis-text' }, svg);
  hPay.textContent = '← pays in new taxes';

  rows.forEach(function (r, i) {
    const cy = M.t + i * rowH + rowH / 2;
    const savePH = r.reliefPerHH + (r.wagePerHH || 0);
    const save = savePH / r.avgIncomeNow;
    const pay = r.taxPerHH / r.avgIncomeNow;
    const net = r.netPerHH;

    const lab = el('text', { x: M.l - 10, y: cy + 4, class: 'row-label', 'text-anchor': 'end' }, svg);
    lab.textContent = r.group.label;

    const g = el('g', {
      class: 'bench-row', tabindex: 0, role: 'group',
      /* R166 [S14], review 8: a tab stop whose only output is a tooltip
         serves a sighted keyboard user and nobody else. */
      'aria-label': r.group.label + ': saves ' + dollarsMagnitude(savePH) + ', pays ' +
        dollarsMagnitude(r.taxPerHH) + ', ' + (net <= 0 ? 'ahead ' : 'pays ') +
        dollarsMagnitude(net) + ' net'
    }, svg);
    const wS = Math.max(1.5, cx - xL(save));
    el('path', { d: barPath(xL(save), cy - 10, wS, 20, 4, 'left'),
      fill: 'var(--div-cool)', 'fill-opacity': 0.85 }, g);
    const wP = Math.max(1.5, xR(pay) - cx);
    el('path', { d: barPath(cx, cy - 10, wP, 20, 4, 'right'),
      fill: 'var(--div-warm)', 'fill-opacity': 0.85 }, g);

    const sLab = el('text', { x: xL(save) - 7, y: cy + 4, class: 'direct-label',
      'text-anchor': 'end' }, svg);
    sLab.textContent = dollarsMagnitude(savePH);
    const netTxt = (net <= 0 ? 'ahead ' : 'pays ') + dollarsMagnitude(net) + ' net';
    const pLab = el('text', { x: xR(pay) + 7, y: cy + 4, class: 'direct-label' }, svg);
    pLab.textContent = dollarsMagnitude(r.taxPerHH) + ' · ' + netTxt;

    function tipIt(evt: TipPoint): void {
      const box = document.createElement('div');
      div('tip-head', box).textContent = r.group.label +
        ' (avg income ' + dollarsMagnitude(r.avgIncomeNow) + ')';
      tipRow(box, 'var(--div-cool)', 'Premiums & bills eliminated',
        dollarsMagnitude(r.reliefPerHH) + '/yr (' + (100 * r.reliefPerHH / r.avgIncomeNow).toFixed(1) + '% of income)', false);
      if (r.wagePerHH > 0.5) {
        tipRow(box, 'var(--div-cool)', 'Wage gains from employer pass-through',
          dollarsMagnitude(r.wagePerHH) + '/yr', false);
      }
      tipRow(box, 'var(--div-warm)', 'New taxes under this scenario',
        dollarsMagnitude(r.taxPerHH) + '/yr (' + (100 * pay).toFixed(1) + '% of income)', false);
      tipRow(box, '', 'Net change',
        (net <= 0 ? '−' : '+') + dollarsMagnitude(net) + '/yr (' +
        (r.netPctIncome > 0 ? '+' : '') + (100 * r.netPctIncome).toFixed(1) + '% of income)', true);
      showTip(box, evt);
    }
    g.addEventListener('pointermove', function (e) { tipIt(e as PointerEvent); });
    g.addEventListener('pointerleave', hideTip);
    /* R166 [S14]: the row is a tab stop; the focus pair makes it say something. */
    bindTipFocus(g, tipIt);
  });

  const leg = div('legend', container);
  ([['var(--div-cool)', 'Healthcare costs eliminated (premiums, deductibles, bills) plus wage pass-through'],
    ['var(--div-warm)', 'New taxes under the selected scenario']] as [string, string][]).forEach(function (p) {
    const item = div('legend-item', leg);
    const sw = document.createElement('span');
    sw.className = 'legend-swatch'; sw.style.background = p[0];
    item.appendChild(sw);
    item.appendChild(document.createTextNode(p[1]));
  });
}
