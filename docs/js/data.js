/* =========================================================================
 * Data view: framework-grounded information architecture, provider workflow,
 * transfer map, and cyber-continuity controls.
 * ========================================================================= */
"use strict";
(function () {
  function $(id) { return document.getElementById(id); }

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

  function renderFixes() {
    var host = $("data-fixes");
    FIXES.forEach(function (item) {
      var row = document.createElement("article");
      row.className = "data-fix-row";

      var problem = document.createElement("div");
      problem.className = "data-fix-side problem";
      var pk = document.createElement("span");
      pk.className = "data-kicker";
      pk.textContent = "Current failure";
      var ph = document.createElement("h3");
      ph.textContent = item.problem;
      var pp = document.createElement("p");
      pp.textContent = item.mechanism;
      problem.appendChild(pk); problem.appendChild(ph); problem.appendChild(pp);

      var arrow = document.createElement("div");
      arrow.className = "data-fix-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";

      var fix = document.createElement("div");
      fix.className = "data-fix-side fix";
      var fk = document.createElement("span");
      fk.className = "data-kicker";
      fk.textContent = "Framework control";
      var fh = document.createElement("h3");
      fh.textContent = item.fix;
      var fp = document.createElement("p");
      fp.textContent = item.result;
      fix.appendChild(fk); fix.appendChild(fh); fix.appendChild(fp);

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

  renderFixes();
  renderPlanes();
  renderStoreTable();
  renderTransferMap();
  renderCyberControls();
})();
