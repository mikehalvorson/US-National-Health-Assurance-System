# Parameter research index

Five research passes, one per cost domain, gathering sourced real-world
baseline values to calibrate the framework's `CP-*` cost parameter
dictionary (defined in `National_Health_Assurance_Framework_Source_Package.docx`).
Every number in these files carries a source name, publication/dataset,
year, and URL, plus a confidence/caveat note. Where no clean authoritative
figure exists, the file says so explicitly rather than guessing — treat
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
| [workforce_transition_methodology.md](workforce_transition_methodology.md) | BLS anchors, overlap controls, lower/planning/stress job-displacement cases, internal role matching, quantified new-position floor, and rural flex/travel-pool derivation | Workforce tab (docs/js/workforce.js) |

[parameter_baseline_seed.csv](parameter_baseline_seed.csv) pulls the ~45
highest-confidence, most load-bearing numbers from all five files into one
machine-readable table — use it as the starting calibration set, then go to
the relevant detail file for anything it doesn't cover.

## Calibration base year — do not sum across vintages

CMS's National Health Expenditure series is the anchor for most figures in
this repo, but not every row uses the same vintage: **2023 is the last
fully-finalized historical year** and is what most figures use (total NHE
$4,866.5B, hospital $1,519.7B, physician/clinical $978.0B, etc.). A few rows
— pulled by a different research pass — use **2024 preliminary/CMS-estimate**
figures instead (total NHE $5.3T-$5.28T, retail Rx $467.0B, dental $189.2B).
Both vintages are individually correct and labeled with their `year` column
in `parameter_baseline_seed.csv`, but **do not sum line items across the two
vintages into a single-year total** — that will silently overstate spending
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
`01_macro_financing_population_offsets.md` (CP-FIN-015/016):

- **Total national health expenditure** (all payers, all spending) — CMS
  NHE was $4.87T in 2023 and is *projected* to hit $8.6T by 2033 under the
  status quo. A framework claiming $4.75T total system cost in "2024
  dollars" would need to be claiming the new system costs *less* than
  today's baseline in real terms, which is a strong claim that should be
  explicit and defended, not implicit.
- **Net new federal spending** — CBO's own single-payer costing methodology
  (its most authoritative directly-comparable estimate) found federal
  subsidies would rise $1.5-3.0T in a single year (2030), while total NHE
  could change anywhere from -$0.7T to +$0.3T depending on plan design.
  Independent 10-year federal cost estimates from Urban Institute and the
  Mercatus Center converge remarkably on ~$32-34T over 10 years despite
  opposite institutional leanings — call it ~$3.2-3.4T/year average, which
  is a different number again from $4.75T.
- **Net new revenue required** — PERI's Sanders-bill costing found a
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
- BLS occupational and industry headcounts now anchor the Workforce tab, but
  no official table isolates PBM employment and the framework still lacks an
  audited occupation-to-function crosswalk. The resulting displacement and
  internal-transition counts remain explicit planning cases rather than a
  forecast.
- A handful of parameters (age-cost multiplier, national aggregate employer
  spending, CHIP-only spending, a clean adult diabetes prevalence topline)
  were only found as derived or partial figures — flagged inline rather than
  presented as more precise than they are.

## New parameters proposed beyond the framework's original CP-* list

Each research file proposes additional parameters it judged useful but not
explicitly named in the Source Package (e.g. a commercial-to-Medicare price
multiplier applicable across drugs/imaging/labs, an age-based per-capita
cost multiplier, CBO's own single-payer administrative-cost estimate as a
distinct benchmark from the CMS accounting figure, family-caregiver imputed
value for long-term care). These are marked `(NEW, proposed)` inline in each
file with a suggested parameter ID and full rationale.
