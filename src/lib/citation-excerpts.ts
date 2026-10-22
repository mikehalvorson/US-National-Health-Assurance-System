/* What each cited source said when it was read (trap table of P25, 2026-10-20).

   Every parameter and engine constant in params.ts that carries a url is
   listed here with the passage of that source that states the figure its
   note takes from it, read on the date given. A 200, a title match or a
   note that names the right report is not evidence that the figure is
   there: P25's reads found a dead page, a living page that had moved to the
   next release, a figure the cited paper never states and a rate attributed
   to a paper about something else, each behind a working url.
   tests/lib/citation-excerpts.test.ts holds the two together offline: each
   cited id has an entry and each entry a cited id, the urls match, each
   excerpt states its figures, each note states them too, and the numbers
   agree to the note's rounding.

   An excerpt is a short verbatim fragment (MAX_EXCERPT_WORDS at most), not
   a quotation for the page; nothing here is rendered. A 'table' excerpt is
   the row label and cells as the table prints them, with `where` naming the
   table and its columns. `readAt` is the document actually read when the
   url is a landing page that links it. A living page can change after the
   read date: a re-read that finds other text means updating the excerpt and
   the note together, never one alone. */

import {
  BASE2023, CBO_LTSS_NHE_INCREASE_PCT, CBO_SINGLE_PAYER_ADMIN_PCT, CENSUS_UNINSURED_2024, CMS_AGE_PER_CAPITA_2020,
  DIRECT_CARE_MEDIAN_WAGE_2024, LOW_VALUE_POOL_B, NHE_2023_PRIVATE_INSURANCE_B, NHE_2024_OBSERVED, NHE_PROJECTIONS,
  US_PEER_BRAND_PRICE_RATIO, US_PEER_DRUG_PRICE_RATIO, cmsPerPerson2020, sponsorTotal2023
} from './params';
import { SZ_LETTER } from './score-rebase';
import { TODAY_LEVELS } from './equations';
import { INHERITANCE_FIGURES } from './taxparams';
import { lookupOrThrow } from './registry-lookup';

/* A note figure that restates a constant is read from it here, so the test
   holds the constant itself to the source's words; a figure that only the
   note states is written as the note states it. */
export const MAX_EXCERPT_WORDS = 15;

export interface CitedFigure {
  /** the figure as the excerpt states it, a substring of one excerpt */
  source: string;
  /** the same figure as the note states it, a substring of the note */
  note: string;
  /** multiplies the source figure's numbers into the note's units
      (278 percent stated as 2.78x: 0.01) */
  scale?: number;
}

export interface CitationExcerpt {
  url: string;
  readAt?: string;
  read: string;
  kind: 'text' | 'table';
  where?: string;
  excerpts: string[];
  figures: CitedFigure[];
}

const NHE_HISTORICAL = 'https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/historical';
const NHE_TABLES_ZIP = 'https://www.cms.gov/files/zip/nhe-tables.zip';
const CBO_SINGLE_PAYER = 'https://www.cbo.gov/publication/56811';
const CBO_SINGLE_PAYER_PDF = 'https://www.cbo.gov/system/files/2020-12/56811-Single-Payer.pdf';
const CBO_PAYROLL = 'https://www.cbo.gov/publication/57089';
const MEDPAC_SEC10 = 'https://www.medpac.gov/wp-content/uploads/2024/07/July2024_MedPAC_DataBook_Sec10_SEC.pdf';
const MEDPAC_SPLIT = 'physician offices, HOPDs, and pharmacy suppliers accounting for 55 percent, 41 percent, and 4 percent';
const CARLONI_58 = 'I estimate that 58 percent of the additional tax burden';
const READ = '2026-10-20';

export const CITATION_EXCERPTS: Record<string, CitationExcerpt> = {
  baselineRealGrowth: {
    url: 'https://www.cms.gov/files/document/nhe-projections-forecast-summary.pdf', read: READ, kind: 'text',
    excerpts: ['Over 2025-34 average NHE growth (5.4 percent) is projected to outpace'],
    figures: [{ source: '5.4 percent', note: NHE_PROJECTIONS.current.averageNominal + '%' }]
  },
  gdpRealGrowth: {
    url: 'https://www.cbo.gov/publication/62105', read: READ, kind: 'text',
    excerpts: ['grows by an average of 2.1 percent per year from 2026 to 2030',
      'by an average of 1.8 percent per year from 2031 to 2036'],
    figures: [{ source: '2.1 percent', note: '2.1%' }, { source: '1.8 percent', note: '1.8%' }]
  },
  popGrowth: {
    url: 'https://www.census.gov/newsroom/press-releases/2026/population-growth-slows.html', read: READ, kind: 'text',
    excerpts: ['the U.S. population grew by 1.8 million (or 0.5%) to reach 341.8 million',
      '(when it increased by 1.0%, or 3.2 million people)'],
    figures: [{ source: '0.5%', note: '0.5%' }, { source: '1.0%', note: '1.0%' }]
  },
  utilIncrease: {
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3943162/', read: READ, kind: 'text',
    excerpts: ['the elasticity of medical spending with respect to its out-of-pocket price is −0.2'],
    figures: [{ source: '−0.2', note: '−0.2' }]
  },
  coverageDemandShare: {
    url: 'https://www.census.gov/library/publications/2025/demo/p60-288.html',
    readAt: 'https://www2.census.gov/library/publications/2025/demo/p60-288.pdf', read: READ, kind: 'text',
    excerpts: ['That means 8.0 percent of people were uninsured for the entire calendar year.'],
    figures: [{ source: '8.0 percent', note: CENSUS_UNINSURED_2024.pct.toFixed(1) + '%' }]
  },
  providerPaymentFactor: {
    url: 'https://www.rand.org/news/press/2024/05/13.html', read: READ, kind: 'text',
    excerpts: ['averaged 254 percent of what Medicare would have paid'],
    figures: [{ source: '254 percent', note: '254%' }]
  },
  drugPriceCut: {
    url: 'https://www.rand.org/pubs/research_reports/RRA788-3.html', read: READ, kind: 'text',
    excerpts: ['Across all drugs, U.S. prices were 278 percent of other countries’ prices.',
      'U.S. gross prices for brand-name originator drugs were 422 percent of prices'],
    figures: [{ source: '278 percent', note: US_PEER_DRUG_PRICE_RATIO + '×', scale: 0.01 },
      { source: '422 percent', note: US_PEER_BRAND_PRICE_RATIO + '×', scale: 0.01 }]
  },
  embeddedDrugSpend: {
    url: NHE_HISTORICAL, readAt: NHE_TABLES_ZIP, read: READ, kind: 'table',
    where: 'NHE Table 2 (2024 release), type of expenditure by year, $ billions',
    excerpts: ['Prescription Drugs | 2023 | 432.9'],
    figures: [{ source: '432.9', note: '$' + BASE2023.rxRetail + 'B' }]
  },
  publicAdminRate: {
    url: CBO_SINGLE_PAYER, readAt: CBO_SINGLE_PAYER_PDF, read: READ, kind: 'text',
    excerpts: ['would range from 1.5 percent to 1.8 percent, compared with 2.3 percent'],
    figures: [{ source: '1.5 percent to 1.8 percent', note: CBO_SINGLE_PAYER_ADMIN_PCT.low + '-' + CBO_SINGLE_PAYER_ADMIN_PCT.high + '%' }]
  },
  providerAdminSavings: {
    url: 'https://www.healthaffairs.org/doi/10.1377/hlthaff.2013.1327', read: READ, kind: 'text',
    excerpts: ['administrative costs accounted for 25.3 percent of total US hospital expenditures'],
    figures: [{ source: '25.3 percent', note: '25.3%' }]
  },
  governanceRate: {
    url: 'https://www.ssa.gov/oact/STATS/admin.html', read: READ, kind: 'text',
    excerpts: ['Since 1989, such expenses have totaled one percent or less of combined cost'],
    figures: [{ source: 'one percent or less', note: 'one percent or less' }]
  },
  careModelSavings: {
    url: 'https://www.cdc.gov/nchs/fastats/emergency-department.htm', read: READ, kind: 'text',
    excerpts: ['Number of visits: 155.4 million'],
    figures: [{ source: '155.4 million', note: '155M' }]
  },
  lowValuePool: {
    url: 'https://doi.org/10.1001/jama.2019.13978', readAt: 'https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:31589283',
    read: READ, kind: 'text',
    excerpts: ['overtreatment or low-value care, $75.7 billion to $101.2 billion'],
    figures: [{ source: '$75.7 billion to $101.2 billion', note: '$' + LOW_VALUE_POOL_B.low + '-' + LOW_VALUE_POOL_B.high + 'B' }]
  },
  ltcExpansion: {
    url: CBO_SINGLE_PAYER, readAt: CBO_SINGLE_PAYER_PDF, read: READ, kind: 'text',
    excerpts: ['NHE would be about 5 percent larger with the LTSS benefit in Option 5.'],
    figures: [{ source: 'about 5 percent', note: 'about ' + CBO_LTSS_NHE_INCREASE_PCT + ' percent' }]
  },
  ltcWageFloor: {
    url: 'https://www.phinational.org/resource/direct-care-workers-in-the-united-states-key-facts-2025/',
    readAt: 'https://www.phinational.org/wp-content/uploads/2025/09/PHI-DCW-Key-Facts-Report-2025.pdf', read: READ, kind: 'text',
    excerpts: ['the median hourly wage for all direct care workers was just $17.36 in 2024'],
    figures: [{ source: '$17.36', note: '$' + DIRECT_CARE_MEDIAN_WAGE_2024.toFixed(2) }]
  },
  bhExpansion: {
    url: 'https://www.samhsa.gov/data/report/2023-nsduh-annual-national-report',
    readAt: 'https://www.samhsa.gov/data/sites/default/files/reports/rpt47095/National%20Report/National%20Report/2023-nsduh-annual-national.htm',
    read: READ, kind: 'text',
    excerpts: ['slightly less than half (27.1 million people) did not receive mental health treatment',
      '85.4 percent (or 41.4 million people) did not receive substance use treatment'],
    figures: [{ source: '27.1 million', note: '27.1M' }, { source: '41.4 million', note: '41.4M' }]
  },
  dvhExpansion: {
    url: NHE_HISTORICAL, readAt: NHE_TABLES_ZIP, read: READ, kind: 'table',
    where: 'NHE Table 2 (2024 release), type of expenditure by year, $ billions',
    excerpts: ['Dental Services | 2023 | 177.5'],
    figures: [{ source: '177.5', note: '$' + BASE2023.dental + 'B' }]
  },
  emsPhExpansion: {
    url: 'https://www.cms.gov/medicare/payment/fee-schedules/ambulance-fee-schedule/medicare-gadcs-resources/gadcs-report-year-1-year-2-cohort-analysis',
    readAt: 'https://www.cms.gov/files/document/medicare-ground-ambulance-data-collection-system-gadcs-report-year-1-and-year-2-cohort-analysis.pdf',
    read: READ, kind: 'table',
    where: 'GADCS report, Table 6.1, unadjusted total cost per transport: N, mean, median',
    excerpts: ['All NPIs | 5,000 | $2,673 | $1,340'],
    figures: [{ source: '$2,673', note: '$2,673' }, { source: '$1,340', note: '$1,340' }]
  },
  rdPublic: {
    url: 'https://www.cbo.gov/publication/57126', read: READ, kind: 'text',
    excerpts: ['In 2019, the pharmaceutical industry spent $83 billion dollars on R&D.'],
    figures: [{ source: '$83 billion', note: '$83B' }]
  },
  workforceEdu: {
    url: 'https://shareprogram.gwu.edu/medicare-overpayments-graduate-medical-education-could-total-128-billion-annually-new-study-says',
    read: '2026-10-21', kind: 'text',
    excerpts: ['25 percent of hospitals receiving less than $105,761 while 25 percent received more than $182,233'],
    figures: [{ source: '$105,761', note: '$105,761' }, { source: '$182,233', note: '$182,233' }]
  },
  employerCapture: {
    url: NHE_HISTORICAL, readAt: NHE_TABLES_ZIP, read: READ, kind: 'table',
    where: 'NHE Table 5 (2024 release), type of sponsor by year: $ billions, then percent distribution',
    excerpts: ['Private Business1 | 2023 | 916.1 | 18.6'],
    figures: [{ source: '916.1', note: '$' + sponsorTotal2023('emp') + 'B' },
      { source: '18.6', note: (100 * sponsorTotal2023('emp') / BASE2023.nheTotal).toFixed(1) + '%' }]
  },
  wagePassThrough: {
    url: CBO_PAYROLL, read: READ, kind: 'text',
    excerpts: [CARLONI_58],
    figures: [{ source: '58 percent', note: '58 percent' }]
  },
  wealthTaxPotential: {
    url: 'https://eml.berkeley.edu/~saez/saez-zucman-wealthtax-warren-feb21.pdf', read: READ, kind: 'text',
    excerpts: ['With the 4% higher billionaire surtax, revenue in 2023 would be $351 billion.'],
    figures: [{ source: '$351 billion', note: '$' + SZ_LETTER.firstYearB.total + 'B' }]
  },
  wealthCollectionEff: {
    url: 'https://www.warren.senate.gov/imo/media/doc/Wealth%20Tax%20Revenue%20Estimates%20by%20Saez%20and%20Zucman%20-%20Feb%2024%2020211.pdf',
    read: READ, kind: 'text',
    excerpts: ['reduce their tax liability by 15% through a combination of tax evasion and tax avoidance'],
    figures: [{ source: '15%', note: Math.round(SZ_LETTER.avoidance * 100) + '%' }]
  },
  embeddedDrugHospitalShare: {
    url: MEDPAC_SEC10, read: READ, kind: 'text',
    excerpts: [MEDPAC_SPLIT],
    figures: [{ source: '55 percent', note: '55 percent' }, { source: '41 percent', note: '41 percent' }]
  },
  embeddedDrugClinicShare: {
    url: MEDPAC_SEC10, read: READ, kind: 'text',
    excerpts: [MEDPAC_SPLIT],
    figures: [{ source: '55 percent', note: '55 percent' }]
  },
  wageTaxFeedbackRate: {
    url: CBO_PAYROLL, read: READ, kind: 'text',
    excerpts: [CARLONI_58],
    figures: [{ source: '58 percent', note: '58 percent' }]
  }
};

/* Review 1 of the owner decisions: the constants the decisions of
   2026-10-19 cite outside PARAM_DEFS and ENGINE_CONSTANTS. Each figure is
   held to the constant's own value (`value`), since no note restates it;
   the test derives the keys from the constants, so a new band, level or
   figure without an excerpt fails. */
export interface DeclaredFigure {
  /** the figure as the excerpt states it, a substring of one excerpt */
  source: string;
  /** the constant's value it supports */
  value: number;
  /** multiplies the source figure into the constant's units ($2.5 million: 1e6) */
  scale?: number;
}
export interface DeclaredExcerpt {
  url: string;
  readAt?: string;
  read: string;
  kind: 'text' | 'table';
  where?: string;
  excerpts: string[];
  figures: DeclaredFigure[];
}

const EPMC = (pmid: string) => 'https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:' + pmid + '%20AND%20SRC:MED&resultType=core';
const evidence = (id: string): readonly number[] => lookupOrThrow(TODAY_LEVELS, id).evidence;
const CMS_AGE_PAGE = 'https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/age-and-sex';
const CMS_AGE_ZIP = 'https://www.cms.gov/research-statistics-data-and-systems/statistics-trends-and-reports/nationalhealthexpenddata/downloads/ageandgendertables.zip';
const CMS_AGE_WHERE = 'CMS Age and Sex Tables, Table 7, personal health care per person by age group: row, year, dollars';
const BATCHELDER = 'https://www.hamiltonproject.org/publication/policy-proposal/leveling-the-playing-field-between-inherited-income-and-income-from-work-through-an-inheritance-tax/';
const BATCHELDER_PDF = 'https://www.hamiltonproject.org/wp-content/uploads/2023/01/Batchelder_LO_FINAL.pdf';
const BATCHELDER_WHERE = 'Batchelder (Hamilton Project, 2020), Table 3, revenue raised 2020-30: row, lifetime exemption, revenue';
const age = cmsPerPerson2020;

export const DECLARED_EXCERPTS: Record<string, DeclaredExcerpt> = {
  'TODAY_LEVELS:TPP-1.1': {
    url: 'https://www.pew.org/en/research-and-analysis/reports/2018/10/02/enhanced-patient-matching-critical-to-achieving-full-promise-of-digital-health-records',
    read: READ, kind: 'text',
    excerpts: ['matching within facilities can be as low as 80 percent'],
    figures: [{ source: '80 percent', value: evidence('TPP-1.1')[0]! }]
  },
  'TODAY_LEVELS:TPP-6.3': {
    url: 'https://doi.org/10.1007/s11606-011-1949-5', readAt: EPMC('22183961'), read: READ, kind: 'text',
    excerpts: ['6.8% (79/1163) to 62% (125/202) for laboratory tests'],
    figures: [{ source: '6.8%', value: evidence('TPP-6.3')[0]! }, { source: '62%', value: evidence('TPP-6.3')[1]! }]
  },
  'TODAY_LEVELS:KPP-E5': {
    url: 'https://doi.org/10.1007/s11606-010-1619-z', readAt: EPMC('21336672'), read: READ, kind: 'text',
    excerpts: ['professional interpreters with physicians was infrequent overall (17% at admission'],
    figures: [{ source: '17%', value: evidence('KPP-E5')[0]! }]
  },
  'TODAY_LEVELS:TPP-10.1': {
    url: 'https://www.cms.gov/medicare/health-plans/managedcaremarketing/downloads/provider_directory_review_industry_report_round_3_11-28-2018.pdf',
    read: READ, kind: 'text',
    excerpts: ['48.74% of the provider directory locations listed had at least one inaccuracy'],
    figures: [{ source: '48.74%', value: evidence('TPP-10.1')[0]! }]
  },
  'TODAY_LEVELS:TPP-10.4': {
    url: 'https://doi.org/10.1001/jama.297.8.831', readAt: EPMC('17327525'), read: READ, kind: 'text',
    excerpts: ['a discharge summary at the first postdischarge visit was low (12%-34%)'],
    figures: [{ source: '12%', value: evidence('TPP-10.4')[0]! }, { source: '34%', value: evidence('TPP-10.4')[1]! }]
  },
  'CMS_AGE_PER_CAPITA_2020:allAges': {
    url: CMS_AGE_PAGE, readAt: CMS_AGE_ZIP, read: READ, kind: 'table', where: CMS_AGE_WHERE,
    excerpts: ['Total | 2020 | 10230'], figures: [{ source: '10230', value: CMS_AGE_PER_CAPITA_2020.allAges }]
  },
  'CMS_AGE_PER_CAPITA_2020:0–18': {
    url: CMS_AGE_PAGE, readAt: CMS_AGE_ZIP, read: READ, kind: 'table', where: CMS_AGE_WHERE,
    excerpts: ['0-18 | 2020 | 4217'], figures: [{ source: '4217', value: age('0–18') }]
  },
  'CMS_AGE_PER_CAPITA_2020:19–44': {
    url: CMS_AGE_PAGE, readAt: CMS_AGE_ZIP, read: READ, kind: 'table', where: CMS_AGE_WHERE,
    excerpts: ['19-44 | 2020 | 6669'], figures: [{ source: '6669', value: age('19–44') }]
  },
  'CMS_AGE_PER_CAPITA_2020:45–64': {
    url: CMS_AGE_PAGE, readAt: CMS_AGE_ZIP, read: READ, kind: 'table', where: CMS_AGE_WHERE,
    excerpts: ['45-64 | 2020 | 12577'], figures: [{ source: '12577', value: age('45–64') }]
  },
  'CMS_AGE_PER_CAPITA_2020:65–84': {
    url: CMS_AGE_PAGE, readAt: CMS_AGE_ZIP, read: READ, kind: 'table', where: CMS_AGE_WHERE,
    excerpts: ['65-84 | 2020 | 20503'], figures: [{ source: '20503', value: age('65–84') }]
  },
  'CMS_AGE_PER_CAPITA_2020:85+': {
    url: CMS_AGE_PAGE, readAt: CMS_AGE_ZIP, read: READ, kind: 'table', where: CMS_AGE_WHERE,
    excerpts: ['85+ | 2020 | 35995'], figures: [{ source: '35995', value: age('85+') }]
  },
  'INHERITANCE_FIGURES:exemption': {
    url: BATCHELDER, readAt: BATCHELDER_PDF, read: READ, kind: 'table', where: BATCHELDER_WHERE,
    excerpts: ['Inheritance tax | $2.5 million | $168 billion'],
    figures: [{ source: '$2.5 million', value: INHERITANCE_FIGURES.exemption, scale: 1e6 }]
  },
  'INHERITANCE_FIGURES:windowTotalB': {
    url: BATCHELDER, readAt: BATCHELDER_PDF, read: READ, kind: 'table', where: BATCHELDER_WHERE,
    excerpts: ['Inheritance tax | $2.5 million | $168 billion'],
    figures: [{ source: '$168 billion', value: INHERITANCE_FIGURES.windowTotalB }]
  },
  'INHERITANCE_FIGURES:withRealizationB': {
    url: BATCHELDER, readAt: BATCHELDER_PDF, read: READ, kind: 'table', where: BATCHELDER_WHERE,
    excerpts: ['Inheritance tax and constructive realization on gifts and bequests | $2.5 million | $337 billion'],
    figures: [{ source: '$337 billion', value: INHERITANCE_FIGURES.withRealizationB }]
  },
  'INHERITANCE_FIGURES:estateRepealB': {
    url: BATCHELDER, readAt: BATCHELDER_PDF, read: READ, kind: 'text',
    excerpts: ['repealing the current estate and gift taxes ($284 billion in revenue lost over the period)'],
    figures: [{ source: '$284 billion', value: INHERITANCE_FIGURES.estateRepealB }]
  },
  'INHERITANCE_FIGURES:firstYear': {
    url: BATCHELDER, readAt: BATCHELDER_PDF, read: READ, kind: 'table', where: BATCHELDER_WHERE,
    excerpts: ['Revenue raised, 2020-30'],
    figures: [{ source: '2020', value: INHERITANCE_FIGURES.firstYear }]
  },
  'NHE_2023_PRIVATE_INSURANCE_B:value': {
    url: 'https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/historical',
    readAt: 'https://www.cms.gov/files/zip/nhe-tables.zip', read: READ, kind: 'table',
    where: 'NHE Table 3 (2024 release), source of funds by year, $ billions',
    excerpts: ['Private Health Insurance | 2023 | 1511.2'],
    figures: [{ source: '1511.2', value: NHE_2023_PRIVATE_INSURANCE_B }]
  },
  'NHE_2024_OBSERVED:mid': {
    url: 'https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/historical',
    readAt: 'https://www.cms.gov/files/zip/nhe-tables.zip', read: READ, kind: 'table',
    where: 'NHE Table 1 (2024 release), item by year, $ billions',
    excerpts: ['National Health Expenditures | 2024 | 5278.6'],
    figures: [{ source: '5278.6', value: NHE_2024_OBSERVED.mid }]
  }
};
/* a field the test does not hold to an excerpt, with the reason */
export const DECLARED_NOT_EXCERPTED: Record<string, string> = {
  'INHERITANCE_FIGURES:lastYear': 'the table heading writes the window as 2020-30, which states the year only as 30',
  'NHE_2024_OBSERVED:low': 'CMS states one final figure, so the band is the point (the test holds low and high to mid)',
  'NHE_2024_OBSERVED:high': 'CMS states one final figure, so the band is the point (the test holds low and high to mid)'
};
