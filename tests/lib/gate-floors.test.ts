import { expect, test } from 'vitest';
import {
  gateFloorChecks,
  gateFloorDrift,
  KNOWN_UNANCHORED_FLOORS,
  unexplainedExemptions
} from '../../src/lib/gate-floors';

/* R149 [§S0] — selfTestNoRegression skips 'progression floor' and
   'phase milestone', so the framework-anchored entries were excluded from the
   strongest test. The exemption has a real reason (AN7: a gate floor and a
   maturity target are different quantities) but the remedy is to check them
   against their source requirement, not to excuse them. */

test('R149: every gate-anchored floor matches its gate requirement', () => {
  expect(gateFloorDrift()).toEqual([]);
});

test('R149: the check actually reaches the gate floors', () => {
  const checks = gateFloorChecks();
  expect(checks.length).toBeGreaterThanOrEqual(7);
  expect(checks.map((c) => c.gate).sort()).toContain('G1');
  expect(checks.every((c) => c.numbers.length > 0)).toBe(true);
});

test('R149: a floor drifting from its gate is caught', () => {
  const checks = gateFloorChecks();
  const b9 = checks.find((c) => c.paramId === 'KPP-B9')!;
  // Gate 2 states <=5 per 10,000; the maturity target is <=3. AN7's point:
  // these are different quantities, and the floor must match the GATE.
  expect(b9.numbers).toContain(5);
  expect(b9.matched).toBe(true);
});

test('R149: progression floors with no gate are named, not silently exempt', () => {
  const found = unexplainedExemptions().map((e) => e.paramId + '@' + e.phase).sort();
  expect(found).toEqual([...KNOWN_UNANCHORED_FLOORS].sort());
});
