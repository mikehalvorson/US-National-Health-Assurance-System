/* R149 [§S0]: check gate floors against their cited requirement.
 *
 * selfTestNoRegression skips `kind === 'progression floor'` and
 * `'phase milestone'`, so the framework-anchored entries - the strongest claims
 * in the catalog - were excluded from the strongest test. The exemption has a
 * real reason (AN7: KPP-B9's Gate 2 ceiling of <=5/10k is legitimately looser
 * than its <=3/10k maturity target, because a gate floor and a maturity target
 * are different quantities). But the remedy is to check them against their
 * source requirement, not to excuse them.
 *
 * The rows cite a gate (G1-G8), not a PR-SCH-* id, so the requirement they are
 * checked against is the gate's own floor statement in rollout.ts - an
 * independent prose statement of the same number, taken from the framework's
 * gate table. A floor that drifts from the gate it claims to satisfy fails.
 */
import { GATES } from './rollout';
import { QUALITY_DATA } from './quality';

export interface FloorCheck {
  paramId: string;
  phase: string;
  gate: string;
  value: string;
  numbers: number[];
  matched: boolean;
}

/* Quantities as a reader would state them: 80, 5, 98, 6, 99.5, 0.2.
   Phase and gate references (P3, P4, G1) are addresses, not quantities.
   Leaving them in made TPP-2.1's ">=75% Wave I to move P3->P4" read as the
   numbers 75, 3 and 4, and 3 and 4 appear in no gate statement. */
const ADDRESS = /\b[PG][0-9]+\b/g;
const QUANTITY = /[0-9]+(?:\.[0-9]+)?/g;

function numbersIn(text: string): number[] {
  return (text.replace(ADDRESS, ' ').match(QUANTITY) || []).map(Number);
}

export function gateFloorChecks(): FloorCheck[] {
  const floorText: Record<string, string> = {};
  for (const g of GATES) floorText['G' + String(g.n).replace(/^G/, '')] = g.floor;

  const out: FloorCheck[] = [];
  for (const p of QUALITY_DATA.parameters) {
    for (const e of (p.rollout || [])) {
      if (!e.gate || e.kind !== 'progression floor') continue;
      const requirement = floorText[e.gate];
      const nums = numbersIn(e.value);
      /* the floor's own quantities must all appear in the gate's statement of it */
      const matched = requirement != null && nums.length > 0 &&
        nums.every((n) => numbersIn(requirement).includes(n));
      out.push({
        paramId: p.id, phase: e.phase, gate: e.gate,
        value: e.value, numbers: nums, matched: matched
      });
    }
  }
  return out;
}

export function gateFloorDrift(): FloorCheck[] {
  return gateFloorChecks().filter((c) => !c.matched);
}

/* The other half of R149: the entries that REMAIN exempt from the
 * no-regression test must be exactly the gate-anchored ones, not an open
 * licence for any row to opt out.
 *
 * Measured 2026-08-12: three progression floors carry no gate, so they are
 * exempt from selfTestNoRegression with nothing anchoring the exemption. That
 * is R149's finding, stated rather than tolerated. Pinned so a fourth fails the
 * build; §S16 owns the controlled vocabulary that should prevent it. */
export const KNOWN_UNANCHORED_FLOORS = ['KPP-C5@P7', 'KPP-C6@P7', 'TPP-11.5@P5'];

export function unexplainedExemptions(): Array<{ paramId: string; phase: string; kind: string }> {
  const out: Array<{ paramId: string; phase: string; kind: string }> = [];
  for (const p of QUALITY_DATA.parameters) {
    for (const e of (p.rollout || [])) {
      /* a progression floor is exempt because a gate justifies it; a phase
         milestone is exempt because the framework fixes it. A progression
         floor with no gate has neither justification. */
      if (e.kind === 'progression floor' && !e.gate) {
        out.push({ paramId: p.id, phase: e.phase, kind: e.kind });
      }
    }
  }
  return out;
}
