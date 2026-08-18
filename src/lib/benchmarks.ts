/* =========================================================================
 * Benchmark chart-rows + readout/verdict builders: pure port of
 * docs/js/app.js renderBenchmarks (lines 367-427). Compares the model's
 * mature-scale total and federal-financing shift with observed U.S. spending
 * and CBO/Urban/Mercatus estimates. No DOM; returns rows + text strings.
 * ========================================================================= */
import { BENCHMARKS, FRAMEWORK_CLAIM } from './params';
import { money, moneyShort } from './format';
import type { MonteCarloResult } from './model-types';
import type { BenchmarkRow } from './benchmark-chart';

/* app.js:368-373 */
export function benchmarkChartRows(mc: MonteCarloResult, DEF: number): BenchmarkRow[] {
  return [
    {
      label: 'Dashboard model: mature system at 2024 scale',
      note: 'real 2024$; 10th–90th percentile',
      lo: mc.steady.matureToday.p10 * DEF, hi: mc.steady.matureToday.p90 * DEF,
      mid: mc.steady.matureToday.p50 * DEF, color: 'var(--series-1)',
      basis: 'Total national health expenditure at maturity, all payers, real 2024 dollars'
    },
    {
      label: 'Observed U.S. health spending, 2024', note: 'CMS preliminary estimate',
      lo: 5250, hi: 5350, mid: 5300, color: 'var(--baseline-series)',
      basis: 'Total national health expenditure actually spent in 2024, all payers'
    },
    /* R26 [§S6a]: the framework's own figure, drawn from the constant and
       carrying the basis its own catalog states. It was in params.ts,
       imported by nothing, and discussed in prose that no longer matched
       what the model produced. */
    {
      label: "Framework's own claim", note: 'stated range, real 2024$',
      lo: FRAMEWORK_CLAIM.low, hi: FRAMEWORK_CLAIM.high, mid: FRAMEWORK_CLAIM.mode,
      color: 'var(--series-7)', basis: FRAMEWORK_CLAIM.basis
    }
  ];
}

export interface BenchmarkText {
  frameworkClaimResult: string;
  nheResult: string;
  fedModel: string;
  fedModelRange: string;
  fedResult: string;
  delta2030Result: string;
  verdict: string;
}

/* app.js:376-427 */
export function benchmarkText(mc: MonteCarloResult, DEF: number): BenchmarkText {
  const d30 = mc.nhe2030delta;
  const nhe = mc.steady.matureToday;
  const nheMid = nhe.p50 * DEF;
  const nheDiffPct = 100 * (nheMid / 5300 - 1);
  const nheRelation = Math.abs(nheDiffPct) < 0.05 ? 'essentially equal to' :
    (nheDiffPct > 0 ? Math.abs(nheDiffPct).toFixed(1) + '% above' :
      Math.abs(nheDiffPct).toFixed(1) + '% below');

  const nheResult =
    'The model centers on ' + money(nheMid) + ' per year, with a ' +
    moneyShort(nhe.p10 * DEF) + ' to ' +
    moneyShort(nhe.p90 * DEF) + ' uncertainty range. That is ' +
    nheRelation + ' the preliminary 2024 total of about $5.3T. The model is ' +
    'therefore operating at the observed scale of the U.S. health system.';

  const fed = mc.steady.fedIncrease;
  const fedMid = fed.p50 * DEF;
  const fedModel = money(fedMid) + '/yr';
  const fedModelRange =
    moneyShort(fed.p10 * DEF) + ' to ' +
    moneyShort(fed.p90 * DEF) + ' uncertainty range';

  const fedResult =
    'These figures should not share one precise axis because their scale ' +
    'years, benefit packages, and transition periods differ. Their useful ' +
    'common finding is the order of magnitude: a single-payer system moves ' +
    'trillions of dollars per year onto the federal ledger. A direct score ' +
    "of the dashboard's mature estimate would require a harmonized year, " +
    'price basis, benefit package, and current-law baseline.';

  const delta2030Result =
    'CBO estimated that its illustrative designs would change total national ' +
    "health spending by −$700B to +$300B in 2030. This model's 2030 change " +
    'from its status-quo baseline is ' + moneyShort(d30.p10 * DEF) +
    ' to ' + moneyShort(d30.p90 * DEF) + ', with a median of ' +
    moneyShort(d30.p50 * DEF) + '. In this dashboard, 2030 is still ' +
    'mid-transition, so this is a directional and scale check rather than an ' +
    'exact like-for-like comparison.';

  const nhePlausible = Math.abs(nheDiffPct) <= 15;
  const cboNheOverlap = d30.p10 * DEF <= BENCHMARKS.cboNheChange.high &&
    d30.p90 * DEF >= BENCHMARKS.cboNheChange.low;
  const verdict = (nhePlausible
    ? 'The total-spending estimate aligns closely with observed U.S. spending. '
    : 'The total-spending estimate sits far enough from observed U.S. spending to warrant review. ') +
    (cboNheOverlap
      ? "The model's 2030 spending-change range also overlaps CBO's range. "
      : "The model's 2030 spending-change range does not overlap CBO's range. ") +
    "The federal estimates confirm the trillion-dollar scale of the budget shift, but their different years and designs prevent a precise pass-or-fail comparison." +
    ' These checks test plausibility, not precision, and they do not ' +
    'validate every individual assumption.';

  /* R26 [§S6a]: the comparison against the framework's own claim, computed.
     The page used to say the model "lands somewhat above it, and reaches it
     only under the optimistic scenario". The first half was vague and the
     second stopped being true: measured across the whole catalog, the claim
     is below the 10th percentile of every scenario, including the optimistic
     one, whose central estimate does land inside the claim's stated range.
     Deriving the sentence is what stops it drifting again. */
  const claimDiffPct = 100 * (nheMid / FRAMEWORK_CLAIM.mode - 1);
  const inBand = nhe.p10 * DEF <= FRAMEWORK_CLAIM.mode &&
    nhe.p90 * DEF >= FRAMEWORK_CLAIM.mode;
  /* moneyShort rounds to one decimal, which turns $4,750B into "$4.8T" and
     loses the digits of the number being discussed. */
  const claimMoney = (b: number) =>
    '$' + (b / 1000).toFixed(2).replace(/0$/, '').replace(/\.$/, '') + 'T';
  const frameworkClaimResult =
    "The framework's own figure of " + claimMoney(FRAMEWORK_CLAIM.mode) +
    ' per year, range ' + claimMoney(FRAMEWORK_CLAIM.low) + ' to ' +
    claimMoney(FRAMEWORK_CLAIM.high) + ', is on the same basis as this chart: ' +
    FRAMEWORK_CLAIM.basis.toLowerCase() + '. ' + FRAMEWORK_CLAIM.basisSource +
    ' On that basis the model centers ' + Math.abs(claimDiffPct).toFixed(1) +
    '% ' + (claimDiffPct >= 0 ? 'above' : 'below') + ' it, and the claim sits ' +
    (inBand ? 'inside' : 'outside') +
    " the model's 10th to 90th percentile band for this scenario. The figure " +
    'is displayed for comparison and is never a target: no parameter is tuned ' +
    'to reproduce it.';

  return {
    frameworkClaimResult, nheResult, fedModel, fedModelRange, fedResult,
    delta2030Result, verdict
  };
}
