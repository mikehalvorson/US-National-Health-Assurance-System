/* Shared types for the National Health Assurance tax-financing model. */

/* ---- Params: one income group row (NHA.TAX.GROUPS entry) -----------------
 * Share columns (wageShare, capShare, consumpShare, healthRelief) each sum
 * to 1.0 across the full GROUPS array; see taxparams.ts for provenance. */
export interface TaxGroup {
  id: string;
  label: string;
  hhM: number;
  avgIncome: number;
  curRate: number;
  wageShare: number;
  capShare: number;
  consumpShare: number;
  healthRelief: number;
  /* Present only on the five top-1% bands. */
  g?: string;
}

/* ---- Params: economy-wide aggregates (NHA.TAX.ECON) ----------------------- */
export interface TaxEcon {
  wagesB: number;
  aboveCapShare: number;
  baseYear: number;
  growthRates: Record<string, number>;
}

/* ---- Params: one tax instrument (NHA.TAX.INSTRUMENTS entry) ---------------
 * incidence sums to 1.0 across GROUPS ids. kind 'scale' (slider, linear) or
 * 'toggle'. rev1x is $B/yr at default setting (scale=1), 2024 economy. */
export interface TaxInstrument {
  id: string;
  label: string;
  desc: string;
  kind: 'scale' | 'toggle';
  default: number | boolean;
  scaleMax?: number;
  rev1x: number;
  growth?: string;
  defaultNote?: string;
  incidence: Record<string, number>;
  phaseStart: number;
  phaseYears: number;
  source: string;
  confidence: string;
}

/* ---- Params: a funding program (NHA.TAX.PROGRAMS entry) ------------------- */
export interface TaxProgram {
  id: string;
  label: string;
  builtin: boolean;
  enabled: boolean;
  need: (year: number) => number;
  source: string;
  /* Present only on custom programs created via NHA.TAX.makeCustomProgram. */
  amountB?: number;
  start?: number;
  rampYears?: number;
}

/* ---- Params: one entry in the top marginal rate history (NHA.TAX.TOP_RATE_HISTORY) */
export interface TopRateHistoryEntry {
  y: number;
  r: number;
}

/* ---- Params: one presidency era label (NHA.TAX.PRESIDENTS) ---------------- */
export interface PresidentEntry {
  y: number;
  name: string;
}

/* ---- Params: one wealth-distribution band (NHA.TAX.WEALTH_DIST.groups) ---- */
export interface WealthDistGroup {
  id: string;
  label: string;
  hhM: number;
  wealthT: number;
}

/* ---- Params: NHA.TAX.WEALTH_DIST ------------------------------------------- */
export interface WealthDist {
  totalT: number;
  medianHH: number;
  groups: WealthDistGroup[];
}

/* ---- Params: per-instrument settings within a scenario (NHA.TAX.SCENARIOS[].settings) */
export interface ScenarioInstrumentSetting {
  value?: number;
  enabled?: boolean;
  /* Not set by any current SCENARIOS entry, but solveScenario() honors it
     (see docs/js/taxmodel.js) if a future scenario overrides phase-in. */
  phaseStart?: number;
}

/* ---- Params: a financing scenario (NHA.TAX.SCENARIOS entry) --------------
 * balancer names the instrument whose slider is solved automatically so
 * revenue covers the funding need; null on the unbalanced "custom" scenario. */
export interface TaxScenario {
  id: string;
  name: string;
  balancer?: string | null;
  desc: string;
  settings: Record<string, ScenarioInstrumentSetting>;
}

/* ---- Engine: one instrument's live setting within TaxSettings.instruments
 * (NHA.TAX.defaultSettings()'s per-id entry). value semantics: for 'scale'
 * instruments, a multiple of the default rev1x; for 'toggle', 0/1. ---------- */
export interface InstrumentSetting {
  value: number;
  enabled: boolean;
  phaseStart?: number;
  phaseYears?: number;
}

/* ---- Engine: the full settings object passed to compute/distribution -----
 * _balanced is set only by solveScenario, after it solves a balancer
 * instrument's scale. */
export interface TaxSettings {
  instruments: Record<string, InstrumentSetting>;
  _balanced?: { id: string; value: number; clamped: boolean };
}

/* ---- Engine: one row of distribution()'s per-group output ---------------- */
export interface DistributionRow {
  group: TaxGroup;
  taxB: number;
  reliefB: number;
  wageB: number;
  taxPerHH: number;
  reliefPerHH: number;
  wagePerHH: number;
  netPerHH: number;
  netPctIncome: number;
  taxPctIncome: number;
  curRate: number;
  newRate: number;
  avgIncomeNow: number;
}

/* ---- Engine: compute()'s full-horizon result ------------------------------
 * byInstrument maps instrument id -> revenue $B per year (parallel to years).
 * coverage is totalRev / need, or Infinity/1 when need is 0 (see source). */
export interface ComputeResult {
  years: number[];
  byInstrument: Record<string, number[]>;
  totalRev: number[];
  need: number[];
  coverage: number[];
}
