# Quality tab: equation-derived phase targets

Methodology for the equation engine (`src/lib/equations.ts`) that computes a
phase-by-phase target for every key performance parameter (KPP, 45 records)
and technical performance parameter (TPP, 85 records) in the quality catalog,
replacing the earlier rule-derived interpolations. Confidence grades follow
the repository convention (high / medium / low).

## What changed and why

The catalog's source targets are maturity targets. Interim phase values were
previously derived by shape rules (entry floors plus linear interpolation),
which made them arbitrary: defensible in slope, empty in mechanism. Each
KPP/TPP now carries a structured equation that computes the level the system
can credibly demand at each phase from actual inputs:

1. **Cost-model parameters** (`src/lib/params.ts`), every one sourced and
   confidence-graded, varied by the 19 stress scenarios
   (`src/lib/scenarios.ts`). A scenario that moves total system cost also
   moves every derived target.
2. **Rollout build ramps** (`RAMPS` in `params.ts`): coverage, cost-sharing
   elimination, unit network, pharmacy/drug program, hospital global budgets,
   expanded benefits, and infrastructure. Scenario structural knobs (delay
   years, unit ramp multiplier) shift these before targets are computed.
3. **The fiscal engine itself** (`runPath` in `src/lib/model.ts`) for the
   cost and financing KPPs (C family): cost ratios, revenue components,
   household relief, wage pass-through.
4. **Other KPP/TPP equations.** Outcome metrics consume operational metrics
   (for example, medical-bankruptcy reduction consumes debt-formation
   elimination; the chronic-control composite consumes adherence and
   prevention). The Quality tab draws these dependencies as traversable
   flow diagrams.

Phase values are read at the end of each phase's anchor year
(P0 = year 1 ... P8 = year 12), where every ramp reaches its mature level, so
most base-case maturity values close on their source target exactly. The
exceptions are measured and bounded rather than assumed away: see "Maturity
closure and its tolerance" below.

## Functional forms

Three reusable forms cover most operating metrics; the rest are direct
model reads or explicit mechanism equations.

- **Share form** (adoption and count metrics): `v = M x S(t)`, where `M` is
  the controlled maturity target and `S(t)` the metric's build state in
  [0, 1] (a single ramp or a composite). Example: certified units
  `= 15,000 x unit(t)/0.95`. Confidence: high (arithmetic on sourced ramps).
- **Ceiling form** (maximize-percentage metrics):
  `v = 100 - (100 - M) x F(t)` with `F(t) = 1 + 8 x (1 - S(t))`.
  The mature shortfall allowance is inflated while the subsystem is
  immature. Confidence: medium.
- **Error form** (minimize metrics: error rates, waits expressed as
  ceilings): `v = M x F(t)`, same `F`. Confidence: medium.
- **Queue form** (latency metrics): `v = M x L(t) / L(base maturity)`,
  where load `L = D(t) / (WSI(t) x C(t))`, `D` is the cost model's demand
  index (induced utilization), `WSI` the workforce sufficiency index
  (KPP-W2 / 100), and `C` the relevant capacity build. Normalizing by the
  base-case mature load means the base case lands on the controlled standard
  to within the maturity tolerance, while stress scenarios land above or
  below it. Confidence:
  medium (the load ratio is a first-order queueing proxy, not a queueing
  model).
- **Need-inflation divisors**: where a scenario inflates a need-driven cost
  parameter (EMS/public health, LTC, behavioral health, IT operating), the
  excess enters as `NI = max(1, actual / planned)` dividing the build state:
  the same build buys less capability when need runs hotter. Confidence:
  medium.

### Calibration of the stress multiplier (kappa = 8)

The plan states exactly one controlled interior error floor with both a
mature value and an interior value on the same metric: AI override/audit
capture must reach 97% at P5 against 99% at maturity, with the driving
infrastructure 75% built at P5. Three times the mature shortfall at 25%
remaining build implies `F = 1 + kappa x 0.25 = 3`, so `kappa = 8`.

The source is `GATES[G5]`, *AI safety readiness*: "High-stakes human review
and audit capture >=97%". That is a controlled gate floor, not an invented
anchor, and `kappa-check.ts` re-derives the constant from the gate's own
floor text at build time, so a change to the gate invalidates the
calibration instead of leaving it stale.

**The exposure, stated plainly.** One scalar, fitted to one observation on
one metric, sets the interior shape of the ceiling and error forms, and
those two forms cover most of the catalog. A one-parameter model through one
point fits that point exactly by construction, so nothing in the calibration
distinguishes 8 from 5 or 12 on any metric other than the one it was fitted
to. There is no argument that ambulance response times share a curvature
with AI oversight capture. Confidence: low (one calibration point, applied
uniformly, with no second observation to test it against).

#### Sensitivity band

The whole catalog recomputed at half and double the fitted value. Maturity
values are unchanged by construction at every setting, which is why the
constant was invisible to the one self-test that looked at it, so the table
covers interior phases only, from each metric's own start phase to P7.

| kappa | Metrics moved (of 130) | Median shift | 90th pct shift | Widest single interim target |
| --- | --- | --- | --- | --- |
| 4 | 102 | 1.5% | 35.7% | `TPP-8.1@P3`, <=43.2% to <=22.4% |
| **8** (fitted) | 0 | 0.0% | 0.0% | `TPP-1.1@P1`, >=98.4% to >=98.4% |
| 16 | 102 | 3.1% | 76.2% | `TPP-8.1@P3`, <=43.2% to <=84.8% |

Read the last column first: the training-slot vacancy ceiling at P3 is
`<=43.2%` as published, `<=22.4%` if the multiplier is 4 and `<=84.8%` if it
is 16. That is the honest width of an interim target whose calibration rests
on a single point about a different subsystem. 102 of the 130 metrics move
somewhere in their interior; the median cell moves a few percent, and the
top decile moves by a third to three quarters.

The rows above are rendered from the model by `kappa-check.ts` and checked
against this file at build time, so the published band cannot drift from the
constant it describes.

## Constants that are not cost-model parameters

| Constant | Used in | Source | Confidence |
| --- | --- | --- | --- |
| `kappa = 8` immaturity stress multiplier | the ceiling and error forms, so the interior of most of the 130 trajectories | `GATES[G5]`, AI safety readiness: high-stakes human review and audit capture >=97% at P5 against 99% at maturity, infrastructure 75% built. One observation; see the sensitivity band above | low |
| 8.0% baseline uninsured share | KPP-A1 | Census CPS ASEC all-ages uninsured rate, 2024. **Not** derived as 26.7M / 334M: that division lands on 8.0% but pairs KFF's under-65 count with an all-ages population, and the two measures are not comparable (`CP-POP-004a` and `CP-POP-004b`) | medium-high |
| 17.6% baseline health share of GDP | KPP-C1 | CMS NHE 2023 | high |
| $14,950 baseline per-person cost (2024$) | KPP-C2 | CMS NHE 2023 ($14,570 in 2023$), deflated at 2.6% | high |
| 7.4% baseline administration share | KPP-C3 | CMS NHE 2023: net insurance cost + government administration over total | high |
| 64% price-parity drug reduction | TPP-3.3 | RAND 2022: US prices 2.78x peer countries; parity implies 1 - 1/2.78 | medium |
| 38% cost-driven care deferral | KPP-D3 rationale | Gallup/West Health 2024 | medium |
| 0.909 covered-care share of medical bankruptcies | KPP-A7 | planning ratio (90/99): excludes illness work-loss bankruptcies per the AJPH association literature | low |
| 8% baseline role-vacancy ceiling | KPP-W2 demand base | the catalog's own TPP-W1 ceiling used as the baseline vacancy level | low |
| 80/20 domestic/immigration pipeline weights | KPP-W2 | planning weights for the training pipeline vs the merit health-talent channel | low |
| 0.4/0.3/0.3 trust weights | KPP-TRUST1 | planning weights across coverage security, access, billing protection | low |
| 55,000 annual training slots | TPP-8.3, KPP-W2 | plan design (shared with the workforce tab) | high |
| 15,000 units, 200 product families, and every other `M` | share/ceiling/error forms | controlled maturity targets from the catalog itself | high |

"Planning" constants are modeling judgments, labeled as such in the
equation legends, consistent with how the workforce tab labels its
planning-case figures.

## The seven "to be calibrated" outcome metrics

KPP-D1 through D7 deliberately deferred numeric targets. The equations now
give them calculated planning values with explicit scales (for example,
"% reduction in avoidable admissions" driven by the captured low-value-care
pool delivered through the unit network). The maturity rows keep the
source's "to be calibrated" status; the equation values are planning
estimates from sourced inputs, not invented point targets. Confidence: low
to medium, stated per equation in the UI.

## Anchor consistency

Committed floors, milestones, and the Data tab's information-mesh plan stay
authoritative. When applying base-case equation values into the catalog
(`applyEquationTargets`), each value is bounded so the displayed trajectory
never demands less than an earlier committed value and never demands more
than a later committed one; entries note when this bounding was applied.
Under a stress scenario the explorer shows the raw equation values instead,
which is the honest gap a gate review would confront.

## Maturity closure and its tolerance

Base-case maturity values are checked against the source target with a named
tolerance, `MATURITY_TOLERANCE`, currently 2%. Of the 118 metrics the check
covers, **106 close to within one part in a million**. The remainder are the
composite and queue forms, which normalize against base-case mature load
rather than solving to the target and so close to within a couple of percent;
the widest is KPP-B2 at 1.4%. The tolerance covers that residual with about
half a point of headroom and nothing else.

It was 12% until this was measured, against a header claiming values "close
exactly". At 12% a 99% target passed at 87.1% and a 30-minute target passed at
33.6 minutes. Two of the four documented gaps below sat inside that bound and
were therefore invisible: the loose tolerance was hiding exactly what the
exemption list exists to show.

## Documented gaps the model refuses to hide

- **KPP-C1** (health share of GDP, target <= 15.2%): the fiscal engine,
  holding scale constant, computes about 18% at maturity because the
  expanded benefits roughly offset the savings levers. The engine is not
  tuned to the source's ambition and reports the gap.
- **KPP-C7** (wealth collection efficiency, target >= 92%): the researched
  mature collection rate is 84%, so the equation approaches 84 and the gap is
  the distance between researched practice and the controlled ambition.
- **KPP-C8** (ordinary-taxpayer burden share, target <= 5%): the base case
  computes 4.6% of program cost after wealth financing, household relief, and
  wage pass-through. That is inside the cap, and it is the only place the
  metric is inside the cap: twelve of the twenty scenarios breach it, the
  worst at 15.6%. The gap stays declared for that reason. It moved when the
  healthcare model stopped growing the wealth base at GDP and adopted the
  sourced top-capital rate the tax model already used; before that the base
  case computed about 5.9%.
- **TPP-W1** (role-region vacancy ceiling, target <= 8%): the error form
  closes only where its build state reaches 1, and this one averages
  infrastructure with the workforce sufficiency index, whose own controlled
  target is 98% rather than 100%. The plan's sufficiency ambition leaves the
  vacancy ceiling about a third of a point short.

These are surfaced rather than reconciled away. The maturity-closure check
exempts exactly these four and no others, and the exemptions are declared in
`DOCUMENTED_GAPS` with the reason attached to each.

## Self-tests

`equationSelfTests` (surfaced through `tests/lib/equations.test.ts`) checks:
every KPP/TPP has an equation; evaluation is acyclic and finite from each
metric's start phase (the Vitest suite repeats that sweep across all 19
scenarios); base-case maturity values meet or land within MATURITY_TOLERANCE
of the source target, with the four documented exemptions above; applied
rollout trajectories never regress; diagrams keep KPPs on the right edge
unless they feed other equations; and no generated string contains an em
dash.
