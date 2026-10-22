import { expect, test } from 'vitest';
import { niceTicks, barPath, tooltip, hideTip, tipPosition } from '../../src/lib/chart-util';

test('niceTicks(0,100,5) yields evenly spaced nice values', () => {
  expect(niceTicks(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100]);
});

test('niceTicks handles a zero span without dividing by zero', () => {
  expect(niceTicks(5, 5, 5)).toEqual([5]);
});

test('barPath square base (r<=0.5) is a plain rectangle path', () => {
  expect(barPath(0, 0, 10, 10, 0, 'up')).toBe('M0,0 h10 v10 h-10Z');
});

test('barPath up with radius produces rounded top corners', () => {
  const d = barPath(0, 0, 10, 20, 3, 'up');
  expect(d.startsWith('M0,20')).toBe(true);
  expect(d).toContain('Q'); // has curve segments
});

/* R180 [landed in §S9d]: the tooltip singleton and the body ClientRouter
   swaps.
 *
 * `tooltip()` memoised its node in a module-level `tip` and returned it
 * whenever `tip` was truthy. Astro's <ClientRouter /> replaces <body> on
 * every in-app navigation, so from the second page onward `tip` pointed at a
 * detached node: `showTip` filled it, set display:block on it, and nothing
 * appeared. Every chart in the application shares this one singleton.
 *
 * Reproduced in a browser on the long-term-care chart before the fix -- one
 * nav link away and back, then hover: zero tooltips in the document, and zero
 * on focus too. This test is the regression, run against a document stub
 * because the suite's environment is 'node'.
 *
 * The stub is deliberately minimal: `div()` reads `document` at CALL time, so
 * assigning globalThis.document before the call is enough to exercise the
 * real branch rather than a source-text pattern. */
interface StubNode {
  className: string;
  style: { display: string };
  isConnected: boolean;
  appendChild(n: StubNode): void;
}

function stubDocument(): { doc: unknown; body: StubNode } {
  const make = (): StubNode => ({
    className: '', style: { display: '' }, isConnected: false,
    appendChild(n: StubNode) { n.isConnected = true; }
  });
  const body = make();
  body.isConnected = true;
  return { doc: { body, createElement: make }, body };
}

test('R180: tooltip() re-creates its node after the body is swapped', () => {
  const saved = (globalThis as { document?: unknown }).document;
  try {
    const first = stubDocument();
    (globalThis as { document?: unknown }).document = first.doc;
    const a = tooltip();
    expect(a.className).toBe('nha-tooltip');
    expect((a as unknown as StubNode).isConnected).toBe(true);
    // same document, same node: the memo still has to work
    expect(tooltip()).toBe(a);

    // ClientRouter swaps the body: the old node is no longer connected
    (a as unknown as StubNode).isConnected = false;
    const second = stubDocument();
    (globalThis as { document?: unknown }).document = second.doc;
    const b = tooltip();
    expect(b).not.toBe(a);
    expect((b as unknown as StubNode).isConnected).toBe(true);

    // and hideTip stays safe on whatever it is holding
    expect(() => hideTip()).not.toThrow();
  } finally {
    if (saved === undefined) delete (globalThis as { document?: unknown }).document;
    else (globalThis as { document?: unknown }).document = saved;
  }
});

/* R181 [S14] -------------------------------------------------------------
 *
 * The audit's own acceptance test for this row is "tooltip position stays
 * within the viewport on a 360px-wide screen". The stylesheet caps
 * .nha-tooltip at 300px, so on a 360px screen the old code produced
 * left = 360 - 300 - 8 = 52, comfortably on screen: that test passed before
 * the fix and after it, and would have proved nothing either way. The cases
 * below drive the clamp at widths where it actually failed.
 */

test('tipPosition keeps the tooltip on screen when it is wider than the viewport', () => {
  /* 280px is a real device width - the narrow outer screen of a folding
     phone - and the old expression gave left = 280 - 300 - 8 = -28. */
  const p = tipPosition({ clientX: 140, clientY: 300 }, { w: 300, h: 120 }, { w: 280, h: 700 });
  expect(p.left).toBeGreaterThanOrEqual(0);
  expect(p.top).toBeGreaterThanOrEqual(0);
  /* and the expression this replaced, so the case is pinned to the defect
     rather than to a number somebody may later decide looks wrong */
  const beforeTheFix = Math.min(140 + 14, 280 - 300 - 8);
  expect(beforeTheFix).toBeLessThan(0);
});

test('tipPosition still prefers the right of the pointer when there is room', () => {
  const p = tipPosition({ clientX: 400, clientY: 300 }, { w: 220, h: 90 }, { w: 1280, h: 800 });
  expect(p.left).toBe(414);        /* x + 14 */
  expect(p.top).toBe(300 - 90 - 10);
});

test('tipPosition pins to the right margin rather than overflowing', () => {
  const p = tipPosition({ clientX: 1270, clientY: 300 }, { w: 220, h: 90 }, { w: 1280, h: 800 });
  expect(p.left + 220).toBeLessThanOrEqual(1280);
});

test('tipPosition flips below the pointer when there is no room above', () => {
  const p = tipPosition({ clientX: 400, clientY: 20 }, { w: 220, h: 200 }, { w: 1280, h: 800 });
  expect(p.top).toBeGreaterThanOrEqual(8);
  expect(p.top + 200).toBeLessThanOrEqual(800);
});

test('a tooltip opened by focus never covers the mark that has focus', () => {
  /* Review 9 of P20 measured the org-diagram tooltip covering 3,144 of a
     9,356 px² focused box: the focus handler handed over the box's bottom
     edge, and the tooltip went above that point - onto the box. Every box
     position down a viewport, every tooltip height that fits above or below. */
  const vh = 800;
  for (const h of [60, 178, 300]) {
    for (let boxTop = 0; boxTop + 45 <= vh; boxTop += 23) {
      const avoid = { top: boxTop, bottom: boxTop + 45 };
      const roomAbove = avoid.top - h - 10 >= 8;
      const roomBelow = avoid.bottom + 18 + h <= vh - 8;
      if (!roomAbove && !roomBelow) continue;   /* nowhere to go: clamped */
      const p = tipPosition({ clientX: 500, clientY: avoid.top, avoid }, { w: 300, h }, { w: 1280, h: vh });
      const overlap = Math.min(avoid.bottom, p.top + h) - Math.max(avoid.top, p.top);
      expect(overlap, 'box at ' + boxTop + ', tooltip ' + h + 'px').toBeLessThanOrEqual(0);
    }
  }
});

test('a pointer event, which has no box to avoid, is placed as before', () => {
  const p = tipPosition({ clientX: 400, clientY: 300 }, { w: 220, h: 90 }, { w: 1280, h: 800 });
  expect(p.top).toBe(300 - 90 - 10);
});

test('tipPosition never returns a negative edge at any degenerate viewport', () => {
  const sizes = [0, 1, 100, 280, 320, 360, 768, 1920];
  for (const vw of sizes) {
    for (const vh of sizes) {
      for (const w of [0, 120, 300, 4000]) {
        for (const h of [0, 90, 400, 4000]) {
          const p = tipPosition({ clientX: vw / 2, clientY: vh / 2 }, { w: w, h: h }, { w: vw, h: vh });
          expect(Number.isFinite(p.left)).toBe(true);
          expect(Number.isFinite(p.top)).toBe(true);
          expect(p.left).toBeGreaterThanOrEqual(0);
          expect(p.top).toBeGreaterThanOrEqual(0);
        }
      }
    }
  }
});
