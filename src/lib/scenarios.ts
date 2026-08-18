/* =========================================================================
 * Scenario Catalog - SCN-BASE through SCN-RURAL-STRESS
 * =========================================================================
 * Implements the Source Package's 19-scenario catalog as parameter
 * perturbations on top of the base model. Each override either:
 *   - replaces a parameter's (low, mode, high) triple:  { id: [lo, mo, hi] }
 *   - scales all three by a multiplier:                 { id: {mult: x} }
 * plus optional structural knobs (ramp delays, shock spending).
 * These are honest simplifications: each scenario notes its mechanism, and
 * qualitative effects the cost model cannot capture are stated, not faked.
 * ========================================================================= */
import { PARAM_DEFS } from './params';
import type { Triangular } from './model-types';

export type ScenarioOverride = [number, number, number] | { mult: number };

export interface ScenarioShock {
  startYear: number;
  years: number;
  amountB: number;
}

export interface ScenarioStructural {
  unitsRampMult?: number;
  costShareDelayYears?: number;
  coverageDelayYears?: number;
  stateMoeMult?: number;
  shock?: ScenarioShock;
}

export interface Scenario {
  id: string;
  name: string;
  desc: string;
  overrides: Record<string, ScenarioOverride>;
  structural?: ScenarioStructural;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "SCN-BASE", name: "Base case",
    desc: "All parameters at their researched central estimates.",
    overrides: {}
  },
  {
    id: "SCN-OPT", name: "Optimistic implementation",
    desc: "Savings levers hit their high ends; demand response and transition costs land low; modest rate compression succeeds.",
    overrides: {
      drugPriceCut: [40, 50, 60],
      providerAdminSavings: [4, 5.5, 7],
      publicAdminRate: [1.3, 1.7, 2.2],
      utilIncrease: [4, 7, 11],
      providerPaymentFactor: [0.83, 0.89, 0.95],
      transitionTotal: [800, 1150, 1500],
      careModelSavings: [20, 35, 50]
    }
  },
  {
    id: "SCN-PESS", name: "Pessimistic implementation",
    desc: "Savings underdeliver, demand surges, payment compression fails politically, transition runs long and expensive.",
    overrides: {
      drugPriceCut: [15, 27, 40],
      providerAdminSavings: [1, 2.5, 4],
      publicAdminRate: [2.5, 3.5, 4.5],
      utilIncrease: [10, 15, 22],
      providerPaymentFactor: [0.95, 1.0, 1.06],
      transitionTotal: [1600, 2100, 2800],
      careModelSavings: [5, 12, 25]
    }
  },
  {
    id: "SCN-UNIT-UNDER", name: "Unit network underbuilt",
    desc: "The four-unit network reaches only ~60% of its planned scale: care-model savings shrink, ED diversion misses, cost-sharing elimination is partially delayed by its phase gate.",
    overrides: {
      unitsCost: { mult: 0.65 },
      careModelSavings: { mult: 0.5 },
      lowValueCapture: { mult: 0.75 }
    },
    structural: { unitsRampMult: 0.6, costShareDelayYears: 2 }
  },
  {
    id: "SCN-SPEC-SEVERE", name: "Severe specialist bottlenecks",
    desc: "Specialist queues collapse; bottleneck premium pay and delayed care raise clinical costs; e-consult resolution underdelivers.",
    overrides: {
      providerPaymentFactor: [0.92, 0.98, 1.05],
      careModelSavings: { mult: 0.7 },
      workforceEdu: { mult: 1.3 }
    }
  },
  {
    id: "SCN-HOSP-LOW", name: "Hospital budgets undercalibrated",
    desc: "Global budgets set too low: service-line stress forces stabilization-corridor spending and later budget corrections.",
    overrides: {
      providerPaymentFactor: [0.82, 0.88, 0.94],
      transitionTotal: { mult: 1.15 },
      extractionSavings: { mult: 0.7 }
    }
  },
  {
    id: "SCN-HOSP-HIGH", name: "Hospital budgets overcalibrated",
    desc: "Global budgets locked in above efficient cost; hospitals capture transition fear as permanent revenue.",
    overrides: {
      providerPaymentFactor: [0.96, 1.02, 1.08],
      extractionSavings: { mult: 0.6 }
    }
  },
  {
    id: "SCN-WEALTH-LOW", name: "Wealth financing underperforms",
    desc: "Avoidance/evasion cuts extreme-wealth revenue roughly in half; the financing gap shifts to other instruments (visible in the financing panel - total cost is unchanged).",
    overrides: {
      wealthTaxPotential: [140, 200, 270],
      wealthCollectionEff: [55, 68, 80]
    }
  },
  {
    id: "SCN-EMP-FAIL", name: "Employer pass-through noncompliance",
    desc: "Employer contribution capture falls well short as firms restructure to avoid the contribution; financing gap widens.",
    overrides: {
      employerCapture: [40, 55, 68]
    }
  },
  {
    id: "SCN-TRUST-COLLAPSE", name: "Public trust collapse",
    desc: "Delayed enrollment and care avoidance during transition, then catch-up costs; heavier ombudsman/appeals load. Access and health-outcome damage is qualitative and NOT priced here.",
    overrides: {
      governanceRate: [0.9, 1.3, 1.8],
      transitionTotal: { mult: 1.2 },
      utilIncrease: [8, 12, 18]
    },
    structural: { coverageDelayYears: 1 }
  },
  {
    id: "SCN-AI-FAIL", name: "AI safety/equity failure",
    desc: "Unit-network AI tooling suspended after safety failures: units run human-only at higher cost and lower throughput.",
    overrides: {
      unitsCost: { mult: 1.3 },
      careModelSavings: { mult: 0.7 },
      itOperating: { mult: 1.25 }
    }
  },
  {
    id: "SCN-CYBER", name: "Major cyber outage",
    desc: "A ransomware-scale event mid-transition: recovery spending plus permanently higher cyber operations.",
    overrides: {
      itOperating: { mult: 1.35 }
    },
    structural: { shock: { startYear: 6, years: 2, amountB: 45 } }
  },
  {
    id: "SCN-DRUG-SHORT", name: "Drug shortage crisis",
    desc: "Supply shocks force emergency procurement above negotiated prices for several years; negotiation savings partially suspended.",
    overrides: {
      drugPriceCut: { mult: 0.7 }
    },
    structural: { shock: { startYear: 5, years: 3, amountB: 18 } }
  },
  {
    id: "SCN-PANDEMIC", name: "Pandemic / public-health surge",
    desc: "A pandemic hits mid-transition: two years of surge utilization and emergency public-health spending.",
    overrides: {
      emsPhExpansion: { mult: 1.3 }
    },
    structural: { shock: { startYear: 7, years: 2, amountB: 220 } }
  },
  {
    id: "SCN-LTC-AGING", name: "High aging & LTC demand",
    desc: "Aging runs above projection: LTC demand and baseline growth both rise. Tests the plan's biggest expansion under its worst demographics.",
    overrides: {
      ltcExpansion: [250, 330, 420],
      ltcWageFloor: { mult: 1.3 },
      baselineRealGrowth: [3.0, 3.8, 4.6]
    }
  },
  {
    id: "SCN-STATE-RESIST", name: "Hostile state noncooperation",
    desc: "Multiple states refuse compacts: federal fallback administration costs more, state maintenance-of-effort partially fails, rollout slips.",
    overrides: {
      transitionTotal: { mult: 1.12 },
      publicAdminRate: { mult: 1.15 }
    },
    structural: { coverageDelayYears: 1, stateMoeMult: 0.75 }
  },
  {
    id: "SCN-LEGAL", name: "Major legal invalidation",
    desc: "Courts strike the wealth-tax pillar; fallback instruments (mark-to-market, estate structures) recover only part of the revenue; rollout slips a year.",
    overrides: {
      wealthTaxPotential: { mult: 0.5 },
      transitionTotal: { mult: 1.08 }
    },
    structural: { coverageDelayYears: 1 }
  },
  {
    id: "SCN-WF-SHORT", name: "Workforce shortages exceed plan",
    desc: "Vacancies force premium pay and overtime; some induced demand goes unmet (lower spend, worse access; the access harm is qualitative, not priced).",
    overrides: {
      providerPaymentFactor: [0.92, 0.99, 1.06],
      workforceEdu: { mult: 1.4 },
      utilIncrease: [4, 8, 13]
    }
  },
  {
    id: "SCN-BH-SURGE", name: "Behavioral health demand surge",
    desc: "Unmet-need release runs far above estimate once coverage is universal.",
    overrides: {
      bhExpansion: [70, 110, 160]
    }
  },
  {
    id: "SCN-RURAL-STRESS", name: "Rural access stress",
    desc: "Rural hospital fragility worse than modeled: heavier readiness payments, EMS spending, and stabilization corridors.",
    overrides: {
      emsPhExpansion: { mult: 1.35 },
      transitionTotal: { mult: 1.1 },
      extractionSavings: { mult: 0.8 },
      unitsCost: { mult: 1.15 }
    }
  }
];

export const SCENARIOS_BY_ID: Record<string, Scenario> = {};
SCENARIOS.forEach(function (s) { SCENARIOS_BY_ID[s.id] = s; });

/* ---- R61 [AC5, AC8]: the catalog's declared shape ------------------------
 * Nothing in this file pushed a self-test, and the engine's Monte Carlo check
 * ran the base case alone, so nineteen of the twenty scenarios were executed
 * by nothing at all. The stress catalog is what the robustness claims rest
 * on, and none of it was checked.
 *
 * The stress count is stated here rather than read back off SCENARIOS.length,
 * because a check that derives its expectation from the thing it is checking
 * agrees with any edit. Deleting a scenario has to fail. medications.ts pins
 * its family count the same way and for the same reason.
 * ------------------------------------------------------------------------ */
export const BASE_SCENARIO_ID = 'SCN-BASE';
export const STRESS_SCENARIO_COUNT = 19;

/* The path fields a run is allowed to produce negative, each with its reason.
 * Everything else a path row carries is a cost, a quantity or a share, and a
 * negative value in one of those is a defect. Listing the exceptions rather
 * than the rule means a field added to the row later is swept the day it is
 * added instead of being silently outside a hand-kept list. */
export const SIGNED_PATH_FIELDS: { field: string; why: string }[] = [
  {
    field: 'householdRelief',
    why: 'R23 [S5] left this one deliberately unclamped. In the years before ' +
      'coverage arrives, households pay more rather than less, and a negative ' +
      'relief figure states that plainly instead of hiding it at zero.'
  }
];

/* The catalog's shape, checkable without running the model: the declared
 * stress count, one base case, unique ids, and the naming the page's own
 * option list depends on. */
export function catalogShapeProblems(): string[] {
  const problems: string[] = [];
  const stress = SCENARIOS.filter(function (s) { return s.id !== BASE_SCENARIO_ID; });
  if (stress.length !== STRESS_SCENARIO_COUNT) {
    problems.push('catalog holds ' + stress.length + ' stress scenarios, declared ' +
      STRESS_SCENARIO_COUNT);
  }
  const base = SCENARIOS.filter(function (s) { return s.id === BASE_SCENARIO_ID; });
  if (base.length !== 1) problems.push(base.length + ' scenarios claim to be the base case');
  else if (Object.keys(base[0].overrides).length || base[0].structural) {
    problems.push(BASE_SCENARIO_ID + ' overrides something, so it is not a base case');
  }
  const seen = new Set<string>();
  for (const s of SCENARIOS) {
    if (seen.has(s.id)) problems.push(s.id + ' is declared twice');
    seen.add(s.id);
    if (!s.id.startsWith('SCN-')) problems.push(s.id + ' is not named SCN-*');
    if (!s.name.trim()) problems.push(s.id + ' has no name');
    if (!s.desc.trim()) problems.push(s.id + ' has no description');
  }
  return problems;
}

/* ---- R63 [§S5]: the natural domain of a parameter, from its own unit ----
 * A parameter whose unit expresses a percentage or a share of something
 * cannot exceed 100 by construction. `mult` used to scale straight past that.
 * Reading the ceiling off the declared unit means a new bounded parameter is
 * covered the day it is added, with no list to remember to update.
 *
 * Only an upper bound, and only for percentage units. A "%/yr" growth rate is
 * a rate of change and is not bounded at 100, so it is excluded by name; $B
 * quantities and counts have no ceiling here at all. Negative values are
 * clamped for every parameter, because no parameter in this model is
 * meaningfully negative and a negative multiplier is a typo. */
export const PERCENT_UNIT = /^%|% of\b|^share\b/;
export const RATE_UNIT = /\/yr\b/;

export function naturalCeiling(p: { unit?: string }): number | null {
  const unit = p.unit || '';
  if (RATE_UNIT.test(unit)) return null;
  return PERCENT_UNIT.test(unit) ? 100 : null;
}

function clampTo(v: number, cap: number | null): number {
  const floored = Math.max(0, v);
  return cap == null ? floored : Math.min(floored, cap);
}

/* Apply a scenario to the parameter definitions, returning a new array of
 * effective (low, mode, high) triples keyed by id. Slider adjustments from
 * the UI are applied AFTER scenario overrides (user beats preset). */
export function effectiveParams(
  scenarioId: string,
  sliderModes: Record<string, number> | null
): Record<string, Triangular> {
  const scn = SCENARIOS_BY_ID[scenarioId] || SCENARIOS_BY_ID["SCN-BASE"];
  const out: Record<string, Triangular> = {};
  PARAM_DEFS.forEach(function (p) {
    let lo = p.low, mo = p.mode, hi = p.high;
    const ov = scn.overrides[p.id];
    if (ov) {
      if (Array.isArray(ov)) { lo = ov[0]; mo = ov[1]; hi = ov[2]; }
      else if (typeof ov.mult === "number") {
        /* R63 [§S5]: `mult` scaled low/mode/high blindly. A share or a
           percentage has a natural ceiling its own unit implies, and nothing
           enforced it: `wealthCollectionEff` needs only `mult: 1.1` to reach
           92.4% of a 100% maximum, and `lowValueCapture`, `employerCapture`
           and `wagePassThrough` are the same shape. No shipped scenario does
           it today - the largest live multiplier on a bounded parameter is
           SCN-STATE-RESIST's 1.15 on publicAdminRate - so this is latent, and
           latent is where it should stay.
           The domain comes from the unit, not from a hand-kept list. */
        const cap = naturalCeiling(p);
        lo = clampTo(lo * ov.mult, cap);
        mo = clampTo(mo * ov.mult, cap);
        hi = clampTo(hi * ov.mult, cap);
      }
    }
    /* User slider: shift mode, scale low/high to preserve relative spread.
       R134 [§S6a]: and then clamp to the same natural domain `mult` is held
       to. R63 closed the scenario path and left this one open, so the check it
       added swept scenarios only. A slider does not scale a band, it re-centres
       it and rebuilds the spread proportionally, which is why the effect is
       larger: employerCapture at its slider maximum of 100 produced a high of
       120% of employer spend, wagePassThrough produced 136%, and
       wealthCollectionEff produced 104%. All three are percentages of a whole
       and none of them can exceed it. The clamp binds only at the extreme; a
       slider left anywhere sensible never reaches it. */
    if (sliderModes && typeof sliderModes[p.id] === "number" && isFinite(sliderModes[p.id])) {
      const newMode = sliderModes[p.id];
      const loSpread = mo !== 0 ? (mo - lo) / Math.abs(mo) : 0;
      const hiSpread = mo !== 0 ? (hi - mo) / Math.abs(mo) : 0;
      const cap = naturalCeiling(p);
      lo = clampTo(newMode - loSpread * Math.abs(newMode), cap);
      hi = clampTo(newMode + hiSpread * Math.abs(newMode), cap);
      mo = clampTo(newMode, cap);
    }
    out[p.id] = { low: lo, mode: mo, high: hi };
  });
  return out;
}

/* Structural knobs for a scenario (ramp delays, shocks, MOE multipliers) */
export function scenarioStructural(scenarioId: string): ScenarioStructural {
  const scn = SCENARIOS_BY_ID[scenarioId] || SCENARIOS_BY_ID["SCN-BASE"];
  return scn.structural || {};
}
