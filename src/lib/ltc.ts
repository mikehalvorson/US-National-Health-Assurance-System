/* Long-Term Care tab data. Every figure is sourced in
   research/long_term_care_methodology.md with a confidence grade. The net-new
   LTC benefit cost is the single source of truth in params.ts (ltcExpansion);
   this module re-reads it so the tab and the fiscal model can never drift. */
import { PARAMS_BY_ID, DEFLATOR_2023_TO_2024 } from './params';
/* R283 [§S9d]: the direct-care headcounts this chapter publishes belong to the
   workforce model, and the page says so. Until this section they were typed
   here as well, in two places that a build check kept level. workforce.ts is
   pure -- no node:fs, no DOM -- so it is safe in the client bundle this file
   is part of. */
import { LTC_WORKFORCE } from './workforce';

export type Conf = 'high' | 'medium' | 'low';

/* R286 [§S9d]: the figures this chapter states in more than one place, each
   with one authored home. UNPAID_FAMILY_CARE_B was typed six times across
   this file and the page; the other three were missed by the first pass and
   found by the section's code review, which is why they are here rather than
   in the original commit. */
export const UNPAID_FAMILY_CARE_B = 600;        // AARP, Valuing the Invaluable, 2021 value
export const LTSS_SPEND_2022_B = 415;           // KFF and Medicaid.gov, 2022
/* Not exported: only the _TEXT forms below have consumers, and an exported
   constant nothing reads is the defect R282 was filed for. */
const MEDICAID_ASSET_TEST = 2000;               // $ in countable assets, CMS and Medicaid.gov
const HCBS_WAITING_LIST = 711000;               // KFF, 2024

/* Written the way the prose writes them, so a page interpolates one
   expression rather than repeating the formatting decision. */
export const MEDICAID_ASSET_TEST_TEXT =
  '$' + MEDICAID_ASSET_TEST.toLocaleString('en-US');
export const HCBS_WAITING_LIST_TEXT = HCBS_WAITING_LIST.toLocaleString('en-US');

/* ---- What today's benefit costs a family, and the country as a whole ---- */
export interface CostStat {
  value: string;
  label: string;
  note: string;
  confidence: Conf;
}

export const US_FAILURE_STATS: CostStat[] = [
  { value: '$' + LTSS_SPEND_2022_B + 'B', label: 'spent on long-term care in 2022, and it still leaves most families exposed',
    note: 'Medicaid paid 61%, out-of-pocket 17%; $284B went to home and community care, $131B to nursing facilities. KFF and Medicaid.gov, 2022.',
    confidence: 'high' },
  { value: '$127,750', label: 'median cost of one year in a private nursing-home room, 2024',
    note: 'In-home care with a home health aide ran $77,792 a year; assisted living was in the low-to-mid $60,000s. Genworth and CareScout Cost of Care Survey, 2024.',
    confidence: 'high' },
  { value: '70%', label: 'of people who reach 65 will need long-term care before they die',
    note: 'Women need it 3.7 years on average, men 2.2 years; about one in seven spends over two years in a nursing home. HHS ASPE, 2022.',
    confidence: 'high' },
  { value: '~' + HCBS_WAITING_LIST_TEXT, label: 'people stuck on Medicaid waiting lists for home and community care in 2024',
    note: 'The average wait was about 40 months, up from 36 the year before. The waiting list is the visible edge of far larger unmet need. KFF, 2024.',
    confidence: 'high' },
  { value: '$' + UNPAID_FAMILY_CARE_B + 'B', label: 'unpaid care that 38 million family members provided in one year',
    note: 'About 36 billion hours, worth more than all U.S. out-of-pocket health spending that year. AARP, Valuing the Invaluable, 2021 value.',
    confidence: 'high' },
  { value: '$' + LTC_WORKFORCE.medianWageNow.toFixed(2) + '/hr', label: 'median wage for the aides who do the work, in 2024',
    note: 'Median annual earnings under $26,000; home-care turnover ran near ' + LTC_WORKFORCE.homeTurnoverPct + '%, so continuity of care collapses. PHI, 2025.',
    confidence: 'high' }
];

/* Why Medicare does not solve this, in one place.

   R282 [§S9d]: this constant was exported, never rendered, and had already
   drifted from the copy hand-typed into ltc.astro -- in four places,
   including a substantive clause the page had and this did not. The page's
   wording is what is published and what readers have seen, so it is what the
   constant now carries, and the page renders it rather than repeating it.
   One phrase was lost in the merge and is recorded here rather than silently:
   this constant said "bathing, dressing, eating, and supervision" where the
   page says "daily living". The page's is kept because the chapter's opening
   paragraph already spells that list out. */
export const MEDICARE_GAP = {
  headline: 'Medicare does not pay for long-term custodial care',
  body: 'Medicare covers up to 100 days of skilled care after a qualifying ' +
    'hospital stay, then stops. Ongoing help with daily living is not a ' +
    'Medicare benefit. Families learn this at the worst possible moment, ' +
    'then spend their savings down to about ' + MEDICAID_ASSET_TEST_TEXT + ' in assets to qualify for ' +
    'Medicaid, the only public program that pays for this care, and the ' +
    'largest single payer of it in the country.',
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
/* R288 [§S9d]: 'benchmark' exists because the OECD average was carried as
   'tax' and therefore drew in the tax-funded colour under a legend that
   labelled that swatch "Tax-funded". The OECD average is an aggregate across
   insurance-funded and tax-funded systems alike, so a reader saw it in the
   same colour as Sweden, Norway and Denmark and could reasonably infer a
   funding model for it. It is not a funding model and gets the neutral
   swatch the app already uses for a reference line. */
export type GdpKind = 'insurance' | 'tax' | 'us' | 'benchmark';

/* One table for the colour AND the legend label of every kind.
   Before this, `kindColor` was a ternary whose final branch returned the
   tax-funded colour for anything it did not recognise, and the legend was
   three hand-listed entries beside a data field that can carry more. Both
   halves now derive from here, and `Record<GdpKind, ...>` means adding a kind
   without styling it fails `astro check` rather than rendering as tax-funded.
   `gdpKindStyleFaults()` covers what the type cannot: a dead entry, a shared
   colour, and a kind that reached the data through a cast. */
export const KIND_STYLE: Record<GdpKind, { color: string; label: string }> = {
  insurance: { color: 'var(--series-1)', label: 'Social insurance' },
  tax: { color: 'var(--series-3)', label: 'Tax-funded' },
  us: { color: 'var(--series-5)', label: 'United States' },
  benchmark: { color: 'var(--baseline-series)', label: 'OECD average (all funding models)' }
};

/* The kinds that describe a country covering the benefit universally. The
   OECD average is an aggregate and the United States does not cover
   universally, so neither belongs in the cluster the range is quoted from. */
export const UNIVERSAL_COVERAGE_KINDS: GdpKind[] = ['insurance', 'tax'];

/* R287 [S9d]: the header below has always described perCapita as "derived
   transparently as pct x GDP per capita", and it was eight typed literals.
   The derivation was sound -- BV1 shows Japan's per-capita figure WAS
   recomputed by hand when its share was corrected from 2.0% to 2.2% -- but
   the word "derived" described what a person did once, not what the code
   does, and the next correction would not have been so lucky.
   gdpPc2021 is the GDP per capita each published pair already encoded,
   to the nearest $10: the precision at which all eight published figures
   reproduce exactly, so this changed no number on the page. It is consistent
   with World Bank NY.GDP.PCAP.PP.CD 2021, which the methodology already
   names, and three of the eight back-solve to exactly round figures. */
export interface GdpBarInput {
  country: string;
  pct: number;              // total LTC spending, % of GDP, 2021 (OECD HaG 2023)
  /* The GDP per capita each published perCapita/pct pair already encoded,
     to the nearest $10. Consistent with World Bank NY.GDP.PCAP.PP.CD 2021,
     which is the series the methodology names, and NOT independently
     re-read from it -- so this comment says implied, not sourced. The
     eight values are published in the methodology so a reader can audit
     the arithmetic. */
  gdpPc2021: number;        // GDP per capita, USD PPP, 2021 (implied)
  kind: GdpKind;
  confidence: Conf;
  note: string;
}

export interface GdpBar extends GdpBarInput {
  perCapita: number;        // LTC spending per person, USD PPP, 2021, COMPUTED
}

export function perCapitaSpend(row: GdpBarInput): number {
  return Math.round(row.gdpPc2021 * row.pct / 100);
}

const LTC_GDP_2021_INPUT: GdpBarInput[] = [
  { country: 'Netherlands', pct: 4.4, gdpPc2021: 68570, kind: 'insurance', confidence: 'high',
    note: 'The OECD high mark. Universal insurance for intensive care, municipal social support, insured district nursing.' },
  { country: 'Norway', pct: 3.5, gdpPc2021: 92200, kind: 'tax', confidence: 'high',
    note: 'Tax-funded municipal care. The highest dollars per person here, partly because Norway is a rich, oil-funded economy.' },
  { country: 'Sweden', pct: 3.4, gdpPc2021: 62180, kind: 'tax', confidence: 'high',
    note: 'Tax-funded municipal care under the Social Services Act.' },
  { country: 'Denmark', pct: 3.2, gdpPc2021: 69310, kind: 'tax', confidence: 'high',
    note: 'Tax-funded, reablement-first, with mandatory preventive home visits.' },
  { country: 'Japan', pct: 2.2, gdpPc2021: 46000, kind: 'insurance', confidence: 'high',
    note: 'Mandatory insurance from age 40, with a home and community-based tilt.' },
  { country: 'Germany', pct: 2.5, gdpPc2021: 62640, kind: 'insurance', confidence: 'high',
    note: 'Statutory insurance since 1995, with a cash option for family caregivers.' },
  { country: 'OECD average', pct: 1.8, gdpPc2021: 51220, kind: 'benchmark', confidence: 'high',
    note: 'The average across OECD countries in 2021, spanning insurance-funded and tax-funded systems alike. It is a reference line, not a funding model.' },
  { country: 'United States', pct: 1.3, gdpPc2021: 71460, kind: 'us', confidence: 'high',
    note: 'The lowest share of any country shown, yet close to the OECD average in raw dollars per person, because the U.S. economy is large. The money is means-tested and rationed, and this figure still leaves out the roughly $' + UNPAID_FAMILY_CARE_B + 'B in unpaid family care.' }
];

export const LTC_GDP_2021: GdpBar[] = LTC_GDP_2021_INPUT.map(function (row) {
  return Object.assign({}, row, { perCapita: perCapitaSpend(row) });
});

/* R286 [S9d]: the Nordic and Dutch shares were retyped inside COUNTRY_SYSTEMS
   while living in LTC_GDP_2021 -- the same figure authored twice in one file,
   which is how Japan's 2.2% came to disagree with params.ts. Resolved by
   lookup so a corrected bar corrects the country card with it, and so a
   renamed country throws at build time instead of quietly leaving a stale
   percentage in the prose. */
function gdpShare(country: string): string {
  const row = LTC_GDP_2021.find(function (r) { return r.country === country; });
  if (!row) throw new Error('LTC_GDP_2021 has no row for ' + country);
  return row.pct.toFixed(1) + '%';
}

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
    funding: 'Income-related national contributions. One of the highest long-term care spenders in the OECD at about ' + gdpShare('Netherlands') + ' of GDP.',
    design: 'A universal entitlement for intensive round-the-clock care, with lighter needs handled by municipalities and insured district nursing. Home care runs on small self-managing nursing teams (Buurtzorg): about ten nurses cover a neighborhood of 10,000 with almost no managers.',
    why: 'Self-managing neighborhood teams produce fewer hospitalizations, fewer institutional placements, and the highest patient and staff satisfaction, at lower cost per client. It shows generosity and efficiency are not opposites.',
    confidence: 'high'
  },
  {
    country: 'Denmark and the Nordics',
    system: 'Tax-funded municipal elder care, reablement-first',
    since: 'Long-standing; reablement required since 2015',
    funding: 'General taxation, no separate insurance. Nordic public long-term care spending is the highest in the OECD (Denmark ' + gdpShare('Denmark') + ', Sweden ' + gdpShare('Sweden') +
      ', Norway ' + gdpShare('Norway') + ' of GDP).',
    design: 'Care is local and universal. Denmark pioneered reablement: short, goal-oriented rehabilitation so people regain independence instead of receiving indefinite help, plus mandatory preventive home visits for older residents. New institutional beds were deliberately traded for home care and assisted living.',
    why: 'Investing early in independence lowers the need for the most expensive care later. Universal local provision keeps quality high and trust intact, and outcomes lead the world, though the tax cost is high.',
    confidence: 'high'
  }
];

/* Common threads, stated once.

   R282 [§S9d]: "stated once" was not true. This was exported and never
   rendered while ltc.astro hand-typed its own five, and two of them had
   already drifted. The page's wording is published and is what these now
   carry; the page renders them. The one thing the page's copy had dropped --
   naming what a dedicated stream actually is -- is restored, because it tells
   a reader something the shorter sentence does not. */
export const WHAT_WORKS = [
  'Coverage is universal and automatic, not a means-tested trapdoor that requires going broke first.',
  'Financing is a dedicated, predictable stream, an insurance contribution or a tax, so the benefit is a right rather than an annual budget fight.',
  'The benefit is home-first by design, because most people want to stay home and home care usually costs less than an institution.',
  'Family caregivers are paid or supported, not treated as free labor.',
  'One accountable public body plans the capacity and the workforce, instead of leaving it to a collapsed private market.'
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
    body: 'Everyone is covered for assessed long-term care needs through the National Long-Term Care Authority, with $0 at the point of care. No one has to exhaust their savings to ' + MEDICAID_ASSET_TEST_TEXT + ' to qualify, and the private long-term-care insurance market\'s job disappears.',
    borrows: 'Germany and Japan: universal social insurance instead of a poverty test.'
  },
  {
    title: 'Home-first, with a 70% target',
    body: 'The plan targets 70% of long-term care delivered at home and in the community rather than in institutions, with assessments, care coordination, and reablement to help people regain independence.',
    borrows: 'Netherlands and Denmark: neighborhood nursing and reablement over default institutionalization.'
  },
  {
    title: 'Pay and support family caregivers',
    body: 'Rather than treating $' + UNPAID_FAMILY_CARE_B + 'B of family labor as free, the benefit funds caregiver support and respite so families can keep caring without losing income or health.',
    borrows: 'Germany\'s cash allowance for relatives who provide care.'
  },
  {
    title: 'A direct-care workforce that can staff it',
    body: 'A wage floor above today\'s $' + LTC_WORKFORCE.medianWageNow.toFixed(2) + '/hr median, scope-of-practice floors, and shortage-targeted recruitment (including the merit immigration pathway) treat aides as the binding constraint they are, not an afterthought.',
    borrows: 'Every working system: care is only as good as a paid, stable workforce.'
  }
];

/* ---- Workforce assessment: three honest headcounts, all in millions of
   direct-care workers (home care aides, residential aides, nursing
   assistants), so the bars compare like with like.
     directCare2024    today's workforce (PHI 2025).
     projected2034     what the CURRENT system already needs by 2034: today
                       plus the new jobs PHI projects over 2024-2034.
     matureFramework   what a UNIVERSAL, home-first benefit needs at maturity:
                       the 2034 baseline plus the staff to serve people now
                       rationed out and to expand paid home care.
   openings2034 is a DIFFERENT kind of number: total hires needed over the
   decade including everyone who must be replaced, not a headcount at a point
   in time, so it is quoted in prose, never drawn as a bar.

   R283 [§S9d]: every value here now reads LTC_WORKFORCE. The page told the
   reader these came from "The Workforce model" while this file imported only
   params.ts and typed all seven as literals; the two copies were held level
   by a build check rather than by a wire. The attribution is true now.

   R284 [§S9d]: and each figure carries its OWN grade. Before, one `medium`
   covered all seven, which put `matureFramework` -- a planning estimate whose
   two inputs are plan assumptions -- under the same label as four PHI 2025
   measurements. The methodology already grades it `low` and gives the reason;
   that grade simply never reached the code or the reader. `basis` is the
   short form of what the methodology says, so the grade arrives with its
   justification rather than as a bare word. ---- */
export interface GradedFigure {
  value: number;
  confidence: Conf;
  basis: string;
}

/* R284 [§S9d, fix run]: the two planning inputs, published as figures in
   their own right rather than explained inside the figure they produce. The
   row's second declared test is "no figure inherits a grade from a sibling";
   the section's first pass met that for the seven headcounts and then broke
   it one level down, by giving the two inputs no grade of their own. */
export interface PlanningInput extends GradedFigure {
  label: string;
  /* The two inputs are in different units -- millions of workers, and a bare
     ratio -- so one shared format cannot serve both, and 5.0 renders as "5"
     without one. `value` stays raw for the arithmetic. */
  display: string;
}

export const PLANNING_INPUTS: PlanningInput[] = [
  {
    label: 'Covered full-time-equivalent aides',
    value: LTC_WORKFORCE.coveredFteM, confidence: 'low' as Conf,
    display: LTC_WORKFORCE.coveredFteM.toFixed(1) + ' million',
    basis: 'a plan design assumption, not a published figure: the ' +
      'direct-care workforce this benefit is costed to cover. The wage-floor ' +
      'costing spans 4 million to 6 million around it'
  },
  {
    label: 'Full-time fraction per worker',
    value: LTC_WORKFORCE.fteFraction, confidence: 'low' as Conf,
    /* No unit appended: the label IS the unit, and 'Full-time fraction
       per worker: 0.67 full-time-equivalents per worker' said it twice. */
    display: LTC_WORKFORCE.fteFraction.toFixed(2),
    basis: 'a plan design assumption, not a published figure: direct care is ' +
      'heavily part-time, so headcount exceeds full-time-equivalents. No ' +
      'published national figure for this ratio was located'
  }
];

export const WORKFORCE_ASSESS = {
  directCare2024: {
    value: LTC_WORKFORCE.currentDirectCareM, confidence: 'high' as Conf,
    basis: 'measured direct-care employment in 2024 (PHI 2025, on BLS data)'
  } as GradedFigure,
  newJobs2034: {
    value: LTC_WORKFORCE.newJobs2034M, confidence: 'high' as Conf,
    basis: 'new direct-care jobs projected over 2024-2034 (PHI 2025, on BLS projections)'
  } as GradedFigure,
  projected2034: {
    value: LTC_WORKFORCE.projected2034M, confidence: 'high' as Conf,
    basis: "today's workforce plus the projected new jobs, both PHI 2025"
  } as GradedFigure,
  matureFramework: {
    value: LTC_WORKFORCE.matureFrameworkM, confidence: 'low' as Conf,
    basis: 'a planning estimate, not a measurement: about ' +
      LTC_WORKFORCE.coveredFteM.toFixed(1) + ' million covered full-time-equivalent aides ' +
      'divided by a full-time fraction of about ' + LTC_WORKFORCE.fteFraction +
      '. Both inputs are graded low in their own right and neither is a ' +
      'published figure, which is why this is the only headcount graded low'
  } as GradedFigure,
  openings2034: {
    value: LTC_WORKFORCE.openings2034M, confidence: 'high' as Conf,
    basis: 'total hires over 2024-2034 including replacements (PHI 2025)'
  } as GradedFigure,
  medianWage2024: {
    value: LTC_WORKFORCE.medianWageNow, confidence: 'high' as Conf,
    basis: 'median hourly wage for direct-care workers in 2024 (PHI 2025)'
  } as GradedFigure,
  homeTurnover: {
    value: LTC_WORKFORCE.homeTurnoverPct, confidence: 'high' as Conf,
    basis: 'annual home-care turnover (PHI 2025)'
  } as GradedFigure,
  /* The `note` field that stood here is gone. It was exported with no
     consumer anywhere in src/, which is exactly the defect R282 was filed
     for -- and it was REWRITTEN by the commit that fixed R282, so this
     section recreated the shape it was removing. The page's "How this
     squares with the Workforce and immigration plans" paragraph is the
     published copy, says the same things, and now reads LTC_WORKFORCE
     directly. Found by the section's code review. */
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
  body: 'Start with what happens now. The country already spends about $' + LTSS_SPEND_2022_B + 'B a ' +
    'year on long-term care, most of it through Medicaid and only after a family ' +
    'has spent almost everything it saved. On top of that, relatives provide ' +
    'roughly $' + UNPAID_FAMILY_CARE_B + 'B a year in care for free. A universal benefit would add about ' +
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
