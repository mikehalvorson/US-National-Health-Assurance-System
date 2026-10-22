# Additions made after the controlled framework

Compiled 2026-10-08. Last revised 2026-10-13.

This register lists every part of the dashboard that the plan added after the
controlled framework document was extracted, with when it was added, why, and
what it rests on. The catalog and the governance architecture were both built
from that document; anything listed here was not, and a reader should be able
to tell the two apart.

**The rule, checked by the build.** Every quality-catalog record either comes
from the framework extract or is listed in the first table below, and every
governance entity added after the port is listed in the second. The
catalog marks its own records (`provenance: "plan-defined"`, set by
`tools/extract_quality_catalog.py` from `tools/quality_catalog_addendum.json`),
and `src/lib/gov.ts` declares its additions; the self-test "The additions
register lists every plan-defined record and entity" holds this file to both,
in both directions, and refuses a row with an empty cell or an Added cell
that is not a date and a commit. A second self-test reads the framework extract itself
(`framework_v2_extract.md`): every record marked as the framework's is named
there, and none listed here is.

Last reviewed 2026-10-09.

## Merit health-talent immigration pathway

**Added** 2026-08-01 to 2026-08-02, across five commits: `06d74cb` (workforce,
legislation and quality), `2b187d4` (the two governance entities and the
workforce evidence block), `a88da03` (an equation for every catalog record),
`d93581d` (the long-term care chapter's reference to the pathway) and
`50e56fb` (the site glossary).

**Why.** Domestic training is the primary answer to the clinical, rural and
long-term care direct-care shortages, and it arrives years after it is funded.
The pathway is the plan's bridge: merit selection for the roles and places
that are short, held to the adopted pay floors, with credential recognition,
shrinking as the domestic pipeline matures.

**Source status.** None of the ten catalog records is in the controlled
framework document, and none carries a source. Each says so in its own status
field: "Plan-defined target; baseline and acceptance evidence required". Their
equations in `src/lib/equations.ts` use planning constants with no citation
(for example a 0.08 baseline role-vacancy ceiling and an 80% planned
slot-to-hire conversion). Of the figures the Workforce chapter's evidence block
states, each is now cited in `workforce_transition_methodology.md`, "Merit
immigration evidence sources" (2026-10-11). The 25.6% IMG physician share is
AAMC's (`02_hospital_clinical_workforce_education.md`); the 58% nonmetropolitan
physician shortage is HRSA's December 2025 projection, already cited in that
methodology, so "no citation" was wrong for it; and the five programs carry
official sources. The nurse figure was wrong: the page said 17.8% of U.S.
registered nurses were internationally educated, with no source, and NCSBN's
2022 survey puts it at 5.2%. The page and the Governance chapter's "a sixth of
nurses" were corrected the same day.

### Catalog records

| Id | Type | Name | Target | Added | Why it is in the plan | Source status |
|---|---|---|---|---|---|---|
| KPP-W2 | KPP | Health workforce sufficiency ratio | >=98% | 2026-08-01, `06d74cb` | Whether every role-region cell is staffed to its safe floor, the outcome the workforce plan is for. | None; the status field asks for baseline and acceptance evidence |
| KPP-W3 | KPP | Shortage-area staffing sufficiency | >=95% of designated HPSA and MUA positions filled | 2026-08-01, `06d74cb` | The same, inside designated shortage areas, where the pathway and the service corps are aimed. | None; the status field asks for baseline and acceptance evidence |
| KPP-W4 | KPP | Merit immigration shortage-role fill rate | >=90% | 2026-08-01, `06d74cb` | Whether admissions land in the shortage occupations and regions they are selected for. | None; the status field asks for baseline and acceptance evidence |
| KPP-W5 | KPP | Internationally recruited clinician retention | >=85% at three years | 2026-08-01, `06d74cb` | Whether recruited clinicians are still in covered practice three years on. | None; the status field asks for baseline and acceptance evidence |
| TPP-W1 | TPP | Role-region vacancy rate ceiling | <=8% | 2026-08-01, `06d74cb` | The vacancy ceiling per role-region cell that the sufficiency ratio rests on. | None; the status field asks for baseline and acceptance evidence |
| TPP-W2 | TPP | Training-slot to completed-hire conversion | >=80% | 2026-08-01, `06d74cb` | Whether funded training slots become hires, the domestic pipeline the pathway bridges. | None; the status field asks for baseline and acceptance evidence |
| TPP-IMM1 | TPP | Merit selection shortage-occupation targeting | >=90% | 2026-08-01, `06d74cb` | Whether selection follows the published shortage lists rather than a lottery. | None; the status field asks for baseline and acceptance evidence |
| TPP-IMM2 | TPP | Health-talent petition processing time | median <=2 weeks for shortage-role petitions | 2026-08-01, `06d74cb` | The decision-speed standard the pathway borrows from fast-track programs. | None; the status field asks for baseline and acceptance evidence |
| TPP-IMM3 | TPP | Credential recognition and licensing-bridge time | median <=6 months from arrival to full license | 2026-08-01, `06d74cb` | Whether a qualified arrival reaches full license quickly instead of leaving the field. | None; the status field asks for baseline and acceptance evidence |
| TPP-IMM4 | TPP | Ethical recruitment safeguards compliance | 100% outside WHO-safeguarded source countries | 2026-08-01, `06d74cb` | The ethical-sourcing limit on recruitment. | None; the status field asks for baseline and acceptance evidence |

### Governance entities

| Code | Name | Body | Added | Why it is in the plan | Source status |
|---|---|---|---|---|---|
| NHTIB | National Health Talent Immigration Board | AHWCS | 2026-08-01, `2b187d4` | One accountable body to target the pathway to real shortages, at or above the wage floor, fast, and shrinking as the domestic pipeline matures. | Not in the framework; its description states no figure and cites no source. |
| HCRB | Health Credential Recognition Board | AHWCS | 2026-08-01, `2b187d4` | Slow and inconsistent state-by-state credentialing strands qualified internationally trained clinicians outside the workforce. | Not in the framework. "A quarter of physicians" rests on the 25.6% international-graduate share in `02_hospital_clinical_workforce_education.md`; "a sixth of nurses" carries no citation. |

### Other places the pathway appears

These carry the feature without adding a record or an entity. They are listed
so a reader of any one of them can find the rest; the build does not check
this list.

- **Legislation**: Title VII of the enabling act is "Workforce, education,
  compensation, scope, and merit health-talent immigration", and the workforce
  legal domain names the Immigration and Nationality Act pathways
  (`src/lib/legislation.ts`).
- **Workforce chapter**: the merit-immigration section, its evidence block and
  its accountable institutions (`src/pages/workforce.astro`, styles in
  `src/styles/global.css`).
- **Long-term care chapter**: "How this squares with the Workforce and
  immigration plans" (`src/pages/ltc.astro`, `src/lib/ltc.ts`).
- **Quality equations and phase targets**: an equation for each of the ten
  records (`src/lib/equations.ts`) and their first-measurable phases
  (`src/lib/phase-targets.ts`).
- **Site glossary**: HTIP, NHTIB and HCRB (`src/lib/acronyms.ts`).
- **Methodology notes**: `long_term_care_methodology.md` and
  `quality-equation-methodology.md`.

## Disability accommodation compliance metric

**Added** 2026-10-13, across two commits: the definition, evidence and
evaluation in `quality-equation-methodology.md`, "Disability accommodation
compliance", and then the catalog record, its equation and its row below.

**Why.** The plan requires disability accommodation compliance at or above
98% by Phase 8, and its catalog had no metric that measures it, where the
language-access requirement beside it has one; the plan's trace reaches two
metrics only through the needs they share, and neither measures
accommodation. The owner ruled on
2026-10-12 that a metric be established, researched and evaluated rather
than the requirement declared out of scope.

**Source status.** The target is the plan's own requirement. The definition
(the lowest of three rates) and the equation's drivers are the dashboard's,
graded low. The legal floor for accessible equipment is primary regulatory
text (45 CFR 84.92), graded high. No national compliance baseline exists;
the component evidence and its grades are in the methodology section.

### Catalog records

| Id | Type | Name | Target | Added | Why it is in the plan | Source status |
|---|---|---|---|---|---|---|
| KPP-E6 | KPP | Disability accommodation compliance | >=98% | 2026-10-13, `484ab7a` | The plan's disability accommodation requirement had no metric that measures it; this one carries its 98% floor beside language access. | Target from the plan's requirement; definition and drivers the dashboard's, graded low; no national baseline exists |
