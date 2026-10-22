import { expect, test } from 'vitest';
import { captureFocus, restoreFocus } from '../../src/lib/focus-restore';
import type { FocusScope, FocusableLike } from '../../src/lib/focus-restore';

/* =========================================================================
 * R242 [S14], declared by its row and unimplemented
 * until review 8 of P20. The fixes had been verified in a browser and had
 * nothing holding them, because the code lived in a client script that
 * touches `document` as it is evaluated and so cannot be imported here.
 * ========================================================================= */

interface StubEl extends FocusableLike {
  attrs: Record<string, string>;
  focused: boolean;
}

function el(attrs: Record<string, string> = {}): StubEl {
  return {
    attrs,
    focused: false,
    getAttribute(name: string) { return this.attrs[name] ?? null; },
    focus() { this.focused = true; }
  };
}

function scope(children: StubEl[], focusables: StubEl[] = children): FocusScope & StubEl {
  const self = el() as FocusScope & StubEl;
  self.contains = (node: unknown) => children.indexOf(node as StubEl) >= 0;
  self.querySelector = (selector: string): FocusableLike | null => {
    const m = /^\[([^=]+)="(.*)"\]$/.exec(selector);
    if (m) return children.find((c) => c.attrs[m[1]] === m[2]) ?? null;
    return focusables[0] ?? null;   /* the fallback selector */
  };
  return self;
}

/* ---- R242 test 1 -------------------------------------------------------- */

test('R242: activating a diagram node leaves focus on a node, not on body', () => {
  const active = el({ 'data-node-id': 'IDX-CLAIMS' });
  const diagram = scope([active]);
  const detail = scope([]);
  const saved = captureFocus(active, [
    { scope: diagram, attribute: 'data-node-id' },
    { scope: detail, attribute: 'data-eq-node' }
  ]);
  expect(saved).not.toBeNull();
  expect(saved!.scopeIndex).toBe(0);

  /* the rebuild: same ids, different element objects */
  const rebuilt = el({ 'data-node-id': 'IDX-CLAIMS' });
  const newDiagram = scope([rebuilt]);
  expect(restoreFocus(saved, [newDiagram, scope([])])).toBe(true);
  expect(rebuilt.focused).toBe(true);
});

/* ---- R242 test 2 -------------------------------------------------------- */

test('R242: activating an inputs-legend button leaves focus inside the panel', () => {
  const button = el({ 'data-eq-node': 'ramp:cov' });
  const diagram = scope([]);
  const detail = scope([button]);
  const saved = captureFocus(button, [
    { scope: diagram, attribute: 'data-node-id' },
    { scope: detail, attribute: 'data-eq-node' }
  ]);
  expect(saved!.scopeIndex).toBe(1);

  /* Selecting a leaf swaps the panel for one whose buttons are different, so
     the exact element does NOT come back. Focus must still land in the panel
     rather than on body, which is what the row asks for. */
  const other = el({ 'data-eq-node': 'param:drugPriceCut' });
  const newDetail = scope([other]);
  expect(restoreFocus(saved, [scope([]), newDetail])).toBe(true);
  expect(other.focused).toBe(true);
});

test('R242: focus outside both regions is left alone', () => {
  /* Restoring here would be focus theft - a worse defect than the one fixed.
     The search box and the three selects are the cases that matter. */
  const elsewhere = el({ id: 'quality-search' });
  const saved = captureFocus(elsewhere, [
    { scope: scope([]), attribute: 'data-node-id' },
    { scope: scope([]), attribute: 'data-eq-node' }
  ]);
  expect(saved).toBeNull();
  expect(restoreFocus(saved, [scope([]), scope([])])).toBe(false);
});

test('R242: a missing scope is survivable', () => {
  const active = el({ 'data-node-id': 'X' });
  const saved = captureFocus(active, [
    { scope: scope([active]), attribute: 'data-node-id' },
    { scope: null, attribute: 'data-eq-node' }
  ]);
  expect(restoreFocus(saved, [null, null])).toBe(false);
});
