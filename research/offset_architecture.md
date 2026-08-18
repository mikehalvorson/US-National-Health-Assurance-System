# The offset architecture: one home per savings mechanism

`R11 [§S6a]`. `HANDOFF.md` constraint 4 asked for an itemized demonstration that
the model's savings mechanisms do not overlap. The demonstration was never
written; the property it asks about has been true in the engine the whole time,
by construction rather than by arithmetic that happens to come out right.

This file is that demonstration. It is written by hand and then held to the
code: the mechanism each offset is the only home of is declared in
`src/lib/params.ts`, and a self-test fails the build if a mechanism the engine
declares does not appear here, or if two offsets claim the same one. A fifth
offset cannot arrive without a paragraph in this file.

## Why overlap is the risk worth engineering against

Every savings estimate in this space is quoted against a different denominator.
Administrative savings are quoted against total spending, provider billing
savings against provider budgets, low-value care against a national waste pool,
price compression against commercial rates. Add four such figures and the sum
double-counts, because two of them describe the same dollar leaving the system
by different routes. It is the most common way a single-payer costing flatters
itself, and it is invisible in the total.

## How the engine avoids it

Two rules, both structural.

**Rule 1: savings that change a price or a quantity are never itemized.** They
are computed as the difference between two directly-computed worlds. The engine
builds the status-quo world and the NHA world from the same 2023 base and
subtracts. A payment factor that lowers hospital prices shows up as a smaller
hospital line, not as a "payment savings" entry. Nothing has to be netted
against anything, because nothing was ever added twice.

| Mechanism | Where it lives | What makes it non-overlapping |
|---|---|---|
| Payer administrative savings | `legacyAdmin` shrinks as `newAdmin` and `govCost` grow | The old system's overhead and the new system's overhead are separate lines computed from separate bases. The saving is the difference between them, so it cannot also appear as a category reduction. |
| Payment-rate compression | `pay` factor on hospital and clinical spend | Applied to the price of care that is still delivered. It changes what a service costs, not how many are delivered, and it touches only the two categories the factor is scoped to. |
| Drug price negotiation | price factor on the drug category | Applied after `embeddedDrugSpend` is moved out of hospital and clinical spend into the drug base, so hospital-administered drugs are discounted once, in the drug line, and not again inside the hospital line. |
| Demand response | `util` multiplier on all care categories | A cost increase rather than a saving, listed here because it is the term the others are computed on top of. |

**Rule 2: savings that remove activity are itemized, and each one is scoped to a
narrow base it does not share with another.** These are the four explicit
offsets. Each names the capability that delivers it, which is declared in
`OFFSET_RAMPS` and read by the engine rather than written inline.

| Offset | Mechanism it is the only home of | Scope | Ramp | Why it cannot overlap its neighbours |
|---|---|---|---|---|
| `offProvAdmin` | provider billing and revenue cycle | hospital + clinical spend | `coverage` | The payer side of the same activity is `legacyAdmin` and `newAdmin`, computed separately, so the provider's cost of billing and the insurer's cost of processing are never the same dollar. |
| `offCareModel` | avoided emergency and inpatient activity | avoided emergency and inpatient activity | `units` | Care that does not happen because it was diverted to a staffed unit. The substitution cost is priced separately in `unitsCost`, so the offset is net of what replaces it. |
| `offLowValue` | low-value and duplicate care not ordered | the declared national low-value-care pool | `infra` | A pool measured independently of this model's categories, entered as its own parameter with its own range. It is care that stops being ordered, not care that is repriced. |
| `offExtraction` | related-party extraction recovered | hospital budgets | `hospitals` | Recovered by the budget agreement that replaces fee-for-service billing. Facility-fee and rate effects live in the payment factor; this is scoped to what a global budget recovers and nothing else. |

The mechanism column is not prose. It is the `mechanism` field on each entry of
`OFFSET_RAMPS` in `src/lib/params.ts`, and a self-test fails the build if a
mechanism the engine declares does not appear in this file, or if two offsets
claim the same one.

## What "disjoint" means here, precisely

It does not mean the four offsets draw on non-overlapping dollars of spending.
Three of them touch hospital spend. It means each names a **distinct mechanism**
and no dollar is removed twice by two mechanisms:

- One offset per mechanism, and one mechanism per offset. No mechanism is
  represented by two terms, so no mechanism can be counted twice.
- Each offset's scope is the base its own mechanism acts on, and the sum of the
  offsets is held below the categories they come from by a self-test.
- The itemized offsets are activity reductions; the non-itemized savings are
  price and quantity changes on activity that still happens. The two kinds
  cannot describe the same dollar, because one removes the service and the
  other changes what the remaining service costs.

## What is checked

| Claim | Where it fails |
|---|---|
| Every offset the engine produces has a declared ramp pairing and a stated reason | self-test, `params.ts` surface |
| Every offset is smaller than the categories it subtracts from | self-test 5, `model.ts` |
| The mechanism table above lists every offset the engine produces, and no others | self-test, `params.ts` surface |
| No two offsets claim the same mechanism | the same self-test |
| The embedded-drug split nets to zero across the categories, so the drug base is complete and neither side double-counts | self-test, `params.ts` surface |
| `matureAtScale` reproduces the year loop for every scenario, so the second copy of this arithmetic cannot drift | self-tests 5b and 5c, `model.ts` |

## What this does not establish

The offsets do not overlap **each other**. Whether each one is the right size is
a separate question, answered by its parameter's own source and confidence
grade, and three of the four carry a `medium` grade with a wide band. The
architecture guarantees that the savings are not counted twice. It does not
guarantee that they arrive.
