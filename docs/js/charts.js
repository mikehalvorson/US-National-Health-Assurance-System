/* =========================================================================
 * Chart rendering — plain SVG, no dependencies.
 * Specs: 2px lines w/ round joins, 10%-opacity area washes, ≤24px bars with
 * 4px rounded data-ends (square at baseline), 2px surface gaps between
 * touching marks, hairline solid gridlines, crosshair + tooltip on line
 * charts, per-mark tooltips on bars, legend for ≥2 series, direct end
 * labels, text in ink tokens (never series colors).
 * ========================================================================= */
"use strict";
var NHA = window.NHA || {};
window.NHA = NHA;

(function () {
  var SVGNS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }
  function div(cls, parent) {
    var d = document.createElement("div");
    if (cls) d.className = cls;
    if (parent) parent.appendChild(d);
    return d;
  }

  /* ---- Formatting ---- */
  NHA.fmt = {
    /* $B → compact string; keeps one decimal below 10T */
    money: function (b) {
      if (!isFinite(b)) return "—";
      var neg = b < 0 ? "−" : "", a = Math.abs(b);
      if (a >= 1000) return neg + "$" + (a / 1000).toFixed(2) + "T";
      return neg + "$" + Math.round(a) + "B";
    },
    moneyShort: function (b) {
      var neg = b < 0 ? "−" : "", a = Math.abs(b);
      if (a >= 1000) return neg + "$" + (a / 1000).toFixed(1) + "T";
      return neg + "$" + Math.round(a) + "B";
    },
    pct: function (x, d) { return x.toFixed(d == null ? 1 : d) + "%"; },
    perCap: function (x) { return "$" + Math.round(x).toLocaleString("en-US"); },
    axis: function (b) {
      if (Math.abs(b) >= 1000) return "$" + (b / 1000) + "T";
      return "$" + b + "B";
    }
  };

  /* Nice ticks */
  function niceTicks(min, max, count) {
    var span = max - min || 1;
    var step = Math.pow(10, Math.floor(Math.log10(span / count)));
    var err = span / count / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var ticks = [], v = Math.ceil(min / step) * step;
    for (; v <= max + 1e-9; v += step) ticks.push(+v.toFixed(10));
    return ticks;
  }

  /* Shared tooltip singleton */
  var tip = null;
  function tooltip() {
    if (!tip) { tip = div("nha-tooltip", document.body); tip.style.display = "none"; }
    return tip;
  }
  function showTip(html, x, y) {
    var t = tooltip();
    t.innerHTML = "";
    t.appendChild(html);
    t.style.display = "block";
    var r = t.getBoundingClientRect();
    var px = Math.min(x + 14, window.innerWidth - r.width - 8);
    var py = Math.max(8, y - r.height - 10);
    t.style.left = px + "px"; t.style.top = py + "px";
  }
  function hideTip() { if (tip) tip.style.display = "none"; }
  NHA.hideTip = hideTip;

  function tipRow(parent, color, label, value, strong) {
    var row = div("tip-row", parent);
    if (color) {
      var key = document.createElement("span");
      key.className = "tip-key"; key.style.background = color;
      row.appendChild(key);
    }
    var val = document.createElement("span");
    val.className = strong ? "tip-val strong" : "tip-val";
    val.textContent = value;
    var lab = document.createElement("span");
    lab.className = "tip-label"; lab.textContent = label;
    row.appendChild(val); row.appendChild(lab);
    return row;
  }

  /* Bar with rounded data-end, square base. dir: "up" | "right" */
  function barPath(x, y, w, h, r, dir) {
    r = Math.min(r, dir === "right" ? w / 2 : h / 2, dir === "right" ? h / 2 : w / 2);
    if (r <= 0.5) return "M" + x + "," + y + " h" + w + " v" + h + " h" + (-w) + "Z";
    if (dir === "up") { /* rounded top corners */
      return "M" + x + "," + (y + h) + " V" + (y + r) +
        " Q" + x + "," + y + " " + (x + r) + "," + y +
        " H" + (x + w - r) +
        " Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) +
        " V" + (y + h) + "Z";
    }
    /* rounded right corners */
    return "M" + x + "," + y + " H" + (x + w - r) +
      " Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) +
      " V" + (y + h - r) +
      " Q" + (x + w) + "," + (y + h) + " " + (x + w - r) + "," + (y + h) +
      " H" + x + "Z";
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function legend(container, items) {
    var lg = div("chart-legend", container);
    items.forEach(function (it) {
      var e = div("legend-item", lg);
      var key = document.createElement("span");
      key.className = it.line ? "legend-line" : "legend-swatch";
      key.style.background = it.color;
      e.appendChild(key);
      var t = document.createElement("span");
      t.textContent = it.label;
      e.appendChild(t);
    });
    return lg;
  }

  /* =======================================================================
   * 1. Path chart — baseline vs NHA with uncertainty band + crosshair
   * ===================================================================== */
  NHA.renderPathChart = function (container, mc, deflate) {
    container.innerHTML = "";
    var years = mc.years;
    var base = mc.baseline.map(function (v) { return v * deflate; });
    var p50 = mc.yearBands.map(function (b) { return b.p50 * deflate; });
    var p10 = mc.yearBands.map(function (b) { return b.p10 * deflate; });
    var p90 = mc.yearBands.map(function (b) { return b.p90 * deflate; });

    var W = 860, H = 360, M = { l: 64, r: 118, t: 16, b: 34 };
    var iw = W - M.l - M.r, ih = H - M.t - M.b;
    var yMax = Math.max.apply(null, base.concat(p90)) * 1.06;
    var yMin = 0;
    var x = function (i) { return M.l + iw * (i / (years.length - 1)); };
    var y = function (v) { return M.t + ih * (1 - (v - yMin) / (yMax - yMin)); };

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img",
      "aria-label": "Projected annual total health system cost, status quo versus National Health Assurance, 2027 to 2042" }, container);

    /* gridlines + y ticks */
    niceTicks(yMin, yMax, 5).forEach(function (tv) {
      el("line", { x1: M.l, x2: W - M.r, y1: y(tv), y2: y(tv), class: "gridline" }, svg);
      var t = el("text", { x: M.l - 8, y: y(tv) + 4, class: "axis-text", "text-anchor": "end" }, svg);
      t.textContent = NHA.fmt.axis(tv);
    });
    /* x ticks */
    years.forEach(function (yr, i) {
      if ((yr - years[0]) % 3 !== 0) return;
      var t = el("text", { x: x(i), y: H - 10, class: "axis-text", "text-anchor": "middle" }, svg);
      t.textContent = yr;
    });
    el("line", { x1: M.l, x2: W - M.r, y1: y(0), y2: y(0), class: "baseline-axis" }, svg);

    function lineD(vals) {
      return vals.map(function (v, i) { return (i ? "L" : "M") + x(i) + "," + y(v); }).join(" ");
    }
    /* uncertainty band */
    var bandD = p90.map(function (v, i) { return (i ? "L" : "M") + x(i) + "," + y(v); }).join(" ") +
      p10.slice().reverse().map(function (v, j) {
        var i = p10.length - 1 - j; return " L" + x(i) + "," + y(v);
      }).join("") + " Z";
    el("path", { d: bandD, fill: "var(--series-1)", "fill-opacity": "0.10", stroke: "none" }, svg);

    el("path", { d: lineD(base), class: "line", stroke: "var(--baseline-series)" }, svg);
    el("path", { d: lineD(p50), class: "line", stroke: "var(--series-1)" }, svg);

    /* end markers + direct end labels */
    var li = years.length - 1;
    el("circle", { cx: x(li), cy: y(base[li]), r: 4, fill: "var(--baseline-series)", class: "marker" }, svg);
    el("circle", { cx: x(li), cy: y(p50[li]), r: 4, fill: "var(--series-1)", class: "marker" }, svg);
    var lblB = el("text", { x: x(li) + 10, y: y(base[li]) + 4, class: "end-label" }, svg);
    lblB.textContent = "Status quo " + NHA.fmt.moneyShort(base[li]);
    var lblN = el("text", { x: x(li) + 10, y: y(p50[li]) + 4, class: "end-label" }, svg);
    lblN.textContent = "NHA " + NHA.fmt.moneyShort(p50[li]);
    /* nudge labels apart if colliding */
    var byB = y(base[li]), byN = y(p50[li]);
    if (Math.abs(byB - byN) < 16) {
      var mid = (byB + byN) / 2;
      lblB.setAttribute("y", (byB <= byN ? mid - 9 : mid + 13));
      lblN.setAttribute("y", (byB <= byN ? mid + 13 : mid - 9));
    }

    /* crosshair + hover */
    var cross = el("line", { y1: M.t, y2: H - M.b, class: "crosshair", style: "display:none" }, svg);
    var hoverDots = [
      el("circle", { r: 5, fill: "var(--baseline-series)", class: "marker", style: "display:none" }, svg),
      el("circle", { r: 5, fill: "var(--series-1)", class: "marker", style: "display:none" }, svg)
    ];
    var hit = el("rect", { x: M.l, y: M.t, width: iw, height: ih, fill: "transparent" }, svg);

    function onMove(evt) {
      var pt = svg.createSVGPoint();
      pt.x = evt.clientX; pt.y = evt.clientY;
      var loc = pt.matrixTransform(svg.getScreenCTM().inverse());
      var i = Math.round((loc.x - M.l) / iw * (years.length - 1));
      i = Math.max(0, Math.min(years.length - 1, i));
      cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i));
      cross.style.display = "";
      hoverDots[0].setAttribute("cx", x(i)); hoverDots[0].setAttribute("cy", y(base[i]));
      hoverDots[1].setAttribute("cx", x(i)); hoverDots[1].setAttribute("cy", y(p50[i]));
      hoverDots.forEach(function (d) { d.style.display = ""; });

      var box = document.createElement("div");
      var head = div("tip-head", box); head.textContent = years[i];
      tipRow(box, cssVar("--series-1") || "#2a78d6", "NHA (median)", NHA.fmt.money(p50[i]), true);
      tipRow(box, "", "80% range", NHA.fmt.moneyShort(p10[i]) + " – " + NHA.fmt.moneyShort(p90[i]), false);
      tipRow(box, cssVar("--baseline-series") || "#898781", "Status quo", NHA.fmt.money(base[i]), true);
      var dlt = p50[i] - base[i];
      tipRow(box, "", "NHA vs status quo", (dlt >= 0 ? "+" : "−") + NHA.fmt.moneyShort(Math.abs(dlt)), false);
      showTip(box, evt.clientX, evt.clientY);
    }
    hit.addEventListener("pointermove", onMove);
    hit.addEventListener("pointerleave", function () {
      cross.style.display = "none";
      hoverDots.forEach(function (d) { d.style.display = "none"; });
      hideTip();
    });

    legend(container, [
      { color: "var(--series-1)", label: "National Health Assurance (median, with 10th–90th pct band)", line: true },
      { color: "var(--baseline-series)", label: "Status quo (CMS-trajectory baseline)", line: true }
    ]);
  };

  /* =======================================================================
   * 2. Bridge (waterfall) — mature year: baseline → changes → NHA total
   * ===================================================================== */
  NHA.renderBridgeChart = function (container, steps, deflate) {
    /* steps: [{label, value ($B, signed; null = running total marker), kind:
     *   "total" | "add" | "sub"}] — computed by app.js from the mode run  */
    container.innerHTML = "";
    var W = 860, rowH = 30, gap = 8, M = { l: 300, r: 96, t: 8, b: 30 };
    var H = M.t + steps.length * (rowH + gap) + M.b;

    /* running positions */
    var running = 0, rows = [];
    steps.forEach(function (s) {
      if (s.kind === "total") {
        rows.push({ label: s.label, x0: 0, x1: s.value, kind: "total", val: s.value });
        running = s.value;
      } else {
        var x0 = running, x1 = running + s.value;
        rows.push({ label: s.label, x0: Math.min(x0, x1), x1: Math.max(x0, x1),
          kind: s.kind, val: s.value });
        running = x1;
      }
    });
    var xMax = Math.max.apply(null, rows.map(function (r) { return r.x1; })) * 1.05;
    var x = function (v) { return M.l + (W - M.l - M.r) * (v * deflate / (xMax * deflate)); };

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img",
      "aria-label": "Cost bridge from status quo baseline to National Health Assurance total at maturity" }, container);

    niceTicks(0, xMax * deflate, 5).forEach(function (tv) {
      var xv = M.l + (W - M.l - M.r) * (tv / (xMax * deflate));
      el("line", { x1: xv, x2: xv, y1: M.t, y2: H - M.b, class: "gridline" }, svg);
      var t = el("text", { x: xv, y: H - 10, class: "axis-text", "text-anchor": "middle" }, svg);
      t.textContent = NHA.fmt.axis(tv);
    });

    rows.forEach(function (r, i) {
      var yPos = M.t + i * (rowH + gap);
      var lab = el("text", { x: M.l - 10, y: yPos + rowH / 2 + 4, class: "row-label", "text-anchor": "end" }, svg);
      lab.textContent = r.label;

      var color = r.kind === "total" ? "var(--total-bar)" :
                  r.kind === "add" ? "var(--diverge-add)" : "var(--diverge-sub)";
      var bx = x(r.x0), bw = Math.max(2, x(r.x1) - x(r.x0));
      var p = el("path", { d: barPath(bx, yPos + 3, bw, rowH - 6, 4, "right"),
        fill: color, class: "bar-mark", tabindex: 0 }, svg);

      /* connector to next row */
      if (i < rows.length - 1) {
        var connectX = r.kind === "sub" ? x(r.x0) : x(r.x1);
        el("line", { x1: connectX, x2: connectX, y1: yPos + rowH - 2,
          y2: yPos + rowH + gap + 4, class: "connector" }, svg);
      }
      /* value label at the data end */
      var vLab = el("text", { x: x(r.x1) + 6, y: yPos + rowH / 2 + 4, class: "value-label" }, svg);
      vLab.textContent = (r.kind === "add" ? "+" : r.kind === "sub" ? "−" : "") +
        NHA.fmt.moneyShort(Math.abs(r.val) * deflate);
      if (r.kind === "sub") vLab.setAttribute("x", x(r.x1) + 6);

      function showBarTip(evt) {
        var box = document.createElement("div");
        var head = div("tip-head", box); head.textContent = r.label;
        var pfx = r.kind === "add" ? "+" : r.kind === "sub" ? "−" : "";
        tipRow(box, color.indexOf("var") === 0 ? cssVar(color.slice(4, -1)) : color,
          r.kind === "total" ? "Total" : r.kind === "add" ? "Adds" : "Saves",
          pfx + NHA.fmt.money(Math.abs(r.val) * deflate), true);
        showTip(box, evt.clientX, evt.clientY);
        p.classList.add("hover");
      }
      p.addEventListener("pointermove", showBarTip);
      p.addEventListener("focus", function (e) {
        var rect = p.getBoundingClientRect();
        showBarTip({ clientX: rect.right, clientY: rect.top });
      });
      p.addEventListener("pointerleave", function () { hideTip(); p.classList.remove("hover"); });
      p.addEventListener("blur", function () { hideTip(); p.classList.remove("hover"); });
    });

    legend(container, [
      { color: "var(--total-bar)", label: "Totals" },
      { color: "var(--diverge-add)", label: "Cost additions" },
      { color: "var(--diverge-sub)", label: "Savings / offsets" }
    ]);
  };

  /* =======================================================================
   * 3. Financing stack — one horizontal stacked bar + gap-vs-wealth rows
   * ===================================================================== */
  NHA.renderFinancingChart = function (container, fin, deflate) {
    /* fin: {segments: [{label, value, color}], gap: {label, value},
     *       wealth: {label, value}} */
    container.innerHTML = "";
    var W = 860, H = 190, M = { l: 8, r: 8, t: 24, b: 8 };
    var total = fin.segments.reduce(function (s, seg) { return s + seg.value; }, 0);
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img",
      "aria-label": "How the mature National Health Assurance public cost is financed" }, container);

    var barY = M.t + 10, barH = 24, iw = W - M.l - M.r;
    var xCur = M.l;
    var head = el("text", { x: M.l, y: M.t - 4, class: "row-label" }, svg);
    head.textContent = "Mature-year public cost " + NHA.fmt.money(total * deflate) + " — funded by:";

    fin.segments.forEach(function (seg, i) {
      var w = iw * seg.value / total;
      var isLast = i === fin.segments.length - 1;
      var p = el("path", {
        d: isLast ? barPath(xCur, barY, Math.max(0, w - 0), barH, 4, "right")
                  : "M" + xCur + "," + barY + " h" + Math.max(0, w - 2) + " v" + barH + " h-" + Math.max(0, w - 2) + "Z",
        fill: seg.color, class: "bar-mark", tabindex: 0
      }, svg);
      /* inline label only if it comfortably fits */
      var labelText = seg.label + "  " + NHA.fmt.moneyShort(seg.value * deflate);
      if (w > labelText.length * 7 + 16) {
        var t = el("text", { x: xCur + 8, y: barY + barH / 2 + 4, class: "inbar-label" }, svg);
        t.textContent = labelText;
      }
      function tipIt(evt) {
        var box = document.createElement("div");
        tipRow(box, seg.color, seg.label, NHA.fmt.money(seg.value * deflate), true);
        tipRow(box, "", "share of public cost", NHA.fmt.pct(100 * seg.value / total, 0), false);
        showTip(box, evt.clientX, evt.clientY);
      }
      p.addEventListener("pointermove", tipIt);
      p.addEventListener("pointerleave", hideTip);
      xCur += w;
    });

    /* wealth-tax coverage comparison row */
    var y2 = barY + barH + 34;
    var t2 = el("text", { x: M.l, y: y2 - 6, class: "row-label" }, svg);
    t2.textContent = "New revenue needed vs. extreme-wealth tax package potential:";
    var maxV = Math.max(fin.gap.value, fin.wealth.value) * 1.15 || 1;
    [[fin.gap, "var(--series-5)"], [fin.wealth, "var(--series-2)"]].forEach(function (pair, i) {
      var item = pair[0], color = pair[1];
      var yy = y2 + 6 + i * 30;
      var w = iw * 0.72 * item.value / maxV;
      el("path", { d: barPath(M.l, yy, Math.max(2, w), 20, 4, "right"), fill: color, class: "bar-mark" }, svg);
      var t = el("text", { x: M.l + Math.max(2, w) + 8, y: yy + 14, class: "value-label" }, svg);
      t.textContent = item.label + ": " + NHA.fmt.money(item.value * deflate) + "/yr";
    });

    legend(container, fin.segments.map(function (s) {
      return { color: s.color, label: s.label };
    }));
  };

  /* =======================================================================
   * 4. Benchmark interval chart — rows of ranges + our band
   * ===================================================================== */
  NHA.renderBenchmarkChart = function (container, rows, opts) {
    /* rows: [{label, lo, hi, mid (optional), color, note}] all in display $B */
    container.innerHTML = "";
    var W = 860, rowH = 42, M = { l: 320, r: 60, t: 10, b: 32 };
    var H = M.t + rows.length * rowH + M.b;
    var lo = Math.min.apply(null, rows.map(function (r) { return r.lo; }));
    var hi = Math.max.apply(null, rows.map(function (r) { return r.hi; }));
    var pad = (hi - lo) * 0.08 || 1;
    lo = Math.min(0, lo - pad); hi = hi + pad;
    var x = function (v) { return M.l + (W - M.l - M.r) * ((v - lo) / (hi - lo)); };

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img",
      "aria-label": (opts && opts.aria) || "Benchmark comparison" }, container);

    niceTicks(lo, hi, 5).forEach(function (tv) {
      el("line", { x1: x(tv), x2: x(tv), y1: M.t, y2: H - M.b, class: "gridline" }, svg);
      var t = el("text", { x: x(tv), y: H - 10, class: "axis-text", "text-anchor": "middle" }, svg);
      t.textContent = NHA.fmt.axis(tv);
    });
    if (lo < 0 && hi > 0) el("line", { x1: x(0), x2: x(0), y1: M.t, y2: H - M.b, class: "baseline-axis" }, svg);

    rows.forEach(function (r, i) {
      var cy = M.t + i * rowH + rowH / 2;
      var lab = el("text", { x: M.l - 10, y: cy - 2, class: "row-label", "text-anchor": "end" }, svg);
      lab.textContent = r.label;
      if (r.note) {
        var nt = el("text", { x: M.l - 10, y: cy + 12, class: "row-note", "text-anchor": "end" }, svg);
        nt.textContent = r.note;
      }
      var g = el("g", { class: "bench-row", tabindex: 0 }, svg);
      el("path", { d: barPath(x(r.lo), cy - 5, Math.max(2, x(r.hi) - x(r.lo)), 10, 4, "right"),
        fill: r.color, "fill-opacity": 0.35 }, g);
      if (r.mid != null) {
        el("circle", { cx: x(r.mid), cy: cy, r: 5, fill: r.color, class: "marker" }, g);
      }
      function tipIt(evt) {
        var box = document.createElement("div");
        var head = div("tip-head", box); head.textContent = r.label;
        if (r.mid != null) tipRow(box, r.color, "central", NHA.fmt.money(r.mid), true);
        tipRow(box, "", "range", NHA.fmt.moneyShort(r.lo) + " – " + NHA.fmt.moneyShort(r.hi), false);
        if (r.note) tipRow(box, "", "", r.note, false);
        showTip(box, evt.clientX, evt.clientY);
      }
      g.addEventListener("pointermove", tipIt);
      g.addEventListener("pointerleave", hideTip);
    });
  };

  /* shared low-level helpers for other chart modules (taxcharts.js) */
  NHA._chartUtil = { el: el, div: div, niceTicks: niceTicks,
    showTip: showTip, hideTip: hideTip, tipRow: tipRow, barPath: barPath };
})();

/* ---- Money-flow diagram (two-stage Sankey: sources → channels) ----------
 * spec: { sources: [{id,label,value,color}], channels: [{id,label,value}],
 *         ribbons: [{from,to,value,note}], total, unit, aria }
 * Values in $B. Ribbons render as bezier bands in the source color; node
 * bars are thin marks; per-ribbon tooltips; all text in ink tokens.      */
(function () {
  var U = NHA._chartUtil;
  var el = U.el, div = U.div, showTip = U.showTip, hideTip = U.hideTip, tipRow = U.tipRow;

  NHA.renderFlowDiagram = function (container, spec) {
    container.innerHTML = "";
    var W = 430, H = 330;
    var M = { t: 8, b: 8 };
    var LX = 148, RX = 282, BW = 14;      // node-bar x positions and width
    var GAP = 5;                           // px gap between node bars

    function layout(nodes) {
      var sum = nodes.reduce(function (a, n) { return a + n.value; }, 0);
      var avail = H - M.t - M.b - GAP * (nodes.length - 1);
      var y = M.t, out = {};
      nodes.forEach(function (n) {
        var h = Math.max(3, avail * n.value / sum);
        out[n.id] = { y0: y, y1: y + h, used: 0, node: n };
        y += h + GAP;
      });
      return out;
    }
    var L = layout(spec.sources), R = layout(spec.channels);

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg",
      role: "img", "aria-label": spec.aria || "Money flow diagram" }, container);

    /* ribbons first (under the bars) */
    spec.ribbons.forEach(function (rb) {
      var s = L[rb.from], t = R[rb.to];
      if (!s || !t) return;
      var sh = (s.y1 - s.y0) * rb.value / s.node.value;
      var th = (t.y1 - t.y0) * rb.value /
               spec.ribbons.filter(function (x) { return x.to === rb.to; })
                 .reduce(function (a, x) { return a + x.value; }, 0);
      var sy0 = s.y0 + s.used, sy1 = sy0 + sh;
      var ty0 = t.y0 + t.used, ty1 = ty0 + th;
      s.used += sh; t.used += th;
      var x0 = LX + BW, x1 = RX, mid = (x0 + x1) / 2;
      var d = "M" + x0 + " " + sy0 +
              " C" + mid + " " + sy0 + " " + mid + " " + ty0 + " " + x1 + " " + ty0 +
              " L" + x1 + " " + ty1 +
              " C" + mid + " " + ty1 + " " + mid + " " + sy1 + " " + x0 + " " + sy1 + " Z";
      var band = el("path", { d: d, fill: s.node.color, "fill-opacity": 0.30,
        class: "flow-ribbon", tabindex: 0 }, svg);
      function tipIt(evt) {
        var box = document.createElement("div");
        div("tip-head", box).textContent = s.node.label + " → " + t.node.label;
        tipRow(box, s.node.color, "", NHA.fmt.money(rb.value) + "/yr", true);
        if (rb.note) tipRow(box, "", "", rb.note, false);
        showTip(box, evt.clientX, evt.clientY);
      }
      band.addEventListener("pointermove", tipIt);
      band.addEventListener("focus", function (e) {
        var r = band.getBoundingClientRect(); tipIt({ clientX: r.right, clientY: r.top });
      });
      band.addEventListener("pointerleave", hideTip);
      band.addEventListener("blur", hideTip);
    });

    /* node bars + labels */
    Object.keys(L).forEach(function (k) {
      var n = L[k];
      el("rect", { x: LX, y: n.y0, width: BW, height: n.y1 - n.y0, rx: 3,
        fill: n.node.color }, svg);
      var lab = el("text", { x: LX - 8, y: (n.y0 + n.y1) / 2 - 2,
        class: "row-label", "text-anchor": "end" }, svg);
      lab.textContent = n.node.label;
      var val = el("text", { x: LX - 8, y: (n.y0 + n.y1) / 2 + 12,
        class: "row-note", "text-anchor": "end" }, svg);
      val.textContent = NHA.fmt.moneyShort(n.node.value);
    });
    Object.keys(R).forEach(function (k) {
      var n = R[k];
      el("rect", { x: RX, y: n.y0, width: BW, height: n.y1 - n.y0, rx: 3,
        fill: "var(--total-bar)" }, svg);
      var lab = el("text", { x: RX + BW + 8, y: (n.y0 + n.y1) / 2 - 2,
        class: "row-label" }, svg);
      lab.textContent = n.node.label;
      var val = el("text", { x: RX + BW + 8, y: (n.y0 + n.y1) / 2 + 12,
        class: "row-note" }, svg);
      val.textContent = NHA.fmt.moneyShort(n.node.value);
    });
  };
})();
