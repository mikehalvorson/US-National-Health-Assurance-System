/* =========================================================================
 * Scenario Catalog — SCN-BASE through SCN-RURAL-STRESS
 * =========================================================================
 * Implements the Source Package's 19-scenario catalog as parameter
 * perturbations on top of the base model. Each override either:
 *   - replaces a parameter's (low, mode, high) triple:  { id: [lo, mo, hi] }
 *   - scales all three by a multiplier:                 { id: {mult: x} }
 * plus optional structural knobs (ramp delays, shock spending).
 * These are honest simplifications: each scenario notes its mechanism, and
 * qualitative effects the cost model cannot capture are stated, not faked.
 * ========================================================================= */
"use strict";
var NHA = window.NHA || {};
window.NHA = NHA;

NHA.SCENARIOS = [
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
    desc: "Avoidance/evasion cuts extreme-wealth revenue roughly in half; the financing gap shifts to other instruments (visible in the financing panel — total cost is unchanged).",
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

NHA.SCENARIOS_BY_ID = {};
NHA.SCENARIOS.forEach(function (s) { NHA.SCENARIOS_BY_ID[s.id] = s; });

/* Apply a scenario to the parameter definitions, returning a new array of
 * effective (low, mode, high) triples keyed by id. Slider adjustments from
 * the UI are applied AFTER scenario overrides (user beats preset). */
NHA.effectiveParams = function (scenarioId, sliderModes) {
  var scn = NHA.SCENARIOS_BY_ID[scenarioId] || NHA.SCENARIOS_BY_ID["SCN-BASE"];
  var out = {};
  NHA.PARAM_DEFS.forEach(function (p) {
    var lo = p.low, mo = p.mode, hi = p.high;
    var ov = scn.overrides[p.id];
    if (ov) {
      if (Array.isArray(ov)) { lo = ov[0]; mo = ov[1]; hi = ov[2]; }
      else if (typeof ov.mult === "number") { lo *= ov.mult; mo *= ov.mult; hi *= ov.mult; }
    }
    /* User slider: shift mode, scale low/high to preserve relative spread */
    if (sliderModes && typeof sliderModes[p.id] === "number" && isFinite(sliderModes[p.id])) {
      var newMode = sliderModes[p.id];
      var loSpread = mo !== 0 ? (mo - lo) / Math.abs(mo) : 0;
      var hiSpread = mo !== 0 ? (hi - mo) / Math.abs(mo) : 0;
      lo = newMode - loSpread * Math.abs(newMode);
      hi = newMode + hiSpread * Math.abs(newMode);
      mo = newMode;
    }
    out[p.id] = { low: lo, mode: mo, high: hi };
  });
  return out;
};

/* Structural knobs for a scenario (ramp delays, shocks, MOE multipliers) */
NHA.scenarioStructural = function (scenarioId) {
  var scn = NHA.SCENARIOS_BY_ID[scenarioId] || NHA.SCENARIOS_BY_ID["SCN-BASE"];
  return scn.structural || {};
};
