# Open-item register

Written 2026-08-26 for `R15` (`§S11a`).

The framework defines 121 open items, `OI-001` through `OI-121`, and until now
none of them was visible anywhere except as a bare identifier inside
methodology prose or a generated data file. A reader who met the phrase
*"allocation open under OI-033, OI-034, OI-035, and OI-043"* had no way to find
out what those four are, what they block, or what closing them would take.
That is the gap this file fills.

## Scope, and one correction to the recommendation that asked for this

`R15` names five items - `OI-008`, `OI-033`, `OI-034`, `OI-035`, `OI-043` - and
says they exist only inside methodology prose. **Both halves are right, and the
list is short by five.** Measured against the repo on 2026-08-26, the open items
referenced outside the two extract files are:

| Where | Items |
|---|---|
| `research/workforce_transition_methodology.md` | `OI-008`, `OI-033`, `OI-034`, `OI-035`, `OI-043` |
| `research/legislation_crosswalk.md` | `OI-061`, `OI-070` |
| `src/lib/quality-data.ts` (generated) | `OI-001`, `OI-008`, `OI-023` |
| `src/lib/rollout.ts`, `src/lib/selftests.ts` | `OI-052` |

Ten distinct items, not five. The register covers all ten, because a register
that covers only the five somebody happened to notice reproduces the problem it
was written to fix.

The remaining 111 items live in `research/framework_v2_extract.md` and are not
listed here. They are not hidden - the extract is in the repo and searchable -
and none of them is currently cited as load-bearing by any methodology file or
any shipped module. **This register's rule is: every open item referenced
outside the extract files appears here.** If a later section cites a new one,
it belongs in this table on the same commit.

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
| **`OI-052`** | The profile and allocation of the same transition envelope over its 10-12 years. Closely related to `OI-043` and separately numbered. | The shape of the transition spending curve, as distinct from its per-phase totals. | `src/lib/rollout.ts`; `src/lib/selftests.ts` already names it. |
| **`OI-061`** | Constitutional analysis, bill text and jurisdiction-specific conforming work for the legal architecture. Item `65-C10` records the architecture as "structurally specified but not legally validated". | Every legal-feasibility claim on the Legislation tab. | Legislative counsel, then `research/legislation_crosswalk.md`. |
| **`OI-070`** | The upper bound of the `OI-061`-`OI-070` counsel-control block. The framework's own appendix states it "does not provide bill text, a constitutional opinion or legal certification". | Same as `OI-061`. The two are the ends of one range and neither closes alone. | Same as `OI-061`. |

## What this register does not claim

It does not claim these ten are the most important open items, only that they
are the ones the repo currently leans on. It does not assign dates, because
nothing in the repo supports one. And it does not close any of them: `OI-001`,
`OI-033` and `OI-043` in particular are load-bearing under numbers the
dashboard publishes today, and surfacing that is the point.
