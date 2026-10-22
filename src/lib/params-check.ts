/* The parameter table's checks: the helpers the self-test rows call to hold
 * params.ts's declarations to their own rules.
 *
 * Moved out of params.ts (the branch review against main, 2026-10-21, found
 * it mixing the data the engine reads with the checks over that data). Here,
 * beside each other: every per-household distribution against the
 * denominator it declares, every graded parameter and engine constant against
 * its citation, the honestly unsourced ones printed, and the rendered prose
 * fields of every parameter swept for a catalog code. The code moved as it
 * was; comments that said "this file" or "here" say params.ts. Their rows
 * are in selftests.ts: the sourcing row under this module's surface, the
 * denominator and prose rows under care.ts's, beside the checks they pair
 * with there.
 *
 * Pure, like params.ts: no node:fs, no DOM. params.ts re-exports every one,
 * so every import that names it still works; that makes the two modules
 * import each other, which is safe because nothing here reads params.ts
 * until a function is called. */
import { isSourcedGrade } from './model-types';
import { HOUSEHOLD_DENOMINATORS, PARAM_DEFS, catalogCode, ENGINE_CONSTANTS } from './params';

/* R172 [§S8]: the two distributions that carry their own household counts have
 * to agree with the denominator they are declared to be. `GROUPS` sums to CBO's
 * universe and `WEALTH_DIST` to the Census one, which is the three-way split
 * R84 measured; nothing held either sum to its declaration, so the split could
 * quietly become a four-way one. The sums live in taxparams.ts and the
 * declarations in params.ts, so this takes them as arguments rather than
 * importing across the seam.
 */
export function denominatorSumDrift(
  sums: Array<{ id: string; sum: number; of: string }>
): string[] {
  const out: string[] = [];
  for (const s of sums) {
    const d = HOUSEHOLD_DENOMINATORS.filter((x) => x.id === s.of)[0];
    if (!d) { out.push(s.id + ': no denominator declared as ' + s.of); continue; }
    /* the counts are one-decimal figures typed by hand in both places */
    if (Math.abs(s.sum - d.households) > 0.05) {
      out.push(s.id + ' sums to ' + s.sum.toFixed(2) + ', ' + s.of + ' declares ' + d.households);
    }
  }
  return out;
}

/* R135 [§S11b]: a parameter graded medium or better states where its number
 * came from.
 *
 * This is baseline-registry.ts's ninth check, one layer up, and P17 said in so
 * many words to copy the shape rather than design a new one. The seed has had
 * this gate since P15; params.ts is what the live engine reads and it had
 * nothing, so nine medium-graded parameters carried an empty url through five
 * sections.
 *
 * Two things are deliberate, both taken from the seed's version:
 *
 * 1. The honestly-ungraded are PRINTED, not counted into a bare pass. A
 *    parameter with no external source is fine as long as it is graded low and
 *    says so; a gap nobody can see is a gap nobody closes.
 * 2. Failure is on grade-without-citation, never on the absence of a citation
 *    by itself. lowValueCapture went the other way for exactly this reason:
 *    no study estimates what share of low-value care a records mesh removes,
 *    so it is graded low with the search recorded, rather than pointed at the
 *    pool's URL, which does not carry that number. */
export function unsourcedGradedParameters(): string[] {
  /* [P17 fix run 6]: ENGINE_CONSTANTS lives in params.ts, carries the same
     `confidence` and `url` pair, and was outside this sweep. Latent rather than
     live - its one medium-graded constant has a URL - but the rule is about the
     pair, not about which array holds it. */
  const graded = (c: string | undefined, url: string | undefined) =>
    c !== undefined && isSourcedGrade(c) && (url === undefined || url.trim() === '');
  return [
    ...PARAM_DEFS
      .filter((d) => graded(d.confidence, d.url))
      .map((d) => d.id + ' (' + d.confidence + ') ' + (d.label || '')),
    ...ENGINE_CONSTANTS
      .filter((c) => graded(c.confidence, c.url))
      .map((c) => c.id + ' (' + c.confidence + ') engine constant')
  ];
}

/* The other half of the pair: which parameters are honestly without a source.
   Reported so the number is visible and can go down, not asserted away. */
export function parameterSourceBacklog(): string[] {
  return [
    ...PARAM_DEFS.filter((d) => d.url === undefined || d.url.trim() === '')
      .map((d) => d.id + ' (' + (d.confidence ?? 'ungraded') + ')'),
    ...ENGINE_CONSTANTS.filter((c) => c.url === undefined || c.url.trim() === '')
      .map((c) => c.id + ' (' + c.confidence + ')')
  ];
}

export function paramProseCatalogCodes(): string[] {
  const code = catalogCode();
  const out: string[] = [];
  for (const p of PARAM_DEFS) {
    const rendered: Array<{ where: string; text: string }> = [
      { where: 'label', text: p.label || '' },
      { where: 'unit', text: p.unit || '' },
      { where: 'source', text: p.source || '' },
      { where: 'divergence.leans', text: p.divergence ? p.divergence.leans : '' },
      { where: 'divergence.recommended', text: p.divergence ? p.divergence.recommended : '' },
      { where: 'divergence.note', text: p.divergence ? p.divergence.note : '' }
    ];
    for (const r of rendered) {
      const hit = r.text.match(code);
      if (hit) out.push(p.id + '.' + r.where + ': ' + hit[0]);
    }
  }
  return out;
}
