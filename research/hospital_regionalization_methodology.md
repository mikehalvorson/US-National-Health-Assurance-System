# Hospital transformation and regional nonprofit administration

This file documents the evidence, operating design, and reproducible planning
model behind the dashboard's **Physical Care** chapter. It is a planning
artifact, not a legal boundary determination, a hospital closure list, or a
patient-level referral model.

## 1. Why hospital ownership and administration must change

Hospitals do not behave like ordinary consumer markets. Emergency demand is
involuntary, the product is technically difficult to evaluate in advance,
prices are often unknown when care begins, and local consolidation can leave a
patient without a practical alternative. That makes a residual-profit claim on
a hospital structurally dangerous: revenue can rise through higher prices,
profitable service selection, labor reduction, related-party payments,
sale-leasebacks, leverage, or closure even when community health capacity
declines.

The evidence does **not** justify treating every for-profit hospital as unsafe
or every nonprofit hospital as benevolent. It supports treating ownership and
financial incentives as risk factors that require uniform public-service
controls:

- HHS ASPE reported that, among 4,644 Medicare-enrolled hospitals in its 2023
  ownership data, 49.2% were nonprofit, 36.1% for-profit, and 14.7%
  government-owned; 56.1% operated in a chain.
  <https://aspe.hhs.gov/reports/hospital-ownership>
- A 2023 JAMA difference-in-differences study covering 662,095 hospitalizations
  at 51 private-equity-acquired hospitals found a 25.4% relative increase in
  hospital-acquired conditions after acquisition compared with 259 control
  hospitals. The result was observational, not a randomized causal estimate.
  <https://jamanetwork.com/journals/jama/fullarticle/2813379>
- The FTC, DOJ, and HHS jointly solicited evidence on how corporate transactions
  may affect health-care quality, worker safety, cost, consolidation, and
  access. <https://www.ftc.gov/news-events/news/press-releases/2024/03/federal-trade-commission-department-justice-department-health-human-services-launch-cross-government>
- A 2020 JAMA Internal Medicine study found private-equity hospital acquisition
  associated with higher net income, charges, and charge-to-cost ratios, with
  mixed quality results in the subset analyzed.
  <https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2769549>

The design response is therefore stronger than a tax-status conversion:
mission-locked public-service charters, no investor residual claim, asset locks,
related-party transaction limits, transparent accounts, enforceable service
duties, public closure review, and budgets contingent on access, staffing,
quality, safety, and continuity.

## 2. New hospital administrative structure

The framework's hospital design is summarized on pages 152-154 and 295 of
`National_Health_Assurance_Framework_v2.0.0_FINAL.pdf`.

1. The **National Hospital Stewardship Authority (NHSA)** defines the charter,
   accounting, budget, essential-service, capital, and reporting rules. The
   Public Service Hospital Charter Office investigates and enforces charter
   duties.
2. **Regional Health Administrators (RHA)** operate through 13 nonprofit
   hospital-administration regions. They plan capacity, certify budgets,
   maintain transfer and specialist capacity, coordinate emergency transport,
   and conduct evidence-based service-reduction or closure proceedings.
3. Each participating hospital becomes a mission-locked public-service
   nonprofit corporation. Its local board includes community and patient,
   clinical, workforce, public-health, tribal/local-government, and - where
   applicable - university representation, with public conflicts and protected
   clinical-safety escalation.

The certified annual global budget is the sum of:

- operations;
- emergency readiness;
- essential-service support;
- safe staffing;
- capital replacement;
- teaching and research;
- high-cost case pass-throughs;
- clinician compensation; and
- transition stabilization.

Audited surplus stays in care, workforce, capital, or reserves, or returns to
the regional pool. It cannot become a dividend, affiliate rent, excessive
management fee, or leveraged-buyout return. Savings are recognized only after
service, staffing, readiness, access, quality, and safety tests pass.

CMS describes hospital global budgets as predetermined annual revenue and
reports that Maryland's all-payer and Total Cost of Care models improved
predictability and coordination while generating Medicare savings. These
models are precedents for the payment mechanism, not complete precedents for
the stronger ownership and charter design proposed here.

- <https://www.cms.gov/priorities/innovation/key-concepts/total-cost-care-and-hospital-global-budgets>
- <https://www.cms.gov/priorities/innovation/innovation-models/md-tccm>

## 3. Regional planning model

### Input

`public/data/counties.json` contains 3,144 county equivalents, 2024 Census
population estimates totaling 340,110,988 people, 2020 rural population
shares, and Census internal-point coordinates. County values are aggregated to
states before partitioning. The file declares its own vintages in a `meta` block: population 2024,
rural share 2020, coordinates 2024. `docs/data/SOURCES.md` documents the
underlying Census files and the Connecticut reconciliation.

### Hard constraints

- All 50 states and the District of Columbia are assigned exactly once.
- State boundaries remain intact.
- Every region is contiguous through state borders, except the explicit
  Alaska-Washington and Hawaii-California administrative links.
- The regions are administrative operating areas, not barriers to referral,
  disaster mutual aid, federal systems, tribal sovereignty, or patient travel.

### Candidate method

The model scores one auditable candidate at each count from 10 through 16
regions. The 13-region candidate is expert-seeded from state contiguity,
population, and recognizable operating geography. Counts 10-12 merge adjacent
base regions; counts 14-16 split the largest multi-state regions into
contiguous components. A deterministic local search then evaluates boundary
states and accepts a move only when it lowers the composite objective and
preserves every constraint. This constrained search is intentionally
transparent; it is not represented as an exhaustive mathematical search over
all possible state partitions.

The composite objective is:

| Component | Weight | Purpose |
|---|---:|---|
| Population scale | 45% | Avoid regions too small to pool specialty capacity or too large to govern |
| Geographic compactness | 25% | Limit population-weighted distance between member-state centroids |
| Rural workload balance | 15% | Avoid concentrating all sparse-area obligations in a few regions |
| Administrative fragmentation | 15% | Penalize excessive operating layers, anchored at 13 |

The population term uses the larger of the national per-region target and the
largest member state. That prevents unavoidable large-state regions such as
California and Texas from being treated as if state integrity were optional.
Boundary moves also cannot leave a region below 12 million residents, put a
moved state more than 425 miles from the destination population-weighted
centroid, or raise the destination's population-weighted mean state-centroid
distance above 300 miles.

### Result

| Candidate regions | Composite score |
|---:|---:|
| 10 | 0.106596 |
| 11 | 0.080709 |
| 12 | 0.061422 |
| **13** | **0.059443** |
| 14 | 0.080504 |
| 15 | 0.088036 |
| 16 | 0.110954 |

Lower is better. The model scored 13 regions best, by 3.22% over the
runner-up.

### How much of that result is the scoring

Three facts stated above, put together. Every candidate is a version of the
13-region map: that map was drawn by hand, counts 10-12 merge its regions and
counts 14-16 split them. And the administrative fragmentation term, 15% of the
objective, is exactly `0.04 * (n - 13)^2` -- zero for the 13-region candidate
and a penalty for every other one. So 15% of the score is defined relative to
the candidate being scored best, and the U-shaped curve above is what this
procedure produces whether or not 13 is the right answer.

Moving one weight at a time and rescaling the other three:

| Component | Weight | 13 regions wins while the weight is | |
|---|---:|---|---|
| Population scale | 45% | 0% to 81% | robust |
| Geographic compactness | 25% | 0% to 92% | robust |
| Rural workload balance | 15% | 0% to 20% | flips to 12 at +5 points |
| Administrative fragmentation | 15% | 11% to 100% | flips to 12 at -5 points |

The two largest terms are not what decides this. The two 15% terms are, and
both sit within five points of a weighting that selects a different number of
regions. Drop the fragmentation term entirely and 10 regions scores best.

The honest statement of the result is therefore: **13 regions is a planning
judgement that this scoring supports, not the output of a search over possible
partitions.** The 3.22% margin cannot carry more than that. Independent
candidate generation at each count, and an objective with no term anchored to
a particular count, would be needed before the comparison could.

The dashboard renders this table from the model file rather than restating it,
so the two cannot disagree.

### What the selected map achieved

State integrity explains the regions above target. It does not explain the
ones below it:

| | Region | Population | Times target |
|---|---|---:|---:|
| Largest | R02 California and Hawaii | 40,877,409 | 1.56x |
| | R04 Texas and Louisiana | 35,888,571 | 1.37x |
| | R01 Northwest and Alaska | 16,697,154 | 0.64x |
| Smallest | R13 New England | 15,386,085 | 0.59x |

New England is further from the 26.2 million target than Texas and Louisiana
is, and it is six small states that could have been merged with R12. That is
an optimizer outcome, not a constraint outcome. Smallest to largest, the
spread is 2.66x.

Rural workload balance carries 15% of the objective specifically to avoid
concentrating sparse-area obligations, and the selected map still runs from
6.0% rural in R02 to 37.5% in R07, a 6.3x spread. Rural population is
geographically clustered and states cannot be split, so some concentration is
unavoidable under the hard constraints. The term reduces the spread; it does
not remove it.

| ID | Region | States/DC | Population | Rural share |
|---|---|---|---:|---:|
| R01 | Northwest and Alaska | AK, ID, MT, OR, WA, WY | 16,697,154 | 22.7% |
| R02 | California and Hawaii | CA, HI | 40,877,409 | 6.0% |
| R03 | Mountain Southwest | AZ, CO, NM, NV, UT | 22,441,213 | 12.1% |
| R04 | Texas and Louisiana | LA, TX | 35,888,571 | 18.1% |
| R05 | Central Plains | AR, IA, KS, MO, ND, NE, OK, SD | 23,368,009 | 34.0% |
| R06 | Upper Midwest | IL, MN, WI | 24,464,284 | 21.4% |
| R07 | Ohio Valley and Mid-South | AL, IN, KY, MS, TN | 26,841,141 | 37.5% |
| R08 | Great Lakes and Appalachia | MI, OH, WV | 23,793,742 | 27.3% |
| R09 | Florida | FL | 23,372,215 | 8.6% |
| R10 | South Atlantic | GA, NC, SC | 27,705,733 | 30.0% |
| R11 | Mid-Atlantic | DC, MD, PA, VA | 28,855,416 | 21.3% |
| R12 | Northeast Metro | DE, NJ, NY | 30,420,016 | 10.9% |
| R13 | New England | CT, MA, ME, NH, RI, VT | 15,386,085 | 20.1% |

The regions containing California and Texas exceed the 26.2 million
equal-population target because state integrity is a hard constraint. Each
should use multiple internal operating districts while retaining one regional
nonprofit administration.

### Reproduce

Run:

```text
python tools/model_hospital_regions.py
```

The script validates complete assignment and contiguity, recomputes every
score, and prints the model output used in
`public/data/hospital-regions.json`. That file now also carries the four
objective components behind each candidate score, the state adjacency the
contiguity constraint is enforced with, and the state name table, so a
consumer can re-weight the objective and re-colour the map without this
program.

### What the model does not do

The model is not a facility siting study. Before boundaries are enacted, the
RHA planning process still needs:

- road-network and emergency transport times;
- hospital, specialty, trauma, obstetric, psychiatric, dialysis, and intensive
  care inventories;
- referral flows and tertiary/quaternary catchments;
- workforce and medical-education pipelines;
- tribal consultation and federal/tribal compacts;
- border-community and cross-region transfer rules;
- disaster and surge mutual-aid modeling; and
- public hearings and an appeal process.

## 4. University and specialty hospitals

Academic medical centers remain university-affiliated institutions. The
university retains academic governance, accreditation, faculty appointments,
academic freedom, and the research enterprise. The clinical hospital accepts
the public-service charter, while its budget contains explicit and auditable
lines for graduate medical education, clinical teaching, research
infrastructure, quaternary care, and standby capacity.

Children's, cancer, transplant, burn, trauma, psychiatric, rehabilitation, and
other specialty hospitals can serve multi-region referral populations.
National capability designation, minimum-volume and outcome standards,
case-mix adjustment, high-cost pass-throughs, and regional capacity retainers
prevent rare care from being forced into every region or financed through
profitable-patient selection.

The Association of American Medical Colleges describes academic medicine as
the combination of medical education, clinical care, biomedical research, and
community collaboration, and reports 400+ member academic health systems and
teaching hospitals, including Veterans Affairs medical centers.

- <https://www.aamc.org/about-us>
- <https://www.aamc.org/about-us/institutional-membership>

## 5. Connection to the four-unit network

The regional administration links hospitals to Type A micro, Type B
neighborhood, Type C rural enhanced, and Type D urban public-health
diagnostic-treatment units through one capacity ledger, shared clinical
records, specialist e-consults, referral packets, and emergency medical
services. Units resolve routine care and complete workups; hospitals receive
emergency, surgical, intensive, inpatient, and complex specialty cases;
discharge returns each patient to a named local follow-up team.

The separate unit-count model in `docs/js/unitsapp.js` uses the same county
population and rurality data. Its output is a capacity plan and remains
distinct from this administrative-region model.
