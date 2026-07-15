/* =========================================================================
 * Point-of-care comparison: what a person pays for real care episodes
 * today (typical insured / uninsured) versus under National Health
 * Assurance ($0 at the point of care for covered medically necessary care —
 * framework ASM-006 / KPP-A3, which caps covered-care patient billing at
 * ≤0.5% of encounters).
 *
 * "Today" figures are national averages or typical ranges with the source
 * noted per card. Insured out-of-pocket is inherently plan-dependent —
 * ranges span common copay/deductible/coinsurance situations and are
 * labeled as such. NHA availability year comes from the framework's phase
 * roadmap (drugs: Phase 2, Year 3 ≈ 2029; cost-sharing elimination:
 * Phase 6, Year 8 ≈ 2034; LTC/dental/vision/hearing/behavioral expansion:
 * Phase 7–8, Years 10–12 ≈ 2036–2038).
 * ========================================================================= */
"use strict";
var NHA = window.NHA || {};
window.NHA = NHA;

NHA.CARE_SCENARIOS = [
  {
    id: "premium",
    title: "Health insurance premiums (family, per year)",
    todayInsured: { lo: 6850, hi: 6850, note: "worker's share of a $26,993 employer family premium" },
    todayUninsured: { lo: 0, hi: 0, note: "no premium — and no coverage" },
    nha: { amount: 0, fromYear: 2031, note: "no premiums once your coverage wave migrates (Years 4–8); employers pay a payroll contribution instead" },
    source: "KFF Employer Health Benefits Survey 2025",
    confidence: "high"
  },
  {
    id: "er",
    title: "Emergency room visit",
    todayInsured: { lo: 150, hi: 1500, note: "copay + deductible/coinsurance, plan-dependent" },
    todayUninsured: { lo: 1500, hi: 4000, note: "billed charges; average total cost ≈ $2,453" },
    nha: { amount: 0, fromYear: 2034, note: "covered in full; existing cost-sharing continues until Phase 6 elimination" },
    source: "CDC NHAMCS (average ED visit cost); insured range is plan-dependent",
    confidence: "medium"
  },
  {
    id: "childbirth",
    title: "Having a baby (full episode: pregnancy, delivery, postpartum)",
    todayInsured: { lo: 2000, hi: 4000, note: "average insured out-of-pocket ≈ $2,854" },
    todayUninsured: { lo: 15000, hi: 30000, note: "average total episode cost ≈ $18,865" },
    nha: { amount: 0, fromYear: 2034, note: "covered in full, including prenatal and postpartum care" },
    source: "Peterson–KFF Health System Tracker (2022 analysis of large-employer claims)",
    confidence: "medium"
  },
  {
    id: "insulin",
    title: "Insulin, one month (diabetes)",
    todayInsured: { lo: 35, hi: 100, note: "$35/mo caps now apply in Medicare & many plans" },
    todayUninsured: { lo: 70, hi: 300, note: "cash price after 2023–24 list-price cuts; production cost is $2–6/vial" },
    nha: { amount: 0, fromYear: 2029, note: "$0 for ≥98% of essential formulary fills — arrives early, with the Phase 2 pharmacy utility" },
    source: "Yale/BMJ Global Health production-cost study; Civica Rx $30/vial nonprofit price; ADA/manufacturer cap programs",
    confidence: "medium"
  },
  {
    id: "mri",
    title: "MRI scan",
    todayInsured: { lo: 300, hi: 1100, note: "typically hits the deductible; commercial average price ≈ $1,959" },
    todayUninsured: { lo: 1000, hi: 3000, note: "billed charges vary several-fold by site" },
    nha: { amount: 0, fromYear: 2034, note: "covered when clinically indicated; diagnostic-first pathways" },
    source: "Health Care Cost Institute (commercial price data)",
    confidence: "medium"
  },
  {
    id: "ambulance",
    title: "Ground ambulance ride",
    todayInsured: { lo: 450, hi: 1300, note: "ground ambulance is NOT protected by the No Surprises Act — balance billing is common" },
    todayUninsured: { lo: 1300, hi: 3000, note: "mean cost per transport ≈ $2,673" },
    nha: { amount: 0, fromYear: 2034, note: "EMS becomes a readiness-funded public service" },
    source: "Federal Ground Ambulance Data Collection System (GADCS)",
    confidence: "high"
  },
  {
    id: "labs",
    title: "Routine blood work (metabolic panel + CBC)",
    todayInsured: { lo: 0, hi: 60, note: "often free preventive; billed if diagnostic" },
    todayUninsured: { lo: 37, hi: 100, note: "billed charges run 5–6× the Medicare rate ($8–10)" },
    nha: { amount: 0, fromYear: 2034, note: "included in unit-network and primary-care visits" },
    source: "CMS Clinical Lab Fee Schedule vs. billed-charge studies",
    confidence: "medium"
  },
  {
    id: "therapy",
    title: "Therapy session (mental health)",
    todayInsured: { lo: 20, hi: 75, note: "in-network copay — when an in-network therapist is available" },
    todayUninsured: { lo: 100, hi: 200, note: "typical cash price per session" },
    nha: { amount: 0, fromYear: 2034, note: "covered; behavioral-health expansion (48-hour first-contact standard) completes Years 10–12" },
    source: "SAMHSA spending data; typical market rates (plan- and market-dependent)",
    confidence: "low"
  },
  {
    id: "hearing",
    title: "Hearing aids (pair)",
    todayInsured: { lo: 2000, hi: 8000, note: "rarely covered today — most people pay full price; average ≈ $4,672" },
    todayUninsured: { lo: 2000, hi: 8000, note: "same — this is an uncovered market for nearly everyone" },
    nha: { amount: 0, fromYear: 2036, note: "standard devices covered under the dental/vision/hearing expansion (Phase 7)" },
    source: "Hearing Industries Association pricing data",
    confidence: "high"
  },
  {
    id: "nursing",
    title: "Nursing home care (one year)",
    todayInsured: { lo: 111000, hi: 128000, note: "Medicare doesn't cover it; Medicaid only after spending down your assets" },
    todayUninsured: { lo: 111000, hi: 128000, note: "private-pay national average" },
    nha: { amount: 0, fromYear: 2036, note: "covered under the universal long-term-care benefit (home-first; institutional when needed), Phase 7–8" },
    source: "Genworth/CareScout Cost of Care Survey 2024–25",
    confidence: "high"
  }
];

/* ---- Household profiles for the annual calculator -----------------------
 * "Today" = premium contribution + typical out-of-pocket spending.
 * Average household OOP is derived transparently: CMS out-of-pocket total
 * $505.7B (2023) ÷ 132.2M households ≈ $3,825/household/yr; per-person
 * ≈ $1,514. Premium contributions from KFF 2025 (employer plans);
 * marketplace premiums vary enormously with age, income and subsidy status.
 * ------------------------------------------------------------------------ */
NHA.HOUSEHOLDS_M = 132.2; // Census 2024, millions of U.S. households

NHA.HOUSEHOLD_PROFILES = [
  {
    id: "emp-family",
    label: "Family with employer coverage",
    premium: { lo: 6850, hi: 6850, note: "worker share of family premium (KFF 2025)" },
    oop: { lo: 2500, hi: 5500, note: "deductibles, copays, coinsurance — household average ≈ $3,825 (derived from CMS)" },
    confidence: "medium"
  },
  {
    id: "emp-single",
    label: "Single person with employer coverage",
    premium: { lo: 1492, hi: 1492, note: "worker share (~16%) of a $9,325 single premium (KFF 2025)" },
    oop: { lo: 800, hi: 2500, note: "per-person average ≈ $1,514 (derived from CMS)" },
    confidence: "medium"
  },
  {
    id: "marketplace",
    label: "Family buying marketplace coverage",
    premium: { lo: 6000, hi: 18000, note: "varies enormously with age, state, and subsidy eligibility — enhanced subsidies expired in 2026" },
    oop: { lo: 3000, hi: 9000, note: "marketplace deductibles are typically much higher than employer plans" },
    confidence: "low"
  },
  {
    id: "uninsured",
    label: "Uninsured adult",
    premium: { lo: 0, hi: 0, note: "no premium — no protection" },
    oop: { lo: 500, hi: 5000, note: "averages hide the real risk: one hospitalization can mean five-figure debt" },
    confidence: "low"
  }
];

/* ---- Renderers ---------------------------------------------------------- */
(function () {
  function div(cls, parent, text) {
    var d = document.createElement("div");
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    if (parent) parent.appendChild(d);
    return d;
  }
  function moneyRange(lo, hi) {
    function m(v) { return "$" + Math.round(v).toLocaleString("en-US"); }
    return lo === hi ? m(lo) : m(lo) + " – " + m(hi);
  }

  NHA.renderCareCards = function (container) {
    container.innerHTML = "";
    NHA.CARE_SCENARIOS.forEach(function (s) {
      var card = div("care-card", container);
      div("care-title", card, s.title);

      var rows = div("care-rows", card);
      var r1 = div("care-row", rows);
      div("care-row-label", r1, "Today — typical insured");
      div("care-row-val", r1, moneyRange(s.todayInsured.lo, s.todayInsured.hi));
      var n1 = div("care-row-note", rows, s.todayInsured.note);

      var r2 = div("care-row", rows);
      div("care-row-label", r2, "Today — uninsured");
      div("care-row-val", r2, moneyRange(s.todayUninsured.lo, s.todayUninsured.hi));
      div("care-row-note", rows, s.todayUninsured.note);

      var nhaBlock = div("care-nha", card);
      var nl = div("care-nha-line", nhaBlock);
      div("care-nha-label", nl, "Under NHA");
      div("care-nha-val", nl, "$0");
      var chip = div("care-year-chip", nl, "from ~" + s.nha.fromYear);
      chip.title = "Assuming enactment in 2027; see the phase roadmap.";
      div("care-nha-note", nhaBlock, s.nha.note);

      var src = div("care-src", card, "Source: " + s.source);
      var conf = document.createElement("span");
      conf.className = "conf " + s.confidence;
      conf.textContent = s.confidence;
      src.appendChild(document.createTextNode(" "));
      src.appendChild(conf);
    });
  };

  /* Household annual calculator.
   * getModelNumbers() → { newRevenueB, matureYear } supplied by app.js so
   * the tax-share line stays live with the model. */
  NHA.renderHouseholdCalc = function (container, getModelNumbers) {
    container.innerHTML = "";

    var picker = div("hh-picker", container);
    var lab = document.createElement("label");
    lab.textContent = "Your situation: ";
    lab.setAttribute("for", "hh-select");
    var sel = document.createElement("select");
    sel.id = "hh-select";
    NHA.HOUSEHOLD_PROFILES.forEach(function (p) {
      var o = document.createElement("option");
      o.value = p.id; o.textContent = p.label;
      sel.appendChild(o);
    });
    picker.appendChild(lab); picker.appendChild(sel);

    var grid = div("hh-grid", container);
    var todayCol = div("hh-col", grid);
    var nhaCol = div("hh-col hh-col-nha", grid);
    var foot = div("hh-foot note", container);

    function render() {
      var p = NHA.HOUSEHOLD_PROFILES.filter(function (x) { return x.id === sel.value; })[0] ||
              NHA.HOUSEHOLD_PROFILES[0];
      var m = getModelNumbers();
      /* KPP-C8: ordinary households bear ≤5% of incremental financing.
       * $B → $ per household: (0.05 × B × 1e9) ÷ (households in millions × 1e6) */
      var kppShare = (0.05 * m.newRevenueB * 1e9) / (NHA.HOUSEHOLDS_M * 1e6);

      todayCol.innerHTML = ""; nhaCol.innerHTML = "";

      div("hh-col-head", todayCol, "Today (per year)");
      var tPrem = div("hh-line", todayCol);
      div("hh-line-label", tPrem, "Premiums");
      div("hh-line-val", tPrem, moneyRange(p.premium.lo, p.premium.hi));
      div("hh-line-note", todayCol, p.premium.note);
      var tOop = div("hh-line", todayCol);
      div("hh-line-label", tOop, "Out-of-pocket care costs");
      div("hh-line-val", tOop, moneyRange(p.oop.lo, p.oop.hi));
      div("hh-line-note", todayCol, p.oop.note);
      var tTot = div("hh-line hh-total", todayCol);
      div("hh-line-label", tTot, "Typical total");
      div("hh-line-val", tTot, moneyRange(p.premium.lo + p.oop.lo, p.premium.hi + p.oop.hi));

      div("hh-col-head", nhaCol, "Under NHA at maturity (per year)");
      var nPrem = div("hh-line", nhaCol);
      div("hh-line-label", nPrem, "Premiums");
      div("hh-line-val", nPrem, "$0");
      var nOop = div("hh-line", nhaCol);
      div("hh-line-label", nOop, "Point-of-care costs for covered care");
      div("hh-line-val", nOop, "$0");
      div("hh-line-note", nhaCol, "covered medically necessary care is free at the point of use (KPP-A3 allows ≤0.5% billing exceptions); non-covered extras remain private");
      var nTax = div("hh-line", nhaCol);
      div("hh-line-label", nTax, "Avg. household share of new taxes if financed per the framework's cap");
      div("hh-line-val", nTax, "≤ $" + Math.round(kppShare).toLocaleString("en-US"));
      div("hh-line-note", nhaCol,
        "the framework caps ordinary households at 5% of new financing (KPP-C8): 5% of the model's " +
        NHA.fmt.money(m.newRevenueB) + "/yr new-revenue requirement ÷ " + NHA.HOUSEHOLDS_M + "M households. " +
        "The rest falls on wealth, high-income, employer, and health-sector taxes — if those levers deliver.");

      foot.textContent =
        "Honest caveats: employer payroll contributions are widely expected to show up partly in wages over time (not modeled); " +
        "the uninsured today spend little on average because they skip care — the comparison understates what coverage is worth to them; " +
        "and the tax line depends entirely on Congress honoring the framework's household-protection cap.";
    }
    sel.addEventListener("change", render);
    NHA._rerenderHousehold = render; // app.js calls this when the model recomputes
    render();
  };
})();
