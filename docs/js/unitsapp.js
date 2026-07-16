/* =========================================================================
 * Unit Network tab: need-based allocation of the four-type community
 * diagnostic-treatment network across every U.S. county.
 *
 * Method (documented on the page): county demand = population × network
 * visits per person per year (adjustable). Urban and rural visits split
 * across unit types by role; counts = visits ÷ per-type annual throughput,
 * with rural access floors. This is a capacity plan derived from need, not
 * a reproduction of the framework's 15,000 figure; the page states the
 * verdict either way.
 *
 * Data: docs/data/counties.json (Census 2024 population, 2020 rural shares,
 * gazetteer coordinates) and docs/data/us-states.json (simplified state
 * boundaries). See docs/data/SOURCES.md.
 * ========================================================================= */
"use strict";
(function () {
  function $(id) { return document.getElementById(id); }

  /* ---- Unit type definitions: role, staffing, costs ($M, 2024) ----------
   * Cost basis (research/02): urgent-care centers run ~$1.2–2.2M/yr with
   * ~8–12 FTE; retail clinics far less; rural sites carry a premium for
   * extended capability and low volume; high-volume urban sites more staff.
   * Capital: fit-out + equipment, one-time. All medium confidence.        */
  NHA.UNIT_TYPES = {
    a: { key: "a", name: "Type A: Micro-unit",
      color: "var(--series-2)",
      opLo: 0.30, opMode: 0.45, opHi: 0.65, capital: 0.25,
      throughput: 15000, staff: "2–3 (nurse/tech + teleclinician link)",
      role: "Sits inside pharmacies, groceries, schools, workplaces, and transit hubs. Vitals, point-of-care tests, vaccinations, prescription refills, screening, and a teleclinician on screen for anything ambiguous." },
    b: { key: "b", name: "Type B: Neighborhood unit",
      color: "var(--series-1)",
      opLo: 1.2, opMode: 1.6, opHi: 2.2, capital: 1.8,
      throughput: 30000, staff: "~10 (physician or senior NP/PA lead, nurses, techs)",
      role: "The default urgent-care replacement and the network's workhorse: ECG, basic labs, X-ray, splinting, common procedures, uncomplicated respiratory/ENT/UTI/skin/musculoskeletal care, chronic-disease measurement and follow-up." },
    c: { key: "c", name: "Type C: Rural enhanced unit",
      color: "var(--series-3)",
      opLo: 2.0, opMode: 2.6, opHi: 3.5, capital: 3.5,
      throughput: 12000, staff: "~14 (adds observation nursing, ultrasound, EMS liaison)",
      role: "Everything Type B does, plus tele-specialty, longer observation, point-of-care ultrasound, limited IV therapy, EMS coordination, maternal and pediatric triage, and mobile outreach. Built to hold a patient safely when the nearest hospital is an hour away." },
    d: { key: "d", name: "Type D: Urban public-health unit",
      color: "var(--series-6)",
      opLo: 2.5, opMode: 3.4, opHi: 4.5, capital: 4.5,
      throughput: 40000, staff: "~20 (adds behavioral-health and public-health staff)",
      role: "High-volume urban front door: respiratory surge capacity, vaccines, STI and reproductive services, behavioral-health touchpoints, addiction-care linkage, wound care, heat/smoke/climate response, and neighborhood outreach." }
  };

  /* ---- Allocation assumptions -------------------------------------------
   * visitsPerCapita: network visits absorbed per person per year at
   * maturity. Basis: ~1.11B ambulatory encounters/yr today (CDC NAMCS
   * office visits + NHAMCS ED + hospital OPD) ≈ 3.3/person; the framework
   * expects the network to absorb 40–55% of encounters at maturity
   * (source package), giving ~1.3–1.8 per person. Adjustable.
   * Visit mix: urban visits split A 28% / B 57% / D 15% (D only in
   * counties with ≥200k urban residents, otherwise folded into B);
   * rural visits split B 30% / C 70%. Rural floors guarantee access.    */
  var visitsPerCapita = 1.5;

  var DATA = { counties: null, states: null, error: null };
  var typeFilter = "all";
  var allocated = null; /* {counties, totals, costs} */

  function allocate() {
    var T = NHA.UNIT_TYPES;
    var totals = { a: 0, b: 0, c: 0, d: 0, total: 0, pop: 0, floored: 0 };
    DATA.counties.forEach(function (c) {
      var urbanPop = c.p * (1 - c.r), ruralPop = c.p * c.r;
      var uv = urbanPop * visitsPerCapita, rv = ruralPop * visitsPerCapita;

      var a = uv * 0.28 / T.a.throughput;
      var dRaw = uv * 0.15;
      var d = 0, bExtra = 0;
      if (urbanPop >= 200000) d = dRaw / T.d.throughput;
      else bExtra = dRaw; /* small-city D demand folds into B */
      var b = (uv * 0.57 + bExtra + rv * 0.30) / T.b.throughput;
      var cc = rv * 0.70 / T.c.throughput;

      a = Math.round(a); b = Math.round(b); cc = Math.round(cc); d = Math.round(d);

      /* rural access floor: majority-rural or small counties keep a C */
      if ((c.r >= 0.5 || c.p < 20000) && ruralPop > 0 && cc === 0) { cc = 1; totals.floored++; }
      /* every county gets at least one unit of its dominant character */
      if (a + b + cc + d === 0) {
        if (c.r >= 0.5) cc = 1; else b = 1;
        totals.floored++;
      }
      c.units = { a: a, b: b, c: cc, d: d, total: a + b + cc + d };
      totals.a += a; totals.b += b; totals.c += cc; totals.d += d;
      totals.total += c.units.total; totals.pop += c.p;
    });

    var costs = {};
    ["a", "b", "c", "d"].forEach(function (k) {
      costs[k] = {
        op: totals[k] * T[k].opMode / 1000,       /* $B/yr */
        opLo: totals[k] * T[k].opLo / 1000,
        opHi: totals[k] * T[k].opHi / 1000,
        capital: totals[k] * T[k].capital / 1000  /* $B one-time */
      };
    });
    costs.opTotal = costs.a.op + costs.b.op + costs.c.op + costs.d.op;
    costs.opTotalLo = costs.a.opLo + costs.b.opLo + costs.c.opLo + costs.d.opLo;
    costs.opTotalHi = costs.a.opHi + costs.b.opHi + costs.c.opHi + costs.d.opHi;
    costs.capitalTotal = costs.a.capital + costs.b.capital + costs.c.capital + costs.d.capital;

    allocated = { totals: totals, costs: costs };
  }

  /* ---- renderers ---- */
  function fmtB(x) { return "$" + (x >= 10 ? Math.round(x) : x.toFixed(1)) + "B"; }

  function renderTypeCards() {
    var host = $("unit-type-cards");
    host.innerHTML = "";
    ["a", "b", "c", "d"].forEach(function (k) {
      var t = NHA.UNIT_TYPES[k];
      var n = allocated.totals[k];
      var card = document.createElement("div");
      card.className = "care-card";
      var title = document.createElement("div");
      title.className = "care-title";
      var swatch = document.createElement("span");
      swatch.className = "legend-swatch"; swatch.style.background = t.color;
      swatch.style.marginRight = "7px";
      title.appendChild(swatch);
      title.appendChild(document.createTextNode(t.name));
      card.appendChild(title);

      var count = document.createElement("div");
      count.className = "care-nha-val";
      count.style.color = "var(--text-primary)";
      count.textContent = n.toLocaleString("en-US") + " units";
      card.appendChild(count);

      var role = document.createElement("div");
      role.className = "care-row-note"; role.style.marginTop = "6px";
      role.textContent = t.role;
      card.appendChild(role);

      var facts = document.createElement("div");
      facts.className = "care-src"; facts.style.marginTop = "9px";
      facts.textContent =
        "Staffing: " + t.staff + " · Throughput: ~" +
        (t.throughput / 1000) + "k visits/yr · Operating cost: $" +
        t.opMode + "M/yr each ($" + t.opLo + "–" + t.opHi + "M) · Build-out: $" +
        t.capital + "M · National: " + fmtB(allocated.costs[k].op) + "/yr + " +
        fmtB(allocated.costs[k].capital) + " capital";
      card.appendChild(facts);
      host.appendChild(card);
    });
  }

  function renderVerdict() {
    var t = allocated.totals, c = allocated.costs;
    $("unit-verdict").innerHTML = "";
    var tiles = [
      { label: "Total units, need-based", value: t.total.toLocaleString("en-US"),
        range: "at " + visitsPerCapita.toFixed(2) + " network visits/person/yr" },
      { label: "Framework's figure (SR-ACC-010)", value: "≥ 15,000",
        range: t.total > 16500
          ? "the floor undercounts need by ~" + Math.round(100 * (t.total - 15000) / 15000) +
            "%; either build ~" + Math.round(t.total / 1000) + "k or certify existing urgent-care/retail/FQHC sites into the network"
          : "consistent with the need-based count at these assumptions" },
      { label: "Network operating cost", value: fmtB(c.opTotal) + "/yr",
        range: fmtB(c.opTotalLo) + " – " + fmtB(c.opTotalHi) +
          " · healthcare model's parameter covers $15–36B" },
      { label: "One-time build-out", value: fmtB(c.capitalTotal),
        range: "part of the model's IT-and-infrastructure capital envelope" }
    ];
    tiles.forEach(function (it) {
      var tl = document.createElement("div"); tl.className = "tile";
      var l = document.createElement("div"); l.className = "label"; l.textContent = it.label;
      var v = document.createElement("div"); v.className = "value"; v.textContent = it.value;
      var r = document.createElement("div"); r.className = "range"; r.textContent = it.range;
      tl.appendChild(l); tl.appendChild(v); tl.appendChild(r);
      $("unit-verdict").appendChild(tl);
    });
  }

  function typeColorsPlain() {
    /* resolve CSS variables for SVG fills (SVG attr can use var(), but
       resolve anyway for safety in older browsers) */
    return { a: "var(--series-2)", b: "var(--series-1)",
             c: "var(--series-3)", d: "var(--series-6)" };
  }

  function renderMap() {
    NHA.renderUnitsMap($("units-map"), DATA.states, DATA.counties,
      typeFilter, typeColorsPlain());
  }

  function renderStateTable() {
    var byState = {};
    DATA.counties.forEach(function (c) {
      var s = byState[c.s] || (byState[c.s] = { a: 0, b: 0, c: 0, d: 0, total: 0, pop: 0 });
      s.a += c.units.a; s.b += c.units.b; s.c += c.units.c; s.d += c.units.d;
      s.total += c.units.total; s.pop += c.p;
    });
    var rows = Object.keys(byState).map(function (k) {
      var s = byState[k]; s.st = k; return s;
    }).sort(function (x, y) { return y.total - x.total; });

    var tbl = $("units-state-table");
    tbl.innerHTML = "";
    var hd = tbl.insertRow();
    ["State", "Population", "Type A", "Type B", "Type C", "Type D", "Total",
     "People per unit"].forEach(function (h) {
      var th = document.createElement("th"); th.textContent = h; hd.appendChild(th);
    });
    rows.forEach(function (s) {
      var tr = tbl.insertRow();
      [s.st, s.pop.toLocaleString("en-US"), s.a, s.b, s.c, s.d, s.total,
       Math.round(s.pop / s.total).toLocaleString("en-US")].forEach(function (v) {
        tr.insertCell().textContent = String(v);
      });
    });
  }

  function renderIntegrity() {
    var n = DATA.counties.length;
    var pop = allocated.totals.pop;
    var allCovered = DATA.counties.every(function (c) { return c.units.total >= 1; });
    $("units-integrity").textContent =
      "Data integrity: " + n.toLocaleString("en-US") + " counties loaded · " +
      (pop / 1e6).toFixed(1) + "M people covered · every county has at least one unit: " +
      (allCovered ? "yes" : "NO (bug)") + " · " + allocated.totals.floored +
      " counties reached only by the rural access floor.";
  }

  function refresh() {
    allocate();
    renderTypeCards();
    renderVerdict();
    renderMap();
    renderStateTable();
    renderIntegrity();
  }

  /* ---- controls ---- */
  function wireControls() {
    var slider = $("units-vpc");
    var lab = $("units-vpc-val");
    slider.addEventListener("input", function () {
      visitsPerCapita = parseFloat(slider.value);
      lab.textContent = visitsPerCapita.toFixed(2) + " visits/person/yr";
      refresh();
    });
    lab.textContent = visitsPerCapita.toFixed(2) + " visits/person/yr";

    document.querySelectorAll("#units-filter button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        typeFilter = btn.getAttribute("data-type");
        document.querySelectorAll("#units-filter button").forEach(function (b) {
          b.className = b === btn ? "active" : "";
        });
        renderMap();
      });
    });
  }

  /* ---- boot: load data, then render ---- */
  Promise.all([
    fetch("data/counties.json").then(function (r) {
      if (!r.ok) throw new Error("counties.json " + r.status);
      return r.json();
    }),
    fetch("data/us-states.json").then(function (r) {
      if (!r.ok) throw new Error("us-states.json " + r.status);
      return r.json();
    })
  ]).then(function (res) {
    DATA.counties = res[0].map(function (c) {
      return { f: c.f, n: c.n, s: c.s, p: c.p, r: c.r, la: c.la, lo: c.lo };
    });
    DATA.states = res[1];
    wireControls();
    refresh();
  }).catch(function (e) {
    DATA.error = String(e);
    var host = $("units-map");
    if (host) host.textContent =
      "County data failed to load (" + DATA.error + "). The Unit Network tab " +
      "needs docs/data/counties.json and docs/data/us-states.json.";
  });
})();
