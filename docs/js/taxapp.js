/* =========================================================================
 * Tax view wiring + tab navigation.
 * The healthcare model publishes its financing path via NHA._healthPath
 * (set in app.js recompute); the NHA funding program and the health-relief
 * side of the net-impact chart read it live. Everything else is generic —
 * add programs, retune instruments, model any funding problem.
 * ========================================================================= */
"use strict";
(function () {
  var T = NHA.TAX;
  function $(id) { return document.getElementById(id); }

  /* ---- state ---- */
  var settings = T.defaultSettings();
  var customPrograms = [];
  var distYear = 2041;
  var distMode = "dollars";

  /* ---- health link (live from the healthcare model) ---- */
  function healthNeed(year) {
    var hp = NHA._healthPath;
    if (!hp) return T.PROGRAMS[0].need(year); /* fallback path */
    var i = hp.years.indexOf(year);
    return i >= 0 ? hp.newRevenue[i] : 0;
  }
  function healthRelief(year) {
    var hp = NHA._healthPath;
    if (!hp) return 0;
    var i = hp.years.indexOf(year);
    return i >= 0 ? hp.relief[i] : 0;
  }

  function activePrograms() {
    var nha = {
      id: "nha", label: T.PROGRAMS[0].label, builtin: true,
      enabled: nhaEnabled, need: healthNeed,
      source: T.PROGRAMS[0].source
    };
    return [nha].concat(customPrograms);
  }
  var nhaEnabled = true;

  /* ---- controls ---- */
  function buildInstrumentControls() {
    var host = $("tax-instruments");
    host.innerHTML = "";
    T.INSTRUMENTS.forEach(function (ins) {
      var st = settings.instruments[ins.id];
      var card = document.createElement("div");
      card.className = "tax-ins";

      var head = document.createElement("div");
      head.className = "tax-ins-head";
      var cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = st.enabled;
      cb.setAttribute("aria-label", "Enable " + ins.label);
      var name = document.createElement("span");
      name.className = "name"; name.textContent = ins.label;
      var rev = document.createElement("span");
      rev.className = "rev";
      head.appendChild(cb); head.appendChild(name); head.appendChild(rev);
      card.appendChild(head);

      var desc = document.createElement("div");
      desc.className = "desc-sm";
      desc.textContent = ins.desc + (ins.defaultNote ? " (" + ins.defaultNote + ")" : "");
      card.appendChild(desc);

      var row = document.createElement("div");
      row.className = "row2";
      var slider = null;
      if (ins.kind === "scale") {
        slider = document.createElement("input");
        slider.type = "range"; slider.min = 0; slider.max = ins.scaleMax;
        slider.step = 0.05; slider.value = st.value;
        slider.setAttribute("aria-label", ins.label + " scale");
        row.appendChild(slider);
      } else {
        var spacer = document.createElement("span");
        spacer.style.flex = "1"; row.appendChild(spacer);
      }
      var phaseLab = document.createElement("span");
      phaseLab.textContent = "starts";
      var phase = document.createElement("input");
      phase.type = "number"; phase.className = "phase-inp";
      phase.min = 2027; phase.max = 2042; phase.value = st.phaseStart;
      phase.setAttribute("aria-label", ins.label + " start year");
      row.appendChild(phaseLab); row.appendChild(phase);
      card.appendChild(row);

      function updateRev() {
        var r = T.instrumentRevenue(ins, st, distYear);
        rev.textContent = st.enabled && st.value > 0 ? NHA.fmt.money(r) + "/yr" : "off";
      }
      card._updateRev = updateRev;
      updateRev();

      cb.addEventListener("change", function () {
        st.enabled = cb.checked;
        if (ins.kind === "toggle") st.value = cb.checked ? 1 : 0;
        refresh();
      });
      if (slider) slider.addEventListener("input", function () {
        st.value = parseFloat(slider.value);
        st.enabled = st.value > 0 ? cb.checked : st.enabled;
        refresh();
      });
      phase.addEventListener("change", function () {
        var v = parseInt(phase.value, 10);
        if (v >= 2027 && v <= 2042) { st.phaseStart = v; refresh(); }
      });

      host.appendChild(card);
    });
  }

  function buildProgramList() {
    var host = $("program-list");
    host.innerHTML = "";
    activePrograms().forEach(function (p) {
      var row = document.createElement("div");
      row.className = "program-row";
      var cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = p.enabled;
      cb.setAttribute("aria-label", "Enable program " + p.label);
      cb.addEventListener("change", function () {
        if (p.builtin) nhaEnabled = cb.checked; else p.enabled = cb.checked;
        refresh();
      });
      var lab = document.createElement("span");
      lab.className = "p-label";
      lab.textContent = p.label + (p.builtin ? "" : " (custom)");
      var need = document.createElement("span");
      need.className = "p-need";
      need.textContent = NHA.fmt.money(p.need(distYear)) + " in " + distYear;
      row.appendChild(cb); row.appendChild(lab); row.appendChild(need);
      if (!p.builtin) {
        var rm = document.createElement("button");
        rm.className = "rm"; rm.textContent = "remove";
        rm.addEventListener("click", function () {
          customPrograms = customPrograms.filter(function (x) { return x.id !== p.id; });
          refresh();
        });
        row.appendChild(rm);
      }
      host.appendChild(row);
    });
  }

  function wireProgramAdd() {
    $("p-add-btn").addEventListener("click", function () {
      var name = $("p-add-name").value.trim() || "Custom program";
      var amt = parseFloat($("p-add-amt").value);
      var start = parseInt($("p-add-start").value, 10);
      var ramp = parseInt($("p-add-ramp").value, 10) || 0;
      if (!(amt > 0) || !(start >= 2027 && start <= 2042)) return;
      customPrograms.push(NHA.TAX.makeCustomProgram(name, amt, start, ramp));
      $("p-add-name").value = ""; $("p-add-amt").value = "";
      refresh();
    });
  }

  /* ---- render ---- */
  function refresh() {
    var progs = activePrograms();
    var comp = T.compute(settings, progs);
    NHA.renderRevenueNeedChart($("tax-path-chart"), comp);

    /* coverage tiles at the chosen year + horizon totals */
    var i = comp.years.indexOf(distYear);
    var tiles = $("tax-tiles");
    tiles.innerHTML = "";
    [
      { label: "Revenue in " + distYear, value: NHA.fmt.money(comp.totalRev[i]) + "/yr",
        range: "all instruments, phased as scheduled" },
      { label: "Funding need in " + distYear, value: NHA.fmt.money(comp.need[i]) + "/yr",
        range: progs.filter(function (p) { return p.enabled; }).length + " program(s)" },
      { label: "Coverage in " + distYear,
        value: comp.need[i] > 0 ? Math.round(100 * comp.totalRev[i] / comp.need[i]) + "%" : "n/a",
        range: comp.totalRev[i] >= comp.need[i] ? "fully funded" : "shortfall: " +
          NHA.fmt.money(comp.need[i] - comp.totalRev[i]) + "/yr" },
      { label: "Cumulative 2027–2042",
        value: NHA.fmt.money(comp.totalRev.reduce(function (a, b) { return a + b; }, 0)),
        range: "vs. need " + NHA.fmt.money(comp.need.reduce(function (a, b) { return a + b; }, 0)) }
    ].forEach(function (it) {
      var tl = document.createElement("div"); tl.className = "tile";
      var l = document.createElement("div"); l.className = "label"; l.textContent = it.label;
      var v = document.createElement("div"); v.className = "value"; v.textContent = it.value;
      var r = document.createElement("div"); r.className = "range"; r.textContent = it.range;
      tl.appendChild(l); tl.appendChild(v); tl.appendChild(r);
      tiles.appendChild(tl);
    });

    /* distribution: health relief only counts if the NHA program is on */
    var reliefB = nhaEnabled ? healthRelief(distYear) : 0;
    var rows = T.distribution(settings, distYear, reliefB);
    NHA.renderNetImpactChart($("tax-impact-chart"), rows, distMode);
    NHA.renderRateCurve($("tax-rate-chart"), rows);

    /* per-instrument revenue update on cards */
    var cards = $("tax-instruments").children;
    for (var c = 0; c < cards.length; c++) {
      if (cards[c]._updateRev) cards[c]._updateRev();
    }
    buildProgramList();
    renderDistTable(rows, reliefB);
  }

  function renderDistTable(rows, reliefB) {
    var host = $("tax-dist-table");
    host.innerHTML = "";
    var tbl = document.createElement("table");
    var hd = tbl.insertRow();
    ["Income group", "Avg income (" + distYear + ")", "New taxes /hh",
     "Health savings /hh", "Net /hh", "Net % of income",
     "Avg fed rate: now → new"].forEach(function (h) {
      var th = document.createElement("th"); th.textContent = h; hd.appendChild(th);
    });
    rows.forEach(function (r) {
      var tr = tbl.insertRow();
      function cell(v) { var c = tr.insertCell(); c.textContent = v; return c; }
      cell(r.group.label);
      cell("$" + Math.round(r.avgIncomeNow).toLocaleString("en-US"));
      cell("$" + Math.round(r.taxPerHH).toLocaleString("en-US"));
      cell("−$" + Math.round(r.reliefPerHH).toLocaleString("en-US"));
      var net = cell((r.netPerHH >= 0 ? "+$" : "−$") +
        Math.round(Math.abs(r.netPerHH)).toLocaleString("en-US"));
      net.style.fontWeight = "650";
      cell((r.netPctIncome >= 0 ? "+" : "") + (r.netPctIncome * 100).toFixed(1) + "%");
      cell((r.curRate * 100).toFixed(1) + "% → " + (r.newRate * 100).toFixed(1) + "%");
    });
    host.appendChild(tbl);
    var note = document.createElement("div");
    note.className = "note";
    note.textContent = reliefB > 0
      ? "Health savings distribute the healthcare model's " + NHA.fmt.money(reliefB) +
        "/yr of replaced household health spending across groups per the BLS Consumer " +
        "Expenditure Survey 2024 pattern ($3,445/yr in the lowest quintile to $9,771 in the " +
        "highest, or 20.7% vs 3.7% of income). Shares are muted at the bottom because Medicaid " +
        "already covers many low-income households."
      : "Health savings are zero because the NHA program is disabled; this shows pure tax incidence.";
    host.appendChild(note);
  }

  /* ---- year & mode controls ---- */
  function wireViewControls() {
    var sel = $("dist-year");
    for (var y = 2030; y <= 2042; y++) {
      var o = document.createElement("option");
      o.value = y; o.textContent = y;
      if (y === distYear) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener("change", function () {
      distYear = parseInt(sel.value, 10); refresh();
    });
    $("mode-dollars").addEventListener("click", function () {
      distMode = "dollars"; setModeButtons(); refresh();
    });
    $("mode-pct").addEventListener("click", function () {
      distMode = "pct"; setModeButtons(); refresh();
    });
    function setModeButtons() {
      $("mode-dollars").className = distMode === "dollars" ? "active" : "";
      $("mode-pct").className = distMode === "pct" ? "active" : "";
    }
    setModeButtons();
  }

  /* ---- tabs ---- */
  function showView(which) {
    $("view-health").hidden = which !== "health";
    $("view-tax").hidden = which !== "tax";
    $("tab-health").className = which === "health" ? "active" : "";
    $("tab-tax").className = which === "tax" ? "active" : "";
    if (history.replaceState) history.replaceState(null, "", "#" + which);
  }
  $("tab-health").addEventListener("click", function () { showView("health"); });
  $("tab-tax").addEventListener("click", function () { showView("tax"); });

  /* healthcare model calls this after each recompute */
  NHA.TAX.onHealthUpdate = function () { refresh(); };

  /* ---- boot ---- */
  buildInstrumentControls();
  wireProgramAdd();
  wireViewControls();
  refresh();
  showView(location.hash === "#tax" ? "tax" : "health");
})();
