/* =========================================================================
 * Quality view: the controlled KPP, TPP, and cost-parameter catalogs with
 * rollout milestones and phase-by-phase target inspection.
 * ========================================================================= */
"use strict";
(function () {
  var DATA = window.NHA_QUALITY_DATA;
  if (!DATA) return;

  function $(id) { return document.getElementById(id); }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function natural(a, b) {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  }

  var PHASES = DATA.phases;
  var selectedId = "KPP-A1";
  var controls = {
    search: $("quality-search"),
    type: $("quality-type"),
    concept: $("quality-concept"),
    phase: $("quality-phase")
  };

  var ACRONYMS = {
    "A1-HCAC": "Article I Health Claims and Appeals Court",
    "ACA": "Affordable Care Act",
    "ACDRH": "Administration for Care Delivery and Regional Health",
    "AI": "Artificial Intelligence",
    "AICIO": "Artificial Intelligence Clinical Integration Office",
    "AMDDT": "Administration for Medicines, Devices, Diagnostics, and Therapeutics",
    "API": "Application Programming Interface",
    "BH": "Behavioral Health",
    "CHAO": "Congressional Health Accountability Office",
    "CP": "Cost Parameter",
    "DME": "Durable Medical Equipment",
    "DNHA": "Department of National Health Assurance",
    "DVH": "Dental, Vision, and Hearing",
    "ED": "Emergency Department",
    "EMS": "Emergency Medical Services",
    "EPTO": "Employer and Payroll Transition Office",
    "FA": "Framework Assumption",
    "GDP": "Gross Domestic Product",
    "HATC": "Health Administration Transition Corps",
    "HCCA": "Health Cybersecurity and Continuity Authority",
    "HFASB": "Health Financing Actuary and Stabilization Board",
    "IT": "Information Technology",
    "KPP": "Key Performance Parameter",
    "LTC": "Long-Term Care",
    "NBIA": "National Biomedical Innovation Agency",
    "NCCA": "National Coverage and Claims Authority",
    "NCDSO": "National Clinical Data Standards Office",
    "NDPA": "National Drug Purchasing Authority",
    "NEEA": "National Enrollment and Eligibility Authority",
    "NEMTA": "National EMS and Medical Transport Authority",
    "NHAC": "National Health Accountability Commission",
    "NHASB": "National Health Adaptation and Scorekeeping Board",
    "NHETF": "National Health Equalization Trust Fund",
    "NHRA": "National Health Records Authority",
    "NHSA": "National Hospital Stewardship Authority",
    "NHTCA": "National Health Transition and Continuity Authority",
    "NHWB": "National Health Workforce Board",
    "NHWECA": "National Health Workforce Education and Capacity Authority",
    "NOPRSL": "National Office of Patient Rights, Safety, and Legitimacy",
    "NPSMIB": "National Patient Safety and Medical Injury Board",
    "NSAA": "National Specialty Access Authority",
    "OCDTI": "Office of Community Diagnostic and Treatment Infrastructure",
    "OMB": "Office of Management and Budget",
    "PBM": "Pharmacy Benefit Manager",
    "PCU": "National Pharmacy Claims Utility",
    "PILO": "Public-Interest Licensing Office",
    "PMC": "Public Medicines Corporation",
    "PROO": "Patient Rights and Ombudsman Office",
    "RHA": "Regional Health Administrators",
    "SRCO": "State and Regional Compact Office",
    "SUD": "Substance Use Disorder",
    "TBD": "To Be Determined",
    "THDO": "Treasury Health Disbursement Office",
    "TPP": "Technical Performance Parameter",
    "TRTO": "Tribal and Rural Transition Office",
    "USD": "United States Dollars"
  };

  DATA.parameters.forEach(function (parameter) {
    parameter._search = [
      parameter.id, parameter.type, parameter.name, parameter.concept,
      parameter.where, parameter.target, parameter.calculation,
      parameter.datasets, parameter.ownerVerifier, parameter.status,
      parameter.unit, parameter.modelRole, parameter.temporal,
      parameter.unitStatus, parameter.family
    ].join(" ").toLowerCase();
  });

  function populateConcepts() {
    DATA.concepts.forEach(function (concept) {
      var option = el("option", "", concept);
      option.value = concept;
      controls.concept.appendChild(option);
    });
  }

  function entriesForPhase(parameter, phase) {
    return parameter.rollout.filter(function (entry) {
      return entry.phase === phase;
    });
  }

  function targetForTable(parameter, phase) {
    if (phase === "all") return parameter.target;
    var entries = entriesForPhase(parameter, phase);
    if (!entries.length) {
      return parameter.type === "CP"
        ? "Not phase-targeted"
        : "No numeric target specified";
    }
    return entries.map(function (entry) {
      return entry.value + (entry.kind === "maturity target" ? " — maturity" : "");
    }).join(" · ");
  }

  function filteredParameters() {
    var query = controls.search.value.trim().toLowerCase();
    return DATA.parameters.filter(function (parameter) {
      if (controls.type.value !== "all" && parameter.type !== controls.type.value) {
        return false;
      }
      if (controls.concept.value !== "all" &&
          parameter.concept !== controls.concept.value) {
        return false;
      }
      return !query || parameter._search.indexOf(query) >= 0;
    });
  }

  function renderPhaseOverview() {
    var host = $("quality-phase-overview");
    host.innerHTML = "";
    var milestones = {};
    PHASES.forEach(function (phase) { milestones[phase.id] = []; });
    DATA.parameters.forEach(function (parameter) {
      parameter.rollout.forEach(function (entry) {
        /* framework-explicit floors and milestones only; derived interim
           targets live in each parameter's phase strip below */
        if (entry.kind !== "maturity target" &&
            entry.kind !== "derived interim target" &&
            entry.kind !== "data-plan interim target") {
          milestones[entry.phase].push({
            id: parameter.id,
            value: entry.value,
            kind: entry.kind,
            gate: entry.gate
          });
        }
      });
    });

    PHASES.forEach(function (phase) {
      var item = el("article", "quality-phase");
      if (milestones[phase.id].length || phase.id === "P8") {
        item.classList.add("has-target");
      }
      var top = el("div", "quality-phase-top");
      top.appendChild(el("b", "", phase.id));
      top.appendChild(el("span", "", phase.anchor));
      item.appendChild(top);
      item.appendChild(el("h3", "", phase.purpose));

      var list = el("div", "quality-phase-targets");
      if (!milestones[phase.id].length && phase.id !== "P8") {
        list.appendChild(el("span", "quality-no-target",
          "No numeric parameter milestone specified"));
      } else {
        milestones[phase.id].sort(function (a, b) { return natural(a.id, b.id); });
        milestones[phase.id].forEach(function (milestone) {
          var line = el("span", "quality-phase-target");
          line.appendChild(el("b", "", milestone.id));
          line.appendChild(document.createTextNode(" " + milestone.value));
          if (milestone.gate) {
            line.appendChild(el("small", "", milestone.gate + " floor"));
          }
          list.appendChild(line);
        });
        if (phase.id === "P8") {
          var mature = el("span", "quality-phase-target maturity");
          mature.appendChild(el("b", "", "All 120 KPP/TPP records"));
          mature.appendChild(document.createTextNode(" assessed against source targets"));
          list.appendChild(mature);
        }
      }
      item.appendChild(list);
      host.appendChild(item);
    });
  }

  function renderFloorTable() {
    var host = $("quality-floor-table");
    var table = el("table", "data quality-floor-table");
    var caption = el("caption", "sr-only",
      "Exact rollout milestones and progression floors compared with maturity targets");
    table.appendChild(caption);
    var thead = el("thead");
    var head = el("tr");
    ["Phase", "Parameter", "Progression value", "Mature target", "What it controls"]
      .forEach(function (label) { head.appendChild(el("th", "", label)); });
    thead.appendChild(head);
    table.appendChild(thead);
    var tbody = el("tbody");
    var rows = [];
    DATA.parameters.forEach(function (parameter) {
      parameter.rollout.forEach(function (entry) {
        if (entry.kind === "maturity target" ||
            entry.kind === "derived interim target" ||
            entry.kind === "data-plan interim target") return;
        rows.push({ parameter: parameter, entry: entry });
      });
    });
    rows.sort(function (a, b) {
      return natural(a.entry.phase + a.parameter.id, b.entry.phase + b.parameter.id);
    });
    rows.forEach(function (item) {
      var tr = el("tr");
      var gate = DATA.gates.filter(function (candidate) {
        return candidate.id === item.entry.gate;
      })[0];
      tr.appendChild(el("th", "text-nowrap",
        item.entry.phase + (item.entry.gate ? " / " + item.entry.gate : "")));
      tr.appendChild(el("td", "text-nowrap", item.parameter.id));
      tr.appendChild(el("td", "quality-floor-value", item.entry.value));
      tr.appendChild(el("td", "", item.parameter.target));
      tr.appendChild(el("td", "",
        gate ? gate.decision : "P5 delivery-scale exit milestone"));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    host.appendChild(table);
  }

  function detailField(label, value, className) {
    var field = el("div", "quality-detail-field" + (className ? " " + className : ""));
    field.appendChild(el("span", "quality-kicker", label));
    field.appendChild(el("p", "", value || "Not specified"));
    return field;
  }

  function renderSelected(parameter) {
    var host = $("quality-selected");
    host.innerHTML = "";

    var header = el("div", "quality-selected-head");
    var identity = el("div");
    var idLine = el("div", "quality-id-line");
    idLine.appendChild(el("span", "quality-type quality-type-" +
      parameter.type.toLowerCase(), parameter.type));
    idLine.appendChild(el("b", "", parameter.id));
    identity.appendChild(idLine);
    identity.appendChild(el("h3", "", parameter.name));
    identity.appendChild(el("p", "", parameter.concept));
    header.appendChild(identity);
    var sourceTarget = el("div", "quality-source-target");
    sourceTarget.appendChild(el("span", "quality-kicker",
      parameter.type === "CP" ? "Controlled value / status" : "Source / maturity target"));
    sourceTarget.appendChild(el("strong", "", parameter.target));
    header.appendChild(sourceTarget);
    host.appendChild(header);

    var fields = el("div", "quality-detail-grid");
    fields.appendChild(detailField("Where it matters",
      parameter.where + (parameter.family ? " · " + parameter.family : "")));
    fields.appendChild(detailField("Accountable owner / verifier",
      parameter.ownerVerifier));
    fields.appendChild(detailField(
      parameter.type === "CP" ? "Definition" : "Calculation contract",
      parameter.calculation, "quality-detail-wide"));
    fields.appendChild(detailField(
      parameter.type === "CP" ? "Canonical unit and model role" : "Datasets",
      parameter.type === "CP"
        ? [parameter.unit, parameter.modelRole, parameter.temporal].filter(Boolean).join(" · ")
        : parameter.datasets,
      "quality-detail-wide"));
    fields.appendChild(detailField("Control status",
      parameter.type === "CP"
        ? parameter.unitStatus + " · " + parameter.status
        : parameter.status,
      "quality-detail-wide"));
    host.appendChild(fields);

    var phaseHeading = el("div", "quality-phase-strip-head");
    phaseHeading.appendChild(el("b", "", "Target by rollout phase"));
    phaseHeading.appendChild(el("span", "", parameter.phaseNote));
    host.appendChild(phaseHeading);

    var strip = el("div", "quality-phase-strip");
    PHASES.forEach(function (phase) {
      var cell = el("div", "quality-phase-cell");
      var entries = entriesForPhase(parameter, phase.id);
      if (entries.length) cell.classList.add("has-target");
      var phaseTop = el("div", "quality-phase-cell-top");
      phaseTop.appendChild(el("b", "", phase.id));
      phaseTop.appendChild(el("span", "", phase.anchor));
      cell.appendChild(phaseTop);
      if (!entries.length) {
        cell.appendChild(el("p", "quality-no-target",
          parameter.type === "CP"
            ? "Not phase-targeted"
            : "No numeric target specified"));
      } else {
        entries.forEach(function (entry) {
          var value = el("p", "quality-cell-value", entry.value);
          value.appendChild(el("small", "",
            (entry.gate ? entry.gate + " · " : "") + entry.kind));
          cell.appendChild(value);
        });
      }
      strip.appendChild(cell);
    });
    host.appendChild(strip);
  }

  function renderTable(parameters) {
    var table = $("quality-table");
    table.innerHTML = "";
    var phase = controls.phase.value;
    var phaseLabel = phase === "all"
      ? "Source / maturity value"
      : phase + " target / value";

    var thead = el("thead");
    var head = el("tr");
    ["ID", "Parameter", "Type", "Where it matters", phaseLabel]
      .forEach(function (label) { head.appendChild(el("th", "", label)); });
    thead.appendChild(head);
    table.appendChild(thead);

    if (!parameters.length) {
      var emptyBody = el("tbody");
      var emptyRow = el("tr");
      var empty = el("td", "quality-empty",
        "No parameters match the current filters.");
      empty.colSpan = 5;
      emptyRow.appendChild(empty);
      emptyBody.appendChild(emptyRow);
      table.appendChild(emptyBody);
      return;
    }

    DATA.concepts.forEach(function (concept) {
      var group = parameters.filter(function (parameter) {
        return parameter.concept === concept;
      });
      if (!group.length) return;
      group.sort(function (a, b) {
        var order = { KPP: 0, TPP: 1, CP: 2 };
        return order[a.type] - order[b.type] || natural(a.id, b.id);
      });

      var tbody = el("tbody", "quality-group");
      var groupRow = el("tr", "quality-group-row");
      var groupCell = el("th");
      groupCell.colSpan = 5;
      groupCell.appendChild(el("span", "", concept));
      groupCell.appendChild(el("small", "", group.length + " records"));
      groupRow.appendChild(groupCell);
      tbody.appendChild(groupRow);

      group.forEach(function (parameter) {
        var row = el("tr");
        if (parameter.id === selectedId) row.classList.add("is-selected");
        var idCell = el("th", "text-nowrap");
        var select = el("button", "quality-select", parameter.id);
        select.type = "button";
        select.dataset.parameterId = parameter.id;
        select.setAttribute("aria-pressed",
          parameter.id === selectedId ? "true" : "false");
        select.setAttribute("aria-label", "Show details for " +
          parameter.id + ", " + parameter.name);
        idCell.appendChild(select);
        row.appendChild(idCell);
        row.appendChild(el("td", "quality-name", parameter.name));
        var typeCell = el("td");
        typeCell.appendChild(el("span", "quality-type quality-type-" +
          parameter.type.toLowerCase(), parameter.type));
        row.appendChild(typeCell);
        row.appendChild(el("td", "quality-where",
          parameter.where + (parameter.family ? " · " + parameter.family : "")));
        var target = el("td", "quality-target", targetForTable(parameter, phase));
        if (phase !== "all" && !entriesForPhase(parameter, phase).length) {
          target.classList.add("not-specified");
        }
        row.appendChild(target);
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
    });
  }

  function addAcronymHovers(root) {
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
      if (!parent || parent.closest("abbr, script, style, option")) continue;
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
        var abbr = el("abbr", "quality-acronym", acronym);
        abbr.title = ACRONYMS[acronym];
        abbr.setAttribute("aria-label", acronym + ": " + ACRONYMS[acronym]);
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

  function refresh() {
    var parameters = filteredParameters();
    if (!parameters.some(function (parameter) { return parameter.id === selectedId; })) {
      selectedId = parameters.length ? parameters[0].id : "";
    }
    $("quality-results").textContent = parameters.length.toLocaleString("en-US") +
      " of " + DATA.counts.total.toLocaleString("en-US") + " parameters shown";

    if (selectedId) {
      var selected = DATA.parameters.filter(function (parameter) {
        return parameter.id === selectedId;
      })[0];
      renderSelected(selected);
    } else {
      $("quality-selected").innerHTML =
        '<p class="quality-empty">Adjust the filters to select a parameter.</p>';
    }
    renderTable(parameters);
    addAcronymHovers($("quality-selected"));
    addAcronymHovers($("quality-table"));
  }

  populateConcepts();
  renderPhaseOverview();
  renderFloorTable();
  addAcronymHovers($("view-quality"));
  refresh();

  controls.search.addEventListener("input", refresh);
  controls.type.addEventListener("change", refresh);
  controls.concept.addEventListener("change", refresh);
  controls.phase.addEventListener("change", refresh);
  $("quality-reset").addEventListener("click", function () {
    controls.search.value = "";
    controls.type.value = "all";
    controls.concept.value = "all";
    controls.phase.value = "all";
    selectedId = "KPP-A1";
    refresh();
  });
  $("quality-table").addEventListener("click", function (event) {
    var button = event.target.closest("button[data-parameter-id]");
    if (!button) return;
    selectedId = button.dataset.parameterId;
    refresh();
    $("quality-selected").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
})();
