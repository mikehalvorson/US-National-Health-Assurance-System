/* Shared types for the National Health Assurance model engine. */

export interface Triangular {
  low: number;
  mode: number;
  high: number;
}

export interface ParamDef extends Triangular {
  id: string;
  group?: string;
  unit?: string;
  label?: string;
  confidence?: 'high' | 'medium' | 'low';
  source?: string;
  url?: string;
  adjustable?: boolean;
  sliderMin?: number;
  sliderMax?: number;
}

/* ---- Engine: sampled parameters ------------------------------------------
 * The object shape NHA.sampleParams returns: one numeric value per
 * PARAM_DEFS id (mode-only when rand === null, else a triangular draw,
 * optionally correlation-shifted by z). Every field below is mutable
 * because the self-tests (and the ported model.test.ts invariants) assign
 * directly onto a sampled instance to build neutral/edge-case scenarios. */
export interface SampledParams {
  baselineRealGrowth: number;
  gdpRealGrowth: number;
  popGrowth: number;
  utilIncrease: number;
  coverageDemandShare: number;
  providerPaymentFactor: number;
  drugPriceCut: number;
  embeddedDrugSpend: number;
  publicAdminRate: number;
  legacyAdminFloor: number;
  providerAdminSavings: number;
  governanceRate: number;
  careModelSavings: number;
  lowValueCapture: number;
  extractionSavings: number;
  ltcExpansion: number;
  ltcWageFloor: number;
  bhExpansion: number;
  dvhExpansion: number;
  emsPhExpansion: number;
  unitsCost: number;
  rdPublic: number;
  workforceEdu: number;
  itOperating: number;
  itCapital: number;
  transitionTotal: number;
  residualPrivateShare: number;
  employerCapture: number;
  wagePassThrough: number;
  wealthTaxPotential: number;
  wealthCollectionEff: number;
  /* Allow indexing by param id (the source builds this object generically
   * from PARAM_DEFS ids, so any id not enumerated above must still be
   * assignable/readable without widening every consumer to `any`). */
  [id: string]: number;
}

/* ---- Engine: one calendar year's detail row (NHA.runPath output row) ----- */
export interface DetailRow {
  year: number;
  gdp: number;
  pop: number;
  cHosp: number;
  cClin: number;
  cDrugs: number;
  cOtherPhc: number;
  cLtc: number;
  cLtcAides: number;
  cBh: number;
  cDvh: number;
  cEmsPh: number;
  cUnits: number;
  cRd: number;
  cWf: number;
  cItOp: number;
  legacyAdmin: number;
  newAdmin: number;
  govCost: number;
  cPubHealth: number;
  cInvest: number;
  trans: number;
  itcap: number;
  shock: number;
  offProvAdmin: number;
  offCareModel: number;
  offLowValue: number;
  offExtraction: number;
  nheBase: number;
  nheNha: number;
  pubCost: number;
  fedRedirect: number;
  stateMoe: number;
  empContrib: number;
  newRevenue: number;
  /* R23 [§S5]: `householdRelief` is deliberately unclamped - a negative
     value in the pre-coverage years is a true statement - so it reports its
     sign rather than hiding it. `newRevenue`'s clamp was removed: it could
     not fire anywhere in the declared parameter space. */
  householdReliefNegative: boolean;
  wealthRevenue: number;
  householdRelief: number;
  wageGain: number;
  taxFeedback: number;
  pubShare: number;
}

/* ---- Engine: NHA.runPath return value ------------------------------------ */
export interface PathResult {
  years: number[];
  baseline: number[];
  nha: number[];
  detail: DetailRow[];
}

/* ---- Engine: NHA.matureAtScale return value ------------------------------- */
export interface MatureAtScaleResult {
  nheNha: number;
  nheBase: number;
}

/* ---- Engine: a Monte Carlo percentile band (p10/p50/p90) ------------------ */
export interface PercentileBand {
  p10: number;
  p50: number;
  p90: number;
}

/* ---- Engine: NHA.runMonteCarlo's steady-state distribution bundle -------- */
export interface MonteCarloSteady {
  total: PercentileBand;
  newRevenue: PercentileBand;
  perCapita: PercentileBand;
  gdpPct: PercentileBand;
  fedIncrease: PercentileBand;
  matureToday: PercentileBand;
}

/* ---- Engine: NHA.runMonteCarlo return value ------------------------------- */
export interface MonteCarloResult {
  scenarioId: string;
  nRuns: number;
  years: number[];
  baseline: number[];
  yearBands: PercentileBand[];
  modePath: PathResult;
  modeParams: SampledParams;
  steady: MonteCarloSteady;
  nhe2030delta: PercentileBand;
  tenYearFedIncAnnualized: PercentileBand;
}

/* ---- Engine: NHA.selfTest's per-check result ------------------------------ */
export interface SelfTestResult {
  name: string;
  ok: boolean;
  note: string;
}
