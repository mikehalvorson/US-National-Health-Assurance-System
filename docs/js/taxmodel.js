/* =========================================================================
 * Tax model engine
 *
 * Computes, for a package of instrument settings and a set of funding
 * programs, over the model horizon (2027–2042):
 *   - revenue by instrument by year (phase-in schedules, bases growing
 *     with the economy)
 *   - total need by year (sum of enabled programs)
 *   - coverage (revenue ÷ need)
 *   - distributional table at any year: per income group, new taxes paid
 *     ($/household and % of income), health-cost relief, and NET impact
 *   - effective federal tax rate curve, current law vs. proposed
 *
 * Pure functions over NHA.TAX.* parameter data; no DOM. Self-tests at the
 * bottom register with the shared self-test harness.
 * ========================================================================= */
"use strict";
(function () {
  var T = NHA.TAX;
  var YEARS = [];
  for (var y = 2027; y <= 2042; y++) YEARS.push(y);
  T.YEARS = YEARS;

  /* ---- settings object ----
   * { instruments: {id: {value, phaseStart, phaseYears, enabled}},
   *   programs: [program objects with .enabled] }
   * value semantics: 'scale' → multiple of default rev1x; 'toggle' → 0/1.
   */
  T.defaultSettings = function () {
    var s = { instruments: {} };
    T.INSTRUMENTS.forEach(function (ins) {
      s.instruments[ins.id] = {
        value: ins.kind === "toggle" ? (ins.default ? 1 : 0) : ins.default,
        phaseStart: ins.phaseStart,
        phaseYears: ins.phaseYears,
        enabled: ins.kind === "toggle" ? !!ins.default : ins.default > 0
      };
    });
    return s;
  };

  function growth(year) {
    return Math.pow(1 + T.ECON.realGrowth, year - T.ECON.baseYear);
  }
  function ramp(year, start, years) {
    if (year < start) return 0;
    if (years <= 0) return 1;
    return Math.min(1, (year - start + 1) / years);
  }

  /* Revenue for one instrument in one year, $B (2024$) */
  T.instrumentRevenue = function (ins, st, year) {
    if (!st.enabled || st.value <= 0) return 0;
    return ins.rev1x * st.value * ramp(year, st.phaseStart, st.phaseYears) * growth(year);
  };

  /* Full computation over the horizon */
  T.compute = function (settings, programs) {
    var byInstrument = {}; // id -> [per year]
    var totalRev = YEARS.map(function () { return 0; });
    T.INSTRUMENTS.forEach(function (ins) {
      var st = settings.instruments[ins.id];
      byInstrument[ins.id] = YEARS.map(function (yr, i) {
        var r = T.instrumentRevenue(ins, st, yr);
        totalRev[i] += r;
        return r;
      });
    });

    var need = YEARS.map(function (yr) {
      var n = 0;
      programs.forEach(function (p) { if (p.enabled) n += p.need(yr); });
      return n;
    });

    var coverage = YEARS.map(function (_, i) {
      return need[i] > 0 ? totalRev[i] / need[i] : (totalRev[i] > 0 ? Infinity : 1);
    });

    return { years: YEARS, byInstrument: byInstrument, totalRev: totalRev,
             need: need, coverage: coverage };
  };

  /* ---- Distribution at one year ----
   * healthReliefB: aggregate household health spending replaced in that
   * year ($B, 2024$) — from the healthcare model; 0 if not linked.
   * Returns rows per group + totals.
   */
  T.distribution = function (settings, year, healthReliefB) {
    var rows = [];
    var g = growth(year);
    T.GROUPS.forEach(function (grp) {
      var taxB = 0;
      T.INSTRUMENTS.forEach(function (ins) {
        var st = settings.instruments[ins.id];
        var rev = T.instrumentRevenue(ins, st, year);
        taxB += rev * (ins.incidence[grp.id] || 0);
      });
      var reliefB = (healthReliefB || 0) * grp.healthRelief;
      var hh = grp.hhM * 1e6;
      var income = grp.avgIncome * g; /* incomes grow with the economy too */
      var taxPerHH = taxB * 1e9 / hh;
      var reliefPerHH = reliefB * 1e9 / hh;
      var netPerHH = taxPerHH - reliefPerHH;
      rows.push({
        group: grp, taxB: taxB, reliefB: reliefB,
        taxPerHH: taxPerHH, reliefPerHH: reliefPerHH, netPerHH: netPerHH,
        netPctIncome: netPerHH / income,
        taxPctIncome: taxPerHH / income,
        curRate: grp.curRate,
        newRate: grp.curRate + taxPerHH / income,
        avgIncomeNow: income
      });
    });
    return rows;
  };

  /* ---- Self-tests (register with the shared harness) ---- */
  NHA.SELFTESTS = NHA.SELFTESTS || [];

  NHA.SELFTESTS.push({
    name: "Tax: every instrument's incidence shares sum to 1",
    run: function () {
      return T.INSTRUMENTS.every(function (ins) {
        var s = 0;
        T.GROUPS.forEach(function (g) { s += ins.incidence[g.id] || 0; });
        return Math.abs(s - 1) < 0.005;
      });
    }
  });

  NHA.SELFTESTS.push({
    name: "Tax: group shares (wage/capital/consumption/relief) each sum to 1",
    run: function () {
      var cols = ["wageShare", "capShare", "consumpShare", "healthRelief"];
      return cols.every(function (c) {
        var s = 0;
        T.GROUPS.forEach(function (g) { s += g[c]; });
        return Math.abs(s - 1) < 0.01;
      });
    }
  });

  NHA.SELFTESTS.push({
    name: "Tax: distribution burden reconciles with total revenue",
    run: function () {
      var s = T.defaultSettings();
      var year = 2040;
      var rows = T.distribution(s, year, 0);
      var sumTax = rows.reduce(function (a, r) { return a + r.taxB; }, 0);
      var c = T.compute(s, T.PROGRAMS);
      var total = c.totalRev[c.years.indexOf(year)];
      return Math.abs(sumTax - total) / total < 0.005;
    }
  });

  NHA.SELFTESTS.push({
    name: "Tax: revenue is linear in a scale instrument's setting",
    run: function () {
      var s1 = T.defaultSettings(), s2 = T.defaultSettings();
      s2.instruments.payroll.value = 2 * s1.instruments.payroll.value;
      var ins = T.INSTRUMENTS.filter(function (i) { return i.id === "payroll"; })[0];
      var a = T.instrumentRevenue(ins, s1.instruments.payroll, 2040);
      var b = T.instrumentRevenue(ins, s2.instruments.payroll, 2040);
      return Math.abs(b - 2 * a) < 1e-9;
    }
  });

  NHA.SELFTESTS.push({
    name: "Tax: phase-in ramps from 0 to full",
    run: function () {
      var ins = T.INSTRUMENTS.filter(function (i) { return i.id === "surtax"; })[0];
      var st = { value: 1, enabled: true, phaseStart: 2029, phaseYears: 4 };
      var before = T.instrumentRevenue(ins, st, 2028);
      var mid = T.instrumentRevenue(ins, st, 2030);
      var full = T.instrumentRevenue(ins, st, 2035) /
                 Math.pow(1 + T.ECON.realGrowth, 2035 - T.ECON.baseYear);
      return before === 0 && mid > 0 && mid < full * 0.75 &&
             Math.abs(full - ins.rev1x) < 1;
    }
  });
})();
