/* =========================================================================
 * US map renderer: Albers equal-area projection, hand-coded, no libraries.
 * Lower 48 projected on parallels 29.5°/45.5°; Alaska and Hawaii get their
 * own Albers zones fitted into insets, the standard composite layout.
 * Renders state boundaries from GeoJSON plus per-county dots whose area
 * scales with unit count. Tooltips per dot; type filter re-renders dots.
 * ========================================================================= */
"use strict";
(function () {
  var U = NHA._chartUtil;
  var el = U.el, div = U.div, showTip = U.showTip, hideTip = U.hideTip, tipRow = U.tipRow;
  var RAD = Math.PI / 180;

  /* Longitudes east of the antimeridian (western Aleutians, +178° etc.)
     normalize to the negative continuation so Alaska stays contiguous. */
  function normLon(lon) { return lon > 0 ? lon - 360 : lon; }

  function albersRaw(p1, p2, lam0) {
    var phi1 = p1 * RAD, phi2 = p2 * RAD, l0 = lam0 * RAD;
    var n = (Math.sin(phi1) + Math.sin(phi2)) / 2;
    var C = Math.cos(phi1) * Math.cos(phi1) + 2 * n * Math.sin(phi1);
    return function (lon, lat) {
      var theta = n * (normLon(lon) * RAD - l0);
      var rho = Math.sqrt(Math.max(0, C - 2 * n * Math.sin(lat * RAD))) / n;
      return [rho * Math.sin(theta), -rho * Math.cos(theta)];
    };
  }

  /* Fit a raw projection to a pixel box using a set of [lon,lat] points */
  function fitZone(raw, points, box) {
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(function (pt) {
      var xy = raw(pt[0], pt[1]);
      if (xy[0] < minX) minX = xy[0];
      if (xy[0] > maxX) maxX = xy[0];
      if (xy[1] < minY) minY = xy[1];
      if (xy[1] > maxY) maxY = xy[1];
    });
    var s = Math.min((box.w) / (maxX - minX), (box.h) / (maxY - minY));
    var ox = box.x + (box.w - s * (maxX - minX)) / 2 - s * minX;
    var oy = box.y + (box.h - s * (maxY - minY)) / 2 - s * minY;
    return function (lon, lat) {
      var xy = raw(lon, lat);
      return [ox + s * xy[0], oy + s * xy[1]];
    };
  }

  function featurePoints(feature) {
    var pts = [];
    var g = feature.geometry;
    var polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    polys.forEach(function (poly) {
      poly.forEach(function (ring) {
        ring.forEach(function (pt) { pts.push(pt); });
      });
    });
    return pts;
  }

  function stateNameOf(f) {
    var p = f.properties || {};
    return p.name || p.NAME || p.State || "";
  }

  /* Build the composite projection from the states GeoJSON */
  NHA.buildUsProjection = function (statesGeo, W, H) {
    var lower = [], ak = [], hi = [];
    statesGeo.features.forEach(function (f) {
      var nm = stateNameOf(f);
      var pts = featurePoints(f);
      if (nm === "Alaska") ak = ak.concat(pts);
      else if (nm === "Hawaii") hi = hi.concat(pts);
      else lower = lower.concat(pts);
    });
    var main = fitZone(albersRaw(29.5, 45.5, -96), lower,
      { x: 8, y: 8, w: W - 16, h: H - 130 });
    var akP = fitZone(albersRaw(55, 65, -154), ak,
      { x: 12, y: H - 150, w: 200, h: 140 });
    var hiP = fitZone(albersRaw(19, 21, -157), hi,
      { x: 235, y: H - 105, w: 120, h: 95 });
    return function (lon, lat) {
      var L = normLon(lon);
      if (lat > 50 && L < -125) return akP(lon, lat);
      if (lat < 25 && L < -150) return hiP(lon, lat);
      return main(lon, lat);
    };
  };

  /* Render: states outline + county dots.
   * counties: [{f,n,s,p,r,la,lo, units:{a,b,c,d,total}}]
   * typeFilter: "all" | "a" | "b" | "c" | "d"
   * typeColors: {a,b,c,d} css color strings */
  NHA.renderUnitsMap = function (container, statesGeo, counties, typeFilter, typeColors) {
    container.innerHTML = "";
    var W = 960, H = 620;
    var proj = NHA.buildUsProjection(statesGeo, W, H);

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg units-map",
      role: "img", "aria-label": "Map of proposed community diagnostic-treatment units by county" }, container);

    /* state boundaries */
    statesGeo.features.forEach(function (f) {
      var g = f.geometry;
      var polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
      var d = "";
      polys.forEach(function (poly) {
        poly.forEach(function (ring) {
          ring.forEach(function (pt, i) {
            var xy = proj(pt[0], pt[1]);
            d += (i ? "L" : "M") + xy[0].toFixed(1) + " " + xy[1].toFixed(1);
          });
          d += "Z";
        });
      });
      el("path", { d: d, class: "map-state" }, svg);
    });

    /* county dots, biggest first so small ones stay hoverable */
    function countOf(c) {
      if (typeFilter === "all") return c.units.total;
      return c.units[typeFilter];
    }
    var maxCount = 1;
    counties.forEach(function (c) { maxCount = Math.max(maxCount, countOf(c)); });
    var sorted = counties.slice().sort(function (x, y) { return countOf(y) - countOf(x); });

    function colorOf(c) {
      if (typeFilter !== "all") return typeColors[typeFilter];
      /* dominant type colors the dot in "all" view */
      var u = c.units, best = "b", bv = u.b;
      if (u.a > bv) { best = "a"; bv = u.a; }
      if (u.c > bv) { best = "c"; bv = u.c; }
      if (u.d > bv) { best = "d"; bv = u.d; }
      return typeColors[best];
    }

    sorted.forEach(function (c) {
      var n = countOf(c);
      if (n <= 0) return;
      var xy = proj(c.lo, c.la);
      if (!isFinite(xy[0]) || !isFinite(xy[1])) return;
      var rr = Math.max(1.1, 1.1 * Math.sqrt(n));
      var dot = el("circle", {
        cx: xy[0].toFixed(1), cy: xy[1].toFixed(1), r: Math.min(rr, 16).toFixed(1),
        fill: colorOf(c), "fill-opacity": 0.55, class: "map-dot", tabindex: -1
      }, svg);
      function tipIt(evt) {
        var box = document.createElement("div");
        div("tip-head", box).textContent = c.n + ", " + c.s;
        tipRow(box, "", "Population", c.p.toLocaleString("en-US") +
          " (" + Math.round(c.r * 100) + "% rural)", false);
        tipRow(box, typeColors.a, "Type A micro-units", String(c.units.a), false);
        tipRow(box, typeColors.b, "Type B neighborhood", String(c.units.b), false);
        tipRow(box, typeColors.c, "Type C rural enhanced", String(c.units.c), false);
        tipRow(box, typeColors.d, "Type D urban public-health", String(c.units.d), false);
        tipRow(box, "", "Total", String(c.units.total), true);
        showTip(box, evt.clientX, evt.clientY);
      }
      dot.addEventListener("pointermove", tipIt);
      dot.addEventListener("pointerleave", hideTip);
    });
  };
})();
