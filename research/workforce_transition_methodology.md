# Workforce transition and staffing methodology

## Purpose

This note documents the derived job counts used on the dashboard's Workforce
tab. The National Health Assurance Framework controls worker-transition and
workforce-performance targets, but it does not contain an audited national
count of:

- legacy administrative positions eliminated;
- displaced workers who can fill positions inside the new framework;
- gross positions created by the framework; or
- the rural travel/flex workforce.

The dashboard therefore distinguishes three kinds of numbers:

1. **Source targets** copied from the framework.
2. **Official employment anchors** from the U.S. Bureau of Labor Statistics
   (BLS).
3. **Derived planning cases** that expose assumptions and uncertainty rather
   than presenting a single count as a forecast.

The counts are positions, rounded to the nearest 5,000 or 10,000 for display.
They are not a forecast of unemployment, labor-force participation, or net
national employment.

## Framework controls

Framework v2.0.0 Sections 6.6 and 6.9 and Appendix M control the transition:

- KPP-W1: at least 75% of eligible displaced workers in meaningful placement
  or approved training.
- TPP-5.5: at least 97% hospital staffing-safety compliance.
- TPP-8.1: critical workforce vacancy at or below 5%.
- TPP-8.2: Specialist Bottleneck Index reduced at least 50%.
- TPP-8.3: at least 55,000 publicly funded training slots each year.
- TPP-8.4: at least 96% service-obligation fulfillment.
- TPP-8.5: scope-rule implementation in at least 98% of regions.
- TPP-8.6: clinician burnout-risk index reduced at least 30%.

HATC must be active before legacy wind-down. Placement is paid work or approved
training with a verified start, not a referral or application. Eligible workers
include insurance, PBM, billing, and revenue-cycle workers. Priority destination
functions include claims/payment, records, navigation, rights, analytics,
compliance, procurement, and care-support administration.

The framework leaves the national role-region FTE formula, compensation and
employment boundary, expanded-benefit operating standards, and phase resource
allocation open under OI-033, OI-034, OI-035, and OI-043.

## Clinician compensation architecture

The framework does not set a national salary schedule or claim that physicians,
nurses, or other clinicians must accept a pay cut. It controls the method that
must be used to establish compensation. Sections 6.6.1, 6.6.4, and 6.6.5 require
the National Physician Compensation Board to publish transparent bands and
authorized adjustments for:

- role, specialty, region, and care setting;
- scarcity and documented vacancy pressure;
- rural or other priority service;
- call, readiness, and protected specialist-backplane work;
- clinical complexity;
- leadership, supervision, and training duties; and
- required non-visit work, including e-consults and protocol work.

Total compensation and its source must be visible. Hidden productivity
incentives are prohibited, and pay cannot reward unsafe volume, denial,
under-referral, geographic abandonment, suppressed demand, uncompensated work,
or unsafe overtime. Compensation cost is modeled separately from hospital
operating budgets and claims so the same labor is not paid twice.

The operating logic is:

`published role-region-setting band + authorized scarcity/rural/readiness/complexity/duty adjustments`

The exact dollar bands and adjustment amounts remain open calibration work.
They must be set from audited labor-market pay, safe-FTE need, vacancy,
retention, workload, training debt, schedule burden, and regional cost evidence.
An access or savings result is invalid if it depends on compensation below the
adopted band, unfilled posts, uncompensated labor, or unsafe workload.

### Current compensation anchors, not proposed salaries

The following observed values show the order of magnitude that calibration has
to respect. They are national anchors, not a recommendation or a guarantee.
Local bands can differ by specialty, region, setting, scarcity, schedule, and
responsibility.

| Role | Observed annual compensation or wage | Vintage | Confidence |
|---|---:|---:|---|
| Primary care physicians | About $330,000 median | 2024 | Medium |
| Specialist physicians | About $417,000 average | 2025 | Medium |
| Registered nurses | $93,600 median | May 2024 | High |
| Nurse anesthetists, nurse midwives, and nurse practitioners | $132,050 median | May 2024 | High |
| Physician assistants | $133,260 median | May 2024 | High |
| Pharmacists | $137,480 median | May 2024 | High |
| Physical therapists | $101,020 median | May 2024 | High |
| Occupational therapists | $98,340 median | May 2024 | High |
| Respiratory therapists | $80,450 median | May 2024 | High |
| Paramedics | $58,410 median | May 2024 | High |

Sources:

- MGMA, [2025 Provider Compensation and Productivity Data
  Report](https://www.mgma.com/2025-provider-compensation), for the primary-care
  median. The underlying practice-management data cover more than 220,000
  physicians and advanced-practice providers.
- Medscape, [Physician Compensation Report
  2025](https://www.medscape.com/sites/public/physician-comp/2025), for the
  specialist average. It is a voluntary survey and is therefore a secondary
  calibration check rather than a pay schedule.
- U.S. Bureau of Labor Statistics Occupational Outlook Handbook: [registered
  nurses](https://www.bls.gov/ooh/healthcare/registered-nurses.htm), [advanced
  practice nurses](https://www.bls.gov/ooh/healthcare/nurse-anesthetists-nurse-midwives-and-nurse-practitioners.htm),
  [physician assistants](https://www.bls.gov/ooh/healthcare/physician-assistants.htm),
  [pharmacists](https://www.bls.gov/ooh/healthcare/pharmacists.htm), [physical
  therapists](https://www.bls.gov/ooh/healthcare/physical-therapists.htm),
  [occupational therapists](https://www.bls.gov/ooh/healthcare/occupational-therapists.htm),
  [respiratory therapists](https://www.bls.gov/ooh/healthcare/respiratory-therapists.htm),
  and [EMTs and paramedics](https://www.bls.gov/ooh/healthcare/emts-and-paramedics.htm).
- **Confidence:** High for the BLS medians. Medium for the physician point
  estimates because MGMA and Medscape use different samples and report median
  versus average compensation.

## Official employment anchors

The planning cases use these official BLS anchors:

| Anchor | Employment | Vintage | Use in the model |
|---|---:|---|---|
| Direct health and medical insurance carriers, NAICS 524114 | 611,100 | 2024 | Broad industry anchor for insurer functions |
| Insurance claims and policy-processing clerks, SOC 43-9041 | 229,070 | May 2024 | Cross-check only; overlaps the carrier industry |
| Billing and posting clerks, SOC 43-3021 | 417,500 | May 2024 | Broad occupation anchor; only a health-function share is exposed |
| Medical records specialists, SOC 29-2072 | 194,570 | May 2024 | Continuing/redeployable work; not counted as eliminated |
| Insurance agencies and brokerages, NAICS 524210 | 1,003,900 | 2024 | Broad industry anchor; only a small health-benefit share is exposed |
| Other insurance-related activities, NAICS 524290 | 382,600 | 2024 | Broad anchor for TPA/PBM-adjacent work; not a PBM count |

Sources:

- BLS, [Employment and output by industry, 2024-2034](https://www.bls.gov/emp/tables/industry-employment-and-output.htm).
- BLS, [Occupational Employment and Wages, May 2024](https://www.bls.gov/news.release/archives/ocwage_04022025.htm).
- BLS, [Medical Records Specialists](https://www.bls.gov/ooh/healthcare/medical-records-and-health-information-technicians.htm).

The occupation and industry counts overlap. For example, an insurance claims
clerk may already be included in direct-health-insurer employment. The model
does not add the anchors together.

## Legacy positions eliminated

### Planning case

The planning case is a functional exposure model:

| Legacy function | Planning estimate | Derivation |
|---|---:|---|
| Private insurer claims, enrollment, network, and utilization administration | 305,000 | 50% functional exposure applied to the 611,100 direct-health-insurer anchor |
| Provider billing, routine prior authorization, denial, and revenue-cycle work | 235,000 | 56% health/payment-friction exposure applied to 417,500 billing/posting clerks, rounded |
| PBM rebate, formulary, spread-pricing, and purchasing middlemen | 90,000 | 24% scenario slice of the 382,600 other-insurance-related anchor; no official PBM occupation count exists |
| Health-benefit brokerage and employer plan administration | 70,000 | 7% health-benefit exposure applied to the 1,003,900 insurance-brokerage anchor |
| Duplicative clearinghouse, contractor, and vendor-management work | 60,000 | Residual allowance for payer-specific transaction and contract duplication; low confidence |
| **Planning total** | **760,000** | Rounded and overlap-controlled |

The lower-exposure case is 560,000 positions. The stress case is 1,000,000.
They change functional exposure shares rather than changing the BLS anchors.

These are positions whose current function is removed or materially contracted,
not a claim that every incumbent becomes unemployed on the same day. Transition
waves, ordinary attrition, retirement, employer conversion, external placement,
and retraining all change the number of people requiring an immediate job.

## Workers who could fill positions inside the framework

The planning case maps 360,000 displaced workers to framework roles:

| Destination | Planning matches |
|---|---:|
| Diagnostic-treatment unit navigation and operations | 30,000 |
| Public enrollment, payment, provider reconciliation, appeals, navigation, and transition operations | 180,000 |
| Data quality, records, cybersecurity, analytics, and conformance | 70,000 |
| Medicines, diagnostics, procurement, inventory, and supply operations | 40,000 |
| Regional workforce, assurance, safety, equity, and public reporting | 40,000 |
| **Internal role matches** | **360,000** |

This is a skills-to-role capacity estimate, not a guaranteed placement count.
Licensing, location, pay, training completion, worker choice, collective
bargaining, disability, caregiving, and hardship rules still matter.

Applying KPP-W1 to the 760,000 planning exposure produces a placement-or-training
floor of 570,000:

```
760,000 x 75% = 570,000
```

Because the planning case contains 360,000 plausible internal role matches,
another 210,000 workers need external paid placement or approved training to
reach the KPP-W1 floor. The remaining 190,000 represent retirement, ordinary
attrition, other work, or a transition-support gap that must remain visible.

## Quantified gross new-position floor

The dashboard reports a planning floor of 510,000 gross positions:

| Framework function | Planning positions | Main derivation |
|---|---:|---|
| Diagnostic-treatment unit teams | 138,000 | 15,000 controlled units x 9.2 FTE per unit, rounded |
| Public enrollment, payment, rights, and transition operations | 180,000 | Retained national public-rail workload after payer duplication is removed |
| Data, cyber, records, analytics, and conformance | 70,000 | Durable staffing allowance for the national data and assurance architecture |
| Medicines, diagnostics, procurement, and supply operations | 40,000 | Public production, purchasing, pharmacy utility, quality, inventory, and shortage functions |
| Rural flex and rotating travel workforce | 30,000 | Explicit relief-pool placeholder described below |
| Education, faculty, and training support | 11,000 | 55,000 annual slots / about five learners per faculty, preceptor, placement, or program-support FTE |
| Regional operations, assurance, and public-health support | 41,000 | Workforce boards, scope/compensation administration, verification, safety/equity, and regional operations |
| **Quantified planning floor** | **510,000** | Rounded total |

### Unit-team derivation

The dashboard's existing county unit model produces 24,099 need-based units and
222,323 mix-weighted FTE at 1.5 network visits per person per year:

- Type A: 7,470 units x 2.5 FTE;
- Type B: 9,055 units x 10 FTE;
- Type C: 6,397 units x 14 FTE; and
- Type D: 1,177 units x 20 FTE.

That mix averages 9.225 FTE per unit. Applying it to the framework's controlled
15,000-unit target gives:

```
15,000 x 9.225 = 138,375 FTE
```

The dashboard rounds this to 138,000. It is a gross staffing requirement, not a
net-new-worker count: existing urgent-care, clinic, pharmacy, public-health, and
hospital staff may move into converted units.

### New entrants

In the planning case, 360,000 of the 510,000 positions are considered fillable
by displaced administrative workers. The remaining 150,000 positions require
licensed clinicians, technicians, faculty, new graduates, or other entrants.
This is why administrative transition and clinical pipeline expansion must be
planned together.

## Rural flex and travel workforce

The 30,000-position planning pool is a provisional national reserve, not a
framework target. Its provisional mix is:

- 18,000 rotating RN/LPN positions; and
- 12,000 EMS, respiratory, imaging/lab, pharmacy, behavioral-health, and
  supervisory relief positions.

The role-region control should ultimately size each pool as:

```
max(
  vacancy gap
  + protected leave
  + training backfill
  + seasonal surge,
  essential-service continuity floor
)
```

The current 30,000 placeholder is approximately one-third of the county unit
model's 89,558 Type C FTE. That order of magnitude permits an eight-week
deployment/two-week protected reset pattern, vacancy coverage, leave, and
training backfill across rural units while also supporting rural hospitals,
EMS, and other regional services. The lower and stress cases test 20,000 and
45,000 positions.

A five-team regional pod is shown because an eight-week deployment plus a
two-week reset creates a 20% reset share. Staggering five teams leaves four
deployed and one in reset/training/handoff at any point in the cycle.

This pool must not replace permanent local positions. RS-CORPS first funds a
local core, housing, family/spousal support, supervision, transport, schedule
control, and local training pipelines. Flex staff cover temporary gaps and
make safe leave and training possible.

## AI and telehealth counting rules

AI and telehealth are capacity interventions, not headcount:

- AI can reduce documentation, referral, scheduling, inventory, and
  results-closure work, but it does not create licensed FTE.
- Telehealth and e-consults can allocate cross-region specialist time, but the
  same specialist hour cannot be counted in two regions.
- Local examination, testing, stabilization, procedures, and emergency
  response still require hands-on staff.
- The framework's TPP-6.6 productivity semantics remain open under OI-008.
  Both 1.25x and 2.25x sensitivity branches must remain visible; neither is a
  staffing-cut instruction.
- Productivity counts only after human accountability, safety, workload,
  equity, quality, downtime, and manual-fallback tests pass.

## Exclusions and limitations

The 510,000 total is a quantified floor, not the total workforce effect. It
does not add a national job quantity for expanded long-term care, behavioral
health, dental, vision, hearing, EMS, or public health because the framework
leaves those operating standards and the role-region FTE formula open. Existing
research identifies large shortages but does not yet support a single
non-overlapping national job count.

The model also does not estimate:

- the timing of layoffs versus ordinary attrition;
- regional occupational mismatch;
- wage effects;
- collective-bargaining outcomes;
- construction jobs, which are temporary and phase-dependent;
- indirect jobs created by supplier demand;
- jobs lost through lower provider administrative spending outside the five
  modeled categories;
- clinical workers who transfer from existing facilities into framework
  positions; or
- general-equilibrium labor-market effects.

Until OI-033, OI-034, OI-035, and OI-043 are closed with audited denominators,
the dashboard should not subtract eliminated positions from the quantified
floor and label the difference a national net-jobs forecast.
