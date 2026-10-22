# Quality tab: equation-derived phase targets

Compiled 2026-08-02. Last revised 2026-10-21.

Methodology for the equation engine (`src/lib/equations.ts`) that computes a
phase-by-phase target for every key performance parameter (KPP) and
technical performance parameter (TPP) in the quality catalog,
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

Four reusable forms cover most operating metrics; the rest are direct
model reads or explicit mechanism equations.

- **Share form** (adoption and count metrics): `v = M x S(t)`, where `M` is
  the controlled maturity target and `S(t)` the metric's build state in
  [0, 1] (a single ramp or a composite). Example: certified units
  `= 15,000 x unit(t)/0.95`. Confidence: high (arithmetic on sourced ramps).
- **Ceiling form** (maximize-percentage metrics):
  `v = 100 - (100 - M) x F(t)` with `F(t) = 1 + 8 x (1 - S(t))`.
  The mature shortfall allowance is inflated while the subsystem is
  immature. Confidence: medium.
- **Baseline-start form** (maximize-percentage metrics with a measured
  level today well below where the ceiling form would start them; owner,
  2026-10-19): `v = B + (M - B) x S(t)`, where `B` is today's level, a graded
  input (`TODAY_LEVELS` in `equations.ts`; see "The baseline-start form"
  below). It starts at today's level and reaches the target at full build;
  kappa does not reach it. Confidence: the grade of `B`.
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

Every form ends at the plan's target `M` at maturity; a form sets only the
path there. The targets are meant to sit beyond what today's system
delivers: the new system exists to reach levels the current one does not
support. Evidence that a metric stands far below its target today is
evidence about where its path starts, not a reason to lower `M`. However
little is built, the ceiling form keeps a metric within (100 - M) x kappa
points of its target: at zero build it reads 100 - (100 - M)(1 + kappa).
Where evidence puts today's level well below that, a form that starts
lower describes the path better: the share form, which rises from the build
itself, for disability accommodation compliance below, where no national
level is measured; and the baseline-start form for the five metrics below,
where one is. A change of form moves a metric's interim targets, never its
maturity target.

### The baseline-start form (owner, 2026-10-19)

The owner approved the proposal of 2026-10-16: five ceiling-form metrics
whose current-system level, read at its source, sits well below where the
ceiling form starts them (at zero build the ceiling form reads
100 - (100 - M)(1 + kappa): 98.2% for a 99.8% target, 82% for 98%). Each `B`
is the central or conservative reading of its source:

| Metric | Target | `B` | Reading of the evidence | Grade |
| --- | --- | --- | --- | --- |
| TPP-1.1 Master person index match accuracy | >=99.8% | 80 | Within a facility, patient matching "as low as 80 percent"; 90% or more where data quality is high; between organizations as low as 50% (Pew Charitable Trusts, 2 October 2018, citing CHIME and Audacious Inquiry, an ONC contractor). The within-facility figure, since the master index is one system | medium (secondary to its sources) |
| TPP-6.3 Unit follow-up closure | >=99% | 65.6 | Laboratory results not followed up in 6.8% to 62% of cases across 19 studies (closure 38% to 93.2%); radiology 1.0% to 35.7% (Callen, Westbrook, Georgiou and Li, J Gen Intern Med 2012;27:1334-1348). The midpoint of the closure range, since the review states no pooled figure | medium (high for the range; the midpoint is this dashboard's) |
| KPP-E5 Language-access compliance | >=98% | 17 | Professional interpreter use with physicians, 17% at admission and 14% since admission, with nurses 4%, among 234 hospitalized patients with limited English (Schenker, Pérez-Stable, Nickleach and Karliner, J Gen Intern Med 2011;26:712-717). The higher physician figure | medium (two hospitals, self-report) |
| TPP-10.1 Provider/facility registry completeness | >=99.5% | 51.3 | 48.74% of 10,504 Medicare Advantage directory locations had at least one inaccuracy (CMS, Online Provider Directory Review Report, round 3, November 2018); rounds 1 to 3: 45.10%, 55.07%, 48.74%. 100 less round 3 | medium-high (high for MA directories, a proxy for a national registry) |
| TPP-10.4 Discharge summary availability | >=98% | 23 | A discharge summary was available at the first post-discharge visit in 12% to 34% of cases, 51% to 77% at four weeks (Kripalani et al., JAMA 2007;297:831-841). The midpoint at the first visit | medium (dated) |

What it moved (base case, every equation evaluated at every phase before
and after): the five's interim targets fall (TPP-1.1 at P1 from 98.4% to 82.0%,
TPP-6.3 at P5 from 96.3% to 87.8%, KPP-E5 at P5 from 94.2% to 78.9%,
TPP-10.1 at P1 from 95.9% to 56.1%, TPP-10.4 at P4 from 90.1% to 61.2%), and
13 metrics that read them through their attainment move with them, most
by less than a point; the largest are KPP-D2 (P1 1.4 to 0.3), KPP-T1 (about
3 points lower through P3) and the error-form metrics that read matching or
follow-up (TPP-1.3, TPP-2.3, TPP-6.5, KPP-B9, a point or two higher early).
No maturity value moved. Kappa no longer reaches the five, so the
sensitivity table below covers fewer metrics.

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

| kappa | Metrics moved (of all KPP and TPP) | Median shift | 90th pct shift | Widest single interim target |
| --- | --- | --- | --- | --- |
| 4 | 97 | 1.5% | 36.3% | `TPP-8.1@P3`, <=43.2% to <=22.4% |
| **8** (fitted) | 0 | 0.0% | 0.0% | `TPP-1.1@P1`, >=82.0% to >=82.0% |
| 16 | 97 | 2.9% | 75.1% | `TPP-8.1@P3`, <=43.2% to <=84.8% |

Read the last column first: the training-slot vacancy ceiling at P3 is
`<=43.2%` as published, `<=22.4%` if the multiplier is 4 and `<=84.8%` if it
is 16. That is the honest width of an interim target whose calibration rests
on a single point about a different subsystem. Most metrics move somewhere
in their interior (the table's second column); the median cell moves a few percent, and the
top decile moves by a third to three quarters.

The rows above are rendered from the model by `kappa-check.ts` and checked
against this file at build time, so the published band cannot drift from the
constant it describes.

## Constants that are not cost-model parameters

| Constant | Used in | Source | Confidence |
| --- | --- | --- | --- |
| `kappa = 8` immaturity stress multiplier | the ceiling and error forms, so the interior of most KPP and TPP trajectories | `GATES[G5]`, AI safety readiness: high-stakes human review and audit capture >=97% at P5 against 99% at maturity, infrastructure 75% built. One observation; see the sensitivity band above | low |
| 8.0% baseline uninsured share | KPP-A1 | Census CPS ASEC all-ages uninsured rate, 2024 (`CENSUS_UNINSURED_2024`). **Not** derived as 26.7M / 334M (the 2023 release's population): that division landed on 8.0% but pairs KFF's under-65 count with an all-ages population, and the two measures are not comparable (`BL-0015` and `BL-0016`) | medium-high |
| Baseline health share of GDP | KPP-C1 | Computed from the cost model's 2023 calibration (`BASE2023`): CMS NHE 2023 over BEA GDP 2023, about 17.7% (CMS's 2024 release) | high |
| Baseline per-person cost (2024$, 2023 scale) | KPP-C2 | Computed from `BASE2023`: CMS NHE 2023 over the 2023 population, deflated to 2024 dollars at the model's 2.6%; about $14,960 (CMS's 2024 release) | high |
| Baseline administration share | KPP-C3 | Computed from `BASE2023` by the same function the cost model's administration baseline uses: net insurance cost plus government administration over total, about 7.5% (CMS's 2024 release) | high |
| Price-parity drug reduction, about 64% | TPP-3.3 | Computed as 1 - 1/ratio from RAND's U.S.-to-peer price ratio (2.78x, 2022 prices), one constant in `params.ts` that the headline statistic and the drug-price parameter's note also read | medium |
| 38% cost-driven care deferral | KPP-D3 rationale | Gallup/West Health 2024 | medium |
| Covered-care share of medical bankruptcies, about 0.91 | KPP-A7 | planning ratio, computed from the catalog: KPP-A7's 90% target over the 99% protected share left by KPP-A4's 1% ceiling; excludes illness work-loss bankruptcies per the AJPH association literature | low |
| Baseline role-vacancy level | KPP-W2 demand base | TPP-W1's ceiling, read from its record and used as the baseline vacancy level | low |
| 80/20 domestic/immigration pipeline weights | KPP-W2 | planning weights for the training pipeline vs the merit health-talent channel | low |
| 0.4/0.3/0.3 trust weights | KPP-TRUST1 | planning weights across coverage security, access, billing protection | low |
| Annual training slots | TPP-8.3 | TPP-8.3's own target, read from its record; the Workforce tab's constant is held to that record and to the plan's training-slot requirement by a test | high |
| A cost-model input's central value as a ratio's denominator | the drug, care-model, extraction, expansion, IT, R&D, workforce-funding, employer-capture, provider-administration and governance terms | read from the parameter's definition and labelled as its central value; these were typed and labelled "planned", which for several was not the plan's figure (the drug-price cut's central 40% against the plan's 55%) | that parameter's |
| Mature shares of the coverage, unit and hospital ramps | the normalized ramps | read from each ramp's own mature value | that ramp's |
| Each equation's own controlled target: 15,000 units, 200 product families and every other `M` | the share, ceiling, error and queue forms | read from the equation's own catalog record when the equation is defined, so a target reworded to another number moves its equation; none is typed | high |

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
  computes 3.4% of program cost after wealth financing, household relief, and
  wage pass-through, inside the cap, and 10 of the 20 scenarios breach it, the
  worst at 14.8% (SCN-PESS). The evidence pass (2026-10-15) moved the
  base case inside the cap: the healthcare model had taken the Saez and
  Zucman letter's wealth-tax estimate as gross and applied collection
  efficiency to it, while the letter's figures are already net of its own
  15% avoidance assumption, so avoidance was taken twice and wealth financing
  read low. Before that correction the base case computed 5.6%, with 17 of
  the 20 scenarios in breach; its review then read the letter's printed
  first-year total (351, where the rounded parts sum to 350), which moved the
  base case from 4.135% to 4.155%; and the owner's recalibration of BASE2023
  to CMS's latest release (2026-10-19) moved it to 3.42%, mostly through the
  sponsor shares the burden is netted against (employers 18.0% to 18.6% of
  NHE, households 27.0% to 27.7%). The wage
  pass-through correction before it moved the other way and stands: the
  pass-through was subtracted from the burden at its gross value while the 28%
  tax feedback on those same wages had already been credited against the
  revenue requirement, so households were relieved twice for the taxed share.
  It moved earlier too, when the healthcare model stopped growing the wealth
  base at GDP and adopted the sourced top-capital rate the tax model already
  used; before that the base case computed about 5.9%. The exemption stays:
  a gap is retired only when it has closed in every scenario, and half of
  them still breach.
- **TPP-W1** (role-region vacancy ceiling, target <= 8%): the error form
  closes only where its build state reaches 1, and this one averages
  infrastructure with the workforce sufficiency index, whose own controlled
  target is 98% rather than 100%. The plan's sufficiency ambition leaves the
  vacancy ceiling about a third of a point short.

These are surfaced rather than reconciled away. The maturity-closure check
exempts exactly these four and no others, and the exemptions are declared in
`DOCUMENTED_GAPS` with the reason attached to each.

## Disability accommodation compliance (KPP-E6)

The plan requires the system to keep disability accommodation compliance at
or above 98% by Phase 8, and its catalog carried no metric that measures it:
the language-access requirement beside it has one (KPP-E5). The plan's trace
matrix links this one to the coverage-gap and rights-comprehension metrics
(KPP-E1, TPP-USE1) only "through stakeholder-need link", the needs the three
share, and neither measures accommodation or states 98% (corrected on
2026-10-14; the first version said the catalog had no link at all).
The owner ruled on 2026-10-12 that a metric be established, researched and
evaluated. This section is that work. The metric is KPP-E6, a plan-defined
record in the catalog beside language access (KPP-E5), listed in
`post_framework_additions.md`; its definition is the dashboard's and its
target is the plan's own.

### What it measures

Compliance is the lowest of three rates, each of which the system can count:

1. **Equipment and site access.** Care sites that meet the federal standard
   for accessible medical diagnostic equipment, over sites audited.
2. **Request fulfilment.** Accommodation requests recorded in the shared
   record (auxiliary aids and services such as a sign-language interpreter
   or an accessible format, and reasonable modifications such as transfer
   assistance or a longer visit) delivered by the visit, over requests made.
3. **Patient report.** Patients with a recorded disability who report
   receiving the accommodation they needed, over those surveyed.

The lowest, not the average, because the three fail independently and an
average lets one strong rate hide a failing one: a clinic with an accessible
table that cannot book an interpreter has not accommodated a deaf patient.

### The legal floor

HHS's Section 504 rule (89 FR 40066, May 9, 2024, effective July 8, 2024)
adopted the Access Board's standards for medical diagnostic equipment. Under
45 CFR 84.92, a recipient that uses examination tables or weight scales must
have at least one accessible unit of each within two years of July 8, 2024,
and at least 10% of each type of equipment in use (20% in rehabilitation and
mobility-focused programs) must meet the standard. Section 1557 of the
Affordable Care Act and the ADA carry the effective-communication duty that
the second rate measures. Graded high: primary regulatory text.

### What is known today

No national compliance rate exists, so the composite has no baseline. Each
component has partial evidence:

| Component | Evidence | Confidence |
| --- | --- | --- |
| Equipment | California Medicaid managed-care site reviews found height-adjustable exam tables in 8.4% and accessible weight scales in 3.6% of primary care offices in 2006-2009 (Mudrick, Breslin, Liang and Yee, *Disability and Health Journal* 5(3):159-167, 2012, doi:10.1016/j.dhjo.2012.02.002), and 19.1% and 10.9% across 3,993 offices in 2013-2016 (Mudrick, Swager and Breslin, *Health Equity* 3(1):275-279, 2019, doi:10.1089/heq.2019.0006). Of 1,293 practices audited in both periods, tables rose from 8.1% to 12.9% and scales from 3.0% to 7.9%, and 62.9% of the practices with a table and 66.7% with a scale at the first audit no longer had one at the second (Mudrick, Blackwell, Breslin and Wang, *Health Equity* 8(1):157-163, 2024, doi:10.1089/heq.2023.0155). Nationally, 56 of 256 subspecialty practices (22%) in four cities could not see a wheelchair user, 47 of them because they could not transfer the patient to an exam table, and 22 (9%) reported a height-adjustable table or lift (Lagu et al., *Annals of Internal Medicine* 158:441-446, 2013). All of it predates the 2026 equipment deadline. | medium-high: consistent, but regional or small, and dated |
| Request fulfilment | 35.8% of 714 outpatient physicians said they knew little or nothing about their ADA responsibilities, and 71.2% answered incorrectly about who determines a reasonable accommodation (Iezzoni et al., *Health Affairs* 41:96-104, 2022, doi:10.1377/hlthaff.2021.01136). In 2019, 41% of publicly funded mental health facilities and 59% of publicly funded substance use treatment facilities offered no services in sign language (James et al., *Health Affairs* 41:1413-1422, 2022, doi:10.1377/hlthaff.2022.00408). These measure knowledge and availability, not fulfilment of a request. | medium: proxies |
| Patient report | No national figure was found that could be read at its source and confirmed. Searched again on 2026-10-19: Europe PMC's index, 2018 to 2026, for studies of disability accommodation in health care reporting unmet or received accommodation needs (82 results); none reports a national patient-reported rate of receiving a needed accommodation. | none |
| Who it covers | 28.7% of U.S. adults report a functional disability (CDC, BRFSS 2022). | high |

### Evaluation

The best-measured component, the only one with a legal floor, stood under
20% of audited offices in the latest large audit, and the 2024 panel shows
equipment that offices acquire is often gone by the next audit. Reaching 98%
at maturity therefore needs three builds, not one: every site the plan
funds or builds equipped and re-audited, so equipment is not lost between
audits; every accommodation need and request carried in the shared record,
so fulfilment can be counted at all; and interpreter and accessible-format
services at the scale language access requires. The 98% is the plan's
target, graded as the plan's; whether it is reachable is not established by
any evidence above, and the dashboard does not claim it is.

### The equation

`KPP-E6 = target x min(avg(units, hospitals), infrastructure, language access)`,
with the target read from the record. It is the share form, not the
ceiling form most metrics use: however little is built, the ceiling form
keeps a metric within (100 - M) x kappa points of its target (at zero build
it reads 82% for this 98% target, 16 points below it), which
suits a rate already near its target and not one whose best-measured part
stood under 20% of audited offices. In the share form the target rises
from the build itself, and like every equity metric it is published from
P5. The minimum mirrors the definition:
the metric moves with the slowest of its three builds. The equipment rate
follows the unit network, whose new units open built to the standard, and
hospital global budgets, which fund replacement in existing hospitals; the
request rate follows the records build that carries requests; and the
patient-reported rate follows language access (KPP-E5), whose interpreter
and notice services are the same ones a deaf or blind patient needs. Which
builds drive which rate is a planning judgment. Graded low.

Measured on 2026-10-14: in every scenario in the
catalog, at every phase the metric is published, the equipment term is the
lowest. Before maturity it is the only lowest term; at maturity it is
either still the lowest or all three terms meet at 1, where every build is
complete. So the request and communication terms never set the path on
their own. The infrastructure build reaches the metric twice, directly as
request fulfilment and inside language access; since the metric takes the
lowest term, that second path could matter only if language access fell
below the infrastructure build itself, and in no scenario does it. The
communication term starts near 1 because language access uses the ceiling
form. Both terms are kept because the definition is the lowest of three
rates and a scenario that slowed the records build or language access would
show through them, but no scenario in the catalog does, and the published
path is the equipment build's. `tests/lib/equations.test.ts` holds each of
these statements to the model.

## Self-tests

`equationSelfTests` (surfaced through `tests/lib/equations.test.ts`) checks:
every KPP/TPP has an equation; evaluation is acyclic and finite from each
metric's start phase (the Vitest suite repeats that sweep across every
scenario, the base case and each stress scenario); base-case maturity values meet or land within MATURITY_TOLERANCE
of the source target, with the four documented exemptions above; applied
rollout trajectories never regress; diagrams keep KPPs on the right edge
unless they feed other equations; and no generated string contains an em
dash.
