import { expect, test } from 'vitest';
import { niceTicks, barPath, tooltip, hideTip } from '../../src/lib/chart-util';

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
