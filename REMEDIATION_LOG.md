# Remediation log

Durable cross-session memory for the 25-prompt remediation of the NHA dashboard.
One entry per prompt, appended in run order. A prompt that has not written its
entry has not finished.

## P0 — Orientation & baseline · 2026-08-12 · abd0aab1dc231d35d5be267a8c6755cd5b5e0ade
STATUS: complete

PREMISES CHECKED:
  - "python3 works" — ran `python3 --version`; returns the Microsoft Store alias stub
    ("Python was not found"). `python` is 3.13.15 and runs the harness clean. CONFIRMED STALE,
    already corrected in REMEDIATION_PROMPT.md.
  - "19 assertions exist and none can fail a build" — ran `pnpm test`: 43 files, 137 tests,
    all green. `tests/lib/selftests.test.ts` already asserts `expect(s.passed).toBe(s.total)`.
    CONFIRMED STALE. The real gap is the build/CI gate, verified below.
  - "a failing self-test cannot fail the build" (R152) — REPRODUCES. `health.astro:407-410`
    renders the styled "N of M self-tests FAILING" branch and never throws;
    `fmea.ts:647-653` calls `fmeaSelfTests()` at import and on failure only `console.error`s;
    no `throw` in `src/lib/` gates any invariant; `.github/workflows/deploy.yml` runs
    `withastro/action@v3` only and never runs `pnpm test`. `astro build` passes today.
  - "`equationSelfTests` is written, correct, and never executed" (R230) — STALE.
    `tests/lib/equations.test.ts:15` calls it, 11 tests in that file. It is not called anywhere
    in `src/`, so it is absent from the build and from the footer panel. That work is real;
    the severity is not the stated one.
  - "`fmeaSelfTests` is never executed" (R273) — WRONG. It IS executed at import
    (`fmea.ts:647`) and there is a `tests/lib/fmea.test.ts`. It does not gate; that is the fix.
  - "both surviving tab-local maps" / "four acronym implementations" — REPRODUCES AS SIX.
    Six per-tab decorators, every one building its pattern with `\b`:
    `data-client.ts:356`, `hardening-client.ts:22`, `legislation-client.ts:86`,
    `quality-client.ts:712`, `units-client.ts:666`, `workforce-client.ts:34`.
  - `§S2` / `R226` off-by-one — REPRODUCES. `PHASE_T.P0 = 1` is used as a zero-based index
    into an array whose element 0 is Year 1 = 2027, so P0 reads `years[1] = 2028`. Verified
    for P0, P1 and P8; `rampValueAt('cov','P0')` reads index 1.
  - `R251` / `R293` / `V2` — CONFIRMED CLEAN. All three phase to year maps (`rollout.ts`,
    `data-phases.ts`, `equations.ts` `PHASE_T`) are identical: P0:1 P1:2 P2:3 P3:4 P4:6 P5:7
    P6:8 P7:10 P8:12. Drift prevention, not divergence repair.
  - `R133` — REPRODUCES, and the verification log's E1 table is correct. Seven ramps, not six.
    Three differ between slot 11 (the P8 anchor, Year 12) and slot 12 (what is read today):
    `units` 0.90 to 0.95, `hospitals` 0.90 to 0.95, `expansions` 0.80 to 1.00.
    `coverage`, `costShareElim`, `drugs`, `infra` are identical at both slots.
  - `R272` — REPRODUCES. FMEA probability inputs read `p.rollout[].value`, which
    `applyEquationTargets` has already rewritten at import. Full ranking captured.
  - `R271` — REPRODUCES. See INVENTORY below.
  - `R129` — REPRODUCES exactly as diagnosed. 15 seed IDs are absent from the canonical
    registry and all 15 are the letter-suffixed inventions the row names: `CP-TOT-004a` to
    `-004f`, `CP-POP-004a/b`, `CP-FIN-011a`, `CP-FIN-015a/b`, `CP-FIN-016a/b`, `CP-OFF-003a/b`.
  - `R296` — REPRODUCES. `medications.astro` carries `$467B` (line 94), `$717.9B` (line 117)
    and `<span style="width:65%">$467B retail</span>` (line 120) on one page.
  - `R303` — DONE. `quality-data.ts` read locally for the first time; results below.
  - "`docs/` is undeployed and README still documents it" (P2) — REPRODUCES, and is worse
    than "documents". `README.md:90-92` instructs the reader to set GitHub Pages to
    "Deploy from a branch, folder /docs", which would publish the retired tree over the live
    app at the same URL. `README.md:51` still calls `docs/` "the interactive public dashboard".

PREMISES FAILED: none. No section is blocked. Two rows are narrower than written
  (`R230`, `R273` — both surfaces already run under vitest; only the build gate is missing)
  and two are wider (`R101`/`R305` — six decorators not two; `R278` — 41 gate-linked IDs not 36).

SKILLS — model-invocable (no disable-model-invocation):
  `code-review`, `codebase-design`, `diagnosing-bugs`, `domain-modeling`, `prototype`,
  `research`, `resolving-merge-conflicts`, `tdd`, `wizard`
SKILLS — user-only (disable-model-invocation: true):
  `ask-matt`, `grill-with-docs`, `handoff`, `implement`, `improve-codebase-architecture`,
  `setup-matt-pocock-skills`, `to-spec`, `to-tickets`, `triage`, `wayfinder`
SKILLS — disagreed with Standing Order 7's table: none of the six it calls verified.
  `tdd` and `prototype` carry no flag; `setup-matt-pocock-skills`, `triage`, `grill-with-docs`
  and `improve-codebase-architecture` all carry `true`. All six agree with the installed files.
  The four it calls unverified — `diagnose`, `zoom-out`, `to-prd`, `to-issues` — are
  NOT INSTALLED under any name. Their installed counterparts are `diagnosing-bugs` (open),
  `wayfinder` (gated), `to-spec` (gated), `to-tickets` (gated). Three further gated skills
  the table never names: `implement`, `handoff`, `ask-matt`.

DISCREPANCY:
  - D1. The audit documents are not at the repo root. `REMEDIATION_PROMPT.md`,
    `CLAUDE_CODE_INSTRUCTIONS.md`, `CODEBASE_GAP_AUDIT.md`, `AUDIT_VERIFICATION_LOG.md` and
    `check_audit_docs.py` all live in `Desktop/Claude/NHA-Mental-Health/`, outside the repo.
    Every prompt's `python check_audit_docs.py` gate must be run from that directory.
  - D2. `AUDIT_VERIFICATION_LOG.md` E6's never-named list is itself wrong on four entries.
    `bridge-chart.ts`, `model-types.ts`, `overview-tables.ts` and `tax-types.ts` ARE named in
    `CODEBASE_GAP_AUDIT.md`. It also misses five files that appear in neither document:
    `src/lib/hardening.ts`, `src/lib/legislation.ts`, `src/scripts/health-client.ts`,
    `src/scripts/tax-client.ts`, `src/env.d.ts`. Code wins; the corrected list is in INVENTORY.
  - D3. `src/` holds 80 files, not the 79 the handoff records. Working tree is clean and
    nothing is untracked, so the earlier count was off by one.
  - D4. `V15` says the two live dictionaries differ on one key, `SR-DATA`. Measured across all
    five `src/lib/` maps there are THREE divergences: `SR-DATA` in `data-view.ts`
    ("System Requirement, Data" vs "System Requirement - Data"), and `LTC`
    ("Long-Term Care" vs "Long-term care") and `OI` ("Open Issue" vs "Open issue") in
    `hardening.ts`. `R101` also calls `OI` "a dead key"; it is live in `hardening.ts`.
  - D5. `V14` verifies `acronyms.ts` as a strict superset of two tab-local maps. There are
    five `src/lib/` maps. Measured: `acronyms.ts` (217 keys) contains every key of all four
    others — `data-view.ts` (52), `hardening.ts` (16), `legislation.ts` (54),
    `workforce.ts` (27). The superset property holds more widely than V14 claims. Two of those
    files (`hardening.ts`, `legislation.ts`) are named nowhere in either audit document, which
    is why the map count was missed.
  - D6. `§S13`'s Files list is incomplete. It names five files; the decorators live in six
    clients and the dictionaries in five `src/lib/` modules.
  - D7. `R278` says 36 gate-linked IDs. `GATE_PARAMS` in `fmea.ts` carries 41, hand-typed,
    and the gate records in `quality-data.ts` carry no parameter list at all. All 41 resolve
    against the 440-record catalog. Zero misses.
  - D8. `§BN`'s ten records "hand-added in 2026-08" do not reproduce against
    `quality-data.ts`: no record carries a `2026-08` marker and no record carries a `basis`
    field at all. `V5`'s 17 `basis:"framework"` entries are in `data-phases.ts`, a different
    file. Whatever `§BN` measured, it was not this artifact.
  - D9. The audit's "roughly 1,040 equation-derived interim targets" is wrong on both counts.
    `computeTargets` produces 1,170 cells (130 metrics x 9 phases); only 727 land on the
    catalog, because only 727 rollout rows exist. 1,037 is the FMEA record count, which is
    probably the number that was picked up.
  - D10. `FMEA_DATA.counts` claims 727 of 727 and 310 of 310 assessed, but 317 records carry
    `probabilityAssessed: false` — 310 CP and 7 KPP. They are charted in bands: 37 extreme,
    50 high, 230 moderate. This is `§S4`'s "proxied records charted as scored", now measured,
    and the 7 KPP records are outside the CP-proxy story the audit tells.

BASELINE:
  scenario: SCN-BASE, 600 runs, seed 42, years 2027-2042
  mature-year total (matureToday, 2024$): p50 $5.38T/yr  (p10 $5.09T, p90 $5.71T)
  2041 steady-state total: $9.39T/yr  (p10 $8.53T, p90 $10.25T) vs status quo $9.11T = +$276B (+3.0%)
  new-revenue requirement (mature): $3.42T/yr  (p10 $2.9T, p90 $4.0T)
  per-capita: $26,133  (p10 $23,703, p90 $28,721)
  NHE/GDP at maturity: 23.6%  (p10 21.3%, p90 25.9%)
  coverage ratio: the app publishes no tile by that name. Nearest published quantities are
    `pubShare` at 2041 = 0.9306 (public share of NHE) and the `coverageDemandShare` mode
    parameter = 0.32. Recorded both; P3 and P7 should say which one they mean.
  selfTestSummary().total: 19 (19 passed). 11 model + 1 bridge + 7 tax. The audit's
    "19 displayed / 21 written / README says 27" resolves to: 19 is the real number,
    and `README.md:57` still claims 27.
  astro build: pass (14 pages, 1.70s)
  pnpm test: pass (43 files, 137 tests)
  interim targets dumped to: NHA-Mental-Health/baseline-P0/baseline-interim-targets.json
    (1,170 cells across 130 metrics; 11 non-finite, listed below)
  criticality ranking dumped to: NHA-Mental-Health/baseline-P0/baseline-criticality-ranking.json
    (1,037 records, ordered; top is FM-KPP-A2-P7 at risk 25 / rpn 50 / extreme)
  full summary: NHA-Mental-Health/baseline-P0/baseline-summary.json
  (dumps are outside the git repo so P0 leaves the working tree clean)

  FMEA counts at baseline: total 1037, KPP/TPP 727, CP 310;
    bands 206 extreme / 312 high / 147 moderate / 62 low;
    CP bands 30 extreme / 50 high / 230 moderate / 0 low.
    Probability distribution: 2:217, 3:599, 4:206, 5:15. No record scores probability 1,
    and the minimum observed is 2 — so `§S4`'s claim is true today, by the rounding floor
    it identifies rather than by design.

  Equation cells that evaluate non-finite (11) — all at early phases, and ALL ARE DROPPED
  rather than published, because no rollout row exists at those phases:
    KPP-B1@P0, KPP-D7@P0, KPP-TRUST1@P0,
    TPP-9.3@P0 P1 P2 P3, TPP-9.5@P0 P1 P2 P3
  R248's detector cannot see these: it counts surviving `kind === 'derived interim target'`
  rows, and that count is genuinely 0 because `applyEquationTargets` converts every one of
  them to `'equation-derived target'` (538 rows). Zero therefore does close R147/R148 as
  written, but it is not evidence that every equation evaluates finite. It does not.

  Rollout `kind` vocabulary (727 rows): equation-derived target 538, maturity target 130,
    data-plan interim target 48, progression floor 10, phase milestone 1.
    `quality-client.ts:166` and `:232` still test for `'derived interim target'`, which no
    row carries after import — two dead branches, relevant to `§S16`.

INVENTORY:
  files in src|tools|research: 108 (src 80, tools 7, research 21)
  src/lib/tabs.ts registers 14 chapters, confirmed.
  files NOT named anywhere in CODEBASE_GAP_AUDIT.md or CLAUDE_CODE_INSTRUCTIONS.md (23):
    research/02_hospital_clinical_workforce_education.md
    research/03_drugs_pharmacy_diagnostics_devices.md
    research/04_ltc_behavioral_dvh_ems_publichealth.md
    research/05_it_governance_rd_transition.md
    research/06_tax_distribution_financing.md
    research/fmea_methodology.md
    research/quality-equation-methodology.md
    src/env.d.ts
    src/lib/benchmark-chart.ts
    src/lib/benchmarks.ts
    src/lib/financing-chart.ts
    src/lib/financing.ts
    src/lib/flow-diagram.ts
    src/lib/growth-decomp.ts
    src/lib/hardening.ts
    src/lib/household.ts
    src/lib/legislation.ts
    src/lib/money-flow.ts
    src/lib/path-chart.ts
    src/lib/tax-charts.ts
    src/pages/[chapter].astro
    src/scripts/health-client.ts
    src/scripts/tax-client.ts
  Named in CLAUDE_CODE_INSTRUCTIONS.md but not in CODEBASE_GAP_AUDIT.md (1):
    research/01_macro_financing_population_offsets.md
  Named by basename only, never by full path (3): src/lib/bridge-chart.ts,
    src/lib/model-types.ts, src/lib/tax-types.ts

HARNESS: check_audit_docs.py exit 0 — 35 passed, 0 failed
  (run from Desktop/Claude/NHA-Mental-Health/, see DISCREPANCY D1)

NOTES:
  - `quality-data.ts` read locally, closing `R303`. 440 parameters: 45 KPP, 85 TPP, 310 CP
    across 20 families. Its declared `counts` block is `{KPP:45, TPP:85, CP:310, total:440}`
    and matches the record counts exactly, so `§S16`'s "the catalog's own counts equal its
    record counts" already holds for this file. 13 concepts, 8 gates, 9 phases,
    20 cpFamilies. Every FMEA `paramId` resolves. `V3`'s 130 = 45 + 85 confirmed.
  - `R129` namespace evidence, measured: canonical registry 330 CP IDs, `quality-data.ts` 310,
    seed 80. Every `quality-data.ts` CP ID is canonical. 20 canonical IDs are absent from
    `quality-data.ts`. 15 seed IDs are absent from canonical, and they are exactly the
    letter-suffixed set the row names.
  - The `\b` defect demonstrated: `\b(CP|PA|VA)\b` against
    "CP-POP-004 and CP-UNIT-002 in PA and VA" matches ["CP","CP","PA","VA"];
    `acronyms.ts`'s lookaround pattern matches ["PA","VA"] only. `AE1` is live site-wide:
    the canonical map carries `PA` -> "Physician assistant" and `VA` -> "Department of
    Veterans Affairs" on all 14 pages.
  - HANDOFF-nha-remediation.md was not on disk at session start and was supplied mid-session.
    Its "Where things are" table is the authoritative path map; D1 above records it because
    the prompts themselves say "repo root".
