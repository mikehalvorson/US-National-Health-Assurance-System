/* Executive-hardening data, ported verbatim from docs/js/hardening.js
   (LAYERS 9-73, ACRONYMS 75-92). Fidelity-critical: do not re-derive. */

export interface Layer {
  title: string;
  controls: string;
  summary: string;
  attack: string;
  continuity: string;
  check: string;
  proof: string;
}

export const LAYERS: Layer[] = [
  {
    title: "Put rights above the operator",
    controls: "EH-01",
    summary: "Coverage and core benefit rights are statutory duties, not permissions an operating official may switch off.",
    attack: "Secret benefit narrowing, selective non-enforcement, or an operating interpretation that treats administrative preference as repeal.",
    continuity: "The last lawful entitlement and benefit rule continues unless the statute is changed through the lawful process.",
    check: "NHAC investigates rights and safety; NHASB preserves formula and performance evidence; A1-HCAC or a district court can order relief.",
    proof: "Versioned statutory provisions, notices, decision records, appeal files, and evidence that no critical right became ownerless."
  },
  {
    title: "Separate payment from policy leverage",
    controls: "EH-02 to EH-05 and EH-11",
    summary: "Mandatory funding, default apportionment, and a Treasury payment rail keep certified obligations moving.",
    attack: "Impoundment, delayed apportionment, administrative transfer, discretionary withholding, or pressure to reprice an already certified obligation.",
    continuity: "A registered apportionment default, direct THDO disbursement, and deemed or provisional payment activate when statutory clocks expire.",
    check: "CHAO receives protected payment evidence; the court can issue injunction, mandamus, or payment relief; later reconciliation preserves accountability.",
    proof: "At least 99.5% of core spending protected, payment clocks met, automated delay flags retained, and action initiated within 24 hours."
  },
  {
    title: "Make vacancies nonfatal",
    controls: "EH-06 and EH-07",
    summary: "A missing appointee, failed quorum, hiring freeze, or reduction in force cannot erase a statutory duty.",
    attack: "Leaving Senate-confirmed posts vacant, blocking appointments, denying a quorum, or shrinking a critical office below its statutory staffing floor.",
    continuity: "Statutory acting succession, automatic duty continuation, direct-hire authority, and enforceable staffing restoration keep the function operating.",
    check: "CHAO and NHASB compare rosters, succession records, quorum state, service logs, and vacancy duration against controlled floors.",
    proof: "At least 98% staffing-floor compliance and at least 99% critical-function continuity during leadership vacancies by Phase 8."
  },
  {
    title: "Default around missing rules",
    controls: "EH-10 and SR-LAW-008",
    summary: "Regulatory nonfeasance triggers a known public rule instead of an administrative void.",
    attack: "Refusing to issue, renewing, or replacing required regulations for formularies, hospital budgets, claims, long-term care, workforce compensation, or reporting.",
    continuity: "The last lawful rule or a statutory formula default remains operative, with public notice, bounded emergency correction, and later review.",
    check: "NHASB controls the Formula Registry and version history; NHAC checks rights effects; CHAO records executive nonperformance.",
    proof: "Deadline, default version, notice, output, affected population, review status, and correction path are all reproducible."
  },
  {
    title: "Move evidence outside operations",
    controls: "EH-08 and SR-LAW-010",
    summary: "The operator does not control the only record of its own delay, failure, or interference.",
    attack: "Suppressing public reports, blocking performance feeds, erasing staffing or payment delay flags, or preventing independent review.",
    continuity: "Protected reporting duties and evidence feeds continue to CHAO, NHAC, and NHASB according to their separate authorities.",
    check: "Congressional monitoring, independent rights review, scorekeeping, public reporting, complaints, and court records expose conflicting accounts.",
    proof: "At least 99% required publication timeliness, complete event evidence, and no executive or contractor suppression of required performance data."
  },
  {
    title: "Preauthorize operational step-in",
    controls: "EH-09 and EH-12",
    summary: "Critical service does not depend on one vendor, data custodian, compact, region, or always-online system.",
    attack: "Vendor refusal, contract termination, data lockout, system outage, compact breach, or state incapacity that threatens national rights and service.",
    continuity: "Escrow release, portable records, vendor-exit rights, offline operation, continuity contracts, and temporary direct federal administration activate.",
    check: "HCCA exercises downtime and vendor exit; NHASB and CHAO record the trigger, scope, continuity result, cure, and reentry plan.",
    proof: "Tested escrow access, portable records, current exit plans, successful downtime exercises, and a funded step-in path."
  },
  {
    title: "Make obstruction enforceable",
    controls: "EH-08 and EH-11",
    summary: "Standing, fast forums, and explicit remedies turn interference from a political complaint into an actionable legal event.",
    attack: "Delay, unlawful narrowing, impoundment, refusal to pay, suppression, or an attempt to wait out patients and providers through ordinary litigation.",
    continuity: "The narrowest lawful default protects care and payment while the legal or administrative action proceeds.",
    check: "CHAO preserves evidence outside the executive chain; A1-HCAC and district-court routes provide expedited review and enforceable relief.",
    proof: "Action starts within 24 hours of an unlawful delay flag; the record shows authority, duration, affected population, remedy, payment, and final reconciliation."
  }
];

export const ACRONYMS: Record<string, string> = {
  "A1-HCAC": "Article I Health Claims and Appeals Court",
  "DNHA": "Department of National Health Assurance",
  "THDO": "Treasury Health Disbursement Office",
  "NHAC": "National Health Accountability Commission",
  "NHASB": "National Health Adaptation and Scorekeeping Board",
  "CHAO": "Congressional Health Accountability Office",
  "NHTCA": "National Health Transition and Continuity Authority",
  "NHETF": "National Health Equalization Trust Fund",
  "HCCA": "Health Cybersecurity and Continuity Authority",
  "OMB": "Office of Management and Budget",
  "RIF": "Reduction in force",
  "LTC": "Long-term care",
  "TPP": "Technical Performance Parameter",
  "SR": "System requirement",
  "OI": "Open issue",
  "EH": "Executive-hardening control"
};
