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
                                                            most load-bearing baseline numbers - start here
                                                            for simulation calibration constants
```

## The simulator (v2 - built)

v2 reorients the dashboard around what the system means for a person, not
around the framework document's original asserted figure (now noted only in
the methodology as superseded by the model's computed projections):

- **"What you'd pay for care"** leads the page: nine real care episodes
  (ER visit, childbirth, monthly insulin, MRI, ambulance, blood work,
  therapy, hearing aids, a nursing-home year, plus family premiums), each
  showing today's typical insured cost, today's uninsured cost, and the
  NHA point-of-care price ($0 for covered care) with the year the benefit
  arrives on the phase roadmap - every card sourced and confidence-graded.
- **A household annual calculator**: pick your situation (employer family,
  employer single, marketplace, uninsured) and compare today's
  premiums + out-of-pocket against the mature system, including a live
  model-computed line for the average household share of new taxes under
  the framework's ≤5% ordinary-household cap (KPP-C8).
- The system-level projection, cost path, bridge, financing, and benchmark
  sections follow, unchanged in substance.


`src/` contains the **interactive public dashboard**: an Astro static site
that builds to plain HTML/JS/SVG with no runtime dependencies and no server,
implementing the national-aggregate simulation specified in BUILD-BRIEF.md.
It runs 600 Monte Carlo draws over 27 sourced parameter distributions in
~15ms in the browser, covers the framework's Phase 0–8 rollout (2027–2042)
and all 19 stress scenarios. It validates itself with
115 built-in integrity tests, shown in the page footer and enforced by the
build gate.

<!-- R155: the count above is checked against selfTestSummary().total by a
     build-time self-test, so it cannot drift again. Regenerate the figure by
     running `pnpm test`; the assertion names the correct number when it fails. -->


```
src/pages/*.astro      the 14 chapters, one route each; index.astro is the
                        Overview. src/lib/tabs.ts is the route registry and
                        the single source of navigation order and labels
src/layouts/           BaseLayout.astro: the shell every page renders into
src/components/        SiteHeader, SiteFooter, TabNav, ChapterNav
src/styles/global.css  theme (light + dark), validated chart palette
src/lib/params.ts      the parameter base: 27 distributions, each with
                        source citation + confidence grade, plus CMS 2023
                        calibration constants and phase-ramp schedules
src/lib/scenarios.ts   the 19-scenario catalog as parameter overrides
src/lib/model.ts       the engine: baseline world + NHA world computed
                        directly per category (offsets derived as
                        differences so double-counting is structurally
                        impossible), Monte Carlo, self-tests
src/lib/chart-util.ts  dependency-free SVG charts, with one module per
 + *-chart.ts           chart family (path + band, waterfall bridge,
                        financing stack, benchmark intervals)
src/lib/care.ts        point-of-care scenario cards + household calculator
                        (v2): sourced today-vs-NHA costs for real episodes
src/lib/taxparams.ts   tax model (v3): income groups (CBO format), ten tax
                        instruments with sourced revenue + incidence vectors,
                        pluggable funding programs
src/lib/taxmodel.ts    tax engine: revenue over time with phase-in schedules,
                        distributional burden by income group, net-of-health-
                        savings impact; self-tests
src/lib/medications.ts complete 200-family PMC portfolio, filters, savings
                        attribution calculator, and portfolio self-tests
src/lib/selftests.ts   the self-test registry: every integrity check the
                        build gate runs, and the only place a new one is added
src/scripts/*-client.ts one client island per chapter; each re-initialises on
                        astro:page-load and is idempotent
public/data/*.json     county, state and hospital-region geometry, fetched
                        by the Physical Care map at runtime
```

**To deploy publicly:** nothing to configure by hand. Pages is served by
GitHub Actions: `.github/workflows/deploy.yml` builds `src/` on every push to
`main` and uploads the result, publishing to
`https://mikehalvorson.github.io/US-National-Health-Assurance-System/`.

> Do **not** set Settings → Pages → Source to "Deploy from a branch." That
> switches Pages off the workflow above. The `docs/` directory in this repo is
> a retired predecessor of the dashboard, kept for provenance only; pointing
> Pages at it would publish the retired app over the live one at the same URL.

To develop locally: `pnpm install`, then `pnpm dev` for the dev server or
`pnpm build` for the static build the workflow produces.

**Headline v1 finding (base case, seed 42):** the mature system at 2024
scale computes to ~$5.3T/yr (10th–90th pct ≈ $5.2–5.5T) versus the
framework's asserted $4.75T (range $4.30–5.25T) and actual 2024 spending
of ~$5.3T - i.e., the framework's savings levers roughly pay for its
benefit expansions rather than beating today's spending, and the $4.75T
claim only lands inside the model's range under the optimistic scenario.
Mature-year new-revenue requirement computes to ~$3.4T/yr, of which the
extreme-wealth tax package covers roughly 12%. These results move with the
sliders - that's the point of the tool.

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
`research/` - see `research/README.md` "Reconciling the framework's cost
claim" for the specific open question a builder needs to resolve first.

## Next step

Use `research/parameter_baseline_seed.csv` and the five detailed files in
`research/` as calibration inputs to build an executable version of the
simulation specified in the Source Package's "Simulation Specification"
section (modules, state variables, scenario catalog, and outputs).
