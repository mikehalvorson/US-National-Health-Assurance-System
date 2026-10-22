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

/** (charts.js:62-67)
 *
 * R180 [landed in §S9d]: `!tip.isConnected` is the whole fix, and it is not
 * a precaution. Measured in the browser on the long-term-care chart: click
 * one nav link and come back, and `tip` still points at a node Astro's
 * <ClientRouter /> has thrown away with the old <body>. `tooltip()` then
 * returned that detached node, `showTip` filled it and set display:block on
 * it, and nothing appeared. Hover produced zero tooltips; so did focus.
 *
 * Every chart in the app shares this singleton, so every tooltip in the
 * application stopped working after the first in-app navigation. §BB filed
 * R180 on inference from reading the code and no section owns it; §S9d
 * reproduced it while checking whether R285's new focus handler actually
 * showed anything, and it did not. Fixing it here rather than filing it
 * again, because R285 is not done otherwise.
 *
 * `isConnected` rather than `document.body.contains(tip)`: the same test,
 * and it stays true for a node moved between documents. */
export function tooltip(): HTMLElement {
  if (!tip || !tip.isConnected) {
    tip = div('nha-tooltip', document.body);
    tip.style.display = 'none';
  }
  return tip;
}

/**
 * A point on screen in viewport coordinates. A `PointerEvent` already is one,
 * which is why the fields carry the event's own names: a handler passes its
 * event straight through, and a focus handler builds one from a box.
 *
 * Review 9 of P20: `{ clientX: number; clientY: number }` had been typed out
 * inline at ten sites, and `tipPosition` took six loose numbers in an order
 * only its body could explain.
 */
export interface TipPoint {
  clientX: number;
  clientY: number;
  /* The vertical extent a tooltip must not cover. A focus handler sets it to
     the focused mark's box: review 9 of P20 measured the org-diagram tooltip
     covering a third of the box that had focus, because the point it placed
     the tooltip above was the box's own bottom edge. A pointer event has no
     such box, and behaves exactly as before. */
  avoid?: { top: number; bottom: number };
}

/** A width and a height. */
export interface Extent { w: number; h: number }

/**
 * R181 [S14]: where the tooltip goes, as a pure function of the pointer, the
 * tooltip's own box and the viewport.
 *
 * The original line was `Math.min(x + 14, innerWidth - r.width - 8)` with no
 * lower bound, so whenever the tooltip was wider than the viewport the right
 * clamp produced a negative left and the tooltip ran off the left edge. The
 * stylesheet caps `.nha-tooltip` at 300px, so the exposure begins just under
 * 308px of viewport width - which is why the audit's own acceptance test, a
 * 360px screen, passes with or without this fix and proves nothing. The unit
 * test drives this function directly at widths where it can fail.
 *
 * `Math.max` comes second deliberately: when the tooltip cannot fit at all,
 * the left edge is the one to pin, because that is where reading starts.
 */
export function tipPosition(
  at: TipPoint, tip: Extent, viewport: Extent
): { left: number; top: number } {
  var margin = 8;
  var x = at.clientX, y = at.clientY, w = tip.w, h = tip.h, vw = viewport.w, vh = viewport.h;
  var left = Math.max(margin, Math.min(x + 14, vw - w - margin));
  /* Above the pointer when it fits, below it when it does not, and never past
     the bottom edge. The old code clamped the top only, which was safe for a
     real pointer event and not for a focus handler that synthesises a point
     from an element's box. */
  var above = at.avoid ? at.avoid.top : y;
  var below = at.avoid ? at.avoid.bottom : y;
  var top = above - h - 10;
  if (top < margin) top = Math.min(below + 18, vh - h - margin);
  top = Math.max(margin, top);
  return { left: left, top: top };
}

/** (charts.js:68-77) */
export function showTip(html: Node, at: TipPoint): void {
  var t = tooltip();
  t.innerHTML = '';
  t.appendChild(html);
  t.style.display = 'block';
  var r = t.getBoundingClientRect();
  var p = tipPosition(at, { w: r.width, h: r.height },
    { w: window.innerWidth, h: window.innerHeight });
  t.style.left = p.left + 'px';
  t.style.top = p.top + 'px';
}

/**
 * Bind the focus half of a chart mark's affordances.
 *
 * Review 8 of P20: seven sites had grown the same four lines, four of them
 * verbatim down to the comment. `showTip`/`hideTip` already live here, so the
 * pairing does too.
 *
 * The point it hands `show` is the mark's own box rather than a pointer
 * position, which is why `tipPosition` has to cope with a point anywhere on
 * screen: an element below the fold yields a y that no real pointer event
 * would produce.
 */
export function bindTipFocus(
  mark: Element,
  show: (at: TipPoint) => void,
  hide: () => void = hideTip,
  anchor: 'corner' | 'centre' = 'corner'
): void {
  mark.addEventListener('focus', function () {
    const box = mark.getBoundingClientRect();
    /* Vertically the tooltip goes above the mark, or below it when there is
       no room - never over it. Horizontally 'centre' is for marks wide enough
       that the right edge puts the tooltip beside the wrong thing: the 216px
       org boxes, the country rows. */
    const avoid = { top: box.top, bottom: box.bottom };
    show(anchor === 'centre'
      ? { clientX: box.left + box.width / 2, clientY: box.top, avoid: avoid }
      : { clientX: box.right, clientY: box.top, avoid: avoid });
  });
  mark.addEventListener('blur', hide);
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
