# Sourced Numerical Baselines for the U.S. Tax-System Distributional Model

Compiled 2026-07-15. Last revised 2026-10-21.

Compiled 2026-07-15. All figures pulled from primary sources this session (CBO supplemental data files, Treasury MTS API, Fed DFA table, BLS CE API, SSA, TPC, JCT-scored CBO options). Confidence notes and gaps flagged per item.

---

## 1. Household income distribution and current federal tax burden (core table)

**Primary source:** CBO, *The Distribution of Household Income, 2022* (published January 2026 - the most recent edition; data year 2022).
- Report page: https://www.cbo.gov/publication/61911 (also listed as https://www.cbo.gov/publication/62300)
- Numbers below extracted directly from CBO's supplemental-data workbook: https://www.cbo.gov/system/files/2026-01/61911-supplemental-data.xlsx (Tables 1, 3, 6, 9, 10, 12)
- All dollar figures are **2022 dollars**; income groups are ranked by income before transfers and taxes, adjusted for household size; quintiles contain equal numbers of *people*, so household counts differ by quintile.

### Core table, 2022

| Group | Households (M) | Avg income before transfers & taxes | Avg means-tested transfers | Avg federal taxes | Avg federal tax rate | Share of income before T&T | Share of federal taxes |
|---|---|---|---|---|---|---|---|
| Lowest quintile | 26.4 | $26,200 | $19,000 | $400 | 1.4% | 3.7% | 0.3% |
| Second quintile | 26.9 | $59,100 | $9,600 | $5,600 | 9.5% | 8.4% | 3.9% |
| Middle quintile | 26.4 | $94,000 | $5,600 | $12,600 | 13.4% | 13.2% | 8.6% |
| Fourth quintile | 25.9 | $143,100 | $3,000 | $25,100 | 17.6% | 19.7% | 16.8% |
| Highest quintile | 25.5 | $412,600 | $1,700 | $106,700 | 25.9% | 55.8% | 70.2% |
| - 81st–90th pctile | 12.8 | $211,900 | $1,800 | $44,100 | 20.8% | 14.4% | 14.6% |
| - 91st–95th pctile | 6.4 | $298,500 | $1,600 | $68,600 | 23.0% | 10.1% | 11.3% |
| - 96th–99th pctile | 5.0 | $503,600 | $1,400 | $130,900 | 26.0% | 13.5% | 17.0% |
| - Top 1% | 1.2 | $2,700,900 | $2,200 | $849,800 | 31.5% | 17.8% | 27.3% |
| **All households** | **131.7** | **$143,000** | **$7,900** | **$29,400** | **20.6%** | 100% | 100% |

Note: CBO publishes 91–95 and 96–99 separately, not 91–99. Computed 91st–99th combined (weighted): 11.4M households, avg income ≈ $388,500, avg federal tax rate ≈ 24.7% (derived, not a CBO-published cell).

### Average federal tax rate by tax type, 2022 (CBO supplemental Table 9)

| Group | Total | Individual income | Payroll | Corporate (imputed) | Excise |
|---|---|---|---|---|---|
| Lowest quintile | 1.4% | −10.1% | 9.5% | 0.8% | 1.3% |
| Second quintile | 9.5% | −0.9% | 8.8% | 0.8% | 0.8% |
| Middle quintile | 13.4% | 3.1% | 8.8% | 0.9% | 0.6% |
| Fourth quintile | 17.6% | 6.8% | 9.3% | 1.0% | 0.5% |
| Highest quintile | 25.9% | 16.6% | 6.1% | 2.9% | 0.3% |
| Top 1% | 31.5% | 23.9% | 2.0% | 5.4% | 0.2% |
| All | 20.6% | 10.6% | 7.5% | 2.1% | 0.4% |

Means-tested transfer composition (lowest quintile, 2022): $19,000 total = Medicaid/CHIP $12,600 + SNAP $2,700 + SSI $1,300 + other $2,500. Medicaid/CHIP dominates - relevant to the "Medicaid households gain less from premium relief" framing.

**Confidence:** High - extracted directly from CBO's own workbook. Caveat: 2022 tax rates reflect post-pandemic normalization (recovery rebates/expanded CTC expired end-2021); CBO notes 2022 rates ≈ 2019 rates, so 2022 is a reasonable "normal-year" baseline. Corporate tax is imputed to households (75/25 capital/labor - see §5); payroll includes employer share imputed to workers.

**How the model uses these rates (2026-10-12).** The Tax chapter's effective-rate chart plots each group's "Total" rate above as its current-law point, held at the 2022 level, while the model grows the same groups' incomes to the year the reader selects (2030-2042) at real rates. The income tax brackets are indexed to prices, not to real income growth (26 U.S.C. 1(f)), so a current-law rate for a later year would be higher than the 2022 rate as real incomes rise. Both points on the chart are therefore too low by about the same amount in later years. The distance between them is the package's new tax divided by the group's income, which does not use the current-law rate, so it is not affected; the page says this under the chart. No later-year current-law rate is estimated here, because none is sourced.

### TPC cross-check (2026 projection, tax units not households)

TPC Table T25-0048, *Baseline Distribution of Income and Federal Taxes, by Expanded Cash Income Percentile, 2026* (April 2, 2025): https://taxpolicycenter.org/model-estimates/t25-0048-baseline-distribution-income-and-federal-taxes-expanded-cash-income

| ECI percentile | Tax units (K) | Avg pre-tax income | Avg federal tax | Avg federal tax rate |
|---|---|---|---|---|
| Lowest quintile | 50,060 | $20,910 | $1,020 | 4.9% |
| Second quintile | 42,960 | $50,580 | $5,050 | 10.0% |
| Middle quintile | 39,960 | $92,570 | $14,130 | 15.3% |
| Fourth quintile | 32,000 | $164,080 | $31,150 | 19.0% |
| Top quintile | 26,420 | $509,680 | $138,790 | 27.2% |
| Top 1% | 1,210 | $3,216,530 | $1,063,910 | 33.1% |
| All | 193,480 | $132,410 | $28,510 | 21.5% |

**Caveats:** TPC uses *tax units* (193.5M) vs CBO *households* (131.7M) - do not mix denominators. This table is "law in place as of January 1, 2025" (pre-OBBBA); TPC's current-law (post-OBBBA) 2026 tables are on the same baseline page (https://taxpolicycenter.org/feature/baseline-estimates, updated Nov 6, 2025). Rate patterns closely corroborate CBO (bottom ~5% vs 1.4% differs mainly because TPC ranks by tax unit and includes different income items).

### Household denominators (2026-10-12)

The model divides by three household counts, declared in `src/lib/params.ts` (`HOUSEHOLD_DENOMINATORS`), each for one kind of figure:

- **CBO, 131.0M (2022)**: the households in the model's income groups (`GROUPS` in taxparams.ts): the four lower quintiles above (26.4 + 26.9 + 26.4 + 25.9), then 12.8M for the 81st-90th percentile, 11.4M for the 91st-99th (combined from CBO's 91-95 and 96-99 rows, derived, see the note under the table) and 1.2M for the top 1%, which sum to 131.0M. The table's five quintile rows sum to 131.1M, and its all-households row reads 131.7M. Used for anything computed per income group, so the counts and the incomes come from one table. (Corrected 2026-10-12: the first version said the groups "above" sum to 131.0M; it is the model's split of them that does.)
- **Census, 132.2M (2024)**: the Census Bureau's Current Population Survey (ASEC) count, 132,216 thousand households in 2024, in its Historical Households Table HH-1 (https://www2.census.gov/programs-surveys/demo/tables/families/time-series/households/hh1.xls, read 2026-10-15; the same table gives 131,434 thousand for 2023 and 134,790 thousand for 2025). Used for whole-population per-household figures.
- **2041, derived (about 141.5M)**: the Census count grown at the model's central population growth rate (`popGrowth`, 0.4% a year) to the mature year, under one assumption, graded **low**: average household size holds at its 2024 level, so households grow at the population growth rate. It is an assumption, not a projection: if households keep getting smaller, the 2041 count is higher and every per-household figure divided by it is lower. Used only for per-household figures stated at the mature year (the Overview's family-burden sentence).

**Confidence:** CBO count high (the workbook). Census count high (the Bureau's own table; until 2026-10-15 a source named only in code). The 2041 count low, by its assumption.

---

## 2. Federal revenue baseline

### Receipts by source, FY2024 and FY2025 (actual, complete fiscal years)

**Sources:** CBO, *Monthly Budget Review: Summary for Fiscal Year 2025* (Nov 10, 2025), https://www.cbo.gov/publication/61307 (Tables 1–2); exact detail from Treasury Monthly Treasury Statement, Table 4, via Fiscal Data API (https://fiscaldata.treasury.gov/datasets/monthly-treasury-statement/ - endpoint mts_table_4, September FYTD records).

| Source | FY2024 ($B) | FY2025 ($B) |
|---|---|---|
| Individual income taxes | 2,426.1 | 2,656.0 |
| Payroll (social insurance & retirement) | 1,709.6 | 1,748.3 |
| Corporate income taxes | 529.9 | 452.1 |
| Customs duties (incl. tariffs) | 77.0 | 194.9 |
| Excise taxes | 101.4 | 105.9 |
| Estate and gift taxes | 31.6 | 29.5 |
| Federal Reserve deposits of earnings | 3.1 | 5.5 |
| Miscellaneous receipts (total, incl. Fed earnings) | 43.2 | 47.9 |
| **Total receipts** | **4,918.7** | **5,234.6** |

Context (CBO MBR FY2025): receipts = 17.0% of GDP (FY24), 17.3% (FY25; 50-yr avg 17.3%); FY2025 deficit $1.775T (5.9% GDP); outlays FY2025 $7,010B. Within payroll taxes, FY2025: OASI $1,097.4B + DI $186.4B + HI $395.4B + unemployment $54.0B + other retirement $8.6B + railroad ≈ $6.5B. Corporate receipts fell 15% in FY2025 (2025 reconciliation-act expensing); customs rose 153% (tariffs) - flag both as unusual-year effects when projecting.

**Confidence:** High - actual Treasury/CBO figures, not projections.

### Payroll tax base and earnings above the Social Security cap

- **Share of covered earnings below the OASDI taxable maximum: ~83% in 2024** (i.e., ~17% of covered earnings escape the OASDI tax). Source: SSA, *Fast Facts & Figures About Social Security, 2025*: "About 83% of earnings in covered employment were taxable in 2024… 184 million workers… about 6% had earnings at or above the maximum." https://www.ssa.gov/policy/docs/chartbooks/fast_facts/2025/fast_facts25.html
- CBO cross-check: "In 2022, about 82 percent of earnings from employment fell below the maximum taxable amount" - CBO Options, Option 62 (Dec 2024), https://www.cbo.gov/budget-options (see §4).
- **OASDI taxable payroll, 2024 ≈ $10.4T** (derived: $1,293.3B of OASDI employer+employee+self-employed contributions ÷ 12.4%; contributions from SSA, "Contributions to the Social Security and Medicare Trust Funds," https://www.ssa.gov/oact/STATS/table3c3.html).
- **Medicare (HI) taxable earnings, 2024 ≈ $13.7T** (derived: $396.5B HI payroll contributions ÷ 2.9%; no cap - this is the best proxy for total wages+self-employment earnings subject to any payroll tax). Same SSA table.
- Implied total OASDI-covered earnings ≈ $10.4T / 0.83 ≈ $12.6T, so **earnings above the cap ≈ $2.1–2.2T/yr** (derived - use for sanity-checking cap-elimination scores, not as a primary estimate).
- Taxable maximum: $168,600 (2024), $176,100 (2025) - SSA, https://www.ssa.gov/oact/cola/cbb.html

**Confidence:** The 83%/6% figures are direct SSA statements (high). The dollar aggregates are arithmetic derivations from SSA contribution data (medium - flagged as derived).

### Aggregate household income

- **BEA personal income: $26.10T (CY2025 average, SAAR); $26.92T (May 2026 SAAR).** Wages and salaries: $12.96T (CY2025 avg); $13.39T (May 2026). Source: BEA via FRED series PI and A576RC1, https://fred.stlouisfed.org/series/PI - retrieved 2026-07-15.
- **CBO aggregate household income before transfers and taxes: ≈ $18.8T (2022)** (131.7M households × $143,000 avg; CBO supplemental data, §1). Narrower than BEA personal income (different income concept: excludes means-tested transfers, includes employer-paid taxes/premiums and capital gains).

**Confidence:** High for FRED/BEA; the CBO aggregate is a derived product of two published CBO numbers.

---

## 3. Wealth distribution

**Primary source:** Federal Reserve, Distributional Financial Accounts (DFA), "Distribution of Household Wealth in the U.S. since 1989," https://www.federalreserve.gov/releases/z1/dataviz/dfa/distribute/table/ - data through **2026:Q1** (site last updated June 18, 2026).

| Wealth percentile group | Net worth, 2026:Q1 ($T) | Share |
|---|---|---|
| Top 0.1% | 25.07 | 14.4% |
| 99–99.9% | 29.96 | 17.2% |
| 90–99% | 63.23 | 36.3% |
| 50–90% | 51.48 | 29.6% |
| Bottom 50% | 4.27 | 2.5% |
| **Total household net worth** | **174.01** | 100% |

(2025:Q4 for reference: total $174.0T - top 0.1% $25.22T, 99–99.9% $30.14T, 90–99% $63.35T, 50–90% $51.03T, bottom 50% $4.27T.)

**Confidence:** High; DFA is the standard source. Note DFA is quarterly and revised; shares computed from levels.

### Wealth above $50M and above $1B thresholds

Source: Saez & Zucman, revenue-estimate letter to Sen. Warren, Feb 24, 2021, https://www.warren.senate.gov/imo/media/doc/Wealth%20Tax%20Revenue%20Estimates%20by%20Saez%20and%20Zucman%20-%20Feb%2024%2020211.pdf
- **Tax base above $50M threshold: $10.97T** (wealth in excess of $50M per household), ~100,449 households (0.054% of families), end-2022 projection.
- **Base above $1B: $3.284T** (~1,005 billionaire families).
- Revenue: 2%-above-$50M + 1%-above-$1B = **$252B/yr** ($3.03T over 2023–2032); with 4% billionaire surtax = **$351B/yr** ($3.91T/10yr) - this is the project's already-sourced $351B/yr figure. The 15% avoidance/evasion assumption is already inside every figure (the table's note), comprehensive base; the model applied it a second time until 2026-10-15 (see "Re-basing each score to the 2024 economy").
- Billionaire wealth update: Forbes-based US billionaire wealth was $4.2T (Jan 2021, per the letter); Saez-Zucman-adjacent NBER work (Bricker-Saez-Yagan-Zucman 2025, https://gabriel-zucman.eu/files/BSYZ2025NBER.pdf) uses Forbes real-time data with ~$6–7T total US billionaire wealth by mid-2025 - scale the 2021 letter's billionaire base up accordingly (roughly +50–60%) if modeling current-year revenue.

**Confidence:** Medium - academic estimates, contested methodology (Smith-Zucman-Zwick vs. Saez-Zucman capitalization debates); the $50M+ base is a 2022 projection from 2019 SCF + Forbes. Flag: no official (JCT/CBO) score of a wealth tax exists. DFA top 0.1% ($25T) is consistent in magnitude with an $11T excess-over-$50M base.

---

## 4. Revenue options menu (per-instrument scoring)

**Canonical source:** CBO, *Options for Reducing the Deficit: 2025 to 2034* (December 2024), https://www.cbo.gov/publication/60557 (PDF: https://www.cbo.gov/system/files/2024-12/60557-budget-options.pdf). All estimates by JCT staff unless noted; effective January 2025 unless noted; net of income/payroll offsets where stated. Per-option pages: https://www.cbo.gov/budget-options.

| Instrument | CBO/JCT estimate (2025–2034 unless noted) | Notes |
|---|---|---|
| **Raise all individual income tax rates +1pt** (Option 45) | **$1,185.3B** (5-yr: $523.2B; first full year ~$106B) | Top-four-brackets +2pts variant: $569.5B/10yr |
| **AGI surtax** (Option 46, adjacent) | 1pt surtax above $20K/$40K AGI: $1,440.1B; 2pt above $100K/$200K: $1,051.0B | Useful for "broad surtax" designs |
| **Social Security payroll cap** (Option 62) | Tax earnings above **$250,000** (donut): **$1,426.8B**/10yr; raise taxable share to 90% of earnings (max ≈ $305,100 in 2024): **$727.6B**/10yr | Includes offsets; 90%-option net of extra benefit outlays; benefits unchanged under donut variant |
| **Corporate rate +1pt (21%→22%)** (Option 64) | **$135.7B**/10yr (~$13.6B/yr steady state) | Linear-ish scaling: 21%→28% ≈ 7 × $135.7B ≈ **$0.95T/10yr**. The commonly quoted "~$1.3T/10yr for 28%" comes from older (2021-vintage Treasury/JCT) scores with a larger corporate base; use CBO Dec 2024 per-point number as current. Flag: FY2025 corporate receipts fell 15% (OBBBA expensing), so per-point yield may be temporarily lower |
| **Capital gains/dividends +2pts** (Option 47) | **$103.3B**/10yr | CBO's scored option. NOT "tax as ordinary income" - see below |
| **Cap gains as ordinary income for high earners** | **$288.6B**/10yr ($288,583M over FY2025-34) - Treasury FY2025 Greenbook: tax gains at ordinary rates (39.6%) for income >$1M, https://home.treasury.gov/system/files/131/General-Explanations-FY2025-Table.pdf | Treasury/OTA estimate, not JCT. Realization-elasticity caveat: JCT/CBO put the revenue-maximizing stand-alone rate around ~28–32%; rates far above that lose money unless paired with taxing gains at death (Greenbook pairs it with that). See CRS R41364, https://www.congress.gov/crs-product/R41364 |
| **Taxing gains at death** (Option 51, companion) | Carryover basis: $196.9B/10yr; include accrued gains on decedent's final return: **$536.1B**/10yr | Key enabler for high cap-gains rates |
| **5% VAT** (Option 72) | Broad base: **$3,380B**/10yr (2026–2034; ~$430B/yr by 2033); narrow base (excl. food-at-home, housing, health, higher ed): **$2,180B**/10yr | Effective Jan 2026; net of income/payroll offset |
| **Financial transactions tax** (Option 74) | **$296.8B**/10yr net (raises deficit $10.3B in 2025, then ~$40B+/yr) | **Rate is 0.01% (1 basis point)** on securities and derivative payments - NOT 0.1%. The 0.1% design is the TPC/Burman analysis (§5), which raised a max of ~$75B/yr (2017 dollars) at 0.34% revenue-maximizing rate. Correct the model's label accordingly |
| **New payroll surtax** (Option 61) | 1% on all earnings (no cap, employee-side): **$1,281.5B**/10yr; 2%: **$2,540.0B**/10yr | "Medicare-style" - all earnings, general fund |
| **Estate tax to 2009 parameters ($3.5M exemption/45%)** | **No current CBO/JCT score exists** against the post-OBBBA baseline ($15M exemption from 2026). Best available: JCT scored the "For the 99.5 Percent Act" (S.994, 2021: $3.5M exemption, graduated 45–65% rates) at **$429.6B**/10yr against the 2021 baseline (JCT letter; see https://www.taxnotes.com/lr/resolve//43psl and BPC explainer https://bipartisanpolicy.org/explainer/the-2025-tax-debate-individual-estate-and-gift-taxes-in-tcja/). A pure 2009-parameters restoration would raise less than that (flat 45%), but more than the pre-OBBBA-era scores because the current-law exemption is now higher. GAP - flag for a bespoke estimate; current-law estate/gift receipts are only ~$30B/yr (§2) |

**Confidence:** High for all CBO Dec 2024 options (extracted from the official PDF). Estate-tax line is an explicit gap with best-available proxy.

---

## 5. Distributional incidence assumptions

- **Corporate income tax: 75% capital / 25% labor (CBO, since 2012).** CBO's distributional reports allocate 75% of the corporate tax to capital income and 25% to labor income (long run). JCT similarly: 100% to capital owners in the short run, converging to 75/25 by year 10 (JCT, *Modeling the Distribution of Taxes on Business Income*, JCX-14-13, https://www.jct.gov/publications/2013/jcx-14-13/). TPC differs slightly: 80% capital / 20% labor, with 60% to shareholders via supernormal returns (Nunns, *How TPC Distributes the Corporate Income Tax*, 2012, https://www.urban.org/sites/default/files/publication/25796/412651-How-TPC-Distributes-the-Corporate-Income-Tax.PDF). Background: CBO working papers 2010-03 and 2011 review (https://www.cbo.gov/sites/default/files/112th-congress-2011-2012/workingpaper/06-14-2011-corporatetaxincidence_1.pdf). Recommendation: use 25/75 (CBO/JCT convention), sensitivity 20/80.
- **Employer-side payroll taxes: fully borne by workers via lower wages.** This is the explicit CBO and JCT convention (CBO includes employer-paid payroll taxes in both household income and household taxes). Empirical support and discussion: Dorian Carloni, *Revisiting the Extent to Which Payroll Taxes Are Passed Through to Employees*, CBO Working Paper 2021-06, https://www.cbo.gov/publication/57089 (cited by CBO in Options 61/62).
- **VAT/consumption tax incidence:** regressive relative to annual income because consumption/income falls with income. From BLS CES 2024 (see §6 sources): total expenditures ÷ income before taxes by quintile = **210%** (Q1: $35,046/$16,658), **117%** (Q2: $50,054/$42,925), **90%** (Q3: $66,900/$74,474), **74%** (Q4: $89,972/$121,548), **57%** (Q5: $150,342/$264,510). Caveats: CES bottom-quintile income is understated (consumption > income partly reflects retirees/students/underreporting); measured against lifetime income or with a rebate, a VAT is far less regressive - see TPC/Toder-Nunns-Rosenberg VAT distributional work and CBO Option 72's related publications (https://www.cbo.gov/publication/58421).
- **FTT incidence: highly progressive, on asset owners (incl. pensions).** TPC microsimulation of a 0.1% equities/options FTT (2017): share of burden - lowest quintile 1.3%, second 3.2%, middle 6.8%, fourth 13.0%, **top quintile 74.7%, top 1% 40.0%, top 0.1% 23.5%**. Source: Burman, Gale, Gault, Kim, Nunns, Rosenthal, *Financial Transaction Taxes in Theory and Practice*, National Tax Journal 69(1), 2016, Table 6, https://www.urban.org/sites/default/files/publication/78181/2000634-financial-transaction-taxes-in-theory-and-practice.pdf. Pension pass-through: burden partly reaches middle-income households through retirement accounts (reflected in the quintile shares above).

**Confidence:** High - all four are standard, citable conventions; numbers above verified in the named documents this session.

---

## 6. Household health spending by income group (net-burden view)

### Health spending by income quintile - BLS Consumer Expenditure Survey, 2024

Source: BLS CE, 2024 tables by income quintile (news release https://www.bls.gov/news.release/cesan.htm, Sept 2025 for CY2024; series retrieved from the BLS public API, series CXUHEALTHLB0102M–0106M, CXUHLTHINSRLB…, CXUINCBEFTXLB…, CXUTOTALEXPLB…).

| Quintile (income before taxes) | Avg income before taxes | Healthcare spending (total) | - of which health insurance (premiums) | Healthcare as % of income |
|---|---|---|---|---|
| Lowest | $16,658 | $3,445 | $2,153 | **20.7%** |
| Second | $42,925 | $4,826 | $3,194 | **11.2%** |
| Middle | $74,474 | $5,676 | $3,842 | **7.6%** |
| Fourth | $121,548 | $7,247 | $4,913 | **6.0%** |
| Highest | $264,510 | $9,771 | $6,160 | **3.7%** |
| All consumer units | $104,207 | $6,197 | $4,055 | 5.9% |

Healthcare = health insurance + medical services + drugs + medical supplies (out-of-pocket outlays; premiums are the consumer-paid share only, NOT the employer share). 2023 values for trend: $3,539 / $4,844 / $5,753 / $7,010 / $9,633.

**The key regressivity fact, quantified:** dollar spending varies less than 3:1 from bottom to top quintile while income varies ~16:1, so household health spending is ~21% of income at the bottom vs ~4% at the top. (Bottom-quintile income understatement in CES means the true bottom ratio is lower than 20.7% but still far above the top.)

**Important modeling caveat:** CES captures only what households pay directly. The employer premium share - the larger part of premiums - is: **average annual employer-sponsored premium 2025: $9,325 single / $26,993 family, of which workers pay $1,440 single / $6,850 family (16%/26%)**. Source: KFF, *2025 Employer Health Benefits Survey* (Nov 2025), https://www.kff.org/health-costs/2025-employer-health-benefits-survey/. Under standard incidence (employer premiums come out of wages), premium-elimination relief per covered worker is far larger than the CES numbers alone imply. MEPS Household Component (https://meps.ahrq.gov) can substitute for CES if person-level OOP+premium by income tier is needed; not pulled this session - GAP if MEPS-specific numbers are required.

### Coverage mix by income (who gains from premium elimination)

Source: KFF State Health Facts (ACS-based), 2024 data:
- **Nonelderly (0–64), all:** employer 57.8% (156.7M), Medicaid 21.7% (59.0M), non-group 7.9%, uninsured 9.8% (26.7M). https://www.kff.org/state-health-policy-data/state-indicator/nonelderly-0-64/
- **Below 100% FPL:** employer 14.8%, non-group 7.4%, **Medicaid 58.5%**, other public 2.9%, **uninsured 16.5%**. https://www.kff.org/state-health-policy-data/state-indicator/nonelderly-up-to-100-fpl/
- **Below 200% FPL (74.2M people):** employer 22.2% (16.5M), Medicaid 50.4% (37.4M), uninsured 16.5% (12.3M), non-group 7.9%. https://www.kff.org/state-health-policy-data/state-indicator/nonelderly-up-to-200-fpl/
- **Above 200% FPL (derived from the two rows above, ~197M people):** employer ≈ 71%, Medicaid ≈ 11%, uninsured ≈ 7.3% (computed residual - flag as derived).
- Uninsured rates by FPL, 2024 (KFF, *Key Facts About the Uninsured Population*, https://www.kff.org/uninsured/key-facts-about-the-uninsured-population/): <100% FPL 16.5%; 100–199% 16.5%; 200–399% 11.5%; 400%+ 4.5%.

**Modeling implication (as the task framed it):** bottom-quintile households are majority Medicaid/uninsured - they pay little in premiums today and get correspondingly less premium relief; the employer-coverage-heavy middle/upper-middle quintiles (employer share ~71% above 200% FPL) get the largest gross relief, both directly (CES premiums + OOP) and via the employer-premium wage channel (KFF $26,993 family premium).

**Confidence:** High for CES/KFF headline numbers (pulled from BLS API and KFF pages this session); medium for the derived 200%+ FPL split.

---

## Cross-cutting flags

1. **FTT rate mismatch:** CBO's scored option is 0.01%, not 0.1% ($296.8B/10yr). If the model wants a 0.1% FTT, scale from TPC/Burman (max ~0.4% of GDP/yr at the revenue-maximizing 0.34% rate) - not linearly from CBO.
2. **Estate tax 2009-parameters:** no current official score vs. the post-OBBBA $15M exemption; JCT's $429.6B/10yr (99.5% Act, 2021 baseline) is the nearest anchor. Bespoke estimate needed.
3. **Corporate 21→28:** current CBO per-point yield implies ~$0.95T/10yr. Treasury's FY2025 revenue table (March 2024, the same year as CBO's options) puts raising the rate to 28% at $1,349,941M over FY2025-34, so the two scorers differ, not two vintages (corrected 2026-10-15: this said the ~$1.3T figure was "older"). The model uses CBO.
4. **Vintage mixing:** core distribution table is CY2022 (2022 dollars); revenue baseline is FY2025; CES health data CY2024; DFA 2026:Q1. Since 2026-10-15 the model carries CBO's 2022 incomes and every instrument score to the 2024 economy by one rule (below, "Re-basing each score to the 2024 economy"); it had inflated the 2022 incomes by the PCE index alone.
5. **Post-OBBBA baseline:** the July 2025 reconciliation act changed individual rates (TCJA rates now permanent), estate exemption, and corporate expensing. CBO's Dec 2024 options predate it; scores assuming 2026 TCJA expiration (e.g., Option 45's bracket reversion) need re-basing. CBO's *Budget and Economic Outlook: 2026–2036* (early 2026) is the place to re-anchor.

---

## Two narrative claims on the Tax chapter, sourced

Both were prose on `tax.astro` with no source. Measured against primary
material this session; one of the two turned out to be wrong in the part it
was arguing.

### Estate tax yield versus a static calculation

**The page said:** *"the estate tax raises a fifth of what a static
calculation says it should"*, in a bullet titled "A planning industry" whose
argument is that grantor trusts, dynasty trusts and valuation discounts defeat
the tax.

**What is measured.** Penn Wharton Budget Model, *Decomposing the Decline in
Estate Tax Liability Since 2000* (2022-07-28):
<https://budgetmodel.wharton.upenn.edu/p/2022-07-28-decomposing-the-decline-in-estate-tax-liability-since-2000/>

Verbatim: *"Under a counterfactual scenario where the 2000 tax code was in
effect for tax year 2019, the estate tax would have generated 9 times as much
tax liability ($85B counterfactual vs $9B actual) and 100 times as many taxable
estates."*

So the ratio is about **a ninth**, not a fifth. More importantly the
decomposition contradicts the bullet's attribution: the analysis states that
*"Changes in tax law (factor 3B) played a much larger, and more certain, role
in reducing estate tax liability and the number of taxable estates since tax
year 2000"* than tax planning does, and flags its own planning estimate as the
more uncertain one.

**Resolution.** The bullet is rewritten and retitled. The larger cause is
statutory - the raised exemption and cut rates - which is a sharper point for a
financing plan than the one the page was making: a single instrument standing
alone can be legislated away. Avoidance is real and it is the smaller half.
CONFIDENCE: high for the 9x ratio and the direction of the decomposition;
the planning share is the source's own least certain figure and the page does
not quote a number for it.

### Audit-rate collapse at the top

**The page said:** *"Audit rates on the largest returns collapsed for a
decade"*, with no source and no figures.

**What is measured.** GAO-22-104960, *Tax Compliance: Trends of IRS Audit Rates
and Results for Individual Taxpayers by Income* (May 2022):
<https://www.gao.gov/products/gao-22-104960>. From tax year 2010 to 2019 the
overall individual audit rate fell from **0.9% to 0.25%**; rates fell at every
income level and fell furthest for returns reporting **$200,000 or more**. GAO
attributes the decline to staffing, noting that higher-income audits take more
staff time and expertise.

**Resolution.** The claim holds and now carries its figures and its citation.
CONFIDENCE: high.

⚠️ `gao.gov` refuses `curl` with a 403, as an earlier pass recorded. The search
result and the report's own landing page carry the figures above.


## What each instrument's estimate was computed against

Added 2026-10-11. The July 4, 2025 reconciliation act changed the estate
exemption, expensing, the international regime and the individual rates many
of these estimates were computed against. Each instrument in `taxparams.ts`
declares the law its estimate rests on (`scoredAgainst`), who made the
estimate (`estimatedBy`) and the dated publication behind the declaration
(`scoreBasis`); a test holds each declaration to that date. The Tax page's
totals say how much revenue rests on superseded law and how much of that is
this model's own calculation.

| Instrument | Publication and date | Law it was computed against | Made by | Confidence |
|---|---|---|---|---|
| Progressive income surtax | This model's calculation on CBO's 2022 group incomes at a 75% taxable share, cross-checked against CBO Option 45 (December 2024) | Before the act | This model | Medium: no official score exists; obtaining one is open |
| NHA payroll contribution | CBO Options 2025-2034, Option 61 (December 2024) | Before the act | Published | High |
| Earnings above the SS cap | CBO Options 2025-2034, Option 62 (December 2024) | Before the act | Published | High |
| Corporate rate increase | CBO Options 2025-2034, Option 64 (December 2024) | Before the act; its expensing changes may lower near-term yield | Published | Medium-high |
| Capital gains as ordinary income | Treasury FY2025 Greenbook revenue table (March 2024): $288,583M over FY2025-34 | Before the act | Published | Medium |
| Extreme-wealth tax | Saez and Zucman revenue letter (February 24, 2021) | Before the act | Published (academic) | Low-medium |
| Estate tax restoration | JCT score of S.994 (2021) | Before the act; no score exists against the $15M exemption | Published | Low-medium |
| Millionaires surtax | TPC Table T19-0037, Option 3 (September 23, 2019): $633.9B over FY2019-29, against law in place as of September 6, 2019, https://taxpolicycenter.org/model-estimates/agi-surtax-options/t19-0037-surtax-adjusted-gross-income-agi-options-baseline | Before the act | Published | Medium-high |
| Billionaire minimum income tax | Treasury FY2025 Greenbook revenue table (March 2024): $502,668M over FY2025-34 | Before the act | Published | Medium |
| Inheritance income tax | Batchelder (2020); TPC's estimate in its Table 3, at the $2.5M exemption the instrument now carries (2026-10-15) | Before the act | Published (academic) | Medium |
| International minimum tax package | Treasury FY2025 Greenbook revenue table (March 2024): $373,919M over FY2025-34 for the global minimum tax revision | Before the act | Published | Medium |
| High-end IRS enforcement | CBO, The Effects of Increased Funding for the IRS (September 2, 2021), https://www.cbo.gov/publication/57444 (since 2026-10-15; Treasury's May 2021 compliance agenda is no longer the score's basis) | Before the act | Published | Low-medium: CBO's estimate is about $200B over 2022-2031 from $80B of funding, about $60B of it enforcement; the score is that revenue net of the enforcement spending. Until 2026-10-15 it was a $35B reading between CBO and Treasury, which differ by more than a factor of two |
| Stock buyback excise, 1% to 4% | Treasury FY2025 Greenbook revenue table (March 2024): $165,966M over FY2025-34 | Before the act | Published | Medium |
| Financial transactions tax | CBO Options 2025-2034, Option 74 (December 2024) | Before the act | Published | High |
| Broad consumption tax (VAT) | CBO Options 2025-2034, Option 72 (December 2024) | Before the act | Published | High |
| Health-sector rent taxes | None: the plan's own order-of-magnitude figure | None | The plan | Low |

Corrections made while dating these (review of the content run, 2026-10-11):

- The millionaires surtax cited "~$635B/10yr" from press reports of the TPC
  estimate. TPC's own table gives $633.9B over FY2019-29; the instrument now
  cites it, and its annualized figure is $63B a year rather than $64B.
- The buyback excise cited "JCT-basis scoring of the enacted 1% excise scaled
  to 4% (~$166B/10yr additional)". The $166B is Treasury's FY2025 Greenbook
  estimate of the 4% rate ($165,966M over FY2025-34); JCT scored the enacted
  1% in 2022. The instrument now cites the Greenbook.
- Capital gains as ordinary income: the Greenbook table gives $288,583M,
  which is $288.6B, not $288.5B.
- The progressive income surtax had been counted as one of fifteen external
  scores. It is this model's own calculation; fourteen instruments rest on
  published estimates and one on this model's, all computed against law the
  act has since changed.

The Greenbook figures were read from the revenue table,
https://home.treasury.gov/system/files/131/General-Explanations-FY2025-Table.pdf
(fiscal years, in millions of dollars).

## Re-basing each score to the 2024 economy (2026-10-15)

The owner's decision of 2026-10-14: every instrument's score is re-based to
the 2024 economy from its scorer's year-by-year path, by one rule, computed
in code from the source figures. Until then each score was a tenth of a
ten-year total, which is that window's average year: high for a base that
grows, and dated to whatever economy the scorer forecast. The rule, chosen by
the owner on 2026-10-15 from two put to them, lives in
`src/lib/score-rebase.ts`:

> score in 2024 = (the scorer's estimate summed over its steady years) /
> (the GDP the scorer projected for the same years) x actual 2024 GDP of the
> same year type

- **Steady years** are the last five of the scorer's published window. The
  early years carry phase-ins and timing effects: CBO's transactions tax
  ramps for three years, Treasury's billionaire minimum front-loads its
  prepayments, and every window opens on a part year.
- Where a scorer publishes only a total for its window (TPC's inheritance
  estimate, CBO's IRS estimate), the window. Where the figure is one year's
  (the model's own surtax), that year.
- A share of the scorer's own GDP carries the estimate out of the economy
  the scorer forecast. CBO's January 2019 and February 2021 projections put
  fiscal 2024 GDP at $25,642B and $25,127B; it came in at $28,948B.

**Two rules were measured and rejected**, before any code changed: the third window year
carried back at the path's own growth reads the transactions tax mid-ramp
(about $20B against $30B), and a log-linear fit of the last five years
carried back reads the billionaire minimum's falling path as rising (about
$76B against $41B). Neither moves an old forecast's economy.

### The paths, as read

| Instrument | Scorer and table | Window | Years read (last five) | Scorer's GDP |
|---|---|---|---|---|
| Payroll, per point | CBO Options 2025-2034, "Impose a New Payroll Tax", 1 percent on earnings: 56.7, 118.2, 122.8, 127.2, 131.1, 135.3, 140.1, 145.0, 150.0, 155.0 ($1,281.5B) | FY2025-34 | 2030-34 | CBO February 2024 baseline (the options' revenue baseline, per the report) |
| SS cap donut | CBO, "Increase the Maximum Taxable Earnings...", earnings above $250,000: 35.7, 122.0, 129.4, 136.7, 143.7, 152.5, 161.7, 171.5, 181.5, 192.0 ($1,426.8B) | FY2025-34 | 2030-34 | CBO February 2024 |
| Corporate, per point | CBO, "Increase the Corporate Income Tax Rate by 1 Percentage Point": 7.5, 12.7, 13.6, 13.7, 14.1, 14.4, 14.5, 14.6, 14.9, 15.7 ($135.7B) | FY2025-34 | 2030-34 | CBO February 2024 |
| VAT, 5% broad base | CBO, "Impose a 5 Percent Value-Added Tax": 0, 230, 350, 360, 370, 390, 400, 410, 430, 440 ($3,380B) | FY2025-34 | 2030-34 | CBO February 2024 |
| Transactions tax, 0.01% | CBO, "Impose a Tax on Financial Transactions": -10.3, 10.3, 25.0, 32.7, 35.9, 37.6, 39.1, 40.6, 42.2, 43.8 ($296.8B) | FY2025-34 | 2030-34 | CBO February 2024 |
| Capital gains as ordinary income | Treasury FY2025 revenue table, "Reform the taxation of capital income" ($288,583M) | FY2025-34 | 2030-34 | OMB FY2025 Budget, Table S-9 |
| Billionaire minimum | the same table ($502,668M) | FY2025-34 | 2030-34 | OMB FY2025 |
| International | the same table, the global minimum tax revision ($373,919M) | FY2025-34 | 2030-34 | OMB FY2025 |
| Buyback excise 1% to 4% | the same table ($165,966M) | FY2025-34 | 2030-34 | OMB FY2025 |
| Estate restoration | JCT letter to Senator Sanders on S.994 (March 24, 2021): 0.2, 6.1, 41.5, 46.0, 47.2, 49.1, 41.5, 43.8, 47.2, 51.3, 55.7 ($429.6B) | FY2021-31 | 2027-31 | CBO February 2021 |
| Millionaires surtax | TPC Table T19-0037, Option 3: 5.2, 22.8, 38.3, 54.4, 59.6, 65.2, 69.7, 72.0, 76.8, 82.4, 87.4 ($633.9B) | FY2019-29 | 2025-29 | CBO January 2019 (TPC builds on CBO's projections; its model version is 0319) |
| Extreme-wealth tax | Saez and Zucman letter (February 24, 2021); path below | 2023-32 | 2028-32 | the letter's own: $24.3T in 2023, growing 4% |
| Inheritance tax, $2.5M exemption | TPC's estimate in Batchelder (2020), Table 3: $168B for the inheritance tax alone (since 2026-10-19; $337B with constructive realization of gains at transfer) | FY2020-30 | the window | CBO January 2020, the first vintage covering 2030 |
| IRS enforcement | CBO, The Effects of Increased Funding for the IRS (September 2, 2021): about $200B of revenue, less about $60B of enforcement spending | FY2022-31 | the window | CBO July 2021, the baseline CBO measured against |

How they were read: CBO's option pages and data files in the in-app browser
(`cbo.gov` refuses automated fetch), each table's sum checked against its
printed total; Treasury's table and the OMB Budget with pypdf, rows matched
by their totals; TPC's table is an image; JCT's letter and Batchelder's paper
are PDFs. CBO's GDP vintages are its "10-Year Economic Projections" files
(cbo.gov/data/budget-economic-data); actual 2024 GDP ($28,947.9B fiscal,
$29,298.0B calendar) and actual 2022 GDP ($26,054.6B calendar) are CBO's
February 2026 historical data, "actual values as of December 3, 2025".

**Treasury's fiscal years against OMB's calendar GDP (2026-10-19).**
Treasury's estimates are by fiscal year, and OMB's Table S-9 states GDP by
calendar year only, so the four Treasury scores are fiscal-year revenue over
calendar-year GDP, re-based at calendar 2024 GDP. A fiscal year's GDP is
about a quarter year of growth below its calendar year's, so the share reads
about 1% low; calendar 2024 GDP is 1.2% above fiscal. The two mostly cancel:
approximating each fiscal year's GDP as a quarter of the prior calendar year
and three quarters of the same one, and re-basing at fiscal 2024 GDP, moves
each of the four by 0.16% (capital gains 24.76 to 24.72, billionaire
minimum 40.78 to 40.72, international 30.21 to 30.16, buyback 13.26 to
13.23), and no rounded score changes. Each path's text states its own year
type: Treasury's, JCT's, TPC's and CBO's windows print as fiscal years, the
letter's as calendar years.

**The Saez and Zucman path.** The letter states, for 2% above $50M with the
4% billionaire surtax: $219B + $131B = $351B collected in 2023 on end-2022
wealth, $2,532B + $1,374B = $3,906B over 2023-2032, the broad base growing
with the economy at 4% a year and the billionaire base at 1%, and a 15%
avoidance and evasion assumption already inside every figure (its table's
note: "We assume a 15% tax avoidance/evasion rate"). The two parts of the
path that reproduce both stated figures at those two rates are solved for in
`szLetterPath()`.

### What moved

Scores at each instrument's default setting, $B a year:

| Instrument | Before | After | Why |
|---|---|---|---|
| Progressive surtax | 527 | 558 | the model's own calculation on CBO's 2022 incomes, now carried to 2024 by nominal GDP (the owner's answer of 2026-10-15) |
| Payroll (4 points) | 512 | 436 | per point 128 to 109 |
| SS cap donut | 143 | 129 | |
| Corporate (+7 points) | 95 | 78 | |
| Capital gains | 29 | 25 | |
| Extreme-wealth tax | 337 | 378 | the letter's avoidance had been applied twice and its 2023 figure dated 2021; a later review solved its path from the letter's printed totals (379 from the rounded parts' 350) |
| Estate restoration | 40 | 45 | JCT's forecast economy, 13% below 2024's; an 11-year total had been read as ten |
| Millionaires surtax | 63 | 78 | the same: a 2019 forecast economy, and an 11-year total read as ten |
| Billionaire minimum | 50 | 41 | the steady years are past its front-loaded prepayments |
| Inheritance | 40 | 16 | the $2.5M design TPC scored, replacing a $2M design no one scored (owner, 2026-10-15): 33 on the full proposal; 16 on the inheritance tax alone (owner, 2026-10-19, below) |
| International | 37 | 30 | |
| IRS enforcement | 35 | 14 | CBO's estimate net of its spending, replacing a reading between CBO and Treasury |
| Buyback excise | 17 | 13 | |
| Transactions tax | 30 | 30 | |
| VAT (3 points) | 204 | 186 | per point 68 to 62 |
| Health-sector rents | 20 | 20 | the plan's own figure; no scorer to re-base |

The goal packages re-solve: the Broad-shoulders payroll balancer rises from
2.03 to 2.31 times its 4-point default, the Avoidance-skeptic's from 1.92 to
2.23, the Wealth-first surtax balancer from 1.61 to 1.62. The healthcare
model's headline figures do not move; its wealth-financing line does (next).

**The healthcare model's wealth potential.** `wealthTaxPotential` cited the
same letter and made the same double count: it took $351B as gross and
`wealthCollectionEff` took about 85% of it again. It is now the letter's
estimate gross of its avoidance assumption, carried into the model's 2023
economy by the same rule, with the band kept at the width it had (two
sevenths either side): 302 / 423 / 543, from 250 / 350 / 450 (301 / 422 /
542 until a later review read the letter's printed first-year total, 351,
where its rounded parts sum to 350; 301 / 421 / 541 until the owner's
recalibration of BASE2023 to CMS's latest release, 2026-10-19, moved 2023
GDP from $27,720B to $27,811.5B). Its stress scenario, which typed an
absolute triple, now scales the base by the central ratio that triple
carried (200 of 350), so its mode moves from 200 to 241.7; with the
scenario's lower collection efficiency (68 against 84) it cuts wealth
revenue by about 54%, which its description now states (it had stated the
base's cut alone). A review graded the parameter low-medium, from medium: it
rests on the one letter, which the tax model's wealth instrument already
grades low-medium (contested, no official score). That moves the Risk
chapter's financing family (CP-FIN) from occurrence 3 to 4 on all 20 of its
records, with no record changing band. KPP-C8, the
ordinary-taxpayer burden share, moves from 5.6% in the base case (outside its
5% cap) to 4.2% (inside), and the scenarios in breach from 17 to 10 of 20;
the recalibration then moved it to 3.4%, still 10 of 20 in breach.

### Still open

- ~~The inheritance tax and estate restoration overlap by construction.~~
  **Resolved 2026-10-19 (owner: "implement a correct and mutually exclusive
  version of both").** Read at the sources: Batchelder (2020), Table 3,
  gives TPC's estimate in two rows at a $2.5M exemption, both "include the
  revenue effects of repealing the current estate and gift taxes ($284
  billion in revenue lost over the period)": $337 billion for the inheritance
  tax with constructive realization on gifts and bequests, and $168 billion
  for the inheritance tax alone. Treasury's FY2025 General Explanations put
  "Treat transfers of appreciated property by gift or on death as
  realization events" inside "Reform the taxation of capital income", the
  capital gains reform the model scores. So the full proposal overlapped
  twice: it repeals the estate tax that estate restoration strengthens, and
  it taxes the gains at transfer that the capital gains reform taxes at
  death. The model now (1) makes estate restoration and the inheritance tax
  alternatives, an exclusive group that at most one member of may be on
  (`compute()` refuses a state with both, the page turns one off when the
  other is turned on, and a build row holds the default and every package to
  it), and (2) scores the inheritance tax alone, $168 billion (16 a year in
  the 2024 economy), leaving the gains at transfer to the capital gains
  reform. Each goal package keeps the transfer tax its own description
  names: Wealth-first and Avoidance-skeptic the inheritance tax, Broad
  shoulders estate restoration. Their balancers rise: Wealth-first surtax
  1.62 to 1.74, Broad-shoulders payroll 2.31 to 2.41, Avoidance-skeptic
  payroll 2.23 to 2.41.
- **The rule's known biases.** For a base that grows faster than GDP (an
  unindexed threshold, top wealth), the steady years' share is higher than
  2024's, so the score reads a little high, and the model then grows the
  instrument at its own class rate from 2024. For an estimate that ramps
  past its fifth year (IRS enforcement, where examiners take years to become
  productive), a window figure reads low.
- **Scores computed against superseded law** are unchanged in kind:
  `scoredAgainst` still says which, and the Tax page still totals them.
