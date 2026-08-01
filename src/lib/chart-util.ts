/* Port of the NHA chart-util IIFE helpers from docs/js/charts.js (near lines 16-133).
 * Verbatim geometry/tick math. DOM helpers (tooltip/showTip/hideTip/tipRow/legend/div)
 * reference `document` directly; this module is imported only from client-side scripts. */

const SVGNS = 'http://www.w3.org/2000/svg';

/** Create an SVG-namespaced element, set attrs, append to parent. (charts.js:16-21) */
export function el(
  tag: string,
  attrs?: Record<string, string | number>,
  parent?: Element
): SVGElement {
  const e = document.createElementNS(SVGNS, tag) as unknown as SVGElement;
  if (attrs) {
    Object.keys(attrs).forEach(function (k) {
      (e as unknown as Element).setAttribute(k, String(attrs[k]));
    });
  }
  if (parent) parent.appendChild(e);
  return e;
}

/** Create an HTML div, set class, append to parent. (charts.js:22-28) */
export function div(cls?: string, parent?: Element): HTMLElement {
  const d = document.createElement('div');
  if (cls) d.className = cls;
  if (parent) parent.appendChild(d);
  return d;
}

/** Nice ticks. (charts.js:52-60, verbatim) */
export function niceTicks(min: number, max: number, count: number): number[] {
  var span = max - min || 1;
  var step = Math.pow(10, Math.floor(Math.log10(span / count)));
  var err = span / count / step;
  if (err >= 7.5) step *= 10;
  else if (err >= 3.5) step *= 5;
  else if (err >= 1.5) step *= 2;
  var ticks: number[] = [],
    v = Math.ceil(min / step) * step;
  for (; v <= max + 1e-9; v += step) ticks.push(+v.toFixed(10));
  return ticks;
}

/* Shared tooltip singleton */
let tip: HTMLElement | null = null;

/** (charts.js:62-67) */
export function tooltip(): HTMLElement {
  if (!tip) {
    tip = div('nha-tooltip', document.body);
    tip.style.display = 'none';
  }
  return tip;
}

/** (charts.js:68-77) */
export function showTip(html: Node, x: number, y: number): void {
  var t = tooltip();
  t.innerHTML = '';
  t.appendChild(html);
  t.style.display = 'block';
  var r = t.getBoundingClientRect();
  var px = Math.min(x + 14, window.innerWidth - r.width - 8);
  var py = Math.max(8, y - r.height - 10);
  t.style.left = px + 'px';
  t.style.top = py + 'px';
}

/** (charts.js:78) */
export function hideTip(): void {
  if (tip) tip.style.display = 'none';
}

/** (charts.js:81-95) */
export function tipRow(
  parent: HTMLElement,
  color: string,
  label: string,
  value: string,
  strong?: boolean
): HTMLElement {
  var row = div('tip-row', parent);
  if (color) {
    var key = document.createElement('span');
    key.className = 'tip-key';
    key.style.background = color;
    row.appendChild(key);
  }
  var val = document.createElement('span');
  val.className = strong ? 'tip-val strong' : 'tip-val';
  val.textContent = value;
  var lab = document.createElement('span');
  lab.className = 'tip-label';
  lab.textContent = label;
  row.appendChild(val);
  row.appendChild(lab);
  return row;
}

/** Bar with rounded data-end, square base. dir: "up" | "right". (charts.js:97-114, verbatim) */
export function barPath(x: number, y: number, w: number, h: number, r: number, dir: string): string {
  r = Math.min(r, dir === 'right' ? w / 2 : h / 2, dir === 'right' ? h / 2 : w / 2);
  if (r <= 0.5) return 'M' + x + ',' + y + ' h' + w + ' v' + h + ' h' + -w + 'Z';
  if (dir === 'up') {
    /* rounded top corners */
    return (
      'M' + x + ',' + (y + h) + ' V' + (y + r) +
      ' Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
      ' H' + (x + w - r) +
      ' Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) +
      ' V' + (y + h) + 'Z'
    );
  }
  /* rounded right corners */
  return (
    'M' + x + ',' + y + ' H' + (x + w - r) +
    ' Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) +
    ' V' + (y + h - r) +
    ' Q' + (x + w) + ',' + (y + h) + ' ' + (x + w - r) + ',' + (y + h) +
    ' H' + x + 'Z'
  );
}

/** (charts.js:116-118) */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export interface LegendItem {
  color: string;
  label: string;
  line?: boolean;
}

/** (charts.js:120-133) */
export function legend(container: HTMLElement, items: LegendItem[]): HTMLElement {
  var lg = div('chart-legend', container);
  items.forEach(function (it) {
    var e = div('legend-item', lg);
    var key = document.createElement('span');
    key.className = it.line ? 'legend-line' : 'legend-swatch';
    key.style.background = it.color;
    e.appendChild(key);
    var t = document.createElement('span');
    t.textContent = it.label;
    e.appendChild(t);
  });
  return lg;
}
