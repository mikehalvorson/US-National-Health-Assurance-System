/* =========================================================================
 * Phased rollout view: Framework v2.0.0 Tables D5C6A-14, D5C6A-18,
 * D5C6A-21, and D6B-15.
 * ========================================================================= */
"use strict";
(function () {
  var NHA = window.NHA || {};
  window.NHA = NHA;

  function $(id) { return document.getElementById(id); }

  var PHASES = [
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

  var DOMAINS = [
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

  var GATES = [
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

  var AGENCIES = [
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

  var WORKSTREAMS = [
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

  function renderTimeline() {
    var host = $("rollout-timeline");
    if (!host) return;
    PHASES.forEach(function (phase) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "phase-node";
      btn.style.gridColumn = String(phase.year);
      btn.setAttribute("aria-pressed", phase.id === "P0" ? "true" : "false");
      btn.setAttribute("aria-label", phase.id + ", Year " + phase.year + ": " + phase.title);

      var dot = document.createElement("span");
      dot.className = "phase-node-dot";
      dot.setAttribute("aria-hidden", "true");
      var id = document.createElement("span");
      id.className = "phase-node-phase";
      id.textContent = phase.id;
      var year = document.createElement("span");
      year.className = "phase-node-year";
      year.textContent = "Year " + phase.year;
      btn.appendChild(dot);
      btn.appendChild(id);
      btn.appendChild(year);
      btn.addEventListener("click", function () { selectPhase(phase.id); });
      host.appendChild(btn);
    });
    selectPhase("P0");
  }

  function selectPhase(id) {
    var phase = PHASES.filter(function (p) { return p.id === id; })[0] || PHASES[0];
    var buttons = $("rollout-timeline").querySelectorAll(".phase-node");
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.setAttribute("aria-pressed",
        btn.getAttribute("aria-label").indexOf(phase.id + ",") === 0 ? "true" : "false");
    });

    var detail = $("rollout-detail");
    detail.innerHTML = "";
    var head = document.createElement("div");
    head.className = "rollout-detail-head";
    var titleWrap = document.createElement("div");
    var kicker = document.createElement("div");
    kicker.className = "rollout-detail-kicker";
    kicker.textContent = phase.id + " · Year " + phase.year;
    var h3 = document.createElement("h3");
    h3.textContent = phase.title;
    titleWrap.appendChild(kicker);
    titleWrap.appendChild(h3);
    head.appendChild(titleWrap);
    detail.appendChild(head);

    var grid = document.createElement("div");
    grid.className = "rollout-detail-grid";
    var main = document.createElement("div");
    var summary = document.createElement("p");
    summary.className = "rollout-detail-summary";
    summary.textContent = phase.summary;
    var ul = document.createElement("ul");
    phase.work.forEach(function (item) {
      var li = document.createElement("li");
      li.textContent = item;
      ul.appendChild(li);
    });
    main.appendChild(summary);
    main.appendChild(ul);
    var evidence = document.createElement("div");
    evidence.className = "rollout-evidence";
    var eb = document.createElement("b");
    eb.textContent = "Exit evidence";
    var et = document.createElement("span");
    et.textContent = phase.evidence;
    evidence.appendChild(eb);
    evidence.appendChild(et);
    grid.appendChild(main);
    grid.appendChild(evidence);
    detail.appendChild(grid);
  }

  function renderDomainMatrix() {
    var table = $("rollout-domain-matrix");
    if (!table) return;
    var bands = [
      ["P0–P1", "Foundation"],
      ["P2–P3", "First operation"],
      ["P4–P5", "Pilots and scale"],
      ["P6–P7", "National and benefits"],
      ["P8", "Maturity"]
    ];
    var thead = table.createTHead();
    var row = thead.insertRow();
    var domainHead = document.createElement("th");
    domainHead.scope = "col";
    domainHead.textContent = "Domain";
    row.appendChild(domainHead);
    bands.forEach(function (band) {
      var th = document.createElement("th");
      th.scope = "col";
      var p = document.createElement("span");
      p.className = "phase-band";
      p.textContent = band[0];
      th.appendChild(p);
      th.appendChild(document.createTextNode(band[1]));
      row.appendChild(th);
    });
    var tbody = table.createTBody();
    DOMAINS.forEach(function (domain) {
      var tr = tbody.insertRow();
      var th = document.createElement("th");
      th.scope = "row";
      th.textContent = domain[0];
      tr.appendChild(th);
      domain.slice(1).forEach(function (text) {
        var td = tr.insertCell();
        td.textContent = text;
      });
    });
  }

  function renderBuildouts() {
    var ramp = $("unit-ramp");
    var chart = document.createElement("div");
    chart.className = "unit-ramp-chart";
    [
      { value: "Plan", label: "standards, siting, workforce, prototypes", phase: "P0–P3", level: "24%", qual: true },
      { value: "Pilot", label: "all four unit types in representative regions", phase: "P4", level: "34%", qual: true },
      { value: "≥65%", label: "population coverage by phase end", phase: "P5", level: "65%" },
      { value: "≥80%", label: "Gate 2 floor before broad $0 care", phase: "P6", level: "80%" },
      { value: "≥95%", label: "within access-time standard", phase: "P8", level: "95%" }
    ].forEach(function (step) {
      var el = document.createElement("div");
      el.className = "unit-ramp-step" + (step.qual ? " qualitative" : "");
      el.style.setProperty("--level", step.level);
      var value = document.createElement("div");
      value.className = "unit-ramp-value";
      value.textContent = step.value;
      var label = document.createElement("div");
      label.className = "unit-ramp-label";
      label.textContent = step.label;
      var phase = document.createElement("div");
      phase.className = "unit-ramp-phase";
      phase.textContent = step.phase;
      el.appendChild(value);
      el.appendChild(label);
      el.appendChild(phase);
      chart.appendChild(el);
    });
    ramp.appendChild(chart);

    var pipeline = $("drug-pipeline");
    [
      ["P0–P1", "Authority and supply baseline", "Formulary, products, suppliers, purchasing authority, and shortage map"],
      ["P2", "First operation", "Public claims utility, national purchasing, PBM replacement, and PMC Phase I"],
      ["P3–P5", "Portfolio and continuity scale", "Onboard pharmacies; qualify suppliers; expand shortage controls and production"],
      ["P6–P7", "National access", "National formulary access, production capacity, inventory visibility, and backup supply"],
      ["P8", "Mature capability", "Public manufacturing, lifecycle evaluation, dual sourcing, and secure inputs"]
    ].forEach(function (stage) {
      var row = document.createElement("div");
      row.className = "drug-stage";
      var phase = document.createElement("div");
      phase.className = "drug-stage-phase";
      phase.textContent = stage[0];
      var body = document.createElement("div");
      var b = document.createElement("b");
      b.textContent = stage[1];
      var span = document.createElement("span");
      span.textContent = stage[2];
      body.appendChild(b);
      body.appendChild(span);
      row.appendChild(phase);
      row.appendChild(body);
      pipeline.appendChild(row);
    });
  }

  function renderAgencies() {
    var host = $("rollout-agencies");
    AGENCIES.forEach(function (group) {
      var section = document.createElement("section");
      section.className = "agency-group";
      section.style.setProperty("--agency-color", group.color);
      var h3 = document.createElement("h3");
      h3.textContent = group.title;
      var desc = document.createElement("p");
      desc.textContent = group.desc;
      var ul = document.createElement("ul");
      ul.className = "agency-list";
      group.items.forEach(function (item) {
        var li = document.createElement("li");
        var code = document.createElement("span");
        code.className = "agency-code";
        code.textContent = item[0];
        var text = document.createElement("span");
        text.textContent = item[1];
        li.appendChild(code);
        li.appendChild(text);
        ul.appendChild(li);
      });
      section.appendChild(h3);
      section.appendChild(desc);
      section.appendChild(ul);
      host.appendChild(section);
    });
  }

  function renderGates() {
    var host = $("rollout-gates");
    GATES.forEach(function (gate) {
      var item = document.createElement("article");
      item.className = "gate-item";
      var number = document.createElement("div");
      number.className = "gate-number";
      number.textContent = gate.n;
      var body = document.createElement("div");
      var h3 = document.createElement("h3");
      h3.textContent = gate.title;
      var when = document.createElement("div");
      when.className = "gate-when";
      when.textContent = gate.when;
      var floor = document.createElement("p");
      floor.textContent = gate.floor;
      var fallback = document.createElement("p");
      fallback.className = "gate-fallback";
      fallback.textContent = "If not ready: " + gate.fallback;
      body.appendChild(h3);
      body.appendChild(when);
      body.appendChild(floor);
      body.appendChild(fallback);
      item.appendChild(number);
      item.appendChild(body);
      host.appendChild(item);
    });
  }

  function renderWorkstreams() {
    var host = $("rollout-workstreams");
    WORKSTREAMS.forEach(function (stream) {
      var item = document.createElement("div");
      item.className = "workstream-item";
      var id = document.createElement("div");
      id.className = "workstream-id";
      id.textContent = stream[0];
      var body = document.createElement("div");
      var b = document.createElement("b");
      b.textContent = stream[1];
      var span = document.createElement("span");
      span.textContent = stream[2];
      body.appendChild(b);
      body.appendChild(span);
      item.appendChild(id);
      item.appendChild(body);
      host.appendChild(item);
    });
  }

  renderTimeline();
  renderDomainMatrix();
  renderBuildouts();
  renderAgencies();
  renderGates();
  renderWorkstreams();
})();
