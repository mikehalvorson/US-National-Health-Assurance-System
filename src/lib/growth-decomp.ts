/* =========================================================================
 * Baseline-growth demographic decomposition note: pure port of
 * docs/js/app.js renderGrowthDecomp (lines 512-529). Splits the status-quo
 * real-growth assumption into an aging component and per-person cost growth.
 * ========================================================================= */
import { AGE_STRUCTURE } from './params';
import { effectiveParams } from './scenarios';

export function growthDecompNote(
  scenario: string,
  sliders: Record<string, number> | null
): string {
  const A = AGE_STRUCTURE.bands;
  let idx24 = 0, idx41 = 0;
  A.forEach(function (b) {
    idx24 += b.share2024 * b.costw;
    idx41 += b.share2041 * b.costw;
  });
  const agingPP = 100 * (Math.pow(idx41 / idx24, 1 / 17) - 1); /* per year, 2024-2041 */
  const eff = effectiveParams(scenario, sliders);
  const totalG = eff.baselineRealGrowth.mode;
  return 'Where the growth comes from: shifting age structure alone (the 65+ share ' +
    'rises from ~19% to ~23% by 2041, and 85+ from ~1.9% to ~2.9%) contributes ' +
    'about ' + agingPP.toFixed(1) + ' points of the ' + totalG.toFixed(1) +
    '%/yr real growth assumption, computed from Census age projections and ' +
    'CMS/MEPS per-capita spending by age (85+ households use about 4.4 times ' +
    'the average). The rest is per-person cost growth: technology, intensity, ' +
    'and prices. Population growth adds ~0.4%/yr on top in the totals.';
}
