# Parameter research index

Six core research passes, organized by cost and financing domain, gather
sourced real-world baseline values to calibrate the framework's `CP-*` cost parameter
dictionary (defined in `National_Health_Assurance_Framework_Source_Package.docx`).
Every number in these files carries a source name, publication/dataset,
year, and URL, plus a confidence/caveat note. Where no clean authoritative
figure exists, the file says so explicitly rather than guessing - treat
those as open research items, not silent gaps.

| File | Covers | Framework parameter groups |
|---|---|---|
| [01_macro_financing_population_offsets.md](01_macro_financing_population_offsets.md) | Total NHE, population/demographics, federal/state financing capacity, tax-revenue proposals, system-wide admin/offset savings | CP-TOT, CP-POP, CP-FIN, CP-OFF |
| [02_hospital_clinical_workforce_education.md](02_hospital_clinical_workforce_education.md) | Hospital spending/margins, physician/clinician compensation, four-unit network cost analogues (retail clinic/urgent care/FQHC), GME/training pipeline | CP-HOSP, CP-CLIN, CP-UNIT, CP-EDU |
| [03_drugs_pharmacy_diagnostics_devices.md](03_drugs_pharmacy_diagnostics_devices.md) | Drug spending, PBM economics, IRA negotiation savings, Civica Rx as a public-manufacturing analogue, labs/imaging/devices | CP-RX, CP-DX |
| [04_ltc_behavioral_dvh_ems_publichealth.md](04_ltc_behavioral_dvh_ems_publichealth.md) | Long-term care, behavioral health/SUD, dental/vision/hearing, EMS, public health/prevention | CP-LTC, CP-BH, CP-DVH, CP-EMS, CP-PH |
| [05_it_governance_rd_transition.md](05_it_governance_rd_transition.md) | Health IT/records/cyber infrastructure precedents, governance/oversight agency cost ratios, biomedical R&D funding, transition/migration program costs | CP-IT, CP-GOV, CP-RD, CP-TRN |
| [06_tax_distribution_financing.md](06_tax_distribution_financing.md) | Tax model baselines: CBO 2022 household income/tax distribution (from CBO's own workbook), FY2024–25 Treasury receipts, Fed DFA wealth distribution (2026:Q1), CBO Dec 2024 revenue-options scores, CBO/JCT/TPC incidence conventions, CES 2024 health spending by income quintile | tax model (docs/js/taxparams.js) |
| [data_phase_target_methodology.md](data_phase_target_methodology.md) | Exact and derived KPP/TPP targets used by the Data tab for P0 through P8, with denominator scope and a row-level justification for every derived value | data rollout scorecard (docs/js/dataphases.js) |
| [workforce_transition_methodology.md](workforce_transition_methodology.md) | Compensation architecture and current pay anchors; BLS overlap controls; job-displacement cases; role matching; the new-position floor; and rural flex-pool derivation | Workforce tab (docs/js/workforce.js) |
| [legislation_crosswalk.md](legislation_crosswalk.md) | Nineteen-title enabling-act architecture, thirteen major legal domains, federal/state/tribal transition rules, constitutional limits, illustrative amendment language, and the provision-level work still required | Legislation tab (docs/js/legislation.js) |
| [hospital_regionalization_methodology.md](hospital_regionalization_methodology.md) | Hospital ownership and private-equity evidence, public-service charter and global-budget design, the 10-16 region candidate model, 13-region result, and university/specialty-hospital treatment | Physical Care tab (docs/js/hospitalregions.js) |
| [medications_methodology.md](medications_methodology.md) | Current medicine spending, statutory negotiation constraints, FDA manufacturing pathway, the 200-family PMC qualification plan, exclusions, and a non-additive savings attribution | Medications tab (docs/js/medications.js) |

[parameter_baseline_seed.csv](parameter_baseline_seed.csv) pulls **85** of the
most load-bearing numbers from the core parameter files into one
machine-readable table - use it as the starting calibration set, then go to
the relevant detail file for anything it doesn't cover. It was 80 rows until
2026-08-27, when `§S10` migrated them onto `BL-0001`..`BL-0080` and added five:
the RAND commercial-to-Medicare price ratio in two rows, the HRSA FQHC analogue
in two, and the institutional-to-home long-term-care multiplier. Three research
files had each flagged their own most important parameter and the seed had
dropped all three; a build check now stops that happening a fourth time.

It is 85 rows, not the "~45" this line claimed until 2026-08-26; the 45 was the
count of rows carrying a high or medium-high grade with no source at all, which
is a different thing and is now zero.

### Reading the seed's columns

**`source_url` is the row's own citation, not its research file's.** Until
2026-08-26, 49 of 80 rows had none - not because no evidence existed, but
because the distillation from `research/01` through `research/06` dropped the
link. Forty-six were reconnected from those files and two re-sourced away from
secondary outlets; the three that remain empty are graded below `medium`
precisely because nothing citable was found.

## Three namespaces, and which one you are holding

Until 2026-08-27 there was one prefix and three registries behind it, so a
join by id bound a silently wrong value on 57 of the seed's 80 rows and 143 of
the research files' 160. Nothing errored. `§S10` separated them:

| Prefix | Holds | Lives in | Count |
|---|---|---|---|
| **`CP-*`** | **Definitions only** - a name, sometimes a definition, sometimes a unit. Never a value, a year or a citation. | `cp_registry_canonical.csv`, the sole authority | 310 |
| **`BL-*`** | **Measurements** - value, year, citation, grade | `parameter_baseline_seed.csv` | 85 |
| **`RB-0N-*`** | **Evidence** - one index per research file, `RB-04-BH-015` being research/04's fifteenth behavioural-health topic | `01_*.md` through `05_*.md` | 187 |

Three rules follow, and the build enforces all three:

1. **Nothing outside `cp_registry_canonical.csv` may define a `CP-*` id.** The
   two Source Package extracts are exempt because the registry is generated
   from them - and that exemption is checked, not asserted: the extract and the
   registry must agree on all 310 names.
2. **`BL-*` numbers are sequential and mean nothing.** `BL-0041` is the
   forty-first row. A measurement id that carried meaning could collide again.
3. **A join is explicit and throws on a miss.** `resolveDefinition(blId)` in
   `src/lib/baseline-registry.ts` returns the canonical record or raises. There
   is no default and no silent bind.

**Matching by id is still wrong, and now it is impossible rather than
discouraged.** Every row records where it came from in `superseded_id`, so a
pre-2026-08-27 reference can be traced, but the old id is retired: seed
`CP-GOV-002` is `BL-0074`, its evidence is `RB-05-GOV-007`, and canonical
`CP-GOV-002` means NHAC operating cost, which is none of those things.

### What a row measures, and what it merely informs

Three columns carry the relationship, and `measures` is non-empty **if and only
if** `measures_status` is `mapped`:

| `measures_status` | Means |
|---|---|
| `mapped` | The canonical parameter named in `measures` denotes the **same quantity** this row measures. A unit change is allowed; measuring today's US system rather than the modelled one is allowed, because that is what calibration means. A scope change is not. |
| `unmapped` | A canonical parameter for this quantity exists, but the row is a **comparator, analogue, precedent or input** to it rather than a measurement of it. No bind is asserted. `notes` names what it informs, in prose, where no code can join on it. |
| `no-canonical-equivalent` | The dictionary names nothing for this quantity. An honest gap. |

The split is **27 mapped, 25 unmapped, 33 no-canonical-equivalent**, and a
migration that had mapped everything would have meant the mapping was done by
id similarity, which is what produced the 57 collisions.

`disaggregation` carries the **many-to-one cardinality the old ids could not**.
The fifteen letter-suffixed slots - `CP-TOT-004a` through `004f` and friends -
were never invalid; they were expressing exactly this, in an id scheme with no
room for it. They are now ordinary `BL-*` rows whose `disaggregation` says
which cut of what they are.

**Some `source_url`s point at a living page, and the row says so.** A
publisher that maintains one URL across editions - AHA Fast Facts, CareScout
Cost of Care, the CMS NHE fact sheet, a CDC budget index - will not show the
year the row states. Two cases were measured on 2026-08-27 and both are
disclosed in the row's `notes` rather than papered over:

- `BL-0033` states **6,120** hospitals for 2024; AHA Fast Facts now shows
  **6,100** for its 2026 edition at the same URL. Nothing is wrong with either
  number and a reader following the link will think one of them is.
- `BL-0055` through `BL-0057` verify exactly against CareScout, which
  carries a 2024 and a 2025 column - but it publishes **monthly** medians
  ($9,277 semi-private, 2024) where the rows state **annual** ones
  ($111,325 = 9,277 x 12). The arithmetic is the row's, not the publisher's.

Neither is fixed by swapping the URL, because no archived per-edition link
exists in this repo for either publisher. **A citation is finished when the
row tells the reader what they will actually find.**

**A 403 is a bot block, not a dead link.** `cbo.gov` direct PDFs,
`bhw.hrsa.gov`, `gao.gov/products`, `jamanetwork.com`, `congress.gov` and
`mercatus.org` all refuse automated fetch. Their URLs are correct. Do not
"repair" one.

**`year` is a data vintage, never a placeholder.** No row reads `recent`,
`estimate`, `historical`, `ongoing` or `various` any more. A row whose value
genuinely spans years carries a declared span (`2024-2025`, `2022-2031`) and
its `notes` say what the endpoints are. A span is not an uncertainty band.

**`use_as` gates summation.** Three values:

| `use_as` | Means | Rule |
|---|---|---|
| `calibration` | A level or ratio measured at the **2023** base year | Same-year, so safe to combine - **but see the two traps below** |
| `trend` | A growth rate or a **forward** projection: a figure about a year that has not happened | Never summed into a single-year total |
| `benchmark` | Everything else: comparators, unit prices, ratios, analogues, levels at a year that is not 2023, and **backward** multi-year windows | Never summed into a national total |

🛑 **`calibration` does not mean "addable". Two traps inside the class:**

1. **A total and its own components are both `calibration`.** `BL-0001` is
   total NHE at $4,866.5B; `BL-0004` through `BL-0009` and `BL-0010`
   are lines *inside* it, and `BL-0018`, `BL-0019` and `BL-0067` are
   cuts of it on a different axis. **Adding the total to its parts
   double-counts.** Pick one level of the hierarchy.
2. **Two `calibration` rows are not levels at all.** `BL-0002` is a percent
   and `BL-0003` is a per-capita figure. They belong to the 2023 identity
   and are the right things to *check* a sum against; they can never be
   summands.

What the column actually guarantees is narrower than "may be summed" and is
the thing `R8` asked for: **no row in `calibration` is from a year other than
2023**, so nothing in that class can drag a 2024 or 2025 figure into a
single-year total by accident. Whether two same-year rows *should* be added is
still a question about what they measure, and the column does not answer it.

The forward/backward split is what separates `trend` from `benchmark` when
both carry a year range. `BL-0031`, `BL-0032`, `BL-0026` and
`BL-0027` are all forward budget-window scores and are all `trend`.
`BL-0030` (2003-2018), `BL-0069` (1994-2023) and `BL-0077` (2019-2021)
are backward windows over work already published, and are `benchmark`.

⚠️ **Nothing enforces `use_as` specifically**, and it was inconsistent across
four rows for a day before a review caught it. The column is still a convention
a reader has to honour.

**The rest of the seed is no longer unread, though.** Since 2026-08-27
`src/lib/baseline-registry.ts` parses it at build time and nine self-tests
gate it: the id sequence, the `measures` bind rule, the resolver's throw, the
cross-namespace uniqueness, the `value_type` band rule, the priority-parameter
sweep, and the sourcing rule below. Each of the nine was broken on purpose and
watched fail before it was trusted.

**A row graded `medium` or better states where its number came from.** The
three rows that still have no `source_url` are all below `medium`, each says in
`notes` why nothing citable was found, and the check prints their ids rather
than reporting a bare pass - a gap nobody can see is a gap nobody closes. A row
whose `source_name` begins `pending` is exempt, which is the only way to hold a
grade without a link. What is **not** gated is anything needing the network -
a dead `source_url` still 404s silently, because a network-dependent build gate
is a worse problem than the one it solves. `baseline-P16/negative_test.py` and
the P15 `check_urls.py` are the manual halves.

### `value_low`, `value_high` and `value_type`

A contested parameter is a distribution, not a point value with a caveat in a
notes column. Four types, and the build checks that a row carries the band it
claims:

| `value_type` | Means |
|---|---|
| `point` | `value` is one number and there is no band |
| `range` | `value_low` and `value_high` are both numbers, low first. The `notes` say what the endpoints are, because a span is not always an uncertainty band |
| `contested-range` | A `range` where the endpoints are two defensible **methodologies**, not two estimates of one quantity. `BL-0073` is the only one: Medicare administrative cost is 1.3% on the narrow CMS accounting basis and up to 6.4% fully loaded, and research/05 recommends modelling the spread with an explicit toggle rather than collapsing it |
| `compound` | `value` is not a single number at all - two quantities, a volume and a price, a ratio pair. The check refuses a `compound` row whose value *is* a single number, so the type cannot be used to dodge the band rule |

**`confidence` is load-bearing beyond this file.** The published FMEA borrows
cost-parameter occurrence from these grades, so a row graded high on no
evidence would rank as *less* likely to miss than one graded medium on a solid
source. Twelve rows were downgraded in the 2026-08-26 pass and none was
raised. If a row cannot be sourced, drop its grade; never raise a grade to
clear a check.

## Canonical population denominator, by output type

Three resident-population figures are live in this repo at once, and all three
are correct for their own year. They are not interchangeable.

| Denominator | Vintage | Lives in | Use it for |
|---|---|---|---|
| **334.0M** | 2023, implied by CMS's $14,570 per-capita NHE | `BASE2023.populationM` in `src/lib/params.ts` | **Every per-capita figure derived from the 2023 NHE calibration**, which is the model's base year. This is the canonical modelling denominator. |
| **340,110,988** | Census, July 1 2024 | the thirteen region populations in `research/hospital_regionalization_methodology.md`, cross-checked against `public/data/counties.json` by `regionCountyAgreement` | **Regional and county allocation only.** It is the sum of a geographic partition, so a national per-capita figure built from it will not reconcile with the NHE calibration. |
| **347.3M** | Census Vintage 2025, July 1 2025 | seed row `BL-0013` | **Current-state description only** - "how many people live here now". Never as the denominator under a 2023 dollar figure. |

The rule: **a per-capita figure names the denominator it used, and dividing a
2023 dollar total by a 2025 population is an error even though both inputs are
correct.** The gap is about 4%, which is larger than several of the savings
levers the model reports.

The seed's `BL-0012` carries 2024 GDP ($29,298B) for the same reason and
under the same caution: the model's `BASE2023` uses 2023 GDP ($27,720B), and
`NHE / GDP = 17.6%` only reproduces on the 2023 pair.

### The 26.7M uninsured headline

The front page carries **26.7M**. That number is real and is the KFF/Census-ACS
count of the uninsured **under age 65** in 2024, at a 9.8% rate (seed row
`BL-0016`). The dashboard pairs it with **8.0%**, which is the Census CPS
ASEC **all-ages** rate (seed row `BL-0015`).

`26.7 / 334.0` does come to 8.0%, so the arithmetic is self-consistent - but
the two inputs measure different populations, and `BL-0015`'s note says
"two incompatible measures exist". Until 2026-08-26 the front page called it
"people uninsured" and `src/lib/equations.ts` described the pair as
"26.7M of 334M"; both now name the measure. **The model's 8.0% demand input was
deliberately not changed**, because moving it moves scenario economics, and
this is a labelling defect rather than an arithmetic one.

**Three sites carried the defect and the first pass corrected two.** The third,
found by a review the next day, was the row for `KPP-A1` in
`quality-equation-methodology.md`, which documented the derivation as
"26.7M uninsured / 334M population" and graded it `high`. Making the headline
*derive* from a declared parameter rather than being a string literal is still
open, so nothing yet prevents a fourth site.

## Calibration base year - do not sum across vintages

CMS's National Health Expenditure series is the anchor for most figures in
this repo, but not every row uses the same vintage: **2023 is the last
fully-finalized historical year** and is what most figures use (total NHE
$4,866.5B, hospital $1,519.7B, physician/clinical $978.0B, etc.). A few rows
- pulled by a different research pass - use **2024 preliminary/CMS-estimate**
figures instead (total NHE $5.3T-$5.28T, retail Rx $467.0B, dental $189.2B).
Both vintages are individually correct and labeled with their `year` column
in `parameter_baseline_seed.csv`, but **do not sum line items across the two
vintages into a single-year total** - that will silently overstate spending
by a year's growth (NHE grew ~9-10% between 2023 and 2024). Pick 2023 as the
internally-consistent base year for the model's calibration point, and treat
any 2024 figures either as trend/growth-rate inputs or inflate the 2023
figures forward using CMS's own category-specific growth rates (also in the
CMS NHE release) before mixing them into the same year's total.

## The single most important open question

**The framework's own stated cost position is a mature steady-state total
system cost of ~$4.75T/year (2024 dollars), plausible range $4.30T-$5.25T/year.**
None of the research in this directory validates or refutes that number,
because it's not clear what it's meant to represent. The candidates, per
`01_macro_financing_population_offsets.md` (RB-01-FIN-015/016):

- **Total national health expenditure** (all payers, all spending) - CMS
  NHE was $4.87T in 2023 and is *projected* to hit $8.6T by 2033 under the
  status quo. A framework claiming $4.75T total system cost in "2024
  dollars" would need to be claiming the new system costs *less* than
  today's baseline in real terms, which is a strong claim that should be
  explicit and defended, not implicit.
- **Net new federal spending** - CBO's own single-payer costing methodology
  (its most authoritative directly-comparable estimate) found federal
  subsidies would rise $1.5-3.0T in a single year (2030), while total NHE
  could change anywhere from -$0.7T to +$0.3T depending on plan design.
  Independent 10-year federal cost estimates from Urban Institute and the
  Mercatus Center converge remarkably on ~$32-34T over 10 years despite
  opposite institutional leanings - call it ~$3.2-3.4T/year average, which
  is a different number again from $4.75T.
- **Net new revenue required** - PERI's Sanders-bill costing found a
  ~$1.05T/year *gap* needing new revenue after redirecting existing public
  spending, a much smaller number than $4.75T.

Before an executable simulation can validate the framework's headline
number, whoever calibrates it needs to pin down which of these three (or
some other) definition $4.75T is meant to satisfy, then reconcile against
CBO/Urban/Mercatus as the credibility check. This is flagged as the top
priority open item in the macro research file's gap list.

## Known gaps across all five files

Each file ends with its own "gaps for follow-up" section. Recurring themes:
- Several CBO and CMS source PDFs returned HTTP 403 to automated fetches;
  content was reconstructed from secondary sources (KFF, Health Affairs,
  Brookings commentary) that are reliable but not a substitute for the
  primary table. A follow-up pass with direct PDF/API access should verify
  exact figures before hard-coding them as simulation constants.

  **Retested 2026-08-26, and the answer is now split by host.** Plain `curl`
  with an ordinary user agent:

  | Host | Then | Now |
  |---|---|---|
  | `cms.gov` NHE fact sheet, historical index, and `files/document/highlights.pdf` | 403 | **200** |
  | `cbo.gov/system/files/...` direct PDFs | 403 | **403 still**; the `cbo.gov/publication/<id>` page is 200, so cite the publication page |
  | `bhw.hrsa.gov/sites/default/files/...` PDFs | not tested | **403** |
  | `gao.gov/products/<id>` | not tested | **403** |
  | `jamanetwork.com` article pages | not tested | **403** |

  **A 403 here is a bot block, not a dead link.** It is a reason a figure
  cannot be machine-verified, never evidence that the source is wrong.

  The `cms.gov` unblock does **not** close the specific gap it was recorded
  against. `research/03`'s `BL-0052` needed NHE **Table 2** for the
  durable-medical-equipment, other-non-durable-products and
  other-professional-services splits that `BASE2023` carries as `dme: 72.8`,
  `nondurables: 124.1` and `otherProf: 159.9`. Those splits are not on the
  fact-sheet page; they are inside the NHE Tables archive at
  `https://www.cms.gov/files/zip/nhe-tables.zip`, which now serves. **The
  blocker changed from "the host refuses" to "the data is in a zip nobody has
  opened", and that check belongs to whoever owns `src/lib/params.ts`.**
- BLS occupational and industry headcounts now anchor the Workforce tab, but
  no official table isolates PBM employment and the framework still lacks an
  audited occupation-to-function crosswalk. The resulting displacement and
  internal-transition counts remain explicit planning cases rather than a
  forecast.
- A handful of parameters (age-cost multiplier, national aggregate employer
  spending, CHIP-only spending, a clean adult diabetes prevalence topline)
  were only found as derived or partial figures - flagged inline rather than
  presented as more precise than they are.

## New parameters proposed beyond the framework's original CP-* list

Each research file proposes additional parameters it judged useful but not
explicitly named in the Source Package (e.g. a commercial-to-Medicare price
multiplier applicable across drugs/imaging/labs, an age-based per-capita
cost multiplier, CBO's own single-payer administrative-cost estimate as a
distinct benchmark from the CMS accounting figure, family-caregiver imputed
value for long-term care). These are marked `(NEW, proposed)` inline in each
file with a suggested parameter ID and full rationale.
