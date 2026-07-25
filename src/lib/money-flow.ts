/* =========================================================================
 * Money-flow spec builders: pure port of docs/js/app.js renderMoneyFlow
 * (lines 434-478). todayFlowSpec is the static CMS 2023 sponsor->channel map;
 * nhaFlowSpec/nhaFlowTitle derive the mature-year NHA financing panel from a
 * Monte Carlo result. No DOM; returns FlowSpec objects for renderFlowDiagram.
 * ========================================================================= */
import { MONEYFLOW } from './params';
import { money } from './format';
import type { MonteCarloResult } from './model-types';
import type { FlowSpec } from './flow-diagram';

/* app.js:434-439 */
export function todayFlowSpec(): FlowSpec {
  return {
    sources: MONEYFLOW.sources,
    channels: MONEYFLOW.channels,
    ribbons: MONEYFLOW.ribbons,
    aria: 'How U.S. health spending is funded today: households, employers, ' +
      'federal, state, and other private sources flowing to private insurance, ' +
      'Medicare, Medicaid, out-of-pocket bills, and other programs'
  };
}

/* app.js:443-477 */
export function nhaFlowSpec(mc: MonteCarloResult, DEF: number): FlowSpec {
  const i41 = mc.years.indexOf(2041);
  const d = mc.modePath.detail[i41];
  const k = (mc.steady.matureToday.p50 / d.nheNha) * DEF;
  const fed = d.fedRedirect * k, state = d.stateMoe * k, emp = d.empContrib * k;
  const newRev = d.newRevenue * k;
  const hhTax = 0.05 * newRev, progTax = 0.95 * newRev;
  const pub = d.pubCost * k;
  const residual = Math.max(0, d.nheNha - d.pubCost) * k;

  return {
    sources: [
      { id: 'hh', label: 'Households', value: hhTax + residual, color: 'var(--series-1)' },
      { id: 'emp', label: 'Employers', value: emp, color: 'var(--series-2)' },
      { id: 'wealth', label: 'Wealth & high incomes', value: progTax, color: 'var(--series-6)' },
      { id: 'fed', label: 'Federal government', value: fed, color: 'var(--series-5)' },
      { id: 'state', label: 'State & local', value: state, color: 'var(--series-3)' }
    ],
    channels: [
      { id: 'pub', label: 'NHA public payer', value: pub },
      { id: 'res', label: 'Residual private & OOP', value: residual }
    ],
    ribbons: [
      { from: 'fed', to: 'pub', value: fed, note: 'what Washington already spends on Medicare, Medicaid, ACA, and VA care, redirected' },
      { from: 'state', to: 'pub', value: state, note: 'state maintenance-of-effort (today\'s Medicaid share)' },
      { from: 'emp', to: 'pub', value: emp, note: 'payroll contribution replacing today\'s premium payments' },
      { from: 'wealth', to: 'pub', value: progTax, note: '95% of new revenue from wealth, high-income, capital, and health-rent taxes, as designed; test achievability on the Taxes & Financing tab' },
      { from: 'hh', to: 'pub', value: hhTax, note: 'ordinary households capped at 5% of new financing (KPP-C8)' },
      { from: 'hh', to: 'res', value: residual, note: 'supplemental coverage and non-covered extras that stay private' }
    ],
    aria: 'How the mature NHA system would be funded: redirected federal and ' +
      'state spending, employer payroll contributions, progressive taxes, and ' +
      'a capped ordinary-household share, nearly all flowing to a single public payer'
  };
}

/* app.js:453-455 */
export function nhaFlowTitle(mc: MonteCarloResult, DEF: number): string {
  const i41 = mc.years.indexOf(2041);
  const d = mc.modePath.detail[i41];
  const k = (mc.steady.matureToday.p50 / d.nheNha) * DEF;
  const pub = d.pubCost * k;
  const residual = Math.max(0, d.nheNha - d.pubCost) * k;
  return 'Under NHA: mature system at 2024 scale (' + money(pub + residual) + ')';
}
