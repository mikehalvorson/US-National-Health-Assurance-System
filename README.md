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
