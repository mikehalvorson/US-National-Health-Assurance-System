National Health Assurance Framework
Structured Source Package for Work Mode and Simulation Development
Version: Source Package v1.0
Status: Consolidated final-framework source package
Base-year dollars: 2024

National Health Assurance Framework Source Package for Work Mode and Simulation Development
Status: Consolidated final-framework source package generated from accessible project conversation context.
Purpose: Provide ChatGPT Work or another AI agent with sufficient structured context to draft the full long-form document.
Important limitation: This is not a verbatim transcript. It is a structured reconstruction of the final framework from accessible conversation context.
Document Control
Title: National Health Assurance Framework: A Systems Architecture, Implementation, Financing, and Simulation Specification for a Public U.S. Healthcare System.
Source package version: v1.0.
Date: 2026-07-14.
Basis: Latest accessible Project conversation context on the National Health Assurance Framework.
Primary use: Seed a full 100+ page systems architecture and simulation-specification document in ChatGPT Work or a similar long-form drafting environment.
Content policy: Conceptually deprecated content is excluded except where needed to say it was superseded. The earlier $4.55T estimate is not final framework content.
Final cost position: Mature steady-state total system cost about $4.75T/year in 2024 dollars; plausible range $4.30T-$5.25T/year; implementation/transition cost $1.2T-$2.0T over 10-12 years; first-decade transition-adjusted annual cost $4.90T-$5.05T/year.
Known limitation: This package is not a raw export of every chat turn. It is a consolidated structured source document intended to preserve the final framework architecture, requirements, parameters, and simulation inputs.
Executive Abstract
The National Health Assurance Framework is a proposed U.S. public healthcare system that replaces fragmented private insurance, PBMs, claims rails, hospital billing incentives, and employment-linked coverage with public default coverage, public claims and pharmacy utilities, hospital global budgets, a four-unit community diagnostic-treatment network, structured specialist routing, national drug purchasing, public essential-medicine manufacturing, a national health information mesh, and independent oversight, transition, and adaptation bodies.
The framework is designed as both a human-readable policy architecture and a machine-usable systems specification. It includes stable stakeholder needs, project requirements, system requirements, verification requirements, KPPs, TPPs, cost parameters, governing agencies, interfaces, phase gates, risks, and simulation hooks.
Reader Guide
ChatGPT Work / drafting agent: Use the whole document; prioritize Final Framework Summary, Architecture Catalog, Stakeholder Needs, Requirements Register, KPP/TPP Dictionary, Cost Parameter Dictionary, Simulation Specification, and Known Gaps.
Policy reader: Prioritize Final Framework Summary, Purpose/Problems/Assumptions, Care Delivery, Financing, Legal Design, Conclusions.
Systems engineer: Prioritize Architecture Catalog, Functional Architecture, Interface Catalog, Requirements Register, Verification Requirements, Phase Gates.
Simulation builder: Prioritize Cost Parameter Dictionary, KPP/TPP Dictionary, State Variables, Equations, Scenarios, Existing-System Comparator Data Needs.
Legal analyst: Prioritize Statutory Architecture, Federal/State Conforming Changes, Executive-Branch Hardening, Legal Fallback Matrix.
Clinician/provider: Prioritize Care Model, Units, Specialist Backplane, Hospital Model, Workforce, Rights/Safety, Payment Requirements.
Traceability and ID Convention
ASM: Assumption.
SN: Stakeholder need.
PR: Project requirement.
SR: System requirement.
VR: Verification requirement.
KPP: Key Performance Parameter.
TPP: Technical Performance Parameter.
CP: Cost parameter.
ARCH: Architecture element.
IF: Interface or interface-dependence relation.
PH: Implementation phase.
RISK: Risk or failure mode.
SCN: Simulation scenario.
Final Framework Summary
The final framework is a national public health assurance system that provides automatic public default coverage, eliminates or nearly eliminates point-of-care prices for covered medically necessary care, replaces fragmented private insurance/PBM/hospital billing incentives with public utilities and public-service charters, expands front-door and specialist capacity through a four-unit diagnostic-treatment network and structured specialist backplane, finances the system through redirected existing spending plus progressive public revenue, and protects implementation through transition, legitimacy/safety, and adaptation layers.
Core Final Framework Elements
Core coverage: Public default coverage with continuous eligibility and zero or near-zero point-of-care cost for covered medically necessary care.
Claims and payments: National public claims rail, National Coverage and Claims Authority, Treasury Health Disbursement Office, mandatory payment protections, provider cash-flow guarantees.
Pharmacy and drugs: National Pharmacy Claims Utility, national drug purchasing, National Formulary and Therapeutic Schedule Board, Medicine Access Review Board, Public Medicines Corporation, public backup supply.
Care delivery: Four-unit diagnostic-treatment network, primary care for complexity and continuity, structured specialist backplane, hospital global budgets, public-service hospital charters.
Expanded benefits: Long-term care, behavioral health/SUD, dental, vision, hearing, EMS, public health, prevention, and clinically linked social supports.
Information system: National Health Assurance Information Mesh with identity, longitudinal record, coverage/claims layer, rules-as-code, supply ledgers, workforce registry, quality/safety/appeals layer, research enclave, and public transparency layer.
Transition protection: NHTCA, Patient Continuity Guarantee, Provider Cash-Flow Guarantee, Hospital Stabilization Corridor, Pharmacy Continuity Rule, Legacy Payer Wind-Down, Health Administration Transition Corps, state/tribal/rural transition compacts.
Legitimacy and safety: No Silent Rationing Doctrine, Patient Bill of Rights, diagnostic safety, AI accountability, data rights, privacy segmentation, service design, appeals/ombudsman, equity monitoring, public dashboards, trust measurement.
Adaptation and repair: NHASB, independent scorekeeping, Formula Registry, retrospective review, sunset and repair, legal contingency, emergency technical corrections, red team, technology lifecycle, regional adaptation waivers.
Financing: Redirected federal spending, state/local maintenance contributions, Employer Health Assurance Contribution, extreme-wealth financing, high-income/capital-income taxes, health-sector rent taxes, trust fund, tax stabilizer, ordinary taxpayer protections.
Final Cost Position
Mature steady-state total system cost: approximately $4.75T/year in 2024 dollars.
Plausible mature range: $4.30T-$5.25T/year.
Transition / implementation cost: $1.2T-$2.0T over 10-12 years.
First-decade transition-adjusted annual cost: approximately $4.90T-$5.05T/year.
Cost character: Capacity-first, safety-first, transition-protected public health system rather than a lean maximum-savings design.
Deprecated estimate: The earlier $4.55T estimate is superseded and not final framework content.
Purpose, Problems, and Assumptions
Purpose
The purpose of the framework is to create a publicly financed, low-consumer-cost, continuously covered, capacity-managed, safety-audited, and adaptable U.S. health system that minimizes patient financial exposure while preserving quality, access, innovation, workforce stability, and fiscal sustainability.
Success Definition by Stakeholder
Patients: Covered medically necessary care is accessible, financially non-ruinous, continuous, understandable, safe, and appealable.
Providers: Payment is timely and predictable; administrative friction is reduced; clinical decisions remain human-accountable; workload is safe.
Hospitals: Essential service lines are preserved through public-service charters and global budgets that maintain readiness without extraction.
Sponsors/funders: The system is fiscally sustainable, progressive, transparent, and protected from ordinary-household fallback financing.
States/regions/tribes: National standards are preserved while local, rural, and tribal governance realities are accommodated.
Simulation builders: The system is specified through entities, functions, parameters, requirements, interfaces, state variables, and scenarios.
Current U.S. Health-System Problems Addressed
Coverage fragmentation and employment-linked insurance.
Affordability, medical debt, and underuse of care caused by cost exposure.
Administrative complexity across payers, claims, prior authorization, coding, and billing.
PBM and drug-pricing dysfunction.
Hospital consolidation, facility fees, private equity extraction, and fragmented payment incentives.
Front-door access gaps and avoidable ED use.
Specialist bottlenecks and unmanaged referral queues.
Rural and tribal access fragility.
Behavioral health, substance-use, long-term care, dental, vision, and hearing undercoverage.
Data fragmentation, interoperability failure, cybersecurity risk, and record inaccessibility.
Public distrust, opaque denials, algorithmic risk, and weak appeal usability.
Governance brittleness, executive interference, impoundment risk, and failure to adapt over decades.
Assumption Register
ASM-001: Drug prices should not be used as the primary mechanism for recovering R&D costs.
ASM-002: A separate public biomedical innovation funding system will fund high-priority new drug and technology development.
ASM-003: Public default coverage is the primary coverage model.
ASM-004: Private insurance may exist only in certified supplemental, substitute, or administrative roles.
ASM-005: PBMs are removed from the core public pharmacy benefit.
ASM-006: Consumer point-of-care price for covered medically necessary care should be zero or near zero.
ASM-007: Capacity must be expanded before all cost-sharing is removed nationally.
ASM-008: Specialist capacity is a binding system constraint.
ASM-009: AI may support but not finally decide high-stakes care denial, non-referral, emergency non-escalation, long-term care reduction, benefit termination, or high-stakes clinical diagnosis.
ASM-010: Transition failure is a primary risk, not a secondary administrative issue.
ASM-011: Hospital savings must be balanced against essential service-line continuity, staffing safety, and rural readiness.
ASM-012: The information mesh is a federated public infrastructure, not a single uncontrolled database.
ASM-013: The system must be hard to sabotage but easy to correct through transparent, evidence-based, legally bounded repair.
ASM-014: Social supports are covered only where clinically linked; general housing, income support, and food policy remain outside the core framework unless tied to medical need.
ASM-015: Framework-specific cost values are model assumptions unless independently sourced in the final public document.
Architecture Catalog
Constitutional, Fiscal, and Oversight Layer
ARCH-CONG: Congress / statutory design authority. Enacts entitlement, governing bodies, taxes, trusts, preemption, anti-impoundment, fallback provisions, and statutory duties.
ARCH-TREAS: Treasury Department. Hosts trust and disbursement structures and coordinates public financing.
ARCH-IRS: IRS / Extreme Wealth Tax Administration Office. Administers extreme-wealth, high-income, capital-income, and health-sector rent taxation.
ARCH-THDO: Treasury Health Disbursement Office. Direct mandatory payment rail for providers, hospitals, pharmacies, and other public health obligations.
ARCH-NHA-TRUST: National Health Assurance Trust. Core mandatory entitlement financing and payment authorization structure.
ARCH-NHETF: National Health Equalization Trust Fund. Operating stabilization account, shock/transition reserve, and permanent health endowment.
ARCH-HFASB: Health Financing Actuary and Stabilization Board. Certifies obligations, reserve ratios, revenue sufficiency, stabilizer triggers, and fiscal outlook.
ARCH-CHAO: Congressional Health Accountability Office. Article I oversight for anti-impoundment, executive interference, public reporting, and accountability.
Department of National Health Assurance
ARCH-DNHA: Department of National Health Assurance. Core operating department for coverage, claims, drugs, care delivery, workforce, records, and regional operations.
ARCH-DNHA-SEC: DNHA Office of the Secretary. Executive coordination, shared administration, cross-administration governance.
ARCH-NEEA: National Enrollment and Eligibility Authority. Person enrollment, eligibility, provisional coverage, and continuous coverage functions.
ARCH-NCCA: National Coverage and Claims Authority. Benefits, claims adjudication, payment rules, no balance billing enforcement, and covered-care payment administration.
ARCH-PCU: National Pharmacy Claims Utility. Real-time public pharmacy claims rail replacing PBMs for the core benefit.
ARCH-PPCO: Private Plan Certification Office. Certification and oversight of supplemental, substitute, and fixed-fee administrative private plan roles.
Medicines, Devices, Diagnostics, and Therapeutics
ARCH-AMDDT: Administration for Medicines, Devices, Diagnostics, and Therapeutics. Parent administration for drug purchasing, formulary, public manufacturing, devices, supplies, labs, and diagnostics.
ARCH-NDPA: National Drug Purchasing Authority. National drug negotiation/purchasing and purchasing contracts.
ARCH-PMC: Public Medicines Corporation. Direct public manufacturing, nonprofit partnerships, regulated cost-plus contracts, and backup supply for essential products.
ARCH-NFTSB: National Formulary and Therapeutic Schedule Board. Formulary and therapeutic schedule maintenance.
ARCH-MARB: Medicine Access Review Board. Exceptions, access classes, shortage-related access, and patient access review.
ARCH-DUSO: Drug Utilization and Safety Office. Drug use, therapeutic substitution, safety, adherence, and utilization review.
ARCH-MDSA: Medical Device and Supply Authority. Device, DME, supply procurement, pricing, inventory, and standards.
ARCH-LDA: Laboratory and Diagnostics Authority. Lab and diagnostic capability, standards, interoperability, and diagnostic stewardship.
Care Delivery and Regional Health
ARCH-ACDRH: Administration for Care Delivery and Regional Health. Parent administration for regional care delivery, hospitals, units, specialists, LTC, BH, DVH, EMS, public health.
ARCH-RHA: Regional Health Administrators. Regional capacity planning, execution, units, hospitals, specialist queues, EMS, public health, and local adaptation.
ARCH-NHSA: National Hospital Stewardship Authority. Hospital global budgets, essential services, capital, facility governance, and service-line continuity.
ARCH-PSHCO: Public Service Hospital Charter Office. Public-service hospital charter certification and service-line obligations.
ARCH-OCDTI: Office of Community Diagnostic and Treatment Infrastructure. Governs four-unit diagnostic-treatment network infrastructure.
ARCH-NCDTN: National Community Diagnostic and Treatment Network. Operational Type A/B/C/D unit network.
ARCH-NSAA: National Specialty Access Authority. Specialty routing protocols, e-consults, capacity ledgers, protected slots, referral quality.
ARCH-NLTCA: National Long-Term Care Authority. Long-term care benefit, home-first model, assessments, caregiver support, institutional care.
ARCH-NBHA: National Behavioral Health Authority. Behavioral health and SUD access, crisis response, psychiatric pathways.
ARCH-NDVHO: National Dental, Vision, and Hearing Benefit Office. Dental, vision, hearing benefits, devices, and access standards.
ARCH-NEMTA: National EMS and Medical Transport Authority. EMS readiness, ambulance, air ambulance, non-emergency transport, unit/hospital escalation.
ARCH-NPHPA: National Public Health and Prevention Authority. Prevention, public health, surveillance, screening, vaccination, public-health surge.
Workforce
ARCH-AHWCS: Administration for Health Workforce, Compensation, and Scope. Parent workforce administration.
ARCH-NPCB: National Physician Compensation Board. Physician compensation bands, specialist backplane compensation, rural premiums.
ARCH-NHWB: National Health Workforce Board. Workforce planning, vacancy management, retention, staffing standards.
ARCH-NCSWB: National Clinical Scope and Workforce Board. National scope floors and team-based care boundaries.
ARCH-NHWECA: National Health Workforce Education and Capacity Authority. Training slots, scholarships, fellowships, training hubs, specialist bottleneck program.
ARCH-RS-CORPS: Rural Service Corps. Rural placements, housing/bonus support, rural workforce stabilization.
ARCH-AICIO: AI Clinical Integration Office. AI model registry, validation, monitoring, use classes, audit logs, suspension.
Information, Records, and Cybersecurity
ARCH-AHIRC: Administration for Health Information, Records, and Cybersecurity. Parent information/cyber administration.
ARCH-NHRA: National Health Records Authority. Longitudinal record, record locator, patient access/correction, data standards.
ARCH-NHIS: National Health Identifier Service. Health identity infrastructure separate from SSN.
ARCH-NMPI: National Master Patient Index. Person-matching and identity resolution.
ARCH-NLLHR: National Longitudinal Health Record. National longitudinal record function.
ARCH-NRLS: National Record Locator Service. Record discovery and locator service.
ARCH-NCDSO: National Clinical Data Standards Office. Clinical data standards and API conventions.
ARCH-NAIG: National API and Interoperability Gateway. Interoperability gateway and conformance.
ARCH-PACP: Patient Access and Consent Portal. Patient record access, correction, consent, segmentation, audit views.
ARCH-CIRBAS: Clinician Identity and Role-Based Access System. Clinician identity, credentials, roles, access control.
ARCH-HCCA: Health Cybersecurity and Continuity Authority. Cybersecurity, continuity, failover, drills, vulnerability remediation.
Oversight, Rights, Safety, and Courts
ARCH-NHAC: National Health Accountability Commission. Independent oversight, rights, privacy, safety, anti-fraud, appeals, public reporting.
ARCH-NOPRSL: National Office of Patient Rights, Safety, and Legitimacy. No silent rationing, patient rights, safety, AI accountability, service design, equity, trust.
ARCH-OIG-AF: Office of Inspector General and Anti-Fraud. Fraud, abuse, extraction, improper payment, enforcement.
ARCH-HRPO: Health Rights and Privacy Office. Privacy, data rights, access audits, segmentation, consent, breach oversight.
ARCH-PROO: Patient Rights and Ombudsman Office. Patient/provider ombudsman, issue resolution, provisional relief triggers.
ARCH-NAT: National Appeals Tribunal. Administrative appeals if retained before Article I review.
ARCH-A1-HCAC: Article I Health Claims and Appeals Court. Enforceable expedited patient/provider/payment/anti-impoundment remedies.
ARCH-NPSMIB: National Patient Safety and Medical Injury Board. Patient safety, diagnostic safety, injury compensation, learning network.
ARCH-HAAO: Hospital Administrative Accountability Office. Hospital extraction, service-line, budget, staffing and charter accountability.
ARCH-PRTO: Public Reporting and Transparency Office. Public dashboards, data publication, transparency.
Transition and Adaptation
ARCH-NHTCA: National Health Transition and Continuity Authority. Transition command through stabilization.
ARCH-PCO: Patient Continuity Office. Active treatment, medication, referral, appeal, and care-plan continuity.
ARCH-PLCCO: Provider Liquidity and Claims Continuity Office. Provider liquidity, provisional payments, transition payment complaints.
ARCH-HESSO: Hospital and Essential Service Stabilization Office. Hospital stabilization corridor and essential service transition.
ARCH-PDCO: Pharmacy and Drug Continuity Office. Transition medication access and pharmacy onboarding.
ARCH-HATC: Health Administration Transition Corps. Retraining/redeploying displaced insurance/PBM/billing/revenue-cycle workers.
ARCH-SRCO: State and Regional Compact Office. State and regional transition compacts.
ARCH-EPTO: Employer and Payroll Transition Office. Employer contribution transition and wage pass-through compliance.
ARCH-LPWO: Legacy Payer Wind-Down Office. Legacy insurer/PBM/TPA runout, data transfer, appeal and liability wind-down.
ARCH-DMRCO: Data Migration and Records Continuity Office. Legacy data transfer, cleaning, and transition record continuity.
ARCH-TRTO: Tribal and Rural Transition Office. Tribal and rural transition protections.
ARCH-TLSHO: Transition Legal Safe Harbor Office. Transition safe harbors and disputes.
ARCH-TRPGO: Transition Risk and Phase-Gate Office. Transition risk and phase-gate management.
ARCH-NHASB: National Health Adaptation and Scorekeeping Board. Independent scorekeeping, formula registry, reviews, red team, legal contingencies, repair.
Innovation
ARCH-NBIA: National Biomedical Innovation Agency. Public R&D, public-interest licensing, comparative effectiveness, innovation delinkage.
ARCH-NDIF: National Drug Innovation Fund. Public drug innovation funding.
ARCH-TMTFO: Translational Medicine and Trial Funding Office. Translational medicine and clinical trial funding.
ARCH-PILO: Public-Interest Licensing Office. Licensing terms for publicly funded technologies.
ARCH-CEVI: Comparative Effectiveness and Value Institute. Comparative effectiveness, benefit boundary evidence, value reconciliation.
ARCH-SRAE: Secure Research and Analytics Enclave. Privacy-preserving research/analytics infrastructure.
Stakeholder Needs Register
Each stakeholder need is a non-solution statement of desired outcome. Each top-level need has a parametric goal to indicate satisfaction.
SN-01: People need covered healthcare to be financially non-ruinous. Parametric goal: covered-care patient-billing rate <=0.5% of covered encounters by maturity. Link: KPP-A3.
SN-02: People need continuous coverage that does not depend on employment, income churn, state program churn, or insurer status. Parametric goal: continuous core coverage rate >=99.5% of eligible residents by maturity. Link: KPP-A1.
SN-03: People need timely access to common, non-specialist care. Parametric goal: same-day low-acuity access rate >=85% by maturity. Link: KPP-B2.
SN-04: People need timely access to specialist care when clinical need warrants it. Parametric goal: routine specialist median wait <=30 days and urgent specialist timeliness >=95% by maturity. Link: KPP-B5/KPP-B6.
SN-05: Patients need care transitions to preserve active treatment, medications, referrals, and care plans. Parametric goal: active treatment transfer success >=99% by maturity. Link: KPP-T1.
SN-06: Providers need predictable and timely payment for covered care. Parametric goal: clean claim payment timeliness >=99% by maturity. Link: TPP-2.2.
SN-07: Hospitals and essential facilities need stable funding while maintaining required services. Parametric goal: essential service continuity >=95% of regions by maturity. Link: TPP-5.4.
SN-08: Pharmacies and patients need reliable access to essential medicines. Parametric goal: critical drug shortage exposure <=3% of critical drug list by maturity. Link: TPP-3.5.
SN-09: The workforce needs fair compensation, safe workload, career stability, and meaningful transition pathways. Parametric goal: critical workforce vacancy rate <=5% by maturity. Link: TPP-8.1.
SN-10: Displaced administrative workers need viable transition pathways into useful employment. Parametric goal: displaced eligible worker placement/training rate >=75% by maturity. Link: KPP-W1.
SN-11: Sponsors need the system to be fiscally sustainable and predictably financed. Parametric goal: dedicated revenue sufficiency >=100% of obligations by maturity. Link: KPP-C5.
SN-12: Ordinary households need protection from becoming the fallback financing source. Parametric goal: incremental ordinary-taxpayer burden share <=5% by maturity. Link: KPP-C8.
SN-13: Implementers need legal durability against executive sabotage, impoundment, vacancies, and administrative nonfeasance. Parametric goal: mandatory payment protection coverage >=99.5% of core spending by maturity. Link: TPP-12.1.
SN-14: Patients and providers need transparent, explainable, appealable decisions. Parametric goal: denial/routing explanation completeness >=98% by maturity. Link: TPP-LEG1.
SN-15: Patients need privacy, record access, correction rights, and protection from improper data use. Parametric goal: record correction closure within target >=97% and sensitive access audit completion >=99% by maturity. Link: TPP-10.5 / Layer 4.
SN-16: Stakeholders need clinical safety, diagnostic reliability, and closed-loop follow-up. Parametric goal: abnormal-result closed-loop follow-up >=99% by maturity. Link: Layer 4 / TPP-6.3.
SN-17: Stakeholders need AI-enabled processes to be safe, auditable, non-discriminatory, and human-reviewable. Parametric goal: high-stakes AI human-review capture >=99% by maturity. Link: TPP-11.5.
SN-18: Underserved groups need equitable access, quality, safety, and outcomes. Parametric goal: specialist wait equity ratio <=1.10 and coverage equity gap <=0.5 percentage points by maturity. Link: KPP-E1/KPP-E3.
SN-19: Patients, providers, and governments need usable services that can be understood and navigated. Parametric goal: patient rights notice comprehension >=90% and appeal filing completion without assistance >=85% by maturity. Link: TPP-USE1/2.
SN-20: The public needs visible accountability, anti-capture controls, and trustworthy public reporting. Parametric goal: required public data publication timeliness >=99% by maturity. Link: TPP-12.4.
SN-21: The framework needs adaptability without becoming easy to sabotage. Parametric goal: required sunset/review completion >=99% by maturity. Link: Layer 5 TPP.
SN-22: Researchers, innovators, and patients need continued development of valuable medical technologies without monopoly pricing as the default financing model. Parametric goal: priority unmet-need areas with active public R&D program >=95% by maturity. Link: TPP-13.1.
SN-23: Regions need local flexibility while preserving national standards. Parametric goal: approved regional adaptation waivers with completed evaluation >=95% by maturity. Link: TPP-REG1.
SN-24: Tribal nations need health-system integration that preserves sovereignty and federal trust responsibilities. Parametric goal: tribal transition compact execution and compliance >=98% by maturity. Link: TPP-TRIB1.
SN-25: Employers need a predictable transition away from core health-benefit sponsorship. Parametric goal: employer wage-pass-through compliance >=95% by maturity. Link: TPP-EMP1.
Derived Need Summary
SN-01 derived needs: covered care should avoid catastrophic bills; drug, hospital, emergency, ambulance, and long-term care costs should be predictable; covered-care medical debt should be prohibited.
SN-02 derived needs: coverage should persist through job loss, income change, state moves, disability, pregnancy, aging, and family changes.
SN-03 derived needs: patients need same-day low-acuity care, chronic monitoring, vaccines, testing, refills, minor care close to home; EDs need safe low-acuity diversion.
SN-04 derived needs: patients need urgent specialist review when delay creates serious risk; specialists need complete referral packets and clear clinical questions; regions need specialty capacity visibility.
SN-05 derived needs: active treatment plans, medications, referrals, scheduled procedures, DME, LTC plans, and appeals must survive migration.
SN-06 derived needs: clean claims should be paid on time; provisional payment should protect providers if public rails fail; recoupment should not threaten small-provider solvency.
SN-07 derived needs: communities need ED, OB, psychiatric, ICU, rural inpatient, trauma, dialysis, stroke/cardiac, pediatric and safety-net services preserved.
SN-08 derived needs: essential medications should be available; pharmacies need reliable payment; supply-chain alternatives should exist for monopoly and shortage-prone products.
SN-09 derived needs: clinicians need fair pay, safe workload, compensation for e-consults/protocol work, clear scope, and regional workforce support.
SN-10 derived needs: displaced insurance/PBM/billing/revenue-cycle workers need retraining, income support, placement, and orderly legacy wind-down.
SN-11 derived needs: sponsors need reliable revenue, reserve ratios, enforceable tax bases, transparent cost forecasts, and fiscal triggers.
SN-12 derived needs: low- and middle-income households should be insulated from financing shocks; progressive layers should activate before broad taxes.
SN-13 derived needs: patients/providers need payments not subject to executive refusal; agencies need vacancy and staffing continuity; fallback statutes should activate after adverse court rulings.
SN-14 derived needs: decisions should identify facts, rules, evidence, urgency, alternative plan, human reviewer, and appeal path.
SN-15 derived needs: patients need record access, correction, segmentation, access logs, breach notice, and anti-commercialization protections.
SN-16 derived needs: abnormal results need closure; bounce-backs and diagnostic harms need review; staff need nonpunitive reporting.
SN-17 derived needs: AI should be registered, validated, audited, human-reviewable, and barred from final high-stakes denial/non-escalation decisions.
SN-18 derived needs: rural, low-income, disabled, tribal, language-minority, racial-minority, older adult, pediatric, and pregnant populations need comparable access and outcomes.
SN-19 derived needs: enrollment, appeals, records, medication checks, referral status, and human help must be understandable and accessible through multiple channels.
SN-20 derived needs: the public needs performance dashboards, anti-capture controls, conflicts disclosures, audits, and public reporting.
SN-21 derived needs: bad formulas, failing pilots, legal shocks, vendor lock-in, and obsolete rules need transparent repair without enabling sabotage.
SN-22 derived needs: public R&D must prioritize unmet need and clinical value while preserving affordability.
SN-23 derived needs: regions need adaptation waivers with hypotheses, endpoints, equity analysis, budget review, sunset, and evaluation.
SN-24 derived needs: tribal nations need consultation, direct funding, tribal data governance, federal trust responsibility, and no state veto.
SN-25 derived needs: employers need predictable contribution rules; workers need wage pass-through; small businesses need transition stability.
Requirements Register
The requirements register translates stakeholder needs into project requirements (cost, budget, schedule, workforce), system requirements (architecture, function, capability/performance, interfaces, and dependencies), and verification requirements.
Project Requirements
Cost, Budget, and Fiscal Project Requirements
PR-CST-001: The project shall establish a mature-system cost baseline expressed in total annual dollars, per-capita dollars, and percent of GDP before national default coverage begins. Trace: SN-11. Verification: Analysis.
PR-CST-002: The project shall maintain total national health-system spending at or below 15.2% of GDP by Phase 8 maturity certification. Trace: KPP-C1, SN-11. Verification: Analysis.
PR-CST-003: The project shall maintain mature per-capita system cost at or below $13,300 in real 2024 dollars by Phase 8 maturity certification. Trace: KPP-C2, SN-11. Verification: Analysis. Note: later drafting should reconcile this per-capita target with the final $4.75T total cost and updated population denominator.
PR-CST-004: The project shall reduce total administrative cost ratio by at least 50% relative to baseline by Phase 8 maturity certification. Trace: KPP-C3, SN-11. Verification: Analysis.
PR-CST-005: The project shall establish a Health System Transition Protection Fund before Phase 3 coverage migration begins. Trace: SN-05, SN-06, SN-10. Verification: Inspection.
PR-CST-006: The project shall maintain dedicated revenue sufficiency at or above 100% of certified obligations by Phase 8 maturity certification. Trace: KPP-C5, SN-11. Verification: Analysis.
PR-CST-007: The project shall maintain stabilization reserve assets equal to at least 12 months of volatile revenue exposure by Phase 8 maturity certification. Trace: KPP-C6, SN-11. Verification: Analysis.
PR-CST-008: The project shall maintain wealth-financing collection efficiency at or above 92% of certified legally due collections by Phase 8 maturity certification. Trace: KPP-C7, SN-11. Verification: Analysis.
PR-CST-009: The project shall limit the share of incremental financing burden borne by ordinary households to no more than 5% by Phase 8 maturity certification. Trace: KPP-C8, SN-12. Verification: Analysis.
PR-CST-010: The project shall allocate 0.25% to 0.50% of annual National Health Assurance spending to legitimacy, safety, patient rights, transparency, appeals, and trust infrastructure after Phase 6. Trace: SN-14, SN-16, SN-20. Verification: Analysis.
Schedule and Phase-Gate Requirements
PR-SCH-001: The project shall complete statutory establishment of core governing bodies by the end of Phase 0. Trace: SN-13, SN-20. Verification: Inspection.
PR-SCH-002: The project shall complete authoritative person, provider, facility, formulary, and claims registries by the end of Phase 1. Trace: SN-02, SN-06, SN-15. Verification: Demonstration.
PR-SCH-003: The project shall operationalize the public pharmacy claims utility by the end of Phase 2. Trace: SN-08. Verification: Demonstration.
PR-SCH-004: The project shall operationalize public coverage wave I by the end of Phase 3. Trace: SN-02, SN-05. Verification: Demonstration.
PR-SCH-005: The project shall operationalize hospital global-budget pilots by the end of Phase 4. Trace: SN-07. Verification: Demonstration.
PR-SCH-006: The project shall scale the Community Diagnostic and Treatment Network to cover at least 65% of the population by the end of Phase 5. Trace: KPP-B7, SN-03. Verification: Analysis.
PR-SCH-007: The project shall achieve national public default coverage by the end of Phase 6. Trace: SN-02. Verification: Analysis.
PR-SCH-008: The project shall expand long-term care, behavioral health, dental, vision, hearing, and EMS benefits by the end of Phase 7. Trace: SN-01, SN-03, SN-18. Verification: Inspection.
PR-SCH-009: The project shall complete full integration of public manufacturing, records mesh, innovation delinkage, and mature payment systems by the end of Phase 8. Trace: SN-08, SN-15, SN-22. Verification: Demonstration.
PR-SCH-010: The project shall not proceed from Phase 3 to Phase 4 unless clean-claim auto-adjudication is at least 75% for wave I medical claims. Trace: TPP-2.1, SN-06. Verification: Analysis.
PR-SCH-011: The project shall not proceed to broad cost-sharing elimination unless diagnostic-treatment unit population coverage is at least 80%. Trace: KPP-B7, SN-03. Verification: Analysis.
PR-SCH-012: The project shall not proceed to broad cost-sharing elimination unless unsafe under-referral is no greater than 5 per 10,000 non-escalated unit encounters. Trace: KPP-B9, SN-16. Verification: Analysis.
PR-SCH-013: The project shall not proceed to full long-term care expansion unless long-term care assessment timeliness is at least 85%. Trace: TPP-9.1, SN-05. Verification: Analysis.
PR-SCH-014: The project shall not proceed to mature full-benefit certification unless dedicated revenue sufficiency is at least 98% and stabilization reserves equal at least six months of volatile revenue exposure. Trace: KPP-C5, KPP-C6. Verification: Analysis.
PR-SCH-015: The project shall not deploy national AI-assisted routing unless high-stakes AI human-review capture is at least 97%. Trace: TPP-11.5, SN-17. Verification: Test.
Workforce Project Requirements
PR-WF-001: The project shall establish the National Health Workforce Education and Capacity Authority before Phase 2. Trace: SN-09, SN-04. Verification: Inspection.
PR-WF-002: The project shall create at least 55,000 new annual publicly funded training slots in priority specialties and advanced clinical roles by Phase 8. Trace: TPP-8.3, SN-09. Verification: Inspection.
PR-WF-003: The project shall maintain critical workforce vacancy rate at or below 5% by Phase 8. Trace: TPP-8.1, SN-09. Verification: Analysis.
PR-WF-004: The project shall maintain publicly funded trainee public-service obligation fulfillment at or above 96% by Phase 8. Trace: TPP-8.4, SN-09. Verification: Analysis.
PR-WF-005: The project shall reduce the Specialist Bottleneck Index by at least 50% by Phase 8. Trace: TPP-8.2, SN-04. Verification: Analysis.
PR-WF-006: The project shall establish the Health Administration Transition Corps before legacy payer wind-down begins. Trace: SN-10. Verification: Inspection.
PR-WF-007: The project shall place or enroll at least 75% of eligible displaced administrative workers into approved employment or training pathways by Phase 8. Trace: KPP-W1, SN-10. Verification: Analysis.
PR-WF-008: The project shall achieve national scope-floor implementation in at least 98% of regions by Phase 8. Trace: TPP-8.5, SN-09. Verification: Inspection.
PR-WF-009: The project shall reduce clinician burnout risk index by at least 30% from baseline by Phase 8. Trace: TPP-8.6, SN-09. Verification: Analysis.
PR-WF-010: The project shall improve standardized clinician safety-culture score by at least 25 percentage points from baseline by Phase 8. Trace: KPP-CULT1, SN-09, SN-16. Verification: Analysis.
Transition Project Requirements
PR-TRN-001: The project shall establish the National Health Transition and Continuity Authority before Phase 1. Trace: SN-05. Verification: Inspection.
PR-TRN-002: The project shall maintain migrated patient continuity rate at or above 99.5% by Phase 8. Trace: SN-05. Verification: Analysis.
PR-TRN-003: The project shall maintain active treatment transfer success at or above 99% by Phase 8. Trace: KPP-T1, SN-05. Verification: Analysis.
PR-TRN-004: The project shall maintain critical medication interruption rate at or below 0.2% by Phase 8. Trace: KPP-T2, SN-05, SN-08. Verification: Analysis.
PR-TRN-005: The project shall achieve legacy payer data-transfer completeness of at least 99% by Phase 8. Trace: SN-05, SN-15. Verification: Inspection.
PR-TRN-006: The project shall execute state transition compacts for all states, the District of Columbia, and territories by Phase 8. Trace: SN-23. Verification: Inspection.
PR-TRN-007: The project shall achieve employer wage-pass-through compliance of at least 95% by Phase 8. Trace: TPP-EMP1, SN-25. Verification: Analysis.
PR-TRN-008: The project shall resolve at least 97% of patient transition complaints within target timeframe by Phase 8. Trace: SN-05, SN-19. Verification: Analysis.
PR-TRN-009: The project shall resolve at least 95% of provider transition complaints within target timeframe by Phase 8. Trace: SN-06. Verification: Analysis.
PR-TRN-010: The project shall sunset the National Health Transition and Continuity Authority no later than Year 15 unless Congress affirmatively extends it after independent review. Trace: SN-21. Verification: Inspection.
System Requirements
Architecture Requirements
SR-ARCH-001: The system shall include a Department of National Health Assurance responsible for operating national coverage, claims, care delivery, workforce, drug purchasing, records, and regional health functions. Trace: SN-02, SN-03, SN-06. Verification: Inspection.
SR-ARCH-002: The system shall include a National Health Accountability Commission independent from DNHA operations. Trace: SN-14, SN-16, SN-20. Verification: Inspection.
SR-ARCH-003: The system shall include a National Biomedical Innovation Agency responsible for public biomedical innovation funding and public-interest licensing. Trace: SN-22. Verification: Inspection.
SR-ARCH-004: The system shall include a Treasury Health Disbursement Office responsible for mandatory health disbursements. Trace: SN-06, SN-13. Verification: Inspection.
SR-ARCH-005: The system shall include a National Health Equalization Trust Fund with operating stabilization, shock reserve, and permanent endowment accounts. Trace: SN-11. Verification: Inspection.
SR-ARCH-006: The system shall include a National Health Transition and Continuity Authority during implementation and stabilization. Trace: SN-05, SN-10. Verification: Inspection.
SR-ARCH-007: The system shall include an Article I Health Claims and Appeals Court or equivalent expedited judicial review mechanism. Trace: SN-14, SN-13. Verification: Inspection.
SR-ARCH-008: The system shall include Regional Health Assurance Compacts or direct federal fallback administration for every region. Trace: SN-23. Verification: Inspection.
SR-ARCH-009: The system shall include a National Health Adaptation and Scorekeeping Board independent from DNHA operations. Trace: SN-21. Verification: Inspection.
SR-ARCH-010: The system shall include a National Community Diagnostic and Treatment Network composed of Type A, Type B, Type C, and Type D units. Trace: SN-03. Verification: Inspection.
SR-ARCH-011: The system shall include a National Specialty Access Authority responsible for specialty referral protocols, regional specialty queues, e-consult infrastructure, and specialty capacity ledgers. Trace: SN-04. Verification: Inspection.
SR-ARCH-012: The system shall include a National Office of Patient Rights, Safety, and Legitimacy within NHAC. Trace: SN-14, SN-16, SN-20. Verification: Inspection.
SR-ARCH-013: The system shall include a National Health Records Authority responsible for identity, record locator, longitudinal records, APIs, patient access, and correction workflows. Trace: SN-15. Verification: Inspection.
SR-ARCH-014: The system shall include an AI Clinical Integration Office responsible for AI validation, model registry, audit logging, and suspension authority. Trace: SN-17. Verification: Inspection.
SR-ARCH-015: The system shall include a Formula Registry for all formulas affecting payment, access, benefits, routing, workforce allocation, or priority. Trace: SN-21. Verification: Inspection.
Coverage, Enrollment, and Financial Protection Requirements
SR-COV-001: The system shall maintain a continuous core coverage rate of at least 99.5% by Phase 8. Trace: KPP-A1, SN-02. Verification: Analysis.
SR-COV-002: The system shall maintain residual uninsured rate at or below 0.2% by Phase 8. Trace: KPP-A2, SN-02. Verification: Analysis.
SR-COV-003: The system shall limit covered-care patient billing to no more than 0.5% of covered encounters by Phase 8. Trace: KPP-A3, SN-01. Verification: Analysis.
SR-COV-004: The system shall reduce new covered-care medical debt incidence to no more than 1% of baseline by Phase 8. Trace: KPP-A4, SN-01. Verification: Analysis.
SR-COV-005: The system shall reduce household point-of-care spending for covered care by at least 90% from baseline by Phase 8. Trace: KPP-A5, SN-01. Verification: Analysis.
SR-COV-006: The system shall eliminate worker core health premium contributions for at least 98% of workers by Phase 8. Trace: KPP-A6, SN-25. Verification: Analysis.
SR-COV-007: The system shall reduce bankruptcy filings citing medical debt or medical-cost shock by at least 90% from baseline by Phase 8. Trace: KPP-A7, SN-01. Verification: Analysis.
SR-COV-008: The system shall provisionally cover unresolved eligibility cases within 24 hours in at least 99.5% of cases by Phase 8. Trace: TPP-1.4, SN-02. Verification: Analysis.
SR-COV-009: The system shall limit erroneous coverage terminations to no more than 2 per 100,000 covered persons per year by Phase 8. Trace: TPP-1.3, SN-02. Verification: Analysis.
SR-COV-010: The system shall determine or confirm eligibility in real time for at least 99% of eligibility transactions by Phase 8. Trace: TPP-1.2, SN-02. Verification: Test.
SR-COV-011: The system shall maintain master person index match accuracy of at least 99.8% by Phase 8. Trace: TPP-1.1, SN-15. Verification: Test.
Access and Capacity Requirements
SR-ACC-001: The system shall provide median front-door primary or unit access within 24 hours by Phase 8. Trace: KPP-B1, SN-03. Verification: Analysis.
SR-ACC-002: The system shall resolve at least 85% of low-acuity care requests on the same day by Phase 8. Trace: KPP-B2, SN-03. Verification: Analysis.
SR-ACC-003: The system shall reduce low-acuity ED visits by at least 30% from baseline by Phase 8. Trace: KPP-B3, SN-03. Verification: Analysis.
SR-ACC-004: The system shall resolve at least 40% of specialist requests through e-consult without in-person specialist visit by Phase 8. Trace: KPP-B4, SN-04. Verification: Analysis.
SR-ACC-005: The system shall maintain median routine specialist wait time at or below 30 days by Phase 8. Trace: KPP-B5, SN-04. Verification: Analysis.
SR-ACC-006: The system shall complete at least 95% of urgent specialist referrals within urgency-class target by Phase 8. Trace: KPP-B6, SN-04. Verification: Analysis.
SR-ACC-007: The system shall place at least 95% of the population within access-time standard for a Type A/B/C/D unit or mobile equivalent by Phase 8. Trace: KPP-B7, SN-03. Verification: Analysis.
SR-ACC-008: The system shall resolve at least 70% of unit encounters without ED, specialist, or hospital escalation within 7 days by Phase 8. Trace: KPP-B8, SN-03. Verification: Analysis.
SR-ACC-009: The system shall maintain unsafe under-referral rate at or below 3 per 10,000 non-escalated encounters by Phase 8. Trace: KPP-B9, SN-16. Verification: Analysis.
SR-ACC-010: The system shall operate at least 15,000 certified Type A/B/C/D units by Phase 8. Trace: TPP-6.1, SN-03. Verification: Inspection.
SR-ACC-011: The system shall complete required protocol diagnostics before unit disposition in at least 98% of applicable encounters by Phase 8. Trace: TPP-6.2, SN-16. Verification: Analysis.
SR-ACC-012: The system shall close follow-up on at least 99% of abnormal unit results within target timeframe by Phase 8. Trace: TPP-6.3, SN-16. Verification: Analysis.
SR-ACC-013: The system shall maintain antibiotic stewardship compliance of at least 95% by Phase 8. Trace: TPP-6.4, SN-16. Verification: Analysis.
SR-ACC-014: The system shall limit unit 72-hour same-problem bounce-back rate to no more than 3.5% by Phase 8. Trace: TPP-6.5, SN-16. Verification: Analysis.
SR-ACC-015: The system shall improve low-risk unit encounters safely closed per clinician-hour by at least 125% from baseline by Phase 8. Trace: TPP-6.6, SN-03/SN-09. Verification: Analysis.
Specialist Routing Requirements
SR-SPEC-001: The system shall require a structured referral packet for every non-emergency specialist referral. Trace: SN-04, SN-14. Verification: Inspection.
SR-SPEC-002: The system shall maintain specialist referral packet completeness at or above 98% by Phase 8. Trace: TPP-7.1, SN-04. Verification: Analysis.
SR-SPEC-003: The system shall maintain median e-consult response time at or below 24 hours by Phase 8. Trace: TPP-7.2, SN-04. Verification: Analysis.
SR-SPEC-004: The system shall limit inappropriate specialist referral rate to no more than 5% by Phase 8. Trace: TPP-7.3, SN-04. Verification: Analysis.
SR-SPEC-005: The system shall reserve at least 30% of publicly paid specialist capacity for urgent and e-consult work by Phase 8. Trace: TPP-7.4, SN-04. Verification: Inspection.
SR-SPEC-006: The system shall require at least 95% of publicly paid specialists to participate in regional specialty capacity ledgers by Phase 8. Trace: TPP-7.5, SN-04. Verification: Inspection.
SR-SPEC-007: The system shall route emergency presentations directly to ED or emergency specialty pathways without routine referral queue placement. Trace: SN-04, SN-16. Verification: Demonstration.
SR-SPEC-008: The system shall maintain a regional specialty queue for each region and specialty category covered by public payment. Trace: SN-04, SN-23. Verification: Demonstration.
SR-SPEC-009: The system shall assign an urgency class to every specialist referral before scheduling. Trace: SN-04, SN-14. Verification: Inspection.
SR-SPEC-010: The system shall identify a follow-up owner for every specialist referral and e-consult. Trace: SN-04, SN-16. Verification: Inspection.
Claims, Payment, and Disbursement Requirements
SR-PAY-001: The system shall auto-adjudicate at least 95% of clean claims without manual intervention by Phase 8. Trace: TPP-2.1, SN-06. Verification: Analysis.
SR-PAY-002: The system shall pay at least 99% of clean claims within statutory timeframe by Phase 8. Trace: TPP-2.2, SN-06. Verification: Analysis.
SR-PAY-003: The system shall maintain improper payment rate at or below 1% by Phase 8. Trace: TPP-2.3, SN-11. Verification: Analysis.
SR-PAY-004: The system shall limit provider payment delay exceeding 30 days to no more than 0.5% of providers by Phase 8. Trace: TPP-2.4, SN-06. Verification: Analysis.
SR-PAY-005: The system shall disburse at least 99.8% of mandatory payments without discretionary apportionment delay by Phase 8. Trace: TPP-2.5, SN-13. Verification: Analysis.
SR-PAY-006: The system shall issue provisional Treasury payment for clean transition claims not paid within statutory timeframe. Trace: SN-06, SN-05. Verification: Demonstration.
SR-PAY-007: The system shall reconcile provisional provider payments at least quarterly. Trace: SN-06, SN-11. Verification: Inspection.
SR-PAY-008: The system shall cap non-fraud small-provider reconciliation withholding at no more than 5% of monthly public revenue. Trace: SN-06. Verification: Inspection.
SR-PAY-009: The system shall process pharmacy claims in real time for at least 99.5% of transactions by Phase 8. Trace: TPP-3.1, SN-08. Verification: Test.
SR-PAY-010: The system shall maintain clean-claim processing cost at or below $3 per clean paid claim by Phase 8. Trace: KPP-C4, SN-11. Verification: Analysis.
Pharmacy, Drugs, Manufacturing, and Supply Requirements
SR-DRUG-001: The system shall provide $0 patient charge for at least 98% of essential formulary fills by Phase 8. Trace: TPP-3.2, SN-01/SN-08. Verification: Analysis.
SR-DRUG-002: The system shall reduce weighted net unit price for target drugs by at least 55% from baseline by Phase 8. Trace: TPP-3.3, SN-11. Verification: Analysis.
SR-DRUG-003: The system shall process at least 98% of core pharmacy benefit dollars outside the PBM model by Phase 8. Trace: TPP-3.4, SN-08. Verification: Analysis.
SR-DRUG-004: The system shall maintain critical drug shortage exposure at or below 3% of the critical drug list by Phase 8. Trace: TPP-3.5, SN-08. Verification: Analysis.
SR-DRUG-005: The system shall convert at least 75% of eligible nonpreferred prescriptions to preferred equivalent therapy without successful adverse appeal by Phase 8. Trace: TPP-3.6, SN-08. Verification: Analysis.
SR-DRUG-006: The system shall maintain PMC or public backup supply for at least 200 essential product families by Phase 8. Trace: TPP-4.1, SN-08. Verification: Inspection.
SR-DRUG-007: The system shall maintain at least 90% critical product dual-source coverage by Phase 8. Trace: TPP-4.2, SN-08. Verification: Inspection.
SR-DRUG-008: The system shall maintain batch quality release success at or above 99.2% for PMC and contract products by Phase 8. Trace: TPP-4.3, SN-08. Verification: Analysis.
SR-DRUG-009: The system shall maintain secure API source coverage for at least 80% of critical products by Phase 8. Trace: TPP-4.4, SN-08. Verification: Inspection.
SR-DRUG-010: The system shall maintain near-real-time national inventory visibility for at least 98% of critical drug and device SKUs by Phase 8. Trace: TPP-4.5, SN-08. Verification: Test.
Hospital, Facility, and Essential-Service Requirements
SR-HOSP-001: The system shall migrate at least 95% of hospital facility spending to public global, readiness, or capital budgets by Phase 8. Trace: TPP-5.1, SN-07. Verification: Analysis.
SR-HOSP-002: The system shall maintain absolute hospital global-budget variance at or below 2% by Phase 8. Trace: TPP-5.2, SN-07/SN-11. Verification: Analysis.
SR-HOSP-003: The system shall eliminate routine outpatient facility fees for at least 99% of applicable covered encounters by Phase 8. Trace: TPP-5.3, SN-01. Verification: Analysis.
SR-HOSP-004: The system shall maintain essential service continuity in at least 95% of regions by Phase 8. Trace: TPP-5.4, SN-07. Verification: Analysis.
SR-HOSP-005: The system shall maintain hospital staffing safety compliance at or above 97% by Phase 8. Trace: TPP-5.5, SN-09/SN-16. Verification: Analysis.
SR-HOSP-006: The system shall limit related-party extraction ratio to no more than 0.5% of hospital budget by Phase 8. Trace: TPP-5.6, SN-20. Verification: Analysis.
SR-HOSP-007: The system shall require regional approval before closure or material degradation of any regionally essential service line. Trace: SN-07, SN-23. Verification: Inspection.
SR-HOSP-008: The system shall apply hospital stabilization corridors during each hospital conversion period. Trace: SN-07, SN-05. Verification: Inspection.
SR-HOSP-009: The system shall publish regional hospital service-line continuity status at least quarterly. Trace: SN-20, SN-07. Verification: Inspection.
SR-HOSP-010: The system shall maintain emergency readiness payment formulas in the public Formula Registry. Trace: SN-07, SN-21. Verification: Inspection.
Long-Term Care, Behavioral Health, Dental, Vision, Hearing, and EMS Requirements
SR-LTC-001: The system shall complete at least 95% of long-term care functional assessments within statutory target by Phase 8. Trace: TPP-9.1, SN-05. Verification: Analysis.
SR-LTC-002: The system shall serve at least 70% of eligible long-term care beneficiaries safely at home or in community settings by Phase 8. Trace: TPP-9.2, SN-05. Verification: Analysis.
SR-LTC-003: The system shall prohibit reduction of active long-term care services without notice, reassessment, and appeal. Trace: SN-05, SN-14. Verification: Inspection.
SR-BH-001: The system shall provide median first behavioral health contact within 48 hours by Phase 8. Trace: TPP-9.3, SN-03. Verification: Analysis.
SR-BH-002: The system shall meet behavioral health crisis response target in at least 95% of crisis cases by Phase 8. Trace: TPP-9.4, SN-16. Verification: Analysis.
SR-BH-003: The system shall maintain privacy segmentation for behavioral health and substance-use-disorder records. Trace: SN-15. Verification: Test.
SR-DVH-001: The system shall provide median basic dental appointment access within 21 days by Phase 8. Trace: TPP-9.5, SN-03. Verification: Analysis.
SR-DVH-002: The system shall fulfill at least 95% of standard hearing and vision device orders within target by Phase 8. Trace: TPP-9.6, SN-03. Verification: Analysis.
SR-EMS-001: The system shall maintain EMS readiness compliance in at least 95% of EMS regions by Phase 8. Trace: TPP-9.7, SN-07. Verification: Analysis.
SR-EMS-002: The system shall integrate EMS escalation pathways with Type B, Type C, and Type D diagnostic-treatment units. Trace: SN-03, SN-16. Verification: Demonstration.
Records, Interoperability, Data Rights, and Cybersecurity Requirements
SR-DATA-001: The system shall verify at least 99.5% of active provider and facility registry records by Phase 8. Trace: TPP-10.1, SN-15. Verification: Analysis.
SR-DATA-002: The system shall maintain reconciled active medication lists for at least 95% of covered persons by Phase 8. Trace: TPP-10.2, SN-08/SN-15. Verification: Analysis.
SR-DATA-003: The system shall make at least 98% of covered lab results available in the national record within target time by Phase 8. Trace: TPP-10.3, SN-15. Verification: Test.
SR-DATA-004: The system shall make at least 98% of hospital discharge summaries available in structured form within 24 hours by Phase 8. Trace: TPP-10.4, SN-15. Verification: Test.
SR-DATA-005: The system shall resolve at least 97% of patient record correction requests within statutory timeframe by Phase 8. Trace: TPP-10.5, SN-15. Verification: Analysis.
SR-DATA-006: The system shall maintain API conformance rate at or above 98% by Phase 8. Trace: TPP-10.6, SN-15. Verification: Test.
SR-DATA-007: The system shall maintain critical system uptime at or above 99.97% by Phase 8. Trace: TPP-11.1, SN-13. Verification: Test.
SR-DATA-008: The system shall pass at least 98% of downtime continuity drills for essential care and payment functions by Phase 8. Trace: TPP-11.2, SN-13. Verification: Test.
SR-DATA-009: The system shall remediate at least 99% of critical vulnerabilities within 15 days by Phase 8. Trace: TPP-11.3, SN-15. Verification: Analysis.
SR-DATA-010: The system shall complete sensitive data access audits for at least 99% of required cases by Phase 8. Trace: SN-15. Verification: Analysis.
SR-DATA-011: The system shall provide patient-visible accounting of access to longitudinal health records. Trace: SN-15. Verification: Demonstration.
SR-DATA-012: The system shall provide sensitive data segmentation for behavioral health, SUD, reproductive health, HIV/STI, genetic, minor/adolescent, and tribal-governed records. Trace: SN-15. Verification: Test.
AI and Algorithmic Accountability Requirements
SR-AI-001: The system shall maintain prospective validation and post-deployment monitoring for at least 98% of AI-assisted clinical protocols by Phase 8. Trace: TPP-11.4, SN-17. Verification: Inspection.
SR-AI-002: The system shall capture recorded human approval, override, or exception reason for at least 99% of AI-assisted high-stakes decisions by Phase 8. Trace: TPP-11.5, SN-17. Verification: Test.
SR-AI-003: The system shall limit maximum AI performance deviation across protected groups to no more than 3% by Phase 8. Trace: TPP-11.6, SN-17/SN-18. Verification: Analysis.
SR-AI-004: The system shall prohibit AI systems from serving as final authority for denial of covered care. Trace: SN-17, SN-14. Verification: Inspection.
SR-AI-005: The system shall prohibit AI systems from serving as final authority for emergency non-escalation. Trace: SN-17, SN-16. Verification: Inspection.
SR-AI-006: The system shall prohibit AI systems from serving as final authority for specialist non-referral. Trace: SN-17, SN-04. Verification: Inspection.
SR-AI-007: The system shall maintain a public AI model registry for all high-stakes AI systems. Trace: SN-17, SN-20. Verification: Inspection.
SR-AI-008: The system shall log model version, input categories, recommendation, human reviewer, final decision, and appeal outcome for each high-stakes AI-assisted decision. Trace: SN-17, SN-14. Verification: Test.
SR-AI-009: The system shall suspend or restrict AI models that exceed safety or equity drift thresholds. Trace: SN-17, SN-18. Verification: Demonstration.
SR-AI-010: The system shall provide human review upon patient request for any high-stakes AI-influenced routing or denial decision. Trace: SN-17, SN-14. Verification: Demonstration.
Rights, Legitimacy, Safety, and Appeal Requirements
SR-RGT-001: The system shall publish a National Health Assurance Patient Bill of Rights before Phase 3. Trace: SN-14, SN-19. Verification: Inspection.
SR-RGT-002: The system shall maintain denial and routing explanation completeness at or above 98% by Phase 8. Trace: TPP-LEG1, SN-14. Verification: Analysis.
SR-RGT-003: The system shall achieve patient rights notice comprehension of at least 90% by Phase 8. Trace: TPP-USE1, SN-19. Verification: Analysis.
SR-RGT-004: The system shall enable at least 85% of users in usability testing to file an appeal without assistance by Phase 8. Trace: TPP-USE2, SN-19. Verification: Test.
SR-RGT-005: The system shall resolve at least 97% of appeals within statutory urgency class by Phase 8. Trace: TPP-12.6, SN-14. Verification: Analysis.
SR-RGT-006: The system shall complete 72-hour bounce-back reviews for at least 98% of triggered cases by Phase 8. Trace: SN-16. Verification: Analysis.
SR-RGT-007: The system shall maintain abnormal-result closed-loop follow-up at or above 99% by Phase 8. Trace: SN-16. Verification: Analysis.
SR-RGT-008: The system shall maintain language-access compliance at or above 98% by Phase 8. Trace: KPP-E5, SN-18/SN-19. Verification: Analysis.
SR-RGT-009: The system shall maintain disability accommodation compliance at or above 98% by Phase 8. Trace: SN-18, SN-19. Verification: Analysis.
SR-RGT-010: The system shall improve public trust in system fairness by at least 25 percentage points from baseline by Phase 8. Trace: KPP-TRUST1, SN-20. Verification: Analysis.
SR-RGT-011: The system shall complete required public data publication on time in at least 99% of scheduled publications by Phase 8. Trace: TPP-12.4, SN-20. Verification: Inspection.
SR-RGT-012: The system shall review any denial category with appeal reversal rate above 20% for two consecutive quarters. Trace: SN-14, SN-21. Verification: Inspection.
Equity Requirements
SR-EQ-001: The system shall limit coverage equity gap to no more than 0.5 percentage points by Phase 8. Trace: KPP-E1, SN-18. Verification: Analysis.
SR-EQ-002: The system shall limit access equity gap to no more than 5% by Phase 8. Trace: KPP-E2, SN-18. Verification: Analysis.
SR-EQ-003: The system shall limit specialist wait equity ratio to no more than 1.10 by Phase 8. Trace: KPP-E3, SN-18. Verification: Analysis.
SR-EQ-004: The system shall improve Rural Essential Access Index by at least 60 percentage points from baseline by Phase 8. Trace: KPP-E4, SN-18/SN-23. Verification: Analysis.
SR-EQ-005: The system shall conduct equity analysis for every major AI model, routing protocol, benefit rule, hospital formula, and long-term care assessment formula. Trace: SN-18, SN-17. Verification: Inspection.
SR-EQ-006: The system shall initiate corrective action when equity gaps exceed statutory thresholds for two consecutive quarters. Trace: SN-18. Verification: Inspection.
SR-EQ-007: The system shall report access, safety, appeal, and outcome metrics by protected and vulnerable population category where legally and ethically permissible. Trace: SN-18, SN-20. Verification: Inspection.
SR-EQ-008: The system shall execute and comply with at least 98% of tribal transition compact requirements by Phase 8. Trace: TPP-TRIB1, SN-24. Verification: Inspection.
SR-EQ-009: The system shall maintain direct funding pathways for tribal health authorities participating in National Health Assurance. Trace: SN-24. Verification: Inspection.
SR-EQ-010: The system shall prohibit state veto over tribal participation in federally authorized health assurance functions. Trace: SN-24. Verification: Inspection.
Legal Hardening, Continuity, and Anti-Sabotage Requirements
SR-LAW-001: The system shall place at least 99.5% of core spending under mandatory payment protection by Phase 8. Trace: TPP-12.1, SN-13. Verification: Analysis.
SR-LAW-002: The system shall maintain critical office staffing floor compliance at or above 98% by Phase 8. Trace: TPP-12.2, SN-13/SN-09. Verification: Analysis.
SR-LAW-003: The system shall maintain operating continuity within service levels for at least 99% of critical functions during leadership vacancies by Phase 8. Trace: TPP-12.3, SN-13. Verification: Demonstration.
SR-LAW-004: The system shall initiate legal or administrative anti-impoundment action within 24 hours of unlawful delay flag by Phase 8. Trace: TPP-12.5, SN-13. Verification: Inspection.
SR-LAW-005: The system shall prohibit reduction of staffing below statutory floors by government-wide hiring freeze, reorganization, personnel ceiling, or reduction in force. Trace: SN-13, SN-09. Verification: Inspection.
SR-LAW-006: The system shall maintain statutory acting succession for every critical Senate-confirmed health office. Trace: SN-13. Verification: Inspection.
SR-LAW-007: The system shall provide that no statutory duty fails for lack of quorum, vacancy, or failure to appoint. Trace: SN-13. Verification: Inspection.
SR-LAW-008: The system shall maintain automatic default rules for formulary, hospital budgets, claims payment, long-term care, workforce compensation, and public reporting when required regulations are not issued. Trace: SN-13, SN-21. Verification: Inspection.
SR-LAW-009: The system shall maintain legal contingency coverage for at least 99% of critical provisions by Phase 8. Trace: SN-21. Verification: Inspection.
SR-LAW-010: The system shall prohibit executive or contractor suppression of required public performance data. Trace: SN-13, SN-20. Verification: Inspection.
Adaptation, Formula, Sunset, and Repair Requirements
SR-ADP-001: The system shall maintain independent scorekeeping report timeliness at or above 99% by Phase 8. Trace: SN-21. Verification: Inspection.
SR-ADP-002: The system shall maintain performance-parameter verification completeness at or above 98% by Phase 8. Trace: SN-21. Verification: Inspection.
SR-ADP-003: The system shall maintain Formula Registry completeness at or above 99% by Phase 8. Trace: TPP-FORM1, SN-21. Verification: Inspection.
SR-ADP-004: The system shall complete at least 98% of required major rule retrospective reviews on time by Phase 8. Trace: SN-21. Verification: Inspection.
SR-ADP-005: The system shall complete at least 99% of required sunset reviews on time by Phase 8. Trace: SN-21. Verification: Inspection.
SR-ADP-006: The system shall resolve or ratify at least 98% of emergency repair actions before expiration by Phase 8. Trace: SN-21. Verification: Inspection.
SR-ADP-007: The system shall complete high-overturn appeal category reviews at or above 99% compliance by Phase 8. Trace: SN-14, SN-21. Verification: Inspection.
SR-ADP-008: The system shall maintain AI lifecycle review compliance at or above 99% by Phase 8. Trace: SN-17, SN-21. Verification: Inspection.
SR-ADP-009: The system shall maintain critical vendor exit-plan completeness at or above 98% by Phase 8. Trace: SN-21, SN-15. Verification: Inspection.
SR-ADP-010: The system shall complete pilot scale-or-terminate decisions on time for at least 98% of pilots by Phase 8. Trace: SN-21, SN-23. Verification: Inspection.
SR-ADP-011: The system shall complete public trust repair reviews after trigger in at least 98% of cases by Phase 8. Trace: SN-20, SN-21. Verification: Inspection.
SR-ADP-012: The system shall close at least 95% of red-team findings within target by Phase 8. Trace: SN-21. Verification: Inspection.
SR-ADP-013: The system shall complete at least 99% of fiscal forecast error reviews when triggered by variance thresholds by Phase 8. Trace: SN-11, SN-21. Verification: Analysis.
SR-ADP-014: The system shall verify corrective action effectiveness in at least 95% of corrective actions by Phase 8. Trace: SN-21. Verification: Analysis.
SR-ADP-015: The system shall complete independent evaluation for at least 95% of approved regional adaptation waivers by Phase 8. Trace: TPP-REG1, SN-23. Verification: Inspection.
Innovation and Biomedical Technology Requirements
SR-INN-001: The system shall maintain active NBIA-funded programs in at least 95% of priority unmet-need areas by Phase 8. Trace: TPP-13.1, SN-22. Verification: Inspection.
SR-INN-002: The system shall attach enforceable public-interest access or pricing licenses to at least 98% of materially publicly funded health technologies by Phase 8. Trace: TPP-13.2, SN-22. Verification: Inspection.
SR-INN-003: The system shall complete comparative effectiveness assessments within median 6 months of priority question initiation by Phase 8. Trace: TPP-13.3, SN-22. Verification: Analysis.
SR-INN-004: The system shall complete post-market value reconciliation for at least 90% of innovation rewards by Phase 8. Trace: TPP-13.4, SN-22. Verification: Analysis.
SR-INN-005: The system shall maintain a public benefit-boundary process for new drugs, biologics, devices, diagnostics, AI tools, procedures, and assistive technologies. Trace: SN-22, SN-21. Verification: Inspection.
SR-INN-006: The system shall provide coverage-with-evidence-development pathways for technologies with plausible high value and incomplete evidence. Trace: SN-22. Verification: Inspection.
SR-INN-007: The system shall prohibit monopoly pricing from serving as the default financing mechanism for publicly funded innovation. Trace: SN-22, SN-11. Verification: Inspection.
SR-INN-008: The system shall publish priority-setting criteria for public R&D funding. Trace: SN-22, SN-20. Verification: Inspection.
Interface and Function-Dependence Requirements
SR-IF-001: The claims function shall depend on verified person identity, provider identity, covered-benefit rule, payment formula, and Treasury disbursement interface. Trace: SR-PAY-001, SR-COV-011. Verification: Test.
SR-IF-002: The pharmacy claims function shall depend on formulary status, patient eligibility, pharmacy participation status, drug inventory status, and payment rule interfaces. Trace: SR-DRUG-001, SR-PAY-009. Verification: Test.
SR-IF-003: The specialist-routing function shall depend on unit workup data, referral packet completeness, urgency class, regional capacity ledger, and patient preference constraints. Trace: SR-SPEC-001/002. Verification: Demonstration.
SR-IF-004: The diagnostic-treatment unit disposition function shall depend on AI intake, clinician validation, red-flag protocol, test results, record access, and escalation-pathway availability. Trace: SR-ACC-011, SR-AI-010. Verification: Test.
SR-IF-005: The hospital global-budget function shall depend on facility registry, service-line inventory, population need, case mix, staffing safety, capital need, and regional access data. Trace: SR-HOSP-001/004. Verification: Analysis.
SR-IF-006: The long-term care authorization function shall depend on functional assessment, patient preference, safety risk, caregiver capacity, provider availability, and appeal status. Trace: SR-LTC-001/002. Verification: Demonstration.
SR-IF-007: The public manufacturing prioritization function shall depend on critical product list, shortage exposure, demand forecast, supplier redundancy, quality status, and inventory visibility. Trace: SR-DRUG-006/010. Verification: Analysis.
SR-IF-008: The tax stabilizer function shall depend on certified obligations, dedicated revenue receipts, trust-fund balances, reserve ratios, economic conditions, and ordinary-taxpayer burden model. Trace: PR-CST-006/009. Verification: Analysis.
SR-IF-009: The AI clinical decision-support function shall depend on validated model version, permitted use class, patient data quality, clinician review, audit logging, and equity monitoring. Trace: SR-AI-001/003. Verification: Test.
SR-IF-010: The patient appeal function shall depend on decision record, rule used, explanation, patient notice, clinical facts, urgency class, and available remedy interface. Trace: SR-RGT-002/005. Verification: Demonstration.
SR-IF-011: The public dashboard function shall depend on validated performance data, publication schedule, privacy suppression rules, regional attribution, and audit trail. Trace: SR-RGT-011, SR-DATA-012. Verification: Inspection.
SR-IF-012: The phase-gate function shall depend on verified KPP/TPP values, independent scorekeeping, risk status, legal readiness, and corrective-action status. Trace: PR-SCH series, SR-ADP-002. Verification: Analysis.
SR-IF-013: The provider provisional-payment function shall depend on clean-claim status, missed payment deadline, provider identity, fraud-exclusion status, and Treasury interface. Trace: SR-PAY-006. Verification: Test.
SR-IF-014: The transition continuity function shall depend on legacy authorization records, active treatment status, medication history, payer migration status, and patient notification status. Trace: PR-TRN-003/004. Verification: Demonstration.
SR-IF-015: The equity-correction function shall depend on stratified access, coverage, safety, appeal, and outcome data by protected and vulnerable population category. Trace: SR-EQ series. Verification: Analysis.
Verification Requirements
VR-001: Every project and system requirement shall maintain bidirectional traceability to at least one stakeholder need, KPP/TPP, parent requirement, statute, or operational risk.
VR-002: Every KPP and TPP shall have a documented owner, definition, numerator, denominator, data source, update frequency, and maturity target before Phase 2.
VR-003: Every KPP and TPP value used for phase-gate decisions shall be independently verified by NHASB or another designated independent verification body.
VR-004: Every performance requirement with equity relevance shall be verified using stratified analysis by race, ethnicity, language, age, sex, disability, income, rurality, and region where legally and ethically permissible.
VR-005: Every requirement verified by self-reported provider, contractor, payer, or vendor data shall be subject to independent audit sampling.
VR-006: Every AI requirement shall be verified using model-version-specific evidence.
VR-007: Every AI performance requirement shall include protected-group performance comparison before national deployment.
VR-008: Every claims, pharmacy, eligibility, disbursement, and records uptime requirement shall be verified through operational logs rather than survey or manual attestation.
VR-009: Every payment-timeliness requirement shall be verified from timestamped receipt, adjudication, and Treasury disbursement data.
VR-010: Every patient-facing usability requirement shall be verified using representative user testing that includes low-literacy, disabled, rural, non-English-preferred, elderly, and low-digital-access users.
VR-011: Every denial, delay, non-referral, and routing explanation requirement shall be verified by audit of complete decision records.
VR-012: Every clinical safety requirement shall be verified using both administrative data and sampled clinical record review.
VR-013: Every abnormal-result closure requirement shall be verified by result timestamp, patient notification timestamp, care-plan timestamp, and escalation timestamp where applicable.
VR-014: Every specialist-access requirement shall be verified using completed referral packet timestamp, urgency class timestamp, specialist response timestamp, and appointment completion timestamp.
VR-015: Every transition-continuity requirement shall be verified using pre-migration and post-migration patient-level continuity records.
VR-016: Every displaced-worker transition requirement shall be verified using worker eligibility records, offer records, training enrollment, placement status, and retention data.
VR-017: Every hospital global-budget requirement shall be verified using audited hospital financials, public disbursement records, service-line data, staffing data, and regional access metrics.
VR-018: Every drug-shortage and public manufacturing requirement shall be verified using inventory records, production records, supplier qualification data, quality-release data, and shortage status.
VR-019: Every legal-hardening requirement shall be verified using statutory text, appropriations classification, disbursement logs, vacancy records, staffing records, and litigation records.
VR-020: Every public dashboard requirement shall be verified using publication timestamps, completeness checks, privacy review logs, and independent reproducibility tests.
VR-021: Every formula affecting payment, access, benefits, priority, or workforce shall be verified against the Formula Registry before operational use.
VR-022: Every emergency repair action shall be verified against change-control tier, authority, expiration date, public notice, and ratification status.
VR-023: Every regional adaptation waiver shall be verified against its hypothesis, endpoints, patient-protection plan, equity analysis, budget impact, sunset date, and independent evaluation.
VR-024: Every trust-fund and fiscal-sufficiency requirement shall be verified using actuarially certified obligations, receipts, transfers, balances, and reserve calculations.
VR-025: Every requirement used to block or permit phase progression shall require independent verification before the next phase may begin.
VR-026: Every tribal compact requirement shall be verified through tribal-approved documentation and shall not rely solely on state certification.
VR-027: Every employer wage-pass-through requirement shall be verified using employer baseline benefit spending, payroll records, worker compensation records, and contribution filings.
VR-028: Every public-trust parameter shall be verified using statistically representative survey methods and published sampling methodology.
VR-029: Every safety-culture parameter shall be verified using validated workforce safety-culture survey instruments and turnover/workload corroboration data.
VR-030: Every requirement marked for demonstration shall include an operational scenario, entry criteria, exit criteria, observed outputs, and pass/fail criteria before verification event execution.
Requirements-to-Architecture Allocation Summary
Cost, revenue, reserves: Primary owner HFASB, TREAS, IRS, NHETF; support DNHA, NCCA, NHA-TRUST; verifier NHASB, CHAO.
Schedule and phase gates: Primary owner varies by requirement; NHASB controls phase-gate verification; support DNHA offices, NHTCA, NHAC, HFASB; verifier NHASB, CHAO.
Workforce and education: Primary AHWCS, NHWB, NHWECA, NCSWB, NPCB; support RHA, RS-CORPS, HATC; verifier NHASB, NHAC.
Transition protection: Primary NHTCA and suboffices; support NEEA, NCCA, PCU, THDO, RHA, state/tribal bodies; verifier NHASB, NOPRSL, CHAO.
Coverage and eligibility: Primary NEEA; support NHIS, NMPI, NCCA, NHA-TRUST; verifier NHASB, NOPRSL.
Claims and payment: Primary NCCA, THDO; support NEEA, NHA-TRUST, OIG-AF; verifier NHASB, NHAC, A1-HCAC.
Pharmacy/drugs/manufacturing: Primary PCU, NDPA, PMC, NFTSB, MARB; support MDSA, DUSO, pharmacies; verifier NHASB, NHAC.
Hospitals: Primary NHSA, PSHCO, RHA; support HFASB, THDO, hospitals; verifier HAAO, NHASB.
Units and access: Primary OCDTI, NCDTN, RHA; support AICIO, LDA, NEMTA, NSAA; verifier NOPRSL, NHASB.
Specialists: Primary NSAA; support RHA, NCDTN, NHWB, specialists; verifier NHASB, NOPRSL.
LTC/BH/DVH/EMS: Primary NLTCA, NBHA, NDVHO, NEMTA; support RHA, NHWB, providers; verifier NOPRSL, NHASB.
Records/data/cyber: Primary NHRA, NHIS, NMPI, NAIG, HCCA, PACP; support providers, labs, payers, vendors; verifier NHASB, NHAC.
AI accountability: Primary AICIO, NOPRSL; support NHRA, HCCA, operating offices; verifier NHASB, NHAC.
Rights/appeals/safety: Primary NOPRSL, PROO, NAT/A1-HCAC, NPSMIB; support operating agencies; verifier NHASB, CHAO.
Equity and tribal protections: Primary NOPRSL, TRTO, SRCO, RHA; support tribal authorities, states, NHRA; verifier NHASB, CHAO.
Legal hardening: Primary CONG, THDO, CHAO, A1-HCAC; support DNHA, NHASB, Treasury; verifier CHAO, A1-HCAC.
Adaptation and repair: Primary NHASB; support DNHA, NHAC, NBIA, HFASB; verifier CHAO.
Innovation: Primary NBIA, NDIF, TMTFO, PILO, CEVI; support SRAE, NDPA, NCCA; verifier NHASB, CHAO.
KPP Dictionary
KPP-A1: National continuous coverage rate. Target >=99.5%. Domain: coverage/affordability. Trace: SN-02.
KPP-A2: Residual uninsured rate. Target <=0.2%. Domain: coverage/affordability. Trace: SN-02.
KPP-A3: Covered-care patient-billing rate. Target <=0.5%. Domain: coverage/affordability. Trace: SN-01.
KPP-A4: New covered-care medical debt incidence. Target <=1% baseline. Domain: coverage/affordability. Trace: SN-01.
KPP-A5: Household direct health burden. Target >=90% reduction from baseline. Domain: coverage/affordability. Trace: SN-01.
KPP-A6: Worker premium elimination rate. Target >=98%. Domain: coverage/affordability. Trace: SN-25.
KPP-A7: Medical bankruptcy reduction. Target >=90% reduction. Domain: coverage/affordability. Trace: SN-01.
KPP-B1: Primary front-door access time. Target median <=24 hours. Domain: access/capacity. Trace: SN-03.
KPP-B2: Same-day low-acuity access rate. Target >=85%. Domain: access/capacity. Trace: SN-03.
KPP-B3: Avoidable ED diversion rate. Target >=30% low-acuity ED reduction. Domain: access/capacity. Trace: SN-03.
KPP-B4: Specialist e-consult resolution rate. Target >=40%. Domain: access/capacity. Trace: SN-04.
KPP-B5: Routine specialist wait time. Target median <=30 days. Domain: access/capacity. Trace: SN-04.
KPP-B6: Urgent specialist timeliness. Target >=95% within urgency-class target. Domain: access/capacity. Trace: SN-04.
KPP-B7: Diagnostic-treatment unit coverage. Target >=95% population within access standard by P8. Domain: access/capacity. Trace: SN-03.
KPP-B8: Unit-resolved encounter rate. Target >=70% without escalation within 7 days. Domain: access/capacity. Trace: SN-03.
KPP-B9: Unsafe under-referral rate. Target <=3 per 10,000 non-escalated encounters. Domain: access/safety. Trace: SN-16.
KPP-C1: Total national health expenditure ratio. Target <=15.2% GDP by P8. Domain: cost/fiscal. Trace: SN-11.
KPP-C2: Per-capita system cost. Target to be reconciled with $4.75T total system cost and current population denominator. Domain: cost/fiscal. Trace: SN-11.
KPP-C3: Administrative cost ratio. Target >=50% reduction vs baseline. Domain: cost/fiscal. Trace: SN-11.
KPP-C4: Claims clean-processing cost. Target <=$3 per clean paid claim. Domain: cost/fiscal. Trace: SN-11.
KPP-C5: Dedicated revenue sufficiency. Target >=100% obligations by maturity. Domain: cost/fiscal. Trace: SN-11.
KPP-C6: Stabilization reserve adequacy. Target >=12 months volatile revenue exposure by P8. Domain: cost/fiscal. Trace: SN-11.
KPP-C7: Wealth-financing collection efficiency. Target >=92%. Domain: cost/fiscal. Trace: SN-11.
KPP-C8: Ordinary taxpayer protection ratio. Target <=5% incremental burden share. Domain: cost/fiscal. Trace: SN-12.
KPP-D1: Avoidable hospitalization rate. Target reduction to be calibrated. Domain: quality/safety. Trace: SN-16.
KPP-D2: 30-day readmission rate. Target reduction to be calibrated. Domain: quality/safety. Trace: SN-16.
KPP-D3: Preventive service completion. Target increase to be calibrated. Domain: quality/safety. Trace: SN-16.
KPP-D4: Chronic disease control composite. Target increase to be calibrated. Domain: quality/safety. Trace: SN-16.
KPP-D5: Medication adherence for priority chronic drugs. Target increase to be calibrated. Domain: quality/safety. Trace: SN-08.
KPP-D6: Serious safety event reporting completeness. Target to be calibrated. Domain: quality/safety. Trace: SN-16.
KPP-D7: Patient-reported care experience. Target to be calibrated. Domain: quality/safety. Trace: SN-19.
KPP-E1: Coverage equity gap. Target <=0.5 percentage points. Domain: equity. Trace: SN-18.
KPP-E2: Access equity gap. Target <=5%. Domain: equity. Trace: SN-18.
KPP-E3: Specialist wait equity ratio. Target <=1.10. Domain: equity. Trace: SN-18.
KPP-E4: Rural essential access index. Target >=60 percentage point improvement. Domain: equity/rural. Trace: SN-18/SN-23.
KPP-E5: Language-access compliance. Target >=98%. Domain: equity/usability. Trace: SN-18/SN-19.
KPP-T1: Active treatment transfer success. Target >=99%. Domain: transition. Trace: SN-05.
KPP-T2: Critical medication interruption rate. Target <=0.2%. Domain: transition/drugs. Trace: SN-05/SN-08.
KPP-W1: Displaced worker placement/training rate. Target >=75%. Domain: workforce transition. Trace: SN-10.
KPP-TRUST1: Public trust in fairness. Target baseline +25 percentage points. Domain: legitimacy. Trace: SN-20.
KPP-CULT1: Clinician safety-culture score. Target baseline +25 percentage points. Domain: safety/workforce. Trace: SN-09/SN-16.
TPP Dictionary
TPP-1.1: Master person index match accuracy. Target >=99.8%.
TPP-1.2: Eligibility determination latency. Target >=99% real-time confirmation.
TPP-1.3: Erroneous coverage termination rate. Target <=2 per 100,000/year.
TPP-1.4: Provisional coverage activation rate. Target >=99.5% within 24 hours.
TPP-2.1: Clean claim auto-adjudication rate. Target >=95% by P8.
TPP-2.2: Clean claim payment timeliness. Target >=99%.
TPP-2.3: Improper payment rate. Target <=1%.
TPP-2.4: Provider cash-flow disruption rate. Target <=0.5% delayed >30 days.
TPP-2.5: OMB/apportionment bypass success. Target >=99.8% mandatory disbursements.
TPP-3.1: Pharmacy claims real-time adjudication. Target >=99.5%.
TPP-3.2: Essential drug $0-access rate. Target >=98% essential fills.
TPP-3.3: Net unit drug price reduction. Target >=55% target-drug reduction.
TPP-3.4: PBM displacement rate. Target >=98% core benefit dollars outside PBM model.
TPP-3.5: Critical drug shortage exposure. Target <=3% critical list.
TPP-3.6: Therapeutic substitution success. Target >=75% eligible nonpreferred prescriptions.
TPP-4.1: PMC product coverage. Target >=200 essential product families.
TPP-4.2: Critical product dual-source rate. Target >=90%.
TPP-4.3: Batch quality release success. Target >=99.2%.
TPP-4.4: API domestic/friendly-source coverage. Target >=80% critical products.
TPP-4.5: Inventory visibility rate. Target >=98% critical SKUs.
TPP-5.1: Hospital budget migration. Target >=95% hospital facility spending.
TPP-5.2: Global budget variance. Target <=2% absolute variance.
TPP-5.3: Facility-fee elimination rate. Target >=99% applicable encounters.
TPP-5.4: Essential service continuity. Target >=95% regions.
TPP-5.5: Hospital staffing safety compliance. Target >=97%.
TPP-5.6: Related-party extraction ratio. Target <=0.5% hospital budget.
TPP-6.1: Certified unit count. Target >=15,000 Type A/B/C/D units.
TPP-6.2: Unit diagnostic completeness. Target >=98% applicable encounters.
TPP-6.3: Unit follow-up closure. Target >=99% abnormal results.
TPP-6.4: Antibiotic stewardship compliance. Target >=95%.
TPP-6.5: Unit bounce-back rate. Target <=3.5%.
TPP-6.6: AI-assisted clinician productivity. Target >=125% improvement in safely closed encounters per clinician-hour.
TPP-7.1: Referral packet completeness. Target >=98%.
TPP-7.2: E-consult response time. Target median <=24 hours.
TPP-7.3: Inappropriate specialist referral rate. Target <=5%.
TPP-7.4: Specialist urgent/e-consult capacity reservation. Target >=30% public specialist capacity.
TPP-7.5: Regional queue participation. Target >=95% publicly paid specialists.
TPP-8.1: Critical workforce vacancy rate. Target <=5%.
TPP-8.2: Specialist Bottleneck Index reduction. Target >=50%.
TPP-8.3: Publicly funded training slots. Target >=55,000 annual slots.
TPP-8.4: Service obligation fulfillment. Target >=96%.
TPP-8.5: Scope-rule implementation. Target >=98% regions.
TPP-8.6: Clinician burnout risk index. Target >=30% reduction.
TPP-9.1: LTC functional assessment timeliness. Target >=95%.
TPP-9.2: Home-first LTC placement rate. Target >=70%.
TPP-9.3: Behavioral health first-contact access. Target median <=48 hours.
TPP-9.4: Behavioral health crisis response time. Target >=95% within target.
TPP-9.5: Dental basic access time. Target median <=21 days.
TPP-9.6: Hearing/vision standard device fulfillment. Target >=95% within target.
TPP-9.7: EMS readiness compliance. Target >=95% regions.
TPP-10.1: Provider/facility registry completeness. Target >=99.5% active records verified.
TPP-10.2: Medication record completeness. Target >=95% covered persons.
TPP-10.3: Lab result interoperability. Target >=98% within target.
TPP-10.4: Discharge summary availability. Target >=98% structured within 24 hours.
TPP-10.5: Record correction closure. Target >=97% within statutory timeframe.
TPP-10.6: API conformance rate. Target >=98%.
TPP-11.1: Critical system uptime. Target >=99.97%.
TPP-11.2: Downtime continuity success. Target >=98% drills passed.
TPP-11.3: Critical vulnerability remediation. Target >=99% within 15 days.
TPP-11.4: AI clinical safety validation. Target >=98% protocols validated/monitored.
TPP-11.5: AI override/audit capture. Target >=99% high-stakes decisions.
TPP-11.6: AI equity drift. Target <=3% maximum protected-group deviation.
TPP-12.1: Mandatory payment protection coverage. Target >=99.5% core spending.
TPP-12.2: Statutory staffing floor compliance. Target >=98%.
TPP-12.3: Vacancy-proof operating continuity. Target >=99% critical functions.
TPP-12.4: Required public data publication timeliness. Target >=99%.
TPP-12.5: Anti-impoundment response time. Target <=24 hours.
TPP-12.6: Appeals resolution timeliness. Target >=97% by urgency class.
TPP-13.1: Public R&D portfolio coverage. Target >=95% priority unmet-need areas.
TPP-13.2: Public-interest licensing attachment. Target >=98% materially funded technologies.
TPP-13.3: Comparative effectiveness cycle time. Target median <=6 months.
TPP-13.4: Innovation reward value alignment. Target >=90% post-market reconciliation.
TPP-EMP1: Employer wage-pass-through compliance. Target >=95%.
TPP-LEG1: Denial/routing explanation completeness. Target >=98%.
TPP-USE1: Patient rights notice comprehension. Target >=90%.
TPP-USE2: Appeal filing completion without assistance. Target >=85%.
TPP-TRIB1: Tribal compact compliance. Target >=98%.
TPP-REG1: Regional adaptation waiver evaluation completion. Target >=95%.
TPP-FORM1: Formula registry completeness. Target >=99%.
Cost Parameter Dictionary
The following parameters are simulation-ready. They are not merely accounting labels; each is intended to act as a model input, state variable, derived parameter, or output. Parameters should be indexed as needed by time t, region r, population group p, agency g, hospital h, unit type u, specialty k, and product d.
Master cost equation:
C_total(t) = C_hospital(t) + C_clinical(t) + C_units(t) + C_LTC(t) + C_drugs(t) + C_devices_labs_diagnostics(t) + C_behavioral(t) + C_DVH(t) + C_EMS(t) + C_public_health(t) + C_info_cyber_AI(t) + C_governance_oversight(t) + C_R&D(t) + C_education_workforce(t) + C_transition_net(t) - C_offsets(t)
Offset equation:
C_offsets(t) = ED_diversion_savings + avoidable_admission_savings + private_admin_savings + PBM_savings + drug_price_savings + duplicate_testing_savings + hospital_extraction_savings + revenue_cycle_savings + medical_debt_collection_savings
Additional cost views:
C_operating(t): recurring annual operating cost.
C_capital(t): one-time or amortized buildout cost.
C_transition(t): time-limited migration and stabilization cost.
C_reserve(t): required reserve authority or fund balance.
C_net_public(t): public outlay after recoveries and reconciliation.
C_total_system(t): public plus residual private plus patient out-of-pocket spending.
CP-TOT: Total System Cost Parameters
CP-TOT-001: Total annual system cost. Total public, residual private, and patient-paid health-system cost in year t. Unit: dollars/year.
CP-TOT-002: Per-capita system cost. C_total(t) divided by covered population. Unit: dollars/person/year.
CP-TOT-003: System cost as GDP share. C_total(t) divided by GDP(t). Unit: percent GDP.
CP-TOT-004: Public share of system cost. Publicly financed health spending divided by total system cost. Unit: percent.
CP-TOT-005: Residual private spending. Spending through certified supplemental/substitute coverage and noncovered services. Unit: dollars/year.
CP-TOT-006: Patient point-of-care spending. Direct patient payments for covered and noncovered care. Unit: dollars/year.
CP-TOT-007: Transition-adjusted annual cost. Operating cost plus annualized transition cost. Unit: dollars/year.
CP-TOT-008: Net savings versus baseline. Baseline national health spending minus framework total cost. Unit: dollars/year.
CP-TOT-009: Gross added framework spending. New spending added by expanded benefits, units, workforce, safety, transition, and governance. Unit: dollars/year.
CP-TOT-010: Gross framework savings. Savings from administrative simplification, purchasing, hospital reform, ED diversion, and other offsets. Unit: dollars/year.
CP-POP: Population, Enrollment, and Demand Parameters
CP-POP-001: Covered population. Number of persons covered by National Health Assurance.
CP-POP-002: Eligibility churn rate. Share of population with eligibility status change in year t. Unit: percent/year.
CP-POP-003: Age-risk distribution. Covered population by age and risk band.
CP-POP-004: Chronic disease prevalence vector. Prevalence of priority chronic diseases by region and population group.
CP-POP-005: Unmet demand release factor. Increase in utilization caused by newly affordable access. Unit: multiplier.
CP-POP-006: Zero-cost utilization elasticity. Change in service utilization caused by reduced point-of-care price. Unit: elasticity.
CP-POP-007: Regional morbidity adjustment. Relative cost adjustment by regional disease burden. Unit: index.
CP-POP-008: Rural access cost multiplier. Incremental cost factor for rural and frontier delivery. Unit: multiplier.
CP-POP-009: Disability support intensity index. Relative service intensity for disabled beneficiaries. Unit: index.
CP-POP-010: Aging pressure factor. Annual utilization or cost increase due to population aging. Unit: percent/year.
CP-CLM: Coverage, Claims, and Payment Parameters
CP-CLM-001: Enrollment operating cost per covered person. Unit: dollars/person/year.
CP-CLM-002: Eligibility transaction cost. Unit: dollars/transaction.
CP-CLM-003: Medical claim volume. Unit: claims/year.
CP-CLM-004: Pharmacy claim volume. Unit: claims/year.
CP-CLM-005: Clean claim processing cost. Unit: dollars/claim.
CP-CLM-006: Manual claim intervention cost. Unit: dollars/manual claim.
CP-CLM-007: Clean claim auto-adjudication rate. Unit: percent.
CP-CLM-008: Improper payment loss rate. Unit: percent of payment dollars.
CP-CLM-009: Improper payment recovery rate. Unit: percent of identified improper dollars.
CP-CLM-010: Provisional payment volume. Unit: dollars/year.
CP-CLM-011: Provisional payment recovery rate. Unit: percent.
CP-CLM-012: Provider delay penalty cost. Unit: dollars/year.
CP-CLM-013: Appeals-driven payment adjustment cost. Unit: dollars/year.
CP-CLM-014: Claims platform fixed operating cost. Unit: dollars/year.
CP-CLM-015: Treasury disbursement transaction cost. Unit: dollars/payment.
CP-HOSP: Hospital and Facility Parameters
CP-HOSP-001: Hospital global budget base. Certified annual operating budget per hospital.
CP-HOSP-002: Hospital global budget total. Sum of certified hospital budgets.
CP-HOSP-003: Emergency readiness cost. Annual cost to maintain emergency capacity.
CP-HOSP-004: Essential service-line cost. Annual cost by protected service line.
CP-HOSP-005: Rural hospital readiness premium. Incremental payment for rural essential capacity.
CP-HOSP-006: Hospital staffing compliance cost. Incremental labor cost to meet staffing safety floors.
CP-HOSP-007: Hospital capital replacement allowance. Annual capital budget required to maintain infrastructure.
CP-HOSP-008: Hospital conversion stabilization payment. Temporary payment to keep hospital inside stabilization corridor.
CP-HOSP-009: Global budget variance. Actual spending minus certified budget.
CP-HOSP-010: Facility-fee elimination savings. Spending reduction from eliminating routine outpatient facility fees.
CP-HOSP-011: Related-party extraction savings. Spending reduction from limiting related-party payments and extraction.
CP-HOSP-012: Avoidable admission volume. Number of admissions avoided through improved care.
CP-HOSP-013: Avoided admission unit savings. Average cost avoided per preventable admission.
CP-HOSP-014: Readmission reduction savings. Savings from reduced unplanned 30-day readmissions.
CP-HOSP-015: Hospital service-line closure replacement cost. Cost to replace an essential service line.
CP-CLIN: Physician, Specialist, and Clinical Service Parameters
CP-CLIN-001: Primary care panel cost. Annual cost per attributed patient.
CP-CLIN-002: Primary care complex-care premium. Incremental cost for complex longitudinal care.
CP-CLIN-003: Physician compensation cost. Total salary/payment cost for physicians by specialty.
CP-CLIN-004: Nonphysician clinician compensation cost. Total compensation for nurses, NPs, PAs, pharmacists, paramedics, therapists, and technicians.
CP-CLIN-005: Specialist in-person consult cost. Cost per completed in-person specialist visit.
CP-CLIN-006: Specialist e-consult cost. Cost per specialist e-consult.
CP-CLIN-007: Tele-specialist visit cost. Cost per tele-specialist visit.
CP-CLIN-008: Specialist protected-slot cost. Annual cost of urgent/e-consult reserved capacity.
CP-CLIN-009: Specialist-routing infrastructure cost. Cost of referral platform, triage staff, and capacity ledger.
CP-CLIN-010: Specialist avoidable-visit savings. Savings from e-consult and first-line workups replacing in-person visits.
CP-CLIN-011: Clinical productivity factor. Encounters safely closed per clinician-hour relative to baseline.
CP-CLIN-012: Specialty bottleneck cost premium. Incremental cost caused by specialty shortages.
CP-CLIN-013: Rural clinician premium. Incremental compensation required to staff rural areas.
CP-CLIN-014: Clinician burnout turnover cost. Replacement, vacancy, productivity, and training cost from burnout.
CP-CLIN-015: Malpractice/injury compensation cost. Cost of patient injury compensation or system liability program.
CP-UNIT: Four-Unit Diagnostic-Treatment Network Parameters
CP-UNIT-001: Type A unit count.
CP-UNIT-002: Type B unit count.
CP-UNIT-003: Type C unit count.
CP-UNIT-004: Type D unit count.
CP-UNIT-005: Type A fixed annual cost.
CP-UNIT-006: Type B fixed annual cost.
CP-UNIT-007: Type C fixed annual cost.
CP-UNIT-008: Type D fixed annual cost.
CP-UNIT-009: Type A capital cost.
CP-UNIT-010: Type B capital cost.
CP-UNIT-011: Type C capital cost.
CP-UNIT-012: Type D capital cost.
CP-UNIT-013: Unit visit volume by type.
CP-UNIT-014: Unit variable cost per visit.
CP-UNIT-015: Unit diagnostic cost per encounter.
CP-UNIT-016: Unit follow-up cost per abnormal result.
CP-UNIT-017: Unit AI operating cost.
CP-UNIT-018: Unit staffing cost.
CP-UNIT-019: Unit avoided ED savings.
CP-UNIT-020: Unit avoided specialist savings.
CP-UNIT-021: Unit-induced demand cost.
CP-UNIT-022: Unit unsafe under-referral harm cost.
CP-UNIT-023: Unit bounce-back cost.
CP-UNIT-024: Unit public-health surge cost.
CP-LTC: Long-Term Care, Home Care, Disability, and Caregiver Parameters
CP-LTC-001: LTC eligible population.
CP-LTC-002: LTC assessment cost.
CP-LTC-003: Home-care hours authorized.
CP-LTC-004: Home-care cost per hour.
CP-LTC-005: Institutional LTC cost per resident-day.
CP-LTC-006: Home-first substitution rate.
CP-LTC-007: Caregiver support cost.
CP-LTC-008: DME and home modification cost.
CP-LTC-009: LTC workforce premium.
CP-LTC-010: LTC appeal adjustment cost.
CP-LTC-011: Avoided institutionalization savings.
CP-LTC-012: LTC safety failure cost.
CP-RX: Drugs, Pharmacy, Public Manufacturing, and Supply Chain Parameters
CP-RX-001: Prescription fill volume.
CP-RX-002: Weighted average net drug unit cost.
CP-RX-003: Essential formulary fill share.
CP-RX-004: Specialty drug cost.
CP-RX-005: Public manufacturing fixed cost.
CP-RX-006: Public manufacturing variable cost.
CP-RX-007: Public manufacturing capital amortization.
CP-RX-008: Strategic stockpile carrying cost.
CP-RX-009: Drug shortage emergency procurement cost.
CP-RX-010: PBM displacement savings.
CP-RX-011: Therapeutic substitution savings.
CP-RX-012: Adherence-induced drug cost.
CP-RX-013: Adherence avoided-complication savings.
CP-RX-014: Formulary exception cost.
CP-RX-015: Drug quality failure cost.
CP-DX: Devices, Labs, Diagnostics, Imaging, and Supplies Parameters
CP-DX-001: Lab test volume.
CP-DX-002: Average lab test cost.
CP-DX-003: Point-of-care test volume.
CP-DX-004: Point-of-care test cost.
CP-DX-005: Imaging volume by modality.
CP-DX-006: Imaging cost by modality.
CP-DX-007: Diagnostic-first pathway cost.
CP-DX-008: Duplicate testing rate.
CP-DX-009: Duplicate testing savings.
CP-DX-010: Medical device purchase cost.
CP-DX-011: DME/supply cost.
CP-DX-012: Device price reduction savings.
CP-DX-013: Diagnostic overuse cost.
CP-DX-014: Missed-diagnosis cost.
CP-DX-015: Diagnostic workforce cost.
CP-BH: Behavioral Health and Substance-Use Disorder Parameters
CP-BH-001: Behavioral health eligible demand.
CP-BH-002: First-contact cost.
CP-BH-003: Therapy session volume.
CP-BH-004: Therapy session cost.
CP-BH-005: Psychiatry e-consult cost.
CP-BH-006: Psychiatry visit cost.
CP-BH-007: Crisis response event volume.
CP-BH-008: Crisis response cost.
CP-BH-009: SUD treatment episode cost.
CP-BH-010: Medication-assisted treatment cost.
CP-BH-011: Behavioral health unmet-demand release factor.
CP-BH-012: Behavioral health avoided ED/hospital savings.
CP-BH-013: Behavioral health workforce premium.
CP-BH-014: Privacy segmentation operating cost.
CP-BH-015: Behavioral health safety failure cost.
CP-DVH: Dental, Vision, and Hearing Parameters
CP-DVH-001: Basic dental visit volume.
CP-DVH-002: Basic dental visit cost.
CP-DVH-003: Advanced dental procedure volume.
CP-DVH-004: Advanced dental procedure cost.
CP-DVH-005: Vision exam volume.
CP-DVH-006: Vision exam cost.
CP-DVH-007: Standard eyewear/device cost.
CP-DVH-008: Hearing exam volume.
CP-DVH-009: Hearing exam cost.
CP-DVH-010: Hearing device cost.
CP-DVH-011: DVH workforce cost.
CP-DVH-012: DVH unmet-demand release factor.
CP-DVH-013: Preventable medical savings from DVH care.
CP-DVH-014: DVH device procurement savings.
CP-DVH-015: DVH access expansion capital cost.
CP-EMS: EMS, Ambulance, Medical Transport, and Rural Escalation Parameters
CP-EMS-001: EMS readiness cost.
CP-EMS-002: EMS response volume.
CP-EMS-003: EMS response cost.
CP-EMS-004: Medical transport trip volume.
CP-EMS-005: Medical transport trip cost.
CP-EMS-006: Air ambulance event volume.
CP-EMS-007: Air ambulance event cost.
CP-EMS-008: Treat-and-release cost.
CP-EMS-009: Avoided transport savings.
CP-EMS-010: Rural escalation premium.
CP-EMS-011: Disaster/surge EMS cost.
CP-EMS-012: EMS-unit interface cost.
CP-PH: Public Health, Prevention, and Clinically Linked Social Support Parameters
CP-PH-001: Public health base operating cost.
CP-PH-002: Vaccination campaign cost.
CP-PH-003: Screening program cost.
CP-PH-004: Prevention outreach cost.
CP-PH-005: Public-health unit surge cost.
CP-PH-006: Surveillance infrastructure cost.
CP-PH-007: Clinically linked nutrition support cost.
CP-PH-008: Clinically linked housing modification/support cost.
CP-PH-009: Heat/cooling medical support cost.
CP-PH-010: Prevention avoided-cost savings.
CP-PH-011: Public health emergency response cost.
CP-PH-012: Public health data integration cost.
CP-IT: Records, Information Mesh, Cybersecurity, AI Infrastructure, and Digital Operations Parameters
CP-IT-001: National identity infrastructure cost.
CP-IT-002: Longitudinal record operating cost.
CP-IT-003: API gateway operating cost.
CP-IT-004: Data storage cost.
CP-IT-005: Data exchange transaction cost.
CP-IT-006: Cybersecurity fixed cost.
CP-IT-007: Cybersecurity variable cost.
CP-IT-008: Downtime continuity cost.
CP-IT-009: Breach response cost.
CP-IT-010: AI validation cost.
CP-IT-011: AI monitoring cost.
CP-IT-012: AI compute and licensing cost.
CP-IT-013: Patient portal operating cost.
CP-IT-014: Record correction cost.
CP-IT-015: Sensitive-data segmentation cost.
CP-IT-016: Vendor exit/escrow cost.
CP-IT-017: Technical debt remediation cost.
CP-IT-018: Public dashboard operating cost.
CP-GOV: Governance, Oversight, Appeals, Legitimacy, Safety, and Adaptation Parameters
CP-GOV-001: DNHA central administration cost.
CP-GOV-002: NHAC operating cost.
CP-GOV-003: NHASB operating cost.
CP-GOV-004: CHAO operating cost.
CP-GOV-005: Ombudsman case volume.
CP-GOV-006: Ombudsman cost per case.
CP-GOV-007: Appeal volume.
CP-GOV-008: Appeal cost per case.
CP-GOV-009: Appeal overturn payment cost.
CP-GOV-010: Diagnostic safety review cost.
CP-GOV-011: Patient injury compensation cost.
CP-GOV-012: Public reporting cost.
CP-GOV-013: AI audit cost.
CP-GOV-014: Equity audit cost.
CP-GOV-015: Fraud investigation cost.
CP-GOV-016: Fraud recovery amount.
CP-GOV-017: Rule review cost.
CP-GOV-018: Red-team exercise cost.
CP-GOV-019: Public trust survey cost.
CP-GOV-020: Legal defense and contingency cost.
CP-RD: Biomedical Innovation, R&D, Public-Interest Licensing, and Technology Adoption Parameters
CP-RD-001: Public R&D program cost.
CP-RD-002: Trial funding cost.
CP-RD-003: Prize/reward payment cost.
CP-RD-004: Public-interest licensing administration cost.
CP-RD-005: Comparative effectiveness assessment cost.
CP-RD-006: Secure research enclave cost.
CP-RD-007: Coverage-with-evidence cost.
CP-RD-008: Public R&D avoided monopoly cost.
CP-RD-009: Failed R&D portfolio cost.
CP-RD-010: High-value innovation adoption cost.
CP-RD-011: Innovation avoided-care savings.
CP-RD-012: Licensing noncompliance recovery.
CP-EDU: Professional Education and Workforce Pipeline Parameters
CP-EDU-001: Medical school scholarship cost.
CP-EDU-002: Residency slot cost.
CP-EDU-003: Fellowship slot cost.
CP-EDU-004: Specialist backplane training cost.
CP-EDU-005: Advanced clinical workforce training cost.
CP-EDU-006: Training hub fixed cost.
CP-EDU-007: Faculty support cost.
CP-EDU-008: Rural Service Corps cost.
CP-EDU-009: Service obligation default cost.
CP-EDU-010: Workforce vacancy cost.
CP-EDU-011: Scope expansion training cost.
CP-EDU-012: Continuing education cost.
CP-EDU-013: Workforce retention incentive cost.
CP-EDU-014: Specialist bottleneck premium cost.
CP-EDU-015: Displaced worker retraining cost.
CP-TRN: Transition-Protection Parameters
CP-TRN-001: Transition authority operating cost.
CP-TRN-002: Patient continuity case volume.
CP-TRN-003: Patient continuity cost per case.
CP-TRN-004: Critical medication continuity cost.
CP-TRN-005: Provider liquidity reserve authority.
CP-TRN-006: Net provider liquidity outlay.
CP-TRN-007: Hospital stabilization corridor cost.
CP-TRN-008: Pharmacy continuity bridge cost.
CP-TRN-009: Legacy payer wind-down cost.
CP-TRN-010: Legacy payer data migration cost.
CP-TRN-011: State compact grant cost.
CP-TRN-012: Tribal compact transition cost.
CP-TRN-013: Rural transition protection cost.
CP-TRN-014: Employer transition administration cost.
CP-TRN-015: Wage-pass-through enforcement cost.
CP-TRN-016: Worker income bridge cost.
CP-TRN-017: Worker placement cost.
CP-TRN-018: Transition ombudsman cost.
CP-TRN-019: Transition legal safe-harbor administration cost.
CP-TRN-020: Transition complaint remediation cost.
CP-FIN: Financing, Reserves, Trust Fund, and Sponsor Burden Parameters
CP-FIN-001: Dedicated revenue receipts.
CP-FIN-002: Existing federal spending redirect.
CP-FIN-003: State/local maintenance contribution.
CP-FIN-004: Employer contribution receipts.
CP-FIN-005: Extreme-wealth tax receipts.
CP-FIN-006: High-income/capital-income tax receipts.
CP-FIN-007: Health-sector rent tax receipts.
CP-FIN-008: Broad backstop contribution receipts.
CP-FIN-009: Wealth collection efficiency.
CP-FIN-010: Wealth tax avoidance leakage.
CP-FIN-011: Trust fund operating reserve balance.
CP-FIN-012: Shock reserve balance.
CP-FIN-013: Permanent endowment balance.
CP-FIN-014: Trust fund transfer.
CP-FIN-015: Reserve drawdown.
CP-FIN-016: Reserve contribution.
CP-FIN-017: Ordinary taxpayer burden share.
CP-FIN-018: Employer net savings.
CP-FIN-019: Worker wage pass-through amount.
CP-FIN-020: Tax stabilizer activation cost.
CP-OFF: Cost Offset and Savings Parameters
CP-OFF-001: Private insurance administrative savings.
CP-OFF-002: PBM savings.
CP-OFF-003: Provider revenue-cycle savings.
CP-OFF-004: Medical debt collection savings.
CP-OFF-005: Low-acuity ED diversion savings.
CP-OFF-006: Avoidable hospitalization savings.
CP-OFF-007: Readmission reduction savings.
CP-OFF-008: Drug price negotiation savings.
CP-OFF-009: Public manufacturing savings.
CP-OFF-010: Device/supply purchasing savings.
CP-OFF-011: Duplicate testing savings.
CP-OFF-012: Specialist avoidable-visit savings.
CP-OFF-013: Early detection savings.
CP-OFF-014: Prevention savings.
CP-OFF-015: Fraud/extraction recovery.
CP-OFF-016: AI productivity savings.
CP-OFF-017: Interoperability administrative savings.
CP-OFF-018: Home-first LTC savings.
CP-OFF-019: Behavioral crisis diversion savings.
CP-OFF-020: Employer administrative savings.
Operational Concepts
National Health Assurance Concept
National Health Assurance is the core public coverage system. It provides automatic public default coverage, eliminates or nearly eliminates point-of-care charges for covered medically necessary care, and replaces fragmented private financial exposure with public payment, public claims rules, and enforceable patient/provider rights.
Core principles:
covered medically necessary care should usually cost the patient zero dollars at the point of care;
total economic cost is not zero and is financed publicly;
medical debt for covered care is prohibited;
enrollment is automatic or defaulted;
employment is no longer the primary gateway to core coverage;
residual private insurance may exist only as certified supplemental, substitute, or administrative coverage under strict rules;
prior authorization is abolished for most routine covered care and restricted to high-risk, high-cost, or nonstandard cases;
denials, delays, routing decisions, and exceptions are explainable, appealable, and auditable.
Four-Unit Diagnostic-Treatment Network Concept
The four-unit network is the framework's front-door capacity architecture.
Type A Micro-Units operate in pharmacies, grocery stores, schools, campuses, workplaces, public housing, rural satellites, transit hubs, and mobile settings. They handle very low-complexity access, vitals, basic point-of-care tests, vaccinations, refills, screening, and teleclinician support.
Type B Standard Neighborhood Diagnostic and Treatment Units are the default urgent-care replacement. They provide ECGs, basic labs, X-ray, common procedures, splinting, nebulizers, limited ultrasound where staffed, uncomplicated respiratory/ENT/UTI/STI/skin/MSK care, chronic measurement, and follow-up.
Type C Rural Enhanced Units add tele-specialty, longer observation, EMS coordination, point-of-care ultrasound, limited IV capability, rural pharmacy links, maternal/pediatric triage, mobile care, and weather-resilience functions.
Type D Urban/Public Health Units add high-volume respiratory surge, vaccines, STI/reproductive services, behavioral health touchpoints, addiction care linkage, wound care, heat/smoke/climate response, and public-health outreach.
The unit network does not replace primary care. It absorbs routine measurable care and low-acuity demand while preserving relationship-based primary care for complexity, continuity, frailty, disability, multimorbidity, family context, and goals of care.
Expected mature demand absorption ranges:
routine primary follow-up: 50%-70%;
chronic measurement and medication titration: 60%-80%;
vaccines and preventive services: 70%-90%;
uncomplicated respiratory/ENT: 60%-80%;
uncomplicated UTI/STI/reproductive care: 50%-75%;
medication/refill support: 70%-90%;
simple skin care: 40%-70%;
simple musculoskeletal care: 40%-60%;
low-acuity ED treat-and-release: 20%-35%;
all ED visits: 10%-20%;
all encounters: 25%-40% initially and 40%-55% mature.
Safety controls:
AI cannot be the final clinician;
accountable human review is required for high-stakes decisions;
red flags force escalation;
abnormal results require closed-loop follow-up;
peds, pregnancy, older adult, immunocompromised, and complex patients have lower escalation thresholds;
antibiotic and diagnostic stewardship are monitored;
unit bounce-backs are reviewed;
all unit encounters write to the national longitudinal health record.
Specialist Backplane Concept
The specialist backplane prevents the unit network from merely shifting bottlenecks downstream.
Core rule:
No routine specialist visit should occur until the diagnostic-treatment unit or primary care team has completed the appropriate first-line workup, attempted protocol-level management where safe, and submitted a structured referral packet.
Safety counter-rule:
No unit or primary care team may hold a patient with red flags, diagnostic instability, or time-sensitive disease merely to protect specialist capacity.
Routing ladder:
Level 0: resolved in unit or primary care.
Level 1: protocol management with automated follow-up.
Level 2: specialist e-consult.
Level 3: tele-specialist visit.
Level 4: diagnostic-first specialist pathway.
Level 5: in-person specialist visit.
Level 6: urgent specialist or hospital pathway.
Level 7: emergency transfer.
Urgency classes:
E: emergency immediate EMS/ED.
U1: urgent same-day specialist/hospital.
U2: urgent stable 24-72 hours.
E1: expedited 1-2 weeks.
R1: routine high-value 30 days.
R2: routine lower-complexity 45-60 days.
EC: e-consult only, target 24-72 hours.
D: diagnostic-first pathway.
Referral packet required fields:
problem representation;
clinical question;
red-flag screen;
completed tests;
treatments tried;
medication list;
relevant images/labs;
patient constraints;
urgency class;
follow-up owner.
Protected slot allocation should include urgent protected slots, e-consult blocks, tele-specialty, in-person new patients, follow-up/complex capacity, and procedure-planning blocks.
Hospital Public-Service Model
Hospitals become public-service chartered institutions funded primarily through global budgets, readiness payments, and capital allowances rather than fragmented per-claim facility billing.
Core components:
public-service hospital charter;
global operating budget;
emergency readiness payment;
essential service-line protection;
staffing safety floors;
capital replacement allowance;
anti-extraction controls;
related-party transaction limits;
facility-fee elimination;
regional approval for service-line closure;
stabilization corridors during conversion.
Stabilization corridor principle:
Hospital budgets should not fall suddenly below the level required to preserve access, staffing, emergency readiness, and essential service lines. The floor prevents collapse. The ceiling prevents hospitals from using transition fear to lock in excessive revenue.
Protected service lines include emergency departments, obstetrics, psychiatric beds, trauma-relevant services, ICU capacity, dialysis access where regionally essential, rural inpatient beds, stroke/cardiac stabilization pathways, pediatric essential services, and safety-net clinics.
Drug, Pharmacy, Device, and Diagnostic Concept
The drug architecture replaces fragmented PBM-mediated purchasing with public formulary governance, national drug purchasing, real-time pharmacy claims, and public backup production.
Core elements:
National Drug Purchasing Authority;
Public Medicines Corporation;
National Pharmacy Claims Utility;
National Formulary and Therapeutic Schedule Board;
Medicine Access Review Board;
Drug Utilization and Safety Office;
Medical Device and Supply Authority;
Laboratory and Diagnostics Authority.
Drug prices should not be the default mechanism for recovering R&D costs. Public R&D, milestone rewards, prizes, subscriptions, and public-interest licensing provide the innovation financing layer.
Pharmacy continuity is critical. Any established medication filled under a legacy plan should be bridged during transition unless a clinically reviewed substitution or safety restriction applies. Critical chronic medications such as insulin, anticoagulants, antiepileptics, psychiatric drugs, transplant-related drugs, and dialysis-related drugs require no-interruption protections.
Workforce and Education Concept
The framework treats workforce as a hard system constraint.
Core elements:
National Health Workforce Education and Capacity Authority;
National Health Workforce Board;
National Physician Compensation Board;
National Clinical Scope and Workforce Board;
Rural Service Corps;
Specialist Bottleneck Index;
public residency and fellowship expansion;
specialist backplane training;
advanced clinical workforce expansion;
diagnostic workforce expansion;
public-service scholarships and obligations;
Health Administration Transition Corps.
Training allocation should favor bottlenecks that remain after the unit network absorbs low-acuity demand. It should not simply prioritize specialists over primary care; it should fund bottleneck functions, including psychiatry, child/adolescent psychiatry, neurology, geriatrics, rheumatology, endocrinology, nephrology, cardiology, GI, dermatology, ophthalmology, oncology/hematology, radiology, pathology, behavioral health, diagnostic workforce, and advanced clinical workforce.
Information Mesh and AI Concept
The National Health Assurance Information Mesh is not a single uncontrolled database. It is a federated public infrastructure with authoritative registries, event streams, shared data products, rules-as-code, audit logs, and human exception review.
Information layers:
identity layer;
clinical record layer;
coverage and claims layer;
rules-as-code layer;
drug/device/supply ledger;
hospital budget ledger;
workforce registry;
quality/safety/appeals layer;
analytics/research layer;
public transparency layer.
AI use classes:
Class 0: administrative support;
Class 1: low-risk support;
Class 2: clinical decision support;
Class 3: routing/priority support;
Class 4: high-stakes clinical support;
Class 5: prohibited autonomous use.
Hard AI rule:
No AI system may be the final authority for denial of covered care, non-referral to a specialist, emergency non-escalation, long-term care reduction, benefit termination, or high-stakes clinical diagnosis.
Transition Protection Concept
Layer 3 is the transition-protection package.
Core elements:
National Health Transition and Continuity Authority;
Patient Continuity Guarantee;
Provider Cash-Flow Guarantee;
Hospital Stabilization Corridor;
Pharmacy Continuity Rule;
Legacy Payer Wind-Down Office;
Health Administration Transition Corps;
State and Regional Transition Compacts;
Employer and Payroll Transition Office;
Data Migration and Records Continuity Office;
Tribal and Rural Transition Office;
Transition Legal Safe Harbor Office;
transition ombudsman network.
Transition principle:
The system may change who pays, how claims are processed, how hospitals are budgeted, how drugs are purchased, and how workers are deployed, but it may not allow patients, providers, pharmacies, hospitals, states, tribal nations, employers, or workers to fall into an unmanaged gap during the conversion.
Legitimacy and Safety Concept
Layer 4 is the legitimacy and safety package.
Core elements:
National Office of Patient Rights, Safety, and Legitimacy;
No Silent Rationing Doctrine;
Patient Bill of Rights;
diagnostic safety program;
safety culture program;
AI and algorithmic accountability;
Health Data Rights Charter;
service design and accessibility standards;
appeals and ombudsman architecture;
equity and civil rights monitoring;
public dashboards;
public trust measurement;
clinician legitimacy and safety culture.
No Silent Rationing Doctrine:
No covered person may be denied, delayed, deprioritized, rerouted, or refused covered care except through an explicit statutory, clinical, budgetary, or evidence-based rule that is visible, explainable, appealable, and audited.
Adaptation and Repair Concept
Layer 5 is the adaptation and repair package.
Core elements:
National Health Adaptation and Scorekeeping Board;
independent fiscal and operational scorekeeping;
Formula Registry;
retrospective review;
sunset and repair;
legal contingency matrix;
emergency technical correction pathway;
red team;
technology lifecycle and vendor escape;
benefit-boundary update process;
regional adaptation waiver system;
appeals learning;
public confidence repair protocol.
Adaptation principle:
The system must be hard to sabotage, but easy to correct through transparent, evidence-based, legally bounded repair.
Implementation Phases and Phase Gates
Phase Roadmap
PH-P0, Year 1: statute, transition command, governing-body establishment, mandatory funding authorities.
PH-P1, Year 2: person/provider/facility registries, identity, cyber baseline, legal defaults, foundational records architecture.
PH-P2, Year 3: pharmacy claims utility, drug purchasing, PBM replacement, PMC Phase I, formulary/marshalling functions.
PH-P3, Year 4: public coverage wave I, claims rail, uninsured/ACA/Medicaid transition start.
PH-P4, Year 6: hospital global-budget pilots, regional planning, unit pilots, specialist backplane pilots.
PH-P5, Year 7: workforce and scope reform, community diagnostic-treatment units scaled, specialist capacity ledgers expanded.
PH-P6, Year 8: national public default coverage and major cost-sharing elimination.
PH-P7, Year 10: long-term care, behavioral health, dental, vision, hearing, and EMS expansion.
PH-P8, Year 12: full integration, mature manufacturing, records mesh, innovation delinkage, maturity certification.
Phase Gates
Gate 1: Claims readiness. Clean-claim auto-adjudication, payment timeliness, eligibility latency, and provider cash-flow disruption must meet targets before major expansion.
Gate 2: Unit capacity. Unit coverage, same-day low-acuity access, follow-up closure, and unsafe under-referral must meet targets before broad cost-sharing elimination.
Gate 3: LTC and workforce readiness. LTC assessment timeliness, critical vacancy rate, home-care sufficiency, and behavioral health first-contact access must meet targets before full expanded benefit rollout.
Gate 4: Fiscal readiness. Dedicated revenue sufficiency, operating reserves, wealth collection efficiency, and tax-stabilizer readiness must meet targets before maturity certification.
Gate 5: AI safety readiness. AI validation, audit capture, equity drift, and human override availability must meet targets before national AI-assisted routing.
Gate 6: Records and cyber readiness. Record access, correction workflows, segmentation, uptime, vulnerability remediation, and downtime continuity must meet targets before national record reliance.
Gate 7: Legitimacy readiness. Patient rights, appeal usability, no-silent-rationing explanations, public reporting, trust measurement, and ombudsman operations must meet targets before large-scale coverage conversion.
Gate 8: Transition continuity readiness. Active treatment transfer, medication continuity, legacy data transfer, state/tribal compacts, and provider liquidity mechanisms must meet targets before major legacy payer sunset.
Legal and Governance Design
Statutory Architecture
The enabling statute should be the National Health Assurance and Health System Transition Act. Final title structure:
Title I: National Health Assurance Entitlement.
Title II: Financing and Trust Funds.
Title III: Enrollment and Public Default Coverage.
Title IV: Claims, Payment, and Appeals.
Title V: Drugs, Devices, Diagnostics, and Public Manufacturing.
Title VI: Hospitals and Public-Service Charters.
Title VII: Workforce, Education, Compensation, and Scope.
Title VIII: Long-Term Care, Behavioral Health, Dental/Vision/Hearing, and EMS.
Title IX: Records, Data Rights, Cybersecurity, and AI.
Title X: Public Health and Prevention.
Title XI: Biomedical Innovation.
Title XII: Fraud, Abuse, and Anti-Extraction.
Title XIII: State, Regional, and Tribal Transition.
Title XIV: Tax and Wealth Financing.
Title XV: Transition Protection.
Title XVI: Legitimacy and Safety.
Title XVII: Anti-Impoundment and Continuity.
Title XVIII: Adaptation, Scorekeeping, and Repair.
Title XIX: Conforming Amendments.
Federal Conforming Changes
Federal conforming changes should address Medicare, Medicaid, CHIP, ACA, ERISA, McCarran-Ferguson, Internal Revenue Code, FDCA, patent law, Hatch-Waxman, Bayh-Dole, Orphan Drug Act, BPCIA, Controlled Substances Act, HIPAA/HITECH/21st Cures, 42 CFR Part 2, Anti-Kickback Statute, Stark Law, False Claims Act, Public Health Service Act, FEHBA, TRICARE, VA, Indian Health Care Improvement Act, Impoundment Control Act, APA, antitrust law, corporate law, nonprofit hospital rules, and medical debt/consumer-credit statutes.
State, Regional, and Tribal Legal Architecture
State conforming changes should address insurance codes, Medicaid and CHIP statutes, scope of practice, professional licensing, certificate-of-need laws, hospital licensing, pharmacy laws, public health laws, vital records, EMS laws, long-term care laws, disability supports, medical debt, tort/malpractice interfaces, and state employee health plans.
Preemption principle:
Federal law preempts state law that prevents, frustrates, duplicates, or materially interferes with National Health Assurance enrollment, coverage, payment, pharmacy access, drug purchasing, public manufacturing, hospital global budgeting, records, provider participation, scope-of-practice floors, or transition continuity. States may enforce health, safety, licensure, discipline, public health, supplemental coverage, and more-protective rules that do not interfere with federal operation.
Tribal principle:
No transition provision may reduce, replace, or condition federal trust obligations to tribal nations unless expressly agreed through tribal consultation and statutory consent mechanisms.
Executive-Branch Hardening
Required safeguards:
core benefits as statutory entitlement;
permanent mandatory appropriations;
deemed apportionment/default apportionment;
direct Treasury disbursement;
clean-claim deemed allowance rules;
provider and hospital payment rights;
pharmacy real-time payment protections;
vacancy-proof governance;
no duty failure for lack of quorum;
staffing floors and anti-hollowing rules;
direct-hire authority if vacancy thresholds are exceeded;
CHAO oversight;
Article I court remedies;
state/regional fallback;
public data and systems escrow;
continuity contracts;
anti-regulatory sabotage defaults;
anti-impoundment trigger and remedy.
Legal Contingency Matrix
If annual wealth tax is invalidated: use mark-to-market income tax, estate/dynasty tax, borrowing tax, exit tax, and financial-asset excise structures.
If mark-to-market tax is invalidated: use realization-at-death, deemed-sale rules, and minimum tax on tradable assets.
If federal scope preemption is limited: use conditional funding, federal facility operation, and direct federal credential pathways.
If OMB bypass is narrowed: use entitlement enforcement, court-ordered Treasury disbursement, and narrower deemed-apportionment fallback.
If Article I court jurisdiction is limited: use expedited federal district court jurisdiction.
If public-interest patent licensing is limited: use government-use compensation, prize funding, subscription procurement, and public R&D.
If national health identifier is limited: use federated privacy-preserving identity tokens.
If data sharing provisions are narrowed: use narrower consent/segmentation structures and purpose-specific exchange.
If anti-private-equity hospital restrictions are limited: use public-service payment conditions, tax penalties, charter restrictions, and related-party controls.
If employer wage-pass-through is limited: use payroll contribution adjustment, disclosure rules, and labor-law fallback.
If state compact mandates are limited: use spending-clause incentives and direct federal administration.
Risk Register and FMEA Seed
The risk register should be expanded into a full FMEA with severity, probability, detectability, early warning indicators, mitigation, fallback, owner, and recovery time objective.

| Risk ID | Failure mode | Primary owner | Early warning | Mitigation / fallback |

| RISK-CLAIMS-001 | Claims rail fails or delays payments | NCCA / THDO | payment delays, provider complaints | provisional Treasury payment, manual contingency, legal payment rights |

| RISK-PHARM-001 | Pharmacy claims outage or transition disruption | PCU / PDCO | rejected fills, pharmacy complaints | offline continuity, real-time repair, emergency fills |

| RISK-UNIT-001 | Unit network underbuilt relative to demand | OCDTI / RHA | same-day access misses, ED diversion failure | phase-gate delay, mobile capacity, contractor conversion |

| RISK-SPEC-001 | Specialist queues collapse | NSAA | wait-time spikes, e-consult backlog | protected slots, specialist premium, tele-specialty expansion |

| RISK-HOSP-001 | Hospital budgets undercalibrated | NHSA / HFASB | service-line closures, staffing stress | stabilization corridor, formula recalibration |

| RISK-FIN-001 | Wealth financing underperforms | IRS / HFASB | revenue shortfall, reserve drawdown | tax stabilizer, enforcement, threshold expansion |

| RISK-AI-001 | AI routing causes unsafe or biased decisions | AICIO / NOPRSL | adverse events, equity drift | suspend model, human review, retraining |

| RISK-CYBER-001 | Cyberattack disrupts records/claims/pharmacy | HCCA | downtime, intrusion signals | failover, offline continuity, emergency manual operations |

| RISK-EXEC-001 | Executive branch attempts sabotage or impoundment | CHAO / A1-HCAC | delayed funds, staffing freeze, withheld data | anti-impoundment action, default rules, court order |

| RISK-STATE-001 | State resistance impairs transition | SRCO / RHA | compact refusal, data blockage | federal fallback administration, funding conditions |

| RISK-WF-001 | Workforce shortages exceed plan | NHWB / NHWECA | vacancies, overtime, burnout | scope expansion, training acceleration, premium pay |

| RISK-LEGAL-001 | Court invalidates major financing or governance tool | NHASB / CONG | injunctions, adverse rulings | automatic fallback provisions |

| RISK-TRUST-001 | Public trust collapses | NOPRSL / NHASB | trust survey drop, complaints | public confidence repair review, service redesign |

| RISK-DATA-001 | Data migration errors harm continuity | DMRCO / NHRA | missing authorizations, record mismatch | provisional coverage, reconciliation, manual review |

| RISK-PMC-001 | Public manufacturing quality failure | PMC / AMDDT | failed batches, recalls | dual-source procurement, emergency purchasing |
FMEA fields to use in later expansion:
failure mode;
causes;
affected stakeholders;
system effect;
patient effect;
cost effect;
severity;
probability;
detectability;
risk priority number or equivalent ranking;
early warning indicator;
mitigation;
fallback;
responsible architecture element;
verification requirement;
recovery time objective.
Simulation Specification
Simulation Objective
The simulation shall compare the existing U.S. healthcare system against the National Health Assurance Framework across cost, access, safety, quality, equity, workforce, household burden, employer burden, provider stability, fiscal sustainability, transition risk, legal resilience, and public trust.
Model Modules
population module;
utilization module;
coverage/enrollment module;
claims/payment module;
unit network module;
specialist routing module;
hospital budget module;
pharmacy/drug/public manufacturing module;
diagnostics/device module;
long-term care module;
behavioral health/SUD module;
dental/vision/hearing module;
EMS/transport module;
workforce/education module;
information/AI/cyber module;
governance/appeals/safety module;
transition module;
financing/tax/trust fund module;
outcomes/savings module.
Core State Variables
covered population;
age-risk distribution;
disease prevalence;
regional morbidity index;
eligibility churn;
unit count by type;
unit visit volume;
unit resolution rate;
ED diversion rate;
specialist referral volume;
e-consult resolution rate;
specialist wait time;
hospital budget total;
hospital service-line continuity;
prescription fill volume;
drug net unit cost;
shortage exposure;
LTC eligible population;
home-care hours;
behavioral health first-contact demand;
claims volume;
auto-adjudication rate;
improper payment rate;
workforce vacancy rate;
training slots;
AI model count;
AI drift indicator;
appeal volume;
public trust index;
revenue receipts;
reserve balances;
transition failure rate;
equity gaps.
Scenario Catalog
SCN-BASE: base case implementation.
SCN-OPT: optimistic implementation.
SCN-PESS: pessimistic implementation.
SCN-UNIT-UNDER: unit network underbuilt.
SCN-SPEC-SEVERE: specialist bottlenecks worse than expected.
SCN-HOSP-LOW: hospital budgets undercalibrated.
SCN-HOSP-HIGH: hospital budgets overcalibrated.
SCN-WEALTH-LOW: extreme-wealth revenue underperforms.
SCN-EMP-FAIL: employer wage-pass-through noncompliance.
SCN-TRUST-COLLAPSE: public trust sharply declines.
SCN-AI-FAIL: AI safety or equity failure.
SCN-CYBER: major cyber outage.
SCN-DRUG-SHORT: drug shortage crisis.
SCN-PANDEMIC: pandemic or public health surge.
SCN-LTC-AGING: high aging and long-term care demand.
SCN-STATE-RESIST: hostile state noncooperation.
SCN-LEGAL: major legal invalidation.
SCN-WF-SHORT: workforce shortages exceed plan.
SCN-BH-SURGE: behavioral health demand surge.
SCN-RURAL-STRESS: rural access stress case.
Simulation Outputs
total annual cost;
per-capita cost;
GDP share;
public outlay;
household spending;
employer spending;
tax burden distribution;
transition-adjusted cost;
unit access;
ED utilization;
avoidable admission rate;
specialist wait time;
e-consult resolution;
hospital stability;
medication access;
shortage exposure;
LTC access;
behavioral health access;
workforce vacancy;
training pipeline adequacy;
medical debt incidence;
appeal volume;
safety events;
AI override/audit capture;
equity gaps;
reserve adequacy;
revenue sufficiency;
transition continuity failures;
public trust.
Simulation Input Schema Dimensions
Use these dimensions as a minimum schema:
time: year, phase, quarter where needed;
region: national, state, region, rural/urban/frontier, tribal jurisdiction;
population group: age, risk, income, disability, language, race/ethnicity where legally/ethically permissible, pregnancy status, rurality;
service category: hospital, unit, specialist, primary, drug, diagnostic, LTC, behavioral, DVH, EMS, public health;
unit type: A, B, C, D;
specialty: primary specialty categories and bottleneck categories;
hospital: facility and service-line categories;
product: drug, device, diagnostic, supply categories;
agency: owning architecture element;
scenario: baseline and stress scenario code.
Patient Journey Examples
Low-acuity respiratory illness
A patient seeks same-day care through a Type B unit. The unit performs AI-assisted intake, human validation, vitals, respiratory testing if indicated, red-flag screening, and treatment. If red flags are absent, the unit resolves the case and writes the encounter to the national longitudinal health record. If symptoms worsen, the follow-up system flags bounce-back risk. Cost parameters include unit variable cost, diagnostic cost, AI operating cost, and avoided ED savings.
Diabetes follow-up and medication access
A patient with diabetes receives A1c testing, foot screening, medication reconciliation, and refill support through a unit or primary care team. Pharmacy claims are processed through PCU. Improved adherence raises drug spending but may reduce complications, admissions, amputations, and long-term costs. Cost parameters include drug adherence-induced cost, avoided-complication savings, unit diagnostic costs, and chronic-disease control effects.
Suspected specialist problem
A patient with possible rheumatologic disease receives first-line labs and exam documentation through a unit or primary care team. NSAA receives a structured referral packet with the clinical question, red-flag screen, tests, treatments tried, and urgency class. The case may resolve through e-consult, tele-specialty, diagnostic-first pathway, or in-person specialist visit. Cost parameters include specialist e-consult cost, avoided specialist visit savings, and diagnostic-first pathway cost.
Active cancer treatment during transition
A patient in active cancer treatment migrates from a legacy payer to National Health Assurance. The Patient Continuity Office protects treatment, referrals, medication coverage, and scheduled procedures. If claims or authorizations are missing, provisional coverage and payment apply. Cost parameters include active treatment transfer cost, legacy data migration cost, provisional payment outlay, and appeals/ombudsman cost.
Completeness Assessment
Included in this source package
This source package includes the final framework's usable architecture and simulation inputs:
final cost position;
final governing agency architecture;
stakeholder needs SN-01 through SN-25;
project, system, and verification requirements;
requirements-to-architecture allocation summary;
KPPs and TPPs;
cost parameter dictionary;
four-unit network design;
specialist backplane design;
hospital model;
drug/pharmacy/public manufacturing model;
workforce and education model;
long-term care, behavioral health, dental/vision/hearing, EMS, and public health model;
information mesh and AI rules;
transition protection layer;
legitimacy and safety layer;
adaptation and repair layer;
implementation phases and gates;
financing and reserve model;
legal architecture and fallback matrix;
risk register and FMEA seed;
simulation objective, modules, state variables, scenarios, outputs, and schema dimensions;
representative patient journeys.
Items not included or not fully developed
The following items are intentionally identified as incomplete or requiring later work:
This is not a verbatim transcript of the entire conversation.
This does not include hidden system/developer instructions or non-user-visible model reasoning.
This does not include a full external bibliography with current citations for every empirical claim.
This does not include calibrated numerical distributions for every simulation parameter.
This does not include phase-by-phase target values for every KPP/TPP beyond the targets already specified.
This does not include a full statutory bill draft, only statutory architecture and key legal requirements.
This does not include a full FMEA with numeric severity, probability, detectability, and risk-priority scores for every failure mode.
This does not include specialty-specific clinical protocols or diagnosis-specific routing criteria.
This does not include a final regional siting plan for every unit type.
This does not include provider-level or facility-level empirical baselines needed for implementation.
This does not include an executable simulation model.
This does not include full communication strategy, though it includes implications for communications planning.
Assessment of whether anything material to the final framework is missing
For Work mode to draft the long-form document, the source package is materially complete with respect to the final framework's conceptual architecture, agencies, requirements, stakeholder needs, parameters, cost model, implementation phases, legal design, and simulation structure.
The remaining gaps are not conceptual gaps in the framework. They are implementation-detail gaps that should be filled during later drafting or simulation development: citations, calibration, exact statutory text, detailed clinical protocols, numeric FMEA scoring, regional datasets, and executable model code.
