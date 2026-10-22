# Open-item register

Compiled 2026-08-26. Last revised 2026-10-21.

Written 2026-08-26. Extended 2026-10-10.

The framework defines 121 open items, `OI-001` through `OI-121`, and until now
none of them was visible anywhere except as a bare identifier inside
methodology prose or a generated data file. A reader who met the phrase
*"allocation open under OI-033, OI-034, OI-035, and OI-043"* had no way to find
out what those four are, what they block, or what closing them would take.
That is the gap this file fills.

## Scope, and two corrections to the recommendations that asked for this

The audit named five items - `OI-008`, `OI-033`, `OI-034`, `OI-035`, `OI-043` - and
says they exist only inside methodology prose. **Both halves are right, and the
list is short by five.** Measured against the repo on 2026-08-26, the open items
referenced outside the two extract files were:

| Where | Items |
|---|---|
| `research/workforce_transition_methodology.md` | `OI-008`, `OI-033`, `OI-034`, `OI-035`, `OI-043` |
| `research/legislation_crosswalk.md` | `OI-061` through `OI-070`, as a range |
| `src/lib/quality-data.ts` (generated) | `OI-001`, `OI-008`, `OI-023` |
| `src/lib/rollout.ts`, `src/lib/selftests.ts` | `OI-052` |

**The second correction, 2026-10-10.** The 2026-08-26 version read the
crosswalk's "OI-061 through OI-070" as two items and wrote the two ends up as
the range: its `OI-061` row described the whole block and its `OI-070` row was
"the upper bound". A range names every item in it. The extract's own open-item
table gives each of the ten a subject of its own - `OI-061` is bill text and
committee jurisdiction, `OI-070` is regulatory defaults - and the eight between
them were missing. All ten are below, each in its own words.

The remaining items live in `research/framework_v2_extract.md` and are not
listed here. They are not hidden - the extract is in the repo and searchable -
and none of them is cited by any methodology file or shipped module. **This
register's rule is: every open item referenced outside the extract files, alone
or inside a range, appears here, and every item here is referenced
somewhere.** A build self-test reads the repo for both halves
(`openItemRegisterDrift()` in `src/lib/research-check.ts`), so a new citation
without a row, or a row nothing cites, fails the build.

## Owners

There are no named people on this project, so an "owner" here is **the artifact
that has to change for the item to close**. That is the operationally useful
answer: it tells the next reader where the work lands, and it is checkable,
which a person's name would not be.

## The register

| Item | What is open | What it blocks | Owner (what must change) |
|---|---|---|---|
| **`OI-001`** | The final statutory definition of an eligible resident. Territories, cross-border care, nonresident emergency care and substitute coverage all need rules. | **Every denominator in the model.** The framework's own constraint is "no silent exclusion from denominators", and until eligibility is settled the population base under every per-capita figure is provisional. Compounds the three live population denominators recorded in `README.md`. | Legislative text, then `BASE2023.populationM` in `src/lib/params.ts` and the canonical-denominator table in `research/README.md`. |
| **`OI-008`** | The productivity semantics of `TPP-6.6`, "AI-assisted clinician productivity", target ">=125% improvement in safely closed encounters per clinician-hour". What counts as a safely closed encounter, and against what controlled baseline. | Any quantified clinician-productivity gain, and therefore the workforce transition's headline capacity claim. `research/workforce_transition_methodology.md` flags it directly. | A measurement definition in `research/workforce_transition_methodology.md`, then the `TPP-6.6` row of the quality/target registry. |
| **`OI-023`** | The numerator components and their weights for `KPP-D4`, the chronic-disease-control composite. The denominator is open too. | The `KPP-D4` phase targets. The Quality tab renders the target; the definition behind it is unresolved. | `research/quality-equation-methodology.md` and the generated `src/lib/quality-data.ts`. |
| **`OI-033`** | The controlled critical-role set and the need denominator behind `TPP-8.1`. The framework is explicit that an unfilled authorised position is an administrative vacancy, not a shortage; the measure is unmet required safe FTE. | Every staffing-shortfall number. Without an audited denominator, "shortage" and "vacancy" are being reported as the same quantity. | `research/workforce_transition_methodology.md`, which already says the counts stay planning cases until this closes. |
| **`OI-034`** | The bounded public-service obligation attached to public training support under `TPP-8.4` - hardship, disability, family and due-process rules. | The cost and the yield of the training pipeline: an obligation with unbounded exemptions produces a different workforce than one without. | `research/workforce_transition_methodology.md`; legislative text for the due-process half. |
| **`OI-035`** | The functional-assessment instrument behind `TPP-9.1` - how activities, cognition, behaviour, medical complexity, supervision and informal support are scored. | Long-term-care eligibility volume, and so the LTSS cost line. `research/long_term_care_methodology.md` sizes the benefit; this decides who qualifies for it. | `research/long_term_care_methodology.md`. |
| **`OI-043`** | Phase-share allocation inside the $1.2T-$2.0T transition envelope. The framework's own wording: the envelope "is a program constraint, not permission to invent phase shares", and `OI-043` controls allocation until a cost-loaded schedule reconciles shared infrastructure, contingency, reserves, capital and recurring transfers. | Every per-phase transition cost on the Rollout tab. | A cost-loaded schedule, then `src/lib/rollout.ts`. |
| **`OI-052`** | The profile and allocation of the same transition envelope over its 10-12 years. Closely related to `OI-043` and separately numbered. | The shape of the transition spending curve, as distinct from its per-phase totals. | `src/lib/rollout.ts`, whose workstream note on the Rollout page says the per-workstream dollar shares wait on the cost-loaded schedule this item asks for. |
| **`OI-061`** | Bill text and committee jurisdiction: converting the architecture into clauses, definitions, cross-references and a jurisdictional strategy. | The enabling act exists only as titles. The Legislation tab's "What Congress must enact" lists containers, not operative sections. | Legislative counsel, then `ENABLING_ACT_GROUPS` in `src/lib/legislation.ts` and `research/legislation_crosswalk.md`. |
| **`OI-062`** | Constitutional authority and severability: mapping each critical provision to an enumerated power, standing, remedies and function-preserving severability. | The crosswalk's constitutional conclusion ("amendment not required") holds provision by provision only once this is done, and so does every removal-law design choice the crosswalk makes. | `research/legislation_crosswalk.md` ("Constitutional conclusion"), then the Legislation page's constitutional grid. |
| **`OI-063`** | Legacy federal program disposition: which functions, assets, liabilities, records, appeals and workforces are preserved, transferred or sunset, program by program. | The disposition badges on each legal domain summarize a domain; the program-by-program dispositions they summarize do not exist yet. | The federal section-by-section table the Legislation page lists first among unfinished work products, then each domain's `actions` in `src/lib/legislation.ts`. |
| **`OI-064`** | The preemption boundary: the interference test, protected state authority, supplemental coverage and the procedure for more-protective state rules. | The Legislation page's preemption rule and the State law domain state a principle; the test that applies it is open. | The federalism drafting rules in `research/legislation_crosswalk.md`, then the State law domain in `src/lib/legislation.ts`. |
| **`OI-065`** | Tribal consent and direct compact mechanics: consultation, consent, funding, data governance, dispute and withdrawal terms, developed nation to nation. | The Tribal domain's direct-compact path and the tribal consultation record the Legislation page lists as unfinished. | The tribal consultation record, then the Tribal domain in `src/lib/legislation.ts`. |
| **`OI-066`** | Federal credential and facility authority: permissible scope, safety standards, recognition, liability and the operational pathway. | National scope-of-practice floors in the Workforce domain, and the credential-recognition body on the Governance chapter. | The Workforce domain in `src/lib/legislation.ts`; the credential-recognition entity in `src/lib/gov.ts`. |
| **`OI-067`** | Treasury and apportionment remedy design: direct disbursement, deemed apportionment, standing, timing and court-order mechanics. | The mandatory-payment defenses on the Executive Hardening chapter (the core-spending protection target and the anti-impoundment layer) rest on mechanics not yet validated. | `src/lib/hardening.ts` and `src/pages/hardening.astro`. |
| **`OI-068`** | Fallback equivalence: yield, capacity, privacy, rights, burden, activation lag and recovery for every substitute authority. | Every fallback on the Executive Hardening chapter, and the legal-contingency coverage target, which counts coverage without yet measuring what a fallback delivers. | `src/lib/hardening.ts` and the hardening limits in `src/pages/hardening.astro`. |
| **`OI-069`** | Legal recovery-time objectives: provision-specific detection, decision, activation, restoration and reconciliation clocks. | The hardening chapter's time-bound targets and fallbacks have no recovery objective to be measured against. | `src/lib/hardening.ts`. |
| **`OI-070`** | Regulatory defaults: self-executing defaults specific enough to operate without freezing evidence-based adaptation. | The Administration domain's automatic payment and apportionment defaults, and the hardening layer that relies on defaults when rules are not issued. | The Administration domain in `src/lib/legislation.ts`, then `src/lib/hardening.ts`. |

## What this register does not claim

It does not claim these are the most important open items, only that they are
the ones the repo currently cites. It does not assign dates, because nothing in
the repo supports one. And it does not close any of them: `OI-001`, `OI-033`
and `OI-043` in particular are load-bearing under numbers the dashboard
publishes today, and surfacing that is the point.
