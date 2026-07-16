/* =========================================================================
 * App wiring: controls → Monte Carlo → charts, tables, tiles, self-tests.
 * All internal dollars are real 2023 $B; display applies the 2023→2024
 * deflator so results are comparable with the framework's "$4.75T (2024$)"
 * claim. Published benchmarks (CBO, Urban/Mercatus) are shown in their own
 * studies' dollars — flagged in the note as order-of-magnitude comparisons.
 * ========================================================================= */
"use strict";
(function () {
  var DEF = NHA.DEFLATOR_2023_TO_2024;
  var N_RUNS = 600, SEED = 42;
  var state = { scenario: "SCN-BASE", sliders: {} };

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Controls ---------- */
  function buildControls() {
    var host = $("controls");
    host.innerHTML = "";

    /* Scenario picker */
    var scnWrap = document.createElement("div");
    scnWrap.className = "control";
    var scnLabel = document.createElement("label");
    scnLabel.textContent = "Stress scenario (framework catalog)";
    var sel = document.createElement("select");
    sel.id = "scenario-select";
    NHA.SCENARIOS.forEach(function (s) {
      var o = document.createElement("option");
      o.value = s.id; o.textContent = s.id.replace("SCN-", "") + ": " + s.name;
      sel.appendChild(o);
    });
    sel.value = state.scenario;
    sel.addEventListener("change", function () {
      state.scenario = sel.value;
      state.sliders = {};           // user tweaks reset when scenario changes
      buildControls();              // re-seed slider positions
      recompute();
    });
    scnWrap.appendChild(scnLabel); scnWrap.appendChild(sel);
    host.appendChild(scnWrap);

    /* Sliders for adjustable params, seeded at scenario-effective modes */
    var eff = NHA.effectiveParams(state.scenario, null);
    NHA.PARAM_DEFS.filter(function (p) { return p.adjustable; }).forEach(function (p) {
      var wrap = document.createElement("div");
      wrap.className = "control";
      var label = document.createElement("label");
      var valSpan = document.createElement("span");
      valSpan.className = "val";
      var conf = document.createElement("span");
      conf.className = "conf " + p.confidence;
      conf.textContent = p.confidence;
      conf.title = p.source;
      label.appendChild(document.createTextNode(p.label + " "));
      label.appendChild(conf);
      label.appendChild(document.createElement("br"));
      label.appendChild(valSpan);

      var input = document.createElement("input");
      input.type = "range";
      input.min = p.sliderMin; input.max = p.sliderMax;
      input.step = (p.sliderMax - p.sliderMin) / 200;
      var seeded = (state.sliders[p.id] != null) ? state.sliders[p.id] : eff[p.id].mode;
      input.value = seeded;
      function fmtVal(v) {
        if (p.unit === "×") return (+v).toFixed(2) + "×";
        if (p.unit.indexOf("%") === 0) return (+v).toFixed(1) + p.unit.slice(1) ? (+v).toFixed(1) + "%" + (p.unit.length > 1 ? " " + p.unit.slice(1) : "") : (+v).toFixed(1) + p.unit;
        if (p.unit.indexOf("$B") === 0) return "$" + Math.round(v) + "B";
        return (+v).toFixed(1) + " " + p.unit;
      }
      function fmtSimple(v) {
        if (p.unit === "×") return (+v).toFixed(2) + "×";
        if (p.unit.charAt(0) === "%") return (+v).toFixed(1) + "%";
        if (p.unit.indexOf("$B") === 0) return "$" + Math.round(v) + "B";
        return (+v).toFixed(1) + " " + p.unit;
      }
      valSpan.textContent = fmtSimple(seeded);
      input.addEventListener("input", function () {
        state.sliders[p.id] = +input.value;
        valSpan.textContent = fmtSimple(+input.value);
        scheduleRecompute();
      });
      wrap.appendChild(label); wrap.appendChild(input);
      host.appendChild(wrap);
    });

    var scn = NHA.SCENARIOS_BY_ID[state.scenario];
    $("scenario-desc").textContent = scn ? (scn.id + ": " + scn.desc) : "";
  }

  $("reset-btn").addEventListener("click", function () {
    state.sliders = {};
    buildControls();
    recompute();
  });

  var pending = null;
  function scheduleRecompute() {
    if (pending) clearTimeout(pending);
    pending = setTimeout(recompute, 160);
  }

  /* ---------- Recompute & render ---------- */
  var mc = null;
  function recompute() {
    var t0 = performance.now();
    mc = NHA.runMonteCarlo(state.scenario, state.sliders, N_RUNS, SEED);
    var ms = performance.now() - t0;
    $("runs-note").textContent = N_RUNS + " Monte Carlo runs · " + ms.toFixed(0) +
      " ms · seed " + SEED + " (reproducible)";
    renderHero();
    renderTiles();
    NHA.renderPathChart($("path-chart"), mc, DEF);
    renderPathTable();
    renderMoneyFlow();
    renderBridge();
    renderFinancing();
    renderBenchmarks();
    if (NHA._rerenderHousehold) NHA._rerenderHousehold();

    /* publish the financing path (2024$) for the tax model */
    NHA._healthPath = {
      years: mc.years.slice(),
      newRevenue: mc.modePath.detail.map(function (d) { return d.newRevenue * DEF; }),
      relief: mc.modePath.detail.map(function (d) { return d.householdRelief * DEF; }),
      wageGain: mc.modePath.detail.map(function (d) { return (d.wageGain || 0) * DEF; })
    };
    if (NHA.TAX && NHA.TAX.onHealthUpdate) NHA.TAX.onHealthUpdate();
  }

  /* Live model numbers for the household calculator (mature year, 2024$) */
  function modelNumbersForHousehold() {
    var d = mc.modePath.detail[mc.years.length - 2]; // 2041
    return { newRevenueB: d.newRevenue * DEF };
  }

  function bandTxt(b, fmt) {
    return fmt(b.p10) + " – " + fmt(b.p90) + " (10th–90th pct)";
  }

  function renderHero() {
    var tot = mc.steady.matureToday;
    $("hero-value").textContent = NHA.fmt.money(tot.p50 * DEF) + "/yr";
    $("hero-range").textContent = bandTxt(
      { p10: tot.p10 * DEF, p90: tot.p90 * DEF },
      function (v) { return NHA.fmt.money(v); });
  }

  function renderTiles() {
    var host = $("tiles");
    host.innerHTML = "";
    var lastIdx = mc.years.length - 2; // 2041
    var baseMature = mc.baseline[lastIdx] * DEF;
    var deltaVsBase = mc.steady.total.p50 * DEF - baseMature;
    var items = [
      { label: "Steady state in 2041, at 2041's size (real 2024$)",
        value: NHA.fmt.money(mc.steady.total.p50 * DEF) + "/yr",
        range: bandTxt({ p10: mc.steady.total.p10 * DEF, p90: mc.steady.total.p90 * DEF }, NHA.fmt.moneyShort) +
          " · status quo reaches " + NHA.fmt.money(baseMature) + " that year" },
      { label: "Share of GDP at maturity",
        value: NHA.fmt.pct(mc.steady.gdpPct.p50),
        range: NHA.fmt.pct(mc.steady.gdpPct.p10) + " – " + NHA.fmt.pct(mc.steady.gdpPct.p90) },
      { label: "Per person per year",
        value: NHA.fmt.perCap(mc.steady.perCapita.p50 * DEF),
        range: NHA.fmt.perCap(mc.steady.perCapita.p10 * DEF) + " – " + NHA.fmt.perCap(mc.steady.perCapita.p90 * DEF) },
      { label: "vs. status quo at maturity",
        value: (deltaVsBase >= 0 ? "+" : "−") + NHA.fmt.moneyShort(Math.abs(deltaVsBase)),
        range: "status quo reaches " + NHA.fmt.money(baseMature) + " by 2041" },
      { label: "New revenue needed (mature)",
        value: NHA.fmt.money(mc.steady.newRevenue.p50 * DEF) + "/yr",
        range: bandTxt({ p10: mc.steady.newRevenue.p10 * DEF, p90: mc.steady.newRevenue.p90 * DEF }, NHA.fmt.moneyShort) }
    ];
    items.forEach(function (it) {
      var t = document.createElement("div"); t.className = "tile";
      var l = document.createElement("div"); l.className = "label"; l.textContent = it.label;
      var v = document.createElement("div"); v.className = "value"; v.textContent = it.value;
      var r = document.createElement("div"); r.className = "range"; r.textContent = it.range;
      t.appendChild(l); t.appendChild(v); t.appendChild(r);
      host.appendChild(t);
    });
  }

  function renderPathTable() {
    var tbl = $("path-table");
    tbl.innerHTML = "";
    var thead = tbl.createTHead().insertRow();
    ["Year", "Status quo", "NHA p10", "NHA median", "NHA p90"].forEach(function (h, i) {
      var th = document.createElement("th");
      th.textContent = h; if (i) th.className = "num";
      thead.appendChild(th);
    });
    var tb = tbl.createTBody();
    mc.years.forEach(function (yr, i) {
      var row = tb.insertRow();
      row.insertCell().textContent = yr;
      [mc.baseline[i], mc.yearBands[i].p10, mc.yearBands[i].p50, mc.yearBands[i].p90]
        .forEach(function (v) {
          var c = row.insertCell(); c.className = "num";
          c.textContent = NHA.fmt.money(v * DEF);
        });
    });
  }

  /* ---------- Bridge decomposition (exact identity with the engine) ------ */
  function bridgeSteps() {
    var B = NHA.BASE2023, p = mc.modeParams;
    var structural = NHA.scenarioStructural(state.scenario);
    var ramps = NHA.buildRamps(structural);
    var t = mc.years.length - 2; // 2041, transition fully wound down
    var d = mc.modePath.detail[t];
    var G = d.nheBase / B.nheTotal;

    var e = p.embeddedDrugSpend;
    var hosp0 = B.hospital - 0.6 * e, clin0 = B.physician + B.otherProf - 0.4 * e;
    var drug0 = B.rxRetail + e;
    var oth0 = B.dental + B.otherPersonal + B.homeHealth + B.nursing + B.dme + B.nondurables;
    var phcBase = (hosp0 + clin0 + drug0 + oth0) * G;

    var covR = ramps.coverage[t] || 0, csR = ramps.costShareElim[t] || 0;
    var drugR = ramps.drugs[t] || 0, hospR = ramps.hospitals[t] || 0;
    var cds = p.coverageDemandShare;
    var u = 1 + (p.utilIncrease / 100) * (cds * covR + (1 - cds) * csR);
    var pay = 1 - (1 - p.providerPaymentFactor) * hospR;

    var utilAdd = phcBase * (u - 1);
    var paySave = (hosp0 + clin0) * G * u * (1 - pay);
    var drugSave = drug0 * G * u * (p.drugPriceCut / 100) * drugR;
    var expansions = d.cLtc + d.cBh + d.cDvh + d.cEmsPh + d.cUnits + d.cRd + d.cWf + d.cItOp;
    var adminNet = (d.legacyAdmin + d.newAdmin + d.govCost) - (B.netInsCost + B.govtAdmin) * G;
    var oneTime = d.trans + d.itcap + d.shock;

    var steps = [
      { label: "Status-quo baseline (2041)", value: d.nheBase, kind: "total" },
      { label: "Demand response (coverage + $0 care)", value: utilAdd, kind: "add" },
      { label: "Benefit expansions (LTC, BH, DVH, EMS, units…)", value: expansions, kind: "add" }
    ];
    if (Math.abs(oneTime) > 0.5) {
      steps.push({ label: "Transition & shocks (residual)", value: oneTime, kind: "add" });
    }
    steps.push(
      { label: "Administration & governance (net change)", value: adminNet,
        kind: adminNet >= 0 ? "add" : "sub" },
      { label: "Provider payment-rate compression", value: -paySave, kind: "sub" },
      { label: "Drug price negotiation", value: -drugSave, kind: "sub" },
      { label: "Provider billing & revenue-cycle savings", value: -d.offProvAdmin, kind: "sub" },
      { label: "Care-model savings (ED diversion, admissions)", value: -d.offCareModel, kind: "sub" },
      { label: "Low-value care reduction", value: -d.offLowValue, kind: "sub" },
      { label: "Extraction limits", value: -d.offExtraction, kind: "sub" },
      { label: "NHA total (2041)", value: d.nheNha, kind: "total" }
    );

    /* identity check — surfaced in the self-test footer */
    var running = d.nheBase + utilAdd + expansions + oneTime + adminNet -
      paySave - drugSave - d.offProvAdmin - d.offCareModel - d.offLowValue - d.offExtraction;
    NHA._bridgeIdentityError = Math.abs(running - d.nheNha);
    return steps;
  }

  function renderBridge() {
    var steps = bridgeSteps();
    NHA.renderBridgeChart($("bridge-chart"), steps, DEF);
    var tbl = $("bridge-table");
    tbl.innerHTML = "";
    var thead = tbl.createTHead().insertRow();
    ["Component", "Effect (2024$)"].forEach(function (h, i) {
      var th = document.createElement("th");
      th.textContent = h; if (i) th.className = "num";
      thead.appendChild(th);
    });
    var tb = tbl.createTBody();
    steps.forEach(function (s) {
      var row = tb.insertRow();
      row.insertCell().textContent = s.label;
      var c = row.insertCell(); c.className = "num";
      var v = s.value * DEF;
      c.textContent = (s.kind === "total" ? "" : (v >= 0 ? "+" : "−")) +
        NHA.fmt.money(Math.abs(v));
    });
    renderSelfTests(); // bridge identity feeds the footer
  }

  /* ---------- Financing ---------- */
  function renderFinancing() {
    var t = mc.years.length - 2; // 2041
    var d = mc.modePath.detail[t];
    var need = d.pubCost;
    var fedUse = Math.min(d.fedRedirect, need);
    var stateUse = Math.min(d.stateMoe, Math.max(0, need - fedUse));
    var empUse = Math.min(d.empContrib, Math.max(0, need - fedUse - stateUse));
    var fbUse = Math.min(d.taxFeedback || 0, Math.max(0, need - fedUse - stateUse - empUse));
    var newRev = Math.max(0, need - fedUse - stateUse - empUse - fbUse);

    NHA.renderFinancingChart($("financing-chart"), {
      segments: [
        { label: "Redirected federal spending", value: fedUse, color: "var(--series-1)" },
        { label: "State maintenance-of-effort", value: stateUse, color: "var(--series-2)" },
        { label: "Employer contribution", value: empUse, color: "var(--series-3)" },
        { label: "Tax on wage pass-through", value: fbUse, color: "var(--series-7)" },
        { label: "New revenue needed", value: newRev, color: "var(--series-5)" }
      ],
      gap: { label: "New revenue needed", value: newRev },
      wealth: { label: "Wealth-tax package (after collection losses)", value: d.wealthRevenue }
    }, DEF);

    var covered = d.wealthRevenue / (newRev || 1);
    $("financing-note").textContent =
      "Under these assumptions the extreme-wealth package covers " +
      (newRev <= 0 ? "the entire gap (no new revenue needed)" :
        Math.min(999, Math.round(100 * covered)) + "% of the new-revenue requirement") +
      ". The framework's remaining instruments (high-income and capital-income taxes, " +
      "health-sector rent taxes, and the broad backstop) must cover the rest. " +
      "The framework caps ordinary-household incremental burden at 5% (KPP-C8).";

    var tbl = $("financing-table");
    tbl.innerHTML = "";
    var thead = tbl.createTHead().insertRow();
    ["Source (mature year 2041)", "Amount (2024$)"].forEach(function (h, i) {
      var th = document.createElement("th");
      th.textContent = h; if (i) th.className = "num";
      thead.appendChild(th);
    });
    var tb = tbl.createTBody();
    [["Total public cost", need], ["Redirected federal spending", fedUse],
     ["State maintenance-of-effort", stateUse], ["Employer contribution", empUse],
     ["Income/payroll tax on wages passed through from employer savings", fbUse],
     ["New revenue needed", newRev],
     ["...of which the wealth-tax package could cover", Math.min(newRev, d.wealthRevenue)]]
      .forEach(function (r) {
        var row = tb.insertRow();
        row.insertCell().textContent = r[0];
        var c = row.insertCell(); c.className = "num";
        c.textContent = NHA.fmt.money(r[1] * DEF);
      });
  }

  /* ---------- Benchmarks ---------- */
  function renderBenchmarks() {
    NHA.renderBenchmarkChart($("benchmark-nhe"), [
      { label: "This model: mature system at 2024 scale", note: "real 2024$",
        lo: mc.steady.matureToday.p10 * DEF, hi: mc.steady.matureToday.p90 * DEF,
        mid: mc.steady.matureToday.p50 * DEF, color: "var(--series-1)" },
      { label: "Actual U.S. health spending, 2024", note: "CMS preliminary",
        lo: 5250, hi: 5350, mid: 5300, color: "var(--baseline-series)" }
    ], { aria: "Total system cost comparison, all at 2024 scale" });

    NHA.renderBenchmarkChart($("benchmark-fed"), [
      { label: "This model, mature year", note: "real 2024$",
        lo: mc.steady.fedIncrease.p10 * DEF, hi: mc.steady.fedIncrease.p90 * DEF,
        mid: mc.steady.fedIncrease.p50 * DEF, color: "var(--series-1)" },
      { label: "This model, first decade (annualized)", note: "includes transition costs",
        lo: mc.tenYearFedIncAnnualized.p10 * DEF, hi: mc.tenYearFedIncAnnualized.p90 * DEF,
        mid: mc.tenYearFedIncAnnualized.p50 * DEF, color: "var(--series-1)" },
      { label: "CBO single-payer options (2030)", note: "study's own dollars",
        lo: NHA.BENCHMARKS.cboFedIncrease.low, hi: NHA.BENCHMARKS.cboFedIncrease.high,
        mid: null, color: "var(--series-3)" },
      { label: "Urban Institute / Mercatus (annualized)", note: "study's own dollars",
        lo: NHA.BENCHMARKS.urbanMercatus.low, hi: NHA.BENCHMARKS.urbanMercatus.high,
        mid: null, color: "var(--series-3)" }
    ], { aria: "Added federal cost comparison" });

    var d30 = mc.nhe2030delta;
    $("benchmark-note").textContent =
      "CBO also estimated that total national health spending in 2030 would change by " +
      "−$700B to +$300B under its illustrative single-payer designs. This model's 2030 " +
      "change vs. baseline is " + NHA.fmt.moneyShort(d30.p10 * DEF) + " to " +
      NHA.fmt.moneyShort(d30.p90 * DEF) + " (median " + NHA.fmt.moneyShort(d30.p50 * DEF) +
      "). Note that 2030 is mid-transition here (coverage ~85%, expansions not yet phased in), " +
      "and published benchmarks are in each study's own dollars, so treat these as " +
      "order-of-magnitude checks, not exact comparisons.";
  }

  /* ---------- Money flow (today vs NHA) ---------- */
  function renderMoneyFlow() {
    /* Today: static CMS 2023 sponsor→channel map — rendered twice: solo in
       "The system today" (Act 1) and again in the comparison section */
    var todaySpec = {
      sources: NHA.MONEYFLOW.sources,
      channels: NHA.MONEYFLOW.channels,
      ribbons: NHA.MONEYFLOW.ribbons,
      aria: "How U.S. health spending is funded today: households, employers, federal, state, and other private sources flowing to private insurance, Medicare, Medicaid, out-of-pocket bills, and other programs"
    };
    if ($("flow-today-solo")) NHA.renderFlowDiagram($("flow-today-solo"), todaySpec);
    NHA.renderFlowDiagram($("flow-today"), todaySpec);

    /* NHA: mature-year financing scaled to 2024 economy (matches the hero) */
    var i41 = mc.years.indexOf(2041);
    var d = mc.modePath.detail[i41];
    var k = (mc.steady.matureToday.p50 / d.nheNha) * DEF;
    var fed = d.fedRedirect * k, state = d.stateMoe * k, emp = d.empContrib * k;
    var newRev = d.newRevenue * k;
    var hhTax = 0.05 * newRev, progTax = 0.95 * newRev;
    var pub = d.pubCost * k;
    var residual = Math.max(0, d.nheNha - d.pubCost) * k;

    $("flow-nha-title").textContent =
      "Under NHA: mature system at 2024 scale (" +
      NHA.fmt.money(pub + residual) + ")";

    NHA.renderFlowDiagram($("flow-nha"), {
      sources: [
        { id: "hh",     label: "Households",             value: hhTax + residual, color: "var(--series-1)" },
        { id: "emp",    label: "Employers",              value: emp,   color: "var(--series-2)" },
        { id: "wealth", label: "Wealth & high incomes",  value: progTax, color: "var(--series-6)" },
        { id: "fed",    label: "Federal government",     value: fed,   color: "var(--series-5)" },
        { id: "state",  label: "State & local",          value: state, color: "var(--series-3)" }
      ],
      channels: [
        { id: "pub", label: "NHA public payer", value: pub },
        { id: "res", label: "Residual private & OOP", value: residual }
      ],
      ribbons: [
        { from: "fed",    to: "pub", value: fed,   note: "what Washington already spends on Medicare, Medicaid, ACA, and VA care, redirected" },
        { from: "state",  to: "pub", value: state, note: "state maintenance-of-effort (today's Medicaid share)" },
        { from: "emp",    to: "pub", value: emp,   note: "payroll contribution replacing today's premium payments" },
        { from: "wealth", to: "pub", value: progTax, note: "95% of new revenue from wealth, high-income, capital, and health-rent taxes, as designed; test achievability on the Taxes & Financing tab" },
        { from: "hh",     to: "pub", value: hhTax, note: "ordinary households capped at 5% of new financing (KPP-C8)" },
        { from: "hh",     to: "res", value: residual, note: "supplemental coverage and non-covered extras that stay private" }
      ],
      aria: "How the mature NHA system would be funded: redirected federal and state spending, employer payroll contributions, progressive taxes, and a capped ordinary-household share, nearly all flowing to a single public payer"
    });

    renderSponsorTable();

    $("flow-takeaway").textContent =
      "Same care, roughly the same total spending, different routes. Today a family pays " +
      "premiums to an insurer and bills at the point of care; under NHA those payments stop, " +
      "and the money reaches the same doctors and hospitals through public financing instead. " +
      "The " + NHA.fmt.money(newRev) + "/yr of “new revenue” (at 2024 scale) is new to the " +
      "federal budget, not new cost to society. Most of it replaces the " +
      NHA.fmt.money(d.householdRelief * k) + "/yr households currently spend on premiums and " +
      "out-of-pocket care, which drops to roughly zero.";
  }

  /* Outcomes the model does not price (static, sourced) */
  function renderOutcomeTiles() {
    var host = $("outcome-tiles");
    host.innerHTML = "";
    NHA.OUTCOME_STATS.forEach(function (s) {
      var tl = document.createElement("div"); tl.className = "tile";
      var v = document.createElement("div"); v.className = "value"; v.textContent = s.value;
      var l = document.createElement("div"); l.className = "label"; l.textContent = s.label;
      var r = document.createElement("div"); r.className = "range"; r.textContent = s.note;
      tl.appendChild(v); tl.appendChild(l); tl.appendChild(r);
      var badge = document.createElement("span");
      badge.className = "conf " + s.confidence;
      badge.textContent = s.confidence;
      r.appendChild(document.createTextNode(" "));
      r.appendChild(badge);
      host.appendChild(tl);
    });
  }

  /* Demographic decomposition of baseline growth (static, computed once) */
  function renderGrowthDecomp() {
    var A = NHA.AGE_STRUCTURE.bands;
    var idx24 = 0, idx41 = 0;
    A.forEach(function (b) {
      idx24 += b.share2024 * b.costw;
      idx41 += b.share2041 * b.costw;
    });
    var agingPP = 100 * (Math.pow(idx41 / idx24, 1 / 17) - 1); /* per year, 2024→2041 */
    var eff = NHA.effectiveParams(state.scenario, state.sliders);
    var totalG = eff.baselineRealGrowth.mode;
    $("growth-decomp").textContent =
      "Where the growth comes from: shifting age structure alone (the 65+ share " +
      "rises from ~19% to ~23% by 2041, and 85+ from ~1.9% to ~2.9%) contributes " +
      "about " + agingPP.toFixed(1) + " points of the " + totalG.toFixed(1) +
      "%/yr real growth assumption, computed from Census age projections and " +
      "CMS/MEPS per-capita spending by age (85+ households use about 4.4 times " +
      "the average). The rest is per-person cost growth: technology, intensity, " +
      "and prices. Population growth adds ~0.4%/yr on top in the totals.";
  }

  /* "What's wrong, by the numbers" — static sourced stat tiles */
  function renderProblemTiles() {
    var host = $("problem-tiles");
    host.innerHTML = "";
    NHA.PROBLEM_STATS.forEach(function (s) {
      var tl = document.createElement("div"); tl.className = "tile";
      var v = document.createElement("div"); v.className = "value"; v.textContent = s.value;
      var l = document.createElement("div"); l.className = "label"; l.textContent = s.label;
      var r = document.createElement("div"); r.className = "range"; r.textContent = s.note;
      tl.appendChild(v); tl.appendChild(l); tl.appendChild(r);
      host.appendChild(tl);
    });
  }

  /* Sponsor table: today's distribution with composition notes */
  function renderSponsorTable() {
    var tbl = $("sponsor-table");
    if (tbl.rows.length) return; /* static — build once */
    var hd = tbl.insertRow();
    ["Who pays", "2023 amount", "Share", "What it consists of"].forEach(function (h) {
      var th = document.createElement("th"); th.textContent = h; hd.appendChild(th);
    });
    NHA.MONEYFLOW.sources.forEach(function (s) {
      var tr = tbl.insertRow();
      tr.insertCell().textContent = s.label;
      tr.insertCell().textContent = NHA.fmt.money(s.value);
      tr.insertCell().textContent = Math.round(100 * s.value / NHA.MONEYFLOW.total) + "%";
      var notes = NHA.MONEYFLOW.ribbons
        .filter(function (r) { return r.from === s.id; })
        .map(function (r) {
          var ch = NHA.MONEYFLOW.channels.filter(function (c) { return c.id === r.to; })[0];
          return ch.label + " " + NHA.fmt.moneyShort(r.value) + " (" + r.note + ")";
        });
      tr.insertCell().textContent = notes.join("; ");
    });
  }

  /* ---------- Parameter table + gaps ---------- */
  function renderParamTable() {
    var tbl = $("param-table");
    tbl.innerHTML = "";
    var thead = tbl.createTHead().insertRow();
    ["Parameter", "Low", "Central", "High", "Unit", "Confidence", "Source"].forEach(function (h, i) {
      var th = document.createElement("th");
      th.textContent = h;
      if (i >= 1 && i <= 3) th.className = "num";
      thead.appendChild(th);
    });
    var tb = tbl.createTBody();
    NHA.PARAM_DEFS.forEach(function (p) {
      var row = tb.insertRow();
      row.insertCell().textContent = p.label;
      [p.low, p.mode, p.high].forEach(function (v) {
        var cell = row.insertCell(); cell.className = "num";
        cell.textContent = (typeof v === "number") ? (+v.toFixed(2)).toLocaleString("en-US") : v;
      });
      row.insertCell().textContent = p.unit;
      var cc = row.insertCell();
      var badge = document.createElement("span");
      badge.className = "conf " + p.confidence;
      badge.textContent = p.confidence;
      cc.appendChild(badge);
      var sc = row.insertCell();
      sc.textContent = p.source + " ";
      if (p.url) {
        var a = document.createElement("a");
        a.href = p.url; a.target = "_blank"; a.rel = "noopener";
        a.textContent = "[link]";
        sc.appendChild(a);
      }
    });

    var lows = NHA.PARAM_DEFS.filter(function (p) { return p.confidence === "low"; });
    $("gaps-list").textContent = " " + lows.map(function (p) { return p.label; }).join(" · ");
  }

  /* ---------- Self-tests ---------- */
  function renderSelfTests() {
    var host = $("selftest");
    host.innerHTML = "";
    var results = NHA.selfTest();
    results.push({
      name: "Bridge decomposition matches engine total exactly",
      ok: (NHA._bridgeIdentityError || 0) < 0.01,
      note: "err=" + (NHA._bridgeIdentityError || 0).toExponential(1)
    });
    /* tax-model tests register via NHA.SELFTESTS (taxmodel.js) */
    (NHA.SELFTESTS || []).forEach(function (t) {
      var ok = false, note = "";
      try { ok = !!t.run(); } catch (e) { note = String(e); }
      results.push({ name: t.name, ok: ok, note: note });
    });
    var passed = results.filter(function (r) { return r.ok; }).length;
    var head = document.createElement("div");
    var status = document.createElement("span");
    status.className = passed === results.length ? "pass" : "fail";
    status.textContent = passed === results.length
      ? "All " + results.length + " model self-tests pass."
      : (results.length - passed) + " of " + results.length + " self-tests FAILING.";
    head.appendChild(document.createTextNode("Model integrity: "));
    head.appendChild(status);
    host.appendChild(head);
    var ul = document.createElement("ul");
    results.forEach(function (r) {
      var li = document.createElement("li");
      li.textContent = (r.ok ? "✓ " : "✗ ") + r.name + (r.ok ? "" : ": " + r.note);
      ul.appendChild(li);
    });
    host.appendChild(ul);
  }

  /* ---------- Boot ---------- */
  buildControls();
  renderParamTable();
  renderProblemTiles();
  renderOutcomeTiles();
  renderGrowthDecomp();
  NHA.renderCareCards($("care-cards"));
  recompute(); // must run before the household calc first reads model numbers
  NHA.renderHouseholdCalc($("household-calc"), modelNumbersForHousehold);
})();
