/* Workforce data + planning constants, ported verbatim from docs/js/workforce.js
   (constants 11-15, SCENARIOS 17-39, LEGACY 41-97, CREATED 99-163,
   ACRONYMS 165-183). Fidelity-critical: do not re-derive. Values are in
   thousands of jobs unless noted. The LTC direct-care block at the bottom is
   new (long-term care aides) and is kept OUTSIDE the insurance-transition
   ledger above, whose entrant-pace math must not absorb millions of aides. */
import { PARAMS_BY_ID, DEFLATOR_2023_TO_2024 } from './params';

export type ScenarioId = 'low' | 'plan' | 'high';

export interface Scenario {
  label: string;
  eliminated: number;
  inside: number;
  supported: number;
  created: number;
}

export interface LegacyItem {
  id: string;
  name: string;
  values: Record<ScenarioId, number>;
  inside: Record<ScenarioId, number>;
  reason: string;
  destinations: string;
  boundary: string;
  evidence: string;
  continues: string;
}

export interface CreatedItem {
  id: string;
  name: string;
  values: Record<ScenarioId, number>;
  fills: Record<ScenarioId, number>;
  derivation: string;
  roles: string;
  confidence: string;
}

export const ROLLOUT_YEARS = 12;
export const TOTAL_US_EMPLOYMENT_2024 = 169956100;
export const ANNUAL_TRAINING_TARGET = 55000;
export const DIRECT_PATIENT_CARE_PHYSICIANS = 866460;
export const PRIOR_AUTH_HOURS_PER_WEEK = 13;

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  low: {
    label: "Lower exposure",
    eliminated: 560,
    inside: 270,
    supported: 420,
    created: 390
  },
  plan: {
    label: "Planning case",
    eliminated: 760,
    inside: 360,
    supported: 570,
    created: 510
  },
  high: {
    label: "Stress case",
    eliminated: 1000,
    inside: 460,
    supported: 750,
    created: 650
  }
};

export const LEGACY: LegacyItem[] = [
  {
    id: "insurer",
    name: "Private insurer claims, enrollment, and network administration",
    values: { low: 225, plan: 305, high: 400 },
    inside: { low: 130, plan: 170, high: 220 },
    reason: "One public coverage and payment architecture removes duplicated plan enrollment, network, utilization, and claims operations. Functions needed for payment integrity and service continuity remain.",
    destinations: "Public enrollment and eligibility, payment operations, provider reconciliation, patient navigation, appeals support, fraud control, and transition-wave operations.",
    boundary: "The 611,100-job BLS direct-health-insurer industry is the anchor. The model applies functional exposure shares; it does not assume every insurer employee disappears.",
    evidence: "Planning exposure: 50% of the BLS industry anchor, rounded. Confidence: Medium because the public system keeps many payment, integrity, and service functions but removes payer duplication.",
    continues: "Provider payment, reconciliation, program integrity, complex-case review, enrollment correction, appeals, navigation, and continuity operations."
  },
  {
    id: "provider",
    name: "Provider billing, prior authorization, and revenue-cycle administration",
    values: { low: 170, plan: 235, high: 310 },
    inside: { low: 80, plan: 110, high: 145 },
    reason: "Zero point-of-care billing, standardized public payment, global hospital budgets, and removal of routine insurer prior authorization sharply reduce collection, coding-for-payment, denial, and appeal work.",
    destinations: "Care navigation, referral-packet completion, data quality, records correction, care coordination, provider-payment reconciliation, and patient-rights support.",
    boundary: "BLS counted 417,500 billing and posting clerks across all industries in May 2024. The model uses only a health-function share and keeps medical-records work out of the eliminated total.",
    evidence: "Planning exposure: 56% of the broad BLS occupation anchor, rounded. Confidence: Medium. The AMA's prior-authorization survey supports a large burden, but its 13 weekly hours measure physician and staff time, not a separate job count.",
    continues: "Clinical records, care coding, quality reporting, payment reconciliation, unusual-case review, referral completion, and patient-rights work."
  },
  {
    id: "pbm",
    name: "PBM rebate, formulary, spread-pricing, and purchasing middlemen",
    values: { low: 60, plan: 90, high: 120 },
    inside: { low: 25, plan: 40, high: 55 },
    reason: "A public pharmacy claims utility, national purchasing, transparent formulary rules, and public production remove rebate negotiation, spread pricing, and duplicative benefit management.",
    destinations: "Public medicines procurement, formulary evidence, pharmacy onboarding, inventory visibility, shortage response, quality release, and supply-chain operations.",
    boundary: "No official occupation table isolates PBM employment. This is a scenario slice of broader insurance-related and pharmacy-administration work, not a measured PBM headcount.",
    evidence: "Planning exposure: 24% of a 382,600-job other-insurance-related anchor. Confidence: Low. The FTC reports that the six largest PBMs manage nearly 95% of U.S. prescriptions, establishing concentration and functional reach, not employment.",
    continues: "Pharmacy claims, formulary evidence, utilization safety, procurement, quality release, inventory visibility, specialty-drug handling, and shortage response."
  },
  {
    id: "broker",
    name: "Health-benefit brokerage and employer plan administration",
    values: { low: 55, plan: 70, high: 90 },
    inside: { low: 20, plan: 22, high: 22 },
    reason: "Automatic public coverage removes annual plan shopping, benefit design, carrier bidding, and much of employer enrollment administration.",
    destinations: "Employer/payroll conversion, wage-pass-through compliance, outreach, eligibility support, service navigation, and transition communications.",
    boundary: "The BLS insurance-brokerage industry includes many non-health lines. The model applies a small health-benefit exposure share and does not count the whole industry.",
    evidence: "Planning exposure: 7% of the 1,003,900-job insurance-brokerage industry anchor. Confidence: Low because BLS does not isolate health-benefit brokerage or employer benefits staff.",
    continues: "Temporary payroll conversion, wage-pass-through compliance, worker outreach, eligibility correction, service navigation, and supplemental non-health advice."
  },
  {
    id: "vendor",
    name: "Duplicative clearinghouse, contractor, and vendor-management work",
    values: { low: 50, plan: 60, high: 80 },
    inside: { low: 15, plan: 18, high: 18 },
    reason: "Common interfaces, public rails, portable records, source-code escrow, and fewer payer-specific contracts reduce redundant transaction routing and contract administration.",
    destinations: "Cybersecurity, conformance testing, configuration control, procurement, audit, vendor exit, continuity, and public reporting.",
    boundary: "This category is a residual planning allowance. It is kept separate and low-confidence because national vendor employment overlaps other industry and occupation counts.",
    evidence: "Planning allowance: 60,000. Confidence: Low. No non-overlapping national series separates payer-specific clearinghouse and contractor work from insurance, technology, and consulting employment.",
    continues: "Interoperability, cybersecurity, procurement, audit, configuration control, uptime, data exchange, vendor exit, and disaster recovery."
  }
];

export const CREATED: CreatedItem[] = [
  {
    id: "units",
    name: "Diagnostic-treatment unit teams",
    values: { low: 112, plan: 138, high: 175 },
    fills: { low: 40, plan: 30, high: 45 },
    derivation: "Planning case: the 15,000-unit specification multiplied by the existing unit model's 9.2-FTE mix-weighted average, rounded. The high case moves toward the need-based 24,099-unit allocation but assumes substantial conversion of existing sites.",
    roles: "Nurses, NPs/PAs, physicians, technicians, imaging/lab staff, behavioral-health staff, community health workers, navigators, and unit operations.",
    confidence: "Medium-Low"
  },
  {
    id: "public",
    name: "Public enrollment, payment, rights, and transition operations",
    values: { low: 145, plan: 180, high: 220 },
    fills: { low: 130, plan: 180, high: 220 },
    derivation: "Retains the necessary share of today's enrollment, claims/payment, provider reconciliation, appeals, navigation, employer conversion, and continuity workload while removing duplicated payer-specific work.",
    roles: "Eligibility, payment operations, provider support, appeals casework, navigation, ombuds services, employer/payroll conversion, and legacy wind-down.",
    confidence: "Medium-Low"
  },
  {
    id: "data",
    name: "Data, cyber, records, analytics, and conformance",
    values: { low: 50, plan: 70, high: 90 },
    fills: { low: 45, plan: 70, high: 90 },
    derivation: "A national data mesh, protected audit feeds, identity services, records migration, interoperability testing, cybersecurity operations, and offline continuity require durable technical and operational teams.",
    roles: "Data quality, privacy, security operations, engineering, records correction, identity, analytics, audit evidence, conformance, and incident recovery.",
    confidence: "Low"
  },
  {
    id: "medicines",
    name: "Medicines, diagnostics, procurement, and supply operations",
    values: { low: 30, plan: 40, high: 55 },
    fills: { low: 30, plan: 40, high: 55 },
    derivation: "A planning allowance for the Public Medicines Corporation, national purchasing, pharmacy utility, diagnostic/device procurement, batch quality, inventory visibility, and shortage response. Exact plant and product-family staffing remains uncalibrated.",
    roles: "Procurement, pharmacy operations, manufacturing support, quality, logistics, inventory, shortage response, supplier assurance, and diagnostics.",
    confidence: "Low"
  },
  {
    id: "rural",
    name: "Rural flex and rotating travel workforce",
    values: { low: 20, plan: 30, high: 45 },
    fills: { low: 0, plan: 0, high: 0 },
    derivation: "A derived regional relief pool for vacancy coverage, protected leave, training backfill, seasonal demand, and surge. The adopted role-region safe-FTE formula must replace this national placeholder.",
    roles: "Travel nurses, paramedics, respiratory therapists, imaging/lab technicians, pharmacists, behavioral-health clinicians, and short-term supervisory support.",
    confidence: "Low"
  },
  {
    id: "education",
    name: "Education, faculty, and training support",
    values: { low: 8, plan: 11, high: 15 },
    fills: { low: 0, plan: 0, high: 0 },
    derivation: "Planning case: one faculty, preceptor, placement, or program-support FTE for roughly every five of the plan's 55,000 annual publicly funded training slots.",
    roles: "Faculty, preceptors, simulation staff, program operations, rural placement, credential support, learner services, and continuing education.",
    confidence: "Low"
  },
  {
    id: "assurance",
    name: "Regional operations, assurance, and public-health support",
    values: { low: 25, plan: 41, high: 50 },
    fills: { low: 25, plan: 40, high: 50 },
    derivation: "A planning allowance for role-region workforce boards, scope and compensation operations, independent verification, safety and equity review, regional coordination, and workforce performance reporting.",
    roles: "Workforce planning, compensation and scope administration, verification, audit, safety, equity, regional coordination, public reporting, and corrective action.",
    confidence: "Low"
  }
];

/* ---- Long-term care direct-care workforce -------------------------------
   The home-first LTC benefit is delivered by aides (home care, residential,
   nursing assistants), not by the clinical or administrative roles counted
   above. This is the benefit's binding workforce constraint. Figures in
   millions of workers unless noted; sourced in
   research/long_term_care_methodology.md (PHI 2024, BLS). */
export const LTC_WORKFORCE = {
  currentDirectCareM: 5.4,   // total direct-care workers, 2024 (PHI)
  homeCareM: 3.2,            // home-care share of that total, 2024 (PHI)
  openings2034M: 9.7,        // total direct-care job openings 2024-2034 (PHI)
  medianWageNow: 17.36,      // $/hr median, 2024 (PHI)
  wageFloorTarget: 22.00,    // $/hr living-wage floor (plan design)
  homeTurnoverPct: 75,       // home-care annual turnover, % (PHI)
  coveredFteM: 5.0,          // covered direct-care FTE at maturity (planning)
  hoursPerFteYear: 2080,     // full-time-equivalent hours
  loadedUpliftPerHour: 5.00  // loaded $/hr lift toward the floor (incl. benefits allowance)
};

/* Net-new aide compensation cost. Derived here from LTC_WORKFORCE and carried
   in the fiscal model as params.ltcWageFloor, so the workforce tab and the
   healthcare-tab cost model share ONE number and can never drift. The derived
   2023-scale figure must equal params.ltcWageFloor.mode (asserted in tests). */
export function ltcWageFloorCost(): {
  derived2023B: number; low2024B: number; mode2024B: number; high2024B: number;
} {
  const w = LTC_WORKFORCE;
  const derived2023B = Math.round(
    (w.coveredFteM * 1e6 * w.hoursPerFteYear * w.loadedUpliftPerHour) / 1e9);
  const p = PARAMS_BY_ID['ltcWageFloor'];
  return {
    derived2023B: derived2023B,
    low2024B: Math.round(p.low * DEFLATOR_2023_TO_2024),
    mode2024B: Math.round(p.mode * DEFLATOR_2023_TO_2024),
    high2024B: Math.round(p.high * DEFLATOR_2023_TO_2024)
  };
}

export const ACRONYMS: Record<string, string> = {
  "AHWCS": "Administration for Health Workforce, Compensation, and Scope",
  "NHWB": "National Health Workforce Board",
  "NPCB": "National Physician Compensation Board",
  "NCSWB": "National Clinical Scope and Workforce Board",
  "NHWECA": "National Health Workforce Education and Capacity Authority",
  "RS-CORPS": "Rural Service Corps",
  "HATC": "Health Administration Transition Corps",
  "HTIP": "Health Talent Immigration Pathway",
  "NHTIB": "National Health Talent Immigration Board",
  "HCRB": "Health Credential Recognition Board",
  "HPSA": "Health Professional Shortage Area",
  "MUA": "Medically Underserved Area",
  "IMG": "International Medical Graduate",
  "IEN": "Internationally Educated Nurse",
  "WHO": "World Health Organization",
  "BLS": "Bureau of Labor Statistics",
  "PBM": "Pharmacy Benefit Manager",
  "FTE": "Full-Time Equivalent",
  "RN": "Registered Nurse",
  "LPN": "Licensed Practical Nurse",
  "EMS": "Emergency Medical Services",
  "LTC": "Long-Term Care",
  "LTSS": "Long-Term Services and Supports",
  "HCBS": "Home and Community-Based Services",
  "DVH": "Dental, Vision, and Hearing",
  "AI": "Artificial Intelligence",
  "ICU": "Intensive Care Unit"
};
