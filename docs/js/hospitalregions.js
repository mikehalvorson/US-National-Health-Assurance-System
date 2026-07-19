/* =========================================================================
 * Physical Care: nonprofit hospital administration regions.
 *
 * Loads the reproducible model output and the same published state GeoJSON
 * used by the county unit map. The existing composite U.S. projection keeps
 * Alaska and Hawaii legible while state colors show regional membership.
 * ========================================================================= */
"use strict";
(function () {
  var U = NHA._chartUtil;
  var el = U.el, div = U.div, showTip = U.showTip, hideTip = U.hideTip;
  var selectedId = "R01";
  var DATA = { regions: null, states: null };

  var STATE_TO_ABBR = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
    "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
    "District of Columbia": "DC", "Florida": "FL", "Georgia": "GA", "Hawaii": "HI",
    "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
    "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME",
    "Maryland": "MD", "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN",
    "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE",
    "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
    "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
    "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI",
    "South Carolina": "SC", "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX",
    "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA",
    "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
  };

  var COLORS = [
    "var(--series-1)", "var(--series-6)", "var(--series-3)",
    "var(--series-2)", "var(--series-5)", "var(--series-1)",
    "var(--series-8)", "var(--series-4)", "var(--series-6)",
    "var(--series-2)", "var(--series-5)", "var(--series-7)",
    "var(--series-3)"
  ];

  function $(id) { return document.getElementById(id); }
  function stateName(feature) {
    var p = feature.properties || {};
    return p.name || p.NAME || p.State || "";
  }
  function featurePath(feature, projection) {
    var geometry = feature.geometry;
    var polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    var path = "";
    polygons.forEach(function (polygon) {
      polygon.forEach(function (ring) {
        ring.forEach(function (point, index) {
          var xy = projection(point[0], point[1]);
          path += (index ? "L" : "M") + xy[0].toFixed(1) + " " + xy[1].toFixed(1);
        });
        path += "Z";
      });
    });
    return path;
  }
  function formatPopulation(value) {
    return (value / 1000000).toFixed(1) + " million";
  }
  function regionById(id) {
    return DATA.regions.regions.filter(function (region) { return region.id === id; })[0];
  }

  function updateSelection(id) {
    selectedId = id;
    var region = regionById(id);
    if (!region) return;
    var select = $("hospital-region-select");
    if (select && select.value !== id) select.value = id;
    document.querySelectorAll(".hospital-map-state").forEach(function (path) {
      path.classList.toggle("is-selected", path.getAttribute("data-region") === id);
    });
    var detail = $("hospital-region-detail");
    detail.innerHTML = "";
    var head = document.createElement("strong");
    head.textContent = region.id + " " + region.name;
    detail.appendChild(head);
    detail.appendChild(document.createTextNode(
      " · " + region.states.join(", ") +
      " · " + formatPopulation(region.population) +
      " · " + Math.round(region.rural_share * 100) + "% rural" +
      (region.mean_state_centroid_miles
        ? " · mean state-centroid distance " +
          region.mean_state_centroid_miles.toLocaleString("en-US") + " miles"
        : " · single-state region")
    ));
  }

  function renderMap() {
    var container = $("hospital-region-map");
    container.innerHTML = "";
    var width = 960, height = 610;
    var projection = NHA.buildUsProjection(DATA.states, width, height);
    var regionForState = {};
    var colorForRegion = {};
    DATA.regions.regions.forEach(function (region, index) {
      colorForRegion[region.id] = COLORS[index % COLORS.length];
      region.states.forEach(function (state) { regionForState[state] = region; });
    });

    var svg = el("svg", {
      viewBox: "0 0 " + width + " " + height,
      class: "chart-svg hospital-region-map",
      role: "img",
      "aria-labelledby": "hospital-region-map-title hospital-region-map-desc"
    }, container);
    var title = el("title", { id: "hospital-region-map-title" }, svg);
    title.textContent = "Thirteen proposed nonprofit hospital administration regions";
    var desc = el("desc", { id: "hospital-region-map-desc" }, svg);
    desc.textContent =
      "Every state and the District of Columbia is assigned once. Hover or focus a state for its region, population, and rural share.";

    DATA.states.features.forEach(function (feature) {
      var name = stateName(feature);
      var abbreviation = STATE_TO_ABBR[name];
      var region = regionForState[abbreviation];
      if (!region) return;
      var path = el("path", {
        d: featurePath(feature, projection),
        class: "hospital-map-state" + (region.id === selectedId ? " is-selected" : ""),
        fill: colorForRegion[region.id],
        "fill-opacity": "0.52",
        tabindex: "0",
        "data-region": region.id,
        "aria-label": name + ", " + region.name + " hospital administration region"
      }, svg);
      function showRegionTip(event) {
        var box = document.createElement("div");
        div("tip-head", box).textContent = region.id + " · " + region.name;
        var states = div("tip-row", box);
        states.textContent = region.states.join(", ");
        var metrics = div("tip-row", box);
        metrics.textContent = formatPopulation(region.population) +
          " · " + Math.round(region.rural_share * 100) + "% rural";
        showTip(box, event.clientX || 20, event.clientY || 20);
      }
      path.addEventListener("pointermove", showRegionTip);
      path.addEventListener("pointerleave", hideTip);
      path.addEventListener("focus", function () {
        updateSelection(region.id);
      });
      path.addEventListener("blur", hideTip);
      path.addEventListener("click", function () {
        updateSelection(region.id);
      });
    });

    DATA.regions.regions.forEach(function (region) {
      var point = projection(region.centroid[0], region.centroid[1]);
      var label = el("text", {
        x: point[0].toFixed(1),
        y: point[1].toFixed(1),
        class: "hospital-map-label",
        "aria-hidden": "true"
      }, svg);
      label.textContent = region.id.replace("R", "");
    });
  }

  function renderControls() {
    var select = $("hospital-region-select");
    select.innerHTML = "";
    DATA.regions.regions.forEach(function (region) {
      var option = document.createElement("option");
      option.value = region.id;
      option.textContent = region.id + " · " + region.name;
      select.appendChild(option);
    });
    select.addEventListener("change", function () {
      updateSelection(select.value);
    });
    updateSelection(selectedId);
  }

  function renderScores() {
    var host = $("hospital-region-scores");
    host.innerHTML = "";
    var tested = DATA.regions.model.tested_region_counts;
    var max = Math.max.apply(null, tested.map(function (row) { return row.total; }));
    tested.forEach(function (row) {
      var cell = document.createElement("div");
      cell.className = "hospital-score" +
        (row.regions === DATA.regions.model.selected_region_count ? " is-selected" : "");
      cell.setAttribute(
        "aria-label",
        row.regions + " regions, composite score " + row.total.toFixed(3) +
        (row.regions === DATA.regions.model.selected_region_count ? ", selected" : "")
      );
      var value = document.createElement("span");
      value.textContent = row.total.toFixed(3);
      var bar = document.createElement("span");
      bar.className = "hospital-score-bar";
      bar.style.height = Math.max(7, Math.round(49 * row.total / max)) + "px";
      var label = document.createElement("span");
      label.textContent = String(row.regions);
      cell.appendChild(value);
      cell.appendChild(bar);
      cell.appendChild(label);
      host.appendChild(cell);
    });
  }

  var ACRONYMS = {
    "CMS": "Centers for Medicare & Medicaid Services",
    "DOJ": "Department of Justice",
    "ECG": "Electrocardiogram",
    "ED": "Emergency department",
    "EMS": "Emergency medical services",
    "ENT": "Ear, nose, and throat",
    "FQHC": "Federally Qualified Health Center",
    "FTC": "Federal Trade Commission",
    "HHS": "Department of Health and Human Services",
    "ICU": "Intensive care unit",
    "IV": "Intravenous",
    "NHSA": "National Hospital Stewardship Authority",
    "NP": "Nurse practitioner",
    "PA": "Physician assistant",
    "RHA": "Regional Health Administrators",
    "STI": "Sexually transmitted infection",
    "UTI": "Urinary tract infection",
    "VHA": "Veterans Health Administration"
  };
  var acronymPattern = new RegExp("\\b(" + Object.keys(ACRONYMS).join("|") + ")\\b", "g");
  var decorating = false;

  function decorateAcronyms(root) {
    if (!root || decorating) return;
    decorating = true;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) {
      var node = walker.currentNode;
      var parent = node.parentElement;
      if (!parent || parent.closest("abbr, script, style, option") || !acronymPattern.test(node.nodeValue)) {
        acronymPattern.lastIndex = 0;
        continue;
      }
      acronymPattern.lastIndex = 0;
      nodes.push(node);
    }
    nodes.forEach(function (node) {
      var fragment = document.createDocumentFragment();
      var value = node.nodeValue;
      var last = 0;
      value.replace(acronymPattern, function (match, acronym, offset) {
        fragment.appendChild(document.createTextNode(value.slice(last, offset)));
        var abbr = document.createElement("abbr");
        abbr.className = "physical-acronym";
        abbr.title = ACRONYMS[acronym];
        abbr.textContent = acronym;
        fragment.appendChild(abbr);
        last = offset + match.length;
        return match;
      });
      fragment.appendChild(document.createTextNode(value.slice(last)));
      node.parentNode.replaceChild(fragment, node);
      acronymPattern.lastIndex = 0;
    });
    decorating = false;
  }

  var view = $("view-units");
  if (view) {
    decorateAcronyms(view);
    new MutationObserver(function () {
      decorateAcronyms(view);
    }).observe(view, { childList: true, subtree: true });
  }

  Promise.all([
    fetch("data/hospital-regions.json").then(function (response) {
      if (!response.ok) throw new Error("hospital-regions.json " + response.status);
      return response.json();
    }),
    fetch("data/us-states.json").then(function (response) {
      if (!response.ok) throw new Error("us-states.json " + response.status);
      return response.json();
    })
  ]).then(function (result) {
    DATA.regions = result[0];
    DATA.states = result[1];
    renderMap();
    renderControls();
    renderScores();
    decorateAcronyms(view);
  }).catch(function (error) {
    var host = $("hospital-region-map");
    if (host) host.textContent = "Regional model data failed to load (" + String(error) + ").";
  });
})();
