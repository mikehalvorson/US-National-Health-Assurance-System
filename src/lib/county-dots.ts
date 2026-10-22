/* =========================================================================
 * The county dot map's decisions, out of the client script so a test can
 * reach them.
 *
 * The map used to be rebuilt on every refresh of the Physical Care page: all
 * 3,144 circles, each with two listeners of its own, and the state outlines
 * re-projected although the projection never changes. The client now builds
 * the map once per page instance and updates it in place. That is correct
 * only if the update draws what the rebuild drew: the same dots, the same
 * radius and colour on each, in the same order. Everything that decides it is
 * here - whether a built map can be reused, what each dot stands for, which
 * attributes a refresh writes, where each dot goes - and `updateDots` runs
 * the whole update against a surface the caller supplies, so the tests drive
 * the same code the page does.
 *
 * What the tests cannot see is the client's side of that surface: three
 * one-line adapters from these calls to `setAttribute`, `removeAttribute` and
 * `insertBefore` on real circles, and the pointer handler. Those are checked
 * by driving the page in a browser.
 * ========================================================================= */
import { UNIT_TYPE_KEYS, type UnitCounts, type UnitTypeKey } from './units';

/** The fill for each unit type. */
export type TypeColors = Record<UnitTypeKey, string>;

/** The map's type filter: every type, or one of them. */
export type DotFilter = 'all' | UnitTypeKey;

/** A filter button's `data-type`, read as a filter. A value that names no
 *  unit type shows every type rather than a map with no dots. */
export function dotFilterOf(value: string | null): DotFilter {
  for (const key of UNIT_TYPE_KEYS) {
    if (value === key) return key;
  }
  return 'all';
}

/** The units a county's dot stands for under `filter`. */
export function dotCount(units: UnitCounts, filter: DotFilter): number {
  return filter === 'all' ? units.total : units[filter];
}

/** Whether a dot standing for `count` units is drawn at all. */
export function isDrawn(count: number): boolean {
  return count > 0;
}

/** A dot's `r` attribute: area in proportion to the count, no smaller than
 *  1.1 and no larger than 16. */
export function dotRadius(count: number): string {
  return Math.min(Math.max(1.1, 1.1 * Math.sqrt(count)), 16).toFixed(1);
}

/** A dot's `fill`: the filtered type's colour, or under every type the
 *  county's dominant type. A tie goes to Type B, then to the first of the
 *  other types, in `UNIT_TYPE_KEYS` order, that has strictly more. */
export function dotFill(units: UnitCounts, filter: DotFilter, colors: TypeColors): string {
  if (filter !== 'all') return colors[filter];
  let best: UnitTypeKey = 'b';
  for (const key of UNIT_TYPE_KEYS) {
    if (units[key] > units[best]) best = key;
  }
  return colors[best];
}

/**
 * The dots to draw, as positions into `counts`, in drawing order.
 *
 * The largest count comes first, so a small dot is drawn over a large one and
 * can still be hovered. Equal counts keep position order, which is the county
 * file's order: the order a stable sort of the whole county list gave the
 * rebuild. A dot that is not drawn has no place in the order.
 */
export function drawOrder(counts: readonly number[]): number[] {
  const order: number[] = [];
  for (let i = 0; i < counts.length; i++) {
    if (isDrawn(counts[i])) order.push(i);
  }
  return order.sort(function (x, y) { return counts[y] - counts[x] || x - y; });
}

/** Put `item` immediately before `before`, or last when `before` is null. */
export type Move = [item: number, before: number | null];

/**
 * The fewest moves that turn `current` into `desired`, two orderings of the
 * same items.
 *
 * The items already in the right relative order stay where they are: the
 * longest run of `current` whose positions in `desired` increase. Every other
 * item is placed immediately before its successor in `desired`, working back
 * from the end so that each successor has already been placed. A null
 * `before` means after every other child of the parent, so the items must be
 * the parent's last children, apart from any the orderings leave out.
 */
export function reorderMoves(current: readonly number[], desired: readonly number[]): Move[] {
  const n = desired.length;
  if (current.length !== n) {
    throw new Error('reorderMoves: ' + current.length + ' items in the current order, ' + n + ' in the desired one');
  }
  const rank = new Map<number, number>();
  for (let k = 0; k < n; k++) rank.set(desired[k], k);
  if (rank.size !== n) throw new Error('reorderMoves: the desired order repeats an item');

  /* the desired rank of each item, read in current order */
  const ranks: number[] = [];
  const seen: boolean[] = [];
  for (let i = 0; i < n; i++) {
    const k = rank.get(current[i]);
    if (k === undefined || seen[k]) {
      throw new Error('reorderMoves: item ' + current[i] + ' is missing from the desired order or repeated');
    }
    seen[k] = true;
    ranks.push(k);
  }

  /* longest increasing run of ranks: tails[len - 1] is the index in `ranks`
     of the smallest last rank of any increasing run of that length */
  const tails: number[] = [];
  const previous: number[] = [];
  for (let i = 0; i < n; i++) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (ranks[tails[mid]] < ranks[i]) lo = mid + 1; else hi = mid;
    }
    previous[i] = lo > 0 ? tails[lo - 1] : -1;
    tails[lo] = i;
  }
  const stays: boolean[] = [];
  for (let i = tails.length ? tails[tails.length - 1] : -1; i >= 0; i = previous[i]) {
    stays[ranks[i]] = true;
  }

  const moves: Move[] = [];
  for (let k = n - 1; k >= 0; k--) {
    if (!stays[k]) moves.push([desired[k], k + 1 < n ? desired[k + 1] : null]);
  }
  return moves;
}

/** What a circle carries: the radius and fill last written to it, and
 *  whether it is hidden. */
export interface DotState { readonly r: string; readonly fill: string; readonly hidden: boolean }

/** A circle as built, before anything is written to it. */
export const UNWRITTEN_DOT: DotState = { r: '', fill: '', hidden: false };

/**
 * The state a dot moves to for `count` units drawn in `fill`: the same object
 * when nothing changes. A dot that stops being drawn keeps the radius and fill
 * it had, so when it is drawn again only what changed while it was hidden has
 * to be written.
 */
export function nextDotState(was: DotState, count: number, fill: string): DotState {
  if (!isDrawn(count)) return was.hidden ? was : { r: was.r, fill: was.fill, hidden: true };
  const r = dotRadius(count);
  if (!was.hidden && r === was.r && fill === was.fill) return was;
  return { r: r, fill: fill, hidden: false };
}

/** The attributes a dot can have written to it. */
export type DotAttribute = 'display' | 'r' | 'fill';

/** The writes that take a circle from `was` to `now`: `display` when it is
 *  hidden or shown, and a radius or fill only when it is drawn and different.
 *  A null value removes the attribute. */
export function dotWrites(was: DotState, now: DotState): [DotAttribute, string | null][] {
  const writes: [DotAttribute, string | null][] = [];
  if (now.hidden !== was.hidden) writes.push(['display', now.hidden ? 'none' : null]);
  if (!now.hidden) {
    if (now.r !== was.r) writes.push(['r', now.r]);
    if (now.fill !== was.fill) writes.push(['fill', now.fill]);
  }
  return writes;
}

/** The page operations an update needs, over whatever holds the dots: an svg
 *  and its circles in the client, plain objects in the tests. */
export interface DotSurface<N> {
  /** Every child of the dots' parent, in order, dots or not. */
  children(): ArrayLike<N>;
  /** Set an attribute on a dot, or remove it when `value` is null. */
  write(dot: N, name: DotAttribute, value: string | null): void;
  /** Move a dot immediately before another, or last when `before` is null. */
  move(dot: N, before: N | null): void;
}

/** The dots a map was built with and what each one carries. */
export interface DotModel<N> {
  /** one dot per county, in county file order, the order equal counts are drawn in */
  readonly dots: readonly N[];
  /** each dot's place in `dots` */
  readonly position: ReadonlyMap<N, number>;
  /** what each dot carries now, in the same order */
  readonly states: DotState[];
}

/** The model for dots just built, none written to yet. */
export function newDotModel<N>(dots: readonly N[]): DotModel<N> {
  const position = new Map<N, number>();
  dots.forEach(function (dot, i) { position.set(dot, i); });
  if (position.size !== dots.length) throw new Error('newDotModel: a dot is listed twice');
  return { dots: dots, position: position, states: dots.map(function () { return UNWRITTEN_DOT; }) };
}

/**
 * Bring the dots in line with `units` (one entry per dot, in the same order)
 * under `filter`: write only the attributes that change, then move only the
 * dots that are out of drawing order. The order on the surface is read back
 * from it rather than remembered, so the two cannot disagree.
 */
export function updateDots<N>(
  model: DotModel<N>, units: readonly UnitCounts[], filter: DotFilter, colors: TypeColors, surface: DotSurface<N>
): void {
  const n = model.dots.length;
  if (units.length !== n) throw new Error('updateDots: ' + units.length + ' counties for ' + n + ' dots');
  const counts: number[] = [];
  for (let i = 0; i < n; i++) {
    const count = dotCount(units[i], filter);
    counts.push(count);
    const was = model.states[i];
    const now = nextDotState(was, count, dotFill(units[i], filter, colors));
    if (now === was) continue;
    for (const [name, value] of dotWrites(was, now)) surface.write(model.dots[i], name, value);
    model.states[i] = now;
  }

  const current: number[] = [];
  const children = surface.children();
  for (let k = 0; k < children.length; k++) {
    const i = model.position.get(children[k]);
    if (i !== undefined && isDrawn(counts[i])) current.push(i);
  }
  for (const [i, before] of reorderMoves(current, drawOrder(counts))) {
    surface.move(model.dots[i], before === null ? null : model.dots[before]);
  }
}

/**
 * Whether a map built earlier can be updated rather than built again: its svg
 * is still in the document, and it was built from this county list.
 * ClientRouter swaps `<body>` on navigation, which disconnects the svg, and a
 * new page instance loads a new county list.
 */
export function canReuseMap<M extends { svg: { isConnected: boolean }; counties: unknown }>(
  built: M | null, counties: unknown
): built is M {
  return built !== null && built.svg.isConnected && built.counties === counties;
}
