/* =========================================================================
 * Benchmark chart-rows + readout/verdict builders: pure port of
 * docs/js/app.js renderBenchmarks (lines 367-427). Compares the model's
 * mature-scale total and federal-financing shift with observed U.S. spending
 * and CBO/Urban/Mercatus estimates. No DOM; returns rows + text strings.
 * ========================================================================= */
import { BASE2023, BENCHMARKS, FRAMEWORK_CLAIM, NHE_2024_OBSERVED, claimPerPerson } from './params';
import { money, moneyShort } from './format';
import type { MonteCarloResult } from './model-types';
import type { BenchmarkRow } from './benchmark-chart';

/* moneyShort rounds to one decimal, which turns $4,750B into "$4.8T" and
   loses the digits of the number being discussed. */
function claimMoney(b: number): string {
  return '$' + (b / 1000).toFixed(2).replace(/0$/, '').replace(/\.$/, '') + 'T';
}

/* Owner, 2026-10-12: the plan states its cost twice, as a total and as a
 * per-person ceiling, and the two do not agree on any one population. Both
 * are computed here from the plan's total and the model's 2023 population;
 * the ceiling is read from the plan's requirement and the model's own
 * per-person cost from its per-capita equation at maturity, both passed in
 * by health.astro at build time, so this module stays free of the file
 * system and the equation engine.
 *
 * Review 3 of P24: the first version named the year the 2023 population,
 * grown at the model's rate, would reach the population the ceiling implies.
 * That set a total stated at today's scale against a future population, the
 * comparison rule 6 forbids, and the plan does not say it either: its own
 * arithmetic stops at the implied population and calls it materially above
 * the 2024 one. And the model's own per-person figure, the point of the
 * owner's question, was never set beside the ceiling. */
export function claimPerPersonText(requirementPerPerson: number, modelPerPerson: number): string {
  const dollars = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
  const impliedM = FRAMEWORK_CLAIM.mode * 1e3 / requirementPerPerson;
  return 'Per person, ' + claimMoney(FRAMEWORK_CLAIM.mode) + ' over the ' +
    BASE2023.populationM.toFixed(1) + ' million people the model is calibrated on (2023) is ' +
    dollars(claimPerPerson()) + ' a year. The plan also sets mature per-capita cost at or below ' +
    dollars(requirementPerPerson) + ' per person in real 2024 dollars. Its own arithmetic divides ' +
    claimMoney(FRAMEWORK_CLAIM.mode) + ' by that ceiling to imply about ' + impliedM.toFixed(1) +
    ' million people, a population it notes is materially above the 2024 one. It marks the per-person figure as ' +
    'still to be reconciled with its total and a current population, so neither is a target here. ' +
    'On the same basis, 2024 dollars over the 2023 population, the model\'s mature cost is ' +
    dollars(modelPerPerson) + ' per person, from the per-capita cost equation on the Quality tab.';
}

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
    /* R183 [§S12]: this row typed the observed 2024 total, its band and its
       basis, and overview.ts typed the same total again with nothing beside
       it. Registered in params.ts and read by both. */
    {
      label: NHE_2024_OBSERVED.label, note: NHE_2024_OBSERVED.note,
      lo: NHE_2024_OBSERVED.low, hi: NHE_2024_OBSERVED.high,
      mid: NHE_2024_OBSERVED.mid, color: 'var(--baseline-series)',
      basis: NHE_2024_OBSERVED.basis
    },
    /* R26 [§S6a]: the framework's own figure, drawn from the constant and
       carrying the basis its own catalog states. It was in params.ts,
       imported by nothing, and discussed in prose that no longer matched
       what the model produced. */
    {
      label: "The plan's stated figure", note: 'stated range, real 2024$',
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
  const nheDiffPct = 100 * (nheMid / NHE_2024_OBSERVED.mid - 1);
  const nheRelation = Math.abs(nheDiffPct) < 0.05 ? 'essentially equal to' :
    (nheDiffPct > 0 ? Math.abs(nheDiffPct).toFixed(1) + '% above' :
      Math.abs(nheDiffPct).toFixed(1) + '% below');

  const nheResult =
    'The model centers on ' + money(nheMid) + ' per year, with a ' +
    moneyShort(nhe.p10 * DEF) + ' to ' +
    moneyShort(nhe.p90 * DEF) + ' uncertainty range. That is ' +
    nheRelation + ' CMS\'s final 2024 total of ' + money(NHE_2024_OBSERVED.mid) + '. The model is ' +
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
  const frameworkClaimResult =
    "The plan's own stated figure of " + claimMoney(FRAMEWORK_CLAIM.mode) +
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
