/* =========================================================================
 * National Health Assurance Simulation — Model Engine
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
 * All internal dollars are REAL 2023 $B. Display conversion to 2024$ happens
 * in the UI layer via DEFLATOR_2023_TO_2024.
 *
 * Ported from docs/js/model.js (NHA.sampleParams, NHA.runPath, and their
 * private helpers). matureAtScale / runMonteCarlo / selfTest are ported in
 * a later task; do not add them here.
 * ========================================================================= */
import {
  BASE2023,
  RAMPS,
  PARAM_CORR,
  CORR_WEIGHT,
  START_YEAR,
  END_YEAR,
  PRE_YEARS,
} from './params';
import type { ScenarioStructural } from './scenarios';
import type { Triangular, SampledParams, PathResult, DetailRow } from './model-types';

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

interface BuiltRamps {
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
function buildRamps(structural: ScenarioStructural): BuiltRamps {
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
  const embedded = p.embeddedDrugSpend;
  const hospBase0 = B.hospital - 0.6 * embedded;
  const clinBase0 = B.physician + B.otherProf - 0.4 * embedded;
  const drugBase0 = B.rxRetail + embedded;
  const otherPhc0 = B.dental + B.otherPersonal + B.homeHealth + B.nursing +
                     B.dme + B.nondurables;
  const admin0 = B.netInsCost + B.govtAdmin;

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

    /* Expansions: demand-driven grow with G; program-based grow with wages */
    const cLtc   = p.ltcExpansion   * G  * expR;
    const cBh    = p.bhExpansion    * G  * expR;
    const cDvh   = p.dvhExpansion   * G  * expR;
    const cEmsPh = p.emsPhExpansion * G  * expR;
    const cUnits = p.unitsCost      * Gw * unitR;
    const cRd    = p.rdPublic       * Gw * infR;
    const cWf    = p.workforceEdu   * Gw * infR;
    const cItOp  = p.itOperating    * Gw * infR;
    const cExpansions = cLtc + cBh + cDvh + cEmsPh + cUnits + cRd + cWf + cItOp;

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

    /* Explicit offsets (each with one narrow scope; see header table) */
    const offProvAdmin  = (p.providerAdminSavings / 100) * (cHosp + cClin) * covR;
    const offCareModel  = p.careModelSavings * G * unitR;
    const offLowValue   = (p.lowValueCapture / 100) * 88 * G * infR;
    const offExtraction = p.extractionSavings * G * hospR;
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
    const wealthRevenue = p.wealthTaxPotential * (p.wealthCollectionEff / 100) * Ggdp;
    const householdRelief = 0.27 * nheBase * covR -
      (nheNha * (p.residualPrivateShare / 100) * 0.5); // half of residual is OOP

    out.years.push(year);
    out.baseline.push(nheBase);
    out.nha.push(nheNha);
    const row: DetailRow = {
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
    };
    out.detail.push(row);
  }
  return out;
}
