/* =========================================================================
 * Financing spec + note builders: pure port of docs/js/app.js renderFinancing
 * (lines 313-342). Derives the mature-year (2041) public-cost waterfall from a
 * Monte Carlo result. No DOM; returns a FinancingSpec for renderFinancingChart.
 * ========================================================================= */
import { MATURE_INDEX } from './params';
import type { MonteCarloResult } from './model-types';
import type { FinancingSpec } from './financing-chart';

/* app.js:313-333 */
export function financingSpec(mc: MonteCarloResult, _DEF: number): FinancingSpec {
  const t = MATURE_INDEX; // R22 [§S6a]: the mature year, declared once
  const d = mc.modePath.detail[t];
  const need = d.pubCost;
  const fedUse = Math.min(d.fedRedirect, need);
  const stateUse = Math.min(d.stateMoe, Math.max(0, need - fedUse));
  const empUse = Math.min(d.empContrib, Math.max(0, need - fedUse - stateUse));
  const fbUse = Math.min(d.taxFeedback || 0, Math.max(0, need - fedUse - stateUse - empUse));
  const newRev = Math.max(0, need - fedUse - stateUse - empUse - fbUse);

  return {
    segments: [
      { label: 'Redirected federal spending', value: fedUse, color: 'var(--series-1)' },
      { label: 'State maintenance-of-effort', value: stateUse, color: 'var(--series-2)' },
      { label: 'Employer contribution', value: empUse, color: 'var(--series-3)' },
      { label: 'Tax on wage pass-through', value: fbUse, color: 'var(--series-7)' },
      { label: 'New revenue needed', value: newRev, color: 'var(--series-5)' }
    ],
    gap: { label: 'New revenue needed', value: newRev },
    wealth: { label: 'Wealth-tax package (after collection losses)', value: d.wealthRevenue }
  };
}

/* app.js:335-342 */
export function financingNote(mc: MonteCarloResult, _DEF: number): string {
  const t = MATURE_INDEX;
  const d = mc.modePath.detail[t];
  const need = d.pubCost;
  const fedUse = Math.min(d.fedRedirect, need);
  const stateUse = Math.min(d.stateMoe, Math.max(0, need - fedUse));
  const empUse = Math.min(d.empContrib, Math.max(0, need - fedUse - stateUse));
  const fbUse = Math.min(d.taxFeedback || 0, Math.max(0, need - fedUse - stateUse - empUse));
  const newRev = Math.max(0, need - fedUse - stateUse - empUse - fbUse);
  const covered = d.wealthRevenue / (newRev || 1);
  return 'Under these assumptions the extreme-wealth package covers ' +
    (newRev <= 0 ? 'the entire gap (no new revenue needed)' :
      Math.min(999, Math.round(100 * covered)) + '% of the new-revenue requirement') +
    '. The remaining instruments (high-income and capital-income taxes, ' +
    'health-sector rent taxes, and the broad backstop) must cover the rest. ' +
    'The plan caps ordinary-household incremental burden at 5% of new financing.';
}
