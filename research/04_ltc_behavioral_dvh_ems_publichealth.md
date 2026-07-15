# Research Findings: LTC, Behavioral Health, Dental/Vision/Hearing, EMS, Public Health
## Cost Parameter Calibration for National Health Assurance Fiscal Simulation

Compiled July 2026. All figures are the most current publicly available as of this date. Where CMS 2024 NHE detailed category tables were not yet fully published in accessible form, 2023 figures (the latest with full category detail at time of research) are used and flagged.

---

## CP-LTC: Long-Term Care

### CP-LTC-001 — Total U.S. long-term care spending (institutional, nursing care facilities)
- **Value:** $211.3 billion (2023); nursing care facilities = 4.3% of personal health care spending
- **Unit:** USD billion/year
- **Source:** CMS National Health Expenditure (NHE) Accounts, 2023 historical data, as reported via CMS NHE Fact Sheet / Health Affairs 2024 NHE article
- **Confidence:** High for the "nursing care facilities and continuing care retirement communities" line item specifically. Note this does NOT include home health, assisted living (often classified outside NHE as residential care, partly under "other health, residential, and personal care services"), or informal/family caregiving (uncompensated, ~$600B+ imputed value per AARP separately).

### CP-LTC-002 — Total U.S. home health care spending
- **Value:** $147.8 billion (2023), +10.8% growth over 2022; ~3% of total NHE
- **Unit:** USD billion/year
- **Source:** CMS NHE 2023 data, reported by McKnight's Home Care / CMS NHE Fact Sheet
- **Confidence:** High. This is formal, paid home health (skilled, largely post-acute), distinct from personal/custodial home care aide hours (captured under Genworth cost survey, CP-LTC-005).

### CP-LTC-003 — LTC spending by payer: Medicaid share of nursing home care
- **Value:** 30.4% of nursing home care financed by Medicaid (CY2023); more broadly "over one-third of all Medicaid spending pays for long-term care," and Medicaid pays for almost 70% of all home care (HCBS) spending in the U.S.
- **Unit:** Percent
- **Source:** CMS NHE Office of the Actuary (2023) via CBPP; KFF "Medicaid Home Care (HCBS) in 2025"
- **Confidence:** High for Medicaid financing share of nursing homes. The "70% of home care spending" figure is a commonly cited KFF estimate — verify exact year in KFF's underlying dataset before hard-coding.

### CP-LTC-004 — Out-of-pocket and private LTC insurance share of LTC spending
- **Value:** Out-of-pocket = ~$556.6B total NHE OOP (2024, all healthcare, not LTC-specific — 11% of total NHE); private LTC insurance claims paid = ~$14B (2023) to ~$17B (2024)
- **Unit:** USD billion/year
- **Source:** CMS NHE 2024 Highlights (OOP); Milliman "LTCI industry through 2024" / AALTCI 2024-2025 LTC Insurance Statistics (private LTCI claims)
- **Confidence:** Medium. No single NHE line isolates "LTC out-of-pocket" specifically — CMS's OOP figure is economy-wide. A reasonable LTC-specific OOP estimate must be derived (e.g., ~$50-60B/year is a commonly cited academic estimate for LTC-specific out-of-pocket spending; recommend treating as a modeling assumption, not a hard citation, unless a dedicated LTC OOP breakout is located).

### CP-LTC-005 — Average cost of home care (hourly)
- **Value:** Home health aide: $34/hour (2024 national median); Homemaker/companion services: $33/hour (2024, +10% YoY); Private duty nursing: $90/hour median, or $160 median per-visit (2025)
- **Unit:** USD/hour
- **Source:** Genworth/CareScout Cost of Care Survey 2024 and 2025 (www.carescout.com/cost-of-care)
- **Confidence:** High — this is the industry-standard annual survey (140,000+ providers contacted, 15,000+ completed surveys).

### CP-LTC-006 — Average cost of assisted living
- **Value:** $70,800/year national median (2024, +10% YoY) → $6,200/month or $74,400/year (2025, +5% YoY)
- **Unit:** USD/year
- **Source:** Genworth/CareScout Cost of Care Survey 2024 & 2025
- **Confidence:** High.

### CP-LTC-007 — Average cost of nursing home care
- **Value:** Semi-private room: $111,325/year (2024, +7%) → $114,975/year or $315/day (2025, +2%); Private room: $127,750/year (2024, +9%)
- **Unit:** USD/year
- **Source:** Genworth/CareScout Cost of Care Survey 2024 & 2025
- **Confidence:** High. Note wide state variation (e.g., Alaska/Northeast much higher than South).

### CP-LTC-008 — Number of people currently needing LTC / projected growth
- **Value:** ~13 million used paid LTC services (2000) → projected 27 million by 2050 (roughly doubling); ~18.7 million estimated to need some paid LTC in 2030; nursing home resident population could grow >75% to 2.3 million by 2030
- **Unit:** Millions of people
- **Source:** CBO "Rising Demand for Long-Term Services and Supports for Elderly People"; ASPE "Future Supply of LTC Workers"; SeniorLiving.org "Silver Tsunami" 2026 report (secondary aggregator, verify against CBO/ASPE primary)
- **Confidence:** Medium-high for the 2050 doubling trend (CBO-sourced); the 2030 18.7M figure comes from a secondary aggregator and should be cross-checked against the primary source before hard-coding.

### CP-LTC-009 — LTSS spending as share of GDP (projected)
- **Value:** 1.9% to 3.3% of GDP by 2050 (range reflects different CBO scenario assumptions on disability prevalence and paid vs. unpaid care mix)
- **Unit:** Percent of GDP
- **Source:** Congressional Budget Office, "Rising Demand for Long-Term Services and Supports for Elderly People" (https://www.cbo.gov/publication/44363)
- **Confidence:** High (primary CBO source), though the report itself is dated (2013) — a newer CBO LTSS projection should be sought if precision matters; treat as directional range.

### CP-LTC-010 — HCBS waiver waiting list
- **Value:** ~0.7 million people on HCBS waiting lists nationally in most years 2016–2024; 40 states had waiting lists as of 2024 (fluctuating 37-41 states); 73% of waitlist is people with I/DD, 24% seniors/adults with physical disabilities, 3% other (medically fragile children, TBI/SCI, mental illness, HIV/AIDS)
- **Unit:** People (count), percent (composition)
- **Source:** KFF, "A Look at Waiting Lists for Medicaid Home- and Community-Based Services from 2016 to 2024/2025" (https://www.kff.org/medicaid/a-look-at-waiting-lists-for-medicaid-home-and-community-based-services-from-2016-to-2024/)
- **Confidence:** High — this is KFF's authoritative annual HCBS survey.

### CP-LTC-011 — "Home-first" cost differential: HCBS vs. institutional care (avoided institutionalization savings)
- **Value:** Average annual per-person home care cost ≈ $42,000 (2021 estimate, 30 hrs/week @ $27/hr) vs. average nursing home annual cost ≈ $108,000-$119,340 (private room, 2024-2026 estimates) — implies roughly 2.5-3x cost multiplier for institutional vs. home-based care per person. Separately, econometric research: each $1 directed to HCBS was offset by $0.26 in nursing-home-use savings; a 1% increase in state HCBS spending was associated with a decrease of ~47.1 nursing home residents and ~$7.3 million in institutional Medicaid LTSS spending (state-level).
- **Unit:** USD/year per person (levels); dollars-saved-per-dollar-invested and residents-avoided-per-1%-spending-increase (elasticities)
- **Source:** AARP LTSS State Scorecard (home care cost); Genworth/CareScout (nursing home cost); HHAeXchange summary of academic Medicaid HCBS-vs-nursing-home research; JAGS (Journal of the American Geriatrics Society) study cited therein
- **Confidence:** Medium. The cost-differential *ratio* (home is cheaper per-person than institutional) is well-established and directionally robust across sources, but the specific elasticity figures ($0.26 offset; 47.1 residents per 1%) come from a single study context and should be treated as illustrative rather than a universal constant. This is the single most important parameter for CP-LTC-011 "avoided institutionalization savings" — recommend building the simulation with a range (institutional care costs ~2-3x home-based care per person-year) rather than a point estimate.

### CP-LTC-012 — Adult day care cost (supplementary)
- **Value:** $26,000/year national median (2024, +5% YoY)
- **Unit:** USD/year
- **Source:** Genworth/CareScout Cost of Care Survey 2024
- **Confidence:** High.

---

## CP-BH: Behavioral Health / Substance Use Disorder

### CP-BH-001 — Total U.S. mental health + SUD treatment spending
- **Value:** $139.6 billion (2021), up from $40.9 billion in 2000; of the 2021 total, 90.6% ($126.5B) was mental health, 9.4% ($13.1B) was SUD. Grew at real per-capita CAGR of 3.27% (2000-2021), outpacing overall medical services growth (2.21%). MH/SUD share of total medical service spending rose from 4.5% (2000) to 5.5% (2021).
- **Unit:** USD billion/year
- **Source:** Health Affairs, "US National Spending On Mental Health And Substance Use Disorder Treatment Driven By Case Growth, 2000–21" (2025), using SAMHSA/CMS methodology (https://www.healthaffairs.org/doi/10.1377/hlthaff.2025.01351)
- **Confidence:** High — this is the standard peer-reviewed SAMHSA-methodology national spending estimate series, though the most recent year available is 2021 (a multi-year lag is typical for this dataset; projections to later NHE years should apply the ~3.27% real per-capita growth trend or overall NHE growth as a proxy).

### CP-BH-002 — SAMHSA federal agency budget (distinct from total national treatment spending)
- **Value:** $8.89 billion net spending in FY2024
- **Unit:** USD billion/year
- **Source:** SAMHSA FY2025 Congressional Justification (https://www.samhsa.gov/sites/default/files/samhsa-fy-2025-cj.pdf)
- **Confidence:** High, but this is SAMHSA's own federal appropriation/grant spending, NOT total U.S. behavioral health treatment spending — do not conflate with CP-BH-001.

### CP-BH-003 — Unmet mental health treatment need (adults)
- **Value:** 22.8% of adults (58.7 million) had any mental illness (AMI) in past year (2023); 23.0% of adults (59.2 million) received MH treatment; of the 58.7M with AMI, 27.1 million did NOT receive treatment (unmet need ≈ 46% of those with AMI)
- **Unit:** Millions of people / percent
- **Source:** SAMHSA, "Key Substance Use and Mental Health Indicators in the United States: Results from the 2023 National Survey on Drug Use and Health (NSDUH)" (https://www.samhsa.gov/data/report/2023-nsduh-annual-national-report)
- **Confidence:** High — this is the gold-standard federal survey. Note a 2024 NSDUH release also exists (https://www.samhsa.gov/data/report/2024-nsduh-annual-national-report) — use 2024 figures if more current precision is needed; 2023 was the most fully detailed in search results.

### CP-BH-004 — Unmet substance use disorder treatment need
- **Value:** 48.5 million people aged 12+ had an SUD in 2023 (classified as needing treatment); only 15.6% (7.1 million) received treatment; 85.4% (41.1 million) did NOT receive SUD treatment. Ages 18-25 had the lowest treatment receipt rate.
- **Unit:** Millions of people / percent
- **Source:** SAMHSA 2023 NSDUH (same report as CP-BH-003)
- **Confidence:** High.

### CP-BH-005 — Average cost per therapy session
- **Value:** Out-of-pocket (uninsured): $100–$300 typical range, commonly cited median ~$100-$288 for 45-60 min session; with insurance, typical patient cost after copay: $20-$60/session; telehealth: $30-$135
- **Unit:** USD/session
- **Source:** Aggregated from Forbes Health "How Much Does Therapy Cost in 2024", SimplePractice "Average Cost of Therapy in America by State," Project Healthy Minds 2025 — these are industry/consumer-survey aggregators, not a single authoritative federal source
- **Confidence:** Medium. No CMS/federal "average therapy session price" exists; this is assembled from multiple consumer-pricing surveys. Recommend using $100-$150 as a reasonable full (unsubsidized) per-session cost baseline for simulation purposes, consistent with commercial insurance allowed-amount ranges (typically $75-$150 per 45-min CPT 90834 session).

### CP-BH-006 — Average cost per psychiatry visit
- **Value:** Out-of-pocket: $150-$600/session depending on visit type (higher for initial eval); standard follow-up: $100-$300; initial consultation (60-90 min): $250-$500
- **Unit:** USD/visit
- **Source:** Same aggregator class as CP-BH-005 (Care Clinic, MedPsych, Talkspace, Project Healthy Minds)
- **Confidence:** Medium — consumer-pricing-survey sourced, not federal claims data. For higher-confidence figures, Medicare Physician Fee Schedule rates for psychiatric CPT codes (e.g., 90792 initial psychiatric eval ≈ $140-$190 Medicare-allowed; 99214 med management ≈ $110-$130) would be a stronger anchor — recommend a follow-up CMS Physician Fee Schedule lookup if higher precision is needed.

### CP-BH-007 — Average cost of crisis response encounter
- **Value:** 988 Suicide & Crisis Lifeline: ~$82/call (SAMHSA estimate). Mobile crisis teams: operating budgets of roughly $1.0-$1.4 million/year per team (e.g., Bozeman ~$1M/yr, Missoula ~$1.4M/yr), with Medicaid reimbursement covering as little as ~20% of actual cost in some jurisdictions. At least 1,800 mobile crisis teams operate nationwide (2024 survey).
- **Unit:** USD per call (Lifeline); USD/year per team (mobile crisis, budget-level, not per-encounter)
- **Source:** SAMHSA (988 call cost); KFF Health News / NPR reporting on Montana mobile crisis teams (2026); NAMI 988 policy brief
- **Confidence:** Medium. The $82/call Lifeline figure is a solid SAMHSA estimate. Per-encounter mobile crisis team cost (as opposed to annual team budget) was not directly found — would need to be derived by dividing team budgets by annual encounter volume; flagging as a gap (see "additional parameters" below).

### CP-BH-008 — Medication-assisted treatment (MAT) episode cost
- **Value:** Methadone (OTP, daily visits + medication + support services): $126/week ≈ $6,552/year. Buprenorphine (OTP, twice-weekly visits + medication + support): $115/week ≈ $5,980/year. Medication-only costs: buprenorphine ~$100/month; methadone ~$350-450/month.
- **Unit:** USD/year (episode); USD/month (medication only)
- **Source:** National Institute on Drug Abuse (NIDA), "How much does opioid treatment cost?" (https://www.drugabuse.gov/publications/research-reports/medications-to-treat-opioid-addiction/how-much-does-opioid-treatment-cost)
- **Confidence:** High — NIDA is a primary federal source with specific, well-cited figures.

### CP-BH-009 — MAT cost-effectiveness / offsetting savings
- **Value:** MAT (buprenorphine/methadone) associated with $153-$223/month lower total healthcare expenditure vs. no MAT; when criminal-justice costs included, MAT associated with $25,000-$105,000 lifetime cost savings per person vs. no treatment
- **Unit:** USD/month (healthcare offset); USD lifetime (total societal offset)
- **Source:** Peer-reviewed literature synthesized via Recovery Research Institute summary of Medicaid claims studies (PubMed-indexed)
- **Confidence:** Medium — figures are drawn from specific state Medicaid claims studies; useful as an ROI parameter range but not a universal constant.

### CP-BH-010 — Behavioral health workforce shortage (population coverage)
- **Value:** 122+ million people lived in a federally designated Mental Health Professional Shortage Area (HPSA) as of December 2024
- **Unit:** Millions of people
- **Source:** HRSA Health Workforce Shortage Area data / HPSA Find dashboard (https://data.hrsa.gov/topics/health-workforce/shortage-areas/dashboard); figure reported as of Oct 15, 2024 designation list published Nov 5, 2024
- **Confidence:** High — primary HRSA administrative data.

### CP-BH-011 — Psychiatrist shortage projection
- **Value:** Adult psychiatrist shortage of ~18,000-21,000 by 2030 (earlier HRSA projection); child/adolescent psychiatrist unmet need of 7,470 by 2036, growing to a shortage of 19,770 by 2038 (only ~36% of need met) per updated HRSA Behavioral Health Workforce projections
- **Unit:** Number of providers (shortfall)
- **Source:** HRSA Bureau of Health Workforce, "Behavioral Health Workforce Projections, 2017-2030" and "State of the Behavioral Health Workforce, 2025" (https://bhw.hrsa.gov/sites/default/files/bureau-health-workforce/data-research/Behavioral-Health-Workforce-Brief-2025.pdf)
- **Confidence:** High for being HRSA-sourced; note there are two vintages of projections (2017-2030 series and a newer 2025 series extending to 2037-2038) with somewhat different numbers — use the 2025 brief as the more current source.

### CP-BH-012 — Economic burden of untreated mental illness and SUD
- **Value:** Range of estimates depending on scope: (a) narrower direct-cost estimate: $107.3B/year (Yale/related study: $59.5B direct medical + $47.7B indirect); (b) mental illness alone: $282B/year; (c) SUD lost productivity alone: ~$93B/year (2023); (d) broader "substance abuse" (including alcohol/tobacco) total societal cost: >$740B/year; (e) untreated SUD specifically: >$400B/year
- **Unit:** USD billion/year
- **Source:** Multiple: Yale News summary of Yale study (April 2024); NORC at University of Chicago state-level cost studies; EurekAlert coverage of SUD productivity-loss study; CHESS Health white paper
- **Confidence:** Low-Medium — figures vary 3-7x across studies due to differing scope (direct medical only vs. total societal including criminal justice, productivity, mortality). Recommend citing the range explicitly in the simulation and documenting which components (medical/productivity/criminal justice/mortality) each endpoint of the range includes, rather than picking one number.

### CP-BH-013 — Mobile crisis team national footprint
- **Value:** At least 1,800 mobile crisis teams operating nationwide (2024 survey)
- **Unit:** Count
- **Source:** KFF Health News/NPR reporting (Feb 2026), citing a 2024 national survey
- **Confidence:** Medium — secondary reporting of a survey; primary survey source not directly verified.

### CP-BH-014 — SUD treatment receipt gap by age
- **Value:** Ages 18-25 have the lowest SUD treatment receipt rate among all age groups (2023 NSDUH); commonly cited barriers: stigma, cost, lack of resource awareness, inadequate insurance
- **Unit:** Descriptive/qualitative
- **Source:** SAMHSA 2023 NSDUH
- **Confidence:** High (directional finding); no single numeric shortfall isolated for this age band in the search results — would need SAMHSA detailed tables for an exact percentage.

### CP-BH-015 — Mental health/SUD spending growth trend (for projection)
- **Value:** Real per-capita growth rate 3.27%/year (2000-2021), roughly 1 percentage point above overall medical services growth (2.21%/year)
- **Unit:** Percent/year (real, per capita)
- **Source:** Health Affairs 2025 study (same as CP-BH-001)
- **Confidence:** High — useful as the default trend-extrapolation parameter to project CP-BH-001 forward from 2021 to the simulation's base year.

---

## CP-DVH: Dental / Vision / Hearing

### CP-DVH-001 — Total U.S. dental spending
- **Value:** $189.2 billion (2024, +6.6% YoY); $177.4 billion (2023 estimate, +6.4% YoY); represents 3.6% of total NHE (2024). Out-of-pocket and private insurance together = 80% of dental spending.
- **Unit:** USD billion/year
- **Source:** CMS NHE 2024 Highlights (https://www.cms.gov/files/document/highlights.pdf); ADA Health Policy Institute, "National Dental Expenditures, 2024" (https://www.ada.org/resources/research/health-policy-institute/dental-care-market/national-dental-expenses)
- **Confidence:** High — dental is an explicit, well-tracked NHE line item (unlike vision/hearing).

### CP-DVH-002 — Total U.S. vision care spending
- **Value:** $68.3 billion (2024 U.S. optical industry total, +2.7% YoY); $65.6 billion (2023). Breakdown: glasses lenses $17.2B (largest Rx category), plano sunglasses $17.8B (largest non-Rx category). 240+ million U.S. adults (92% of population) regularly use some form of eyewear.
- **Unit:** USD billion/year
- **Source:** The Vision Council, "Market inSights" annual reports (https://thevisioncouncil.org/blog/us-optical-industry-grows-683-billion-according-vision-councils-new-market-insights-report)
- **Confidence:** Medium-High. This is an industry-association market-size estimate (not CMS/NHE), covering the full optical retail market including non-medical/fashion eyewear (e.g., plano sunglasses) — for a "medically necessary vision care" subset relevant to the NHA framework, this figure is likely an overestimate and should be adjusted down (e.g., exclude plano/non-prescription sunglasses, ~$17.8B, to isolate corrective/medical vision spend at roughly ~$50B).

### CP-DVH-003 — Total U.S. hearing/audiology spending
- **Value:** Global hearing aid market $8.3-9.1 billion (2024-2025); no isolated "U.S. hearing/audiology total spending" figure found distinct from device sales. U.S. share of global market is typically estimated at ~35-40% of global hearing aid device sales in other industry reports (not directly confirmed in this search pass).
- **Unit:** USD billion/year
- **Source:** Grand View Research, Fortune Business Insights, Global Market Insights hearing aid market reports (industry market-research firms, not government data)
- **Confidence:** Low — no authoritative U.S.-specific total hearing/audiology spending (devices + exams + audiologist services) figure was located. This is a genuine data gap; recommend flagging for a dedicated follow-up query to HIA (Hearing Industries Association) unit-sales data combined with average selling price, or a CMS supplementary NHE "other professional services" breakout if one exists.

### CP-DVH-004 — Adults lacking dental coverage/access
- **Value:** ~50.2% of dentate adults aged 18-64 with private insurance had dental coverage throughout the past 12 months (implying roughly half of privately-insured adults lack continuous dental coverage); at least 1 in 4 insured adults report cost barriers to dental care, rising to ~39% (Medicaid) and ~37% (Marketplace) enrollees; unmet dental care need prevalence = 41.7% among the uninsured
- **Unit:** Percent
- **Source:** CDC NCHS Data Brief; KFF dental care access research (aggregated via search; primary NCHS data brief URL: https://www.cdc.gov/nchs/products/databriefs/db336.htm)
- **Confidence:** Medium — figures pulled from multiple KFF/CDC sources bundled together in search results; recommend verifying each percentage against its specific primary source/year before hard-coding, as they appear to come from different survey years.

### CP-DVH-005 — Deferred vision/hearing care due to cost
- **Value:** Vision services = 25% of care adults defer due to cost; hearing services (including hearing aids) = 10% of deferred care
- **Unit:** Percent (share of all cost-deferred care)
- **Source:** Referenced in KFF/CBPP-adjacent research on Medicare dental/vision/hearing gaps (https://www.cbpp.org/research/health/medicaid-and-medicare-enrollees-need-dental-vision-and-hearing-benefits)
- **Confidence:** Medium.

### CP-DVH-006 — Average cost of basic dental exam/cleaning
- **Value:** Routine exam + cleaning + X-rays: national average $203 (range $50-$350); cleaning alone: ~$104 average (ADA Survey of Dental Fees 2025), typical range $75-$200; new patient comprehensive visit: $150-$400 total
- **Unit:** USD/visit
- **Source:** ADA Survey of Dental Fees 2025; CareCredit, Guardian, Delta Dental consumer cost guides
- **Confidence:** High for the ADA Survey of Dental Fees figure ($104 cleaning) as it's the standard industry benchmark; consumer-guide ranges are supplementary/directional.

### CP-DVH-007 — Average hearing aid cost
- **Value:** Per pair: $2,000-$7,000 typical prescription range; average ~$4,672/pair across all channels; OTC (over-the-counter, post-2022 FDA rule) starting ~$199-$1,000; premium prescription devices up to $8,000+/pair
- **Unit:** USD/pair
- **Source:** Healthy Hearing (2024 data), Forbes Health, GoodRx hearing aid cost guides
- **Confidence:** Medium-High — consistent figures across multiple consumer-facing sources; the emergence of the OTC hearing aid category (FDA rule effective 2022) is an important recent structural change that should be reflected in the simulation (bimodal pricing: low-cost OTC tier vs. traditional prescription/audiologist-fitted tier).

### CP-DVH-008 — Uninsured rate (general, context for DVH gap)
- **Value:** 7.7% of U.S. population (26 million people) uninsured
- **Unit:** Percent / millions
- **Source:** Aggregated citation via World Health Systems Facts summary of federal uninsured-rate data
- **Confidence:** Medium — verify against most recent Census/CDC NHIS uninsured rate directly, as this figure's exact year/source wasn't fully pinned down in the search snippet.

---

## CP-EMS: EMS / Medical Transport

### CP-EMS-001 — Total U.S. EMS industry spending/revenue
- **Value:** Range of estimates: $15.3 billion (Statista, ambulance services revenue projection for 2024); ~$19 billion (Ken Research, US Ambulance Services Market); ~$22 billion (2026 estimate, industry-revenue forecast); IBISWorld and other market-research firms show similar $15-22B range
- **Unit:** USD billion/year
- **Source:** Statista, Ken Research, IBISWorld, WifiTalents industry aggregator (market-research estimates, not a single federal figure)
- **Confidence:** Medium — no CMS-NHE-style authoritative total EMS spending figure exists (ambulance billing is fragmented across Medicare Part B, Medicaid, private insurance, and direct patient billing, and NEMSIS tracks clinical/operational data rather than spending). Recommend using $18-20B/year as a central working estimate and documenting the range.

### CP-EMS-002 — Annual EMS activation/transport volume
- **Value:** 49+ million EMS activations captured by NEMSIS in 2023 (all 50 states reporting); EMS overall makes 60+ million patient contacts/year; provides 28+ million transports/year nationally; 70-80% of EMS responses result in transport to an ED
- **Unit:** Millions of activations/transports per year
- **Source:** NEMSIS Annual Public Data Report 2023 (https://nemsis.org/wp-content/uploads/2025/02/NEMSIS-Annual-Public-Data-Report-2023_.pdf); NHTSA Office of EMS (EMS.gov)
- **Confidence:** High — NEMSIS is the authoritative national EMS clinical/operational dataset with all-50-state participation.

### CP-EMS-003 — Average cost of ground ambulance transport
- **Value:** Mean cost to complete a transport: $2,673 overall (2024 Medicare Ground Ambulance Data Collection System / GADCS); governmental agencies $3,127, private-for-profit $1,778. Mean reimbursement per transport across all payers: $1,147 — implying agencies are under-reimbursed by ~$1,526/transport on average. CMS average submitted charges: BLS non-emergency ~$1,046; ALS emergency ~$1,536.
- **Unit:** USD/transport
- **Source:** CMS Medicare Ground Ambulance Data Collection System (GADCS), released December 2024 — this is the newest and most authoritative federal cost-of-service data for ground ambulances (mandated by the Bipartisan Budget Act of 2018)
- **Confidence:** High — GADCS is a primary, mandatory federal cost survey and is the best current source, superseding older (2012-2013) GAO estimates.

### CP-EMS-004 — Average cost of air ambulance transport
- **Value:** Median charged price: ~$36,400 (helicopter) / ~$40,600 (fixed-wing) as of 2017 GAO data; prices roughly doubled 2010-2014 (from ~$15,000 to ~$30,000 median for helicopter); by contrast, Medicare's median payment was only $6,502/transport (2014) — a >5x gap between billed charges and Medicare-allowed payment; 69% of privately-insured air ambulance transports were out-of-network (2017 GAO sample)
- **Unit:** USD/transport
- **Source:** GAO-19-292, "Air Ambulance: Available Data Show Privately-Insured Patients Are at Financial Risk" (https://www.gao.gov/products/gao-19-292); GAO-17-637
- **Confidence:** High as a primary GAO source, but data vintage is dated (2014-2017) — real-world current prices are almost certainly higher given ~5-10% annual healthcare cost inflation since; the post-2022 No Surprises Act has changed the billing/dispute landscape (see CP-EMS-005) but a current (2024-2025) median billed-price figure specifically was not located in this pass — flagged as a gap for follow-up.

### CP-EMS-005 — No Surprises Act impact on air ambulance billing (post-2022)
- **Value:** In 2024 Independent Dispute Resolution (IDR) cases for out-of-network air ambulance services, providers prevailed in ~85% of determinations vs. insurers ~15%; median time-to-determination rose from 34 business days (Q1 2024) to 93 business days (Q4 2024), with a declining share resolved within the 33-business-day statutory window
- **Unit:** Percent (prevalence); business days (processing time)
- **Source:** CRS Report R48738, "No Surprises Act (NSA) Independent Dispute Resolution (IDR) Process Data Analysis for 2024" (via Congress.gov)
- **Confidence:** High — CRS report drawing on CMS IDR administrative data. This is a useful post-reform data point showing that even with patient protections in place, air ambulance providers are still winning most billing disputes at above-Medicare rates — relevant to modeling continued cost pressure under status quo vs. potential savings under a single-payer rate-setting framework.

### CP-EMS-006 — Rural EMS coverage gap ("ambulance deserts")
- **Value:** 2.6% of total U.S. population lives in an "ambulance desert" (>25 min from nearest ambulance station); 8.9% of rural residents live in ambulance deserts vs. 0.3% of urban residents; 82% of counties nationally (41-state study) had at least one ambulance desert (84% of rural counties, 77% of urban counties); ~4.5 million people affected nationally, 52% of whom are rural residents; 8 of 41 states studied had fewer than 3 ambulances per 1,000 square miles
- **Unit:** Percent / millions of people
- **Source:** Maine Rural Health Research Center, 2023 "Ambulance Deserts" study (https://www.ruralhealthresearch.org/publications/1596)
- **Confidence:** High — this is the standard academic source for the "ambulance desert" concept and is widely cited (e.g., by Governing, EMS1).

### CP-EMS-007 — EMS workforce shortage / turnover
- **Value:** EMT/paramedic annual turnover 20-30% (implying full staff replacement roughly every 4 years); AAA survey range 6-36% depending on role/certification; ~60% of EMS agencies nationally report insufficient staffing for 911 call demand; 73% of EMS providers report burnout/compassion fatigue; 37% plan to leave the field within 5 years; direct cost of turnover >$11,000/person (2023 AAA/Newton 360 Annual Turnover Study)
- **Unit:** Percent (turnover/burnout rates); USD/person (turnover cost)
- **Source:** American Ambulance Association (AAA)/Newton 360 Annual Turnover Study 2023; various JEMS/EMS1 workforce crisis reporting
- **Confidence:** Medium-High — AAA survey data is industry-authoritative for turnover-cost figures; burnout/staffing-adequacy percentages are drawn from secondary reporting of surveys and should be traced to primary survey reports if higher confidence is needed.

### CP-EMS-008 — EMS industry structure
- **Value:** Ground ambulance = >80% of industry revenue; ~210,000 employees across ~16,000 businesses nationally
- **Unit:** Percent / count
- **Source:** IBISWorld "Ambulance Services in the US Industry Analysis, 2026" (market research)
- **Confidence:** Medium — private market-research firm estimate.

---

## CP-PH: Public Health / Prevention

### CP-PH-001 — Total government public health activity spending (all levels)
- **Value:** $160.2 billion (2023), 3.3% of total NHE — this is the CMS NHE "Government Public Health Activities" line (federal + state + local combined). Note: CMS's broader "Other Third Party Payers and Programs and Public Health Activity" combined category was $590.5 billion in 2024 (-7.0% YoY, 11% of total NHE) — this is a broader bucket that includes other items beyond public health per se, so CP-PH-001's $160.2B (2023) figure is the more precise "public health activities" isolate.
- **Unit:** USD billion/year
- **Source:** CMS National Health Expenditure Accounts, 2023 (via CMS NHE Fact Sheet, https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/nhe-fact-sheet)
- **Confidence:** High for the $160.2B/3.3% figure; medium for reconciling it against the 2024 combined $590.5B category — the two figures are not directly comparable (different category definitions/years) and should not be interpolated naively.

### CP-PH-002 — CDC federal budget
- **Value:** FY2024 discretionary budget authority + PPHF + PHS Evaluation Funds request: $11.581 billion (as requested; actual FY2024 appropriation is ~3% lower than FY2023 in real/inflation-adjusted terms per TFAH); FY2025 discretionary request: $9.683 billion (President's budget request, not necessarily enacted); FY2024 also included $6.1 billion in one-time mandatory pandemic-preparedness funding (part of a broader $20B HHS mandatory pandemic-preparedness allocation)
- **Unit:** USD billion/year
- **Source:** CDC FY2024/FY2025 Budget Fact Sheets (https://www.cdc.gov/budget/); Congressional Research Service CRS Report R47207
- **Confidence:** Medium-High — these are budget *requests*, which can differ from final enacted appropriations; recommend verifying final enacted FY2024/FY2025 CDC appropriation via the enacted Labor-HHS appropriations bill for precision, but the request figures are a reasonable proxy (historically CDC's enacted budget tracks close to, sometimes below, the request).

### CP-PH-003 — State/local public health funding shortfall
- **Value:** Estimated annual shortfall of $4.5 billion in funding needed for state/local health departments to provide "comprehensive public health services" (Foundational Public Health Services model); CDC's Public Health Emergency Preparedness cooperative agreement funded at $735 million/year vs. a recommended $1 billion/year
- **Unit:** USD billion/year
- **Source:** Trust for America's Health (TFAH), "The Impact of Chronic Underfunding on America's Public Health System 2024" (https://www.tfah.org/report-details/funding-2023/ and related 2024/2025 TFAH annual funding reports)
- **Confidence:** High — TFAH is the standard annual tracker for state/local public health funding adequacy and is widely cited by policymakers.

### CP-PH-004 — Proposed FY2026 CDC funding cut (forward-looking risk factor)
- **Value:** President's FY2026 budget proposal reflects a 53% reduction in CDC funding compared to FY2024
- **Unit:** Percent
- **Source:** TFAH September 2025 report on HHS workforce cuts/reorganization (https://www.tfah.org/report-details/funding-report-2025/)
- **Confidence:** High as reported (TFAH), though this is a budget *proposal*, not enacted law — relevant context for modeling public health funding volatility/political risk under status quo, and a useful contrast point for a National Health Assurance framework's presumably more stable/dedicated public health funding stream.

### CP-PH-005 — Vaccination ROI (childhood immunization, domestic)
- **Value:** Two commonly cited figures: (a) CDC-cited "$5+ saved per $1 spent" (direct medical costs + productivity effects) for childhood vaccination generally; (b) a stronger claim of "~$11 saved per $1 spent" cited in secondary sources. Cumulative: routine childhood immunizations 1994-2023 estimated to have produced ~$540 billion in direct medical cost savings and ~$2.7 trillion in total societal savings (illness prevention, productivity, etc.)
- **Unit:** ROI ratio (USD saved per USD spent); cumulative USD (trillion, 30-year horizon)
- **Source:** CDC MMWR, "Health and Economic Benefits of Routine Childhood Immunizations in the Era of the Vaccines for Children Program — United States, 1994–2023" (https://www.cdc.gov/mmwr/volumes/73/wr/mm7331a2.htm)
- **Confidence:** High for the MMWR-sourced cumulative figures ($540B direct, $2.7T societal) — this is a primary CDC publication. The "$5 vs $11 per $1" discrepancy across secondary sources should be resolved by citing the MMWR study directly rather than either round-number claim; recommend using the $540B/$2.7T (1994-2023, 30-year cumulative) as the primary citable figure and deriving an implied average annual ROI from it if a per-dollar ratio is needed for the simulation.

### CP-PH-006 — Global immunization ROI (context, not U.S.-specific)
- **Value:** ~$52 saved per $1 invested in low- and middle-income country immunization programs
- **Unit:** ROI ratio
- **Source:** Cited via CDC Global Immunization program materials
- **Confidence:** Medium — this is a global/LMIC figure, not applicable to U.S. cost modeling directly; include only as contextual/comparative data, not as a direct simulation input.

---

## Additional / Cross-Cutting Parameters Worth Adding

### CP-LTC-013 (proposed) — Long-term care workforce shortage
- **Note:** Not fully quantified in this pass, but ASPE's "Future Supply of Long-Term Care Workers in Relation to the Aging Baby Boom Generation" report (https://aspe.hhs.gov/reports/future-supply-long-term-care-workers-relation-aging-baby-boom-generation-0) is the standard source and should be pulled for a specific worker-shortfall number (direct care workforce shortage is frequently cited in the hundreds-of-thousands to low-millions range by other advocacy sources, but a precise ASPE figure was not captured in this search pass — flagged as a follow-up item).

### CP-BH-016 (proposed) — Behavioral health parity enforcement gap
- **Rationale:** The Mental Health Parity and Addiction Equity Act (MHPAEA) compliance gap (i.e., the frequency/magnitude of insurers imposing more restrictive limits on behavioral health vs. medical/surgical benefits, and the resulting effective cost-shifting to patients) is a well-documented and quantifiable phenomenon (DOL/HHS/Treasury annual MHPAEA Report to Congress) that would strengthen the simulation's rationale for a unified BH benefit design under NHA. Recommend a follow-up query to the most recent MHPAEA Report to Congress.

### CP-DVH-009 (proposed) — Medicare dental/vision/hearing benefit cost estimate (CBO score precedent)
- **Rationale:** CBO has scored federal bills adding dental/vision/hearing benefits to Medicare (e.g., in the Build Back Better Act and various standalone bills), producing a directly relevant 10-year cost estimate for adding DVH as a universal benefit — this is likely the single best available proxy for "what would it cost to add DVH benefits nationally" and should be retrieved as a CBO cost-estimate citation (e.g., CBO's 2021 estimate for adding dental/vision/hearing to Medicare Part B was on the order of $350-400 billion over 10 years before it was narrowed in final legislation). Recommend a dedicated follow-up search: "CBO score Medicare dental vision hearing benefit cost estimate."

### CP-EMS-009 (proposed) — Community paramedicine / treat-in-place cost offset
- **Rationale:** A growing body of literature on "community paramedicine" and "treat-no-transport" models shows meaningful cost avoidance (avoided ED visits/transports) that would be directly relevant to CP-EMS efficiency assumptions in the NHA framework. The National Rural Health Association's December 2024 policy brief on community paramedicine (https://www.ruralhealth.us/nationalruralhealth/media/documents/advocacy/policy%20brief/nrha-policy-brief-community-paramedicine-final.pdf) is a good starting point for a follow-up.

### CP-PH-007 (proposed) — Public health workforce shortage (governmental public health, non-BH)
- **Rationale:** Distinct from the BH/psychiatrist shortage (CP-BH-010/011), the state/local governmental public health workforce itself has a well-documented shortage (de Beaumont Foundation / PH WINS survey series tracks this annually, including a widely cited "shortage of ~80,000 full-time-equivalent positions" figure from pre-pandemic analyses). Recommend a follow-up query: "de Beaumont Foundation PH WINS 2024 governmental public health workforce shortage number."

### CP-LTC-014 (proposed) — Informal/family caregiver imputed economic value
- **Rationale:** AARP's biennial "Valuing the Invaluable" report estimates the imputed dollar value of unpaid family caregiving nationally (last known figure order-of-magnitude ~$600 billion, though this pass did not directly verify the current AARP figure). This is highly relevant to a single-payer LTC framework because unpaid family care is currently substituting for a large share of what CP-LTC-001/002 formal spending would otherwise have to cover — a critical "hidden cost" baseline for the simulation. Recommend a dedicated follow-up: "AARP Valuing the Invaluable 2023 2024 family caregiving economic value billion."

---

## Summary of Confidence & Follow-Up Recommendations

**High-confidence, ready to hard-code:**
- Genworth/CareScout LTC cost survey figures (CP-LTC-005, 006, 007, 012)
- CMS NHE dental spending (CP-DVH-001)
- SAMHSA NSDUH unmet need figures (CP-BH-003, 004)
- NIDA MAT episode costs (CP-BH-008)
- GADCS ground ambulance costs (CP-EMS-003)
- NEMSIS EMS volume (CP-EMS-002)
- KFF HCBS waiting list data (CP-LTC-010)
- CDC MMWR vaccination ROI (CP-PH-005)

**Medium-confidence, usable with documented ranges:**
- Total LTC spending by payer split (CP-LTC-001 through 004) — no single clean "total LTC spending, all payers, one number" source exists; must be assembled from nursing care facility + home health + HCBS + private LTCI + OOP components
- Air ambulance current pricing (CP-EMS-004) — data is 2014-2017 vintage, needs inflation adjustment or a fresher source
- Vision/hearing total spending (CP-DVH-002, 003) — industry market-size figures, not medical-spending-specific
- Economic burden of untreated MH/SUD (CP-BH-012) — wide variance by study scope

**Low-confidence / genuine gaps requiring dedicated follow-up:**
- U.S.-specific total hearing/audiology spending isolated from device sales (CP-DVH-003)
- Current (post-2022 No Surprises Act) air ambulance median billed price
- CBO score for universal Medicare-style dental/vision/hearing benefit (proposed CP-DVH-009)
- LTC direct-care workforce shortage headcount (proposed CP-LTC-013)
- Per-encounter (not per-team-budget) mobile crisis response cost (CP-BH-007 partial gap)
