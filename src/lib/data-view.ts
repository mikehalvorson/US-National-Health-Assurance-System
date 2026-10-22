/* Data-tab content, ported verbatim from docs/js/data.js
   (FIXES 65-102, PLANES 104-111, STORE_ROWS 113-121,
   CARE_ACTORS 123-172, PUBLIC_ACTORS 174-223, CYBER_CONTROLS 225-236,
   mesh-core service list 523-530). Fidelity-critical: do not re-derive.

   The acronym map that was here (docs/js/data.js 10-63) is gone. Its 52 keys
   were a subset of src/lib/acronyms.ts, which the site-wide decorator applies
   to every page; the local copy only ever added the identifier-wrapping bug
   its `\b` matcher caused. */

export interface FixItem {
  problem: string;
  mechanism: string;
  fix: string;
  result: string;
}

export interface Actor {
  name: string;
  code: string;
  sends: string;
  receives: string;
}

export const FIXES: FixItem[] = [
  {
    problem: "Records stop at organizational boundaries",
    mechanism: "Exchange varies by vendor, payer, facility, and setting, leaving several incomplete versions of the same person.",
    fix: "One identity, locator, and longitudinal view",
    result: "NHIS/NMPI resolve the person; NRLS finds governed source records; NLLHR assembles the permitted view without erasing provenance."
  },
  {
    problem: "Meaning changes between systems",
    mechanism: "Local codes, point-to-point interfaces, and inconsistent definitions can turn a successful transmission into a clinical misunderstanding.",
    fix: "National semantic profiles and a tested gateway",
    result: "NCDSO defines the meaning; NAIG certifies endpoints, versions, privacy behavior, errors, performance, and offline cases."
  },
  {
    problem: "The record is late, incomplete, or contradictory",
    mechanism: "Medication lists, lab results, discharge summaries, and corrections may not reach the next clinician in time.",
    fix: "Event contracts, quality states, and closure targets",
    result: "Every event carries time, source, authority, quality, correction, and follow-up state; defects are quarantined or visibly degraded."
  },
  {
    problem: "Testing, referrals, and follow-up repeat or disappear",
    mechanism: "Missing history produces duplicate tests; variable referral packets and queues create lost handoffs and unclosed abnormal results.",
    fix: "Structured orders, results, referral packets, and closure",
    result: "The shared record links indication, result, urgency, owner, returned plan, patient notice, and closed-loop follow-up."
  },
  {
    problem: "Patients cannot see or govern the full trail",
    mechanism: "Separate portals obscure who accessed a record, which version is current, how to correct it, and whether sensitive data were exposed.",
    fix: "One patient rights surface with enforceable controls",
    result: "PACP provides access, export, correction, consent, segmentation, and a patient-visible accounting of every governed access."
  },
  {
    problem: "Concentration creates national cyber blast radius",
    mechanism: "Critical vendors and providers depend on interconnected systems that can simultaneously interrupt care, claims, payment, and privacy.",
    fix: "Federation, failover, offline care, and vendor escape",
    result: "HCCA sets recovery objectives, tests degraded modes, preserves manual rails, requires reconciliation, and funds portable replacement."
  }
];

export const PLANES: [string, string, string][] = [
  ["Identity and authority", "People, providers, facilities, products, programs, credentials, roles, and rule versions.", "Verified keys; effective dates; merge/split correction."],
  ["Operational events", "Eligibility, encounters, results, medications, referrals, claims, payments, appeals, and safety events.", "Event history plus current state; replay cannot create a duplicate event."],
  ["Ledgers and capacity", "Hospital budgets, specialty slots, workforce, inventory, obligations, reserves, and service readiness.", "Reconciled stock and flow; no double booking or hidden offset."],
  ["Assurance and evidence", "Metric observations, audit findings, safety cases, requirement results, and phase-gate packages.", "Immutable lineage and an independent verifier."],
  ["Analytics and research", "Versioned comparator observations, governed queries, evaluation, simulation inputs, and approved outputs.", "Minimum necessary data, disclosure review, uncertainty, and reproducibility."],
  ["Public transparency", "Published metrics, formulas, compact terms, revisions, conflicts, and audit history.", "Approved aggregates, privacy suppression, version history, and accessible definitions."]
];

export const STORE_ROWS: string[][] = [
  ["Identity and coverage", "Person, provider and facility registries; eligibility events; private-plan certification", "Identity evidence, effective dates, authority, notice, and correction"],
  ["Clinical record", "Encounters, orders and results, medication history, care plans, discharge summaries", "Source provenance, clinical status, responsible owner, follow-up due and closed"],
  ["Care routing", "Type A-D unit encounters, referral packets, urgency, specialty capacity, offers and returned plans", "No double-counted slots; lost-to-follow-up is an explicit state"],
  ["Claims and payment", "Medical and pharmacy claims, legal obligations, Treasury disbursement and remittance", "Clinical and financial states are linked but never conflated"],
  ["Hospitals, supply and workforce", "Budgets, service lines, formulary, inventory, manufacturing lots, devices, diagnostics, FTE and training", "Distinct components, product provenance, shortage state, observed versus projected capacity"],
  ["Rights, safety and governance", "Access logs, corrections, appeals, injury events, formulas, requirement results, gates and cyber incidents", "Segmentation, sealed fields, named authority, notice, rollback and remedy"],
  ["Research and public output", "Governed analytic snapshots, approved queries, aggregate metrics, equity strata and revision history", "No raw export from the secure enclave; targets never masquerade as observations"]
];

export const CARE_ACTORS: Actor[] = [
  {
    name: "Patient and authorized caregiver",
    code: "PACP",
    sends: "Consent, segmentation, correction evidence, access requests, appeals",
    receives: "Longitudinal view, provenance, notices, export, access history"
  },
  {
    name: "Type A micro unit",
    code: "NCDTN · A",
    sends: "Request, brief encounter, point-of-care test, treatment, medication, follow-up",
    receives: "Verified identity, current medications/allergies, protocols, escalation path"
  },
  {
    name: "Type B neighborhood unit",
    code: "NCDTN · B",
    sends: "Encounter, diagnostics, treatment, disposition, referral and closure",
    receives: "Permitted history, prior results, care plan, routing and returned specialist plan"
  },
  {
    name: "Type C rural enhanced unit",
    code: "NCDTN · C",
    sends: "Enhanced lab/imaging, procedure, stabilization, transfer and rural capacity events",
    receives: "Prior record, tele-specialty, EMS and hospital capacity, transfer state"
  },
  {
    name: "Type D urban/public-health unit",
    code: "NCDTN · D",
    sends: "High-volume diagnostics, treatment, surveillance, escalation and public-health events",
    receives: "Current record, alerts, regional demand and public-health pathways"
  },
  {
    name: "Hospitals, clinics and specialists",
    code: "NHSA · NSAA",
    sends: "Encounters, orders, results, discharge summaries, referrals, e-consults and care plans",
    receives: "Current permitted record, urgency, protected slot, handoff and returned plan"
  },
  {
    name: "Labs, imaging, pharmacies and suppliers",
    code: "LDA · PCU",
    sends: "Specimens, results, interpretations, dispensing, inventory, shortage and provenance",
    receives: "Orders, patient context, formulary, substitutions and product standards"
  },
  {
    name: "EMS, LTC, BH, DVH and public health",
    code: "ACDRH",
    sends: "Triage, transport, handoff, assessments, sensitive services and surveillance",
    receives: "Emergency minimum record, segmented history, care pathway and capacity state"
  }
];

export const PUBLIC_ACTORS: Actor[] = [
  {
    name: "Enrollment and coverage",
    code: "DNHA · NEEA · NCCA",
    sends: "Eligibility, coverage, benefit rule, adjudication and explanation events",
    receives: "Verified person/provider/facility and covered-service evidence"
  },
  {
    name: "Claims, pharmacy and Treasury payment",
    code: "NCCA · PCU · THDO",
    sends: "Claim state, obligation, disbursement, rejection, retry and remittance",
    receives: "Covered encounter, dispensing, payee and controlling rule version"
  },
  {
    name: "Medicines, devices and diagnostics",
    code: "AMDDT · LDA · PMC",
    sends: "Formulary, standards, product quality, capacity, shortage and substitution",
    receives: "Use, result linkage, inventory, adverse signals and demand"
  },
  {
    name: "Regional care, hospitals and workforce",
    code: "RHA · OCDTI · NHSA · NSAA · NHWB",
    sends: "Facility status, capacity, staffing, service lines, routes and protected slots",
    receives: "Demand, queues, access, safety, vacancy and continuity evidence"
  },
  {
    name: "Rights, safety, privacy and appeals",
    code: "NHAC · HRPO · NPSMIB · Court",
    sends: "Relief, correction, access ruling, appeal order and safety action",
    receives: "Decision record, access audit, incident, harm, notice and execution state"
  },
  {
    name: "Scorekeeping and public reporting",
    code: "NHASB · CHAO · PRTO",
    sends: "Formula versions, verification results, gate decisions and approved releases",
    receives: "Versioned evidence, denominators, exceptions, audit history and uncertainty"
  },
  {
    name: "Research and public innovation",
    code: "SRAE · NBIA",
    sends: "Approved governed queries, evidence products and disclosure-reviewed results",
    receives: "Minimized, de-identified or enclave-bound data with no uncontrolled raw export"
  },
  {
    name: "Transition and external partners",
    code: "NHTCA · DMRCO",
    sends: "Migration, compact, continuity, correction and reconciliation events",
    receives: "Legacy payer, employer, state, regional, tribal and supplier records under controlled transfer"
  }
];

export const CYBER_CONTROLS: [string, string][] = [
  ["Verified identity and least privilege", "Separate health identity, master-patient matching, clinician credentials, facility status, role, purpose, fields, and time limits govern every access."],
  ["Encryption and key management", "Protect data in transit and at rest; isolate keys and privileged functions so one compromised node cannot expose or alter the whole mesh."],
  ["Sensitive-data segmentation", "Behavioral health, SUD, reproductive, HIV/STI, genetic, minor/adolescent, and tribal-governed records carry enforceable segment rules."],
  ["Patient-visible immutable audit", "Record actor, role, purpose, fields, time, authority, break-glass use, and downstream handling; expose the accounting to the patient."],
  ["Certified APIs and semantic integrity", "Register every endpoint and version; test identity, meaning, provenance, privacy, errors, load, offline behavior, and replacement compatibility."],
  ["Backups, failover and safe degraded modes", "Map recovery objectives and dependencies; preserve emergency care, medication, minimal record lookup, claims intake, and mandatory payment."],
  ["Bounded break-glass access", "Emergency access is purpose-, role-, scope-, and time-limited, creates an immediate audit event, and requires post-use review."],
  ["Vendor and supply-chain escape", "Require portable schemas, escrowed artifacts, replacement drills, component provenance, and funded exit so no contractor can hold care hostage."],
  ["Rapid remediation and incident command", "Continuously find vulnerabilities, contain incidents, notify affected people, protect care, correct records, and reconcile every queued or duplicate event."],
  ["Independent drills and verification", "Exercise cyber outage, corrupted data, lost connectivity, vendor failure, and recovery; a drill fails if care is unsafe or reconciliation is incomplete."]
];

export const MESH_SERVICES: [string, string][] = [
  ["NHIS / NMPI", "Health identity and person matching"],
  ["NRLS / NLLHR", "Record locator and longitudinal view"],
  ["NCDSO / NAIG", "Clinical standards and certified API gateway"],
  ["CIRBAS", "Clinician identity, credentials and role access"],
  ["PACP / HRPO", "Patient access, consent, correction and audit"],
  ["AICIO", "AI registry, validation, decision logs and suspension"],
  ["HCCA", "Cyber defense, continuity, failover and recovery"]
];
