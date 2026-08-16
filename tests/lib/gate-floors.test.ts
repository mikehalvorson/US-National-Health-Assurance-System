import { expect, test } from 'vitest';
import {
  gateFloorChecks,
  gateFloorCollisions,
  gateFloorDrift,
  gatePhaseDrift,
  KNOWN_UNANCHORED_FLOORS,
  unexplainedExemptions
} from '../../src/lib/gate-floors';
import { GATES } from '../../src/lib/rollout';

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

/* R121 [§S2] — the gate → phase map was an undocumented inline dict giving every
   gate one phase. Gate 1's decision point names a transition, so one phase drops
   half of it, and that half was the only R117 claim that could not be confirmed. */

test('R121: every gate floor lands on the phases its decision point names', () => {
  expect(gatePhaseDrift()).toEqual([]);
});

test('R121: the Gate 1 claims floor is carried at both ends of its transition', () => {
  const g1 = GATES.find((g) => g.n === 'G1')!;
  expect(g1.when).toMatch(/P3.*P4/);
  const phases = gateFloorChecks()
    .filter((c) => c.gate === 'G1').map((c) => c.phase).sort();
  expect(phases).toEqual(['P3', 'P4']);
});

test('R121: no two gates write one undistinguished floor', () => {
  // The row's premise, measured: G4 writes KPP-C5 and KPP-C6 at P8 and G5 writes
  // TPP-11.5 at P8, so the two gates share a phase but never a parameter.
  expect(gateFloorCollisions()).toEqual([]);
  const atP8 = gateFloorChecks().filter((c) => c.phase === 'P8');
  expect(atP8.map((c) => c.gate).sort()).toEqual(['G4', 'G4', 'G5']);
  expect(new Set(atP8.map((c) => c.paramId)).size).toBe(3);
});

test('R149: progression floors with no gate are named, not silently exempt', () => {
  const found = unexplainedExemptions().map((e) => e.paramId + '@' + e.phase).sort();
  expect(found).toEqual([...KNOWN_UNANCHORED_FLOORS].sort());
});
