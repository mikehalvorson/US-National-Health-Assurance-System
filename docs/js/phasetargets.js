/* =========================================================================
 * Phase-target derivation for every KPP and TPP.
 *
 * The framework's dictionaries give each KPP/TPP a maturity (P8) target and
 * name explicit interim floors for only a handful. This module fills the
 * rest so every KPP/TPP carries a justifiable target at every phase where
 * it is measurable, by interpolating linearly between anchor points in
 * priority order:
 *
 *   1. FRAMEWORK anchors: gate floors and phase milestones already in the
 *      catalog, plus three floors the catalog carries only as prose
 *      (PR-SCH-014 pins revenue sufficiency >=98% and reserves >=6 months
 *      at P7; PR-SCH-015 pins AI human-review capture >=97% at P5). These
 *      are authoritative and never overwritten.
 *   2. DATA-PLAN anchors: for the information-mesh metrics the Data tab
 *      already derives a full per-phase plan (dataphases.js). Those values
 *      are reused verbatim and the metric's own start phase is taken from
 *      that plan, so the Data and Quality tabs can never disagree.
 *   3. A RULE-DERIVED ENTRY floor at the phase the metric first becomes
 *      measurable, set from the maturity target's shape (a maximize target
 *      enters a bounded distance below its ceiling; a minimize target
 *      enters a multiple above its floor). If a framework gate floor is
 *      stricter than this heuristic entry, the entry is pulled to that
 *      floor so the ramp never regresses through it.
 *
 * Between anchors, missing phases interpolate linearly and are labeled
 * "derived interim target," distinct from framework floors. The seven
 * "to be calibrated" outcome metrics get a qualitative obligation ladder
 * (baseline, trend, calibration, certification) rather than invented
 * numbers, because the framework deliberately deferred those.
 *
 * Loaded after qualitydata.js and dataphases.js, before quality.js.
 * ========================================================================= */
"use strict";
(function () {
  var Q = window.NHA_QUALITY_DATA;
  if (!Q || !Q.parameters) return;
  var D = window.NHA_DATA_PHASES;
  var PHASES = ["P0", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"];
  function pIdx(p) { return PHASES.indexOf(p); }

  /* ---- Data-plan overrides: id -> phase -> {value, basis, justification} */
  var dp = {};
  if (D && D.phases) D.phases.forEach(function (ph) {
    (ph.groups || []).forEach(function (g) {
      (g.metrics || []).forEach(function (m) {
        (dp[m.id] = dp[m.id] || {})[ph.id] = {
          value: m.phaseTarget, basis: m.basis, justification: m.justification
        };
      });
    });
  });

  /* ---- Framework floors carried only as prose in the source ------------- */
  var EXTRA_ANCHORS = {
    "KPP-C5": { P7: { value: ">=98% of certified obligations",
      why: "PR-SCH-014: maturity certification may not proceed below 98% revenue sufficiency" } },
    "KPP-C6": { P7: { value: ">=6 months of volatile revenue exposure",
      why: "PR-SCH-014: at least six months of reserves before maturity certification" } },
    "TPP-11.5": { P5: { value: ">=97% of high-stakes AI decisions",
      why: "PR-SCH-015: national AI-assisted routing may not deploy below 97% human-review capture" } }
  };

  /* ---- First phase each family is measurable, with the reason ----------- */
  var REL = [
    [/^KPP-A6/, "P6", "worker premiums only end as national default coverage arrives"],
    [/^KPP-A7/, "P6", "bankruptcy effects need national coverage scale to measure"],
    [/^KPP-A/, "P3", "measurable from the first coverage wave"],
    [/^KPP-B/, "P4", "measurable from the first unit and routing pilots"],
    [/^KPP-C[123]/, "P6", "system-level cost ratios are meaningful only at national scale"],
    [/^KPP-C4/, "P3", "claims processing cost is measurable from wave-one operations"],
    [/^KPP-C/, "P3", "financing flows begin with the first coverage wave"],
    [/^KPP-D/, "P4", "clinical outcome baselines start with delivery pilots"],
    [/^KPP-E/, "P5", "equity stratification needs delivery scale for stable measurement"],
    [/^KPP-T2/, "P2", "medication continuity is at stake from the first pharmacy migration"],
    [/^KPP-T/, "P3", "patient migration begins with the first coverage wave"],
    [/^KPP-W1/, "P4", "displaced-worker cohorts appear as payer administration shrinks"],
    [/^KPP-TRUST/, "P3", "trust movement vs baseline is measurable once the public interacts with coverage"],
    [/^KPP-CULT/, "P4", "clinician culture change is measurable from delivery pilots"],
    [/^TPP-1\./, "P1", "identity and eligibility run in the registry foundation"],
    [/^TPP-2\./, "P3", "medical claims flow from the first coverage wave"],
    [/^TPP-3\./, "P2", "the pharmacy rail is the first live operation"],
    [/^TPP-4\./, "P2", "public manufacturing phase one begins"],
    [/^TPP-5\./, "P4", "hospital global-budget pilots begin"],
    [/^TPP-6\./, "P4", "unit pilots begin"],
    [/^TPP-7\./, "P4", "specialist backplane pilots begin"],
    [/^TPP-8\./, "P3", "workforce programs report from the first operating year"],
    [/^TPP-9\.7/, "P7", "EMS readiness standards arrive with the expanded-benefit phase"],
    [/^TPP-9\./, "P7", "expanded benefits launch in phase seven"],
    [/^TPP-10\./, "P1", "the records foundation starts with registries"],
    [/^TPP-11\.[123]/, "P1", "cyber and continuity duties start with the first registries"],
    [/^TPP-11\./, "P4", "clinical AI enters with the unit pilots"],
    [/^TPP-12\.4/, "P0", "public reporting duties begin with the first governing bodies"],
    [/^TPP-12\.[56]/, "P3", "appeals volumes begin with the first coverage wave"],
    [/^TPP-12\./, "P1", "oversight machinery stands up in the foundation phase"],
    [/^TPP-13\.1/, "P4", "priority R&D portfolios need the innovation agency operating"],
    [/^TPP-13\./, "P2", "innovation funding operations begin"],
    [/^TPP-LEG/, "P3", "denial explanations exist once claims flow"],
    [/^TPP-USE/, "P0", "rights notices and appeals are prototyped before live reliance"],
    [/^TPP-EMP/, "P3", "employer transition begins with the first coverage wave"],
    [/^TPP-REG/, "P5", "regional waivers begin at delivery scale"],
    [/^TPP-TRIB/, "P1", "tribal compacts are foundation-phase work"]
  ];
  function relevance(id) {
    for (var i = 0; i < REL.length; i++) {
      if (REL[i][0].test(id)) return { phase: REL[i][1], why: REL[i][2] };
    }
    return { phase: "P4", why: "conservatively tied to the delivery-pilot phase" };
  }

  /* ---- Numeric parsing + formatting ------------------------------------- */
  function stripTemporal(s) {
    return s.replace(/\s*\b(by|at)\s+(maturity|phase\s*8|ph-?p?8|p8)\b/ig, "")
            .replace(/\s{2,}/g, " ").trim();
  }
  /* returns {num, cmp:'>='|'<=', unit, decimals} or null */
  function parseNum(str) {
    if (!str) return null;
    var m = str.match(/(median\s*)?(>=|<=|≥|≤)?\s*\$?([\d][\d,]*(?:\.\d+)?)/);
    if (!m) return null;
    var raw = m[3], num = parseFloat(raw.replace(/,/g, ""));
    if (!isFinite(num)) return null;
    var cmp = /≥|>=/.test(m[2] || "") ? ">=" : (/≤|<=/.test(m[2] || "") ? "<=" : null);
    var unit = "plain";
    if (/%/.test(str)) unit = "%";
    else if (/per 100,000/.test(str)) unit = "per100k";
    else if (/per 10,000/.test(str)) unit = "per10k";
    else if (/hours/.test(str)) unit = "hours";
    else if (/months/.test(str)) unit = "months";
    else if (/days/.test(str)) unit = "days";
    else if (/\$/.test(str)) unit = "money";
    else if (/percentage points/.test(str)) unit = "pp";
    var decimals = /\.\d/.test(raw) ? (raw.split(".")[1] || "").length : 0;
    var comma = /,/.test(raw);
    return { num: num, cmp: cmp, unit: unit, decimals: decimals, comma: comma };
  }
  /* re-render a template string with the first numeric token replaced */
  function withNum(template, num, meta) {
    var t = stripTemporal(template);
    var txt;
    if (meta.comma || num >= 1000) txt = Math.round(num).toLocaleString("en-US");
    else if (meta.decimals) txt = num.toFixed(meta.decimals);
    else txt = (num % 1 === 0) ? String(Math.round(num)) : num.toFixed(1);
    return t.replace(/([\d][\d,]*(?:\.\d+)?)/, txt);
  }

  /* entry-floor magnitude for a maturity value with no interior anchor */
  function entryNum(meta) {
    var M = meta.num, isMax = meta.cmp !== "<=";
    if (isMax) {
      if (meta.unit === "%") return M - Math.min(10, Math.max(0.5, (100 - M) * 4));
      if (meta.unit === "months") return Math.max(1, Math.round(M / 4));
      if (meta.unit === "pp") return M * 0.3;
      return M * 0.25; /* counts */
    }
    switch (meta.unit) {
      case "%": return Math.min(M * 5, M + 20);
      case "per10k": case "per100k": return M * 2.7;
      case "hours": case "days": case "months": return M * 2;
      case "money": return M * 2;
      case "pp": return M * 4;
      default: return M * 1.25; /* bare ratios like 1.10 */
    }
  }

  var QUAL_LADDER = [
    "baseline measurement established and published",
    "improvement trend vs baseline demonstrated",
    "numeric target calibrated and adopted by NHASB",
    "calibrated target certified at maturity"
  ];

  /* ---- Enrich every KPP/TPP -------------------------------------------- */
  var addedDerived = 0, addedDataPlan = 0;
  Q.parameters.forEach(function (p) {
    if (p.type === "CP") return;
    p.rollout = p.rollout || [];
    var isDataPlan = !!dp[p.id];
    var extra = EXTRA_ANCHORS[p.id] || {};

    /* start phase: data-plan metrics start where the data plan starts */
    var rel = relevance(p.id);
    var relPhase = rel.phase, relWhy = rel.why;
    if (isDataPlan) {
      var earliest = PHASES.filter(function (ph) { return dp[p.id][ph]; })[0];
      if (earliest) { relPhase = earliest; relWhy = "the information-mesh plan first measures it here"; }
    }
    var startIdx = pIdx(relPhase);

    /* existing framework entries by phase (authoritative anchors) */
    var have = {};
    p.rollout.forEach(function (e) { have[e.phase] = e; });

    /* qualitative metrics: ladder, no numbers */
    var mat = parseNum(p.target);
    if (!mat) {
      var q = 0;
      for (var qi = startIdx; qi < PHASES.length - 1; qi++) {
        var ph = PHASES[qi];
        if (have[ph]) continue;
        p.rollout.push({ phase: ph, gate: "", kind: "derived interim target",
          value: QUAL_LADDER[Math.min(q, QUAL_LADDER.length - 1)],
          interpretation: "The framework deliberately left this target to be " +
            "calibrated from operating data; the interim obligation is " +
            "measurement and demonstrated direction, not an invented number." });
        q++; addedDerived++;
      }
      finalize(p, relPhase, relWhy);
      return;
    }

    /* build numeric anchors: phase -> {num, source, value} */
    var anchors = {};
    /* framework catalog entries */
    Object.keys(have).forEach(function (ph) {
      var pn = parseNum(have[ph].value);
      if (pn) anchors[ph] = { num: pn.num, source: "framework", value: have[ph].value };
    });
    /* data-plan entries */
    if (isDataPlan) Object.keys(dp[p.id]).forEach(function (ph) {
      if (anchors[ph]) return;
      var pn = parseNum(dp[p.id][ph].value);
      if (pn) {
        anchors[ph] = { num: pn.num, source: "dataplan", value: dp[p.id][ph].value,
          why: dp[p.id][ph].justification };
      }
    });
    /* extra prose floors */
    Object.keys(extra).forEach(function (ph) {
      if (anchors[ph]) return;
      var pn = parseNum(extra[ph].value);
      if (pn) anchors[ph] = { num: pn.num, source: "extra", value: extra[ph].value, why: extra[ph].why };
    });
    /* maturity anchor */
    if (!anchors.P8) anchors.P8 = { num: mat.num, source: "maturity", value: p.target };

    /* entry anchor at the start phase, pulled to any stricter interior floor */
    if (!anchors[relPhase] && !isDataPlan) {
      var en = entryNum(mat);
      var floors = [];
      Object.keys(anchors).forEach(function (ph) {
        if (ph !== "P8" && pIdx(ph) > startIdx) floors.push(anchors[ph].num);
      });
      if (floors.length) {
        var fl = mat.cmp === "<=" ? Math.max.apply(null, floors) : Math.min.apply(null, floors);
        en = mat.cmp === "<=" ? Math.max(en, fl) : Math.min(en, fl);
      }
      anchors[relPhase] = { num: en, source: "entry", value: withNum(p.target, en, mat) };
    }

    /* interpolate every phase from start to P8 */
    var anchoredPhases = Object.keys(anchors)
      .filter(function (ph) { return pIdx(ph) >= startIdx; })
      .sort(function (a, b) { return pIdx(a) - pIdx(b); });

    for (var i = startIdx; i < PHASES.length; i++) {
      var phase = PHASES[i];
      if (have[phase]) continue;         /* framework entry already present */
      if (anchors[phase] && anchors[phase].source === "dataplan") {
        p.rollout.push({ phase: phase, gate: "", kind: "data-plan interim target",
          value: anchors[phase].value,
          interpretation: "From the information-mesh data plan: " +
            (anchors[phase].why || "phase target from the Data tab methodology.") });
        addedDataPlan++;
        continue;
      }
      if (anchors[phase] && anchors[phase].source === "extra") {
        p.rollout.push({ phase: phase, gate: "", kind: "progression floor",
          value: anchors[phase].value, interpretation: anchors[phase].why });
        continue;
      }
      if (phase === "P8") continue;      /* maturity row already exists */
      if (anchors[phase] && anchors[phase].source === "entry") {
        p.rollout.push({ phase: phase, gate: "", kind: "derived interim target",
          value: anchors[phase].value,
          interpretation: "Entry floor: the phase this metric first becomes " +
            "measurable (" + relPhase + ", because " + relWhy + "), set from the " +
            "maturity target's shape." });
        continue;
      }
      /* find bracketing anchors and interpolate linearly */
      var lo = null, hi = null;
      anchoredPhases.forEach(function (ap) {
        if (pIdx(ap) <= i) lo = ap;
        if (pIdx(ap) >= i && hi === null) hi = ap;
      });
      if (lo === null || hi === null || lo === hi) continue;
      var f = (i - pIdx(lo)) / (pIdx(hi) - pIdx(lo));
      var num = anchors[lo].num + (anchors[hi].num - anchors[lo].num) * f;
      p.rollout.push({ phase: phase, gate: "", kind: "derived interim target",
        value: withNum(p.target, num, mat),
        interpretation: "Derived: linear interpolation between the " +
          lo + " and " + hi + " anchors toward the maturity target." });
      addedDerived++;
    }

    finalize(p, relPhase, relWhy);
  });

  function finalize(p, relPhase, relWhy) {
    p.rollout.sort(function (a, b) { return pIdx(a.phase) - pIdx(b.phase); });
    p._phaseStart = relPhase;
    p.phaseNote = "Targets shown for every phase from " + relPhase + " onward (" +
      relWhy + "). Framework floors and gate values are authoritative; " +
      "data-plan entries reuse the Data tab's methodology; entries marked " +
      "derived interpolate between those anchors and the maturity target.";
  }

  /* ---- Self-tests ------------------------------------------------------- */
  window.NHA.SELFTESTS = window.NHA.SELFTESTS || [];
  window.NHA.SELFTESTS.push({
    name: "Quality: every KPP/TPP has a target at each relevant phase",
    run: function () {
      return Q.parameters.filter(function (p) { return p.type !== "CP"; })
        .every(function (p) {
          var start = pIdx(p._phaseStart || relevance(p.id).phase);
          var have = {};
          p.rollout.forEach(function (e) { have[e.phase] = true; });
          for (var i = start; i < PHASES.length; i++) if (!have[PHASES[i]]) return false;
          return true;
        });
    }
  });
  window.NHA.SELFTESTS.push({
    name: "Quality: the derived target trajectory never regresses toward maturity",
    run: function () {
      return Q.parameters.filter(function (p) {
        return p.type !== "CP" && parseNum(p.target) && parseNum(p.target).cmp;
      }).every(function (p) {
        var mt = parseNum(p.target);
        /* one trajectory value per phase: derived, data-plan, or maturity
           only. Gate floors and phase milestones are minimums that may sit
           below the line at the same phase and are excluded. */
        var traj = {};
        p.rollout.forEach(function (e) {
          if (e.kind === "progression floor" || e.kind === "phase milestone") return;
          var pn = parseNum(e.value);
          if (pn && pn.unit === mt.unit) traj[e.phase] = pn.num;
        });
        var ordered = PHASES.filter(function (ph) { return traj[ph] != null; })
          .map(function (ph) { return traj[ph]; });
        for (var i = 1; i < ordered.length; i++) {
          if (mt.cmp === "<=" && ordered[i] > ordered[i - 1] * 1.01) return false;
          if (mt.cmp !== "<=" && ordered[i] < ordered[i - 1] * 0.99) return false;
        }
        return true;
      });
    }
  });
})();
