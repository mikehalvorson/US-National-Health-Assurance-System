# US National Health Assurance System

This repo holds the design framework and calibration data for a proposed
national public healthcare system that would replace the existing fragmented
U.S. healthcare system ("National Health Assurance"), plus the groundwork for
a quantitative fiscal/access/outcomes simulation of that framework.

## Repo structure

```
/National_Health_Assurance_Framework_v2.0.0_FINAL.docx   Full long-form policy document (final draft)
/National_Health_Assurance_Framework_v2.0.0_FINAL.pdf     Same, as PDF
/National_Health_Assurance_Framework_Source_Package.docx  Structured spec: architecture, requirements,
                                                            KPP/TPP dictionary, cost parameter dictionary,
                                                            simulation specification (read this first for
                                                            simulation work)
/Original Conversation Transcript.docx                    Raw drafting conversation history
/healthcare-docs-tracker.csv                               Tracker of current (2025-2026) enacted statutes,
                                                            final rules, and litigation relevant to US health
                                                            policy, for keeping the framework's assumptions
                                                            current against the real regulatory landscape
/research/                                                 Sourced real-world baseline data gathered to
                                                            calibrate the framework's cost parameters (see
                                                            research/README.md)
/research/parameter_baseline_seed.csv                      Machine-readable seed of the highest-confidence,
                                                            most load-bearing baseline numbers — start here
                                                            for simulation calibration constants
```

## The simulator (v2 — built)

v2 reorients the dashboard around what the system means for a person, not
around the framework document's original asserted figure (now noted only in
the methodology as superseded by the model's computed projections):

- **"What you'd pay for care"** leads the page: nine real care episodes
  (ER visit, childbirth, monthly insulin, MRI, ambulance, blood work,
  therapy, hearing aids, a nursing-home year, plus family premiums), each
  showing today's typical insured cost, today's uninsured cost, and the
  NHA point-of-care price ($0 for covered care) with the year the benefit
  arrives on the phase roadmap — every card sourced and confidence-graded.
- **A household annual calculator**: pick your situation (employer family,
  employer single, marketplace, uninsured) and compare today's
  premiums + out-of-pocket against the mature system, including a live
  model-computed line for the average household share of new taxes under
  the framework's ≤5% ordinary-household cap (KPP-C8).
- The system-level projection, cost path, bridge, financing, and benchmark
  sections follow, unchanged in substance.


`docs/` contains the **interactive public dashboard**: a fully client-side
static web app (plain HTML/JS/SVG, no build step, no dependencies, no
server) implementing the national-aggregate simulation specified in
HANDOFF.md. It runs 600 Monte Carlo draws over 27 sourced parameter
distributions in ~15ms in the browser, covers the framework's Phase 0–8
rollout (2027–2042) and all 19 stress scenarios, and validates itself with
25 built-in integrity tests shown in the page footer.

```
docs/index.html        page structure
docs/style.css         theme (light + dark), validated chart palette
docs/js/params.js      the parameter base: 27 distributions, each with
                        source citation + confidence grade, plus CMS 2023
                        calibration constants and phase-ramp schedules
docs/js/scenarios.js   the 19-scenario catalog as parameter overrides
docs/js/model.js       the engine: baseline world + NHA world computed
                        directly per category (offsets derived as
                        differences so double-counting is structurally
                        impossible), Monte Carlo, self-tests
docs/js/charts.js      dependency-free SVG charts (path + band, waterfall
                        bridge, financing stack, benchmark intervals)
docs/js/care.js        point-of-care scenario cards + household calculator
                        (v2): sourced today-vs-NHA costs for real episodes
docs/js/app.js         controls, rendering, tables
docs/js/taxparams.js   tax model (v3): income groups (CBO format), ten tax
                        instruments with sourced revenue + incidence vectors,
                        pluggable funding programs
docs/js/taxmodel.js    tax engine: revenue over time with phase-in schedules,
                        distributional burden by income group, net-of-health-
                        savings impact; self-tests
docs/js/taxcharts.js   revenue-vs-need stacked area, net household impact
                        diverging bars, effective-rate dumbbell
docs/js/taxapp.js      tax view UI + tab navigation; healthcare model's
                        financing path flows in live
docs/js/medications.js complete 200-family PMC portfolio, filters, savings
                        attribution calculator, and portfolio self-tests
tools/serve.ps1        local preview server (PowerShell, no Node needed)
```

**To deploy publicly:** GitHub → repo Settings → Pages → Source: "Deploy
from a branch" → Branch: `main`, folder `/docs` → Save. The dashboard will
be live at `https://mikehalvorson.github.io/US-National-Health-Assurance-System/`
within a couple of minutes. To preview locally:
`powershell -File tools/serve.ps1` then open http://localhost:8517.

**Headline v1 finding (base case, seed 42):** the mature system at 2024
scale computes to ~$5.3T/yr (10th–90th pct ≈ $5.2–5.5T) versus the
framework's asserted $4.75T (range $4.30–5.25T) and actual 2024 spending
of ~$5.3T — i.e., the framework's savings levers roughly pay for its
benefit expansions rather than beating today's spending, and the $4.75T
claim only lands inside the model's range under the optimistic scenario.
Mature-year new-revenue requirement computes to ~$3.4T/yr, of which the
extreme-wealth tax package covers roughly 12%. These results move with the
sliders — that's the point of the tool.

## Status

The framework document defines a full architecture, requirements register,
KPP/TPP targets, and a **named but not numerically calibrated** cost
parameter dictionary (~200 parameters, `CP-*` IDs) plus a master cost
equation. It explicitly states it does not include "calibrated numerical
distributions for every simulation parameter" or "an executable simulation
model."

The `research/` directory closes part of that gap: five research passes
gathered current, sourced, real-world baseline values (CMS NHE, KFF, CBO,
RAND, AAMC, HRSA, MedPAC, Census, etc.) mapped to the framework's `CP-*`
parameter IDs, plus additional parameters the framework didn't explicitly
name but that materially affect the simulation.

**Not yet done:** an executable simulation. The framework's own stated final
cost position (~$4.75T/year mature steady-state, $4.30-5.25T plausible range)
has not been independently validated against the sourced baselines in
`research/` — see `research/README.md` "Reconciling the framework's cost
claim" for the specific open question a builder needs to resolve first.

## Next step

Use `research/parameter_baseline_seed.csv` and the five detailed files in
`research/` as calibration inputs to build an executable version of the
simulation specified in the Source Package's "Simulation Specification"
section (modules, state variables, scenario catalog, and outputs).
