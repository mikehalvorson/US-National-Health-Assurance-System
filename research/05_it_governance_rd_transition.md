# Research Findings: IT/Cybersecurity, Governance, R&D, and Transition Cost Parameters
## For National Health Assurance (NHA) Fiscal Simulation Calibration

Compiled 2026-07-15. All figures are nominal USD unless noted. Where sources conflict or no single authoritative number exists, ranges and methodology notes are provided so the simulation can treat these as distributions/sensitivity inputs rather than point estimates.

---

## CP-IT: Health IT / Records / Cybersecurity / AI Infrastructure

### CP-IT-001: VA Electronic Health Record Modernization (EHRM) — total lifecycle cost
- **Value/range:** Spent to date (FY2018–Q2 FY2025): **$13.84 billion**. Total lifecycle cost estimates range widely: **$16.1B (early estimate) to ~$37B (updated internal 2025 estimate, not yet validated by GAO) to $49.8B** (2022 Institute for Defense Analyses lifecycle estimate: $32.7B for 13 years implementation + $17.1B for 15 years sustainment). Original 2018 Cerner contract was $10B, later revised upward to over $16B.
- **Unit:** USD, cumulative/lifecycle.
- **Source:** GAO-26-108812 and GAO-25-106874 (VA Electronic Health Record Modernization reports, 2025); Nextgov/FCW reporting Feb & Dec 2025 (https://www.nextgov.com/modernization/2025/02/lawmakers-want-va-nail-down-total-ehr-modernization-cost/403242/, https://www.nextgov.com/modernization/2025/12/lawmakers-question-va-health-records-costs-and-batched-deployments/410188/); GAO-25-108091.
- **Confidence/caveat:** HIGH confidence on spend-to-date; LOW-MEDIUM on lifecycle total — VA itself has not produced a validated total cost estimate, and Congress has repeatedly criticized this gap. Use as a cautionary-tale precedent for cost overrun risk in national EHR migration (actual costs have run 1.5–3x initial contract value). Useful for a "cost overrun multiplier" parameter.

### CP-IT-002: DOD MHS GENESIS EHR (military health system analogue)
- **Value/range:** **$4.3 billion** initial 2015 contract (Leidos-led consortium incl. Cerner, Henry Schein, Accenture) for a system now live across ~3,890 facilities serving 9.5M+ beneficiaries with 197,200+ end users.
- **Unit:** USD, contract value.
- **Source:** DefenseScoop/FedScoop reporting (https://fedscoop.com/dod-confident-health-records-platform-deployment-remains-on-schedule/).
- **Confidence/caveat:** MEDIUM. Useful as a lower-bound per-beneficiary EHR deployment cost data point (~$450/beneficiary for DOD's contract value alone, excluding VA-side integration costs). Smaller and arguably more successful than the VA rollout — useful contrast case.

### CP-IT-003: UK NHS National Programme for IT (NPfIT) — cautionary precedent
- **Value/range:** Initial budget **£6.2 billion** (2002); final cost **£10–12.7 billion** (sources vary: £10B "official" figure, up to £12.7B cited by UK Parliament Public Accounts Committee); benefits realized estimated at only **£2.6 billion**. Program dismantled 2011.
- **Unit:** GBP (convert at contemporaneous or current FX as needed for simulation; ~$12-16B USD equivalent at various historical rates).
- **Source:** UK Parliament Public Accounts Committee report (https://publications.parliament.uk/pa/cm201314/cmselect/cmpubacc/294/294.pdf); PubMed case history (https://pubmed.ncbi.nlm.nih.gov/28166675/); Cambridge case study (https://www.cl.cam.ac.uk/archive/rja14/Papers/npfit-mpp-2014-case-history.pdf).
- **Confidence/caveat:** HIGH — well documented, widely cited as the definitive "national top-down health IT megaproject failure" case. Cost overran initial budget by ~2x; benefit-to-cost ratio was roughly 0.25:1. Strongly recommend using this to parameterize a "top-down IT program failure risk" scenario (e.g., 40-100% cost overrun probability, benefit shortfall risk) rather than assuming a clean single-point cost for NHA's national IT buildout.

### CP-IT-004: National unique patient identifier (UPI) system — cost estimate
- **Value/range:** One-time implementation cost estimated at **$1.5–$11.1 billion** (range depends on technical approach); a narrower SSN-based enhancement approach estimated at **$3.9–$9.2 billion**. Projected annual efficiency benefit at 90% adoption: **$77 billion/year**.
- **Unit:** USD, one-time capital cost (range) vs. USD/year (recurring benefit).
- **Source:** RAND Corporation, "Identity Crisis: An Examination of the Costs and Benefits of a Unique Patient Identifier for the U.S. Health Care System," MG-753, 2008 (https://www.rand.org/pubs/monographs/MG753.html); RAND Research Brief RB-9393 (https://www.rand.org/pubs/research_briefs/RB9393.html).
- **Confidence/caveat:** MEDIUM — study is from 2008; costs should be inflation-adjusted (~1.5x to 2026 dollars using CPI) and technology assumptions are dated (predates modern cloud/API architectures, which could lower costs, but also predates modern cybersecurity threat scale, which could raise them). Still the most-cited authoritative estimate of national patient ID infrastructure cost.

### CP-IT-005: Healthcare data breach cost (highest-cost sector, 14 consecutive years)
- **Value/range:** Average cost of a U.S. healthcare data breach: **$7.42 million** (2025, down from $9.77M in 2024 — a $2.35M YoY drop). Healthcare has been the costliest breach sector for 14 straight years. Average time to identify+contain: **279 days** (vs. global average ~5 weeks shorter).
- **Unit:** USD per breach event.
- **Source:** IBM/Ponemon Institute, "Cost of a Data Breach Report 2025" (https://www.ibm.com/think/insights/cost-of-a-data-breach-healthcare-industry); HIPAA Journal summary (https://www.hipaajournal.com/average-cost-of-a-healthcare-data-breach-2025/).
- **Confidence/caveat:** HIGH — IBM's report is the industry-standard annual benchmark (20th edition, 600 orgs surveyed). Useful for modeling expected annual breach losses under NHA at national data-consolidation scale — note that a single national database could face a small number of catastrophic breach events rather than many independent ones (tail-risk consideration, not linear scaling).

### CP-IT-006: Healthcare cybersecurity spending as % of IT budget
- **Value/range:** Historically **≤6%** of IT budget on cybersecurity; as of 2025 survey, **30%** of respondents report spending **>7%**, with distribution: 19% spend 3-6%, 14% spend 7-10%, 7% spend 11-14%, 9% spend >14%. 55% of orgs planned to increase cybersecurity spend in 2025.
- **Unit:** % of IT budget.
- **Source:** HIMSS 2024 Healthcare Cybersecurity Survey (https://www.himss.org/sites/hde/files/media/file/2025/02/20/2024-himss-cybersecurity-survey.pdf).
- **Confidence/caveat:** HIGH for survey data itself; MEDIUM for applicability to a national single-payer IT buildout (national-scale/critical-infrastructure systems generally warrant higher cybersecurity allocation, e.g. 10-15%+, given breach costs above and the fact that a single national health database is a much higher-value target than a fragmented system).

### CP-IT-007: Epic/Oracle Cerner large-system EHR licensing/implementation cost benchmarks
- **Value/range:** Small clinic: $100K-$300K. Mid-size practice: $500K-$1M. Large hospital system: **$10M-$30M+** (implementation), can exceed **$400M-$800M+** for large multi-site health-network deployments, with rare cases (e.g., extreme multi-facility rollouts) reportedly exceeding **$4 billion**. Northwell Health's Epic rollout exceeded **$1 billion**. Per-physician licensing: $5,000-$7,000. Hosted subscription: ~$200/user/month. Annual maintenance: 15-20% of initial investment.
- **Unit:** USD, varies by scale.
- **Source:** Aggregated vendor-cost-guide reporting (EHR Source, Topflight Apps, OSP Labs, Tactionsoft — 2026 pricing guides); Northwell Health rollout figure widely reported in trade press.
- **Confidence/caveat:** LOW-MEDIUM — Epic and Oracle Cerner do not publish list prices; all figures are third-party/vendor-consultant estimates or aggregated news reports, not audited contract data. Use as an order-of-magnitude sanity check on a national platform buildout, not a precise input. Annual maintenance ratio (15-20% of capex) is a reasonably standard SaaS/enterprise-software heuristic and is more defensible than the headline capex figures.

### CP-IT-008: ONC (Office of the National Coordinator for Health IT) federal budget
- **Value/range:** FY2024 request: **$103.6 million**. Recent enacted level has hovered near **$60 million** in some fiscal years (per Congressional spending-bill reporting). FY2027 budget proposes a **-$19.2 million** reduction toward a "streamlined" ONC. Grant funding for interoperability initiatives: e.g., $38M (multi-state interoperability grants), separate $28M and $2M targeted grant rounds.
- **Unit:** USD/year, federal discretionary appropriation.
- **Source:** HHS ONC FY2024 Budget Justification (https://www.healthit.gov/sites/default/files/page/2023-03/FY%202024%20ONC%20508%20(002).pdf); FY2027 President's Budget for ONC (https://healthit.gov/wp-content/uploads/2026/04/FY-2027-Presidents-Budget-for-ONC.pdf); Fierce Healthcare (https://www.fiercehealthcare.com/tech/onc-budget-federal-spending-bill-60m).
- **Confidence/caveat:** MEDIUM — ONC's own operating budget is a poor proxy for national interoperability infrastructure cost since it is a *policy coordination* office, not a system operator; it doesn't fund actual data infrastructure at scale. Useful mainly as a floor for "federal interoperability policy/standards-setting overhead," not for capital infrastructure costs (see CP-IT-004 for that).

### CP-IT-009: IBM Cost of Data Breach — general enterprise average (context/comparator)
- **Value/range:** Global average cost of a data breach (all industries) in 2025 was materially lower than healthcare's $7.42M — providing a useful cross-sector comparator ratio (healthcare typically runs 1.5-2x the all-industry average).
- **Source:** Same IBM 2025 report as CP-IT-005.
- **Confidence/caveat:** MEDIUM — cite the all-industry figure directly from the report if a precise ratio is needed; not independently re-verified here.

---

## CP-GOV: Governance / Oversight / Administration

### CP-GOV-001: CMS administrative cost as % of Medicare program spending
- **Value/range:** **~1.3%** — In 2021, administrative expenses for traditional Medicare plus CMS administration/oversight of Medicare Advantage and Part D totaled $10.8 billion, or 1.3% of total program spending ($1.1T+ total Medicare spend). Alternative accounting (adding costs incurred by *other* federal agencies in supporting Medicare, e.g., IRS premium collection, HHS OIG program integrity work) raises the "true" administrative cost range to **2.8%-6.4%** depending on methodology. Private insurer overhead is commonly cited at **12-20%** (Part D private plan administrative expenses+profit alone were 8% of net plan benefit payments in 2021).
- **Unit:** % of total program benefit spending.
- **Source:** KFF (https://www.kff.org/medicare/what-to-know-about-medicare-spending-and-financing/); AJMC "Comparing Apples with Oranges" (https://www.ajmc.com/view/comparing-apples-with-oranges-administrative-expenses-and-finances-in-medicare-systems); Heritage Foundation counter-analysis (https://www.heritage.org/health-care-reform/report/medicare-administrative-costs-are-higher-not-lower-private-insurance); PolitiFact fact-check (https://www.politifact.com/factchecks/2017/sep/20/bernie-sanders/comparing-administrative-costs-private-insurance-a/).
- **Confidence/caveat:** MEDIUM-HIGH but **contested** — this is the single most politically disputed number in single-payer modeling. The 1.3-2% figure is real but excludes costs borne by other agencies and excludes the denominator effect (Medicare's per-beneficiary spending is higher than average, which mechanically lowers the admin-cost ratio even if absolute admin dollars per beneficiary are similar to private insurers). **Recommend modeling as a range (1.3% floor / "fully loaded" ~3-6% ceiling) with an explicit methodology toggle**, not a single number, given the depth of the dispute in the literature.

### CP-GOV-002: CMS total "Program Management" discretionary budget
- **Value/range:** **$4.329 billion** requested for FY2025 discretionary Program Management appropriation (covers CMS's own operating costs: survey & certification, research, Medicare contractor oversight, IT systems, program integrity). CMS's total net outlays (all programs, mostly benefit payments) were **$1.52 trillion** in FY2024 — meaning CMS's own operating budget (Program Management) is roughly **0.3%** of the total dollars it administers.
- **Unit:** USD/year (numerator); % of total CMS-administered spending (derived ratio).
- **Source:** CMS FY2026 Program Management Operating Plan (https://www.cms.gov/files/document/fy-2026-program-management-operating-plan.pdf); CMS FY2024 Financial Report (https://www.cms.gov/files/document/cms-financial-report-fiscal-year-2024.pdf).
- **Confidence/caveat:** HIGH for the raw dollar figures; note this 0.3% ratio is *narrower* than the CP-GOV-001 figure because Program Management excludes claims-processing contractor payments (Medicare Administrative Contractors), which are booked elsewhere in Medicare Part A/B trust fund spending, not in the CMS discretionary line. Use CP-GOV-001 for "all-in Medicare administrative cost" and CP-GOV-002 for "core federal agency overhead" — they answer different questions and should not be summed naively.

### CP-GOV-003: SSA administrative cost ratio (federal benefit-administration analogue)
- **Value/range:** FY2024: SSA total administrative expenses = **1.0%** of total benefit payments; OASDI (Social Security retirement/disability combined) = **0.5%**. Breakdown: OASI (retirement/survivors) = **0.3%**; DI (disability) = **1.9%**; SSI (means-tested disability) = **8.4%** (much higher because SSI requires ongoing eligibility redetermination/means-testing, unlike universal programs). Since 1989, SSA admin costs have stayed at or below 1% of trust fund outlays every year.
- **Unit:** % of benefit payments.
- **Source:** SSA Office of the Chief Actuary, "Social Security Administrative Expenses" (https://www.ssa.gov/oact/STATS/admin.html); SSA FY2024 Congressional Justification (https://www.ssa.gov/budget/assets/materials/2024/2024BST.pdf).
- **Confidence/caveat:** HIGH — this is clean, non-disputed federal actuarial data. **The SSI vs. OASI contrast (8.4% vs. 0.3%) is a highly useful modeling insight**: means-tested/eligibility-verification-heavy programs cost roughly 15-25x more to administer per dollar of benefit than universal, non-means-tested programs. Since NHA is designed as a universal (non-means-tested) framework, the OASI/DI figures (0.3-1.9%) are the more relevant analogue than SSI.

### CP-GOV-004: HHS Office of Inspector General (OIG) budget
- **Value/range:** FY2025 enacted direct discretionary appropriation: **$93.5 million** (flat vs. FY2024; FY2022 was $88.9M). Additional **mandatory** funding via the Health Care Fraud and Abuse Control (HCFAC) program: **$249.7 million** (FY2025) plus $9 million supplemental — so *total* OIG resources ≈ **$343-352 million/year**, most of it earmarked for fraud/abuse enforcement rather than general oversight.
- **Unit:** USD/year.
- **Source:** HHS OIG FY2025 Budget Justification (https://oig.hhs.gov/documents/budget/9814/FY%202025%20OIG%20Budget.pdf).
- **Confidence/caveat:** HIGH. As % of total HHS/CMS-administered spending (~$1.5T+), this is roughly **0.02-0.025%** — i.e., program-integrity/oversight spending is a very small slice even relative to CMS's own operating budget. Useful floor for an NHA Inspector General / fraud-and-abuse function budget line, scaled up proportionally to NHA's larger total benefit base if NHA absorbs all current U.S. health spending (~$4.9T NHE, see CP-GOV-006).

### CP-GOV-005: GAO (Government Accountability Office) budget — general oversight analogue
- **Value/range:** FY2025 request: **$916.0 million** appropriated funds + $59.8 million offsets/supplemental, supporting ~3,600 FTEs. GAO is a whole-of-government auditor, not health-specific, so this represents a "national government-wide oversight capacity" benchmark rather than an NHA-specific figure.
- **Unit:** USD/year.
- **Source:** GAO-24-107438, "Fiscal Year 2025 Budget Request" (https://www.gao.gov/assets/gao-24-107438.pdf).
- **Confidence/caveat:** MEDIUM relevance — useful only as an order-of-magnitude comparator for "what does a serious, empowered federal oversight body cost," not as a direct NHA input.

### CP-GOV-006: National Health Expenditure — "Net cost of health insurance" (administrative overhead) as % of total U.S. health spending
- **Value/range:** Total NHE 2023: **$4.9 trillion** ($14,570 per capita, 17.6% of GDP). Administrative expenses (insurance-plan administration, public+private, excluding provider-side administrative burden) were **7.0% of NHE in 2024**, down from **7.5% in 2023**. This CMS "net cost of health insurance" line item is the standard baseline for total U.S. insurance-administration overhead.
- **Unit:** % of total NHE.
- **Source:** CMS National Health Expenditure Data / NHE Fact Sheet (https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/nhe-fact-sheet); CMS NHE 2024 Highlights (https://www.cms.gov/files/document/highlights.pdf).
- **Confidence/caveat:** HIGH — this is the authoritative top-line figure. **This is arguably the single most important calibration number for NHA governance costs**: it represents the entire current U.S. insurance-administration base (~$340B/year at 7% of $4.9T) that NHA's consolidated administrative apparatus would need to replace, ideally at a lower ratio. Combine with CP-GOV-007/008 below (single-payer administrative-cost projections) to model the plausible NHA administrative-cost range.

### CP-GOV-007: CBO single-payer ("Medicare for All") administrative cost projections
- **Value/range:** CBO's December 2020 working paper estimated total administrative cost rates of **1.5-1.6%** for its higher-cost single-payer design options (Options 3/4), with overall single-payer overhead projected **below 2%** — versus traditional Medicare's own ~2% and private insurers' ~12%. CBO explicitly notes current Medicare admin costs are partly inflated by tasks (Part B premium collection, eligibility determination) that would disappear under true single-payer.
- **Unit:** % of total program spending.
- **Source:** CBO Working Paper 2020-08, "How CBO Analyzes the Costs of Proposals for Single-Payer Health Care Systems Based on Medicare's Fee-for-Service Program" (https://www.cbo.gov/system/files/2020-12/56811-Single-Payer.pdf); CBO follow-up, "A Single-Payer Health Care System That Is Based on..." (2022) (https://www.cbo.gov/system/files/2022-05/57973-single-payer.pdf).
- **Confidence/caveat:** HIGH — this is the single most authoritative, non-partisan U.S. government estimate specifically for a single-payer administrative-cost target, and should likely be the **primary calibration anchor** for NHA's target administrative cost ratio (i.e., NHA governance/admin costs modeled as ~1.5-2.5% of total benefit spending, as a policy-success target, with the current fragmented-system baseline of ~7% of NHE as the counterfactual/starting point).

### CP-GOV-008: Urban Institute / RAND single-payer administrative-cost estimates (cross-check)
- **Value/range:** Urban Institute: current insurance overhead ≈ **10.6% of claims**; single-payer reform modeled to reduce this to **6%** (saving $234B/year) or, in an alternative "optimistic" scenario, **3%** (additional $77.2B/year in savings). RAND (New York state single-payer study): administrative costs reduced from 18% (commercial) / 7% (NY Medicaid) baseline to **~6%** under single payer; RAND's national Medicare for All modeling separately projected administrative expenses declining **32.6%**, to **5.6% of total spending**.
- **Unit:** % of claims/total spending.
- **Source:** Urban Institute, "Estimating the Cost of a Single-Payer Plan" (https://www.urban.org/sites/default/files/publication/99151/estimating_the_cost_of_a_single-payer_plan_0.pdf); RAND, "National Health Spending Estimates Under Medicare for All," RR-3106 (https://www.rand.org/pubs/research_reports/RR3106.html).
- **Confidence/caveat:** MEDIUM-HIGH — these are less optimistic than CBO's ~1.5-2% figure (converging instead around 5-6%), reflecting more conservative assumptions about achievable administrative simplification. **Recommend using 2-6% as the plausible NHA administrative-cost-ratio band**, with CBO's ~1.5-2% as an aggressive/best-case scenario and Urban/RAND's ~5-6% as a more conservative baseline — this spread itself is a meaningful and defensible modeling uncertainty band, not noise to be collapsed to one number.

### CP-GOV-009: SSA disability appeals system — caseload/cost/timeline benchmarks (ombudsman/appeals analogue)
- **Value/range:** Pending hearings backlog fell from ~322,000 (end FY2023) to ~262,000-275,000 (end FY2024) — lowest level in ~30 years. Average hearing wait time fell from 450 days (FY2023) to 342 days (FY2024), still above SSA's 270-day target. Congress provided **$290 million** in special supplemental funding over 3 years specifically to reduce the hearings backlog.
- **Unit:** Days (wait time); USD (dedicated backlog-reduction funding); case count.
- **Source:** SSA OARO/OHO public workload data (https://www.ssa.gov/appeals/publicusefiles.html); Congress.gov CRS summary (referenced via search); TRAC Reports SSA analysis (https://tracreports.org/tracreports/ssa/253/).
- **Confidence/caveat:** MEDIUM — no clean "cost per case" figure was found in this pass (would require dividing SSA's Disability Insurance administrative budget by hearings processed; a follow-up calculation from SSA's OHO budget line and case volume, e.g., ~$290M/~500K+ backlog-affected cases ≈ low-hundreds-of-dollars per case for backlog remediation alone, could be derived but was not found as a published, citable figure). Useful directionally: a national appeals/ombudsman system for NHA should budget for multi-year backlog risk and should target sub-270-day resolution as a defensible federal benchmark, with contingency funding (~$100M+/multi-year tranche) as a realistic backlog-mitigation cost analogue.

### CP-GOV-010: Taiwan National Health Insurance (NHI) administrative cost — foreign single-payer analogue
- **Value/range:** Taiwan NHI administrative budget was set at **1.07% of total program expenditures** in 2014 — often cited as a best-in-class single-payer administrative efficiency benchmark. Population coverage reached **99.9%** by end of 2023. System launched 1995 after ~7-9 years of design work (declared intent 1986, implementation 1995).
- **Unit:** % of program expenditures; years (design/implementation lead time).
- **Source:** Health Affairs, "Reflections on the 20th Anniversary of Taiwan's Single-Payer NHI" (https://www.healthaffairs.org/doi/10.1377/hlthaff.2014.1332); Public Citizen summary (https://www.citizen.org/news/single-payer-health-care-in-taiwan/).
- **Confidence/caveat:** MEDIUM — Taiwan is a much smaller, more centralized country (~23M population vs. US 335M) with a pre-existing national ID system, so the 1.07% figure should be treated as a "demonstrated lower bound of the possible" rather than a directly transferable U.S. target. The **7-9 year design-to-launch timeline** is a useful independent cross-check on NHA's own transition-timeline assumptions (see CP-TRN section).

---

## CP-RD: Biomedical R&D

### CP-RD-001: NIH total annual budget
- **Value/range:** FY2025 enacted: **$47.035 billion** program level (or **$48.535 billion** including the separate $1.5B ARPA-H appropriation). FY2026 President's Budget *requested* a cut to $27.9 billion (a ~40% proposed reduction, including NIH restructuring into 8 institutes), but as of January 2026 House and Senate appropriators **rejected** the proposed cuts and instead **increased** NIH funding (+$415 million reported). Use FY2025 enacted (~$47B) as the current-law baseline, not the FY2026 proposed-cut figure.
- **Unit:** USD/year.
- **Source:** STAT News, "After lagging far behind, NIH now seems on pace to spend its entire $47 billion budget" (Sept 2025) (https://www.statnews.com/2025/09/12/nih-spending-47-billion-budget/); STAT News, "House and Senate appropriators endorse NIH budget increase, reject Trump's proposed cuts" (Jan 2026) (https://www.statnews.com/2026/01/20/nih-funding-deal-trump-cuts-rejected-budget-boosted-415-million/); CRS Report R43341, "NIH Funding: FY1996-FY2026" (https://www.congress.gov/crs-product/R43341).
- **Confidence/caveat:** HIGH for FY2025 enacted figure. FY2026-27 figures are politically volatile (large proposed cuts vs. Congressional pushback) — model NIH funding as policy-uncertain in outer years, with $47B as the stable multi-year baseline.

### CP-RD-002: NIH budget by institute (partial breakdown, current cycle)
- **Value/range:** National Cancer Institute (NCI): **$7.35 billion** (FY2026 enacted via Consolidated Appropriations Act 2026, +$128M vs FY2025). National Institute on Aging (NIA): FY2026 President's Budget *requested* $2,686.5 million (a proposed -40.5%/-$1,825.5M cut from FY2025 CR level) — again, a proposed cut likely to be partially/fully reversed by Congress per CP-RD-001.
- **Unit:** USD/year, by institute.
- **Source:** NIH Office of Budget FY2026 documents (https://officeofbudget.od.nih.gov/pdfs/FY26/br/Overview%20of%20FY%202026%20Overall%20Appropriations.pdf); NIA FY2026 budget page (https://www.nia.nih.gov/about/budget/fiscal-year-2026-budget).
- **Confidence/caveat:** MEDIUM — full institute-by-institute breakdown was not fully retrieved in this pass; NIH's Office of Budget site (officeofbudget.od.nih.gov) has the complete "Mechanism Table" if finer granularity is needed for the simulation.

### CP-RD-003: BARDA (Biomedical Advanced Research and Development Authority) budget
- **Value/range:** FY2025 President's Budget proposed **~$970 million** for BARDA (slightly down from FY2024 request of ~$1.015 billion for BARDA Advanced R&D activities).
- **Unit:** USD/year.
- **Source:** Wikipedia/LegalClarity aggregation of HHS/ASPR budget documents (https://en.wikipedia.org/wiki/Biomedical_Advanced_Research_and_Development_Authority; https://legalclarity.org/barda-budget-funding-mechanisms-and-allocations/); ASPR BARDA program page (https://aspr.hhs.gov/AboutASPR/ProgramOffices/BARDA/Pages/default.aspx).
- **Confidence/caveat:** MEDIUM — figures are budget *requests*, not necessarily final enacted appropriations; BARDA is a useful analogue specifically for the "public advanced-development / manufacturing scale-up" (as opposed to basic-research) segment of an NHA "public R&D delinkage" model, since BARDA already funds late-stage countermeasure development and stockpiling (a similar function to what a delinked public-R&D model would need for drug development beyond basic science).

### CP-RD-004: Total U.S. pharmaceutical industry R&D spending
- **Value/range:** PhRMA member companies alone: **~$96 billion (2023)**, up from **$102.3 billion (2021)** — note the reported 2021→2023 figures are not strictly a clean trend given differing methodologies year to year; treat as ~$90-105B/year range for PhRMA-member spending. PhRMA members represent an estimated **75-85%** of total industry spending. A broader "biopharma" analysis found *global* biopharma R&D investment reached **$276 billion in 2021** — more than double commonly cited PhRMA-only figures — with projections reaching **~$340 billion by 2030**. CBO's own figure: pharmaceutical industry R&D spending was **$83 billion in 2019** (~10x the inflation-adjusted 1980s level).
- **Unit:** USD/year.
- **Source:** CBO, "Research and Development in the Pharmaceutical Industry" (April 2021) (https://www.cbo.gov/publication/57126); Statista aggregation (https://www.statista.com/statistics/265085/); rdworldonline/BioSpace industry analysis (https://www.rdworldonline.com/how-much-does-the-pharma-industry-spend-on-rd-anyway-probably-more-than-you-thought/).
- **Confidence/caveat:** MEDIUM — figures vary substantially (2-3x) depending on whether "global" vs. "US-only," "PhRMA members" vs. "total industry," and whether marketing/SG&A is excluded consistently. **For NHA's "public R&D delinkage" modeling, recommend using CBO's $83B (2019, US-focused, most methodologically conservative/transparent) as the low-end anchor and the ~$276B global figure only for context**, since delinkage would presumably need to replace US-attributable innovation incentive, not the entire global R&D base (much of which serves non-US markets/regulatory approvals).

### CP-RD-005: CBO analysis — drug price/R&D innovation tradeoff relationship
- **Value/range:** No single elasticity number, but CBO's April 2021 report models 2010-2019 trends: number of new drugs approved rose ~60% (2010-2019 decade vs. prior decade), peaking at 59 approvals in 2018, alongside the R&D spending increases noted in CP-RD-004. CBO's separate "Alternative Approaches to Reducing Prescription Drug Prices" report and its 2021 "Simulation Model of New Drug Development" working paper directly model how reduced expected revenue (e.g., from price controls) reduces expected R&D investment and new-drug output — but CBO does not publish a single clean elasticity coefficient in the search results retrieved.
- **Unit:** Qualitative model / % change in new drug approvals per % change in expected revenue (model-based, not a single published coefficient).
- **Source:** CBO, "Research and Development in the Pharmaceutical Industry" (https://www.cbo.gov/publication/57126); CBO, "CBO's Simulation Model of New Drug Development" (Aug 2021) (https://www.cbo.gov/system/files/2021-08/57010-New-Drug-Development.pdf); CBO, "Alternative Approaches to Reducing Prescription Drug Prices" (https://www.cbo.gov/publication/60812).
- **Confidence/caveat:** MEDIUM — this is a directionally important but not a single-number parameter. **Recommend the coding agent fetch the CBO Simulation Model working paper directly (57010-New-Drug-Development.pdf) for the specific elasticity/coefficient values**, as this level of detail exceeded what search snippets returned; the underlying model does contain quantified relationships (e.g., between expected returns and number of new drugs developed) needed for a rigorous "public R&D delinkage" simulation module.

### CP-RD-006: NIH Innovation Account / 21st Century Cures Act funding (precision medicine, BRAIN initiative)
- **Value/range:** FY2025 continuing resolution reduced the NIH Innovation Account by **$280 million** to match the 21st Century Cures Act-authorized level for FY2025.
- **Unit:** USD/year.
- **Source:** CRS Report R43341 (as cited in CP-RD-001 search results).
- **Confidence/caveat:** LOW-MEDIUM — a minor line item, included for completeness on NIH's targeted-innovation-program funding mechanisms; not independently verified beyond the CRS citation snippet.

---

## CP-TRN: Transition / Migration Costs

### CP-TRN-001: ACA implementation and ongoing subsidy cost (partial analogue — federal program stand-up + steady-state operating cost)
- **Value/range:** Current annual ACA marketplace subsidy cost: **~$125-140 billion/year** (CBO's July 2024 baseline: $125-129B gross federal spending on ACA marketplace subsidies for 2024; other reporting cites $140B for 2025). 10-year (2025-2034) CBO projection: **$1.32 trillion total** ($966B direct marketplace subsidies + $177B Basic Health Program/1332 waivers + $176B revenue reductions), averaging $118-147B/year. Healthcare.gov + state exchanges covered **24 million+ people** in 2025.
- **Unit:** USD/year (steady-state operating cost, not one-time stand-up cost).
- **Source:** CBO ACA topic page (https://www.cbo.gov/topics/health-care/affordable-care-act); KFF, "The Affordable Care Act 101" (https://www.kff.org/affordable-care-act/health-policy-101-the-affordable-care-act/); PGPF summary (https://www.pgpf.org/article/how-does-the-federal-government-subsidize-healthcare-under-the-aca-and-what-does-it-cost/).
- **Confidence/caveat:** MEDIUM — this pass did not surface a clean, isolated **one-time IT/administrative stand-up cost** for the original 2013-2014 Healthcare.gov launch (widely reported in contemporaneous press as having cost roughly $1.7 billion combined federal+state exchange technology build-out through 2014, per HHS OIG and GAO reports from that era, though this specific figure was not re-verified in this research pass and should be confirmed against GAO-14-694 or HHS OIG reports directly before use). The steady-state subsidy-administration figures above are solid and CBO-sourced; recommend a follow-up targeted search on "Healthcare.gov federal exchange technology cost GAO 2014" if a precise one-time stand-up cost is needed for the simulation's transition-year IT buildout parameter.

### CP-TRN-002: Medicare Part D implementation (2003-2006) — partial data
- **Value/range:** Program went live January 2006, ~2.5 years after MMA 2003 authorization. By June 2006, **38.2 million** Medicare beneficiaries had drug coverage (90% of all beneficiaries had "good" drug coverage). 2006 average beneficiary premium: $32.20/month; average federal payment to plans: $94.08/month per enrollee. Actual federal costs came in **$34 billion lower than projected for 2006-2011** and **$76 billion lower for 2006-2016** (due to competitive-bidding savings exceeding CBO's original projections).
- **Unit:** USD, various.
- **Source:** CMS Part D fact sheets and CRS Report R40611 (https://www.congress.gov/crs-product/R40611).
- **Confidence/caveat:** LOW-MEDIUM for isolating a clean "implementation/stand-up cost" figure (as opposed to steady-state program spending) — this search did not surface a specific administrative/IT stand-up cost distinct from ongoing benefit payments. Useful data points: (a) ~2.5-year lead time from legislation to launch is a reasonable analogue for NHA's minimum feasible transition timeline for a major new benefit; (b) the fact that actual costs came in significantly *under* initial projections (due to competitive dynamics CMS didn't fully anticipate) is a useful counterweight to the VA/NHS cost-overrun cautionary tales above — big health IT/benefit programs can go either way on cost, and the simulation should model both overrun and underrun scenarios rather than assuming one direction.

### CP-TRN-003: Trade Adjustment Assistance (TAA) — displaced-worker retraining cost-per-worker (best available DOL/GAO analogue)
- **Value/range:** Commonly cited rough figure: **~$10,000 per participant** (program cost to taxpayers). A more rigorous Mathematica evaluation of the 2002 TAA law found program **costs exceeded benefits by ~$54,000 per participant** (net societal cost-benefit deficit, not the same as gross program spend). FY2023 pre-sequestration TAA appropriation: **$494 million** total program. Historical estimate: program cost taxpayers **~$1.3 billion in 2011**. Benefits available: up to 130 weeks of training (104 vocational + 26 remedial) plus up to 104 weeks of extended income support after regular UI exhaustion. Outcome data: ~75% of program leavers found jobs, but often at lower wages than pre-displacement.
- **Unit:** USD per worker (retraining); USD/year (total program).
- **Source:** Mathematica Policy Research evaluation (cited via Wikipedia/downsizinggovernment.org aggregation: https://en.wikipedia.org/wiki/Trade_Adjustment_Assistance, https://www.downsizinggovernment.org/labor/trade-adjustment-assistance); CNBC, "Sizing up the Trade Adjustment Assistance program" (https://www.cnbc.com/2015/06/26/is-aid-to-trade-displaced-workers-worth-the-cost.html); GAO-12-953.
- **Confidence/caveat:** MEDIUM — the ~$10,000/participant figure is the most defensible single point estimate for direct program cost per worker; the Mathematica net-cost-benefit-deficit figure ($54,000) measures something different (whether the program pays for itself in improved outcomes, which the evaluation found it largely does not) and should not be confused with gross cost-per-worker. **Recommend using $10,000-$15,000/worker (2026-dollar-adjusted) as the baseline "Health Administration Transition Corps" per-worker retraining cost**, while flagging in the simulation that TAA's own effectiveness evidence is weak (worse outcomes than a well-designed program should target) — NHA's transition program should be modeled as needing to outperform this benchmark to be worthwhile, not simply replicate it.

### CP-TRN-004: Number of U.S. workers in health insurance administration/billing (transition-support population)
- **Value/range:** Broad U.S. insurance industry (all lines): **~2.98 million jobs (2023)**. Health & medical insurance carriers specifically (BLS NAICS 524114) employ a subset of this. Medical Records Specialists (BLS code 29-2072): **194,800 jobs (2024)**, median wage $50,250. Insurance Claims and Policy Processing Clerks (BLS code 43-9041) and Billing and Posting Clerks (BLS code 43-3021) also directly relevant but this research pass could not retrieve the precise national employment totals for these two specific codes (BLS.gov pages returned HTTP 403 to automated fetch — the data exists publicly on bls.gov/oes but must be pulled by a human/browser session or via the BLS public API, not generic WebFetch).
- **Unit:** Number of workers (headcount).
- **Source:** Statista aggregation of BLS data (https://www.statista.com/statistics/194233/aggregate-number-of-insurance-employees-in-the-us/); BLS OOH Medical Records Specialists (https://www.bls.gov/ooh/healthcare/medical-records-and-health-information-technicians.htm); BLS OEWS pages for codes 43-9041 and 43-3021 (https://www.bls.gov/oes/current/oes439041.htm, https://www.bls.gov/oes/2023/may/oes433021.htm — both blocked automated fetch, need direct/API retrieval).
- **Confidence/caveat:** MEDIUM-LOW — this is an important gap. **Action item for the coding agent or a follow-up research pass**: query the BLS OEWS public API (https://www.bls.gov/developers/) or the BLS OES data tables directly (via browser, not WebFetch) for occupation codes 43-9041 (Insurance Claims and Policy Processing Clerks) and 43-3021 (Billing and Posting Clerks) to get precise national employment counts — commonly cited secondary-source estimates put total U.S. health-insurance-administration/billing-adjacent employment (claims processors + medical billers/coders + insurance-side utilization review + prior-authorization staff) in the **~500,000 to 1,000,000+** range when all adjacent BLS occupation codes are summed, but this research pass could not verify a single authoritative aggregate figure and this should be treated as an unverified planning estimate, not a cited number, until confirmed.

### CP-TRN-005: Taiwan NHI transition timeline (foreign analogue, cross-reference to CP-GOV-010)
- **Value/range:** ~7-9 years from policy decision (1986) to launch (1995) for a much smaller, more centralized country than the U.S.
- **Source:** Same as CP-GOV-010.
- **Confidence/caveat:** MEDIUM — useful as a floor, not a ceiling, on U.S. transition timeline given far greater U.S. system fragmentation, federalism complexity, and existing stakeholder entrenchment (private insurance industry, state-level Medicaid variation, employer-sponsored coverage embedded in labor contracts).

### CP-TRN-006: NPfIT and VA EHRM as transition-risk cautionary precedents (cross-reference)
- **Value/range:** See CP-IT-001 and CP-IT-003. Both are examples of large-scale, centrally-mandated health IT/system transitions running 1.5-2x over initial budget and, in NHS's case, being abandoned outright after ~9 years and £10B+ spent.
- **Confidence/caveat:** Recommend the simulation include an explicit "transition cost overrun multiplier" parameter (suggested central estimate: **1.3-1.5x** planned budget, with a fat right tail up to 2-3x reflecting the NPfIT/VA experience) applied to whatever base transition-cost estimate the model otherwise computes, rather than assuming transition costs land at the planned figure.

---

## Additional Parameters Not on the Original List (Proposed New IDs)

### CP-IT-NEW-001: Healthcare cybersecurity workforce shortage (staffing cost driver)
- **Finding:** HIMSS 2024/2025 survey reporting (referenced in CP-IT-006 search) indicates healthcare cybersecurity budgets are rising specifically because qualified cybersecurity staff are hard to find/retain in the sector ("Healthcare cybersecurity budgets are rising, but workers are hard to find," Chief Healthcare Executive, https://www.chiefhealthcareexecutive.com/view/healthcare-cybersecurity-budgets-are-rising-but-workers-are-hard-to-find).
- **Recommendation:** Add a labor-cost-inflation multiplier for NHA cybersecurity/IT staffing beyond general healthcare wage inflation, since this is a documented tight-labor-market constraint, not just a budget-allocation choice.

### CP-GOV-NEW-001: CMS Program Management vs. "fully loaded" administrative cost — reconciliation note
- **Finding:** As detailed under CP-GOV-002, CMS's own discretionary Program Management budget ($4.3B) is a much narrower slice than the commonly-cited "1.3% of Medicare spending" administrative cost figure (CP-GOV-001, ~$10.8B), because the latter includes Medicare Administrative Contractor (MAC) claims-processing payments that are booked against the trust funds rather than CMS's discretionary appropriation.
- **Recommendation:** Build the simulation with **two distinct governance-cost line items** — (1) core federal agency overhead/policy staff (CMS Program Management-style, ~0.3% of benefits) and (2) claims-processing/contractor operations (MAC-style, bringing all-in administrative cost to the 1.3-2% CBO-anchored range) — rather than a single collapsed "governance cost %" parameter, since real-world CMS itself separates these functionally and financially.

### CP-RD-NEW-001: NIH budget political volatility as a modeling input
- **Finding:** As shown in CP-RD-001, the NIH budget swung from a proposed 40% cut (FY2026 President's Budget) to a Congressional increase within the same fiscal cycle (Jan 2026 appropriations deal). This is a documented, current (2025-2026) example of extreme year-to-year federal biomedical R&D funding volatility tied to administration changes.
- **Recommendation:** Model NIH/BARDA-style public R&D funding (and by extension any NHA public-R&D-delinkage funding pool) with an explicit political-volatility variance term (e.g., ±20-40% swings possible year-to-year based on recent precedent), not a smooth trend line — this is empirically what the most recent 18 months of actual data show.

### CP-TRN-NEW-001: BLS data access constraint (methodology note for the coding agent)
- **Finding:** BLS.gov's OEWS occupation pages (bls.gov/oes/...) return HTTP 403 to generic automated fetchers (both WebFetch and presumably most scripted `requests`/`curl` calls without a browser-like user agent), even though the data itself is public. This affected retrieval of CP-TRN-004.
- **Recommendation:** The coding agent should use the BLS public API (api.bls.gov, requires free registration for higher rate limits) or a genuine browser session to pull occupation codes 43-9041, 43-3021, 43-4131 (Loan Interviewers/Clerks, tangential), and 29-2072 for precise, current national employment totals rather than relying on WebFetch/WebSearch snippet summaries, which were incomplete for this specific data need.

---

## Summary Table of Highest-Confidence, Most Load-Bearing Numbers

| ID | Parameter | Best Value | Confidence |
|---|---|---|---|
| CP-GOV-006 | Total U.S. health-insurance administrative overhead (current system) | 7.0% of $4.9T NHE (2024) ≈ $340B/yr | HIGH |
| CP-GOV-007 | CBO single-payer administrative cost target | 1.5-2.0% of total spending | HIGH |
| CP-GOV-008 | Urban Institute/RAND single-payer administrative cost (more conservative) | 5-6% of total spending | MEDIUM-HIGH |
| CP-GOV-003 | SSA administrative cost ratio (universal benefit analogue) | 0.3-0.5% (OASI/OASDI) | HIGH |
| CP-IT-003 | NHS NPfIT cost-overrun cautionary precedent | £10-12.7B vs £6.2B budget (~2x overrun) | HIGH |
| CP-IT-001 | VA EHRM total lifecycle cost | $16B-$50B (wide, unresolved) | LOW-MEDIUM |
| CP-IT-005 | Healthcare data breach average cost | $7.42M (2025) | HIGH |
| CP-RD-001 | NIH annual budget | $47.0B (FY2025 enacted) | HIGH |
| CP-RD-004 | US pharmaceutical industry R&D spend | $83-105B/yr (methodology-dependent) | MEDIUM |
| CP-TRN-003 | TAA retraining cost per displaced worker | ~$10,000/worker | MEDIUM |
| CP-IT-004 | National patient identifier system cost | $1.5-11.1B one-time (2008 dollars) | MEDIUM |
