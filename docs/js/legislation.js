/* =========================================================================
 * Legislation view: Framework v2.0.0 Sections 9.2-9.3 and Appendix L.
 * This is a major-law-family planning crosswalk, not legal advice or a
 * substitute for the framework's still-open provision-level validation.
 * ========================================================================= */
"use strict";
(function () {
  function $(id) { return document.getElementById(id); }

  var DOMAINS = [
    {
      title: "Coverage and public programs",
      short: "Coverage",
      actions: ["Parallel", "Transfer", "Amend", "Sunset", "Fallback"],
      laws: [
        "Social Security Act Title XVIII (Medicare)",
        "Social Security Act Title XIX (Medicaid)",
        "Social Security Act Title XXI (CHIP)",
        "Affordable Care Act and Health Care and Education Reconciliation Act",
        "Federal Employees Health Benefits Act",
        "Title 10 TRICARE authorities",
        "Title 38 VA and CHAMPVA authorities",
        "Indian Health Care Improvement Act",
        "Immigration and Nationality Act and federal residency and identity definitions"
      ],
      change: "Create automatic NHA entitlement, enrollment, benefits, claims, payment, and appeal rights. Map each legacy beneficiary, benefit, trust-fund flow, provider obligation, pending claim, and appeal into a successor provision.",
      preserve: "Do not narrow Medicare, Medicaid, CHIP, VA, TRICARE, FEHBA, or IHS rights before the successor benefit and payment path is live. Preserve specialized veteran, military, and tribal delivery missions unless Congress expressly transfers them.",
      method: "Run programs in parallel by certified population and geography; transfer functions and records in controlled waves; retain savings clauses and a statutory fallback; sunset duplicative coverage only after Gate 8.",
      phase: "P0-P1 authority; P3 first coverage wave; P6 national default; P8 certified sunset.",
      sources: [
        ["Medicare entitlement · 42 USC §1395c", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section1395c&num=0&edition=prelim"],
        ["Medicaid · 42 USC §1396", "https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title42-section1396"],
        ["ACA · Public Law 111-148", "https://www.govinfo.gov/app/details/PLAW-111publ148"]
      ]
    },
    {
      title: "Civil rights, disability, conscience, and remedies",
      short: "Civil rights",
      actions: ["Preserve", "Amend", "Preempt"],
      laws: [
        "Civil Rights Act Title VI",
        "Rehabilitation Act §504",
        "Americans with Disabilities Act Titles II and III",
        "ACA §1557 nondiscrimination",
        "Age Discrimination Act and Title IX funding conditions",
        "Religious Freedom Restoration Act",
        "Church, Coats-Snowe, and Weldon conscience provisions",
        "Federal language-access, patient-rights, civil-remedy, and attorney-fee statutes"
      ],
      change: "Apply one enforceable nondiscrimination, accessibility, language-access, complaint, appeal, and remedy floor to NHA, every participating provider, and every contractor. Define how individual conscience protection interacts with emergency duties and continuous patient access.",
      preserve: "Do not narrow existing race, color, national-origin, sex, disability, age, language, religion, or other protected-class rights. Protect individual belief while preventing an institution, region, or contractor from making a covered service practically unavailable.",
      method: "Amend program and provider definitions, funding conditions, cross-references, causes of action, exhaustion, standing, remedies, and fee provisions; preserve more-protective state civil-rights law; preempt only a rule that authorizes conduct the federal guarantee forbids.",
      phase: "P0 statutory rights and remedies; P1 implementing rules and complaint systems; enforced in every wave and at Gate 8.",
      sources: [
        ["ACA §1557 · 42 USC §18116", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section18116&num=0&edition=prelim"],
        ["Rehabilitation Act §504 · 29 USC §794", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title29-section794&num=0&edition=prelim"],
        ["ADA public services · 42 USC §12132", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section12132&num=0&edition=prelim"]
      ]
    },
    {
      title: "Employer insurance and labor",
      short: "Employer plans",
      actions: ["Parallel", "Amend", "Preempt", "Sunset"],
      laws: [
        "ERISA benefit, fiduciary, reporting, remedies, and preemption provisions",
        "COBRA continuation provisions in ERISA, the IRC, and the PHSA",
        "PHSA Title XXVII group and individual market rules",
        "McCarran-Ferguson Act and state insurance regulation",
        "NLRA and federal-sector collective-bargaining statutes",
        "FLSA, WARN Act, and employee-benefit transition protections"
      ],
      change: "End the need for employment-linked major-medical coverage while protecting accrued benefits, collective-bargaining rights, fiduciary remedies, retiree promises, payroll records, and transition income. Replace insurer-plan compliance with NHA contribution and reporting duties.",
      preserve: "Keep pension, disability, life, leave, supplemental coverage, fiduciary, labor, and worker-protection law. Preserve claims and remedies for conduct that occurred before migration.",
      method: "Amend ERISA and PHSA definitions, reporting, continuation, and preemption language; create savings clauses for nonmedical benefits and labor rights; parallel employer plans during migration; sunset only duplicative major-medical obligations.",
      phase: "P1 worker protection; P3-P6 plan migration; P8 final reconciliation.",
      sources: [
        ["ERISA preemption · 29 USC §1144", "https://uscode.house.gov/view.xhtml?req=%28title%3A29+section%3A1144+edition%3Aprelim%29"],
        ["McCarran-Ferguson · 15 USC §1012", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section1012&num=0&edition=prelim"],
        ["COBRA notice · 29 USC §1166", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title29-section1166&num=0&edition=prelim"]
      ]
    },
    {
      title: "Tax, revenue, and trust funds",
      short: "Tax and revenue",
      actions: ["Preserve", "Transfer", "Amend", "Sunset"],
      laws: [
        "IRC premium-tax-credit, employer-coverage, cafeteria-plan, self-employed, HSA, payroll-tax, employer-mandate, and individual-mandate provisions",
        "Social Security and Medicare trust-fund receipt provisions",
        "Federal Insurance Contributions Act and Self-Employment Contributions Act",
        "Budget, appropriation, scorekeeping, and debt-collection provisions",
        "State premium, provider, insurance, payroll, and income-tax interfaces"
      ],
      change: "Create dedicated NHA receipts and trust-fund transfers; redirect existing federal and state health outlays; replace premiums and point-of-care collections with enacted revenue; phase down tax subsidies and penalties made obsolete by automatic coverage.",
      preserve: "Retain taxpayer notice, assessment, collection, refund, judicial-review, and confidentiality protections. Protect already accrued tax attributes and contracts during the transition.",
      method: "Originate the revenue title in the House; amend Title 26 section by section; set effective dates to match coverage waves; use explicit transfers and reconciliation rules; sunset obsolete credits, exclusions, accounts, and penalties only after replacement financing is live.",
      phase: "P0 revenue authority; P1 trust and reporting; P3-P6 staged collections and relief; P8 closeout.",
      sources: [
        ["Internal Revenue Code · Title 26", "https://uscode.house.gov/view.xhtml?path=/prelim@title26&edition=prelim"],
        ["Taxing and Spending Clause", "https://constitution.congress.gov/browse/essay/artI-S8-C1-1-1/ALDE_00013388/"],
        ["House Origination Clause", "https://constitution.congress.gov/browse/essay/artI-S7-C1-1/ALDE_00013354/"]
      ]
    },
    {
      title: "Drugs, devices, diagnostics, and production",
      short: "Medicines",
      actions: ["Preserve", "Parallel", "Transfer", "Amend"],
      laws: [
        "Federal Food, Drug, and Cosmetic Act",
        "PHSA §351 biologics authority and the BPCIA",
        "Hatch-Waxman and Orphan Drug Act",
        "Patent Act, Bayh-Dole Act, and federal march-in authorities",
        "Medicare Part D, IRA negotiation, Medicaid drug rebate, and 340B provisions",
        "Controlled Substances Act and Ryan Haight telemedicine provisions",
        "Defense Production Act and emergency supply authorities"
      ],
      change: "Authorize national purchasing, transparent formulary and price rules, a public pharmacy claims utility, the Public Medicines Corporation, shortage intervention, and public-interest licensing while leaving FDA safety and effectiveness review intact.",
      preserve: "Preserve FDA approval, pharmacovigilance, controlled-substance safeguards, due process, valid intellectual-property rights, and access to nonformulary clinical exceptions and appeals.",
      method: "Amend purchasing and reimbursement restrictions; coordinate rebate and 340B transitions; authorize federal production and contracting; define compulsory or public-interest licensing triggers and compensation; parallel legacy pharmacy payment until the public utility is proven.",
      phase: "P1 procurement authority; P2 pharmacy rail and first production; P3-P6 national scale; P8 mature supply assurance.",
      sources: [
        ["FDCA · 21 USC §301", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title21-section301&num=0&edition=prelim"],
        ["Bayh-Dole policy · 35 USC §200", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title35-section200&num=0&edition=prelim"],
        ["Controlled Substances Act · 21 USC chapter 13", "https://uscode.house.gov/view.xhtml?path=/prelim@title21/chapter13&edition=prelim"]
      ]
    },
    {
      title: "Hospitals, providers, payment, and integrity",
      short: "Providers",
      actions: ["Preserve", "Parallel", "Transfer", "Amend"],
      laws: [
        "Medicare prospective-payment and provider-agreement statutes",
        "EMTALA and No Surprises Act protections",
        "Physician Self-Referral Law (Stark Law)",
        "Federal Anti-Kickback Statute and Civil Monetary Penalties Law",
        "False Claims Act and program-integrity authorities",
        "IRC §501(c)(3) and §501(r) nonprofit-hospital rules",
        "Sherman, Clayton, and FTC competition authorities",
        "State facility licensure, certificate-of-need, corporate-practice, and nonprofit law"
      ],
      change: "Authorize hospital public-service charters, global budgets, readiness funding, uniform claims, provider participation duties, anti-extraction rules, and a transition from price-per-claim incentives.",
      preserve: "Retain emergency-care duties, clinical licensure and safety, fraud and false-claim enforcement, patient appeals, antitrust review, charitable-asset protections, and due process for sanctions.",
      method: "Pilot budgets and charters while legacy payment remains available; reconcile provider definitions and fraud safe harbors; transfer payment functions after audit; preempt only state rules that block the national payment or access floor.",
      phase: "P1 charter authority; P3 claims; P4 pilots; P5-P6 scale; P8 final payment conversion.",
      sources: [
        ["EMTALA · 42 USC §1395dd", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section1395dd&num=0&edition=prelim"],
        ["Stark Law · 42 USC §1395nn", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section1395nn&num=0&edition=prelim"],
        ["False Claims Act · 31 USC §3729", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title31-section3729&num=0&edition=prelim"]
      ]
    },
    {
      title: "Records, privacy, cyber, and AI",
      short: "Data and cyber",
      actions: ["Preserve", "Parallel", "Transfer", "Amend", "Preempt"],
      laws: [
        "HIPAA Administrative Simplification and Privacy and Security Rules",
        "HITECH Act breach, enforcement, and health-information-technology provisions",
        "21st Century Cures Act information-blocking and interoperability provisions",
        "42 USC §290dd-2 and 42 CFR Part 2 substance-use records",
        "Privacy Act, Federal Records Act, FISMA, E-Government Act, and FOIA",
        "CISA and CIRCIA cyber authorities",
        "State medical, genetic, biometric, reproductive, minor, and consumer-data laws"
      ],
      change: "Create the national health-data mesh, authoritative record nodes, patient correction and access rights, purpose-bound exchange, cyber controls, audit trails, AI registries, downtime operation, and enforceable vendor portability.",
      preserve: "Keep or strengthen specially protected data segmentation, minimum-necessary use, breach duties, records retention, due process, tribal data sovereignty, minor protection, and more-protective privacy rules.",
      method: "Amend federal definitions and permissions for one lawful operating mesh; publish common interfaces; run source systems in parallel; migrate by certified cohort; use narrow preemption only for incompatible exchange rules while saving stronger confidentiality.",
      phase: "P0-P1 rights and cyber baseline; P2-P4 connectors; P5-P6 scale; P8 full continuity certification.",
      sources: [
        ["HIPAA standards · 42 USC §1320d-2", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section1320d-2&num=0&edition=prelim"],
        ["Substance-use records · 42 USC §290dd-2", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section290dd-2&num=0&edition=prelim"],
        ["FISMA · 44 USC chapter 35, subchapter II", "https://uscode.house.gov/view.xhtml?path=/prelim@title44/chapter35/subchapter2&edition=prelim"]
      ]
    },
    {
      title: "Workforce, education, compensation, and scope",
      short: "Workforce",
      actions: ["Preserve", "Parallel", "Amend", "Preempt"],
      laws: [
        "PHSA Titles VII and VIII health-professions training programs",
        "National Health Service Corps authorities",
        "Medicare graduate-medical-education payment",
        "Higher Education Act and Public Service Loan Forgiveness",
        "Immigration and Nationality Act health-workforce pathways",
        "Federal employment, service-obligation, and labor statutes",
        "State licensure, scope-of-practice, supervision, telehealth, and compact laws"
      ],
      change: "Authorize national role-region staffing plans, training expansion, rural service, compensation bands, transition support, travel teams, telehealth, and competency-based national scope floors.",
      preserve: "Keep state discipline, clinical competency, collective bargaining, wage and hour, nondiscrimination, immigration due process, academic standards, and worker appeals.",
      method: "Use federal employment and facility-participation rules directly; fund voluntary state compacts; condition new grants with clear prospective terms; preempt only barriers to the enacted national scope or telehealth floor, not general licensure.",
      phase: "P1 registries and transition authority; P4 pilots; P5-P7 scale; P8 workforce floors.",
      sources: [
        ["Health professions · 42 USC chapter 6A, subchapter V", "https://uscode.house.gov/view.xhtml?path=/prelim@title42/chapter6A/subchapter5&edition=prelim"],
        ["National Health Service Corps · 42 USC §254d", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section254d&num=0&edition=prelim"],
        ["Public Service Loan Forgiveness · 20 USC §1087e", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title20-section1087e&num=0&edition=prelim"]
      ]
    },
    {
      title: "Expanded benefits, emergency care, and public health",
      short: "Expanded benefits",
      actions: ["Preserve", "Parallel", "Transfer", "Amend"],
      laws: [
        "Medicaid HCBS waiver and state-plan authorities",
        "Older Americans Act, PACE, Nursing Home Reform Act, and family-caregiver programs",
        "MHPAEA and federal substance-use-disorder treatment statutes",
        "PHSA emergency, preparedness, prevention, and public-health authorities",
        "Stafford Act and PREP Act emergency authorities",
        "Federal and state EMS, ambulance, dental, vision, hearing, and behavioral-health law"
      ],
      change: "Create enforceable home-first LTC, behavioral-health, substance-use, dental, vision, hearing, EMS, prevention, and public-health benefits with capacity gates and integrated payment.",
      preserve: "Retain existing eligibility and service rights until replacement benefits are broader and operational; preserve emergency powers, civil rights, informed consent, quality regulation, and community-integration obligations.",
      method: "Map each service, waiver, plan, grant, facility duty, and appeal; parallel existing funding; transfer administration only after provider and workforce capacity passes; retain direct federal fallback where a compact ends.",
      phase: "P1 standards and capacity plan; P4-P6 pilots and buildout; P7 benefit expansion; P8 mature assurance.",
      sources: [
        ["Medicaid HCBS · 42 USC §1396n", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section1396n&num=0&edition=prelim"],
        ["MHPAEA · 29 USC §1185a", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title29-section1185a&num=0&edition=prelim"],
        ["Public-health emergencies · 42 USC §247d", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section247d&num=0&edition=prelim"]
      ]
    },
    {
      title: "State law, insurance, and household protection",
      short: "State and consumer",
      actions: ["Preserve", "Parallel", "Amend", "Preempt", "Sunset"],
      laws: [
        "State insurance and health-plan codes",
        "State Medicaid, CHIP, employee, and retiree-plan statutes",
        "State facility, licensure, scope, telehealth, pharmacy, public-health, and corporate-practice law",
        "State tax, budget, labor, pension, and collective-bargaining law",
        "State medical-debt, lien, garnishment, charity-care, and consumer-credit law",
        "FCRA, FDCPA, bankruptcy, and federal consumer-protection statutes"
      ],
      change: "Each jurisdiction adopts an annex or compact aligning program administration, provider regulation, funding transfers, workforce, records, consumer protection, and legacy closeout with the federal guarantee.",
      preserve: "Save general health and safety authority, licensure and discipline, more-protective privacy and debt rules, supplemental coverage, labor rights, state remedies, and powers unrelated to an actual federal conflict.",
      method: "Congress supplies a model compact and direct federal option; states enact conforming packages voluntarily; federal law expressly preempts only material interference; every compact has funding, metrics, cure, audit, exit, and reentry provisions.",
      phase: "P0 model text; P1 annexes and compacts; P3-P7 wave activation; P8 closeout.",
      sources: [
        ["Supremacy Clause and preemption", "https://constitution.congress.gov/browse/essay/artVI-C2-3-4/ALDE_00013402/"],
        ["Anti-commandeering doctrine", "https://constitution.congress.gov/browse/essay/amdt10-4-2/ALDE_00013627/"],
        ["Fair Credit Reporting Act · 15 USC §1681", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section1681&num=0&edition=prelim"]
      ]
    },
    {
      title: "Tribal health, treaties, and self-determination",
      short: "Tribal authority",
      actions: ["Preserve", "Parallel", "Amend"],
      laws: [
        "Indian Health Care Improvement Act",
        "Snyder Act",
        "Indian Self-Determination and Education Assistance Act",
        "Tribal treaties, trust obligations, and federal Indian law",
        "IHS, tribal, and urban Indian health-program authorities",
        "Tribal data-governance, licensure, employment, procurement, and public-health law"
      ],
      change: "Add NHA funding and service rights without diminishing existing treaty, trust, self-determination, or IHS obligations. Authorize direct federal-tribal compacts and tribal operation of local and regional system functions.",
      preserve: "Preserve sovereignty, treaty and trust remedies, existing appropriations and eligibility, self-determination contracting, cultural care, local governance, and tribal data sovereignty.",
      method: "Conduct nation-to-nation consultation before bill introduction; create a separate tribal title and appropriation crosswalk; allow direct compacts without state consent or intermediation; apply federal Indian-law canons and explicit nondiminution clauses.",
      phase: "P0 consultation and drafting; P1 direct authority; P2-P7 tribal-selected waves; P8 continued trust assurance.",
      sources: [
        ["Indian health policy · 25 USC §1601", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title25-section1601&num=0&edition=prelim"],
        ["Self-determination policy · 25 USC §5302", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title25-section5302&num=0&edition=prelim"],
        ["Indian affairs and Commerce Clause", "https://constitution.congress.gov/browse/essay/artI-S8-C3-10/ALDE_00012977/"]
      ]
    },
    {
      title: "Administration, appropriations, and continuity",
      short: "Administration",
      actions: ["Preserve", "Amend", "Fallback"],
      laws: [
        "Administrative Procedure Act and judicial-review provisions",
        "Impoundment Control Act and Antideficiency Act",
        "Prompt Payment Act, Tucker Act, and Judgment Fund",
        "Federal Vacancies Reform Act and federal personnel law",
        "Inspector General Act, FOIA, Privacy Act, and Federal Records Act",
        "Federal procurement, grants, appropriations, and apportionment statutes"
      ],
      change: "Create mandatory duties, automatic apportionment and payment defaults, enforceable clocks, succession, staffing floors, protected evidence feeds, formula registries, step-in authority, expedited review, and continuity funding.",
      preserve: "Retain APA procedure and review, appropriations accountability, records and disclosure duties, inspectors general, procurement integrity, employee rights, and constitutional presidential control of executive officers.",
      method: "Write self-executing defaults into the statute; specify standing, causes of action, forums, remedies, deadlines, evidence, severability, and revival; assign nonexecutive scorekeeping and adjudication only to constitutionally appropriate bodies.",
      phase: "P0-P1 before operations; exercised in every phase; Gate 8 continuity proof.",
      sources: [
        ["APA definitions · 5 USC §551", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title5-section551&num=0&edition=prelim"],
        ["Impoundment Control Act · 2 USC §681", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title2-section681&num=0&edition=prelim"],
        ["Trump v. Slaughter · June 29, 2026", "https://www.supremecourt.gov/opinions/25pdf/25-332_qn12.pdf"]
      ]
    },
    {
      title: "Competition, corporate structure, and research",
      short: "Markets and research",
      actions: ["Preserve", "Amend", "Preempt"],
      laws: [
        "Sherman Act, Clayton Act, FTC Act, and Hart-Scott-Rodino Act",
        "State corporate, nonprofit, charitable-asset, and nonprofit-hospital law",
        "Bayh-Dole Act, Stevenson-Wydler Act, Patent Act, and federal technology-transfer law",
        "PHSA, NIH, BARDA, ARPA-H, and federal research authorities",
        "Common Rule, FDA human-subject protections, and research privacy law",
        "Federal and state procurement, conflict-of-interest, and revolving-door law"
      ],
      change: "Align competition enforcement, public-service charters, anti-extraction rules, public production, research funding, open-science duties, licensing, and conflicts policy with universal public financing.",
      preserve: "Keep merger review, anticompetitive-conduct remedies, charitable-asset restrictions, research ethics, informed consent, scientific integrity, due process, and reasonable inventor incentives.",
      method: "Amend jurisdiction and remedy gaps; define when public payment or charter obligations supplement rather than displace antitrust law; create public-interest licensing and access clauses; preempt only corporate structures that defeat federal anti-extraction duties.",
      phase: "P0-P2 statutory and procurement rules; P3-P6 enforcement and contracting; P8 mature market review.",
      sources: [
        ["Sherman Act · 15 USC §1", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section1&num=0&edition=prelim"],
        ["Clayton Act definitions · 15 USC §12", "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section12&num=0&edition=prelim"],
        ["Common Rule · 45 CFR part 46", "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46"]
      ]
    }
  ];

  var ACRONYMS = {
    "AI": "Artificial Intelligence",
    "APA": "Administrative Procedure Act",
    "ARPA-H": "Advanced Research Projects Agency for Health",
    "BARDA": "Biomedical Advanced Research and Development Authority",
    "BPCIA": "Biologics Price Competition and Innovation Act",
    "CBO": "Congressional Budget Office",
    "CFR": "Code of Federal Regulations",
    "CHAMPVA": "Civilian Health and Medical Program of the Department of Veterans Affairs",
    "CHIP": "Children's Health Insurance Program",
    "CIRCIA": "Cyber Incident Reporting for Critical Infrastructure Act",
    "CISA": "Cybersecurity and Infrastructure Security Agency",
    "COBRA": "Consolidated Omnibus Budget Reconciliation Act",
    "DVH": "Dental, Vision, and Hearing",
    "EMS": "Emergency Medical Services",
    "EMTALA": "Emergency Medical Treatment and Labor Act",
    "ERISA": "Employee Retirement Income Security Act",
    "FDA": "Food and Drug Administration",
    "FDCA": "Federal Food, Drug, and Cosmetic Act",
    "FDCPA": "Fair Debt Collection Practices Act",
    "FEHBA": "Federal Employees Health Benefits Act",
    "FISMA": "Federal Information Security Modernization Act",
    "FLSA": "Fair Labor Standards Act",
    "FOIA": "Freedom of Information Act",
    "FCRA": "Fair Credit Reporting Act",
    "FTC": "Federal Trade Commission",
    "HCBS": "Home and Community-Based Services",
    "HIPAA": "Health Insurance Portability and Accountability Act",
    "HITECH": "Health Information Technology for Economic and Clinical Health Act",
    "HSA": "Health Savings Account",
    "IHS": "Indian Health Service",
    "IRA": "Inflation Reduction Act",
    "IRC": "Internal Revenue Code",
    "JCT": "Joint Committee on Taxation",
    "LTC": "Long-Term Care",
    "MHPAEA": "Mental Health Parity and Addiction Equity Act",
    "NHA": "National Health Assurance",
    "NIH": "National Institutes of Health",
    "NLRA": "National Labor Relations Act",
    "OI": "Open Issue",
    "PACE": "Program of All-Inclusive Care for the Elderly",
    "PHSA": "Public Health Service Act",
    "PREP": "Public Readiness and Emergency Preparedness Act",
    "RFRA": "Religious Freedom Restoration Act",
    "TRICARE": "Department of Defense health program for service members, retirees, and families",
    "USC": "United States Code",
    "VA": "Department of Veterans Affairs",
    "WARN": "Worker Adjustment and Retraining Notification Act"
  };

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderDetail(index) {
    var domain = DOMAINS[index];
    var host = $("legislation-law-detail");
    var buttons = $("legislation-law-list").querySelectorAll("button");
    buttons.forEach(function (button, buttonIndex) {
      button.setAttribute("aria-pressed", buttonIndex === index ? "true" : "false");
    });

    host.textContent = "";
    var head = element("div", "legislation-law-detail-head");
    var number = element("span", "", "Domain " + String(index + 1).padStart(2, "0"));
    var title = element("h3", "", domain.title);
    head.appendChild(number);
    head.appendChild(title);

    var badges = element("div", "legislation-action-badges");
    domain.actions.forEach(function (action) {
      badges.appendChild(element("span", "legislation-action legislation-action-" + action.toLowerCase(), action));
    });

    var lawSection = element("section", "legislation-law-field legislation-law-field-wide");
    lawSection.appendChild(element("h4", "", "Affected laws and legal systems"));
    var laws = element("ul", "");
    domain.laws.forEach(function (law) { laws.appendChild(element("li", "", law)); });
    lawSection.appendChild(laws);

    function field(label, value) {
      var section = element("section", "legislation-law-field");
      section.appendChild(element("h4", "", label));
      section.appendChild(element("p", "", value));
      return section;
    }

    var grid = element("div", "legislation-law-fields");
    grid.appendChild(lawSection);
    grid.appendChild(field("What changes", domain.change));
    grid.appendChild(field("What remains protected", domain.preserve));
    grid.appendChild(field("How the change is performed", domain.method));
    grid.appendChild(field("Activation and sunset", domain.phase));

    var sources = element("div", "legislation-law-sources");
    sources.appendChild(element("span", "", "Primary law"));
    domain.sources.forEach(function (source) {
      var link = element("a", "", source[0]);
      link.href = source[1];
      link.target = "_blank";
      link.rel = "noopener";
      sources.appendChild(link);
    });

    host.appendChild(head);
    host.appendChild(badges);
    host.appendChild(grid);
    host.appendChild(sources);
    addAcronymHovers(host);
  }

  function renderList() {
    var host = $("legislation-law-list");
    DOMAINS.forEach(function (domain, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "legislation-law-button";
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", "Open legal domain " + (index + 1) + ": " + domain.title);
      button.appendChild(element("span", "", String(index + 1).padStart(2, "0")));
      button.appendChild(element("strong", "", domain.short));
      button.addEventListener("click", function () { renderDetail(index); });
      host.appendChild(button);
    });
    renderDetail(0);
  }

  function addAcronymHovers(root) {
    if (!root) return;
    var keys = Object.keys(ACRONYMS).sort(function (a, b) {
      return b.length - a.length;
    });
    var escaped = keys.map(function (key) {
      return key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    });
    var pattern = new RegExp("\\b(" + escaped.join("|") + ")\\b", "g");
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var textNodes = [];

    while (walker.nextNode()) {
      var node = walker.currentNode;
      var parent = node.parentElement;
      if (!parent || parent.closest("abbr, script, style")) continue;
      pattern.lastIndex = 0;
      if (pattern.test(node.nodeValue)) textNodes.push(node);
    }

    textNodes.forEach(function (node) {
      var text = node.nodeValue;
      var fragment = document.createDocumentFragment();
      var lastIndex = 0;
      pattern.lastIndex = 0;
      text.replace(pattern, function (match, acronym, offset) {
        if (offset > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
        }
        var abbr = document.createElement("abbr");
        abbr.className = "legislation-acronym";
        abbr.title = ACRONYMS[acronym];
        abbr.setAttribute("aria-label", acronym + ": " + ACRONYMS[acronym]);
        abbr.textContent = acronym;
        fragment.appendChild(abbr);
        lastIndex = offset + match.length;
        return match;
      });
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
      node.parentNode.replaceChild(fragment, node);
    });
  }

  renderList();
  addAcronymHovers($("view-legislation"));
})();
