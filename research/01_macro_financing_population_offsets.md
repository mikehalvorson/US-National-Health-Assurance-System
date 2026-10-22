# Research: Macro / Financing / Population / Offset Baselines for National Health Assurance Fiscal Simulation

Compiled 2026-07-15. Last revised 2026-10-21.

Compiled 2026-07-15. All figures are the most recent authoritative values found via web research as of this date. Where CMS's most recent *finalized* historical NHE year is 2023 (released Dec 2024/updated 2025), that is used as the calibration base year; CMS's 2024 preliminary and 2024–33 projections are also included. Dollar figures are nominal (current-year) dollars unless noted.

---

## TOT - Total System Baseline (National Health Expenditure)

### RB-01-TOT-001 - Total National Health Expenditure (NHE), latest year
- **Value:** $4,925.3 billion in 2023, as CMS's 2024 release states it (Table 1), the figure `BASE2023.nheTotal` reads since the owner's recalibration of 2026-10-19. The 2023 release (December 2024) gave $4,866.5 billion.
- **Unit:** USD billions, nominal
- **Source:** CMS Office of the Actuary, National Health Expenditure (NHE) Historical Data, 2023 (released Dec 2024). NHE Fact Sheet: https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/nhe-fact-sheet ; Health Affairs summary: https://www.healthaffairs.org/doi/10.1377/hlthaff.2024.01375
- **Confidence/caveat:** Authoritative, official U.S. government accounting standard for health spending. 2023 grew 7.4% over 2022 in CMS's 2024 release (the 2023 release gave 7.5%, against GDP growth of 6.1%). The same release finalizes 2024 at $5,278.6 billion; it was a preliminary estimate of about $5.3T until then.

### RB-01-TOT-002 - NHE as % of GDP
- **Value:** 17.7% (2023), CMS's 2024 release, Table 1 (GDP $27,811.5B). The 2023 release gave 17.6%.
- **Unit:** percent of GDP
- **Source:** Same as RB-01-TOT-001 (CMS NHE Fact Sheet, 2023).
- **Confidence/caveat:** High confidence; this is CMS's headline statistic.

### RB-01-TOT-003 - Per-capita NHE
- **Value:** $14,580 per person (2023), CMS's 2024 release, Table 1 (population 337.8 million). The 2023 release gave $14,570.
- **Unit:** USD per capita
- **Source:** CMS NHE Fact Sheet, 2023. https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/nhe-fact-sheet
- **Confidence/caveat:** High confidence, official CMS calculation (total NHE / Census resident population estimate).

### RB-01-TOT-004 - NHE by category, 2023 (service-type breakdown)
Recalibrated 2026-10-19 (owner): CMS's 2024 release, Table 2, 2023 column, the figures `BASE2023` reads; the last column is what the 2023 release gave. In this release the categories sum to the total exactly, and investment is CMS's own line.
| Category | Amount (2023) | Share of NHE | YoY growth | 2023 release |
|---|---|---|---|---|
| Hospital care | $1,501.1 billion | 30.5% | +10.6% | $1,519.7 |
| Physician & clinical services | $1,026.9 billion | 20.8% | +7.4% | $978.0 |
| Retail prescription drugs | $432.9 billion | 8.8% | +10.8% | $449.7 |
| Other health, residential & personal care | $293.7 billion | 6.0% | +9.7% | $270.2 |
| Nursing care facilities & continuing care retirement communities | $205.0 billion | 4.2% | +8.7% | $211.3 |
| Dental services | $177.5 billion | 3.6% | +6.4% | $173.8 |
| Other professional services (non-physician clinicians) | $166.9 billion | 3.4% | +13.3% | $159.9 |
| Home health care | $153.6 billion | 3.1% | +11.1% | $147.8 |
| Other non-durable medical products | $123.3 billion | 2.5% | +6.9% | $124.1 |
| Durable medical equipment | $81.9 billion | 1.7% | +5.8% | $72.8 |
| Non-medical insurance expenditures (the net cost of insurance) | $313.4 billion | 6.4% | +6.6% | $302.9 |
| Government administration | $57.7 billion | 1.2% | +7.8% | $57.4 |
| Government public health activities | $158.0 billion | 3.2% | -24.3% | $160.2, isolated from a bundled line |
| Investment (research, structures and equipment) | $233.4 billion | 4.7% | +4.2% | $238.7, derived as the rest |
- **Unit:** USD billions, nominal, 2023
- **Sources:** CMS NHE Fact Sheet (https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/nhe-fact-sheet); category detail cross-checked via ACA Signups summary of CMS data (https://acasignups.net/25/01/23/2023-national-health-expenditure-highlights-data-cms) and search of CMS Highlights PDF (https://www.cms.gov/files/document/highlights.pdf).
- **Confidence/caveat:** MEDIUM-HIGH. Core categories (hospital, physician, drugs, nursing, dental, home health) are high-confidence CMS figures. "Government administration" and "net cost of health insurance" are the two lines that map to administrative overhead (see CP-OFF section) - high confidence, directly from CMS. **Research gap:** I was not able to isolate CMS's separate "investment" (structures & equipment) and "noncommercial research" line-item dollar figures from public search results in this session - CMS reports these but I could not extract exact 2023 dollar values; the "Other Third Party Payers and Programs and Public Health Activity" $563.4B figure is a CMS-combined category that bundles public health activity with some other-payer spending, not a clean isolated public-health-only figure. A coding agent should pull the exact NHE Table 2 (National Health Expenditures by Type of Service and Source of Funds) from CMS's downloadable historical NHE zip/Excel files at https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/historical for exact figures on: investment (structures/equipment), noncommercial research, and a clean public health activity number.

### RB-01-TOT-005 - Combined administrative overhead (net cost of insurance + government administration)
- **Value:** $313.4B + $57.7B = **$371.1 billion**, 7.5% of total NHE (2023), CMS's 2024 release (Table 1's combined line). The 2023 release gave $302.9B + $57.4B = $360.3 billion (7.4%).
- **Unit:** USD billions / % of NHE
- **Source:** CMS NHE 2023 category data (as above).
- **Confidence/caveat:** HIGH for the CMS accounting definition, but note this CMS figure is narrower than the "administrative waste" figures cited in single-payer studies (see CP-OFF section), which use broader definitions including provider-side billing/insurance-related costs not captured in this CMS line item.

### RB-01-TOT-006 - Total NHE by payer/funding source, 2023
| Payer | Amount | Share | YoY growth |
|---|---|---|---|
| Private health insurance | $1,511.2 billion | 30.7% | +11.2% |
| Medicare | $1,037.3 billion | 21.1% | +9.0% |
| Medicaid | $873.7 billion | 17.7% | +7.9% |
| Out-of-pocket | $525.4 billion | 10.7% | +6.8% |
- **Source:** CMS's 2024 release, Table 3, 2023 column (recalibrated 2026-10-19; the 2023 release gave $1,464.6B, $1,029.8B, $871.7B and $505.7B).
- **Confidence/caveat:** High confidence.

### RB-01-TOT-007 - NHE by sponsor (who ultimately bears the cost), 2023
| Sponsor | Share |
|---|---|
| Federal government | 31.8% ($1,566.4B) |
| Households | 27.7% ($1,364.9B) |
| Private business | 18.6% ($916.1B) |
| State & local governments | 15.6% ($767.1B) |
| Other private revenues | 6.3% ($310.8B) |
- **Source:** CMS's 2024 release, Table 5 and its detail Tables 5-1 to 5-4, 2023 column (recalibrated 2026-10-19; the 2023 release gave 32%, 27%, 18%, 16% and 7%). The money-flow map's ribbons are sums of the detail tables' rows (`NHE_2023_SPONSOR_ROWS` in `params.ts`).
- **Confidence/caveat:** High confidence; useful for modeling who currently "pays" and thus who would be relieved of spending under a NHA replacement.

### RB-01-TOT-008 - 2024 NHE (next year of data)
- **Value:** Final since CMS's 2024 release (Table 1): $5,278.6 billion, $15,474 per person, 18.0% of GDP (read 2026-10-19; `NHE_2024_OBSERVED` reads it). Before it: NHE projected/preliminary at $5.3 trillion, $15,610 per person, 18.0% of GDP (2024, first year of the 2024–33 CMS projection series, treated by CMS as the projection base year rather than finalized historical)
- **Unit:** USD trillions / per capita / % GDP
- **Source:** CMS National Health Expenditure Projections 2024–33, Forecast Summary: https://www.cms.gov/files/document/nhe-projections-forecast-summary.pdf ; Health Affairs: https://www.healthaffairs.org/doi/10.1377/hlthaff.2025.00545
- **Confidence/caveat:** Medium-high; this is CMS's own projection/estimate for 2024, published alongside the 2024-33 projection series, not yet a fully reconciled historical figure.

### RB-01-TOT-009 - CMS 10-year NHE projections (2024–2033)
- **Value:** NHE projected to grow from $5.3 trillion ($15,610/capita, 18.0% GDP) in 2024 to **$8.6 trillion ($24,200/capita, 20.3% GDP) by 2033**. Average annual growth ~5.6–7.1%/yr, projected to outpace GDP growth throughout the period.
- **Unit:** USD trillions, per-capita USD, % GDP, by year 2024-2033
- **Source:** CMS Office of the Actuary, National Health Expenditure Projections 2024–2033: https://www.cms.gov/files/document/nhe-projections-forecast-summary.pdf ; press release for the prior-year (2023-2032) vintage: https://www.cms.gov/newsroom/press-releases/cms-releases-2023-2032-national-health-expenditure-projections ; Health Affairs: https://www.healthaffairs.org/doi/10.1377/hlthaff.2025.00545
- **Confidence/caveat:** HIGH - this is the standard authoritative 10-year forecast used by CBO, KFF, and virtually all health policy modeling. Note there is a prior vintage (2023–2032 projections, published Dec 2023) that shows a slightly different trajectory ($7.7T by 2032, 19.7% of GDP by 2032) - use the more recent 2024-33 vintage as primary, but the two should be reasonably consistent for cross-validation. A coding agent should pull the full year-by-year table from the CMS "Projected" page: https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/projected

### RB-01-TOT-010 - U.S. GDP (denominator for % GDP calculations)
- **Value:** $29.298 trillion (2024, nominal, annual) → $30.762 trillion (2025, nominal, annual, per BEA); ~$31.9 trillion annualized rate as of mid-2026
- **Unit:** USD trillions, nominal
- **Source:** U.S. Bureau of Economic Analysis (BEA), National Income and Product Accounts, GDP release: https://www.bea.gov/data/gdp/gross-domestic-product ; FRED series GDP: https://fred.stlouisfed.org/series/GDP
- **Confidence/caveat:** High confidence, standard BEA series; needed as the denominator to keep NHE-as-%-of-GDP calculations internally consistent within the simulation across years.

---

## POP - Population / Demographics

### RB-01-POP-001 - Current U.S. population
- **Value:** 341.8 million (July 1, 2025, Census Vintage 2025 estimate, up 0.5% from 2024, as the release states it; read 2026-10-20). This row said ~347.3 million, a figure the release does not state, and ~349.0 million projected for July 1, 2026, which was not re-read
- **Unit:** persons
- **Source:** U.S. Census Bureau, Population and Housing Unit Estimates / Vintage 2025 Population Estimates: https://www.census.gov/programs-surveys/popest.html
- **Confidence/caveat:** High confidence. Note population growth has slowed sharply (+0.5%, the slowest since early COVID) due to declining net international migration (2.7M → ~1.3M/yr) and low fertility (~1.58 births/woman, below the 2.1 replacement rate) - relevant for long-run cost/revenue-base projections in the simulation.

### RB-01-POP-002 - Projected population, 10–15 years out
- **Value:** ~355 million by 2040; ~364 million by 2056
- **Unit:** persons
- **Source:** U.S. Census Bureau Population Projections program: https://www.census.gov/programs-surveys/popproj.html ; cross-check via CBO Demographic Outlook: https://www.cbo.gov/publication/61994 (2026-2056 vintage) and https://www.cbo.gov/publication/61164 (2025-2055 vintage)
- **Confidence/caveat:** Medium-high; Census Bureau's own long-range projections were last formally updated a few years ago and growth has been running below the earlier projection path (see RB-01-POP-001 slowdown), so CBO's more frequently updated Demographic Outlook (revised annually) is a good cross-check/adjustment source. A coding agent should pull CBO's most recent Demographic Outlook table directly for a year-by-year population path consistent with current immigration/fertility trends.

### RB-01-POP-003 - Age 65+ share, current and projected
- **Value:** ~71 million (>20% of population) by 2030 ("Peak 65" - all Baby Boomers turn 65 by 2030); ~78.3 million (22% of population) by 2040
- **Unit:** persons / % of total population
- **Source:** U.S. Census Bureau: "By 2030, All Baby Boomers Will Be Age 65 or Older" https://www.census.gov/library/stories/2019/12/by-2030-all-baby-boomers-will-be-age-65-or-older.html ; AARP summary of Census data: https://www.aarp.org/family-relationships/census-baby-boomers-fd/ ; Urban Institute: https://www.urban.org/policy-centers/cross-center-initiatives/program-retirement-policy/projects/data-warehouse/what-future-holds/us-population-aging
- **Confidence/caveat:** High confidence directional trend (aging is well-established and near-certain given already-born cohorts); exact 2030/2040 percentages vary slightly by source vintage (~20-22%). This aging trend is a critical cost driver for the simulation since per-capita health spending rises sharply with age.

### RB-01-POP-004 - Uninsured rate and count
- **Value:** Two commonly-cited but methodologically different measures for 2024:
- **Census Bureau (CPS ASEC), total population:** 8.0% uninsured (a near-historic low), held steady from 2023
- **KFF/Census ACS analysis, population under age 65:** 26.7 million uninsured (up 1.3M from 2023), rate rose from 9.5% to 9.8% - first increase since 2019, driven by Medicaid unwinding (end of pandemic continuous-enrollment provision)
- **Unit:** persons / % of population
- **Source:** KFF, "Key Facts about the Uninsured Population" (2024 data): https://www.kff.org/uninsured/key-facts-about-the-uninsured-population/ ; Fierce Healthcare summary of Census CPS data: https://www.fiercehealthcare.com/regulatory/census-bureau-8-americans-were-uninsured-2024 ; KFF Quick Take: https://www.kff.org/quick-take/2024-uninsured-rate-held-steady-as-aca-marketplace-enrollment-offset-medicaid-declines/
- **Confidence/caveat:** MEDIUM-HIGH but flag the measurement discrepancy explicitly in the simulation docs - Census CPS ASEC (all ages, ~8.0%) vs. KFF/ACS (under-65 only, ~9.8%) are not directly comparable numbers; a coding agent should pick one consistent source/definition for the "uninsured to be covered" population input (this is a core input driving new utilization/cost under NHA). Also note 2025-2026 uninsured rates likely rose further amid continued Medicaid unwinding and expiration of enhanced ACA subsidies (would need a fresh KFF/Census check for most current point).

### RB-01-POP-005 - Current insurance coverage breakdown (2023 KFF data, most complete full breakdown found)
- **Value (approximate shares of total population):**
- Employer-sponsored insurance: ~49% (nearly half)
- Medicaid: ~20% ("about 1 in 5")
- Medicare: ~15%
- Non-group/ACA Marketplace + off-marketplace private: ~6%
- Military (TRICARE/VA): ~1%+
- Uninsured: ~7.9-8% (2023); rose in 2024 per RB-01-POP-004
- **Unit:** % of total U.S. population
- **Source:** KFF, "Health Policy 101: The Uninsured Population and Health Coverage": https://www.kff.org/uninsured/health-policy-101-the-uninsured-population-and-health-coverage/ ; KFF 2024 Employer Health Benefits Chart Pack: https://www.kff.org/health-costs/2024-employer-health-benefits-chart-pack/
- **Confidence/caveat:** Medium-high; shares are approximate/rounded in the source commentary rather than a single precise KFF table row - a coding agent should pull KFF's exact "Health Insurance Coverage of the Total Population" table (https://www.kff.org/state-health-policy-data/state-indicator/total-population/) for precise percentages by category and year, since these shift a percentage point or two year to year (Medicaid share fell, private/direct-purchase share rose 2023→2024 per KFF).

### RB-01-POP-006 - Chronic disease prevalence: Obesity
- **Value:** 40.3% of U.S. adults (age-adjusted, Aug 2021–Aug 2023); 39.2% men, 41.3% women; severe obesity rose from 7.7% to 9.7% over the prior decade
- **Unit:** % of adults
- **Source:** CDC/NCHS Data Brief No. 508, "Obesity and Severe Obesity Prevalence in Adults: United States, August 2021–August 2023" (Sept 2024): https://www.cdc.gov/nchs/products/databriefs/db508.htm ; PDF: https://www.cdc.gov/nchs/data/databriefs/db508.pdf
- **Confidence/caveat:** High confidence, authoritative NHANES-based CDC estimate.

### RB-01-POP-007 - Chronic disease prevalence: Diabetes
- **Value:** Prevalence varies sharply by weight status: total diabetes prevalence 6.8% (normal/underweight) → 12.3% (overweight) → 24.2% (adults with obesity); diagnosed diabetes 5.2% → 9.5% → 16.3% across the same weight categories. (Overall adult total-diabetes prevalence blending all groups is commonly cited elsewhere as ~14-15% of adults but the CDC brief located here reports by weight-status subgroup rather than a single topline overall %.)
- **Unit:** % of adults
- **Source:** CDC/NCHS Data Brief, "Prevalence of Total, Diagnosed, and Undiagnosed Diabetes in Adults: United States, August 2021–August 2023": https://www.ncbi.nlm.nih.gov/books/NBK612760/
- **Confidence/caveat:** Medium-high; the source found breaks data out by weight status rather than a single clean topline adult prevalence figure - a coding agent should pull CDC's National Diabetes Statistics Report (https://www.cdc.gov/diabetes/php/data-research/) for the standard single "X% of U.S. adults have diabetes" topline figure (commonly ~11.6-14.7% total/diagnosed+undiagnosed in recent years) for direct use as a simulation input.

### RB-01-POP-008 - Chronic disease prevalence: Hypertension
- **Value:** 47.7% of adults (crude, Aug 2021–Aug 2023); 44.5% age-adjusted; 50.8% men vs. 44.6% women; rises steeply with age - 23.4% (18-39), 52.5% (40-59), 71.6% (60+); highest among non-Hispanic Black adults (58.0%)
- **Unit:** % of adults
- **Source:** CDC/NCHS Data Brief No. 511, "Hypertension Prevalence, Awareness, Treatment, and Control Among Adults Age 18 and Older: United States, August 2021–August 2023" (Oct 2024): https://www.cdc.gov/nchs/products/databriefs/db511.htm ; PDF: https://www.cdc.gov/nchs/data/databriefs/db511.pdf
- **Confidence/caveat:** High confidence, authoritative NHANES-based CDC estimate; the strong age-gradient is valuable for tying chronic-disease cost loading to the population's age distribution (RB-01-POP-003) in the simulation.

### RB-01-POP-009 (NEW, proposed) - Age-based per-capita health spending multiplier
- **Description:** Per-capita health spending is dramatically higher for the 65+ population than working-age population - a standard finding used in essentially all actuarial/CBO health modeling (Medicare beneficiaries' per-capita costs run several multiples of under-65 per-capita costs).
- **Value:** Answered 2026-10-19 (owner's approval of the download): CMS, *Health Expenditures by Age and Sex*, Age and Sex Tables (`ageandgendertables.zip`, cms.gov, tables dated 2024-03-27), Table 7, personal health care spending per person, 2020: all ages $10,230; 0-18 $4,217; 19-44 $6,669; 45-64 $12,577; 65+ $22,356 (65-84 $20,503; 85+ $35,995). Over the all-ages figure that is 0.41, 0.65, 1.23, 2.00 and 3.52, the weights `AGE_STRUCTURE` reads. 65+ ($22,356) runs 2.2 times the all-ages figure; an under-65 average needs each band's population, which this table does not state, so it is not computed here. 2020 is the latest year CMS publishes by age.
- **Unit:** ratio (65+ per-capita cost ÷ under-65 per-capita cost)
- **Source:** Not found in this pass - recommend pulling from CMS NHE age-and-gender-specific spending estimates (CMS periodically publishes "Health Expenditures by Age and Gender" tables) or MedPAC Data Book (https://www.medpac.gov/document-type/databook/), which was referenced in searches above (July 2024/2025 MedPAC Data Book Section 1).
- **Confidence/caveat:** High for the per-person figures (CMS's own table). The 2020 curve is a pandemic year, when deferred care lowered some working-age spending; CMS's 2018 column gives the same ordering (85+ at 3.7 times the all-ages $9,249). Used only in the growth-decomposition note, never in the engine (`baselineRealGrowth` already carries ageing).

### RB-01-POP-010 (NEW, proposed) - Net international migration trend
- **Value:** Declined from ~2.7 million/year to ~1.3 million/year in a single year (2024→2025)
- **Unit:** persons/year (net migration)
- **Source:** U.S. Census Bureau Vintage 2025 Population Estimates (as cited in RB-01-POP-001 search results); same URL: https://www.census.gov/programs-surveys/popest.html
- **Confidence/caveat:** Medium; relevant because immigration policy volatility directly affects the size of the covered population and the tax/contribution base in a NHA financing model - worth an explicit sensitivity parameter rather than assuming Census's baseline projection holds.

---

## FIN - Financing / Tax Capacity

### RB-01-FIN-001 - Federal Medicare spending (net, to be "redirected")
- **Value:** ~$988 billion (2025, per CRFB/CBO baseline commentary)
- **Unit:** USD billions/year
- **Source:** CBO baseline as summarized by Committee for a Responsible Federal Budget: https://www.crfb.org/blogs/cbo-projects-high-federal-health-program-costs ; cross-check against CMS NHE Medicare figure of $1,029.8B (2023, total Medicare spending including beneficiary premiums, not just federal net cost) - https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/nhe-fact-sheet
- **Confidence/caveat:** MEDIUM - figures for "federal Medicare spending" vary depending on whether gross benefit spending, net-of-premium spending, or NHE-basis Medicare spending is used. A coding agent should pull the exact CBO baseline table (Medicare Baseline, https://www.cbo.gov/topics/health-care/medicare) for the precise net-federal-outlay figure for the target simulation year, and reconcile against the CMS NHE Medicare figure, which is a different (broader, total-spending) accounting concept.

### RB-01-FIN-002 - Federal Medicaid spending (federal share)
- **Value:** $614 billion (FY2023 federal share of $894B total); $618 billion (FY2024 federal share of ~$914-940B total, ~64% federal share per NASBO)
- **Unit:** USD billions/year
- **Source:** Pew Charitable Trusts, "The Share of State Budgets Spent on Medicaid...": https://www.pew.org/en/research-and-analysis/articles/2025/06/16/the-share-of-state-budgets-spent-on-medicaid-posts-largest-annual-increase-in-20-years ; KFF, "Federal and State Share of Medicaid Spending": https://www.kff.org/medicaid/state-indicator/federalstate-share-of-spending/
- **Confidence/caveat:** High-medium confidence; figures are close across sources ($614-618B federal share) but exact federal/state split varies by state (FMAP formula) and year - the KFF State Health Facts tool gives state-by-state and national totals with more granularity.

### RB-01-FIN-003 - Total (federal + state) Medicaid spending
- **Value:** $894 billion (FY2023); ~$914 billion (FY2024, NASBO)
- **Unit:** USD billions/year
- **Source:** Pew (FY2023 figure, https://www.pew.org/en/research-and-analysis/articles/2025/06/16/the-share-of-state-budgets-spent-on-medicaid-posts-largest-annual-increase-in-20-years) and NASBO-sourced FY2024 figure via Governing.com summary (https://www.governing.com/finance/ahead-of-federal-cuts-state-medicaid-costs-already-soaring); cross-check against CMS NHE Medicaid figure of $871.7B (2023, NHE accounting basis) - https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/nhe-fact-sheet
- **Confidence/caveat:** Medium; note CMS NHE-basis Medicaid ($873.7B for 2023 in CMS's 2024 release; $871.7B in the 2023 release) and CMS/state-budget-basis Medicaid ($894B) differ slightly due to different accounting scopes (NHE excludes some administrative and non-medical Medicaid spending categories) - pick one consistent source for the simulation.

### RB-01-FIN-004 - State/local Medicaid spending ("state maintenance of effort" proxy)
- **Value:** $280 billion (FY2023, state share of Medicaid, 31% of total); $294.1 billion of state's *own* resources in FY2023 (up 17.8%/$44.4B YoY - largest single-year jump in 20 years, per Pew/NASBO); ~$326 billion (FY2024, 36% nonfederal share)
- **Unit:** USD billions/year
- **Source:** Pew Charitable Trusts (NASBO-sourced): https://www.pew.org/en/research-and-analysis/articles/2025/06/16/the-share-of-state-budgets-spent-on-medicaid-posts-largest-annual-increase-in-20-years
- **Confidence/caveat:** Medium-high; this is the most directly relevant figure for modeling a "state maintenance-of-effort" contribution mechanism (a design feature common to actual M4A-style bills, e.g. requiring states to redirect current Medicaid state-share spending toward the new federal program). Note the sharp recent increase (COVID aid expiration + cost growth) means this number is trending up quickly.

### RB-01-FIN-005 - ACA marketplace subsidies (federal)
- **Value:** ~$140 billion (2025, CBO baseline per CRFB summary)
- **Unit:** USD billions/year
- **Source:** CRFB summary of CBO baseline: https://www.crfb.org/blogs/cbo-projects-high-federal-health-program-costs ; also see CBO, "CBO's Baseline Projections of Federal Subsidies for Health Insurance": referenced via https://www.cbo.gov/system/files/2026-05/62380-Federal-Health-Subsidies.pdf
- **Confidence/caveat:** MEDIUM - ACA subsidy spending is highly policy-sensitive right now (enhanced premium tax credits enacted under the Inflation Reduction Act were set to expire; 2025 reconciliation law also changed marketplace rules) - a coding agent should get the latest CBO baseline vintage (the May 2026 CBO presentation "Federal Health Subsidies" found at the URL above looks like the most current source) since this figure could swing significantly between baseline vintages depending on subsidy-extension policy.

### RB-01-FIN-006 - CHIP spending
- **Value:** Bundled with Medicaid in most CBO summaries found ("Medicaid and CHIP combined: $691 billion in 2025" per CRFB/CBO baseline commentary); CHIP alone was not isolated in this research pass.
- **Unit:** USD billions/year
- **Source:** CRFB/CBO baseline summary: https://www.crfb.org/blogs/cbo-projects-high-federal-health-program-costs
- **Confidence/caveat:** GAP - CHIP-only figure (~$20B/year range historically) not isolated in this pass; recommend pulling CBO's Medicaid and CHIP topic page directly: https://www.cbo.gov/topics/health-care/medicaid-and-chip

### RB-01-FIN-007 - Federal Employees Health Benefits (FEHB) program spending
- **Value:** ~$70 billion (2024), covering 8+ million federal employees/retirees/dependents; note a GAO report flagged potential fraud/ineligible-participant spending up to $1 billion/year
- **Unit:** USD billions/year
- **Source:** Search-aggregated figure citing OPM data; GAO report: https://www.gao.gov/products/gao-25-106885 ; OPM program page: https://www.opm.gov/healthcare-insurance/healthcare
- **Confidence/caveat:** MEDIUM - the $70B figure came from an aggregated web search summary rather than a directly quoted primary OPM/OMB budget document; a coding agent should verify against the OPM FEHB actuarial/budget report or OMB budget appendix (Function 550/570 health accounts) for a precise, citable figure.

### RB-01-FIN-008 - VA health care spending
- **Value:** VA Medical Care discretionary funding ~$112.6 billion (FY2025 budget request); VA total budget (all functions, not just medical care) ~$368-400+ billion (FY2025)
- **Unit:** USD billions/year
- **Source:** VA FY2025 Budget in Brief: https://department.va.gov/wp-content/uploads/2024/03/fy-2025-va-budget-in-brief.pdf ; American Legion summary: https://www.legion.org/information-center/news/veterans-healthcare/2025/june/va-budget-tops-400-billion-for-2025-from-higher-spending-on-mandated-benefits-medical-care
- **Confidence/caveat:** MEDIUM-HIGH - be careful to isolate VA *medical care* spending (~$112-135B range depending on year/vintage) from VA's *total* budget (~$370-400B), which includes disability compensation, pensions, and other non-health benefit payments not relevant to a health-system-replacement simulation. Use the Medical Care Major Budget Account specifically.

### RB-01-FIN-009 - TRICARE / Defense Health Program (Military Health System) spending
- **Value:** Defense Health Program account ~$40.3 billion (FY2025 request); broader Military Health System (including personnel costs embedded elsewhere in DoD budget) ~$61.4 billion (7.2% of total DoD budget), serving 9.6 million beneficiaries
- **Unit:** USD billions/year
- **Source:** Congressional Research Service, "FY2025 Budget Request for the Military Health System": https://www.congress.gov/crs-product/IF12660
- **Confidence/caveat:** Medium-high; DHP account figure ($40.3B) is the cleaner "redirectable federal health spending" number; the broader MHS figure ($61.4B) includes military personnel/uniformed provider costs that may or may not be considered "redirectable" depending on simulation design choices (active-duty care might need to stay separate from a civilian NHA).

### RB-01-FIN-010 - Total federal spending on health programs to be "redirected" (aggregate)
- **Value:** Roughly $1.8 trillion/year in core federal health entitlement spending alone (Medicare + Medicaid/CHIP + ACA subsidies, per CBO/CRFB), rising to roughly **$2.0-2.1 trillion/year** if FEHB (~$70B), VA medical care (~$113-135B), and DHP/TRICARE (~$40-61B) are added.
- **Unit:** USD trillions/year
- **Source:** Synthesized from RB-01-FIN-001 through RB-01-FIN-009 above (CBO/CRFB baseline + VA + DoD sources).
- **Confidence/caveat:** MEDIUM - this is a derived/summed figure, not a single official "total redirectable federal health spending" line item; a coding agent should treat each component separately and sum with explicit assumptions (e.g., whether active-duty military and incarcerated-population health care stay outside NHA) documented in the simulation rather than relying on this single blended figure.

### RB-01-FIN-011 - Employer-sponsored insurance: national premium spending
- **Value:** Average premiums (2025): $9,325/year single coverage, $26,993/year family coverage (both premiums up 6% vs. 2024, family). Average **employer** contribution: $20,143/year for family coverage (workers contribute the remaining $6,850, or ~26% of the family premium; workers pay ~16% of single-coverage premium).
- **Unit:** USD per covered employee/family, per year (average); national aggregate total not directly stated in the source (would need to multiply by ~155-160 million covered employer-plan enrollees)
- **Source:** KFF 2025 Employer Health Benefits Survey: https://www.kff.org/health-costs/2025-employer-health-benefits-survey/ ; Summary of Findings PDF: https://files.kff.org/attachment/Employer-Health-Benefits-Survey-2025-Annual-Survey-Summary-of-Findings.pdf
- **Confidence/caveat:** HIGH confidence on the per-employee average figures (this is the standard annual authoritative survey used across health policy). GAP: I did not find a single clean "national aggregate employer health spending, all employers, total $" figure in this pass - that would need to be derived (average premium × number of covered workers/dependents, adjusting for self-insured vs. fully-insured employers) or pulled from CMS NHE's "private business" sponsor share of NHE, which was 18% of $4,866.5B = **~$876 billion in 2023** (see RB-01-TOT-007) as a reasonable proxy for national employer-borne health cost.

### RB-01-FIN-012 - Warren 2019 Medicare for All financing plan
- **Value:** Plan aimed to raise **$20.5 trillion in new federal revenue over 10 years**, working from a starting point of the Urban Institute's $34 trillion/10-year federal cost estimate, reduced by ~$13 trillion in assumed savings (administrative cost reduction, provider payment changes, drug cost reduction, and redirecting ~$6 trillion of existing state/local health spending), covered via: raising a wealth tax to 6% on fortunes over $1B, taxing capital gains of the top 1% as ordinary/earned income (paid annually), ~$2.9 trillion in new corporate/foreign-earnings taxes, a 0.1% financial transactions tax, and $2.3 trillion from IRS enforcement/tax-gap closure targeting high earners.
- **Unit:** USD trillions, cumulative over 10 years
- **Source:** NPR: https://www.npr.org/2019/11/01/775339519/heres-how-warren-finds-20-5-trillion-to-pay-for-medicare-for-all ; NBC News: https://www.nbcnews.com/politics/2020-election/elizabeth-warren-releases-her-plan-finance-medicare-all-n1074981 ; Warren campaign plan document (may be archived): https://elizabethwarren.com/plans/paying-for-m4a ; Tax Foundation analysis: https://taxfoundation.org/blog/elizabeth-warren-medicare-for-all-tax-proposals/
- **Confidence/caveat:** MEDIUM - this is a campaign proposal, not an independently-scored government estimate; the $13 trillion of assumed savings and specific revenue-raiser yields were contested by outside analysts (Tax Foundation, Mercatus, and others raised questions about the wealth tax and corporate tax revenue assumptions in particular). Useful as an illustrative real-world financing mix and revenue-raiser menu, not as a validated baseline.

### RB-01-FIN-013 - PERI (Pollin et al.) Medicare for All financing study
- **Value:** 2018 study (analyzing S.1804, the 2017 Sanders M4A Act) found total system-wide health spending would **fall** from $3.24 trillion to $2.93 trillion (a reduction), with $1.88 trillion financed by redirected existing public revenue, leaving a **$1.05 trillion/year gap** to be raised via new revenue (four financing options identified sufficient to create a 1% funding surplus). A 2019 follow-up letter to Sen. Sanders updated this to a **10-year (2017-2026) figure of $13.5 trillion in new public revenue needed**, against $37.8 trillion in total 10-year system costs and $24.2 trillion in redirected existing public revenue.
- **Unit:** USD trillions (annual and 10-year cumulative)
- **Source:** Political Economy Research Institute (PERI), UMass Amherst, "Economic Analysis of Medicare for All" (Pollin, Heintz, Arno, Wicks-Lim, Ash, 2018): https://peri.umass.edu/component/k2/item/1127-economic-analysis-of-medicare-for-all ; PNHP mirror: https://pnhp.org/resource/economic-analysis-of-medicare-for-all/ ; 2019 Pollin open letter to Sanders: https://peri.umass.edu/wp-content/uploads/joomla/images/Pollin--Open_Letter_to_Sen_Sanders_re_Medicare_for_All_funding---10-7-19.pdf
- **Confidence/caveat:** MEDIUM - an independent academic economic analysis (not government-scored), widely cited by single-payer advocates; assumes substantial administrative savings and cost-control levers (global budgets, drug price negotiation) that are optimistic relative to CBO's more cautious ranges (compare RB-01-FIN-015). Good as an alternative/comparison scenario, not as the sole baseline.

### RB-01-FIN-014 - Saez & Zucman wealth tax revenue estimates
- **Value:** For a wealth tax targeting the top 0.1% (wealth base estimated at $9-13 trillion depending on measurement), a structure combining 2% above $50M plus an extra 4% above $1B (6% total marginal rate on billionaire wealth) was estimated to raise **$351 billion in a single year (2023 estimate)**, assuming a 15% avoidance/evasion rate. A lower-rate variant (extra 1% above $1B, 3% total marginal rate) would raise correspondingly less.
- **Unit:** USD billions/year
- **Source:** Saez & Zucman (UC Berkeley), "Wealth Tax Revenue Estimates" memo prepared for Sen. Warren, Feb 2021: https://www.warren.senate.gov/imo/media/doc/Wealth%20Tax%20Revenue%20Estimates%20by%20Saez%20and%20Zucman%20-%20Feb%2024%2020211.pdf (mirror: https://eml.berkeley.edu/~saez/saez-zucman-wealthtax-warren-feb21.pdf); related 2019/2026 memos for Sen. Sanders: https://www.sanders.senate.gov/wp-content/uploads/saez-zucman-sanders2026wealthtax.pdf
- **Confidence/caveat:** MEDIUM - independent academic estimate commissioned for specific Senate offices (Warren/Sanders), not a CBO/JCT score; wealth tax revenue estimates are highly sensitive to avoidance/evasion assumptions and have been disputed by other economists (e.g., some argue realistic avoidance would be much higher than 15%, materially reducing yield). Useful as one input to a "wealth tax as NHA funding source" scenario, with wide error bars.

### RB-01-FIN-015 - CBO "single-payer options" federal cost/budget estimate (most authoritative direct comparison)
- **Value:** CBO's Dec 2020 working paper (updated/companion analyses through 2021-2022) modeled five illustrative single-payer options and found: **federal subsidies for health care in 2030 would increase by $1.5 trillion to $3.0 trillion** (a single year, not cumulative 10-year) relative to current-law projected federal subsidies, depending on plan design (payment rates, cost-sharing, LTSS coverage). Overall **national health expenditures in 2030 would change by a range of –$0.7 trillion to +$0.3 trillion** relative to current-law NHE projections - i.e., CBO found total system-wide spending could modestly *decrease* under most of the illustrative designs (due to lower provider payment rates and reduced administrative spending), except the option including a large new long-term-services-and-supports (LTSS) benefit, which CBO estimated would raise NHE by about 4.4% above current-law projected levels.
- **Unit:** USD trillions, single-year (2030) federal subsidy change and NHE change
- **Source:** CBO Working Paper 2020-08, "How CBO Analyzes the Costs of Proposals for Single-Payer Health Care Systems That Are Based on Medicare's Fee-for-Service Program" (Dec 2020): https://www.cbo.gov/publication/56811 (PDF direct link returned 403 in automated fetch; access via publication page) ; companion "Key Design Components and Considerations for Establishing a Single-Payer Health Care System" (2019): https://www.cbo.gov/publication/55150 ; follow-up "Economic Effects of Five Illustrative Single-Payer Health Care Systems" Working Paper 2022-02: https://www.cbo.gov/publication/57637 ; PNHP summary/commentary: https://pnhp.org/news/cbo-report-on-medicare-for-all/ and Health Affairs Forefront commentary: https://www.healthaffairs.org/do/10.1377/forefront.20210210.190243
- **Confidence/caveat:** **HIGHEST CONFIDENCE / MOST AUTHORITATIVE SOURCE FOR CROSS-CHECKING THE FRAMEWORK'S CLAIMS.** This is the CBO's own methodology and estimate - the single most citable, non-partisan government source directly on point for a single-payer costing exercise. Key caveat: CBO's headline numbers here are (a) for a single year (2030), not a 10-year cumulative total like the Urban Institute/Mercatus/Warren figures, and (b) measure the *federal subsidy increase* (i.e., cost shifted onto the federal budget), not total new taxes needed, and are explicitly described by CBO as illustrative/methodological rather than a score of any specific actual bill. **Direct comparison to the framework's "$4.75T" claim:** that figure is not directly reproduced by any of the sources found here - it is closest in order of magnitude to (a) 4-5 years' worth of CBO's ~$1.5-3.0T/year 2030 federal-subsidy-increase range if extrapolated across a couple of years, or (b) roughly the CMS actual total NHE for 2024 ($5.3T) or 2033 projection nearing $8.6T. A coding agent should NOT assume $4.75T maps cleanly onto any of these citations - recommend explicitly deriving whatever the framework's $4.75T figure is supposed to represent (total system NHE? net new federal spending? net new tax revenue needed?) and then choosing the correct comparator from this list.

### RB-01-FIN-016 - Urban Institute / Mercatus alternative 10-year cost estimates (cross-check triangulation)
- **Value:** Three additional independent 10-year total-federal-cost estimates for Medicare-for-All-style plans, useful for triangulating a defensible range:
- **Urban Institute (2019, with Commonwealth Fund):** ~$34 trillion increase in federal spending over 10 years (net ~$32T after ~$2T of new revenue baked into their model); total national health spending would rise more modestly, from a projected $52T (current law) to $59T over the same 10 years (a $7T total-system increase, much smaller than the federal number because it's offset by ~$27T of reduced non-federal - household/employer/state - spending). Range across design variants: $27.5T–$35T (federal).
- **Mercatus Center (Blahous, 2018):** ~$32.6 trillion added to federal budget commitments over 10 years (2022-2031 window as originally modeled) - explicitly described by the author as a lower-bound/best-case estimate (i.e., true cost likely higher).
- **Unit:** USD trillions, cumulative 10-year, federal budget basis
- **Source:** Urban Institute: https://www.urban.org/urban-wire/dont-confuse-changes-federal-health-spending-national-health-spending ; KFF Health News fact-check: https://kffhealthnews.org/elections/does-medicare-for-all-cost-more-than-the-entire-budget-biden-says-so-but-numbers-say-no/ ; Mercatus/Blahous: https://www.mercatus.org/research/working-papers/costs-national-single-payer-healthcare-system ; Time coverage: https://time.com/5352950/medicare-trillions-bernie-sanders/
- **Confidence/caveat:** MEDIUM-HIGH for directional triangulation - Urban Institute (left-leaning think tank) and Mercatus (libertarian-leaning) arrive at strikingly similar ~$32-34T federal 10-year cost figures despite different institutional priors, which is a notable convergence worth flagging to whoever calibrates the framework. Both explicitly separate "federal cost" from "total national health spending change" - the framework's simulation should be careful to specify which of these two concepts its own headline numbers represent.

### RB-01-FIN-017 - Federal government overall fiscal capacity (denominator/context for financing feasibility)
- **Value:** Federal revenues ~$5.2 trillion (17.1% of GDP), federal outlays ~$7.0 trillion (23.3% of GDP), deficit ~$1.8-1.9 trillion, all FY2025
- **Unit:** USD trillions/year, % of GDP
- **Source:** CBO, "Monthly Budget Review: Summary for Fiscal Year 2025": https://www.cbo.gov/publication/61307 ; CBO "Budget and Economic Outlook: 2025 to 2035": https://www.cbo.gov/publication/60870 ; CRFB summary: https://www.crfb.org/blogs/cbo-estimates-2025-deficit-totaled-18-trillion
- **Confidence/caveat:** High confidence, standard CBO baseline figures; essential context for assessing whether any of the financing packages above (RB-01-FIN-012 through RB-01-FIN-016) are plausible relative to the existing scale of federal taxation and spending.

### RB-01-FIN-018 (NEW, proposed) - CBO IRA drug negotiation savings (also relevant to CP-OFF, cross-listed)
- See RB-01-OFF-003 below for full detail - flagging here because it is also a "financing/offset capacity" figure relevant to a NHA's drug-pricing lever.

### RB-01-FIN-019 (NEW, proposed) - Payroll tax base for financing comparison
- **Description:** Existing Medicare payroll (FICA/HI) tax raises a known, well-documented amount and rate (2.9% combined employer+employee, +0.9% additional Medicare tax above $200K/$250K thresholds) - useful as a baseline "known-working" financing mechanism to calibrate how much a broader-based payroll tax could raise for NHA.
- **Value:** Not independently verified with a fresh citation in this pass (widely known: current HI payroll tax raises roughly $300-350B/year at 2.9%, implying each additional percentage point of a similarly-structured broad payroll tax raises on the order of $100-120B/year, given a roughly $10-11 trillion/year covered wage base) - **this specific figure should be re-verified against current CMS Trustees Report or CBO payroll tax revenue tables before use**, it is given here only as an order-of-magnitude placeholder, not a cited fact.
- **Unit:** USD billions per percentage point of payroll tax
- **Source:** GAP - not verified with a live citation in this pass; recommend pulling from the Social Security/Medicare Trustees Report (https://www.cms.gov/oact/tr/) HI payroll tax revenue tables, or CBO's payroll tax revenue projections.
- **Confidence/caveat:** LOW/UNVERIFIED - flagged explicitly as an estimate from general knowledge, not sourced in this research pass. Do not use without independent verification.

### RB-01-FIN-020 (NEW, proposed) - CMS NHE sponsor-share proxy for "household out-of-pocket burden relief"
- **Value:** Households sponsored 27.7% of NHE in 2023 ($1,364.9 billion, CMS's 2024 release, Table 5-2; the 2023 release gave 27%, about $1.31 trillion), combining out-of-pocket spending ($525.4B) plus the household-borne share of premiums for private insurance, Medicare Part B/D premiums, etc.
- **Unit:** USD billions / % of NHE
- **Source:** Derived from CMS NHE Fact Sheet 2023 sponsor-share data (RB-01-TOT-007): https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/nhe-fact-sheet
- **Confidence/caveat:** Medium - this is a derived figure (27% share × total NHE) rather than a directly reported dollar amount from CMS in this exact form; useful for modeling household financial relief under NHA (a common selling point of single-payer proposals - eliminating premiums/OOP costs in exchange for taxes) and cross-checking that new tax burden estimates are being fairly compared against the household costs they'd replace.

---

## OFF - System-Wide Savings Offsets

### RB-01-OFF-001 - Administrative cost comparison: private insurance vs. Medicare/single-payer (classic Himmelstein & Woolhandler line of research)
- **Value:** Multiple studies, several vintages:
- Woolhandler, Campbell & Himmelstein, NEJM 2003 ("Costs of Health Care Administration in the United States and Canada"): administrative costs consumed **31% of U.S. health spending** vs. much lower in single-payer Canada.
- Himmelstein et al., Health Affairs 2014, cross-national hospital administrative cost comparison: U.S. hospital administrative costs = **25.3% of total hospital expenditures** (highest of 8 nations studied), vs. Netherlands 19.8%, England 15.5%, Canada/Scotland much lower.
- Updated 2020 Annals of Internal Medicine analysis (Himmelstein/Woolhandler, examining 2017 data): total U.S. health administration cost estimated at **$1.1 trillion**.
- **Unit:** % of spending; USD trillions (total administrative cost, broadest definition)
- **Source:** NEJM 2003: https://www.nejm.org/doi/full/10.1056/NEJMsa022033 ; Health Affairs 2014 (hospital cross-national): https://www.healthaffairs.org/doi/10.1377/hlthaff.2013.1327 ; PNHP summary of 2020 update: https://pnhp.org/news/landmark-administrative-waste-study-updated/ ; NEJM 1991 earlier version (historical): https://www.nejm.org/doi/full/10.1056/NEJM199105023241805
- **Confidence/caveat:** MEDIUM-HIGH for the directional finding (U.S. administrative costs are unusually high by international standards - this is broadly uncontested), but the Himmelstein/Woolhandler research program uses an intentionally broad definition of "administrative cost" (including significant provider-side billing/insurance-related costs, not just insurer overhead) that is larger than CMS's narrower "net cost of health insurance + government administration" NHE line items ($360.3B, RB-01-TOT-005). The $1.1 trillion (2017 data) figure is the broadest, most-cited "total administrative waste" number from this research group but is disputed by some health economists as potentially overstating recoverable savings (much of "administrative cost" reflects real functions - quality reporting, utilization review, fraud prevention - that wouldn't disappear entirely under single-payer).

### RB-01-OFF-002 - Estimated national savings from eliminating private-insurance administrative duplication (comparative range across studies)
- **Value:** A cluster of estimates in the literature, from lowest to highest: **$204 billion, $230 billion, $350-375 billion, and $400-500 billion/year**, plus a Friedman-associated study estimating **$450 billion/year** in total system savings from a Medicare-for-All-style consolidation (this figure includes non-administrative savings like drug pricing, not just admin). The oft-cited "$350B, ~15% of NHE" and "~$500B, cutting to Canadian admin levels" figures both come from the Himmelstein/Woolhandler research tradition; the PERI 2018 study (RB-01-FIN-013) implicitly assumes a comparable magnitude of administrative savings within its overall $310B/year total systemic-savings estimate (the gap between $3.24T current spending and $2.93T post-reform spending in their model).
- **Unit:** USD billions/year
- **Source:** New Republic summary of a PNHP/Himmelstein-Woolhandler-adjacent study: https://newrepublic.com/article/120750/study-single-payer-healthcare-would-save-us-375-billion ; NEJM correspondence "Reducing Administrative Costs": https://www.nejm.org/doi/full/10.1056/NEJMc1215485 ; Healthcare-NOW summary: https://www.healthcare-now.org/blog/medicare-for-all-would-cover-everyone-save-billions-in-first-year/ ; PERI 2018 (see RB-01-FIN-013 sources)
- **Confidence/caveat:** MEDIUM - wide range reflects genuinely different methodologies (some studies estimate only insurer-overhead savings, others include provider billing-cost savings, others bundle in drug-price and other savings). One study author was quoted acknowledging "any such estimate is imprecise." A coding agent building the simulation should treat this as a **calibratable range parameter ($200B-$500B/year)** rather than a single point estimate, and clearly document which components (payer-side only vs. payer+provider-side) are included in whatever mid-point or default value is chosen.

### RB-01-OFF-003 - Drug price savings from government negotiation (CBO scoring of actual enacted IRA policy - most authoritative)
- **Value (these are the ORIGINAL February 2023 scores. CBO re-scoring in 2025 revised the projected deficit reduction downward, so read every figure below as a policy precedent rather than the current standing of the IRA):** CBO scored the Inflation Reduction Act's Medicare drug price negotiation provision at **$98.5 billion in gross Medicare savings over 10 years (2022-2031)**; net savings after Medicaid spending offset ($15.7B increase) = **$56.3 billion net Medicare/other-federal savings**, plus $6.9 billion in higher federal revenues; the broader package of IRA drug-pricing provisions (negotiation + inflation rebates + Part D redesign) was scored by CBO at **$237 billion in total federal deficit reduction over 10 years (2022-2031)**. In actual implementation: first-round negotiated prices (effective 2026) cut list prices by **38% to 79%** across the 10 selected drugs, with CBO/CMS estimating Medicare will save **at least $6 billion** and beneficiaries **$1.5 billion in out-of-pocket costs** in the first year; second-round negotiations are estimated to yield **$12.5 billion in gross savings**.
- **Unit:** USD billions, 10-year cumulative and annual
- **Source:** CBO, "How CBO Estimated the Budgetary Impact of Key Prescription Drug Provisions [of the IRA]" (Feb 2023): https://www.cbo.gov/system/files/2023-02/58850-IRA-Drug-Provs.pdf ; KFF, "Explaining the Prescription Drug Provisions in the Inflation Reduction Act": https://www.kff.org/medicare/issue-brief/explaining-the-prescription-drug-provisions-in-the-inflation-reduction-act/ ; Brookings, "Estimated savings from year two of the IRA Prescription Drug Negotiation Program": https://www.brookings.edu/articles/estimated-savings-from-year-two-of-the-ira-prescription-drug-negotiation-program/
- **Confidence/caveat:** **HIGH for the original scores, and only as original scores.** These are the figures CBO published in February 2023, and they remain the most authoritative directly-scored (not illustrative) real-world data point in the offsets section *for what was scored at enactment*. **They are NOT the current standing of the IRA.** CBO's September 2025 re-estimate revised the projected deficit reduction downward (see RB-03-RX-006 in `research/03_drugs_pharmacy_diagnostics_devices.md`, which carries the same figures and already graded durability Medium for this reason). **Treat these as a policy precedent showing negotiation CAN save at program level, not as a transferable current number.** This file previously graded them HIGH with no re-scoring caveat while `research/03` graded the identical figures High-for-original / Medium-for-durability; the two now agree. Important caveat for the simulation: IRA negotiation currently applies to a small, phased-in list of top-spend drugs within Medicare Part B/D only - savings from a much broader NHA-wide negotiation/reference-pricing system (covering all drugs, all payers) would need to be scaled up substantially from this base, and that scaling is NOT itself CBO-scored; broader international-reference-pricing studies (e.g., RAND international drug price comparisons showing U.S. prices ~2.78x other OECD countries) would be the appropriate next source to pull for a "what if we went further" scaling assumption - not retrieved in this pass, flagged as a gap.

### RB-01-OFF-004 - Provider billing/revenue-cycle administrative costs (physician practice level)
- **Value:** Academic health system study found substantial per-encounter billing/insurance-related administrative costs (specific dollar figures not fully extracted in this pass - see gap note); broader synthesis: U.S. physicians spend "two to three times as much as Canadian colleagues on billing"; U.S. hospitals spend "one-quarter of their total budgets on billing and administration - more than twice as much as hospitals in single-payer systems like Canada's or Scotland's."
- **Unit:** % of practice/hospital revenue or budget; USD per encounter (study-specific)
- **Source:** Sinsky/Himmelstein et al. or Tseng et al. (exact authorship needs verification), "Administrative Costs Associated With Physician Billing and Insurance-Related Activities at an Academic Health Care System," (2018 vintage): https://pmc.ncbi.nlm.nih.gov/articles/PMC5839285/ ; Jiwani, Himmelstein, Woolhandler, Kahn, "Billing and insurance-related administrative costs in United States' health care: synthesis of micro-costing evidence," BMC Health Services Research (2014): https://link.springer.com/article/10.1186/s12913-014-0556-7 ; PNHP summary: https://pnhp.org/news/landmark-administrative-waste-study-updated/ ; Center for American Progress summary: https://www.americanprogress.org/article/excess-administrative-costs-burden-u-s-health-care-system/
- **Confidence/caveat:** MEDIUM - directional finding (U.S. provider billing costs are 2-3x those of single-payer-system peers) is well-established across multiple independent studies over two decades, but I was not able to extract a single clean current-dollar national aggregate for "provider billing and insurance-related costs" distinct from the broader $1.1 trillion total administrative cost figure in RB-01-OFF-001 within this research pass. A coding agent should pull the full text of the Jiwani et al. 2014 BMC synthesis paper (it is specifically a "synthesis of micro-costing evidence" designed to produce a national aggregate estimate) for the precise national dollar figure attributable to provider-side (as opposed to payer-side) billing/insurance-related costs.

### RB-01-OFF-005 (NEW, proposed) - CMS NHE administrative baseline as the "floor" comparator
- **Description:** As established in RB-01-TOT-005, CMS's own narrowest administrative accounting (net cost of private insurance + government administration) = $371.1 billion / 7.5% of NHE (2023, CMS's 2024 release; the 2023 release gave $360.3 billion / 7.4%). This is useful as a conservative lower-bound "floor" for administrative savings potential, since it's the official government accounting figure, versus the broader $1.1T (RB-01-OFF-001) and $200-500B range (RB-01-OFF-002) academic estimates that use broader definitions. The gap between the CMS $360B floor and the various academic estimates ($350B-$1.1T) is itself informative: it shows how much of "administrative waste" estimates depend on whether provider-side billing costs are counted as recoverable "waste" or as necessary system-operating costs.
- **Unit:** USD billions / % of NHE
- **Source:** Derived comparison of RB-01-TOT-005 (CMS) vs. RB-01-OFF-001/002 (academic literature).
- **Confidence/caveat:** Methodological note, not a new empirical citation - flagged as useful framing for the simulation's documentation to explain to users why "administrative savings" estimates vary so widely across sources (roughly 3x range: $360B official floor to $1.1T broadest academic estimate).

### RB-01-OFF-006 (NEW, proposed) - International drug pricing comparison (for broader drug-savings scaling - GAP, recommend follow-up)
- **Description:** RAND Corporation and other researchers have published international U.S.-vs.-peer-country prescription drug price ratio studies (commonly cited: U.S. prices average roughly 2.5-3x those in comparable OECD countries) that are the standard basis for "international reference pricing" savings estimates broader than the narrow IRA-negotiation scope in RB-01-OFF-003.
- **Value:** Not independently re-verified with a fresh citation in this research pass - flagged as a gap requiring follow-up (I recall RAND's 2021 report found U.S. prices ~2.56x other OECD countries on average, ~3.44x for brand-name drugs specifically, but this was not freshly verified via search in this session and should be re-confirmed before use).
- **Unit:** ratio (US price ÷ comparator-country price)
- **Source:** GAP - recommend pulling RAND Corporation, "International Prescription Drug Price Comparisons" (RAND Health Care, most recent vintage available at rand.org) directly.
- **Confidence/caveat:** LOW/UNVERIFIED in this pass - general knowledge only, not sourced live. Must be verified with a fresh citation before use in the simulation.
- **Since sourced (noted 2026-10-12):** `research/03_drugs_pharmacy_diagnostics_devices.md` carries RAND's comparison with 2022 data, published February 2024 (RB-03-RX-003): U.S. prices 2.78x those in 33 comparison countries overall, 4.22x for brand-name drugs, graded High there. The recalled 2021 figures above are superseded by it and are not used.

---

## Summary of Highest-Priority Gaps for Follow-Up Research

1. **CMS NHE exact dollar figures** for: investment/structures & equipment, noncommercial research, and a clean (non-bundled) public health activity line - need to pull CMS's downloadable NHE historical tables (Table 2/Table 4) directly rather than relying on summarized web content. **Answered for the current release (2026-10-16):** NHE Table 2 in CMS's 2024 release gives, for 2023, investment $233.4B (research $71.5B, structures and equipment $162.0B) and government public health activities $158.0B. That release revises 2023 throughout (total $4,925.3B against the $4,866.5B BASE2023 carries), the values the model has used since the owner's recalibration of 2026-10-19 (BASE2023's investment rest is 233.4 and its public health line 158.0; they were 238.7 and 160.2 on the 2023 release); see research/README.md.
2. **Age-based per-capita spending multiplier** (65+ vs. under-65) - needed to connect population aging (RB-01-POP-003) to cost growth; recommend MedPAC Data Book or CMS age/gender NHE tables. **Partly answered (2026-10-16):** CMS's *U.S. Personal Health Care Spending By Age and Sex, 2020 Highlights* gives $4,217 per child (0-18), $22,356 per person 65 and older, and $35,995 per person over 85, "over 8.5 times that for children". `AGE_STRUCTURE`'s five-band weights need the five-band figures in CMS's age tables archive, not yet opened. **Answered (2026-10-19):** the five-band figures are in the age tables archive, downloaded with the owner's approval (Table 7, 2020: $4,217, $6,669, $12,577, $20,503 and $35,995 against $10,230 for all ages); `AGE_STRUCTURE`'s weights read them (RB-01-POP-009).
3. **A single clean topline adult diabetes prevalence %** (CDC National Diabetes Statistics Report) rather than the weight-status-stratified figures found here. **Answered (2026-10-19):** the report's page (https://www.cdc.gov/diabetes/php/data-research/index.html, read in a browser) gives 40.1 million people with diagnosed or undiagnosed diabetes in 2023, 12.0% of the U.S. population; 29.1 million diagnosed, including 28.8 million adults; 27.6% of adults with diabetes undiagnosed. No figure in this repository rests on it.
4. **CHIP-only spending figure** (currently only found bundled with Medicaid in CBO summaries). **Answered (2026-10-19):** NHE Table 21 in CMS's 2024 release (the archive downloaded for the recalibration) gives CHIP expenditures of $24.6B in 2023 and $31.0B in 2024, with 7.3 million enrolled in each year. The model's flows carry Medicaid and CHIP together, as CMS's Table 3 does.
5. **National aggregate employer health spending total $** (currently only have per-employee averages + a derived NHE-sponsor-share proxy of ~$876B). **Answered (2026-10-19):** NHE Table 5-1 in CMS's 2024 release gives private business sponsor spending of $916.1B in 2023 ($708.7B employer contributions to employer-sponsored insurance, $152.4B employer Medicare payroll tax, $55.0B other) and $967.4B in 2024. The model reads $916.1B since the owner's recalibration of 2026-10-19 (it carried $876B, 18% of the 2023 release's $4,866.5B).
6. **Reconciliation of the framework's own "$4.75T" claim** against sourced figures - none of the citations found here directly validate or refute a $4.75T number without knowing precisely what that figure is meant to represent (single-year total NHE? net new federal spending? net new revenue required?). This was the single most important open item for whoever built the framework's original parameter to resolve. **Half settled (noted 2026-10-12):** what the figure represents is no longer open: the plan's cost catalog names it as total system cost, all payers, real 2024 dollars, at maturity, and `params.ts` (`FRAMEWORK_CLAIM`) records that basis. Whether sourced figures support it is the comparison the Healthcare tab draws between the model and that total, so the open part of this item is now the model's, not a missing citation.
7. **RAND (or equivalent) international drug price ratio** - needed to scale IRA-style negotiation savings (RB-01-OFF-003) up to a full NHA-wide reference-pricing scenario. **Closed (noted 2026-10-12):** sourced in `research/03` as RB-03-RX-003; see RB-01-OFF-006 above.
8. **Payroll tax revenue-per-point figure** (RB-01-FIN-019) - currently an unverified placeholder from general knowledge; needs a CMS Trustees Report or CBO citation. **Closed (noted 2026-10-12, corrected the same day):** the CBO citation this item asks for is in `research/06` §4: CBO's Option 61 (December 2024), a 1% payroll surtax on all earnings with no cap, raises $1,281.5B over ten years, about $128B a year, graded High there. The tax model's payroll instrument is built on that score. (A first version of this note derived a figure from `research/06` §2's earnings base instead; the model does not use that base for revenue, and the scored option is the better answer.)
9. Both the CBO working paper PDFs (56811, 57637) returned HTTP 403 on direct fetch in this session - content was reconstructed via secondary sources (PNHP, Health Affairs commentary) which appear reliable but a coding agent with different fetch tooling should try to access the primary CBO PDFs directly for full precision (exact tables, not just prose summaries). **56811 read 2026-10-16 (in a browser; cbo.gov still refuses automated fetch):** the publication page states the two benchmark ranges RB-01-FIN-015 records (federal subsidies in 2030 up $1.5 trillion to $3.0 trillion; NHE in 2030 from a decrease of $0.7 trillion to an increase of $0.3 trillion), and the paper puts administrative spending at 1.5 to 1.8 percent of total spending, which research/05 and the seed had carried as 1.5-2.0% (corrected the same day). 57637's page was read the same day: it reports the systems' economic effects (output and consumption), and no figure in this repository rests on it.

### Residual private share and legacy insurance overhead: what was searched (2026-10-19)

`residualPrivateShare` (4 / 6 / 9% of system cost) and `legacyAdminFloor`
(5 / 8 / 14% of today's net cost of insurance persisting) are assumptions,
graded low, with no URL. Searched for each, so the log can say what exists:

- OECD, *Health at a Glance 2025*, "Health expenditure by financing scheme"
  (2023 data, https://www.oecd.org/en/publications/health-at-a-glance-2025_8f9e3f98-en/full-report/health-expenditure-by-financing-scheme_074bead0.html):
  compulsory schemes covered three quarters of OECD health spending;
  government schemes 80% or more in Sweden, Norway, Iceland, Denmark and the
  United Kingdom; out-of-pocket spending under 10% only in France and
  Luxembourg; voluntary insurance 5% of OECD spending, and more than a tenth
  in Slovenia, Canada, Ireland and Israel.
- CIHI, *National Health Expenditure Trends 2024*: Canada's private share
  29.0% (out of pocket 14.6%, private insurance 11.9%, other 2.5%).

What this shows: no peer system reports a residual as low as the model's
4-9%; the most public systems leave about a sixth or more of spending
outside compulsory schemes. What it does not settle: none of those systems
covers dental care, long-term care and medicines at $0 as the plan does, so
no source measures the residual of this benefit design, and the parameter
stays an assumption. Whether its band should reach the peers' level is a
question for the owner, since it moves the public share and so the
headline. The peer anchors the parameter's note names (Canada about 30%,
Taiwan about 15%) were not re-read beyond CIHI's figure above.

For `legacyAdminFloor`, the same OECD figure gives a candidate derivation
the owner may want: the overhead that persists scales with the supplemental
insurance that persists, so the floor is roughly the peers' voluntary
insurance share over today's U.S. private insurance share of spending
(NHE Table 3, 2024 release: $1,511.2B of $4,925.3B in 2023, 30.7%). At the
OECD's 5% that is about 16%; at Canada's 11.9%, about 39%; a voluntary
share under 1.5% of spending would put it below the band's 5% low (the
country-by-country voluntary shares were not read here). Not adopted: the
inputs are a cross-country average and one peer, and the choice among them
is the same judgement the parameter already states.
