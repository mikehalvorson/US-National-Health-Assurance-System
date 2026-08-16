/* Point-of-care cost comparison data, ported verbatim from docs/js/care.js
   (CARE_SCENARIOS 20-111, moneyRange 162-165). "Today" figures are national
   averages/typical ranges; NHA is $0 at the point of care with the phase-in
   year noted. Fidelity-critical: do not re-derive any value. */

export interface CareAmount { lo: number; hi: number; note: string }
export interface CareNha { amount: number; fromYear: number; note: string }
export interface CareScenario {
  id: string;
  title: string;
  todayInsured: CareAmount;
  todayUninsured: CareAmount;
  nha: CareNha;
  source: string;
  confidence: string;
}

export function moneyRange(lo: number, hi: number): string {
  const m = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
  return lo === hi ? m(lo) : m(lo) + ' – ' + m(hi);
}

export const CARE_SCENARIOS: CareScenario[] = [
  {
    id: 'premium',
    title: 'Health insurance premiums (family, per year)',
    todayInsured: { lo: 6850, hi: 6850, note: "worker's share of a $26,993 employer family premium" },
    todayUninsured: { lo: 0, hi: 0, note: 'no premium, and no coverage' },
    /* fromYear tracks the coverage ramp's first migrating year, which the
       realignment of that ramp moved from 2031 to 2030. The card's own note
       already said Years 4-8, and Year 4 is 2030, so the number now agrees
       with the sentence beside it. Pinned by a self-test. */
    nha: { amount: 0, fromYear: 2030, note: 'no premiums once your coverage wave migrates (Years 4–8); employers pay a payroll contribution instead' },
    source: 'KFF Employer Health Benefits Survey 2025',
    confidence: 'high'
  },
  {
    id: 'er',
    title: 'Emergency room visit',
    todayInsured: { lo: 150, hi: 1500, note: 'copay + deductible/coinsurance, plan-dependent' },
    todayUninsured: { lo: 1500, hi: 4000, note: 'billed charges; average total cost ≈ $2,453' },
    nha: { amount: 0, fromYear: 2034, note: 'covered in full; existing cost-sharing continues until Phase 6 elimination' },
    source: 'CDC NHAMCS (average ED visit cost); insured range is plan-dependent',
    confidence: 'medium'
  },
  {
    id: 'childbirth',
    title: 'Having a baby (full episode: pregnancy, delivery, postpartum)',
    todayInsured: { lo: 2000, hi: 4000, note: 'average insured out-of-pocket ≈ $2,854' },
    todayUninsured: { lo: 15000, hi: 30000, note: 'average total episode cost ≈ $18,865' },
    nha: { amount: 0, fromYear: 2034, note: 'covered in full, including prenatal and postpartum care' },
    source: 'Peterson–KFF Health System Tracker (2022 analysis of large-employer claims)',
    confidence: 'medium'
  },
  {
    id: 'insulin',
    title: 'Insulin, one month (diabetes)',
    todayInsured: { lo: 35, hi: 100, note: '$35/mo caps now apply in Medicare & many plans' },
    todayUninsured: { lo: 70, hi: 300, note: 'cash price after 2023–24 list-price cuts; production cost is $2–6/vial' },
    nha: { amount: 0, fromYear: 2029, note: '$0 for at least 98% of essential formulary fills; arrives early, with the Phase 2 pharmacy utility' },
    source: 'Yale/BMJ Global Health production-cost study; Civica Rx $30/vial nonprofit price; ADA/manufacturer cap programs',
    confidence: 'medium'
  },
  {
    id: 'mri',
    title: 'MRI scan',
    todayInsured: { lo: 300, hi: 1100, note: 'typically hits the deductible; commercial average price ≈ $1,959' },
    todayUninsured: { lo: 1000, hi: 3000, note: 'billed charges vary several-fold by site' },
    nha: { amount: 0, fromYear: 2034, note: 'covered when clinically indicated; diagnostic-first pathways' },
    source: 'Health Care Cost Institute (commercial price data)',
    confidence: 'medium'
  },
  {
    id: 'ambulance',
    title: 'Ground ambulance ride',
    todayInsured: { lo: 450, hi: 1300, note: 'ground ambulance is not protected by the No Surprises Act, so balance billing is common' },
    todayUninsured: { lo: 1300, hi: 3000, note: 'mean cost per transport ≈ $2,673' },
    nha: { amount: 0, fromYear: 2034, note: 'EMS becomes a readiness-funded public service' },
    source: 'Federal Ground Ambulance Data Collection System (GADCS)',
    confidence: 'high'
  },
  {
    id: 'labs',
    title: 'Routine blood work (metabolic panel + CBC)',
    todayInsured: { lo: 0, hi: 60, note: 'often free preventive; billed if diagnostic' },
    todayUninsured: { lo: 37, hi: 100, note: 'billed charges run 5–6× the Medicare rate ($8–10)' },
    nha: { amount: 0, fromYear: 2034, note: 'included in unit-network and primary-care visits' },
    source: 'CMS Clinical Lab Fee Schedule vs. billed-charge studies',
    confidence: 'medium'
  },
  {
    id: 'therapy',
    title: 'Therapy session (mental health)',
    todayInsured: { lo: 20, hi: 75, note: 'in-network copay, when an in-network therapist can be found' },
    todayUninsured: { lo: 100, hi: 200, note: 'typical cash price per session' },
    nha: { amount: 0, fromYear: 2034, note: 'covered; behavioral-health expansion (48-hour first-contact standard) completes Years 10–12' },
    source: 'SAMHSA spending data; typical market rates (plan- and market-dependent)',
    confidence: 'low'
  },
  {
    id: 'hearing',
    title: 'Hearing aids (pair)',
    todayInsured: { lo: 2000, hi: 8000, note: 'rarely covered today; most people pay full price, averaging about $4,672' },
    todayUninsured: { lo: 2000, hi: 8000, note: 'the same; this is an uncovered market for nearly everyone' },
    nha: { amount: 0, fromYear: 2036, note: 'standard devices covered under the dental/vision/hearing expansion (Phase 7)' },
    source: 'Hearing Industries Association pricing data',
    confidence: 'high'
  },
  {
    id: 'nursing',
    title: 'Nursing home care (one year)',
    todayInsured: { lo: 111000, hi: 128000, note: "Medicare doesn't cover it; Medicaid only after spending down your assets" },
    todayUninsured: { lo: 111000, hi: 128000, note: 'private-pay national average' },
    nha: { amount: 0, fromYear: 2036, note: 'covered under the universal long-term-care benefit (home-first; institutional when needed), Phase 7–8' },
    source: 'Genworth/CareScout Cost of Care Survey 2024–25',
    confidence: 'high'
  }
];

export interface HouseholdProfile {
  id: string;
  label: string;
  premium: CareAmount;
  oop: CareAmount;
  confidence: string;
}

/* docs/js/care.js:120 - Census 2024, millions of U.S. households */
export const HOUSEHOLDS_M = 132.2;

/* docs/js/care.js:122-151 (verbatim) */
export const HOUSEHOLD_PROFILES: HouseholdProfile[] = [
  {
    id: 'emp-family',
    label: 'Family with employer coverage',
    premium: { lo: 6850, hi: 6850, note: 'worker share of family premium (KFF 2025)' },
    oop: { lo: 2500, hi: 5500, note: 'deductibles, copays, coinsurance; household average is about $3,825 (derived from CMS)' },
    confidence: 'medium'
  },
  {
    id: 'emp-single',
    label: 'Single person with employer coverage',
    premium: { lo: 1492, hi: 1492, note: 'worker share (~16%) of a $9,325 single premium (KFF 2025)' },
    oop: { lo: 800, hi: 2500, note: 'per-person average ≈ $1,514 (derived from CMS)' },
    confidence: 'medium'
  },
  {
    id: 'marketplace',
    label: 'Family buying marketplace coverage',
    premium: { lo: 6000, hi: 18000, note: 'varies enormously with age, state, and subsidy eligibility; enhanced subsidies expired in 2026' },
    oop: { lo: 3000, hi: 9000, note: 'marketplace deductibles are typically much higher than employer plans' },
    confidence: 'low'
  },
  {
    id: 'uninsured',
    label: 'Uninsured adult',
    premium: { lo: 0, hi: 0, note: 'no premium, no protection' },
    oop: { lo: 500, hi: 5000, note: 'averages hide the real risk: one hospitalization can mean five-figure debt' },
    confidence: 'low'
  }
];
