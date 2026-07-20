/* =========================================================================
 * Workforce view: controlled framework targets plus transparent derived
 * planning cases for administrative displacement, internal role matching,
 * a quantified new-position floor, and rural flex staffing.
 * ========================================================================= */
"use strict";
(function () {
  var NHA = window.NHA = window.NHA || {};
  function $(id) { return document.getElementById(id); }

  var ROLLOUT_YEARS = 12;
  var TOTAL_US_EMPLOYMENT_2024 = 169956100;
  var ANNUAL_TRAINING_TARGET = 55000;
  var DIRECT_PATIENT_CARE_PHYSICIANS = 866460;
  var PRIOR_AUTH_HOURS_PER_WEEK = 13;

  var SCENARIOS = {
    low: {
      label: "Lower exposure",
      eliminated: 560,
      inside: 270,
      supported: 420,
      created: 390
    },
    plan: {
      label: "Planning case",
      eliminated: 760,
      inside: 360,
      supported: 570,
      created: 510
    },
    high: {
      label: "Stress case",
      eliminated: 1000,
      inside: 460,
      supported: 750,
      created: 650
    }
  };

  var LEGACY = [
    {
      id: "insurer",
      name: "Private insurer claims, enrollment, and network administration",
      values: { low: 225, plan: 305, high: 400 },
      inside: { low: 130, plan: 170, high: 220 },
      reason: "One public coverage and payment architecture removes duplicated plan enrollment, network, utilization, and claims operations. Functions needed for payment integrity and service continuity remain.",
      destinations: "Public enrollment and eligibility, payment operations, provider reconciliation, patient navigation, appeals support, fraud control, and transition-wave operations.",
      boundary: "The 611,100-job BLS direct-health-insurer industry is the anchor. The model applies functional exposure shares; it does not assume every insurer employee disappears.",
      evidence: "Planning exposure: 50% of the BLS industry anchor, rounded. Confidence: Medium because the public system keeps many payment, integrity, and service functions but removes payer duplication.",
      continues: "Provider payment, reconciliation, program integrity, complex-case review, enrollment correction, appeals, navigation, and continuity operations."
    },
    {
      id: "provider",
      name: "Provider billing, prior authorization, and revenue-cycle administration",
      values: { low: 170, plan: 235, high: 310 },
      inside: { low: 80, plan: 110, high: 145 },
      reason: "Zero point-of-care billing, standardized public payment, global hospital budgets, and removal of routine insurer prior authorization sharply reduce collection, coding-for-payment, denial, and appeal work.",
      destinations: "Care navigation, referral-packet completion, data quality, records correction, care coordination, provider-payment reconciliation, and patient-rights support.",
      boundary: "BLS counted 417,500 billing and posting clerks across all industries in May 2024. The model uses only a health-function share and keeps medical-records work out of the eliminated total.",
      evidence: "Planning exposure: 56% of the broad BLS occupation anchor, rounded. Confidence: Medium. The AMA's prior-authorization survey supports a large burden, but its 13 weekly hours measure physician and staff time, not a separate job count.",
      continues: "Clinical records, care coding, quality reporting, payment reconciliation, unusual-case review, referral completion, and patient-rights work."
    },
    {
      id: "pbm",
      name: "PBM rebate, formulary, spread-pricing, and purchasing middlemen",
      values: { low: 60, plan: 90, high: 120 },
      inside: { low: 25, plan: 40, high: 55 },
      reason: "A public pharmacy claims utility, national purchasing, transparent formulary rules, and public production remove rebate negotiation, spread pricing, and duplicative benefit management.",
      destinations: "Public medicines procurement, formulary evidence, pharmacy onboarding, inventory visibility, shortage response, quality release, and supply-chain operations.",
      boundary: "No official occupation table isolates PBM employment. This is a scenario slice of broader insurance-related and pharmacy-administration work, not a measured PBM headcount.",
      evidence: "Planning exposure: 24% of a 382,600-job other-insurance-related anchor. Confidence: Low. The FTC reports that the six largest PBMs manage nearly 95% of U.S. prescriptions, establishing concentration and functional reach, not employment.",
      continues: "Pharmacy claims, formulary evidence, utilization safety, procurement, quality release, inventory visibility, specialty-drug handling, and shortage response."
    },
    {
      id: "broker",
      name: "Health-benefit brokerage and employer plan administration",
      values: { low: 55, plan: 70, high: 90 },
      inside: { low: 20, plan: 22, high: 22 },
      reason: "Automatic public coverage removes annual plan shopping, benefit design, carrier bidding, and much of employer enrollment administration.",
      destinations: "Employer/payroll conversion, wage-pass-through compliance, outreach, eligibility support, service navigation, and transition communications.",
      boundary: "The BLS insurance-brokerage industry includes many non-health lines. The model applies a small health-benefit exposure share and does not count the whole industry.",
      evidence: "Planning exposure: 7% of the 1,003,900-job insurance-brokerage industry anchor. Confidence: Low because BLS does not isolate health-benefit brokerage or employer benefits staff.",
      continues: "Temporary payroll conversion, wage-pass-through compliance, worker outreach, eligibility correction, service navigation, and supplemental non-health advice."
    },
    {
      id: "vendor",
      name: "Duplicative clearinghouse, contractor, and vendor-management work",
      values: { low: 50, plan: 60, high: 80 },
      inside: { low: 15, plan: 18, high: 18 },
      reason: "Common interfaces, public rails, portable records, source-code escrow, and fewer payer-specific contracts reduce redundant transaction routing and contract administration.",
      destinations: "Cybersecurity, conformance testing, configuration control, procurement, audit, vendor exit, continuity, and public reporting.",
      boundary: "This category is a residual planning allowance. It is kept separate and low-confidence because national vendor employment overlaps other industry and occupation counts.",
      evidence: "Planning allowance: 60,000. Confidence: Low. No non-overlapping national series separates payer-specific clearinghouse and contractor work from insurance, technology, and consulting employment.",
      continues: "Interoperability, cybersecurity, procurement, audit, configuration control, uptime, data exchange, vendor exit, and disaster recovery."
    }
  ];

  var CREATED = [
    {
      id: "units",
      name: "Diagnostic-treatment unit teams",
      values: { low: 112, plan: 138, high: 175 },
      fills: { low: 40, plan: 30, high: 45 },
      derivation: "Planning case: the 15,000-unit specification multiplied by the existing unit model's 9.2-FTE mix-weighted average, rounded. The high case moves toward the need-based 24,099-unit allocation but assumes substantial conversion of existing sites.",
      roles: "Nurses, NPs/PAs, physicians, technicians, imaging/lab staff, behavioral-health staff, community health workers, navigators, and unit operations.",
      confidence: "Medium-Low"
    },
    {
      id: "public",
      name: "Public enrollment, payment, rights, and transition operations",
      values: { low: 145, plan: 180, high: 220 },
      fills: { low: 130, plan: 180, high: 220 },
      derivation: "Retains the necessary share of today's enrollment, claims/payment, provider reconciliation, appeals, navigation, employer conversion, and continuity workload while removing duplicated payer-specific work.",
      roles: "Eligibility, payment operations, provider support, appeals casework, navigation, ombuds services, employer/payroll conversion, and legacy wind-down.",
      confidence: "Medium-Low"
    },
    {
      id: "data",
      name: "Data, cyber, records, analytics, and conformance",
      values: { low: 50, plan: 70, high: 90 },
      fills: { low: 45, plan: 70, high: 90 },
      derivation: "A national data mesh, protected audit feeds, identity services, records migration, interoperability testing, cybersecurity operations, and offline continuity require durable technical and operational teams.",
      roles: "Data quality, privacy, security operations, engineering, records correction, identity, analytics, audit evidence, conformance, and incident recovery.",
      confidence: "Low"
    },
    {
      id: "medicines",
      name: "Medicines, diagnostics, procurement, and supply operations",
      values: { low: 30, plan: 40, high: 55 },
      fills: { low: 30, plan: 40, high: 55 },
      derivation: "A planning allowance for the Public Medicines Corporation, national purchasing, pharmacy utility, diagnostic/device procurement, batch quality, inventory visibility, and shortage response. Exact plant and product-family staffing remains uncalibrated.",
      roles: "Procurement, pharmacy operations, manufacturing support, quality, logistics, inventory, shortage response, supplier assurance, and diagnostics.",
      confidence: "Low"
    },
    {
      id: "rural",
      name: "Rural flex and rotating travel workforce",
      values: { low: 20, plan: 30, high: 45 },
      fills: { low: 0, plan: 0, high: 0 },
      derivation: "A derived regional relief pool for vacancy coverage, protected leave, training backfill, seasonal demand, and surge. The adopted role-region safe-FTE formula must replace this national placeholder.",
      roles: "Travel nurses, paramedics, respiratory therapists, imaging/lab technicians, pharmacists, behavioral-health clinicians, and short-term supervisory support.",
      confidence: "Low"
    },
    {
      id: "education",
      name: "Education, faculty, and training support",
      values: { low: 8, plan: 11, high: 15 },
      fills: { low: 0, plan: 0, high: 0 },
      derivation: "Planning case: one faculty, preceptor, placement, or program-support FTE for roughly every five of the plan's 55,000 annual publicly funded training slots.",
      roles: "Faculty, preceptors, simulation staff, program operations, rural placement, credential support, learner services, and continuing education.",
      confidence: "Low"
    },
    {
      id: "assurance",
      name: "Regional operations, assurance, and public-health support",
      values: { low: 25, plan: 41, high: 50 },
      fills: { low: 25, plan: 40, high: 50 },
      derivation: "A planning allowance for role-region workforce boards, scope and compensation operations, independent verification, safety and equity review, regional coordination, and workforce performance reporting.",
      roles: "Workforce planning, compensation and scope administration, verification, audit, safety, equity, regional coordination, public reporting, and corrective action.",
      confidence: "Low"
    }
  ];

  var ACRONYMS = {
    "AHWCS": "Administration for Health Workforce, Compensation, and Scope",
    "NHWB": "National Health Workforce Board",
    "NPCB": "National Physician Compensation Board",
    "NCSWB": "National Clinical Scope and Workforce Board",
    "NHWECA": "National Health Workforce Education and Capacity Authority",
    "RS-CORPS": "Rural Service Corps",
    "HATC": "Health Administration Transition Corps",
    "BLS": "Bureau of Labor Statistics",
    "PBM": "Pharmacy Benefit Manager",
    "FTE": "Full-Time Equivalent",
    "RN": "Registered Nurse",
    "LPN": "Licensed Practical Nurse",
    "EMS": "Emergency Medical Services",
    "LTC": "Long-Term Care",
    "DVH": "Dental, Vision, and Hearing",
    "AI": "Artificial Intelligence",
    "ICU": "Intensive Care Unit"
  };

  var activeScenario = "plan";
  var selectedLegacy = "insurer";
  var selectedCreated = "units";
  var numberFormat = new Intl.NumberFormat("en-US");

  function fmtThousands(value) {
    return numberFormat.format(value * 1000);
  }

  function fmtShort(value) {
    return numberFormat.format(value) + "k";
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
        abbr.className = "workforce-acronym";
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

  function setBar(id, value, denominator) {
    var bar = $(id);
    if (!bar) return;
    bar.style.width = Math.max(2, Math.min(100, value / denominator * 100)) + "%";
  }

  function renderFlow() {
    var scenario = SCENARIOS[activeScenario];
    var external = scenario.supported - scenario.inside;
    var gap = scenario.eliminated - scenario.supported;
    var entrants = scenario.created - scenario.inside;
    var annualEntrants = Math.round(entrants * 1000 / ROLLOUT_YEARS);
    var scopedDifference = scenario.eliminated - scenario.created;
    var employmentShare = entrants * 1000 / TOTAL_US_EMPLOYMENT_2024 * 100;
    var transitionShare = scenario.inside / scenario.created * 100;
    var trainingRatio = ANNUAL_TRAINING_TARGET / annualEntrants;

    $("wf-eliminated").textContent = fmtThousands(scenario.eliminated);
    $("wf-inside").textContent = fmtThousands(scenario.inside);
    $("wf-supported").textContent = fmtThousands(scenario.supported);
    $("wf-created").textContent = fmtThousands(scenario.created);
    $("wf-new-hires").textContent = fmtThousands(entrants);
    $("wf-ledger-transfer").textContent = fmtThousands(scenario.inside) + " skills matches";

    $("wf-reconcile-created").textContent = fmtThousands(scenario.created);
    $("wf-reconcile-inside").textContent = fmtThousands(scenario.inside);
    $("wf-reconcile-entrants").textContent = fmtThousands(entrants);
    $("wf-scope-eliminated").textContent = fmtThousands(scenario.eliminated);
    $("wf-scope-created").textContent = fmtThousands(scenario.created);
    $("wf-scope-difference").textContent = fmtThousands(Math.abs(scopedDifference));

    $("wf-labor-entrants").textContent = fmtThousands(entrants);
    $("wf-labor-annual").textContent = numberFormat.format(annualEntrants) + "/year";
    $("wf-labor-share").textContent = employmentShare.toFixed(2) + "%";
    $("wf-labor-transition").textContent = Math.round(transitionShare) + "%";
    $("wf-training-ratio").textContent = trainingRatio.toFixed(1) + "\u00d7";
    $("wf-table-annual").textContent = numberFormat.format(annualEntrants);

    $("wf-flow-eliminated").textContent = fmtShort(scenario.eliminated);
    $("wf-flow-inside").textContent = fmtShort(scenario.inside);
    $("wf-flow-external").textContent = fmtShort(external);
    $("wf-flow-gap").textContent = fmtShort(gap);

    setBar("wf-flow-eliminated-bar", scenario.eliminated, 1000);
    setBar("wf-flow-inside-bar", scenario.inside, scenario.eliminated);
    setBar("wf-flow-external-bar", external, scenario.eliminated);
    setBar("wf-flow-gap-bar", gap, scenario.eliminated);
  }

  function renderLegacyDetail(id) {
    var item = LEGACY.filter(function (entry) { return entry.id === id; })[0];
    if (!item) return;
    selectedLegacy = id;
    var host = $("workforce-legacy-detail");
    var eliminated = item.values[activeScenario];
    var inside = item.inside[activeScenario];
    var buttons = $("workforce-legacy-list").querySelectorAll("button");
    buttons.forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.legacyId === id ? "true" : "false");
    });

    host.textContent = "";
    var kicker = document.createElement("span");
    kicker.className = "workforce-section-label";
    kicker.textContent = fmtShort(eliminated) + " eliminated / " +
      fmtShort(inside) + " internal matches";
    var title = document.createElement("h3");
    title.textContent = item.name;
    var reason = document.createElement("p");
    reason.textContent = item.reason;
    var destination = document.createElement("div");
    destination.className = "workforce-legacy-field";
    var dHead = document.createElement("strong");
    dHead.textContent = "Likely destinations";
    var dBody = document.createElement("p");
    dBody.textContent = item.destinations;
    destination.appendChild(dHead);
    destination.appendChild(dBody);
    var boundary = document.createElement("div");
    boundary.className = "workforce-legacy-field";
    var bHead = document.createElement("strong");
    bHead.textContent = "Counting boundary";
    var bBody = document.createElement("p");
    bBody.textContent = item.boundary;
    boundary.appendChild(bHead);
    boundary.appendChild(bBody);

    var evidence = document.createElement("div");
    evidence.className = "workforce-legacy-field";
    var eHead = document.createElement("strong");
    eHead.textContent = "Evidence and confidence";
    var eBody = document.createElement("p");
    eBody.textContent = item.evidence;
    evidence.appendChild(eHead);
    evidence.appendChild(eBody);

    var continuing = document.createElement("div");
    continuing.className = "workforce-legacy-field";
    var cHead = document.createElement("strong");
    cHead.textContent = "Work that continues";
    var cBody = document.createElement("p");
    cBody.textContent = item.continues;
    continuing.appendChild(cHead);
    continuing.appendChild(cBody);

    host.appendChild(kicker);
    host.appendChild(title);
    host.appendChild(reason);
    host.appendChild(destination);
    host.appendChild(boundary);
    host.appendChild(evidence);
    host.appendChild(continuing);
    addAcronymHovers(host);
  }

  function renderLegacyList() {
    var host = $("workforce-legacy-list");
    var scenario = SCENARIOS[activeScenario];
    host.textContent = "";

    LEGACY.forEach(function (item) {
      var value = item.values[activeScenario];
      var inside = item.inside[activeScenario];
      var button = document.createElement("button");
      button.type = "button";
      button.className = "workforce-legacy-row";
      button.dataset.legacyId = item.id;
      button.setAttribute("aria-pressed", item.id === selectedLegacy ? "true" : "false");

      var top = document.createElement("span");
      top.className = "workforce-legacy-row-top";
      var name = document.createElement("strong");
      name.textContent = item.name;
      var count = document.createElement("b");
      count.textContent = fmtShort(value);
      top.appendChild(name);
      top.appendChild(count);

      var track = document.createElement("span");
      track.className = "workforce-row-track";
      var fill = document.createElement("i");
      fill.style.width = Math.max(4, value / scenario.eliminated * 100) + "%";
      track.appendChild(fill);

      var foot = document.createElement("small");
      foot.textContent = fmtShort(inside) + " could match new-system roles";
      button.appendChild(top);
      button.appendChild(track);
      button.appendChild(foot);
      button.addEventListener("click", function () {
        renderLegacyDetail(item.id);
      });
      host.appendChild(button);
    });
    addAcronymHovers(host);
    renderLegacyDetail(selectedLegacy);
  }

  function renderCreatedChart() {
    var host = $("workforce-created-chart");
    var maxValue = Math.max.apply(null, CREATED.map(function (item) {
      return item.values[activeScenario];
    }));
    host.textContent = "";

    CREATED.forEach(function (item) {
      var value = item.values[activeScenario];
      var fill = item.fills[activeScenario];
      var wrap = document.createElement("div");
      wrap.className = "workforce-created-item";

      var button = document.createElement("button");
      button.type = "button";
      button.className = "workforce-created-row";
      button.setAttribute("aria-expanded", item.id === selectedCreated ? "true" : "false");
      var label = document.createElement("span");
      label.textContent = item.name;
      var track = document.createElement("span");
      track.className = "workforce-created-track";
      var transitioned = document.createElement("i");
      transitioned.className = "transitioned";
      transitioned.style.width = value ? (fill / value * 100) + "%" : "0";
      var entrants = document.createElement("i");
      entrants.className = "entrants";
      entrants.style.width = value ? ((value - fill) / value * 100) + "%" : "0";
      track.style.width = Math.max(8, value / maxValue * 100) + "%";
      track.appendChild(transitioned);
      track.appendChild(entrants);
      var count = document.createElement("strong");
      count.textContent = fmtShort(value);
      button.appendChild(label);
      button.appendChild(track);
      button.appendChild(count);

      var detail = document.createElement("div");
      detail.className = "workforce-created-detail";
      detail.hidden = item.id !== selectedCreated;
      var dText = document.createElement("p");
      dText.textContent = item.derivation;
      var dRoles = document.createElement("p");
      dRoles.innerHTML = "<strong>Roles:</strong> " + item.roles;
      var dFill = document.createElement("small");
      dFill.textContent = fmtShort(fill) + " positions modeled as fillable by displaced workers; " +
        fmtShort(value - fill) + " require other entrants. Confidence: " +
        item.confidence + ".";
      detail.appendChild(dText);
      detail.appendChild(dRoles);
      detail.appendChild(dFill);

      button.addEventListener("click", function () {
        selectedCreated = item.id;
        renderCreatedChart();
      });
      wrap.appendChild(button);
      wrap.appendChild(detail);
      host.appendChild(wrap);
    });

    var legend = document.createElement("div");
    legend.className = "workforce-created-legend";
    legend.innerHTML =
      "<span><i class=\"transitioned\"></i> fillable by displaced workers</span>" +
      "<span><i class=\"entrants\"></i> clinicians, technicians, graduates, or other entrants</span>";
    host.appendChild(legend);
    addAcronymHovers(host);
  }

  function setScenario(id) {
    if (!SCENARIOS[id]) return;
    activeScenario = id;
    document.querySelectorAll("[data-wf-scenario]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.wfScenario === id ? "true" : "false");
    });
    renderFlow();
    renderLegacyList();
    renderCreatedChart();
  }

  function sumForScenario(items, field, scenarioId) {
    return items.reduce(function (total, item) {
      return total + item[field][scenarioId];
    }, 0);
  }

  NHA.WORKFORCE_MODEL = {
    scenarios: SCENARIOS,
    legacy: LEGACY,
    created: CREATED,
    rolloutYears: ROLLOUT_YEARS,
    totalEmployment2024: TOTAL_US_EMPLOYMENT_2024,
    annualTrainingTarget: ANNUAL_TRAINING_TARGET
  };

  NHA.SELFTESTS = NHA.SELFTESTS || [];
  NHA.SELFTESTS.push({
    name: "Workforce: scenario job ledgers reconcile",
    run: function () {
      return Object.keys(SCENARIOS).every(function (scenarioId) {
        var scenario = SCENARIOS[scenarioId];
        return sumForScenario(LEGACY, "values", scenarioId) === scenario.eliminated &&
          sumForScenario(CREATED, "values", scenarioId) === scenario.created &&
          sumForScenario(CREATED, "fills", scenarioId) === scenario.inside &&
          scenario.supported === scenario.eliminated * 0.75;
      });
    }
  });
  NHA.SELFTESTS.push({
    name: "Workforce: entrant pace and prior-authorization capacity math reconcile",
    run: function () {
      var entrants = SCENARIOS.plan.created - SCENARIOS.plan.inside;
      var annualEntrants = entrants * 1000 / ROLLOUT_YEARS;
      var releasedFte = DIRECT_PATIENT_CARE_PHYSICIANS * PRIOR_AUTH_HOURS_PER_WEEK / 40;
      return entrants === 150 && annualEntrants === 12500 &&
        Math.round(releasedFte) === 281600 &&
        Math.abs(ANNUAL_TRAINING_TARGET / annualEntrants - 4.4) < 0.001;
    }
  });

  document.querySelectorAll("[data-wf-scenario]").forEach(function (button) {
    button.addEventListener("click", function () {
      setScenario(button.dataset.wfScenario);
    });
  });

  setScenario("plan");
  addAcronymHovers($("view-workforce"));
})();
