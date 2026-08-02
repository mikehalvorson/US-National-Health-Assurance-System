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
    note: 'Medicaid paid 61%, out-of-pocket 17%; $284B went to home and community care, $131B to nursing facilities. KFF and Medicaid.gov, 2022.',
    confidence: 'high' },
  { value: '$127,750', label: 'median cost of one year in a private nursing-home room, 2024',
    note: 'In-home care with a home health aide ran $77,792 a year; assisted living was in the low-to-mid $60,000s. Genworth and CareScout Cost of Care Survey, 2024.',
    confidence: 'high' },
  { value: '70%', label: 'of people who reach 65 will need long-term care before they die',
    note: 'Women need it 3.7 years on average, men 2.2 years; about one in seven spends over two years in a nursing home. HHS ASPE, 2022.',
    confidence: 'high' },
  { value: '~711,000', label: 'people stuck on Medicaid waiting lists for home and community care in 2024',
    note: 'The average wait was about 40 months, up from 36 the year before. The waiting list is the visible edge of far larger unmet need. KFF, 2024.',
    confidence: 'high' },
  { value: '$600B', label: 'unpaid care that 38 million family members provided in one year',
    note: 'About 36 billion hours, worth more than all U.S. out-of-pocket health spending that year. AARP, Valuing the Invaluable, 2021 value.',
    confidence: 'high' },
  { value: '$17.36/hr', label: 'median wage for the aides who do the work, in 2024',
    note: 'Median annual earnings under $26,000; home-care turnover ran near 75%, so continuity of care collapses. PHI, 2025.',
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

/* ---- Long-term care spending, 2021, from one source for every bar: OECD
   Health at a Glance 2023 (total long-term care as a share of GDP). Two
   readings are shown together. Share of GDP measures national effort against
   the size of each economy. Dollars per person (perCapita) is the same
   spending divided by population, so a reader can also see the raw amount.
   perCapita is derived transparently as pct x GDP per capita (USD, adjusted
   for local prices, World Bank 2021); it is not a cross-scale comparison
   because every figure is the same unit, spending per person. ---- */
export interface GdpBar {
  country: string;
  pct: number;              // total LTC spending, % of GDP, 2021 (OECD HaG 2023)
  perCapita: number;        // LTC spending per person, USD PPP, 2021 (derived)
  kind: 'insurance' | 'tax' | 'us';
  confidence: Conf;
  note: string;
}

export const LTC_GDP_2021: GdpBar[] = [
  { country: 'Netherlands', pct: 4.4, perCapita: 3017, kind: 'insurance', confidence: 'high',
    note: 'The OECD high mark. Universal insurance for intensive care, municipal social support, insured district nursing.' },
  { country: 'Norway', pct: 3.5, perCapita: 3227, kind: 'tax', confidence: 'high',
    note: 'Tax-funded municipal care. The highest dollars per person here, partly because Norway is a rich, oil-funded economy.' },
  { country: 'Sweden', pct: 3.4, perCapita: 2114, kind: 'tax', confidence: 'high',
    note: 'Tax-funded municipal care under the Social Services Act.' },
  { country: 'Denmark', pct: 3.2, perCapita: 2218, kind: 'tax', confidence: 'high',
    note: 'Tax-funded, reablement-first, with mandatory preventive home visits.' },
  { country: 'Japan', pct: 2.2, perCapita: 1012, kind: 'insurance', confidence: 'high',
    note: 'Mandatory insurance from age 40, with a home and community-based tilt.' },
  { country: 'Germany', pct: 2.5, perCapita: 1566, kind: 'insurance', confidence: 'high',
    note: 'Statutory insurance since 1995, with a cash option for family caregivers.' },
  { country: 'OECD average', pct: 1.8, perCapita: 922, kind: 'tax', confidence: 'high',
    note: 'The average across OECD countries in 2021.' },
  { country: 'United States', pct: 1.3, perCapita: 929, kind: 'us', confidence: 'high',
    note: 'The lowest share of any country shown, yet close to the OECD average in raw dollars per person, because the U.S. economy is large. The money is means-tested and rationed, and this figure still leaves out the roughly $600B in unpaid family care.' }
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

/* ---- Workforce assessment: three honest headcounts, all in millions of
   direct-care workers (home care aides, residential aides, nursing
   assistants), so the bars compare like with like.
     directCare2024    today's workforce (PHI 2025).
     projected2034     what the CURRENT system already needs by 2034: today
                       plus the 772,000 new jobs PHI projects over 2024-2034.
     matureFramework   what a UNIVERSAL, home-first benefit needs at maturity:
                       the 2034 baseline plus the staff to serve people now
                       rationed out and to expand paid home care. Derived from
                       the plan's ~5.0M covered full-time-equivalent aides
                       divided by a ~0.67 full-time fraction (direct care is
                       heavily part-time), which lands near 7.5M workers.
   openings2034 (9.7M) is a DIFFERENT kind of number: total hires needed over
   the decade including everyone who must be replaced, not a headcount at a
   point in time, so it is quoted in prose, never drawn as a bar. ---- */
export const WORKFORCE_ASSESS = {
  directCare2024: 5.4,          // million workers today, PHI 2025
  newJobs2034: 0.772,           // million NEW jobs added 2024-2034, PHI 2025
  projected2034: 6.2,           // million workers the current system needs by 2034 (5.4 + 0.772)
  matureFramework: 7.5,         // million workers a universal home-first benefit needs at maturity
  openings2034: 9.7,            // million TOTAL openings 2024-2034 incl. replacements, PHI 2025
  medianWage2024: 17.36,        // $/hr, PHI 2025
  homeTurnover: 75,             // %, PHI 2025
  note: 'Direct-care aides are the workforce that actually delivers a home-first ' +
    'benefit. The country employs about 5.4 million of them today, and the ' +
    'current system already needs roughly 6.2 million by 2034 just to keep pace ' +
    'with aging. A universal benefit that also reaches people now turned away ' +
    'needs on the order of 7.5 million at maturity. Turnover near 75% and a ' +
    'median wage of $17.36 an hour are why the constraint is pay and retention, ' +
    'not just headcount. The wage floor that addresses this is costed in the ' +
    'framework total, and the merit immigration pathway now lists direct-care ' +
    'roles alongside physicians and nurses.',
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
  headline: 'The largest single new benefit, and its price is already inside the plan total',
  body: 'Start with what happens now. The country already spends about $415B a ' +
    'year on long-term care, most of it through Medicaid and only after a family ' +
    'has spent almost everything it saved. On top of that, relatives provide ' +
    'roughly $600B a year in care for free. A universal benefit would add about ' +
    '$' + LTC_COST_2024.mode + 'B a year once it is fully up and running ' +
    '(somewhere between $' + LTC_COST_2024.low + 'B and $' + LTC_COST_2024.high +
    'B). That money is genuinely new, not a reshuffle of today\'s bills, because ' +
    'it finally pays for two things the current system does not: the people who ' +
    'are turned away or left on waiting lists, and the care that families now ' +
    'give unpaid. This added cost is built into the plan\'s overall price from ' +
    'the start. When the plan says what it costs and how taxes cover it, ' +
    'long-term care is already counted inside that number.',
  confidence: 'medium' as Conf
};
