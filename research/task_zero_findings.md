# Task Zero findings: Source Package and framework extraction

Date: 2026-08-09. Commit: `41807cd`.

Scope: extraction and diagnosis only. No parameter IDs were remapped. No existing
research file, `parameter_baseline_seed.csv`, or `params.js` was edited. No value or
citation was invented.

---

## 1. Extractor summary blocks

```
wrote research/source_package_extract.md
  chars           139,395
  lines           1,517
  table rows      16
  identifiers     860 total / 636 unique
  families (49) ASM, CP, CP-BH, CP-CLIN, CP-CLM, CP-DVH, CP-DX, CP-EDU, CP-EMS, CP-FIN,
                CP-GOV, CP-HOSP, CP-IT, CP-LTC, CP-OFF, CP-PH, CP-POP, CP-RD, CP-RX,
                CP-TOT, CP-TRN, CP-UNIT, KPP, PR, PR-CST, PR-SCH, PR-TRN, PR-WF, SR,
                SR-ACC, SR-ADP, SR-AI, SR-ARCH, SR-BH, SR-COV, SR-DATA, SR-DRUG, SR-DVH,
                SR-EMS, SR-EQ, SR-HOSP, SR-IF, SR-INN, SR-LAW, SR-LTC, SR-PAY, SR-RGT,
                SR-SPEC, TPP
  absent parts    word/footnotes.xml, word/endnotes.xml
```

```
wrote research/framework_v2_extract.md
  chars           1,595,636
  lines           15,602
  table rows      6,740
  identifiers     5,440 total / 819 unique
  families (50) ASM, CP, CP-BH, CP-CLIN, CP-CLM, CP-DVH, CP-DX, CP-EDU, CP-EMS, CP-FIN,
                CP-GOV, CP-HOSP, CP-IT, CP-LTC, CP-OFF, CP-PH, CP-POP, CP-RD, CP-RX,
                CP-TOT, CP-TRN, CP-UNIT, KPP, OI, PR, PR-CST, PR-SCH, PR-TRN, PR-WF, SR,
                SR-ACC, SR-ADP, SR-AI, SR-ARCH, SR-BH, SR-COV, SR-DATA, SR-DRUG, SR-DVH,
                SR-EMS, SR-EQ, SR-HOSP, SR-IF, SR-INN, SR-LAW, SR-LTC, SR-PAY, SR-RGT,
                SR-SPEC, TPP
  absent parts    word/footnotes.xml, word/endnotes.xml
```

### Deviation from the task instructions

This machine has no Python interpreter. `python --version` exits 49 against the Microsoft
Store stub, and no CPython install exists under `C:\Python*`, `Program Files\Python*`,
`LOCALAPPDATA\Programs\Python`, anaconda, or miniconda.

`tools/extract_docx.py` is committed exactly as specified. The extraction actually ran
through `tools/extract_docx.mjs`, a line for line Node port of that script: same regex
sequence, same cell and row markers, same pipe rebuild, same summary block, with a minimal
ZIP central directory reader in place of `zipfile`.

`tools/build_canonical_registries.mjs` is also committed so the two canonical CSVs
regenerate from the extract rather than existing as hand transcription.

> **Settled 2026-08-16 (R131).** CPython is installed now, so `extract_docx.py` was run
> for the first time and compared against the port. On all three `.docx` files the two
> produce identical content, and the only divergence is line endings: Python's text-mode
> write translates `\r\n` to `\r\r\n` on Windows, the port writes `\r\n`. The port is
> faithful, and `extract_docx.py` is deleted rather than kept as a second implementation
> of one job. The paragraphs above are left as the record of what was true at Task Zero.
> Which runtime each remaining tool needs is declared in `src/lib/toolchain-check.ts`.

## 2. Canonical registry row counts

| File | Rows | Families |
|---|---|---|
| `research/cp_registry_canonical.csv` | 310 | 20: CP-BH, CP-CLIN, CP-CLM, CP-DVH, CP-DX, CP-EDU, CP-EMS, CP-FIN, CP-GOV, CP-HOSP, CP-IT, CP-LTC, CP-OFF, CP-PH, CP-POP, CP-RD, CP-RX, CP-TOT, CP-TRN, CP-UNIT |
| `research/kpp_tpp_registry_canonical.csv` | 120 (41 KPP, 79 TPP) | KPP, TPP |

No `DUPLICATE-IN-SOURCE` rows in either file.

310 of 310 CP rows have an empty `value`. 32 carry a unit. None carry a number, a year, or
a source. All 120 KPP and TPP rows carry a target.

Source sections: CP rows come from the Cost Parameter Dictionary (extract lines 685 to
1014), subdivided by its own family headings. KPP rows come from the KPP Dictionary (550 to
591). TPP rows come from the TPP Dictionary (592 to 671).

---

## 3. Step 4 answers

### Q1. Section S / 8.1.3a: the remap is provisional

80 seed rows in `research/parameter_baseline_seed.csv`.

| Result | Count |
|---|---|
| Seed IDs present in the canonical registry | 65 |
| Seed IDs absent from the canonical registry | 15 |
| Present but denoting a different quantity | 57 |
| Present and consistent | 8 |

The 15 absent IDs are all letter suffixed slots the seed invented to subdivide a canonical
parameter:

`CP-TOT-004a`, `CP-TOT-004b`, `CP-TOT-004c`, `CP-TOT-004d`, `CP-TOT-004e`, `CP-TOT-004f`,
`CP-POP-004a`, `CP-POP-004b`, `CP-FIN-011a`, `CP-FIN-015a`, `CP-FIN-015b`, `CP-FIN-016a`,
`CP-FIN-016b`, `CP-OFF-003a`, `CP-OFF-003b`.

Representative collisions among the 57:

| ID | Seed description | Source Package definition |
|---|---|---|
| CP-TOT-001 | Total U.S. National Health Expenditure | Total annual system cost |
| CP-TOT-002 | NHE as percent of GDP | Per-capita system cost |
| CP-TOT-003 | Per-capita NHE | System cost as GDP share |
| CP-TOT-005 | Combined administrative overhead | Residual private spending |
| CP-TOT-009 | CMS projected NHE by 2033 | Gross added framework spending |
| CP-TOT-010 | U.S. GDP | Gross framework savings |
| CP-POP-001 | U.S. resident population | Covered population |
| CP-FIN-001 | Federal Medicare spending (net) | Dedicated revenue receipts |
| CP-FIN-004 | State share Medicaid spending | Employer contribution receipts |
| CP-FIN-005 | ACA marketplace federal subsidies | Extreme-wealth tax receipts |
| CP-FIN-008 | VA medical care spending | Broad backstop contribution receipts |
| CP-FIN-010 | Total redirectable federal health spending | Wealth tax avoidance leakage |
| CP-FIN-017 | Federal government total revenue | Ordinary taxpayer burden share |
| CP-OFF-001 | Broadest estimate of US health administrative cost | Private insurance administrative savings |
| CP-HOSP-001 | Number of U.S. hospitals | Hospital global budget base |
| CP-HOSP-002 | Median hospital operating margin | Hospital global budget total |
| CP-HOSP-003 | Hospitals at financial closure risk | Emergency readiness cost |
| CP-HOSP-004 | Hospital outpatient facility fee markup | Essential service-line cost |
| CP-HOSP-005 | Annual ED visit volume and average cost | Rural hospital readiness premium |
| CP-HOSP-006 | US hospital administrative cost share | Hospital staffing compliance cost |
| CP-CLIN-001 | Active U.S. physicians | Primary care panel cost |
| CP-CLIN-002 | Physician administrative burden | Primary care complex-care premium |
| CP-UNIT-001 | Retail clinic visit cost | Type A unit count |
| CP-UNIT-002 | Urgent care visit cost and margin | Type B unit count |
| CP-EDU-001 | Medicare GME payment per resident | Medical school scholarship cost |
| CP-EDU-003 | Average medical school debt | Fellowship slot cost |
| CP-EDU-004 | Projected physician shortage by 2036 | Specialist backplane training cost |
| CP-RX-001 | Retail prescription drug spending | Prescription fill volume |
| CP-RX-002 | US vs international drug price ratio | Weighted average net drug unit cost |
| CP-RX-003 | Insulin production cost vs executed price | Essential formulary fill share |
| CP-RX-004 | Generic share of volume vs spend | Specialty drug cost |

The remap is not provisional in the sense of needing confirmation. It is incorrect on 57 of
80 rows.

### Q2. J1: how far the `research/01` ID overwrites extend

160 `CP-*` IDs are defined as headings across `research/01` through `research/06`.

| Result | Count |
|---|---|
| Not present in the canonical registry | 0 |
| Disagree with the canonical registry about meaning | 143 |
| Agree | 17 |

Uncertainty register entry U4 understates this. `CP-POP-005` and `CP-POP-006` are not two
exceptions. They are two members of a 143 item set.

The disagreement is structural, not per ID drift. Every research file uses the
`CP-<FAM>-NNN` space as its own sequential index of baseline evidence topics, running in
parallel with the Source Package's use of the same space for model parameters. Whole
families are offset by one or two slots. Examples:

| ID | research/01 to 06 | Source Package |
|---|---|---|
| CP-BH-001 | Total U.S. mental health and SUD treatment spending | Behavioral health eligible demand |
| CP-BH-005 | Average cost per therapy session | Psychiatry e-consult cost |
| CP-BH-010 | Behavioral health workforce shortage | Medication-assisted treatment cost |
| CP-CLIN-003 | Number of active physicians and NPs/PAs | Physician compensation cost |
| CP-TOT-004 | NHE by category, 2023 | Public share of system cost |
| CP-TOT-006 | Total NHE by payer, 2023 | Patient point-of-care spending |
| CP-TOT-008 | 2024 preliminary NHE | Net savings versus baseline |
| CP-TRN-003 | TAA displaced-worker retraining cost per worker | Patient continuity cost per case |
| CP-UNIT-003 | FQHC cost per visit | Type C unit count |
| CP-UNIT-004 | Telehealth / e-consult visit cost | Type D unit count |
| CP-RX-011 | Civica Rx model mechanics and scale | Therapeutic substitution savings |
| CP-DVH-002 | Total U.S. vision care spending | Basic dental visit cost |

Implication for Part 8.1.4: a per ID remap table is the wrong remedy. These are two
distinct namespaces sharing a prefix, not one namespace with errors in it.

### Q3. AB3: do the four IDs exist in the canonical dictionary?

All four exist. Yes to each.

| ID | Canonical name | Target | Dictionary |
|---|---|---|---|
| KPP-T1 | Active treatment transfer success | >=99% | KPP Dictionary |
| KPP-T2 | Critical medication interruption rate | <=0.2% | KPP Dictionary |
| TPP-FORM1 | Formula registry completeness | >=99% | TPP Dictionary |
| TPP-USE1 | Patient rights notice comprehension | >=90% | TPP Dictionary |

AB3's premise was that these are nonconforming inventions. They are not. The Source
Package's own dictionaries use mnemonic suffixes alongside numeric ones: `KPP-TRUST1`,
`KPP-CULT1`, `KPP-W1`, `TPP-EMP1`, `TPP-LEG1`, `TPP-TRIB1`, `TPP-REG1`, `TPP-USE2`. The
namespace pattern the audit tested against is narrower than the document's actual
convention.

### Q4. AB6: the `basis: "framework"` phase targets

There are **17**, not fifteen. `docs/js/dataphases.js` is minified to a single line, which
is the likely reason a line based count missed two. `TPP-2.1` appears twice with the same
target (P3 and P4). `KPP-B7` appears twice with different targets.

All 17 have a corresponding target value in the Source Package. Nothing in this set is
unverifiable.

#### 11 maturity targets, matching the KPP and TPP dictionaries verbatim

| ID | Dashboard target | Source Package dictionary |
|---|---|---|
| TPP-1.1 | >=99.8% match accuracy | "Target >=99.8%" |
| KPP-A1 | >=99.5% continuous coverage | "Target >=99.5%" |
| TPP-10.1 | >=99.5% active records verified | "Target >=99.5% active records verified" |
| TPP-10.2 | >=95% medication-record completeness | "Target >=95% covered persons" |
| TPP-10.3 | >=98% lab-result interoperability within target | "Target >=98% within target" |
| TPP-10.4 | >=98% structured discharge summaries within 24 hours | "Target >=98% structured within 24 hours" |
| TPP-10.5 | >=97% correction closure within statutory timeframe | "Target >=97% within statutory timeframe" |
| TPP-10.6 | >=98% API conformance | "Target >=98%" |
| TPP-11.1 | >=99.97% critical-system uptime | "Target >=99.97%" |
| TPP-11.2 | >=98% of downtime-continuity drills passed | "Target >=98% drills passed" |
| TPP-11.3 | >=99% of critical vulnerabilities remediated within 15 days | "Target >=99% within 15 days" |

#### 5 gate floors, sourced from the Schedule and Phase-Gate Requirements block

These are not in the KPP or TPP dictionary, which is why a dictionary only check reports
them as unsourced. They are in the `PR-SCH-*` requirements:

| Dashboard entry | Source Package requirement |
|---|---|
| TPP-2.1 Gate 1, >=75% | `PR-SCH-010`: no move from Phase 3 to Phase 4 unless clean-claim auto-adjudication is at least 75% for wave I medical claims. Trace: TPP-2.1, SN-06. |
| KPP-B7 P5 milestone, >=65% | `PR-SCH-006`: scale the Community Diagnostic and Treatment Network to cover at least 65% of the population by the end of Phase 5. Trace: KPP-B7, SN-03. |
| KPP-B7 Gate 2, >=80% | `PR-SCH-011`: no move to broad cost-sharing elimination unless diagnostic-treatment unit population coverage is at least 80%. Trace: KPP-B7, SN-03. |
| KPP-B9 Gate 2, <=5 per 10,000 | `PR-SCH-012`: no move to broad cost-sharing elimination unless unsafe under-referral is no greater than 5 per 10,000 non-escalated unit encounters. Trace: KPP-B9, SN-16. |
| TPP-9.1 Gate 3, >=85% | `PR-SCH-013`: no move to full long-term care expansion unless long-term care assessment timeliness is at least 85%. Trace: TPP-9.1, SN-05. |

Recommended follow-up, not performed here: cite `PR-SCH-*` for these five rather than a
bare `basis: "framework"`.

One apparent inconsistency that is correct as written: the KPP-B9 gate ceiling
(<=5 per 10,000) is looser than the mature KPP-B9 dictionary target (<=3 per 10,000). A
gate floor and a maturity target are different quantities.

---

## 4. What the Source Package contradicts in the audit's assumptions

### 4.1 The Source Package contains no cost values at all

This is the finding that reshapes the backlog.

All 310 CP entries consist of a name, a definition, and sometimes a unit. `CP-TOT-001`
reads in full: "Total annual system cost. Total public, residual private, and patient-paid
health-system cost in year t. Unit: dollars/year." There is no number, no year, and no
citation. The same holds for all 310.

Part 8.1.4 therefore cannot be a value reconciliation. There is no authoritative value
layer to reconcile against. The Source Package defines what a parameter means.
`parameter_baseline_seed.csv` and `research/01` through `research/06` supply what it
currently measures, from CMS, KFF, CBO and similar. Those are complementary layers that
collided because both claimed the same ID space, not competing versions of the same layer.

### 4.2 The parameter dictionaries are not Word tables

The Source Package extract yields 16 table rows in total. The dictionaries are plain
paragraph text in `ID: Name. Definition. Unit: X.` form. The table preserving extractor
mattered for the long-form framework, which has 6,740 table rows, but the "ungreppable
collapsed table cell" concern does not apply to the file the audit was actually blocked on.

### 4.3 Neither document has a citation apparatus

Both `.docx` files lack `word/footnotes.xml` and `word/endnotes.xml`. Any claim that a
Source Package value carries a citation is unsupportable, because no footnote or endnote
part exists in either document.

### 4.4 The Source Package does not claim to be authoritative

Extract line 10 states that it is a structured reconstruction from accessible conversation
context, not a verbatim transcript. Line 9 describes its purpose as seeding a long-form
drafting environment. Treating it as the authoritative parameter registry is a promotion
the document does not claim for itself. It is authoritative for parameter *definitions* and
*IDs*, which is what Task Zero needed. It is not a data source.

---

## 5. Files produced

| Path | Contents |
|---|---|
| `tools/extract_docx.py` | Specified stdlib extractor, committed as given, not executed here. Run and validated against the port in 2026-08, then deleted (R131) |
| `tools/extract_docx.mjs` | Node port that produced both extracts; the surviving extractor |
| `tools/build_canonical_registries.mjs` | Regenerates both canonical CSVs from the Source Package extract |
| `research/source_package_extract.md` | Source Package as greppable text |
| `research/framework_v2_extract.md` | Framework v2.0.0 as greppable text |
| `research/cp_registry_canonical.csv` | 310 CP parameter definitions |
| `research/kpp_tpp_registry_canonical.csv` | 41 KPP and 79 TPP definitions with targets |
| `research/task_zero_findings.md` | This report |
