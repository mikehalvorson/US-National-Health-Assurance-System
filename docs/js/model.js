/* =========================================================================
 * National Health Assurance Simulation — Model Engine
 * =========================================================================
 * Computes, for each calendar year 2027–2042:
 *   (a) the status-quo baseline world (CMS-trajectory NHE by category), and
 *   (b) the NHA world (phase-ramped policy path),
 * from one sampled parameter set. Offsets are DERIVED as differences between
 * directly-computed quantities, so a savings mechanism can never be counted
 * twice — each has exactly one home:
 *
 *   Mechanism                      Where it lives
 *   -----------------------------  -------------------------------------
 *   Payer administrative savings   legacyAdmin shrinks vs. newAdmin grows
 *   Payment-rate compression       payFactor on hospital+clinical
 *   Drug price negotiation         price factor on the drugs category
 *   Provider billing savings       explicit offset, % of hosp+clin ONLY
 *   ED diversion / avoidable adm.  explicit offset, $B, ramps with units
 *   Low-value care reduction       explicit offset, capture% × $88B pool
 *   Related-party extraction       explicit offset, $B, narrow scope
 *
 * All internal dollars are REAL 2023 $B. Display conversion to 2024$ happens
 * in the UI layer via NHA.DEFLATOR_2023_TO_2024.
 * ========================================================================= */
"use strict";
var NHA = window.NHA || {};
window.NHA = NHA;

/* ---- Triangular distribution sampling ---- */
NHA.triangular = function (lo, mo, hi, rand) {
  if (hi <= lo) return mo; // degenerate
  var u = rand(), fc = (mo - lo) / (hi - lo);
  return u < fc
    ? lo + Math.sqrt(u * (hi - lo) * (mo - lo))
    : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mo));
};

/* Deterministic PRNG (mulberry32) so runs are reproducible */
NHA.makeRng = function (seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* Sample a full parameter set: {id: value}. mode-only if rand === null.
 * z (optional, in [-1,1]) is the run's systemic factor: parameters tagged
 * in NHA.PARAM_CORR have their sampling quantile shifted by
 * CORR_WEIGHT × sign × z, so cost-side surprises and savings-side
 * disappointments arrive together (see params.js).                        */
NHA.sampleParams = function (effective, rand, z) {
  var out = {};
  Object.keys(effective).forEach(function (id) {
    var e = effective[id];
    if (!rand) { out[id] = e.mode; return; }
    var u = rand();
    var s = (z != null && NHA.PARAM_CORR) ? (NHA.PARAM_CORR[id] || 0) : 0;
    if (s !== 0) {
      u = Math.min(0.98, Math.max(0.02, u + NHA.CORR_WEIGHT * s * z));
    }
    out[id] = NHA.triangular(e.low, e.mode, e.high, function () { return u; });
  });
  return out;
};

/* Ramps with scenario structural adjustments applied */
NHA.buildRamps = function (structural) {
  var R = NHA.RAMPS, s = structural || {};
  function shift(arr, by) {
    if (!by) return arr.slice();
    var out = [];
    for (var i = 0; i < arr.length; i++) out.push(i - by >= 0 ? arr[i - by] : 0);
    return out;
  }
  var coverage = shift(R.coverage, s.coverageDelayYears || 0);
  var cs = shift(R.costShareElim, (s.coverageDelayYears || 0) + (s.costShareDelayYears || 0));
  var units = R.units.map(function (v) { return v * (s.unitsRampMult || 1); });
  return {
    coverage: coverage, costShareElim: cs, units: units,
    drugs: shift(R.drugs, s.coverageDelayYears || 0),
    hospitals: shift(R.hospitals, s.coverageDelayYears || 0),
    expansions: shift(R.expansions, s.coverageDelayYears || 0),
    infra: R.infra.slice(),
    transitionShape: R.transitionShape.slice(),
    itCapitalShape: R.itCapitalShape.slice()
  };
};

/* ---- One full path run for a single parameter sample -------------------
 * Returns { years[], baseline[], nha[], detail (per-year objects) }        */
NHA.runPath = function (p, structural) {
  var B = NHA.BASE2023;
  var ramps = NHA.buildRamps(structural);
  var nYears = NHA.END_YEAR - NHA.START_YEAR + 1; // 16
  var s = structural || {};
  var stateMoeMult = s.stateMoeMult || 1;

  var g = p.baselineRealGrowth / 100;
  var gGdp = p.gdpRealGrowth / 100;
  var gPop = p.popGrowth / 100;
  var gWage = 0.012; // real input-cost growth for program-based expansions

  /* Baseline PHC categories (2023 $B) — drugs pulled out with embedded share */
  var embedded = p.embeddedDrugSpend;
  var hospBase0 = B.hospital - 0.6 * embedded;
  var clinBase0 = B.physician + B.otherProf - 0.4 * embedded;
  var drugBase0 = B.rxRetail + embedded;
  var otherPhc0 = B.dental + B.otherPersonal + B.homeHealth + B.nursing +
                  B.dme + B.nondurables;
  var admin0 = B.netInsCost + B.govtAdmin;

  var out = { years: [], baseline: [], nha: [], detail: [] };

  for (var t = 0; t < nYears; t++) {
    var year = NHA.START_YEAR + t;
    var G = Math.pow(1 + g, NHA.PRE_YEARS + t);        // health-cost growth from 2023
    var Gw = Math.pow(1 + gWage, NHA.PRE_YEARS + t);   // program input-cost growth
    var Ggdp = Math.pow(1 + gGdp, NHA.PRE_YEARS + t);
    var gdp = B.gdp * Ggdp;
    var pop = B.populationM * Math.pow(1 + gPop, NHA.PRE_YEARS + t);

    /* ---------- Baseline world ---------- */
    var nheBase = B.nheTotal * G;

    /* ---------- Ramps this year ---------- */
    var covR  = ramps.coverage[t]      || 0;
    var csR   = ramps.costShareElim[t] || 0;
    var unitR = ramps.units[t]         || 0;
    var drugR = ramps.drugs[t]         || 0;
    var hospR = ramps.hospitals[t]     || 0;
    var expR  = ramps.expansions[t]    || 0;
    var infR  = ramps.infra[t]         || 0;

    /* ---------- NHA world ---------- */
    /* Demand: coverage component + cost-sharing component */
    var cds = p.coverageDemandShare;
    var util = 1 + (p.utilIncrease / 100) * (cds * covR + (1 - cds) * csR);
    /* Payment factor phases in with hospital global budgets */
    var pay = 1 - (1 - p.providerPaymentFactor) * hospR;

    var cHosp  = hospBase0 * G * pay * util;
    var cClin  = clinBase0 * G * pay * util;
    var cDrugs = drugBase0 * G * util * (1 - (p.drugPriceCut / 100) * drugR);
    var cOtherPhc = otherPhc0 * G * util;

    /* Expansions: demand-driven grow with G; program-based grow with wages */
    var cLtc   = p.ltcExpansion   * G  * expR;
    var cBh    = p.bhExpansion    * G  * expR;
    var cDvh   = p.dvhExpansion   * G  * expR;
    var cEmsPh = p.emsPhExpansion * G  * expR;
    var cUnits = p.unitsCost      * Gw * unitR;
    var cRd    = p.rdPublic       * Gw * infR;
    var cWf    = p.workforceEdu   * Gw * infR;
    var cItOp  = p.itOperating    * Gw * infR;
    var cExpansions = cLtc + cBh + cDvh + cEmsPh + cUnits + cRd + cWf + cItOp;

    /* Administration — both worlds computed directly */
    var legacyAdmin = admin0 * G * (1 - (1 - p.legacyAdminFloor) * covR);
    /* public benefit base for admin/governance rates (excl. admin itself) */
    var pubShare = covR * (1 - p.residualPrivateShare / 100);
    var pubBenefit = (cHosp + cClin + cDrugs + cOtherPhc + cExpansions) * pubShare;
    var newAdmin = (p.publicAdminRate / 100) * pubBenefit;
    var govCost  = (p.governanceRate / 100) * pubBenefit;

    /* Carried-through baseline lines */
    var cPubHealth = B.publicHealth * G;
    var cInvest = B.investmentResidual * G;

    /* One-time flows */
    var trans = p.transitionTotal * (ramps.transitionShape[t] || 0);
    var itcap = p.itCapital * (ramps.itCapitalShape[t] || 0);
    var shock = 0;
    if (s.shock && year >= NHA.START_YEAR + s.shock.startYear - 1 &&
        year < NHA.START_YEAR + s.shock.startYear - 1 + s.shock.years) {
      shock = s.shock.amountB * G;
    }

    /* Explicit offsets (each with one narrow scope; see header table) */
    var offProvAdmin  = (p.providerAdminSavings / 100) * (cHosp + cClin) * covR;
    var offCareModel  = p.careModelSavings * G * unitR;
    var offLowValue   = (p.lowValueCapture / 100) * 88 * G * infR;
    var offExtraction = p.extractionSavings * G * hospR;
    var offsets = offProvAdmin + offCareModel + offLowValue + offExtraction;

    var nheNha = cHosp + cClin + cDrugs + cOtherPhc + cExpansions +
                 legacyAdmin + newAdmin + govCost +
                 cPubHealth + cInvest + trans + itcap + shock - offsets;

    /* ---------- Financing ---------- */
    var pubCost = (nheNha - trans - itcap - shock) * pubShare + trans + itcap + shock;
    var fedRedirect = 0.32 * nheBase * covR;
    var stateMoe = 0.16 * nheBase * covR * 0.75 * stateMoeMult;
    var empContrib = 0.18 * nheBase * (p.employerCapture / 100) * covR;
    /* Wage pass-through: employers' net premium savings (what EHAC doesn't
       capture) flow to wages per CBO convention; those wages are taxed at
       ~28% average marginal federal rate, feeding revenue back. */
    var empRelief = Math.max(0, 0.18 * nheBase * covR * (1 - p.employerCapture / 100));
    var wageGain = empRelief * ((p.wagePassThrough || 0) / 100);
    var taxFeedback = wageGain * 0.28;
    var newRevenue = Math.max(0, pubCost - fedRedirect - stateMoe - empContrib - taxFeedback);
    var wealthRevenue = p.wealthTaxPotential * (p.wealthCollectionEff / 100) * Ggdp;
    var householdRelief = 0.27 * nheBase * covR -
      (nheNha * (p.residualPrivateShare / 100) * 0.5); // half of residual is OOP

    out.years.push(year);
    out.baseline.push(nheBase);
    out.nha.push(nheNha);
    out.detail.push({
      year: year, gdp: gdp, pop: pop,
      cHosp: cHosp, cClin: cClin, cDrugs: cDrugs, cOtherPhc: cOtherPhc,
      cLtc: cLtc, cBh: cBh, cDvh: cDvh, cEmsPh: cEmsPh, cUnits: cUnits,
      cRd: cRd, cWf: cWf, cItOp: cItOp,
      legacyAdmin: legacyAdmin, newAdmin: newAdmin, govCost: govCost,
      cPubHealth: cPubHealth, cInvest: cInvest,
      trans: trans, itcap: itcap, shock: shock,
      offProvAdmin: offProvAdmin, offCareModel: offCareModel,
      offLowValue: offLowValue, offExtraction: offExtraction,
      nheBase: nheBase, nheNha: nheNha,
      pubCost: pubCost, fedRedirect: fedRedirect, stateMoe: stateMoe,
      empContrib: empContrib, newRevenue: newRevenue,
      wealthRevenue: wealthRevenue, householdRelief: householdRelief,
      wageGain: wageGain, taxFeedback: taxFeedback,
      pubShare: pubShare
    });
  }
  return out;
};

/* ---- Mature system at an arbitrary scale year ---------------------------
 * Computes ONE synthetic year with the policy fully mature (ramps at their
 * 2041 values) but the economy at `yearsFrom2023` of growth — so
 * yearsFrom2023 = 1 answers: "what would the mature system cost if it
 * existed at 2024 scale?", directly comparable with the framework's claim
 * and with actual 2024 spending. Mirrors runPath's math exactly; the
 * consistency self-test below guards against divergence.                  */
NHA.matureAtScale = function (p, structural, yearsFrom2023) {
  var B = NHA.BASE2023;
  var ramps = NHA.buildRamps(structural);
  var t = (NHA.END_YEAR - NHA.START_YEAR + 1) - 2; // 2041: fully mature, transition wound down

  var g = p.baselineRealGrowth / 100;
  var G = Math.pow(1 + g, yearsFrom2023);
  var Gw = Math.pow(1 + 0.012, yearsFrom2023);

  var embedded = p.embeddedDrugSpend;
  var hospBase0 = B.hospital - 0.6 * embedded;
  var clinBase0 = B.physician + B.otherProf - 0.4 * embedded;
  var drugBase0 = B.rxRetail + embedded;
  var otherPhc0 = B.dental + B.otherPersonal + B.homeHealth + B.nursing +
                  B.dme + B.nondurables;
  var admin0 = B.netInsCost + B.govtAdmin;

  var covR = ramps.coverage[t] || 0, csR = ramps.costShareElim[t] || 0;
  var unitR = ramps.units[t] || 0, drugR = ramps.drugs[t] || 0;
  var hospR = ramps.hospitals[t] || 0, expR = ramps.expansions[t] || 0;
  var infR = ramps.infra[t] || 0;

  var cds = p.coverageDemandShare;
  var util = 1 + (p.utilIncrease / 100) * (cds * covR + (1 - cds) * csR);
  var pay = 1 - (1 - p.providerPaymentFactor) * hospR;

  var cHosp = hospBase0 * G * pay * util;
  var cClin = clinBase0 * G * pay * util;
  var cDrugs = drugBase0 * G * util * (1 - (p.drugPriceCut / 100) * drugR);
  var cOtherPhc = otherPhc0 * G * util;
  var cExpansions = (p.ltcExpansion + p.bhExpansion + p.dvhExpansion + p.emsPhExpansion) * G * expR +
                    p.unitsCost * Gw * unitR +
                    (p.rdPublic + p.workforceEdu + p.itOperating) * Gw * infR;
  var legacyAdmin = admin0 * G * (1 - (1 - p.legacyAdminFloor) * covR);
  var pubShare = covR * (1 - p.residualPrivateShare / 100);
  var pubBenefit = (cHosp + cClin + cDrugs + cOtherPhc + cExpansions) * pubShare;
  var newAdmin = (p.publicAdminRate / 100) * pubBenefit;
  var govCost = (p.governanceRate / 100) * pubBenefit;
  var offsets = (p.providerAdminSavings / 100) * (cHosp + cClin) * covR +
                p.careModelSavings * G * unitR +
                (p.lowValueCapture / 100) * 88 * G * infR +
                p.extractionSavings * G * hospR;

  var nheNha = cHosp + cClin + cDrugs + cOtherPhc + cExpansions +
               legacyAdmin + newAdmin + govCost +
               B.publicHealth * G + B.investmentResidual * G - offsets;
  return { nheNha: nheNha, nheBase: B.nheTotal * G };
};

/* ---- Monte Carlo ensemble ----------------------------------------------
 * Returns per-year percentile bands and steady-state distributions.       */
NHA.runMonteCarlo = function (scenarioId, sliderModes, nRuns, seed) {
  var effective = NHA.effectiveParams(scenarioId, sliderModes);
  var structural = NHA.scenarioStructural(scenarioId);
  var rand = NHA.makeRng(seed || 42);
  var nYears = NHA.END_YEAR - NHA.START_YEAR + 1;

  var nhaRuns = [];      // [run][year]
  var steadyTotals = [], steadyNewRev = [], steadyFedInc = [], steadyPerCap = [],
      steadyGdpPct = [], nhe2030delta = [], tenYearFedInc = [], matureToday = [];

  for (var r = 0; r < nRuns; r++) {
    /* one systemic optimism/pessimism factor per run (triangular on [-1,1]) */
    var z = NHA.triangular(-1, 0, 1, rand);
    var p = NHA.sampleParams(effective, rand, z);
    var path = NHA.runPath(p, structural);
    nhaRuns.push(path.nha);
    matureToday.push(NHA.matureAtScale(p, structural, 1).nheNha); // 2024 scale

    /* steady state = mean of final 3 years */
    var n = path.detail.length;
    var ssIdx = [n - 3, n - 2, n - 1];
    function ssMean(fn) {
      return (fn(path.detail[ssIdx[0]]) + fn(path.detail[ssIdx[1]]) + fn(path.detail[ssIdx[2]])) / 3;
    }
    steadyTotals.push(ssMean(function (d) { return d.nheNha; }));
    steadyNewRev.push(ssMean(function (d) { return d.newRevenue; }));
    steadyPerCap.push(ssMean(function (d) { return d.nheNha * 1000 / d.pop; })); // $B→$ per person (B/M = thousands)
    steadyGdpPct.push(ssMean(function (d) { return 100 * d.nheNha / d.gdp; }));
    steadyFedInc.push(ssMean(function (d) {
      return (d.pubCost - d.stateMoe) - 0.32 * d.nheBase;
    }));
    /* 2030 NHE delta (CBO comparator year) */
    var i2030 = 2030 - NHA.START_YEAR;
    nhe2030delta.push(path.detail[i2030].nheNha - path.detail[i2030].nheBase);
    /* first-10-years federal increase, annualized (Urban/Mercatus comparator) */
    var sum10 = 0;
    for (var y = 0; y < 10; y++) {
      var d10 = path.detail[y];
      sum10 += (d10.pubCost - d10.stateMoe) - 0.32 * d10.nheBase;
    }
    tenYearFedInc.push(sum10 / 10);
  }

  function pct(arr, q) {
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var i = (a.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
    return lo === hi ? a[lo] : a[lo] + (a[hi] - a[lo]) * (i - lo);
  }
  function bandsOf(arr) {
    return { p10: pct(arr, 0.10), p50: pct(arr, 0.50), p90: pct(arr, 0.90) };
  }

  /* per-year bands for the path chart */
  var yearBands = [];
  for (var t = 0; t < nYears; t++) {
    var col = nhaRuns.map(function (run) { return run[t]; });
    yearBands.push(bandsOf(col));
  }

  /* mode run for decomposition displays */
  var modeParams = NHA.sampleParams(effective, null);
  var modePath = NHA.runPath(modeParams, structural);

  return {
    scenarioId: scenarioId, nRuns: nRuns,
    years: modePath.years,
    baseline: modePath.baseline,
    yearBands: yearBands,
    modePath: modePath,
    modeParams: modeParams,
    steady: {
      total: bandsOf(steadyTotals),
      newRevenue: bandsOf(steadyNewRev),
      perCapita: bandsOf(steadyPerCap),
      gdpPct: bandsOf(steadyGdpPct),
      fedIncrease: bandsOf(steadyFedInc),
      matureToday: bandsOf(matureToday)
    },
    nhe2030delta: bandsOf(nhe2030delta),
    tenYearFedIncAnnualized: bandsOf(tenYearFedInc)
  };
};

/* ---- Self-tests (rendered in the footer; all must pass) ---------------- */
NHA.selfTest = function () {
  var results = [], B = NHA.BASE2023;
  function check(name, ok, note) { results.push({ name: name, ok: !!ok, note: note || "" }); }

  /* 1. Calibration categories sum exactly to CMS NHE total */
  var listed = B.hospital + B.physician + B.otherProf + B.dental +
    B.otherPersonal + B.homeHealth + B.nursing + B.rxRetail + B.dme +
    B.nondurables + B.netInsCost + B.govtAdmin + B.publicHealth + B.investmentResidual;
  check("2023 categories sum to CMS NHE total ($" + B.nheTotal + "B)",
    Math.abs(listed - B.nheTotal) < 0.11, "sum=" + listed.toFixed(1));

  /* 2. Transition & IT-capital shapes each sum to 1.0 */
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  check("Transition outlay shape sums to 100%",
    Math.abs(sum(NHA.RAMPS.transitionShape) - 1) < 1e-9);
  check("IT capital shape sums to 100%",
    Math.abs(sum(NHA.RAMPS.itCapitalShape) - 1) < 1e-9);

  /* 3. Neutral policy ⇒ NHA ≈ baseline (no free lunch / no phantom cost) */
  var effective = NHA.effectiveParams("SCN-BASE", null);
  var neutral = NHA.sampleParams(effective, null);
  neutral.utilIncrease = 0; neutral.drugPriceCut = 0;
  neutral.providerPaymentFactor = 1; neutral.providerAdminSavings = 0;
  neutral.careModelSavings = 0; neutral.lowValueCapture = 0;
  neutral.extractionSavings = 0; neutral.ltcExpansion = 0;
  neutral.bhExpansion = 0; neutral.dvhExpansion = 0; neutral.emsPhExpansion = 0;
  neutral.unitsCost = 0; neutral.rdPublic = 0; neutral.workforceEdu = 0;
  neutral.itOperating = 0; neutral.itCapital = 0; neutral.transitionTotal = 0;
  neutral.legacyAdminFloor = 1;   // legacy admin never shrinks
  neutral.publicAdminRate = 0; neutral.governanceRate = 0;
  var neutralPath = NHA.runPath(neutral, {});
  var last = neutralPath.detail[neutralPath.detail.length - 1];
  var relDiff = Math.abs(last.nheNha - last.nheBase) / last.nheBase;
  check("Neutral-policy run reproduces baseline within 0.5%",
    relDiff < 0.005, "diff=" + (100 * relDiff).toFixed(3) + "%");

  /* 4. Baseline grows monotonically */
  var mono = true;
  for (var i = 1; i < neutralPath.baseline.length; i++) {
    if (neutralPath.baseline[i] <= neutralPath.baseline[i - 1]) mono = false;
  }
  check("Baseline trajectory is monotonically increasing", mono);

  /* 5. Offsets never exceed the categories they subtract from (mode run) */
  var modeP = NHA.sampleParams(effective, null);
  var modePath = NHA.runPath(modeP, {});
  var offsetsOk = modePath.detail.every(function (d) {
    return (d.offProvAdmin + d.offExtraction) < (d.cHosp + d.cClin) &&
           d.offCareModel < d.cHosp &&
           d.offLowValue < (d.cHosp + d.cClin + d.cOtherPhc);
  });
  check("Offsets are always smaller than their source categories", offsetsOk);

  /* 5b. matureAtScale mirrors runPath exactly (guards formula divergence):
   *     at 18 years from 2023 (= 2041) it must reproduce the path value,
   *     since transition outlays are zero by then. */
  var d2041 = modePath.detail[2041 - NHA.START_YEAR];
  var mas = NHA.matureAtScale(modeP, {}, 18);
  var masErr = Math.abs(mas.nheNha - d2041.nheNha) / d2041.nheNha;
  check("Mature-at-scale computation matches the 2041 path value",
    masErr < 0.001, "diff=" + (100 * masErr).toFixed(4) + "%");

  /* 6. Percentile bands ordered p10 ≤ p50 ≤ p90 (small MC run) */
  var mc = NHA.runMonteCarlo("SCN-BASE", null, 60, 7);
  var ordered = mc.yearBands.every(function (b) {
    return b.p10 <= b.p50 + 1e-9 && b.p50 <= b.p90 + 1e-9;
  });
  check("Monte Carlo bands are ordered (p10 ≤ p50 ≤ p90)", ordered);

  /* 7. Systemic correlation pushes cost-side up and savings-side down */
  var fixed = function () { return 0.5; };
  var pHi = NHA.sampleParams(effective, fixed, 1);
  var pLo = NHA.sampleParams(effective, fixed, -1);
  check("Correlated draws: z=+1 raises costs and cuts savings vs z=−1",
    pHi.utilIncrease > pLo.utilIncrease && pHi.drugPriceCut < pLo.drugPriceCut,
    "util " + pHi.utilIncrease.toFixed(1) + ">" + pLo.utilIncrease.toFixed(1) +
    ", drugcut " + pHi.drugPriceCut.toFixed(1) + "<" + pLo.drugPriceCut.toFixed(1));

  /* 8. Wage pass-through feedback lowers the new-revenue requirement */
  var pw0 = NHA.sampleParams(effective, null); pw0.wagePassThrough = 0;
  var pw9 = NHA.sampleParams(effective, null); pw9.wagePassThrough = 95;
  var d0 = NHA.runPath(pw0, {}).detail[2041 - NHA.START_YEAR];
  var d9 = NHA.runPath(pw9, {}).detail[2041 - NHA.START_YEAR];
  check("Wage pass-through: feedback = 28% of wage gain and reduces new revenue",
    d0.newRevenue > d9.newRevenue &&
    Math.abs(d9.taxFeedback - 0.28 * d9.wageGain) < 0.01 &&
    d0.wageGain === 0,
    "newRev " + d0.newRevenue.toFixed(0) + "→" + d9.newRevenue.toFixed(0));

  /* 9. Age-structure shares sum to 1 in both years */
  var s24 = 0, s41 = 0;
  NHA.AGE_STRUCTURE.bands.forEach(function (b) { s24 += b.share2024; s41 += b.share2041; });
  check("Age-structure shares sum to 1 (2024 and 2041)",
    Math.abs(s24 - 1) < 0.005 && Math.abs(s41 - 1) < 0.005,
    "s24=" + s24.toFixed(3) + " s41=" + s41.toFixed(3));

  return results;
};
