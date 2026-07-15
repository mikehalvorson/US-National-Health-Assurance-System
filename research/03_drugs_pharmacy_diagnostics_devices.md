# Research: Drugs, Pharmacy/PBM, Public Manufacturing, and Diagnostics/Devices/Labs/Imaging
Baseline calibration data for the National Health Assurance fiscal simulation.
Compiled 2026-07-15. All figures cited to primary or near-primary sources found via live web search; URLs included for verification.

---

## CP-RX: Prescription Drugs / Pharmacy / PBM / Public Manufacturing

### CP-RX-001 — Total U.S. retail prescription drug spending (CMS NHE)
- **Value:** $467.0 billion (2024), up 7.9% from 2023
- **Unit:** USD billions/year, retail (pharmacy-dispensed) only
- **Source:** CMS, National Health Expenditure (NHE) 2024 Highlights; CMS NHE Fact Sheet. https://www.cms.gov/files/document/highlights.pdf ; https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/nhe-fact-sheet
- **Confidence:** High — official CMS actuary data, most authoritative available. Note: retail drugs were <9% of the $5.28 trillion total NHE in 2024.

### CP-RX-002 — Total U.S. drug spending INCLUDING hospital/clinic-administered drugs
- **Value:** Approximately $680–730 billion/year (2024 est.), i.e., retail ($467B) + provider-administered drugs embedded within hospital and physician/clinical-services NHE categories, estimated at an additional 4–5% of total NHE (~$212–264B on a $5.28T base)
- **Unit:** USD billions/year
- **Source:** CMS NHE 2024 Highlights (retail figure); MedPAC July 2024 Data Book, Section 10 (Prescription Drugs), which notes provider-administered drugs are booked under hospital/physician categories, not retail drug spending. https://www.medpac.gov/wp-content/uploads/2024/07/July2024_MedPAC_DataBook_Sec10_SEC.pdf
- **Confidence:** Medium — this is a derived/composite estimate, not a single official published line item, because CMS NHE does not publish a unified "all drug spending" total. Treat as a range; a coding agent should model retail and provider-administered drug spend as separate line items pulling from the $467B (retail) and a % of hospital/physician-services categories (~4-5%) rather than a single hard number.

### CP-RX-003 — U.S. vs. international drug price comparison (RAND gold standard)
- **Value:** U.S. prices average **2.78x** those in 33 comparison OECD/high-income countries overall (2022 data, published Feb 2024); **4.22x** for brand-name drugs specifically; even after adjusting for estimated U.S. rebates, brand prices remain **≥3.22x** higher; for generics, U.S. prices are actually *lower* than comparison countries. U.S. accounts for 62% of the aggregate drug spending across the studied nations while consuming only 24% of the volume.
- **Unit:** Ratio (multiple of U.S. price to comparator-country price)
- **Source:** RAND Corporation, "International Prescription Drug Price Comparisons: Estimates Using 2022 Data," RRA788-3, published Feb 1 2024. https://www.rand.org/pubs/research_reports/RRA788-3.html ; press release https://www.rand.org/news/press/2024/02/01.html . (Prior round for trend: RAND RR2956, 2021 data — 2.56x.)
- **Confidence:** High — this is the most frequently cited, methodologically transparent international comparison; funded via ASPE/HHS. Trend across rounds (2.56x in 2021 data → 2.78x in 2022 data) suggests gap has been widening.

### CP-RX-004 — Insulin-specific international price gap
- **Value:** U.S. insulin prices range from **457% to 3,799% higher** than in comparison countries (most extreme category in the RAND dataset)
- **Unit:** Ratio
- **Source:** RAND RRA788-3 (as above), insulin sub-analysis.
- **Confidence:** High for directionality/order of magnitude; wide range reflects different insulin products/formulations compared.

### CP-RX-005 — PBM spread pricing (FTC)
- **Value:** The "Big 3" PBMs (Caremark/CVS, Express Scripts, OptumRx) generated an estimated **$1.4 billion** in spread-pricing income specifically on analyzed specialty generic drugs, and **>$7.3 billion** in revenue from dispensing (at affiliated specialty pharmacies) drugs priced in excess of estimated acquisition cost, over the study period **2017–2022**. Markups on many specialty generics ran into the "thousands of percent."
- **Unit:** USD billions, cumulative over a ~6-year study window (not annualized in the report)
- **Source:** FTC, "Pharmacy Benefit Managers: The Powerful Middlemen Inflating Drug Costs and Squeezing Main Street Pharmacies" — Second Interim Staff Report, January 2025 (and first interim report July 2024). https://www.ftc.gov/system/files/ftc_gov/pdf/pharmacy-benefit-managers-staff-report.pdf ; https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-releases-second-interim-staff-report-prescription-drug-middlemen
- **Confidence:** Medium — figures cover only "specialty generic drugs" at PBM-affiliated specialty pharmacies, a narrow slice of total PBM-managed spend, not economy-wide spread pricing. A coding agent should NOT treat $1.4B as total industry spread pricing; total spread pricing across the whole PBM industry across all drug classes is not precisely quantified in any single official source — model as a wide uncertainty range or flag as data gap. State-level PBM audits (e.g., Ohio's ~2018 finding of ~$224M/year spread pricing in its Medicaid managed care program alone) can be used as a supplementary data point suggesting spread pricing scales into the many billions nationally when extrapolated, but no authoritative national total exists.

### CP-RX-006 — CBO score: Medicare drug price negotiation (IRA) savings
- **Value:** CBO originally estimated **$98.5 billion** in direct Medicare program savings over 10 years (2022–2031) from the negotiation provision itself; the broader package of IRA drug-pricing provisions (negotiation + inflation rebates + Part D redesign) was estimated to reduce the federal deficit by **$237 billion** over 10 years (2022–2031), of which ~$160B tied to Part D/pricing-limit redesign elements. CBO separately projects negotiated ("maximum fair price") prices will reduce **net prices for the selected drugs by ~50% on average**, though because negotiated drugs are a minority of total Part D spend, aggregate net-price reduction across all Medicare drug spending is much smaller than 50%.
- **Unit:** USD billions over 10-year window (2022-2031 budget window); % price reduction for negotiated-drug subset
- **Source:** CBO, "How CBO Estimated the Budgetary Impact of Key Prescription Drug Provisions in the 2022 Reconciliation Act," Feb 2023. https://www.cbo.gov/publication/58850 ; https://www.cbo.gov/system/files/2023-02/58850-IRA-Drug-Provs.pdf . Updated CBO presentation to Panel of Health Advisers, Sept 2025: https://www.cbo.gov/system/files/2025-09/61547-Drug-Provisions-2022-Reconciliation.pdf (per AEI commentary, later CBO re-estimates show some erosion of projected deficit reduction — see https://www.aei.org/health-care/new-cbo-estimates-point-to-further-erosion-of-the-iras-projected-deficit-reduction/ )
- **Confidence:** High for the original $98.5B/$237B CBO figures (official scores); Medium for durability — CBO has since revised estimates downward in 2025 re-scoring, so simulation should treat this as a "policy-precedent" input showing negotiation CAN save 10-20% of program-level drug spend over a decade, not an exact transferable number for a full single-payer system (IRA negotiation applies only to a small number of high-spend drugs, phased in).

### CP-RX-007 — First-round (2026) negotiated price discounts, realized examples
- **Value:** For the first 10 drugs selected, negotiated 2026 prices vs. 2023 list prices ranged from a **38% discount (Imbruvica)** to a **79% discount (Januvia)**.
- **Unit:** % discount off list price
- **Source:** ASPE/CMS, "Medicare Drug Price Negotiation Program: Medicare Prices Negotiated for 2026 Compared to List and U.S. Market Prices." https://www.aspe.hhs.gov/reports/medicare-prices-negotiated-2026 ; CMS fact sheet https://www.cms.gov/newsroom/fact-sheets/medicare-drug-price-negotiation-program-negotiated-prices-initial-price-applicability-year-2026
- **Confidence:** High — actual realized/announced negotiated prices, not a projection.

### CP-RX-008 — Insulin: U.S. price vs. cost of production (Yale/BMJ Global Health)
- **Value:** Estimated production cost per vial: human insulin **$2.28–$3.42**; analog insulins **$3.69–$6.16**. Estimated *profitable* manufacturer selling price for a full year's biosimilar supply: human insulin **$48–$71/person/year**; analog insulins **$78–$133/person/year**. (For contrast, U.S. list prices for a single vial have historically run $250-$300+, and many patients use multiple vials/month.)
- **Unit:** USD per vial (production cost); USD per patient-year (sustainable/profitable price)
- **Source:** Gotham, Barber, Hill, "Production costs and potential prices for biosimilars of human insulin and insulin analogues," BMJ Global Health, Sept 25 2018. https://pmc.ncbi.nlm.nih.gov/articles/PMC6157569/ ; https://pubmed.ncbi.nlm.nih.gov/30271626/ ; Yale School of Medicine summary: https://medicine.yale.edu/news-article/diabetes-medication-lower-costs/ ; follow-on Yale coverage of newer diabetes/weight-loss drugs vs. production cost: https://medicine.yale.edu/news-article/prices-of-expensive-diabetes-medicines-and-weight-loss-drugs-are-drastically-higher-than-production-costs/
- **Confidence:** High as a widely-cited academic cost-of-goods estimate; note it models cost of a hypothetical competitive biosimilar manufacturer (i.e., a public/nonprofit manufacturer scenario), which is exactly analogous to the "Public Medicines Corporation" concept — very strong direct calibration input.

### CP-RX-009 — Real-world public/nonprofit insulin pricing precedent
- **Value:** Civica Rx (nonprofit) announced insulin (glargine, lispro, aspart) priced at **$30/vial or $55 for a 5-pack of pens**, list price, available to anyone regardless of insurance — in line with the Yale/BMJ production-cost-plus-margin estimate above.
- **Unit:** USD per vial / per pen-pack
- **Source:** CNN, "Civica Rx will provide insulin for no more than $30 a vial," March 2022. https://www.cnn.com/2022/03/03/politics/civica-insulin-affordable-drug/index.html
- **Confidence:** High — this is a real, executed nonprofit pricing decision, not a model estimate. Strongest available real-world proof-point for public-manufacturer cost-plus pricing.

### CP-RX-010 — Generic drug market share and savings
- **Value:** Generics + biosimilars = **90% of all U.S. prescriptions dispensed** but only **~12–13% of total drug spending** (roughly $98B of generics spend vs. ~$700B brand-name spend in 2024, on a mix of ~3.9B generic scripts vs. 435M brand scripts). Aggregate savings attributable to generic/biosimilar substitution: **$467 billion in 2024 alone**; **$3.4 trillion cumulative over the last 10 years**.
- **Unit:** % of prescription volume; % of spend; USD billions/year in savings
- **Source:** Association for Accessible Medicines (AAM) & IQVIA Institute, "2025 U.S. Generic & Biosimilar Medicines Savings Report" (covering 2024 data). https://accessiblemeds.org/resources/reports/2025-savings-report/ ; https://accessiblemeds.org/wp-content/uploads/2025/01/AAM-2024-Generic-Biosimilar-Medicines-Savings-Report.pdf
- **Confidence:** Medium-High — AAM is a generics-industry trade association (potential rosy framing on "savings"), but the underlying utilization/spend split (90% volume / 12-13% spend) is corroborated by IQVIA and is broadly consistent across independent sources (CMS, Statista brand/generic share). Use volume/spend split with high confidence; treat the "$467B saved" headline as an industry-favorable framing (counterfactual-dependent) with lower confidence.

### CP-RX-011 — Civica Rx: model mechanics and scale
- **Value:** Founded 2018 by health systems/philanthropies as a nonprofit generic manufacturer to fight shortages and price spikes. Contract model: same price per drug for all members regardless of order volume; limits volume commitments to ~50% of a member's total need (preserves competition/backup supply); maintains 6-month buffer stock; multi-CMO sourcing (N. America, Europe, S. Asia) for supply resilience. New sterile-injectable plant in Petersburg, VA: 140,000 sq ft, **$124.5 million capital investment**, scaling toward **$200M+/year in annual commercial output**. Reliability: **96% fulfillment of contractually guaranteed volume (2020-2022)** vs. **86%** for conventional wholesalers over the same period.
- **Unit:** Mixed (USD capital cost, USD annual output, % fulfillment rate)
- **Source:** ASPE, "The Potential Role of the Nonprofit Pharmaceutical [Manufacturer]," July 2024 issue brief. https://aspe.hhs.gov/sites/default/files/documents/98c11253d18fc571f0b7bd3dd45fbce1/nonprofit-pharma-report.pdf and companion quantitative brief https://aspe.hhs.gov/sites/default/files/documents/d669257d8e740ca9422d7d004a3f6e3f/sdp-nonprofit-quantitative-ib.pdf ; Civica Rx company history https://civicarx.org/timeline-2024/ ; BioSpace coverage of supply-security study https://www.biospace.com/civica-rx-s-unique-business-model-improves-drug-supply-security-cuts-costs-study
- **Confidence:** High — this is a live, operating, federally-studied (HHS/ASPE) precedent and is the best available real-world proxy for the framework's "Public Medicines Corporation." Recommend citing this directly in the simulation's model documentation as the primary calibration source for public-manufacturer capex-per-unit-output and reliability assumptions.

### CP-RX-012 — Rebate structure / formulary exclusion dynamics (context, not a hard number)
- **Value:** No single national dollar total for "rebates retained by PBMs" was found in a directly citable form; the FTC reports describe *mechanism* (rebates sometimes conditioned on excluding lower-cost generics/biosimilars from formularies) rather than publishing an aggregate retained-rebate dollar figure.
- **Source:** FTC Interim/Second Interim Staff Reports (as above).
- **Confidence:** Low/data-gap — flag explicitly. If the simulation needs a "rebate retention rate" parameter, note that independent estimates (e.g., from PBM-industry-adjacent research, Drug Channels analyses) commonly place PBM rebate retention somewhere in the **low single digits to ~10-20%** of negotiated rebate dollars depending on contract type (traditional vs. "pass-through" PBM models), but treat any specific number here as an assumption requiring a sensitivity range, not a hard fact — recommend flagging as CP-RX-012 "data gap, model as 0-20% sensitivity band."

### CP-RX-013 — Total pharmaceutical/PBM industry revenue scale (context)
- Not separately verified in this pass — flagged for potential follow-up if the simulation needs PBM-industry total revenue (the Big 3 PBMs process the substantial majority of U.S. prescription claims — commonly cited as ~80% combined market share for CVS Caremark/Express Scripts/OptumRx — but this specific share figure was not independently re-verified in this research pass and should be confirmed before hard-coding).

### CP-RX-014 [NEW PARAMETER] — Hospital markup on physician-administered drugs (340B/buy-and-bill context)
- **Value:** RAND 5.1 hospital price transparency data: commercial insurance prices for select physician/hospital-administered drugs averaged **278% of average sales price (ASP)**, compared with **106% of ASP** paid by Medicare for the same drugs.
- **Unit:** % of ASP (average sales price)
- **Source:** RAND, "Prices Paid to Hospitals by Private Health Plans: Findings from Round 5.1," May 2024. https://www.rand.org/pubs/research_reports/RRA1144-2-v2.html ; https://www.rand.org/news/press/2024/05/13.html
- **Confidence:** High. Useful additional calibration point for modeling savings from a single-payer system paying Medicare-like (ASP-based) rates for infused/injected drugs rather than commercial buy-and-bill markups.

### CP-RX-015 [NEW PARAMETER] — Overall hospital commercial-to-Medicare price ratio (facility services, all types incl. imaging/drugs)
- **Value:** In 2022, commercial (employer/private insurer) prices paid to hospitals averaged **254% of Medicare** for inpatient facility services and **279% of Medicare** for outpatient facility services, overall. State-level range: from <170% of Medicare (Arkansas) to >300% (California, Delaware, Florida, Georgia, New York, South Carolina, West Virginia, Wisconsin).
- **Unit:** % of Medicare rate
- **Source:** RAND Hospital Price Transparency Study, Round 5.1 (2024), as above.
- **Confidence:** High — large, well-regarded, employer-coalition-funded study (~4,000 hospitals/ASCs, 2020-2022 claims). This is a critical general calibration parameter for modeling savings from moving all payers to Medicare-equivalent (or negotiated single-payer) rates system-wide, applicable beyond just drugs (also feeds CP-DX below).

---

## CP-DX: Diagnostics / Devices / Labs / Imaging

### CP-DX-001 — Total 2024 NHE by major category (CMS)
- **Value:** Total NHE 2024 = **$5.28 trillion** (personal health care = $4.51T, >85% of total). Largest categories: Hospital care **$1.63 trillion**; Physician & clinical services **$1.11 trillion** (grew 8.1%); Prescription drugs (retail) **$467.0 billion**. Dental services: **$189 billion** (2024, +4% real growth from 2023, per ADA Health Policy Institute analysis of NHE data). "Other professional services" and dental services combined were the **fastest-growing category, +44.0% cumulative from 2020-2024**.
- **Unit:** USD trillions/billions per year
- **Source:** CMS NHE 2024 Highlights, https://www.cms.gov/files/document/highlights.pdf (note: this PDF returned HTTP 403 on direct fetch during this research pass; figures below are drawn from search-result excerpts of the same document and corroborating secondary sources — American Action Forum summary https://www.americanactionforum.org/insight/2024-national-health-expenditures-analyzing-what-we-spend-on-health-care/ ; ADA Health Policy Institute, "National Dental Expenditures, 2024," https://www.ada.org/resources/research/health-policy-institute/dental-care-market/national-dental-expenses
- **Confidence:** High for the headline totals (multiply-corroborated); Medium for the precise DME ("durable medical equipment") and "other non-durable medical products" and "other professional services" category-level dollar splits specifically — CMS publishes these in its detailed NHE tables (NHE Table 2) but this research pass could not directly access the raw table (403 error on cms.gov PDF); a coding agent should pull CMS NHE Table 2/16 (historical and by-type-of-service) directly, or use KFF/Peterson's "State Health Facts" / Health System Tracker interactive data export, for the exact DME and other-professional-services dollar splits. **Flag as a follow-up data pull**, since the CMS site blocked automated fetch in this session — a human or differently-configured agent should retrieve https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/nhe-fact-sheet Table 2 directly.

### CP-DX-002 — U.S. medical device market size
- **Value:** Range across market-research sources: **~$185–207 billion** (device *market/sales* estimates, Fortune Business Insights ~$188.7B, Astute Analytica ~$184.5B, one source citing the US at ~38% of global device revenue ≈ $207B) up to **~$256 billion** (Grand View Research, broader "manufacturers market" scope). Growing toward ~$315B by 2032 (6.8% CAGR consensus range).
- **Unit:** USD billions/year
- **Source:** Fortune Business Insights, "U.S. Medical Devices Market," https://www.fortunebusinessinsights.com/u-s-medical-devices-market-107009 ; Grand View Research, https://www.grandviewresearch.com/industry-analysis/us-medical-device-manufacturers-market ; Healthcare Finance News summary https://www.healthcarefinancenews.com/news/united-states-remains-largest-market-medical-devices-more-150-billion
- **Confidence:** Medium — these are private market-research estimates (methodologies not fully public/consistent), not a government statistical series; use as a range ($185–256B), not a point estimate. CMS NHE does track device spending indirectly within DME + hospital/physician supply costs but doesn't publish a single unified "medical device" line — this private-sector range is the best available proxy.

### CP-DX-003 — Common lab test pricing: Medicare CLFS rate vs. average billed charge
- **Value:**
  - Basic Metabolic Panel (CPT 80048): Medicare CLFS pays **~$8.27**; average provider billed charge **~$46.84** (5.7x markup)
  - Comprehensive Metabolic Panel (CPT 80053): Medicare pays **$10.33**; average charge **~$59.85** (5.8x markup)
  - Complete Blood Count (CPT 85025): average billed charge **~$36** (Medicare CLFS rate for CBC is typically in the ~$8-10 range, though the exact 2025 rate was not independently pulled in this pass)
  - CY2025 CLFS national minimum payment amount: **$18.19** (+2.4% vs CY2024)
- **Unit:** USD per test
- **Source:** CMS, "Clinical Laboratory Fee Schedule: 2025 Annual Update" (MM13889), https://www.cms.gov/files/document/mm13889-clinical-laboratory-fee-schedule-2025-annual-update.pdf ; CareRoute cost-lookup pages compiling CMS 2026 rates vs. average charges: https://www.careroute.ai/costs/cpt/80053 and https://www.careroute.ai/costs/cpt/80048 ; general blood-test pricing summary https://healthbillcentral.com/blog/blood-test-cost
- **Confidence:** Medium-High for the Medicare CLFS rates (official schedule); Medium for "average billed charge" figures which come from a third-party cost-aggregator site rather than a primary CMS/claims database — a coding agent could supplement with HCCI or FAIR Health billed-charge data for more rigor, but directionally these 4-6x commercial/list markups over Medicare lab rates are consistent with broader hospital-pricing literature (see CP-RX-015 above, same ballpark ratio).

### CP-DX-004 — Imaging cost benchmarks: average commercial price
- **Value:** Average U.S. price (commercial insurance) for an **MRI: $1,959**; **CT scan: $1,438** (2022 data).
- **Unit:** USD per study
- **Source:** Health Care Cost Institute (HCCI), cited in "Most Spending on Imaging Services Went to CT Scans, X-Rays, and Ultrasounds." https://healthcostinstitute.org/all-hcci-reports/most-spending-on-imaging-services-went-to-ct-scans-x-rays-and-ultrasounds/
- **Confidence:** High — HCCI is a well-regarded, claims-data-based nonprofit research organization (one of the best sources for commercial claims pricing).

### CP-DX-005 — Imaging: commercial-vs-Medicare price ratio, by study type
- **Value:** Commercial insurance pays roughly **2.2x to 5.9x Medicare rates** for imaging depending on modality/body part — e.g., mammography of both breasts ~2.2x; CT scan of head/brain without contrast ~5.9x; MRI brain w/ and w/o contrast: median commercial $1,788 vs. Medicare $446 (**4.0x**). Within-modality spread across hospitals is also large: 10th-90th percentile commercial price for brain MRI ranged **$965 to $3,033** (>3x spread even among commercially-insured prices alone). Pelvis CT with contrast: mean price by payer type ranged from **$382.70 (Medicaid)** to **$2,875.70 (list/chargemaster price)** — a **7.5x** spread.
- **Unit:** Ratio / USD per study
- **Source:** Johns Hopkins Carey Business School study, "Hospital Prices for Radiology Services 2 to 6 Times Higher than Medicare Rates," Dec 2021, https://hub.jhu.edu/2021/12/13/radiological-services-compared-to-medicare/ ; "Commercial price variation for common imaging studies," Health Affairs Scholar, 2024/2025, https://academic.oup.com/healthaffairsscholar/article/3/5/qxaf092/8122480 (open PMC version: https://pmc.ncbi.nlm.nih.gov/articles/PMC12097484/ )
- **Confidence:** High — peer-reviewed, claims-based studies using price-transparency data, consistent with RAND's broader hospital-pricing findings (CP-RX-015).

### CP-DX-006 — Medicare Physician Fee Schedule: specific imaging payment amounts
- **Value:** Illustrative 2025 Medicare payment/beneficiary-cost figures found: brain MRI **~$58 (freestanding facility) / ~$91 (hospital outpatient)** patient-paid portion context; general CT scan **~$185 (independent imaging center) / ~$340 (hospital outpatient)**; CT Colonography screening (CPT 74263) professional component **$108.68**; single-view chest X-ray (CPT 71045) essentially flat vs. 2024. 2025 MPFS conversion factor: **$32.3465/RVU**, down 2.83% from 2024's $33.2875.
- **Unit:** USD per study (Medicare-allowed amount or patient cost-share, mixed — see caveat) 
- **Source:** CMS Physician Fee Schedule portal, https://www.cms.gov/medicare/payment/fee-schedules/physician ; AuntMinnie / HAP USA industry summaries of the 2025 final rule: https://www.auntminnie.com/practice-management/administration/economics/article/15708752/healthcare-administrative-partners-medicare-finalizes-2025-fee-schedule-cut ; https://info.hapusa.com/blog-0/what-is-the-impact-of-the-2025-medicare-fee-schedule-changes-on-radiology-practices ; Medicare.gov Procedure Price Lookup tool (per-code): https://www.medicare.gov/procedure-price-lookup/cost/70553/
- **Confidence:** Medium — the search-derived figures mix "full Medicare-allowed payment" and "beneficiary out-of-pocket cost-share" concepts inconsistently across sources; a coding agent should NOT hard-code these numbers as authoritative and should instead query the CMS Physician Fee Schedule Lookup Tool or Medicare.gov Procedure Price Lookup directly by CPT code (70551/70553 brain MRI, 74177 abdomen/pelvis CT, 71046 chest X-ray 2-view, etc.) for precise, current national-average allowed amounts. Treat the numbers above as order-of-magnitude anchors only ($50-100 for X-ray, ~$100-450 for CT depending on site of service, ~$400-1,100 for MRI is the typical Medicare-allowed range reported across various CPT codes in adjacent literature).

### CP-DX-007 — Low-value care / duplicate testing spending estimates
- **Value:** Narrow estimate (overtreatment/low-value-care category specifically, applying Institute of Medicine's 2010 waste taxonomy): **$75.7–$101.2 billion/year**. More recent framing: "**more than $100 billion annually**" on low-value tests/treatments. Broader total health-system "waste" (six IOM categories: failure of care delivery, failure of care coordination, overtreatment/low-value care, pricing failure, fraud & abuse, administrative complexity): **$760–935 billion/year, ~25% of total U.S. health spending**.
- **Unit:** USD billions/year
- **Source:** Shrank, Rogstad, Parekh, "Waste in the US Health Care System: Estimated Costs and Potential for Savings," JAMA, Oct 2019 (the widely-cited $760-935B / 25% figure; commonly summarized in secondary coverage e.g. HealthLeaders https://www.healthleadersmedia.com/clinical-care/wasteful-spending-us-healthcare-estimated-760-billion-935-billion and Healthcare Dive https://www.healthcaredive.com/news/waste-gobbles-up-25-of-us-healthcare-spending-jama-study-finds/564433/ ); low-value-care-specific $75.7-101.2B figure drawn from the same JAMA/overtreatment literature; Choosing Wisely / Lown Institute maintain an ongoing "low-value care" tracker: https://lowninstitute.org/lown-issues/low-value-care/
- **Confidence:** High for the fact that a widely-cited, peer-reviewed JAMA estimate exists in this range; Medium on precision — waste-estimate literature has wide methodological variance study-to-study, and figures should be treated as an order-of-magnitude planning range ($75-100B low-value-care-specifically; up to ~$760-935B total system waste including administrative complexity, fraud, pricing failure, etc., which are separate parameters from pure "duplicate testing").

### CP-DX-008 — Group Purchasing Organization (GPO) device/supply savings
- **Value:** Estimates vary substantially by source/methodology: **~$34.1 billion/year** (Healthcare Supply Chain Association/HSCA industry-funded, extrapolating to ~$456.6B over a decade) up to **~$55 billion/year** (~$864B over 10 years) per an industry-adjacent healthcare-economist analysis of Medicare claims data. Separately, former FTC Chair Jon Leibowitz's analysis found GPOs save providers an average of **10-18% on products/services** procured through them. Countervailing: a GAO pilot study found GPO-negotiated prices were "not always lower and were often higher" than prices hospitals could negotiate directly — savings are NOT guaranteed or universal.
- **Unit:** USD billions/year (aggregate); % savings per contract (relative)
- **Source:** Healthcare Supply Chain Association (HSCA), "GPOs: Helping to Increase Efficiency and Reduce Costs," https://www.supplychainassociation.org/wp-content/uploads/2018/05/Applied_Policy_Report_2014.pdf ; HSCA FAQ https://supplychainassociation.org/about-us/faq/ ; GAO, "Group Purchasing Organizations: Pilot Study Suggests Large Buying Groups Do Not Always Offer Hospitals Lower Prices," GAO-02-690T, https://www.gao.gov/products/gao-02-690t
- **Confidence:** Low-Medium — HSCA is the GPO industry's own trade association (savings figures likely favorable/upper-bound), while GAO (independent, older 2002 study) found no guaranteed savings. Treat the $34-55B/year figures as an industry-claimed upper bound, and the 10-18% per-contract savings range (Leibowitz/FTC-adjacent) as a more defensible relative-savings parameter. This is most useful for modeling potential savings from centralized/single-payer bulk procurement of devices, but should carry a wide confidence interval and explicit note of industry-source bias.

### CP-DX-009 [NEW PARAMETER] — Direct-to-consumer/cash lab pricing floor (useful "marginal cost" proxy)
- **Value:** Direct-to-consumer labs (no doctor order, cash pay) offer a Basic Metabolic Panel for **$8-25** and a Comprehensive Metabolic Panel for **$10-30**, i.e., roughly at or even below the Medicare CLFS rate and far below average billed/list charges.
- **Unit:** USD per test
- **Source:** Health Bill Central, compiling DTC lab pricing, https://healthbillcentral.com/blog/blood-test-cost
- **Confidence:** Medium (secondary/aggregator source, not a primary claims database) but directionally useful — suggests the CMS CLFS rate is close to a realistic "true marginal cost" floor for common labs, useful for setting a lower-bound cost parameter in the simulation distinct from the current billed-charge/list-price ceiling.

### CP-DX-010 [NEW PARAMETER] — Dental spending as a distinct NHE category
- **Value:** National dental expenditure: **$189 billion in 2024** (3.6% of total NHE), real growth ~4% vs. 2023.
- **Unit:** USD billions/year
- **Source:** American Dental Association, Health Policy Institute, "National Dental Expenditures, 2024." https://www.ada.org/resources/research/health-policy-institute/dental-care-market/national-dental-expenses
- **Confidence:** High — ADA HPI is a well-regarded source building directly off CMS NHE data; useful because the framework's dental-coverage-inclusion decision is a major cost driver and dental is often omitted from simplified single-payer models.

### CP-DX-011 [NEW PARAMETER] — Hospital outpatient/inpatient markup baseline for imaging & labs (reuse of CP-RX-015)
- Cross-reference CP-RX-015 above (RAND 5.1: commercial pays 254% of Medicare inpatient, 279% of Medicare outpatient, on average, 2022 data) — this is the single most load-bearing "how much would prices fall if everyone paid Medicare-equivalent rates" parameter and applies directly to imaging, labs, and device-embedded procedures, not just drugs. Recommend the simulation use this as its primary "commercial-to-Medicare conversion multiplier" for the diagnostics/imaging/device cost module, with the 2.2x-5.9x modality-specific range (CP-DX-005) as a more granular alternative for imaging specifically.

---

## Summary Table of Highest-Confidence, Most Load-Bearing Numbers

| Param | Value | Use |
|---|---|---|
| CP-RX-001 | $467.0B (2024) | Retail drug spend baseline |
| CP-RX-003 | 2.78x (avg), 4.22x (brand) | Int'l price gap for negotiation-savings modeling |
| CP-RX-006 | $98.5B/10yr (negotiation-specific); $237B/10yr (full IRA drug package) | CBO-scored real-world precedent for govt negotiation savings |
| CP-RX-008/009 | $2.28-6.16/vial production cost; $30/vial Civica real-world price | Public Medicines Corp calibration |
| CP-RX-010 | 90% volume / 12-13% spend on generics | Generic baseline, already-efficient segment |
| CP-RX-015 / CP-DX-011 | Commercial = 254-279% of Medicare | Master "move-to-Medicare-rates" savings multiplier |
| CP-DX-001 | $5.28T total NHE 2024; $1.63T hospital; $1.11T physician/clinical | Top-line sizing |
| CP-DX-007 | $75.7-101.2B/yr low-value care; $760-935B/yr total system waste | Waste-reduction savings ceiling |
| CP-DX-008 | 10-18% per-contract GPO savings (more defensible than $34-55B/yr aggregate) | Device procurement savings |

## Explicit Data Gaps / Follow-Up Recommended
1. **CP-DX-001**: Exact CMS NHE Table 2 dollar splits for "durable medical equipment," "other non-durable medical products," and "other professional services" could not be pulled directly (cms.gov blocked automated PDF fetch with HTTP 403 in this session). A human or browser-based agent should retrieve these directly from https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data (NHE Tables, historical zip/Excel files) for precision.
2. **CP-RX-012**: No authoritative national total for PBM rebate dollars retained (vs. passed through) was found; FTC reports describe mechanism, not a national dollar total. Model as a sensitivity band (0-20% retention) rather than a point estimate.
3. **CP-RX-013**: Big-3 PBM combined market share (~80% commonly cited) was not independently re-verified this pass; confirm before use.
4. **CP-DX-006**: Precise current Medicare-allowed (not beneficiary-cost-share) national average payment amounts for standard CPT codes (brain MRI 70551/70553, abdomen/pelvis CT 74177, chest X-ray 71046) should be pulled directly from the CMS Physician Fee Schedule Look-Up Tool for simulation-grade precision rather than the secondary-source figures cited here.
