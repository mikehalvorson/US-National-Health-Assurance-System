import { describe, expect, test } from 'vitest';
import {
  canReuseMap, dotCount, dotFill, dotFilterOf, dotRadius, dotWrites, drawOrder, isDrawn,
  newDotModel, nextDotState, reorderMoves, updateDots, UNWRITTEN_DOT,
  type DotAttribute, type DotFilter, type DotSurface, type TypeColors
} from '../../src/lib/county-dots';
import { countyDemand } from '../../src/lib/counties';
import { allocateCounty, NETWORK_ABSORPTION, UNIT_TYPE_KEYS, type UnitCounts } from '../../src/lib/units';

/* =========================================================================
 * The county map keeps its circles between refreshes and updates them in
 * place. The claim that makes that safe is that an update draws exactly what
 * the old rebuild drew. `updateDots` is driven here against a model of the
 * svg, outlines and hidden dots included, and what it leaves drawn is compared
 * after every step with the rebuild's rule restated from its source: one
 * stable sort of the whole county list, largest count first, empty counties
 * skipped, radius and fill as that loop wrote them.
 *
 * What these tests cannot see: the client's three adapters from the surface
 * to setAttribute, removeAttribute and insertBefore on real circles, and the
 * pointer handler. Reverting those would fail nothing here; they are checked
 * by driving the page in a browser.
 * ========================================================================= */

const COLORS: TypeColors = { a: 'A', b: 'B', c: 'C', d: 'D' };

/** What `parent.insertBefore(item, before)` does to the parent's children. */
function applyMoves<T>(children: readonly T[], moves: readonly [T, T | null][]): T[] {
  const list = children.slice();
  for (const [item, before] of moves) {
    const from = list.indexOf(item);
    if (from < 0) throw new Error('moved ' + String(item) + ', which is not a child');
    list.splice(from, 1);
    if (before === null) {
      list.push(item);
    } else {
      const at = list.indexOf(before);
      if (at < 0) throw new Error('anchored on ' + String(before) + ', which is not a child');
      list.splice(at, 0, item);
    }
  }
  return list;
}

/** Fewest single-item moves that sort `current` into `desired`: everything
 *  outside a longest run already in order, counted the slow way. */
function fewestMoves<T>(current: readonly T[], desired: readonly T[]): number {
  const ranks = current.map((item) => desired.indexOf(item));
  const run: number[] = [];
  let longest = 0;
  for (let i = 0; i < ranks.length; i++) {
    run[i] = 1;
    for (let j = 0; j < i; j++) {
      if (ranks[j] < ranks[i] && run[j] + 1 > run[i]) run[i] = run[j] + 1;
    }
    longest = Math.max(longest, run[i]);
  }
  return ranks.length - longest;
}

function permutations(items: number[]): number[][] {
  if (items.length <= 1) return [items.slice()];
  const out: number[][] = [];
  items.forEach((first, i) => {
    const rest = items.slice(0, i).concat(items.slice(i + 1));
    for (const tail of permutations(rest)) out.push([first, ...tail]);
  });
  return out;
}

/** Deterministic pseudo-random numbers, so a failure reproduces. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return function (): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface DrawnDot { key: string; r: string | undefined; fill: string | undefined }

/** The old rebuild's output, restated from its source rather than from the
 *  module under test. */
function rebuilt(keys: readonly string[], units: readonly UnitCounts[], filter: DotFilter): DrawnDot[] {
  const countOf = (i: number): number => filter === 'all' ? units[i].total : units[i][filter];
  const colorOf = (i: number): string => {
    if (filter !== 'all') return COLORS[filter];
    const u = units[i];
    let best: 'a' | 'b' | 'c' | 'd' = 'b', bv = u.b;
    if (u.a > bv) { best = 'a'; bv = u.a; }
    if (u.c > bv) { best = 'c'; bv = u.c; }
    if (u.d > bv) { best = 'd'; bv = u.d; }
    return COLORS[best];
  };
  return keys.map((_, i) => i)
    .sort((x, y) => countOf(y) - countOf(x))
    .filter((i) => !(countOf(i) <= 0))
    .map((i) => ({ key: keys[i], r: Math.min(Math.max(1.1, 1.1 * Math.sqrt(countOf(i))), 16).toFixed(1), fill: colorOf(i) }));
}

interface FakeNode { key: string | null; attrs: Map<string, string> }

/** A model of the county svg: outlines first, then one circle per county,
 *  changed only the way setAttribute, removeAttribute and insertBefore would
 *  change a real one. */
class FakeSvg implements DotSurface<FakeNode> {
  readonly nodes: FakeNode[] = [];
  /** the circles in county order, as the client lists them for the model */
  readonly dots: FakeNode[] = [];
  writes = 0;
  moves = 0;

  constructor(outlines: number, keys: readonly string[]) {
    for (let i = 0; i < outlines; i++) this.nodes.push({ key: null, attrs: new Map([['class', 'map-state']]) });
    for (const key of keys) {
      const dot = { key: key, attrs: new Map<string, string>() };
      this.nodes.push(dot);
      this.dots.push(dot);
    }
  }

  children(): FakeNode[] { return this.nodes; }

  write(dot: FakeNode, name: DotAttribute, value: string | null): void {
    this.writes++;
    if (!this.nodes.includes(dot)) throw new Error('wrote to a node that is not a child');
    if (value === null) dot.attrs.delete(name); else dot.attrs.set(name, value);
  }

  move(dot: FakeNode, before: FakeNode | null): void {
    this.moves++;
    const from = this.nodes.indexOf(dot);
    if (from < 0) throw new Error('moved a node that is not a child');
    this.nodes.splice(from, 1);
    if (before === null) {
      this.nodes.push(dot);
    } else {
      const at = this.nodes.indexOf(before);
      if (at < 0) throw new Error('anchored on a node that is not a child');
      this.nodes.splice(at, 0, dot);
    }
  }

  /** What a reader sees: the drawn dots in order, with the radius and fill they show. */
  drawn(): DrawnDot[] {
    return this.nodes
      .filter((c) => c.key !== null && c.attrs.get('display') !== 'none')
      .map((c) => ({ key: c.key as string, r: c.attrs.get('r'), fill: c.attrs.get('fill') }));
  }

  /** Every attribute of every node, to count what an update actually changed. */
  attributes(): Map<string, string> {
    const out = new Map<string, string>();
    this.nodes.forEach((c, i) => {
      for (const [name, value] of c.attrs) out.set((c.key ?? 'outline ' + i) + ' ' + name, value);
    });
    return out;
  }
}

function differences(before: Map<string, string>, after: Map<string, string>): number {
  let n = 0;
  for (const [k, v] of after) if (before.get(k) !== v) n++;
  for (const k of before.keys()) if (!after.has(k)) n++;
  return n;
}

function randomUnits(random: () => number): UnitCounts {
  const one = (): number => random() < 0.4 ? 0 : 1 + Math.floor(random() * 8);
  const u = { a: one(), b: one(), c: one(), d: one(), total: 0 };
  u.total = u.a + u.b + u.c + u.d;
  return u;
}

describe('updateDots', () => {
  test('draws what the rebuild drew after every step of random walks through counts and filters', () => {
    const random = seeded(20260915);
    let steps = 0, reappearedResized = 0, hiddenNow = 0;
    for (let walk = 0; walk < 40; walk++) {
      const n = 1 + Math.floor(random() * 50);
      const keys = Array.from({ length: n }, (_, i) => String(1001 + 7 * i));
      const units = keys.map(() => randomUnits(random));
      let filter: DotFilter = 'all';
      const svg = new FakeSvg(3, keys);
      const model = newDotModel(svg.dots);
      for (let step = 0; step < 30; step++) {
        if (step > 0 && random() < 0.4) {
          filter = (['all', 'a', 'b', 'c', 'd'] as DotFilter[])[Math.floor(random() * 5)];
        } else if (step > 0) {
          for (let i = 0; i < n; i++) if (random() < 0.3) units[i] = randomUnits(random);
        }
        const before = model.states.slice();
        const attrsBefore = svg.attributes();
        const movesBefore = svg.moves, writesBefore = svg.writes;
        const current = svg.drawn().map((d) => d.key);

        updateDots(model, units, filter, COLORS, svg);
        steps++;

        const want = rebuilt(keys, units, filter);
        expect(svg.drawn()).toEqual(want);
        /* the outlines stay under every dot */
        expect(svg.nodes.slice(0, 3).map((c) => c.key)).toEqual([null, null, null]);
        /* no redundant write: each write changed an attribute */
        expect(svg.writes - writesBefore).toBe(differences(attrsBefore, svg.attributes()));
        /* no redundant move, once the circles have been ordered the first time:
           at most the fewest moves for the dots that stayed drawn, plus one for
           each dot that came back */
        if (step > 0) {
          const wantKeys = want.map((d) => d.key);
          const stayed = current.filter((k) => wantKeys.includes(k));
          const cameBack = wantKeys.filter((k) => !current.includes(k)).length;
          expect(svg.moves - movesBefore)
            .toBeLessThanOrEqual(fewestMoves(stayed, wantKeys.filter((k) => stayed.includes(k))) + cameBack);
        }
        model.states.forEach((now, i) => {
          if (before[i].hidden && !now.hidden && now.r !== before[i].r) reappearedResized++;
          if (now.hidden) hiddenNow++;
        });
      }
    }
    /* the paths a stale cache would break were actually taken */
    expect(steps).toBe(1200);
    expect(reappearedResized).toBeGreaterThan(50);
    expect(hiddenNow).toBeGreaterThan(1000);
  });

  test('draws what the rebuild drew on the real county file, moving the control under every filter', () => {
    const counties = countyDemand();
    expect(counties.length).toBe(3144);
    const keys = counties.map((c) => c.f);
    const svg = new FakeSvg(51, keys);
    const model = newDotModel(svg.dots);
    let compared = 0, reappearedResized = 0;
    for (const filter of ['all', 'd', 'a', 'c', 'b', 'all'] as DotFilter[]) {
      for (const absorption of [NETWORK_ABSORPTION.default, NETWORK_ABSORPTION.min, NETWORK_ABSORPTION.max, 1.55]) {
        const units = counties.map((c) => allocateCounty(c, absorption).units);
        const before = model.states.slice();
        updateDots(model, units, filter, COLORS, svg);
        expect(svg.drawn(), filter + ' at ' + absorption).toEqual(rebuilt(keys, units, filter));
        compared++;
        model.states.forEach((now, i) => {
          if (before[i].hidden && !now.hidden && now.r !== before[i].r) reappearedResized++;
        });
      }
    }
    expect(compared).toBe(24);
    expect(reappearedResized).toBeGreaterThan(0);
  });

  test('writes nothing and moves nothing when nothing changed', () => {
    const counties = countyDemand().slice(0, 400);
    const units = counties.map((c) => allocateCounty(c, NETWORK_ABSORPTION.default).units);
    const svg = new FakeSvg(2, counties.map((c) => c.f));
    const model = newDotModel(svg.dots);
    updateDots(model, units, 'c', COLORS, svg);
    expect(svg.writes).toBeGreaterThan(0);
    const writes = svg.writes, moves = svg.moves;
    updateDots(model, units, 'c', COLORS, svg);
    expect([svg.writes, svg.moves]).toEqual([writes, moves]);
  });

  test('refuses counts that do not line up with its dots, and a surface missing a drawn dot', () => {
    const one: UnitCounts = { a: 1, b: 0, c: 0, d: 0, total: 1 };
    const svg = new FakeSvg(0, ['1', '2']);
    expect(() => updateDots(newDotModel(svg.dots), [one], 'all', COLORS, svg)).toThrow(/1 counties for 2 dots/);
    /* a surface that takes every write but whose children lack the second dot:
       the order read back cannot be put right, and the update says so */
    const lacking: DotSurface<FakeNode> = {
      children: () => [svg.dots[0]], write: () => undefined, move: () => undefined
    };
    expect(() => updateDots(newDotModel(svg.dots), [one, one], 'all', COLORS, lacking))
      .toThrow(/1 items in the current order, 2 in the desired one/);
    expect(() => newDotModel([svg.dots[0], svg.dots[0]])).toThrow(/listed twice/);
  });
});

describe('a dot between refreshes', () => {
  test('keeps its radius and fill while hidden, and shows again writing only what changed', () => {
    const drawn = nextDotState(UNWRITTEN_DOT, 4, 'B');
    expect(drawn).toEqual({ r: '2.2', fill: 'B', hidden: false });
    expect(dotWrites(UNWRITTEN_DOT, drawn)).toEqual([['r', '2.2'], ['fill', 'B']]);

    const hidden = nextDotState(drawn, 0, 'D');
    expect(hidden).toEqual({ r: '2.2', fill: 'B', hidden: true });
    expect(dotWrites(drawn, hidden)).toEqual([['display', 'none']]);

    expect(dotWrites(hidden, nextDotState(hidden, 4, 'B'))).toEqual([['display', null]]);
    expect(dotWrites(hidden, nextDotState(hidden, 9, 'D'))).toEqual([['display', null], ['r', '3.3'], ['fill', 'D']]);
  });

  test('is the same state when nothing changed, hidden or drawn', () => {
    const drawn = nextDotState(UNWRITTEN_DOT, 4, 'B');
    expect(nextDotState(drawn, 4, 'B')).toBe(drawn);
    const hidden = nextDotState(drawn, 0, 'B');
    expect(nextDotState(hidden, 0, 'C')).toBe(hidden);
    expect(dotWrites(drawn, drawn)).toEqual([]);
  });
});

describe('reorderMoves', () => {
  test('reaches every ordering of up to five items from every other, in the fewest moves', () => {
    let cases = 0;
    for (let n = 0; n <= 5; n++) {
      /* items that are not their own positions, so nothing can lean on that */
      const items = Array.from({ length: n }, (_, i) => 3 + 7 * i);
      const orders = permutations(items);
      for (const current of orders) {
        for (const desired of orders) {
          const moves = reorderMoves(current, desired);
          expect(applyMoves(current, moves)).toEqual(desired);
          expect(moves.length).toBe(fewestMoves(current, desired));
          cases++;
        }
      }
    }
    /* 0! + 1! + 2!^2 + 3!^2 + 4!^2 + 5!^2 */
    expect(cases).toBe(1 + 1 + 4 + 36 + 576 + 14400);
  });

  test('reaches larger random orderings in the fewest moves', () => {
    const random = seeded(3144);
    for (let round = 0; round < 300; round++) {
      const n = 6 + Math.floor(random() * 40);
      const items = Array.from({ length: n }, (_, i) => 1001 + 2 * i);
      const current = shuffled(items, random);
      const desired = shuffled(items, random);
      const moves = reorderMoves(current, desired);
      expect(applyMoves(current, moves)).toEqual(desired);
      expect(moves.length).toBe(fewestMoves(current, desired));
    }
  });

  test('moves nothing when the order already holds, one item when one item is out', () => {
    expect(reorderMoves([4, 1, 9], [4, 1, 9])).toEqual([]);
    expect(reorderMoves([4, 1, 9], [1, 9, 4])).toEqual([[4, null]]);
    expect(reorderMoves([4, 1, 9], [9, 4, 1])).toEqual([[9, 4]]);
    const reversed = [5, 4, 3, 2, 1, 0];
    expect(reorderMoves(reversed, reversed.slice().reverse())).toHaveLength(5);
  });

  test('refuses two orderings of different items', () => {
    expect(() => reorderMoves([1, 2], [1, 2, 3])).toThrow(/2 items in the current order, 3/);
    expect(() => reorderMoves([1, 2, 4], [1, 2, 3])).toThrow(/item 4/);
    expect(() => reorderMoves([1, 1, 2], [1, 2, 3])).toThrow(/missing from the desired order or repeated/);
    expect(() => reorderMoves([1, 2, 3], [1, 2, 2])).toThrow(/repeats an item/);
  });
});

describe('drawOrder', () => {
  test('draws larger counts first, keeps position order between equals, and skips zero', () => {
    expect(drawOrder([2, 5, 0, 5, 1])).toEqual([1, 3, 0, 4]);
    expect(drawOrder([0, 0])).toEqual([]);
    expect(drawOrder([])).toEqual([]);
  });

  test('draws every county in the order the rebuild drew it, at both ends of the control and every filter', () => {
    const counties = countyDemand();
    expect(counties.length).toBe(3144);
    let ties = 0;
    for (const absorption of [NETWORK_ABSORPTION.min, NETWORK_ABSORPTION.default, NETWORK_ABSORPTION.max]) {
      const units = counties.map((c) => allocateCounty(c, absorption).units);
      for (const filter of ['all', 'a', 'b', 'c', 'd'] as DotFilter[]) {
        /* the rebuild's rule, as it was written: one stable sort of the whole
           county list, largest first, then every county with no units skipped */
        const countOf = (i: number): number => filter === 'all' ? units[i].total : units[i][filter];
        const rebuiltOrder = counties.map((_, i) => i).sort((x, y) => countOf(y) - countOf(x)).filter((i) => !(countOf(i) <= 0));
        const order = drawOrder(units.map((u) => dotCount(u, filter)));
        expect(order).toEqual(rebuiltOrder);
        for (let k = 1; k < order.length; k++) if (countOf(order[k]) === countOf(order[k - 1])) ties++;
      }
    }
    /* the tie rule is only tested if the data has ties; it has thousands */
    expect(ties).toBeGreaterThan(10000);
  });

  test('every step of the control resizes and moves hundreds of dots, not thousands', () => {
    /* Why keeping the circles is cheaper than rebuilding them, measured on the
       real file at every step rather than assumed from one. */
    const counties = countyDemand();
    const { min, max, step } = NETWORK_ABSORPTION;
    const values: number[] = [];
    for (let k = 0; min + k * step <= max + 1e-9; k++) values.push(+(min + k * step).toFixed(2));
    expect(values).toHaveLength(13);
    const totalsAt = (absorption: number): number[] =>
      counties.map((c) => dotCount(allocateCounty(c, absorption).units, 'all'));
    let previous = totalsAt(values[0]);
    for (const value of values.slice(1)) {
      const next = totalsAt(value);
      const resized = next.filter((n, i) => dotRadius(n) !== dotRadius(previous[i])).length;
      const moved = reorderMoves(drawOrder(previous), drawOrder(next)).length;
      expect(resized, 'dots resized stepping to ' + value).toBeGreaterThanOrEqual(100);
      expect(resized, 'dots resized stepping to ' + value).toBeLessThan(1000);
      expect(moved, 'dots moved stepping to ' + value).toBeGreaterThanOrEqual(100);
      expect(moved, 'dots moved stepping to ' + value).toBeLessThan(1000);
      previous = next;
    }
  });
});

describe('canReuseMap', () => {
  const counties = [{ f: '01001' }];
  test('reuses a map only while its svg is in the document and it was built from this county list', () => {
    expect(canReuseMap({ svg: { isConnected: true }, counties: counties }, counties)).toBe(true);
    /* after ClientRouter swaps <body>, the old svg is detached */
    expect(canReuseMap({ svg: { isConnected: false }, counties: counties }, counties)).toBe(false);
    /* a new page instance loads the same counties into a new list */
    expect(canReuseMap({ svg: { isConnected: true }, counties: counties }, counties.slice())).toBe(false);
    expect(canReuseMap(null, counties)).toBe(false);
  });
});

describe('a dot', () => {
  const units = (a: number, b: number, c: number, d: number): UnitCounts =>
    ({ a, b, c, d, total: a + b + c + d });

  test('stands for the filtered type, or every type, and is drawn only with a unit', () => {
    expect(dotCount(units(1, 2, 3, 4), 'all')).toBe(10);
    expect(dotCount(units(1, 2, 3, 4), 'c')).toBe(3);
    expect(dotCount(units(1, 2, 0, 4), 'c')).toBe(0);
    expect([0, 1, 2].map(isDrawn)).toEqual([false, true, true]);
  });

  test('grows with the square root of its count, between 1.1 and 16', () => {
    expect(dotRadius(1)).toBe('1.1');
    expect(dotRadius(4)).toBe('2.2');
    expect(dotRadius(100)).toBe('11.0');
    expect(dotRadius(300)).toBe('16.0');
    expect(dotRadius(0.25)).toBe('1.1');
  });

  test('takes the filtered colour, or its dominant type with ties to B, then A, C, D', () => {
    expect(dotFill(units(9, 1, 1, 1), 'd', COLORS)).toBe('D');
    expect(dotFill(units(1, 2, 3, 4), 'all', COLORS)).toBe('D');
    expect(dotFill(units(0, 0, 0, 0), 'all', COLORS)).toBe('B');
    expect(dotFill(units(3, 3, 1, 1), 'all', COLORS)).toBe('B');
    expect(dotFill(units(4, 3, 4, 1), 'all', COLORS)).toBe('A');
    expect(dotFill(units(1, 2, 5, 5), 'all', COLORS)).toBe('C');
  });

  test('reads every unit type from its filter button, and shows every type for anything else', () => {
    expect(UNIT_TYPE_KEYS.map(dotFilterOf)).toEqual([...UNIT_TYPE_KEYS]);
    expect([null, '', 'all', 'e', 'A'].map(dotFilterOf)).toEqual(['all', 'all', 'all', 'all', 'all']);
  });
});
