/* Long-Term Care tab data. Every figure is sourced in
   research/long_term_care_methodology.md with a confidence grade. The net-new
   LTC benefit cost is the single source of truth in params.ts (ltcExpansion);
   this module re-reads it so the tab and the fiscal model can never drift. */
import { PARAMS_BY_ID, DEFLATOR_2023_TO_2024 } from './params';

export type Conf = 'high' | 'medium' | 'low';

/* ---- What today's benefit costs a family, and the country as a whole ---- */
export interface CostStat {
  value: string;
  label: string;
  note: string;
  confidence: Conf;
}

export const US_FAILURE_STATS: CostStat[] = [
  { value: '$415B', label: 'spent on long-term care in 2022, and it still leaves most families exposed',
    note: 'Medicaid paid 61%, out-of-pocket 17%; $284B went to home and community care, $131B to nursing facilities.',
    confidence: 'high' },
  { value: '$127,750', label: 'median cost of one year in a private nursing-home room, 2024',
    note: 'In-home care with a home health aide ran $77,792 a year; assisted living was in the low-to-mid $60,000s.',
    confidence: 'high' },
  { value: '70%', label: 'of people who reach 65 will need long-term care before they die',
    note: 'Women need it 3.7 years on average, men 2.2 years; about one in seven spends over two years in a nursing home.',
    confidence: 'high' },
  { value: '~711,000', label: 'people stuck on Medicaid waiting lists for home and community care in 2024',
    note: 'The average wait was about 40 months. The waiting list is the visible edge of far larger unmet need.',
    confidence: 'high' },
  { value: '$600B', label: 'unpaid care that 38 million family members provided in one year',
    note: 'About 36 billion hours, worth more than all U.S. out-of-pocket health spending that year (AARP, 2021 value).',
    confidence: 'high' },
  { value: '$17.36/hr', label: 'median wage for the aides who do the work, in 2024',
    note: 'Median annual earnings under $26,000; home-care turnover ran near 75%, so continuity of care collapses.',
    confidence: 'high' }
];

/* Why Medicare does not solve this, in one place. */
export const MEDICARE_GAP = {
  headline: 'Medicare does not pay for long-term custodial care',
  body: 'Medicare covers up to 100 days of skilled care after a qualifying ' +
    'hospital stay, then stops. Ongoing help with bathing, dressing, eating, ' +
    'and supervision is not a Medicare benefit. Families discover this at the ' +
    'worst possible moment, then spend down to about $2,000 in assets to ' +
    'qualify for Medicaid, the only public program that pays.',
  confidence: 'high' as Conf
};

/* ---- Long-term care spending, % of GDP, 2021 (OECD). % GDP is used on
   purpose: it compares effort across economies without crossing dollar
   scales. ---- */
export interface GdpBar {
  country: string;
  pct: number;
  kind: 'insurance' | 'tax' | 'us';
  confidence: Conf;
  note: string;
}

export const LTC_GDP_2021: GdpBar[] = [
  { country: 'Netherlands', pct: 4.4, kind: 'insurance', confidence: 'high',
    note: 'Universal insurance for intensive care, municipal social support, insured district nursing.' },
  { country: 'Norway', pct: 3.5, kind: 'tax', confidence: 'high',
    note: 'Tax-funded municipal care.' },
  { country: 'Sweden', pct: 3.4, kind: 'tax', confidence: 'high',
    note: 'Tax-funded municipal care under the Social Services Act.' },
  { country: 'Denmark', pct: 3.2, kind: 'tax', confidence: 'high',
    note: 'Tax-funded, reablement-first, mandatory preventive home visits.' },
  { country: 'Japan', pct: 2.0, kind: 'insurance', confidence: 'high',
    note: 'Mandatory insurance from age 40; home and community-based tilt.' },
  { country: 'Germany', pct: 2.1, kind: 'insurance', confidence: 'medium',
    note: 'Statutory insurance since 1995; cash option for family caregivers.' },
  { country: 'OECD average', pct: 1.8, kind: 'tax', confidence: 'high',
    note: 'Average across OECD countries in 2021.' },
  { country: 'United States (public)', pct: 1.0, kind: 'us', confidence: 'medium',
    note: 'Public spending only; excludes the roughly $600B in unpaid family care and understates need rationed away by waiting lists and spend-down.' }
];

/* ---- The systems that work ---- */
export interface CountrySystem {
  country: string;
  system: string;
  since: string;
  funding: string;
  design: string;
  why: string;
  confidence: Conf;
}

export const COUNTRY_SYSTEMS: CountrySystem[] = [
  {
    country: 'Germany',
    system: 'Statutory long-term care insurance (Pflegeversicherung)',
    since: '1995',
    funding: 'Mandatory payroll contribution, about 3.4% of wages in 2024, shared by employer and employee, with a surcharge for childless adults. Attached to health insurance, so everyone is covered automatically.',
    design: 'Graded benefits across five care levels. Distinctively, families can take a cash allowance and care for their own relative, blend it with professional services, or use services in full. The benefit is deliberately partial: it caps the public share rather than paying every bill.',
    why: 'Coverage is universal and portable, the contribution is small and predictable, and paying family caregivers keeps people at home and keeps the program popular. It ended the era of long-term care as a private catastrophe.',
    confidence: 'high'
  },
  {
    country: 'Japan',
    system: 'Long-term care insurance (Kaigo Hoken)',
    since: '2000',
    funding: 'Roughly half from premiums that everyone pays from age 40, half from taxes. Users pay a 10% copay, rising to 20-30% at higher incomes.',
    design: 'Municipal governments certify each person\'s level of need; care managers coordinate services; the whole design tilts toward home and community-based care over institutions.',
    why: 'It brought care that had fallen entirely on daughters and wives into a shared public system, relieved a national caregiving crisis, and built standing community infrastructure. Costs rise with an aging society, but the entitlement is secure and used at scale.',
    confidence: 'high'
  },
  {
    country: 'Netherlands',
    system: 'Long-term care act (Wlz) plus the Buurtzorg home-care model',
    since: '1968 (reformed 2015)',
    funding: 'Income-related national contributions. One of the highest long-term care spenders in the OECD at about 4.4% of GDP.',
    design: 'A universal entitlement for intensive round-the-clock care, with lighter needs handled by municipalities and insured district nursing. Home care runs on small self-managing nursing teams (Buurtzorg): about ten nurses cover a neighborhood of 10,000 with almost no managers.',
    why: 'Self-managing neighborhood teams produce fewer hospitalizations, fewer institutional placements, and the highest patient and staff satisfaction, at lower cost per client. It shows generosity and efficiency are not opposites.',
    confidence: 'high'
  },
  {
    country: 'Denmark and the Nordics',
    system: 'Tax-funded municipal elder care, reablement-first',
    since: 'Long-standing; reablement required since 2015',
    funding: 'General taxation, no separate insurance. Nordic public long-term care spending is the highest in the OECD (Denmark 3.2%, Sweden 3.4%, Norway 3.5% of GDP).',
    design: 'Care is local and universal. Denmark pioneered reablement: short, goal-oriented rehabilitation so people regain independence instead of receiving indefinite help, plus mandatory preventive home visits for older residents. New institutional beds were deliberately traded for home care and assisted living.',
    why: 'Investing early in independence lowers the need for the most expensive care later. Universal local provision keeps quality high and trust intact, and outcomes lead the world, though the tax cost is high.',
    confidence: 'high'
  }
];

/* Common threads, stated once. */
export const WHAT_WORKS = [
  'Coverage is universal and automatic, not a means-tested trapdoor that requires going broke first.',
  'Financing is a dedicated, predictable stream (insurance contribution or tax), so the benefit is a right, not an annual fight.',
  'The benefit is home-first by design, because most people want to stay home and home care costs less than institutions.',
  'Family caregivers are paid or supported rather than assumed to be free labor.',
  'One accountable public body plans capacity and workforce instead of leaving it to a collapsed private market.'
];

/* ---- The plan inside the NHA framework ---- */
export interface Pillar {
  title: string;
  body: string;
  borrows: string;
}

export const PLAN_PILLARS: Pillar[] = [
  {
    title: 'A universal benefit, no spend-down',
    body: 'Everyone is covered for assessed long-term care needs through the National Long-Term Care Authority, with $0 at the point of care. No one has to exhaust their savings to $2,000 to qualify, and the private long-term-care insurance market\'s job disappears.',
    borrows: 'Germany and Japan: universal social insurance instead of a poverty test.'
  },
  {
    title: 'Home-first, with a 70% target',
    body: 'The plan targets 70% of long-term care delivered at home and in the community rather than in institutions, with assessments, care coordination, and reablement to help people regain independence.',
    borrows: 'Netherlands and Denmark: neighborhood nursing and reablement over default institutionalization.'
  },
  {
    title: 'Pay and support family caregivers',
    body: 'Rather than treating $600B of family labor as free, the benefit funds caregiver support and respite so families can keep caring without losing income or health.',
    borrows: 'Germany\'s cash allowance for relatives who provide care.'
  },
  {
    title: 'A direct-care workforce that can staff it',
    body: 'A wage floor above today\'s $17.36/hr median, scope-of-practice floors, and shortage-targeted recruitment (including the merit immigration pathway) treat aides as the binding constraint they are, not an afterthought.',
    borrows: 'Every working system: care is only as good as a paid, stable workforce.'
  }
];

/* ---- Workforce assessment: demand this benefit creates vs. the plan's
   current workforce numbers ---- */
export const WORKFORCE_ASSESS = {
  directCare2024: 5.4,          // million, PHI
  openings2034: 9.7,            // million total openings 2024-2034, PHI
  medianWage2024: 17.36,        // $/hr, PHI
  homeTurnover: 75,             // %, PHI
  note: 'The Workforce tab now sizes the direct-care aide workforce as its own ' +
    'block: 5.4M aides today, 9.7M openings by 2034, a wage floor lifting pay ' +
    'above the $17.36/hr median, and the net-new compensation that floor costs, ' +
    'carried in the framework total. The merit immigration pathway now lists ' +
    'direct-care roles alongside physicians and nurses. Aides are the binding ' +
    'constraint, so pay and recruitment, not headcount alone, decide whether ' +
    'the benefit can be staffed.',
  confidence: 'medium' as Conf
};

/* ---- Cost, read from the fiscal model so it can never drift ---- */
function ltcParam() {
  const p = PARAMS_BY_ID['ltcExpansion'];
  return {
    low: Math.round(p.low * DEFLATOR_2023_TO_2024),
    mode: Math.round(p.mode * DEFLATOR_2023_TO_2024),
    high: Math.round(p.high * DEFLATOR_2023_TO_2024)
  };
}

export const LTC_COST_2024 = ltcParam(); // { low, mode, high } in $B, 2024 scale

export const COST_IN_FRAMEWORK = {
  headline: 'The benefit is already the framework\'s largest single expansion, and it is inside the total',
  body: 'Long-term care is carried in the fiscal model as net new national ' +
    'spending of about $' + LTC_COST_2024.mode + 'B a year at maturity (range $' +
    LTC_COST_2024.low + 'B to $' + LTC_COST_2024.high + 'B), summed into the ' +
    'framework total, not bolted on after. It is net new above the $415B ' +
    'already spent on long-term care today, because a universal benefit pays ' +
    'for care that families now give unpaid and for people now turned away.',
  confidence: 'medium' as Conf
};
