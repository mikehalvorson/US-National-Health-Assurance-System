/* Phased-rollout data, ported verbatim from docs/js/rollout.js
   (PHASES 12-103, DOMAINS 105-184, GATES 186-227, AGENCIES 229-260,
   WORKSTREAMS 262-276). Fidelity-critical: do not re-derive. */

import { START_YEAR } from './params';

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

/* R257 [§S11b]: five of the eight gates state a number and three do not.
 *
 * G1 requires >=75%, G2 >=80% and <=5 per 10,000, G3 >=85%, G4 >=98% and six
 * months, G5 >=97%. G6, G7 and G8 read as lists of things that must "work",
 * "transfer safely" or be "usable" - real requirements, and not measurements.
 *
 * The section they are published in is framed as measurement: gateFloorChecks
 * lifts the quantities out of each floor and holds catalog rows to them, and
 * the page presents all eight the same way. So three gates sat in a
 * measurement frame carrying nothing to measure, and a reader had no way to
 * tell which kind they were looking at.
 *
 * Derived rather than declared. A hand-kept list of "the three" is a list
 * that goes stale the moment a floor is rewritten with a number in it, which
 * is exactly what should happen to G6, G7 and G8. The page reads this. */
export function gateFloorQuantities(gate: Gate): number[] {
  /* Phase and gate references are addresses, not quantities - the same
     exclusion gate-floors.ts makes, for the same reason. */
  return (gate.floor.replace(/\b[PG][0-9]+\b/g, ' ').match(/[0-9]+(?:\.[0-9]+)?/g) || [])
    .map(Number);
}

export function gateIsMeasurable(gate: Gate): boolean {
  return gateFloorQuantities(gate).length > 0;
}

export const QUALITATIVE_GATE_NOTE =
  'This gate states conditions rather than a threshold. Readiness is a ' +
  'judgement by the named body against the listed capabilities, not a number ' +
  'the model can score.';

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

/* ---- The phase -> year map ----------------------------------------------
 * The single definition. Every module that needs a phase's anchor year
 * imports this one; nothing re-derives it. Derived from PHASES above so a
 * phase and its year cannot be edited apart.
 *
 * These are YEAR NUMBERS, 1-based: P0 is Year 1. Two conversions exist and
 * they answer different questions. A consumer that wants to INDEX a year-keyed
 * array uses phaseIndex() in equations.ts, the only place that conversion
 * happens. A consumer that wants a calendar DATE uses calendarYear() below.
 * Neither is open-coded anywhere.
 * ------------------------------------------------------------------------ */
export const PHASE_YEAR: Record<string, number> = {};
PHASES.forEach(function (p) { PHASE_YEAR[p.id] = p.year; });

/* Year number -> calendar year, in one place, for the readers that want a date
 * rather than an array index.
 *
 * R262 [§S2] wrote `START_YEAR + phase.year - 1` inline on a PAGE and again in
 * a check module, which is the same duplication R251 and R293 exist to prevent,
 * reintroduced in the same section by the row that needed a date. A page should
 * not be doing calendar arithmetic at all.
 *
 * This is deliberately NOT the converter `calendarYearOf` in phase-map-check.ts
 * uses. That one goes the long way round, through the equation layer's own
 * phaseIndex(), because its job is to catch the equation layer disagreeing with
 * this map - a check that resolved through this function would be comparing
 * rollout.ts against itself. A self-test holds the two to each other. */
export function calendarYear(yearNumber: number): number {
  return START_YEAR + yearNumber - 1;
}

export function calendarYearOfPhase(phaseId: string): number {
  const year = PHASE_YEAR[phaseId];
  return year === undefined ? NaN : calendarYear(year);
}

/* ---- Headline milestones -------------------------------------------------
 * R255 [§S2]: the rollout page's four stat tiles used to type their year
 * beside the roadmap rather than take it from the roadmap, and one of them
 * disagreed with two other chapters about the same milestone - "Year 10"
 * here, "Years 10-12" on the overview and the health chapter.
 *
 * The years now come from PHASE_YEAR, and each tile that depends on a policy
 * ramp names the ramp and the share it claims to have reached, so a
 * self-test can hold the published milestone to what the model delivers.
 * The page imports these; it does not restate them.
 * ------------------------------------------------------------------------ */
export interface RolloutHeadline {
  label: string;
  value: string;
  range: string;
  /* the ramp that delivers it, and the share reached at startPhase */
  ramp: 'coverage' | 'expansions' | null;
  atLeast: number;
  startPhase: string;
  /* set when the milestone spans phases; the ramp must be complete by it */
  endPhase: string | null;
}

export function yearSpan(startPhase: string, endPhase: string | null): string {
  const a = PHASE_YEAR[startPhase];
  const b = endPhase === null ? a : PHASE_YEAR[endPhase];
  return a === b ? 'Year ' + a : 'Years ' + a + '–' + b;
}

function headline(
  label: string, startPhase: string, endPhase: string | null,
  ramp: RolloutHeadline['ramp'], atLeast: number, range: string
): RolloutHeadline {
  return { label, value: yearSpan(startPhase, endPhase), range, ramp, atLeast, startPhase, endPhase };
}

export const ROLLOUT_HEADLINES: RolloutHeadline[] = [
  {
    label: 'Controlled roadmap', value: PHASES[0].id + '–' + PHASES[PHASES.length - 1].id,
    range: 'foundation plus eight delivery phases',
    ramp: null, atLeast: 0, startPhase: PHASES[0].id, endPhase: null
  },
  headline('Public default coverage', 'P6', null, 'coverage', 0.85,
    'after claims, capacity, rights, and continuity checks'),
  headline('Expanded benefits', 'P7', 'P8', 'expansions', 0.60,
    'LTC, behavioral health, dental, vision, hearing, EMS: substantially built at the start of the span, complete at its end'),
  headline('Maturity certification', 'P8', null, null, 0,
    'full integration, manufacturing, records, and payment')
];

/* The span every chapter must use when it describes the benefit expansion.
   Three of them stated it independently and one of the three disagreed. */
export const EXPANSION_SPAN = yearSpan('P7', 'P8');

/* ---- Benefit start years, derived --------------------------------------
 * R262 [§S2]: the LTC chapter stated that the long-term-care benefit "begins
 * in 2026" - before the model's Year 1 and ten years before the roadmap
 * places it - and used that date to justify its workforce horizon. A page
 * should not be able to type a benefit's start year at all, so the phase
 * that carries the benefit is looked up here and the calendar year comes
 * from the anchor.
 *
 * `startYearOfWork` finds the phase whose work list mentions the benefit, so
 * the answer moves if the roadmap moves.
 * ------------------------------------------------------------------------ */
export function phaseCarryingWork(fragment: string): Phase | null {
  const needle = fragment.toLowerCase();
  for (const p of PHASES) {
    if (p.work.some((w) => w.toLowerCase().includes(needle))) return p;
  }
  return null;
}

/* The long-term-care benefit's phase, by the roadmap's own words. */
export const LTC_BENEFIT_PHASE = phaseCarryingWork('long-term care');

/* ---- Unit-network buildout steps ----------------------------------------
 * R258 [§S2]: the buildout chart used to carry its five steps inline in
 * rollout-client.ts, each with a `level` string that set the bar's height.
 * Three were the readiness floors the page states in prose - 65%, 80%, 95%
 * population coverage. The other two were "24%" and "34%", which appear
 * nowhere else: not in the floors, not in the ramps, not in a comment. A
 * `qual: true` flag restyled their fill, but height is the quantity channel
 * on a bar chart, so a reader saw a bar at roughly a quarter scale on an
 * axis where every other bar means population coverage.
 *
 * `coverage` is null for those two now. They are plotted off the axis at a
 * fixed nominal height the stylesheet owns, behind a visible break, so
 * nothing about them encodes a number. The three real steps keep their
 * floors, and a self-test holds each to the floor the page states.
 * ------------------------------------------------------------------------ */
export interface UnitBuildoutStep {
  value: string;
  label: string;
  phase: string;
  /* population-coverage floor this step represents, or null when the step is
     qualitative and belongs off the axis */
  coverage: number | null;
}

/* A note for anyone comparing these to RAMPS.units: they are not the same
   quantity and must not be made to agree. These levels are POPULATION within
   the unit network - the framework's own P5 milestone (KPP-B7, ">=65% by phase
   end") and its Gate 2 floor (">=80%"). RAMPS.units is the share of the MATURE
   BUILD delivered, which is 0.55 at the P5 anchor. A build that is 55% complete
   serving 65% of the population is not a contradiction; population concentrates
   where units are built first. R255 checks each plotted step against the floor
   the page states, which is the comparison that means something. */
export const UNIT_BUILDOUT_STEPS: UnitBuildoutStep[] = [
  { value: 'Plan', label: 'standards, siting, workforce, prototypes', phase: 'P0–P3', coverage: null },
  { value: 'Pilot', label: 'all four unit types in representative regions', phase: 'P4', coverage: null },
  { value: '≥65%', label: 'population coverage by phase end', phase: 'P5', coverage: 65 },
  { value: '≥80%', label: 'Gate 2 floor before broad $0 care', phase: 'P6', coverage: 80 },
  { value: '≥95%', label: 'within access-time standard', phase: 'P8', coverage: 95 }
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

/* ---- Transition workstreams ---------------------------------------------
 * R253 [§S5]. `rollout.astro` requires of every dollar a "costed work
 * package, deliverable, owner, gate, contingency, and transfer into mature
 * operations" - and these records were thirteen [id, title, description]
 * triples carrying none of them.
 *
 * Two of the five were simply dropped in the port. Framework Table D6B-15
 * ("Costed transition and implementation workstreams") is a five-column
 * table: ID, Workstream, CP allocation, Included transition boundary,
 * Exit/transfer. The port kept the first two and the boundary (as
 * `description`) and dropped `CP allocation` and `Exit/transfer`. Both are
 * restored verbatim below - the CP allocation IS the costed-work-package
 * pointer, and the exit IS the transfer into mature operations.
 *
 * Owner and gate are assigned to the whole set, not per workstream, and the
 * framework says so: conclusion 64-C06 reads "NHTCA; TW-01-13; Gate 8". They
 * are stated once as WORKSTREAM_OWNER / WORKSTREAM_GATE rather than copied
 * thirteen times.
 *
 * The per-workstream DOLLAR allocation does not exist, and that is the
 * framework's own position rather than a gap in this port: Table D6B-14's
 * last row reads "Phase/domain allocation | Open | Cost-loaded integrated
 * schedule required under OI-052". So `cost` is a declared state - the §S4
 * pattern, a field that says why a number is absent instead of leaving a
 * silent blank - and the page prints the reason where it prints the
 * requirement.
 * ------------------------------------------------------------------------ */
export type WorkstreamCostState = 'allocation-open';

export interface Workstream {
  id: string;
  title: string;
  /* Table D6B-15 "Included transition boundary": what the package delivers. */
  boundary: string;
  /* Table D6B-15 "CP allocation": the cost families the package draws on. */
  cpAllocation: string;
  /* Table D6B-15 "Exit/transfer": where the capability goes when service-ready. */
  exit: string;
  cost: WorkstreamCostState;
}

/* Framework conclusion 64-C06: "NHTCA; TW-01-13; Gate 8". */
export const WORKSTREAM_OWNER = 'NHTCA';
export const WORKSTREAM_GATE = 'Gate 8';
export const WORKSTREAM_COST_NOTE =
  'Per-workstream dollar allocation is open by design, not missing: the ' +
  'framework fixes the cumulative envelope and requires a cost-loaded ' +
  'integrated schedule (OI-052) before phase and domain shares are set. Each ' +
  'package names the cost families it draws on instead.';

export const WORKSTREAMS: Workstream[] = [
  { id: "TW-01", title: "Unit network buildout",
    boundary: "Sites, design, construction, equipment, startup, training, mobile and rural readiness",
    cpAllocation: "CP-UNIT capital/startup; CP-TRN where uniquely transitional",
    exit: "MC-03 after service-ready transfer", cost: 'allocation-open' },
  { id: "TW-02", title: "Information mesh",
    boundary: "Identity, registries, claims and records, cyber, interfaces, cleaning, and migration",
    cpAllocation: "CP-IT; CP-TRN-010 for legacy migration",
    exit: "MC-11 recurring operation", cost: 'allocation-open' },
  { id: "TW-03", title: "Public manufacturing",
    boundary: "Facilities, equipment, validation, suppliers, inventory, and launch",
    cpAllocation: "CP-RX/CP-DX capital/startup",
    exit: "MC-05/06 mature production", cost: 'allocation-open' },
  { id: "TW-04", title: "Hospital stabilization",
    boundary: "Conversion corridors, service-line and workforce continuity, reconciliation",
    cpAllocation: "CP-TRN-007",
    exit: "Close after certified global-budget/public-service operation", cost: 'allocation-open' },
  { id: "TW-05", title: "Provider liquidity",
    boundary: "Reserve authority, provisional payments, complaints, recovery, and reconciliation",
    cpAllocation: "CP-TRN-005/006",
    exit: "Authority/balance/outlay tracked separately", cost: 'allocation-open' },
  { id: "TW-06", title: "Workforce transition",
    boundary: "Income bridges, assessment, training, placement, retention, and appeals",
    cpAllocation: "CP-TRN-016/017; CP-EDU",
    exit: "Enduring education to MC-14; placement support sunsets", cost: 'allocation-open' },
  { id: "TW-07", title: "Education expansion",
    boundary: "Faculty, sites, slots, scholarships, residencies, fellowships, and hubs",
    cpAllocation: "CP-EDU capital/startup",
    exit: "MC-14 recurring pipeline after capacity established", cost: 'allocation-open' },
  { id: "TW-08", title: "State compacts",
    boundary: "Planning, systems, staffing, data, grants, reconciliation, and federal fallback",
    cpAllocation: "CP-TRN-011",
    exit: "Enduring regional administration to operating categories", cost: 'allocation-open' },
  { id: "TW-09", title: "Tribal and rural transition",
    boundary: "Direct compacts, data governance, facilities, workforce, transport, and continuity",
    cpAllocation: "CP-TRN-012/013",
    exit: "Enduring services transfer with sovereignty/federal duties preserved", cost: 'allocation-open' },
  { id: "TW-10", title: "Pharmacy continuity",
    boundary: "Medication bridges, emergency fills, onboarding, payment, formulary, and supply conversion",
    cpAllocation: "CP-TRN-004/008",
    exit: "MC-05 after continuity certification", cost: 'allocation-open' },
  { id: "TW-11", title: "Legacy payer wind-down",
    boundary: "Runout, authorizations, appeals, liabilities, records, contracts, and closure",
    cpAllocation: "CP-TRN-009/010",
    exit: "Named durable custodian for retained duties", cost: 'allocation-open' },
  { id: "TW-12", title: "Legitimacy and safety startup",
    boundary: "Rights, ombudsman, appeals, injury learning, accessibility, trust, and remediation",
    cpAllocation: "CP-GOV/IT; CP-TRN-018/020",
    exit: "Tagged subset of MC-12 after P6", cost: 'allocation-open' },
  { id: "TW-13", title: "Adaptation startup",
    boundary: "Scorekeeping, Formula Registry, gate evidence, legal contingency, red team, and repair",
    cpAllocation: "CP-GOV/IT",
    exit: "MC-12 mature operation", cost: 'allocation-open' }
];
