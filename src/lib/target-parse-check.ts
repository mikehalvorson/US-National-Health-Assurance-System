/* R151 + R277 [§S3]: what the target parser decides, said out loud.
 *
 * parseNum takes the FIRST numeric token in a string, and nothing said which
 * strings that is safe on. Two outcomes are silent. A target that does not
 * parse routes its metric to the qualitative ladder with no error; a target
 * that parses the WRONG number anchors a whole trajectory to it. Both are
 * decided by the catalog's prose, which the audit does not control.
 *
 * Measured across the 130 KPP/TPP maturity targets:
 *   - 7 do not parse: KPP-D1 to D7, the "to be calibrated" outcome metrics.
 *     Every one carries a `template` on its equation, which is the declared
 *     mechanism for a target with no numeric scaffold. So the null result is
 *     corroborated by a second signal rather than silent, and
 *     unTemplatedNonParsingTargets asserts the two sets agree.
 *   - 1 parses a number a reader would not pick: KPP-C2.
 *
 * Split out of rollout-kind-check.ts, which was carrying this and the rollout
 * `kind` vocabulary - two subjects, two reasons to change one file.
 */
import { EQUATIONS } from './equations';
import { parseNum } from './phase-targets';
import { forEachRolloutRow, kppTpp, QUALITY_DATA } from './quality';
import type { QualityData } from './quality-data';

/* KPP-C2's target reads "to be reconciled with $4.75T total system cost and
   current population denominator", and the parser returns 4.75 with unit
   'money' - a national total in trillions read as a per-person dollar figure.
   BQ9 filed this hazard as demonstrated but unverified. It is live, on a
   maturity target, and it was eligible as a clamping anchor.

   It has no parenthesis, so R277's aside-stripping cannot reach it. R233 keeps
   it out of the anchor set; this declares it so it cannot be rediscovered as
   new. */
export const DECLARED_TARGET_MISPARSES: Record<string, string> = {
  'KPP-C2': 'the target names $4.75T of national system cost, not a per-person ' +
    'dollar target; parseNum returns 4.75 money. The equation carries a template, ' +
    'so the parse is not used to render the value, and R233 keeps it out of the ' +
    'anchor set.'
};

/* A year read as a quantity is the failure R277 demonstrated. Bounded rather
   than pattern-matched, because the shape it takes varies and the magnitude
   does not: no live KPP/TPP target or rollout value is a count in the 1900s. */
function isCalendarShaped(n: number): boolean {
  return Number.isInteger(n) && n >= 1900 && n <= 2100;
}

/* A string that parses to something a reader would not pick, and that nobody
   has declared. Two shapes are caught: a calendar-shaped number, and a template
   metric whose target parses at all - a template says the catalog string has no
   numeric scaffold, so a parse from it is incidental.

   Review finding: this covered the 130 maturity targets and stopped there, but
   parseNum is also called on every rollout value inside committedAnchors, where
   a wrong number becomes a clamping anchor rather than a displayed target. All
   727 are scanned now. */
export function undeclaredTargetMisparses(Q: QualityData = QUALITY_DATA): string[] {
  const out: string[] = [];
  for (const p of kppTpp(Q)) {
    if (DECLARED_TARGET_MISPARSES[p.id]) continue;
    const meta = parseNum(p.target);
    if (!meta) continue;
    const d = EQUATIONS[p.id];
    if (d && d.template) {
      out.push(p.id + ': templated target parses as ' + meta.num + ' ' + meta.unit);
    } else if (isCalendarShaped(meta.num)) {
      out.push(p.id + ': target parses a calendar-shaped ' + meta.num);
    }
  }
  forEachRolloutRow(Q, function (p, e) {
    if (DECLARED_TARGET_MISPARSES[p.id]) return;
    const ev = parseNum(e.value);
    if (ev && isCalendarShaped(ev.num)) {
      out.push(p.id + '@' + e.phase + ': value parses a calendar-shaped ' + ev.num);
    }
  });
  return out.sort();
}

/* A declared misparse that no longer reproduces. Keeps the list from
   outliving the prose it describes. */
export function staleTargetMisparses(Q: QualityData = QUALITY_DATA): string[] {
  const byId = new Map(Q.parameters.map((p) => [p.id, p]));
  return Object.keys(DECLARED_TARGET_MISPARSES).filter((id) => {
    const p = byId.get(id);
    if (!p) return true;
    const meta = parseNum(p.target);
    const d = EQUATIONS[id];
    return !meta || !d || !d.template;
  }).sort();
}

/* Every KPP/TPP whose maturity target does not parse must carry a template.
   That is what turns "the parser returned null" from a silent reroute into a
   corroborated decision: two independent signals saying the same thing. */
export function unTemplatedNonParsingTargets(Q: QualityData = QUALITY_DATA): string[] {
  return kppTpp(Q)
    .filter((p) => !parseNum(p.target))
    .filter((p) => {
      const d = EQUATIONS[p.id];
      return !d || !d.template;
    })
    .map((p) => p.id)
    .sort();
}
