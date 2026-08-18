/* =========================================================================
 * Overview page display math: pure port of docs/js/app.js renderHero
 * (lines 142-181) and renderTiles (lines 183-210).
 *
 * No DOM, no window/document, no side effects: computeOverview returns a
 * struct of already-formatted display strings so both the build-time
 * static render and the client-side recompute script can share one source
 * of truth for the Overview hero/tiles/family-burden note.
 * ========================================================================= */
import { runMonteCarlo } from './model';
import type { MonteCarloResult } from './model-types';
import {
  DEFLATOR_2023_TO_2024, MATURE_INDEX, MONTE_CARLO_DRAWS, MONTE_CARLO_SEED
} from './params';
import { money, moneyShort, pct, perCap } from './format';

export interface OverviewTile {
  label: string;
  value: string;
  range: string;
}

export interface OverviewView {
  heroValue: string;
  heroRange: string;
  nha2041: string;
  base2041: string;
  hero2041Range: string;
  tiles: OverviewTile[];
  familyNote: string;
}

/* app.js:138-140 bandTxt() */
function bandTxt(p10: number, p90: number, fmt: (v: number) => string): string {
  return fmt(p10) + " – " + fmt(p90) + " (10th–90th pct)";
}

/* Run the Overview Monte Carlo once so the text render and the path chart can
   share a single result. R25 [§S6a]: the draw count and the seed are declared
   in params.ts with the measurement that chose them. */
export function runOverviewMc(
  scenario: string,
  sliders: Record<string, number> | null
): MonteCarloResult {
  return runMonteCarlo(scenario, sliders, MONTE_CARLO_DRAWS, MONTE_CARLO_SEED);
}

/* computeOverview split so callers holding an mc (e.g. the client, which also
   feeds the chart) do not re-run the model. */
export function computeOverview(
  scenario: string,
  sliders: Record<string, number> | null
): OverviewView {
  return computeOverviewFromMc(runOverviewMc(scenario, sliders));
}

export function computeOverviewFromMc(mc: MonteCarloResult): OverviewView {
  const DEF = DEFLATOR_2023_TO_2024;

  /* ---- renderHero (app.js:142-181) ---- */
  const tot = mc.steady.matureToday;
  const heroValue = money(tot.p50 * DEF) + "/yr";
  const heroRange = bandTxt(tot.p10 * DEF, tot.p90 * DEF, function (v) { return money(v); });

  /* 2041 pair: NHA steady state next to the same-year status quo */
  const ss = mc.steady.total;
  const baseMature = mc.baseline[MATURE_INDEX] * DEF;
  const delta = ss.p50 * DEF - baseMature;
  const nha2041 = money(ss.p50 * DEF) + "/yr";
  const hero2041Range =
    bandTxt(ss.p10 * DEF, ss.p90 * DEF, function (v) { return money(v); }) +
    " · " + (delta >= 0 ? "+" : "−") + moneyShort(Math.abs(delta)) +
    " (" + (delta >= 0 ? "+" : "−") +
    Math.abs(100 * delta / baseMature).toFixed(1) + "%) vs status quo";
  const base2041 = money(baseMature) + "/yr";

  /* Family burden: where the status quo's growth actually lands.
     Households sponsor 27% of NHE (CMS); ~141M households by 2041. */
  const famNow = 0.27 * 5300, fam2041 = 0.27 * baseMature;
  const hhNow = 132.2, hh2041 = 141;
  const d41 = mc.modePath.detail[MATURE_INDEX];
  const kppPerHH = 0.05 * d41.newRevenue * DEF * 1e9 / (hh2041 * 1e6);
  const familyNote =
    "Where that growth lands on families: households sponsor about 27% of " +
    "American health spending through premiums, payroll deductions, and " +
    "bills. Doing nothing means that family share grows from roughly " +
    money(famNow) + " today to " + money(fam2041) + " by 2041, " +
    "from about $" + Math.round(famNow * 1e9 / (hhNow * 1e6)).toLocaleString("en-US") +
    " to $" + Math.round(fam2041 * 1e9 / (hh2041 * 1e6)).toLocaleString("en-US") +
    " per household per year, with no new coverage to show for it. Under NHA " +
    "in the same year, covered care costs $0 at the point of use and the " +
    "the plan caps ordinary households at 5% of the new financing " +
    "(about $" + Math.round(kppPerHH).toLocaleString("en-US") + " per household); " +
    "the rest shifts to the tax side, weighted toward the top. Who pays what " +
    "is the Taxes & Financing tab.";

  /* ---- renderTiles (app.js:183-210) ---- */
  const lastIdx = MATURE_INDEX;
  const tBaseMature = mc.baseline[lastIdx] * DEF;
  const deltaVsBase = mc.steady.total.p50 * DEF - tBaseMature;
  const tiles: OverviewTile[] = [
    {
      label: "Share of GDP at maturity",
      value: pct(mc.steady.gdpPct.p50),
      range: pct(mc.steady.gdpPct.p10) + " – " + pct(mc.steady.gdpPct.p90)
    },
    {
      label: "Per person per year",
      value: perCap(mc.steady.perCapita.p50 * DEF),
      range: perCap(mc.steady.perCapita.p10 * DEF) + " – " + perCap(mc.steady.perCapita.p90 * DEF)
    },
    {
      label: "vs. status quo at maturity",
      value: (deltaVsBase >= 0 ? "+" : "−") + moneyShort(Math.abs(deltaVsBase)),
      range: "status quo reaches " + money(tBaseMature) + " by 2041"
    },
    {
      label: "New revenue needed (mature)",
      value: money(mc.steady.newRevenue.p50 * DEF) + "/yr",
      range: bandTxt(mc.steady.newRevenue.p10 * DEF, mc.steady.newRevenue.p90 * DEF, moneyShort)
    }
  ];

  return {
    heroValue: heroValue,
    heroRange: heroRange,
    nha2041: nha2041,
    base2041: base2041,
    hero2041Range: hero2041Range,
    tiles: tiles,
    familyNote: familyNote
  };
}
