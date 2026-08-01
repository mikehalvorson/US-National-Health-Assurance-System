/* Phased-rollout data, ported verbatim from docs/js/rollout.js
   (PHASES 12-103, DOMAINS 105-184, GATES 186-227, AGENCIES 229-260,
   WORKSTREAMS 262-276). Fidelity-critical: do not re-derive. */

export interface Phase {
  id: string;
  year: number;
  title: string;
  summary: string;
  work: string[];
  evidence: string;
}

export interface Gate {
  n: string;
  title: string;
  when: string;
  floor: string;
  fallback: string;
}

export interface AgencyGroup {
  title: string;
  color: string;
  desc: string;
  items: [string, string][];
}

export const PHASES: Phase[] = [
  {
    id: "P0", year: 1, title: "Statutory and command foundation",
    summary: "Create the legal, fiscal, rights, and transition machinery before any coverage is moved.",
    work: [
      "Enact the entitlement, mandatory funding authorities, and legal fallback rules",
      "Stand up NHTCA and the governing, payment, oversight, scorekeeping, and remedy bodies",
      "Baseline rights, risk, configuration, transition inventories, and independent evidence"
    ],
    evidence: "Core bodies are legally established; accountable officials or interim succession are in place; initial funds and controls are available."
  },
  {
    id: "P1", year: 2, title: "Identity, registries, cyber, and legal defaults",
    summary: "Build the authoritative identity and data foundation that enrollment, payment, records, and appeals will depend on.",
    work: [
      "Complete person, provider, facility, formulary, and claims registries",
      "Establish health identity, data rights, cyber and offline baselines, and foundational records architecture",
      "Prototype access, correction, downtime, and legal default procedures"
    ],
    evidence: "Authoritative registries and access, correction, and downtime prototypes are independently demonstrated."
  },
  {
    id: "P2", year: 3, title: "Pharmacy and purchasing first operation",
    summary: "Begin with a bounded, high-volume national transaction rail where continuity can be tested end to end.",
    work: [
      "Launch the public pharmacy claims utility and national drug purchasing",
      "Replace the core PBM function and begin Public Medicines Corporation Phase I",
      "Operate formulary, therapeutic schedule, shortage, marshalling, and fallback functions"
    ],
    evidence: "Pharmacy claim, payment, fill, medication-continuity, and shortage fallback controls work end to end."
  },
  {
    id: "P3", year: 4, title: "Public coverage Wave I",
    summary: "Move the first populations while the old system remains available as a protected bridge.",
    work: [
      "Start uninsured, ACA, and Medicaid transition waves",
      "Operate eligibility, claims, Treasury payment, appeals, provider liquidity, and continuity together",
      "Publish rights notices, ombudsman routes, and independently evaluated Wave I results"
    ],
    evidence: "Wave I is independently evaluated; Claims Gate 1, Legitimacy Gate 7, and Continuity Gate 8 evidence is ready before broader conversion."
  },
  {
    id: "P4", year: 6, title: "Delivery and hospital pilots",
    summary: "Test the new care-delivery and hospital-finance architecture in representative regions before scaling.",
    work: [
      "Pilot hospital global budgets, public-service charters, and regional service planning",
      "Pilot representative Type A, B, C, and D diagnostic-treatment units",
      "Pilot specialist e-consults, urgency routing, capacity ledgers, and protected urgent slots"
    ],
    evidence: "Safety, access, finance, workforce, rights, and equity evidence supports a scale, repair, or terminate decision."
  },
  {
    id: "P5", year: 7, title: "Workforce and delivery scale",
    summary: "Expand staffed capacity, training, scope, unit coverage, and specialist routing before national cost-sharing changes.",
    work: [
      "Scale workforce education, compensation, national scope floors, and worker-transition pathways",
      "Grow the diagnostic-treatment network to at least 65% population coverage",
      "Expand specialist capacity ledgers, e-consults, tele-specialty, and protected urgent slots"
    ],
    evidence: "At least 65% unit-network coverage plus verified workforce, routing, follow-up, and safe-escalation readiness."
  },
  {
    id: "P6", year: 8, title: "National public default coverage",
    summary: "Make public coverage the national default and remove most covered-care cost sharing only where delivery capacity is ready.",
    work: [
      "Scale automatic public coverage, claims, payment, appeals, regional operations, and transition protection nationally",
      "Eliminate major covered-care cost sharing after the Unit Capacity Gate",
      "Keep manual, legacy, cross-region, mobile, and liquidity fallbacks active where needed"
    ],
    evidence: "Coverage and financial-protection results pass together with capacity, safety, rights, records, cyber, AI, and continuity constraints."
  },
  {
    id: "P7", year: 10, title: "Expanded benefits",
    summary: "Add the historically fragmented or uncovered benefits after workforce and service capacity is demonstrated.",
    work: [
      "Expand long-term care and home- and community-based services",
      "Expand behavioral health and substance-use care, dental, vision, hearing, EMS, transport, and public-health capacity",
      "Operate assessments, devices, crisis routes, appeals, home-care, and provider networks as integrated benefits"
    ],
    evidence: "Gate 3 confirms assessment timeliness, critical vacancies, home-care sufficiency, behavioral-health access, and DVH/EMS readiness."
  },
  {
    id: "P8", year: 12, title: "Full integration and maturity certification",
    summary: "Transfer accepted capabilities into durable operations, close residual migrations, and certify the full system.",
    work: [
      "Reach mature public manufacturing, national purchasing, inventory visibility, and backup supply",
      "Complete the federated information mesh, mature payment, and innovation-delinkage model",
      "Certify fiscal reserves, legitimacy, safety, adaptation, vendor escape, and remaining repair duties"
    ],
    evidence: "All maturity targets are assessed; Gate 4 and cross-domain certification pass; unresolved defects remain owned in a public repair plan."
  }
];

export const DOMAINS: string[][] = [
  ["Statute / governance",
    "Enact; constitute bodies",
    "Defaults, regulations, appeals, charters",
    "Pilot oversight and correction",
    "National administration and benefit rules",
    "Maturity review; durable and sunset allocation"],
  ["Financing / trust / payment",
    "Authority, trust and disbursement design",
    "Pharmacy then Wave I payment; liquidity",
    "Hospital pilots and capacity funding",
    "National obligations and expanded benefits",
    "Reserve, stabilizer, and mature-payment certification"],
  ["Coverage / enrollment",
    "Entitlement, identity, eligibility design",
    "Dry runs, provisional controls, Wave I",
    "Wave expansion with continuity evidence",
    "Public default; major cost-sharing removal",
    "Benefit integration and residual-gap repair"],
  ["Drugs / manufacturing",
    "Authority, formulary, product and supplier baseline",
    "Claims utility, purchasing, PBM replacement, PMC I",
    "Claims scale, shortage controls, production portfolio",
    "National access and capacity expansion",
    "Mature manufacturing and lifecycle evaluation"],
  ["Units / diagnostics",
    "Standards, siting data, capacity and workforce baseline",
    "Prototypes, procurement, routing and data",
    "Pilots; then at least 65% coverage",
    "At least 80% Gate 2 floor; continue scale",
    "At least 95% access target and regional repair"],
  ["Specialty backplane",
    "Urgency, packet, ledger, governance design",
    "E-consult, tele-specialty, workforce preparation",
    "Pilots; ledgers and protected slots scale",
    "National routing with human and rights controls",
    "Access, safety, under-referral and equity maturity"],
  ["Hospitals",
    "Charter, readiness, service-line and finance baseline",
    "Budget-data readiness and stabilization planning",
    "Global-budget pilots; regional refinement",
    "Scale charters and expanded-service interfaces",
    "Mature operating, capital, and readiness model"],
  ["Workforce / education",
    "Boards, registries, safe-need model, transition corps",
    "Pay, scope, education pilots; worker transition",
    "Role-mix pilots; workforce and scope scale",
    "Coverage and expanded-benefit workforce growth",
    "Vacancy, pipeline, obligation, wellbeing, safety maturity"],
  ["LTC / BH / DVH / EMS",
    "Authority, baseline, benefits, rights, workforce design",
    "Assessment, crisis, device, transport prototypes",
    "Regional pilots and capacity build",
    "Prepare; expand after Gate 3",
    "Integrated access, continuity, safety, and equity"],
  ["Information / AI / cyber",
    "Architecture, identity, rights, cyber and offline baseline",
    "Pharmacy, claims and coverage data; AI validation",
    "Unit, specialty, hospital and workforce data",
    "National mesh only after Gates 5 and 6",
    "Mesh, lifecycle, audit, vendor escape, research"],
  ["Transition protection",
    "Command and inventories",
    "Dual runs, bridges, Wave I stabilization",
    "Conversions, compacts, liquidity, worker protection",
    "National waves; Gate 8 before payer sunsets",
    "Residual migration; NHTCA transfer or sunset"],
  ["Legitimacy / safety",
    "Rights, oversight, remedy design",
    "Notices, appeals, safety reporting, Gate 7",
    "Pilot rights, safety, and equity evaluation",
    "National remedies, injury learning, trust repair",
    "Transparency, culture, trust, corrective verification"],
  ["Adaptation / innovation",
    "NHASB, Formula Registry, review baseline",
    "Scorekeeping, legal contingencies, early repairs",
    "Pilot and waiver evaluation; red team",
    "Technology lifecycle, appeals and trust learning",
    "Maturity scorekeeping, sunsets, and repair portfolio"]
];

export const GATES: Gate[] = [
  {
    n: "G1", title: "Claims readiness", when: "Before P3 → P4",
    floor: "Wave I clean-claim auto-adjudication ≥75%, with payment timeliness, eligibility latency, and provider cash flow inside approved floors.",
    fallback: "Hold or resize expansion; use provisional/manual payment and liquidity protection."
  },
  {
    n: "G2", title: "Unit capacity", when: "Before broad cost-sharing elimination",
    floor: "Unit coverage ≥80%; unsafe under-referral ≤5 per 10,000; same-day access and follow-up closure meet approved floors.",
    fallback: "Keep the lawful cost-sharing bridge; add staff, sites, mobile capacity, and safer routing."
  },
  {
    n: "G3", title: "LTC and workforce readiness", when: "Before full expanded benefits",
    floor: "LTC assessment timeliness ≥85%, with vacancies, home care, behavioral health, dental/vision/hearing, and EMS ready.",
    fallback: "Limit the wave or scope; preserve existing entitlements and surge, contract, or train capacity."
  },
  {
    n: "G4", title: "Fiscal readiness", when: "Before maturity certification",
    floor: "Dedicated revenue sufficiency ≥98%; reserves ≥6 months of volatile exposure; collection and stabilizer functions ready.",
    fallback: "Hold maturity; activate authorized reserve, stabilizer, or revenue corrections."
  },
  {
    n: "G5", title: "AI safety readiness", when: "Before national AI-assisted routing",
    floor: "High-stakes human review and audit capture ≥97%, with validation, equity-drift checks, override, suspension, and manual fallback.",
    fallback: "Restrict AI to validated pilots or suspend it; route through accountable humans."
  },
  {
    n: "G6", title: "Records and cyber readiness", when: "Before national record reliance",
    floor: "Access, correction, segmentation, API conformance, uptime, remediation, downtime continuity, and reconciliation work.",
    fallback: "Continue federated, legacy, and manual dependencies; remediate and repeat drills."
  },
  {
    n: "G7", title: "Legitimacy readiness", when: "Before large-scale coverage conversion",
    floor: "Usable rights notices and appeals, no-silent-rationing explanations, ombudsman, public reporting, trust baseline, and safety reporting.",
    fallback: "Hold or resize conversion; improve navigation, relief, independent review, and confidence repair."
  },
  {
    n: "G8", title: "Transition continuity", when: "Before major legacy-payer sunset",
    floor: "Treatment, medication, records, appeals, authorizations, provider liquidity, state/tribal compacts or federal fallback all transfer safely.",
    fallback: "Keep the legacy dual run and bridge duties; protect care and payment, correct, and recertify."
  }
];

export const AGENCIES: AgencyGroup[] = [
  {
    title: "Command and finance", color: "var(--series-5)",
    desc: "Direct the changeover and keep authorized obligations payable through disruption.",
    items: [
      ["NHTCA", "Transition command, continuity, compacts, bridges, and wind-down"],
      ["THDO", "Mandatory Treasury payment rail for providers, hospitals, and pharmacies"],
      ["NHETF / HFASB", "Transition and shock reserves, obligation and revenue certification"]
    ]
  },
  {
    title: "Build and operate", color: "var(--series-1)",
    desc: "Create the coverage, care-delivery, medicines, workforce, and information capabilities.",
    items: [
      ["DNHA", "Enrollment, coverage, claims, medicines, workforce, records, and regions"],
      ["PCU / PMC", "Public pharmacy claims, purchasing, and essential-product manufacturing"],
      ["OCDTI / NCDTN", "Site, construct, equip, staff, and operate Type A–D units"],
      ["NHSA / NSAA", "Hospital budgets and charters; specialist routing and capacity"],
      ["AHWCS", "Workforce planning, training, compensation, scope, and clinical AI"]
    ]
  },
  {
    title: "Protect and verify", color: "var(--series-6)",
    desc: "Keep operations accountable to people, evidence, Congress, and enforceable law.",
    items: [
      ["NHAC", "Independent rights, privacy, safety, ombudsman, appeals, and reporting"],
      ["NHASB", "Independent scorekeeping, phase evidence, formulas, red teams, and repair"],
      ["CHAO / Court", "Congressional compliance oversight and enforceable remedies"],
      ["NBIA", "Public R&D, comparative evidence, and public-interest licensing"]
    ]
  }
];

export const WORKSTREAMS: [string, string, string][] = [
  ["TW-01", "Unit network buildout", "Sites, design, construction, equipment, startup, training, mobile and rural readiness"],
  ["TW-02", "Information mesh", "Identity, registries, claims and records, cyber, interfaces, cleaning, and migration"],
  ["TW-03", "Public manufacturing", "Facilities, equipment, validation, suppliers, inventory, and launch"],
  ["TW-04", "Hospital stabilization", "Conversion corridors, service-line and workforce continuity, reconciliation"],
  ["TW-05", "Provider liquidity", "Reserve authority, provisional payments, complaints, recovery, and reconciliation"],
  ["TW-06", "Workforce transition", "Income bridges, assessment, training, placement, retention, and appeals"],
  ["TW-07", "Education expansion", "Faculty, sites, slots, scholarships, residencies, fellowships, and hubs"],
  ["TW-08", "State compacts", "Planning, systems, staffing, data, grants, reconciliation, and federal fallback"],
  ["TW-09", "Tribal and rural transition", "Direct compacts, data governance, facilities, workforce, transport, and continuity"],
  ["TW-10", "Pharmacy continuity", "Medication bridges, emergency fills, onboarding, payment, formulary, and supply conversion"],
  ["TW-11", "Legacy payer wind-down", "Runout, authorizations, appeals, liabilities, records, contracts, and closure"],
  ["TW-12", "Legitimacy and safety startup", "Rights, ombudsman, appeals, injury learning, accessibility, trust, and remediation"],
  ["TW-13", "Adaptation startup", "Scorekeeping, Formula Registry, gate evidence, legal contingency, red team, and repair"]
];
