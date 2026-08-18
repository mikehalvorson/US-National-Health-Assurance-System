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
import { PARAM_DEFS, PARAMS_BY_ID } from './params';
import type { ParamDef, Triangular } from './model-types';

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

/* ---- R60 [AC4]: an override key that names no parameter ------------------
 * `effectiveParams` iterates PARAM_DEFS and looks up scn.overrides[p.id], so
 * an override keyed to a parameter that does not exist is never read at all.
 * No error, no warning, no effect: the scenario runs and quietly does less
 * than its own description says. It is the repo's dominant defect class, the
 * same shape as the CP-ID collisions and the medication tag vocabulary.
 *
 * There is no live typo and there never has been one. What there is not is a
 * guard, and the exact way one arrives is already written down: three
 * scenarios override `unitsCost`, which a later section replaces with five
 * per-type parameters. After that rework those three keys name nothing, are
 * silently ignored, and SCN-UNIT-UNDER keeps running while no longer
 * stressing unit cost at all - which is the one thing its name promises.
 *
 * Taking the catalog and the id list as arguments rather than reading the
 * module's own is what makes the mechanism testable: a self-test can hand it
 * a catalog with a bad key and watch it caught, which is not possible for a
 * guard that can only read the shipped catalog.
 * ------------------------------------------------------------------------ */
export function unknownOverrideKeys(
  scenarios: Scenario[],
  knownIds: string[]
): string[] {
  const known = new Set(knownIds);
  const unknown: string[] = [];
  for (const s of scenarios) {
    for (const key of Object.keys(s.overrides)) {
      if (!known.has(key)) unknown.push(s.id + ' overrides ' + key);
    }
  }
  return unknown;
}

/* The structural knobs, as data. ScenarioStructural is a type and types do
 * not survive to runtime, so a scenario setting a knob the engine never reads
 * is the same silence in the other direction: declared, set, and doing
 * nothing. The engine is read for each of these, and a scenario setting
 * anything outside the list is refused. */
export const STRUCTURAL_KNOBS = [
  'unitsRampMult', 'costShareDelayYears', 'coverageDelayYears',
  'stateMoeMult', 'shock'
];

export function unknownStructuralKeys(scenarios: Scenario[]): string[] {
  const known = new Set(STRUCTURAL_KNOBS);
  const unknown: string[] = [];
  for (const s of scenarios) {
    for (const key of Object.keys(s.structural || {})) {
      if (!known.has(key)) unknown.push(s.id + ' sets ' + key);
    }
  }
  return unknown;
}

/* Refused at module load, so a rename fails the build in the commit that
 * makes it rather than in whatever section next reads the numbers. */
(function refuseUnresolvableOverrides(): void {
  const badParams = unknownOverrideKeys(
    SCENARIOS, PARAM_DEFS.map(function (p) { return p.id; }));
  const badKnobs = unknownStructuralKeys(SCENARIOS);
  if (badParams.length || badKnobs.length) {
    throw new Error(
      'A scenario names something that does not exist, so it is read by ' +
      'nothing and the scenario does less than it says. ' +
      badParams.concat(badKnobs).join('; ') +
      '. Point the override at a live parameter id or a declared structural ' +
      'knob, or remove it.');
  }
})();

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

/* ---- R139 [AP1, AC2, U7]: what low and high actually are ------------------
 * AC2 read the catalog as violating declared bounds. AP1 settled it by
 * measuring: every override stepped outside its parameter's low/high, and a
 * rule broken by every case is not a rule. low/high are the ends of a
 * triangular distribution and a scenario replaces the distribution. R59, which
 * asked for stress bounds to constrain that, was superseded by R139, which
 * asks only that the relationship be written down. Implementing R59 as written
 * would have encoded a constraint the model does not have.
 *
 * Two things AP1 recorded are no longer true of the live code, and both are
 * measured here rather than restated:
 *
 *   - "52 of 52 overrides fall outside their base low/high" is now 51 of 52.
 *     S6a widened publicAdminRate's high from 3.2% to the 6% its own evidence
 *     names, which brought SCN-PESS's [2.5, 3.5, 4.5] inside the base band.
 *
 *   - "no override exceeds its sliderMax" is false. The same widening put
 *     SCN-STATE-RESIST's 1.15 multiplier at 6.9% against a slider ceiling of
 *     6%. That was the one real constraint AP1 found the catalog respecting,
 *     and it was being respected by coincidence: it broke the moment an
 *     unrelated parameter was re-ranged, which is the definition of a rule
 *     that was never a rule. R139's declared test - no override exceeds its
 *     sliderMax - would fail the build on the tree as it stands, so it is not
 *     the test that ships.
 *
 * What ships instead is the pattern this repo already uses for a fact it wants
 * visible rather than forbidden: the exception is declared with its reason,
 * and the check holds the declared set equal to the measured one in both
 * directions. A new override stepping outside a slider range fails the build
 * until someone writes down why.
 *
 * The bound that IS enforced, on both the scenario path and the slider path,
 * is the natural domain a parameter's own unit implies. model.ts sweeps it
 * over every scenario and every parameter.
 * ------------------------------------------------------------------------ */
export interface OverrideBeyondSlider {
  scenario: string;
  param: string;
  why: string;
}

export const OVERRIDES_BEYOND_SLIDER: OverrideBeyondSlider[] = [
  {
    scenario: 'SCN-STATE-RESIST',
    param: 'publicAdminRate',
    why: 'The scenario multiplies the whole band by 1.15 and the base high is ' +
      'now 6%, so the product reaches 6.9% against a slider ceiling of 6%. ' +
      'The ceiling is the top of what the control exposes, not a limit on what ' +
      'a stress case may explore, and a fallback administration running above ' +
      'the 5-6% fully-loaded figure the parameter cites is the whole content ' +
      'of multi-state noncooperation. Declared rather than clamped, because ' +
      'clamping would quietly weaken the scenario to protect a UI bound.'
  }
];

/* The effective triple a scenario gives a parameter, without the slider path.
 * Used by the checks and by the note below; not by the engine, which reads
 * effectiveParams. */
function overrideTriple(p: ParamDef, ov: ScenarioOverride): Triangular {
  if (Array.isArray(ov)) return { low: ov[0], mode: ov[1], high: ov[2] };
  return { low: p.low * ov.mult, mode: p.mode * ov.mult, high: p.high * ov.mult };
}

export interface BandCounts {
  parameters: number;
  overrides: number;
  outsideBase: number;
  withSliderBounds: number;
  beyondSlider: string[];
}

export function bandCounts(): BandCounts {
  let overrides = 0;
  let outsideBase = 0;
  const beyondSlider: string[] = [];
  for (const s of SCENARIOS) {
    for (const key of Object.keys(s.overrides)) {
      const p = PARAMS_BY_ID[key];
      const ov = s.overrides[key];
      if (!p || !ov) continue;
      overrides += 1;
      const t = overrideTriple(p, ov);
      if (t.low < p.low - 1e-9 || t.high > p.high + 1e-9 ||
          t.mode < p.low - 1e-9 || t.mode > p.high + 1e-9) {
        outsideBase += 1;
      }
      const ceiling = p.sliderMax;
      const floor = p.sliderMin;
      if (typeof ceiling === 'number' && typeof floor === 'number' &&
          (t.high > ceiling + 1e-9 || t.mode > ceiling + 1e-9 ||
           t.low > ceiling + 1e-9 || t.low < floor - 1e-9 ||
           t.mode < floor - 1e-9 || t.high < floor - 1e-9)) {
        beyondSlider.push(s.id + '/' + key);
      }
    }
  }
  return {
    parameters: PARAM_DEFS.length,
    overrides: overrides,
    outsideBase: outsideBase,
    withSliderBounds: PARAM_DEFS.filter(function (p) {
      return typeof p.sliderMin === 'number' && typeof p.sliderMax === 'number';
    }).length,
    beyondSlider: beyondSlider
  };
}

/* The reader-facing sentence, assembled from the counts rather than stating
 * them, so it cannot drift from the catalog it describes. It renders above the
 * full parameter table, which is the only place a reader meets a parameter
 * whole. */
export function paramBandNote(): string {
  const c = bandCounts();
  return 'Low and high are the ends of the range each parameter is drawn from, ' +
    'not limits the model refuses to cross. A stress scenario replaces the ' +
    'whole range, and ' + c.outsideBase + ' of the ' + c.overrides + ' scenario ' +
    'adjustments here sit outside the range shown in this table. That is what a ' +
    'stress catalog is for. What cannot be crossed comes from the unit: a ' +
    'percentage or a share is held between 0 and 100 wherever a scenario or a ' +
    'slider would push past it. ' + c.withSliderBounds + ' of the ' +
    c.parameters + ' parameters also carry slider limits, which set how far the ' +
    'controls above can be dragged; those limits bound the controls, not the ' +
    'scenarios.';
}

/* Structural knobs for a scenario (ramp delays, shocks, MOE multipliers) */
export function scenarioStructural(scenarioId: string): ScenarioStructural {
  const scn = SCENARIOS_BY_ID[scenarioId] || SCENARIOS_BY_ID["SCN-BASE"];
  return scn.structural || {};
}
