/* =========================================================================
 * Baseline-growth demographic decomposition note: pure port of
 * docs/js/app.js renderGrowthDecomp (lines 512-529). Splits the status-quo
 * real-growth assumption into an aging component and per-person cost growth.
 * ========================================================================= */
import { AGE_STRUCTURE, costWeight } from './params';
import { effectiveParams } from './scenarios';

/* Owner, 2026-10-19: the shares, the 85+ weight and population growth are
   read from the data; the note typed them ("~19% to ~23%", "~1.9% to ~2.9%",
   "4.4 times", "~0.4%/yr"), and the 4.4 was a weight CMS's tables do not
   carry (they put 85+ at 3.5 times the all-ages average, 2020). */
function bandShare(ids: string[], year: 'share2024' | 'share2041'): number {
  let s = 0;
  AGE_STRUCTURE.bands.forEach(function (b) { if (ids.indexOf(b.id) >= 0) s += b[year]; });
  return s;
}
function pct1(x: number): string { return (100 * x).toFixed(1) + '%'; }
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
  const old = ['65–84', '85+'], oldest = ['85+'];
  /* the 85+ multiple is CMS's, read through costWeight() (which refuses a
     band CMS does not state) rather than from the structure's weight, so
     scaling the weights (which the ratio above ignores) cannot move the
     sentence either */
  return 'Where the growth comes from: shifting age structure alone (the 65+ share ' +
    'rises from ' + pct1(bandShare(old, 'share2024')) + ' to ' + pct1(bandShare(old, 'share2041')) +
    ' by 2041, and 85+ from ' + pct1(bandShare(oldest, 'share2024')) + ' to ' + pct1(bandShare(oldest, 'share2041')) +
    ') contributes about ' + agingPP.toFixed(1) + ' points of the ' + totalG.toFixed(1) +
    '%/yr real growth assumption, computed from Census age projections and ' +
    'CMS\'s per-person spending by age (people 85 and over use about ' + costWeight('85+').toFixed(1) +
    ' times the all-ages average, 2020). The rest is per-person cost growth: technology, intensity, ' +
    'and prices. Population growth adds about ' + eff.popGrowth.mode.toFixed(1) + '%/yr on top in the totals.';
}
