/* =========================================================================
 * Tax view charts — same spec as charts.js (2px lines, 10% washes, ≤24px
 * bars with 4px rounded data-ends, hairline grids, crosshair/per-mark
 * tooltips, legends for ≥2 series, ink-token text).
 * ========================================================================= */
"use strict";
(function () {
  var U = NHA._chartUtil;
  var el = U.el, div = U.div, niceTicks = U.niceTicks,
      showTip = U.showTip, hideTip = U.hideTip, tipRow = U.tipRow, barPath = U.barPath;

  /* Instrument → categorical slot. >8 series folds smallest into "Other". */
  var STACK_ORDER = ["payroll", "surtax", "wealth", "vat", "sscap", "corp", "ftt", "_other"];
  var SLOT = {
    payroll: "var(--series-1)", surtax: "var(--series-2)", wealth: "var(--series-3)",
    vat: "var(--series-4)", sscap: "var(--series-5)", corp: "var(--series-6)",
    ftt: "var(--series-7)", _other: "var(--series-8)"
  };
  var OTHER_IDS = ["capgains", "estate", "rents"];

  function labelFor(id) {
    if (id === "_other") return "Other levies (cap-gains, estate, rents)";
    var ins = NHA.TAX.INSTRUMENTS.filter(function (i) { return i.id === id; })[0];
    return ins ? ins.label : id;
  }

  /* ---- 1. Revenue vs need, stacked area over years ---- */
  NHA.renderRevenueNeedChart = function (container, comp) {
    container.innerHTML = "";
    var W = 860, H = 340, M = { l: 64, t: 16, r: 24, b: 40 };
    var years = comp.years;

    /* fold small instruments into _other */
    var series = {};
    STACK_ORDER.forEach(function (id) { series[id] = years.map(function () { return 0; }); });
    Object.keys(comp.byInstrument).forEach(function (id) {
      var target = OTHER_IDS.indexOf(id) >= 0 ? "_other" : id;
      comp.byInstrument[id].forEach(function (v, i) { series[target][i] += v; });
    });

    var maxY = 0;
    years.forEach(function (_, i) {
      var s = 0;
      STACK_ORDER.forEach(function (id) { s += series[id][i]; });
      maxY = Math.max(maxY, s, comp.need[i]);
    });
    maxY *= 1.08;

    var x = function (i) { return M.l + (W - M.l - M.r) * (i / (years.length - 1)); };
    var y = function (v) { return H - M.b - (H - M.t - M.b) * (v / maxY); };

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img",
      "aria-label": "Tax revenue by instrument versus funding need, by year" }, container);

    niceTicks(0, maxY, 5).forEach(function (tv) {
      el("line", { x1: M.l, x2: W - M.r, y1: y(tv), y2: y(tv), class: "gridline" }, svg);
      var t = el("text", { x: M.l - 8, y: y(tv) + 4, class: "axis-text", "text-anchor": "end" }, svg);
      t.textContent = NHA.fmt.axis(tv);
    });
    years.forEach(function (yr, i) {
      if (yr % 3 !== 0) return;
      var t = el("text", { x: x(i), y: H - 14, class: "axis-text", "text-anchor": "middle" }, svg);
      t.textContent = yr;
    });
    el("line", { x1: M.l, x2: W - M.r, y1: y(0), y2: y(0), class: "baseline-axis" }, svg);

    /* stacked areas (washes) + top strokes */
    var cum = years.map(function () { return 0; });
    STACK_ORDER.forEach(function (id) {
      var vals = series[id];
      if (vals.every(function (v) { return v < 0.5; })) return;
      var lower = cum.slice();
      var upper = cum.map(function (c, i) { return c + vals[i]; });
      var dTop = upper.map(function (v, i) { return (i ? "L" : "M") + x(i) + " " + y(v); }).join(" ");
      var dArea = dTop + " " + lower.slice().reverse().map(function (v, i) {
        var j = years.length - 1 - i;
        return "L" + x(j) + " " + y(v);
      }).join(" ") + " Z";
      el("path", { d: dArea, fill: SLOT[id], "fill-opacity": 0.32, stroke: "none" }, svg);
      el("path", { d: dTop, fill: "none", stroke: SLOT[id], "stroke-width": 2,
        "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
      cum = upper;
    });

    /* need line */
    var dNeed = years.map(function (_, i) { return (i ? "L" : "M") + x(i) + " " + y(comp.need[i]); }).join(" ");
    el("path", { d: dNeed, fill: "none", stroke: "var(--need-line)", "stroke-width": 2.5,
      "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
    var endLab = el("text", { x: x(years.length - 1) - 6, y: y(comp.need[years.length - 1]) - 8,
      class: "direct-label", "text-anchor": "end" }, svg);
    endLab.textContent = "Funding need";

    /* crosshair + tooltip */
    var hair = el("line", { y1: M.t, y2: H - M.b, class: "crosshair", visibility: "hidden" }, svg);
    var overlay = el("rect", { x: M.l, y: M.t, width: W - M.l - M.r, height: H - M.t - M.b,
      fill: "transparent" }, svg);
    overlay.addEventListener("pointermove", function (evt) {
      var r = svg.getBoundingClientRect();
      var px = (evt.clientX - r.left) * (W / r.width);
      var i = Math.round((px - M.l) / ((W - M.l - M.r) / (years.length - 1)));
      i = Math.max(0, Math.min(years.length - 1, i));
      hair.setAttribute("x1", x(i)); hair.setAttribute("x2", x(i));
      hair.setAttribute("visibility", "visible");
      var box = document.createElement("div");
      div("tip-head", box).textContent = years[i];
      tipRow(box, "", "Funding need", NHA.fmt.money(comp.need[i]), true);
      tipRow(box, "", "Total revenue", NHA.fmt.money(comp.totalRev[i]), true);
      var cov = comp.need[i] > 0 ? Math.round(100 * comp.totalRev[i] / comp.need[i]) + "%" : "—";
      tipRow(box, "", "Coverage", cov, false);
      STACK_ORDER.slice().reverse().forEach(function (id) {
        if (series[id][i] > 0.5) tipRow(box, SLOT[id], labelFor(id), NHA.fmt.money(series[id][i]), false);
      });
      showTip(box, evt.clientX, evt.clientY);
    });
    overlay.addEventListener("pointerleave", function () {
      hair.setAttribute("visibility", "hidden"); hideTip();
    });

    /* legend */
    var leg = div("legend", container);
    STACK_ORDER.forEach(function (id) {
      if (series[id].every(function (v) { return v < 0.5; })) return;
      var item = div("legend-item", leg);
      var sw = document.createElement("span");
      sw.className = "legend-swatch"; sw.style.background = SLOT[id];
      item.appendChild(sw);
      item.appendChild(document.createTextNode(labelFor(id)));
    });
    var needItem = div("legend-item", leg);
    var nl = document.createElement("span");
    nl.className = "legend-line"; nl.style.background = "var(--need-line)";
    needItem.appendChild(nl);
    needItem.appendChild(document.createTextNode("Funding need (all programs)"));
  };

  /* ---- 2. Net household impact by income group (diverging bars) ----
   * mode: "dollars" | "pct". Negative = net savings (cool pole), positive =
   * net cost (warm pole), neutral gray zero axis. */
  NHA.renderNetImpactChart = function (container, rows, mode) {
    container.innerHTML = "";
    var W = 860, rowH = 40, M = { l: 150, r: 110, t: 8, b: 34 };
    var H = M.t + rows.length * rowH + M.b;

    var vals = rows.map(function (r) {
      return mode === "pct" ? r.netPctIncome * 100 : r.netPerHH;
    });
    var lo = Math.min(0, Math.min.apply(null, vals));
    var hi = Math.max(0, Math.max.apply(null, vals));
    var pad = (hi - lo) * 0.12 || 1;
    lo -= pad; hi += pad;
    var x = function (v) { return M.l + (W - M.l - M.r) * ((v - lo) / (hi - lo)); };

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img",
      "aria-label": "Net annual household impact by income group: new taxes minus health-cost savings" }, container);

    niceTicks(lo, hi, 6).forEach(function (tv) {
      el("line", { x1: x(tv), x2: x(tv), y1: M.t, y2: H - M.b, class: "gridline" }, svg);
      var t = el("text", { x: x(tv), y: H - 12, class: "axis-text", "text-anchor": "middle" }, svg);
      t.textContent = mode === "pct" ? tv.toFixed(1) + "%"
        : (Math.abs(tv) >= 1000 ? "$" + (tv / 1000) + "k" : "$" + tv);
    });
    el("line", { x1: x(0), x2: x(0), y1: M.t, y2: H - M.b, class: "baseline-axis" }, svg);

    rows.forEach(function (r, i) {
      var v = vals[i];
      var cy = M.t + i * rowH + rowH / 2;
      var lab = el("text", { x: M.l - 10, y: cy + 4, class: "row-label", "text-anchor": "end" }, svg);
      lab.textContent = r.group.label;

      var isCost = v > 0;
      var color = isCost ? "var(--div-warm)" : "var(--div-cool)";
      var x0 = x(Math.min(0, v)), x1 = x(Math.max(0, v));
      var g = el("g", { class: "bench-row", tabindex: 0 }, svg);
      el("path", { d: barPath(x0, cy - 11, Math.max(2, x1 - x0), 22, 4, isCost ? "right" : "left"),
        fill: color, "fill-opacity": 0.85 }, g);

      var valTxt = mode === "pct"
        ? (v > 0 ? "+" : "") + v.toFixed(1) + "% of income"
        : (v > 0 ? "+$" : "−$") + Math.round(Math.abs(v)).toLocaleString("en-US");
      var vt = el("text", {
        x: isCost ? x1 + 8 : x0 - 8, y: cy + 4,
        class: "direct-label", "text-anchor": isCost ? "start" : "end"
      }, svg);
      vt.textContent = valTxt;

      function tipIt(evt) {
        var box = document.createElement("div");
        div("tip-head", box).textContent = r.group.label +
          " (avg income $" + Math.round(r.avgIncomeNow).toLocaleString("en-US") + ")";
        tipRow(box, "var(--div-warm)", "New taxes", "$" +
          Math.round(r.taxPerHH).toLocaleString("en-US") + "/hh/yr", false);
        tipRow(box, "var(--div-cool)", "Health costs eliminated", "−$" +
          Math.round(r.reliefPerHH).toLocaleString("en-US") + "/hh/yr", false);
        tipRow(box, "", "Net", (r.netPerHH > 0 ? "+$" : "−$") +
          Math.round(Math.abs(r.netPerHH)).toLocaleString("en-US") + "/hh/yr (" +
          (r.netPctIncome > 0 ? "+" : "") + (r.netPctIncome * 100).toFixed(1) + "% of income)", true);
        showTip(box, evt.clientX, evt.clientY);
      }
      g.addEventListener("pointermove", tipIt);
      g.addEventListener("pointerleave", hideTip);
    });

    var leg = div("legend", container);
    [["var(--div-cool)", "Net savings (health costs eliminated exceed new taxes)"],
     ["var(--div-warm)", "Net cost (new taxes exceed health savings)"]].forEach(function (pair) {
      var item = div("legend-item", leg);
      var sw = document.createElement("span");
      sw.className = "legend-swatch"; sw.style.background = pair[0];
      item.appendChild(sw);
      item.appendChild(document.createTextNode(pair[1]));
    });
  };

  /* ---- 3. Effective federal tax rate: current vs proposed (dumbbell) ---- */
  NHA.renderRateCurve = function (container, rows) {
    container.innerHTML = "";
    var W = 860, rowH = 38, M = { l: 150, r: 70, t: 8, b: 34 };
    var H = M.t + rows.length * rowH + M.b;
    var hi = Math.max.apply(null, rows.map(function (r) { return r.newRate; })) * 100 * 1.15;
    var x = function (v) { return M.l + (W - M.l - M.r) * (v / hi); };

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img",
      "aria-label": "Average federal tax rate by income group, current law versus proposed package" }, container);

    niceTicks(0, hi, 6).forEach(function (tv) {
      el("line", { x1: x(tv), x2: x(tv), y1: M.t, y2: H - M.b, class: "gridline" }, svg);
      var t = el("text", { x: x(tv), y: H - 12, class: "axis-text", "text-anchor": "middle" }, svg);
      t.textContent = Math.round(tv) + "%";
    });

    rows.forEach(function (r, i) {
      var cy = M.t + i * rowH + rowH / 2;
      var lab = el("text", { x: M.l - 10, y: cy + 4, class: "row-label", "text-anchor": "end" }, svg);
      lab.textContent = r.group.label;
      var c = r.curRate * 100, n = r.newRate * 100;
      var g = el("g", { class: "bench-row", tabindex: 0 }, svg);
      el("line", { x1: x(c), x2: x(n), y1: cy, y2: cy, stroke: "var(--gridline-strong)",
        "stroke-width": 2 }, g);
      el("circle", { cx: x(c), cy: cy, r: 5, fill: "var(--baseline-series)", class: "marker" }, g);
      el("circle", { cx: x(n), cy: cy, r: 5, fill: "var(--series-1)", class: "marker" }, g);
      var vt = el("text", { x: x(Math.max(c, n)) + 10, y: cy + 4, class: "direct-label" }, svg);
      vt.textContent = c.toFixed(1) + "% → " + n.toFixed(1) + "%";

      function tipIt(evt) {
        var box = document.createElement("div");
        div("tip-head", box).textContent = r.group.label;
        tipRow(box, "var(--baseline-series)", "Current law", c.toFixed(1) + "%", false);
        tipRow(box, "var(--series-1)", "With package", n.toFixed(1) + "%", true);
        tipRow(box, "", "Note", "new-tax dollars ÷ group income; excludes health savings", false);
        showTip(box, evt.clientX, evt.clientY);
      }
      g.addEventListener("pointermove", tipIt);
      g.addEventListener("pointerleave", hideTip);
    });

    var leg = div("legend", container);
    [["var(--baseline-series)", "Current law (CBO)"], ["var(--series-1)", "With this tax package"]].forEach(function (p) {
      var item = div("legend-item", leg);
      var sw = document.createElement("span");
      sw.className = "legend-swatch"; sw.style.borderRadius = "50%";
      sw.style.background = p[0];
      item.appendChild(sw);
      item.appendChild(document.createTextNode(p[1]));
    });
  };
})();
