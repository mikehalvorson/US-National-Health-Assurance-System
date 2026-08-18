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

/* ---- R141 [AP4]: fifty-two magnitudes, zero citations --------------------
 * `Scenario` had `id`, `name`, `desc`, `overrides`, `structural`, and no way
 * to say where any number came from. params.ts grades and cites all 32 of its
 * parameters; medications.ts was filed for exactly this omission. The stress
 * catalog is what bounds the model's credibility and it was the only
 * quantitative structure in the repository with no provenance convention at
 * all.
 *
 * The provenance travels inside the override rather than beside it. That is
 * the convention equations.ts already sets, where every numeric leaf is built
 * by n(value, label) and the label cannot be separated from the number it
 * describes. A parallel `sources` record keyed the same way would let the two
 * drift, and the whole backlog is a record of declarations drifting from the
 * things they declare.
 *
 * The honest result is not flattering and is the point: 50 of the 52 are
 * graded `low`. A stress catalog made of analyst judgement is defensible; one
 * that does not say so is not.
 * ------------------------------------------------------------------------ */
export type OverrideGrade = 'high' | 'medium' | 'low';

export interface OverrideProvenance {
  /* Why this magnitude and not another, in a sentence a reader can weigh. */
  why: string;
  confidence: OverrideGrade;
}

export interface OverrideTriple extends OverrideProvenance {
  to: [number, number, number];
}

export interface OverrideMult extends OverrideProvenance {
  mult: number;
}

export type ScenarioOverride = OverrideTriple | OverrideMult;

export interface ScenarioShock {
  startYear: number;
  years: number;
  amountB: number;
}

/* What the engine takes: knobs, nothing else. Every one is optional, because
 * `{}` is how a caller says a run has no structural adjustment at all. */
export interface ScenarioStructural {
  unitsRampMult?: number;
  costShareDelayYears?: number;
  coverageDelayYears?: number;
  stateMoeMult?: number;
  shock?: ScenarioShock;
}

/* What a scenario declares: the same knobs, and why they are set to that.
 * Required, so a structural block cannot exist without provenance. AP4 named
 * SCN-PANDEMIC's $220B and SCN-CYBER's $45B specifically, and both are
 * structural rather than parameter overrides, so provenance that stopped at
 * `overrides` would have missed the two figures the finding was about.
 *
 * The split is the point. Provenance is for a reader; the engine has no
 * business seeing it, and putting `why` on the type the engine consumes made
 * it required of nine call sites whose only message was "no knobs". */
export interface ScenarioStructuralDecl extends ScenarioStructural {
  why: string;
}

/* Whether a scenario's magnitudes rest on published figures or on analyst
 * judgement. Every stress case here is judgement; the base case is not,
 * because it runs the sourced parameter base unaltered. */
export type ScenarioBasis = 'sourced' | 'assumed';

export interface Scenario {
  id: string;
  name: string;
  desc: string;
  basis: ScenarioBasis;
  overrides: Record<string, ScenarioOverride>;
  structural?: ScenarioStructuralDecl;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "SCN-BASE", name: "Base case",
    desc: "All parameters at their researched central estimates.",
    basis: 'sourced',
    overrides: {}
  },
  {
    id: "SCN-OPT", name: "Optimistic implementation",
    desc: "Savings levers hit their high ends; demand response and transition costs land low; modest rate compression succeeds.",
    basis: 'assumed',
    overrides: {
      drugPriceCut: {
        to: [40, 50, 60], confidence: 'low',
        why: 'The base band re-centred on its own high end, so negotiation ' +
          'delivers at the top of what the parameter already contemplates ' +
          'rather than beyond it.'
      },
      providerAdminSavings: {
        to: [4, 5.5, 7], confidence: 'low',
        why: 'Billing and prior-authorization overhead falls at the upper end ' +
          'of the base range. An analyst-chosen bracket, not a scored estimate.'
      },
      publicAdminRate: {
        to: [1.3, 1.7, 2.2], confidence: 'medium',
        why: 'Spans the 1.5 to 2.0% the Congressional Budget Office scored for ' +
          'a single public payer, which is the low end of the evidence this ' +
          'parameter cites rather than a magnitude invented for the case.'
      },
      utilIncrease: {
        to: [4, 7, 11], confidence: 'low',
        why: 'Induced demand from newly covered care lands below the central ' +
          'estimate. The size of the reduction is judgement.'
      },
      providerPaymentFactor: {
        to: [0.83, 0.89, 0.95], confidence: 'low',
        why: 'Rate compression succeeds by roughly three points against the ' +
          'base case. The step is chosen to bracket, not measured.'
      },
      transitionTotal: {
        to: [800, 1150, 1500], confidence: 'low',
        why: 'Transition spending lands at the bottom of the declared envelope, ' +
          'which is the optimistic corner of a range that is itself uncertain.'
      },
      careModelSavings: {
        to: [20, 35, 50], confidence: 'low',
        why: 'Team-based and preventive care deliver near the top of the base ' +
          'range. An assumed upper bracket.'
      }
    }
  },
  {
    id: "SCN-PESS", name: "Pessimistic implementation",
    desc: "Savings underdeliver, demand surges, payment compression fails politically, transition runs long and expensive.",
    basis: 'assumed',
    overrides: {
      drugPriceCut: {
        to: [15, 27, 40], confidence: 'low',
        why: 'Negotiation delivers roughly half the central estimate. The ' +
          'halving is judgement about political and legal friction, not a score.'
      },
      providerAdminSavings: {
        to: [1, 2.5, 4], confidence: 'low',
        why: 'Administrative simplification largely fails to materialize. An ' +
          'assumed floor.'
      },
      publicAdminRate: {
        to: [2.5, 3.5, 4.5], confidence: 'medium',
        why: 'Sits inside the 2 to 6% band the evidence this parameter cites ' +
          'names, toward the heavier-oversight end that Urban and RAND ' +
          'cross-checks describe as fully loaded.'
      },
      utilIncrease: {
        to: [10, 15, 22], confidence: 'low',
        why: 'Pent-up demand runs well above the central estimate. The ' +
          'magnitude brackets the base band and is not derived from a study.'
      },
      providerPaymentFactor: {
        to: [0.95, 1.0, 1.06], confidence: 'low',
        why: 'Payment compression fails and rates settle at or above today. An ' +
          'assumed political outcome priced as a rate.'
      },
      transitionTotal: {
        to: [1600, 2100, 2800], confidence: 'low',
        why: 'Transition runs long and over budget, at roughly 1.4 times the ' +
          'central envelope. The multiple is judgement.'
      },
      careModelSavings: {
        to: [5, 12, 25], confidence: 'low',
        why: 'Care-model change delivers a fraction of the central estimate. An ' +
          'assumed floor.'
      }
    }
  },
  {
    id: "SCN-UNIT-UNDER", name: "Unit network underbuilt",
    desc: "The four-unit network reaches only ~60% of its planned scale: care-model savings shrink, ED diversion misses, cost-sharing elimination is partially delayed by its phase gate.",
    basis: 'assumed',
    overrides: {
      unitsCost: {
        mult: 0.65, confidence: 'low',
        why: 'Cost tracks the underbuild: roughly 60% of the network is built, ' +
          'so roughly 65% of the cost is incurred. The pairing is an assumption ' +
          'about how fixed and variable unit costs split.'
      },
      careModelSavings: {
        mult: 0.5, confidence: 'low',
        why: 'Savings that depend on the unit network fall by more than the ' +
          'build shortfall, because the missing units are assumed to be the ' +
          'ones serving the highest-need areas.'
      },
      lowValueCapture: {
        mult: 0.75, confidence: 'low',
        why: 'Diversion of low-value utilization depends on unit capacity and ' +
          'falls with it. The proportion is judgement.'
      }
    },
    structural: {
      unitsRampMult: 0.6, costShareDelayYears: 2,
      why: 'The ramp is cut to the 60% the description states, and cost-sharing ' +
        'elimination slips two years because its phase gate depends on unit ' +
        'capacity being in place. Both are assumed consequences of the ' +
        'underbuild rather than scheduled events.'
    }
  },
  {
    id: "SCN-SPEC-SEVERE", name: "Severe specialist bottlenecks",
    desc: "Specialist queues collapse; bottleneck premium pay and delayed care raise clinical costs; e-consult resolution underdelivers.",
    basis: 'assumed',
    overrides: {
      providerPaymentFactor: {
        to: [0.92, 0.98, 1.05], confidence: 'low',
        why: 'Premium pay to clear specialist queues pushes effective rates to ' +
          'roughly the levels paid today. An assumed response to scarcity.'
      },
      careModelSavings: {
        mult: 0.7, confidence: 'low',
        why: 'Electronic consultation and team-based triage underdeliver when ' +
          'the specialists behind them are the bottleneck. The fraction is ' +
          'judgement.'
      },
      workforceEdu: {
        mult: 1.3, confidence: 'low',
        why: 'Training spending rises to close the specialist gap faster than ' +
          'planned. The size of the response is assumed.'
      }
    }
  },
  {
    id: "SCN-HOSP-LOW", name: "Hospital budgets undercalibrated",
    desc: "Global budgets set too low: service-line stress forces stabilization-corridor spending and later budget corrections.",
    basis: 'assumed',
    overrides: {
      providerPaymentFactor: {
        to: [0.82, 0.88, 0.94], confidence: 'low',
        why: 'Global budgets are set roughly four points below the central ' +
          'calibration. The step brackets the base band.'
      },
      transitionTotal: {
        mult: 1.15, confidence: 'low',
        why: 'Stabilization corridors and later corrections add to transition ' +
          'spending. The proportion is judgement.'
      },
      extractionSavings: {
        mult: 0.7, confidence: 'low',
        why: 'Savings from reduced financial extraction shrink when budgets are ' +
          'already tight enough to force emergency support. An assumed ' +
          'interaction.'
      }
    }
  },
  {
    id: "SCN-HOSP-HIGH", name: "Hospital budgets overcalibrated",
    desc: "Global budgets locked in above efficient cost; hospitals capture transition fear as permanent revenue.",
    basis: 'assumed',
    overrides: {
      providerPaymentFactor: {
        to: [0.96, 1.02, 1.08], confidence: 'low',
        why: 'Budgets lock in above the effective rates paid today. The overshoot ' +
          'is an assumed bargaining outcome, and it is the largest single ' +
          'upward pressure any scenario applies to hospital spending.'
      },
      extractionSavings: {
        mult: 0.6, confidence: 'low',
        why: 'Extraction savings largely fail to arrive when budgets are set ' +
          'above efficient cost. The fraction is judgement.'
      }
    }
  },
  {
    id: "SCN-WEALTH-LOW", name: "Wealth financing underperforms",
    desc: "Avoidance/evasion cuts extreme-wealth revenue roughly in half; the financing gap shifts to other instruments (visible in the financing panel - total cost is unchanged).",
    basis: 'assumed',
    overrides: {
      wealthTaxPotential: {
        to: [140, 200, 270], confidence: 'low',
        why: 'The base is roughly halved. Halving is a round stress figure ' +
          'rather than an avoidance estimate, and the parameter it acts on is ' +
          'itself among the least certain in the model.'
      },
      wealthCollectionEff: {
        to: [55, 68, 80], confidence: 'low',
        why: 'Collection efficiency falls by roughly a sixth against the base ' +
          'band, compounding the base reduction above. Both steps are assumed.'
      }
    }
  },
  {
    id: "SCN-EMP-FAIL", name: "Employer pass-through noncompliance",
    desc: "Employer contribution capture falls well short as firms restructure to avoid the contribution; financing gap widens.",
    basis: 'assumed',
    overrides: {
      employerCapture: {
        to: [40, 55, 68], confidence: 'low',
        why: 'Capture of what employers spend today falls roughly 20 points ' +
          'below the central estimate as firms restructure. The size of the ' +
          'behavioural response is assumed.'
      }
    }
  },
  {
    id: "SCN-TRUST-COLLAPSE", name: "Public trust collapse",
    desc: "Delayed enrollment and care avoidance during transition, then catch-up costs; heavier ombudsman/appeals load. Access and health-outcome damage is qualitative and NOT priced here.",
    basis: 'assumed',
    overrides: {
      governanceRate: {
        to: [0.9, 1.3, 1.8], confidence: 'low',
        why: 'Appeals, ombudsman and oversight load rises by roughly half. The ' +
          'magnitude is judgement about how a trust failure shows up as cost.'
      },
      transitionTotal: {
        mult: 1.2, confidence: 'low',
        why: 'Outreach, re-enrollment and correction work extend the transition. ' +
          'The proportion is assumed.'
      },
      utilIncrease: {
        to: [8, 12, 18], confidence: 'low',
        why: 'Deferred care returns as catch-up utilization after the collapse. ' +
          'The rebound is priced; the access harm during the gap is not, which ' +
          'the description says out loud.'
      }
    },
    structural: {
      coverageDelayYears: 1,
      why: 'Enrollment slips a year because take-up depends on trust. An assumed ' +
        'delay rather than a scheduled one.'
    }
  },
  {
    id: "SCN-AI-FAIL", name: "AI safety/equity failure",
    desc: "Unit-network AI tooling suspended after safety failures: units run human-only at higher cost and lower throughput.",
    basis: 'assumed',
    overrides: {
      unitsCost: {
        mult: 1.3, confidence: 'low',
        why: 'Running units human-only raises their cost by roughly a third. ' +
          'The premium is assumed, and it is the mirror of the throughput gain ' +
          'the tooling was expected to deliver.'
      },
      careModelSavings: {
        mult: 0.7, confidence: 'low',
        why: 'Care-model savings that depend on decision support fall with it. ' +
          'The fraction is judgement.'
      },
      itOperating: {
        mult: 1.25, confidence: 'low',
        why: 'Suspension does not remove the systems: they still run, under ' +
          'heavier review and audit. An assumed compliance overhead.'
      }
    }
  },
  {
    id: "SCN-CYBER", name: "Major cyber outage",
    desc: "A ransomware-scale event mid-transition: recovery spending plus permanently higher cyber operations.",
    basis: 'assumed',
    overrides: {
      itOperating: {
        mult: 1.35, confidence: 'low',
        why: 'Cyber operations step up permanently after a major event, by ' +
          'roughly a third. An assumed post-incident level.'
      }
    },
    structural: {
      shock: { startYear: 6, years: 2, amountB: 45 },
      why: 'The $45B over two years is an assumed recovery cost for a ' +
        'nationwide claims-infrastructure outage, and it is the kind of ' +
        'magnitude the 2024 clearinghouse ransomware event put in view. It is ' +
        'a stress figure, not a scored estimate: no published score of a ' +
        'public-system-wide event exists to size it against.'
    }
  },
  {
    id: "SCN-DRUG-SHORT", name: "Drug shortage crisis",
    desc: "Supply shocks force emergency procurement above negotiated prices for several years; negotiation savings partially suspended.",
    basis: 'assumed',
    overrides: {
      drugPriceCut: {
        mult: 0.7, confidence: 'low',
        why: 'Negotiated savings are partially suspended while emergency ' +
          'procurement runs. The fraction retained is judgement.'
      }
    },
    structural: {
      shock: { startYear: 5, years: 3, amountB: 18 },
      why: 'The $18B a year over three years is an assumed emergency ' +
        'procurement premium, sized as a small share of annual retail ' +
        'prescription spending rather than from a shortage-cost study.'
    }
  },
  {
    id: "SCN-PANDEMIC", name: "Pandemic / public-health surge",
    desc: "A pandemic hits mid-transition: two years of surge utilization and emergency public-health spending.",
    basis: 'assumed',
    overrides: {
      emsPhExpansion: {
        mult: 1.3, confidence: 'low',
        why: 'Emergency and public-health capacity expands by roughly a third ' +
          'during the surge. An assumed response level.'
      }
    },
    structural: {
      shock: { startYear: 7, years: 2, amountB: 220 },
      why: 'The $220B a year over two years is about 4.5% of national health ' +
        'spending, which is the arithmetic that sizes it. The choice of 4.5% ' +
        'is judgement: it is the order of the 2020 and 2021 federal public ' +
        'health emergency response, not a projection of the next one.'
    }
  },
  {
    id: "SCN-LTC-AGING", name: "High aging & LTC demand",
    desc: "Aging runs above projection: LTC demand and baseline growth both rise. Tests the plan's biggest expansion under its worst demographics.",
    basis: 'assumed',
    overrides: {
      ltcExpansion: {
        to: [250, 330, 420], confidence: 'low',
        why: 'Long-term-care demand runs roughly a quarter above the central ' +
          'estimate. The step is chosen to bracket the base band under faster ' +
          'aging, not derived from an alternative projection.'
      },
      ltcWageFloor: {
        mult: 1.3, confidence: 'low',
        why: 'Direct-care wages rise faster when demand outruns the workforce. ' +
          'The size of the response is assumed.'
      },
      baselineRealGrowth: {
        to: [3.0, 3.8, 4.6], confidence: 'low',
        why: 'Baseline spending growth rises with the same demographics, so the ' +
          'status quo gets more expensive too. Moving both together is what ' +
          'keeps the comparison honest; the magnitude is judgement.'
      }
    }
  },
  {
    id: "SCN-STATE-RESIST", name: "Hostile state noncooperation",
    desc: "Multiple states refuse compacts: federal fallback administration costs more, state maintenance-of-effort partially fails, rollout slips.",
    basis: 'assumed',
    overrides: {
      transitionTotal: {
        mult: 1.12, confidence: 'low',
        why: 'Standing up federal fallback administration in resisting states ' +
          'adds to transition spending. The proportion is assumed.'
      },
      publicAdminRate: {
        mult: 1.15, confidence: 'low',
        why: 'Running two administrative structures in parallel costs more than ' +
          'one. This is the override that reaches 6.9%, above the 6% the ' +
          'slider exposes, and it is declared as such: a fallback administration ' +
          'running above the 5 to 6% fully-loaded figure the parameter cites is ' +
          'the entire content of this scenario.'
      }
    },
    structural: {
      coverageDelayYears: 1, stateMoeMult: 0.75,
      why: 'Rollout slips a year and a quarter of state maintenance-of-effort ' +
        'fails to arrive. Both are assumed consequences of noncooperation; the ' +
        '25% is a round stress figure, not a count of states.'
    }
  },
  {
    id: "SCN-LEGAL", name: "Major legal invalidation",
    desc: "Courts strike the wealth-tax pillar; fallback instruments (mark-to-market, estate structures) recover only part of the revenue; rollout slips a year.",
    basis: 'assumed',
    overrides: {
      wealthTaxPotential: {
        mult: 0.5, confidence: 'low',
        why: 'Half the wealth-financing base survives through fallback ' +
          'instruments. Halving is a round stress figure rather than a reading ' +
          'of any particular ruling.'
      },
      transitionTotal: {
        mult: 1.08, confidence: 'low',
        why: 'Litigation and re-legislation add to transition spending. The ' +
          'proportion is assumed.'
      }
    },
    structural: {
      coverageDelayYears: 1,
      why: 'Rollout slips a year while the financing is re-legislated. An ' +
        'assumed delay.'
    }
  },
  {
    id: "SCN-WF-SHORT", name: "Workforce shortages exceed plan",
    desc: "Vacancies force premium pay and overtime; some induced demand goes unmet (lower spend, worse access; the access harm is qualitative, not priced).",
    basis: 'assumed',
    overrides: {
      providerPaymentFactor: {
        to: [0.92, 0.99, 1.06], confidence: 'low',
        why: 'Premium pay and overtime push effective rates to roughly the levels ' +
          'paid today. An assumed response to vacancies.'
      },
      workforceEdu: {
        mult: 1.4, confidence: 'low',
        why: 'Training and pipeline spending rise sharply to close the gap. The ' +
          'size of the response is assumed.'
      },
      utilIncrease: {
        to: [4, 8, 13], confidence: 'low',
        why: 'Utilization comes in BELOW the central estimate because there is ' +
          'nobody to deliver the care. That lowers spending while making access ' +
          'worse, which is why the description says the access harm is not ' +
          'priced. Reading this scenario as cheap would be reading it backwards.'
      }
    }
  },
  {
    id: "SCN-BH-SURGE", name: "Behavioral health demand surge",
    desc: "Unmet-need release runs far above estimate once coverage is universal.",
    basis: 'assumed',
    overrides: {
      bhExpansion: {
        to: [70, 110, 160], confidence: 'low',
        why: 'Behavioral-health demand released by universal coverage runs ' +
          'roughly half again above the central estimate. The magnitude is ' +
          'judgement: measured unmet need bounds it from below, and nothing ' +
          'bounds it from above.'
      }
    }
  },
  {
    id: "SCN-RURAL-STRESS", name: "Rural access stress",
    desc: "Rural hospital fragility worse than modeled: heavier readiness payments, EMS spending, and stabilization corridors.",
    basis: 'assumed',
    overrides: {
      emsPhExpansion: {
        mult: 1.35, confidence: 'low',
        why: 'Emergency services carry more of the load where facilities close ' +
          'or thin out. The proportion is assumed.'
      },
      transitionTotal: {
        mult: 1.1, confidence: 'low',
        why: 'Stabilization corridors for fragile rural facilities extend ' +
          'transition spending. The proportion is assumed.'
      },
      extractionSavings: {
        mult: 0.8, confidence: 'low',
        why: 'There is less financial extraction to recover from facilities ' +
          'already operating near the margin. An assumed interaction.'
      },
      unitsCost: {
        mult: 1.15, confidence: 'low',
        why: 'Units serving low-density areas cost more per person reached. The ' +
          'premium is assumed.'
      }
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

/* `why` is the block's provenance (R141), not a knob the engine reads, so it
 * is excluded by name rather than by being added to the list above - putting
 * it there would make the read check demand that the engine consume it. */
export const STRUCTURAL_PROVENANCE_KEY = 'why';

export function unknownStructuralKeys(scenarios: Scenario[]): string[] {
  const known = new Set(STRUCTURAL_KNOBS);
  const unknown: string[] = [];
  for (const s of scenarios) {
    for (const key of Object.keys(s.structural || {})) {
      if (key === STRUCTURAL_PROVENANCE_KEY) continue;
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
      if ('to' in ov) { lo = ov.to[0]; mo = ov.to[1]; hi = ov.to[2]; }
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

/* ---- R141 [AP4]: is the provenance real, or just present? ---------------
 * A field that exists and says nothing is the same silence with a schema. So
 * the audit asks three things a decorative entry would fail:
 *
 *   - every override and every structural block gives a reason;
 *   - an override graded `medium` names a figure, because `medium` here
 *     claims the magnitude is anchored to one and a claim with no number in
 *     it is not anchored to anything;
 *   - a scenario declaring `sourced` carries no override graded `low`, so a
 *     stress case cannot describe itself as sourced while resting on
 *     judgement.
 *
 * The minimum length is a floor, not the test. Content is what the other two
 * check, because a length rule measures effort and passes anything padded.
 * ------------------------------------------------------------------------ */
export const PROVENANCE_MIN_CHARS = 40;

export function provenanceProblems(): string[] {
  const problems: string[] = [];
  const hasFigure = /[0-9]/;
  for (const s of SCENARIOS) {
    let lowGraded = 0;
    for (const key of Object.keys(s.overrides)) {
      const ov = s.overrides[key];
      if (!ov) continue;
      const at = s.id + '/' + key;
      if (ov.why.trim().length < PROVENANCE_MIN_CHARS) {
        problems.push(at + ' gives no reason');
      }
      if (ov.confidence === 'low') lowGraded += 1;
      if (ov.confidence === 'medium' && !hasFigure.test(ov.why)) {
        problems.push(at + ' is graded medium and its reason names no figure');
      }
    }
    if (s.structural && s.structural.why.trim().length < PROVENANCE_MIN_CHARS) {
      problems.push(s.id + ' sets structural knobs and gives no reason');
    }
    if (s.basis === 'sourced' && lowGraded) {
      problems.push(s.id + ' declares its magnitudes sourced while carrying ' +
        lowGraded + ' graded low');
    }
  }
  return problems;
}

/* The grade mix, for the note and for the report. It is not flattering and it
 * is the finding: a stress catalog made of judgement is defensible, one that
 * does not say so is not. */
export function provenanceGradeCounts(): Record<OverrideGrade, number> {
  const counts: Record<OverrideGrade, number> = { high: 0, medium: 0, low: 0 };
  for (const s of SCENARIOS) {
    for (const key of Object.keys(s.overrides)) {
      const ov = s.overrides[key];
      if (ov) counts[ov.confidence] += 1;
    }
  }
  return counts;
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
  if ('to' in ov) return { low: ov.to[0], mode: ov.to[1], high: ov.to[2] };
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

/* ---- R237 [AC7]: the band collapses where the model is least certain -----
 * A slider does not slide a fixed band along. It re-centres the band on the
 * new mode and rebuilds the spread in PROPORTION to it, so driving a mode
 * toward zero shrinks the uncertainty toward zero with it. At exactly zero the
 * distribution becomes a point mass and the parameter drops out of the Monte
 * Carlo entirely, with nothing saying so.
 *
 * The row offers two remedies: hold the spread above an absolute floor, or
 * state on the control that the band is proportional. This takes the second,
 * for two reasons.
 *
 * A floor would be an invented number. Every number in this repository is
 * sourced and graded, and there is no evidence anywhere for how wide the band
 * around a lever set to zero ought to be.
 *
 * And for four of the five, a zero band is the honest answer rather than a
 * missing one. Setting drugPriceCut to 0 does not mean "an uncertain amount of
 * price reduction near zero", it means there is no price reduction, and there
 * is nothing left to be uncertain about. The same reads correctly for
 * providerAdminSavings, ltcWageFloor and wagePassThrough.
 *
 * utilIncrease is the exception and it is worth naming. Setting it to 0 asserts
 * that universal coverage induces exactly no additional utilization, which is a
 * strong claim to make with no band around it. A floor would not fix that
 * either: the reader who drags the slider to zero has asserted the point
 * estimate, and the honest response is to tell them what they just did to the
 * uncertainty, which is what the note does.
 * ------------------------------------------------------------------------ */
export const SPREAD_COLLAPSE_DECLARED = [
  'utilIncrease', 'drugPriceCut', 'providerAdminSavings', 'ltcWageFloor',
  'wagePassThrough'
];

/* Every adjustable parameter, at both ends of its own slider, reporting the
 * ids whose band closes to nothing. Measured rather than reasoned about: the
 * collapse needs a slider end that lands exactly on zero, and which
 * parameters those are is a property of the catalog, not of the arithmetic. */
export function collapsingSliderParameters(): string[] {
  const collapsing: string[] = [];
  for (const p of PARAM_DEFS) {
    if (!p.adjustable) continue;
    for (const at of [p.sliderMin, p.sliderMax]) {
      if (typeof at !== 'number') continue;
      const eff = effectiveParams(BASE_SCENARIO_ID, { [p.id]: at })[p.id];
      if (eff && eff.high - eff.low < 1e-9 && !collapsing.includes(p.id)) {
        collapsing.push(p.id);
      }
    }
  }
  return collapsing;
}

export function sliderSpreadNote(): string {
  return 'Moving a slider moves the whole range, not just the middle of it: ' +
    'the band above and below is rebuilt in proportion to wherever you put ' +
    'the control. Setting one of these to zero therefore removes its ' +
    'uncertainty as well as its effect, which is the right answer for a lever ' +
    'that is switched off and a strong claim for one that is merely small.';
}

/* Structural knobs for a scenario (ramp delays, shocks, MOE multipliers) */
export function scenarioStructural(scenarioId: string): ScenarioStructural {
  const scn = SCENARIOS_BY_ID[scenarioId] || SCENARIOS_BY_ID["SCN-BASE"];
  return scn.structural || {};
}
