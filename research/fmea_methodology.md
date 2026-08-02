# Failure Modes and Effects Analysis methodology

How the Risk tab derives a failure mode, an effect, a probability, and a
consequence for every controlled target, and where the catalog is missing the
information needed to score one. The tab is labeled Risk because it will grow to
associate these failures with named risks and handling strategies; the analysis
underneath is a Failure Modes and Effects Analysis. Engine: `src/lib/fmea.ts`.
Tab: `src/pages/risk.astro` + `src/scripts/fmea-client.ts`. Self-tests:
`tests/lib/fmea.test.ts`.

## What counts as a failure

A failure mode is a phase-based target that is not met.

- Every key performance parameter (KPP) and technical performance parameter
  (TPP) carries a target at each rollout phase where it is measurable (see
  `data_phase_target_methodology.md` and `src/lib/phase-targets.ts`). Each of
  those phase-target rows becomes one failure mode: the target is missed at that
  phase. This yields 727 KPP/TPP failure modes (222 KPP, 505 TPP).
- Cost parameters (CP) carry no phase target. Their failure mode is a
  calibration-tolerance breach: the value is never calibrated or lands outside
  its controlled range. One per CP, 310 in all.

Total: 1,037 failure modes. Assessing each phase, not just maturity, is what
lets a recoverable Year 6 pilot shortfall separate from a national-scale harm,
and is why one parameter appears in several risk bands.

## Scoring: a five-by-five probability by consequence chart

Each failure mode is placed on a standard 5x5 risk grid. The cell sets the color
band and criticality tier. Bands map to the dashboard palette: extreme = red
(`--series-6`), high = orange (`--series-8`), moderate = yellow (`--series-3`),
low = green (`--series-4`).

Phase-target failures (KPP/TPP) and cost-parameter calibration failures are
charted separately. Their occurrence is not measured the same way: a
phase-target occurrence is derived from the target itself, while a CP occurrence
is borrowed from the simulation layer (below), so the two do not share a matrix.

### Probability (occurrence, 1 to 5)

Derived from signals already in the catalog, starting at a base of 1.5 and
raised by:

- **Target stringency.** Maximize-percent targets close to perfection (small
  headroom to 100) and minimize targets with very low ceilings are hard to hold;
  up to +2.
- **Required step-up.** The size of the improvement demanded from the previous
  phase to this one; up to +1.
- **Not yet calibrated.** The parameter's status or unit status still says a
  baseline or value is required; +0.5.
- **Unproven foundation.** Foundation phases P0 and P1 act on systems not yet in
  operation (+1); first live operation at P2 (+0.5).

Rounded and clamped to 1 to 5. No failure mode scores 1: every controlled target
sits on an unproven or ambitious trajectory, so the lowest occurrence observed is
2. That is a finding, not an artifact.

### Consequence (severity, 1 to 5)

Set by the kind of harm the miss produces (the effect class), then adjusted:

- **Effect-class ceiling.** Patient safety, loss of coverage, medication
  continuity, and fiscal solvency ceiling at 5. Cyber and system continuity,
  provider payment, access, rights, and care continuity at 4. Workforce,
  governance, and calibration at 3. Innovation at 2.
- **Technical enabler discount.** A missed TPP interim target is usually a
  repair, not direct harm, so TPP severity drops by 1 unless the domain is
  itself harmful (safety, cyber, medication).
- **Phase blast radius.** An early pilot reaches few people. P0 and P1 rows lose
  1, P2 loses 0.5, P3 and P4 lose 0.25. Top harm classes are floored at 3 so
  serious harm stays serious even in a pilot.
- **Gate go/no-go.** If the target is a phase-gate floor missed at the phase the
  gate binds, +1: it halts a whole rollout wave. Gate-to-parameter linkage is
  parsed from the controlled gate table (`QUALITY_DATA.gates`, G1 to G8).

### Detectability and the risk priority number

A secondary detectability score (1 easy to 5 hidden) is set by whether the
parameter has named datasets, an independent verifier, and a publication clock.
The risk priority number is consequence x probability x detectability, shown on
each record but not used for the primary band.

## Effects grouped by criticality

The tab groups the same failures by risk tier (Critical, Serious, Moderate,
Minor) and, within each tier, by effect class. Reading down the tiers shows where
detection, staffing, and reserve attention belongs first. The headline callouts
name the most probable (probability 5), the most consequential (consequence 5),
and the critical few that score 5 on both.

## Where the analysis needs a new parameter

A failure you cannot score is itself a finding: the catalog is missing a control.

- **Cost parameters have no likelihood control.** Occurrence for all 310 CP
  calibration failures had to be borrowed from the confidence grade of the
  modeled quantity each family calibrates (see `src/lib/params.ts`), mapped low
  to 4, medium to 3, high to 2. The tab proposes one native calibration-
  confidence parameter per CP family (20 in all) so occurrence is controlled
  rather than borrowed.
- **Deferred numeric targets.** Seven outcome parameters were deliberately left
  as a number to be calibrated later, so their probability cannot be scored
  against a real value. The missing parameter is the calibrated target itself,
  adopted by the scorekeeping board. Consequence is still assessed; probability
  is shown as unscored.

No number is invented for a deferred target; it is reported as a gap instead.

## Current distribution

Phase-target chart (727 KPP/TPP failures): 199 extreme (critical), 302 high
(serious), 148 moderate, 78 low (minor). The critical few that score 5 on both
axes are coverage-continuity targets (residual uninsured and continuous coverage)
where a likely miss meets a catastrophic effect. The chart's probability-1 column
and consequence-1 row are near-empty by construction: the catalog controls only
targets that matter and only on trajectories that can be missed.

Cost-parameter chart (310 CP calibration failures): 30 extreme, 50 high, 230
moderate, 0 low. Most miscalibrations are moderate single-ledger-line risks; the
extreme ones are low-confidence, high-consequence families (units, long-term
care, information technology, transition).

## Self-tests

`fmeaSelfTests()` runs at import and in `tests/lib/fmea.test.ts`: record count
equals phase-target-plus-CP rows, scores in range, every assessed band matches
the grid, the matrix total equals the assessed count, the both-critical set
equals the top-right cell, and every record carries an effect narrative. No
effect or failure-mode string uses an em dash.

## Planned next steps

The tab is named Risk to grow past the analysis itself:

- Associate each failure mode, or each cluster, with a named risk and a handling
  strategy (accept, mitigate, transfer, or a specific continuity control),
  linking back to the Executive Hardening layers where one exists.
- Add the proposed per-family calibration-confidence parameters so CP occurrence
  is controlled rather than borrowed, and the calibrated numbers for the seven
  deferred outcome targets so their probability can be scored.
- Effect narratives are templated per effect class; per-family wording would read
  more specifically.
