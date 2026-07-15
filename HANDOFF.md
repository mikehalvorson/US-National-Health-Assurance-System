# Handoff brief: building the National Health Assurance simulation

This is the build brief for the quantitative fiscal/access/outcomes
simulation of the National Health Assurance Framework. Everything referenced
below is in this repo. Read `README.md` and `research/README.md` first for
context on what exists; this file is the decisions and constraints for the
actual build.

## Goal

Determine what the National Health Assurance Framework would actually cost
and deliver, computed bottom-up from real-world parameters — not reproduce
the framework document's own stated numbers. The framework claims a mature
steady-state cost of ~$4.75T/year (2024 dollars, range $4.30-5.25T) and a
transition cost of $1.2-2.0T over 10-12 years. **Those figures are asserted,
not derived, and are not a target to hit.** A previous draft's $4.55T figure
is explicitly superseded/deprecated within the framework's own source
documents and should not be used at all. The simulation's job is to find out
what the number actually is when built from sourced parameters, then compare
that result against the framework's claim and against independent
benchmarks (below) — and report the gap if there is one.

## Design constraints

1. **Bottom-up, not tuned-to-match.** Do not adjust constants to land near
   $4.75T. If the model's output lands somewhere else, that's the finding.

2. **Single consistent calibration base year: 2023.** CMS's National Health
   Expenditure series is the primary anchor; 2023 is the last fully
   finalized historical year. `research/parameter_baseline_seed.csv` has a
   few rows pulled from 2024 preliminary data — see
   `research/README.md` ("Calibration base year") before using those; don't
   sum figures across vintages.

3. **Model uncertainty, don't hide it.** Most sourced parameters are ranges,
   not point values, and the framework's own output is a range. Build this
   as a Monte Carlo / sensitivity model that samples parameter distributions
   and produces output ranges, not a single deterministic point estimate.

4. **`C_offsets(t)` needs one non-overlapping definition.** The research
   surfaced multiple non-comparable "administrative savings" estimates for
   the same underlying phenomenon — e.g. CMS's narrow accounting figure
   ($360.3B, CP-TOT-005) vs. the broader Himmelstein/Woolhandler academic
   estimate ($1.1T, CP-OFF-001) vs. the CBO-scored IRA drug-negotiation
   savings ($98.5B/10yr, CP-OFF-003, the most authoritative single figure
   because it's the only one based on actual enacted-policy results rather
   than a modeled estimate). Pick one explicit, itemized, non-overlapping
   list of what's inside `C_offsets(t)` before coding it — don't blend
   figures from studies with different scopes into one number.

5. **Source a real utilization-elasticity coefficient before modeling
   induced demand.** The framework names the right concept
   (`CP-POP-005`/`006`, "zero-cost utilization elasticity") but no research
   pass in this repo pinned down an actual number — this is a real gap, not
   just missing data-entry. Cost = price × volume, and volume responds to
   price, so this materially changes the output. The RAND Health Insurance
   Experiment and its modern replications are the standard academic anchor
   (arc elasticity of demand for medical care around -0.2); source and cite
   a specific coefficient before hard-coding a guess.

## V1 scope (decided)

Build a **national-aggregate annual time series model** first:
- Single region (no state/regional breakdown yet), blended population (no
  age/income/disability stratification yet)
- Covers the master cost equation's ~19 spending categories plus the
  `C_offsets(t)` term (Source Package "Master cost equation")
- Models the Phase 0-8 rollout timeline (Source Package "Implementation
  Phases and Phase Gates") year by year — coverage %, unit-network buildout
  %, cost-sharing elimination, etc. all ramp rather than switching on
  instantly — so the model produces both the transition-period cost path and
  the mature steady-state
- Implements the 19-scenario catalog (`SCN-BASE` through `SCN-RURAL-STRESS`
  in the Source Package "Scenario Catalog") as parameter-perturbation
  presets on top of the base model
- Validates its output against three independent real-world benchmarks
  already sourced in `research/01_macro_financing_population_offsets.md`:
  CBO's own single-payer costing methodology (CP-FIN-015, the most
  authoritative direct comparator), and the Urban Institute / Mercatus
  10-year federal cost estimates (CP-FIN-016), which converge around
  $32-34T/10yr federal despite opposite institutional leanings

Region, population-group, and specialty-level granularity (the full
dimensional schema in the Source Package's "Simulation Input Schema
Dimensions") is explicitly v2 — don't build it now, but don't architect the
v1 model in a way that makes adding those dimensions later painful (e.g.
keep cost categories as named, parameterized functions rather than
hard-coded scalars).

## Deliverable

**End target: a public-facing interactive web dashboard**, not a report or
notebook alone. The owner intends to host this on a public website so
members of the public can explore the framework's assumptions and see
projected cost/access/outcome effects directly, rather than reading a
500-page document. Concretely this means:
- Users should be able to adjust key assumptions (at minimum: the scenario
  catalog presets, and ideally individual high-impact parameters like the
  utilization elasticity, admin-savings assumption, and wealth-tax
  collection efficiency) and see cost/access/outcome projections update
  - Output should show the transition-period path (year by year through
    Phase 8) and the mature steady-state, with uncertainty ranges visible,
    not just point estimates
  - Should visibly show the comparison against the framework's own $4.75T
    claim and against the CBO/Urban Institute/Mercatus benchmarks, so a
    visitor can see whether the framework's claim holds up
- The technical approach (framework, hosting model, whether computation runs
  client-side or server-side) is left to whoever builds it — but the
  interactive-public-dashboard requirement should drive that choice from the
  start, not be bolted on after a notebook-style model is already built

## Known open gaps (don't silently patch these — flag them in the UI/output)

From the research files' own "gaps for follow-up" sections:
- Several CBO and CMS source PDFs returned HTTP 403 to automated fetch;
  current figures were reconstructed from secondary sources (KFF, Health
  Affairs, Brookings commentary) that are reliable but not a substitute for
  the primary table
- BLS occupational headcount data (insurance claims processors, medical
  billing clerks — needed to size the displaced-worker transition cohort)
  blocked automated fetch and needs the BLS API directly
- No clean single citation yet for: age-based per-capita spending
  multiplier (65+ vs. under-65 — needed to connect population aging to cost
  growth), a topline adult diabetes prevalence %, CHIP-only spending
  isolated from Medicaid, national aggregate employer health spending (only
  a derived proxy exists), and a broader RAND-style international drug price
  ratio to scale IRA-style negotiation savings up to a full reference-pricing
  scenario

These are documented per-file in `research/`. Treat them as inputs to build
with visible confidence levels (the seed CSV already has a `confidence`
column), not blockers — but the dashboard should be honest about which
outputs rest on lower-confidence inputs.
