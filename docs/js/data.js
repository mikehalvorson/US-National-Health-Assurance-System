/* =========================================================================
 * Data view: framework-grounded information architecture, provider workflow,
 * transfer map, and cyber-continuity controls.
 * ========================================================================= */
"use strict";
(function () {
  function $(id) { return document.getElementById(id); }
  var DATA_PHASES = window.NHA_DATA_PHASES ? window.NHA_DATA_PHASES.phases : [];

  var ACRONYMS = {
    "ACDRH": "Administration for Care Delivery and Regional Health",
    "AHIRC": "Administration for Health Information, Records, and Cybersecurity",
    "AICIO": "Artificial Intelligence Clinical Integration Office",
    "AI": "Artificial Intelligence",
    "AMDDT": "Administration for Medicines, Devices, Diagnostics, and Therapeutics",
    "API": "Application Programming Interface",
    "BH": "Behavioral Health",
    "CHAO": "Congressional Health Accountability Office",
    "CIRBAS": "Clinician Identity and Role-Based Access System",
    "DMRCO": "Data Migration and Records Continuity Office",
    "DNHA": "Department of National Health Assurance",
    "DVH": "Dental, Vision, and Hearing",
    "EHR": "Electronic Health Record",
    "EMS": "Emergency Medical Services",
    "FTE": "Full-Time Equivalent",
    "HCCA": "Health Cybersecurity and Continuity Authority",
    "HIV": "Human Immunodeficiency Virus",
    "HRPO": "Health Rights and Privacy Office",
    "IT": "Information Technology",
    "KPP": "Key Performance Parameter",
    "LDA": "Laboratory and Diagnostics Authority",
    "LTC": "Long-Term Care",
    "NAIG": "National API and Interoperability Gateway",
    "NBIA": "National Biomedical Innovation Agency",
    "NCCA": "National Coverage and Claims Authority",
    "NCDSO": "National Clinical Data Standards Office",
    "NCDTN": "National Community Diagnostic and Treatment Network",
    "NEEA": "National Enrollment and Eligibility Authority",
    "NHAC": "National Health Accountability Commission",
    "NHASB": "National Health Adaptation and Scorekeeping Board",
    "NHIS": "National Health Identifier Service",
    "NHRA": "National Health Records Authority",
    "NHSA": "National Hospital Stewardship Authority",
    "NHTCA": "National Health Transition and Continuity Authority",
    "NHWB": "National Health Workforce Board",
    "NLLHR": "National Longitudinal Health Record",
    "NMPI": "National Master Patient Index",
    "NPSMIB": "National Patient Safety and Medical Injury Board",
    "NRLS": "National Record Locator Service",
    "NSAA": "National Specialty Access Authority",
    "OCDTI": "Office of Community Diagnostic and Treatment Infrastructure",
    "PACP": "Patient Access and Consent Portal",
    "PCU": "National Pharmacy Claims Utility",
    "PMC": "Public Medicines Corporation",
    "PRTO": "Public Reporting and Transparency Office",
    "RHA": "Regional Health Administrators",
    "SRAE": "Secure Research and Analytics Enclave",
    "SR-DATA": "System Requirement - Data",
    "STI": "Sexually Transmitted Infection",
    "SUD": "Substance Use Disorder",
    "THDO": "Treasury Health Disbursement Office",
    "TPP": "Technical Performance Parameter"
  };

  var FIXES = [
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

  var PLANES = [
    ["Identity and authority", "People, providers, facilities, products, programs, credentials, roles, and rule versions.", "Verified keys; effective dates; merge/split correction."],
    ["Operational events", "Eligibility, encounters, results, medications, referrals, claims, payments, appeals, and safety events.", "Event history plus current state; replay cannot create a duplicate event."],
    ["Ledgers and capacity", "Hospital budgets, specialty slots, workforce, inventory, obligations, reserves, and service readiness.", "Reconciled stock and flow; no double booking or hidden offset."],
    ["Assurance and evidence", "Metric observations, audit findings, safety cases, requirement results, and phase-gate packages.", "Immutable lineage and an independent verifier."],
    ["Analytics and research", "Versioned comparator observations, governed queries, evaluation, simulation inputs, and approved outputs.", "Minimum necessary data, disclosure review, uncertainty, and reproducibility."],
    ["Public transparency", "Published metrics, formulas, compact terms, revisions, conflicts, and audit history.", "Approved aggregates, privacy suppression, version history, and accessible definitions."]
  ];

  var STORE_ROWS = [
    ["Identity and coverage", "Person, provider and facility registries; eligibility events; private-plan certification", "Identity evidence, effective dates, authority, notice, and correction"],
    ["Clinical record", "Encounters, orders and results, medication history, care plans, discharge summaries", "Source provenance, clinical status, responsible owner, follow-up due and closed"],
    ["Care routing", "Type A-D unit encounters, referral packets, urgency, specialty capacity, offers and returned plans", "No double-counted slots; lost-to-follow-up is an explicit state"],
    ["Claims and payment", "Medical and pharmacy claims, legal obligations, Treasury disbursement and remittance", "Clinical and financial states are linked but never conflated"],
    ["Hospitals, supply and workforce", "Budgets, service lines, formulary, inventory, manufacturing lots, devices, diagnostics, FTE and training", "Distinct components, product provenance, shortage state, observed versus projected capacity"],
    ["Rights, safety and governance", "Access logs, corrections, appeals, injury events, formulas, requirement results, gates and cyber incidents", "Segmentation, sealed fields, named authority, notice, rollback and remedy"],
    ["Research and public output", "Governed analytic snapshots, approved queries, aggregate metrics, equity strata and revision history", "No raw export from the secure enclave; targets never masquerade as observations"]
  ];

  var CARE_ACTORS = [
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

  var PUBLIC_ACTORS = [
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

  var CYBER_CONTROLS = [
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

  function renderDataPhaseTimeline() {
    var host = $("data-phase-timeline");
    if (!host || !DATA_PHASES.length) return;
    DATA_PHASES.forEach(function (phase) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "phase-node data-phase-node";
      button.style.gridColumn = String(phase.year);
      button.dataset.phaseId = phase.id;
      button.setAttribute("aria-pressed", phase.id === "P0" ? "true" : "false");
      button.setAttribute("aria-label",
        phase.id + ", Year " + phase.year + ": " + phase.title);

      var dot = document.createElement("span");
      dot.className = "phase-node-dot";
      dot.setAttribute("aria-hidden", "true");
      var id = document.createElement("span");
      id.className = "phase-node-phase";
      id.textContent = phase.id;
      var year = document.createElement("span");
      year.className = "phase-node-year";
      year.textContent = "Year " + phase.year;
      button.appendChild(dot); button.appendChild(id); button.appendChild(year);
      button.addEventListener("click", function () { selectDataPhase(phase.id); });
      host.appendChild(button);
    });
    selectDataPhase("P0");
  }

  function selectDataPhase(id) {
    var phase = DATA_PHASES.filter(function (candidate) {
      return candidate.id === id;
    })[0] || DATA_PHASES[0];
    var buttons = $("data-phase-timeline").querySelectorAll(".data-phase-node");
    Array.prototype.forEach.call(buttons, function (button) {
      button.setAttribute("aria-pressed",
        button.dataset.phaseId === phase.id ? "true" : "false");
    });

    var metricCount = 0;
    var derivedCount = 0;
    phase.groups.forEach(function (group) {
      metricCount += group.metrics.length;
      group.metrics.forEach(function (metric) {
        if (metric.basis === "derived") derivedCount += 1;
      });
    });

    var detail = $("data-phase-detail");
    detail.innerHTML = "";
    var head = document.createElement("div");
    head.className = "rollout-detail-head data-phase-detail-head";
    var titleWrap = document.createElement("div");
    var kicker = document.createElement("div");
    kicker.className = "rollout-detail-kicker";
    kicker.textContent = phase.id + " · Year " + phase.year;
    var title = document.createElement("h3");
    title.textContent = phase.title;
    titleWrap.appendChild(kicker); titleWrap.appendChild(title);
    var count = document.createElement("span");
    count.className = "data-phase-count";
    count.textContent = metricCount + " priority measures · " +
      derivedCount + " derived";
    head.appendChild(titleWrap); head.appendChild(count);
    detail.appendChild(head);

    var overview = document.createElement("div");
    overview.className = "data-phase-overview";
    var work = document.createElement("div");
    var summary = document.createElement("p");
    summary.className = "rollout-detail-summary";
    summary.textContent = phase.summary;
    var list = document.createElement("ul");
    phase.work.forEach(function (item) {
      var li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    work.appendChild(summary); work.appendChild(list);
    var scope = document.createElement("div");
    scope.className = "data-phase-scope";
    var scopeTitle = document.createElement("b");
    scopeTitle.textContent = "How to read this phase";
    var scopeText = document.createElement("p");
    scopeText.textContent = phase.id === "P8"
      ? "Targets are controlled national maturity values."
      : "Derived values apply only to the named test, pilot, Wave I, scaled, or national denominator. Framework values remain controlling where shown.";
    var method = document.createElement("a");
    method.href = "https://github.com/mikehalvorson/US-National-Health-Assurance-System/blob/main/research/data_phase_target_methodology.md#" + phase.id.toLowerCase();
    method.target = "_blank";
    method.rel = "noopener";
    method.textContent = "Open this phase's derivation register";
    scope.appendChild(scopeTitle); scope.appendChild(scopeText); scope.appendChild(method);
    overview.appendChild(work); overview.appendChild(scope);
    detail.appendChild(overview);

    var scorecards = document.createElement("div");
    scorecards.className = "data-scorecard-grid";
    phase.groups.forEach(function (group) {
      var section = document.createElement("section");
      section.className = "data-score-section";
      var sectionTitle = document.createElement("h4");
      sectionTitle.textContent = group.section;
      var why = document.createElement("p");
      why.className = "data-score-why";
      why.textContent = group.why;
      section.appendChild(sectionTitle); section.appendChild(why);

      group.metrics.forEach(function (metric) {
        var row = document.createElement("article");
        row.className = "data-target-row";
        var identity = document.createElement("div");
        identity.className = "data-target-identity";
        var metricId = document.createElement("b");
        metricId.textContent = metric.id;
        var basis = document.createElement("span");
        basis.className = "data-basis " + metric.basis;
        basis.textContent = metric.basis === "framework" ? "Framework" : "Derived";
        identity.appendChild(metricId); identity.appendChild(basis);

        var body = document.createElement("div");
        body.className = "data-target-body";
        var name = document.createElement("h5");
        name.textContent = metric.name;
        var target = document.createElement("p");
        target.className = "data-phase-target-value";
        target.textContent = metric.phaseTarget;
        var mature = document.createElement("p");
        mature.className = "data-mature-target";
        mature.textContent = "Mature: " + metric.matureTarget;
        var rationale = document.createElement("details");
        rationale.className = "data-target-rationale";
        var rationaleLabel = document.createElement("summary");
        rationaleLabel.textContent = "Why this value";
        var rationaleText = document.createElement("p");
        rationaleText.textContent = metric.justification;
        rationale.appendChild(rationaleLabel); rationale.appendChild(rationaleText);
        body.appendChild(name); body.appendChild(target); body.appendChild(mature);
        body.appendChild(rationale);
        row.appendChild(identity); row.appendChild(body);
        section.appendChild(row);
      });
      scorecards.appendChild(section);
    });
    detail.appendChild(scorecards);

    var methodology = $("data-methodology-link");
    if (methodology) {
      methodology.href = "https://github.com/mikehalvorson/US-National-Health-Assurance-System/blob/main/research/data_phase_target_methodology.md#" + phase.id.toLowerCase();
    }
    addAcronymHovers(detail);
  }

  function renderFixes() {
    var host = $("data-fixes");
    FIXES.forEach(function (item, index) {
      var row = document.createElement("article");
      row.className = "data-fix-row";
      row.setAttribute(
        "aria-label",
        "Problem: " + item.problem + ". Framework response: " + item.fix + "."
      );

      var problem = document.createElement("div");
      problem.className = "data-fix-side problem";
      var number = document.createElement("span");
      number.className = "data-fix-number";
      number.setAttribute("aria-hidden", "true");
      number.textContent = String(index + 1).padStart(2, "0");
      var problemBody = document.createElement("div");
      var ph = document.createElement("h3");
      ph.textContent = item.problem;
      var pp = document.createElement("p");
      pp.textContent = item.mechanism;
      problemBody.appendChild(ph); problemBody.appendChild(pp);
      problem.appendChild(number); problem.appendChild(problemBody);

      var arrow = document.createElement("div");
      arrow.className = "data-fix-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";

      var fix = document.createElement("div");
      fix.className = "data-fix-side fix";
      var fh = document.createElement("h3");
      fh.textContent = item.fix;
      var fp = document.createElement("p");
      fp.textContent = item.result;
      fix.appendChild(fh); fix.appendChild(fp);

      row.appendChild(problem); row.appendChild(arrow); row.appendChild(fix);
      host.appendChild(row);
    });
  }

  function renderPlanes() {
    var host = $("data-planes");
    PLANES.forEach(function (plane, index) {
      var item = document.createElement("article");
      item.className = "data-plane";
      var num = document.createElement("span");
      num.className = "data-plane-number";
      num.textContent = String(index + 1).padStart(2, "0");
      var title = document.createElement("h3");
      title.textContent = plane[0];
      var body = document.createElement("p");
      body.textContent = plane[1];
      var control = document.createElement("small");
      control.textContent = plane[2];
      item.appendChild(num); item.appendChild(title); item.appendChild(body); item.appendChild(control);
      host.appendChild(item);
    });
  }

  function renderStoreTable() {
    var table = $("data-store-table");
    var thead = table.createTHead();
    var head = thead.insertRow();
    ["Domain", "Representative records", "What makes them safe and usable"].forEach(function (label) {
      var th = document.createElement("th");
      th.scope = "col";
      th.textContent = label;
      head.appendChild(th);
    });
    var body = table.createTBody();
    STORE_ROWS.forEach(function (values) {
      var row = body.insertRow();
      values.forEach(function (value, index) {
        var cell = index === 0 ? document.createElement("th") : document.createElement("td");
        if (index === 0) cell.scope = "row";
        cell.textContent = value;
        row.appendChild(cell);
      });
    });
  }

  function buildMapColumn(title, subtitle, actors, side) {
    var column = document.createElement("section");
    column.className = "data-map-column data-map-" + side;
    var heading = document.createElement("div");
    heading.className = "data-map-column-head";
    var h3 = document.createElement("h3");
    h3.textContent = title;
    var p = document.createElement("p");
    p.textContent = subtitle;
    heading.appendChild(h3); heading.appendChild(p);
    column.appendChild(heading);

    actors.forEach(function (actor) {
      var item = document.createElement("article");
      item.className = "data-map-entity data-map-entity-" + side;
      var code = document.createElement("span");
      code.className = "data-map-code";
      code.textContent = actor.code;
      var name = document.createElement("h4");
      name.textContent = actor.name;
      var sends = document.createElement("p");
      var sendsLabel = document.createElement("b");
      sendsLabel.textContent = "Sends: ";
      sends.appendChild(sendsLabel);
      sends.appendChild(document.createTextNode(actor.sends));
      var receives = document.createElement("p");
      var receivesLabel = document.createElement("b");
      receivesLabel.textContent = "Receives: ";
      receives.appendChild(receivesLabel);
      receives.appendChild(document.createTextNode(actor.receives));
      item.appendChild(code); item.appendChild(name); item.appendChild(sends); item.appendChild(receives);
      column.appendChild(item);
    });
    return column;
  }

  function buildMeshCore() {
    var core = document.createElement("section");
    core.className = "data-mesh-core";
    var kicker = document.createElement("span");
    kicker.className = "data-kicker";
    kicker.textContent = "AHIRC / NHRA shared national coordination layer";
    var title = document.createElement("h3");
    title.textContent = "National Health Assurance Information Mesh";
    var note = document.createElement("p");
    note.className = "data-mesh-note";
    note.textContent = "A governed longitudinal view over distributed, attributable source records.";
    core.appendChild(kicker); core.appendChild(title); core.appendChild(note);

    [
      ["NHIS / NMPI", "Health identity and person matching"],
      ["NRLS / NLLHR", "Record locator and longitudinal view"],
      ["NCDSO / NAIG", "Clinical standards and certified API gateway"],
      ["CIRBAS", "Clinician identity, credentials and role access"],
      ["PACP / HRPO", "Patient access, consent, correction and audit"],
      ["AICIO", "AI registry, validation, decision logs and suspension"],
      ["HCCA", "Cyber defense, continuity, failover and recovery"]
    ].forEach(function (service) {
      var item = document.createElement("div");
      item.className = "data-mesh-service";
      var b = document.createElement("b");
      b.textContent = service[0];
      var span = document.createElement("span");
      span.textContent = service[1];
      item.appendChild(b); item.appendChild(span);
      core.appendChild(item);
    });

    var boundary = document.createElement("p");
    boundary.className = "data-mesh-boundary";
    boundary.textContent = "Common identity + provenance + purpose-bound access + correction + conformance + audit";
    core.appendChild(boundary);
    return core;
  }

  function renderTransferMap() {
    var host = $("data-transfer-map");
    host.appendChild(buildMeshCore());
    host.appendChild(buildMapColumn(
      "Care delivery and people",
      "Person-level clinical and service events",
      CARE_ACTORS,
      "care"
    ));
    host.appendChild(buildMapColumn(
      "Public operations and assurance",
      "Payment, capacity, rights, evidence, and governed reuse",
      PUBLIC_ACTORS,
      "public"
    ));
  }

  function renderCyberControls() {
    var host = $("cyber-controls");
    CYBER_CONTROLS.forEach(function (control, index) {
      var item = document.createElement("article");
      item.className = "cyber-control";
      var number = document.createElement("span");
      number.textContent = String(index + 1).padStart(2, "0");
      var body = document.createElement("div");
      var title = document.createElement("h3");
      title.textContent = control[0];
      var p = document.createElement("p");
      p.textContent = control[1];
      body.appendChild(title); body.appendChild(p);
      item.appendChild(number); item.appendChild(body);
      host.appendChild(item);
    });
  }

  function addAcronymHovers(root) {
    root = root || $("view-data");
    var keys = Object.keys(ACRONYMS).sort(function (a, b) { return b.length - a.length; });
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
        abbr.className = "data-acronym";
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

  renderDataPhaseTimeline();
  renderFixes();
  renderPlanes();
  renderStoreTable();
  renderTransferMap();
  renderCyberControls();
  addAcronymHovers();
})();
