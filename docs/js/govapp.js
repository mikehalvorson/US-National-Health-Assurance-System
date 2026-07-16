/* =========================================================================
 * Governance tab: renders the 9 governing bodies as org diagrams (SVG,
 * no dependencies) plus a detail card per entity covering what it does,
 * why it exists, what it replaces, and who runs it.
 * ========================================================================= */
"use strict";
(function () {
  var U = NHA._chartUtil;
  var el = U.el, div = U.div, showTip = U.showTip, hideTip = U.hideTip, tipRow = U.tipRow;
  function $(id) { return document.getElementById(id); }

  /* ---- org diagram: head box on top, members in rows, elbow connectors -- */
  function renderOrgChart(container, group) {
    var members = group.members.filter(function (m) { return m.code !== group.head; });
    var headM = group.members.filter(function (m) { return m.code === group.head; })[0];

    var perRow = 4, BW = 216, BH = 46, GX = 14, GY = 34;
    var rows = Math.ceil(members.length / perRow);
    var W = perRow * BW + (perRow - 1) * GX + 16;
    var H = 8 + BH + GY + rows * (BH + GY) - GY + 14;
    var cx = W / 2;

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg org-chart",
      role: "img", "aria-label": "Organization diagram: " + group.name }, container);

    function box(x, y, m, isHead) {
      var g = el("g", { class: "org-box" + (isHead ? " head" : ""), tabindex: 0 }, svg);
      el("rect", { x: x, y: y, width: BW, height: BH, rx: 8,
        fill: isHead ? group.color : "var(--surface-1)",
        "fill-opacity": isHead ? 0.18 : 1,
        stroke: group.color, "stroke-width": isHead ? 2 : 1.2 }, g);
      var t1 = el("text", { x: x + BW / 2, y: y + 19, class: "org-code",
        "text-anchor": "middle" }, g);
      t1.textContent = m.code;
      var t2 = el("text", { x: x + BW / 2, y: y + 35, class: "org-name",
        "text-anchor": "middle" }, g);
      t2.textContent = m.short.length > 30 ? m.short.slice(0, 29) + "…" : m.short;

      function tipIt(evt) {
        var boxEl = document.createElement("div");
        div("tip-head", boxEl).textContent = m.name;
        tipRow(boxEl, group.color, "", m.role, false);
        tipRow(boxEl, "", "Led by", m.leader.split(";")[0], false);
        showTip(boxEl, evt.clientX, evt.clientY);
      }
      g.addEventListener("pointermove", tipIt);
      g.addEventListener("pointerleave", hideTip);
      g.addEventListener("click", function () {
        var card = document.getElementById("gov-" + m.code);
        if (!card) return;
        var det = card.closest("details");
        if (det) det.open = true;
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.add("flash");
        setTimeout(function () { card.classList.remove("flash"); }, 1600);
      });
      return g;
    }

    /* head */
    var headY = 8;
    if (headM) box(cx - BW / 2, headY, headM, true);

    /* trunk from head down to the last row's bus */
    var lastBusY = headY + BH + GY / 2 + (rows - 1) * (BH + GY);
    el("line", { x1: cx, y1: headY + BH, x2: cx, y2: lastBusY, class: "org-line" }, svg);

    members.forEach(function (m, i) {
      var row = Math.floor(i / perRow), col = i % perRow;
      var inRow = Math.min(perRow, members.length - row * perRow);
      var rowW = inRow * BW + (inRow - 1) * GX;
      var x = (W - rowW) / 2 + col * (BW + GX);
      var y = headY + BH + GY + row * (BH + GY);
      var busY = y - GY / 2;
      /* bus from trunk to this box's center, then drop */
      var bx = x + BW / 2;
      el("line", { x1: cx, y1: busY, x2: bx, y2: busY, class: "org-line" }, svg);
      el("line", { x1: bx, y1: busY, x2: bx, y2: y, class: "org-line" }, svg);
      box(x, y, m);
    });
  }

  /* ---- entity detail cards ---- */
  function renderCards(container, group) {
    group.members.forEach(function (m) {
      var card = div("gov-card", container);
      card.id = "gov-" + m.code;

      var head = div("gov-card-head", card);
      var sw = document.createElement("span");
      sw.className = "legend-swatch"; sw.style.background = group.color;
      head.appendChild(sw);
      var nm = document.createElement("span");
      nm.className = "gov-card-name";
      nm.textContent = m.name;
      head.appendChild(nm);
      var code = document.createElement("span");
      code.className = "gov-card-code";
      code.textContent = m.code;
      head.appendChild(code);

      function line(label, text, cls) {
        var row = div("gov-line" + (cls ? " " + cls : ""), card);
        var b = document.createElement("b");
        b.textContent = label + ": ";
        row.appendChild(b);
        row.appendChild(document.createTextNode(text));
      }
      line("What it does", m.role);
      line("Why it exists", m.why);
      line("Replaces", m.replaces, /^New/.test(m.replaces) ? "gov-new" : "gov-replaces");
      line("Who runs it", m.leader);
    });
  }

  /* ---- summary tiles ---- */
  function renderSummary() {
    var host = $("gov-summary");
    var total = 0, novel = 0, replacing = 0;
    NHA.GOV_GROUPS.forEach(function (g) {
      g.members.forEach(function (m) {
        total++;
        if (/^New/.test(m.replaces)) novel++; else replacing++;
      });
    });
    [
      { label: "Governing bodies", value: "9",
        range: "fiscal foundations, the operating department and its five administrations, independent oversight, transition, innovation" },
      { label: "Entities in total", value: String(total),
        range: "each with statutory duties, a named leadership position, and published metrics" },
      { label: "Replace existing functions", value: String(replacing),
        range: "absorbing work now done by insurers, PBMs, state offices, and federal agencies" },
      { label: "Wholly new capabilities", value: String(novel),
        range: "mostly transition protection, cyber-defense, AI accountability, and adaptation machinery" }
    ].forEach(function (it) {
      var tl = div("tile", host);
      div("label", tl).textContent = it.label;
      div("value", tl).textContent = it.value;
      div("range", tl).textContent = it.range;
    });
  }

  /* ---- build the whole view ---- */
  function build() {
    renderSummary();
    var host = $("gov-groups");
    NHA.GOV_GROUPS.forEach(function (g) {
      var section = document.createElement("section");
      section.className = "card";
      var h = document.createElement("h2");
      h.textContent = g.name;
      section.appendChild(h);
      var d = div("desc", section);
      d.textContent = g.desc;

      var diagram = div("org-wrap", section);
      renderOrgChart(diagram, g);

      var details = document.createElement("details");
      details.className = "tableview";
      var sum = document.createElement("summary");
      sum.textContent = "Entity detail: what each does, why, what it replaces, who runs it (" +
        g.members.length + " entities)";
      details.appendChild(sum);
      var cardsHost = div("gov-cards", details);
      renderCards(cardsHost, g);
      section.appendChild(details);

      host.appendChild(section);
    });
  }

  build();
})();
