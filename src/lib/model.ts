/* =========================================================================
 * National Health Assurance Simulation - Model Engine
 * =========================================================================
 * Computes, for each calendar year 2027-2042:
 *   (a) the status-quo baseline world (CMS-trajectory NHE by category), and
 *   (b) the NHA world (phase-ramped policy path),
 * from one sampled parameter set. Offsets are DERIVED as differences between
 * directly-computed quantities, so a savings mechanism can never be counted
 * twice - each has exactly one home:
 *
 *   Mechanism                      Where it lives
 *   -----------------------------  -------------------------------------
 *   Payer administrative savings   legacyAdmin shrinks vs. newAdmin grows
 *   Payment-rate compression       payFactor on hospital+clinical
 *   Drug price negotiation         price factor on the drugs category
 *   Provider billing savings       explicit offset, % of hosp+clin ONLY
 *   ED diversion / avoidable adm.  explicit offset, $B, ramps with units
 *   Low-value care reduction       explicit offset, capture% x $88B pool
 *   Related-party extraction       explicit offset, $B, narrow scope
 *
 * R203 [§S2]: each explicit offset also names the capability that delivers
 * it, because the ramp it multiplies is a modelling claim and was previously
 * only implied by the arithmetic. The four pairings and their reasons are
 * OFFSET_RAMPS in params.ts; offsetRamp() below is the only way this file
 * reaches a ramp for an offset, so the declaration cannot fall out of step
 * with the engine. offLowValue ramps on infra, the fastest curve here, which
 * is stated in its entry rather than left to be found.
 *
 * All internal dollars are REAL 2023 $B. Display conversion to 2024$ happens
 * in the UI layer via DEFLATOR_2023_TO_2024.
 *
 * Ported from docs/js/model.js in full: NHA.sampleParams, NHA.runPath,
 * NHA.matureAtScale, NHA.runMonteCarlo, NHA.selfTest, and their private
 * helpers (triangular sampling, buildRamps, the mulberry32 seeded RNG).
 * ========================================================================= */
import {
  BASE2023,
  OFFSET_RAMPS,
  RAMPS,
  PARAM_CORR,
  CORR_WEIGHT,
  START_YEAR,
  END_YEAR,
  PRE_YEARS,
  AGE_STRUCTURE,
  TOP_CAPITAL_REAL_GROWTH,
} from './params';
import { effectiveParams, scenarioStructural, SCENARIOS } from './scenarios';
import type { ScenarioStructural } from './scenarios';
import type {
  Triangular,
  SampledParams,
  PathResult,
  DetailRow,
  MatureAtScaleResult,
  MonteCarloResult,
  PercentileBand,
  SelfTestResult,
} from './model-types';

/* ---- Declared offset pairings (R203 [§S2]) ------------------------------
 * Which capability delivers each explicit offset is a modelling claim, so it
 * is declared in params.ts and read here. An offset with no declaration is a
 * saving with no stated cause, and that throws rather than quietly ramping on
 * whatever curve was nearest in the source. */
const OFFSET_RAMP_BY_ID: Record<string, string> = {};
OFFSET_RAMPS.forEach(function (o) { OFFSET_RAMP_BY_ID[o.id] = o.ramp; });

/* The ramp values for one year, keyed the way OFFSET_RAMPS names them. Built
   here rather than typed at each call site: both runPath and matureAtScale
   compute the offsets, and a seven-key literal written twice is the same
   duplication R251 closed for the phase map. */
export function rampsAt(ramps: BuiltRamps, t: number): Record<string, number> {
  return {
    coverage: ramps.coverage[t] || 0,
    costShareElim: ramps.costShareElim[t] || 0,
    units: ramps.units[t] || 0,
    drugs: ramps.drugs[t] || 0,
    hospitals: ramps.hospitals[t] || 0,
    expansions: ramps.expansions[t] || 0,
    infra: ramps.infra[t] || 0
  };
}

export function offsetRamp(id: string, values: Record<string, number>): number {
  const ramp = OFFSET_RAMP_BY_ID[id];
  if (ramp === undefined) throw new Error('Offset ' + id + ' declares no ramp pairing');
  const value = values[ramp];
  if (value === undefined) throw new Error('Offset ' + id + ' names unknown ramp ' + ramp);
  return value;
}

/* ---- Triangular distribution sampling ---- */
function triangular(lo: number, mo: number, hi: number, rand: () => number): number {
  if (hi <= lo) return mo; // degenerate
  const u = rand();
  const fc = (mo - lo) / (hi - lo);
  return u < fc
    ? lo + Math.sqrt(u * (hi - lo) * (mo - lo))
    : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mo));
}

/* Sample a full parameter set: {id: value}. mode-only if rand === null.
 * z (optional, in [-1,1]) is the run's systemic factor: parameters tagged
 * in PARAM_CORR have their sampling quantile shifted by
 * CORR_WEIGHT x sign x z, so cost-side surprises and savings-side
 * disappointments arrive together (see params.ts).                        */
export function sampleParams(
  effective: Record<string, Triangular>,
  rand: (() => number) | null,
  z?: number
): SampledParams {
  const out: Record<string, number> = {};
  Object.keys(effective).forEach(function (id) {
    const e = effective[id];
    if (!rand) { out[id] = e.mode; return; }
    let u = rand();
    const s = z != null ? (PARAM_CORR[id] || 0) : 0;
    if (s !== 0 && z != null) {
      u = Math.min(0.98, Math.max(0.02, u + CORR_WEIGHT * s * z));
    }
    out[id] = triangular(e.low, e.mode, e.high, function () { return u; });
  });
  return out as SampledParams;
}

export interface BuiltRamps {
  coverage: number[];
  costShareElim: number[];
  units: number[];
  drugs: number[];
  hospitals: number[];
  expansions: number[];
  infra: number[];
  transitionShape: number[];
  itCapitalShape: number[];
}

/* Ramps with scenario structural adjustments applied */
export function buildRamps(structural: ScenarioStructural): BuiltRamps {
  const R = RAMPS;
  const s = structural || {};
  function shift(arr: number[], by: number): number[] {
    if (!by) return arr.slice();
    const out: number[] = [];
    for (let i = 0; i < arr.length; i++) out.push(i - by >= 0 ? arr[i - by] : 0);
    return out;
  }
  const coverage = shift(R.coverage, s.coverageDelayYears || 0);
  const cs = shift(R.costShareElim, (s.coverageDelayYears || 0) + (s.costShareDelayYears || 0));
  const units = R.units.map(function (v) { return v * (s.unitsRampMult || 1); });
  return {
    coverage: coverage, costShareElim: cs, units: units,
    drugs: shift(R.drugs, s.coverageDelayYears || 0),
    hospitals: shift(R.hospitals, s.coverageDelayYears || 0),
    expansions: shift(R.expansions, s.coverageDelayYears || 0),
    infra: R.infra.slice(),
    transitionShape: R.transitionShape.slice(),
    itCapitalShape: R.itCapitalShape.slice()
  };
}

/* ---- Baseline PHC category split (2023 $B) ------------------------------
 * R157 [§S5]: this was written out three times - here in runPath, again in
 * matureAtScale, and a third time in bridge.ts - each with its own copy of the
 * 0.6/0.4 embedded-drug literals. The bridge identity catches a bridge.ts <->
 * runPath divergence; nothing caught runPath <-> matureAtScale except
 * self-test 5b, which runs only under `{}` structural.
 *
 * The 0.6/0.4 split allocates `embeddedDrugSpend` - drugs dispensed inside a
 * hospital or clinic visit and billed as part of it - out of the two
 * categories that carry it, so the drug base is complete and neither category
 * double-counts. It nets to zero across the four categories by construction,
 * which is why the bridge identity is exact.
 * ------------------------------------------------------------------------ */
export const EMBEDDED_DRUG_HOSPITAL_SHARE = 0.6;
export const EMBEDDED_DRUG_CLINIC_SHARE = 0.4;

export interface BaselineSplit {
  hosp0: number; clin0: number; drug0: number; other0: number; admin0: number;
}
export function baselineCategorySplit(embeddedDrugSpend: number): BaselineSplit {
  const B = BASE2023;
  const e = embeddedDrugSpend;
  return {
    hosp0: B.hospital - EMBEDDED_DRUG_HOSPITAL_SHARE * e,
    clin0: B.physician + B.otherProf - EMBEDDED_DRUG_CLINIC_SHARE * e,
    drug0: B.rxRetail + e,
    other0: B.dental + B.otherPersonal + B.homeHealth + B.nursing +
            B.dme + B.nondurables,
    admin0: B.netInsCost + B.govtAdmin
  };
}

/* ---- One full path run for a single parameter sample -------------------
 * Returns { years[], baseline[], nha[], detail (per-year objects) }        */
export function runPath(p: SampledParams, structural: ScenarioStructural): PathResult {
  const B = BASE2023;
  const ramps = buildRamps(structural);
  const nYears = END_YEAR - START_YEAR + 1; // 16
  const s = structural || {};
  const stateMoeMult = s.stateMoeMult || 1;

  const g = p.baselineRealGrowth / 100;
  const gGdp = p.gdpRealGrowth / 100;
  const gPop = p.popGrowth / 100;
  const gWage = 0.012; // real input-cost growth for program-based expansions

  /* Baseline PHC categories (2023 $B) - drugs pulled out with embedded share */
  const split = baselineCategorySplit(p.embeddedDrugSpend);
  const hospBase0 = split.hosp0, clinBase0 = split.clin0;
  const drugBase0 = split.drug0, otherPhc0 = split.other0;
  const admin0 = split.admin0;

  const out: PathResult = { years: [], baseline: [], nha: [], detail: [] };

  for (let t = 0; t < nYears; t++) {
    const year = START_YEAR + t;
    const G = Math.pow(1 + g, PRE_YEARS + t);        // health-cost growth from 2023
    const Gw = Math.pow(1 + gWage, PRE_YEARS + t);    // program input-cost growth
    const Ggdp = Math.pow(1 + gGdp, PRE_YEARS + t);
    const gdp = B.gdp * Ggdp;
    const pop = B.populationM * Math.pow(1 + gPop, PRE_YEARS + t);

    /* ---------- Baseline world ---------- */
    const nheBase = B.nheTotal * G;

    /* ---------- Ramps this year ---------- */
    const covR  = ramps.coverage[t]      || 0;
    const csR   = ramps.costShareElim[t] || 0;
    const unitR = ramps.units[t]         || 0;
    const drugR = ramps.drugs[t]         || 0;
    const hospR = ramps.hospitals[t]     || 0;
    const expR  = ramps.expansions[t]    || 0;
    const infR  = ramps.infra[t]         || 0;

    /* ---------- NHA world ---------- */
    /* Demand: coverage component + cost-sharing component */
    const cds = p.coverageDemandShare;
    const util = 1 + (p.utilIncrease / 100) * (cds * covR + (1 - cds) * csR);
    /* Payment factor phases in with hospital global budgets */
    const pay = 1 - (1 - p.providerPaymentFactor) * hospR;

    const cHosp  = hospBase0 * G * pay * util;
    const cClin  = clinBase0 * G * pay * util;
    const cDrugs = drugBase0 * G * util * (1 - (p.drugPriceCut / 100) * drugR);
    const cOtherPhc = otherPhc0 * G * util;

    /* Expansions: demand-driven grow with G; program-based grow with wages.
       LTC aide wage floor is labor cost, so it grows with wages (Gw) and
       ramps with the expansion wave (expR). */
    const cLtc      = p.ltcExpansion   * G  * expR;
    const cLtcAides = p.ltcWageFloor   * Gw * expR;
    const cBh    = p.bhExpansion    * G  * expR;
    const cDvh   = p.dvhExpansion   * G  * expR;
    const cEmsPh = p.emsPhExpansion * G  * expR;
    const cUnits = p.unitsCost      * Gw * unitR;
    const cRd    = p.rdPublic       * Gw * infR;
    const cWf    = p.workforceEdu   * Gw * infR;
    const cItOp  = p.itOperating    * Gw * infR;
    const cExpansions = cLtc + cLtcAides + cBh + cDvh + cEmsPh + cUnits + cRd + cWf + cItOp;

    /* Administration - both worlds computed directly */
    const legacyAdmin = admin0 * G * (1 - (1 - p.legacyAdminFloor) * covR);
    /* public benefit base for admin/governance rates (excl. admin itself) */
    const pubShare = covR * (1 - p.residualPrivateShare / 100);
    const pubBenefit = (cHosp + cClin + cDrugs + cOtherPhc + cExpansions) * pubShare;
    const newAdmin = (p.publicAdminRate / 100) * pubBenefit;
    const govCost  = (p.governanceRate / 100) * pubBenefit;

    /* Carried-through baseline lines */
    const cPubHealth = B.publicHealth * G;
    const cInvest = B.investmentResidual * G;

    /* One-time flows */
    const trans = p.transitionTotal * (ramps.transitionShape[t] || 0);
    const itcap = p.itCapital * (ramps.itCapitalShape[t] || 0);
    let shock = 0;
    if (s.shock && year >= START_YEAR + s.shock.startYear - 1 &&
        year < START_YEAR + s.shock.startYear - 1 + s.shock.years) {
      shock = s.shock.amountB * G;
    }

    /* Explicit offsets (each with one narrow scope; see header table).
       R203 [§S2]: the ramp each one multiplies is the model's claim about
       which capability delivers that saving, so it comes from OFFSET_RAMPS
       rather than being named inline. offsetRamp throws on an undeclared id,
       which is what stops a fifth offset arriving with no stated pairing. */
    const rampNow = rampsAt(ramps, t);
    const offProvAdmin  = (p.providerAdminSavings / 100) * (cHosp + cClin) *
      offsetRamp('offProvAdmin', rampNow);
    const offCareModel  = p.careModelSavings * G * offsetRamp('offCareModel', rampNow);
    const offLowValue   = (p.lowValueCapture / 100) * 88 * G *
      offsetRamp('offLowValue', rampNow);
    const offExtraction = p.extractionSavings * G * offsetRamp('offExtraction', rampNow);
    const offsets = offProvAdmin + offCareModel + offLowValue + offExtraction;

    const nheNha = cHosp + cClin + cDrugs + cOtherPhc + cExpansions +
                   legacyAdmin + newAdmin + govCost +
                   cPubHealth + cInvest + trans + itcap + shock - offsets;

    /* ---------- Financing ---------- */
    const pubCost = (nheNha - trans - itcap - shock) * pubShare + trans + itcap + shock;
    const fedRedirect = 0.32 * nheBase * covR;
    const stateMoe = 0.16 * nheBase * covR * 0.75 * stateMoeMult;
    const empContrib = 0.18 * nheBase * (p.employerCapture / 100) * covR;
    /* Wage pass-through: employers' net premium savings (what EHAC doesn't
       capture) flow to wages per CBO convention; those wages are taxed at
       ~28% average marginal federal rate, feeding revenue back. */
    const empRelief = Math.max(0, 0.18 * nheBase * covR * (1 - p.employerCapture / 100));
    const wageGain = empRelief * ((p.wagePassThrough || 0) / 100);
    const taxFeedback = wageGain * 0.28;
    const newRevenue = Math.max(0, pubCost - fedRedirect - stateMoe - empContrib - taxFeedback);
    /* R143 [§S5]: this grew at Ggdp (1.9%), while taxmodel.ts grows the same
       base at the top-capital rate (4.0%) - 38% apart by 2041, on a quantity
       both engines publish. One rate now, from params.ts. Not sampled,
       matching the tax model, which treats it as a fixed class rate. */
    const Gtop = Math.pow(1 + TOP_CAPITAL_REAL_GROWTH, PRE_YEARS + t);
    const wealthRevenue = p.wealthTaxPotential * (p.wealthCollectionEff / 100) * Gtop;
    const householdRelief = 0.27 * nheBase * covR -
      (nheNha * (p.residualPrivateShare / 100) * 0.5); // half of residual is OOP

    out.years.push(year);
    out.baseline.push(nheBase);
    out.nha.push(nheNha);
    const row: DetailRow = {
      year: year, gdp: gdp, pop: pop,
      cHosp: cHosp, cClin: cClin, cDrugs: cDrugs, cOtherPhc: cOtherPhc,
      cLtc: cLtc, cLtcAides: cLtcAides, cBh: cBh, cDvh: cDvh, cEmsPh: cEmsPh, cUnits: cUnits,
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
    };
    out.detail.push(row);
  }
  return out;
}

/* Deterministic PRNG (mulberry32) so runs are reproducible */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---- Mature system at an arbitrary scale year ---------------------------
 * Computes ONE synthetic year with the policy fully mature (ramps at their
 * 2041 values) but the economy at `yearsFrom2023` of growth - so
 * yearsFrom2023 = 1 answers: "what would the mature system cost if it
 * existed at 2024 scale?", directly comparable with the framework's claim
 * and with actual 2024 spending. Mirrors runPath's math exactly; the
 * consistency self-test below guards against divergence.                  */
export function matureAtScale(
  p: SampledParams,
  structural: ScenarioStructural,
  yearsFrom2023: number
): MatureAtScaleResult {
  const B = BASE2023;
  const ramps = buildRamps(structural);
  const t = (END_YEAR - START_YEAR + 1) - 2; // 2041: fully mature, transition wound down

  const g = p.baselineRealGrowth / 100;
  const G = Math.pow(1 + g, yearsFrom2023);
  const Gw = Math.pow(1 + 0.012, yearsFrom2023);

  const split = baselineCategorySplit(p.embeddedDrugSpend);
  const hospBase0 = split.hosp0, clinBase0 = split.clin0;
  const drugBase0 = split.drug0, otherPhc0 = split.other0;
  const admin0 = split.admin0;

  const covR = ramps.coverage[t] || 0, csR = ramps.costShareElim[t] || 0;
  const unitR = ramps.units[t] || 0, drugR = ramps.drugs[t] || 0;
  const hospR = ramps.hospitals[t] || 0, expR = ramps.expansions[t] || 0;
  const infR = ramps.infra[t] || 0;

  const cds = p.coverageDemandShare;
  const util = 1 + (p.utilIncrease / 100) * (cds * covR + (1 - cds) * csR);
  const pay = 1 - (1 - p.providerPaymentFactor) * hospR;

  const cHosp = hospBase0 * G * pay * util;
  const cClin = clinBase0 * G * pay * util;
  const cDrugs = drugBase0 * G * util * (1 - (p.drugPriceCut / 100) * drugR);
  const cOtherPhc = otherPhc0 * G * util;
  const cExpansions = (p.ltcExpansion + p.bhExpansion + p.dvhExpansion + p.emsPhExpansion) * G * expR +
                      p.ltcWageFloor * Gw * expR +
                      p.unitsCost * Gw * unitR +
                      (p.rdPublic + p.workforceEdu + p.itOperating) * Gw * infR;
  const legacyAdmin = admin0 * G * (1 - (1 - p.legacyAdminFloor) * covR);
  const pubShare = covR * (1 - p.residualPrivateShare / 100);
  const pubBenefit = (cHosp + cClin + cDrugs + cOtherPhc + cExpansions) * pubShare;
  const newAdmin = (p.publicAdminRate / 100) * pubBenefit;
  const govCost = (p.governanceRate / 100) * pubBenefit;
  /* R203 [§S2]: the same declared pairings the year loop uses. This is the
     second place the offsets are computed, so naming a ramp inline here would
     put the model's claim about what delivers each saving in two files. */
  const rampNow = rampsAt(ramps, t);
  const offsets = (p.providerAdminSavings / 100) * (cHosp + cClin) *
                  offsetRamp('offProvAdmin', rampNow) +
                p.careModelSavings * G * offsetRamp('offCareModel', rampNow) +
                (p.lowValueCapture / 100) * 88 * G * offsetRamp('offLowValue', rampNow) +
                p.extractionSavings * G * offsetRamp('offExtraction', rampNow);

  const nheNha = cHosp + cClin + cDrugs + cOtherPhc + cExpansions +
               legacyAdmin + newAdmin + govCost +
               B.publicHealth * G + B.investmentResidual * G - offsets;
  return { nheNha: nheNha, nheBase: B.nheTotal * G };
}

/* ---- Monte Carlo ensemble ----------------------------------------------
 * Returns per-year percentile bands and steady-state distributions.       */
export function runMonteCarlo(
  scenarioId: string,
  sliderModes: Record<string, number> | null,
  nRuns: number,
  seed: number
): MonteCarloResult {
  const effective = effectiveParams(scenarioId, sliderModes);
  const structural = scenarioStructural(scenarioId);
  const rand = makeRng(seed || 42);
  const nYears = END_YEAR - START_YEAR + 1;

  const nhaRuns: number[][] = [];      // [run][year]
  const steadyTotals: number[] = [], steadyNewRev: number[] = [], steadyFedInc: number[] = [],
    steadyPerCap: number[] = [], steadyGdpPct: number[] = [], nhe2030delta: number[] = [],
    tenYearFedInc: number[] = [], matureToday: number[] = [];

  for (let r = 0; r < nRuns; r++) {
    /* one systemic optimism/pessimism factor per run (triangular on [-1,1]) */
    const z = triangular(-1, 0, 1, rand);
    const p = sampleParams(effective, rand, z);
    const path = runPath(p, structural);
    nhaRuns.push(path.nha);
    matureToday.push(matureAtScale(p, structural, 1).nheNha); // 2024 scale

    /* steady state = mean of final 3 years */
    const n = path.detail.length;
    const ssIdx = [n - 3, n - 2, n - 1];
    function ssMean(fn: (d: DetailRow) => number): number {
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
    const i2030 = 2030 - START_YEAR;
    nhe2030delta.push(path.detail[i2030].nheNha - path.detail[i2030].nheBase);
    /* first-10-years federal increase, annualized (Urban/Mercatus comparator) */
    let sum10 = 0;
    for (let y = 0; y < 10; y++) {
      const d10 = path.detail[y];
      sum10 += (d10.pubCost - d10.stateMoe) - 0.32 * d10.nheBase;
    }
    tenYearFedInc.push(sum10 / 10);
  }

  function pct(arr: number[], q: number): number {
    const a = arr.slice().sort(function (x, y) { return x - y; });
    const i = (a.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
    return lo === hi ? a[lo] : a[lo] + (a[hi] - a[lo]) * (i - lo);
  }
  function bandsOf(arr: number[]): PercentileBand {
    return { p10: pct(arr, 0.10), p50: pct(arr, 0.50), p90: pct(arr, 0.90) };
  }

  /* per-year bands for the path chart */
  const yearBands: PercentileBand[] = [];
  for (let t = 0; t < nYears; t++) {
    const col = nhaRuns.map(function (run) { return run[t]; });
    yearBands.push(bandsOf(col));
  }

  /* mode run for decomposition displays */
  const modeParams = sampleParams(effective, null);
  const modePath = runPath(modeParams, structural);

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
}

/* ---- Self-tests (rendered in the footer; all must pass) ---------------- */
export function selfTest(): SelfTestResult[] {
  const results: SelfTestResult[] = [];
  const B = BASE2023;
  function check(name: string, ok: boolean, note?: string): void {
    results.push({ name: name, ok: !!ok, note: note || "" });
  }

  /* 1. Calibration categories sum exactly to CMS NHE total */
  const listed = B.hospital + B.physician + B.otherProf + B.dental +
    B.otherPersonal + B.homeHealth + B.nursing + B.rxRetail + B.dme +
    B.nondurables + B.netInsCost + B.govtAdmin + B.publicHealth + B.investmentResidual;
  check("2023 categories sum to CMS NHE total ($" + B.nheTotal + "B)",
    Math.abs(listed - B.nheTotal) < 0.11, "sum=" + listed.toFixed(1));

  /* 2. Transition & IT-capital shapes each sum to 1.0 */
  function sum(a: number[]): number { return a.reduce(function (x, y) { return x + y; }, 0); }
  check("Transition outlay shape sums to 100%",
    Math.abs(sum(RAMPS.transitionShape) - 1) < 1e-9);
  check("IT capital shape sums to 100%",
    Math.abs(sum(RAMPS.itCapitalShape) - 1) < 1e-9);

  /* 3. Neutral policy ⇒ NHA ≈ baseline (no free lunch / no phantom cost) */
  const effective = effectiveParams("SCN-BASE", null);
  const neutral = sampleParams(effective, null);
  neutral.utilIncrease = 0; neutral.drugPriceCut = 0;
  neutral.providerPaymentFactor = 1; neutral.providerAdminSavings = 0;
  neutral.careModelSavings = 0; neutral.lowValueCapture = 0;
  neutral.extractionSavings = 0; neutral.ltcExpansion = 0; neutral.ltcWageFloor = 0;
  neutral.bhExpansion = 0; neutral.dvhExpansion = 0; neutral.emsPhExpansion = 0;
  neutral.unitsCost = 0; neutral.rdPublic = 0; neutral.workforceEdu = 0;
  neutral.itOperating = 0; neutral.itCapital = 0; neutral.transitionTotal = 0;
  neutral.legacyAdminFloor = 1;   // legacy admin never shrinks
  neutral.publicAdminRate = 0; neutral.governanceRate = 0;
  const neutralPath = runPath(neutral, {});
  const last = neutralPath.detail[neutralPath.detail.length - 1];
  const relDiff = Math.abs(last.nheNha - last.nheBase) / last.nheBase;
  check("Neutral-policy run reproduces baseline within 0.5%",
    relDiff < 0.005, "diff=" + (100 * relDiff).toFixed(3) + "%");

  /* 4. Baseline grows monotonically */
  let mono = true;
  for (let i = 1; i < neutralPath.baseline.length; i++) {
    if (neutralPath.baseline[i] <= neutralPath.baseline[i - 1]) mono = false;
  }
  check("Baseline trajectory is monotonically increasing", mono);

  /* 5. Offsets never exceed the categories they subtract from (mode run) */
  const modeP = sampleParams(effective, null);
  const modePath = runPath(modeP, {});
  const offsetsOk = modePath.detail.every(function (d) {
    return (d.offProvAdmin + d.offExtraction) < (d.cHosp + d.cClin) &&
           d.offCareModel < d.cHosp &&
           d.offLowValue < (d.cHosp + d.cClin + d.cOtherPhc);
  });
  check("Offsets are always smaller than their source categories", offsetsOk);

  /* 5b. matureAtScale mirrors runPath exactly (guards formula divergence):
   *     at 18 years from 2023 (= 2041) it must reproduce the path value,
   *     since transition outlays are zero by then. */
  const d2041 = modePath.detail[2041 - START_YEAR];
  const mas = matureAtScale(modeP, {}, 18);
  const masErr = Math.abs(mas.nheNha - d2041.nheNha) / d2041.nheNha;
  check("Mature-at-scale computation matches the 2041 path value",
    masErr < 0.001, "diff=" + (100 * masErr).toFixed(4) + "%");

  /* 5c. R157/R22 [§S5]: 5b runs one scenario under `{}` structural, so a
   *     formula divergence that only shows under a ramp delay or a shock was
   *     invisible. Run the same comparison for every scenario. A scenario
   *     whose shock is still live at 2041 is excluded rather than silently
   *     tolerated, because matureAtScale carries no shock term by design. */
  let masScenarios = 0, masWorst = 0, masWorstId = '';
  SCENARIOS.forEach(function (sc) {
    const eff = effectiveParams(sc.id, null);
    const sp = sampleParams(eff, null);
    const struct = scenarioStructural(sc.id);
    const path = runPath(sp, struct);
    const row = path.detail[2041 - START_YEAR];
    if (row.shock !== 0) return;
    const m = matureAtScale(sp, struct, 18);
    const err = Math.abs(m.nheNha - row.nheNha) / row.nheNha;
    masScenarios += 1;
    if (err > masWorst) { masWorst = err; masWorstId = sc.id; }
  });
  check("Mature-at-scale matches the 2041 path value for every scenario",
    masScenarios > 1 && masWorst < 0.001,
    masScenarios + " scenarios, worst " + (100 * masWorst).toFixed(4) +
    "% (" + (masWorstId || "none") + ")");

  /* 6. Percentile bands ordered p10 ≤ p50 ≤ p90 (small MC run) */
  const mc = runMonteCarlo("SCN-BASE", null, 60, 7);
  const ordered = mc.yearBands.every(function (b) {
    return b.p10 <= b.p50 + 1e-9 && b.p50 <= b.p90 + 1e-9;
  });
  check("Monte Carlo bands are ordered (p10 ≤ p50 ≤ p90)", ordered);

  /* 7. Systemic correlation pushes cost-side up and savings-side down */
  const fixed = function (): number { return 0.5; };
  const pHi = sampleParams(effective, fixed, 1);
  const pLo = sampleParams(effective, fixed, -1);
  check("Correlated draws: z=+1 raises costs and cuts savings vs z=−1",
    pHi.utilIncrease > pLo.utilIncrease && pHi.drugPriceCut < pLo.drugPriceCut,
    "util " + pHi.utilIncrease.toFixed(1) + ">" + pLo.utilIncrease.toFixed(1) +
    ", drugcut " + pHi.drugPriceCut.toFixed(1) + "<" + pLo.drugPriceCut.toFixed(1));

  /* 8. Wage pass-through feedback lowers the new-revenue requirement */
  const pw0 = sampleParams(effective, null); pw0.wagePassThrough = 0;
  const pw9 = sampleParams(effective, null); pw9.wagePassThrough = 95;
  const d0 = runPath(pw0, {}).detail[2041 - START_YEAR];
  const d9 = runPath(pw9, {}).detail[2041 - START_YEAR];
  check("Wage pass-through: feedback = 28% of wage gain and reduces new revenue",
    d0.newRevenue > d9.newRevenue &&
    Math.abs(d9.taxFeedback - 0.28 * d9.wageGain) < 0.01 &&
    d0.wageGain === 0,
    "newRev " + d0.newRevenue.toFixed(0) + "→" + d9.newRevenue.toFixed(0));

  /* 9. Age-structure shares sum to 1 in both years */
  let s24 = 0, s41 = 0;
  AGE_STRUCTURE.bands.forEach(function (b) { s24 += b.share2024; s41 += b.share2041; });
  check("Age-structure shares sum to 1 (2024 and 2041)",
    Math.abs(s24 - 1) < 0.005 && Math.abs(s41 - 1) < 0.005,
    "s24=" + s24.toFixed(3) + " s41=" + s41.toFixed(3));

  return results;
}
