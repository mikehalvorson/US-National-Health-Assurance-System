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

/* R146 [§S18]: the law an instrument's revenue estimate was computed
   against, with what each word means. `post-obbba` is the value a re-based
   instrument takes, which is the row's first remedy; none has one yet. */
export const SCORED_AGAINST = {
  'pre-obbba': 'computed against federal law before the July 4, 2025 reconciliation act changed it',
  'post-obbba': 'computed against federal law as the July 4, 2025 reconciliation act left it',
  unscored: 'no estimate outside the plan, so no law it was computed against'
} as const;
export type ScoredAgainst = keyof typeof SCORED_AGAINST;

/* Review of the content run: who made the estimate. The progressive surtax
   was counted among "fifteen externally scored instruments", and the Tax
   tile called its revenue a score; it is this model's own calculation, which
   a published score only cross-checks. */
export const ESTIMATED_BY = {
  published: 'a published score or estimate (CBO, JCT, Treasury, TPC or a cited study), used as published or scaled per unit',
  model: 'this model\'s own calculation; a published score only cross-checks it',
  plan: 'the plan\'s own figure'
} as const;
export type EstimatedBy = keyof typeof ESTIMATED_BY;

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
  /* R146 [§S18]: the law the estimate was computed against. Every estimate
     in the menu but the plan's own rent levy predates the July 4, 2025
     reconciliation act, which changed the estate exemption, expensing, the
     international regime and the individual rates many were computed
     against. `scoreBasis` names the publication the declaration rests on
     and ends with its date in parentheses, "(Month YYYY)" or "(YYYY)",
     which a test holds the declaration to. */
  scoredAgainst: ScoredAgainst;
  scoreBasis: string;
  estimatedBy: EstimatedBy;
  /* R39 + R208 [§S5]: a balancer absorbs the package's residual gap, so it
     carries the package's residual risk and has to say how much. `revBand`
     where the evidence supports one, `revBandAbsent` where it does not - a
     declared reason rather than a silent blank, the §S4 pattern. */
  revBand?: { low: number; high: number; basis: string };
  revBandAbsent?: string;
  /* Owner, 2026-10-19: instruments that are alternatives to each other (one
     replaces the tax the other strengthens) share a group, and at most one
     of a group may be on. compute() refuses a settings state with two. */
  exclusiveGroup?: string;
  /* Owner, 2026-10-12: a payroll instrument's rate at its default setting
     and the earnings it taxes, so its score can be held to what that rate
     could raise on ECON's earnings base (`payrollYieldFaults()` in
     taxmodel.ts). 'all' is every dollar of earnings; 'above-cap' is the
     share of covered earnings above the Social Security cap. */
  payrollBase?: { rate: number; earnings: 'all' | 'above-cap' };
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
  /* R48 [§S5]: null where there is nothing to cover - need is 0 and revenue
     is positive, so the ratio is undefined rather than infinite. */
  coverage: (number | null)[];
  /* R42 [§S5]: revenue removed by the top-0.1% overlap deduction, per year.
     byInstrument is already net of it; this is what was taken out, so the
     page can state the adjustment where the instruments are summed. */
  overlapDeduction: number[];
  /* R146 [§S18]: revenue, net of the overlap, from instruments whose
     estimates were computed against federal law the July 4, 2025
     reconciliation act has since changed; and the part of it this model
     computed itself rather than took from a published score */
  supersededRev: number[];
  supersededModelRev: number[];
}
