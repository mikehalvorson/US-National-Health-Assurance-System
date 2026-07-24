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
  realGrowth: number;
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
