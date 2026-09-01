/* Shared types for the National Health Assurance model engine. */

export interface Triangular {
  low: number;
  mode: number;
  high: number;
}

/* R138 [§S11b]: one confidence vocabulary, and it is the FIVE-grade one.
 *
 * The recommendation reads the other way - it says `OUTCOME_STATS` "invents"
 * `medium-high` against `PARAM_DEFS`'s high/medium/low, and to pick one.
 * Measured before implementing: `research/parameter_baseline_seed.csv` grades
 * 85 rows on five levels, **19 of them on the two hyphenated grades**, and
 * `SOURCED_GRADES` in `baseline-registry.ts` already gates "medium or better"
 * against `['high', 'medium-high', 'medium']` at build time. So the hyphenated
 * grades are not an invention: they are the repo's established scale with a
 * build gate behind them, and `PARAM_DEFS`'s three are the narrow surface.
 *
 * Enforcing high/medium/low repo-wide would have re-graded nineteen sourced
 * seed rows - a substantive change to what the project claims about its own
 * evidence, dressed as a vocabulary cleanup. The scale is declared here
 * instead, ordered best to worst, and every surface is held to it.
 *
 * ORDER IS MEANINGFUL. `SOURCED_GRADES` is this list's first three, and a
 * self-test holds it to that rather than letting the two lists drift. */
export const CONFIDENCE_GRADES = [
  'high', 'medium-high', 'medium', 'low-medium', 'low'
] as const;

export type Confidence = typeof CONFIDENCE_GRADES[number];

/* Every surface that grades something reads its grade out of data - a CSV
   column, a generated catalog - so it arrives as `string`. These are the
   one place a string becomes a grade, which is what makes the scale
   enforceable rather than merely declared. */
export function isConfidence(g: string): g is Confidence {
  return (CONFIDENCE_GRADES as readonly string[]).includes(g);
}

export function isSourcedGrade(g: string): boolean {
  return isConfidence(g) && CONFIDENCE_GRADES.indexOf(g) < 3;
}

export interface ParamDef extends Triangular {
  id: string;
  group?: string;
  unit?: string;
  label?: string;
  confidence?: Confidence;
  source?: string;
  url?: string;
  adjustable?: boolean;
  sliderMin?: number;
  sliderMax?: number;
  /* R33 [§S6a]: set when the declared range does NOT contain the range this
     parameter's own research file recommends. The divergence may be entirely
     defensible - providerPaymentFactor's is - but it has to be visible, and
     it has to say which way it leans, because two divergences leaning
     opposite ways cancel in the headline and neither shows. */
  divergence?: ParamDivergence;
}

export interface ParamDivergence {
  recommended: string;
  leans: 'optimistic' | 'conservative';
  note: string;
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
  lowValuePool: number;
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
